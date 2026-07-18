/**
 * Cloudflare Worker — sensortattoofix.com
 * Origem: jsDelivr (GitHub) — evita loop com redirect /en no .br
 */
const GITHUB_ORIGIN = 'https://cdn.jsdelivr.net/gh/nardoniF/site-sensortattoofix@main';
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
  if (/^\/it\/it(\/|$)/.test(pathname)) {
    return pathname.replace(/^\/it\/it/, '/it');
  }
  if (isStaticAsset(pathname)) return pathname;
  if (pathname.startsWith('/it/')) return pathname;
  if (pathname === '/it' || pathname === '/it/') return '/it/index.html';
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

function baseHref(originPath) {
  if (originPath.startsWith('/it/') || originPath === '/it/index.html') {
    return `${COM_ORIGIN}/it/`;
  }
  return `${COM_ORIGIN}/`;
}

function looksLikeHtml(pathname, contentType, bodyStart) {
  if (pathname.endsWith('.html') || pathname === '/' || pathname === '' || pathname.endsWith('/')) {
    return true;
  }
  if ((contentType || '').includes('text/html')) return true;
  return /^<!DOCTYPE html/i.test(bodyStart || '');
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.hostname === 'sensortattoofix.com') {
      url.hostname = 'www.sensortattoofix.com';
      return Response.redirect(url.toString(), 301);
    }

    if (/^\/it\/it(\/|$)/.test(url.pathname) || /^\/it\/+\/it/.test(url.pathname)) {
      const fixed = url.pathname.replace(/^\/it\/+it/, '/it').replace(/\/it\/\/+/g, '/it/');
      return Response.redirect(COM_ORIGIN + fixed + url.search, 301);
    }

    if (url.pathname.startsWith('/en/') || url.pathname === '/en') {
      const stripped = url.pathname.replace(/^\/en/, '') || '/';
      return Response.redirect(new URL(stripped + url.search, url.origin).toString(), 301);
    }

    const originPath = mapPath(url.pathname);
    const target = GITHUB_ORIGIN + originPath + url.search;

    const res = await fetch(target, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'stf-com-proxy',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      return new Response('Not found', { status: res.status });
    }

    const ct = res.headers.get('content-type') || '';
    const buf = await res.arrayBuffer();
    const preview = new TextDecoder().decode(buf.slice(0, 64));

    if (looksLikeHtml(originPath, ct, preview)) {
      let html = new TextDecoder().decode(buf);
      html = html.replace(/(href|src)=["']\.\.\/([^"']+)["']/gi, '$1="/$2"');
      html = html.replace(/<base\s[^>]*>/gi, '');
      html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref(originPath)}">`);

      const headers = new Headers(res.headers);
      headers.set('content-type', 'text/html; charset=utf-8');
      headers.delete('content-encoding');
      headers.delete('content-length');

      return new Response(html, { status: 200, headers });
    }

    const headers = new Headers(res.headers);
    if (originPath.endsWith('.css')) headers.set('content-type', 'text/css; charset=utf-8');
    if (originPath.endsWith('.js')) headers.set('content-type', 'application/javascript; charset=utf-8');

    return new Response(buf, { status: 200, headers });
  },
};
