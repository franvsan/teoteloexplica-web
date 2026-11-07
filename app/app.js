"use strict";
const $=id=>document.getElementById(id);let pestana="enlace";
function lista(cl,arr){return arr.length?"<ul>"+arr.map(x=>"<li class='"+cl+"'>"+x+"</li>").join("")+"</ul>":""}
function veredicto(grupos){const mal=grupos.reduce((a,g)=>a+g.mal.length,0),reg=grupos.reduce((a,g)=>a+g.reg.length,0);
 if(mal>=1)return{c:"rojo",i:"✖",t:"Cuidado: tiene señales de estafa",h:"No pulses, no respondas y no pongas datos. Entra tú mismo en la web o app oficial escribiendo la dirección."};
 if(reg>=2)return{c:"ambar",i:"!",t:"Dudoso: varias cosas raras",h:"Mejor no abrirlo. Si te preocupa, entra tú mismo en la web oficial para comprobarlo."};
 if(reg===1)return{c:"ambar",i:"!",t:"Con una cosa rara",h:"Ve con cuidado y no pongas datos si no estás seguro."};
 return{c:"gris",i:"?",t:"No veo señales, pero no es una garantía",h:"Que no vea nada no significa que sea seguro. Ante la duda, entra tú mismo en la web oficial."}}
function guardar(tipo,texto,v){try{const h=JSON.parse(localStorage.getItem("hist")||"[]");h.unshift({tipo,texto:texto.slice(0,60),c:v.c});localStorage.setItem("hist",JSON.stringify(h.slice(0,8)));verHist()}catch(e){}}
function verHist(){try{const h=JSON.parse(localStorage.getItem("hist")||"[]");$("caja-hist").hidden=!h.length;$("hist").innerHTML=h.map(x=>"<li><i class='"+x.c+"'></i><span>"+esc(x.tipo+": "+x.texto)+"</span></li>").join("")}catch(e){}}
function htmlCmp(g){if(!g.cmp)return"";const c=g.cmp;let r=alinear(c.tuyo,c.oficial);const lejos=lev(c.tuyo,c.oficial)>3;if(lejos)r={x:[...c.tuyo].map(ch=>({c:ch,ok:true})),y:[...c.oficial].map(ch=>({c:ch,ok:true}))};
 const fila=(t,txt)=>"<div class='cmp-f'><span class='cmp-e'>"+t+"</span><span class='cmp-t' translate='no'>"+txt.map(x=>"<span class='"+(x.ok?"":(x.hueco?"hu":"di"))+"'>"+esc(x.c)+"</span>").join("")+"</span></div>";
 const notas=lejos?["No es la misma dirección: la tuya acaba en <b>"+esc(dominioBase(c.tuyo))+"</b>, la oficial es <b>"+esc(c.oficial)+"</b>."]:notasCmp(r);
 return "<div class='cmp'><b>Comparativa con la oficial ("+esc(c.marca)+")</b>"+fila("Tu enlace",r.x)+fila("Oficial",r.y)+(notas.length?"<ul>"+notas.map(n=>"<li class='mal'>"+n+"</li>").join("")+"</ul>":"")+
 "<a class='abrir' href='https://"+esc(c.oficial)+"' target='_blank' rel='noopener noreferrer'>Abrir la web oficial: "+esc(c.oficial)+"</a><small>Esta dirección la hemos escrito nosotros, no sale de tu mensaje.</small></div>"}
