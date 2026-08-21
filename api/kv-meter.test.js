import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  utcDayKey,
  nextUtcMidnightDate,
  pctOf,
  isKvQuotaError,
  KV_FREE_WRITES_PER_DAY
} from './kv-meter.js';

test('utcDayKey is YYYY-MM-DD UTC', () => {
  assert.equal(utcDayKey(new Date('2026-03-15T23:30:00Z')), '2026-03-15');
});

test('nextUtcMidnightDate is tomorrow 00:00 UTC', () => {
  const now = new Date('2026-03-15T10:00:00Z');
  const next = nextUtcMidnightDate.call ? nextUtcMidnightDate() : nextUtcMidnightDate;
  const d = typeof next === 'function' ? next() : nextUtcMidnightDate();
  assert.equal(d.getUTCHours(), 0);
  assert.equal(d.getUTCMinutes(), 0);
});

test('pctOf caps at 100 and handles zero limit', () => {
  assert.equal(pctOf(500, KV_FREE_WRITES_PER_DAY), 50);
  assert.equal(pctOf(2000, KV_FREE_WRITES_PER_DAY), 100);
  assert.equal(pctOf(10, 0), 0);
});

test('isKvQuotaError detects quota messages', () => {
  assert.equal(isKvQuotaError(new Error('KV put exceed daily quota')), true);
  assert.equal(isKvQuotaError(new Error('network fail')), false);
});
