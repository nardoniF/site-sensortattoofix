/**
 * Helpers mínimos: marcar venda marketplace como cancelada/reembolsada.
 * Só status — não apaga a venda do índice/KV.
 */

export const MARKETPLACE_FULL_REFUND_RATIO = 0.5;

export function isCancelledMarketplaceStatus(status) {
  return /cancel|invalid|refund/i.test(String(status || ''));
}

/** Estorno material (≥50% do bruto listado). */
export function hasMaterialMarketplaceRefund(sale) {
  if (!sale) return false;
  const g = Number(sale.gross || saleListedGrossFallback(sale) || 0);
  const r = Number(sale.refunds || 0);
  if (!(r > 0.009)) return false;
  if (g <= 0.009) return true;
  return r >= g * MARKETPLACE_FULL_REFUND_RATIO;
}

function saleListedGrossFallback(sale) {
  const items = sale?.items;
  if (!Array.isArray(items) || !items.length) return 0;
  return items.reduce((n, i) => {
    const qty = Number(i.quantity || i.qty || 0);
    const unit = Number(i.unitPrice || i.unit_price || 0);
    return n + unit * (qty > 0 ? qty : 0);
  }, 0);
}

/**
 * Venda marketplace cancelada/estornada para saldo Admin.
 * Status, cancelledAt, tags, payments ou estorno material.
 */
export function saleLooksCancelled(sale) {
  if (!sale) return false;
  if (sale.cancelledAt) return true;
  if (isCancelledMarketplaceStatus(sale.status)) return true;
  if (hasMaterialMarketplaceRefund(sale)) return true;
  return mlOrderLooksCancelled(sale);
}

/** Normaliza payload na leitura: status cancelled + líquido 0. */
export function healCancelledMarketplaceSale(sale) {
  if (!sale || !saleLooksCancelled(sale)) return sale;
  const gross = Number(sale.gross || saleListedGrossFallback(sale) || 0);
  const refunds = Math.max(Number(sale.refunds || 0), gross > 0 ? gross : 0);
  return {
    ...sale,
    status: isCancelledMarketplaceStatus(sale.status) ? sale.status : 'cancelled',
    cancelledAt: sale.cancelledAt || sale.dateLastUpdated || new Date().toISOString(),
    refunds,
    net: 0,
    payoutNet: 0
  };
}

/** ML: status, tags ou payments apontam cancel/refund. */
export function mlOrderLooksCancelled(order) {
  if (!order) return false;
  const st = String(order.status || '').toLowerCase();
  if (isCancelledMarketplaceStatus(st)) return true;
  const tags = Array.isArray(order.tags) ? order.tags : [];
  if (tags.some((t) => /^(cancelled|canceled|invalid|refunded)$/i.test(String(t)))) return true;
  const payments = Array.isArray(order.payments) ? order.payments : [];
  if (payments.some((p) => /refund|chargedback|charged_back|cancelled|canceled/i.test(String(p.status || '')))) {
    return true;
  }
  return false;
}

/** Valor de estorno ML (ou gross quando cancelado sem breakdown). */
export function mlRefundAmountFromOrder(order, gross) {
  const payments = Array.isArray(order?.payments) ? order.payments : [];
  let sum = 0;
  for (const p of payments) {
    const st = String(p.status || '').toLowerCase();
    if (!/refund|chargedback|charged_back/.test(st)) continue;
    const amt = Number(p.transaction_amount ?? p.total_paid_amount ?? p.totalPaid ?? 0);
    if (Number.isFinite(amt) && amt > 0) sum += amt;
  }
  if (sum > 0.009) return Math.round(sum * 100) / 100;
  if (mlOrderLooksCancelled(order)) {
    const g = Number(gross || 0);
    return g > 0 ? Math.round(g * 100) / 100 : 0;
  }
  return 0;
}

/**
 * Status efetivo pra gravar no sale ML.
 * Se o payload indica cancel mas status ainda é paid → força cancelled.
 */
export function mlEffectiveSaleStatus(order, currentStatus) {
  let status = currentStatus != null ? currentStatus : (order?.status || null);
  if (mlOrderLooksCancelled(order) && !isCancelledMarketplaceStatus(status)) {
    status = 'cancelled';
  }
  return status;
}

/** Amazon: Canceled ou estorno material (≥50% do bruto). */
export function amzEffectiveStatus(orderStatus, { hasRefund, refunds, gross } = {}) {
  const st = String(orderStatus || '').trim();
  if (/cancel/i.test(st)) return st || 'Canceled';
  const g = Number(gross || 0);
  const r = Number(refunds || 0);
  if (hasRefund && r > 0.009) {
    if (g <= 0.009 || r >= g * MARKETPLACE_FULL_REFUND_RATIO) return 'refunded';
  }
  return st || null;
}

/** Shopee: CANCELLED / IN_CANCEL ou estorno material no escrow. */
export function shopeeEffectiveStatus(orderStatus, { refunds, gross } = {}) {
  const st = String(orderStatus || '').trim();
  if (/cancel/i.test(st)) return st;
  const g = Number(gross || 0);
  const r = Number(refunds || 0);
  if (r > 0.009) {
    if (g <= 0.009 || r >= g * MARKETPLACE_FULL_REFUND_RATIO) return 'refunded';
  }
  return st || null;
}
