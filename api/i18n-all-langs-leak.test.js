import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['Fr', 'Nl', 'Sv', 'No', 'Fi', 'De', 'Es', 'Pl', 'Sl', 'It', 'En'];

test('INT products have native name/description for all site langs', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'data/store-config.json'), 'utf8'));
  for (const id of ['optical-lens-intl', 'optical-lens-smartband-intl']) {
    const p = cfg.products.find((x) => x.id === id);
    assert.ok(p, id);
    for (const L of LANGS) {
      assert.ok(String(p['name' + L] || '').trim(), `${id} name${L}`);
      assert.ok(String(p['description' + L] || '').trim(), `${id} description${L}`);
    }
  }
});

test('worker publicProductFields exposes nameFr/nameNl', () => {
  const worker = fs.readFileSync(path.join(root, 'api/worker.js'), 'utf8');
  assert.match(worker, /if \(p\.nameFr\) row\.nameFr/);
  assert.match(worker, /if \(p\.nameNl\) row\.nameNl/);
  assert.match(worker, /'nameFr', 'nameNl', 'nameSv', 'nameNo', 'nameFi'/);
});

test('site-feedback and site-footer have fr/nl/sv/no/fi packs', () => {
  const fb = fs.readFileSync(path.join(root, 'js/site-feedback.js'), 'utf8');
  const ft = fs.readFileSync(path.join(root, 'js/site-footer.js'), 'utf8');
  for (const lang of ['fr', 'nl', 'sv', 'no', 'fi']) {
    assert.match(fb, new RegExp(`\\b${lang}:\\s*\\{`));
    assert.match(ft, new RegExp(`\\b${lang}:\\s*\\{`));
  }
  assert.doesNotMatch(fb.split('fr:')[1].slice(0, 80), /Sugestões/);
  assert.match(fb, /fab: 'Suggestions'/); // FR
  assert.match(ft, /Suivez nos|Volg onze|Följ våra|Følg våre|Seuraa/);
  assert.match(ft, /Follow our official|Suivez|Volg onze|Följ våra|Følg våre|Seuraa/i);
});

test('forum-l10n.json covers fr/nl/sv/no/fi chrome titles', () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data/forum-l10n.json'), 'utf8'));
  for (const lang of ['fr', 'nl', 'sv', 'no', 'fi', 'de', 'es', 'pl', 'sl']) {
    assert.ok(data[lang], lang);
    assert.ok(String(data[lang].title || '').trim(), lang + '.title');
    assert.notEqual(String(data[lang].title).toLowerCase(), 'comunidade');
  }
  const forum = fs.readFileSync(path.join(root, 'js/forum.js'), 'utf8');
  assert.match(forum, /forum-l10n\.json/);
  assert.match(forum, /fr','nl','sv','no','fi/);
});
