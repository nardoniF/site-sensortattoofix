import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  enviosSellerCost,
  flexSellerCost,
  receiptPayout,
  liquidMatchesReceipt
} from './ml-settlement.js';

test('Douglas: Envios 12,35 already net, buyer 2,99 → do not subtract again', () => {
  const { shipping } = enviosSellerCost(12.35, 2.99);
  assert.equal(shipping, 12.35);
  assert.equal(receiptPayout(53.59, 9.65, shipping), 31.59);
  assert.equal(liquidMatchesReceipt(53.59, 9.65, shipping, 31.59), true);
  assert.notEqual(shipping, 9.36);
});

test('Bruno: Envios 12,35 already net, buyer 11,99 → not 0,36', () => {
  const { shipping } = enviosSellerCost(12.35, 11.99);
  assert.equal(shipping, 12.35);
  assert.equal(receiptPayout(53.59, 9.65, shipping), 31.59);
  assert.equal(liquidMatchesReceipt(53.59, 9.65, shipping, 31.59), true);
  assert.notEqual(shipping, 0.36);
});

test('Murilo: full tariff 15,34 minus buyer 2,99 = 12,35; liquid 57,16', () => {
  const fromNet = enviosSellerCost(12.35, 2.99);
  const fromFull = enviosSellerCost(15.34, 2.99);
  assert.equal(fromNet.shipping, 12.35);
  assert.equal(fromFull.shipping, 12.35);
  assert.equal(receiptPayout(79.90, 10.39, 12.35), 57.16);
  assert.equal(liquidMatchesReceipt(79.90, 10.39, 12.35, 57.16), true);
});

test('Bruno full tariff 24,34 minus buyer 11,99 = 12,35', () => {
  assert.equal(enviosSellerCost(24.34, 11.99).shipping, 12.35);
});

test('Eduarda-style: 26,34 minus buyer 13,99 = 12,35', () => {
  assert.equal(enviosSellerCost(26.34, 13.99).shipping, 12.35);
});

test('Flex Isabella: 11,90 − estorno 1,10 = 10,80; na conta 57,18', () => {
  const shipping = flexSellerCost(11.9, 1.1);
  assert.equal(shipping, 10.8);
  assert.equal(receiptPayout(82.90, 14.92, shipping), 57.18);
  assert.equal(liquidMatchesReceipt(82.90, 14.92, shipping, 57.18), true);
});

test('stored leftover 0,36 + buyer 11,99 restores Envios 12,35', () => {
  assert.equal(enviosSellerCost(0.36, 11.99).shipping, 12.35);
  assert.equal(enviosSellerCost(9.36, 2.99).shipping, 12.35);
});

test('wrong leftover freights must fail the liquid test', () => {
  assert.equal(liquidMatchesReceipt(53.59, 9.65, 9.36, 31.59), false);
  assert.equal(liquidMatchesReceipt(53.59, 9.65, 0.36, 31.59), false);
});
