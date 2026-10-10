/**
 * Status efetivo para cancel/refund de marketplace (Amazon / Shopee).
 * A UI Admin dropa vendas cujo status casa com /cancel|invalid|refund/.
 */

/** Fração mínima do bruto estornada para tratar como cancelada nas entradas. */
export const MARKETPLACE_FULL_REFUND_RATIO = 0.5;

export function isDroppedMarketplaceSaleStatus(status) {
  return /cancel|invalid|refund/i.test(String(status || ''));
}

/**
 * Amazon: OrderStatus Canceled, ou estorno material via Finances
 * (pedido pode continuar "Shipped" depois do reembolso).
 */
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

/**
 * Shopee: CANCELLED / IN_CANCEL, ou estorno material no escrow
 * (COMPLETED com seller_return_refund alto).
 */
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

/** Incluir SN no sync Shopee (só UNPAID fica de fora). */
export function shopeeOrderSnWorthSyncing(orderStatus) {
  const st = String(orderStatus || '').trim();
  if (!st) return true;
  return st !== 'UNPAID';
}

/** Processar detalhe Shopee (cancelados entram; só UNPAID pula). */
export function shopeeOrderDetailWorthSaving(orderStatus) {
  return shopeeOrderSnWorthSyncing(orderStatus);
}
