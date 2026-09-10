/**
 * Regression: BR kit vs INT lens-only, separate image galleries, markup×FX formula.
 * Do not treat .com as a copy of .com.br.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_INTL_CURRENCIES,
  intlBaseBrl,
  applyFxAmount,
  applyMarkupFxToProduct
} from './intl-money.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'data/store-config.json'), 'utf8'));

const FX = {
  USD: 0.19508,
  EUR: 0.16785,
  SEK: 1.8736,
  NOK: 1.8084,
  PLN: 0.7235,
  GBP: 0.14418
};

function byId(id) {
  return (cfg.products || []).find((p) => p.id === id);
}

test('BR kit product remains kit (markets BR, kit id)', () => {
  const kit = byId('kit-sensor-tattoofix');
  assert.ok(kit);
  assert.equal(kit.id, 'kit-sensor-tattoofix');
  assert.deepEqual(kit.markets, ['BR']);
  assert.match(String(kit.name), /kit/i);
  assert.match(String(kit.description), /kit/i);
  assert.equal(kit.intlMarkupPercent, undefined);
  assert.equal(kit.priceUsd, undefined);
});

test('INT optical-lens remains lens-only (not BR kit)', () => {
  const optical = byId('optical-lens-intl');
  assert.ok(optical);
  assert.equal(optical.id, 'optical-lens-intl');
  assert.deepEqual(optical.markets, ['INT']);
  assert.match(String(optical.name), /lens|lente/i);
  assert.doesNotMatch(String(optical.name), /\bkit\b/i);
  assert.ok(Number(optical.intlMarkupPercent) >= 0);
  assert.ok(Number(optical.priceUsd) > 0);
});

test('images fields for BR vs INT stay separate in config structure', () => {
  const kitBand = byId('kit-smartband-tattoofix');
  const bandIntl = byId('optical-lens-smartband-intl');
  const optical = byId('optical-lens-intl');
  assert.ok(Array.isArray(kitBand.images) && kitBand.images.length);
  assert.ok(Array.isArray(bandIntl.images) && bandIntl.images.length);
  assert.ok(Array.isArray(optical.images) && optical.images.length);
  assert.ok(kitBand.images.every((u) => String(u).includes('/smartband/kit-br/')));
  assert.ok(bandIntl.images.every((u) => String(u).includes('/smartband/lens-en/')));
  assert.ok(!kitBand.images.some((u) => String(u).includes('lens-en')));
  assert.ok(!bandIntl.images.some((u) => String(u).includes('kit-br')));
  assert.ok(!optical.images.some((u) => String(u).includes('/smartband/kit-br/')));
});

test('markup formula: intl = (BRL * (1+markup/100)) * FX', () => {
  const brl = 72.9;
  const markup = 65;
  const base = intlBaseBrl(brl, markup);
  assert.equal(base, 120.29);
  assert.equal(applyFxAmount(base, FX.USD, 2), 23.47);
  const { product } = applyMarkupFxToProduct(
    { price: brl, intlMarkupPercent: markup },
    DEFAULT_INTL_CURRENCIES,
    FX
  );
  assert.equal(product.intlBaseBrl, 120.29);
  assert.equal(product.priceUsd, 23.47);
  assert.equal(product.priceEur, 20.19);
  assert.equal(product.priceGbp, 17.34);
  assert.equal(product.pricePln, 87.03);
  assert.equal(product.priceSek, 225);
  assert.equal(product.priceNok, 218);
});

test('store-config INT products carry intlMarkupPercent + price fields', () => {
  const optical = byId('optical-lens-intl');
  const band = byId('optical-lens-smartband-intl');
  for (const p of [optical, band]) {
    assert.equal(p.intlMarkupPercent, 65);
    assert.ok(Number(p.intlBaseBrl) > 0);
    assert.ok(Number(p.priceUsd) > 0);
    assert.ok(Number(p.priceEur) > 0);
    assert.ok(Number(p.priceGbp) > 0);
    assert.ok(Number(p.pricePln) > 0);
    assert.ok(Number(p.priceSek) > 0);
    assert.ok(Number(p.priceNok) > 0);
  }
  assert.ok(Array.isArray(cfg.intlCurrencies) && cfg.intlCurrencies.length >= 6);
  assert.equal(cfg.intlCurrenciesAutoFx, true);
});
