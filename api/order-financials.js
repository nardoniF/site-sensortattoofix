export function sumItemsProductCost(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((s, it) => {
    const qty = Number(it.quantity || it.qty || 0) || 0;
    const costUnit = Number(it.costUnit || it.buyPrice || it.cost || 0) || 0;
    return s + qty * costUnit;
  }, 0);
}

export function calculateOrderFinancials(sale, config = {}) {
  const s = sale || {};
  const totals = {
    gross: Number(s.gross || 0),
    fees: Number(s.fees || 0),
    shippingCost: Number(s.shippingCost || 0),
    buyerShipping: Number(s.buyerPaid || s.buyerShippingCost || s.buyerShipping || 0),
    refunds: Number(s.refunds || 0),
    otherFees: Number(s.otherFees || 0),
    net: Number(s.net || 0)
  };

  // product cost: prefer explicit per-item cost (costUnit), else 0
  const productCost = sumItemsProductCost(s.items || []);

  const otherCosts = Number(s.otherCosts || 0) || 0;

  const result = {
    totals,
    productCost: Math.round(productCost * 100) / 100,
    otherCosts: Math.round(otherCosts * 100) / 100,
    profit: Math.round(((totals.net || 0) - productCost - otherCosts) * 100) / 100,
    audit: []
  };

  // Basic audit entries pointing to normalized fields
  result.audit.push({ field: 'gross', value: totals.gross, source: 'sale.gross' });
  result.audit.push({ field: 'fees', value: totals.fees, source: 'sale.fees' });
  result.audit.push({ field: 'shippingCost', value: totals.shippingCost, source: 'sale.shippingCost || shipment costs API' });
  result.audit.push({ field: 'buyerShipping', value: result.totals?.buyerShipping, source: 'sale.buyerPaid / sale.payments' });
  result.audit.push({ field: 'refunds', value: totals.refunds, source: 'sale.refunds' });
  result.audit.push({ field: 'otherFees', value: totals.otherFees, source: 'sale.otherFees' });
  result.audit.push({ field: 'net', value: totals.net, source: 'sale.net (receipt calculation)' });
  result.audit.push({ field: 'productCost', value: result.productCost, source: 'items[].costUnit or item.buyPrice cost field' });
  result.audit.push({ field: 'profit', value: result.profit, source: 'calculated: net - productCost - otherCosts' });

  return result;
}
