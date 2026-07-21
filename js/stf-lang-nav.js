/**
 * Navegação entre mercados:
 * .com = EN (/) + IT (/it/)  |  .com.br = PT only
 */
(function () {
  const BR = 'https://www.sensortattoofix.com.br';
  const COM = 'https://www.sensortattoofix.com';

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
    if (p === '/it') p = '';
    else if (p.startsWith('/it/')) p = p.slice(3);
    else if (p.startsWith('/en/')) p = p.slice(3);
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

  function comItUrl() {
    const f = pageFile();
    return f === 'index.html' ? COM + '/it/' : COM + '/it/' + f;
  }

  function redirectBrIntlToCom() {
    if (!isBr()) return;
    const path = location.pathname;
    if (!/^\/(en|it)(\/|$)/.test(path)) return;
    const isIt = path.startsWith('/it');
    const rest = path.replace(/^\/(en|it)/, '') || '/';
    let target;
    if (isIt) {
      target = rest === '/' || rest === '/index.html' ? COM + '/it/' : COM + '/it' + rest;
    } else {
      target = rest === '/' || rest === '/index.html' ? COM + '/' : COM + rest;
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
        a.href = comItUrl();
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
