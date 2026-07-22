/**
 * .com storefront proxy — serves /en/* from GitHub via jsDelivr.
 * IMPORTANT: pin COMMIT after each push so .com is not stuck on stale @main cache.
 */
const COMMIT = '0977e395f3b0102ce35478ac7c95f7c48f7fd460';
const ORIGINS = [
  'https://cdn.jsdelivr.net/gh/nardoniF/site-sensortattoofix@' + COMMIT,
  'https://raw.githubusercontent.com/nardoniF/site-sensortattoofix/' + COMMIT,
];
const COM_ORIGIN = 'https://www.sensortattoofix.com';
const BR_ORIGIN = 'https://www.sensortattoofix.com.br';
const STF_COM_HOST_JS =
  "(function(){if(location.hostname==='sensortattoofix.com'){location.replace('https://www.sensortattoofix.com'+location.pathname+location.search+location.hash);}})();";

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/js/') ||
    pathname.startsWith('/site/') ||
    pathname.startsWith('/data/') ||
    pathname.startsWith('/produtos/') ||
    pathname.startsWith('/stf-') ||
    pathname === '/style.css' ||
    pathname === '/favicon.ico' ||
    /\.(css|js|json|xml|ico|jpg|jpeg|png|gif|webp|svg|woff2?|ttf|map)$/i.test(pathname)
  );
}

function mapPath(pathname) {
  if (isStaticAsset(pathname)) return pathname;
  if (pathname === '/it' || pathname === '/it/') return '/it/index.html';
  if (pathname.startsWith('/it/')) return pathname;
  if (pathname.startsWith('/en/')) {
    const rest = pathname.slice(3) || '/';
    return rest === '/' ? '/en/index.html' : '/en' + rest;
  }
  if (pathname === '/en' || pathname === '/en/') return '/en/index.html';
  if (pathname === '/' || pathname === '') return '/en/index.html';
  if (pathname.endsWith('/') && pathname.length > 1) return '/en' + pathname + 'index.html';
  if (/^\/[^/]+\.html$/.test(pathname)) return '/en' + pathname;
  return '/en' + pathname;
}

function pageFileFromOrigin(originPath) {
  let rest = originPath;
  if (rest.startsWith('/it/')) rest = rest.slice(3);
  else if (rest.startsWith('/en/')) rest = rest.slice(3);
  else rest = rest.replace(/^\//, '');
  rest = rest.replace(/^\/+/, '');
  if (!rest || rest === 'index.html') return 'index.html';
  return rest;
}

function brPtUrl(originPath) {
  const f = pageFileFromOrigin(originPath);
  return f === 'index.html' ? BR_ORIGIN + '/' : BR_ORIGIN + '/' + f;
}

function comEnUrl(originPath) {
  const f = pageFileFromOrigin(originPath);
  return f === 'index.html' ? COM_ORIGIN + '/' : COM_ORIGIN + '/' + f;
}

function comItUrl(originPath) {
  const f = pageFileFromOrigin(originPath);
  return f === 'index.html' ? COM_ORIGIN + '/it/' : COM_ORIGIN + '/it/' + f;
}

function isJsDelivrListing(html) {
  return /CDN by jsDelivr/i.test(html) && /CDN files/i.test(html);
}

function fixNavLangHrefs(html, originPath) {
  return html.replace(
    /<a\b([^>]*\bclass="[^"]*nav-lang[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi,
    (match, attrs, inner) => {
      let href = comEnUrl(originPath);
      if (/br\.png/i.test(inner)) href = brPtUrl(originPath);
      else if (/it\.png/i.test(inner)) href = comItUrl(originPath);
      else if (/us\.png/i.test(inner)) href = comEnUrl(originPath);
      const clean = attrs.replace(/\shref="[^"]*"/i, '').trim();
      return `<a href="${href}" ${clean}>${inner}</a>`;
    }
  );
}

function patchHtml(html, originPath) {
  html = html.replace(/<script[^>]+stf-com-host\.js[^>]*>\s*<\/script>\s*/gi, '');
  html = html.replace(/(href|src)=["']\.\.\/([^"']+)["']/gi, '$1="/$2"');
  html = fixNavLangHrefs(html, originPath);
  const baseHref = originPath.startsWith('/it/') ? `${COM_ORIGIN}/it/` : `${COM_ORIGIN}/`;
  if (!/<base\s/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`);
  }
  if (!/stf-lang-nav\.js/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1><script src="/js/stf-lang-nav.js?v=2"></script>`);
  }
  return html;
}

function mimeFor(pathname) {
  if (pathname.endsWith('.css')) return 'text/css; charset=utf-8';
  if (pathname.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (pathname.endsWith('.json')) return 'application/json; charset=utf-8';
  if (pathname.endsWith('.svg')) return 'image/svg+xml';
  if (/\.(png|jpg|jpeg|gif|webp|ico)$/i.test(pathname)) return undefined;
  return 'application/octet-stream';
}

async function fetchOrigin(originPath, search) {
  const qs = search && search.length > 1 ? search : '?v=' + COMMIT.slice(0, 7);
  const headers = { Accept: '*/*', 'User-Agent': 'stf-com-proxy', 'Cache-Control': 'no-cache' };
  let last = null;
  for (const origin of ORIGINS) {
    const useQs = origin.includes('jsdelivr.net') ? qs : '';
    last = await fetch(origin + originPath + useQs, {
      method: 'GET',
      headers,
      redirect: 'manual',
    });
    if (last.ok) return last;
  }
  return last;
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

    if (url.pathname.includes('stf-com-host.js')) {
      return new Response(STF_COM_HOST_JS, {
        headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' },
      });
    }

    let originPath = mapPath(url.pathname);
    let res = await fetchOrigin(originPath, url.search);
    if (!res.ok) return new Response('Not found', { status: res.status });

    const buf = await res.arrayBuffer();

    if (!isStaticAsset(originPath) && !originPath.endsWith('.html')) {
      let html = new TextDecoder().decode(buf);
      if (isJsDelivrListing(html)) {
        originPath = originPath.replace(/\/?$/, '/') + 'index.html';
        res = await fetchOrigin(originPath, url.search);
        if (!res.ok) return new Response('Not found', { status: res.status });
        html = new TextDecoder().decode(await res.arrayBuffer());
      }
    }

    if (isStaticAsset(originPath)) {
      const headers = new Headers();
      const mime = mimeFor(originPath);
      if (mime) headers.set('content-type', mime);
      headers.set('cache-control', 'public, max-age=120');
      return new Response(buf, { status: 200, headers });
    }

    let html = new TextDecoder().decode(buf);
    if (isJsDelivrListing(html)) {
      originPath = originPath.replace(/\/?$/, '/') + 'index.html';
      res = await fetchOrigin(originPath, url.search);
      if (!res.ok) return new Response('Not found', { status: res.status });
      html = new TextDecoder().decode(await res.arrayBuffer());
    }

    html = patchHtml(html, originPath);
    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store, max-age=0',
        'x-stf-commit': COMMIT
      },
    });
  },
};
