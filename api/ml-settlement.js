/** Mercado Livre receipt math. Envios = what the seller pays, never buyer freight twice. */

export const ML_SETTLEMENT_VERSION = 4;

export function mlMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.round(v * 100) / 100;
}

/**
 * Recibo Envios = tarifa cheia − pagamento do comprador.
 * senders.cost sometimes is already that net (12,35), sometimes the full tariff (15,34 / 24,34 / 26,34).
 */
export function enviosSellerCost(senderCost, buyerCost) {
  const sender = mlMoney(senderCost);
  const buyer = mlMoney(buyerCost);
  if (!(sender > 0)) return { shipping: 0, buyerShip: buyer };
  if (!(buyer > 0)) return { shipping: sender, buyerShip: buyer };
  const diff = mlMoney(sender - buyer);
  // 12,35 − 11,99 = 0,36 or 12,35 − 2,99 = 9,36 → sender was already net Envios.
  if (diff < 5) return { shipping: sender, buyerShip: buyer };
  // Typical Mini Envios net is ~12,35 (< 15). Do not subtract buyer again.
  if (sender < 15) return { shipping: sender, buyerShip: buyer };
  return { shipping: Math.max(0, diff), buyerShip: buyer };
}

/** Flex is paid outside ML: configured price minus receipt credit (estorno). */
export function flexSellerCost(flexListCost, estorno) {
  const list = mlMoney(flexListCost);
  return mlMoney(Math.max(0, list - mlMoney(estorno)));
}

export function receiptPayout(gross, fees, shipping) {
  return mlMoney(mlMoney(gross) - mlMoney(fees) - mlMoney(shipping));
}

export function liquidMatchesReceipt(gross, fees, shipping, receiptTotal) {
  return Math.abs(receiptPayout(gross, fees, shipping) - mlMoney(receiptTotal)) <= 0.06;
}
