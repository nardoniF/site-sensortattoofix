/**
 * International list prices = (BRL × (1 + markup%)) × FX.
 * Markup is applied once in BRL, then converted — never per-currency markup.
 * Replaces the old PPP / purchasing-power model.
 */

export const DEFAULT_INTL_MARKUP_PERCENT = 65;

/** Currency registry: langs/countries/decimals for .com — rates come from FX. */
export const DEFAULT_INTL_CURRENCIES = [
  {
    code: 'USD',
    label: 'Dólar (USD)',
    langs: ['en'],
    countries: ['US', 'CA', 'AU', 'NZ', 'SG', 'HK'],
    decimals: 2,
    active: true
  },
  {
    code: 'GBP',
    label: 'Libra (GBP)',
    langs: [],
    countries: ['GB'],
    decimals: 2,
    active: true
  },
  {
    code: 'EUR',
    label: 'Euro (EUR)',
    langs: ['it', 'de', 'es', 'sl', 'fr', 'nl', 'fi'],
    countries: ['IT', 'DE', 'ES', 'SI', 'FR', 'NL', 'FI', 'AT', 'BE', 'PT', 'IE'],
    decimals: 2,
    active: true
  },
  {
    code: 'PLN',
    label: 'Złoty (PLN)',
    langs: ['pl'],
    countries: ['PL'],
    decimals: 2,
    active: true
  },
  {
    code: 'SEK',
    label: 'Coroa sueca (SEK)',
    langs: ['sv'],
    countries: ['SE'],
    decimals: 0,
    active: true
  },
  {
    code: 'NOK',
    label: 'Coroa norueguesa (NOK)',
    langs: ['no'],
    countries: ['NO'],
    decimals: 0,
    active: true
  }
];

export function intlPriceField(code) {
  const c = String(code || '').toUpperCase();
  if (!/^[A-Z]{3}$/.test(c)) return null;
  return 'price' + c[0] + c.slice(1).toLowerCase();
}

export function normalizeMarkupPercent(raw, fallback = DEFAULT_INTL_MARKUP_PERCENT) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n * 100) / 100;
}

export function intlBaseBrl(priceBrl, markupPercent) {
  const brl = Math.max(0, Number(priceBrl) || 0);
  const markup = normalizeMarkupPercent(markupPercent);
  return Math.round(brl * (1 + markup / 100) * 100) / 100;
}

export function applyFxAmount(amountBrl, fxRate, decimals) {
  const amount = Math.max(0, Number(amountBrl) || 0) * Math.max(0, Number(fxRate) || 0);
  const d = Number.isFinite(Number(decimals)) ? Math.max(0, Math.min(4, Math.floor(Number(decimals)))) : 2;
  const factor = 10 ** d;
  return Math.round(amount * factor) / factor;
}

/** @deprecated use applyFxAmount — kept for older call sites during migration */
export function applyPppAmount(brl, rate, decimals) {
  return applyFxAmount(brl, rate, decimals);
}

