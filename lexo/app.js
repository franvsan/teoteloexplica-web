// Lexo by Teo · app. Las conversaciones solo se guardan en este móvil (localStorage).
(() => {
  if (window.top !== window.self) { try { window.top.location = window.self.location.href; } catch { document.body.textContent = ""; } return; }   // no se deja meter en un marco ajeno
  const API = (window.LEXO_API || "").replace(/\/+$/, "");
  const DEMO = !API || new URLSearchParams(location.search).has("demo");
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const guarda = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} };
  const lee = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d } catch { return d } };
  const AREAS = { general: "Asesoría general", laboral: "Trabajo", vivienda: "Alquiler", consumo: "Consumo", trafico: "Multas", familia: "Familia y herencias" };
  const IDEAS = {
    general: ["Me han reclamado una deuda que no reconozco", "¿Qué hago si un vecino me causa daños?", "Quiero reclamar y no sé por dónde empezar", "¿Me pueden embargar la nómina?"],
    laboral: ["¿Me pueden despedir estando de baja?", "No me han pagado las horas extra, ¿qué hago?", "¿Cuántos días de vacaciones me tocan?", "Me han hecho un contrato de prácticas, ¿es legal?"],
    vivienda: ["El casero no me devuelve la fianza", "¿Me pueden subir el alquiler a mitad de contrato?", "¿Quién paga si se rompe la caldera?", "Quiero irme antes de que acabe el contrato"],
    consumo: ["Me cobran una permanencia que no firmé", "La tienda no me acepta la devolución", "Me han cancelado el vuelo, ¿qué me deben?", "El banco me cobra comisiones raras"],
    trafico: ["Me ha llegado una multa, ¿cómo la recurro?", "¿Cuánto tiempo tengo para pagarla con descuento?", "Me han quitado puntos, ¿cómo los recupero?", "La multa llegó a otra dirección"],
    familia: ["¿Cómo se pide la pensión de alimentos?", "Mi padre ha muerto sin testamento", "¿Puedo renunciar a una herencia con deudas?", "¿Cuánto cuesta divorciarse de mutuo acuerdo?"],
  };
  // Modelos gratuitos: textos generales con huecos. "nota" = plazo y cómo enviarlo.
  const MODELOS = {
    laboral: [{ t: "Reclamar salarios u horas no pagadas", nota: "Tienes 1 año para reclamar cada cantidad (art. 59 del Estatuto de los Trabajadores). Envíalo por burofax o correo con acuse, o entrégalo y que te firmen una copia.",
      x: "A la atención de [EMPRESA]\n\nYo, [NOMBRE Y APELLIDOS], con DNI [DNI], trabajador/a de esta empresa desde el [FECHA], con la categoría de [PUESTO],\n\nEXPONGO: que a día de hoy no se me han abonado las siguientes cantidades: [CONCEPTO: salario de…, horas extra de…] por un total de [IMPORTE] €.\n\nSOLICITO: que se me abonen en el plazo de 10 días desde la recepción de este escrito. En caso contrario, presentaré papeleta de conciliación y reclamaré la cantidad con el interés por mora que corresponda.\n\nEn [CIUDAD], a [FECHA].\n\nFirma" }],
    vivienda: [{ t: "Pedir la devolución de la fianza", nota: "El casero debe devolverla en 1 mes desde que entregas las llaves; después genera intereses (art. 36.4 de la Ley de Arrendamientos Urbanos). Envíalo por burofax o correo con acuse.",
      x: "A la atención de [NOMBRE DEL ARRENDADOR]\n\nYo, [NOMBRE Y APELLIDOS], con DNI [DNI], inquilino/a de la vivienda de [DIRECCIÓN] hasta el [FECHA DE ENTREGA DE LLAVES],\n\nEXPONGO: que entregué las llaves en la fecha indicada, con la vivienda en buen estado y las rentas y suministros al corriente, y que ha pasado más de un mes sin que se me devuelva la fianza de [IMPORTE] €.\n\nSOLICITO: su devolución en el plazo de 10 días mediante transferencia a la cuenta [IBAN], con el interés legal desde que venció el mes. De no hacerlo, la reclamaré judicialmente.\n\nEn [CIUDAD], a [FECHA].\n\nFirma" }],
    consumo: [{ t: "Desistir de una compra por internet", nota: "Tienes 14 días naturales desde que recibes el producto, sin dar motivos (arts. 102 a 108 de la Ley de Consumidores). Hay excepciones, como productos personalizados o precintados por higiene. Envíalo por correo electrónico y guarda el justificante.",
      x: "A la atención de [TIENDA]\n\nPor la presente comunico que desisto del contrato de compra del siguiente producto: [PRODUCTO], pedido n.º [NÚMERO], recibido el [FECHA].\n\nSolicito la devolución del importe pagado, [IMPORTE] €, incluidos los gastos de envío iniciales, por el mismo medio de pago, en el plazo máximo de 14 días.\n\nNombre: [NOMBRE Y APELLIDOS]\nDirección: [DIRECCIÓN]\nFecha: [FECHA]" }],
    trafico: [{ t: "Alegaciones a una multa de tráfico", nota: "Plazo: 20 días naturales desde la notificación. Ojo: si alegas, pierdes el descuento del 50 % por pronto pago. Preséntalo en la sede electrónica del organismo que te multa o en un registro oficial.",
      x: "Expediente n.º [NÚMERO]\n\nYo, [NOMBRE Y APELLIDOS], con DNI [DNI] y domicilio en [DIRECCIÓN], como [titular / conductor] del vehículo [MATRÍCULA],\n\nALEGO:\n1. Que no estoy conforme con los hechos denunciados porque [EXPLICA QUÉ PASÓ Y POR QUÉ NO ES CORRECTO].\n2. Que solicito las siguientes pruebas: [fotografía de la infracción, certificado de verificación del radar, informe del agente].\n\nSOLICITO: que se admitan estas alegaciones y se archive el expediente.\n\nEn [CIUDAD], a [FECHA].\n\nFirma" }],
  };
  const TODAS = Object.entries(IDEAS).flatMap(([a, l]) => l.map(t => [a, t]));

  let uid = lee("lexo_uid", null);
  if (!/^[a-f0-9]{32}$/.test(uid || "")) { uid = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, "0")).join(""); guarda("lexo_uid", uid); }
  let area = lee("lexo_area", "general"), est = null, ocupado = false, planElegido = "pro";
  if (!AREAS[area]) area = "general";
  // Una conversación por tema: al cambiar de tema se ve solo lo hablado de ese tema.
  let chats = lee("lexo_chats", null);
  if (!chats || typeof chats !== "object") { chats = {}; const viejo = lee("lexo_chat", []); if (viejo.length) chats[area] = viejo; try { localStorage.removeItem("lexo_chat") } catch {} }
  let chat = (chats[area] ||= []);
  const guardaChats = () => guarda("lexo_chats", chats);
  function ponArea(k) {
    if (k === area) return true;
    if (ocupado) { toast("Espera a que Lexo termine de responder"); return false; }
    area = k; guarda("lexo_area", area); chat = (chats[area] ||= []); pintaAreas(); render(); return true;
  }
  let demoQuedan = lee("lexo_demo_ases", 2), demoPaso = 0;
  // Una asesoría = una conversación de un tema. Su id (aleatorio, sin datos) lo usa el servidor para contar mensajes.
  let ases = lee("lexo_ases", {});
  const nuevoId = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
  const idAses = () => { if (!/^[a-f0-9]{16}$/.test(ases[area] || "")) { ases[area] = nuevoId(); guarda("lexo_ases", ases); } return ases[area]; };
  const reiniciaAses = k => { ases[k] = null; guarda("lexo_ases", ases); };

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
  const esPago = u => /^https:\/\/(checkout|pay)\.stripe\.com\//.test(u || "");

  // ---------- pantallas ----------
  function ver(nombre, sinHistorial) {
    if (!$(`[data-vista="${nombre}"]`)) nombre = "inicio";
    $$(".vista").forEach(v => { v.hidden = v.dataset.vista !== nombre; });
    $$(".nav [data-ir]").forEach(b => b.dataset.ir === nombre ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
    $(".app").classList.toggle("en-chat", nombre === "chat");
    if (!sinHistorial && location.hash !== "#" + nombre) history.pushState(null, "", nombre === "inicio" ? location.pathname : "#" + nombre);
    if (nombre === "chat") abajo();
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
    if (m.normas?.length) {
      const n = document.createElement("div"); n.className = "normas";
      n.appendChild(document.createElement("small")).textContent = "Basado en";
      m.normas.forEach(x => { n.appendChild(document.createElement("span")).textContent = x; });
      d.appendChild(n);
    }
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
    const ult = chat[chat.length - 1];
    if (ult && ult.role === "assistant" && !ocupadoPinta) cont.appendChild(acciones(ult));
    $("#vacio-titulo").textContent = area === "general" ? "Cuéntame tu caso" : "Cuéntame tu caso de " + AREAS[area].toLowerCase();
    abajo();
  }
  let ocupadoPinta = false;
  const abajo = () => requestAnimationFrame(() => { const c = $("#chat"); c.scrollTop = c.scrollHeight; });
  // Bajo la última respuesta: seguir preguntando con un toque, copiar, valorar y empezar de cero.
  function acciones(m) {
    const d = document.createElement("div"); d.className = "acciones";
    const chip = (t, fn, cls) => { const b = document.createElement("button"); b.type = "button"; b.className = "chip" + (cls ? " " + cls : ""); b.textContent = t; b.onclick = fn; d.appendChild(b); return b; };
    if (m.tipo === "pregunta") {
      const cab = document.createElement("p"); cab.className = "acciones-cab"; cab.textContent = "Toca una opción o escríbelo tú · contestar no gasta preguntas"; d.appendChild(cab);
      (m.opciones || []).forEach(o => chip(o, () => enviar(o), "opcion"));
      return d;
    }
    (m.opciones || []).forEach(o => chip(o, () => enviar(o), "opcion"));
    chip("✍️ Hazme el escrito", () => enviar("Redáctame un escrito de reclamación para este caso, listo para copiar."));
    chip("Copiar", () => copiar(m.content.replace(/\*\*/g, ""), d.previousElementSibling), "sec");
    const voto = v => async () => { if (m.voto) return; m.voto = v; guardaChats(); render(); toast(v > 0 ? "¡Gracias!" : "Gracias. Lo tendremos en cuenta para mejorar."); if (!DEMO) api("/valorar", { uid, area, voto: v }).catch(() => {}); };
    if (!m.voto) { chip("👍", voto(1), "sec").setAttribute("aria-label", "Respuesta útil"); chip("👎", voto(-1), "sec").setAttribute("aria-label", "Respuesta poco útil"); }
    chip("Nueva consulta", () => { chats[area] = []; chat = chats[area]; reiniciaAses(area); guardaChats(); render(); }, "sec");
    return d;
  }
  function botonIdea(t, a) { const b = document.createElement("button"); b.className = "idea"; b.type = "button"; b.textContent = t; b.onclick = () => { if (a && !ponArea(a)) return; ver("chat"); enviar(t); }; return b; }
  function pintaAreas() {
    for (const cont of [$("#areas"), $("#areas-temas")]) {
      cont.replaceChildren(...Object.entries(AREAS).map(([k, n]) => {
        const b = document.createElement("button"); b.type = "button"; b.className = "area"; b.textContent = n; b.setAttribute("aria-pressed", String(k === area));
        b.onclick = () => ponArea(k); return b;
      }));
    }
    $("#ideas").replaceChildren(...IDEAS[area].map(t => botonIdea(t)));
    const ms = MODELOS[area] || [];
    $("#modelos-t").hidden = !ms.length;
    $("#modelos").replaceChildren(...ms.map(m => { const b = document.createElement("button"); b.type = "button"; b.className = "idea modelo"; b.textContent = m.t;
      b.onclick = () => { $("#modelo-titulo").textContent = m.t; $("#modelo-nota").textContent = m.nota; $("#modelo-texto").textContent = m.x;
        $("#modelo-copiar").onclick = () => copiar(m.x, $("#modelo-texto"));
        $("#modelo-adaptar").onclick = () => { $("#d-modelo").close(); ver("chat"); enviar("Adapta a mi caso el escrito para «" + m.t.toLowerCase() + "». Pregúntame lo que necesites."); };
        abrir("d-modelo"); }; return b; }));
    $("#ideas-chat").replaceChildren(...IDEAS[area].slice(0, 3).map(t => botonIdea(t)));
  }
  function pintaInicio() {
    const h = new Date().getHours();
    $("#saludo").textContent = h < 6 ? "Buenas noches" : h < 14 ? "Buenos días" : h < 21 ? "Buenas tardes" : "Buenas noches";
    const f = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    $("#fecha").textContent = f.charAt(0).toUpperCase() + f.slice(1);
    // Preguntas frecuentes que van pasando cada 4 segundos (una de cada tema por vuelta)
    const orden = []; for (let i = 0; i < 4; i++) for (const k of Object.keys(IDEAS)) orden.push([k, IDEAS[k][i]]);
    let n = Math.floor(Date.now() / 864e5) % orden.length;
    const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const puntos = $("#puntos-dia"); puntos.replaceChildren(...Object.keys(IDEAS).map(() => document.createElement("i")));
    const pon = () => {
      const [a, t] = orden[n];
      $("#pregunta-dia").textContent = t; $("#tema-dia").textContent = AREAS[a];
      [...puntos.children].forEach((p, i) => p.classList.toggle("on", Object.keys(IDEAS)[i] === a));
      $("#consulta-dia").onclick = () => { if (!ponArea(a)) return; ver("chat"); enviar(t); };
    };
    pon();
    setInterval(() => {
      if (document.hidden || $("#v-inicio").hidden) return;
      const p = $("#pregunta-dia"); p.classList.add("sale");
      setTimeout(() => { n = (n + 1) % orden.length; pon(); p.classList.remove("sale"); }, quieto ? 0 : 280);
    }, 4000);
  }

  // ---------- estado del plan ----------
  function pintaEstado() {
    const e = est || { total: demoQuedan, gratis: demoQuedan, sub: null, pack: null };
    const s = e.sub, tot = e.total;
    const libre = !s && !e.pack, un = tot === 1;
    let pie = "Sin tarjeta. Después, desde 2,99 € al mes.", max = 2, txt = un ? "Asesoría gratis" : "Asesorías gratis";
    if (s) { max = s.cupo + (e.pack?.quedan || 0); txt = "Preguntas este mes"; pie = s.cancelada ? "Cancelada: activa hasta el " + fecha(s.termina) + "." : "Se renueva el " + fecha(s.renueva) + "."; }
    else if (e.pack) { max = 25; txt = "En tu pack"; pie = "Válidas hasta el " + fecha(e.pack.caduca) + "."; }
    else if (!tot) { pie = "Se acabó la prueba. Elige un plan para seguir."; txt = "Asesorías gratis"; }
    $("#num-preguntas").textContent = tot; $("#txt-preguntas").textContent = txt;
    $("#plan-nombre").textContent = s ? "★ " + s.nombre : e.pack ? "★ Pack" : "★ Pro";
    $("#plan-sub").textContent = s || e.pack ? "Tu plan" : "Ver planes";
    $("#cupo-num").textContent = tot;
    $("#cupo-barra").style.width = Math.max(0, Math.min(100, tot / Math.max(max, 1) * 100)) + "%";
    $("#cupo-pie").textContent = pie;
    $("#quedan").textContent = un ? "Queda 1" : `Quedan ${tot}`;
    $("#nav-quedan").textContent = tot; $("#nav-txt").textContent = libre ? (un ? "asesoría" : "asesorías") : (un ? "pregunta" : "preguntas");
    const mp = $("#menu-plan"); mp.children[1].textContent = s ? "Plan " + s.nombre : e.pack ? "Pack de preguntas" : "Prueba gratis"; mp.children[2].textContent = `${tot} ${libre ? (un ? "asesoría" : "asesorías") : (un ? "pregunta" : "preguntas")} · ${pie}`;
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
    ocupado = true; ocupadoPinta = true; $("#enviar").disabled = true;
    chat.push({ role: "user", content: texto, t: Date.now() }); guardaChats(); render();
    $("#texto").value = ""; ajusta();
    const esc = document.createElement("div"); esc.className = "escribiendo"; esc.setAttribute("aria-label", "Lexo está escribiendo");
    for (let i = 0; i < 3; i++) esc.appendChild(document.createElement("i"));
    $("#mensajes").appendChild(esc); abajo();
    const nuevaAses = chat.length === 1, nUser = chat.filter(m => m.role === "user").length, previo = chat[chat.length - 2], aclaracion = previo?.role === "assistant" && previo.tipo === "pregunta";
    const historial = chat.slice(-7).map(({ role, content }) => ({ role, content }));
    let r;
    if (DEMO) {
      await new Promise(ok => setTimeout(ok, 1100));
      if (!nuevaAses && !aclaracion && !est?.sub) r = { ok: true, tipo: "respuesta", texto: "**Ejemplo de respuesta (modo demostración).**\n\nEn una asesoría puedes seguir preguntando sin gastar otra.", asesoria: { turno: nUser, aviso: nUser >= 6, mensaje: "Estás llegando al límite de esta asesoría. Pásate a PRO para no quedarte con la duda." } };
      else if (aclaracion) r = { ok: true, gratis: true, tipo: "respuesta", texto: "**Ejemplo de respuesta (modo demostración).**\n\nCon ese dato ya puedo orientarte. Aquí verás una respuesta breve y clara:\n- Lo que dice la ley en tu caso\n- El primer paso que te recomiendo\n- Dónde reclamar y en qué plazo\n\nSi hay un plazo corto, te lo diré al principio y en negrita.", opciones: ["¿Y si no me hacen caso?", "¿Cuánto tiempo tengo?", "¿Me cuesta dinero?"], normas: ["Aquí aparecerá la ley que se cita"] };
      else { if (demoQuedan <= 0) { demoQuedan = 2; toast("Modo demostración: contador reiniciado a 2"); } demoQuedan--; guarda("lexo_demo_ases", demoQuedan); r = { ok: true, tipo: "pregunta", texto: "Para darte una respuesta exacta, necesito un dato (como haría un abogado en la primera consulta): **¿desde cuándo pasa esto?**", opciones: ["Menos de un mes", "De 1 a 6 meses", "Más de 6 meses", "No lo sé"], normas: [] }; }
    } else {
      try { r = await api("/chat", { uid, area, aclaracion, asesoria: idAses(), mensajes: historial }); } catch { r = { ok: false, error: "Sin conexión. Tu pregunta no se ha descontado." }; }
    }
    esc.remove();
    if (r.ok) {
      chat.push({ role: "assistant", content: r.texto, tipo: r.tipo || "respuesta", opciones: r.opciones || [], normas: r.normas || [], t: Date.now() });
      if (r.estado) est = r.estado;
      if (r.asesoria?.aviso) {   // la asesoría gratuita se alarga: aviso y lista de planes (se despliega al llegar al aviso)
        const m = r.asesoria.mensaje || "Estás llegando al límite de esta asesoría. Pásate a PRO para no quedarte con la duda.";
        if (r.asesoria.turno === 6) { $("#planes-motivo").textContent = m; setTimeout(() => abrir("d-planes"), 700); } else toast(m);
      }
    }
    else {
      chat.pop(); $("#texto").value = texto; ajusta();
      if (r.status === 402) { if (r.estado) est = r.estado; $("#planes-motivo").textContent = r.codigo === "limite_asesoria" ? "Has llegado al límite de esta asesoría gratuita. Pásate a PRO para no quedarte con la duda: tu conversación queda guardada y sigues justo donde lo dejaste." : "Se acabaron tus asesorías de prueba. Tu conversación queda guardada: elige un plan y sigue justo donde lo dejaste."; abrir("d-planes"); }
      else toast(r.error || "Algo ha fallado. Inténtalo de nuevo.");
    }
    ocupado = false; ocupadoPinta = false;
    guardaChats(); render(); pintaEstado(); $("#enviar").disabled = !$("#texto").value.trim();
  }
  const ajusta = () => { const t = $("#texto"); t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 140) + "px"; $("#enviar").disabled = ocupado || !t.value.trim(); };

  // ---------- pagos y cancelación ----------
  const puedePagar = () => { $("#pagar").disabled = !($("#c-consiento").checked && $("#c-acepto").checked); };
  async function pagar() {
    $("#pagar").disabled = true;
    if (DEMO) { toast("Demostración: aquí se abriría el pago seguro."); return puedePagar(); }
    const r = await api("/pagar", { uid, plan: planElegido, consiento: $("#c-consiento").checked, acepto: $("#c-acepto").checked }).catch(() => ({}));
    if (r.ok && esPago(r.url)) location.href = r.url; else { toast(r.error || "No se ha podido abrir el pago."); puedePagar(); }
  }
  async function cancelar() {
    $("#cancelar-si").disabled = true;
    if (DEMO) { toast("Demostración: aquí se cancelaría tu suscripción."); $("#cancelar-si").disabled = false; return; }
    const r = await api("/cancelar", { uid }).catch(() => ({}));
    $("#cancelar-si").disabled = false;
    if (r.estado) est = r.estado;
    pintaEstado();
    if (r.ok) toast("Suscripción cancelada. No se te volverá a cobrar.");
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
  $("#borrar").onclick = () => { ases = {}; guarda("lexo_ases", ases); chats = {}; chat = (chats[area] = []); guardaChats(); render(); toast("Conversaciones borradas"); };
  let instalar = null;
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); instalar = e; });
  const yaInstalada = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  function ponSO(so) { $$("[data-so]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.so === so))); $$("[data-guia]").forEach(g => { g.hidden = g.dataset.guia !== so; }); $("#instalar-directo").hidden = !(so === "android" && instalar); }
  const abreInstalar = () => { ponSO(esIOS ? "ios" : "android"); abrir("d-instalar"); };
  $$("[data-so]").forEach(b => b.onclick = () => ponSO(b.dataset.so));
  $("#instalar").onclick = abreInstalar; $("#tarjeta-instalar").onclick = abreInstalar;
  $("#instalar-directo").onclick = async () => { if (instalar) { instalar.prompt(); instalar = null; $("#d-instalar").close(); } };
  $("#tarjeta-instalar").hidden = yaInstalada;
  addEventListener("appinstalled", () => { $("#tarjeta-instalar").hidden = true; });

  // ---------- arranque ----------
  $("#demo").hidden = !DEMO;
  pintaInicio(); pintaAreas(); render(); pintaEstado(); cargaEstado();
  ver(location.hash.slice(1) || "inicio", true);
  if (!lee("lexo_aviso", false)) abrir("d-aviso");
  if (new URLSearchParams(location.search).get("pago") === "ok") { toast("¡Pago recibido! Tus preguntas aparecen en unos segundos."); setTimeout(cargaEstado, 4000); setTimeout(cargaEstado, 12000); history.replaceState(null, "", location.pathname); }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
