import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  saleShippingCost,
  marketplaceSaleNet,
  saleMoneyParts,
  isMlFlexSale,
  flexCompanyOwed,
  aggregateFlexOwedByMonth,
  kitComponentUnitCost,
  kitUnitCostFromComponents,
  applyOrderFreteAccounting,
  inferCustomerPaidTotal,
  orderNeedsFreteProductRepair,
  storeOrderListedGross,
  storeOrderChargeParts,
  storeOrderSaleMoney,
  formatFlexDaysWithQty,
  monthFlexEmptyDays
} from './sales-money.js';

const config = { mlFlexShippingCost: 11.9 };

test('ML Envios unresolved yields zero freight in totals', () => {
  const sale = { channel: 'mercadolivre', gross: 79.9, fees: 10.39, shippingSource: 'unresolved' };
  assert.equal(saleShippingCost(sale, config), 0);
  assert.equal(marketplaceSaleNet(sale, config), 69.51);
});

test('Flex: list − estorno and company owed uses list price', () => {
  const sale = {
    channel: 'ml',
    mlFlex: true,
    mlFlexListCost: 11.9,
    mlEstorno: 1.1,
    shippingCost: 10.8,
    gross: 82.9,
    fees: 14.92
  };
  assert.equal(saleShippingCost(sale, config), 10.8);
  assert.equal(flexCompanyOwed(sale, config), 11.9);
  assert.equal(isMlFlexSale(sale), true);
});

test('Amazon-style sale: Bruto − Comissão − Frete − Outras = marketplace', () => {
  const sale = {
    channel: 'amazon',
    gross: 100,
    fees: 15,
    shippingCost: 10,
    otherFees: 2,
    refunds: 0
  };
  assert.equal(marketplaceSaleNet(sale, config), 73);
  const p = saleMoneyParts(sale, config);
  assert.equal(p.gross, 100);
  assert.equal(p.shipping, 10);
});

test('kit BOM unit cost sums components', () => {
  const unit = kitComponentUnitCost({ buyQty: 10, buyPrice: 49, yieldQty: 30, useQty: 1 });
  assert.equal(Math.round(unit * 100) / 100, 0.16);
  assert.ok(kitUnitCostFromComponents([{ buyQty: 10, buyPrice: 49, yieldQty: 30, useQty: 1 }]) > 0);
});

test('aggregateFlexOwedByMonth groups by BR month', () => {
  const ts = Date.parse('2026-08-15T15:00:00-03:00');
  const rows = aggregateFlexOwedByMonth([
    { channel: 'ml', mlFlex: true, mlFlexListCost: 11.9, mlEstorno: 1.1, _ts: ts }
  ], config);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].owed, 11.9);
  assert.equal(rows[0].bonus, 1.1);
  assert.equal(rows[0].net, 10.8);
  assert.deepEqual(rows[0].days, [15]);
  assert.deepEqual(rows[0].dayEntries, [{ day: 15, count: 1 }]);
});

test('aggregateFlexOwedByMonth conta Flex por dia e formata (n) só se n > 1', () => {
  const rows = aggregateFlexOwedByMonth([
    { channel: 'ml', mlFlex: true, mlFlexListCost: 11.9, mlEstorno: 0, _ts: Date.parse('2026-09-02T12:00:00-03:00') },
    { channel: 'ml', mlFlex: true, mlFlexListCost: 11.9, mlEstorno: 0, _ts: Date.parse('2026-09-02T18:00:00-03:00') },
    { channel: 'ml', mlFlex: true, mlFlexListCost: 11.9, mlEstorno: 0, _ts: Date.parse('2026-09-10T10:00:00-03:00') }
  ], config);
  assert.equal(rows[0].count, 3);
  assert.deepEqual(rows[0].days, [2, 10]);
  assert.deepEqual(rows[0].dayEntries, [{ day: 2, count: 2 }, { day: 10, count: 1 }]);
  assert.equal(formatFlexDaysWithQty(rows[0].dayEntries), '2 (2) e 10');
  const empty = monthFlexEmptyDays(rows[0].days, 2026, '09', 10);
  assert.deepEqual(empty, [1, 3, 4, 5, 6, 7, 8, 9]);
});

test('frete manual cut reallocates leftover onto product and keeps paid total', () => {
  const order = {
    valorProduto: 128,
    frete: 328.1,
    paypalFee: 0,
    total: 456.1
  };
  applyOrderFreteAccounting(order, 28, { now: '2026-08-30T06:00:00.000Z' });
  assert.equal(order.freteOriginal, 328.1);
  assert.equal(order.frete, 28);
  assert.equal(order.totalPaid, 456.1);
  assert.equal(order.total, 456.1);
  assert.equal(order.valorProduto, 428.1);
  assert.equal(order.valorProdutoAtCheckout, 128);
});

test('recovers shrunk total after previous buggy frete edit', () => {
  const order = {
    valorProduto: 128,
    frete: 28,
    freteOriginal: 328.1,
    paypalFee: 0,
    total: 156
  };
  assert.equal(inferCustomerPaidTotal(order), 456.1);
  assert.equal(orderNeedsFreteProductRepair(order), true);
  applyOrderFreteAccounting(order, 28, { now: '2026-08-30T06:00:00.000Z' });
  assert.equal(order.valorProduto, 428.1);
  assert.equal(order.total, 456.1);
  assert.equal(orderNeedsFreteProductRepair(order), false);
});

test('manual product acerto stores productAdjust and net total after PayPal fee', () => {
  const order = {
    valorProduto: 100,
    frete: 28,
    freteOriginal: 389.62,
    total: 128,
    totalPaid: 489.62
  };
  applyOrderFreteAccounting(order, 28, { valorProduto: 411.76, now: '2026-08-30T07:00:00.000Z' });
  assert.equal(order.frete, 28);
  assert.equal(order.valorProduto, 411.76);
  assert.equal(order.total, 439.76);
  assert.equal(order.totalPaid, 489.62);
  assert.equal(order.paypalFee, 49.86);
  assert.equal(storeOrderListedGross(order), 439.76);
});

test('intl charge: vendas usam US$ cobrado / FX — não order.total BRL', () => {
  // Lista BRL ~98,99 (errada na visão antiga); cobrado US$ 30,20 (US$ 25,12 + frete).
  const fx = 0.19508; // BRL→USD do checkout
  const order = {
    total: 98.94,
    valorProduto: 72.9,
    frete: 26.04,
    currency: 'BRL',
    chargeCurrency: 'USD',
    chargeAmount: 30.2,
    chargeFxRate: fx,
    paypalFee: 0
  };
  const parts = storeOrderChargeParts(order);
  assert.ok(parts);
  assert.equal(parts.productForeign, 25.12);
  assert.equal(parts.shipForeign, 5.08);
  assert.equal(parts.totalBrl, Math.round((30.2 / fx) * 100) / 100);
  assert.ok(parts.totalBrl > 140); // ~R$ 155 — não ~R$ 99
  assert.notEqual(storeOrderListedGross(order), 98.94);

  const money = storeOrderSaleMoney(order);
  assert.equal(money.fromCharge, true);
  assert.equal(money.gross, parts.totalBrl);
  assert.equal(money.shippingCost, parts.shippingBrl);
  assert.equal(money.chargeAmount, 30.2);
});

test('loja BR sem chargeCurrency continua no total BRL', () => {
  const order = { total: 89.9, frete: 20, valorProduto: 69.9, paypalFee: 0 };
  const money = storeOrderSaleMoney(order);
  assert.equal(money.fromCharge, false);
  assert.equal(money.gross, 89.9);
  assert.equal(money.shippingCost, 20);
});
