/** Pure store/checkout rules extracted for unit tests (coupons, frete, motoboy). */

export const COMMISSIONER_DISCOUNT_PERCENT = 10;
export const COMMISSIONER_COMMISSION_PERCENT = 20;
export const RESERVED_COUPON_CODES = new Set(['BRASIL20', 'TESTE', 'TEST', 'ADMIN', 'SENSOR', 'STF']);

export function normalizeCouponCode(code) {
  return String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function getCoupons(config) {
  return Array.isArray(config?.coupons) ? config.coupons : [];
}

export function findActiveCoupon(config, code) {
  const norm = normalizeCouponCode(code);
  if (!norm) return null;
  if (norm === 'BRASIL20') return null;
  const coupon = getCoupons(config).find(
    (c) => c.active !== false && normalizeCouponCode(c.code) === norm
  ) || null;
  return coupon;
}

export function computeCouponDiscount(valorProduto, percent) {
  const pct = Math.min(100, Math.max(0, Number(percent) || 0));
  const base = Math.max(0, Number(valorProduto) || 0);
  const discount = Math.round(base * pct / 100 * 100) / 100;
  return { percent: pct, discount: Math.min(discount, base) };
}

export function computeCouponCommission(valorProduto, commissionPercent) {
  const pct = Math.min(100, Math.max(0, Number(commissionPercent) || 0));
  const base = Math.max(0, Number(valorProduto) || 0);
  const amount = Math.round(base * pct / 100 * 100) / 100;
  return { percent: pct, amount: Math.min(amount, base) };
}

export function slugCouponId(code) {
  const norm = normalizeCouponCode(code).toLowerCase();
  return `coupon-${norm.slice(0, 28) || 'artist'}`;
}

export function commissionerAttachmentLabel(attachmentCount) {
  if (!attachmentCount) return '';
  return attachmentCount === 1
    ? 'Arte em anexo pronta para divulgação nas redes sociais'
    : `${attachmentCount} artes em anexo prontas para divulgação nas redes sociais`;
}

export function isUberMethod(method) {
  if (!method) return false;
  if (method.provider === 'uber') return true;
  return String(method.id || '').toLowerCase().includes('uber');
}

export function isUberOrder(order) {
  if (!order) return false;
  if (order.shippingProvider === 'uber') return true;
  return String(order.shippingMethodId || '').toLowerCase().includes('uber');
}

export function isMotoboyMethod(method) {
  if (!method) return false;
  if (method.provider === 'motoboy') return true;
  return String(method.id || '').toLowerCase().includes('motoboy');
}

export function isMotoboyOrder(order) {
  if (!order) return false;
  if (order.shippingProvider === 'motoboy') return true;
  return String(order.shippingMethodId || '').toLowerCase().includes('motoboy');
}

export function isSuperfreteMethod(method) {
  if (!method) return false;
  if (method.provider === 'superfrete') return true;
  const id = String(method.id || '').toLowerCase();
  return id.includes('superfrete') || id.startsWith('br-sf-');
}

export function isSuperfreteOrder(order) {
  if (!order) return false;
  if (order.shippingProvider === 'superfrete') return true;
  const id = String(order.shippingMethodId || '').toLowerCase();
  return id.includes('superfrete') || id.startsWith('br-sf-');
}

export function isParticularDeliveryOrder(order) {
  return isUberOrder(order) || isMotoboyOrder(order);
}

export function isCorreiosImportOnlyServiceCode(code) {
  const c = String(code || '').trim();
  return /^331\d{2}$/.test(c) || /^399\d{2}$/.test(c);
}

export function isIntlDocumentShipment(order) {
  if (!order) return false;
  if (order.shipmentType === 'documento' || order.internationalLensOnly) return true;
  return String(order.shippingMethodId || '').toLowerCase().includes('documento');
}

export function correiosTrackingUrl(trackingCode, storeBase) {
  const code = String(trackingCode || '').trim();
  if (!code) return '';
  const base = String(storeBase || 'https://www.sensortattoofix.com.br').replace(/\/$/, '');
  return `${base}/rastreio.html?codigo=${encodeURIComponent(code)}`;
}

export function correiosOfficialTrackingUrl(trackingCode) {
  const code = String(trackingCode || '').trim();
  if (!code) return 'https://rastreamento.correios.com.br/app/index.php';
  return `https://rastreamento.correios.com.br/app/index.php?objeto=${encodeURIComponent(code)}`;
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calcMotoboyPrice(cfg, distanceKm) {
  const billableKm = Math.ceil(Math.max(0, distanceKm));
  const raw = cfg.basePrice + billableKm * cfg.pricePerKm;
  return {
    price: Math.max(cfg.minPrice, Math.round(raw * 100) / 100),
    billableKm,
    distanceKm: Math.round(distanceKm * 10) / 10
  };
}
