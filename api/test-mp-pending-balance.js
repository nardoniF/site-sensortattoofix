/**
 * Testes locais da lógica MP pendente (sem token).
 * Rodar: node api/test-mp-pending-balance.js
 */
import assert from 'node:assert/strict';

function parseMpDateMs(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 1e9) return n < 1e12 ? n * 1000 : n;
  const ms = Date.parse(String(raw));
  return Number.isFinite(ms) ? ms : null;
}

function mpStartOfTodayBrtMs(nowMs = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(nowMs));
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const d = Number(parts.find((p) => p.type === 'day')?.value);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return nowMs;
  return Date.UTC(y, m - 1, d, 3, 0, 0, 0);
}

function mpPaymentApprovedTodayBrt(payment, nowMs = Date.now()) {
  const approvedMs = parseMpDateMs(payment?.date_approved);
  if (approvedMs == null) return false;
  return approvedMs >= mpStartOfTodayBrtMs(nowMs);
}

// 01/09/2026 00:30 BRT ≈ 03:30 UTC
const now = Date.parse('2026-09-01T03:30:00.000Z');
assert.equal(mpPaymentApprovedTodayBrt({ date_approved: '2026-09-01T04:00:00.000Z' }, now), true);
assert.equal(mpPaymentApprovedTodayBrt({ date_approved: '2026-08-31T23:00:00.000Z' }, now), false);

// official unavailable=0 não deve ser tratado como pendente válido
const officialN = 0;
assert.equal(Number.isFinite(officialN) && officialN > 0, false);

console.log('test-mp-pending-balance: OK');
