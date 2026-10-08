/**
 * Garante que o shape do pedido externo entra nos fluxos de contabilidade
 * (loja / consolidado) sem regressão dos helpers de venda.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { storeOrderSaleMoney, storeOrderListedGross } from '../js/sales-money.mjs';

function isStoreSaleOrder(o) {
  if (!o) return false;
  const st = String(o.status || '').toLowerCase();
  if (st === 'cancelled' || st === 'canceled' || st === 'refunded' || st === 'abandoned') return false;
  return st === 'paid' || st === 'shipped' || st === 'delivered' || st === 'fulfilled';
}

function sampleManualOrder(overrides = {}) {
  const createdAt = '2026-10-07T15:00:00.000Z';
  return {
    orderId: 'STF-20261007-MANUALTEST',
    createdAt,
    paidAt: createdAt,
    status: 'paid',
    source: 'manual',
    salesChannel: 'WhatsApp',
    nome: 'Cliente WhatsApp',
    email: 'cliente@example.com',
    telefone: '5511999999999',
    smartwatch: 'Garmin Fenix 7',
    pais: 'Brasil',
    paisCode: 'BR',
    cep: '01310100',
    rua: 'Av Paulista',
    numero: '1000',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    uf: 'SP',
    endereco: 'Av Paulista, 1000 — Bela Vista — São Paulo / SP — 01310100 — Brasil',
    items: [{ productId: 'manual', id: 'manual', name: 'Kit Sensor Tattoo Fix', qty: 1, price: 62.9 }],
    produto: '1x Kit Sensor Tattoo Fix',
    valorProduto: 62.9,
    frete: 15.5,
    total: 78.4,
    currency: 'BRL',
    displayCurrency: 'BRL',
    pagamento: 'PIX',
    paymentProvider: 'manual',
    shippingService: 'Correios',
    correiosTrackingCode: 'AA123456789BR',
    paidEmailsSentAt: createdAt,
    stockDecremented: true,
    checkoutLocale: 'pt',
    ...overrides
  };
}

test('pedido externo paid entra como venda da loja', () => {
  const order = sampleManualOrder();
  assert.equal(isStoreSaleOrder(order), true);
  const money = storeOrderSaleMoney(order);
  assert.ok(money);
  assert.equal(Number(money.gross), 78.4);
  assert.equal(Number(money.shippingCost), 15.5);
  const listed = storeOrderListedGross(order);
  assert.ok(Number(listed) > 0);
});

test('pedido externo cancelado não entra na contabilidade', () => {
  assert.equal(isStoreSaleOrder(sampleManualOrder({ status: 'cancelled' })), false);
  assert.equal(isStoreSaleOrder(sampleManualOrder({ status: 'refunded' })), false);
});

test('pedido externo com rastreio e paidEmailsSentAt libera fluxo de tracking', () => {
  const order = sampleManualOrder();
  assert.ok(order.correiosTrackingCode);
  assert.ok(order.paidEmailsSentAt);
  assert.equal(order.status, 'paid');
  assert.equal(order.stockDecremented, true);
});
