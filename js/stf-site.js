/**
 * Host-aware site config — BR (.com.br) vs international (.com).
 * Loaded early on all pages; no side effects until STF_SITE.apply() runs.
 */
(function () {
  const BR_HOSTS = new Set(['sensortattoofix.com.br', 'www.sensortattoofix.com.br']);
  const COM_HOSTS = new Set(['sensortattoofix.com', 'www.sensortattoofix.com']);

  const BR_ORIGIN = 'https://www.sensortattoofix.com.br';
  const COM_ORIGIN = 'https://www.sensortattoofix.com';

  function hostname() {
    return String(location.hostname || '').toLowerCase().replace(/\.$/, '');
  }

  function isBrHost() {
    return BR_HOSTS.has(hostname());
  }

  function isIntlHost() {
    return COM_HOSTS.has(hostname());
  }

  /** Public storefront origin for current host (canonical URLs, forms, OG). */
  function siteOrigin() {
    if (isIntlHost()) return COM_ORIGIN;
    return BR_ORIGIN;
  }

  function supportEmail() {
    return isIntlHost() ? 'support@sensortattoofix.com' : 'contato@sensortattoofix.com.br';
  }

  /** Map current path to equivalent on the other host (for lang / market switches). */
  function crossHostPath(targetHost) {
    const path = location.pathname.replace(/\/index\.html$/, '/');
    const file = path.split('/').pop() || 'index.html';
    const page = file === '' || file === '/' ? 'index.html' : file;

    if (targetHost === 'intl') {
      if (path.includes('/it/')) return '/it/' + (page === 'index.html' ? '' : page).replace(/^\//, '');
      if (path.includes('/en/')) return '/' + (page === 'index.html' ? '' : page).replace(/^\//, '');
      return '/';
    }
    if (targetHost === 'br') {
      if (path.includes('/it/')) return '/it/' + page;
      return '/' + page;
    }
    return path;
  }

  function intlUrl(path) {
    const p = path || '/';
    return COM_ORIGIN + (p.startsWith('/') ? p : '/' + p);
  }

  function brUrl(path) {
    const p = path || '/';
    return BR_ORIGIN + (p.startsWith('/') ? p : '/' + p);
  }

  /**
   * Call after .com is live. Prefer Cloudflare 301; this is client fallback only.
   */
  function redirectBrIntlPathsToCom() {
    if (!window.STF_SITE_ENABLE_BR_INTL_REDIRECT) return;
    if (!isBrHost()) return;
    const path = location.pathname;
    if (!/^\/(en|it)(\/|$)/.test(path)) return;
    const rest = path.replace(/^\/(en|it)/, '') || '/';
    const target = rest === '/' || rest === '/index.html'
      ? COM_ORIGIN + (path.startsWith('/it') ? '/it/' : '/')
      : COM_ORIGIN + (path.startsWith('/it') ? '/it' : '') + rest;
    location.replace(target);
  }

  function apply() {
    redirectBrIntlPathsToCom();
  }

  window.STF_SITE = {
    BR_ORIGIN,
    COM_ORIGIN,
    isBrHost,
    isIntlHost,
    siteOrigin,
    supportEmail,
    crossHostPath,
    intlUrl,
    brUrl,
    redirectBrIntlPathsToCom,
    apply
  };
})();
