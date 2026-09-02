#!/usr/bin/env node
/**
 * Gera sitemaps por domínio (regra Google: <loc> só no mesmo host do sitemap).
 * - sitemap.xml → apenas URLs sensortattoofix.com.br (PT, DE, ES, PL, SL)
 * - sitemap-com.xml → apenas URLs sensortattoofix.com (EN, IT)
 * Hreflang xhtml em cada entrada continua apontando para todos os idiomas.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import {
  BR,
  COM,
  PUBLIC_PAGES,
  BR_SITEMAP_LANGS,
  COM_SITEMAP_LANGS,
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

function buildUrlset(langs) {
  const urls = [];
  for (const page of PUBLIC_PAGES) {
    const xhtml = xhtmlLinkTags(page);
    for (const lang of langs) {
      const loc = hreflangUrl(lang, page);
      urls.push(`  <url>
    <loc>${loc}</loc>
${xhtml}
    <changefreq>${CHANGEFREQ[page]}</changefreq>
    <priority>${PRIORITY[page]}</priority>
  </url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

function assertLocsOnly(xml, allowedPrefix, file) {
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const loc of locs) {
    if (!loc.startsWith(allowedPrefix)) {
      throw new Error(`${file}: <loc> fora do domínio permitido: ${loc}`);
    }
  }
}

const brXml = buildUrlset(BR_SITEMAP_LANGS);
const comXml = buildUrlset(COM_SITEMAP_LANGS);
assertLocsOnly(brXml, BR, 'sitemap.xml');
assertLocsOnly(comXml, COM, 'sitemap-com.xml');

const brOut = path.join(ROOT, 'sitemap.xml');
const comOut = path.join(ROOT, 'sitemap-com.xml');
fs.writeFileSync(brOut, brXml);
fs.writeFileSync(comOut, comXml);

const brCount = BR_SITEMAP_LANGS.length * PUBLIC_PAGES.length;
const comCount = COM_SITEMAP_LANGS.length * PUBLIC_PAGES.length;
console.log(`Wrote ${brOut} — ${brCount} URLs (.com.br)`);
console.log(`Wrote ${comOut} — ${comCount} URLs (.com)`);