export function normalizeIntlCurrencyRow(row, fallback) {
  const base = fallback && typeof fallback === 'object' ? fallback : {};
  const code = String(row?.code || base.code || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
  if (code.length !== 3) return null;
  const langs = Array.isArray(row?.langs)
    ? row.langs.map((l) => String(l || '').toLowerCase().trim()).filter(Boolean)
    : Array.isArray(base.langs)
      ? base.langs.slice()
      : [];
  const countries = Array.isArray(row?.countries)
    ? row.countries.map((c) => String(c || '').toUpperCase().trim()).filter(Boolean)
    : Array.isArray(base.countries)
      ? base.countries.slice()
      : [];
  const decimalsRaw = row?.decimals != null ? row.decimals : base.decimals;
  const decimals = Number.isFinite(Number(decimalsRaw)) ? Math.max(0, Math.min(4, Math.floor(Number(decimalsRaw)))) : 2;
  const active = row?.active != null ? row.active !== false : base.active !== false;
  return {
    code,
    label: String(row?.label || base.label || code).trim() || code,
    langs,
    countries,
    decimals,
    active
  };
}

export function normalizeIntlCurrencies(list) {
  const byCode = new Map();
  DEFAULT_INTL_CURRENCIES.forEach((d) =>
    byCode.set(d.code, {
      ...d,
      langs: d.langs.slice(),
      countries: d.countries.slice()
    })
  );
  (Array.isArray(list) ? list : []).forEach((row) => {
    const code = String(row?.code || '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 3);
    const normalized = normalizeIntlCurrencyRow(row, byCode.get(code) || { code });
    if (!normalized) return;
    byCode.set(normalized.code, normalized);
  });
  return Array.from(byCode.values()).filter((c) => c.code);
}

export function activeIntlCurrencies(configOrList) {
  const list = Array.isArray(configOrList)
    ? normalizeIntlCurrencies(configOrList)
    : normalizeIntlCurrencies(configOrList?.intlCurrencies);
  return list.filter((c) => c.active !== false);
}

/**
 * @param {object} product
 * @param {array} currencies
 * @param {Record<string, number>} fxRates map CODE → rate (1 BRL = rate foreign)
 */
export function applyMarkupFxToProduct(product, currencies, fxRates) {
  if (!product || typeof product !== 'object') return { product, changed: false };
  const brl = Number(product.price) || 0;
  if (!(brl > 0)) return { product, changed: false };
  const markup = normalizeMarkupPercent(
    product.intlMarkupPercent != null ? product.intlMarkupPercent : DEFAULT_INTL_MARKUP_PERCENT
  );
  const base = intlBaseBrl(brl, markup);
  const next = { ...product, intlMarkupPercent: markup, intlBaseBrl: base };
  let changed =
    Number(product.intlMarkupPercent) !== markup || Number(product.intlBaseBrl) !== base;
  const rates = fxRates && typeof fxRates === 'object' ? fxRates : {};
  activeIntlCurrencies(currencies).forEach((cur) => {
    const field = intlPriceField(cur.code);
    if (!field) return;
    const rate = Number(rates[cur.code]);
    if (!(rate > 0)) return;
    const value = applyFxAmount(base, rate, cur.decimals);
    if (Number(next[field]) !== value) {
      next[field] = value;
      changed = true;
    }
  });
  return { product: next, changed };
}

export function applyMarkupFxToIntlProducts(products, currencies, fxRates) {
  let updated = 0;
  const next = (Array.isArray(products) ? products : []).map((p) => {
    const markets = Array.isArray(p?.markets) ? p.markets.map((x) => String(x).toUpperCase()) : [];
    const isIntl = markets.includes('INT') && !markets.includes('BR');
    if (!isIntl) {
      const cleaned = { ...p };
      delete cleaned.intlMarkupPercent;
      delete cleaned.intlBaseBrl;
      return cleaned;
    }
    const withMarkup = {
      ...p,
      intlMarkupPercent: normalizeMarkupPercent(
        p.intlMarkupPercent != null ? p.intlMarkupPercent : DEFAULT_INTL_MARKUP_PERCENT
      )
    };
    const { product, changed } = applyMarkupFxToProduct(withMarkup, currencies, fxRates);
    if (changed) updated += 1;
    return product;
  });
  return { products: next, updated };
}

/** @deprecated PPP removed — alias to markup+FX when rates provided */
export function applyPppToProduct(product, currencies, fxRates) {
  return applyMarkupFxToProduct(product, currencies, fxRates || {});
}

/** @deprecated PPP removed */
export function applyPppToIntlProducts(products, currencies, fxRates) {
  return applyMarkupFxToIntlProducts(products, currencies, fxRates || {});
}

export function syncOpticalIntlBrlFromBrKit(products) {
  const list = Array.isArray(products) ? products.map((p) => ({ ...p })) : [];
  const brKit = list.find((p) => {
    const id = String(p?.id || p?.slug || '');
    return id === 'kit-sensor-tattoofix' || id === 'kit';
  });
  const optical = list.find((p) => String(p?.id || p?.slug || '') === 'optical-lens-intl');
  if (!brKit || !optical) return { products: list, synced: false };
  const brl = Number(brKit.price);
  if (!(brl > 0) || Number(optical.price) === brl) {
    return { products: list, synced: false };
  }
  optical.price = brl;
  return { products: list, synced: true };
}

export function currencyForLocaleFromRegistry(locale, currencies) {
  const lang = String(locale || '').toLowerCase();
  if (!lang || lang === 'pt') return 'BRL';
  const list = activeIntlCurrencies(currencies);
  for (const cur of list) {
    if ((cur.langs || []).includes(lang)) return cur.code;
  }
  return 'USD';
}

export function currencyForCountryFromRegistry(countryCode, currencies, fallbackMap) {
  const code = String(countryCode || '').toUpperCase();
  if (!code || code === 'BR') return 'BRL';
  const list = activeIntlCurrencies(currencies);
  for (const cur of list) {
    if ((cur.countries || []).includes(code)) return cur.code;
  }
  if (fallbackMap && typeof fallbackMap === 'object') {
    return fallbackMap[code] || 'USD';
  }
  return 'USD';
}

export function productListPriceFromRegistry(product, currency, currencies) {
  const cur = String(currency || 'USD').toUpperCase();
  const field = intlPriceField(cur);
  if (field) {
    const v = Number(product?.[field]);
    if (Number.isFinite(v) && v > 0) return v;
  }
  return null;
}

export function intlPriceFieldNames(currencies) {
  return activeIntlCurrencies(currencies)
    .map((c) => intlPriceField(c.code))
    .filter(Boolean);
}
