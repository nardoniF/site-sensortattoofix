import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMarketplaceSale } from './order-normalizer.js';

test('ML Flex list − estorno becomes seller shipping cost', () => {
  const n = normalizeMarketplaceSale({
    channel: 'mercadolivre',
    gross: 82.9,
    fees: 14.92,
    mlFlexListCost: 11.9,
    mlEstorno: 1.1
  });
  assert.equal(n.totals.shippingSellerCost, 10.8);
  assert.equal(n.audit.origins.shippingSellerCost, 'mlFlexListCost - mlEstorno');
});

test('net derived from gross − fees − ship − refunds when missing', () => {
  const n = normalizeMarketplaceSale({
    gross: 79.9,
    fees: 10.39,
    shippingCost: 12.35,
    refunds: 0
  });
  assert.equal(n.totals.net, 57.16);
});

test('kitCost from config BOM populates otherCosts', () => {
  const n = normalizeMarketplaceSale(
    { gross: 100, fees: 10, shippingCost: 5, net: 85, productCost: 20 },
    {
      kitCost: {
        yield: 1,
        components: [{ buyPrice: 10, useQty: 2 }]
      }
    }
  );
  assert.equal(n.otherCosts, 20);
  assert.equal(n.profit, 45);
});
