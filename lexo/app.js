// Lexo by Teo · app. Las conversaciones solo se guardan en este móvil (localStorage).
(() => {
  if (window.top !== window.self) { try { window.top.location = window.self.location.href; } catch { document.body.textContent = ""; } return; }   // no se deja meter en un marco ajeno
  const API = (window.LEXO_API || "").replace(/\/+$/, "");
  const DEMO = !API || new URLSearchParams(location.search).has("demo");
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const guarda = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} };
  const lee = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d } catch { return d } };
  const AREAS = { laboral: "Trabajo", vivienda: "Alquiler", consumo: "Consumo", trafico: "Multas", familia: "Familia y herencias" };
  const IDEAS = {
    laboral: ["¿Me pueden despedir estando de baja?", "No me han pagado las horas extra, ¿qué hago?", "¿Cuántos días de vacaciones me tocan?", "Me han hecho un contrato de prácticas, ¿es legal?"],
    vivienda: ["El casero no me devuelve la fianza", "¿Me pueden subir el alquiler a mitad de contrato?", "¿Quién paga si se rompe la caldera?", "Quiero irme antes de que acabe el contrato"],
    consumo: ["Me cobran una permanencia que no firmé", "La tienda no me acepta la devolución", "Me han cancelado el vuelo, ¿qué me deben?", "El banco me cobra comisiones raras"],
    trafico: ["Me ha llegado una multa, ¿cómo la recurro?", "¿Cuánto tiempo tengo para pagarla con descuento?", "Me han quitado puntos, ¿cómo los recupero?", "La multa llegó a otra dirección"],
    familia: ["¿Cómo se pide la pensión de alimentos?", "Mi padre ha muerto sin testamento", "¿Puedo renunciar a una herencia con deudas?", "¿Cuánto cuesta divorciarse de mutuo acuerdo?"],
  };
  const TODAS = Object.entries(IDEAS).flatMap(([a, l]) => l.map(t => [a, t]));

  let uid = lee("lexo_uid", null);
  if (!/^[a-f0-9]{32}$/.test(uid || "")) { uid = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, "0")).join(""); guarda("lexo_uid", uid); }
  let chat = lee("lexo_chat", []), area = lee("lexo_area", "laboral"), est = null, ocupado = false, planElegido = "pro";
  let demoQuedan = lee("lexo_demo_quedan", 2);

  // ---------- utilidades ----------
  const toast = t => { const d = document.createElement("div"); d.className = "toast"; d.setAttribute("role", "status"); d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 3200); };
  const hora = t => new Date(t).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const fecha = s => s ? new Date(s).toLocaleDateString("es-ES", { day: "numeric", month: "long" }) : "";
  const abrir = id => { const d = document.getElementById(id); if (!d.open) d.showModal(); };
  async function api(ruta, cuerpo) {
    const r = await fetch(API + ruta, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) });
    const j = await r.json().catch(() => ({ error: "Sin conexión. Inténtalo de nuevo." }));
    return { ok: r.ok, status: r.status, ...j };
  }
  async function copiar(texto, nodo) {
    try { await navigator.clipboard.writeText(texto); toast("Copiado"); }
    catch { const s = getSelection(), rg = document.createRange(); rg.selectNodeContents(nodo); s.removeAllRanges(); s.addRange(rg); toast("Selecciónalo y cópialo"); }
  }
  const esLemon = u => /^https:\/\/[a-z0-9-]+\.lemonsqueezy\.com\//.test(u || "");

  // ---------- pantallas ----------
  function ver(nombre, sinHistorial) {
    if (!$(`[data-vista="${nombre}"]`)) nombre = "inicio";
    $$(".vista").forEach(v => { v.hidden = v.dataset.vista !== nombre; });
    $$(".nav [data-ir]").forEach(b => b.dataset.ir === nombre ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
    $(".app").classList.toggle("en-chat", nombre === "chat");
    if (!sinHistorial && location.hash !== "#" + nombre) history.pushState(null, "", nombre === "inicio" ? location.pathname : "#" + nombre);
    if (nombre === "chat") { $("#chat").scrollTop = $("#chat").scrollHeight; }
  }
  addEventListener("popstate", () => ver(location.hash.slice(1) || "inicio", true));

  // Texto de Lexo (negritas y listas con guion) a nodos, sin innerHTML.
  function trozos(linea, dest) {
    linea.split(/(\*\*[^*]+\*\*)/).forEach(tr => {
      if (/^\*\*[^*]+\*\*$/.test(tr)) dest.appendChild(document.createElement("b")).textContent = tr.slice(2, -2);
      else if (tr) dest.appendChild(document.createTextNode(tr));
    });
  }
  function pinta(texto, cont) {
    for (const bloque of texto.split(/\n{2,}/)) {
      let p = null, ul = null;
      for (const l of bloque.split("\n").filter(x => x.trim())) {
        if (/^\s*[-•*]\s+/.test(l)) { p = null; ul ||= cont.appendChild(document.createElement("ul")); trozos(l.replace(/^\s*[-•*]\s+/, ""), ul.appendChild(document.createElement("li"))); }
        else { ul = null; if (p) p.appendChild(document.createElement("br")); else p = cont.appendChild(document.createElement("p")); trozos(l, p); }
      }
    }
  }
  function burbuja(m) {
    const d = document.createElement("div");
    d.className = "msg " + (m.role === "user" ? "yo" : "lexo");
    if (m.role === "user") d.appendChild(document.createElement("p")).textContent = m.content; else pinta(m.content, d);
    const h = document.createElement("span"); h.className = "hora"; h.textContent = hora(m.t); d.appendChild(h);
    return d;
  }
  function render() {
    const cont = $("#mensajes"); cont.replaceChildren();
    $("#vacio").hidden = chat.length > 0;
    let ultimo = "";
    chat.forEach(m => {
      const dia = new Date(m.t).toDateString();
      if (dia !== ultimo) { const s = document.createElement("div"); s.className = "dia"; s.textContent = dia === new Date().toDateString() ? "Hoy" : fecha(m.t); cont.appendChild(s); ultimo = dia; }
      cont.appendChild(burbuja(m));
    });
    $("#chat").scrollTop = $("#chat").scrollHeight;
  }
  function botonIdea(t, a) { const b = document.createElement("button"); b.className = "idea"; b.type = "button"; b.textContent = t; b.onclick = () => { if (a) { area = a; guarda("lexo_area", area); pintaAreas(); } ver("chat"); enviar(t); }; return b; }
  function pintaAreas() {
    for (const cont of [$("#areas"), $("#areas-temas")]) {
      cont.replaceChildren(...Object.entries(AREAS).map(([k, n]) => {
        const b = document.createElement("button"); b.type = "button"; b.className = "area"; b.textContent = n; b.setAttribute("aria-pressed", String(k === area));
        b.onclick = () => { area = k; guarda("lexo_area", area); pintaAreas(); }; return b;
      }));
    }
    $("#ideas").replaceChildren(...IDEAS[area].map(t => botonIdea(t)));
    $("#ideas-chat").replaceChildren(...IDEAS[area].slice(0, 3).map(t => botonIdea(t)));
  }
  function pintaInicio() {
    const h = new Date().getHours();
    $("#saludo").textContent = h < 6 ? "Buenas noches" : h < 14 ? "Buenos días" : h < 21 ? "Buenas tardes" : "Buenas noches";
    const f = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    $("#fecha").textContent = f.charAt(0).toUpperCase() + f.slice(1);
    const n = Math.floor(Date.now() / 864e5) % TODAS.length, [a, t] = TODAS[n];
    $("#pregunta-dia").textContent = t;
    $("#consulta-dia").onclick = () => { area = a; guarda("lexo_area", area); pintaAreas(); ver("chat"); enviar(t); };
  }

  // ---------- estado del plan ----------
  function pintaEstado() {
    const e = est || { total: demoQuedan, gratis: demoQuedan, sub: null, pack: null };
    const s = e.sub, tot = e.total;
    let pie = "Sin tarjeta. Después, desde 2,99 € al mes.", max = 2, txt = tot === 1 ? "Pregunta gratis" : "Preguntas gratis";
    if (s) { max = s.cupo + (e.pack?.quedan || 0); txt = "Preguntas este mes"; pie = s.cancelada ? "Cancelada: activa hasta el " + fecha(s.termina) + "." : "Se renueva el " + fecha(s.renueva) + "."; }
    else if (e.pack) { max = 25; txt = "En tu pack"; pie = "Válidas hasta el " + fecha(e.pack.caduca) + "."; }
    else if (!tot) { pie = "Se acabó la prueba. Elige un plan para seguir."; txt = "Preguntas gratis"; }
    $("#num-preguntas").textContent = tot; $("#txt-preguntas").textContent = txt;
    $("#plan-nombre").textContent = s ? "★ " + s.nombre : e.pack ? "★ Pack" : "★ Pro";
    $("#plan-sub").textContent = s || e.pack ? "Tu plan" : "Ver planes";
    $("#cupo-num").textContent = tot;
    $("#cupo-barra").style.width = Math.max(0, Math.min(100, tot / Math.max(max, 1) * 100)) + "%";
    $("#cupo-pie").textContent = pie;
    $("#quedan").textContent = tot === 1 ? "Queda 1" : `Quedan ${tot}`;
    $("#nav-quedan").textContent = tot; $("#nav-txt").textContent = tot === 1 ? "pregunta" : "preguntas";
    const mp = $("#menu-plan"); mp.children[1].textContent = s ? "Plan " + s.nombre : e.pack ? "Pack de preguntas" : "Prueba gratis"; mp.children[2].textContent = `${tot} ${tot === 1 ? "pregunta" : "preguntas"} · ${pie}`;
    const cancelable = s && !s.cancelada;
    $("#menu-cancelar-info").textContent = cancelable ? "Plan " + s.nombre : s?.cancelada ? "Ya cancelada" : "Sin suscripción";
    $("#cancelar-texto").textContent = cancelable
      ? `Tu plan ${s.nombre} no se renovará. Podrás seguir usando tus preguntas hasta el ${fecha(s.renueva)}. Cancelar no devuelve dinero; si estás dentro de los 14 días, usa «Desistir o pedir devolución».`
      : s?.cancelada ? `Ya está cancelada. Puedes usarla hasta el ${fecha(s.termina)} y no se te volverá a cobrar.` : "No tienes ninguna suscripción activa. El pack de pago único no se renueva, así que no hay nada que cancelar.";
    $("#cancelar-si").hidden = !cancelable;
    $("#texto-desistir").textContent = `A la atención de Lexo by Teo (equiposoporte.teo@gmail.com):\n\nComunico que desisto de mi contrato del servicio Lexo (${s ? "plan " + s.nombre : e.pack ? "pack de 25 preguntas" : "indica el plan"}).\nFecha de compra: [escríbela]\nCorreo usado al pagar: [escríbelo]\nCódigo de acceso: ${uid}\nPreguntas sin usar: ${tot}\n\nFecha: ${new Date().toLocaleDateString("es-ES")}`;
  }
  async function cargaEstado() {
    if (DEMO) return pintaEstado();
    const pwa = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    const r = await api("/estado", { uid, pwa }).catch(() => ({ ok: false }));
    if (r.ok) { est = r; pintaEstado(); }
  }

  // ---------- enviar ----------
  async function enviar(texto) {
    texto = (texto || "").trim();
    if (!texto || ocupado) return;
    if (!lee("lexo_aviso", false)) { $("#texto").value = texto; ajusta(); return abrir("d-aviso"); }
    ocupado = true; $("#enviar").disabled = true;
    chat.push({ role: "user", content: texto, t: Date.now() }); guarda("lexo_chat", chat); render();
    $("#texto").value = ""; ajusta();
    const esc = document.createElement("div"); esc.className = "escribiendo"; esc.setAttribute("aria-label", "Lexo está escribiendo");
    for (let i = 0; i < 3; i++) esc.appendChild(document.createElement("i"));
    $("#mensajes").appendChild(esc); $("#chat").scrollTop = $("#chat").scrollHeight;
    const historial = chat.slice(-7).map(({ role, content }) => ({ role, content }));
    let r;
    if (DEMO) {
      await new Promise(ok => setTimeout(ok, 1100));
      if (demoQuedan <= 0) r = { ok: false, status: 402, error: "Te has quedado sin preguntas. Elige un plan para seguir." };
      else { demoQuedan--; guarda("lexo_demo_quedan", demoQuedan); r = { ok: true, texto: "**Ejemplo de respuesta (modo demostración).**\n\nAquí verás una respuesta breve y clara, con lo que dice la ley y qué hacer:\n- Primer paso que te recomiendo\n- Dónde reclamar y en qué plazo\n\nSi hay un plazo corto, te lo diré al principio." }; }
    } else {
      try { r = await api("/chat", { uid, area, mensajes: historial }); } catch { r = { ok: false, error: "Sin conexión. Tu pregunta no se ha descontado." }; }
    }
    esc.remove();
    if (r.ok) { chat.push({ role: "assistant", content: r.texto, t: Date.now() }); if (r.estado) est = r.estado; }
    else {
      chat.pop(); $("#texto").value = texto; ajusta();
      if (r.status === 402) { if (r.estado) est = r.estado; $("#planes-motivo").textContent = r.error; abrir("d-planes"); }
      else toast(r.error || "Algo ha fallado. Inténtalo de nuevo.");
    }
    guarda("lexo_chat", chat); render(); pintaEstado();
    ocupado = false; $("#enviar").disabled = !$("#texto").value.trim();
  }
  const ajusta = () => { const t = $("#texto"); t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 140) + "px"; $("#enviar").disabled = ocupado || !t.value.trim(); };

  // ---------- pagos y cancelación ----------
  const puedePagar = () => { $("#pagar").disabled = !($("#c-consiento").checked && $("#c-acepto").checked); };
  async function pagar() {
    $("#pagar").disabled = true;
    if (DEMO) { toast("Demostración: aquí se abriría el pago seguro."); return puedePagar(); }
    const r = await api("/pagar", { uid, plan: planElegido, consiento: $("#c-consiento").checked, acepto: $("#c-acepto").checked }).catch(() => ({}));
    if (r.ok && esLemon(r.url)) location.href = r.url; else { toast(r.error || "No se ha podido abrir el pago."); puedePagar(); }
  }
  async function cancelar() {
    $("#cancelar-si").disabled = true;
    if (DEMO) { toast("Demostración: aquí se cancelaría tu suscripción."); $("#cancelar-si").disabled = false; return; }
    const r = await api("/cancelar", { uid }).catch(() => ({}));
    $("#cancelar-si").disabled = false;
    if (r.estado) est = r.estado;
    pintaEstado();
    if (r.ok) toast("Suscripción cancelada. No se te volverá a cobrar.");
    else if (esLemon(r.portal)) { toast("Ábrela desde tu área de cliente"); location.href = r.portal; }
    else toast(r.error || "No se ha podido cancelar.");
  }

  // ---------- eventos ----------
  $("#form").addEventListener("submit", e => { e.preventDefault(); enviar($("#texto").value); });
  $("#texto").addEventListener("input", ajusta);
  $("#texto").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(pointer: fine)").matches) { e.preventDefault(); enviar($("#texto").value); } });
  $$("[data-ir]").forEach(b => b.addEventListener("click", () => ver(b.dataset.ir)));
  $$("[data-abrir]").forEach(b => b.addEventListener("click", () => { $$("dialog[open]").forEach(d => d.id !== "d-aviso" && d.close()); abrir(b.dataset.abrir); }));
  $$("[data-cerrar]").forEach(b => b.onclick = () => b.closest("dialog").close());
  $$("dialog").forEach(d => d.addEventListener("click", e => { if (e.target === d && d.id !== "d-aviso") d.close(); }));
  $("#d-aviso").addEventListener("cancel", e => e.preventDefault());
  $$(".plan").forEach(b => b.onclick = () => { planElegido = b.dataset.plan; $$(".plan").forEach(x => x.setAttribute("aria-checked", String(x === b))); });
  $("#c-consiento").onchange = puedePagar; $("#c-acepto").onchange = puedePagar;
  $("#pagar").onclick = pagar;
  $("#cancelar-si").onclick = cancelar;
  $("#acepto-aviso").onchange = e => { $("#entrar").disabled = !e.target.checked; };
  $("#entrar").onclick = () => { guarda("lexo_aviso", Date.now()); $("#d-aviso").close(); if ($("#texto").value.trim()) enviar($("#texto").value); };
  $("#codigo").textContent = uid.match(/.{1,4}/g).join(" ");
  $("#copiar-codigo").onclick = () => copiar(uid, $("#codigo"));
  $("#copiar-desistir").onclick = () => copiar($("#texto-desistir").textContent, $("#texto-desistir"));
  $("#usar-codigo").onclick = async () => {
    const c = $("#codigo-nuevo").value.replace(/\s+/g, "").toLowerCase();
    if (!/^[a-f0-9]{32}$/.test(c)) return toast("Ese código no es válido");
    uid = c; guarda("lexo_uid", uid); $("#codigo").textContent = uid.match(/.{1,4}/g).join(" "); $("#codigo-nuevo").value = "";
    await cargaEstado(); toast("Código cambiado"); $("#d-codigo").close();
  };
  $("#borrar").onclick = () => { chat = []; guarda("lexo_chat", chat); render(); toast("Conversación borrada"); };
  let instalar = null;
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); instalar = e; });
  $("#instalar").onclick = async () => {
    if (instalar) { instalar.prompt(); instalar = null; return; }
    toast(/iphone|ipad/i.test(navigator.userAgent) ? "En Safari: Compartir → «Añadir a pantalla de inicio»" : "En el menú del navegador: «Instalar app»");
  };

  // ---------- arranque ----------
  $("#demo").hidden = !DEMO;
  pintaInicio(); pintaAreas(); render(); pintaEstado(); cargaEstado();
  ver(location.hash.slice(1) || "inicio", true);
  if (!lee("lexo_aviso", false)) abrir("d-aviso");
  if (new URLSearchParams(location.search).get("pago") === "ok") { toast("¡Pago recibido! Tus preguntas aparecen en unos segundos."); setTimeout(cargaEstado, 4000); setTimeout(cargaEstado, 12000); history.replaceState(null, "", location.pathname); }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
