import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

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

test('STF_PAGE_LANG: detecta es/de/pl/sl no path .com.br', () => {
  const es = loadPageLang({ hostname: 'www.sensortattoofix.com.br', pathname: '/es/loja.html' });
  const de = loadPageLang({ hostname: 'www.sensortattoofix.com.br', pathname: '/de/comprar.html' });
  const pl = loadPageLang({ hostname: 'www.sensortattoofix.com.br', pathname: '/pl/' });
  const sl = loadPageLang({ hostname: 'www.sensortattoofix.com.br', pathname: '/sl/loja.html' });
  const pt = loadPageLang({ hostname: 'www.sensortattoofix.com.br', pathname: '/loja.html' });
  assert.equal(es.get(), 'es');
  assert.equal(de.get(), 'de');
  assert.equal(pl.get(), 'pl');
  assert.equal(sl.get(), 'sl');
  assert.equal(pt.get(), 'pt');
});

test('STF_PAGE_LANG: catalogMarket INT para /es|/de|/pl|/sl no .com.br', () => {
  assert.equal(loadPageLang({ hostname: 'www.sensortattoofix.com.br', pathname: '/es/loja.html' }).catalogMarket(), 'INT');
  assert.equal(loadPageLang({ hostname: 'www.sensortattoofix.com.br', pathname: '/de/loja.html' }).catalogMarket(), 'INT');
  assert.equal(loadPageLang({ hostname: 'www.sensortattoofix.com.br', pathname: '/pl/loja.html' }).catalogMarket(), 'INT');
  assert.equal(loadPageLang({ hostname: 'www.sensortattoofix.com.br', pathname: '/sl/loja.html' }).catalogMarket(), 'INT');
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
    { file: 'stf-i18n-pl-overrides.js', global: 'STF_I18N_PL', titleKey: 'page.checkoutTitlePl' },
    { file: 'stf-i18n-sl-overrides.js', global: 'STF_I18N_SL', titleKey: 'page.checkoutTitleSl' }
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
const LANGS = ['de', 'es', 'pl', 'sl'];

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

test('minha-conta DE/ES/PL usa conta-page sem checkout-page', () => {
  for (const lang of LANGS) {
    const html = fs.readFileSync(path.join(root, lang, 'minha-conta.html'), 'utf8');
    assert.match(html, /class="conta-page"/, `${lang}/minha-conta conta-page`);
    assert.doesNotMatch(html, /checkout-page conta-page/, `${lang}/minha-conta sem checkout-page`);
  }
});

test('onde-comprar DE/ES/PL tem classe onde-comprar-page', () => {
  for (const lang of LANGS) {
    const html = fs.readFileSync(path.join(root, lang, 'onde-comprar.html'), 'utf8');
    assert.match(html, /onde-comprar-page/, `${lang}/onde-comprar-page`);
  }
});

test('overrides DE/ES/PL definem ondeComprar e conta intl', () => {
  const langs = [
    { file: 'stf-i18n-de-overrides.js', global: 'STF_I18N_DE', ondeTitle: 'ondeComprar.pageTitleDe' },
    { file: 'stf-i18n-es-overrides.js', global: 'STF_I18N_ES', ondeTitle: 'ondeComprar.pageTitleEs' },
    { file: 'stf-i18n-pl-overrides.js', global: 'STF_I18N_PL', ondeTitle: 'ondeComprar.pageTitlePl' }
  ];
  for (const { file, global, ondeTitle } of langs) {
    const sandbox = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(jsDir, file), 'utf8'), sandbox, { filename: file });
    const o = sandbox.window[global];
    assert.ok(o[ondeTitle], `${file} ${ondeTitle}`);
    assert.ok(o['conta.forgotIntro'], `${file} conta.forgotIntro`);
    assert.ok(o['conta.sectionAddressIntl'], `${file} conta.sectionAddressIntl`);
    assert.ok(o['ondeComprar.trustEn'], `${file} ondeComprar.trustEn`);
  }
});

function loadPelicula(location) {
  const loc = { hostname: location.hostname, pathname: location.pathname, search: '', hash: '' };
  const window = {
    location: loc,
    STF_I18N: location.i18n || {},
    STF_SITE: location.site || {}
  };
  const sandbox = { window, globalThis: window, location: loc, console };
  vm.runInNewContext(fs.readFileSync(path.join(jsDir, 'pelicula-compat.js'), 'utf8'), sandbox, { filename: 'pelicula-compat.js' });
  return sandbox.window.STF_PELICULA;
}

