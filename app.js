(() => {
"use strict";
const labels={free:"Certificado gratuito",declaration:"Declaração após avaliação",check:"Confira o certificado",maybe:"Certificado opcional ou pode ser pago",material:"Material gratuito"};
const $=id=>document.getElementById(id);
const grid=$("courseGrid"),search=$("courseSearch"),portal=$("portalFilter"),category=$("categoryFilter"),cert=$("certificateFilter"),sort=$("sortCourses"),count=$("visibleCount"),summary=$("resultsSummary"),filterCount=$("filterCount"),empty=$("emptyState");
const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
function options(select,values){values.sort((a,b)=>a.localeCompare(b,"pt-BR")).forEach(value=>{const option=document.createElement("option");option.value=value;option.textContent=value;select.append(option)})}
function normalizeCourse(c){return {portal:String(c.portal||"Portal"),category:String(c.category||"Curso"),title:String(c.title||"Curso sem título"),url:String(c.url||"#"),cert:String(c.cert||"check"),description:String(c.description||"Consulte a página original para detalhes."),duration:String(c.duration||"")}}
function start(courses){
  courses=courses.map(normalizeCourse).filter(c=>c.url!=="#");
  options(portal,[...new Set(courses.map(c=>c.portal))]);options(category,[...new Set(courses.map(c=>c.category))]);
  function card(c){
    const el=document.createElement("article");el.className="course-card";
    const icon=c.portal.replace(/[^A-Za-zÀ-ÿ]/g,"").slice(0,3).toUpperCase(),certLabel=labels[c.cert]||"Confira as condições",primary=c.cert==="material"?"Material gratuito":"Curso gratuito",action=c.cert==="material"?"Acessar material":"Acessar curso",duration=c.duration?'<span class="course-tag">'+escapeHTML(c.duration)+"</span>":"";
    el.innerHTML='<div class="card-topline"><span class="course-icon" aria-hidden="true">'+escapeHTML(icon)+'</span><span class="course-category">Portal: '+escapeHTML(c.portal)+'<br>'+escapeHTML(c.category)+'</span></div><h3>'+escapeHTML(c.title)+'</h3><p>'+escapeHTML(c.description)+'</p><div class="course-tags"><span class="course-tag course-tag-positive">'+primary+'</span>'+duration+'<span class="course-tag">'+escapeHTML(certLabel)+'</span></div><a class="course-link" href="'+escapeHTML(c.url)+'" target="_blank" rel="noopener noreferrer">'+action+' <span aria-hidden="true">↗</span></a>';
    return el;
  }
  function render(){
    const term=search.value.trim().toLocaleLowerCase("pt-BR"),p=portal.value,cat=category.value,ce=cert.value;
    let list=courses.filter(c=>(!term||[c.title,c.portal,c.category,c.description].join(" ").toLocaleLowerCase("pt-BR").includes(term))&&(!p||c.portal===p)&&(!cat||c.category===cat)&&(!ce||c.cert===ce));
    if(sort.value==="az")list.sort((a,b)=>a.title.localeCompare(b.title,"pt-BR"));
    if(sort.value==="category")list.sort((a,b)=>a.category.localeCompare(b.category,"pt-BR")||a.title.localeCompare(b.title,"pt-BR"));
    grid.replaceChildren(...list.map(card));empty.hidden=list.length>0;count.textContent=list.length;summary.textContent=list.length+" "+(list.length===1?"opção encontrada":"opções encontradas");filterCount.textContent=[term,p,cat,ce].filter(Boolean).length;
  }
  function clear(){search.value="";portal.value="";category.value="";cert.value="";sort.value="featured";render();search.focus()}
  search.addEventListener("input",render);portal.addEventListener("change",render);category.addEventListener("change",render);cert.addEventListener("change",render);sort.addEventListener("change",render);$("clearFilters").addEventListener("click",clear);document.querySelector("[data-clear]").addEventListener("click",clear);render();
}
async function load(){
  try{const response=await fetch("./courses.json",{cache:"no-store"});if(!response.ok)throw new Error("Falha ao carregar cursos.json");const payload=await response.json();start(Array.isArray(payload)?payload:payload.courses||[]);}
  catch(error){console.error(error);$("resultsSummary").textContent="Não foi possível carregar o catálogo";$("emptyState").hidden=false;$("emptyState").querySelector("h3").textContent="Catálogo temporariamente indisponível";$("emptyState").querySelector("p").textContent="Atualize a página ou tente novamente em instantes.";}
}
load();
})();