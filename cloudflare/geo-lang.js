/**
 * Preferência de idioma para first-hit no proxy (.com / .com.br).
 * Cookie > país CF > Accept-Language > default (en no .com / pt no .com.br).
 */

export const PREF_COOKIE = 'stf_pref_lang';
export const SITE_LANGS = ['pt', 'en', 'it', 'de', 'es', 'pl', 'sl'];

/** País ISO → idioma do site (só mapeamentos claros). */
export const COUNTRY_LANG = {
  BR: 'pt',
  PL: 'pl',
  SI: 'sl',
  IT: 'it',
  SM: 'it',
  VA: 'it',
  DE: 'de',
  AT: 'de',
  LI: 'de',
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  UY: 'es',
  PY: 'es',
  BO: 'es',
  EC: 'es',
  VE: 'es',
  GT: 'es',
  CR: 'es',
  PA: 'es',
  DO: 'es',
  HN: 'es',
  SV: 'es',
  NI: 'es',
  CU: 'es',
  US: 'en',
  GB: 'en',
  UK: 'en',
  AU: 'en',
  NZ: 'en',
  IE: 'en',
  CA: 'en'
};

const BOT_RE = /googlebot|bingbot|yandex|baidu|duckduck|slurp|facebookexternalhit|twitterbot|linkedinbot|embedly|quora|pinterest|redditbot|applebot|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|crawler|spider|bot\b/i;

export function isBotUserAgent(ua) {
  return BOT_RE.test(String(ua || ''));
}

export function normalizeSiteLang(raw) {
  const l = String(raw || '').trim().toLowerCase().slice(0, 2);
  return SITE_LANGS.includes(l) ? l : null;
}

export function langFromCountry(countryCode) {
  const cc = String(countryCode || '').trim().toUpperCase();
  if (!cc || cc === 'XX' || cc === 'T1') return null;
  return COUNTRY_LANG[cc] || null;
}

/** Parse Accept-Language → first supported site lang. */
export function langFromAcceptLanguage(header) {
  const raw = String(header || '').trim();
  if (!raw) return null;
  const parts = raw.split(',').map((p) => {
    const [tag, ...params] = p.trim().split(';');
    let q = 1;
    for (const param of params) {
      const m = param.trim().match(/^q=([0-9.]+)/i);
      if (m) q = Number(m[1]) || 0;
    }
    return { tag: String(tag || '').trim().toLowerCase(), q };
  }).filter((p) => p.tag);
  parts.sort((a, b) => b.q - a.q);
  for (const { tag } of parts) {
    if (tag.startsWith('pt')) return 'pt';
    if (tag.startsWith('pl')) return 'pl';
    if (tag.startsWith('sl')) return 'sl';
    if (tag.startsWith('de')) return 'de';
    if (tag.startsWith('es')) return 'es';
    if (tag.startsWith('it')) return 'it';
    if (tag.startsWith('en')) return 'en';
  }
  return null;
}

export function prefLangFromCookie(cookieHeader) {
  const raw = String(cookieHeader || '');
  const m = raw.match(/(?:^|;\s*)stf_pref_lang=([a-z]{2})/i);
  return m ? normalizeSiteLang(m[1]) : null;
}

/**
 * @param {{ cookieHeader?: string, country?: string, acceptLanguage?: string, fallback?: string }} opts
 * @returns {'pt'|'en'|'it'|'de'|'es'|'pl'|'sl'}
 */
export function resolvePreferredLang({ cookieHeader, country, acceptLanguage, fallback = 'en' } = {}) {
  return (
    prefLangFromCookie(cookieHeader)
    || langFromCountry(country)
    || langFromAcceptLanguage(acceptLanguage)
    || normalizeSiteLang(fallback)
    || 'en'
  );
}

export function prefCookieHeader(lang, maxAgeSec = 60 * 60 * 24 * 365) {
  const l = normalizeSiteLang(lang) || 'en';
  return `${PREF_COOKIE}=${l}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax; Secure`;
}

/** Paths on .com that are the English default (no /de|/pl|… prefix). */
export function isComEnglishEntryPath(pathname) {
  const p = String(pathname || '');
  if (p === '/' || p === '' || p === '/index.html') return true;
  if (/^\/(en|it|de|es|pl|sl)(\/|$)/i.test(p)) return false;
  if (/^\/[a-z0-9_-]+\.html$/i.test(p)) return true;
  return false;
}

export function isBrHomePath(pathname) {
  const p = String(pathname || '');
  return p === '/' || p === '' || p === '/index.html';
}

/**
 * @returns {string|null} absolute URL to redirect to, or null
 */
export function localeRedirectTarget({ hostOrigin, pathname, search, br, preferred }) {
  const lang = normalizeSiteLang(preferred) || 'en';
  const COM = 'https://www.sensortattoofix.com';
  const BR = 'https://www.sensortattoofix.com.br';
  const path = pathname || '/';
  const q = search || '';

  if (br) {
    if (!isBrHomePath(path)) return null;
    if (lang === 'pt') return null;
    // Visitante intl na home BR → mercado .com no idioma certo
    if (lang === 'en') return q ? `${COM}/${q}` : `${COM}/`;
    return q ? `${COM}/${lang}/${q}` : `${COM}/${lang}/`;
  }

  if (!isComEnglishEntryPath(path)) return null;
  if (lang === 'en') return null;

  const isHome = path === '/' || path === '' || path === '/index.html';
  const file = isHome ? '' : path.replace(/^\//, '');
  const base = String(hostOrigin || COM).replace(/\/$/, '');

  if (lang === 'pt') {
    if (isHome) return q ? `${BR}/${q}` : `${BR}/`;
    return `${BR}/${file}${q}`;
  }
  if (isHome) return q ? `${base}/${lang}/${q}` : `${base}/${lang}/`;
  return `${base}/${lang}/${file}${q}`;
}

/** Lang implied by current path (for setting preference cookie). */
export function langFromPathname(pathname, br) {
  const path = String(pathname || '');
  const m = path.match(/^\/(en|it|de|es|pl|sl)(\/|$)/i);
  if (m) return m[1].toLowerCase();
  if (br) return 'pt';
  return 'en';
}
