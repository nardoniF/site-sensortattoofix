import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isCancelledMarketplaceStatus,
  mlOrderLooksCancelled,
  mlEffectiveSaleStatus,
  mlRefundAmountFromOrder,
  amzEffectiveStatus,
  shopeeEffectiveStatus
} from './marketplace-cancel-status.js';

test('isCancelledMarketplaceStatus', () => {
  assert.equal(isCancelledMarketplaceStatus('cancelled'), true);
  assert.equal(isCancelledMarketplaceStatus('paid'), false);
  assert.equal(isCancelledMarketplaceStatus('refunded'), true);
});

test('mlOrderLooksCancelled via payments', () => {
  const order = {
    status: 'paid',
    payments: [{ status: 'refunded', transaction_amount: 89.9 }]
  };
  assert.equal(mlOrderLooksCancelled(order), true);
  assert.equal(mlEffectiveSaleStatus(order, 'paid'), 'cancelled');
  assert.equal(mlRefundAmountFromOrder(order, 89.9), 89.9);
});

test('amzEffectiveStatus full refund', () => {
  assert.equal(amzEffectiveStatus('Shipped', { hasRefund: true, refunds: 50, gross: 80 }), 'refunded');
  assert.equal(amzEffectiveStatus('Shipped', { hasRefund: true, refunds: 5, gross: 80 }), 'Shipped');
  assert.equal(amzEffectiveStatus('Canceled', {}), 'Canceled');
});

test('shopeeEffectiveStatus', () => {
  assert.equal(shopeeEffectiveStatus('CANCELLED', {}), 'CANCELLED');
  assert.equal(shopeeEffectiveStatus('COMPLETED', { refunds: 60, gross: 70 }), 'refunded');
  assert.equal(shopeeEffectiveStatus('COMPLETED', { refunds: 5, gross: 70 }), 'COMPLETED');
});
