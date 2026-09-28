/**
 * Garante que o Log de visitas não injeta visitantes de todos os dias no DOM
 * (isso congelava o Chrome ao expandir o mês).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const adminSrc = fs.readFileSync(path.join(root, 'js', 'admin.js'), 'utf8');

test('Cliques: esqueleto ano/mês/dia + hydrate lazy no expandir do dia', () => {
  assert.match(adminSrc, /function wireClicksTreeLazyHydrate/);
  assert.match(adminSrc, /function hydrateClicksDayElement/);
  assert.match(adminSrc, /clicks-tree-day.*\n.*clicks-tree-children"><\/div><\/details>/s);
  assert.match(adminSrc, /Montando visitas do dia/);
  assert.doesNotMatch(adminSrc, /pode expandir/);
  // Não pode chamar renderDayVisitorsHtml dentro do loop de dias do renderClicksTree.
  const renderFn = adminSrc.slice(
    adminSrc.indexOf('function renderClicksTree'),
    adminSrc.indexOf('function openLatestClicksTreeYear')
  );
  assert.doesNotMatch(renderFn, /renderDayVisitorsHtml/);
  assert.match(renderFn, /hydrateClicksDayElement/);
});
