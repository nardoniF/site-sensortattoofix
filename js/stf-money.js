/**
 * Conversão BRL → moeda do comprador (exibição). Cobrança continua em BRL.
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

  let cache = { currency: null, rate: null, at: 0 };

  function resetCache() {
    cache = { currency: null, rate: null, at: 0 };
  }

  function currencyForCountry(code) {
    const c = String(code || '').toUpperCase();
    return COUNTRY_CURRENCY[c] || 'USD';
  }

  function localeFor(currency) {
    return LOCALE[currency] || 'en-US';
  }

  function formatBRL(n) {
    return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatForeign(amount, currency) {
    const cur = currency || 'USD';
    const opts = { style: 'currency', currency: cur };
    if (cur === 'JPY' || cur === 'KRW') {
      opts.minimumFractionDigits = 0;
      opts.maximumFractionDigits = 0;
    }
    return Number(amount || 0).toLocaleString(localeFor(cur), opts);
  }

  async function loadRate(apiBase, currency) {
    const cur = String(currency || 'USD').toUpperCase();
    if (cur === 'BRL') return 1;
    if (cache.currency === cur && Date.now() - cache.at < 3600000) return cache.rate;
    const base = String(apiBase || '').replace(/\/$/, '');
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

  function formatDual(amountBrl, currency, rate) {
    const brl = formatBRL(amountBrl);
    if (!currency || currency === 'BRL' || !rate) return brl;
    const foreign = convertFromBrl(amountBrl, rate);
    if (foreign == null) return brl;
    return `${formatForeign(foreign, currency)} (${brl})`;
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
    computePayPalFee
  };
})();
