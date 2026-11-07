import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateOrderAddress } from './order-address.js';

test('address update stores every supplied field and rebuilds the display address', () => {
  const updated = updateOrderAddress({}, {
    cep: '01310-100',
    rua: 'Avenida Paulista',
    numero: '100',
    complemento: 'Apto 10',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    uf: 'SP'
  });
  assert.equal(updated.cep, '01310-100');
  assert.equal(updated.numero, '100');
  assert.equal(updated.endereco, 'Avenida Paulista, 100 — Apto 10 — Bela Vista — São Paulo — SP — 01310-100');
  assert.ok(updated.addressUpdatedAt);
});

test('address update rejects a SuperFrete number above ten characters', () => {
  assert.throws(
    () => updateOrderAddress({}, { numero: '12345678901' }, { superfrete: true }),
    /numero: máximo de 10 caracteres/
  );
});

test('non-SuperFrete addresses allow the normal number field length', () => {
  const updated = updateOrderAddress({}, { numero: '12345678901' });
  assert.equal(updated.numero, '12345678901');
});

test('address update keeps unspecified fields from the existing order', () => {
  const updated = updateOrderAddress({
    rua: 'Rua Antiga',
    numero: '12',
    cidade: 'São Paulo',
    uf: 'SP'
  }, { rua: 'Rua Nova' });
  assert.equal(updated.rua, 'Rua Nova');
  assert.equal(updated.endereco, 'Rua Nova, 12 — São Paulo — SP');
});
