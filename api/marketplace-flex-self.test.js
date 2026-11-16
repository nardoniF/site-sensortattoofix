import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isFlexSelfDelivered,
  preserveFlexSelfFields,
  normalizeFlexSelfPatch,
  matchesFlexSelfDay
} from './marketplace-flex-self.js';
import { brDateParts } from '../js/sales-money.mjs';

test('isFlexSelfDelivered lê flag', () => {
  assert.equal(isFlexSelfDelivered({ flexSelfDelivered: true }), true);
  assert.equal(isFlexSelfDelivered({ _flexSelfDelivered: true }), true);
  assert.equal(isFlexSelfDelivered({ flexSelfDelivered: false }), false);
  assert.equal(isFlexSelfDelivered({}), false);
});

test('preserveFlexSelfFields mantém no sync', () => {
  const existing = {
    flexSelfDelivered: true,
    flexSelfDeliveredAt: '2026-11-14T12:00:00.000Z',
    flexSelfDeliveredNote: 'eu'
  };
  const next = preserveFlexSelfFields(existing, { channel: 'mercadolivre', mlFlex: true });
  assert.equal(next.flexSelfDelivered, true);
  assert.equal(next.flexSelfDeliveredAt, '2026-11-14T12:00:00.000Z');

  const override = preserveFlexSelfFields(existing, {
    flexSelfDelivered: false
  });
  assert.equal(override.flexSelfDelivered, false);
});

test('normalizeFlexSelfPatch liga e limpa', () => {
  const ok = normalizeFlexSelfPatch({ selfDelivered: true, note: 'turbo off' });
  assert.equal(ok.ok, true);
  assert.equal(ok.patch.flexSelfDelivered, true);
  assert.equal(ok.patch.flexSelfDeliveredNote, 'turbo off');
  assert.ok(ok.patch.flexSelfDeliveredAt);

  const clear = normalizeFlexSelfPatch({ selfDelivered: false });
  assert.equal(clear.ok, true);
  assert.equal(clear.patch.flexSelfDelivered, false);
  assert.equal(clear.patch.flexSelfDeliveredAt, null);
});

test('matchesFlexSelfDay usa calendário BR', () => {
  const sale = {
    soldAt: '2026-11-14T22:30:00.000Z',
    _ts: Date.parse('2026-11-14T22:30:00.000Z')
  };
  // 22:30 UTC = 19:30 SP → dia 14
  assert.equal(matchesFlexSelfDay(sale, 2026, 11, 14, brDateParts), true);
  assert.equal(matchesFlexSelfDay(sale, 2026, 11, 13, brDateParts), false);
});
