/**
 * International list prices via moderated purchasing-power rates vs BRL —
 * not raw Frankfurter FX, and not full World Bank GDP PPP (~2× FX).
 *
 * foreign = round(brl * pppRate, decimals)
 *
 * Method (2025):
 *   fullPpp = World Bank PA.NUS.PPP (LCU_foreign / LCU_Brazil)
 *   fx      = market rate BRL→foreign
 *   pppRate = 0.65 * fx + 0.35 * fullPpp
 *   (~35% of the way from FX toward full PPP — commercial “poder de compra”
 *   without doubling the BR price in dollars.)
 *
 * Cover / Where-to-buy uses optical-lens-intl (smartwatch), whose R$ reference
 * must match the BR smartwatch kit (currently R$ 72,90) — not the smartband.
 */

const FX_ANCHOR = {
  USD: 0.19508,
  EUR: 0.16785,
  SEK: 1.8736,
  NOK: 1.8084,
  PLN: 0.7235,
  GBP: 0.14418
};

/** World Bank GDP PPP factors (foreign / Brazil), 2025. */
const FULL_PPP = {
  USD: 0.39148,
  EUR: 0.25883,
  SEK: 3.34656,
  NOK: 3.70014,
  PLN: 0.77104,
  GBP: 0.26508
};

/** Share of the FX→full-PPP gap to apply (0 = FX only, 1 = full World Bank). */
const PPP_BLEND = 0.35;

function blendedRate(code) {
  const fx = FX_ANCHOR[code];
  const full = FULL_PPP[code];
  if (!(fx > 0) || !(full > 0)) return full || fx || 0;
  return Math.round(((1 - PPP_BLEND) * fx + PPP_BLEND * full) * 100000) / 100000;
}

export const DEFAULT_INTL_CURRENCIES = [
  {
    code: 'USD',
    label: 'Dólar (USD)',
    langs: ['en'],
    countries: ['US', 'CA', 'AU', 'NZ', 'SG', 'HK'],
    pppRate: blendedRate('USD'),
    decimals: 2,
    active: true,
    pppSource: `Blend ${PPP_BLEND * 100}% WB PPP + FX (not full 2× PPP)`
  },
  {
    code: 'GBP',
    label: 'Libra (GBP)',
    langs: [],
    countries: ['GB'],
    pppRate: blendedRate('GBP'),
    decimals: 2,
    active: true,
    pppSource: `Blend ${PPP_BLEND * 100}% WB PPP + FX`
  },
  {
    code: 'EUR',
    label: 'Euro (EUR)',
    langs: ['it', 'de', 'es', 'sl', 'fr', 'nl', 'fi'],
    countries: ['IT', 'DE', 'ES', 'SI', 'FR', 'NL', 'FI', 'AT', 'BE', 'PT', 'IE'],
    pppRate: blendedRate('EUR'),
    decimals: 2,
    active: true,
    pppSource: `Blend ${PPP_BLEND * 100}% WB PPP + FX`
  },
  {
    code: 'PLN',
    label: 'Złoty (PLN)',
    langs: ['pl'],
    countries: ['PL'],
    pppRate: blendedRate('PLN'),
    decimals: 2,
    active: true,
    pppSource: `Blend ${PPP_BLEND * 100}% WB PPP + FX`
  },
  {
    code: 'SEK',
    label: 'Coroa sueca (SEK)',
    langs: ['sv'],
    countries: ['SE'],
    pppRate: blendedRate('SEK'),
    decimals: 0,
    active: true,
    pppSource: `Blend ${PPP_BLEND * 100}% WB PPP + FX`
  },
  {
    code: 'NOK',
    label: 'Coroa norueguesa (NOK)',
    langs: ['no'],
    countries: ['NO'],
    pppRate: blendedRate('NOK'),
    decimals: 0,
    active: true,
    pppSource: `Blend ${PPP_BLEND * 100}% WB PPP + FX`
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

/**
 * Keep INT smartwatch lens R$ in sync with the BR smartwatch kit.
 * Cover / price tags must never use smartband pricing.
 */
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
