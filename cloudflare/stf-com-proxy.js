/**
 * Storefront proxy — serves pinned GitHub commit via jsDelivr.
 * - .com / www.sensortattoofix.com → EN (/) + IT/DE/ES/PL/SL/FR/NL/SV/NO/FI (/it/, /de/, …)
 * - .com.br → Portuguese (repo root); paths /de|/es|/pl|/sl|/it|/fr|/nl|/sv|/no|/fi|/en redirecionam ao .com
 * - First-hit: cookie / CF-IPCountry / Accept-Language → redirect para idioma nativo
 * IMPORTANT: pin COMMIT after each push so domains are not stuck on stale @main cache.
 */
import {
  resolvePreferredLang,
  localeRedirectTarget,
  prefCookieHeader,
  langFromPathname,
  isBotUserAgent
} from './geo-lang.js';

const COMMIT = 'c1f8ef0922c53a24ba05144fc5cf6c5cc2bc36c0';
const ORIGINS = [
  'https://cdn.jsdelivr.net/gh/nardoniF/site-sensortattoofix@' + COMMIT,
  'https://raw.githubusercontent.com/nardoniF/site-sensortattoofix/' + COMMIT,
];
const COM_ORIGIN = 'https://www.sensortattoofix.com';
const BR_ORIGIN = 'https://www.sensortattoofix.com.br';
const API_ORIGIN = 'https://sensortattoofix-payments.sensortattoofix.workers.dev';
const STF_COM_HOST_JS =
  "(function(){if(location.hostname==='sensortattoofix.com'){location.replace('https://www.sensortattoofix.com'+location.pathname+location.search+location.hash);}})();";

function isBrHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  return h === 'sensortattoofix.com.br' || h === 'www.sensortattoofix.com.br';
}

/** Map legacy image URLs (/site/*, /produtos/*, /img/*) to /images/... */
function rewriteLegacyImagePath(pathname) {
  const p = String(pathname || '');
  if (p.startsWith('/images/')) return p;
  if (p.startsWith('/produtos/')) return '/images/produtos/' + p.slice('/produtos/'.length);
  if (p.startsWith('/img/')) return '/images/depoimentos/' + p.slice('/img/'.length);

  const brandHome = {
    '/site/logo.jpg': '/images/brand/logo.jpg',
    '/site/sensortattoofix.jpg': '/images/brand/sensortattoofix.jpg',
    '/site/relogio_home.jpg': '/images/home/relogio_home.jpg',
    '/site/relogio_home2.jpg': '/images/home/relogio_home2.jpg',
    '/site/relogio_sensor.jpg': '/images/home/relogio_sensor.jpg',
    '/site/kit-profissional.png': '/images/home/kit-profissional.png',
    '/site/fundador-fabio.jpg': '/images/home/fundador-fabio.jpg',
  };
  if (brandHome[p]) return brandHome[p];

  for (const section of ['kit-gallery', 'lens-gallery', 'smartband', 'comissionado']) {
    const prefix = '/site/' + section + '/';
    if (p.startsWith(prefix)) return '/images/' + section + '/' + p.slice(prefix.length);
  }
  return p;
}

function isStaticAsset(pathname) {
  if (pathname === '/stf-log' || pathname.startsWith('/stf-log/')) return false;
  return (
    pathname.startsWith('/js/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/site/') ||
    pathname.startsWith('/data/') ||
    pathname.startsWith('/produtos/') ||
    pathname.startsWith('/img/') ||
    pathname.startsWith('/stf-') ||
    pathname === '/style.css' ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/sitemap-com.xml' ||
    /\.(css|js|json|xml|ico|jpg|jpeg|png|gif|webp|svg|woff2?|ttf|map|pdf)$/i.test(pathname)
  );
}

/** Pages that live at repo root and must work on .com (emails link here, no /en/ copy). */
const COM_SHARED_ROOT_PAGES = new Set([
  '/rastreio.html',
  '/google7b1cb2c1f70b0fda.html',
]);

const INTL_LANGS = ['it', 'de', 'es', 'pl', 'sl', 'fr', 'nl', 'sv', 'no', 'fi'];

