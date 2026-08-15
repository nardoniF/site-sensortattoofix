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
    mlFlex: null,
    mlEstorno: null,
    mlFlexListCost: null,
    productCost: null,
    otherCosts: null,
    profit: null,
    audit: {
      origins: {}
    }
  };

  // Heurísticas: aceitar formatos comuns
  const payload = sale.payload || {};
  const rawTotal = sale.gross || sale.total || payload.total || sale.price || null;
  const rawShipping = sale.shippingCost || sale.buyerShippingCost || sale.buyerPaid || sale.shipping || payload.shipping || sale.shippingPrice || null;
  const rawFees = sale.fees || sale.marketplaceFees || payload.marketplaceFees || null;

  if (rawTotal != null) normalized.totals.gross = Number(rawTotal);
  if (rawShipping != null) normalized.totals.shippingBuyer = Number(rawShipping);
  if (rawFees != null) normalized.totals.marketplaceFees = Number(rawFees);

  // Flex / seller shipping cost: try common keys and MercadoLivre flex fields
  const mlFlexListCost = (sale.mlFlexListCost != null) ? sale.mlFlexListCost : (payload.mlFlexListCost != null ? payload.mlFlexListCost : null);
  const mlEstorno = (sale.mlEstorno != null) ? Number(sale.mlEstorno) : (payload.mlEstorno != null ? Number(payload.mlEstorno) : null);
  const sellerShipping = sale.sellerShippingCost || payload.sellerShippingCost || sale.flexSellerCost || mlFlexListCost || null;
  if (sellerShipping != null) {
    // if we have flex list cost and an estorno, shipping seller cost is list - estorno
    if (mlFlexListCost != null && mlEstorno != null) {
      normalized.totals.shippingSellerCost = Number((Number(mlFlexListCost) - Number(mlEstorno)).toFixed(2));
    } else {
      normalized.totals.shippingSellerCost = Number(sellerShipping);
    }
  }

  // expose ml-specific flags
  normalized.mlFlex = (sale.mlFlex != null) ? sale.mlFlex : (payload.mlFlex != null ? payload.mlFlex : null);
  normalized.mlEstorno = mlEstorno != null ? Number(mlEstorno) : null;
  normalized.mlFlexListCost = mlFlexListCost != null ? Number(mlFlexListCost) : null;

  // Compute net if possible
  if (normalized.totals.gross != null) {
    const fees = Number(normalized.totals.marketplaceFees || 0);
    // Prefer explicit net if available on sale
    if (sale.net != null) normalized.totals.net = Number(sale.net);
    else normalized.totals.net = Number((normalized.totals.gross - fees).toFixed(2));
  } else if (sale.net != null) {
    normalized.totals.net = Number(sale.net);
  }

  // refunds fallback
  normalized.totals.refunds = sale.refunds != null ? Number(sale.refunds) : (payload.refunds != null ? Number(payload.refunds) : 0);

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
  normalized.audit.origins.gross = sale.gross != null ? 'sale.gross' : (sale.total != null ? 'sale.total' : (payload.total != null ? 'payload.total' : null));
  normalized.audit.origins.shippingBuyer = sale.shippingCost != null ? 'sale.shippingCost' : (sale.buyerPaid != null ? 'sale.buyerPaid' : (payload.shipping != null ? 'payload.shipping' : null));
  normalized.audit.origins.marketplaceFees = sale.fees != null ? 'sale.fees' : (sale.marketplaceFees != null ? 'sale.marketplaceFees' : (payload.marketplaceFees != null ? 'payload.marketplaceFees' : null));
  normalized.audit.origins.sellerShippingCost = mlFlexListCost != null ? 'sale.mlFlexListCost' : (sellerShipping != null ? (sale.sellerShippingCost ? 'sale.sellerShippingCost' : 'payload.sellerShippingCost') : null);
  normalized.audit.origins.mlEstorno = mlEstorno != null ? (sale.mlEstorno != null ? 'sale.mlEstorno' : 'payload.mlEstorno') : null;
  normalized.audit.generatedAt = (new Date()).toISOString();

  return normalized;
}

export default normalizeMarketplaceSale;
