import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  saleShippingCost,
  marketplaceSaleNet,
  saleMoneyParts,
  isMlFlexSale,
  flexCompanyOwed,
  aggregateFlexOwedByMonth,
  formatFlexDaysWithQty,
  kitComponentUnitCost,
  kitUnitCostFromComponents,
  applyOrderFreteAccounting,
  inferCustomerPaidTotal,
  orderNeedsFreteProductRepair,
  storeOrderListedGross,
  storeOrderMoneyBreakdown,
  storeOrderSaleMoney,
  saleKitQty
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
  assert.deepEqual(rows[0].dayEntries, [{ day: 15, count: 1, bonus: 1.1, owed: 11.9 }]);
});

test('aggregateFlexOwedByMonth conta Flex por dia e formata (n) só se n > 1', () => {
  const rows = aggregateFlexOwedByMonth([
    { channel: 'ml', mlFlex: true, mlFlexListCost: 11.9, mlEstorno: 1.79, _ts: Date.parse('2026-09-02T12:00:00-03:00') },
    { channel: 'ml', mlFlex: true, mlFlexListCost: 11.9, mlEstorno: 1.79, _ts: Date.parse('2026-09-02T18:00:00-03:00') },
    { channel: 'ml', mlFlex: true, mlFlexListCost: 11.9, mlEstorno: 0, _ts: Date.parse('2026-09-10T10:00:00-03:00') }
  ], config);
  assert.equal(rows[0].count, 3);
  assert.deepEqual(rows[0].days, [2, 10]);
  assert.deepEqual(rows[0].dayEntries, [
    { day: 2, count: 2, bonus: 3.58, owed: 23.8 },
    { day: 10, count: 1, bonus: 0, owed: 11.9 }
  ]);
  assert.equal(formatFlexDaysWithQty(rows[0].dayEntries), '2 (2) e 10');
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
  // Bruto = o que o cliente pagou; tarifa/frete saem depois (sem descontar fee 2×).
  assert.equal(storeOrderListedGross(order), 489.62);
  const money = storeOrderSaleMoney(order);
  assert.equal(money.gross, 489.62);
  assert.equal(money.fees, 49.86);
  assert.equal(money.shippingCost, 28);
  assert.equal(money.liquido, 411.76);
});

test('breakdown intl: entrou = charge÷fx, líquido = entrou − frete (− taxa)', () => {
  const order = {
    chargeCurrency: 'EUR',
    chargeAmount: 28.11,
    chargeFxRate: 0.1783,
    frete: 27.55,
    valorProduto: 72.9,
    total: 100.45 // livro sem markup — NÃO deve virar bruto
  };
  const b = storeOrderMoneyBreakdown(order);
  assert.equal(b.fromCharge, true);
  assert.equal(b.currency, 'EUR');
  assert.equal(b.entered.foreign, 28.11);
  assert.equal(b.entered.brl, 157.66);
  assert.equal(b.frete.brl, 27.55);
  assert.equal(b.liquido.brl, 130.11);
  assert.equal(storeOrderSaleMoney(order).gross, 157.66);
  assert.equal(storeOrderSaleMoney(order).liquido, 130.11);
});

test('breakdown BR: total = vp+frete; líquido = produto', () => {
  const order = { total: 100.45, valorProduto: 72.9, frete: 27.55 };
  const b = storeOrderMoneyBreakdown(order);
  assert.equal(b.fromCharge, false);
  assert.equal(b.entered.brl, 100.45);
  assert.equal(b.frete.brl, 27.55);
  assert.equal(b.liquido.brl, 72.9);
});

test('saleKitQty soma itens — 1 pedido com qty 4 = 4 vendas', () => {
  assert.equal(saleKitQty({ items: [{ quantity: 4, title: 'Lente' }] }), 4);
  assert.equal(saleKitQty({
    items: [
      { quantity: 2, title: 'A' },
      { qty: 3, title: 'B' }
    ]
  }), 5);
  assert.equal(saleKitQty({ quantity: 2 }), 2);
  assert.equal(saleKitQty({ items: [{ quantity: 1 }] }), 1);
  // Pedido sem qty explícita continua 1 (não zera marcadores).
  assert.equal(saleKitQty({}), 1);
});

test('agregar qtd de vendas usa itens, não número de pedidos', () => {
  const sales = [
    { items: [{ quantity: 4 }] }, // ML 4 un.
    { items: [{ quantity: 1 }] }, // loja 1 un.
    { items: [{ quantity: 2 }, { qty: 1 }] } // 3 un.
  ];
  const total = sales.reduce((n, s) => n + saleKitQty(s), 0);
  assert.equal(sales.length, 3); // 3 pedidos
  assert.equal(total, 8); // 8 itens = 8 vendas
});
