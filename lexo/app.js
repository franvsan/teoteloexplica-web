// Lexo by Teo · app del chat. Las conversaciones solo se guardan en este móvil (localStorage).
(() => {
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

  let uid = lee("lexo_uid", null);
  if (!/^[a-f0-9]{32}$/.test(uid || "")) { uid = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, "0")).join(""); guarda("lexo_uid", uid); }
  let chat = lee("lexo_chat", []), area = lee("lexo_area", "laboral"), est = null, ocupado = false, planElegido = "pro";
  let demoQuedan = lee("lexo_demo_quedan", 2);

  // ---------- utilidades ----------
  const toast = t => { const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 3200); };
  const hora = t => new Date(t).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const fecha = s => s ? new Date(s).toLocaleDateString("es-ES", { day: "numeric", month: "long" }) : "";
  const abrir = id => { const d = document.getElementById(id); if (!d.open) d.showModal(); };
  const cerrarTodo = () => $$("dialog[open]").forEach(d => { if (d.id !== "d-aviso") d.close() });
  async function api(ruta, cuerpo) {
    const r = await fetch(API + ruta, cuerpo ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) } : {});
    const j = await r.json().catch(() => ({ error: "Sin conexión. Inténtalo de nuevo." }));
    return { ok: r.ok, status: r.status, ...j };
  }
  async function copiar(texto, nodo) {
    try { await navigator.clipboard.writeText(texto); toast("Copiado"); }
    catch { const s = getSelection(), rg = document.createRange(); rg.selectNodeContents(nodo); s.removeAllRanges(); s.addRange(rg); toast("Selecciónalo y cópialo"); }
  }

  // Convierte el texto de Lexo (negritas y listas con guion) en nodos, sin innerHTML.
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
    d.className = "msg " + (m.role === "user" ? "yo" : "lexo") + (m.error ? " error" : "");
    if (m.role === "user") d.appendChild(document.createElement("p")).textContent = m.content; else pinta(m.content, d);
    const h = document.createElement("span"); h.className = "hora"; h.textContent = hora(m.t); d.appendChild(h);
    return d;
  }
  function render() {
    const cont = $("#mensajes"); cont.replaceChildren();
    $("#inicio").hidden = chat.length > 0;
    let ultimoDia = "";
    chat.forEach(m => {
      const dia = new Date(m.t).toDateString();
      if (dia !== ultimoDia) { const s = document.createElement("div"); s.className = "dia"; s.textContent = dia === new Date().toDateString() ? "Hoy" : new Date(m.t).toLocaleDateString("es-ES", { day: "numeric", month: "long" }); cont.appendChild(s); ultimoDia = dia; }
      cont.appendChild(burbuja(m));
    });
    $("#chat").scrollTop = chat.length ? $("#chat").scrollHeight : 0;
  }
  function pintaIdeas() {
    const c = $("#ideas"); c.querySelectorAll(".idea").forEach(x => x.remove());
    IDEAS[area].forEach(t => { const b = document.createElement("button"); b.className = "idea"; b.type = "button"; b.textContent = t; b.onclick = () => enviar(t); c.appendChild(b); });
    $$(".area").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.area === area)));
    $("#area-actual").textContent = "Tema: " + AREAS[area];
  }

  // ---------- estado del plan ----------
  function pintaEstado() {
    const e = est || { total: demoQuedan, gratis: demoQuedan, sub: null, pack: null };
    const s = e.sub, tot = e.total;
    let titulo = "Tus preguntas de prueba", pie = "Sin tarjeta. Después, desde 2,99 € al mes.", max = 2, sufijo = tot === 1 ? "gratis" : "gratis";
    if (s) { titulo = "Plan " + s.nombre; max = s.cupo + (e.pack?.quedan || 0); sufijo = "este mes"; pie = s.cancelada ? "Cancelada: la puedes usar hasta el " + fecha(s.termina) + "." : "Se renueva el " + fecha(s.renueva) + "."; }
    else if (e.pack) { titulo = "Pack de preguntas"; max = 25; sufijo = "en tu pack"; pie = "Válidas hasta el " + fecha(e.pack.caduca) + "."; }
    else if (!tot) pie = "Se acabó la prueba. Elige un plan para seguir preguntando.";
    $("#cupo-titulo").textContent = titulo;
    $("#cupo-num").firstChild.textContent = tot;
    $("#cupo-num").lastChild.textContent = sufijo;
    $("#cupo-barra").style.width = Math.max(0, Math.min(100, tot / Math.max(max, 1) * 100)) + "%";
    $("#cupo-pie").textContent = pie;
    $("#quedan").textContent = tot === 1 ? "Te queda 1 pregunta" : `Te quedan ${tot} preguntas`;
    const mp = $("#menu-plan"); mp.children[1].textContent = s ? "Plan " + s.nombre : e.pack ? "Pack de preguntas" : "Prueba gratis"; mp.children[2].textContent = `${tot} ${tot === 1 ? "pregunta" : "preguntas"} · ${pie}`;
    const cancelable = s && !s.cancelada;
    $("#menu-cancelar-info").textContent = cancelable ? "Plan " + s.nombre : s?.cancelada ? "Ya cancelada" : "Sin suscripción";
    $("#cancelar-texto").textContent = cancelable
      ? `Tu plan ${s.nombre} no se renovará. Podrás seguir usando tus preguntas hasta el ${fecha(s.renueva)}. Cancelar no devuelve dinero; si estás dentro de los 14 días, usa «Desistir o pedir devolución».`
      : s?.cancelada ? `Ya está cancelada. Puedes usarla hasta el ${fecha(s.termina)} y no se te volverá a cobrar.` : "No tienes ninguna suscripción activa. Si compraste el pack de pago único, no hay nada que cancelar: no se renueva.";
    $("#cancelar-si").hidden = !cancelable;
    $("#texto-desistir").textContent = `A la atención de Lexo by Teo (equiposoporte.teo@gmail.com):\n\nPor la presente comunico que desisto de mi contrato del servicio Lexo (${s ? "plan " + s.nombre : e.pack ? "pack de 25 preguntas" : "indica el plan"}).\nFecha de compra: [escríbela]\nCorreo usado al pagar: [escríbelo]\nCódigo de acceso: ${uid}\nPreguntas que me quedan sin usar: ${tot}\n\nFecha: ${new Date().toLocaleDateString("es-ES")}`;
  }
  async function cargaEstado() {
    if (DEMO) return pintaEstado();
    const r = await api("/estado?uid=" + uid);
    if (r.ok) { est = r; pintaEstado(); }
  }

  // ---------- enviar ----------
  async function enviar(texto) {
    texto = (texto || "").trim();
    if (!texto || ocupado) return;
    if (!lee("lexo_aviso", false)) return abrir("d-aviso");
    ocupado = true; $("#enviar").disabled = true;
    chat.push({ role: "user", content: texto, t: Date.now() }); guarda("lexo_chat", chat); render();
    $("#texto").value = ""; ajusta();
    const esc = document.createElement("div"); esc.className = "escribiendo"; esc.setAttribute("aria-label", "Lexo está escribiendo"); esc.innerHTML = "<i></i><i></i><i></i>";
    $("#mensajes").appendChild(esc); $("#chat").scrollTop = $("#chat").scrollHeight;
    const historial = chat.filter(m => !m.error).slice(-7).map(({ role, content }) => ({ role, content }));
    let r;
    if (DEMO) {
      await new Promise(ok => setTimeout(ok, 1100));
      if (demoQuedan <= 0) r = { ok: false, status: 402, error: "Te has quedado sin preguntas. Elige un plan para seguir." };
      else { demoQuedan--; guarda("lexo_demo_quedan", demoQuedan); r = { ok: true, texto: "**Ejemplo de respuesta (modo demostración).**\n\nAquí verás una respuesta breve y clara a tu duda, con lo que dice la ley y qué hacer:\n- Primer paso que te recomiendo\n- Dónde reclamar y en qué plazo\n\nSi hay un plazo corto, te lo diré al principio." }; }
    } else {
      try { r = await api("/chat", { uid, area, mensajes: historial }); } catch { r = { ok: false, error: "Sin conexión. Tu pregunta no se ha descontado." }; }
    }
    esc.remove();
    if (r.ok) { chat.push({ role: "assistant", content: r.texto, t: Date.now() }); if (r.estado) est = r.estado; }
    else {
      chat.pop();   // la pregunta no respondida no se queda en el historial, pero se devuelve a la caja
      $("#texto").value = texto; ajusta();
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
    const r = await api("/pagar", { uid, plan: planElegido, consiento: $("#c-consiento").checked, acepto: $("#c-acepto").checked });
    if (r.ok && r.url) location.href = r.url; else { toast(r.error || "No se ha podido abrir el pago."); puedePagar(); }
  }
  async function cancelar() {
    $("#cancelar-si").disabled = true;
    if (DEMO) { toast("Demostración: aquí se cancelaría tu suscripción."); $("#cancelar-si").disabled = false; return; }
    const r = await api("/cancelar", { uid });
    $("#cancelar-si").disabled = false;
    if (r.estado) est = r.estado;
    pintaEstado();
    if (r.ok) toast("Suscripción cancelada. No se te volverá a cobrar.");
    else if (r.portal) { toast("Ábrela desde tu área de cliente"); location.href = r.portal; }
    else toast(r.error || "No se ha podido cancelar.");
  }

  // ---------- eventos ----------
  $("#form").addEventListener("submit", e => { e.preventDefault(); enviar($("#texto").value); });
  $("#texto").addEventListener("input", ajusta);
  $("#texto").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(pointer: fine)").matches) { e.preventDefault(); enviar($("#texto").value); } });
  $$(".area").forEach(b => b.onclick = () => { area = b.dataset.area; guarda("lexo_area", area); pintaIdeas(); });
  $("#abrir-menu").onclick = () => abrir("d-menu");
  $("#ver-planes").onclick = () => { $("#planes-motivo").textContent = "Precios con IVA incluido. Cancelas cuando quieras desde el menú."; abrir("d-planes"); };
  $$("[data-abrir]").forEach(b => b.onclick = () => { cerrarTodo(); abrir(b.dataset.abrir); });
  $$("[data-cerrar]").forEach(b => b.onclick = () => b.closest("dialog").close());
  $$("dialog").forEach(d => d.addEventListener("click", e => { if (e.target === d && d.id !== "d-aviso") d.close(); }));
  $("#d-aviso").addEventListener("cancel", e => e.preventDefault());
  $$(".plan").forEach(b => b.onclick = () => { planElegido = b.dataset.plan; $$(".plan").forEach(x => x.setAttribute("aria-checked", String(x === b))); });
  $("#c-consiento").onchange = puedePagar; $("#c-acepto").onchange = puedePagar;
  $("#pagar").onclick = pagar;
  $("#cancelar-si").onclick = cancelar;
  $("#acepto-aviso").onchange = e => { $("#entrar").disabled = !e.target.checked; };
  $("#entrar").onclick = () => { guarda("lexo_aviso", Date.now()); $("#d-aviso").close(); $("#texto").focus(); };
  $("#codigo").textContent = uid.match(/.{1,4}/g).join(" ");
  $("#copiar-codigo").onclick = () => copiar(uid, $("#codigo"));
  $("#copiar-desistir").onclick = () => copiar($("#texto-desistir").textContent, $("#texto-desistir"));
  $("#usar-codigo").onclick = async () => {
    const c = $("#codigo-nuevo").value.replace(/\s+/g, "").toLowerCase();
    if (!/^[a-f0-9]{32}$/.test(c)) return toast("Ese código no es válido");
    uid = c; guarda("lexo_uid", uid); $("#codigo").textContent = uid.match(/.{1,4}/g).join(" "); $("#codigo-nuevo").value = "";
    await cargaEstado(); toast("Código cambiado"); $("#d-codigo").close();
  };
  $("#borrar").onclick = () => { chat = []; guarda("lexo_chat", chat); render(); $("#d-menu").close(); toast("Conversación borrada"); };
  let instalar = null;
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); instalar = e; });
  $("#instalar").onclick = async () => {
    if (instalar) { instalar.prompt(); instalar = null; return; }
    toast(/iphone|ipad/i.test(navigator.userAgent) ? "En Safari: botón Compartir → «Añadir a pantalla de inicio»" : "En el menú del navegador: «Instalar app» o «Añadir a pantalla de inicio»");
  };

  // ---------- arranque ----------
  $("#demo").hidden = !DEMO;
  pintaIdeas(); render(); pintaEstado(); cargaEstado();
  if (!lee("lexo_aviso", false)) abrir("d-aviso");
  if (new URLSearchParams(location.search).get("pago") === "ok") { toast("¡Pago recibido! Tus preguntas aparecen en unos segundos."); setTimeout(cargaEstado, 4000); setTimeout(cargaEstado, 12000); history.replaceState(null, "", location.pathname); }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
