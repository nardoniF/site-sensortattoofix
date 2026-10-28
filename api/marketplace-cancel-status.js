/**
 * Helpers mínimos: marcar venda marketplace como cancelada/reembolsada.
 * Só status — não apaga a venda do índice/KV.
 */

export const MARKETPLACE_FULL_REFUND_RATIO = 0.5;

export function isCancelledMarketplaceStatus(status) {
  return /cancel|invalid|refund/i.test(String(status || ''));
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
