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
  orderNeedsFreteProductRepair
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

test('manual product acerto stores productAdjust on top of remainder', () => {
  const order = {
    valorProduto: 128,
    frete: 300,
    total: 428
  };
  applyOrderFreteAccounting(order, 28, { valorProduto: 472, now: '2026-08-30T06:00:00.000Z' });
  assert.equal(order.frete, 28);
  assert.equal(order.valorProduto, 472);
  assert.equal(order.total, 428);
  assert.equal(order.productAdjust, 72);
});