function pintar(grupos,tipo,texto){const v=veredicto(grupos);const of=grupos.find(g=>g.oficial);
 if(of&&of.oficial&&!grupos.some(g=>g.mal.length||g.reg.length)){v.c="verde";v.i="✔";v.t="Es la dirección oficial de "+of.oficial.marca;v.h="Aun así, comprueba que el mensaje que te llevó hasta aquí sea real: puede llevarte a la web buena y pedirte algo raro."}
 let h="<div class='sem "+v.c+"'><div class='dot' aria-hidden='true'>"+v.i+"</div><h2>"+v.t+"</h2></div>";
 for(const g of grupos){if(g.titulo)h+="<p><b>"+g.titulo+"</b></p>";h+=lista("mal",g.mal)+lista("reg",g.reg)+lista("bien",g.bien)+htmlCmp(g)}
 h+="<div class='hazlo'><b>Qué hacer:</b> "+v.h+"</div><div class='fila'><button class='sec ancho' id='comp' type='button'>Compartir resultado</button></div><small>Es una ayuda, no un certificado de seguridad.</small>";
 const r=$("res");r.innerHTML=h;r.className="caja res on";r.focus({preventScroll:true});r.scrollIntoView({behavior:"smooth",block:"start"});guardar(tipo,texto,v);
 $("comp").onclick=()=>{const t="¿Es de fiar? → "+v.t+". Lo he revisado con la app de @teo.teloexplica";navigator.share?navigator.share({title:"¿Es de fiar?",text:t}).catch(()=>{}):navigator.clipboard&&navigator.clipboard.writeText(t)}}
const PESTANAS=["enlace","mensaje","pagina","oficiales","avisos"];
function cambiar(t){pestana=t;document.querySelectorAll(".tab").forEach(x=>x.setAttribute("aria-selected",x.dataset.t===t));for(const n of PESTANAS)$("p-"+n).hidden=n!==t;$("fila-go").hidden=t==="oficiales"||t==="avisos";$("ejemplos").hidden=t!=="enlace";if(t==="avisos")cargarAvisos()}
document.querySelectorAll(".tab").forEach(b=>{b.addEventListener("click",()=>cambiar(b.dataset.t));b.addEventListener("keydown",e=>{const o=PESTANAS,i=o.indexOf(pestana);if(e.key==="ArrowRight"||e.key==="ArrowLeft"){const n=o[(i+(e.key==="ArrowRight"?1:4))%5];cambiar(n);$("t-"+n).focus()}})});
function revisar(){
 if(pestana==="enlace"){const v=$("url").value;const r=analizarEnlace(v);if(!r)return;pintar([r],"Enlace",v)}
 else if(pestana==="mensaje"){const v=$("msg").value;const m=analizarMensaje(v);if(!m)return;const g=[{mal:m.mal,reg:m.reg,bien:m.bien}];m.enlaces.forEach(x=>g.push(Object.assign({titulo:"Enlace: <code>"+esc(x.e)+"</code>"},x.r)));pintar(g,"Mensaje",v)}
 else{const p=analizarPagina($("src").value,$("url2").value);if(!p)return;const g=[p];const u=analizarEnlace($("url2").value);if(u)g.push(Object.assign({titulo:"Dirección de la página"},u));pintar(g,"Página",$("url2").value||"código pegado")}}
$("go").addEventListener("click",revisar);
$("url").addEventListener("keydown",e=>{if(e.key==="Enter")revisar()});$("url2").addEventListener("keydown",e=>{if(e.key==="Enter")revisar()});
$("borrar").addEventListener("click",()=>{["url","msg","src","url2"].forEach(i=>$(i).value="");$("res").className="caja res"});
$("limpiar").addEventListener("click",()=>{try{localStorage.removeItem("hist")}catch(e){}verHist()});
// entrada desde «Compartir» del móvil o atajo
(function(){const q=new URLSearchParams(location.search);const txt=[q.get("title"),q.get("text"),q.get("url")].filter(Boolean).join("\n");
 if(q.get("tab")==="mensaje"||txt){cambiar("mensaje");if(txt){$("msg").value=txt;setTimeout(revisar,50)}}})();
