import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatShopeeBalanceResult,
  sumShopeeToReceiveFromIndex,
  SHOPEE_AWAITING_RELEASE_STATUSES
} from './shopee-balance.js';

test('soma só pedidos confirmados em trânsito', async () => {
  const sales = {
    A: { status: 'SHIPPED', net: 50 },
    B: { status: 'COMPLETED', net: 200 },
    C: { status: 'READY_TO_SHIP', net: 30.5 },
    D: { status: 'CANCELLED', net: 99 }
  };
  const result = await sumShopeeToReceiveFromIndex(
    ['A', 'B', 'C', 'D'],
    async (sn) => sales[sn]
  );
  assert.equal(result.toReceive, 80.5);
  assert.equal(result.count, 2);
  assert.equal(SHOPEE_AWAITING_RELEASE_STATUSES.has('SHIPPED'), true);
  assert.equal(SHOPEE_AWAITING_RELEASE_STATUSES.has('COMPLETED'), false);
});

test('formata card com disponível e a receber', () => {
  const card = formatShopeeBalanceResult({
    ok: true,
    available: 120.5,
    toReceive: 80.5,
    toReceiveCount: 2,
    lastSyncedAt: '2026-08-31T12:00:00.000Z',
    asOf: '2026-08-31T12:00:00.000Z'
  });
  assert.equal(card.ok, true);
  assert.deepEqual(card.amounts, [
    { kind: 'available', currency: 'BRL', value: 120.5 },
    { kind: 'pending', currency: 'BRL', value: 80.5 }
  ]);
  assert.equal(card.lines.some((l) => l.includes('A receber')), true);
  assert.equal(card.lines.some((l) => l.includes('Não inclui vendas totais')), true);
});
