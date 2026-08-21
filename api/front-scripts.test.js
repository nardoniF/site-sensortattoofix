import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const jsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'js');

function loadScript(name, extras = {}) {
  const code = fs.readFileSync(path.join(jsDir, name), 'utf8');
  const location = extras.location || { hostname: 'www.sensortattoofix.com.br', pathname: '/' };
  const window = { location, ...extras.window };
  const sandbox = {
    window,
    globalThis: window,
    location,
    console,
    URLSearchParams,
    URL,
    encodeURIComponent,
    decodeURIComponent
  };
  vm.runInNewContext(code, sandbox, { filename: name });
  return sandbox.window;
}

test('PIX payload is EMV with BR and CRC', () => {
  const { PixGenerator } = loadScript('pix.js');
  const payload = PixGenerator.generatePixPayload({
    key: '29321223000132',
    keyType: 'cnpj',
    merchantName: 'Sensor Tattoo Fix',
    merchantCity: 'Sao Paulo',
    amount: 79.9,
    txid: 'STFTEST1'
  });
  assert.match(payload, /^00020126/);
  assert.match(payload, /5802BR/);
  assert.match(payload, /6304[0-9A-F]{4}$/);
  assert.ok(payload.includes('29321223000132'));
});

test('traffic origin: Google Ads vs orgânico vs direto vs fbclid orgânico', () => {
  const g = loadScript('traffic-origin.js');
  assert.equal(g.stfClassificarOrigem('?gclid=abc', '').origem_trafego, 'google_ads');
  assert.equal(g.stfClassificarOrigem('', 'https://www.google.com/search').origem_trafego, 'google_organico');
  assert.equal(g.stfClassificarOrigem('', '').origem_trafego, 'direto');
  assert.equal(g.stfClassificarOrigem('?fbclid=xyz', '').origem_trafego, 'meta_organico');
  assert.equal(
    g.stfClassificarOrigem('?utm_source=instagram_ads', '').origem_trafego,
    'meta_ads'
  );
  assert.equal(g.stfClassificarOrigem('?utm_source=whatsapp', '').origem_trafego, 'whatsapp');
});

test('película compat: case mm, Apple squircle, other model skipped', () => {
  const { STF_PELICULA } = loadScript('pelicula-compat.js');
  assert.equal(STF_PELICULA.parseCaseMm('Apple Watch Series 10 (46 mm)'), 46);
  assert.equal(STF_PELICULA.resolveModelMeta('Apple Watch Ultra 2 (49 mm)').shape, 'squircle');
  assert.equal(STF_PELICULA.resolveModelMeta('Garmin Fenix 8 (47 mm)').shape, 'round');
  assert.equal(STF_PELICULA.isCompatible(null, 'Apple Watch Series 10 (46 mm)'), false);
  assert.equal(STF_PELICULA.findCompatible('Outro modelo', []).length, 0);
});
