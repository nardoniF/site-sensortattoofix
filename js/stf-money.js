/**
 * BRL → visitor currency display. On .com, checkout is charged in USD.
 */
window.STF_MONEY = (function () {
  const COUNTRY_CURRENCY = {
    US: 'USD', CA: 'CAD', MX: 'MXN', GB: 'GBP', IE: 'EUR', FR: 'EUR', DE: 'EUR', IT: 'EUR',
    ES: 'EUR', PT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', CH: 'CHF', SE: 'SEK', NO: 'NOK',
    DK: 'DKK', PL: 'PLN', CZ: 'CZK', AU: 'AUD', NZ: 'NZD', JP: 'JPY', KR: 'KRW', CN: 'CNY',
    HK: 'HKD', SG: 'SGD', IN: 'INR', AE: 'AED', IL: 'ILS', ZA: 'ZAR', AR: 'ARS', CL: 'CLP',
    CO: 'COP', UY: 'UYU', PY: 'PYG', BR: 'BRL'
  };

  const LOCALE = {
    USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', CAD: 'en-CA', AUD: 'en-AU', CHF: 'de-CH',
    JPY: 'ja-JP', BRL: 'pt-BR'
  };

  const COUNTRY_LOCALE = { IT: 'it-IT', US: 'en-US', GB: 'en-GB', BR: 'pt-BR' };

  let cache = { currency: null, rate: null, at: 0 };

  function resetCache() {
    cache = { currency: null, rate: null, at: 0 };
  }

  function isIntlHost() {
    return !!(window.STF_SITE?.isIntlHost?.() || /\.sensortattoofix\.com$/i.test(location.hostname));
  }

  function currencyForCountry(code) {
    const c = String(code || '').toUpperCase();
    return COUNTRY_CURRENCY[c] || 'USD';
  }

  function localeFor(currency, countryCode) {
    const byCountry = COUNTRY_LOCALE[String(countryCode || '').toUpperCase()];
    if (byCountry) return byCountry;
    return LOCALE[currency] || 'en-US';
  }

  function apiBase(config) {
    return String(config?.api?.baseUrl || window.CONFIG_BOOTSTRAP?.configApiUrl || '').replace(/\/$/, '');
  }

  function visitorCountry() {
    if (isIntlHost()) {
      const path = typeof location !== 'undefined' ? location.pathname : '';
      if (path.includes('/it/')) return 'IT';
      return 'US';
    }
    const path = typeof location !== 'undefined' ? location.pathname : '';
    if (path.includes('/it/')) return 'IT';
    if (path.includes('/en/')) return 'US';
    return 'BR';
  }

  function isVisitorLocalized() {
    if (isIntlHost()) return true;
    const path = typeof location !== 'undefined' ? location.pathname : '';
    return path.includes('/en/') || path.includes('/it/');
  }

  function formatBRL(n) {
    return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatForeign(amount, currency, countryCode) {
    const cur = currency || 'USD';
    const opts = { style: 'currency', currency: cur };
    if (cur === 'JPY' || cur === 'KRW') {
      opts.minimumFractionDigits = 0;
      opts.maximumFractionDigits = 0;
    }
    return Number(amount || 0).toLocaleString(localeFor(cur, countryCode), opts);
  }

  async function loadRate(apiBaseUrl, currency) {
    const cur = String(currency || 'USD').toUpperCase();
    if (cur === 'BRL') return 1;
    if (cache.currency === cur && Date.now() - cache.at < 3600000) return cache.rate;
    const base = String(apiBaseUrl || '').replace(/\/$/, '');
    if (!base) return null;
    try {
      const res = await fetch(`${base}/fx/rate?to=${encodeURIComponent(cur)}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      const rate = Number(data.rate);
      if (!Number.isFinite(rate) || rate <= 0) return null;
      cache = { currency: cur, rate, at: Date.now() };
      return rate;
    } catch {
      return null;
    }
  }

  /** Valor em BRL × rate = moeda estrangeira (1 BRL = rate USD). */
  function convertFromBrl(amountBrl, rate) {
    if (!rate || rate <= 0) return null;
    return Math.round(Number(amountBrl || 0) * rate * 100) / 100;
  }

  function formatDual(amountBrl, currency, rate, countryCode) {
    const brl = formatBRL(amountBrl);
    if (!currency || currency === 'BRL' || !rate) return brl;
    const foreign = convertFromBrl(amountBrl, rate);
    if (foreign == null) return brl;
    return `${formatForeign(foreign, currency, countryCode)} (${brl})`;
  }

  function formatPrimary(amountBrl, currency, rate, countryCode) {
    const dual = formatDual(amountBrl, currency, rate, countryCode);
    return dual.includes(' (') ? dual.split(' (')[0] : dual;
  }

  async function formatForVisitor(amountBrl, config, countryCode) {
    const country = String(countryCode || visitorCountry()).toUpperCase();
    if (isIntlHost()) {
      const rate = await loadRate(apiBase(config), 'USD');
      if (!rate) return formatBRL(amountBrl);
      return formatForeign(convertFromBrl(amountBrl, rate), 'USD', country);
    }
    if (country === 'BR' && !isVisitorLocalized()) return formatBRL(amountBrl);
    const cur = currencyForCountry(country);
    if (cur === 'BRL') return formatBRL(amountBrl);
    const rate = await loadRate(apiBase(config), cur);
    if (!rate) return formatBRL(amountBrl);
    return formatDual(amountBrl, cur, rate, country);
  }

  async function formatPrimaryForVisitor(amountBrl, config, countryCode) {
    const country = String(countryCode || visitorCountry()).toUpperCase();
    if (isIntlHost()) {
      const rate = await loadRate(apiBase(config), 'USD');
      if (!rate) return formatBRL(amountBrl);
      return formatForeign(convertFromBrl(amountBrl, rate), 'USD', country);
    }
    if (country === 'BR' && !isVisitorLocalized()) return formatBRL(amountBrl);
    const cur = currencyForCountry(country);
    if (cur === 'BRL') return formatBRL(amountBrl);
    const rate = await loadRate(apiBase(config), cur);
    if (!rate) return formatBRL(amountBrl);
    return formatPrimary(amountBrl, cur, rate, country);
  }

  function computePayPalFee(subtotalBrl, cfg) {
    const paypal = cfg?.payments?.paypal || {};
    const pct = Number(paypal.feePercent);
    const fixed = Number(paypal.feeFixedBRL);
    const percent = Number.isFinite(pct) && pct >= 0 ? pct : 5;
    const fixedBrl = Number.isFinite(fixed) && fixed >= 0 ? fixed : 0.6;
    const base = Math.max(0, Number(subtotalBrl) || 0);
    return Math.round((base * percent / 100 + fixedBrl) * 100) / 100;
  }

  return {
    currencyForCountry,
    loadRate,
    resetCache,
    convertFromBrl,
    formatBRL,
    formatForeign,
    formatDual,
    formatPrimary,
    formatForVisitor,
    formatPrimaryForVisitor,
    visitorCountry,
    isIntlHost,
    apiBase,
    computePayPalFee
  };
})();
