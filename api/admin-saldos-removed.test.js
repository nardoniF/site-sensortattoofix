/**
 * Regressão: aba Saldos e payloads de saldo das gateways foram removidos.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('admin.html não tem aba Saldos', () => {
  const html = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
  assert.equal(html.includes('data-admin-tab="saldos"'), false);
  assert.equal(html.includes('id="admin-tab-saldos"'), false);
  assert.equal(html.includes('payment-balances-grid'), false);
  assert.equal(html.includes('btn-refresh-payment-balances'), false);
  assert.equal(html.includes('mp-release-audit'), false);
  assert.match(html, /data-admin-tab="api"/);
  assert.match(html, /data-admin-tab="pedidos"/);
});

test('admin.js não carrega saldos / auditoria MP', () => {
  const js = fs.readFileSync(path.join(root, 'js/admin.js'), 'utf8');
  assert.equal(js.includes('loadPaymentBalances'), false);
  assert.equal(js.includes('renderPaymentBalancesGrid'), false);
  assert.equal(js.includes('runMpReleaseAudit'), false);
  assert.equal(js.includes("id === 'saldos'"), false);
  assert.equal(js.includes('paymentBalancesSummary'), false);
  // redirect legado se alguém ainda tiver a aba salva
  assert.match(js, /saved === 'saldos'/);
});

test('worker não expõe paymentBalances nem rotas de auditoria/smoke de saldo', () => {
  const worker = fs.readFileSync(path.join(root, 'api/worker.js'), 'utf8');
  assert.equal(worker.includes('paymentBalances'), false);
  assert.equal(worker.includes('paymentBalancesSummary'), false);
  assert.equal(worker.includes('/admin/mp/release-audit'), false);
  assert.equal(worker.includes('/_local/smoke/mp-balance'), false);
  assert.equal(worker.includes("from './mp-release-audit.js'"), false);
  assert.equal(worker.includes("from './shopee-balance.js'"), false);
  assert.equal(worker.includes('appendBalanceDetailLines'), false);
  assert.equal(worker.includes('buildPaymentBalanceCard'), false);
  assert.equal(worker.includes('fetchMercadoPagoBalance('), false);
  assert.equal(worker.includes('checkShopeeBalanceIntegration'), false);
  assert.match(worker, /Saldos removidos/);
});

test('módulos órfãos de saldo não existem mais', () => {
  const gone = [
    'api/mp-release-audit.js',
    'api/shopee-balance.js',
    'api/shopee-balance.test.js',
    'api/mp-pending-balance.test.js',
    'api/test-mp-pending-balance.js',
    'api/scripts/smoke-mp-balance.mjs'
  ];
  for (const rel of gone) {
    assert.equal(fs.existsSync(path.join(root, rel)), false, rel);
  }
});

test('documentação registra remoção da aba Saldos', () => {
  const doc = fs.readFileSync(path.join(root, 'documentacao.html'), 'utf8');
  assert.match(doc, /Saldos<\/strong> foi removida/);
  assert.equal(doc.includes('data-admin-tab="saldos"'), false);
  const op = fs.readFileSync(path.join(root, 'docs/interno/OPERACAO.md'), 'utf8');
  assert.match(op, /Saldos foi removida/);
});

test('admin.js mantém helpers de Cliques (não apagados com Saldos)', () => {
  const js = fs.readFileSync(path.join(root, 'js/admin.js'), 'utf8');
  for (const fn of [
    'let clicksCache = []',
    'let clicksLoading = false',
    'let clicksLoadPromise = null',
    'function renderIntegrationsTable',
    'function showClicksEmptyState',
    'function showClicksCacheHint',
    'function filterClicksLocally',
    'function reapplyClicksLocalFilters',
    'function startClicksBackgroundLoad',
    'async function loadClicks'
  ]) {
    assert.equal(js.includes(fn), true, fn);
  }
});

test('worker mantém normalizeClickLang para geo-report de cliques', () => {
  const worker = fs.readFileSync(path.join(root, 'api/worker.js'), 'utf8');
  assert.match(worker, /function normalizeClickLang\s*\(/);
  assert.match(worker, /normalizeClickLang\(r\.idioma\)/);
});
