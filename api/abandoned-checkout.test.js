/**
 * Regressão: abandono deve ler pedidos pendentes do D1 (não só KV index)
 * e só marcar enviado após sucesso + BCC loja.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const worker = readFileSync(join(root, 'api/worker.js'), 'utf8');

test('cron de abandono lista pendentes via D1', () => {
  assert.match(worker, /async function listPendingOrdersForAbandonedCron/);
  assert.match(worker, /d1ListOrders\(env,\s*2000\)/);
  assert.match(worker, /runAbandonedCheckoutEmails/);
  assert.match(worker, /listPendingOrdersForAbandonedCron\(env\)/);
});

test('e-mail de abandono manda BCC pra loja', () => {
  const start = worker.indexOf('async function notifyAbandonedCart');
  const end = worker.indexOf('async function listPendingOrdersForAbandonedCron');
  assert.ok(start > 0 && end > start);
  const fn = worker.slice(start, end);
  assert.match(fn, /bcc:\s*shopCopy/);
  assert.match(fn, /formsubmit\?\.email/);
});

test('abandono só grava abandonedEmailSentAt após envio ok', () => {
  const start = worker.indexOf('async function runAbandonedCheckoutEmails');
  const end = worker.indexOf('async function tryCorreiosLabelPdfAttachment');
  assert.ok(start > 0 && end > start);
  const fn = worker.slice(start, end);
  // Não pode mais marcar sentAt antes do notify.
  assert.doesNotMatch(
    fn,
    /if\s*\(\s*!order\.abandonedEmailSentAt\s*\)\s*\{\s*order\.abandonedEmailSentAt\s*=/
  );
  assert.match(fn, /if\s*\(\s*!result\?\.ok\s*\)/);
  assert.match(fn, /order\.abandonedEmailSentAt\s*=\s*at/);
});
