/*
 * Service Worker do AUTOCOM - Ordem de Serviço
 * -------------------------------------------------
 * Torna o aplicativo disponível 100% offline depois da primeira visita
 * com internet. Não depende de nenhuma API externa.
 *
 * Estratégia de cache:
 *  - Assets estáticos com hash (/_next/static, JS, CSS, fontes, imagens,
 *    ícones, .mjs, PDF do template): CACHE-FIRST (imutáveis).
 *  - Navegações (HTML) e demais requisições GET mesma-origem (inclui payloads
 *    de navegação): NETWORK-FIRST com fallback para o cache; se offline e sem
 *    cache, cai para a tela inicial em cache e, por fim, para /offline.html.
 *  - Requisições cross-origin (ex.: scripts externos): passam direto pela rede
 *    e falham silenciosamente quando offline (não bloqueiam o app).
 */

const VERSION = 'v2';
const STATIC_CACHE = `autocom-static-${VERSION}`;
const RUNTIME_CACHE = `autocom-runtime-${VERSION}`;

// Recursos essenciais garantidos já na instalação (primeira visita com rede).
const PRECACHE_URLS = [
  '/',
  '/historico',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/logo-autocom.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/pdf.min.mjs',
  '/pdf.worker.min.mjs',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // allSettled: uma URL que falhe não impede o registro do SW.
      await Promise.allSettled(
        PRECACHE_URLS.map((u) => cache.add(new Request(u, { cache: 'reload' })))
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Permite que a página force a ativação de uma nova versão.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    /\.(?:js|css|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|ico|mjs|map|pdf)$/i.test(
      url.pathname
    )
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const fallback = await cache.match(request, { ignoreSearch: true });
    if (fallback) return fallback;
    throw err;
  }
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;

    if (request.mode === 'navigate') {
      const staticCache = await caches.open(STATIC_CACHE);
      const shell =
        (await cache.match('/', { ignoreSearch: true })) ||
        (await staticCache.match('/', { ignoreSearch: true }));
      if (shell) return shell;
      const offline = await staticCache.match('/offline.html');
      if (offline) return offline;
    }
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (_) {
    return;
  }

  // Cross-origin: deixa a rede resolver (falha silenciosa quando offline).
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});
