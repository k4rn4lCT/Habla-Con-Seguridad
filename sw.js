/* Service worker: guarda la app en caché para usarla sin conexión.
 * Si cambiás cualquier archivo, subí el número de VERSION para que los navegadores bajen la nueva versión. */
var VERSION = "hcs-v3";
var FILES = [
  "./",
  "index.html",
  "css/styles.css",
  "js/temas.js",
  "js/contenido.js",
  "js/app.js",
  "icon.svg",
  "manifest.webmanifest"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(VERSION).then(function (cache) { return cache.addAll(FILES); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Red primero para las páginas (así ves la última versión si hay conexión);
// caché primero para el resto de los archivos.
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put("index.html", copy); });
        return res;
      }).catch(function () {
        return caches.match("index.html");
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
