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

test('refreshHomeContentI18n prioriza FAQs sem i18n', async () => {
  const mod = await import('./site-l10n.js');
  const src = fs.readFileSync(path.join(root, 'api/site-l10n.js'), 'utf8');
  assert.match(src, /faqNeedsWork|pending/);
  assert.match(src, /syncLegacyFaqFieldsFromI18n/);
  assert.match(src, /faqLimit/);
  assert.match(src, /preferIds/);
  assert.equal(typeof mod.syncLegacyFaqFieldsFromI18n, 'function');
  const synced = mod.syncLegacyFaqFieldsFromI18n({
    question: 'PT',
    i18n: { en: { question: 'EN Q', answer: 'EN A' }, fr: { question: 'FR Q', answer: 'FR A' } }
  });
  assert.equal(synced.questionEn, 'EN Q');
  assert.equal(synced.answerEn, 'EN A');
  assert.equal(synced.questionFr, 'FR Q');
});

test('home-content.js não faz fallback PT em páginas intl', () => {
  const src = fs.readFileSync(path.join(root, 'js/home-content.js'), 'utf8');
  assert.match(src, /não cair no português|NÃO cair no português/i);
  assert.match(src, /fr: 'Fr'/);
  assert.match(src, /'fr', 'nl', 'sv', 'no', 'fi'/);
});

test('putConfig limita FAQ i18n no waitUntil e prioriza IDs alterados', () => {
  const src = fs.readFileSync(path.join(root, 'api/worker.js'), 'utf8');
  assert.match(src, /changedFaqIds/);
  assert.match(src, /preferIds:\s*changedFaqIds/);
  assert.match(src, /faqLimit:/);
  assert.match(src, /skipReviews:\s*true/);
  assert.match(src, /faqLimit:\s*6/);
});

test('looksLikePortugueseLeak rejeita EN ainda em PT', async () => {
  const mod = await import('./site-l10n.js');
  assert.equal(
    mod.looksLikePortugueseLeak(
      'Olá. O adesivo dura quanto tempo aplicado no relógio?',
      'en'
    ),
    true
  );
  assert.equal(
    mod.looksLikePortugueseLeak(
      'Hi. How long does the sticker last on the watch?',
      'en'
    ),
    false
  );
  assert.equal(mod.looksLikePortugueseLeak('Olá tudo bem', 'pt'), false);
});
