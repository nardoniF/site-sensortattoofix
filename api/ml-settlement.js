/** Mercado Livre Envios = senders[].cost from /shipments/{id}/costs. Never a fixed freight. */

export const ML_SETTLEMENT_VERSION = 9;

/** @deprecated kept only so old tests/imports do not break — never use as a default freight. */
export const ML_ENVIOS_NET = 12.35;

export function mlMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.round(v * 100) / 100;
}

/** Leftovers from the wrong field (buyer subtracted twice). Treat as missing. */
export function repairEnviosAlreadyNet(shipping, buyerFreight) {
  if (shipping == null || shipping === '') return null;
  const s = mlMoney(shipping);
  if (Math.abs(s - 0.36) <= 0.02 || Math.abs(s - 9.36) <= 0.02) return null;
  return s;
}

/** senders.cost is already the receipt Envios line. Do not subtract buyer. */
export function enviosSellerCost(senderCost, buyerCost) {
  const hasSender = senderCost != null && senderCost !== '' && Number.isFinite(Number(senderCost));
  return {
    shipping: hasSender ? mlMoney(senderCost) : null,
    buyerShip: mlMoney(buyerCost),
    found: hasSender
  };
}

/** Last resort if costs payload has no sender.cost: receipt Envios = gross − fee − liquid. */
export function impliedEnviosFromReceipt(gross, fees, liquid) {
  const g = mlMoney(gross);
  const f = mlMoney(fees);
  const liq = mlMoney(liquid);
  if (!(g > 0) || !(liq > 0)) return null;
  const v = mlMoney(g - f - liq);
  if (v > 0.04 && v < g - 0.04) return v;
  return null;
}

/** Flex is paid outside ML: configured price minus receipt credit (estorno). */
export function flexSellerCost(flexListCost, estorno) {
  const list = mlMoney(flexListCost);
  return mlMoney(Math.max(0, list - mlMoney(estorno)));
}

/** Bônus Flex no /shipments/{id}/costs (senders.discounts.promoted_amount). Não soma save+desconto. */
export function mlFlexBonusFromCosts(data) {
  let bonus = 0;
  for (const s of data?.senders || []) {
    let fromDisc = 0;
    for (const d of s.discounts || []) {
      fromDisc += mlMoney(d.promoted_amount ?? d.amount ?? d.discount);
    }
    bonus += fromDisc > 0.01 ? fromDisc : mlMoney(s.save);
  }
  return mlMoney(bonus);
}

export function receiptPayout(gross, fees, shipping) {
  return mlMoney(mlMoney(gross) - mlMoney(fees) - mlMoney(shipping == null ? 0 : shipping));
}

export function liquidMatchesReceipt(gross, fees, shipping, receiptTotal) {
  return Math.abs(receiptPayout(gross, fees, shipping) - mlMoney(receiptTotal)) <= 0.06;
}

/** True when ML Envios freight is known (including real R$ 0,00 with source). */
export function mlShippingResolved(sale) {
  const src = String(sale?.shippingSource || '');
  if (src === 'unresolved' || src === '') {
    if (sale?.shippingCost == null || sale?.shippingCost === '') return false;
    // Legacy: 0 with no source = not resolved
    if (!(mlMoney(sale.shippingCost) > 0.04) && !src) return false;
  }
  if (src === 'envios' || src === 'payment_fallback' || src === 'flex' || src === 'payment') {
    return sale?.shippingCost != null && sale?.shippingCost !== '';
  }
  return mlMoney(sale?.shippingCost) > 0.04;
}
