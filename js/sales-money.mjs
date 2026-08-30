/**
 * Admin vendas — fórmulas puras (Bruto − Tarifa − Frete − Kit = líquido real).
 * Usado pelo admin clássico via globalThis.STFSalesMoney e pelos testes em api/.
 */

export const DEFAULT_KIT_COST_COMPONENTS = [
  { id: 'shipping-label', name: 'Etiqueta de envio', buyQty: 1000, buyPrice: 52.75, yieldQty: 1, useQty: 2, notes: '2 etiquetas por envio' },
  { id: 'shipping-bag', name: 'Sacola de envio', buyQty: 500, buyPrice: 32.9, yieldQty: 1, useQty: 1, notes: '' },
  { id: 'shipping-bag-sticker', name: 'Adesivo da sacola / envelope', buyQty: 1000, buyPrice: 60, yieldQty: 1, useQty: 1, notes: '1 por sacola ou envelope (1 por lente)' },
  { id: 'kit-bag', name: 'Sacola zip do kit', buyQty: 100, buyPrice: 52, yieldQty: 1, useQty: 1, notes: 'Zip que vai dentro' },
  { id: 'kit-bag-sticker', name: 'Adesivo da sacola do kit', buyQty: 1000, buyPrice: 60, yieldQty: 1, useQty: 1, notes: '1 por sacola zip' },
  { id: 'manual-sofit', name: 'Manual (sulfite)', buyQty: 1000, buyPrice: 59, yieldQty: 10, useQty: 1, notes: '10 manuais por folha sulfite' },
  { id: 'promo-print', name: 'Impresso promocional (sulfite)', buyQty: 1000, buyPrice: 59, yieldQty: 10, useQty: 1, notes: '10 impressos por folha sulfite' },
  { id: 'applicator', name: 'Haste aplicadora', buyQty: 200, buyPrice: 26.35, yieldQty: 1, useQty: 0.5, notes: 'Meia haste por kit' },
  { id: 'potentiator', name: 'Potencializador (primer)', buyQty: 100, buyPrice: 188, yieldQty: 1, useQty: 0.2, notes: '1/5 ml por kit' },
  { id: 'potentiator-glass', name: 'Vidro do potencializador', buyQty: 100, buyPrice: 149.8, yieldQty: 1, useQty: 1, notes: 'Frasco 1 ml' },
  { id: 'alcohol-wipe', name: 'Lenço com álcool isopropílico', buyQty: 500, buyPrice: 35.92, yieldQty: 1, useQty: 1, notes: '' },
  { id: 'film', name: 'Película / lente', buyQty: 10, buyPrice: 49, yieldQty: 30, useQty: 1, notes: '10 folhas a R$ 49; 30 lentes por folha' },
  { id: 'sticker-cut', name: 'Adesivo + recorte das lentes', buyQty: 10, buyPrice: 271, yieldQty: 30, useQty: 1, notes: 'Adesivo e recorte juntos; 10×30 = 300 lentes' }
];

export const DEFAULT_KIT_COST_INTL_COMPONENTS = [
  { id: 'intl-envelope', name: 'Envelope internacional', buyQty: 100, buyPrice: 23, yieldQty: 1, useQty: 1, notes: 'Não é sacola — envelope' },
  { id: 'intl-envelope-sticker', name: 'Adesivo do envelope', buyQty: 1000, buyPrice: 60, yieldQty: 1, useQty: 1, notes: 'Mesmo adesivo 1000×R$ 60; 1 por lente' },
  { id: 'intl-sulfite', name: 'Carta sulfite', buyQty: 1000, buyPrice: 59, yieldQty: 1, useQty: 1, notes: '1 folha sulfite impressa por envio' },
  { id: 'film', name: 'Película / lente', buyQty: 10, buyPrice: 49, yieldQty: 30, useQty: 1, notes: '10 folhas a R$ 49; 30 lentes por folha' },
  { id: 'sticker-cut', name: 'Adesivo + recorte das lentes', buyQty: 10, buyPrice: 271, yieldQty: 30, useQty: 1, notes: 'Adesivo e recorte juntos; 300 lentes' }
];

export const MONTH_LABELS = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
};

