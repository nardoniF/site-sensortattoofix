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

test('isKvQuotaError detects explicit quota rejections', () => {
  assert.equal(isKvQuotaError(new Error('KV put exceed daily quota')), true);
  assert.equal(isKvQuotaError(new Error('KV put failed: 429 Too Many Requests')), true);
  assert.equal(isKvQuotaError(Object.assign(new Error('KV write failed'), { status: 429 })), true);
  assert.equal(isKvQuotaError(new Error('Daily write limit exceeded')), true);
  assert.equal(isKvQuotaError(new Error('network fail')), false);
});

test('isKvQuotaError ignores unrelated messages that merely mention a limit', () => {
  assert.equal(isKvQuotaError(new Error('Key length exceeds the allowed limit')), false);
  assert.equal(isKvQuotaError(new Error('Request limit must be between 1 and 50')), false);
  assert.equal(isKvQuotaError(new Error('Quota configuration is unavailable')), false);
});
