const CACHE_PREFIX = 'lottery-pwa-';
const CACHE = CACHE_PREFIX + RELEASE;
const STATIC = new Set(PRECACHE);
const PUBLIC_PAGES = new Set([
  '/', '/builder', '/my-numbers', '/analysis-center', '/selection-analysis',
  '/guided', '/trend', '/prize-check', '/combine/lotto49c', '/combine/daily39c',
  '/combine/49', '/combine/39', '/combine-analysis/49', '/combine-analysis/39',
  '/analysis/star3', '/analysis/star4',
]);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      await Promise.all(PRECACHE.map(async path => {
        const response = await fetch(path, { cache: 'reload', credentials: 'omit', redirect: 'error' });
        if (!response.ok) throw new Error('Precache failed for ' + path);
        const contentType = response.headers.get('content-type') || '';
        const expected = path.endsWith('.js') ? /javascript/
          : path.endsWith('.css') ? /text\/css/
          : path.endsWith('.png') ? /image\/png/
          : path.endsWith('.svg') ? /image\/svg/
          : path.endsWith('.webmanifest') ? /json/
          : /text\/html/;
        if (!expected.test(contentType)) throw new Error('Unexpected content type for ' + path);
        await cache.put(path, response);
      }));
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const previous = (await caches.keys()).filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE);
    // Keep the preceding release available to tabs that still have its React bundle open.
    await Promise.all(previous.slice(0, -1).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_LOTTERY_UPDATE') event.waitUntil(self.skipWaiting());
  if (event.data?.type === 'GET_LOTTERY_RELEASE') event.ports[0]?.postMessage({ release: RELEASE });
});

function networkOnly(request) {
  return fetch(request, { cache: 'no-store' });
}

async function navigation(request, path) {
  try {
    return await networkOnly(request);
  } catch {
    const cache = await caches.open(CACHE);
    if (!PUBLIC_PAGES.has(path)) return (await cache.match('/pwa/offline.html')) ?? Response.error();
    const shell = await cache.match('/index.html');
    if (!shell) return Response.error();
    const html = (await shell.text()).replace('</head>', '<meta name="lottery-offline-shell" content="true"></head>');
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

async function staticAsset(request, path) {
  const current = await caches.open(CACHE);
  const cached = await current.match(path);
  if (cached) return cached;
  // An already-open tab may request a lazy JS chunk from the previous build.
  if (/^\/assets\/[\w.-]+-[\w-]{8,}\.(js|css)$/.test(path)) {
    for (const key of await caches.keys()) {
      if (!key.startsWith(CACHE_PREFIX) || key === CACHE) continue;
      const response = await (await caches.open(key)).match(path);
      if (response) return response;
    }
  }
  return fetch(request);
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.method !== 'GET') return;
  if (/^\/(api|data)(\/|$)/i.test(url.pathname) || request.headers.has('authorization')) {
    event.respondWith(networkOnly(request));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(navigation(request, url.pathname));
    return;
  }
  if (/^\/(auth|login|member|payment|admin|live)(\/|$)/i.test(url.pathname)) {
    event.respondWith(networkOnly(request));
    return;
  }
  if (!url.search && (STATIC.has(url.pathname) || url.pathname.startsWith('/assets/'))) {
    event.respondWith(staticAsset(request, url.pathname));
  }
});
