import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  amzMoney,
  amzRound2,
  amazonImpliedShipping,
  amazonReceiptIdentity,
  summarizeAmzFinancialEvents
} from './amazon-settlement.js';

test('amzMoney reads CurrencyAmount', () => {
  assert.equal(amzMoney({ CurrencyAmount: 12.34 }), 12.34);
  assert.equal(amzMoney(null), 0);
});

test('amzRound2 rounds to cents', () => {
  assert.equal(amzRound2(1.235), 1.24);
  assert.equal(amzRound2(null), 0);
});

test('amazonImpliedShipping is bruto − comissão − líquido − outras − estornos', () => {
  assert.equal(amazonImpliedShipping(100, 15, 70, 5, 2), 8);
  assert.equal(amazonImpliedShipping(0, 1, 0), null);
  assert.equal(amazonImpliedShipping(50, 10, -1), null);
});

test('amazonReceiptIdentity allows 2 cent tolerance', () => {
  assert.equal(amazonReceiptIdentity(100, 15, 10, 75), true);
  assert.equal(amazonReceiptIdentity(100, 15, 10, 70, 5), true);
  assert.equal(amazonReceiptIdentity(100, 15, 10, 60), false);
});

test('summarizeAmzFinancialEvents splits commission vs shipping vs other', () => {
  const out = summarizeAmzFinancialEvents({
    ShipmentEventList: [{
      OrderChargeList: [{ ChargeType: 'Principal', ChargeAmount: { CurrencyAmount: 89.9 } }],
      ShipmentFeeList: [
        { FeeType: 'Commission', FeeAmount: { CurrencyAmount: -12.5 } },
        { FeeType: 'FBAPerUnitFulfillmentFee', FeeAmount: { CurrencyAmount: -8.2 } },
        { FeeType: 'UnknownFee', FeeAmount: { CurrencyAmount: -1.1 } }
      ]
    }]
  });
  assert.equal(out.principalSold, 89.9);
  assert.equal(out.commission, 12.5);
  assert.equal(out.shipping, 8.2);
  assert.equal(out.otherFees, 1.1);
  assert.equal(out.hasRefund, false);
  assert.equal(out.refunds, 0);
});

test('summarizeAmzFinancialEvents counts refund principal as refunds', () => {
  const out = summarizeAmzFinancialEvents({
    RefundEventList: [{
      OrderChargeList: [{ ChargeType: 'Principal', ChargeAmount: { CurrencyAmount: -89.9 } }],
      ShipmentFeeList: [{ FeeType: 'RefundCommission', FeeAmount: { CurrencyAmount: 2 } }]
    }]
  });
  assert.equal(out.hasRefund, true);
  assert.equal(out.refunds, 89.9);
  assert.equal(out.commission, 0);
  assert.ok(out.net < 0);
});
