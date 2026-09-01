import { test } from 'node:test';
import assert from 'node:assert/strict';

/** Réplica da cadeia resolveMercadoPagoPendingForBalance (sem fetch). */
function resolvePendingForBalance(officialUnavailable, searchExclToday, searchFull, cached) {
  const officialN = Number(officialUnavailable);
  if (Number.isFinite(officialN) && officialN > 0) {
    return { value: officialN, meta: { source: 'official_balance' } };
  }
  if (Number.isFinite(searchExclToday) && searchExclToday > 0) {
    return { value: searchExclToday, meta: { source: 'payments_pending_excl_today_brt' } };
  }
  if (Number.isFinite(searchFull) && searchFull > 0) {
    return { value: searchFull, meta: { source: 'payments_pending' } };
  }
  if (Number.isFinite(cached) && cached > 0) {
    return { value: cached, meta: { source: 'cache' } };
  }
  return { value: null, meta: null };
}

test('official unavailable=0 não bloqueia fallback', () => {
  const r = resolvePendingForBalance(0, 842.38, 1020.7, null);
  assert.equal(r.value, 842.38);
  assert.equal(r.meta.source, 'payments_pending_excl_today_brt');
});

test('official > 0 tem prioridade', () => {
  const r = resolvePendingForBalance(842.38, 900, 1020, null);
  assert.equal(r.value, 842.38);
});

test('fallback completo quando exclusão hoje zera', () => {
  const r = resolvePendingForBalance(null, 0, 1020.7, null);
  assert.equal(r.value, 1020.7);
});

test('nunca retorna null se cache tem valor', () => {
  const r = resolvePendingForBalance(0, 0, 0, 842);
  assert.equal(r.value, 842);
});
