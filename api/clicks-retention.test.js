import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLICKS_CLOSED_MONTHS,
  clicksRetentionWindow,
  spMidnightUtcMs,
  spYmd
} from './clicks-retention.js';

test('CLICKS_CLOSED_MONTHS yields 6-month rolling window', () => {
  assert.equal(CLICKS_CLOSED_MONTHS, 5);
  const w = clicksRetentionWindow(Date.parse('2026-09-01T12:00:00-03:00'));
  assert.equal(w.totalMonths, 6);
  assert.equal(w.closedMonths, 5);
  assert.equal(w.months.length, 6);
  assert.equal(w.months[0].key, '2026-04');
  assert.equal(w.months[w.months.length - 1].key, '2026-09');
  assert.equal(w.months[w.months.length - 1].isCurrent, true);
});

test('cutoffMs is midnight SP on oldest month', () => {
  const w = clicksRetentionWindow(Date.parse('2026-09-15T12:00:00-03:00'));
  assert.equal(w.cutoffMs, spMidnightUtcMs(2026, 4, 1));
});

test('spYmd uses São Paulo calendar', () => {
  const p = spYmd(Date.parse('2026-01-02T02:00:00Z'));
  assert.equal(p.year, 2026);
  assert.equal(p.month, 1);
  assert.equal(p.day, 1);
});
