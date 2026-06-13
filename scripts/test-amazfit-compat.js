#!/usr/bin/env node
/**
 * Simula findCompatible() para Amazfit GTR/GTS e valida guarda de formato (shape).
 * Uso: node scripts/test-amazfit-compat.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(ROOT, 'js/pelicula-compat.js'), 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const STF = sandbox.window.STF_PELICULA;

const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/store-config.json'), 'utf8'));
const products = cfg.products;
const meta = cfg.smartwatchModelMeta;

function summarize(model) {
  return STF.findCompatible(model, products, meta).map((p) => ({
    id: p.id,
    shape: STF.productShape(p),
    type: STF.productType(p)
  }));
}

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}

const gtr = summarize('Amazfit GTR');
const gts = summarize('Amazfit GTS');
const apple44 = summarize('Apple Watch SE (44mm)');

console.log('Amazfit GTR upsell:', gtr);
console.log('Amazfit GTS upsell:', gts);
console.log('Apple Watch SE (44mm) upsell (ids):', apple44.map((p) => p.id));

assert(gtr.length === 1 && gtr[0].id === 'pelicula-amazfit-gtr-3', 'GTR deve mostrar só pelicula-amazfit-gtr-3');
assert(gtr[0].shape === 'round', 'GTR película deve ser round');

assert(gts.length === 2, 'GTS deve mostrar 2 películas retangulares');
assert(gts.every((p) => p.shape === 'rect'), 'GTS películas devem ser rect');
assert(
  gts.some((p) => p.id === 'pelicula-amazfit-gts-2-mini') && gts.some((p) => p.id === 'pelicula-amazfit-gts-squircle-44mm'),
  'GTS deve incluir mini e 44mm'
);

assert(!gtr.some((p) => p.id.includes('gts')), 'GTR não deve incluir películas GTS');
assert(!gts.some((p) => p.id.includes('gtr')), 'GTS não deve incluir películas GTR');
assert(!gtr.some((p) => p.type === 'pulseira'), 'GTR não deve incluir pulseiras Apple');
assert(!gts.some((p) => p.type === 'pulseira'), 'GTS não deve incluir pulseiras Apple');

assert(
  !apple44.some((p) => p.id.includes('amazfit')),
  'Apple 44mm não deve incluir películas Amazfit'
);
assert(
  apple44.every((p) => p.shape === 'squircle' || p.type === 'pulseira' || p.id === 'pelicula-round-33mm'),
  'Apple 44mm só squircle (ou pulseira)'
);

assert(meta['Amazfit GTR']?.shape === 'round', 'meta GTR = round');
assert(meta['Amazfit GTS']?.shape === 'rect', 'meta GTS = rect');
assert(!meta['Amazfit GTR / GTS'], 'meta legado Amazfit GTR / GTS removido');

console.log('\nOK — compatibilidade Amazfit GTR/GTS validada.');