export function roundMoney(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

export function brDateParts(ts) {
  const d = new Date(ts || Date.now());
  const tz = { timeZone: 'America/Sao_Paulo' };
  const year = d.toLocaleString('pt-BR', { ...tz, year: 'numeric' });
  const monthNum = d.toLocaleString('pt-BR', { ...tz, month: '2-digit' });
  let monthName = d.toLocaleString('pt-BR', { ...tz, month: 'long' });
  monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const day = d.toLocaleString('pt-BR', { ...tz, day: '2-digit' });
  const dateKey = `${year}-${monthNum}-${day}`;
  const dayLabel = d.toLocaleString('pt-BR', { ...tz, weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const dayLabelCap = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);
  return { year, monthNum, monthName, day, dateKey, dayLabel: dayLabelCap };
}

export function mlShippingUnresolved(sale) {
  const ch = String(sale?.channel || '').toLowerCase();
  if (ch !== 'mercadolivre' && ch !== 'ml') return false;
  if (sale?.mlFlex || /flex|self_service/i.test(String(sale?.logisticType || ''))) return false;
  const src = String(sale?.shippingSource || '');
  if (src === 'unresolved') return true;
  if (sale?.shippingCost == null || sale?.shippingCost === '') return true;
  if (!(Number(sale.shippingCost) > 0.04) && !src) return true;
  return false;
}

export function saleListedGross(sale) {
  const ch = String(sale?.channel || '').toLowerCase();
  if (ch === 'mercadolivre' || ch === 'ml') {
    const items = sale?.items;
    if (Array.isArray(items) && items.length) {
      const sum = items.reduce((n, i) => {
        const qty = Number(i.quantity || i.qty || 0);
        const unit = Number(i.unitPrice || i.unit_price || 0);
        return n + unit * (qty > 0 ? qty : 0);
      }, 0);
      if (sum > 0) return roundMoney(sum);
    }
  }
  return roundMoney(sale?.gross || 0);
}

export function saleShippingCost(sale, config = null) {
  if (mlShippingUnresolved(sale)) return 0;
  const s = roundMoney(sale?.shippingCost || 0);
  const ch = String(sale?.channel || '').toLowerCase();
  const isMl = ch === 'mercadolivre' || ch === 'ml';
  const flexList = Number(sale?.mlFlexListCost || config?.mlFlexShippingCost || 0);
  const estorno = Number(sale?.mlEstorno || 0);
  const isFlex = sale?.mlFlex
    || /flex|self_service/i.test(String(sale?.logisticType || ''))
    || (isMl && flexList > 0 && Math.abs(s - flexList) <= 0.06);
  if (isMl && isFlex && flexList > 0) {
    return roundMoney(Math.max(0, flexList - estorno));
  }
  if (ch === 'shopee') return s;
  if (isMl && (Math.abs(s - 0.36) <= 0.02 || Math.abs(s - 9.36) <= 0.02)) return 0;
  return s;
}

export function marketplaceSaleNet(sale, config = null) {
  const g = saleListedGross(sale);
  const f = Number(sale?.fees || 0);
  const sh = saleShippingCost(sale, config);
  const rf = Number(sale?.refunds || 0);
  const ot = Number(sale?.otherFees || 0);
  return roundMoney(g - f - sh - rf - ot);
}

export function saleKitQty(sale) {
  if (Array.isArray(sale?.items) && sale.items.length) {
    const q = sale.items.reduce((n, i) => n + (Number(i.quantity || i.qty || 0) || 0), 0);
    if (q > 0) return q;
  }
  return Math.max(1, Number(sale?.qty || sale?.quantity || 1) || 1);
}

export function kitComponentUnitCost(c) {
  const buyQty = Number(c?.buyQty);
  const buyPrice = Number(c?.buyPrice) || 0;
  const yieldQty = Number(c?.yieldQty) > 0 ? Number(c.yieldQty) : 1;
  const useQty = Number(c?.useQty) || 0;
  if (!(buyQty > 0)) return 0;
  return (buyPrice / buyQty / yieldQty) * useQty;
}

export function kitUnitCostFromComponents(comps) {
  if (!Array.isArray(comps) || !comps.length) return 0;
  return comps.reduce((sum, c) => sum + kitComponentUnitCost(c), 0);
}

export function defaultKitCostComponents(kind) {
  const src = kind === 'intl' ? DEFAULT_KIT_COST_INTL_COMPONENTS : DEFAULT_KIT_COST_COMPONENTS;
  return src.map((c) => ({ ...c }));
}

export function kitCostComponentsFrom(raw, kind = 'br') {
  const fallback = defaultKitCostComponents(kind);
  if (raw == null) return fallback;
  const list = Array.isArray(raw?.components) ? raw.components : (Array.isArray(raw) ? raw : null);
  if (!Array.isArray(list) || !list.length) return fallback;
  const mapped = list.map((c, i) => ({
    id: String(c?.id || `kit-comp-${i + 1}`).trim() || `kit-comp-${i + 1}`,
    name: String(c?.name || '').trim(),
    buyQty: Number(c?.buyQty) > 0 ? Number(c.buyQty) : 0,
    buyPrice: Number(c?.buyPrice) >= 0 ? Number(c.buyPrice) : 0,
    yieldQty: Number(c?.yieldQty) > 0 ? Number(c.yieldQty) : 1,
    useQty: Number(c?.useQty) >= 0 ? Number(c.useQty) : 0,
    notes: String(c?.notes || '').trim()
  }));
  return mapped.some((c) => c.buyPrice > 0) ? mapped : fallback;
}

export function isIntlSale(sale) {
  if (sale?.market === 'INT' || sale?._market === 'INT') return true;
  const cur = String(sale?.currency || '').toUpperCase();
  return cur === 'USD' || cur === 'EUR';
}

export function kitUnitCostFromConfig(config, sale) {
  const intl = isIntlSale(sale);
  const comps = kitCostComponentsFrom(
    intl ? config?.kitCostIntl : config?.kitCost,
    intl ? 'intl' : 'br'
  );
  return kitUnitCostFromComponents(comps);
}

export function saleProductCost(sale, config = null) {
  return roundMoney(kitUnitCostFromConfig(config, sale) * saleKitQty(sale));
}

export function effectiveSaleNet(sale, config = null) {
  return roundMoney(marketplaceSaleNet(sale, config) - saleProductCost(sale, config));
}

export function saleMoneyParts(sale, config = null) {
  const marketplace = marketplaceSaleNet(sale, config);
  const cogs = saleProductCost(sale, config);
  return {
    gross: saleListedGross(sale),
    fees: Number(sale?.fees || 0),
    shipping: saleShippingCost(sale, config),
    refunds: Number(sale?.refunds || 0),
    otherFees: Number(sale?.otherFees || 0),
    cogs,
    marketplace,
    net: roundMoney(marketplace - cogs)
  };
}

export function isMlFlexSale(sale) {
  const ch = String(sale?.channel || '').toLowerCase();
  if (ch !== 'mercadolivre' && ch !== 'ml') return false;
  if (sale?.mlFlex || sale?.shippingSource === 'flex') return true;
  return /flex|self_service/i.test(String(sale?.logisticType || ''));
}

export function flexCompanyOwed(sale, config = null) {
  const list = Number(sale?.mlFlexListCost || config?.mlFlexShippingCost || 0);
  if (list > 0) return roundMoney(list);
  const ship = Number(sale?.shippingCost || sale?._shipping || 0);
  const bonus = Number(sale?.mlEstorno || 0);
  return roundMoney(ship + bonus);
}

export function orderPaypalFee(order) {
  return roundMoney(Number(order?.paypalFee) || 0);
}

/**
 * What the customer actually paid. Recovers the original total when a previous
 * frete edit shrank `total` to (produto + novo frete) instead of moving the
 * difference onto the product.
 */
export function inferCustomerPaidTotal(order) {
  if (order?.totalPaid != null && Number(order.totalPaid) > 0) {
    return roundMoney(order.totalPaid);
  }
  const vp = roundMoney(order?.valorProduto);
  const frete = roundMoney(order?.frete);
  const origFrete = order?.freteOriginal != null ? roundMoney(order.freteOriginal) : frete;
  const fee = orderPaypalFee(order);
  const total = roundMoney(order?.total);
  const shrunk = roundMoney(vp + frete + fee);
  const fromOrigFrete = roundMoney(vp + origFrete + fee);
  if (origFrete > frete + 0.009 && Math.abs(total - shrunk) <= 0.05) {
    return fromOrigFrete;
  }
  if (total > 0) return total;
  return fromOrigFrete;
}

export function orderNeedsFreteProductRepair(order) {
  if (!order) return false;
  const origFrete = order.freteOriginal != null ? roundMoney(order.freteOriginal) : null;
  if (origFrete == null) return false;
  const frete = roundMoney(order.frete);
  if (!(origFrete > frete + 0.009)) return false;
  const fee = orderPaypalFee(order);
  const paid = inferCustomerPaidTotal(order);
  const remainder = roundMoney(Math.max(0, paid - frete - fee));
  const adjust = roundMoney(order.productAdjust || 0);
  const expectedVp = roundMoney(Math.max(0, remainder + adjust));
  return Math.abs(roundMoney(order.valorProduto) - expectedVp) > 0.05
    || Math.abs(roundMoney(order.total) - paid) > 0.05
    || order.totalPaid == null;
}

export function applyOrderFreteAccounting(order, newFrete, opts = {}) {
  if (!order) return order;
  const now = opts.now || new Date().toISOString();
  const rounded = roundMoney(newFrete);
  const fee = orderPaypalFee(order);
  const oldFrete = roundMoney(order.frete);

  if (order.freteOriginal == null && rounded !== oldFrete) {
    order.freteOriginal = oldFrete;
  }
  if (order.valorProdutoAtCheckout == null && order.valorProduto != null) {
    order.valorProdutoAtCheckout = roundMoney(order.valorProduto);
  }

  const paid = inferCustomerPaidTotal(order);
  order.totalPaid = paid;
  if (order.freteOriginal == null) order.freteOriginal = oldFrete;

  order.frete = rounded;

  let adjust = order.productAdjust != null ? roundMoney(order.productAdjust) : 0;
  if (opts.productAdjust !== undefined) {
    adjust = roundMoney(opts.productAdjust);
    order.productAdjust = adjust;
  }

  const remainder = roundMoney(Math.max(0, paid - rounded - fee));

  if (opts.valorProduto !== undefined) {
    const vp = roundMoney(Math.max(0, Number(opts.valorProduto)));
    order.valorProduto = vp;
    order.productAdjust = roundMoney(vp - remainder);
  } else {
    order.valorProduto = roundMoney(Math.max(0, remainder + adjust));
  }

  order.total = paid;
  order.freteAdjustedAt = now;
  return order;
}

export function storeOrderListedGross(order) {
  return inferCustomerPaidTotal(order);
}

export function aggregateFlexOwedByMonth(sales, config = null) {
  const map = new Map();
  (sales || []).forEach((s) => {
    if (!isMlFlexSale(s) || !s._ts) return;
    const p = brDateParts(s._ts);
    const key = `${p.year}-${p.monthNum}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        year: p.year,
        monthNum: p.monthNum,
        name: MONTH_LABELS[p.monthNum] || p.monthName,
        count: 0,
        owed: 0,
        bonus: 0,
        net: 0
      });
    }
    const row = map.get(key);
    const owed = flexCompanyOwed(s, config);
    const bonus = roundMoney(Number(s.mlEstorno || 0));
    row.count += 1;
    row.owed += owed;
    row.bonus += bonus;
    row.net += roundMoney(owed - bonus);
  });
  return [...map.values()]
    .map((r) => ({
      ...r,
      owed: roundMoney(r.owed),
      bonus: roundMoney(r.bonus),
      net: roundMoney(r.net)
    }))
    .sort((a, b) => String(b.key).localeCompare(String(a.key)));
}

const exportsForBrowser = {
  roundMoney,
  brDateParts,
  mlShippingUnresolved,
  saleListedGross,
  saleShippingCost,
  marketplaceSaleNet,
  saleKitQty,
  kitComponentUnitCost,
  kitUnitCostFromComponents,
  defaultKitCostComponents,
  kitCostComponentsFrom,
  isIntlSale,
  kitUnitCostFromConfig,
  saleProductCost,
  effectiveSaleNet,
  saleMoneyParts,
  isMlFlexSale,
  flexCompanyOwed,
  aggregateFlexOwedByMonth,
  orderPaypalFee,
  inferCustomerPaidTotal,
  orderNeedsFreteProductRepair,
  applyOrderFreteAccounting,
  storeOrderListedGross,
  MONTH_LABELS,
  DEFAULT_KIT_COST_COMPONENTS,
  DEFAULT_KIT_COST_INTL_COMPONENTS
};

if (typeof globalThis !== 'undefined') {
  globalThis.STFSalesMoney = exportsForBrowser;
}
