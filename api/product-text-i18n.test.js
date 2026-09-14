/**
 * Textos GLOBAL do produto: PT → nameEn/… sem tocar images/markets/price.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCT_TEXT_LANG_SUFFIX,
  refreshProductTextI18n,
  refreshProductsTextI18n
} from './site-l10n.js';

test('PRODUCT_TEXT_LANG_SUFFIX cobre idiomas do site (exceto pt)', () => {
  assert.equal(PRODUCT_TEXT_LANG_SUFFIX.en, 'En');
  assert.equal(PRODUCT_TEXT_LANG_SUFFIX.it, 'It');
  assert.equal(PRODUCT_TEXT_LANG_SUFFIX.de, 'De');
  assert.equal(PRODUCT_TEXT_LANG_SUFFIX.es, 'Es');
  assert.equal(PRODUCT_TEXT_LANG_SUFFIX.pl, 'Pl');
  assert.equal(PRODUCT_TEXT_LANG_SUFFIX.sl, 'Sl');
  assert.equal(PRODUCT_TEXT_LANG_SUFFIX.pt, undefined);
});

test('refreshProductTextI18n com lock de idioma não sobrescreve nameEn', async () => {
  const env = { AI: null };
  const product = {
    id: 'optical-lens-intl',
    name: 'Lente óptica Sensor Tattoo Fix',
    description: 'Só a lente',
    nameEn: 'Custom EN locked',
    textI18nLocks: { en: true },
    textI18nHash: 'old',
    images: ['/images/lens-gallery/01.png'],
    image: '/images/lens-gallery/01.png',
    markets: ['INT'],
    price: 62.9
  };
  const next = await refreshProductTextI18n(env, product);
  assert.equal(next.nameEn, 'Custom EN locked');
  assert.deepEqual(next.images, product.images);
  assert.equal(next.image, product.image);
  assert.deepEqual(next.markets, ['INT']);
  assert.equal(next.price, 62.9);
});

test('refreshProductsTextI18n preserva images/markets/price mesmo sem AI', async () => {
  const env = {};
  const products = [
    {
      id: 'kit-sensor-tattoofix',
      name: 'Kit Sensor Tattoo Fix',
      description: 'Kit completo',
      nameEn: 'Full Kit EN',
      nameIt: 'Kit IT',
      nameDe: 'Kit DE',
      nameEs: 'Kit ES',
      namePl: 'Kit PL',
      nameSl: 'Kit SL',
      descriptionEn: 'd',
      descriptionIt: 'd',
      descriptionDe: 'd',
      descriptionEs: 'd',
      descriptionPl: 'd',
      descriptionSl: 'd',
      images: ['/images/kit-gallery/kit-01.jpg'],
      markets: ['BR'],
      price: 62.9
    }
  ];
  // Sem hash → calcula hash; com traduções completas e AI ausente, não deve apagar nada market-specific
  const out = await refreshProductsTextI18n(env, products);
  assert.equal(out[0].images[0], '/images/kit-gallery/kit-01.jpg');
  assert.deepEqual(out[0].markets, ['BR']);
  assert.equal(out[0].price, 62.9);
  assert.equal(out[0].name, 'Kit Sensor Tattoo Fix');
  assert.ok(out[0].textI18nHash);
});
