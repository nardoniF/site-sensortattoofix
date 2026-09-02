#!/usr/bin/env node
/**
 * Gera sitemap.xml com todas as versões de idioma + hreflang xhtml.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import {
  HREFLANG_ORDER,
  PUBLIC_PAGES,
  hreflangUrl,
  xhtmlLinkTags,
} from './hreflang-config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PRIORITY = {
  index: '1.0',
  'loja.html': '0.8',
  'onde-comprar.html': '0.7',
  'comunidade.html': '0.75',
};

const CHANGEFREQ = {
  index: 'weekly',
  'loja.html': 'weekly',
  'onde-comprar.html': 'monthly',
  'comunidade.html': 'daily',
};

const LOCALE_LANGS = ['pt-BR', 'en', 'it', 'de', 'es', 'pl', 'sl'];

const urls = [];

for (const page of PUBLIC_PAGES) {
  const xhtml = xhtmlLinkTags(page);
  for (const lang of LOCALE_LANGS) {
    const loc = hreflangUrl(lang, page);
    urls.push(`  <url>
    <loc>${loc}</loc>
${xhtml}
    <changefreq>${CHANGEFREQ[page]}</changefreq>
    <priority>${PRIORITY[page]}</priority>
  </url>`);
  }
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;

const out = path.join(ROOT, 'sitemap.xml');
fs.writeFileSync(out, xml);
console.log(`Wrote ${out} — ${urls.length} URLs (${PUBLIC_PAGES.length} páginas × ${LOCALE_LANGS.length} idiomas)`);
