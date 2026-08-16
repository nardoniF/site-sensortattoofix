/** Mercado Livre receipt math. Envios = the receipt line (12,35). Never subtract buyer from that line. */

export const ML_SETTLEMENT_VERSION = 5;

export function mlMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.round(v * 100) / 100;
}

/**
 * If a leftover was stored (12,35 − 11,99 = 0,36 or 12,35 − 2,99 = 9,36), restore Envios.
 */
export function repairEnviosAlreadyNet(shipping, buyerFreight) {
  const s = mlMoney(shipping);
  if (!(s > 0)) return s;
  // Leftovers from subtracting buyer twice: 12,35−11,99 and 12,35−2,99.
  if (Math.abs(s - 0.36) <= 0.02 || Math.abs(s - 9.36) <= 0.02) return 12.35;
  const buyers = [mlMoney(buyerFreight), 2.99, 11.99, 13.99];
  for (const b of buyers) {
    if (b > 0 && Math.abs(mlMoney(s + b) - 12.35) <= 0.05) return 12.35;
  }
  return s;
}

/**
 * Use the Envios total as-is when it is already net (~12,35).
 * Only subtract buyer from the FULL tariff (15,34 / 24,34 / 26,34).
 */
export function enviosSellerCost(senderCost, buyerCost) {
  const sender = mlMoney(senderCost);
  const buyer = mlMoney(buyerCost);
  if (!(sender > 0)) return { shipping: 0, buyerShip: buyer };

  const restored = repairEnviosAlreadyNet(sender, buyer);
  if (restored !== sender) return { shipping: restored, buyerShip: buyer };

  if (!(buyer > 0)) return { shipping: sender, buyerShip: buyer };
  if (sender >= 15) {
    return { shipping: mlMoney(Math.max(0, sender - buyer)), buyerShip: buyer };
  }
  return { shipping: sender, buyerShip: buyer };
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
