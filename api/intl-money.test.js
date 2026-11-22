import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_INTL_CURRENCIES,
  DEFAULT_INTL_MARKUP_PERCENT,
  intlPriceField,
  intlBaseBrl,
  applyFxAmount,
  applyMarkupFxToProduct,
  applyMarkupFxToIntlProducts,
  syncOpticalIntlBrlFromBrKit,
  currencyForLocaleFromRegistry,
  normalizeIntlCurrencies,
  resolveIntlForeignUnitPrice,
  resolveIntlMarkedBrl,
  resolveProductForIntlPricing,
  intlPricingTwinId
} from './intl-money.js';

const FX = {
  USD: 0.19508,
  EUR: 0.16785,
  SEK: 1.8736,
  NOK: 1.8084,
  PLN: 0.7235,
  GBP: 0.14418
};

test('intlPriceField maps ISO code to product field', () => {
  assert.equal(intlPriceField('USD'), 'priceUsd');
  assert.equal(intlPriceField('PLN'), 'pricePln');
  assert.equal(intlPriceField('GBP'), 'priceGbp');
});

test('markup 65% then FX: R$72.90 → base R$120.29 → ~USD 23.47', () => {
  assert.equal(DEFAULT_INTL_MARKUP_PERCENT, 65);
  assert.equal(intlBaseBrl(72.9, 65), 120.29);
  assert.equal(applyFxAmount(120.29, FX.USD, 2), 23.47);
  assert.equal(applyFxAmount(120.29, FX.EUR, 2), 20.19);
  assert.equal(applyFxAmount(120.29, FX.SEK, 0), 225);
});

test('applyMarkupFxToProduct writes all currency fields from one BRL base', () => {
  const { product, changed } = applyMarkupFxToProduct(
    { price: 72.9, intlMarkupPercent: 65 },
    DEFAULT_INTL_CURRENCIES,
    FX
  );
  assert.equal(changed, true);
  assert.equal(product.intlBaseBrl, 120.29);
  assert.equal(product.priceUsd, 23.47);
  assert.equal(product.priceEur, 20.19);
  assert.equal(product.pricePln, 87.03);
  assert.equal(product.priceGbp, 17.34);
  assert.equal(product.priceSek, 225);
  assert.equal(product.priceNok, 218);
});

test('smartband stays distinct with same markup', () => {
  const watch = applyMarkupFxToProduct({ price: 72.9, intlMarkupPercent: 65 }, DEFAULT_INTL_CURRENCIES, FX).product;
  const band = applyMarkupFxToProduct({ price: 62.9, intlMarkupPercent: 65 }, DEFAULT_INTL_CURRENCIES, FX).product;
  assert.equal(watch.priceUsd, 23.47);
  assert.equal(band.priceUsd, 20.25);
  assert.notEqual(watch.priceUsd, band.priceUsd);
});

test('syncOpticalIntlBrlFromBrKit copies BR smartwatch kit price', () => {
  const { products, synced } = syncOpticalIntlBrlFromBrKit([
    { id: 'kit-sensor-tattoofix', markets: ['BR'], price: 72.9 },
    { id: 'optical-lens-intl', markets: ['INT'], price: 100 },
    { id: 'optical-lens-smartband-intl', markets: ['INT'], price: 62.9 }
  ]);
  assert.equal(synced, true);
  assert.equal(products.find((p) => p.id === 'optical-lens-intl').price, 72.9);
});

test('applyMarkupFxToIntlProducts only touches INT market rows', () => {
  const { products, updated } = applyMarkupFxToIntlProducts(
    [
      { id: 'br', markets: ['BR'], price: 72.9 },
      { id: 'intl', markets: ['INT'], price: 72.9, priceUsd: 1 }
    ],
    DEFAULT_INTL_CURRENCIES,
    FX
  );
  assert.equal(updated, 1);
  assert.equal(products[0].priceUsd, undefined);
  assert.equal(products[1].priceUsd, 23.47);
  assert.equal(products[1].intlMarkupPercent, 65);
});

test('currencyForLocaleFromRegistry follows langs', () => {
  assert.equal(currencyForLocaleFromRegistry('pl', DEFAULT_INTL_CURRENCIES), 'PLN');
  assert.equal(currencyForLocaleFromRegistry('en', DEFAULT_INTL_CURRENCIES), 'USD');
  assert.equal(currencyForLocaleFromRegistry('sv', DEFAULT_INTL_CURRENCIES), 'SEK');
});

test('normalizeIntlCurrencies drops legacy pppRate requirement', () => {
  const list = normalizeIntlCurrencies([{ code: 'USD', countries: ['US'], langs: ['en'] }]);
  const usd = list.find((c) => c.code === 'USD');
  assert.ok(usd);
  assert.equal(usd.pppRate, undefined);
  assert.ok(list.find((c) => c.code === 'EUR'));
});

test('resolveIntlForeignUnitPrice never uses bare BRL×FX without markup', () => {
  const withList = resolveIntlForeignUnitPrice(
    { price: 72.9, priceEur: 28.68, intlMarkupPercent: 150 },
    72.9,
    'EUR',
    0.15324,
    DEFAULT_INTL_CURRENCIES
  );
  assert.equal(withList, 28.68);

  const noList = resolveIntlForeignUnitPrice(
    { price: 72.9, intlMarkupPercent: 150 },
    72.9,
    'EUR',
    0.15324,
    DEFAULT_INTL_CURRENCIES
  );
  const rawFx = applyFxAmount(72.9, 0.15324, 2);
  const marked = applyFxAmount(intlBaseBrl(72.9, 150), 0.15324, 2);
  assert.equal(noList, marked);
  assert.ok(noList > rawFx * 1.5);
  assert.notEqual(noList, rawFx);
});

test('resolveIntlMarkedBrl applies admin markup on BRL', () => {
  assert.equal(resolveIntlMarkedBrl({ intlMarkupPercent: 150 }, 72.9), 182.25);
  assert.equal(resolveIntlMarkedBrl({}, 72.9), intlBaseBrl(72.9, DEFAULT_INTL_MARKUP_PERCENT));
});

test('BR kit maps to INT twin for Admin markup (not default 65%)', () => {
  assert.equal(intlPricingTwinId('kit-smartband-tattoofix'), 'optical-lens-smartband-intl');
  assert.equal(intlPricingTwinId('kit-sensor-tattoofix'), 'optical-lens-intl');
  const catalog = [
    { id: 'kit-smartband-tattoofix', markets: ['BR'], price: 62.9 },
    {
      id: 'optical-lens-smartband-intl',
      markets: ['INT'],
      price: 62.9,
      intlMarkupPercent: 150,
      priceUsd: 26.48,
      priceEur: 24.1
    }
  ];
  const brKit = catalog[0];
  const twin = resolveProductForIntlPricing(brKit, catalog);
  assert.equal(twin.id, 'optical-lens-smartband-intl');
  assert.equal(
    resolveIntlForeignUnitPrice(brKit, 62.9, 'USD', 0.16841, DEFAULT_INTL_CURRENCIES, catalog),
    26.48
  );
  assert.equal(resolveIntlMarkedBrl(brKit, 62.9, catalog), intlBaseBrl(62.9, 150));
  // Without catalog twin, BR kit alone must not pretend to be list-priced.
  const bare = resolveIntlForeignUnitPrice(brKit, 62.9, 'USD', 0.16841, DEFAULT_INTL_CURRENCIES);
  assert.equal(bare, applyFxAmount(intlBaseBrl(62.9, DEFAULT_INTL_MARKUP_PERCENT), 0.16841, 2));
  assert.notEqual(bare, 26.48);
});
