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
  currencyForCountryFromRegistry,
  normalizeIntlCurrencies,
  resolveIntlUnitPrice,
  foreignListLooksRawWithoutMarkup,
  productIntlBaseBrl
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

test('heal: stale USD ≈ raw BRL×FX while markup base exists → use base×FX', () => {
  // Live bug: smartband priceUsd 12.25 = 62.9×FX, but intlBaseBrl 110.08 (75% markup)
  const product = {
    price: 62.9,
    intlMarkupPercent: 75,
    intlBaseBrl: 110.08,
    priceUsd: 12.25,
    priceGbp: 16.06
  };
  const usdRate = 0.19471;
  assert.equal(productIntlBaseBrl(product), 110.08);
  assert.equal(foreignListLooksRawWithoutMarkup(product, 'USD', usdRate, DEFAULT_INTL_CURRENCIES), true);
  const healed = resolveIntlUnitPrice(product, 'USD', usdRate, DEFAULT_INTL_CURRENCIES);
  assert.equal(healed, applyFxAmount(110.08, usdRate, 2));
  assert.equal(healed, 21.43);
  assert.notEqual(healed, 12.25);
});

test('heal: GBP already marked up stays (or matches formula)', () => {
  const product = {
    price: 62.9,
    intlMarkupPercent: 75,
    intlBaseBrl: 110.08,
    priceUsd: 12.25,
    priceGbp: 16.06
  };
  const gbpRate = 0.14591;
  assert.equal(foreignListLooksRawWithoutMarkup(product, 'GBP', gbpRate, DEFAULT_INTL_CURRENCIES), false);
  const unit = resolveIntlUnitPrice(product, 'GBP', gbpRate, DEFAULT_INTL_CURRENCIES);
  assert.equal(unit, applyFxAmount(110.08, gbpRate, 2));
});

test('currencyForCountryFromRegistry: GB → GBP even when locale would be USD', () => {
  assert.equal(currencyForCountryFromRegistry('GB', DEFAULT_INTL_CURRENCIES), 'GBP');
  assert.equal(currencyForLocaleFromRegistry('en', DEFAULT_INTL_CURRENCIES), 'USD');
});
