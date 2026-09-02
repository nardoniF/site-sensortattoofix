/**
 * Detecção centralizada de idioma do site (PT, EN, IT, DE, ES, PL, SL).
 */
window.STF_PAGE_LANG = (function () {
  const LANGS = ['pt', 'en', 'it', 'de', 'es', 'pl', 'sl'];
  const INTL_PATH_LANGS = ['en', 'it', 'de', 'es', 'pl', 'sl'];
  const INTL_PATH_RE = /^\/(en|it|de|es|pl|sl)(\/|$)/;

  function isComHost() {
    const h = String(location.hostname || '').toLowerCase();
    return h === 'sensortattoofix.com' || h === 'www.sensortattoofix.com';
  }

  function fromPath() {
    const path = location.pathname;
    for (const lang of ['it', 'de', 'es', 'pl', 'sl']) {
      if (path === `/${lang}` || path.includes(`/${lang}/`)) return lang;
    }
    if (isComHost()) return 'en';
    if (path.includes('/en/')) return 'en';
    return 'pt';
  }

  function get() {
    try {
      const fromI18n = window.STF_I18N?.getLang?.();
      if (fromI18n && LANGS.includes(fromI18n)) return fromI18n;
    } catch (_) { /* ignore */ }
    // Prefixo /es/, /de/, etc. tem prioridade sobre <html lang> (evita PT errado no scaffold)
    if (INTL_PATH_RE.test(location.pathname)) return fromPath();
    const html = String(document.documentElement.lang || '').slice(0, 2).toLowerCase();
    if (LANGS.includes(html)) return html;
    return fromPath();
  }

  function isIntlPath(path) {
    const p = path || location.pathname;
    return INTL_PATH_RE.test(p);
  }

  /** Catálogo INT (.com / lente internacional) vs BR (kit nacional). */
  function catalogMarket() {
    if (isComHost()) return 'INT';
    if (isIntlPath()) return 'INT';
    return 'BR';
  }

  return { get, LANGS, INTL_PATH_LANGS, isComHost, fromPath, isIntlPath, catalogMarket };
})();
