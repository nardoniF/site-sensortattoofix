import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = path.join(root, 'js');

function mockWindow(location, extras = {}) {
  const loc = { hostname: location.hostname, pathname: location.pathname, search: location.search || '', hash: '' };
  const window = {
    location: loc,
    document: { documentElement: { lang: location.lang || 'pt' } },
    sessionStorage: { setItem() {}, getItem() { return null; } },
    ...extras
  };
  return { window, location: loc };
}

function loadPageLang(location, extras = {}) {
  const { window, location: loc } = mockWindow(location, extras);
  const sandbox = { window, globalThis: window, location: loc, document: window.document, console };
  vm.runInNewContext(fs.readFileSync(path.join(jsDir, 'stf-page-lang.js'), 'utf8'), sandbox, { filename: 'stf-page-lang.js' });
  return sandbox.window.STF_PAGE_LANG;
}

function loadSiteWithPageLang(location) {
  const { window, location: loc } = mockWindow(location);
  const sandbox = { window, globalThis: window, location: loc, document: window.document, console };
  vm.runInNewContext(fs.readFileSync(path.join(jsDir, 'stf-page-lang.js'), 'utf8'), sandbox, { filename: 'stf-page-lang.js' });
  vm.runInNewContext(fs.readFileSync(path.join(jsDir, 'stf-site.js'), 'utf8'), sandbox, { filename: 'stf-site.js' });
  return sandbox.window.STF_SITE;
}

test('STF_PAGE_LANG: detecta es/de/pl no path .com.br', () => {
  const es = loadPageLang({ hostname: 'www.sensortattoofix.com.br', pathname: '/es/loja.html' });
  const de = loadPageLang({ hostname: 'www.sensortattoofix.com.br', pathname: '/de/comprar.html' });
  const pl = loadPageLang({ hostname: 'www.sensortattoofix.com.br', pathname: '/pl/' });
  const pt = loadPageLang({ hostname: 'www.sensortattoofix.com.br', pathname: '/loja.html' });
  assert.equal(es.get(), 'es');
  assert.equal(de.get(), 'de');
  assert.equal(pl.get(), 'pl');
  assert.equal(pt.get(), 'pt');
});

test('STF_PAGE_LANG: catalogMarket INT para /es|/de|/pl no .com.br', () => {
  assert.equal(loadPageLang({ hostname: 'www.sensortattoofix.com.br', pathname: '/es/loja.html' }).catalogMarket(), 'INT');
  assert.equal(loadPageLang({ hostname: 'www.sensortattoofix.com.br', pathname: '/de/loja.html' }).catalogMarket(), 'INT');
  assert.equal(loadPageLang({ hostname: 'www.sensortattoofix.com.br', pathname: '/pl/loja.html' }).catalogMarket(), 'INT');
  assert.equal(loadPageLang({ hostname: 'www.sensortattoofix.com.br', pathname: '/loja.html' }).catalogMarket(), 'BR');
});

test('STF_SITE.catalogMarket alinhado com STF_PAGE_LANG', () => {
  const cases = [
    { hostname: 'www.sensortattoofix.com', pathname: '/es/loja.html', want: 'INT' },
    { hostname: 'www.sensortattoofix.com.br', pathname: '/en/loja.html', want: 'INT' },
    { hostname: 'www.sensortattoofix.com.br', pathname: '/comprar.html', want: 'BR' }
  ];
  for (const c of cases) {
    const site = loadSiteWithPageLang(c);
    assert.equal(site.catalogMarket(), c.want, c.pathname);
  }
});

test('overrides DE/ES/PL definem store.title e page.checkoutTitle*', () => {
  const langs = [
    { file: 'stf-i18n-de-overrides.js', global: 'STF_I18N_DE', titleKey: 'page.checkoutTitleDe' },
    { file: 'stf-i18n-es-overrides.js', global: 'STF_I18N_ES', titleKey: 'page.checkoutTitleEs' },
    { file: 'stf-i18n-pl-overrides.js', global: 'STF_I18N_PL', titleKey: 'page.checkoutTitlePl' }
  ];
  for (const { file, global, titleKey } of langs) {
    const sandbox = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(jsDir, file), 'utf8'), sandbox, { filename: file });
    const o = sandbox.window[global];
    assert.ok(o['store.title'], `${file} store.title`);
    assert.ok(o[titleKey], `${file} ${titleKey}`);
    assert.ok(o['brand.tagline'], `${file} brand.tagline`);
  }
});

test('home-content-l10n.json cobre 18 FAQs e 15 reviews em de/es/pl', () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data/home-content-l10n.json'), 'utf8'));
  for (const lang of ['de', 'es', 'pl']) {
    const block = data[lang];
    assert.ok(block?.reviewsSummary, lang);
    assert.equal(Object.keys(block.faq).length, 18, `${lang} faq`);
    assert.equal(Object.keys(block.reviews).length, 15, `${lang} reviews`);
  }
});

test('forum-l10n.json cobre chaves principais em de/es/pl', () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data/forum-l10n.json'), 'utf8'));
  const required = ['title', 'loading', 'signIn', 'newTopic', 'post', 'reply'];
  for (const lang of ['de', 'es', 'pl']) {
    for (const key of required) {
      assert.ok(data[lang]?.[key], `${lang}.${key}`);
    }
  }
});

const LANG_SHELL_PAGES = ['loja.html', 'comprar.html', 'minha-conta.html', 'comunidade.html', 'onde-comprar.html'];
const LANGS = ['de', 'es', 'pl'];

test('páginas DE/ES/PL carregam bundle i18n obrigatório', () => {
  for (const lang of LANGS) {
    for (const page of LANG_SHELL_PAGES) {
      const file = path.join(root, lang, page);
      assert.ok(fs.existsSync(file), file);
      const html = fs.readFileSync(file, 'utf8');
      assert.match(html, /stf-page-lang\.js/, `${lang}/${page} stf-page-lang`);
      assert.match(html, new RegExp(`stf-i18n-${lang}-overrides\\.js`), `${lang}/${page} overrides`);
      assert.match(html, /stf-i18n\.js/, `${lang}/${page} stf-i18n`);
      assert.match(html, new RegExp(`data-lang="${lang}"`), `${lang}/${page} data-lang`);
      assert.match(html, new RegExp(`stf_lang','${lang}'`), `${lang}/${page} sessionStorage`);
    }
  }
});

test('páginas loja/checkout têm classe body para applyLojaDom/applyCheckoutDom', () => {
  for (const lang of LANGS) {
    const loja = fs.readFileSync(path.join(root, lang, 'loja.html'), 'utf8');
    const comprar = fs.readFileSync(path.join(root, lang, 'comprar.html'), 'utf8');
    assert.match(loja, /class="[^"]*loja-page/, `${lang}/loja.html loja-page`);
    assert.match(comprar, /class="[^"]*checkout-page/, `${lang}/comprar.html checkout-page`);
  }
});
