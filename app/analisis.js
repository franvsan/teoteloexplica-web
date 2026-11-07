"use strict";
// ---------- datos ----------
const MARCAS = {
 "Apple":["apple.com","icloud.com"],"Amazon":["amazon.es","amazon.com","amazon.de","amazon.fr","amazon.it","amazon.co.uk"],"AliExpress":["aliexpress.com","aliexpress.es"],
 "Correos":["correos.es","correosexpress.com"],"Agencia Tributaria":["agenciatributaria.es","agenciatributaria.gob.es"],"DGT":["dgt.es","sede.dgt.gob.es"],"Seguridad Social":["seg-social.es","seg-social.gob.es"],
 "BBVA":["bbva.es","bbva.com"],"Santander":["bancosantander.es","santander.com","santander.es"],"CaixaBank":["caixabank.es","caixabank.com","lacaixa.es"],"Bankinter":["bankinter.com"],"ING":["ing.es","ingdirect.es"],"Sabadell":["bancsabadell.com","sabadell.com"],"Unicaja":["unicajabanco.es"],"Abanca":["abanca.com"],"Openbank":["openbank.es"],
 "PayPal":["paypal.com"],"Netflix":["netflix.com"],"Google":["google.com","google.es","gmail.com"],"Microsoft":["microsoft.com","live.com","outlook.com","office.com"],"Facebook":["facebook.com","fb.com"],"Instagram":["instagram.com"],"WhatsApp":["whatsapp.com"],
 "Movistar":["movistar.es","telefonica.es"],"Vodafone":["vodafone.es"],"Orange":["orange.es"],"SEUR":["seur.com"],"MRW":["mrw.es"],"DHL":["dhl.com","dhl.es"],"UPS":["ups.com"],"FedEx":["fedex.com"],"Wallapop":["wallapop.com"],"Vinted":["vinted.es","vinted.com"],"Booking":["booking.com"],"Spotify":["spotify.com"],"Glovo":["glovo.com"]
};
const ACORTADORES=["bit.ly","tinyurl.com","cutt.ly","is.gd","rb.gy","shorturl.at","t.ly","ow.ly","goo.gl","tiny.cc","rebrand.ly"];
const TLD_RIESGO=["xyz","top","click","icu","buzz","cfd","sbs","vip","cyou","rest","monster","support","work","live","today","site","online"];
const PALABRAS_URL=["login","signin","verify","verif","secure","segur","update","actualiz","pago","pay","seguimiento","tracking","paquete","multa","reembolso","refund","cuenta","account","confirm","desbloq","unlock","clave","sms"];
const CONFUSOS={"а":"a","е":"e","о":"o","р":"p","с":"c","у":"y","х":"x","і":"i","ј":"j","ѕ":"s","ԁ":"d","ɡ":"g","ᴀ":"a","α":"a","ο":"o","ν":"v","ρ":"p","τ":"t","ι":"i","κ":"k","υ":"u","ɑ":"a","ı":"i","0":"o","1":"l","3":"e","5":"s"};
// ---------- utilidades ----------
function lev(a,b){const m=a.length,n=b.length;const d=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);for(let j=1;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n]}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function alfabeto(ch){const c=ch.codePointAt(0);if(c<128)return"latino";if(c>=0x400&&c<=0x52f)return"cirílico";if(c>=0x370&&c<=0x3ff)return"griego";if(c>=0x530&&c<=0x58f)return"armenio";if(c>=0x4e00&&c<=0x9fff)return"chino";if(c>=0xc0&&c<=0x24f)return"latino acentuado";return"otro"}
function esquelet(h){return h.toLowerCase().split("").map(c=>CONFUSOS[c]||c).join("").replace(/rn/g,"m").replace(/vv/g,"w").replace(/-/g,"")}
function dominioBase(host){const p=host.split(".");if(p.length<=2)return host;const dos=["co.uk","com.es","gob.es","org.es","com.ar","com.mx"];const u2=p.slice(-2).join(".");return dos.includes(u2)?p.slice(-3).join("."):u2}
function coincideOficial(host){for(const[n,ds]of Object.entries(MARCAS))for(const d of ds)if(host===d||host.endsWith("."+d))return{marca:n,dominio:d};return null}
function extraerEnlaces(t){return(t.match(/(?:https?:\/\/|www\.)[^\s<>"')]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|es|net|org|xyz|top|click|icu|info|me|ly|cc|co|io|app|shop|site|online|vip|live|support|work)\b(?:\/[^\s<>"')]*)?/gi)||[]).slice(0,5)}
// ---------- análisis de un enlace ----------
function analizarEnlace(entrada){
 const o={mal:[],reg:[],bien:[],host:"",oficial:null};let raw=entrada.trim();if(!raw){return null}
 const hostCrudo=(raw.replace(/^[a-z]+:\/\//i,"").split(/[\/?#]/)[0]).split("@").pop();
 let url;try{url=new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)?raw:"https://"+raw)}catch(e){o.reg.push("No consigo leer bien esta dirección. Revisa que esté completa.");return o}
 const host=url.hostname.toLowerCase();o.host=host;
 // alfabetos mezclados
 const unicode=[...hostCrudo].filter(c=>c.codePointAt(0)>127);const idn=host.split(".").some(l=>l.startsWith("xn--"));
 if(unicode.length||idn){const al=[...new Set(unicode.map(alfabeto))];
  const tieneLatino=/[a-z]/.test(hostCrudo.replace(/[^\x00-\x7f]/g,""));const raro=al.filter(a=>a==="cirílico"||a==="griego"||a==="armenio"||a==="otro");
  if(raro.length&&tieneLatino)o.mal.push("Mezcla letras de otro alfabeto ("+raro.join(", ")+") con letras normales. Es el truco de la «а» rusa: parece igual a nuestra «a», pero para el ordenador es otra letra y lleva a una web distinta.");
  else if(raro.length)o.mal.push("La dirección usa letras de otro alfabeto ("+raro.join(", ")+"). Desconfía.");
  else if(idn)o.reg.push("La dirección usa caracteres especiales (acentos o símbolos). Compruébala con cuidado.");
  if(idn&&!unicode.length)o.reg.push("Esta dirección está escrita en «punycode» (empieza por xn--). Es la forma técnica de una dirección con letras raras.");}
 // oficial
 const of=coincideOficial(host);
 const hostU=hostCrudo.toLowerCase().replace(/:\d+$/,"").replace(/\.$/,"");const sk=esquelet(hostU);let parecida=null;
 for(const[n,ds]of Object.entries(MARCAS))for(const d of ds){const base=d.split(".")[0];const hb=esquelet(dominioBase(hostU).split(".")[0]);
   if(!of&&hb.length>3&&hb!==esquelet(base)&&lev(hb,esquelet(base))<=1&&Math.abs(hb.length-base.length)<=1&&!parecida)parecida={n,d};
   if(!of&&esquelet(base).length>3&&sk.includes(esquelet(base))&&!parecida&&(sk!==esquelet(d)))parecida={n,d,contiene:true};
   if(!of&&sk===esquelet(d)&&hostU!==d)parecida={n,d,igual:true};}
 const guardaCmp=(n,d,tuyo)=>{if(!o.cmp)o.cmp={marca:n,oficial:d,tuyo}};
 if(of){o.oficial=of;o.bien.push("La dirección coincide con la oficial conocida de <b>"+esc(of.marca)+"</b> ("+esc(of.dominio)+").")}
 else if(parecida){const m=parecida;guardaCmp(m.n,m.d,hostU);o.mal.push(m.igual?"Se ve casi idéntica a <b>"+esc(m.d)+"</b> ("+esc(m.n)+"), pero no es esa dirección.":m.contiene?"Lleva el nombre de <b>"+esc(m.n)+"</b> pero NO es su dirección oficial ("+esc(m.d)+"). Es una técnica típica para engañar.":"Se parece mucho a <b>"+esc(m.d)+"</b> ("+esc(m.n)+") pero no es la misma. Puede ser una imitación.")}
 // trucos de subdominios
 const partes=host.split(".");
 if(!of){for(const[n,ds]of Object.entries(MARCAS))for(const d of ds){const nombre=d.split(".")[0];if(partes.slice(0,-2).some(p=>p===nombre||p.includes(nombre))&&!parecida){guardaCmp(n,d,dominioBase(host));o.mal.push("Empieza con <b>"+esc(nombre)+"</b> pero el dominio real es <code>"+esc(dominioBase(host))+"</code>. Lo que importa es lo que va justo antes de la última terminación.");parecida=true;break}}}
 if(partes.length>4)o.reg.push("Tiene muchos «trozos» antes de la terminación; así se esconde el nombre real.");
 if(/@/.test(raw.split(/[?#]/)[0].replace(/^[a-z]+:\/\//i,"").split("/")[0]))o.mal.push("Lleva una @ dentro de la dirección: lo que va antes de la @ es un adorno, la web real es la que va después.");
 if(/^\d+\.\d+\.\d+\.\d+$/.test(host))o.mal.push("Es una dirección numérica (IP), no un nombre. Las empresas reales no te envían así.");
 if(url.protocol==="http:")o.reg.push("No tiene candado (http). Cualquier web seria usa https.");
 else if(url.protocol==="https:"&&!o.oficial)o.bien.push("Tiene candado (https), pero eso lo tiene también cualquier web falsa: <b>no demuestra que sea oficial</b>.");
 const tld=partes[partes.length-1];if(TLD_RIESGO.includes(tld)&&!of)o.reg.push("Termina en <code>."+esc(tld)+"</code>, una terminación barata muy usada en webs falsas.");
 if(ACORTADORES.includes(host)||ACORTADORES.includes(dominioBase(host)))o.reg.push("Es un enlace acortado: no se ve a dónde lleva. Mejor no abrirlo.");
 if(!idn&&host.split("-").length>3)o.reg.push("Tiene muchos guiones, típico de direcciones inventadas.");
 const ruta=(url.pathname+url.search).toLowerCase();const hits=PALABRAS_URL.filter(w=>(host+ruta).includes(w));
 if(hits.length&&!of)o.reg.push("Incluye palabras que empujan a actuar ("+hits.slice(0,3).map(esc).join(", ")+").");
 if(!o.mal.length&&!o.reg.length&&!of)o.bien.push("No veo señales raras en la dirección, pero tampoco la conozco como oficial.");
 return o}
// ---------- análisis de un mensaje ----------
function analizarMensaje(t){
 const o={mal:[],reg:[],bien:[],enlaces:[]};const l=t.toLowerCase();if(!l.trim())return null;
 const R=[[/(24|48)\s*horas|[uú]ltimo aviso|urgente|inmediatamente|hoy mismo|caduca/,"Mete prisa (plazos, «urgente», «último aviso»). Los estafadores quieren que no pienses."],
  [/(cuenta|tarjeta|acceso|n[uú]mero).{0,40}(bloquead|suspendid|cancelad|desactivad|limitad)|(bloquead|suspendid).{0,30}(cuenta|tarjeta)/,"Dice que algo tuyo está bloqueado o suspendido para asustarte."],
  [/contrase[ñn]a|\bpin\b|\bcvv\b|c[oó]digo (de )?(sms|verificaci|seguridad)|clave (de )?(acceso|seguridad)|datos (bancarios|de (la )?tarjeta)/,"Te pide claves, códigos o datos de tarjeta. Ningún banco ni empresa seria lo hace por mensaje."],
  [/paquete|env[ií]o|entrega/.test(l)&&/tasa|gastos|aduana|reprogram|direcci[oó]n incompleta|pendiente/.test(l)?/./:/^$/,"Habla de un paquete pendiente con una tasa o un dato que falta. Es una de las estafas más repetidas."],
  [/multa|sanci[oó]n|dgt|tr[aá]fico/,"Habla de una multa o sanción con un pago urgente. Las multas reales llegan por correo oficial o sede electrónica."],
  [/reembolso|devoluci[oó]n|hacienda|agencia tributaria|ayuda|subvenci[oó]n/,"Promete dinero (reembolso, ayuda). Comprueba entrando tú mismo en la web oficial, nunca desde el enlace."],
  [/has ganado|premio|sorteo|felicidades|regalo/,"Habla de un premio que no has pedido."],
  [/whatsapp.{0,30}(nuevo|n[uú]mero)|hola (mam[aá]|pap[aá])|he cambiado de (n[uú]mero|m[oó]vil)/,"Parece el timo del «hola mamá»: alguien que dice ser un familiar con número nuevo y pide dinero."],
  [/inversi[oó]n|criptomoneda|bitcoin|rentabilidad|ganar dinero (f[aá]cil|r[aá]pido)/,"Promete dinero fácil o rentabilidades. Si suena demasiado bueno, no es real."]];
 for(const[re,txt]of R){if(re.test(l))o.mal.push(txt)}
 if(/^(estimado|querido) (cliente|usuario)/m.test(l))o.reg.push("Te llama «cliente» o «usuario» en vez de por tu nombre.");
 if(/[a-záéíóúñ]\s{2,}[a-z]|[!]{2,}|€\s?\d+.*urgente/.test(l))o.reg.push("Tiene un estilo descuidado o exagerado (faltas, muchas exclamaciones).");
 for(const e of extraerEnlaces(t)){const r=analizarEnlace(e);if(r)o.enlaces.push({e,r})}
 if(!o.enlaces.length)o.bien.push("No lleva enlace; si pide que llames a un número, no llames: busca tú el teléfono oficial.");
 return o}
// ---------- análisis del código de una página ----------
function analizarPagina(html,urlStr){
 const o={mal:[],reg:[],bien:[]};if(!html.trim())return null;let doc;try{doc=new DOMParser().parseFromString(html,"text/html")}catch(e){o.reg.push("No he podido leer ese código.");return o}
 let host="";try{host=new URL(/^[a-z]+:\/\//i.test(urlStr)?urlStr:"https://"+urlStr).hostname.toLowerCase()}catch(e){}
 const ext=new Set();doc.querySelectorAll("[src],[href],form[action]").forEach(n=>{const v=n.getAttribute("src")||n.getAttribute("href")||n.getAttribute("action")||"";try{const h=new URL(v,"https://"+(host||"x.invalid")).hostname;if(h&&h!==host&&!h.endsWith("."+host))ext.add(h)}catch(e){}});
 const pass=doc.querySelectorAll('input[type=password]').length;const tarj=[...doc.querySelectorAll("input")].filter(i=>/card|tarjeta|cvv|cvc|iban|pan|caducidad/i.test((i.name||"")+(i.id||"")+(i.placeholder||"")+(i.autocomplete||""))).length;
 if(tarj)o.mal.push("La página pide datos de tarjeta ("+tarj+" campos). Compruébalo siempre en la web oficial, escrita por ti.");
 if(pass)o.reg.push("La página tiene campo de contraseña.");
 doc.querySelectorAll("form[action]").forEach(f=>{try{const h=new URL(f.getAttribute("action"),"https://"+(host||"x.invalid")).hostname;if(host&&h&&h!==host&&!h.endsWith("."+host))o.mal.push("Un formulario envía lo que escribes a <b>"+esc(h)+"</b>, que no es la propia web.")}catch(e){}});
 if(doc.querySelector("iframe[style*='display:none'],iframe[width='0'],iframe[height='0']"))o.mal.push("Tiene un marco oculto (iframe). Es un truco habitual para robar datos.");
 const marca=Object.entries(MARCAS).find(([n])=>(doc.title||"").toLowerCase().includes(n.toLowerCase()));
 if(marca&&host&&!coincideOficial(host))o.mal.push("El título dice <b>"+esc(marca[0])+"</b> pero la dirección ("+esc(host)+") no es la oficial.");
 const fuentes=new Set();(html.match(/font-family\s*:\s*([^;}"']+(?:,[^;}"']+)*)/gi)||[]).forEach(m=>fuentes.add(m.replace(/font-family\s*:\s*/i,"").split(",")[0].replace(/["']/g,"").trim()));
 if(fuentes.size)o.reg.push("Tipografías que usa: <b>"+[...fuentes].slice(0,5).map(esc).join(", ")+"</b>. Mira si coinciden con la web oficial; es solo un indicio débil, porque copiar la letra es fácil.");
 if(ext.size>5)o.reg.push("Carga contenido de "+ext.size+" sitios distintos.");
 if(!o.mal.length&&!pass&&!tarj)o.bien.push("No encuentro formularios que pidan claves ni tarjeta.");
 return o}
// ---------- veredicto ----------
function veredicto(grupos){const mal=grupos.reduce((a,g)=>a+g.mal.length,0),reg=grupos.reduce((a,g)=>a+g.reg.length,0);
 if(mal>=1)return{c:"rojo",i:"✖",t:"Cuidado: tiene señales de estafa",h:"No pulses, no respondas y no pongas datos. Entra tú mismo en la web o app oficial escribiendo la dirección."};
 if(reg>=2)return{c:"ambar",i:"!",t:"Dudoso: varias cosas raras",h:"Mejor no abrirlo. Si te preocupa, entra tú mismo en la web oficial para comprobarlo."};
 if(reg===1)return{c:"ambar",i:"!",t:"Con una cosa rara",h:"Ve con cuidado y no pongas datos si no estás seguro."};
 return{c:"gris",i:"?",t:"No veo señales, pero no es una garantía",h:"Que no vea nada no significa que sea seguro. Ante la duda, entra tú mismo en la web oficial."}}
function lista(cl,arr){return arr.length?"<ul>"+arr.map(x=>"<li class='"+cl+"'>"+x+"</li>").join("")+"</ul>":""}
function pintar(grupos,extra){const v=veredicto(grupos);const of=grupos.find(g=>g.oficial);
 if(of&&of.oficial&&!grupos.some(g=>g.mal.length||g.reg.length)){v.c="verde";v.i="✔";v.t="Es la dirección oficial de "+of.oficial.marca;v.h="Aun así, comprueba que el mensaje que te llevó hasta aquí sea real: puede llevarte a la web buena y pedirte algo raro."}
 let h="<div class='sem "+v.c+"'><div class='dot'>"+v.i+"</div><h2>"+v.t+"</h2></div>";
 for(const g of grupos){if(g.titulo)h+="<p><b>"+g.titulo+"</b></p>";h+=lista("mal",g.mal)+lista("reg",g.reg)+lista("bien",g.bien)}
 h+="<div class='hazlo'><b>Qué hacer:</b> "+v.h+"</div><small>Es una ayuda, no un certificado de seguridad.</small>";const r=document.getElementById("res");r.innerHTML=h;r.className="caja res on";r.scrollIntoView({behavior:"smooth",block:"start"})}

// ---------- comparativa carácter a carácter con la dirección oficial ----------
function alinear(a,b){const A=[...a],B=[...b],m=A.length,n=B.length;const d=Array.from({length:m+1},(_,i)=>{const r=Array(n+1).fill(0);r[0]=i;return r});for(let j=1;j<=n;j++)d[0][j]=j;
 for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(A[i-1]===B[j-1]?0:1));
 const x=[],y=[];let i=m,j=n;while(i>0||j>0){if(i>0&&j>0&&d[i][j]===d[i-1][j-1]+(A[i-1]===B[j-1]?0:1)){x.unshift({c:A[i-1],ok:A[i-1]===B[j-1]});y.unshift({c:B[j-1],ok:A[i-1]===B[j-1]});i--;j--}else if(i>0&&d[i][j]===d[i-1][j]+1){x.unshift({c:A[i-1],ok:false});y.unshift({c:"·",ok:false,hueco:true});i--}else{x.unshift({c:"·",ok:false,hueco:true});y.unshift({c:B[j-1],ok:false});j--}}
 return{x,y,difs:x.filter(t=>!t.ok&&!t.hueco).length+y.filter(t=>!t.ok&&!t.hueco&&false).length,igual:a===b}}
function notasCmp(r){const n=[];for(let k=0;k<r.x.length;k++){const t=r.x[k],o=r.y[k];if(t.ok||t.hueco&&o.hueco)continue;
  if(t.hueco)n.push("Falta «"+esc(o.c)+"» en tu enlace.");else if(o.hueco)n.push("Sobra «"+esc(t.c)+"» en tu enlace.");
  else{const cp=t.c.codePointAt(0),al=alfabeto(t.c);n.push("«"+esc(t.c)+"»"+(cp>127?" ("+al+", U+"+cp.toString(16).toUpperCase().padStart(4,"0")+")":"")+" en lugar de «"+esc(o.c)+"»")}}
 return n.slice(0,6)}
