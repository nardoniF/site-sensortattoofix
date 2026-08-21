import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FORUM_AVATARS,
  isValidUsername,
  normalizeUsername,
  sanitizeMediaList,
  slugify
} from './forum.js';

test('FORUM_AVATARS has unique ids', () => {
  const ids = FORUM_AVATARS.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('watch'));
});

test('slugify strips accents and punctuation', () => {
  assert.equal(slugify('Apple Watch pedindo senha!'), 'apple-watch-pedindo-senha');
  assert.equal(slugify(''), 'topico');
  assert.ok(slugify('a'.repeat(200)).length <= 80);
});

test('normalizeUsername and isValidUsername', () => {
  assert.equal(normalizeUsername(' Guga-99 '), 'guga99');
  assert.equal(isValidUsername('guga99'), true);
  assert.equal(isValidUsername('ab'), false);
  assert.equal(isValidUsername('Has Space'), false);
});

test('sanitizeMediaList keeps https images and youtube/vimeo only', () => {
  const out = sanitizeMediaList([
    { type: 'image', url: 'https://cdn.example.com/a.jpg' },
    { type: 'image', url: 'http://insecure.example/a.jpg' },
    { type: 'video', url: 'https://www.youtube.com/watch?v=abc' },
    { type: 'video', url: 'https://example.com/video.mp4' },
    { type: 'image', url: 'not-a-url' }
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].type, 'image');
  assert.equal(out[1].type, 'video');
});
