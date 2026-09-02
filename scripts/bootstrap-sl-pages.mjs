#!/usr/bin/env node
/**
 * Gera /sl/ a partir de /de/ (shell) + index traduzido.
 * Depois: node scripts/localize-sl-shell.mjs && node scripts/localize-sl-comprar.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SL = { code: 'sl', htmlLang: 'sl', ogLocale: 'sl_SI' };
const PAGES = ['comprar.html', 'loja.html', 'minha-conta.html', 'onde-comprar.html', 'comunidade.html'];

function patchFromDe(html, page) {
  let out = html;
  out = out.replace(/lang="de"/g, `lang="${SL.htmlLang}"`);
  out = out.replace(/stf-i18n-de-overrides/g, 'stf-i18n-sl-overrides');
  out = out.replace(/stf_lang','de'/g, `stf_lang','${SL.code}'`);
  out = out.replace(/data-lang="de"/g, `data-lang="${SL.code}"`);
  out = out.replace(/\/de\//g, '/sl/');
  out = out.replace(/hreflang="de"/g, `hreflang="${SL.htmlLang}"`);
  out = out.replace(/og:locale" content="de_DE"/g, `og:locale" content="${SL.ogLocale}"`);
  if (page === 'minha-conta.html') {
    out = out.replace(/<body class="checkout-page conta-page">/g, '<body class="conta-page">');
  }
  return out;
}

const dir = path.join(ROOT, SL.code);
fs.mkdirSync(dir, { recursive: true });

for (const page of PAGES) {
  const src = path.join(ROOT, 'de', page);
  const dest = path.join(dir, page);
  fs.writeFileSync(dest, patchFromDe(fs.readFileSync(src, 'utf8'), page));
  console.log('wrote', dest);
}

const deIndex = fs.readFileSync(path.join(ROOT, 'de', 'index.html'), 'utf8');
const slIndex = patchFromDe(deIndex, 'index.html')
  .replace(/stf-i18n-de-overrides/g, 'stf-i18n-sl-overrides')
  .replace(/WhatsApp flutuante DE/g, 'WhatsApp flutuante SL')
  .replace(/Harmonie zwischen Tinte und Silizium/g, 'Mir med tinto in silicijem')
  .replace(/Offizieller Shop/g, 'Uradna trgovina')
  .replace(/Zurück/g, 'Nazaj')
  .replace(/Startseite/g, 'Domov')
  .replace(/Wo kaufen/g, 'Kje kupiti')
  .replace(/Über das Produkt/g, 'O izdelku')
  .replace(/Mein Konto/g, 'Moj račun')
  .replace(/Community/g, 'Skupnost')
  .replace(/Smartwatch fragt nach Passcode/g, 'Pametna ura zahteva geslo')
  .replace(/tätowierter Haut/g, 'tetovirani koži')
  .replace(/tätowierter/g, 'tetovirane')
  .replace(/Tätowierung/g, 'tetovaža')
  .replace(/Herzfrequenz/g, 'srčni utrip')
  .replace(/Pulsmessung/g, 'merjenje pulza')
  .replace(/Passcode/g, 'geslo')
  .replace(/\bUhr\b/g, 'ura')
  .replace(/Smartwatch/g, 'Pametna ura')
  .replace(/Linse/g, 'leča')
  .replace(/Kaufen/g, 'Kupi')
  .replace(/Warenkorb/g, 'Košarica')
  .replace(/Bewertungen/g, 'ocene')
  .replace(/verifizierte Käufer/g, 'preverjeni kupci')
  .replace(/de_DE/g, 'sl_SI');

fs.writeFileSync(path.join(dir, 'index.html'), slIndex);
console.log('wrote', path.join(dir, 'index.html'));
