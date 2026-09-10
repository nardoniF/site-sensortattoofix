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
  assert.equal(langFromCountry('FR'), 'fr');
  assert.equal(langFromCountry('NL'), 'nl');
  assert.equal(langFromCountry('SE'), 'sv');
  assert.equal(langFromCountry('NO'), 'no');
  assert.equal(langFromCountry('FI'), 'fi');
  assert.equal(langFromCountry('MC'), 'fr');
  assert.equal(langFromCountry('XX'), null);
});

test('Accept-Language', () => {
  assert.equal(langFromAcceptLanguage('pl-PL,pl;q=0.9,en;q=0.8'), 'pl');
  assert.equal(langFromAcceptLanguage('de-AT,de;q=0.9'), 'de');
  assert.equal(langFromAcceptLanguage('en-US,en;q=0.9'), 'en');
  assert.equal(langFromAcceptLanguage('fr-FR,fr;q=0.9'), 'fr');
  assert.equal(langFromAcceptLanguage('nl-NL,nl;q=0.9'), 'nl');
  assert.equal(langFromAcceptLanguage('sv-SE,sv;q=0.9'), 'sv');
  assert.equal(langFromAcceptLanguage('nb-NO,nb;q=0.9'), 'no');
  assert.equal(langFromAcceptLanguage('fi-FI,fi;q=0.9'), 'fi');
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
  assert.equal(localeRedirectTarget({ ...base, preferred: 'pt' }), null);
  assert.equal(
    localeRedirectTarget({ ...base, preferred: 'pl' }),
    'https://www.sensortattoofix.com/pl/'
  );
  assert.equal(
    localeRedirectTarget({ ...base, preferred: 'de', search: '?utm=1' }),
    'https://www.sensortattoofix.com/de/?utm=1'
  );
  assert.equal(
    localeRedirectTarget({ ...base, preferred: 'fr' }),
    'https://www.sensortattoofix.com/fr/'
  );
  assert.equal(
    localeRedirectTarget({ ...base, preferred: 'nl' }),
    'https://www.sensortattoofix.com/nl/'
  );
  assert.equal(
    localeRedirectTarget({ ...base, preferred: 'sv' }),
    'https://www.sensortattoofix.com/sv/'
  );
  assert.equal(
    localeRedirectTarget({ ...base, preferred: 'no' }),
    'https://www.sensortattoofix.com/no/'
  );
  assert.equal(
    localeRedirectTarget({ ...base, preferred: 'fi' }),
    'https://www.sensortattoofix.com/fi/'
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

test('localeRedirectTarget never auto-bounces between .com and .com.br', () => {
  assert.equal(
    localeRedirectTarget({
      hostOrigin: 'https://www.sensortattoofix.com.br',
      pathname: '/',
      search: '',
      br: true,
      preferred: 'pl'
    }),
    null
  );
  assert.equal(
    localeRedirectTarget({
      hostOrigin: 'https://www.sensortattoofix.com.br',
      pathname: '/',
      search: '',
      br: true,
      preferred: 'en'
    }),
    null
  );
  assert.equal(
    localeRedirectTarget({
      hostOrigin: 'https://www.sensortattoofix.com',
      pathname: '/',
      search: '',
      br: false,
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
