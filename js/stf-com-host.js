/**
 * sensortattoofix.com — redirect sem www, links PT → .com.br, IT → /it/
 */
(function () {
  const BR = 'https://www.sensortattoofix.com.br';

  function isComHost() {
    const h = String(location.hostname || '').toLowerCase();
    return h === 'sensortattoofix.com' || h === 'www.sensortattoofix.com';
  }

  if (location.hostname === 'sensortattoofix.com') {
    location.replace('https://www.sensortattoofix.com' + location.pathname + location.search + location.hash);
    return;
  }

  function brPageFromHere() {
    const p = location.pathname;
    if (p === '/' || p === '' || p === '/index.html') return BR + '/';
    if (p.startsWith('/it/')) return BR + p;
    return BR + p;
  }

  function fixLangNav() {
    if (!isComHost()) return;
    document.querySelectorAll('a.nav-lang').forEach((a) => {
      if (a.querySelector('img[src*="br.png"]')) {
        a.href = brPageFromHere();
        a.title = 'Versão em português (Brasil)';
        a.setAttribute('aria-label', a.title);
      } else if (a.querySelector('img[src*="it.png"]')) {
        const raw = (a.getAttribute('href') || '').replace(/^\.\.\//, '');
        const itPath = raw.startsWith('it/') ? '/' + raw : '/it/' + raw.replace(/^it\//, '');
        a.href = itPath;
      }
    });
  }

  function init() {
    fixLangNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
