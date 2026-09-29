/**
 * Garante que o Log de visitas não injeta visitantes de todos os dias no DOM
 * (isso congelava o Chrome ao expandir o mês) e que o dia hidrata de verdade.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const adminSrc = fs.readFileSync(path.join(root, 'js', 'admin.js'), 'utf8');

test('Cliques: esqueleto ano/mês/dia + hydrate sync no expandir do dia', () => {
  assert.match(adminSrc, /function wireClicksTreeLazyHydrate/);
  assert.match(adminSrc, /function hydrateClicksDayElement/);
  assert.match(adminSrc, /function clicksDayBodyEl/);
  assert.match(adminSrc, /function filterClicksTreeNavOnlyLightweight/);
  assert.match(adminSrc, /Abrindo o dia carrega as visitas/);
  assert.doesNotMatch(adminSrc, /pode expandir/);
  // Não finalizar árvore inteira no render (fonte do freeze no Atualizar).
  const renderFn = adminSrc.slice(
    adminSrc.indexOf('function renderClicksTree'),
    adminSrc.indexOf('function openLatestClicksTreeYear')
  );
  assert.doesNotMatch(renderFn, /pruneUniqueOrRepeatSessions\(tree\)/);
  assert.match(renderFn, /filterClicksTreeNavOnlyLightweight/);
  assert.doesNotMatch(renderFn, /renderDayVisitorsHtml/);
  assert.match(renderFn, /hydrateClicksDayElement/);
  // Hydrate síncrono — sem setTimeout que deixava o dia vazio.
  const hydrateFn = adminSrc.slice(
    adminSrc.indexOf('function hydrateClicksDayElement'),
    adminSrc.indexOf('function clicksTreeSummary')
  );
  assert.doesNotMatch(hydrateFn, /setTimeout/);
  assert.doesNotMatch(hydrateFn, /:scope/);
});
