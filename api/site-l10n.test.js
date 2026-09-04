import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SITE_LANGS,
  normalizeSiteLang,
  otherSiteLangs,
  parseModelJson,
  seedFaqI18nFromLegacy,
  pickLocalizedField,
  fieldsFingerprint,
  hashSource,
  mergePreservedI18n
} from './site-l10n.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('SITE_LANGS cobre PT + intl atuais', () => {
  assert.deepEqual(SITE_LANGS, ['pt', 'en', 'it', 'de', 'es', 'pl', 'sl']);
  assert.equal(normalizeSiteLang('SL'), 'sl');
  assert.equal(normalizeSiteLang('fr'), 'pt');
  assert.deepEqual(otherSiteLangs('pt'), ['en', 'it', 'de', 'es', 'pl', 'sl']);
});

test('parseModelJson aceita fence e texto solto', () => {
  assert.deepEqual(parseModelJson('```json\n{"question":"Hi"}\n```'), { question: 'Hi' });
  assert.deepEqual(parseModelJson('Sure.\n{"body":"ok"}'), { body: 'ok' });
  assert.equal(parseModelJson('nope'), null);
});

test('extractAiText lê choices.message.content do Workers AI', async () => {
  const { extractAiText } = await import('./site-l10n.js');
  assert.equal(
    extractAiText({ result: { choices: [{ message: { content: '{"q":"1"}' } }] } }),
    '{"q":"1"}'
  );
  assert.equal(extractAiText({ response: 'legacy' }), 'legacy');
  assert.equal(extractAiText({ foo: 1 }), null);
});

test('seedFaqI18nFromStatic preenche DE a partir do JSON', async () => {
  const { seedFaqI18nFromStatic, seedFaqI18nFromLegacy } = await import('./site-l10n.js');
  const i18n = seedFaqI18nFromLegacy({
    id: 'faq-1',
    question: 'PT',
    questionEn: 'EN',
    answerEn: 'A'
  });
  assert.equal(i18n.en.question, 'EN');
  assert.ok(String(i18n.de?.question || '').includes('Warum') || String(i18n.de?.question || '').length > 5);
  assert.ok(String(i18n.sl?.question || '').length > 5);
});

test('seedFaqI18nFromLegacy reaproveita EN/IT já cadastrados', () => {
  const i18n = seedFaqI18nFromLegacy({
    question: 'Por que pede senha?',
    questionEn: 'Why the passcode?',
    answerEn: 'Because the sensor.',
    questionIt: 'Perché il codice?',
    answerIt: 'Per il sensore.'
  });
  assert.equal(i18n.en.question, 'Why the passcode?');
  assert.equal(i18n.it.question, 'Perché il codice?');
});

test('pickLocalizedField prefere i18n do item', () => {
  const row = {
    question: 'PT',
    questionEn: 'EN-old',
    i18n: { en: { question: 'EN-new' }, sl: { question: 'SL' } }
  };
  assert.equal(pickLocalizedField(row, 'question', 'pt'), 'PT');
  assert.equal(pickLocalizedField(row, 'question', 'en'), 'EN-new');
  assert.equal(pickLocalizedField(row, 'question', 'sl'), 'SL');
});

test('hashSource é estável para o mesmo texto', async () => {
  const a = await hashSource(fieldsFingerprint({ question: 'A', answer: 'B' }));
  const b = await hashSource(fieldsFingerprint({ question: 'A', answer: 'B' }));
  const c = await hashSource(fieldsFingerprint({ question: 'A', answer: 'C' }));
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('mergePreservedI18n não apaga i18n do KV se o Admin não mandou', () => {
  const incoming = [{ id: 'faq-1', question: 'PT' }];
  const previous = [{ id: 'faq-1', question: 'PT', i18n: { sl: { question: 'SL' } }, i18nHash: 'abc' }];
  const out = mergePreservedI18n(incoming, previous);
  assert.equal(out[0].i18n.sl.question, 'SL');
  assert.equal(out[0].i18nHash, 'abc');
});

test('homeContentI18nStatus conta pendentes', async () => {
  const { homeContentI18nStatus } = await import('./site-l10n.js');
  const status = homeContentI18nStatus({
    homeFaq: [
      { question: 'A', i18n: { en: { question: 'A' }, it: { question: 'A' }, de: { question: 'A' }, es: { question: 'A' }, pl: { question: 'A' }, sl: { question: 'A' } } },
      { question: 'B', i18n: { en: { question: 'B' } } }
    ],
    homeReviews: [{ body: 'ok', i18n: {} }]
  });
  assert.equal(status.faqTotal, 2);
  assert.equal(status.faqReady, 1);
  assert.equal(status.faqPending, 1);
  assert.equal(status.reviewsPending, 1);
});

test('worker expõe refresh home-i18n e save incremental', () => {
  const src = fs.readFileSync(path.join(root, 'api', 'worker.js'), 'utf8');
  assert.match(src, /\/admin\/home-i18n\/refresh/);
  assert.match(src, /handleAdminHomeI18nRefresh/);
  assert.match(src, /onProgress:\s*persistI18nPartial/);
});

test('admin tem botão Gerar traduções agora', () => {
  const html = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
  assert.match(html, /btn-refresh-home-i18n/);
  const src = fs.readFileSync(path.join(root, 'js', 'admin.js'), 'utf8');
  assert.match(src, /\/admin\/home-i18n\/refresh/);
});

test('admin FAQ e elogios: só campos PT no formulário', () => {
  const src = fs.readFileSync(path.join(root, 'js', 'admin.js'), 'utf8');
  const faqBlock = src.match(/function renderHomeFaq[\s\S]*?function collectHomeFaq/);
  assert.ok(faqBlock, 'renderHomeFaq');
  assert.doesNotMatch(faqBlock[0], /data-field="questionEn"/);
  assert.match(faqBlock[0], /data-field="question"/);
  const reviewBlock = src.match(/function renderHomeReviews[\s\S]*?function collectHomeReviews/);
  assert.ok(reviewBlock, 'renderHomeReviews');
  assert.doesNotMatch(reviewBlock[0], /data-field="bodyEn"/);
});

test('forum aceita de/es/pl/sl e agenda i18n no POST', () => {
  const src = fs.readFileSync(path.join(root, 'api', 'forum.js'), 'utf8');
  assert.match(src, /normalizeSiteLang/);
  assert.match(src, /scheduleI18n\(deps, \(\) => fillThreadI18n/);
  assert.match(src, /scheduleI18n\(deps, \(\) => fillReplyI18n/);
  assert.match(src, /sensortattoofix\.com\/sl\/comunidade\.html/);
});
