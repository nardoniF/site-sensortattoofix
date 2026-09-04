import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  langFromCountry,
  langFromAcceptLanguage,
  resolvePreferredLang,
  localeRedirectTarget,
  isComEnglishEntryPath,
  isBotUserAgent,
  prefLangFromCookie
} from './geo-lang.js';

test('country → lang', () => {
  assert.equal(langFromCountry('PL'), 'pl');
  assert.equal(langFromCountry('DE'), 'de');
  assert.equal(langFromCountry('BR'), 'pt');
  assert.equal(langFromCountry('SI'), 'sl');
  assert.equal(langFromCountry('XX'), null);
});

test('Accept-Language', () => {
  assert.equal(langFromAcceptLanguage('pl-PL,pl;q=0.9,en;q=0.8'), 'pl');
  assert.equal(langFromAcceptLanguage('de-AT,de;q=0.9'), 'de');
  assert.equal(langFromAcceptLanguage('en-US,en;q=0.9'), 'en');
});

test('cookie wins over country', () => {
  assert.equal(resolvePreferredLang({
    cookieHeader: 'stf_pref_lang=en; other=1',
    country: 'PL',
    acceptLanguage: 'pl'
  }), 'en');
  assert.equal(prefLangFromCookie('a=1; stf_pref_lang=pl'), 'pl');
});

test('localeRedirectTarget .com home', () => {
  const base = {
    hostOrigin: 'https://www.sensortattoofix.com',
    pathname: '/',
    search: '',
    br: false
  };
  assert.equal(localeRedirectTarget({ ...base, preferred: 'en' }), null);
  assert.equal(
    localeRedirectTarget({ ...base, preferred: 'pl' }),
    'https://www.sensortattoofix.com/pl/'
  );
  assert.equal(
    localeRedirectTarget({ ...base, preferred: 'de', search: '?utm=1' }),
    'https://www.sensortattoofix.com/de/?utm=1'
  );
  assert.equal(
    localeRedirectTarget({ ...base, preferred: 'pt' }),
    'https://www.sensortattoofix.com.br/'
  );
});

test('localeRedirectTarget .com loja.html', () => {
  assert.equal(
    localeRedirectTarget({
      hostOrigin: 'https://www.sensortattoofix.com',
      pathname: '/loja.html',
      search: '',
      br: false,
      preferred: 'pl'
    }),
    'https://www.sensortattoofix.com/pl/loja.html'
  );
  assert.equal(isComEnglishEntryPath('/loja.html'), true);
  assert.equal(isComEnglishEntryPath('/pl/loja.html'), false);
});

test('localeRedirectTarget .com.br home intl', () => {
  assert.equal(
    localeRedirectTarget({
      hostOrigin: 'https://www.sensortattoofix.com.br',
      pathname: '/',
      search: '',
      br: true,
      preferred: 'pl'
    }),
    'https://www.sensortattoofix.com/pl/'
  );
  assert.equal(
    localeRedirectTarget({
      hostOrigin: 'https://www.sensortattoofix.com.br',
      pathname: '/',
      search: '',
      br: true,
      preferred: 'pt'
    }),
    null
  );
});

test('bots skipped helper', () => {
  assert.equal(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)'), true);
  assert.equal(isBotUserAgent('Mozilla/5.0 (Macintosh) Chrome/120'), false);
});

test('proxy importa geo-lang', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('./stf-com-proxy.js', import.meta.url), 'utf8');
  assert.match(src, /from '\.\/geo-lang\.js'/);
  assert.match(src, /localeRedirectTarget/);
  assert.match(src, /CF-IPCountry/);
});
