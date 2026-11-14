import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isCancelledMarketplaceStatus,
  saleLooksCancelled,
  healCancelledMarketplaceSale,
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

test('saleLooksCancelled via cancelledAt / refunds / payments', () => {
  assert.equal(saleLooksCancelled({ status: 'paid', cancelledAt: '2026-11-13T17:09:42+00:00' }), true);
  assert.equal(saleLooksCancelled({ status: 'paid', gross: 95, refunds: 95 }), true);
  assert.equal(saleLooksCancelled({
    status: 'paid',
    payments: [{ status: 'refunded', totalPaid: 101.99 }]
  }), true);
  assert.equal(saleLooksCancelled({ status: 'paid', gross: 95, refunds: 0 }), false);
});

test('healCancelledMarketplaceSale zeros net', () => {
  const healed = healCancelledMarketplaceSale({
    status: 'cancelled',
    gross: 95,
    fees: 17.1,
    shippingCost: 10.7,
    refunds: 95,
    net: 67.2,
    payoutNet: 67.2
  });
  assert.equal(healed.net, 0);
  assert.equal(healed.payoutNet, 0);
  assert.equal(healed.status, 'cancelled');
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