// instalar
let evInst=null;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();evInst=e;$("instalar").classList.add("on")});
$("btn-inst").addEventListener("click",async()=>{if(!evInst)return;evInst.prompt();await evInst.userChoice;evInst=null;$("instalar").classList.remove("on")});
window.addEventListener("appinstalled",()=>$("instalar").classList.remove("on"));
if(/iphone|ipad/i.test(navigator.userAgent)&&!navigator.standalone)$("como-instalar").open=true;
if("serviceWorker"in navigator&&location.protocol.startsWith("http"))addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
function verOficiales(f){const q=(f||"").toLowerCase().trim();const items=Object.entries(MARCAS).filter(([n,ds])=>!q||n.toLowerCase().includes(q)||ds.some(d=>d.includes(q)));
 $("lista-of").innerHTML=items.length?items.map(([n,ds])=>"<li><b>"+esc(n)+"</b><span translate='no'>"+ds.map(d=>"<a href='https://"+esc(d)+"' target='_blank' rel='noopener noreferrer'>"+esc(d)+"</a>").join(" · ")+"</span></li>").join(""):"<li>No tengo esa marca en mi lista. Búscala tú escribiendo su nombre en el navegador y fíjate en la dirección.</li>"}
$("buscar-of").addEventListener("input",e=>verOficiales(e.target.value));verOficiales("");
// ---- avisos de la comunidad ----
const API=(window.API_BASE||"/api");let avisosCargados=false;
function fechaCorta(t){try{return new Date(t).toLocaleDateString("es-ES",{day:"numeric",month:"short"})}catch(e){return""}}
async function cargarAvisos(forzar){if(avisosCargados&&!forzar)return;const ul=$("lista-avisos");
 try{const r=await fetch(API+"/avisos",{headers:{accept:"application/json"}});if(!r.ok)throw 0;const d=await r.json();avisosCargados=true;
  ul.innerHTML=d.avisos.length?d.avisos.map(a=>"<li><div class='av-c'><b>"+esc(a.marca)+"</b> · "+esc(a.tipo)+" · "+fechaCorta(a.t)+"</div>"+(a.enlace?"<code translate='no'>"+esc(a.enlace)+"</code>":"")+(a.texto?"<p>"+esc(a.texto)+"</p>":"")+"<button class='sec peq2 yo' data-id='"+esc(a.id)+"' type='button'>Me ha llegado también ("+(a.yo|0)+")</button></li>").join(""):"<li>Aún no hay avisos publicados. Sé el primero en compartir uno.</li>"}
 catch(e){ul.innerHTML="<li>No puedo cargar los avisos ahora mismo (¿sin conexión?). Inténtalo más tarde.</li>"}}
$("lista-avisos").addEventListener("click",async e=>{const b=e.target.closest(".yo");if(!b)return;b.disabled=true;try{const r=await(await fetch(API+"/avisos/"+encodeURIComponent(b.dataset.id)+"/yo",{method:"POST"})).json();if(r.yo!==undefined)b.textContent="Me ha llegado también ("+r.yo+")";else if(r.repetido)b.textContent="Ya lo has marcado"}catch(x){b.disabled=false}});
$("a-enviar").addEventListener("click",async()=>{const m=$("a-msg");m.textContent="Enviando…";
 try{const r=await fetch(API+"/avisos",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({marca:$("a-marca").value,tipo:$("a-tipo").value,enlace:$("a-enlace").value,texto:$("a-texto").value,web:$("a-web").value})});const d=await r.json();
  m.textContent=r.ok?(d.mensaje||"Gracias."):(d.error||"No se ha podido enviar.");if(r.ok){$("a-enlace").value="";$("a-texto").value=""}}catch(e){m.textContent="No hay conexión. Inténtalo más tarde."}});
// ejemplos
document.querySelectorAll(".chip-ej").forEach(b=>b.addEventListener("click",()=>{cambiar("enlace");$("url").value=b.dataset.v;revisar()}));
// la pestaña Avisos solo aparece si el servidor del foro responde
(async()=>{try{const r=await fetch(API+"/avisos",{headers:{accept:"application/json"}});if(r.ok&&(r.headers.get("content-type")||"").includes("json"))$("t-avisos").hidden=false}catch(e){}})();
verHist();window.__v={analizarEnlace,analizarMensaje,analizarPagina,alinear};
