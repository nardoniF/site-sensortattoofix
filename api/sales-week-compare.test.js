/**
 * Comparativo de semanas (WTD) — lógica espelhada do Admin consolidado.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseYmdUtcNoon(ymd) {
  const [y, m, d] = String(ymd || '').split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function formatYmdUtc(dt) {
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

function shiftMondayKey(mondayKey, deltaWeeks) {
  const dt = parseYmdUtcNoon(mondayKey);
  dt.setUTCDate(dt.getUTCDate() + (Number(deltaWeeks) || 0) * 7);
  return formatYmdUtc(dt);
}

function salesWeekToDate(sales, mondayKey, throughOffsetMon0) {
  const mon = parseYmdUtcNoon(mondayKey);
  const end = new Date(mon);
  end.setUTCDate(mon.getUTCDate() + Math.max(0, Math.min(6, Number(throughOffsetMon0) || 0)));
  const startKey = mondayKey;
  const endKey = formatYmdUtc(end);
  return (sales || []).filter((s) => {
    const ymd = String(s.ymd || '');
    return ymd >= startKey && ymd <= endKey;
  });
}

test('shiftMondayKey: −1 semana a partir de segunda 22/09/2026', () => {
  assert.equal(shiftMondayKey('2026-09-22', -1), '2026-09-15');
  assert.equal(shiftMondayKey('2026-09-22', -2), '2026-09-08');
});

test('salesWeekToDate: WTD segunda→quarta (offset 2)', () => {
  const monday = '2026-09-22';
  const sales = [
    { ymd: '2026-09-21', net: 10 }, // domingo anterior — fora
    { ymd: '2026-09-22', net: 20 },
    { ymd: '2026-09-23', net: 30 },
    { ymd: '2026-09-24', net: 40 },
    { ymd: '2026-09-25', net: 50 } // quinta — fora do WTD até quarta
  ];
  const subset = salesWeekToDate(sales, monday, 2);
  assert.deepEqual(subset.map((s) => s.ymd), ['2026-09-22', '2026-09-23', '2026-09-24']);
});

test('admin.js expõe fold Comparativo de semanas', () => {
  const src = fs.readFileSync(path.join(root, 'js', 'admin.js'), 'utf8');
  assert.match(src, /function renderConsolidadoWeekCompare/);
  assert.match(src, /function salesWeekToDate/);
  assert.match(src, /Comparativo de semanas/);
  assert.match(src, /data-fold-key="vendas-semanas"/);
  assert.match(src, /vendas-consol-weeks-fold/);
});
