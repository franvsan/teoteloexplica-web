// Lexo está en preparación (16-11-2026). Este archivo solo limpia lo que la app guardó en el móvil
// de quien la usó antes y se desinstala solo. No guarda nada.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((cs) => cs.forEach((c) => c.navigate(c.url)))
  );
});