/**
 * Guias SEO no root do .com → arquivo em /en/.
 * Prefixo /{lang}/ serve o HTML nativo desse idioma (não reescreve para EN).
 * Slugs PT no .com redirecionam semanticamente para o par EN.
 */
const SEO_GUIDE_ROOT_TO_EN = {
  'smartwatch-tattoo.html': '/en/smartwatch-tattoo.html',
  'apple-watch-tattoo.html': '/en/apple-watch-tattoo.html',
  'garmin-watch-tattoo.html': '/en/garmin-watch-tattoo.html',
  'disable-wrist-detection-tattoo.html': '/en/disable-wrist-detection-tattoo.html',
  'smartwatch-tatuagem.html': '/en/smartwatch-tattoo.html',
  'apple-watch-tatuagem.html': '/en/apple-watch-tattoo.html',
  'garmin-watch-tatuagem.html': '/en/garmin-watch-tattoo.html',
  'desativar-deteccao-de-pulso-tatuagem.html': '/en/disable-wrist-detection-tattoo.html',
};

function mapPathCom(pathname) {
  // .com /sitemap.xml must not serve the BR urlset — use the intl sitemap.
  if (pathname === '/sitemap.xml') return '/sitemap-com.xml';
  if (isStaticAsset(pathname)) return pathname;
  if (COM_SHARED_ROOT_PAGES.has(pathname)) return pathname;
  for (const lang of INTL_LANGS) {
    if (pathname === `/${lang}` || pathname === `/${lang}/`) return `/${lang}/index.html`;
    if (pathname.startsWith(`/${lang}/`)) {
      // Native localized guides and pages live under /{lang}/…
      return pathname.endsWith('/') ? pathname + 'index.html' : pathname;
    }
  }
  if (pathname.startsWith('/en/')) {
    const rest = pathname.slice(3) || '/';
    return rest === '/' ? '/en/index.html' : '/en' + rest;
  }
  if (pathname === '/en' || pathname === '/en/') return '/en/index.html';
  if (pathname === '/' || pathname === '') return '/en/index.html';
  if (pathname.endsWith('/') && pathname.length > 1) return '/en' + pathname + 'index.html';
  if (/^\/[^/]+\.html$/.test(pathname)) {
    const file = pathname.slice(1);
    if (SEO_GUIDE_ROOT_TO_EN[file]) return SEO_GUIDE_ROOT_TO_EN[file];
    return '/en' + pathname;
  }
  return '/en' + pathname;
}

function mapPathBr(pathname) {
  if (isStaticAsset(pathname)) return pathname;
  if (pathname === '/' || pathname === '') return '/index.html';
  if (pathname.endsWith('/') && pathname.length > 1) return pathname + 'index.html';
  if (/^\/[^/]+\.html$/.test(pathname)) return pathname;
  if (!pathname.includes('.') && !pathname.endsWith('/')) return pathname + '.html';
  return pathname;
}

