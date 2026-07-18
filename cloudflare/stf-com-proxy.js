/**
 * Cloudflare Worker — sensortattoofix.com → espelha .com.br (EN/IT no .com).
 */
const BR_ORIGIN = 'https://www.sensortattoofix.com.br';
const COM_ORIGIN = 'https://www.sensortattoofix.com';

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/js/') ||
    pathname.startsWith('/site/') ||
    pathname.startsWith('/data/') ||
    pathname.startsWith('/produtos/') ||
    pathname.startsWith('/stf-') ||
    pathname === '/style.css' ||
    /\.(css|js|json|xml|ico|jpg|jpeg|png|gif|webp|svg|woff2?|ttf|map)$/i.test(pathname)
  );
}

function mapPath(pathname) {
  if (isStaticAsset(pathname)) return pathname;
  if (pathname.startsWith('/it/')) return pathname;
  if (pathname === '/it' || pathname === '/it/') return '/it/index.html';
  if (pathname.startsWith('/en/')) {
    const rest = pathname.slice(3) || '/';
    return rest === '/' ? '/' : rest;
  }
  if (pathname === '/en' || pathname === '/en/') return '/';
  if (pathname === '/' || pathname === '') return '/en/index.html';
  if (pathname.endsWith('/') && pathname.length > 1) return '/en' + pathname + 'index.html';
  if (/^\/[^/]+\.html$/.test(pathname)) return '/en' + pathname;
  return '/en' + pathname;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.hostname === 'sensortattoofix.com') {
      url.hostname = 'www.sensortattoofix.com';
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname.startsWith('/en/') || url.pathname === '/en') {
      const stripped = url.pathname.replace(/^\/en/, '') || '/';
      return Response.redirect(new URL(stripped + url.search, url.origin).toString(), 301);
    }

    const originPath = mapPath(url.pathname);
    const target = new URL(originPath + url.search, BR_ORIGIN);
    const headers = new Headers(request.headers);
    headers.set('Host', 'www.sensortattoofix.com.br');

    const res = await fetch(target.toString(), {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow',
    });

    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
      return new HTMLRewriter()
        .on('head', {
          element(el) {
            el.prepend(`<base href="${COM_ORIGIN}/">`, { html: true });
          },
        })
        .transform(
          new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
          })
        );
    }

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  },
};
