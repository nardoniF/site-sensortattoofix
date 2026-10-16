/**
 * Pure helpers mirroring js/admin.js consolidado day-window (±3) qty logic.
 * Keeps the strip aligned: same calendar day across 3 months; future days = null.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

function daysInCalendarMonth(year, monthNum) {
  const y = Number(year);
  const m = Number(monthNum);
  return new Date(y, m, 0).getDate();
}

function shiftYearMonth(year, monthNum, delta) {
  let y = Number(year);
  let m = Number(monthNum) + Number(delta || 0);
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  return { year: String(y), monthNum: String(m).padStart(2, '0') };
}

function dayWindowAround(center) {
  const c = Math.max(1, Number(center) || 1);
  const days = [];
  for (let off = -3; off <= 3; off += 1) days.push(c + off);
  return days;
}

function qtyCell(day, { maxDay, isCurrent, center, qtyMap }) {
  if (day < 1 || day > maxDay) return null;
  if (isCurrent && day > center) return null;
  return Number(qtyMap[day] || 0);
}

test('day window is always 7 slots centered on today', () => {
  assert.deepEqual(dayWindowAround(15), [12, 13, 14, 15, 16, 17, 18]);
  assert.deepEqual(dayWindowAround(1), [-2, -1, 0, 1, 2, 3, 4]);
  assert.deepEqual(dayWindowAround(16), [13, 14, 15, 16, 17, 18, 19]);
});

test('daywin shows only last month + current (shift -1,0)', () => {
  const now = { year: '2026', monthNum: '10' };
  const months = [0, -1].map((delta) => shiftYearMonth(now.year, now.monthNum, delta));
  const ordered = [months[1], months[0]];
  assert.deepEqual(ordered.map((m) => `${m.year}-${m.monthNum}`), [
    '2026-09',
    '2026-10'
  ]);
});

test('qty cells: past months show 0; current future days are null; invalid day null', () => {
  const center = 15;
  const days = dayWindowAround(center);
  const aug = {
    maxDay: daysInCalendarMonth(2026, 8),
    isCurrent: false,
    center,
    qtyMap: { 12: 2, 15: 5 }
  };
  const oct = {
    maxDay: daysInCalendarMonth(2026, 10),
    isCurrent: true,
    center,
    qtyMap: { 14: 1, 15: 3 }
  };
  assert.deepEqual(days.map((d) => qtyCell(d, aug)), [2, 0, 0, 5, 0, 0, 0]);
  assert.deepEqual(days.map((d) => qtyCell(d, oct)), [0, 0, 1, 3, null, null, null]);
});

test('win/lose: higher qty wins, tie and null skip', () => {
  function outcomes(a, b) {
    if (a == null || b == null || a === b) return [null, null];
    return a > b ? ['win', 'lose'] : ['lose', 'win'];
  }
  assert.deepEqual(outcomes(6, 2), ['win', 'lose']);
  assert.deepEqual(outcomes(0, 3), ['lose', 'win']);
  assert.deepEqual(outcomes(4, 4), [null, null]);
  assert.deepEqual(outcomes(2, null), [null, null]);
});

test('win/lose only after day closed (d < today); today stays uncolored', () => {
  const center = 16;
  function outcomeForDay(d, a, b) {
    if (d >= center) return [null, null];
    if (a == null || b == null || a === b) return [null, null];
    return a > b ? ['win', 'lose'] : ['lose', 'win'];
  }
  assert.deepEqual(outcomeForDay(16, 6, 0), [null, null]);
  assert.deepEqual(outcomeForDay(15, 6, 0), ['win', 'lose']);
  assert.deepEqual(outcomeForDay(17, 1, 0), [null, null]);
});

test('Feb short month: day 30/31 are null', () => {
  const center = 28;
  const days = dayWindowAround(center);
  const feb = {
    maxDay: daysInCalendarMonth(2026, 2),
    isCurrent: false,
    center,
    qtyMap: { 28: 4 }
  };
  assert.equal(feb.maxDay, 28);
  assert.deepEqual(days.map((d) => qtyCell(d, feb)), [0, 0, 0, 4, null, null, null]);
});
