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
    urls: [
      "https://app.santanderopenacademy.com/pt-BR/program/search",
      "https://www.santanderopenacademy.com/pt_br/index.html"
    ],
    hosts: ["www.santanderopenacademy.com", "app.santanderopenacademy.com"],
    match: /app\.santanderopenacademy\.com\/pt-BR\/(?:program|course)\/(?!search(?:[/?#]|$))[^/?#]+/i,
    exclude: /app\.santanderopenacademy\.com\/pt-BR\/program\/search(?:[/?#]|$)/i,
    excludeTitle: /bolsa|intercâmbio|intercambio/i,
    cardHostSelector: "soa-search",
    cardSelector: "soa-card",
    cardAttribute: "soa-item",
    cardTypeField: "resourceType",
    cardTypes: ["SOA_COURSE", "LMS_COURSE"],
    cardUrlField: "detailUrl",
    cardTitleField: "name",
    tabSelector: "#soa-courses-tab",
    consentSelector: "#onetrust-reject-all-handler",
    consentWaitMs: 1000,
    loadMoreSelector: "#load-more",
    loadMoreLimit: 20,
    loadMoreWaitMs: 2200,
    waitMs: 5000,
    category: "Cursos gratuitos",
    cert: "check",
    description: "Curso localizado no catálogo de cursos da Santander Open Academy.",
    maxPages: 8
  },
  {
    portal: "FGV",
    source: "https://cursosgratuitos.fgv.br/",
    urls: ["https://cursosgratuitos.fgv.br/"],
    hosts: ["cursosgratuitos.fgv.br"],
    match: /cursosgratuitos\.fgv\.br\/curso\/[^/?#]+/i,
    waitMs: 6000,
    pageSizeSelector: "#fgv-page-size-select",
    pageSizeLabel: "40",
    clientPageSelector: "nav.fgv-pagination a",
    clientPages: 20,
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
    match: /ead\.senar\.org\.br\/(?:cursos|curso-whatsapp)\/[^/?#]+/i,
    preferAnchorTitle: true,
    loadMoreSelector: 'button[data-action="load-more"]',
    loadMoreLimit: 48,
    loadMoreWaitMs: 1400,
    sourceCountPattern: /(\d+)\s+cursos encontrados/i,
    waitForSelector: 'a[href*="/cursos/"]',
    waitForSelectorTimeout: 20000,
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
    maxPages: 24
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
    source: "https://www.udemy.com/courses/free/?lang=pt&sort=most-reviewed",
    urls: ["https://www.udemy.com/courses/free/?lang=pt&sort=most-reviewed"],
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
  },
  {
    portal: "Fundação Itaú Autoformativos",
    source: "https://fundacaoitau.org.br/escola/autoformativos",
    urls: ["https://fundacaoitau.org.br/escola/autoformativos"],
    hosts: ["fundacaoitau.org.br"],
    match: /fundacaoitau\.org\.br\/escola\/autoformativos\/[^/?#]+/i,
    titleLineFromEnd: 3,
    waitMs: 4500,
    waitForSelector: 'a[href*="/escola/autoformativos/"]',
    waitForSelectorTimeout: 20000,
    nextPageSelector: 'button[aria-label="Go to next page"]',
    clientPages: 24,
    pageWaitMs: 4500,
    category: "Arte, cultura e educação",
    cert: "check",
    description: "Curso gratuito da Escola Fundação Itaú.",
    maxPages: 24
  },
  {
    portal: "Fundação Itaú Mediados",
    source: "https://fundacaoitau.org.br/escola/mediados",
    urls: ["https://fundacaoitau.org.br/escola/mediados"],
    hosts: ["fundacaoitau.org.br"],
    match: /fundacaoitau\.org\.br\/escola\/mediados\/[^/?#]+/i,
    waitMs: 4500,
    waitForSelector: 'a[href*="/escola/mediados/"]',
    waitForSelectorTimeout: 20000,
    titleLineFromEnd: 3,
    category: "Arte, cultura e educação",
    cert: "check",
    description: "Curso mediado da Escola Fundação Itaú; condições de inscrição podem variar.",
    maxPages: 4
  },

  {
    portal: "Stanford Online",
    source: "https://online.stanford.edu/explore?filter%5B0%5D=free_or_paid%3Afree&keywords=&items_per_page=12",
    urls: [
      "https://online.stanford.edu/explore?filter%5B0%5D=free_or_paid%3Afree&keywords=&items_per_page=12"
    ],
    hosts: ["online.stanford.edu"],
    match: /online\.stanford\.edu\/courses\/[^/?#]+/i,
    sourceCountPattern: /Course\s*\((\d+)\)/i,
    waitMs: 2200,
    category: "Cursos gratuitos",
    cert: "maybe",
    description: "Curso gratuito ou de acesso livre localizado no catálogo Stanford Online.",
    minimumRecords: 1,
    strictCoverage: true,
    requireReportedCount: true,
    coverageRatio: 1,
    failOnIncomplete: true,
    maxPages: 20
  },
  {
    portal: "Ensino Einstein",
    source: "https://ensino.einstein.br/curta-duracao/cursos-gratuitos?O=OrderByScoreDESC",
    urls: [
      "https://ensino.einstein.br/curta-duracao/cursos-gratuitos?O=OrderByScoreDESC"
    ],
    hosts: ["ensino.einstein.br"],
    match: /ensino\.einstein\.br\/[^/?#]+_p\d+\/p(?:[/?#]|$)/i,
    anchorSelector: "a.prateleira__view-product[href]",
    titleFromClosestSelector: ".prateleira__content",
    titleLine: 1,
    clientPageSelector: "ul.pages li.page-number",
    clientPages: 20,
    sourceCountPattern: /Todos\s*\((\d+)\)/i,
    waitMs: 2200,
    pageWaitMs: 2400,
    category: "Saúde",
    cert: "maybe",
    description: "Curso gratuito localizado no catálogo do Ensino Einstein.",
    minimumRecords: 1,
    strictCoverage: true,
    requireReportedCount: true,
    coverageRatio: 1,
    failOnIncomplete: true,
    maxPages: 4
  },
  {
    portal: "LÚMINA UFRGS",
    source: "https://lumina.ufrgs.br/course/index.php",
    urls: [
      "https://lumina.ufrgs.br/course/index.php?categoryid=7",
      "https://lumina.ufrgs.br/course/index.php?categoryid=1",
      "https://lumina.ufrgs.br/course/index.php?categoryid=5",
      "https://lumina.ufrgs.br/course/index.php?categoryid=4",
      "https://lumina.ufrgs.br/course/index.php?categoryid=6"
    ],
    hosts: ["lumina.ufrgs.br"],
    match: /lumina\.ufrgs\.br\/course\/view\.php\?[^#]*\bid=\d+/i,
    anchorSelector: 'a[href*="/course/view.php?id="]',
    paginationSelector: "div.paginacao a",
    titleFromClosestSelector: ".coursebox, .vid-tit",
    titleLine: 1,
    waitForSelector: 'a[href*="/course/view.php?id="]',
    waitForSelectorTimeout: 20000,
    waitMs: 1600,
    category: "Cursos gratuitos",
    cert: "check",
    description: "Curso gratuito da plataforma LÚMINA da UFRGS.",
    minimumRecords: 1,
    failOnIncomplete: true,
    maxPages: 120
  },
  {
    portal: "OpenLearn",
    source: "https://www.open.edu/openlearn/free-courses/full-catalogue",
    urls: [
      "https://www.open.edu/openlearn/free-courses/full-catalogue"
    ],
    hosts: ["www.open.edu"],
    match: /www\.open\.edu\/openlearn\/(?:[^/?#]+\/){2,4}content-section-0(?:[/?#]|$)/i,
    sourceCountPattern: /Results:\s*(\d+)\s+items/i,
    waitMs: 2200,
    category: "Cursos gratuitos",
    cert: "check",
    description: "Curso gratuito do catálogo OpenLearn da The Open University.",
    minimumRecords: 1,
    strictCoverage: true,
    requireReportedCount: true,
    coverageRatio: 1,
    failOnIncomplete: true,
    maxPages: 60
  },
  {
    portal: "e-Aulas USP",
    source: "https://eaulas.usp.br/portal/profession.action?profession=Ci%C3%AAncia+da+Computa%C3%A7%C3%A3o+e+Inform%C3%A1tica",
    urls: [
      "https://eaulas.usp.br/portal/profession.action?profession=Ci%C3%AAncia+da+Computa%C3%A7%C3%A3o+e+Inform%C3%A1tica"
    ],
    hosts: ["eaulas.usp.br"],
    match: /eaulas\.usp\.br\/portal\/course\.action\?[^#]*\bcourse=\d+/i,
    anchorSelector: 'a.limit3lines[href*="/portal/course.action?course="]',
    paginationSelector: "div.paginacao a",
    titleFromClosestSelector: ".vid-tit",
    titleLine: 1,
    sourceCountPattern: /Há\s+\d+\s+vídeos\s+disponíveis\s+em\s+(\d+)\s+disciplinas/i,
    waitMs: 1800,
    category: "Tecnologia e educação",
    cert: "material",
    description: "Disciplina com videoaulas gratuitas disponível no e-Aulas USP.",
    minimumRecords: 1,
    strictCoverage: true,
    requireReportedCount: true,
    coverageRatio: 1,
    failOnIncomplete: true,
    maxPages: 4
  },
  {
    portal: "Life Global",
    source: "https://www.life-global.org/pt/allcourses?page=1",
    urls: [
      "https://www.life-global.org/pt/allcourses?page=1"
    ],
    hosts: ["www.life-global.org"],
    match: /www\.life-global\.org\/pt\/course\/\d+-[^/?#]+/i,
    anchorSelector: 'a[href*="/pt/course/"]',
    waitMs: 2200,
    category: "Cursos gratuitos",
    cert: "check",
    description: "Curso gratuito da HP LIFE, com certificado de conclusão.",
    minimumRecords: 1,
    failOnIncomplete: true,
    maxPages: 20
  },
  {
    portal: "Khan Academy",
    source: "https://pt.khanacademy.org/computing",
    urls: [
      "https://pt.khanacademy.org/computing",
      "https://pt.khanacademy.org/college-careers-more/"
    ],
    hosts: ["pt.khanacademy.org"],
    match: /pt\.khanacademy\.org\/(?:computing\/(?:computer-programming|computer-science|hour-of-code|intro-to-python-fundamentals)(?:\/[^/?#]+)*|college-careers-more\/(?:internet-safety|uma-introducao-a-inteligencia-artificial)(?:\/[^/?#]+)*)/i,
    exclude: /(?:hour-of-code-resources|teacher-resources)/i,
    waitMs: 1800,
    category: "Tecnologia e educação",
    cert: "free",
    description: "Curso e conteúdo formativo gratuito da Khan Academy em português.",
    minimumRecords: 1,
    failOnIncomplete: true,
    maxPages: 4
  },
  {
    portal: "Escola Virtual Gov",
    source: "https://www.escolavirtual.gov.br/catalogo",
    urls: [
      "https://www.escolavirtual.gov.br/catalogo"
    ],
    hosts: ["www.escolavirtual.gov.br"],
    match: /www\.escolavirtual\.gov\.br\/curso\/\d+(?:[/?#]|$)/i,
    anchorSelector: 'a[href*="/curso/"]',
    titleFromClosestSelector: ".card",
    sourceCountPattern: /(\d+)\s+de\s+(\d+)\s+resultados encontrados/i,
    sourceCountGroup: 2,
    waitMs: 1800,
    category: "Cursos gratuitos",
    cert: "check",
    description: "Curso gratuito da Escola Virtual de Governo.",
    minimumRecords: 1,
    strictCoverage: true,
    requireReportedCount: true,
    coverageRatio: 1,
    failOnIncomplete: true,
    maxPages: 90
  },
  {
    portal: "IBM SkillsBuild",
    source: "https://skillsbuild.org/pt-br/learning-catalog?languages=pt-br",
    urls: [
      "https://skillsbuild.org/pt-br/learning-catalog?languages=pt-br",
      "https://skillsbuild.org/pt-br/learning-catalog/university-catalog?languages=pt-br",
      "https://skillsbuild.org/pt-br/learning-catalog/high-school-catalog?languages=pt-br"
    ],
    hosts: ["skillsbuild.org", "skills.yourlearning.ibm.com"],
    match: /skills\.yourlearning\.ibm\.com\/activity\/ALM-COURSE_\d+/i,
    anchorSelector: 'a[href*="skills.yourlearning.ibm.com/activity/ALM-COURSE_"]',
    waitMs: 3000,
    category: "Tecnologia",
    cert: "maybe",
    description: "Curso ou atividade gratuita do catálogo IBM SkillsBuild em português.",
    minimumRecords: 200,
    failOnIncomplete: true,
    maxPages: 8
  },
  {
    portal: "Microsoft Learn",
    source: "https://learn.microsoft.com/pt-br/training/browse/",
    urls: [
      "https://learn.microsoft.com/pt-br/training/browse/",
      "https://learn.microsoft.com/pt-br/training/student-hub/",
      "https://learn.microsoft.com/pt-br/training/career-paths/"
    ],
    hosts: ["learn.microsoft.com"],
    match: /learn\.microsoft\.com\/pt-br\/training\/(?:modules|paths)\/[^/?#]+/i,
    followMatch: /learn\.microsoft\.com\/pt-br\/training\/career-paths\/[^/?#]+\/?$/i,
    waitMs: 1800,
    category: "Tecnologia",
    cert: "maybe",
    description: "Módulo ou roteiro gratuito do Microsoft Learn em português.",
    minimumRecords: 1,
    failOnIncomplete: true,
    maxPages: 120
  },
  {
    portal: "Escola de Pessoas",
    source: "https://escoladepessoas.com.br/trilha/consultoria/",
    urls: [
      "https://escoladepessoas.com.br/trilha/consultoria/#cursos",
      "https://escoladepessoas.com.br/trilha/atracao-de-talentos/",
      "https://escoladepessoas.com.br/trilha/departamento-pessoal/",
      "https://escoladepessoas.com.br/trilha/desenvolvimento-e-performance/",
      "https://escoladepessoas.com.br/trilha/gestao-comportamental/",
      "https://escoladepessoas.com.br/trilha/gestao-de-pessoas/",
      "https://escoladepessoas.com.br/trilha/lideranca/",
      "https://escoladepessoas.com.br/trilha/negocios/",
      "https://escoladepessoas.com.br/trilha/retencao-e-engajamento/"
    ],
    hosts: ["escoladepessoas.com.br"],
    match: /escoladepessoas\.com\.br\/curso\/[^/?#]+/i,
    anchorSelector: 'a.elementor-button[href*="/curso/"]',
    titleFromClosestSelector: ".card-curso",
    waitMs: 1400,
    category: "Gestão de pessoas",
    cert: "maybe",
    description: "Curso gratuito da Escola de Pessoas.",
    minimumRecords: 1,
    failOnIncomplete: true,
    maxPages: 12
  },
  {
    portal: "Cisco CiberEducação",
    source: "https://www.cisco.com/c/m/pt_br/brasil-digital-e-inclusivo/cibereducacao/aluno.html",
    urls: [],
    hosts: ["www.cisco.com", "community.cisco.com", "netacad.com"],
    staticCourses: [
      {
        title: "Sensibilização para a Segurança Digital",
        url: "https://community.cisco.com/t5/programa-cibereduca%C3%A7%C3%A3o-cisco-do-brasil/maratona-cibereduca%C3%A7%C3%A3o-cisco-brasil-2026-inscri%C3%A7%C3%B5es-abertas/ba-p/5564710"
      }
    ],
    category: "Tecnologia",
    cert: "check",
    description: "Curso gratuito da Maratona CiberEducação Cisco Brasil."
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

const TITLE_OVERRIDES = new Map([
  [
    "https://app.santanderopenacademy.com/pt-BR/program/santander-certificacoes-financeiras-2026-2-semestre",
    "Santander Certificações Financeiras 2026"
  ],
  [
    "https://app.santanderopenacademy.com/pt-BR/program/como-investir-em-voce-2026",
    "Como Investir em você 2026"
  ],
  [
    "https://app.santanderopenacademy.com/pt-BR/program/ciberseguranca-do-zero-a-pratica",
    "Cibersegurança do Zero à Prática"
  ],
  [
    "https://app.santanderopenacademy.com/pt-BR/program/santander-fala-mundo-2026-3-edicao",
    "Santander Fala Mundo 2026"
  ],
  [
    "https://app.santanderopenacademy.com/pt-BR/program/santander-marketing-digital",
    "Santander Marketing Digital"
  ]
]);

const GENERIC_TITLE_PATTERN =
  /^(?:mais informações|mais informacoes|saiba mais|ver curso|acessar curso|learn more|search|comece a explorar|inscreva-se)$/i;

function usefulTitle(value) {
  let title = cleanText(value);
  if (!title || GENERIC_TITLE_PATTERN.test(title)) {
    return "";
  }
  title = title
    .replace(/^clique para acessar\s+/i, "")
    .replace(/^(ver|acessar|conheça|saiba mais|learn more)\s*(curso)?\s*$/i, "")
    .replace(/\s*(ver curso|saiba mais|learn more|acessar curso)\s*$/i, "")
    .trim();
  if (!title || GENERIC_TITLE_PATTERN.test(title)) {
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
  const label = cleanText(anchor.text || anchor.aria || anchor.title);
  const rel = cleanText(anchor.rel);
  const semantic = /\b(next|previous|próximo|anterior|seguinte|último|last)\b/i.test(label);
  if (!PAGINATION_PATTERN.test(url) && !semantic) {
    return false;
  }
  return semantic || /\bnext\b/i.test(rel) || /^\d{1,3}$/.test(label);
}

async function readPageAnchors(page, config = {}) {
  const selectors = [
    config.anchorSelector || "a[href]",
    config.paginationSelector
  ].filter(Boolean);
  const selector = [...new Set(selectors)].join(", ");
  return page.locator(selector).evaluateAll(
    (nodes, options) =>
      nodes.map((node) => {
        const onclick = node.getAttribute("onclick") || "";
        const callbackMatch = onclick.match(
          /(?:load|location(?:\.href)?|window\.open)\s*\(\s*['"]([^'"]+)/i
        );
        let href = node.href;
        if (callbackMatch?.[1]) {
          try {
            href = new URL(
              callbackMatch[1].replace(/&amp;/g, "&"),
              window.location.href
            ).href;
          } catch {
            href = node.href;
          }
        }

        const closest = options.closestSelector
          ? node.closest(options.closestSelector)
          : null;
        const nearbyTitle =
          closest?.querySelector("h1,h2,h3,h4,h5,h6")?.innerText || "";
        const closestText = closest?.innerText || "";

        return {
          href,
          text: node.innerText || node.textContent || "",
          title: node.getAttribute("title") || "",
          aria: node.getAttribute("aria-label") || "",
          rel: node.getAttribute("rel") || "",
          nearbyTitle,
          closestText
        };
      }),
    { closestSelector: config.titleFromClosestSelector || "" }
  );
}

async function readShadowCards(page, config) {
  if (!config.cardHostSelector || !config.cardSelector) {
    return [];
  }

  return page
    .evaluate(
      ({ hostSelector, cardSelector, itemAttribute }) => {
        const host = document.querySelector(hostSelector);
        const root = host?.shadowRoot;
        if (!root) {
          return [];
        }

        return [...root.querySelectorAll(cardSelector)]
          .map((node) => {
            const raw = node.getAttribute(itemAttribute);
            if (!raw) {
              return null;
            }
            try {
              return JSON.parse(raw);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
      },
      {
        hostSelector: config.cardHostSelector,
        cardSelector: config.cardSelector,
        itemAttribute: config.cardAttribute || "data-item"
      }
    )
    .catch(() => []);
}

function registerCardItems(items, config, records) {
  for (const item of items) {
    const typeField = config.cardTypeField || "resourceType";
    if (config.cardTypes && !config.cardTypes.includes(item[typeField])) {
      continue;
    }

    const url = canonicalUrl(item[config.cardUrlField || "url"]);
    if (!url) {
      continue;
    }

    const parsed = new URL(url);
    if (!allowedHost(parsed.hostname, config)) {
      continue;
    }

    const title = usefulTitle(item[config.cardTitleField || "title"]) || titleFromSlug(url);
    const excludedByUrl = config.exclude && config.exclude.test(url);
    const excludedByTitle = config.excludeTitle && config.excludeTitle.test(title);
    if (config.match && config.match.test(url) && !excludedByUrl && !excludedByTitle && title) {
      records.set(url, { url, title });
    }
  }
}

function anchorTitle(anchor, config) {
  if (config.titleFromClosestSelector) {
    const nearbyTitle = usefulTitle(anchor.nearbyTitle);
    if (nearbyTitle) {
      return nearbyTitle;
    }

    const lines = String(anchor.closestText || "")
      .split(/\r?\n/)
      .map(cleanText)
      .filter(Boolean);
    const lineNumber = Number(config.titleLine || 1);
    const candidate = lines.at(Math.max(0, lineNumber - 1));
    if (candidate) {
      const title = usefulTitle(candidate);
      if (title) {
        return title;
      }
    }
  }

  if (config.titleLineFromEnd) {
    const lines = String(anchor.text || "")
      .split(/\r?\n/)
      .map(cleanText)
      .filter(Boolean);
    const candidate = lines.at(-config.titleLineFromEnd);
    if (candidate) {
      const title = usefulTitle(candidate);
      if (title) {
        return title;
      }
    }
  }

  return config.preferAnchorTitle
    ? usefulTitle(anchor.title) ||
        usefulTitle(anchor.text) ||
        usefulTitle(anchor.aria) ||
        titleFromSlug(anchor.href)
    : usefulTitle(anchor.text) ||
        usefulTitle(anchor.title) ||
        usefulTitle(anchor.aria) ||
        titleFromSlug(anchor.href);
}

async function scrollCatalog(page) {
  await page
    .evaluate(async () => {
      for (let index = 0; index < 7; index += 1) {
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
      window.scrollTo(0, 0);
    })
    .catch(() => {});
}

function registerAnchors(anchors, config, records, pending, queued, visited) {
  for (const anchor of anchors) {
    const url = canonicalUrl(anchor.href);
    if (!url) {
      continue;
    }
    const parsed = new URL(url);
    if (!allowedHost(parsed.hostname, config)) {
      continue;
    }

    const title = anchorTitle(anchor, config);
    const excludedByUrl = config.exclude && config.exclude.test(url);
    const excludedByTitle = config.excludeTitle && config.excludeTitle.test(title);
    if (config.match && config.match.test(url) && !excludedByUrl && !excludedByTitle) {
      if (title) {
        const previous = records.get(url);
        if (!previous || previous.title === titleFromSlug(url)) {
          records.set(url, { url, title });
        }
      }
    }

    const followsConfiguredPage =
      config.followMatch && config.followMatch.test(url);
    if (
      pending.length + visited.size < (config.maxPages || 12) &&
      !visited.has(url) &&
      !queued.has(url) &&
      (followsConfiguredPage || shouldFollowPagination(anchor, url, config))
    ) {
      queued.add(url);
      pending.push(url);
    }
  }
}

async function collectPortal(browser, config) {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (compatible; TodosCursosFreeBot/1.0; +https://github.com/edsonjunioor32/todos-os-cursos-free)"
  });
  const pending = [...config.urls];
  const queued = new Set(pending);
  const visited = new Set();
  const records = new Map();
  const errors = [];
  let reportedCount = null;

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

      await page.waitForTimeout(config.waitMs || 1400);
      if (config.pageSizeSelector) {
        const pageSize = page.locator(config.pageSizeSelector);
        if (await pageSize.count()) {
          await pageSize.selectOption({ label: config.pageSizeLabel });
          await page.waitForTimeout(config.waitMs || 3000);
        }
      }

      if (config.consentSelector) {
        const consent = page.locator(config.consentSelector);
        if (await consent.count() && await consent.isVisible().catch(() => false)) {
          try {
            await consent.click({ timeout: 10000 });
            await page.waitForTimeout(config.consentWaitMs || 1000);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(catalogUrl + " -> consent: " + message);
          }
        }
      }

      if (config.waitForSelector) {
        try {
          await page.waitForSelector(config.waitForSelector, {
            state: "attached",
            timeout: config.waitForSelectorTimeout || 15000
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(catalogUrl + " -> wait-for-content: " + message);
        }
      }

      if (config.tabSelector) {
        const tab = config.cardHostSelector
          ? page.locator(config.cardHostSelector).locator(config.tabSelector)
          : page.locator(config.tabSelector);
        if (await tab.count()) {
          try {
            await tab.click({ timeout: 10000 });
            await page.waitForTimeout(config.tabWaitMs || config.waitMs || 1800);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(catalogUrl + " -> tab: " + message);
          }
        }
      }

      const captureCurrentPage = async (shouldScroll = true) => {
        if (shouldScroll) {
          await scrollCatalog(page);
        }
        const anchors = await readPageAnchors(page, config);
        registerAnchors(anchors, config, records, pending, queued, visited);
        if (config.cardHostSelector) {
          const items = await readShadowCards(page, config);
          registerCardItems(items, config, records);
        }
        if (config.sourceCountPattern) {
          const bodyText = await page.locator("body").innerText().catch(() => "");
          const countMatch = bodyText.match(config.sourceCountPattern);
          if (countMatch) {
            reportedCount = Number(countMatch[config.sourceCountGroup || 1]);
          }
        }
      };

      if (config.nextPageSelector) {
        let stagnant = 0;
        for (let pageNumber = 0; pageNumber < (config.clientPages || 24); pageNumber += 1) {
          const before = records.size;
          await captureCurrentPage();
          if (pageNumber + 1 >= (config.clientPages || 24)) {
            break;
          }

          const next = config.cardHostSelector
            ? page.locator(config.cardHostSelector).locator(config.nextPageSelector)
            : page.locator(config.nextPageSelector);
          if (!(await next.count())) {
            break;
          }
          if (!(await next.isVisible().catch(() => false))) {
            break;
          }
          if (!(await next.isEnabled().catch(() => false))) {
            break;
          }
          if ((await next.getAttribute("aria-disabled").catch(() => null)) === "true") {
            break;
          }

          try {
            await next.click({ timeout: 10000 });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(catalogUrl + " -> next-page: " + message);
            break;
          }
          await page.waitForTimeout(config.pageWaitMs || config.waitMs || 1800);
          if (records.size === before) {
            stagnant += 1;
          } else {
            stagnant = 0;
          }
          if (stagnant >= 2) {
            break;
          }
        }
      } else if (config.clientPageSelector) {
        for (let pageNumber = 0; pageNumber < (config.clientPages || 1); pageNumber += 1) {
          await captureCurrentPage();
          const controls = page.locator(config.clientPageSelector);
          const count = await controls.count();
          if (pageNumber + 1 >= count || pageNumber + 1 >= (config.clientPages || 1)) {
            break;
          }
          await controls.nth(pageNumber + 1).click();
          await page.waitForTimeout(config.waitMs || 2000);
        }
      } else {
        await captureCurrentPage();
      }

      if (config.loadMoreSelector) {
        let stagnant = 0;
        for (let clickNumber = 0; clickNumber < (config.loadMoreLimit || 24); clickNumber += 1) {
          const loadMore = config.cardHostSelector
            ? page.locator(config.cardHostSelector).locator(config.loadMoreSelector)
            : page.locator(config.loadMoreSelector);
          if (!(await loadMore.count())) {
            break;
          }
          if (!(await loadMore.isVisible().catch(() => false))) {
            break;
          }
          if (!(await loadMore.isEnabled().catch(() => false))) {
            break;
          }

          const before = records.size;
          try {
            await loadMore.click({ timeout: 10000 });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(catalogUrl + " -> load-more: " + message);
          }
          await page.waitForTimeout(config.loadMoreWaitMs || config.waitMs || 1800);
          await captureCurrentPage(false);

          if (records.size === before) {
            stagnant += 1;
          } else {
            stagnant = 0;
          }
          if (stagnant >= 2) {
            break;
          }
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
    reportedCount,
    errors
  };
}

function buildRecord(config, item, previous) {
  const itemTitle = usefulTitle(item.title);
  const previousTitle = usefulTitle(previous?.title);
  const title =
    TITLE_OVERRIDES.get(canonicalUrl(item.url)) ||
    itemTitle ||
    previousTitle ||
    titleFromSlug(item.url);

  return {
    ...(previous || {}),
    category: previous?.category || config.category,
    cert: previous?.cert || config.cert,
    description: previous?.description || config.description,
    portal: config.portal,
    source: config.source,
    title,
    url: previous?.url || item.url
  };
}

function validateCollectedResult(result, config) {
  const reasons = [];
  const discovered = result.records.length;
  const minimumRecords = Number(config.minimumRecords || (config.match ? 1 : 0));

  if (discovered < minimumRecords) {
    reasons.push(
      "encontrados " + discovered + ", mínimo esperado " + minimumRecords
    );
  }

  if (config.requireReportedCount && !Number.isFinite(result.reportedCount)) {
    reasons.push("a fonte não informou a quantidade esperada");
  }

  if (
    config.strictCoverage &&
    Number.isFinite(result.reportedCount) &&
    Number.isFinite(Number(config.coverageRatio))
  ) {
    const required = Math.ceil(
      result.reportedCount * Number(config.coverageRatio)
    );
    if (discovered < required) {
      reasons.push(
        "encontrados " +
          discovered +
          " de " +
          result.reportedCount +
          " informados pela fonte"
      );
    }
  }

  if (config.failOnErrors && result.errors.length) {
    reasons.push("erros de coleta: " + result.errors.join("; "));
  }

  return { valid: reasons.length === 0, reasons };
}

function mergePortalCourses(
  previous,
  discovered,
  config,
  validation = { valid: true, reasons: [] }
) {
  const validPrevious = previous.filter((course) => {
    if (config.exclude && config.exclude.test(course.url)) {
      return false;
    }
    if (config.excludeTitle && config.excludeTitle.test(course.title || "")) {
      return false;
    }
    return true;
  });

  const byUrl = new Map(
    validPrevious.map((course) => [canonicalUrl(course.url), course])
  );

  for (const item of config.staticCourses || []) {
    const key = canonicalUrl(item.url);
    if (!key) {
      continue;
    }
    const old = byUrl.get(key);
    byUrl.set(key, buildRecord(config, item, old));
  }

  if (!config.match) {
    return {
      courses: [...byUrl.values()],
      status: config.staticCourses?.length ? "seeded" : "static",
      discovered: config.staticCourses?.length || 0
    };
  }

  const minimum = Math.max(
    validPrevious.length
      ? Math.max(1, Math.floor(validPrevious.length * 0.25))
      : 1,
    Number(config.minimumRecords || 0)
  );

  if (!validation.valid || discovered.length < minimum) {
    return {
      courses: validPrevious,
      status: validation.valid ? "preserved" : "incomplete",
      discovered: discovered.length,
      minimum,
      reasons: validation.reasons
    };
  }

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
      const merged = mergePortalCourses(previous, [], config);
      mergedByPortal.set(config.portal, merged.courses);
      stats.push({
        portal: config.portal,
        status: merged.status,
        discovered: merged.discovered,
        total: merged.courses.length
      });
      if (merged.courses.length > 0) {
        successfulCatalogs += 1;
      }
      continue;
    }

    const result = await collectPortal(browser, config);
    const validation = validateCollectedResult(result, config);
    const merged = mergePortalCourses(
      previous,
      result.records,
      config,
      validation
    );

    if (!validation.valid && config.failOnIncomplete) {
      throw new Error(
        config.portal + " não passou na validação de cobertura: " +
          validation.reasons.join("; ")
      );
    }

    mergedByPortal.set(config.portal, merged.courses);
    stats.push({
      portal: config.portal,
      status: merged.status,
      discovered: merged.discovered,
      total: merged.courses.length,
      visited: result.visited,
      reported: result.reportedCount,
      validation: validation.reasons,
      errors: result.errors
    });

    if (result.records.length > 0 && validation.valid) {
      successfulCatalogs += 1;
    }
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
  if (
    stat.status === "updated" ||
    stat.status === "preserved" ||
    stat.status === "seeded"
  ) {
    const reported =
      Number.isFinite(stat.reported) && stat.reported > 0
        ? " Fonte reportou " + stat.reported + "."
        : "";
    coverage[stat.portal] =
      stat.discovered > 0
        ? stat.discovered +
          " cursos encontrados; " +
          stat.total +
          " mantidos no catálogo." +
          reported
        : stat.total + " cursos mantidos no catálogo." + reported;
  } else if (stat.status === "incomplete") {
    coverage[stat.portal] =
      "Atualização bloqueada por cobertura incompleta; catálogo anterior preservado.";
  }
}

const updatedCatalog = {
  ...catalog,
  generatedAt: today,
  coverage,
  sources: CATALOGS.map(({ portal, source }) => ({ portal, url: source })),
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
      (stat.reported ? ", reportado=" + stat.reported : "") +
      errors
  );
}
