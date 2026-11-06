import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findExistingShippingLabel,
  hasExistingShippingLabel,
  shippingLabelDuplicateMessage
} from './shipping-label-guard.js';

test('existing label is detected regardless of shipment status', () => {
  const existing = {
    orderId: 'old-order',
    email: 'cliente@example.com',
    status: 'cancelled',
    superfreteCartId: 'sf-cart',
    superfreteCartStatus: 'cancelled'
  };
  assert.equal(hasExistingShippingLabel(existing), true);
  assert.equal(
    findExistingShippingLabel([existing], { orderId: 'new-order', email: 'CLIENTE@example.com' }),
    existing
  );
  assert.match(shippingLabelDuplicateMessage(existing), /Nenhuma nova etiqueta foi criada/);
});

test('label guard matches by document, phone, or full recipient address', () => {
  const target = {
    orderId: 'new-order',
    cpf: '123.456.789-09',
    telefone: '(11) 99999-1234',
    nome: 'André Silva',
    cep: '01001-000',
    rua: 'Rua A',
    numero: '10',
    cidade: 'São Paulo',
    uf: 'SP'
  };
  assert.equal(findExistingShippingLabel([{
    orderId: 'cpf-order',
    cpf: '12345678909',
    correiosPrePostagemId: 'pre-1'
  }], target)?.orderId, 'cpf-order');
  assert.equal(findExistingShippingLabel([{
    orderId: 'phone-order',
    telefone: '5511999991234',
    correiosTrackingCode: 'AB123456789BR'
  }], target)?.orderId, 'phone-order');
  assert.equal(findExistingShippingLabel([{
    orderId: 'address-order',
    nome: 'Andre Silva',
    cep: '01001000',
    rua: 'Rua A',
    numero: '10',
    cidade: 'Sao Paulo',
    uf: 'sp',
    correiosLabelCachedAt: '2026-01-01'
  }], target)?.orderId, 'address-order');
});

test('does not match the same order, recipients without shared identity, or orders without labels', () => {
  const target = { orderId: 'same', email: 'cliente@example.com' };
  assert.equal(findExistingShippingLabel([{
    orderId: 'same',
    email: 'cliente@example.com',
    correiosPrePostagemId: 'pre-1'
  }], target), null);
  assert.equal(findExistingShippingLabel([{
    orderId: 'different',
    email: 'other@example.com',
    status: 'paid'
  }], target), null);
  assert.equal(hasExistingShippingLabel({ status: 'paid' }), false);
});
