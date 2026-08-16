/** Shopee seller receipt: produto, taxas, frete 0 (etiqueta não é desconto), renda. */

export function roundMoney(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

export function shopeeOrderIncome(escrow) {
  if (!escrow || typeof escrow !== 'object') return {};
  if (escrow.order_income && typeof escrow.order_income === 'object') return escrow.order_income;
  return escrow;
}

/**
 * Recibo Shopee: Subtotal de Frete do vendedor é 0 nestes pedidos.
 * actual_shipping_fee é etiqueta, não a linha de frete do vendedor.
 * Taxas e Encargos = produto − renda − estorno.
 */
export function shopeeReceiptFromEscrow(gross, escrowAmt, refunds = 0) {
  const g = roundMoney(gross);
  const r = roundMoney(refunds);
  if (escrowAmt == null || !(g > 0)) {
    return { fees: 0, shippingCost: 0, net: g, ok: false };
  }
  const net = roundMoney(escrowAmt);
  const fees = roundMoney(Math.max(0, g - net - r));
  return { fees, shippingCost: 0, net, ok: true };
}