function pageFileFromOrigin(originPath) {
  let rest = originPath;
  for (const lang of INTL_LANGS) {
    if (rest.startsWith(`/${lang}/`)) {
      rest = rest.slice(lang.length + 1);
      break;
    }
  }
  if (rest.startsWith('/en/')) rest = rest.slice(3);
  else rest = rest.replace(/^\//, '');
  rest = rest.replace(/^\/+/, '');
  if (!rest || rest === 'index.html') return 'index.html';
  return rest;
}

function comLangUrl(originPath, lang) {
  const f = pageFileFromOrigin(originPath);
  return f === 'index.html' ? `${COM_ORIGIN}/${lang}/` : `${COM_ORIGIN}/${lang}/${f}`;
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
  return comLangUrl(originPath, 'it');
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

function comBaseHref(originPath) {
  for (const lang of INTL_LANGS) {
    if (originPath === `/${lang}` || originPath.startsWith(`/${lang}/`)) {
      return `${COM_ORIGIN}/${lang}/`;
    }
  }
  return `${COM_ORIGIN}/`;
}

function patchHtml(html, originPath, br) {
  html = html.replace(/<script[^>]+stf-com-host\.js[^>]*>\s*<\/script>\s*/gi, '');
  html = html.replace(/(href|src)=["']\.\.\/([^"']+)["']/gi, '$1="/$2"');
  html = fixNavLangHrefs(html, originPath);
  const baseHref = br ? `${BR_ORIGIN}/` : comBaseHref(originPath);
  if (!/<base\s/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`);
  }
  if (!/stf-lang-nav\.js/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1><script src="/js/stf-lang-nav.js?v=6"></script>`);
  }
  return html;
}

function mimeFor(pathname) {
  if (pathname.endsWith('.css')) return 'text/css; charset=utf-8';
  if (pathname.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (pathname.endsWith('.json')) return 'application/json; charset=utf-8';
  if (pathname.endsWith('.xml')) return 'application/xml; charset=utf-8';
  if (pathname.endsWith('.txt')) return 'text/plain; charset=utf-8';
  if (pathname.endsWith('.svg')) return 'image/svg+xml';
  if (/\.pdf$/i.test(pathname)) return 'application/pdf';
  if (/\.(png|jpg|jpeg|gif|webp|ico)$/i.test(pathname)) return undefined;
  return 'application/octet-stream';
}

async function fetchOrigin(originPath, search) {
  const qs = search && search.length > 1 ? search : '?v=' + COMMIT.slice(0, 7);
  const headers = { Accept: '*/*', 'User-Agent': 'stf-com-proxy', 'Cache-Control': 'no-cache' };
  let last = null;
  // Retry: jsDelivr/raw can 404/5xx briefly; GSC live test then reports "Não encontrado (404)".
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const origin of ORIGINS) {
      const useQs = origin.includes('jsdelivr.net') ? qs : '';
      try {
        last = await fetch(origin + originPath + useQs, {
          method: 'GET',
          headers,
          redirect: 'manual',
        });
        if (last && last.ok) return last;
      } catch {
        last = null;
      }
    }
  }
  return last;
}

/** Same-origin click log — no CORS, works with sendBeacon from the storefront. */
async function proxyClickLog(request, siteOrigin) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': siteOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const body = await request.arrayBuffer();
  const res = await fetch(API_ORIGIN + '/analytics/click', {
    method: 'POST',
    headers: {
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
      Accept: 'application/json',
      Origin: siteOrigin,
      Referer: siteOrigin + '/',
    },
    body,
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': siteOrigin,
    },
  });
}

