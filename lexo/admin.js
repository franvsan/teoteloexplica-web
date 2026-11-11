// Página de administración: pide el resumen y el CSV con la clave en una cabecera (nunca en la dirección).
(() => {
  const API = (window.LEXO_API || "").replace(/\/+$/, ""), $ = s => document.querySelector(s);
  const pide = ruta => fetch(API + ruta, { headers: { authorization: "Bearer " + $("#clave").value.trim() }, cache: "no-store", referrerPolicy: "no-referrer" });
  const etiquetas = { usuarios: "Usuarios totales", nuevos_30d: "Nuevos (30 días)", activos_30d: "Activos (30 días)", app_instalada: "Con la app instalada", packs_vigentes: "Packs con preguntas", preguntas_hoy: "Preguntas hoy" };
  $("#f").addEventListener("submit", async e => {
    e.preventDefault();
    const out = $("#salida"); out.hidden = false;
    if (!API) { out.textContent = "Falta la dirección del servidor en config.js."; return; }
    const r = await pide("/admin/resumen").catch(() => null);
    if (!r || !r.ok) { out.textContent = r?.status === 429 ? "Demasiados intentos fallidos. Prueba mañana." : "Clave incorrecta o servidor no disponible."; $("#csv").hidden = true; return; }
    const j = await r.json();
    out.textContent = Object.entries(etiquetas).map(([k, t]) => `${t}: ${j[k]}`).join("\n") + `\nSuscripciones activas: Básico ${j.suscripciones_activas.basico} · Pro ${j.suscripciones_activas.pro}`;
    $("#csv").hidden = false;
  });
  $("#csv").addEventListener("click", async () => {
    const r = await pide("/admin/cuentas.csv").catch(() => null);
    if (!r || !r.ok) return;
    const a = document.createElement("a"); a.href = URL.createObjectURL(await r.blob()); a.download = "cuentas.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
})();
