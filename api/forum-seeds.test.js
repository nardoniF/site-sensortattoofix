import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildForumSeedLangPacks } from './forum-seeds.js';

function packs() {
  const A = {
    'seed-guga': { userId: 'seed-guga', username: 'guga', nome: 'Guga' }
  };
  return buildForumSeedLangPacks({
    A: new Proxy(A, { get: (t, k) => t[k] || { userId: k, username: String(k).replace('seed-', ''), nome: String(k) } }),
    officialReply: (body, createdAt) => ({ body, createdAt, official: true, author: { username: 'sensortattoofix' } }),
    iso: (mins) => new Date(Date.now() - mins * 60000).toISOString()
  });
}

test('seed packs exist in pt, en and it with the same length', () => {
  const { pt, en, it } = packs();
  assert.ok(pt.length >= 20);
  assert.equal(pt.length, en.length);
  assert.equal(pt.length, it.length);
});

test('each seed topic has title, body, tags, author and replies', () => {
  const { pt } = packs();
  for (const t of pt) {
    assert.ok(t.title);
    assert.ok(t.body);
    assert.ok(Array.isArray(t.tags) && t.tags.length);
    assert.ok(t.author);
    assert.ok(Array.isArray(t.replies) && t.replies.length >= 3);
    assert.equal(t.lang, 'pt');
  }
});

test('seed titles are unique per language', () => {
  const { pt, en, it } = packs();
  for (const list of [pt, en, it]) {
    const titles = list.map((t) => t.title);
    assert.equal(new Set(titles).size, titles.length);
  }
});

test('every topic has an official reply', () => {
  const { pt } = packs();
  for (const t of pt) {
    assert.ok(t.replies.some((r) => r.official), t.title);
  }
});
