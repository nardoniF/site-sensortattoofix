import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_INTL_CURRENCIES,
  intlPriceField,
  applyPppAmount,
  applyPppToProduct,
  applyPppToIntlProducts,
  currencyForLocaleFromRegistry,
  normalizeIntlCurrencies
} from './intl-money.js';

test('intlPriceField maps ISO code to product field', () => {
  assert.equal(intlPriceField('USD'), 'priceUsd');
  assert.equal(intlPriceField('eur'), 'priceEur');
  assert.equal(intlPriceField('SEK'), 'priceSek');
  assert.equal(intlPriceField('NOK'), 'priceNok');
});

test('default PPP rates match intentional list prices at R$ 62.90', () => {
  const brl = 62.9;
  const by = Object.fromEntries(DEFAULT_INTL_CURRENCIES.map((c) => [c.code, c]));
  assert.equal(applyPppAmount(brl, by.USD.pppRate, by.USD.decimals), 12.99);
  assert.equal(applyPppAmount(brl, by.EUR.pppRate, by.EUR.decimals), 11.99);
  assert.equal(applyPppAmount(brl, by.SEK.pppRate, by.SEK.decimals), 129);
  assert.equal(applyPppAmount(brl, by.NOK.pppRate, by.NOK.decimals), 139);
});

test('applyPppToProduct writes all currency fields', () => {
  const { product, changed } = applyPppToProduct({ price: 62.9 }, DEFAULT_INTL_CURRENCIES);
  assert.equal(changed, true);
  assert.equal(product.priceUsd, 12.99);
  assert.equal(product.priceEur, 11.99);
  assert.equal(product.priceSek, 129);
  assert.equal(product.priceNok, 139);
});

test('applyPppToIntlProducts only touches INT market rows', () => {
  const { products, updated } = applyPppToIntlProducts(
    [
      { id: 'br', markets: ['BR'], price: 62.9 },
      { id: 'intl', markets: ['INT'], price: 62.9, priceUsd: 1 }
    ],
    DEFAULT_INTL_CURRENCIES
  );
  assert.equal(updated, 1);
  assert.equal(products[0].priceUsd, undefined);
  assert.equal(products[1].priceUsd, 12.99);
});

test('currencyForLocaleFromRegistry follows langs', () => {
  assert.equal(currencyForLocaleFromRegistry('fr', DEFAULT_INTL_CURRENCIES), 'EUR');
  assert.equal(currencyForLocaleFromRegistry('sv', DEFAULT_INTL_CURRENCIES), 'SEK');
  assert.equal(currencyForLocaleFromRegistry('no', DEFAULT_INTL_CURRENCIES), 'NOK');
  assert.equal(currencyForLocaleFromRegistry('en', DEFAULT_INTL_CURRENCIES), 'USD');
  assert.equal(currencyForLocaleFromRegistry('pt', DEFAULT_INTL_CURRENCIES), 'BRL');
});

test('normalizeIntlCurrencies merges custom rate over defaults', () => {
  const list = normalizeIntlCurrencies([{ code: 'USD', pppRate: 0.2, countries: ['US'] }]);
  const usd = list.find((c) => c.code === 'USD');
  assert.equal(usd.pppRate, 0.2);
  assert.deepEqual(usd.countries, ['US']);
  assert.ok(list.find((c) => c.code === 'EUR'));
});
