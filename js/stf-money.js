/**
 * BRL → visitor currency. .com uses list prices (PPP-style), not raw FX, for products.
 * Shipping may still use FX rates.
 */
window.STF_MONEY = (function () {
  const COUNTRY_CURRENCY = {
    US: 'USD', CA: 'CAD', MX: 'MXN', GB: 'GBP', IE: 'EUR', FR: 'EUR', DE: 'EUR', IT: 'EUR',
    ES: 'EUR', PT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', FI: 'EUR', SI: 'EUR', CH: 'CHF',
    SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', AU: 'AUD', NZ: 'NZD', JP: 'JPY',
    KR: 'KRW', CN: 'CNY', HK: 'HKD', SG: 'SGD', IN: 'INR', AE: 'AED', IL: 'ILS', ZA: 'ZAR',
    AR: 'ARS', CL: 'CLP', CO: 'COP', UY: 'UYU', PY: 'PYG', BR: 'BRL'
  };

  /** Page lang → charge/display currency on .com (list price / PPP). */
  const LANG_CURRENCY = {
    pt: 'BRL',
    en: 'USD',
    it: 'EUR',
    de: 'EUR',
    es: 'EUR',
    pl: 'EUR',
    sl: 'EUR',
    fr: 'EUR',
    nl: 'EUR',
    fi: 'EUR',
    sv: 'SEK',
    no: 'NOK'
  };

  const LANG_COUNTRY = {
    en: 'US', it: 'IT', de: 'DE', es: 'ES', pl: 'PL', sl: 'SI',
    fr: 'FR', nl: 'NL', sv: 'SE', no: 'NO', fi: 'FI'
  };

  const LOCALE = {
    USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', CAD: 'en-CA', AUD: 'en-AU', CHF: 'de-CH',
    JPY: 'ja-JP', BRL: 'pt-BR', SEK: 'sv-SE', NOK: 'nb-NO', PLN: 'pl-PL'
  };

  const COUNTRY_LOCALE = {
    IT: 'it-IT', US: 'en-US', GB: 'en-GB', BR: 'pt-BR', FR: 'fr-FR', NL: 'nl-NL',
    DE: 'de-DE', ES: 'es-ES', PL: 'pl-PL', SI: 'sl-SI', SE: 'sv-SE', NO: 'nb-NO', FI: 'fi-FI'
  };

  let cache = { currency: null, rate: null, at: 0 };

  function resetCache() {
    cache = { currency: null, rate: null, at: 0 };
  }

  function isIntlHost() {
    return !!(window.STF_SITE?.isIntlHost?.() || /\.sensortattoofix\.com$/i.test(location.hostname));
  }

  function pageLang() {
    if (window.STF_PAGE_LANG?.get) return window.STF_PAGE_LANG.get();
    if (window.STF_I18N?.getLang) return window.STF_I18N.getLang();
    const path = typeof location !== 'undefined' ? location.pathname : '';
    const m = path.match(/^\/(en|it|de|es|pl|sl|fr|nl|sv|no|fi)(\/|$)/i);
    if (m) return m[1].toLowerCase();
    if (isIntlHost()) return 'en';
    return 'pt';
  }

  function registryCurrencies(config) {
    const list = config?.intlCurrencies || window.STF_STORE_CONFIG?.intlCurrencies || null;
    return Array.isArray(list) ? list.filter((c) => c && c.active !== false && c.code) : null;
  }

  function currencyForCountry(code, config) {
    const c = String(code || '').toUpperCase();
    const list = registryCurrencies(config);
    if (list) {
      for (const row of list) {
        if ((row.countries || []).map((x) => String(x).toUpperCase()).includes(c)) {
          return String(row.code).toUpperCase();
        }
      }
    }
    return COUNTRY_CURRENCY[c] || 'USD';
  }

  function currencyForLang(lang, config) {
    const l = String(lang || pageLang() || 'en').toLowerCase();
    if (l === 'pt') return 'BRL';
    const list = registryCurrencies(config);
    if (list) {
      for (const row of list) {
        if ((row.langs || []).map((x) => String(x).toLowerCase()).includes(l)) {
          return String(row.code).toUpperCase();
        }
      }
    }
    return LANG_CURRENCY[l] || (isIntlHost() ? 'USD' : 'BRL');
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
    const lang = pageLang();
    if (LANG_COUNTRY[lang]) return LANG_COUNTRY[lang];
    if (isIntlHost()) return 'US';
    return 'BR';
  }

  function isVisitorLocalized() {
    if (isIntlHost()) return true;
    const path = typeof location !== 'undefined' ? location.pathname : '';
    return /^\/(en|it|de|es|pl|sl|fr|nl|sv|no|fi)(\/|$)/.test(path);
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

  function visitorDisplayCurrency(countryCode, config) {
    if (isIntlHost() || isVisitorLocalized()) {
      return currencyForLang(pageLang(), config);
    }
    const country = String(countryCode || visitorCountry()).toUpperCase();
    const cur = currencyForCountry(country, config);
    return cur === 'BRL' ? 'BRL' : cur;
  }

  function priceFieldForCurrency(currency) {
    const cur = String(currency || '').toUpperCase();
    if (!/^[A-Z]{3}$/.test(cur)) return null;
    return 'price' + cur[0] + cur.slice(1).toLowerCase();
  }

  /** List / PPP prices — not Frankfurter FX. */
  function configuredForeignPrice(product, currency, config) {
    if (!product) return null;
    const cur = String(currency || 'USD').toUpperCase();
    const pick = (key) => {
      const n = Number(product[key]);
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    const field = priceFieldForCurrency(cur);
    if (field) {
      const direct = pick(field);
      if (direct != null) return direct;
    }
    const list = registryCurrencies(config);
    const row = list && list.find((c) => String(c.code).toUpperCase() === cur);
    const brl = Number(product.price) || 0;
    if (row && brl > 0 && Number(row.pppRate) > 0) {
      const d = Number.isFinite(Number(row.decimals)) ? Math.max(0, Math.min(4, Math.floor(Number(row.decimals)))) : 2;
      const factor = 10 ** d;
      return Math.round(brl * Number(row.pppRate) * factor) / factor;
    }
    return null;
  }

  async function formatProductForVisitor(product, config, countryCode) {
    const country = String(countryCode || visitorCountry()).toUpperCase();
    const cur = visitorDisplayCurrency(country, config);
    const fixed = configuredForeignPrice(product, cur, config);
    if (fixed != null) return formatForeign(fixed, cur, country);
    return formatForVisitor(Number(product?.price) || 0, config, countryCode);
  }

  async function formatForVisitor(amountBrl, config, countryCode) {
    const country = String(countryCode || visitorCountry()).toUpperCase();
    if (isIntlHost() || isVisitorLocalized()) {
      const cur = visitorDisplayCurrency(country, config);
      if (cur === 'BRL') return formatBRL(amountBrl);
      const rate = await loadRate(apiBase(config), cur);
      if (!rate) return formatBRL(amountBrl);
      return formatForeign(convertFromBrl(amountBrl, rate), cur, country);
    }
    if (country === 'BR') return formatBRL(amountBrl);
    const cur = currencyForCountry(country, config);
    if (cur === 'BRL') return formatBRL(amountBrl);
    const rate = await loadRate(apiBase(config), cur);
    if (!rate) return formatBRL(amountBrl);
    return formatDual(amountBrl, cur, rate, country);
  }

  async function formatPrimaryForVisitor(amountBrl, config, countryCode, product) {
    if (product && (isIntlHost() || isVisitorLocalized())) {
      const text = await formatProductForVisitor(product, config, countryCode);
      return text.includes(' (') ? text.split(' (')[0] : text;
    }
    const country = String(countryCode || visitorCountry()).toUpperCase();
    if (isIntlHost() || isVisitorLocalized()) {
      const cur = visitorDisplayCurrency(country, config);
      const rate = await loadRate(apiBase(config), cur);
      if (!rate) return formatBRL(amountBrl);
      return formatForeign(convertFromBrl(amountBrl, rate), cur, country);
    }
    if (country === 'BR') return formatBRL(amountBrl);
    const cur = currencyForCountry(country, config);
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
    currencyForLang,
    pageLang,
    loadRate,
    resetCache,
    convertFromBrl,
    formatBRL,
    formatForeign,
    formatDual,
    formatPrimary,
    visitorDisplayCurrency,
    configuredForeignPrice,
    formatProductForVisitor,
    formatForVisitor,
    formatPrimaryForVisitor,
    visitorCountry,
    isIntlHost,
    apiBase,
    computePayPalFee,
    LANG_CURRENCY
  };
})();