test('STF_PELICULA: /es/ usa nameEn em vez de name PT', () => {
  const p = loadPelicula({
    hostname: 'www.sensortattoofix.com.br',
    pathname: '/es/loja.html',
    i18n: { isEs: () => true, isIt: () => false, isEn: () => false, isDe: () => false, isPl: () => false, isLocalized: () => true }
  });
  const product = {
    name: 'Kit Sensor Tattoo Fix',
    nameEn: 'Sensor Tattoo Fix Lens',
    description: 'Descrição em português',
    descriptionEn: 'English product description'
  };
  assert.equal(p.productLabel(product), 'Sensor Tattoo Fix Lens');
  assert.equal(p.productDescription(product), 'English product description');
});

test('letter-l10n.json cobre DE/ES/PL com chaves da carta EN', () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data/letter-l10n.json'), 'utf8'));
  const required = ['thanksTitle', 'sectionSteps', 'step1Text', 'body2', 'pocketTitle', 'toolbarFilled'];
  for (const lang of ['de', 'es', 'pl']) {
    for (const key of required) {
      assert.ok(data[lang]?.[key], `${lang}.${key}`);
    }
  }
});

test('FAQ intl faq-13 aponta para carta, não manual BR', () => {
  const l10n = JSON.parse(fs.readFileSync(path.join(root, 'data/home-content-l10n.json'), 'utf8'));
  for (const lang of ['de', 'es', 'pl']) {
    const ans = l10n[lang]?.faq?.['faq-13']?.answer || '';
    assert.match(ans, /carta-agradecimento-intl\.html\?lang=/, `${lang} faq-13`);
    assert.doesNotMatch(ans, /manual-instalacao-sensor-tattoo-fix/, `${lang} faq-13 sem manual BR`);
  }
});

test('STF_PELICULA: /de/ e /pl/ usam nameDe/namePl com fallback nameEn', () => {
  const de = loadPelicula({
    hostname: 'www.sensortattoofix.com.br',
    pathname: '/de/loja.html',
    i18n: {
      isDe: () => true,
      isIt: () => false,
      isEn: () => false,
      isEs: () => false,
      isPl: () => false,
      isLocalized: () => true
    }
  });
  assert.equal(
    de.productLabel({ name: 'Nome PT', nameEn: 'EN name', nameDe: 'DE name' }),
    'DE name'
  );
  assert.equal(
    de.productLabel({ name: 'Nome PT', nameEn: 'EN name' }),
    'EN name'
  );

  const pl = loadPelicula({
    hostname: 'www.sensortattoofix.com.br',
    pathname: '/pl/loja.html',
    i18n: {
      isPl: () => true,
      isIt: () => false,
      isEn: () => false,
      isEs: () => false,
      isDe: () => false,
      isLocalized: () => true
    }
  });
  assert.equal(
    pl.productLabel({ name: 'Nome PT', nameEn: 'EN name', namePl: 'PL name' }),
    'PL name'
  );
});

test('store-config: produtos intl têm nameDe/nameEs/namePl/nameSl', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'data/store-config.json'), 'utf8'));
  for (const id of ['optical-lens-intl', 'optical-lens-smartband-intl']) {
    const p = cfg.products.find((x) => x.id === id);
    assert.ok(p, id);
    for (const field of ['nameDe', 'nameEs', 'namePl', 'nameSl', 'descriptionDe', 'descriptionEs', 'descriptionPl', 'descriptionSl']) {
      assert.ok(p[field], `${id}.${field}`);
    }
  }
});

test('store-config: agregados têm nameDe (película exemplo)', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'data/store-config.json'), 'utf8'));
  const p = cfg.products.find((x) => x.id === 'pelicula-amazfit-bip-2');
  assert.ok(p?.nameDe?.startsWith('Schutzfolie'), p?.nameDe);
  assert.ok(p?.nameEs?.startsWith('Protector de pantalla'), p?.nameEs);
});

test('shell DE/ES/PL/SL sem snippets EN estáticos (loja/comprar/conta)', () => {
  const EN_SNIPPETS = ['Official Store', 'Peace between ink and silicon', 'Your cart', 'Loading products', 'Community (beta)'];
  const pages = ['loja.html', 'comprar.html', 'minha-conta.html', 'comunidade.html', 'onde-comprar.html'];
  for (const lang of LANGS) {
    for (const page of pages) {
      const html = fs.readFileSync(path.join(root, lang, page), 'utf8');
      const found = EN_SNIPPETS.filter((s) => html.includes(s));
      assert.equal(found.length, 0, `${lang}/${page}: ${found.join(', ')}`);
    }
  }
});

