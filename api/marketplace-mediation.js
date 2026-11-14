/**
 * Mediação ganha: venda cancelada, mas o vendedor ficou com (parte do) dinheiro.
 * Campos no payload da sale — sem migration D1.
 */

export function roundMediationMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

export function saleHasMediationCash(sale) {
  if (!sale) return false;
  if (!(sale.mediationWon === true || sale._mediationWon === true)) return false;
  return roundMediationMoney(sale.mediationAmount ?? sale._mediationAmount) > 0.009;
}

export function saleMediationAmount(sale) {
  if (!saleHasMediationCash(sale)) return 0;
  return roundMediationMoney(sale.mediationAmount ?? sale._mediationAmount);
}

/** Campos manuais a preservar no sync (não vêm do marketplace). */
export const MEDIATION_PRESERVE_KEYS = [
  'mediationWon',
  'mediationAmount',
  'mediationWonAt',
  'mediationNote'
];

export function pickMediationFields(sale) {
  if (!sale || typeof sale !== 'object') return {};
  const out = {};
  for (const k of MEDIATION_PRESERVE_KEYS) {
    if (sale[k] != null) out[k] = sale[k];
  }
  return out;
}

/**
 * Copia mediação do existing para o next quando o next não traz override explícito.
 * @param {object|null} existing
 * @param {object} next
 * @param {{ force?: boolean }} [opts] force=true sempre sobrescreve next com existing
 */
export function preserveMediationFields(existing, next, opts = {}) {
  if (!next || typeof next !== 'object') return next;
  if (!existing) return next;
  const force = opts.force === true;
  if (!force && next.mediationWon != null) return next;
  const picked = pickMediationFields(existing);
  if (!Object.keys(picked).length) return next;
  return { ...next, ...picked };
}

/**
 * Normaliza body do PATCH.
 * @returns {{ ok: true, patch: object } | { ok: false, error: string }}
 */
export function normalizeMediationPatch(body) {
  const raw = body && typeof body === 'object' ? body : {};
  const won = raw.won === true || raw.mediationWon === true
    || raw.won === 'true' || raw.mediationWon === 'true';
  const clear = raw.won === false || raw.mediationWon === false
    || raw.clear === true || raw.won === 'false';
  if (clear && !won) {
    return {
      ok: true,
      patch: {
        mediationWon: false,
        mediationAmount: 0,
        mediationWonAt: null,
        mediationNote: null
      }
    };
  }
  const amount = roundMediationMoney(raw.amount ?? raw.mediationAmount);
  if (!won) {
    return { ok: false, error: 'Informe won=true com amount, ou won=false para limpar.' };
  }
  if (!(amount > 0.009)) {
    return { ok: false, error: 'Informe o valor (R$) que entrou na mediação.' };
  }
  const note = raw.note != null || raw.mediationNote != null
    ? String(raw.note ?? raw.mediationNote).trim().slice(0, 200)
    : null;
  return {
    ok: true,
    patch: {
      mediationWon: true,
      mediationAmount: amount,
      mediationWonAt: new Date().toISOString(),
      mediationNote: note || null
    }
  };
}

export function normalizeMarketplaceChannel(channel) {
  const ch = String(channel || '').toLowerCase().trim();
  if (ch === 'ml' || ch === 'mercadolivre' || ch === 'mercado_livre') return 'mercadolivre';
  if (ch === 'amz' || ch === 'amazon') return 'amazon';
  if (ch === 'shp' || ch === 'shopee') return 'shopee';
  return '';
}
