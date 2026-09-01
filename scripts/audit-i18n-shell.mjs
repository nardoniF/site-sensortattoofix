#!/usr/bin/env node
/**
 * Auditoria de i18n: lista gaps conhecidos (HTML estático EN até JS rodar, manuais só PT).
 * Saída: relatório no stdout; exit 1 se faltar bundle obrigatório.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['de', 'es', 'pl'];
const PAGES = ['index.html', 'loja.html', 'comprar.html', 'minha-conta.html', 'comunidade.html', 'onde-comprar.html'];
const EN_SNIPPETS = ['Official Store', 'Peace between ink and silicon', 'Your cart', 'Loading products', 'Community (beta)'];

let errors = 0;
const warnings = [];

function check(file, fn) {
  try {
    fn();
  } catch (e) {
    errors++;
    console.error('ERRO', file, e.message);
  }
}

console.log('# Auditoria i18n —', new Date().toISOString());
console.log('');

for (const lang of LANGS) {
  for (const page of PAGES) {
    const rel = `${lang}/${page}`;
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) {
      warnings.push(`${rel}: arquivo ausente`);
      continue;
    }
    const html = fs.readFileSync(file, 'utf8');
    check(rel, () => {
      if (!html.includes('stf-page-lang.js')) throw new Error('sem stf-page-lang.js');
      if (!html.includes(`stf-i18n-${lang}-overrides.js`)) throw new Error(`sem stf-i18n-${lang}-overrides.js`);
      if (!html.includes('stf-i18n.js')) throw new Error('sem stf-i18n.js');
    });
    const enFound = EN_SNIPPETS.filter((s) => html.includes(s));
    if (enFound.length && page !== 'index.html') {
      warnings.push(`${rel}: HTML estático EN (${enFound.slice(0, 3).join(', ')}) — JS deve substituir em runtime`);
    }
  }
}

// Manuais de instalação
const manuals = [
  'docs/manuais/manual-instalacao-sensor-tattoo-fix.html',
  'docs/manuais/manual-instalacao-sensor-tattoo-fix-lote.html'
];
for (const m of manuals) {
  const html = fs.readFileSync(path.join(ROOT, m), 'utf8');
  if (!html.includes('Manual de instalação')) {
    warnings.push(`${m}: esperado PT (envio BR)`);
  }
}
if (!fs.existsSync(path.join(ROOT, 'docs/cartas/carta-agradecimento-intl.html'))) {
  warnings.push('carta internacional EN ausente');
}

console.log('## Avisos (esperados ou a melhorar)');
warnings.forEach((w) => console.log('-', w));
console.log('');
console.log(`Erros bloqueantes: ${errors}`);
process.exit(errors ? 1 : 0);
