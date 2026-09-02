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
    if (!/^\/(en|it|de|es|pl|sl)(\/|$)/.test(path)) return;
    const m = path.match(/^\/(en|it|de|es|pl|sl)(\/|$)/);
    const lang = m[1];
    const rest = path.replace(/^\/(en|it|de|es|pl|sl)/, '') || '/';
    let target;
    if (lang === 'en') {
      target = rest === '/' || rest === '/index.html' ? COM_ORIGIN + '/' : COM_ORIGIN + rest;
    } else {
      target = rest === '/' || rest === '/index.html' ? `${COM_ORIGIN}/${lang}/` : `${COM_ORIGIN}/${lang}${rest}`;
    }
    location.replace(target);
  }

  /**
   * Catalog market: BR = .com.br, INT = .com (gringa).
   * Product.markets: ['BR'], ['INT'], or ['BR','INT'].
   */
  function catalogMarket() {
    if (window.STF_PAGE_LANG?.catalogMarket) return window.STF_PAGE_LANG.catalogMarket();
    if (isIntlHost()) return 'INT';
    const path = String(location.pathname || '');
    if (/^\/(en|it|de|es|pl|sl)(\/|$)/.test(path)) return 'INT';
    return 'BR';
  }

  function normalizeProductMarkets(product) {
    const raw = product?.markets;
    if (Array.isArray(raw) && raw.length) {
      return [...new Set(raw.map((m) => String(m || '').trim().toUpperCase()).filter(Boolean))];
    }
    const id = String(product?.id || product?.slug || '');
    if (product?.aggregated === true) return ['BR'];
    if (id === 'kit-sensor-tattoofix' || id === 'kit') return ['BR'];
    if (/optical.?lens|lens-intl|sensortattoofix-optical/i.test(id)) return ['INT'];
    return ['BR', 'INT'];
  }

  function productVisibleOnMarket(product, market) {
    const m = String(market || catalogMarket()).toUpperCase();
    return normalizeProductMarkets(product).includes(m);
  }

  function filterProductsForMarket(products, market) {
    return (products || []).filter((p) => productVisibleOnMarket(p, market || catalogMarket()));
  }

  function apply() {
    redirectBrIntlPathsToCom();
    try {
      document.documentElement.dataset.stfMarket = catalogMarket();
    } catch (_) { /* ignore */ }
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
    catalogMarket,
    normalizeProductMarkets,
    productVisibleOnMarket,
    filterProductsForMarket,
    apply
  };
})();