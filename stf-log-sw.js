const WORKER = 'https://api.sensortattoofix.com.br';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === '/stf-log' && req.method === 'POST') {
    event.respondWith(proxyPost(req, url.origin));
    return;
  }
  if (url.pathname === '/stf-log/pixel.gif' && req.method === 'GET') {
    event.respondWith(proxyPixel(url.search, url.origin));
  }
});

function proxyHeaders(origin, contentType) {
  const h = new Headers();
  h.set('Content-Type', contentType || 'application/json');
  h.set('Accept', 'application/json');
  h.set('Origin', origin);
  h.set('Referer', origin + '/');
  return h;
}

async function proxyPost(req, origin) {
  try {
    const body = await req.arrayBuffer();
    const res = await fetch(WORKER + '/analytics/click', {
      method: 'POST',
      headers: proxyHeaders(origin, req.headers.get('Content-Type')),
      body
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  } catch (_) {
    return new Response(JSON.stringify({ ok: false, error: 'proxy' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function proxyPixel(qs, origin) {
  try {
    const res = await fetch(WORKER + '/analytics/pixel.gif' + qs, {
      headers: { Referer: origin + '/', Origin: origin }
    });
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      status: res.status,
      headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' }
    });
  } catch (_) {
    return new Response(
      Uint8Array.from([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 255, 255, 255, 0, 0, 0, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 59]),
      { status: 200, headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' } }
    );
  }
}
