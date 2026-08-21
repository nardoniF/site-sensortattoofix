import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  keyOf,
  isEmptyValue,
  normalizeLegacyImagePath,
  isLegacyBrokenKitImage,
  mergeSmartwatchLists,
  normalizeBandColor
} from '../js/store-products-core.mjs';

test('keyOf prefers id then slug', () => {
  assert.equal(keyOf({ id: 'kit', slug: 'x' }), 'kit');
  assert.equal(keyOf({ slug: 'pelicula-squircle' }), 'pelicula-squircle');
});

test('normalizeLegacyImagePath rewrites /site and /produtos', () => {
  assert.equal(normalizeLegacyImagePath('/site/logo.jpg'), '/images/brand/logo.jpg');
  assert.equal(normalizeLegacyImagePath('/produtos/foo.png'), '/images/produtos/foo.png');
});

test('isLegacyBrokenKitImage flags bare brand placeholder', () => {
  assert.equal(isLegacyBrokenKitImage(''), true);
  assert.equal(isLegacyBrokenKitImage('/images/produtos/x.png'), false);
});

test('mergeSmartwatchLists prefers richer Git catalog', () => {
  const primary = ['A', 'B'];
  const supplement = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA'];
  assert.equal(mergeSmartwatchLists(primary, supplement).length, supplement.length);
});

test('normalizeBandColor maps EN aliases', () => {
  assert.equal(normalizeBandColor('black'), 'preta');
  assert.equal(normalizeBandColor('gray'), 'cinza');
});

test('isEmptyValue treats blank strings and empty arrays', () => {
  assert.equal(isEmptyValue('  '), true);
  assert.equal(isEmptyValue([]), true);
  assert.equal(isEmptyValue(0), false);
});
