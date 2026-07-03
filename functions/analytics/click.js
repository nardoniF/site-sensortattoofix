const WORKER_CLICK_URL = 'https://api.sensortattoofix.com.br/analytics/click';

async function proxyClick(request) {
  const body = await request.text();
  const headers = {
    'Content-Type': request.headers.get('Content-Type') || 'application/json',
    Accept: 'application/json'
  };
  const referer = request.headers.get('Referer');
  const origin = request.headers.get('Origin');
  if (referer) headers.Referer = referer;
  if (origin) headers.Origin = origin;

  const res = await fetch(WORKER_CLICK_URL, { method: 'POST', headers, body });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' }
  });
}

export async function onRequestPost(context) {
  return proxyClick(context.request);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400'
    }
  });
}
