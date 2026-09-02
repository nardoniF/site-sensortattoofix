/**
 * Navegação entre mercados + seletor compacto de idiomas (PT, EN, IT, DE, ES, PL, SL).
 * .com = EN (/) + IT/DE/ES/PL/SL (/it/, /de/, /es/, /pl/, /sl/)  |  .com.br = PT + /en/ + /it/ + /de/ + /es/ + /pl/ + /sl/
 */
(function () {
  const BR = 'https://www.sensortattoofix.com.br';
  const COM = 'https://www.sensortattoofix.com';
  const INTL_LANGS = ['it', 'de', 'es', 'pl', 'sl'];
  const ALL_LANGS = ['pt', 'en', 'it', 'de', 'es', 'pl', 'sl'];

  const LANG_META = {
    pt: { code: 'PT', flag: 'br', label: 'Português (Brasil)' },
    en: { code: 'EN', flag: 'us', label: 'English' },
    it: { code: 'IT', flag: 'it', label: 'Italiano' },
    de: { code: 'DE', flag: 'de', label: 'Deutsch' },
    es: { code: 'ES', flag: 'es', label: 'Español' },
    pl: { code: 'PL', flag: 'pl', label: 'Polski' },
    sl: { code: 'SL', flag: 'si', label: 'Slovenščina' },
  };

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
    for (const lang of ['en', ...INTL_LANGS]) {
      if (p === `/${lang}`) return 'index.html';
      if (p.startsWith(`/${lang}/`)) {
        p = p.slice(lang.length + 1);
        break;
      }
    }
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

  function langUrl(lang) {
    if (lang === 'pt') return brPtUrl();
    if (lang === 'en') return comEnUrl();
    return isCom() ? comLangUrl(lang) : brLangUrl(lang);
  }

  function currentLang() {
    const path = location.pathname;
    if (isCom()) {
      for (const lang of INTL_LANGS) {
        if (path === `/${lang}` || path.startsWith(`/${lang}/`)) return lang;
      }
      return 'en';
    }
    const m = path.match(/^\/(en|it|de|es|pl|sl)(\/|$)/);
    return m ? m[1] : 'pt';
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

  function flagImg(lang) {
    const meta = LANG_META[lang];
    return `<img src="https://flagcdn.com/w20/${meta.flag}.png" width="20" height="15" alt="">`;
  }

  let menuId = 0;

  function buildSwitcher(stack) {
    const active = currentLang();
    const activeMeta = LANG_META[active];
    const id = 'stf-lang-menu-' + (++menuId);

    stack.classList.add('nav-lang-switcher');
    stack.innerHTML = '';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-lang nav-lang-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', id);
    toggle.setAttribute('aria-label', activeMeta.label);
    toggle.innerHTML =
      flagImg(active) +
      ` <span>${activeMeta.code}</span>` +
      ' <i class="fas fa-chevron-down nav-lang-chevron" aria-hidden="true"></i>';

    const menu = document.createElement('ul');
    menu.id = id;
    menu.className = 'nav-lang-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;

    ALL_LANGS.forEach((lang) => {
      const meta = LANG_META[lang];
      const li = document.createElement('li');
      li.setAttribute('role', 'none');
      const a = document.createElement('a');
      a.href = langUrl(lang);
      a.className = 'nav-lang' + (lang === active ? ' nav-lang--active' : '');
      a.setAttribute('role', 'menuitem');
      a.title = meta.label;
      a.setAttribute('aria-label', meta.label);
      a.innerHTML = flagImg(lang) + ` <span>${meta.code}</span>`;
      if (lang === active) a.setAttribute('aria-current', 'true');
      li.appendChild(a);
      menu.appendChild(li);
    });

    stack.appendChild(toggle);
    stack.appendChild(menu);

    function closeMenu() {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      stack.classList.remove('nav-lang-switcher--open');
    }

    function openMenu() {
      menu.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      stack.classList.add('nav-lang-switcher--open');
    }

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (menu.hidden) openMenu();
      else closeMenu();
    });

    document.addEventListener('click', (e) => {
      if (!stack.contains(e.target)) closeMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  function initLangNav() {
    document.querySelectorAll('.nav-lang-stack').forEach(buildSwitcher);
  }

  redirectBrIntlToCom();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLangNav);
  } else {
    initLangNav();
  }
})();
