/**
 * Semanas do calendário do mês (1º→domingo; seg→dom; última até fim) — Admin consolidado.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function daysInCalendarMonth(year, monthNum) {
  return new Date(Date.UTC(Number(year), Number(monthNum), 0)).getUTCDate();
}

function monthCalendarWeeks(year, monthNum) {
  const y = String(year);
  const ym = String(monthNum).padStart(2, '0');
  const last = daysInCalendarMonth(y, ym);
  const dow = new Date(Date.UTC(Number(y), Number(ym) - 1, 1, 12, 0, 0)).getUTCDay();
  const mon0 = dow === 0 ? 6 : dow - 1;
  const firstEnd = Math.min(mon0 === 6 ? 1 : 1 + (6 - mon0), last);
  const weeks = [];
  let start = 1;
  let end = firstEnd;
  weeks.push({ index: 1, startDay: start, endDay: end });
  start = end + 1;
  while (start <= last) {
    end = Math.min(start + 6, last);
    weeks.push({ index: weeks.length + 1, startDay: start, endDay: end });
    start = end + 1;
  }
  return weeks;
}

test('setembro/2026: 1–6, 7–13, 14–20, 21–27, 28–30', () => {
  const weeks = monthCalendarWeeks(2026, '09');
  assert.deepEqual(
    weeks.map((w) => [w.startDay, w.endDay]),
    [
      [1, 6],
      [7, 13],
      [14, 20],
      [21, 27],
      [28, 30]
    ]
  );
  // nenhum dia de fora
  const covered = new Set();
  weeks.forEach((w) => {
    for (let d = w.startDay; d <= w.endDay; d += 1) covered.add(d);
  });
  assert.equal(covered.size, 30);
  for (let d = 1; d <= 30; d += 1) assert.ok(covered.has(d), `dia ${d}`);
});

test('mês que começa na segunda: 1ª semana 1–7', () => {
  // junho/2026 começa na segunda
  const weeks = monthCalendarWeeks(2026, '06');
  assert.deepEqual([weeks[0].startDay, weeks[0].endDay], [1, 7]);
});

test('admin.js usa semanas do mês no fold', () => {
  const src = fs.readFileSync(path.join(root, 'js', 'admin.js'), 'utf8');
  assert.match(src, /function monthCalendarWeeks/);
  assert.match(src, /function salesInMonthDayRange/);
  assert.match(src, /function renderConsolidadoWeekCompare/);
  assert.match(src, /Comparativo de semanas/);
  assert.match(src, /data-fold-key="vendas-semanas"/);
  assert.match(src, /dia 1 → domingo/);
});
