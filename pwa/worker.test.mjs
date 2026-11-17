import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const origin = 'https://preview.example';
const script = readFileSync(new URL('./worker.js', import.meta.url), 'utf8');
const fixtures = ['/index.html', '/pwa/offline.html', '/assets/index-334455aB.js'];

function worker() {
  const handlers = {};
  const namespaces = new Map([['non-pwa', new Map()]]);
  const network = [];
  const cache = key => {
    if (!namespaces.has(key)) namespaces.set(key, new Map());
    return namespaces.get(key);
  };
  let offline = false;
  let rejectPrecache = false;
  let skipped = false;
  const api = {
    addEventListener: (name, handler) => { handlers[name] = handler; },
    location: { origin },
    clients: { claim: () => Promise.resolve() },
    skipWaiting: () => { skipped = true; return Promise.resolve(); },
  };
  runInNewContext(script, {
    self: api, URL, Response, RELEASE: 'release-a', PRECACHE: fixtures,
    fetch: async (request, options) => {
      const url = typeof request === 'string' ? request : new URL(request.url).pathname;
      network.push({ url, options });
      if (offline) throw new TypeError('network unavailable');
      const type = url.endsWith('.js') && !rejectPrecache ? 'application/javascript' : 'text/html';
      const body = url === '/index.html' ? '<head></head><main>App</main>' : url;
      return new Response(body, { headers: { 'Content-Type': type } });
    },
    caches: {
      open: async key => ({
        match: async path => cache(key).get(path)?.clone(),
        put: async (path, response) => { cache(key).set(path, response); },
      }),
      keys: async () => [...namespaces.keys()],
      delete: async key => namespaces.delete(key),
    },
  });

  function emit(type, extras = {}) {
    let result;
    handlers[type]({ ...extras, waitUntil: promise => { result = promise; }, respondWith: promise => { result = promise; } });
    return result;
  }
  function get(path, mode = 'cors', method = 'GET') {
    return emit('fetch', { request: { url: origin + path, mode, method, headers: new Headers() } });
  }
  return { emit, get, cache, namespaces, network, goOffline: () => { offline = true; },
    rejectPrecache: () => { rejectPrecache = true; }, skipped: () => skipped };
}

test('public routes load the generic shell and label it offline only after a network failure', async () => {
  const w = worker();
  await w.emit('install');
  assert.equal(await (await w.get('/', 'navigate')).text(), '/');
  w.goOffline();
  assert.match(await (await w.get('/selection-analysis?game=power', 'navigate')).text(), /lottery-offline-shell/);
  for (const route of ['/live', '/member', '/payment/result', '/admin/payments']) {
    assert.equal(await (await w.get(route, 'navigate')).text(), '/pwa/offline.html');
  }
  assert.equal(await (await w.get(fixtures[2])).text(), fixtures[2]);
});

test('API and draw-data requests never use the cached SPA or HTTP cache', async () => {
  const w = worker();
  await w.emit('install');
  const paths = ['/api/auth/me', '/api/trpc/payment.getMyVipAuthority', '/api/trpc/payment.stats', '/data/lottery/power_history.json'];
  for (const path of paths) {
    await w.get(path);
    assert.equal(w.network.at(-1).options.cache, 'no-store');
  }
  w.goOffline();
  for (const path of paths) {
    await assert.rejects(w.get(path));
    await assert.rejects(w.get(path, 'navigate'));
  }
  assert.equal(w.get('/api/ecpay/callback', 'cors', 'POST'), undefined);
  assert.deepEqual([...w.cache('lottery-pwa-release-a').keys()], fixtures);
});

test('an incomplete precache leaves the previous release intact', async () => {
  const w = worker();
  w.cache('lottery-pwa-previous');
  w.rejectPrecache();
  await assert.rejects(w.emit('install'), /Unexpected content type/);
  assert.equal(w.namespaces.has('lottery-pwa-release-a'), false);
  assert.equal(w.namespaces.has('lottery-pwa-previous'), true);
});

test('updates wait for consent and activation keeps one previous release', async () => {
  const w = worker();
  w.cache('lottery-pwa-older');
  w.cache('lottery-pwa-previous');
  await w.emit('install');
  assert.equal(w.skipped(), false);
  await w.emit('message', { data: { type: 'ACTIVATE_LOTTERY_UPDATE' } });
  await w.emit('activate');
  assert.equal(w.skipped(), true);
  assert.deepEqual([...w.namespaces.keys()], ['non-pwa', 'lottery-pwa-previous', 'lottery-pwa-release-a']);
});
