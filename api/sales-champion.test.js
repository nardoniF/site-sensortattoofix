/**
 * Dia campeão / % mês completo — espelho da lógica do Admin consolidado.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { brDateParts } from './sales-money.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function yearChampionDays(sales, year) {
  const y = String(year);
  const byDay = new Map();
  (sales || []).forEach((s) => {
    if (!s._ts) return;
    const p = brDateParts(s._ts);
    if (p.year !== y) return;
    const key = p.dateKey;
    if (!byDay.has(key)) {
      byDay.set(key, { dateKey: key, count: 0, net: 0 });
    }
    const row = byDay.get(key);
    row.count += 1;
    row.net += Number(s._net || 0);
  });
  const days = [...byDay.values()];
  if (!days.length) return null;
  let byCount = days[0];
  let byNet = days[0];
  days.forEach((d) => {
    if (d.count > byCount.count || (d.count === byCount.count && d.net > byCount.net)) byCount = d;
    if (d.net > byNet.net || (d.net === byNet.net && d.count > byNet.count)) byNet = d;
  });
  if (byCount.dateKey === byNet.dateKey) {
    return { same: byCount.dateKey, byCount: null, byNet: null };
  }
  return { same: null, byCount: byCount.dateKey, byNet: byNet.dateKey };
}

test('mesmo dia campeão de qtd e valor → um só', () => {
  const ts = Date.parse('2026-09-15T12:00:00-03:00');
  const sales = [
    { _ts: ts, _net: 100 },
    { _ts: ts, _net: 80 },
    { _ts: Date.parse('2026-09-10T12:00:00-03:00'), _net: 50 }
  ];
  const c = yearChampionDays(sales, 2026);
  assert.equal(c.same, '2026-09-15');
  assert.equal(c.byCount, null);
});

test('campeões diferentes quando qtd e líquido divergem', () => {
  const sales = [
    { _ts: Date.parse('2026-09-02T12:00:00-03:00'), _net: 10 },
    { _ts: Date.parse('2026-09-02T13:00:00-03:00'), _net: 10 },
    { _ts: Date.parse('2026-09-02T14:00:00-03:00'), _net: 10 },
    { _ts: Date.parse('2026-09-20T12:00:00-03:00'), _net: 500 }
  ];
  const c = yearChampionDays(sales, 2026);
  assert.equal(c.same, null);
  assert.equal(c.byCount, '2026-09-02');
  assert.equal(c.byNet, '2026-09-20');
});

test('admin.js: % só mês completo + fold dia campeão', () => {
  const src = fs.readFileSync(path.join(root, 'js', 'admin.js'), 'utf8');
  assert.match(src, /function completeMonthGrowthHtml/);
  assert.match(src, /function isCurrentBrYearMonth/);
  assert.match(src, /function yearChampionDays/);
  assert.match(src, /function renderConsolidadoChampionDays/);
  assert.match(src, /data-fold-key="vendas-campeao"/);
  assert.match(src, /admin-fold-title">Dia campeão</);
  assert.doesNotMatch(src, /admin-fold-title">Dia campeão \$\{/);
  assert.match(src, /if \(isCurrentBrYearMonth\(year, monthNum\)\) return '';/);
  assert.match(src, /function weekSuccessRanks/);
  assert.match(src, /vendas-consol-week13-rank/);
});