async function proxyClickPixel(request, siteOrigin) {
  const incoming = new URL(request.url);
  const res = await fetch(API_ORIGIN + '/analytics/pixel.gif' + incoming.search, {
    method: 'GET',
    headers: {
      Origin: siteOrigin,
      Referer: siteOrigin + '/',
    },
  });
  const buf = await res.arrayBuffer();
  return new Response(buf, {
    status: res.status,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store',
    },
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Força HTTPS (Search Console / SEO)
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }

    // Apex → www
    if (url.hostname === 'sensortattoofix.com' || url.hostname === 'sensortattoofix.com.br') {
      url.hostname = url.hostname === 'sensortattoofix.com.br'
        ? 'www.sensortattoofix.com.br'
        : 'www.sensortattoofix.com';
    }

    const br = isBrHost(url.hostname);

    // Intl canônico no .com — consolidar .com.br/{de,es,pl,sl,it,en}/ → .com
    if (br) {
      const m = url.pathname.match(/^\/(de|es|pl|sl|it|fr|nl|sv|no|fi)(\/.*)?$/i);
      if (m) {
        const dest = new URL(`https://www.sensortattoofix.com/${m[1].toLowerCase()}${m[2] || '/'}`);
        dest.search = url.search;
        return Response.redirect(dest.toString(), 301);
      }
      if (url.pathname === '/en' || url.pathname.startsWith('/en/')) {
        const rest = url.pathname.replace(/^\/en/, '') || '/';
        const dest = new URL(`https://www.sensortattoofix.com${rest}`);
        dest.search = url.search;
        return Response.redirect(dest.toString(), 301);
      }
    }

    // Se só normalizamos apex→www, redireciona
    if (url.href !== request.url) {
      return Response.redirect(url.toString(), 301);
    }

    const siteOrigin = url.origin;

    // First-hit locale: Polônia → /pl/, Alemanha → /de/, etc. (não aplica a bots)
    if (!isBotUserAgent(request.headers.get('user-agent'))) {
      const force = String(url.searchParams.get('stf_lang') || '').toLowerCase();
      const forcedLang = ['pt', 'en', 'it', 'de', 'es', 'pl', 'sl', 'fr', 'nl', 'sv', 'no', 'fi'].includes(force) ? force : null;
      if (forcedLang) url.searchParams.delete('stf_lang');
      const preferred = forcedLang || resolvePreferredLang({
        cookieHeader: request.headers.get('cookie'),
        country: request.cf?.country || request.headers.get('CF-IPCountry'),
        acceptLanguage: request.headers.get('accept-language'),
        fallback: br ? 'pt' : 'en'
      });
      const dest = localeRedirectTarget({
        hostOrigin: siteOrigin,
        pathname: url.pathname,
        search: url.search,
        br,
        preferred
      });
      if (dest) {
        const destUrl = new URL(dest);
        if (destUrl.pathname !== url.pathname || destUrl.origin !== url.origin) {
          return new Response(null, {
            status: 302,
            headers: {
              Location: dest,
              'Set-Cookie': prefCookieHeader(preferred),
              'Cache-Control': 'no-store'
            }
          });
        }
      } else if (forcedLang) {
        // Stay on current URL but persist explicit preference (e.g. ?stf_lang=en on /)
        // fall through after cookie set via HTML response below when possible
      }
    }

    if (url.pathname === '/stf-log' || url.pathname === '/stf-log/') {
      return proxyClickLog(request, siteOrigin);
    }
    if (url.pathname === '/stf-log/pixel.gif') {
      return proxyClickPixel(request, siteOrigin);
    }

    if (!br && (url.pathname.startsWith('/en/') || url.pathname === '/en')) {
      const stripped = url.pathname.replace(/^\/en/, '') || '/';
      return Response.redirect(new URL(stripped + url.search, url.origin).toString(), 301);
    }

    if (url.pathname.includes('stf-com-host.js')) {
      return new Response(STF_COM_HOST_JS, {
        headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' },
      });
    }

    let originPath = br ? mapPathBr(url.pathname) : mapPathCom(url.pathname);
    originPath = rewriteLegacyImagePath(originPath);
    let res = await fetchOrigin(originPath, url.search);
    if (!res || !res.ok) {
      const status = res && res.status ? res.status : 502;
      return new Response('Not found', {
        status,
        headers: { 'Cache-Control': 'no-store', 'x-stf-commit': COMMIT },
      });
    }

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
      headers.set('x-stf-commit', COMMIT);
      // robots.txt is shared in the repo; on .com point Sitemap to the intl file.
      if (!br && url.pathname === '/robots.txt') {
        let robots = new TextDecoder().decode(buf);
        robots = robots
          .replace(
            /Sitemap:\s*https:\/\/www\.sensortattoofix\.com\.br\/sitemap\.xml\s*/i,
            ''
          )
          .replace(
            /Sitemap:\s*https:\/\/www\.sensortattoofix\.com\/sitemap-com\.xml/i,
            'Sitemap: https://www.sensortattoofix.com/sitemap.xml'
          );
        if (!/Sitemap:\s*https:\/\/www\.sensortattoofix\.com\/sitemap\.xml/i.test(robots)) {
          robots = robots.trimEnd() + '\nSitemap: https://www.sensortattoofix.com/sitemap.xml\n';
        }
        headers.set('content-type', 'text/plain; charset=utf-8');
        return new Response(robots, { status: 200, headers });
      }
      return new Response(buf, { status: 200, headers });
    }

    let html = new TextDecoder().decode(buf);
    if (isJsDelivrListing(html)) {
      originPath = originPath.replace(/\/?$/, '/') + 'index.html';
      res = await fetchOrigin(originPath, url.search);
      if (!res.ok) return new Response('Not found', { status: res.status });
      html = new TextDecoder().decode(await res.arrayBuffer());
    }

    html = patchHtml(html, originPath, br);
    const pathLang = langFromPathname(url.pathname, br);
    const headers = {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
      'x-stf-commit': COMMIT,
      'Set-Cookie': prefCookieHeader(pathLang)
    };
    return new Response(html, {
      status: 200,
      headers
    });
  },
};
