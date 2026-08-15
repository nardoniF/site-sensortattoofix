/**
 * Normalizador unificado para vendas de marketplaces / loja.
 * Produz um objeto `normalized` contendo primitives financeiras e rastros de auditoria.
 */

export function normalizeMarketplaceSale(sale = {}, config = {}) {
  // Saídas mínimas
  const normalized = {
    schema: 'NormalizedSale:v1',
    channel: (sale.channel || '').toLowerCase() || null,
    externalId: sale.externalId != null ? String(sale.externalId) : null,
    soldAt: sale.soldAt || sale.dateCreated || null,
    totals: {
      gross: null,
      shippingBuyer: null,
      shippingSellerCost: null,
      marketplaceFees: null,
      refunds: null,
      net: null
    },
    productCost: null,
    otherCosts: null,
    profit: null,
    audit: {
      origins: {}
    }
  };

  // Heurísticas: aceitar formatos comuns
  const payload = sale.payload || {};
  const rawTotal = sale.total || payload.total || sale.price || null;
  const rawShipping = sale.shipping || payload.shipping || sale.shippingPrice || null;
  const rawFees = sale.marketplaceFees || payload.marketplaceFees || sale.fees || null;

  if (rawTotal != null) normalized.totals.gross = Number(rawTotal);
  if (rawShipping != null) normalized.totals.shippingBuyer = Number(rawShipping);
  if (rawFees != null) normalized.totals.marketplaceFees = Number(rawFees);

  // Flex / seller shipping cost: try common keys
  const sellerShipping = sale.sellerShippingCost || payload.sellerShippingCost || sale.flexSellerCost || null;
  if (sellerShipping != null) normalized.totals.shippingSellerCost = Number(sellerShipping);

  // Compute net if possible
  if (normalized.totals.gross != null) {
    const shippingBuyer = Number(normalized.totals.shippingBuyer || 0);
    const fees = Number(normalized.totals.marketplaceFees || 0);
    normalized.totals.net = Number((normalized.totals.gross - fees).toFixed(2));
    // profit and costs unknown without product cost
  }

  // product cost heuristics
  const productCost = payload.productCost || sale.productCost || null;
  if (productCost != null) normalized.productCost = Number(productCost);

  // otherCosts: packing, label, etc. allow config.kitCost to provide estimation
  if (config && config.kitCost) {
    try {
      const comp = config.kitCost.components || [];
      const sum = comp.reduce((s, c) => s + (Number(c.buyPrice || 0) * (c.useQty || 0)), 0);
      normalized.otherCosts = Number((sum / (config.kitCost.yield || 1) || 0).toFixed(2));
    } catch {
      normalized.otherCosts = null;
    }
  }

  if (normalized.productCost != null) {
    const other = Number(normalized.otherCosts || 0);
    const net = Number(normalized.totals.net || 0);
    normalized.profit = Number((net - normalized.productCost - other).toFixed(2));
  }

  // Audit origins: map where we picked main numbers from
  normalized.audit.origins.gross = sale.total != null ? 'sale.total' : (payload.total != null ? 'payload.total' : null);
  normalized.audit.origins.shippingBuyer = sale.shipping != null ? 'sale.shipping' : (payload.shipping != null ? 'payload.shipping' : null);
  normalized.audit.origins.marketplaceFees = sale.marketplaceFees != null ? 'sale.marketplaceFees' : (payload.marketplaceFees != null ? 'payload.marketplaceFees' : null);
  normalized.audit.origins.sellerShippingCost = sellerShipping != null ? (sale.sellerShippingCost ? 'sale.sellerShippingCost' : 'payload.sellerShippingCost') : null;
  normalized.audit.generatedAt = (new Date()).toISOString();

  return normalized;
}

export default normalizeMarketplaceSale;
