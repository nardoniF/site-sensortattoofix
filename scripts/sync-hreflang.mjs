#!/usr/bin/env node
/**
 * Sincroniza canonical + og:url + hreflang em todas as páginas localizadas.
 * Regra: PT → .com.br | EN/IT/DE/ES/PL/SL → .com
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import {
  canonicalUrl,
  hreflangLinkTags,
  localeHtmlFiles,
  parseLocaleFile,
} from './hreflang-config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function stripHreflang(html) {
  let out = html;
  out = out.replace(/<link\s+rel="alternate"\s+hreflang="[^"]+"\s+href="[^"]*"\s*\/?>\s*/gi, '');
  out = out.replace(/<link\s+rel="alternate"\s+hreflang="[^"]+"\s+href="[^"]*"\s*[\r\n]+\s*\/?>\s*/gi, '');
  return out;
}

function setCanonical(html, href) {
  if (/<link\s+rel="canonical"/i.test(html)) {
    return html.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${href}">`
    );
  }
  // inserir após title
  return html.replace(/<\/title>/i, `</title>\n    <link rel="canonical" href="${href}">`);
}

function setOgUrl(html, href) {
  if (/property="og:url"/i.test(html)) {
    return html.replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${href}">`
    );
  }
  return html;
}

/** Formspree / hidden _next: intl pages must use .com host. */
function rewriteNextUrls(html, lang) {
  if (lang === 'pt-BR') return html;
  if (lang === 'en') {
    return html
      .replace(/https:\/\/www\.sensortattoofix\.com\.br\/en(\/[^"'\s]*)?/g, (_, rest) => {
        return `https://www.sensortattoofix.com${rest || '/'}`;
      })
      .replace(
        /value="https:\/\/www\.sensortattoofix\.com\.br\/"/g,
        'value="https://www.sensortattoofix.com/"'
      );
  }
  return html.replace(
    new RegExp(`https://www\\.sensortattoofix\\.com\\.br/${lang}(/[^"'\\s]*)?`, 'g'),
    (_, rest) => `https://www.sensortattoofix.com/${lang}${rest || ''}`
  );
}

function injectHreflang(html, page) {
  const block = hreflangLinkTags(page);
  const canonical = html.match(/<link\s+rel="canonical"[^>]*>/i);
  if (canonical) {
    return html.replace(canonical[0], `${canonical[0]}\n${block}`);
  }
  const title = html.match(/<title>[^<]*<\/title>/i);
  if (title) {
    return html.replace(title[0], `${title[0]}\n${block}`);
  }
  return html.replace(/<head([^>]*)>/i, `<head$1>\n${block}`);
}

let updated = 0;
let skipped = 0;

for (const rel of localeHtmlFiles()) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    console.warn('skip missing', rel);
    skipped++;
    continue;
  }
  const meta = parseLocaleFile(rel);
  if (!meta) {
    skipped++;
    continue;
  }
  const before = fs.readFileSync(file, 'utf8');
  const can = canonicalUrl(meta.lang, meta.page);
  let html = stripHreflang(before);
  html = setCanonical(html, can);
  html = setOgUrl(html, can);
  html = rewriteNextUrls(html, meta.lang);
  html = injectHreflang(html, meta.page);
  if (html !== before) {
    fs.writeFileSync(file, html);
    updated++;
    console.log('updated', rel, '→', can);
  }
}

console.log(`\nHreflang/canonical sync: ${updated} arquivo(s) atualizado(s), ${skipped} ignorado(s).`);
