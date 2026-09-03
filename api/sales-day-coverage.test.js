/**
 * Cobertura de dias com/sem venda (lógica espelhada do Admin consolidado).
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

function monthSalesDayCoverage(sales, year, monthNum, throughDay) {
  const ym = String(monthNum).padStart(2, '0');
  const y = String(year);
  const lastDay = Math.min(
    Math.max(1, Number(throughDay) || 1),
    daysInCalendarMonth(y, ym)
  );
  const sold = new Set();
  (sales || []).forEach((s) => {
    const day = Number(s.day);
    if (day >= 1 && day <= lastDay) sold.add(day);
  });
  const emptyDays = [];
  for (let d = 1; d <= lastDay; d += 1) {
    if (!sold.has(d)) emptyDays.push(d);
  }
  return { through: lastDay, soldDays: sold.size, emptyDays, emptyCount: emptyDays.length };
}

function formatDayNumberList(days) {
  const list = (days || []).map((d) => Number(d)).filter((n) => n > 0);
  if (!list.length) return '';
  if (list.length === 1) return String(list[0]);
  if (list.length === 2) return `${list[0]} e ${list[1]}`;
  return `${list.slice(0, -1).join(', ')} e ${list[list.length - 1]}`;
}

test('agosto: só dias 2–4 sem venda → 28 com / 3 sem', () => {
  const sales = [];
  for (let d = 1; d <= 31; d += 1) {
    if (d === 2 || d === 3 || d === 4) continue;
    sales.push({ day: d });
  }
  const cov = monthSalesDayCoverage(sales, 2026, '08', 31);
  assert.equal(cov.soldDays, 28);
  assert.equal(cov.emptyCount, 3);
  assert.deepEqual(cov.emptyDays, [2, 3, 4]);
  assert.equal(formatDayNumberList(cov.emptyDays), '2, 3 e 4');
});

test('admin.js expõe cobertura de dias no consolidado', () => {
  const src = fs.readFileSync(path.join(root, 'js', 'admin.js'), 'utf8');
  assert.match(src, /function monthSalesDayCoverage/);
  assert.match(src, /function renderConsolidadoDaysCoverage/);
  assert.match(src, /Dias com venda/);
  assert.match(src, /data-fold-key="vendas-dias"/);
  assert.match(src, /vendas-consol-days-split/);
});
