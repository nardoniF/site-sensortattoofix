import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMMISSIONER_COMMISSION_PERCENT,
  COMMISSIONER_DISCOUNT_PERCENT,
  RESERVED_COUPON_CODES,
  calcMotoboyPrice,
  commissionerAttachmentLabel,
  computeCouponCommission,
  computeCouponDiscount,
  correiosOfficialTrackingUrl,
  correiosTrackingUrl,
  findActiveCoupon,
  haversineKm,
  isCorreiosImportOnlyServiceCode,
  isIntlDocumentShipment,
  isMotoboyOrder,
  isParticularDeliveryOrder,
  isSuperfreteMethod,
  isUberOrder,
  normalizeCouponCode,
  slugCouponId
} from './store-rules.js';

test('normalizeCouponCode strips junk and uppercases', () => {
  assert.equal(normalizeCouponCode(' meu-kit 10 '), 'MEUKIT10');
  assert.equal(normalizeCouponCode(''), '');
});

test('findActiveCoupon ignores BRASIL20 and inactive codes', () => {
  const config = {
    coupons: [
      { code: 'MEUKIT10', active: true, percent: 10 },
      { code: 'VELHO', active: false, percent: 20 }
    ]
  };
  assert.equal(findActiveCoupon(config, 'meukit10').percent, 10);
  assert.equal(findActiveCoupon(config, 'BRASIL20'), null);
  assert.equal(findActiveCoupon(config, 'VELHO'), null);
  assert.equal(findActiveCoupon(config, ''), null);
});

test('coupon discount and commission cap at 100% and at product value', () => {
  assert.deepEqual(computeCouponDiscount(100, 10), { percent: 10, discount: 10 });
  assert.equal(computeCouponDiscount(100, 200).percent, 100);
  assert.equal(computeCouponDiscount(50, 100).discount, 50);
  assert.equal(computeCouponCommission(80, 20).amount, 16);
  assert.equal(COMMISSIONER_DISCOUNT_PERCENT, 10);
  assert.equal(COMMISSIONER_COMMISSION_PERCENT, 20);
});

test('reserved coupon codes and slug', () => {
  assert.equal(RESERVED_COUPON_CODES.has('ADMIN'), true);
  assert.equal(slugCouponId('Meu Kit!'), 'coupon-meukit');
  assert.equal(slugCouponId(''), 'coupon-artist');
});

test('commissionerAttachmentLabel pluralizes', () => {
  assert.equal(commissionerAttachmentLabel(0), '');
  assert.match(commissionerAttachmentLabel(1), /Arte em anexo/);
  assert.match(commissionerAttachmentLabel(2), /^2 artes/);
});

test('shipping classifiers', () => {
  assert.equal(isUberOrder({ shippingProvider: 'uber' }), true);
  assert.equal(isMotoboyOrder({ shippingMethodId: 'br-motoboy' }), true);
  assert.equal(isSuperfreteMethod({ id: 'br-sf-jadlog' }), true);
  assert.equal(isParticularDeliveryOrder({ shippingProvider: 'uber' }), true);
  assert.equal(isParticularDeliveryOrder({ shippingMethodId: 'br-mini-envios' }), false);
  assert.equal(isCorreiosImportOnlyServiceCode('33162'), true);
  assert.equal(isCorreiosImportOnlyServiceCode('04227'), false);
  assert.equal(isIntlDocumentShipment({ shipmentType: 'documento' }), true);
  assert.equal(isIntlDocumentShipment({ shippingMethodId: 'int-documento' }), true);
});

test('Correios tracking URLs', () => {
  assert.equal(correiosTrackingUrl(''), '');
  assert.equal(
    correiosTrackingUrl('AA123BR', 'https://www.sensortattoofix.com.br/'),
    'https://www.sensortattoofix.com.br/rastreio.html?codigo=AA123BR'
  );
  assert.match(correiosOfficialTrackingUrl('AA123BR'), /objeto=AA123BR/);
});

test('haversineKm SP to nearby is a few km', () => {
  const km = haversineKm(-23.55, -46.63, -23.56, -46.64);
  assert.ok(km > 0 && km < 5);
});

test('calcMotoboyPrice uses ceil km and minPrice', () => {
  const cfg = { basePrice: 10, pricePerKm: 2, minPrice: 20 };
  const r = calcMotoboyPrice(cfg, 3.2);
  assert.equal(r.billableKm, 4);
  assert.equal(r.price, 20);
  const far = calcMotoboyPrice(cfg, 20);
  assert.equal(far.price, 50);
});
