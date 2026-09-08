/**
 * International list prices via purchasing-power (PPP) rates vs BRL —
 * not Frankfurter market FX. foreign = round(brl * pppRate, decimals).
 */

/** Defaults calibrated so R$ 62,90 → US$ 12,99 / € 11,99 / 129 kr / 139 kr. */
export const DEFAULT_INTL_CURRENCIES = [
  {
    code: 'USD',
    label: 'Dólar (USD)',
    langs: ['en'],
    countries: ['US', 'GB', 'CA', 'AU', 'NZ', 'SG', 'HK'],
    pppRate: 0.20652,
    decimals: 2,
    active: true
  },
  {
    code: 'EUR',
    label: 'Euro (EUR)',
    langs: ['it', 'de', 'es', 'pl', 'sl', 'fr', 'nl', 'fi'],
    countries: ['IT', 'DE', 'ES', 'PL', 'SI', 'FR', 'NL', 'FI', 'AT', 'BE', 'PT', 'IE'],
    pppRate: 0.19062,
    decimals: 2,
    active: true
  },
  {
    code: 'SEK',
    label: 'Coroa sueca (SEK)',
    langs: ['sv'],
    countries: ['SE'],
    pppRate: 2.05087,
    decimals: 0,
    active: true
  },
  {
    code: 'NOK',
    label: 'Coroa norueguesa (NOK)',
    langs: ['no'],
    countries: ['NO'],
    pppRate: 2.20986,
    decimals: 0,
    active: true
  }
];

export function intlPriceField(code) {
  const c = String(code || '').toUpperCase();
  if (!/^[A-Z]{3}$/.test(c)) return null;
  return 'price' + c[0] + c.slice(1).toLowerCase();
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
  const pppRate = Number(row?.pppRate != null ? row.pppRate : base.pppRate);
  const decimalsRaw = row?.decimals != null ? row.decimals : base.decimals;
  const decimals = Number.isFinite(Number(decimalsRaw)) ? Math.max(0, Math.min(4, Math.floor(Number(decimalsRaw)))) : 2;
  const active = row?.active != null ? row.active !== false : base.active !== false;
  return {
    code,
    label: String(row?.label || base.label || code).trim() || code,
    langs,
    countries,
    pppRate: Number.isFinite(pppRate) && pppRate > 0 ? pppRate : Number(base.pppRate) || 0,
    decimals,
    active
  };
}

export function normalizeIntlCurrencies(list) {
  const byCode = new Map();
  DEFAULT_INTL_CURRENCIES.forEach((d) => byCode.set(d.code, { ...d, langs: d.langs.slice(), countries: d.countries.slice() }));
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
  return list.filter((c) => c.active !== false && Number(c.pppRate) > 0);
}

export function applyPppAmount(brl, pppRate, decimals) {
  const amount = Math.max(0, Number(brl) || 0) * Math.max(0, Number(pppRate) || 0);
  const d = Number.isFinite(Number(decimals)) ? Math.max(0, Math.min(4, Math.floor(Number(decimals)))) : 2;
  const factor = 10 ** d;
  return Math.round(amount * factor) / factor;
}

export function applyPppToProduct(product, currencies) {
  if (!product || typeof product !== 'object') return { product, changed: false };
  const brl = Number(product.price) || 0;
  if (!(brl > 0)) return { product, changed: false };
  const next = { ...product };
  let changed = false;
  activeIntlCurrencies(currencies).forEach((cur) => {
    const field = intlPriceField(cur.code);
    if (!field) return;
    const value = applyPppAmount(brl, cur.pppRate, cur.decimals);
    if (Number(next[field]) !== value) {
      next[field] = value;
      changed = true;
    }
  });
  return { product: next, changed };
}

export function applyPppToIntlProducts(products, currencies) {
  let updated = 0;
  const next = (Array.isArray(products) ? products : []).map((p) => {
    const markets = Array.isArray(p?.markets) ? p.markets.map((x) => String(x).toUpperCase()) : [];
    const isIntl = markets.includes('INT') && !markets.includes('BR');
    if (!isIntl) return p;
    const { product, changed } = applyPppToProduct(p, currencies);
    if (changed) updated += 1;
    return product;
  });
  return { products: next, updated };
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
  const row = activeIntlCurrencies(currencies).find((c) => c.code === cur);
  const brl = Number(product?.price) || 0;
  if (row && brl > 0) return applyPppAmount(brl, row.pppRate, row.decimals);
  return null;
}

export function intlPriceFieldNames(currencies) {
  return activeIntlCurrencies(currencies)
    .map((c) => intlPriceField(c.code))
    .filter(Boolean);
}
