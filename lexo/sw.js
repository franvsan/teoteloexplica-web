const V="lexo-v7",ARCH=["./","index.html","config.js","app.js","styles.css","InterTight.woff2","manifest.webmanifest","legal.html","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","icons/apple-touch-icon.png","icons/favicon-32.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(ARCH)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
// Solo se guardan en caché los archivos de la app (mismo origen, GET). Las llamadas al servidor nunca.
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;const u=new URL(e.request.url);if(u.origin!==location.origin||u.pathname.includes("/api/"))return;
 e.respondWith(fetch(e.request).then(n=>{const c=n.clone();caches.open(V).then(ca=>ca.put(e.request,c));return n}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match("index.html"))))});
