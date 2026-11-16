/**
 * Flex entregue pelo vendedor (sem turbo da transportadora).
 * Continua contando como Flex; some do "a pagar" à empresa.
 */

export const FLEX_SELF_PRESERVE_KEYS = [
  'flexSelfDelivered',
  'flexSelfDeliveredAt',
  'flexSelfDeliveredNote'
];

export function isFlexSelfDelivered(sale) {
  return !!(sale && (sale.flexSelfDelivered === true || sale._flexSelfDelivered === true));
}

export function pickFlexSelfFields(sale) {
  if (!sale || typeof sale !== 'object') return {};
  const out = {};
  for (const k of FLEX_SELF_PRESERVE_KEYS) {
    if (sale[k] != null) out[k] = sale[k];
  }
  return out;
}

/**
 * Copia flag self-delivery do existing → next quando o next não traz override.
 */
export function preserveFlexSelfFields(existing, next, opts = {}) {
  if (!next || typeof next !== 'object') return next;
  if (!existing) return next;
  const force = opts.force === true;
  if (!force && next.flexSelfDelivered != null) return next;
  const picked = pickFlexSelfFields(existing);
  if (!Object.keys(picked).length) return next;
  return { ...next, ...picked };
}

/**
 * Body: { selfDelivered: true|false } ou { self: true|false } / clear.
 */
export function normalizeFlexSelfPatch(body) {
  const raw = body && typeof body === 'object' ? body : {};
  const clear = raw.selfDelivered === false || raw.self === false
    || raw.clear === true
    || raw.selfDelivered === 'false' || raw.self === 'false';
  const on = raw.selfDelivered === true || raw.self === true
    || raw.selfDelivered === 'true' || raw.self === 'true';
  if (clear && !on) {
    return {
      ok: true,
      patch: {
        flexSelfDelivered: false,
        flexSelfDeliveredAt: null,
        flexSelfDeliveredNote: null
      }
    };
  }
  if (!on) {
    return { ok: false, error: 'Informe selfDelivered=true ou selfDelivered=false.' };
  }
  const note = raw.note != null || raw.flexSelfDeliveredNote != null
    ? String(raw.note ?? raw.flexSelfDeliveredNote).trim().slice(0, 200)
    : null;
  return {
    ok: true,
    patch: {
      flexSelfDelivered: true,
      flexSelfDeliveredAt: new Date().toISOString(),
      flexSelfDeliveredNote: note || null
    }
  };
}

/** YYYY-M-D em America/Sao_Paulo a partir de soldAt/_ts. */
export function saleBrYmdParts(sale, brDatePartsFn) {
  const ts = sale?._ts
    || Date.parse(sale?.soldAt || sale?.dateCreated || sale?.date_created || '')
    || 0;
  if (!ts || !Number.isFinite(ts)) return null;
  if (typeof brDatePartsFn !== 'function') return null;
  const p = brDatePartsFn(ts);
  if (!p?.year || !p?.monthNum || !p?.day) return null;
  return {
    year: String(p.year),
    month: String(p.monthNum),
    day: Number(p.day),
    key: `${p.year}-${p.monthNum}-${p.day}`
  };
}

export function matchesFlexSelfDay(sale, year, month, day, brDatePartsFn) {
  const p = saleBrYmdParts(sale, brDatePartsFn);
  if (!p) return false;
  return p.year === String(year)
    && p.month === String(month)
    && Number(p.day) === Number(day);
}
