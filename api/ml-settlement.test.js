import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  enviosSellerCost,
  flexSellerCost,
  mlFlexBonusFromCosts,
  impliedEnviosFromReceipt,
  receiptPayout,
  liquidMatchesReceipt
} from './ml-settlement.js';

test('senders.cost 12,35 is used as-is (buyer 2,99 is not Envios)', () => {
  const { shipping } = enviosSellerCost(12.35, 2.99);
  assert.equal(shipping, 12.35);
  assert.equal(receiptPayout(53.59, 9.65, shipping), 31.59);
  assert.notEqual(shipping, 9.36);
});

test('senders.cost 12,35 is used as-is (buyer 11,99 is not Envios)', () => {
  const { shipping } = enviosSellerCost(12.35, 11.99);
  assert.equal(shipping, 12.35);
  assert.notEqual(shipping, 0.36);
});

test('LIFE receipt: senders.cost 7,75 not 12,35', () => {
  assert.equal(enviosSellerCost(7.75, 36.99).shipping, 7.75);
  assert.equal(receiptPayout(73.90, 9.61, 7.75), 56.54);
  assert.equal(liquidMatchesReceipt(73.90, 9.61, 7.75, 56.54), true);
});

test('two-item Envios: senders.cost 24,70 stays 24,70', () => {
  assert.equal(enviosSellerCost(24.70, 11.99).shipping, 24.7);
  assert.equal(receiptPayout(165.80, 29.84, 24.70), 111.26);
  assert.equal(receiptPayout(141.80, 25.52, 24.70), 91.58);
});

test('Murilo: senders.cost 12,35; liquid 57,16', () => {
  assert.equal(enviosSellerCost(12.35, 2.99).shipping, 12.35);
  assert.equal(receiptPayout(79.90, 10.39, 12.35), 57.16);
});

test('missing senders.cost is 0, not a fixed 12,35', () => {
  assert.equal(enviosSellerCost(0, 2.99).shipping, 0);
  assert.equal(enviosSellerCost(0, 0).shipping, 0);
});

test('fallback Envios = gross − fee − liquid', () => {
  assert.equal(impliedEnviosFromReceipt(73.90, 9.61, 56.54), 7.75);
  assert.equal(impliedEnviosFromReceipt(165.80, 29.84, 111.26), 24.7);
});

test('Flex Isabella: 11,90 − estorno 1,10 = 10,80; na conta 57,18', () => {
  const shipping = flexSellerCost(11.9, 1.1);
  assert.equal(shipping, 10.8);
  assert.equal(receiptPayout(82.90, 14.92, shipping), 57.18);
  assert.equal(liquidMatchesReceipt(82.90, 14.92, shipping, 57.18), true);
});

test('Flex Rafael: bonus 1,10 comes from shipment costs discounts', () => {
  const bonus = mlFlexBonusFromCosts({
    senders: [{
      cost: 9.9,
      save: 1.1,
      discounts: [{ rate: 0.1, type: 'mandatory', promoted_amount: 1.1 }]
    }]
  });
  assert.equal(bonus, 1.1);
  assert.equal(flexSellerCost(11.9, bonus), 10.8);
});

test('wrong leftover freights must fail the liquid test', () => {
  assert.equal(liquidMatchesReceipt(53.59, 9.65, 9.36, 31.59), false);
  assert.equal(liquidMatchesReceipt(53.59, 9.65, 0.36, 31.59), false);
});
