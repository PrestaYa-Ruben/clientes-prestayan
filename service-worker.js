/* =====================================================
   Service Worker - PrestaYa Registro de cliente
   Sube la versión de CACHE_NAME cada vez que cambies
   algún archivo para que el celular descargue lo nuevo.
   ===================================================== */
const CACHE_NAME = 'prestaya-registro-v2';

// Archivos propios (rutas relativas)
const ARCHIVOS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instalación: guardar archivos en caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS))
  );
  self.skipWaiting();
});

// Activación: borrar cachés viejas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((c) => c !== CACHE_NAME).map((c) => caches.delete(c)))
    )
  );
  self.clients.claim();
});

// Peticiones
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Fuente de Google: network first con respaldo en caché
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Archivos propios: cache first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then((enCache) => {
        if (enCache) return enCache;
        return fetch(req).then((resp) => {
          if (resp && resp.ok) {
            const copia = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
          }
          return resp;
        }).catch(() => {
          // Sin conexión: si es navegación, devolver el formulario
          if (req.mode === 'navigate') return caches.match('./index.html');
        });
      })
    );
  }
});
