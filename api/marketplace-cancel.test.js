import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isDroppedMarketplaceSaleStatus,
  amzEffectiveStatus,
  shopeeEffectiveStatus,
  shopeeOrderSnWorthSyncing,
  shopeeOrderDetailWorthSaving
} from './marketplace-cancel.js';

test('UI drop regex: cancel / refund / invalid', () => {
  assert.equal(isDroppedMarketplaceSaleStatus('Canceled'), true);
  assert.equal(isDroppedMarketplaceSaleStatus('CANCELLED'), true);
  assert.equal(isDroppedMarketplaceSaleStatus('IN_CANCEL'), true);
  assert.equal(isDroppedMarketplaceSaleStatus('refunded'), true);
  assert.equal(isDroppedMarketplaceSaleStatus('Shipped'), false);
  assert.equal(isDroppedMarketplaceSaleStatus('COMPLETED'), false);
});

test('Amazon: Canceled status is kept and dropped', () => {
  const st = amzEffectiveStatus('Canceled', { hasRefund: false, refunds: 0, gross: 92.2 });
  assert.equal(st, 'Canceled');
  assert.equal(isDroppedMarketplaceSaleStatus(st), true);
});

test('Amazon: Shipped + full Finances refund → refunded (drops from list)', () => {
  const st = amzEffectiveStatus('Shipped', { hasRefund: true, refunds: 92.2, gross: 92.2 });
  assert.equal(st, 'refunded');
  assert.equal(isDroppedMarketplaceSaleStatus(st), true);
});

test('Amazon: Shipped + small partial refund stays Shipped', () => {
  const st = amzEffectiveStatus('Shipped', { hasRefund: true, refunds: 10, gross: 100 });
  assert.equal(st, 'Shipped');
  assert.equal(isDroppedMarketplaceSaleStatus(st), false);
});

test('Shopee: CANCELLED / IN_CANCEL drop; UNPAID skipped from sync', () => {
  assert.equal(shopeeOrderSnWorthSyncing('UNPAID'), false);
  assert.equal(shopeeOrderSnWorthSyncing('CANCELLED'), true);
  assert.equal(shopeeOrderDetailWorthSaving('IN_CANCEL'), true);
  assert.equal(isDroppedMarketplaceSaleStatus(shopeeEffectiveStatus('CANCELLED')), true);
  assert.equal(isDroppedMarketplaceSaleStatus(shopeeEffectiveStatus('IN_CANCEL')), true);
});

test('Shopee: COMPLETED with material return refund → refunded', () => {
  const st = shopeeEffectiveStatus('COMPLETED', { refunds: 80, gross: 90 });
  assert.equal(st, 'refunded');
  assert.equal(isDroppedMarketplaceSaleStatus(st), true);
});

test('Shopee: COMPLETED without material refund stays active', () => {
  const st = shopeeEffectiveStatus('COMPLETED', { refunds: 5, gross: 90 });
  assert.equal(st, 'COMPLETED');
  assert.equal(isDroppedMarketplaceSaleStatus(st), false);
});
