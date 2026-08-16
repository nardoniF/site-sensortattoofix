import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shopeeReceiptFromEscrow } from './shopee-settlement.js';

test('Pedro: 55,50 − taxas 15,10 − frete 0 = renda 40,40; not etiqueta 8,39', () => {
  const p = shopeeReceiptFromEscrow(55.5, 40.4, 0);
  assert.equal(p.ok, true);
  assert.equal(p.shippingCost, 0);
  assert.equal(p.fees, 15.1);
  assert.equal(p.net, 40.4);
});

test('label 8,66 is not seller freight when escrow exists', () => {
  const p = shopeeReceiptFromEscrow(69.9, 58.66, 0);
  assert.equal(p.shippingCost, 0);
  assert.equal(p.fees, 11.24);
  assert.equal(p.net, 58.66);
});

test('without escrow do not invent shipping from the label', () => {
  const p = shopeeReceiptFromEscrow(55.5, null, 0);
  assert.equal(p.ok, false);
  assert.equal(p.shippingCost, 0);
  assert.equal(p.fees, 0);
});
