/** Mercado Livre Envios = senders[].cost from /shipments/{id}/costs. Never a fixed 12,35. */

export const ML_SETTLEMENT_VERSION = 8;
export const ML_ENVIOS_NET = 12.35;

export function mlMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.round(v * 100) / 100;
}

/** Leftovers from the wrong field (buyer subtracted twice). Treat as missing. */
export function repairEnviosAlreadyNet(shipping, buyerFreight) {
  const s = mlMoney(shipping);
  if (Math.abs(s - 0.36) <= 0.02 || Math.abs(s - 9.36) <= 0.02) return 0;
  return s;
}

/** senders.cost is already the receipt Envios line. Do not subtract buyer. */
export function enviosSellerCost(senderCost, buyerCost) {
  return { shipping: mlMoney(senderCost), buyerShip: mlMoney(buyerCost) };
}

/** Last resort if costs payload has no sender.cost: receipt Envios = gross − fee − liquid. */
export function impliedEnviosFromReceipt(gross, fees, liquid) {
  const v = mlMoney(mlMoney(gross) - mlMoney(fees) - mlMoney(liquid));
  if (v > 0.04 && v < mlMoney(gross) - 0.04) return v;
  return 0;
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
  return mlMoney(mlMoney(gross) - mlMoney(fees) - mlMoney(shipping));
}

export function liquidMatchesReceipt(gross, fees, shipping, receiptTotal) {
  return Math.abs(receiptPayout(gross, fees, shipping) - mlMoney(receiptTotal)) <= 0.06;
}
