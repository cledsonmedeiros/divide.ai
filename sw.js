/* divideaí — service worker.
 * Rede primeiro para tudo (página, CSS, JS, ícones): depois de um deploy, a
 * página nova nunca roda com CSS/JS antigos. Sem internet, usa o cache.
 * Ao mudar a lista APP_SHELL ou qualquer arquivo do app, troque a VERSION. */
const VERSION = 'v6';
const CACHE = `divide.ai-${VERSION}`;
const APP_SHELL = [
  './',
  'styles.css',
  'fonts/inter-latin-var.woff2',
  'src/calc.js',
  'src/icons.js',
  'src/share-image.js',
  'src/app.js',
  'src/pwa.js',
  'manifest.webmanifest',
  'favicon.ico',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/pix-qr.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('divide.ai-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // A navegação é guardada como './' (a página única do app).
  const key = request.mode === 'navigate' ? './' : request;
  // no-cache: sempre revalida com o servidor (o GitHub Pages manda max-age=600);
  // se nada mudou, a resposta é um 304 curto, via ETag.
  event.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(key, copy));
        }
        return res;
      })
      .catch(() => caches.match(key).then((cached) => cached || Response.error()))
  );
});
