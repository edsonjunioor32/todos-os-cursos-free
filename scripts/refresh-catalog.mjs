import fs from "node:fs/promises";
import { chromium } from "playwright";

const catalogPath = new URL("../courses.json", import.meta.url);
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Fortaleza",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());

const PAGINATION_PATTERN =
  /(?:[?&](?:page|pagina|p|offset|start)=\d+|\/(?:page|pagina)\/\d+)/i;

const CATALOGS = [
  {
    portal: "Santander Open Academy",
    source: "https://www.santanderopenacademy.com/pt_br/index.html",
    urls: ["https://www.santanderopenacademy.com/pt_br/index.html"],
    hosts: ["www.santanderopenacademy.com", "app.santanderopenacademy.com"],
    match: /app\.santanderopenacademy\.com\/pt-BR\/program\//i,
    category: "Cursos gratuitos",
    cert: "check",
    description: "Curso localizado no catálogo da Santander Open Academy.",
    maxPages: 8
  },
  {
    portal: "FGV",
    source: "https://cursosgratuitos.fgv.br/",
    urls: ["https://cursosgratuitos.fgv.br/"],
    hosts: ["cursosgratuitos.fgv.br"],
    match: /cursosgratuitos\.fgv\.br\/curso\/[^/?#]+/i,
    category: "Cursos gratuitos",
    cert: "declaration",
    description: "Curso gratuito da FGV; a instituição informa declaração após avaliação.",
    maxPages: 20
  },
  {
    portal: "Nação Fluente",
    source: "https://www.nacaofluente.com/blog/como-aprender-ingles-no-youtube/",
    urls: [],
    hosts: [],
    category: "Idiomas",
    cert: "material",
    description: "Material gratuito sobre aprendizagem de inglês."
  },
  {
    portal: "Senar EAD",
    source: "https://ead.senar.org.br/cursos",
    urls: ["https://ead.senar.org.br/cursos"],
    hosts: ["ead.senar.org.br"],
    match: /ead\.senar\.org\.br\/curso(?:-whatsapp)?\/[^/?#]+/i,
    category: "Cursos gratuitos",
    cert: "free",
    description: "Curso gratuito do Senar EAD.",
    maxPages: 12
  },
  {
    portal: "Sebrae Paraíba",
    source: "https://pb.loja.sebrae.com.br/cursos/cursos-online",
    urls: ["https://pb.loja.sebrae.com.br/cursos/cursos-online"],
    hosts: ["pb.loja.sebrae.com.br"],
    match: /pb\.loja\.sebrae\.com\.br\/[^/?#]+-\d{8,}(?:[/?#]|$)/i,
    category: "Cursos gratuitos",
    cert: "free",
    description: "Curso gratuito localizado no catálogo do Sebrae Paraíba.",
    maxPages: 12
  },
  {
    portal: "Escola Virtual",
    source: "https://www.ev.org.br/cursos",
    urls: ["https://www.ev.org.br/cursos"],
    hosts: ["www.ev.org.br"],
    match: /www\.ev\.org\.br\/cursos\/[^/?#]+\/?$/i,
    category: "Cursos gratuitos",
    cert: "free",
    description: "Curso gratuito da Escola Virtual.",
    maxPages: 20
  },
  {
    portal: "UEMP",
    source: "https://cursosgratis.uemp.com.br/",
    urls: ["https://cursosgratis.uemp.com.br/"],
    hosts: ["cursosgratis.uemp.com.br"],
    match: /cursosgratis\.uemp\.com\.br\/curso\/[^/?#]+/i,
    category: "Cursos gratuitos",
    cert: "maybe",
    description: "Curso gratuito localizado no catálogo da UEMP.",
    maxPages: 12
  },
  {
    portal: "MEC Idiomas",
    source: "https://mecidiomas.mec.gov.br/",
    urls: [],
    hosts: [],
    category: "Idiomas",
    cert: "free",
    description: "Plataforma pública de idiomas."
  },
  {
    portal: "Aprenda Mais MEC",
    source: "https://aprendamais.mec.gov.br/course/index.php",
    urls: [
      "https://aprendamais.mec.gov.br/course/index.php?categoryid=2",
      "https://aprendamais.mec.gov.br/course/index.php?categoryid=3",
      "https://aprendamais.mec.gov.br/course/index.php?categoryid=4",
      "https://aprendamais.mec.gov.br/course/index.php?categoryid=5",
      "https://aprendamais.mec.gov.br/course/index.php?categoryid=6",
      "https://aprendamais.mec.gov.br/course/index.php?categoryid=7",
      "https://aprendamais.mec.gov.br/course/index.php?categoryid=8",
      "https://aprendamais.mec.gov.br/course/index.php?categoryid=9",
      "https://aprendamais.mec.gov.br/course/index.php?categoryid=10",
      "https://aprendamais.mec.gov.br/course/index.php?categoryid=11",
      "https://aprendamais.mec.gov.br/course/index.php?categoryid=12",
      "https://aprendamais.mec.gov.br/course/index.php?categoryid=13",
      "https://aprendamais.mec.gov.br/course/index.php?categoryid=14",
      "https://aprendamais.mec.gov.br/course/index.php?categoryid=15",
      "https://aprendamais.mec.gov.br/course/index.php?categoryid=16",
      "https://aprendamais.mec.gov.br/course/index.php?categoryid=17",
      "https://aprendamais.mec.gov.br/course/index.php?categoryid=35"
    ],
    hosts: ["aprendamais.mec.gov.br"],
    match: /aprendamais\.mec\.gov\.br\/course\/info\.php\?[^#]*\bid=\d+/i,
    category: "Cursos gratuitos",
    cert: "free",
    description: "Curso gratuito da plataforma Aprenda Mais MEC.",
    maxPages: 60
  },
  {
    portal: "HCX FMUSP",
    source: "https://ensino.hcxfmusp.org.br/online/cursos/ead/gratuitos",
    urls: ["https://ensino.hcxfmusp.org.br/online/cursos/ead/gratuitos"],
    hosts: ["ensino.hcxfmusp.org.br"],
    match: /ensino\.hcxfmusp\.org\.br\/online\/(?!cursos\/)[^/?#]+\/p(?:[/?#]|$)/i,
    category: "Saúde",
    cert: "check",
    description: "Curso gratuito da plataforma HCX FMUSP.",
    maxPages: 12
  },
  {
    portal: "Prime Cursos",
    source: "https://www.primecursos.com.br/",
    urls: ["https://www.primecursos.com.br/"],
    hosts: ["www.primecursos.com.br"],
    match: /www\.primecursos\.com\.br\/(?!$|categoria|blog|sobre|contato|login|cadastro|politica|termos|curso-gratis\/?$)[^/?#]+\/?$/i,
    category: "Cursos gratuitos",
    cert: "maybe",
    description: "Curso gratuito localizado no catálogo da Prime Cursos.",
    maxPages: 20
  },
  {
    portal: "Senac EAD",
    source: "https://www.ead.senac.br/gratuito/",
    urls: ["https://www.ead.senac.br/gratuito/"],
    hosts: ["www.ead.senac.br"],
    match: /www\.ead\.senac\.br\/gratuito\/[^/?#]+\/?$/i,
    category: "Cursos gratuitos",
    cert: "free",
    description: "Curso gratuito do Senac EAD.",
    maxPages: 12
  },
  {
    portal: "Coursera",
    source: "https://www.coursera.org/courses?query=free",
    urls: ["https://www.coursera.org/courses?query=free"],
    hosts: ["www.coursera.org"],
    match: /www\.coursera\.org\/learn\/[^/?#]+/i,
    category: "Cursos gratuitos",
    cert: "maybe",
    description: "Curso listado na busca gratuita da Coursera; condições de certificado podem variar.",
    maxPages: 12
  },
  {
    portal: "Udemy",
    source: "https://www.udemy.com/courses/free/",
    urls: ["https://www.udemy.com/courses/free/"],
    hosts: ["www.udemy.com"],
    match: /www\.udemy\.com\/course\/[^/?#]+/i,
    category: "Cursos gratuitos",
    cert: "maybe",
    description: "Curso gratuito listado na Udemy; condições de certificado podem variar.",
    maxPages: 12
  },
  {
    portal: "Cruzeiro do Sul Virtual",
    source: "https://cursos.cruzeirodosulvirtual.com.br/cursos-livres/gratuito?initialMap=c&initialQuery=cursos-livres&map=category-1,especialidade",
    urls: [
      "https://cursos.cruzeirodosulvirtual.com.br/cursos-livres/gratuito?initialMap=c&initialQuery=cursos-livres&map=category-1,especialidade"
    ],
    hosts: ["cursos.cruzeirodosulvirtual.com.br"],
    match: /cursos\.cruzeirodosulvirtual\.com\.br\/cursos-livres-[^/?#]+\/p(?:[/?#]|$)/i,
    category: "Cursos gratuitos",
    cert: "check",
    description: "Curso gratuito localizado no catálogo da Cruzeiro do Sul Virtual.",
    maxPages: 12
  },
  {
    portal: "Harvard",
    source: "https://pll.harvard.edu/catalog?price%5B1%5D=1&max_price=&start_date=&keywords=&url=",
    urls: [
      "https://pll.harvard.edu/catalog?price%5B1%5D=1&max_price=&start_date=&keywords=&url="
    ],
    hosts: ["pll.harvard.edu"],
    match: /pll\.harvard\.edu\/course\/[^/?#]+/i,
    category: "Cursos gratuitos",
    cert: "maybe",
    description: "Curso listado no catálogo gratuito da Harvard.",
    maxPages: 24
  }
];

function canonicalUrl(value) {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) {
      return "";
    }
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || /^(fbclid|gclid)$/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }
    return url.toString();
  } catch {
    return "";
  }
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function titleFromSlug(value) {
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    let slug = parts.at(-1) || parts.at(-2) || "";
    if (slug.toLowerCase() === "p" && parts.length > 1) {
      slug = parts.at(-2);
    }
    return decodeURIComponent(slug)
      .replace(/\.(html?|php)$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .trim();
  } catch {
    return "";
  }
}

function usefulTitle(value) {
  let title = cleanText(value);
  if (!title) {
    return "";
  }
  title = title
    .replace(/^(ver|acessar|conheça|saiba mais|learn more)\s*(curso)?\s*$/i, "")
    .replace(/\s*(ver curso|saiba mais|learn more|acessar curso)\s*$/i, "")
    .trim();
  if (!title || /^(ver|acessar|saiba mais|learn more|inscreva-se)$/i.test(title)) {
    return "";
  }
  return title.length > 180 ? title.slice(0, 177).trimEnd() + "..." : title;
}

function allowedHost(hostname, config) {
  return config.hosts.some(
    (host) => hostname === host || hostname.endsWith("." + host)
  );
}

function shouldFollowPagination(anchor, url, config) {
  if (!PAGINATION_PATTERN.test(url)) {
    return false;
  }
  const label = cleanText(anchor.text || anchor.aria || anchor.title);
  const rel = cleanText(anchor.rel);
  return (
    /\b(next|previous|próximo|anterior|seguinte|último|last)\b/i.test(label) ||
    /\bnext\b/i.test(rel) ||
    /^\d{1,3}$/.test(label)
  );
}

async function collectPortal(browser, config) {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (compatible; TodosCursosFreeBot/1.0; +https://github.com/edsonjunioor32/todas-os-cursos-free)"
  });
  const pending = [...config.urls];
  const queued = new Set(pending);
  const visited = new Set();
  const records = new Map();
  const errors = [];

  while (pending.length && visited.size < (config.maxPages || 12)) {
    const catalogUrl = pending.shift();
    queued.delete(catalogUrl);
    if (visited.has(catalogUrl)) {
      continue;
    }
    visited.add(catalogUrl);

    const page = await context.newPage();
    try {
      const response = await page.goto(catalogUrl, {
        waitUntil: "domcontentloaded",
        timeout: 45000
      });
      if (response && response.status() >= 400) {
        throw new Error("HTTP " + response.status());
      }
      await page.waitForTimeout(1400);
      await page
        .evaluate(async () => {
          for (let index = 0; index < 7; index += 1) {
            window.scrollTo(0, document.body.scrollHeight);
            await new Promise((resolve) => setTimeout(resolve, 350));
          }
          window.scrollTo(0, 0);
        })
        .catch(() => {});

      const anchors = await page.locator("a[href]").evaluateAll((nodes) =>
        nodes.map((node) => ({
          href: node.href,
          text: node.innerText || node.textContent || "",
          title: node.getAttribute("title") || "",
          aria: node.getAttribute("aria-label") || "",
          rel: node.getAttribute("rel") || ""
        }))
      );

      for (const anchor of anchors) {
        const url = canonicalUrl(anchor.href);
        if (!url) {
          continue;
        }
        const parsed = new URL(url);
        if (!allowedHost(parsed.hostname, config)) {
          continue;
        }

        if (config.match && config.match.test(url)) {
          const title =
            usefulTitle(anchor.text) ||
            usefulTitle(anchor.title) ||
            usefulTitle(anchor.aria) ||
            titleFromSlug(url);
          if (title) {
            const previous = records.get(url);
            if (!previous || previous.title === titleFromSlug(url)) {
              records.set(url, { url, title });
            }
          }
        }

        if (
          pending.length + visited.size < (config.maxPages || 12) &&
          !visited.has(url) &&
          !queued.has(url) &&
          shouldFollowPagination(anchor, url, config)
        ) {
          queued.add(url);
          pending.push(url);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(catalogUrl + " -> " + message);
    } finally {
      await page.close();
    }
  }

  await context.close();
  return {
    records: [...records.values()],
    visited: visited.size,
    errors
  };
}

function buildRecord(config, item, previous) {
  return {
    ...(previous || {}),
    category: previous?.category || config.category,
    cert: previous?.cert || config.cert,
    description: previous?.description || config.description,
    portal: config.portal,
    source: config.source,
    title: item.title || previous?.title || titleFromSlug(item.url),
    url: previous?.url || item.url
  };
}

function mergePortalCourses(previous, discovered, config) {
  if (!config.match) {
    return {
      courses: previous,
      status: "static",
      discovered: 0
    };
  }

  const minimum = previous.length
    ? Math.max(1, Math.floor(previous.length * 0.25))
    : 1;

  if (discovered.length < minimum) {
    return {
      courses: previous,
      status: "preserved",
      discovered: discovered.length,
      minimum
    };
  }

  const byUrl = new Map(
    previous.map((course) => [canonicalUrl(course.url), course])
  );
  for (const item of discovered) {
    const key = canonicalUrl(item.url);
    const old = byUrl.get(key);
    byUrl.set(key, buildRecord(config, item, old));
  }

  return {
    courses: [...byUrl.values()],
    status: "updated",
    discovered: discovered.length
  };
}

const catalogText = await fs.readFile(catalogPath, "utf8");
const catalog = JSON.parse(catalogText);
const previousCourses = Array.isArray(catalog.courses) ? catalog.courses : [];
const previousByPortal = new Map();

for (const course of previousCourses) {
  const portal = course.portal || "Portal não informado";
  if (!previousByPortal.has(portal)) {
    previousByPortal.set(portal, []);
  }
  previousByPortal.get(portal).push(course);
}

const browser = await chromium.launch({ headless: true });
const mergedByPortal = new Map();
const stats = [];
let successfulCatalogs = 0;

try {
  for (const config of CATALOGS) {
    const previous = previousByPortal.get(config.portal) || [];
    if (!config.match) {
      mergedByPortal.set(config.portal, previous);
      stats.push({
        portal: config.portal,
        status: "preserved",
        discovered: 0,
        total: previous.length
      });
      continue;
    }

    const result = await collectPortal(browser, config);
    const merged = mergePortalCourses(previous, result.records, config);
    mergedByPortal.set(config.portal, merged.courses);
    stats.push({
      portal: config.portal,
      status: merged.status,
      discovered: merged.discovered,
      total: merged.courses.length,
      visited: result.visited,
      errors: result.errors
    });

    if (result.records.length > 0) {
      successfulCatalogs += 1;
    }
  }
} finally {
  await browser.close();
}

if (successfulCatalogs === 0) {
  console.error("Nenhum catálogo dinâmico respondeu com cursos.");
  process.exit(1);
}

const outputCourses = [];
const emitted = new Set();

for (const course of previousCourses) {
  const portal = course.portal || "Portal não informado";
  if (mergedByPortal.has(portal)) {
    if (!emitted.has(portal)) {
      outputCourses.push(...mergedByPortal.get(portal));
      emitted.add(portal);
    }
  } else {
    outputCourses.push(course);
  }
}

for (const config of CATALOGS) {
  if (!emitted.has(config.portal) && mergedByPortal.has(config.portal)) {
    outputCourses.push(...mergedByPortal.get(config.portal));
    emitted.add(config.portal);
  }
}

const deduplicated = [];
const seenUrls = new Set();
for (const course of outputCourses) {
  const key = canonicalUrl(course.url);
  if (!key || seenUrls.has(key)) {
    continue;
  }
  seenUrls.add(key);
  deduplicated.push(course);
}

const coverage = { ...(catalog.coverage || {}) };
for (const stat of stats) {
  if (stat.status === "updated" || stat.status === "preserved") {
    coverage[stat.portal] =
      stat.discovered > 0
        ? stat.discovered + " cursos encontrados; " + stat.total + " mantidos no catálogo."
        : stat.total + " cursos mantidos no catálogo.";
  }
}

const updatedCatalog = {
  ...catalog,
  generatedAt: today,
  coverage,
  courses: deduplicated
};

const outputText = JSON.stringify(updatedCatalog, null, 2) + "\n";
if (outputText !== catalogText) {
  await fs.writeFile(catalogPath, outputText, "utf8");
  console.log("courses.json atualizado.");
} else {
  console.log("Nenhuma alteração encontrada no catálogo.");
}

for (const stat of stats) {
  const errors =
    stat.errors && stat.errors.length ? " | erros: " + stat.errors.join("; ") : "";
  console.log(
    stat.portal +
      ": " +
      stat.status +
      ", encontrados=" +
      stat.discovered +
      ", total=" +
      stat.total +
      (stat.visited ? ", páginas=" + stat.visited : "") +
      errors
  );
}
