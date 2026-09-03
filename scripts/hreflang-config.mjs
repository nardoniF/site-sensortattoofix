/**
 * URLs canônicas hreflang — fonte única para HTML e sitemap.xml.
 * PT → sensortattoofix.com.br
 * EN/IT/DE/ES/PL/SL → sensortattoofix.com
 */
export const BR = 'https://www.sensortattoofix.com.br';
export const COM = 'https://www.sensortattoofix.com';

export const HREFLANG_ORDER = ['pt-BR', 'en', 'it', 'de', 'es', 'pl', 'sl', 'x-default'];

/** Páginas indexáveis (SEO). */
export const PUBLIC_PAGES = ['index', 'loja.html', 'onde-comprar.html', 'comunidade.html'];

/** Páginas noindex — hreflang para consistência, sem sitemap. */
export const NOINDEX_PAGES = ['comprar.html', 'minha-conta.html'];

export const ALL_PAGES = [...PUBLIC_PAGES, ...NOINDEX_PAGES];

export const LANG_DIRS = ['en', 'it', 'de', 'es', 'pl', 'sl'];

/** Idiomas cujo <loc> canônico fica em cada domínio (regra do Search Console). */
export const BR_SITEMAP_LANGS = ['pt-BR'];
export const COM_SITEMAP_LANGS = ['en', 'it', 'de', 'es', 'pl', 'sl'];

/** Host canônico do idioma (sem path). */
export function canonicalHost(lang) {
  if (lang === 'pt-BR' || lang === 'pt') return BR;
  return COM;
}

/** @param {'pt-BR'|'en'|'it'|'de'|'es'|'pl'|'sl'|'x-default'} lang */
export function hreflangUrl(lang, page) {
  const file = page === 'index' ? '' : page;
  if (lang === 'pt-BR') return file ? `${BR}/${file}` : `${BR}/`;
  if (lang === 'en') return file ? `${COM}/${file}` : `${COM}/`;
  if (lang === 'it') return file ? `${COM}/it/${file}` : `${COM}/it/`;
  if (lang === 'de') return file ? `${COM}/de/${file}` : `${COM}/de/`;
  if (lang === 'es') return file ? `${COM}/es/${file}` : `${COM}/es/`;
  if (lang === 'pl') return file ? `${COM}/pl/${file}` : `${COM}/pl/`;
  if (lang === 'sl') return file ? `${COM}/sl/${file}` : `${COM}/sl/`;
  if (lang === 'x-default') return file ? `${BR}/${file}` : `${BR}/`;
  throw new Error(`hreflang desconhecido: ${lang}`);
}

/** Canônica da página no locale do arquivo (pt-BR | en | it | …). */
export function canonicalUrl(lang, page) {
  const code = lang === 'pt' ? 'pt-BR' : lang;
  return hreflangUrl(code === 'pt-BR' ? 'pt-BR' : code, page);
}

export function hreflangLinkTags(page, indent = '    ') {
  return HREFLANG_ORDER.map(
    (lang) => `${indent}<link rel="alternate" hreflang="${lang}" href="${hreflangUrl(lang, page)}">`
  ).join('\n');
}

export function xhtmlLinkTags(page, indent = '    ') {
  return HREFLANG_ORDER.filter((l) => l !== 'x-default').map(
    (lang) => `${indent}<xhtml:link rel="alternate" hreflang="${lang}" href="${hreflangUrl(lang, page)}"/>`
  ).join('\n');
}

/** @returns {{ lang: string, page: string } | null} */
export function parseLocaleFile(rel) {
  const norm = rel.replace(/\\/g, '/');
  const m = norm.match(/^(?:(en|it|de|es|pl|sl)\/)?([^/]+\.html|index\.html)$/);
  if (!m) return null;
  const lang = m[1] || 'pt-BR';
  const page = m[2] === 'index.html' ? 'index' : m[2];
  if (!ALL_PAGES.includes(page)) return null;
  return { lang, page };
}

export function localeHtmlFiles() {
  const files = [];
  for (const page of ALL_PAGES) {
    const rootName = page === 'index' ? 'index.html' : page;
    files.push(rootName);
    for (const lang of LANG_DIRS) {
      files.push(`${lang}/${rootName}`);
    }
  }
  return files;
}
