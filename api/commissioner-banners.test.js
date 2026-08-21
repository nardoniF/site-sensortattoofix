import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateCommissionerStoryBanners } from './commissioner-banners.js';

test('generateCommissionerStoryBanners fetches two PNG attachments', async () => {
  const orig = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (url) => {
    seen.push(String(url));
    return {
      ok: true,
      arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer
    };
  };
  try {
    const { attachments } = await generateCommissionerStoryBanners('https://www.sensortattoofix.com.br/');
    assert.equal(attachments.length, 2);
    assert.equal(attachments[0].content_type, 'image/png');
    assert.ok(attachments[0].content.length > 0);
    assert.ok(seen[0].startsWith('https://www.sensortattoofix.com.br/images/comissionado/stories/'));
  } finally {
    globalThis.fetch = orig;
  }
});

test('generateCommissionerStoryBanners throws when a banner is missing', async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 404 });
  try {
    await assert.rejects(
      () => generateCommissionerStoryBanners('https://example.com'),
      /Story indisponível/
    );
  } finally {
    globalThis.fetch = orig;
  }
});
