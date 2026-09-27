/**
 * Últimas N semanas Mon→Sun (atravessam mês) — Admin consolidado.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function shiftMondayKey(mondayKey, deltaWeeks) {
  const [y, m, d] = String(mondayKey || '').split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + (Number(deltaWeeks) || 0) * 7);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

function weekCardFromMondayKey(mondayKey) {
  const [y, m, d] = String(mondayKey || '').split('-').map(Number);
  const mon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  const fmt = (dt) => `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
  return {
    key: mondayKey,
    rangeLabel: `${fmt(mon)} – ${fmt(sun)}`,
    sundayYmd: `${sun.getUTCFullYear()}-${String(sun.getUTCMonth() + 1).padStart(2, '0')}-${String(sun.getUTCDate()).padStart(2, '0')}`
  };
}

function lastNBrWeeks(n, currentMondayKey) {
  const count = Math.max(1, Number(n) || 13);
  const weeks = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    weeks.push(weekCardFromMondayKey(shiftMondayKey(currentMondayKey, -i)));
  }
  return weeks;
}

function weekPerfTone(net, avgNet) {
  const n = Number(net || 0);
  const avg = Number(avgNet || 0);
  if (!avg) return n > 0 ? 'green' : 'yellow';
  const ratio = n / avg;
  if (ratio < 0.7) return 'red';
  if (ratio < 0.95) return 'yellow';
  if (ratio >= 1.25) return 'green-hot';
  return 'green';
}

test('semana atravessa mês: 27/07–02/08 e 31/08–06/09', () => {
  assert.equal(weekCardFromMondayKey('2026-07-27').rangeLabel, '27/07 – 02/08');
  assert.equal(weekCardFromMondayKey('2026-08-31').rangeLabel, '31/08 – 06/09');
});

test('lastNBrWeeks: 13 semanas, antiga → recente, inclui atual', () => {
  const weeks = lastNBrWeeks(13, '2026-09-21');
  assert.equal(weeks.length, 13);
  assert.equal(weeks[0].key, '2026-06-29');
  assert.equal(weeks[weeks.length - 1].key, '2026-09-21');
  assert.equal(weeks[0].rangeLabel, '29/06 – 05/07');
});

test('weekPerfTone vs média', () => {
  assert.equal(weekPerfTone(500, 1000), 'red');
  assert.equal(weekPerfTone(900, 1000), 'yellow');
  assert.equal(weekPerfTone(1000, 1000), 'green');
  assert.equal(weekPerfTone(1300, 1000), 'green-hot');
});

test('linhas por mês do domingo (invade mês → nova linha)', () => {
  const weeks = lastNBrWeeks(13, '2026-09-21');
  const groups = [];
  weeks.forEach((w) => {
    const mk = w.sundayYmd.slice(0, 7);
    const last = groups[groups.length - 1];
    if (!last || last !== mk) groups.push(mk);
  });
  // 29/06–05/07 cai em julho; 27/07–02/08 em agosto; 31/08–06/09 em setembro
  assert.ok(groups.includes('2026-07'));
  assert.ok(groups.includes('2026-08'));
  assert.ok(groups.includes('2026-09'));
  const jul = weeks.filter((w) => w.sundayYmd.startsWith('2026-07'));
  assert.equal(jul[0].rangeLabel, '29/06 – 05/07');
  assert.equal(jul[jul.length - 1].rangeLabel, '20/07 – 26/07');
});

test('admin.js: fold 13 semanas Mon→Sun (sem monthCalendarWeeks)', () => {
  const src = fs.readFileSync(path.join(root, 'js', 'admin.js'), 'utf8');
  assert.match(src, /function lastNBrWeeks/);
  assert.match(src, /function renderConsolidadoWeekCompare/);
  assert.match(src, /Últimas 13 semanas/);
  assert.match(src, /vendas-consol-week13-lines/);
  assert.match(src, /vendas-consol-week13-line-label/);
  assert.match(src, /data-fold-key="vendas-semanas"/);
  assert.doesNotMatch(src, /function monthCalendarWeeks/);
  assert.doesNotMatch(src, /function salesInMonthDayRange/);
});