test('comprar DE/ES/PL/SL sem texto EN no shell do checkout', () => {
  const EN = ['Your details', 'Discount code', 'Secure checkout', 'Payment method', 'Place order', 'Select country'];
  for (const lang of LANGS) {
    const html = fs.readFileSync(path.join(root, lang, 'comprar.html'), 'utf8');
    const found = EN.filter((s) => html.includes(s));
    assert.equal(found.length, 0, `${lang}/comprar.html: ${found.join(', ')}`);
  }
});

test('audit-i18n-leaks: sem vazamentos críticos DE/ES/PL/SL', () => {
  const script = path.join(root, 'scripts/audit-i18n-leaks.mjs');
  const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout || result.stderr);
});

test('sl/index.html sem blocos alemães óbvios', () => {
  const html = fs.readFileSync(path.join(root, 'sl/index.html'), 'utf8');
  const DE_SNIPPETS = ['Das Problem', 'Jetzt kaufen', 'Über uns', 'Häufig gestellte Fragen', 'Offizieller Shop'];
  const found = DE_SNIPPETS.filter((s) => html.includes(s));
  assert.equal(found.length, 0, `sl/index.html: ${found.join(', ')}`);
  assert.match(html, /Mir med tinto in silicijem/, 'sl/index tagline');
});

test('hreflang: homes incluem sl/de e sem URLs quebradas', () => {
  const broken = [/\.br\/loja/, /\/de\/it\//, /\/sl\/it\//, /\/pl\/\.br\//];
  for (const file of ['index.html', 'de/index.html', 'sl/index.html', 'en/index.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(html, /hreflang="sl"/, file);
    assert.match(html, /hreflang="de"/, file);
    for (const re of broken) {
      assert.doesNotMatch(html, re, `${file} URL quebrada ${re}`);
    }
  }
});

test('sitemap.xml: só URLs .com.br; sitemap-com.xml só .com', () => {
  const brXml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const comXml = fs.readFileSync(path.join(root, 'sitemap-com.xml'), 'utf8');
  const brLocs = [...brXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const comLocs = [...comXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.equal(brLocs.length, 20);
  assert.equal(comLocs.length, 8);
  for (const loc of brLocs) {
    assert.match(loc, /^https:\/\/www\.sensortattoofix\.com\.br\//, `loc .com.br: ${loc}`);
    assert.doesNotMatch(loc, /sensortattoofix\.com\//, `loc cruzado em sitemap.xml: ${loc}`);
  }
  for (const loc of comLocs) {
    assert.match(loc, /^https:\/\/www\.sensortattoofix\.com\//, `loc .com: ${loc}`);
    assert.doesNotMatch(loc, /sensortattoofix\.com\.br/, `loc cruzado em sitemap-com.xml: ${loc}`);
  }
  assert.match(brXml, /hreflang="sl"/);
  assert.match(brXml, /xhtml:link[^>]+hreflang="en"[^>]+href="https:\/\/www\.sensortattoofix\.com\//);
  assert.match(comXml, /sensortattoofix\.com\.br\/de\//);
});

test('worker: funções de e-mail intl para de/es/pl/sl', () => {
  const src = fs.readFileSync(path.join(root, 'api/worker.js'), 'utf8');
  assert.match(src, /function intlPaidShipMessage/);
  assert.match(src, /function pendingPaymentEmailFields/);
  assert.match(src, /function packingSlipCopy/);
  assert.match(src, /function cancelOrderCustomerCopy/);
  assert.match(src, /Sendungsverfolgung verfügbar/);
  assert.match(src, /Wöchentliche Erinnerung/);
  assert.match(src, /Sledenje na voljo/);
  assert.match(src, /Tedenski opomnik/);
  assert.match(src, /Lieferschein/);
  assert.match(src, /Bestellung storniert/);
});

test('admin.js: agregados têm campos i18n editáveis', () => {
  const src = fs.readFileSync(path.join(jsDir, 'admin.js'), 'utf8');
  const aggBlock = src.match(/const aggregatedFields = isAggregated \? `([\s\S]*?)` : '';/);
  assert.ok(aggBlock, 'aggregatedFields');
  const block = aggBlock[1];
  for (const field of ['nameDe', 'nameEs', 'namePl', 'descriptionDe', 'filmTypeDe', 'filmTypeEs', 'filmTypePl']) {
    assert.match(block, new RegExp(`data-field="${field}"`), `aggregated ${field}`);
  }
  assert.match(src, /if \(nameDe\) product\.nameDe = nameDe/);
  assert.match(src, /if \(filmTypePl\) product\.filmTypePl = filmTypePl/);
});
