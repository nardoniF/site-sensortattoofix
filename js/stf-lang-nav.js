/**
 * Navegação entre mercados:
 * .com = EN (/) + IT/DE/ES/PL (/it/, /de/, /es/, /pl/)  |  .com.br = PT + /en/ + /it/ + /de/ + /es/ + /pl/
 */
(function () {
  const BR = 'https://www.sensortattoofix.com.br';
  const COM = 'https://www.sensortattoofix.com';
  const INTL_LANGS = ['it', 'de', 'es', 'pl'];

  function host() {
    return String(location.hostname || '').toLowerCase();
  }

  function isCom() {
    const h = host();
    return h === 'sensortattoofix.com' || h === 'www.sensortattoofix.com';
  }

  function isBr() {
    return host().includes('sensortattoofix.com.br');
  }

  if (host() === 'sensortattoofix.com') {
    location.replace(COM + location.pathname + location.search + location.hash);
    return;
  }

  function pageFile() {
    let p = location.pathname.replace(/\/$/, '');
    for (const lang of INTL_LANGS) {
      if (p === `/${lang}`) return 'index.html';
      if (p.startsWith(`/${lang}/`)) {
        p = p.slice(lang.length + 1);
        break;
      }
    }
    if (p.startsWith('/en/')) p = p.slice(3);
    if (!p || p === '/index.html') return 'index.html';
    const last = p.split('/').pop();
    return last && last.includes('.') ? last : 'index.html';
  }

  function brPtUrl() {
    const f = pageFile();
    return f === 'index.html' ? BR + '/' : BR + '/' + f;
  }

  function comEnUrl() {
    const f = pageFile();
    return f === 'index.html' ? COM + '/' : COM + '/' + f;
  }

  function comLangUrl(lang) {
    const f = pageFile();
    return f === 'index.html' ? `${COM}/${lang}/` : `${COM}/${lang}/${f}`;
  }

  function brLangUrl(lang) {
    const f = pageFile();
    return f === 'index.html' ? `${BR}/${lang}/` : `${BR}/${lang}/${f}`;
  }

  function redirectBrIntlToCom() {
    if (!isBr()) return;
    const path = location.pathname;
    const m = path.match(/^\/(en|it|de|es|pl)(\/|$)/);
    if (!m) return;
    const lang = m[1];
    const rest = path.replace(/^\/(en|it|de|es|pl)/, '') || '/';
    let target;
    if (lang === 'en') {
      target = rest === '/' || rest === '/index.html' ? COM + '/' : COM + rest;
    } else {
      target = rest === '/' || rest === '/index.html' ? `${COM}/${lang}/` : `${COM}/${lang}${rest}`;
    }
    location.replace(target + location.search + location.hash);
  }

  function fixLangNav() {
    document.querySelectorAll('a.nav-lang').forEach((a) => {
      if (a.querySelector('img[src*="br.png"]')) {
        if (isCom()) {
          a.href = brPtUrl();
          a.title = 'Portuguese (Brazil)';
          a.setAttribute('aria-label', 'Portuguese (Brazil)');
        }
      } else if (a.querySelector('img[src*="it.png"]')) {
        a.href = isCom() ? comLangUrl('it') : brLangUrl('it');
      } else if (a.querySelector('img[src*="de.png"]')) {
        a.href = isCom() ? comLangUrl('de') : brLangUrl('de');
      } else if (a.querySelector('img[src*="es.png"]')) {
        a.href = isCom() ? comLangUrl('es') : brLangUrl('es');
      } else if (a.querySelector('img[src*="pl.png"]')) {
        a.href = isCom() ? comLangUrl('pl') : brLangUrl('pl');
      } else if (a.querySelector('img[src*="us.png"]')) {
        a.href = comEnUrl();
      }
    });
  }

  redirectBrIntlToCom();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixLangNav);
  } else {
    fixLangNav();
  }
})();
