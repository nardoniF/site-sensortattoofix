import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_INTL_CURRENCIES,
  intlPriceField,
  applyPppAmount,
  applyPppToProduct,
  applyPppToIntlProducts,
  syncOpticalIntlBrlFromBrKit,
  currencyForLocaleFromRegistry,
  normalizeIntlCurrencies
} from './intl-money.js';

test('intlPriceField maps ISO code to product field', () => {
  assert.equal(intlPriceField('USD'), 'priceUsd');
  assert.equal(intlPriceField('eur'), 'priceEur');
  assert.equal(intlPriceField('SEK'), 'priceSek');
  assert.equal(intlPriceField('NOK'), 'priceNok');
  assert.equal(intlPriceField('PLN'), 'pricePln');
  assert.equal(intlPriceField('GBP'), 'priceGbp');
});

test('blended PPP: above FX but far below full World Bank (~2×)', () => {
  const by = Object.fromEntries(DEFAULT_INTL_CURRENCIES.map((c) => [c.code, c]));
  // FX USD ~0.195; full PPP ~0.391; blend ~0.264
  assert.ok(by.USD.pppRate > 0.22);
  assert.ok(by.USD.pppRate < 0.32);
  const watch = applyPppAmount(72.9, by.USD.pppRate, by.USD.decimals);
  assert.equal(watch, 19.23);
  assert.ok(watch > 72.9 * 0.195); // above FX
  assert.ok(watch < 72.9 * 0.39); // below full PPP
});

test('smartwatch R$72.90 and smartband R$62.90 stay distinct', () => {
  const watch = applyPppToProduct({ price: 72.9 }, DEFAULT_INTL_CURRENCIES).product;
  const band = applyPppToProduct({ price: 62.9 }, DEFAULT_INTL_CURRENCIES).product;
  assert.equal(watch.priceUsd, 19.23);
  assert.equal(band.priceUsd, 16.59);
  assert.notEqual(watch.priceUsd, band.priceUsd);
  assert.equal(watch.priceEur, 14.56);
  assert.equal(watch.priceSek, 174);
  assert.equal(watch.priceNok, 180);
  assert.equal(watch.pricePln, 53.96);
});

test('syncOpticalIntlBrlFromBrKit copies BR smartwatch kit price', () => {
  const { products, synced } = syncOpticalIntlBrlFromBrKit([
    { id: 'kit-sensor-tattoofix', markets: ['BR'], price: 72.9 },
    { id: 'optical-lens-intl', markets: ['INT'], price: 100 },
    { id: 'optical-lens-smartband-intl', markets: ['INT'], price: 62.9 }
  ]);
  assert.equal(synced, true);
  assert.equal(products.find((p) => p.id === 'optical-lens-intl').price, 72.9);
  assert.equal(products.find((p) => p.id === 'optical-lens-smartband-intl').price, 62.9);
});

test('applyPppToIntlProducts only touches INT market rows', () => {
  const { products, updated } = applyPppToIntlProducts(
    [
      { id: 'br', markets: ['BR'], price: 72.9 },
      { id: 'intl', markets: ['INT'], price: 72.9, priceUsd: 1 }
    ],
    DEFAULT_INTL_CURRENCIES
  );
  assert.equal(updated, 1);
  assert.equal(products[0].priceUsd, undefined);
  assert.equal(products[1].priceUsd, 19.23);
});

test('currencyForLocaleFromRegistry follows langs', () => {
  assert.equal(currencyForLocaleFromRegistry('fr', DEFAULT_INTL_CURRENCIES), 'EUR');
  assert.equal(currencyForLocaleFromRegistry('sv', DEFAULT_INTL_CURRENCIES), 'SEK');
  assert.equal(currencyForLocaleFromRegistry('no', DEFAULT_INTL_CURRENCIES), 'NOK');
  assert.equal(currencyForLocaleFromRegistry('pl', DEFAULT_INTL_CURRENCIES), 'PLN');
  assert.equal(currencyForLocaleFromRegistry('en', DEFAULT_INTL_CURRENCIES), 'USD');
  assert.equal(currencyForLocaleFromRegistry('pt', DEFAULT_INTL_CURRENCIES), 'BRL');
});

test('normalizeIntlCurrencies merges custom rate over defaults', () => {
  const list = normalizeIntlCurrencies([{ code: 'USD', pppRate: 0.2, countries: ['US'] }]);
  const usd = list.find((c) => c.code === 'USD');
  assert.equal(usd.pppRate, 0.2);
  assert.deepEqual(usd.countries, ['US']);
  assert.ok(list.find((c) => c.code === 'EUR'));
  assert.ok(list.find((c) => c.code === 'PLN'));
});
