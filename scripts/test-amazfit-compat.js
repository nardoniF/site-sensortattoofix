#!/usr/bin/env node
/**
 * Simula findCompatible() — shape, Samsung pulseiras, Amazfit GTR/GTS, Apple 44mm.
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
const gw4 = summarize('Samsung Galaxy Watch 4 (40mm)');
const gw8Classic = summarize('Samsung Galaxy Watch 8 Classic (46mm)');

console.log('Amazfit GTR upsell:', gtr);
console.log('Amazfit GTS upsell:', gts);
console.log('Apple Watch SE (44mm) upsell (ids):', apple44.map((p) => p.id));
console.log('Samsung GW4 40mm upsell:', gw4);
console.log('Samsung GW8 Classic 46mm upsell:', gw8Classic);

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
assert(!gts.some((p) => p.id.includes('apple') || p.shape === 'squircle'), 'GTS não deve incluir películas Apple squircle');
assert(!gtr.some((p) => p.id.includes('apple')), 'GTR não deve incluir películas Apple');

assert(gw4.length === 1 && gw4[0].id === 'pulseira-sport-samsung-gw4-7', 'GW4 40mm → pulseira-sport-samsung-gw4-7');
assert(!gw4.some((p) => p.id.includes('creme') || p.id.includes('apple')), 'GW4 não deve mostrar creme nem Apple');

assert(
  gw8Classic.length === 1 && gw8Classic[0].id === 'pulseira-sport-creme-41-45',
  'GW8 Classic 46mm → pulseira-sport-creme-41-45'
);
assert(!gw8Classic.some((p) => p.id.includes('samsung-gw4')), 'GW8 não deve mostrar pulseira GW4/5/6/7');

assert(
  cfg.smartwatchModels.includes('Samsung Galaxy Watch 8 Classic (46mm)'),
  'GW8 Classic (46mm) deve estar no dropdown'
);

const hiddenLuxury = ['pulseira-link-grafite-42-49', 'pulseira-trail-preta-ultra-49', 'pulseira-alpine-verde-49'];
hiddenLuxury.forEach((id) => {
  const p = products.find((x) => x.id === id);
  assert(p?.active === false, `${id} deve estar active: false`);
  assert(!apple44.some((x) => x.id === id), `${id} não deve aparecer no upsell Apple 44mm`);
});

console.log('\nOK — compatibilidade checkout validada (Amazfit, Samsung, Apple).');
