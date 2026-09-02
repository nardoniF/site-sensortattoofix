/**
 * URLs canônicas hreflang — fonte única para HTML e sitemap.xml.
 * PT + DE/ES/PL/SL → sensortattoofix.com.br
 * EN + IT → sensortattoofix.com
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
export const BR_SITEMAP_LANGS = ['pt-BR', 'de', 'es', 'pl', 'sl'];
export const COM_SITEMAP_LANGS = ['en', 'it'];

/** @param {'pt-BR'|'en'|'it'|'de'|'es'|'pl'|'sl'|'x-default'} lang */
export function hreflangUrl(lang, page) {
  const file = page === 'index' ? '' : page;
  if (lang === 'pt-BR') return file ? `${BR}/${file}` : `${BR}/`;
  if (lang === 'en') return file ? `${COM}/${file}` : `${COM}/`;
  if (lang === 'it') return file ? `${COM}/it/${file}` : `${COM}/it/`;
  if (lang === 'de') return file ? `${BR}/de/${file}` : `${BR}/de/`;
  if (lang === 'es') return file ? `${BR}/es/${file}` : `${BR}/es/`;
  if (lang === 'pl') return file ? `${BR}/pl/${file}` : `${BR}/pl/`;
  if (lang === 'sl') return file ? `${BR}/sl/${file}` : `${BR}/sl/`;
  if (lang === 'x-default') return file ? `${BR}/${file}` : `${BR}/`;
  throw new Error(`hreflang desconhecido: ${lang}`);
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
