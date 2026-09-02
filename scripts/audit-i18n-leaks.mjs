#!/usr/bin/env node
/**
 * Auditoria língua a língua: detecta vazamento de idioma estrangeiro no HTML estático.
 * Shell: loja, comprar, minha-conta, comunidade, onde-comprar + index (exceto EN/PT proposital).
 * Exit 1 se houver vazamentos críticos.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['de', 'es', 'pl', 'sl'];
const SHELL_PAGES = ['loja.html', 'comprar.html', 'minha-conta.html', 'comunidade.html', 'onde-comprar.html'];
const ALL_PAGES = ['index.html', ...SHELL_PAGES];

/** Palavras/frases que NÃO devem aparecer no HTML estático daquele locale. */
const FORBIDDEN = {
  de: {
    en: ['Official Store', 'Peace between ink and silicon', 'Your cart', 'Your details', 'Discount code', 'Secure checkout', 'Payment method', 'Place order', 'Loading products', 'Back to sign in', 'Select country', 'Sign in', 'Create account'],
    pt: ['Minha conta', 'Comprar agora', 'Loja oficial', 'Esqueci a senha'],
    es: ['Tienda Oficial', 'Tu carrito', 'Tus datos'],
    pl: ['Oficjalny Sklep', 'Twoje dane'],
    sl: ['Uradna trgovina', 'Vaši podatki', 'Košarica'],
  },
  es: {
    en: ['Official Store', 'Peace between ink and silicon', 'Your cart', 'Your details', 'Discount code', 'Secure checkout', 'Payment method', 'Place order', 'Loading products', 'Back to sign in'],
    de: ['Offizieller Shop', 'Das Problem', 'Jetzt kaufen', 'Über uns', 'Warenkorb', 'Ihre Daten'],
    pt: ['Minha conta', 'Loja oficial'],
    pl: ['Oficjalny Sklep'],
    sl: ['Uradna trgovina', 'Vaši podatki'],
  },
  pl: {
    en: ['Official Store', 'Your cart', 'Your details', 'Discount code', 'Secure checkout', 'Payment method', 'Place order', 'Loading products', 'Back to sign in'],
    de: ['Offizieller Shop', 'Das Problem', 'Jetzt kaufen', 'Über uns', 'Warenkorb'],
    pt: ['Minha conta', 'Loja oficial'],
    es: ['Tienda Oficial', 'Tu carrito'],
    sl: ['Uradna trgovina'],
  },
  sl: {
    en: ['Official Store', 'Peace between ink and silicon', 'Your cart', 'Your details', 'Discount code', 'Secure checkout', 'Payment method', 'Place order', 'Loading products', 'Back to sign in', 'Buy Now'],
    de: ['Das Problem', 'Notlösungen', 'Jetzt kaufen', 'Über uns', 'Gründer', 'Häufig gestellte Fragen', 'Offizieller Shop', 'Warenkorb', 'Ihre Daten', 'Zurück', 'Anmelden', 'Passcode alle', 'Smartwatch fragt', 'Harmonie zwischen', 'Menü öffnen', 'Vollständiger Name', 'Nachricht senden', 'Was sagen die Leute', 'Ein globales Problem'],
    pt: ['Minha conta', 'Comprar', 'Loja oficial'],
    es: ['Tienda Oficial', 'Comprar ahora'],
    pl: ['Oficjalny Sklep'],
  },
};

const CHECKOUT_EN = ['Your details', 'Discount code', 'Secure checkout', 'Payment method', 'Place order', 'Select country'];
const CONTA_EN = [
  'Back to sign in',
  'Enter your account email',
  'Send reset link',
  'Choose a new password for your account',
  'Confirm password',
  'Save new password',
  'Full name',
];

let leaks = 0;
const report = [];

function scan(rel, lang, html) {
  const rules = FORBIDDEN[lang] || {};
  const found = [];
  for (const [src, words] of Object.entries(rules)) {
    for (const w of words) {
      if (html.includes(w)) found.push({ src, w });
    }
  }
  if (rel.endsWith('comprar.html')) {
    for (const w of CHECKOUT_EN) {
      if (html.includes(w)) found.push({ src: 'en-checkout', w });
    }
  }
  if (rel.endsWith('minha-conta.html')) {
    for (const w of CONTA_EN) {
      if (html.includes(w)) found.push({ src: 'en-conta', w });
    }
  }
  if (found.length) {
    leaks += found.length;
    report.push({ file: rel, hits: found });
  }
}

console.log('# Auditoria vazamentos i18n —', new Date().toISOString());
console.log('');

for (const lang of LANGS) {
  for (const page of ALL_PAGES) {
    const rel = `${lang}/${page}`;
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue;
    scan(rel, lang, fs.readFileSync(file, 'utf8'));
  }
}

if (!report.length) {
  console.log('Nenhum vazamento crítico detectado.');
} else {
  console.log(`## Vazamentos (${leaks} ocorrências)\n`);
  for (const { file, hits } of report) {
    const uniq = [...new Map(hits.map((h) => [`${h.src}:${h.w}`, h])).values()];
    console.log(`### ${file}`);
    for (const h of uniq) console.log(`- [${h.src}] ${h.w}`);
    console.log('');
  }
}

console.log(`Total: ${leaks} vazamento(s)`);
process.exit(leaks ? 1 : 0);
