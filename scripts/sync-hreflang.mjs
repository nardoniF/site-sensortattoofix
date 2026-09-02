#!/usr/bin/env node
/**
 * Sincroniza blocos hreflang em todas as páginas localizadas.
 * Remove links quebrados (ex.: /de/.br/, /sl/it/) e inclui sl + todos os idiomas.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import {
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
  let html = stripHreflang(before);
  html = injectHreflang(html, meta.page);
  if (html !== before) {
    fs.writeFileSync(file, html);
    updated++;
    console.log('updated', rel);
  }
}

console.log(`\nHreflang sync: ${updated} arquivo(s) atualizado(s), ${skipped} ignorado(s).`);
