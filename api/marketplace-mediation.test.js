import test from 'node:test';
import assert from 'node:assert/strict';
import {
  saleHasMediationCash,
  saleMediationAmount,
  preserveMediationFields,
  normalizeMediationPatch,
  normalizeMarketplaceChannel
} from './marketplace-mediation.js';

test('saleHasMediationCash exige won + valor', () => {
  assert.equal(saleHasMediationCash({ mediationWon: true, mediationAmount: 10 }), true);
  assert.equal(saleHasMediationCash({ mediationWon: true, mediationAmount: 0 }), false);
  assert.equal(saleHasMediationCash({ mediationWon: false, mediationAmount: 50 }), false);
  assert.equal(saleMediationAmount({ mediationWon: true, mediationAmount: 12.345 }), 12.35);
});

test('preserveMediationFields mantém no sync', () => {
  const existing = {
    mediationWon: true,
    mediationAmount: 40,
    mediationWonAt: '2026-01-01T00:00:00.000Z'
  };
  const next = preserveMediationFields(existing, { externalId: '1', status: 'cancelled' });
  assert.equal(next.mediationWon, true);
  assert.equal(next.mediationAmount, 40);
  const override = preserveMediationFields(existing, {
    externalId: '1',
    mediationWon: false,
    mediationAmount: 0
  });
  assert.equal(override.mediationWon, false);
});

test('normalizeMediationPatch', () => {
  const ok = normalizeMediationPatch({ won: true, amount: 33.1 });
  assert.equal(ok.ok, true);
  assert.equal(ok.patch.mediationAmount, 33.1);
  const bad = normalizeMediationPatch({ won: true, amount: 0 });
  assert.equal(bad.ok, false);
  const clear = normalizeMediationPatch({ won: false });
  assert.equal(clear.ok, true);
  assert.equal(clear.patch.mediationWon, false);
});

test('normalizeMarketplaceChannel', () => {
  assert.equal(normalizeMarketplaceChannel('ML'), 'mercadolivre');
  assert.equal(normalizeMarketplaceChannel('amazon'), 'amazon');
  assert.equal(normalizeMarketplaceChannel('x'), '');
});
