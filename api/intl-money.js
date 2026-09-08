/**
 * International list prices via World Bank GDP PPP (PA.NUS.PPP), not Frankfurter FX.
 *
 * foreign = round(brl * pppRate, decimals)
 * pppRate = PPP_foreign_LCU_per_intl$ / PPP_Brazil_LCU_per_intl$
 *
 * Source: World Bank WDI 2025 (Brazil 2.5544 BRL / intl $).
 * Result: foreign list ≈ ~2× FX for USD — dollars buy more than reais, so
 * the equivalent purchasing-power price is higher than a market conversion.
 */

/** World Bank GDP PPP factors (foreign LCU per intl $ ÷ Brazil BRL per intl $). */
export const DEFAULT_INTL_CURRENCIES = [
  {
    code: 'USD',
    label: 'Dólar (USD)',
    langs: ['en'],
    countries: ['US', 'CA', 'AU', 'NZ', 'SG', 'HK'],
    pppRate: 0.39148,
    decimals: 2,
    active: true,
    pppSource: 'World Bank PA.NUS.PPP 2025 (USA/BRA)'
  },
  {
    code: 'GBP',
    label: 'Libra (GBP)',
    langs: [],
    countries: ['GB'],
    pppRate: 0.26508,
    decimals: 2,
    active: true,
    pppSource: 'World Bank PA.NUS.PPP 2025 (GBR/BRA)'
  },
  {
    code: 'EUR',
    label: 'Euro (EUR)',
    langs: ['it', 'de', 'es', 'sl', 'fr', 'nl', 'fi'],
    countries: ['IT', 'DE', 'ES', 'SI', 'FR', 'NL', 'FI', 'AT', 'BE', 'PT', 'IE'],
    pppRate: 0.25883,
    decimals: 2,
    active: true,
    pppSource: 'World Bank PA.NUS.PPP 2025 (avg DE/IT/ES/SI/FR/NL/FI ÷ BRA)'
  },
  {
    code: 'PLN',
    label: 'Złoty (PLN)',
    langs: ['pl'],
    countries: ['PL'],
    pppRate: 0.77104,
    decimals: 2,
    active: true,
    pppSource: 'World Bank PA.NUS.PPP 2025 (POL/BRA)'
  },
  {
    code: 'SEK',
    label: 'Coroa sueca (SEK)',
    langs: ['sv'],
    countries: ['SE'],
    pppRate: 3.34656,
    decimals: 0,
    active: true,
    pppSource: 'World Bank PA.NUS.PPP 2025 (SWE/BRA)'
  },
  {
    code: 'NOK',
    label: 'Coroa norueguesa (NOK)',
    langs: ['no'],
    countries: ['NO'],
    pppRate: 3.70014,
    decimals: 0,
    active: true,
    pppSource: 'World Bank PA.NUS.PPP 2025 (NOR/BRA)'
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
  const pppSource = String(row?.pppSource || base.pppSource || '').trim();
  return {
    code,
    label: String(row?.label || base.label || code).trim() || code,
    langs,
    countries,
    pppRate: Number.isFinite(pppRate) && pppRate > 0 ? pppRate : Number(base.pppRate) || 0,
    decimals,
    active,
    ...(pppSource ? { pppSource } : {})
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
