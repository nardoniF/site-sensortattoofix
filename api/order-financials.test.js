import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrderFinancials, sumItemsProductCost } from './order-financials.js';

test('sumItemsProductCost multiplies qty × unit cost', () => {
  assert.equal(sumItemsProductCost([
    { quantity: 2, costUnit: 3.5 },
    { qty: 1, buyPrice: 10 }
  ]), 17);
});

test('calculateOrderFinancials profit = net − product − other', () => {
  const r = calculateOrderFinancials({
    gross: 100,
    fees: 15,
    shippingCost: 10,
    net: 75,
    otherCosts: 5,
    items: [{ quantity: 1, costUnit: 20 }]
  });
  assert.equal(r.productCost, 20);
  assert.equal(r.profit, 50);
  assert.ok(r.audit.some((a) => a.field === 'profit'));
});
