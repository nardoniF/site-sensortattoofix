import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadMerge() {
  const window = {};
  const sandbox = { window, globalThis: window, console };
  vm.runInNewContext(
    fs.readFileSync(path.join(root, 'js/store-products-merge.js'), 'utf8'),
    sandbox,
    { filename: 'store-products-merge.js' }
  );
  return sandbox.window.STF_PRODUCT_MERGE;
}

test('mergeHomeContentById restores missing reviews from Git catalog', () => {
  const merge = loadMerge();
  const kv = [
    { id: 'review-1', author: 'Caroline', body: 'ok', order: 1 },
    { id: 'review-10', author: 'Pri', body: 'ok', order: 10 }
  ];
  const site = [
    { id: 'review-1', author: 'Caroline', body: 'from site', order: 1 },
    { id: 'review-11', author: 'Leandro Figliolia', body: 'To muito feliz!', order: 11 },
    { id: 'review-15', author: 'Amauri', body: 'Chegou rápido', order: 15 }
  ];
  const out = merge.mergeHomeContentById(kv, site);
  assert.equal(out.length, 4);
  assert.equal(out.find((r) => r.id === 'review-1').body, 'ok'); // KV wins
  assert.equal(out.find((r) => r.id === 'review-11').author, 'Leandro Figliolia');
  assert.equal(out.find((r) => r.id === 'review-15').author, 'Amauri');
});

test('store-config still has Leandro Figliolia as review-11', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'data/store-config.json'), 'utf8'));
  const r = cfg.homeReviews.find((x) => x.id === 'review-11');
  assert.equal(r?.author, 'Leandro Figliolia');
  assert.match(r.body, /feliz/i);
  assert.ok(r.bodyEn);
  assert.ok(r.bodyIt);
  assert.equal(cfg.homeReviews.length, 15);
});

test('home-content-l10n covers review-11 in all intl langs', () => {
  const l10n = JSON.parse(fs.readFileSync(path.join(root, 'data/home-content-l10n.json'), 'utf8'));
  for (const lang of ['de', 'es', 'pl', 'sl', 'fr', 'nl', 'sv', 'no', 'fi']) {
    const row = l10n[lang]?.reviews?.['review-11'];
    assert.ok(row?.body, `${lang} review-11 body`);
    assert.equal(row.author, 'Leandro Figliolia');
  }
});
