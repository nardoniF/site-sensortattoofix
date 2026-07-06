/**
 * API Sensor Tattoo Fix — Cloudflare Worker
 * PIX (Mercado Pago) + Cartão (Asaas) + PayPal (intl) · WhatsApp · Correios · Uber Direct · Pedidos
 */

const ALLOWED_ORIGINS = [
  'https://sensortattoofix.com.br',
  'https://www.sensortattoofix.com.br',
  'https://api.sensortattoofix.com.br',
  'http://localhost:8080',
  'http://127.0.0.1:5500'
];
const CONFIG_KEY = 'store-config';
const SITE_CATALOG_URL = 'https://www.sensortattoofix.com.br/data/store-config.json';
const ORDERS_INDEX = 'orders:index';
const CLICKS_INDEX = 'clicks:index';
const CLICKS_BLOB = 'clicks:blob';
const CLICKS_MAX = 2500;
const FEEDBACK_BLOB = 'feedback:blob';
const FEEDBACK_MAX = 500;
const CLICK_TTL_SEC = 90 * 86400;
const CLICK_LOG_KEY_FALLBACK = 'stf_ck_7f3a9e2b1c';
const LEGACY_API_BASE = 'https://sensortattoofix-payments.sensortattoofix.workers.dev';
const CANONICAL_API_BASE = 'https://api.sensortattoofix.com.br';
const CUSTOMER_SESSION_TTL = 2592000; // 30 dias

const DEFAULT_CONFIG = {
  product: {
    name: 'Kit Sensor Tattoo Fix',
    description: 'Lente ótica para smartwatch em pele tatuada — kit completo',
    price: 62.9,
    image: 'https://www.sensortattoofix.com.br/site/sensortattoofix.jpg'
  },
  products: [
    {
      id: 'kit-sensor-tattoofix',
      slug: 'kit-sensor-tattoofix',
      name: 'Kit Sensor Tattoo Fix',
      description: 'Lente ótica para smartwatch em pele tatuada — kit completo',
      price: 62.9,
      image: 'https://www.sensortattoofix.com.br/site/sensortattoofix.jpg',
      active: true,
      requiresSmartwatch: true,
      weightGrams: 3
    }
  ],
  pix: { key: '29321223000132', keyType: 'cnpj', merchantName: '3N20 SOLUCOES TEC', merchantCity: 'SAO PAULO' },
  shipping: {
    originCep: '02537190',
    weightGrams: 5,
    lengthCm: 16,
    widthCm: 12,
    heightCm: 0.5,
    serviceCode: '04227',
    intlServiceCode: '45128',
    serviceName: 'Mini Envios',
    sender: {
      brand: 'Sensor Tattoo Fix',
      company: '3N20 Soluções Tecnológicas LTDA',
      cnpj: '29.321.223/0001-32',
      rua: 'Rua Engenheiro Roberto Dabus Buazar',
      numero: '56',
      complemento: '',
      bairro: 'Imirim',
      cidade: 'São Paulo',
      uf: 'SP',
      pais: 'Brasil'
    }
  },
  internationalShipping: {
    US: { label: 'Estados Unidos', price: 89.9, days: 15, currency: 'BRL' },
    PT: { label: 'Portugal', price: 262.5, days: 12, currency: 'BRL' },
    AR: { label: 'Argentina', price: 69.9, days: 10, currency: 'BRL' },
    MX: { label: 'México', price: 74.9, days: 12, currency: 'BRL' },
    GB: { label: 'Reino Unido', price: 94.9, days: 18, currency: 'BRL' },
    DE: { label: 'Alemanha', price: 94.9, days: 18, currency: 'BRL' },
    FR: { label: 'França', price: 94.9, days: 18, currency: 'BRL' },
    IT: { label: 'Itália', price: 94.9, days: 18, currency: 'BRL' },
    ES: { label: 'Espanha', price: 84.9, days: 14, currency: 'BRL' },
    CA: { label: 'Canadá', price: 89.9, days: 16, currency: 'BRL' },
    CL: { label: 'Chile', price: 64.9, days: 10, currency: 'BRL' },
    CO: { label: 'Colômbia', price: 64.9, days: 10, currency: 'BRL' },
    UY: { label: 'Uruguai', price: 59.9, days: 8, currency: 'BRL' },
    PY: { label: 'Paraguai', price: 54.9, days: 8, currency: 'BRL' },
    OTHER: { label: 'Outro país', price: 119.9, days: 25, currency: 'BRL' }
  },
  internationalSurcharge: 40,
  internationalProduct: {
    title: 'Envio internacional',
    hint: '',
    encomendaNotice: 'Nesse tipo de frete é enviado o kit completo.',
    documentNotice: 'Lente de melhor fixação, sem potencializador (este frete não permite líquidos).\n\nKit completo: escolha outra opção de envio.'
  },
  payments: {
    paypal: {
      internationalEnabled: true,
      brazilEnabled: true,
      appLabel: ''
    },
    cardBr: {
      provider: 'asaas',
      fallbackToAlternate: true
    },
    pixBr: {
      provider: 'mercadopago',
      fallbackToAlternate: true
    }
  },
  smartwatchModels: [
    'Apple Watch Series 1 (38mm)',
    'Apple Watch Series 2 (38mm)',
    'Apple Watch Series 3 (38mm)',
    'Apple Watch SE (40mm)',
    'Apple Watch SE (44mm)',
    'Apple Watch SE 2 (40mm)',
    'Apple Watch SE 2 (44mm)',
    'Apple Watch Series 6 (40mm)',
    'Apple Watch Series 6 (44mm)',
    'Apple Watch Series 7 (41mm)',
    'Apple Watch Series 7 (45mm)',
    'Apple Watch Series 8 (41mm)',
    'Apple Watch Series 8 (45mm)',
    'Apple Watch Series 9 (41mm)',
    'Apple Watch Series 9 (45mm)',
    'Apple Watch Series 10 (42mm)',
    'Apple Watch Series 10 (46mm)',
    'Apple Watch Ultra 3 (49mm)',
    'Apple Watch Ultra 2 (49mm)',
    'Apple Watch Ultra (49mm)',
    'Samsung Galaxy Watch 4 (40mm)',
    'Samsung Galaxy Watch 4 (44mm)',
    'Samsung Galaxy Watch 5 (40mm)',
    'Samsung Galaxy Watch 5 (44mm)',
    'Samsung Galaxy Watch 5 Pro (45mm)',
    'Samsung Galaxy Watch 6 (40mm)',
    'Samsung Galaxy Watch 6 (44mm)',
    'Samsung Galaxy Watch 6 Classic (43mm)',
    'Samsung Galaxy Watch 6 Classic (47mm)',
    'Samsung Galaxy Watch 7 (40mm)',
    'Samsung Galaxy Watch 7 (44mm)',
    'Samsung Galaxy Watch 8 (40mm)',
    'Samsung Galaxy Watch 8 (44mm)',
    'Samsung Galaxy Watch 8 Classic (46mm)',
    'Samsung Galaxy Watch Ultra (47mm)',
    'Garmin Fenix',
    'Garmin Forerunner',
    'Garmin Instinct',
    'Garmin Venu',
    'Garmin Vivoactive',
    'Huawei Watch Fit',
    'Huawei Watch GT',
    'Xiaomi Watch S1 / S3',
    'Redmi Watch',
    'Amazfit Active',
    'Amazfit Bip',
    'Amazfit GTR Mini',
    'Amazfit GTR',
    'Amazfit GTS',
    'Amazfit T-Rex',
    'Fitbit Versa / Sense',
    'Polar Pacer / Ignite',
    'Outro modelo (informar nas observações)'
  ],
  formsubmit: { email: 'contato@sensortattoofix.com.br', subject: 'Novo pedido — Loja Oficial Sensor Tattoo Fix' },
  emails: {
    from: 'Sensor Tattoo Fix <pedidos@sensortattoofix.com.br>',
    shopPaidSubject: 'PAGO — {orderId}',
    customerOrderSubject: 'Pedido {orderId} registrado — Sensor Tattoo Fix',
    customerPixSubject: 'PIX do pedido {orderId} — Sensor Tattoo Fix',
    customerPaidSubject: 'Pagamento confirmado — {orderId}',
    motoboySubject: 'Entrega motoboy — {orderId}',
    couponSubject: 'Você vendeu com seu cupom — comissão {amount} — Sensor Tattoo Fix',
    testSubject: 'Teste — Sensor Tattoo Fix',
    testTo: '',
    pendingPaypal: 'Finalize o pagamento no PayPal. Você receberá outro e-mail quando o pagamento for confirmado.',
    pendingCard: 'Finalize o pagamento no link enviado. Você receberá outro e-mail quando o pagamento for confirmado.',
    pendingMpCheckout: 'Finalize o pagamento com cartão no Mercado Pago (Visa/Mastercard). Seu banco pode converter de USD/EUR para reais.',
    paidDefault: 'Seu kit será postado em até 2 dias úteis. Você receberá o rastreio por e-mail.',
    paidMotoboy: 'Seu pedido será entregue por motoboy em até {hours} horas. O entregador entrará em contato se necessário.',
    paidUberTracking: 'Entrega Uber confirmada. Acompanhe em: {url}',
    paidUberPending: 'Entrega Uber solicitada. Você receberá o link de rastreio por e-mail em breve.',
    paidIntlLens: 'Sua lente internacional será postada em até 2 dias úteis. Você receberá o rastreio por e-mail.',
    paidIntlKit: 'Seu kit Prime será postado em até 2 dias úteis. Você receberá o rastreio por e-mail.',
    pixGreeting: 'Olá, {nome}!',
    pixIntro: 'Seu pedido {orderId} foi registrado. Para concluir a compra, pague o PIX abaixo:',
    pixFooter: 'Guarde este e-mail — se fechar a página, use o link acima para voltar ao QR Code.'
  },
  whatsapp: '5511913394665',
  siteUrl: 'https://www.sensortattoofix.com.br',
  api: { baseUrl: 'https://api.sensortattoofix.com.br' },
  coupons: [
    {
      id: 'coupon-copa-brasil',
      code: 'BRASIL20',
      name: 'Copa — Jogo do Brasil',
      percent: 20,
      commissionPercent: 0,
      email: '',
      active: true
    }
  ]
};

const DEFAULT_MOTOBOY_SHIPPING = {
  enabled: true,
  basePrice: 12,
  pricePerKm: 2.8,
  minPrice: 18,
  maxRadiusKm: 35,
  roadFactor: 1.25,
  deliveryHours: 24,
  couriers: []
};

const DEFAULT_SHIPPING_METHODS = [
  { id: 'br-mini-envios', enabled: true, scope: 'BR', label: 'Mini Envios', correiosCode: '04227', provider: 'correios' },
  { id: 'br-carta-registrada', enabled: true, scope: 'BR', label: 'Carta Registrada', correiosCode: '8010', provider: 'correios' },
  { id: 'br-motoboy', enabled: false, scope: 'BR', label: 'Envio particular (motoboy — até 24h)', provider: 'motoboy' },
  { id: 'br-uber-direct', enabled: false, scope: 'BR', label: 'Entrega Uber (rápida)', provider: 'uber' },
  { id: 'int-encomenda', enabled: true, scope: 'INT', label: 'Encomenda internacional (Exporta Fácil)', correiosCode: '*', simTipo: 'M' },
  { id: 'int-documento', enabled: true, scope: 'INT', label: 'Documento / carta internacional', correiosCode: '*', simTipo: 'D' }
];

function resolveIntlSimTipos(method) {
  const tipo = String(method?.simTipo || '').toUpperCase();
  if (tipo === 'M' || tipo === 'D') return [tipo];
  if (method?.id === 'int-todos' || String(method?.correiosCode || '').trim() === '*') return ['M', 'D'];
  if (/documento|carta/i.test(method?.label || '')) return ['D'];
  return ['M'];
}

function mergeShippingMethods(stored) {
  const defaults = structuredClone(DEFAULT_SHIPPING_METHODS);
  if (!Array.isArray(stored) || !stored.length) return defaults;
  const byId = new Map(defaults.map((m) => [m.id, m]));
  stored.forEach((m) => {
    if (!m?.id) return;
    const base = byId.get(m.id) || {};
    byId.set(m.id, { ...base, ...m });
  });
  return [...byId.values()];
}

function getEnabledShippingMethods(config, scope) {
  const list = config.shippingMethods?.length ? config.shippingMethods : DEFAULT_SHIPPING_METHODS;
  return list.filter((m) => m.enabled !== false && m.scope === scope);
}

function isUberMethod(method) {
  if (!method) return false;
  if (method.provider === 'uber') return true;
  return String(method.id || '').toLowerCase().includes('uber');
}

function isUberOrder(order) {
  if (!order) return false;
  if (order.shippingProvider === 'uber') return true;
  return String(order.shippingMethodId || '').toLowerCase().includes('uber');
}

function isMotoboyMethod(method) {
  if (!method) return false;
  if (method.provider === 'motoboy') return true;
  return String(method.id || '').toLowerCase().includes('motoboy');
}

function isMotoboyOrder(order) {
  if (!order) return false;
  if (order.shippingProvider === 'motoboy') return true;
  return String(order.shippingMethodId || '').toLowerCase().includes('motoboy');
}

function isParticularDeliveryOrder(order) {
  return isUberOrder(order) || isMotoboyOrder(order);
}

function isCorreiosBrOrder(order) {
  if (!order) return false;
  if ((order.paisCode || 'BR') !== 'BR') return false;
  if (order.internationalLensOnly) return false;
  return !isParticularDeliveryOrder(order);
}

function correiosTrackingUrl(trackingCode) {
  const code = String(trackingCode || '').trim();
  if (!code) return '';
  return `https://rastreamento.correios.com.br/app/index.php?objeto=${encodeURIComponent(code)}`;
}

function getMotoboyConfig(config) {
  const m = { ...DEFAULT_MOTOBOY_SHIPPING, ...(config?.motoboyShipping || {}) };
  return {
    enabled: m.enabled !== false,
    basePrice: Number(m.basePrice) || DEFAULT_MOTOBOY_SHIPPING.basePrice,
    pricePerKm: Number(m.pricePerKm) || DEFAULT_MOTOBOY_SHIPPING.pricePerKm,
    minPrice: Number(m.minPrice) || DEFAULT_MOTOBOY_SHIPPING.minPrice,
    maxRadiusKm: Number(m.maxRadiusKm) || DEFAULT_MOTOBOY_SHIPPING.maxRadiusKm,
    roadFactor: Number(m.roadFactor) || DEFAULT_MOTOBOY_SHIPPING.roadFactor,
    deliveryHours: Number(m.deliveryHours) || DEFAULT_MOTOBOY_SHIPPING.deliveryHours,
    couriers: Array.isArray(m.couriers) ? m.couriers : []
  };
}

function activeMotoboyCouriers(config) {
  return getMotoboyConfig(config).couriers.filter(
    (c) => c?.active !== false && String(c.email || '').includes('@')
  );
}

function motoboyOperational(config) {
  const cfg = getMotoboyConfig(config);
  return cfg.enabled && activeMotoboyCouriers(config).length > 0;
}

/** Modalidades motoboy disponíveis para cotação — se o módulo está operacional, não exige "Ativo" na lista de modalidades. */
function getMotoboyShippingMethods(config) {
  if (!motoboyOperational(config)) return [];
  const fromList = (config.shippingMethods?.length ? config.shippingMethods : DEFAULT_SHIPPING_METHODS)
    .filter((m) => m.scope === 'BR' && isMotoboyMethod(m));
  const enabled = fromList.filter((m) => m.enabled !== false);
  if (enabled.length) return enabled;
  if (fromList.length) return fromList;
  return [{
    id: 'br-motoboy',
    enabled: true,
    scope: 'BR',
    label: 'Envio particular (motoboy — até 24h)',
    provider: 'motoboy'
  }];
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeAddressNominatim(query) {
  const q = String(query || '').trim();
  if (q.length < 8) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
        q,
        format: 'json',
        limit: '1',
        countrycodes: 'br'
      })}`,
      { headers: { 'User-Agent': 'SensorTattooFix/1.0 (contato@sensortattoofix.com.br)' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data?.[0];
    const lat = Number(hit?.lat);
    const lon = Number(hit?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch (err) {
    console.warn('Nominatim:', err.message);
    return null;
  }
}

async function fetchCepMetadata(cep) {
  const digits = String(cep || '').replace(/\D/g, '');
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function handleGetCep(request, env, origin, cepDigits) {
  const digits = String(cepDigits || '').replace(/\D/g, '');
  if (digits.length !== 8) return json({ error: 'CEP inválido.' }, 400, origin);
  const meta = await fetchCepMetadata(digits);
  if (!meta?.city) return json({ error: 'CEP não encontrado.' }, 404, origin);
  return json({
    cep: `${digits.slice(0, 5)}-${digits.slice(5)}`,
    logradouro: meta.street || '',
    bairro: meta.neighborhood || '',
    localidade: meta.city || '',
    uf: meta.state || ''
  }, 200, origin);
}

async function fetchCepCoordinates(cep, addressParts = {}) {
  const digits = String(cep || '').replace(/\D/g, '');
  if (digits.length !== 8) return null;

  const meta = await fetchCepMetadata(digits);
  const coords = meta?.location?.coordinates;
  const lat = Number(coords?.latitude);
  const lon = Number(coords?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };

  const street = String(addressParts.rua || meta?.street || '').trim();
  const city = String(addressParts.cidade || meta?.city || '').trim();
  const uf = String(addressParts.uf || meta?.state || '').trim();
  const bairro = String(addressParts.bairro || meta?.neighborhood || '').trim();
  const numero = String(addressParts.numero || '').trim();

  const queries = [];
  if (street && city) {
    queries.push([street, numero, bairro, city, uf, 'Brasil'].filter(Boolean).join(', '));
  }
  if (city && uf) {
    queries.push([bairro, city, uf, 'Brasil'].filter(Boolean).join(', '));
    queries.push(`${digits.slice(0, 5)}-${digits.slice(5)}, ${city}, ${uf}, Brasil`);
  }

  for (const query of queries) {
    const point = await geocodeAddressNominatim(query);
    if (point) return point;
  }
  return null;
}

async function fetchOriginCoordinates(config) {
  const sender = config?.shipping?.sender || DEFAULT_CONFIG.shipping.sender;
  const originCep = config?.shipping?.originCep || DEFAULT_CONFIG.shipping.originCep;
  return fetchCepCoordinates(originCep, {
    rua: sender.rua,
    numero: sender.numero,
    bairro: sender.bairro,
    cidade: sender.cidade,
    uf: sender.uf
  });
}

async function fetchDestCoordinates(cep, addressParts = {}) {
  return fetchCepCoordinates(cep, addressParts);
}

function calcMotoboyPrice(cfg, distanceKm) {
  const billableKm = Math.ceil(Math.max(0, distanceKm));
  const raw = cfg.basePrice + billableKm * cfg.pricePerKm;
  return {
    price: Math.max(cfg.minPrice, Math.round(raw * 100) / 100),
    billableKm,
    distanceKm: Math.round(distanceKm * 10) / 10
  };
}

async function computeMotoboyQuote(config, destCep, addressParts = {}) {
  const cfg = getMotoboyConfig(config);
  if (!cfg.enabled) return null;

  const [origin, dest] = await Promise.all([
    fetchOriginCoordinates(config),
    fetchDestCoordinates(destCep, addressParts)
  ]);
  if (!origin || !dest) return null;

  const straightKm = haversineKm(origin.lat, origin.lon, dest.lat, dest.lon);
  const roadKm = straightKm * cfg.roadFactor;
  if (roadKm > cfg.maxRadiusKm) return null;

  const priced = calcMotoboyPrice(cfg, roadKm);
  return {
    ...priced,
    straightKm: Math.round(straightKm * 10) / 10,
    roadKm: Math.round(roadKm * 10) / 10,
    deliveryHours: cfg.deliveryHours
  };
}

async function quoteMotoboyShippingOptions(env, config, addressParams, opts = {}) {
  const methods = getMotoboyShippingMethods(config);
  if (!methods.length) return [];

  const destCep = addressParams?.cep;
  if (!destCep || String(destCep).replace(/\D/g, '').length !== 8) return [];

  try {
    const quote = await computeMotoboyQuote(config, destCep, addressParams);
    if (!quote) return [];
    return methods.map((method) => ({
      id: method.id,
      methodId: method.id,
      serviceCode: null,
      service: method.label || 'Envio particular (motoboy)',
      price: quote.price,
      days: 1,
      deliveryHours: quote.deliveryHours,
      distanceKm: quote.roadKm,
      billableKm: quote.billableKm,
      source: 'motoboy',
      provider: 'motoboy',
      weightGrams: shippingWeightGrams(config, opts.weightGrams)
    }));
  } catch (err) {
    console.warn('Motoboy quote:', err.message);
    return [];
  }
}

async function notifyMotoboyCouriers(env, config, order) {
  const couriers = activeMotoboyCouriers(config);
  if (!couriers.length) return [];

  const cfg = getMotoboyConfig(config);
  const adminUrl = `${(config.siteUrl || DEFAULT_CONFIG.siteUrl).replace(/\/$/, '')}/pedidos.html`;
  const fields = {
    Pedido: order.orderId,
    Cliente: order.nome,
    Telefone: order.telefone,
    'E-mail cliente': order.email,
    Endereço: order.endereco,
    Produto: order.produto,
    'Valor frete': formatBRL(order.frete),
    Distância: order.motoboyDistanceKm ? `~${order.motoboyDistanceKm} km` : '—',
    Prazo: `até ${cfg.deliveryHours}h`,
    'Painel pedidos': adminUrl,
    ...orderWatchEmailFields(order)
  };

  const subject = emailSubject(config, 'motoboySubject', { orderId: order.orderId });
  const results = [];
  for (const courier of couriers) {
    const to = String(courier.email || '').trim().toLowerCase();
    if (!to) continue;
    const courierFields = {
      Motoboy: courier.name || to,
      ...fields
    };
    const res = await notifyEmail(env, config, to, subject, courierFields, config.formsubmit?.email);
    results.push({ email: to, ok: res.ok });
    if (!res.ok) console.error('E-mail motoboy:', to, JSON.stringify(res));
  }
  return results;
}

function normalizeCouponCode(code) {
  return String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function getCoupons(config) {
  return Array.isArray(config?.coupons) ? config.coupons : [];
}

const BRASIL20_GAME_DAYS = new Set([
  '2026-06-13', '2026-06-19', '2026-06-24', '2026-06-29',
  '2026-07-05', '2026-07-11', '2026-07-15', '2026-07-18', '2026-07-19'
]);

function todaySaoPauloIso() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function isBrasil20GameDay() {
  return BRASIL20_GAME_DAYS.has(todaySaoPauloIso());
}

function findActiveCoupon(config, code) {
  const norm = normalizeCouponCode(code);
  if (!norm) return null;
  const coupon = getCoupons(config).find(
    (c) => c.active !== false && normalizeCouponCode(c.code) === norm
  ) || null;
  if (coupon && norm === 'BRASIL20' && !isBrasil20GameDay()) return null;
  return coupon;
}

function computeCouponDiscount(valorProduto, percent) {
  const pct = Math.min(100, Math.max(0, Number(percent) || 0));
  const base = Math.max(0, Number(valorProduto) || 0);
  const discount = Math.round(base * pct / 100 * 100) / 100;
  return { percent: pct, discount: Math.min(discount, base) };
}

function computeCouponCommission(valorProduto, commissionPercent) {
  const pct = Math.min(100, Math.max(0, Number(commissionPercent) || 0));
  const base = Math.max(0, Number(valorProduto) || 0);
  const amount = Math.round(base * pct / 100 * 100) / 100;
  return { percent: pct, amount: Math.min(amount, base) };
}

function orderCouponEmailFields(order) {
  if (!order?.couponCode) return {};
  const fields = {
    Cupom: order.couponCode,
    Comissionado: order.couponCommissionerName || order.couponCommissionerEmail || '—',
    'Desconto cupom': formatBRL(order.couponDiscount || 0)
  };
  if (order.couponCommissionPercent != null) {
    fields['Comissão (%)'] = `${order.couponCommissionPercent}%`;
  }
  if (order.couponCommissionAmount != null) {
    fields['Comissão a pagar'] = formatBRL(order.couponCommissionAmount);
  }
  return fields;
}

async function notifyCouponCommissioner(env, config, order) {
  const to = String(order.couponCommissionerEmail || '').trim().toLowerCase();
  if (!to) return { ok: true, skipped: true };

  const adminUrl = `${(config.siteUrl || DEFAULT_CONFIG.siteUrl).replace(/\/$/, '')}/pedidos.html`;
  const subject = emailSubject(config, 'couponSubject', {
    orderId: order.orderId,
    amount: formatBRL(order.couponCommissionAmount || 0)
  });
  const fields = {
    Comissionado: order.couponCommissionerName || to,
    Cupom: order.couponCode,
    Pedido: order.orderId,
    Cliente: order.nome,
    'E-mail cliente': order.email,
    Produto: order.produto,
    'Valor do produto': formatBRL(order.valorProduto),
    'Desconto aplicado': formatBRL(order.couponDiscount || 0),
    'Total do pedido': formatBRL(order.total),
    Status: 'Pago',
    'Painel pedidos': adminUrl,
    ...orderWatchEmailFields(order)
  };
  if (order.couponCommissionPercent != null) {
    fields['Sua comissão (%)'] = `${order.couponCommissionPercent}%`;
  }
  if (order.couponCommissionAmount != null) {
    fields['Comissão a receber'] = formatBRL(order.couponCommissionAmount);
  }
  const res = await notifyEmail(env, config, to, subject, fields, config.formsubmit?.email);
  if (!res.ok) console.error('E-mail comissionado cupom:', to, JSON.stringify(res));
  return res;
}

async function handleValidateCoupon(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido.' }, 400, origin);
  }
  const code = String(body.code || '').trim();
  if (!code) return json({ error: 'Informe o código do cupom.' }, 400, origin);

  const config = await getPublicConfig(env);
  const coupon = findActiveCoupon(config, code);
  if (!coupon) return json({ error: 'Cupom inválido ou inativo.' }, 404, origin);

  let items;
  try {
    items = resolveOrderItems(config, body);
  } catch (err) {
    return json({ error: err.message }, 400, origin);
  }
  const valorProduto = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const { percent, discount } = computeCouponDiscount(valorProduto, coupon.percent);

  return json({
    ok: true,
    code: normalizeCouponCode(coupon.code),
    percent,
    desconto: discount,
    label: String(coupon.name || '').trim() || normalizeCouponCode(coupon.code)
  }, 200, origin);
}

function mergeSmartwatchModelLists(stored, base) {
  const storedList = Array.isArray(stored) && stored.length ? stored : [];
  const baseList = Array.isArray(base) ? base : [];
  if (!storedList.length) return [...baseList];
  const seen = new Set(storedList);
  const out = [...storedList];
  baseList.forEach((m) => {
    if (!seen.has(m)) {
      out.push(m);
      seen.add(m);
    }
  });
  return out;
}

function isLegacyBrokenKitImage(url) {
  const u = String(url || '').trim();
  if (!u) return true;
  return /sensortattoofix/i.test(u) && !/\/site\//i.test(u);
}

function isKitOrMissingImage(url) {
  const u = String(url || '').trim();
  return !u || /sensortattoofix/i.test(u) || !u.includes('/produtos/');
}

function isGenericSharedImage(url, productId) {
  const u = String(url || '').trim();
  const id = String(productId || '').trim();
  if (!u.includes('/produtos/')) return true;
  if (id && (u === `/produtos/${id}.svg` || u.endsWith(`/${id}.svg`))) return false;
  return /\/produtos\/(pelicula-(squircle|redonda|retangular)|pulseira-)/i.test(u);
}

function isEmptyCatalogValue(value) {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

function supplementKitFromSite(kvProduct, siteProduct) {
  const merged = { ...kvProduct };
  if (siteProduct?.image && isLegacyBrokenKitImage(kvProduct?.image)) {
    merged.image = siteProduct.image;
  }
  return merged;
}

function supplementAggregatedFromSite(kvProduct, siteProduct) {
  const productKey = kvProduct?.id || kvProduct?.slug;
  const merged = { ...kvProduct };
  const catalogFields = [
    'compatibleWatchModels',
    'compatibility',
    'productType',
    'filmType',
    'filmTypeEn',
    'bandStyle',
    'color',
    'packaging',
    'aggregated',
    'requiresSmartwatch'
  ];
  catalogFields.forEach((field) => {
    if (!isEmptyCatalogValue(merged[field])) return;
    if (siteProduct[field] != null) merged[field] = siteProduct[field];
  });
  if (
    Array.isArray(siteProduct.compatibleWatchModels) &&
    siteProduct.compatibleWatchModels.length &&
    isEmptyCatalogValue(merged.compatibleWatchModels)
  ) {
    merged.compatibleWatchModels = siteProduct.compatibleWatchModels;
  }
  if (siteProduct.image && String(siteProduct.image).includes('/produtos/pulseiras/')) {
    if (!kvProduct?.image || isGenericSharedImage(kvProduct.image, productKey)) {
      merged.image = siteProduct.image;
    }
  } else if (
    siteProduct.image &&
    (isKitOrMissingImage(kvProduct?.image) || isGenericSharedImage(kvProduct?.image, productKey))
  ) {
    merged.image = siteProduct.image;
  }
  return merged;
}

function mergeSiteCatalogProducts(kvProducts, siteProducts) {
  const byId = new Map();
  (kvProducts || []).forEach((p) => {
    const k = p?.id || p?.slug;
    if (k) byId.set(k, { ...p });
  });
  (siteProducts || []).forEach((lp) => {
    const k = lp?.id || lp?.slug;
    if (!k) return;
    if (!byId.has(k)) {
      byId.set(k, { ...lp });
      return;
    }
    const prev = byId.get(k);
    byId.set(
      k,
      lp.aggregated === true ? supplementAggregatedFromSite(prev, lp) : supplementKitFromSite(prev, lp)
    );
  });
  return [...byId.values()];
}

function mergeSiteCatalogSmartwatchMeta(kvMeta, siteMeta) {
  const out = { ...(kvMeta || {}) };
  Object.entries(siteMeta || {}).forEach(([model, meta]) => {
    if (!out[model]) {
      out[model] = { ...meta };
      return;
    }
    out[model] = { ...meta, ...out[model] };
  });
  return out;
}

function mergeSiteCatalog(config, site) {
  if (!site || typeof site !== 'object') return config;
  const next = { ...config };
  next.smartwatchModels = site.smartwatchModels?.length
    ? mergeSmartwatchModelLists(config.smartwatchModels || [], site.smartwatchModels)
    : mergeSmartwatchModelLists(config.smartwatchModels, DEFAULT_CONFIG.smartwatchModels);
  next.smartwatchModelMeta = mergeSiteCatalogSmartwatchMeta(
    config.smartwatchModelMeta,
    site.smartwatchModelMeta
  );
  if (site.products?.length) {
    next.products = mergeSiteCatalogProducts(config.products, site.products);
    const kit = next.products.find((p) => p.aggregated !== true && p.active !== false) || next.products[0];
    if (kit && next.product) {
      next.product = {
        ...next.product,
        name: kit.name,
        description: kit.description,
        price: kit.price,
        image: kit.image
      };
    }
  }
  return next;
}

let siteCatalogCache = null;
let siteCatalogCachedAt = 0;

async function fetchSiteCatalog() {
  if (siteCatalogCache && Date.now() - siteCatalogCachedAt < 300000) {
    return siteCatalogCache;
  }
  try {
    const res = await fetch(SITE_CATALOG_URL, { cf: { cacheTtl: 300 } });
    if (!res.ok) return null;
    siteCatalogCache = await res.json();
    siteCatalogCachedAt = Date.now();
    return siteCatalogCache;
  } catch {
    return null;
  }
}

async function getPublicConfig(env) {
  const config = await getConfig(env);
  const site = await fetchSiteCatalog();
  return mergeSiteCatalog(config, site);
}

function normalizeApiBaseUrl(api) {
  const merged = { ...(api || {}) };
  const url = String(merged.baseUrl || '').trim().replace(/\/$/, '');
  if (!url || url === LEGACY_API_BASE) merged.baseUrl = CANONICAL_API_BASE;
  return merged;
}

function mergeCoupons(stored, base) {
  const baseList = Array.isArray(base) ? base : [];
  const storedList = Array.isArray(stored) ? stored : [];
  if (!storedList.length) return [...baseList];
  const byCode = new Map(storedList.map((c) => [normalizeCouponCode(c.code), c]));
  baseList.forEach((c) => {
    const k = normalizeCouponCode(c.code);
    if (k && !byCode.has(k)) byCode.set(k, c);
  });
  return [...byCode.values()];
}

function withConfigDefaults(stored) {
  const base = structuredClone(DEFAULT_CONFIG);
  if (!stored || typeof stored !== 'object') return base;

  return {
    ...base,
    ...stored,
    product: {
      ...base.product,
      ...(stored.product || {}),
      image: fixKitImageUrl(stored.product?.image || base.product.image)
    },
    pix: resolvePixConfig({ ...base.pix, ...(stored.pix || {}) }, base.pix),
    shipping: {
      ...base.shipping,
      ...(stored.shipping || {}),
      sender: { ...base.shipping.sender, ...(stored.shipping?.sender || {}) }
    },
    formsubmit: { ...base.formsubmit, ...(stored.formsubmit || {}) },
    emails: { ...base.emails, ...(stored.emails || {}) },
    api: normalizeApiBaseUrl({ ...base.api, ...(stored.api || {}) }),
    internationalShipping: { ...base.internationalShipping, ...(stored.internationalShipping || {}) },
    internationalSurcharge: Number.isFinite(Number(stored.internationalSurcharge))
      ? Number(stored.internationalSurcharge)
      : base.internationalSurcharge,
    internationalProduct: { ...base.internationalProduct, ...(stored.internationalProduct || {}) },
    payments: {
      ...base.payments,
      ...(stored.payments || {}),
      paypal: mergePaypalConfig(base.payments?.paypal, stored.payments?.paypal),
      cardBr: mergeCardBrConfig(base.payments?.cardBr, stored.payments?.cardBr),
      pixBr: mergePixBrConfig(base.payments?.pixBr, stored.payments?.pixBr)
    },
    smartwatchModels: mergeSmartwatchModelLists(stored.smartwatchModels, base.smartwatchModels),
    products: normalizeProducts(stored, base),
    shippingMethods: mergeShippingMethods(stored.shippingMethods),
    motoboyShipping: {
      ...DEFAULT_MOTOBOY_SHIPPING,
      ...(stored.motoboyShipping || {}),
      couriers: Array.isArray(stored.motoboyShipping?.couriers)
        ? stored.motoboyShipping.couriers
        : DEFAULT_MOTOBOY_SHIPPING.couriers
    },
    coupons: mergeCoupons(stored.coupons, base.coupons)
  };
}

function fixKitImageUrl(url) {
  const u = String(url || '').trim();
  if (!u || (/sensortattoofix/i.test(u) && !/\/site\//i.test(u))) {
    return 'https://www.sensortattoofix.com.br/site/sensortattoofix.jpg';
  }
  return u;
}

function normalizeProducts(stored, base) {
  let products;
  if (stored?.products?.length) products = stored.products;
  else {
    const legacy = stored?.product || base.product;
    if (!legacy) return base.products || [];
    products = [{
      id: 'kit-sensor-tattoofix',
      slug: 'kit-sensor-tattoofix',
      name: legacy.name,
      description: legacy.description,
      price: legacy.price,
      image: legacy.image,
      active: true,
      requiresSmartwatch: true,
      weightGrams: 3
    }];
  }
  return products.map((p) => (p?.aggregated ? p : { ...p, image: fixKitImageUrl(p.image) }));
}

function shippingWeightGrams(config, override) {
  const ship = config?.shipping || DEFAULT_CONFIG.shipping;
  const n = Number(override ?? ship.weightGrams);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

function getActiveProducts(config) {
  const list = config.products?.length ? config.products : normalizeProducts({}, { product: config.product });
  return list.filter((p) => p.active !== false && productInStock(p, 1));
}

function productStockQty(p) {
  if (p?.stock == null || p.stock === '') return null;
  const n = Number(p.stock);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.floor(n));
}

function productInStock(p, qty = 1) {
  const stock = productStockQty(p);
  if (stock == null) return true;
  return stock >= Math.max(1, Number(qty) || 1);
}

function assertOrderStock(config, items) {
  const products = config.products || [];
  for (const item of items) {
    const p = products.find((x) => x.id === item.productId || x.slug === item.productId);
    if (!p) continue;
    const stock = productStockQty(p);
    if (stock == null) continue;
    const qty = Math.max(1, Number(item.qty) || 1);
    if (stock < qty) {
      const name = p.name || item.name || 'Produto';
      throw new Error(
        stock === 0
          ? `${name} está esgotado.`
          : `Estoque insuficiente para ${name}. Disponível: ${stock}.`
      );
    }
  }
}

async function decrementOrderStock(env, order) {
  if (order.stockDecremented) return;
  const items = order.items || [];
  if (!items.length) return;

  const config = await getConfig(env);
  if (!config.products?.length) return;

  let changed = false;
  const products = config.products.map((p) => ({ ...p }));
  const byKey = new Map();
  products.forEach((p) => {
    if (p.id) byKey.set(p.id, p);
    if (p.slug) byKey.set(p.slug, p);
  });

  for (const item of items) {
    const p = byKey.get(item.productId) || byKey.get(item.slug);
    if (!p) continue;
    const stock = productStockQty(p);
    if (stock == null) continue;
    const qty = Math.max(1, Number(item.qty) || 1);
    if (stock < qty) {
      order.stockWarning = order.stockWarning || [];
      order.stockWarning.push(`${p.name || item.name}: pedido ${qty}, estoque ${stock}`);
      console.warn('Stock insufficient at payment:', order.orderId, p.name, stock, qty);
    }
    const deduct = Math.min(qty, stock);
    if (deduct <= 0) continue;
    p.stock = stock - deduct;
    if (p.stock === 0) p.active = false;
    changed = true;
  }

  if (!changed) return;
  await saveConfig(env, { ...config, products });
  order.stockDecremented = true;
}

function resolveOrderItems(config, body) {
  const products = getActiveProducts(config);
  if (!products.length) throw new Error('Nenhum produto disponível na loja.');

  let items;
  if (Array.isArray(body.items) && body.items.length) {
    items = body.items.map((item) => {
      const p = products.find((x) => x.id === item.productId || x.slug === item.productId);
      if (!p) throw new Error('Produto não encontrado ou indisponível.');
      const qty = Math.max(1, Math.min(10, Number(item.qty) || 1));
      return {
        productId: p.id,
        slug: p.slug,
        name: p.name,
        price: Number(p.price) || 0,
        qty,
        requiresSmartwatch: p.requiresSmartwatch !== false,
        weightGrams: Number(p.weightGrams) || shippingWeightGrams(config)
      };
    });
  } else {
    const pick = body.productId || body.productSlug || products[0].id;
    const p = products.find((x) => x.id === pick || x.slug === pick) || products[0];
    items = [{
      productId: p.id,
      slug: p.slug,
      name: p.name,
      price: Number(p.price) || 0,
      qty: Math.max(1, Math.min(10, Number(body.qty) || 1)),
      requiresSmartwatch: p.requiresSmartwatch !== false,
      weightGrams: Number(p.weightGrams) || shippingWeightGrams(config)
    }];
  }

  assertOrderStock(config, items);
  return items;
}

function orderRequiresSmartwatch(items) {
  return items.some((i) => i.requiresSmartwatch !== false);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function uint8ToB64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b64ToUint8(b64) {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return { salt: uint8ToB64(salt), hash: uint8ToB64(new Uint8Array(hash)) };
}

async function verifyPassword(password, saltB64, hashB64) {
  const salt = b64ToUint8(saltB64);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const expected = b64ToUint8(hashB64);
  const actual = new Uint8Array(hash);
  if (expected.length !== actual.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ actual[i];
  return diff === 0;
}

async function getUserById(env, userId) {
  const raw = await env.STORE_KV.get('user:' + userId);
  return raw ? JSON.parse(raw) : null;
}

async function getUserByEmail(env, email) {
  const id = await env.STORE_KV.get('user:email:' + normalizeEmail(email));
  if (!id) return null;
  return getUserById(env, id);
}

async function saveUser(env, user) {
  await env.STORE_KV.put('user:' + user.userId, JSON.stringify(user));
  await env.STORE_KV.put('user:email:' + normalizeEmail(user.email), user.userId);
}

async function createCustomerSession(env, userId) {
  const token = crypto.randomUUID();
  await env.STORE_KV.put('customerSession:' + token, userId, { expirationTtl: CUSTOMER_SESSION_TTL });
  return token;
}

async function getCustomerUserId(env, token) {
  if (!token) return null;
  return (await env.STORE_KV.get('customerSession:' + token)) || null;
}

async function linkOrderToUser(env, userId, orderId) {
  const key = 'user:' + userId + ':orders';
  const list = JSON.parse((await env.STORE_KV.get(key)) || '[]');
  if (!list.includes(orderId)) {
    list.unshift(orderId);
    await env.STORE_KV.put(key, JSON.stringify(list.slice(0, 500)));
  }
}

function publicUserView(user) {
  return {
    userId: user.userId,
    nome: user.nome,
    email: user.email,
    telefone: user.telefone,
    cpf: user.cpf || '',
    address: user.address || null
  };
}

function normalizeUserAddress(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const cep = String(raw.cep || '').replace(/\D/g, '');
  const rua = String(raw.rua || '').trim();
  const numero = String(raw.numero || '').trim();
  const complemento = String(raw.complemento || '').trim();
  const bairro = String(raw.bairro || '').trim();
  const cidade = String(raw.cidade || '').trim();
  const uf = String(raw.uf || '').trim().toUpperCase().slice(0, 2);
  if (!rua && !cep && !cidade) return null;
  return { cep, rua, numero, complemento, bairro, cidade, uf };
}

function mergePaypalConfig(basePaypal, storedPaypal) {
  return { ...basePaypal, ...(storedPaypal || {}) };
}

function mergePaymentProviderConfig(baseCfg, storedCfg, defaultProvider) {
  const base = baseCfg || {};
  const stored = storedCfg || {};
  const resolveProvider = (p) => (p === 'mercadopago' ? 'mercadopago' : p === 'asaas' ? 'asaas' : null);
  const provider = resolveProvider(stored.provider) || resolveProvider(base.provider) || defaultProvider;
  const fallback = stored.fallbackToAlternate !== undefined
    ? stored.fallbackToAlternate !== false
    : (stored.fallbackToMercadoPago !== undefined
      ? stored.fallbackToMercadoPago !== false
      : (base.fallbackToAlternate !== undefined
        ? base.fallbackToAlternate !== false
        : base.fallbackToMercadoPago !== false));
  return { provider, fallbackToAlternate: fallback };
}

function mergeCardBrConfig(baseCardBr, storedCardBr) {
  return mergePaymentProviderConfig(
    baseCardBr || DEFAULT_CONFIG.payments.cardBr,
    storedCardBr,
    'asaas'
  );
}

function mergePixBrConfig(basePixBr, storedPixBr) {
  return mergePaymentProviderConfig(
    basePixBr || DEFAULT_CONFIG.payments.pixBr,
    storedPixBr,
    'mercadopago'
  );
}

function getCardBrProvider(config) {
  return config?.payments?.cardBr?.provider === 'mercadopago' ? 'mercadopago' : 'asaas';
}

function getPixBrProvider(config) {
  return config?.payments?.pixBr?.provider === 'asaas' ? 'asaas' : 'mercadopago';
}

function cardBrFallbackEnabled(config) {
  const cfg = config?.payments?.cardBr || {};
  if (cfg.fallbackToAlternate !== undefined) return cfg.fallbackToAlternate !== false;
  return cfg.fallbackToMercadoPago !== false;
}

function pixBrFallbackEnabled(config) {
  return config?.payments?.pixBr?.fallbackToAlternate !== false;
}

function isInternationalPayPalAvailable(config) {
  const paypal = config.payments?.paypal || {};
  return paypal.internationalEnabled !== false;
}

function isBrazilPayPalAvailable(config) {
  const paypal = config.payments?.paypal || {};
  return paypal.brazilEnabled !== false;
}

function isPixConfigValid(pix) {
  if (!pix) return false;
  const key = String(pix.key || '').trim();
  if (!key) return false;
  const type = pix.keyType || 'cnpj';
  const digits = key.replace(/\D/g, '');
  if (key.includes('@')) return type === 'email';
  if (type === 'cnpj') return digits.length === 14;
  if (type === 'cpf') return digits.length === 11;
  if (type === 'phone') return digits.length >= 10;
  if (type === 'email') return key.includes('@');
  return true;
}

/** PIX reserva: se a chave salva for inválida, usa o cadastro padrão (não quebra o checkout). */
function resolvePixConfig(pix, fallback = DEFAULT_CONFIG.pix) {
  const fb = fallback || DEFAULT_CONFIG.pix;
  const merged = {
    key: String(pix?.key || '').trim() || fb.key,
    keyType: pix?.keyType || fb.keyType,
    merchantName: String(pix?.merchantName || '').trim() || fb.merchantName,
    merchantCity: String(pix?.merchantCity || '').trim() || fb.merchantCity
  };
  return isPixConfigValid(merged) ? merged : { ...fb };
}

function publicProductFields(p, config) {
  const row = {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    price: p.price,
    image: p.image,
    active: p.active !== false,
    requiresSmartwatch: p.requiresSmartwatch !== false,
    weightGrams: Number(p.weightGrams) || shippingWeightGrams(config),
    aggregated: p.aggregated === true
  };
  if (p.nameEn) row.nameEn = p.nameEn;
  if (p.descriptionEn) row.descriptionEn = p.descriptionEn;
  if (p.packaging) row.packaging = p.packaging;
  if (p.compatibility) row.compatibility = p.compatibility;
  if (p.compatibleWatchModels?.length) row.compatibleWatchModels = p.compatibleWatchModels;
  if (p.sensorMm != null) row.sensorMm = Number(p.sensorMm);
  if (p.productType) row.productType = p.productType;
  if (p.bandStyle) row.bandStyle = p.bandStyle;
  if (p.color) row.color = p.color;
  if (p.colorEn) row.colorEn = p.colorEn;
  const stock = productStockQty(p);
  row.inStock = productInStock(p, 1);
  if (stock != null) row.stock = stock;
  return row;
}

function publicConfigView(config) {
  const products = getActiveProducts(config).map((p) => publicProductFields(p, config));
  const primary = products.find((p) => !p.aggregated) || products[0] || config.product;
  const paypal = config.payments?.paypal || {};
  return {
    product: primary ? {
      name: primary.name,
      description: primary.description,
      price: primary.price,
      image: primary.image
    } : config.product,
    products,
    pix: resolvePixConfig(config.pix, DEFAULT_CONFIG.pix),
    shipping: {
      originCep: config.shipping?.originCep || DEFAULT_CONFIG.shipping.originCep,
      weightGrams: shippingWeightGrams(config)
    },
    internationalShipping: config.internationalShipping || {},
    internationalSurcharge: getIntlSurcharge(config),
    internationalProduct: config.internationalProduct || DEFAULT_CONFIG.internationalProduct,
    payments: {
      paypal: {
        internationalEnabled: paypal.internationalEnabled !== false,
        brazilEnabled: paypal.brazilEnabled !== false
      },
      cardBr: {
        provider: getCardBrProvider(config)
      },
      pixBr: {
        provider: getPixBrProvider(config)
      }
    },
    smartwatchModels: config.smartwatchModels || DEFAULT_CONFIG.smartwatchModels,
    smartwatchModelMeta: config.smartwatchModelMeta || {},
    formsubmit: {
      email: config.formsubmit?.email || DEFAULT_CONFIG.formsubmit.email,
      subject: config.formsubmit?.subject || DEFAULT_CONFIG.formsubmit.subject
    },
    whatsapp: config.whatsapp || DEFAULT_CONFIG.whatsapp,
    siteUrl: config.siteUrl || DEFAULT_CONFIG.siteUrl,
    api: { baseUrl: config.api?.baseUrl || DEFAULT_CONFIG.api.baseUrl },
    updatedAt: config.updatedAt || null
  };
}

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_SEC = 1800;

function corsHeaders(origin) {
  const allowed = isAllowedSiteOrigin(origin);
  const headers = {
    'Access-Control-Allow-Methods': 'GET, PUT, PATCH, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, asaas-access-token',
    'Access-Control-Max-Age': '86400'
  };
  if (allowed) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function isAllowedSiteOrigin(origin) {
  return !!(origin && ALLOWED_ORIGINS.includes(origin));
}

function isAllowedSiteRequest(request) {
  const origin = request.headers.get('Origin') || '';
  if (isAllowedSiteOrigin(origin)) return true;
  const referer = request.headers.get('Referer') || '';
  if (ALLOWED_ORIGINS.some((o) => referer.startsWith(o))) return true;
  const fwdHost = (request.headers.get('X-Forwarded-Host') || request.headers.get('Host') || '').toLowerCase();
  return fwdHost === 'sensortattoofix.com.br' || fwdHost === 'www.sensortattoofix.com.br';
}

function isValidClickLogKey(body, env) {
  const key = String(body?.log_key || '').trim();
  if (!key) return false;
  const expected = String(env?.CLICK_LOG_KEY || CLICK_LOG_KEY_FALLBACK).trim();
  return key === expected;
}

function resolveRequestOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  if (isAllowedSiteOrigin(origin)) return origin;
  const referer = request.headers.get('Referer') || '';
  const fromRef = ALLOWED_ORIGINS.find((o) => referer.startsWith(o));
  return fromRef || ALLOWED_ORIGINS[0];
}

function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') ||
    (request.headers.get('X-Forwarded-For') || '').split(',')[0].trim() ||
    'unknown';
}

function generateOrderId() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
  return `STF-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${suffix}`;
}

function publicOrderView(order, { includePayment = false, includeResumeToken = false } = {}) {
  const view = {
    orderId: order.orderId,
    status: order.status,
    total: order.total,
    frete: order.frete,
    valorProduto: order.valorProduto,
    valorProdutoOriginal: order.valorProdutoOriginal ?? null,
    couponCode: order.couponCode || null,
    couponPercent: order.couponPercent ?? null,
    couponDiscount: order.couponDiscount ?? null,
    freteOriginal: order.freteOriginal ?? null,
    totalOriginal: order.totalOriginal ?? null,
    produto: order.produto || null,
    smartwatch: order.smartwatch || null,
    observacoes: trimObs(order) || null,
    modeloRelogio: formatOrderSmartwatch(order),
    pagamento: order.pagamento,
    paidAt: order.paidAt || null,
    createdAt: order.createdAt || null,
    selfTestPix: !!order.selfTestPix,
    selfTestPayPal: !!order.selfTestPayPal
  };
  if (includeResumeToken && order.status === 'pending_payment') {
    view.accessToken = order.accessToken;
  }
  if (includePayment && order.status === 'pending_payment') {
    view.payment = {
      billingType: order.paymentBillingType || 'PIX',
      pixCopyPaste: order.pixCopyPaste || null,
      pixQrEncoded: order.pixQrEncoded || null,
      invoiceUrl: order.invoiceUrl || null,
      approveUrl: order.paypalApproveUrl || null,
      autoConfirm: order.autoConfirm !== false
    };
    view.paisCode = order.paisCode || 'BR';
    view.shippingService = order.shippingService || null;
    view.shippingMethodId = order.shippingMethodId || null;
    view.shippingServiceCode = order.shippingServiceCode || null;
    if (Array.isArray(order.items) && order.items.length) {
      view.items = order.items.map((item) => ({
        productId: item.productId,
        slug: item.slug || item.productId,
        name: item.name,
        price: item.price,
        qty: item.qty,
        image: item.image,
        requiresSmartwatch: item.requiresSmartwatch !== false,
        aggregated: item.aggregated === true,
        productType: item.productType,
        bandStyle: item.bandStyle,
        color: item.color,
        compatibility: item.compatibility,
        weightGrams: item.weightGrams
      }));
    }
  }
  return view;
}

function pixTlv(id, value) {
  return id + String(value.length).padStart(2, '0') + value;
}

function pixCrc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function pixSanitize(str, max) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toUpperCase()
    .slice(0, max);
}

function normalizePixKey(key, keyType) {
  const raw = String(key || '').trim();
  if (keyType === 'cpf' || keyType === 'cnpj' || keyType === 'phone') return raw.replace(/\D/g, '');
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 14 || digits.length === 11) return digits;
  return raw;
}

function generateStaticPixPayload(config, order) {
  const pix = resolvePixConfig(config.pix, DEFAULT_CONFIG.pix);
  const name = pixSanitize(pix.merchantName, 25);
  const city = pixSanitize(pix.merchantCity, 15);
  const reference = String(order.orderId || 'STF').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25);
  const pixKey = normalizePixKey(pix.key, pix.keyType);
  const merchantAccount = pixTlv('00', 'br.gov.bcb.pix') + pixTlv('01', pixKey);
  let payload =
    pixTlv('00', '01') +
    pixTlv('26', merchantAccount) +
    pixTlv('52', '0000') +
    pixTlv('53', '986') +
    pixTlv('54', Number(order.total).toFixed(2)) +
    pixTlv('58', 'BR') +
    pixTlv('59', name) +
    pixTlv('60', city) +
    pixTlv('62', pixTlv('05', reference));
  payload += '6304';
  payload += pixCrc16(payload);
  return payload;
}

function attachPaymentToOrder(order, payment, config) {
  if (!payment) return;
  order.paymentBillingType = payment.billingType || 'PIX';
  order.autoConfirm = payment.autoConfirm !== false;
  if (payment.invoiceUrl) order.invoiceUrl = payment.invoiceUrl;
  if (payment.approveUrl) order.paypalApproveUrl = payment.approveUrl;
  if (payment.paypalOrderId) order.paypalOrderId = payment.paypalOrderId;
  if (payment.pixCopyPaste) {
    order.pixCopyPaste = payment.pixCopyPaste;
    order.pixQrEncoded = payment.pixQrEncoded || null;
  } else if (payment.billingType === 'PIX' || payment.provider === 'static_pix') {
    order.pixCopyPaste = generateStaticPixPayload(config, order);
  }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function trimObs(order) {
  if (!order) return '';
  return String(order.observacoes ?? '').trim();
}

/** Modelo final para produção/envio — usa observações quando for "Outro modelo". */
function formatOrderSmartwatch(order) {
  const model = String(order?.smartwatch || '').trim();
  const obs = trimObs(order);
  if (!model || model === 'N/A') return obs || 'N/A';
  if (model.includes('Outro modelo')) return obs || model;
  return obs ? `${model} — ${obs}` : model;
}

function orderIntlProductFields(order) {
  if ((order.paisCode || 'BR') === 'BR' || !order.internationalProductNote) return {};
  return { 'Produto internacional': order.internationalProductNote };
}

function orderWatchEmailFields(order) {
  const model = String(order?.smartwatch || '').trim();
  const obs = trimObs(order);
  if (!model && !obs) return {};
  if (!model || model === 'N/A') return obs ? { 'Modelo do relógio': obs } : {};
  return { 'Modelo do relógio': formatOrderSmartwatch(order) };
}

function watchWhatsAppBlock(order) {
  const model = String(order?.smartwatch || '').trim();
  const obs = trimObs(order);
  if (!model || model === 'N/A') return obs ? `📝 ${obs}` : '';
  if (model.includes('Outro modelo')) return obs ? `⌚ ${obs}` : `⌚ ${model}`;
  if (obs) return `⌚ ${model}\n📝 ${obs}`;
  return `⌚ ${model}`;
}

function labelPrintUrl(config, orderId) {
  const base = (config.siteUrl || 'https://www.sensortattoofix.com.br').replace(/\/$/, '');
  return `${base}/imprimir-etiqueta.html?order=${encodeURIComponent(orderId)}`;
}

function resumeOrderUrl(config, order) {
  const site = (config.siteUrl || 'https://www.sensortattoofix.com.br').replace(/\/$/, '');
  return `${site}/comprar.html?pedido=${encodeURIComponent(order.orderId)}&token=${encodeURIComponent(order.accessToken)}`;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

const PIX_QR_CID = 'pix-qrcode';

async function pixQrInlineAttachment(order) {
  if (order.pixQrEncoded) {
    return {
      filename: 'pix-qrcode.png',
      content: order.pixQrEncoded,
      content_type: 'image/png',
      content_id: PIX_QR_CID
    };
  }
  const payload = order.pixCopyPaste;
  if (!payload) return null;
  try {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&data=${encodeURIComponent(payload)}`;
    const res = await fetch(qrUrl);
    if (!res.ok) return null;
    return {
      filename: 'pix-qrcode.png',
      content: arrayBufferToBase64(await res.arrayBuffer()),
      content_type: 'image/png',
      content_id: PIX_QR_CID
    };
  } catch (err) {
    console.error('QR PIX e-mail:', err.message);
    return null;
  }
}

function buildPixPaymentEmail(order, config, { hasQrImage = false } = {}) {
  const emails = getEmails(config);
  const resumeUrl = resumeOrderUrl(config, order);
  const total = formatBRL(order.total);
  const copyPaste = order.pixCopyPaste || '';
  const greeting = applyEmailTemplate(emails.pixGreeting, { nome: order.nome, orderId: order.orderId });
  const intro = applyEmailTemplate(emails.pixIntro, { nome: order.nome, orderId: order.orderId });
  const footer = applyEmailTemplate(emails.pixFooter, { nome: order.nome, orderId: order.orderId });
  const qrImg = hasQrImage
    ? `<img src="cid:${PIX_QR_CID}" width="220" height="220" alt="QR Code PIX" style="display:block;margin:16px auto;border:1px solid #eee;border-radius:8px" />`
    : '';
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#222">
    <p>${escapeHtml(greeting)}</p>
    <p>${escapeHtml(intro)}</p>
    <p style="font-size:18px"><strong>Total: ${escapeHtml(total)}</strong></p>
    ${qrImg}
    <p style="font-size:13px;color:#555">Escaneie o QR Code no app do seu banco ou copie o código PIX:</p>
    <p style="word-break:break-all;font-family:monospace;font-size:11px;background:#f5f5f5;padding:12px;border-radius:8px;border:1px solid #ddd">${escapeHtml(copyPaste)}</p>
    <p style="margin-top:20px"><a href="${escapeHtml(resumeUrl)}" style="display:inline-block;background:#ffc107;color:#000;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px">Abrir pedido e pagar</a></p>
    <p style="font-size:12px;color:#666">${escapeHtml(footer)}</p>
    <p style="font-size:12px;color:#666;margin-top:16px">Modelo do relógio: ${escapeHtml(formatOrderSmartwatch(order))}${trimObs(order) && !String(order.smartwatch || '').includes('Outro modelo') ? `<br>Observações: ${escapeHtml(trimObs(order))}` : ''}<br>Sensor Tattoo Fix — sensortattoofix.com.br</p>
  </div>`;
  const text = [
    greeting,
    intro,
    `Pedido ${order.orderId} — Total: ${total}`,
    '',
    'Código PIX (copia e cola):',
    copyPaste,
    '',
    `Abrir pedido: ${resumeUrl}`,
    '',
    footer,
    '',
    `Modelo do relógio: ${formatOrderSmartwatch(order)}`,
    ...(trimObs(order) && !String(order.smartwatch || '').includes('Outro modelo')
      ? [`Observações: ${trimObs(order)}`]
      : [])
  ].join('\n');
  return { html, text };
}

async function getLoginLock(env, ip, scope = 'admin') {
  const raw = await env.STORE_KV.get(`login:${scope}:${ip}`);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (data.lockedUntil && Date.now() < data.lockedUntil) return data;
    if (data.lockedUntil && Date.now() >= data.lockedUntil) return null;
    return data;
  } catch {
    return null;
  }
}

async function recordLoginFailure(env, ip, scope = 'admin') {
  const key = `login:${scope}:${ip}`;
  const current = (await getLoginLock(env, ip, scope)) || { attempts: 0 };
  if (current.lockedUntil && Date.now() < current.lockedUntil) return current;
  const attempts = (current.attempts || 0) + 1;
  const data = attempts >= LOGIN_MAX_ATTEMPTS
    ? { attempts: 0, lockedUntil: Date.now() + LOGIN_LOCKOUT_SEC * 1000 }
    : { attempts };
  await env.STORE_KV.put(key, JSON.stringify(data), { expirationTtl: LOGIN_LOCKOUT_SEC });
  return data;
}

async function clearLoginFailures(env, ip, scope = 'admin') {
  await env.STORE_KV.delete(`login:${scope}:${ip}`);
}

function loginLockedResponse(lock, origin) {
  const retryAfter = Math.ceil((lock.lockedUntil - Date.now()) / 1000);
  return new Response(JSON.stringify({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfter),
      ...corsHeaders(origin)
    }
  });
}

function bearerToken(request) {
  return (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}

function onlyDigits(v) { return (v || '').replace(/\D/g, ''); }

function formatBRL(n) {
  return 'R$ ' + Number(n || 0).toFixed(2).replace('.', ',');
}

function asaasBase(env) {
  return env.ASAAS_SANDBOX === 'true'
    ? 'https://api-sandbox.asaas.com/v3'
    : 'https://api.asaas.com/v3';
}

function asaasApiKey(env) {
  return (env.ASAAS_API_KEY || '').trim();
}

function mercadoPagoToken(env) {
  return (env.MP_ACCESS_TOKEN || '').trim();
}

function isMpSandbox(env) {
  return mercadoPagoToken(env).startsWith('TEST-');
}

/** Com token TEST-, PIX de teste não aprova sozinho — simula confirmação após alguns segundos. */
async function maybeSandboxAutoConfirmPix(env, orderId, payment) {
  if (!isMpSandbox(env)) return;

  const provider = payment?.provider || 'mercadopago';
  const paymentId = payment?.paymentId;

  if (provider === 'mercadopago' && paymentId) {
    const token = mercadoPagoToken(env);
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const order = await getOrder(env, orderId);
      if (!order || order.status === 'paid') return;

      const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (data.status === 'approved') {
        await handlePaymentConfirmed(env, order, {
          id: data.id,
          provider: 'mercadopago',
          billingType: 'PIX',
          value: data.transaction_amount
        });
        return;
      }
    }
  } else {
    await new Promise((r) => setTimeout(r, 5000));
  }

  const order = await getOrder(env, orderId);
  if (order && order.status !== 'paid') {
    console.log('Sandbox PIX: auto-confirma pedido de teste', orderId, provider);
    await handlePaymentConfirmed(env, order, {
      provider,
      billingType: 'PIX',
      value: order.total,
      confirmedBy: 'sandbox_auto_test'
    });
  }
}

function mpHeaders(env, idempotencyKey) {
  return {
    Authorization: 'Bearer ' + mercadoPagoToken(env),
    'Content-Type': 'application/json',
    'X-Idempotency-Key': idempotencyKey || crypto.randomUUID()
  };
}

function asaasHeaders(apiKey) {
  return {
    access_token: apiKey,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'SensorTattooFix/1.0'
  };
}

function normalizePhoneBR(phone) {
  let digits = onlyDigits(phone);
  if (digits.length >= 12 && digits.startsWith('55')) digits = digits.slice(2);
  return digits;
}

async function asaasReadJson(res, step) {
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`${step}: resposta inválida do Asaas (HTTP ${res.status})`);
    }
  }
  if (!res.ok) {
    const msg = data?.errors?.[0]?.description || text || `HTTP ${res.status}`;
    throw new Error(`${step}: ${msg}`);
  }
  if (!data) {
    throw new Error(`${step}: resposta vazia do Asaas (HTTP ${res.status})`);
  }
  return data;
}

async function getConfig(env) {
  const raw = await env.STORE_KV.get(CONFIG_KEY);
  if (!raw) return structuredClone(DEFAULT_CONFIG);
  try { return withConfigDefaults(JSON.parse(raw)); } catch { return structuredClone(DEFAULT_CONFIG); }
}

async function saveConfig(env, config) {
  const normalized = withConfigDefaults(config);
  const toSave = { ...normalized, updatedAt: new Date().toISOString() };
  await env.STORE_KV.put(CONFIG_KEY, JSON.stringify(toSave));
  return toSave;
}

async function createSession(env) {
  const token = crypto.randomUUID();
  await env.STORE_KV.put('session:' + token, '1', { expirationTtl: 86400 });
  return token;
}

async function isValidSession(env, token) {
  return !!(token && await env.STORE_KV.get('session:' + token));
}

async function getOrder(env, orderId) {
  const raw = await env.STORE_KV.get('order:' + orderId);
  return raw ? JSON.parse(raw) : null;
}

async function readOrdersIndex(env) {
  try {
    const raw = await env.STORE_KV.get(ORDERS_INDEX);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('orders:index inválido, será reconstruído:', err.message);
    return [];
  }
}

function buildIndexEntry(order) {
  return {
    orderId: order.orderId,
    createdAt: order.createdAt,
    status: order.status,
    total: order.total,
    valorProduto: order.valorProduto,
    nome: order.nome,
    email: order.email,
    telefone: order.telefone,
    frete: order.frete,
    smartwatch: order.smartwatch,
    observacoes: trimObs(order) || null,
    modeloRelogio: formatOrderSmartwatch(order),
    pais: order.pais,
    pagamento: order.pagamento,
    endereco: order.endereco || '',
    produto: order.produto || '',
    userId: order.userId || null,
    couponCode: order.couponCode || null,
    couponCommissionerName: order.couponCommissionerName || null,
    couponCommissionerEmail: order.couponCommissionerEmail || null,
    couponDiscount: order.couponDiscount ?? null,
    couponCommissionPercent: order.couponCommissionPercent ?? null,
    couponCommissionAmount: order.couponCommissionAmount ?? null
  };
}

function orderFromIndexRow(item) {
  if (!item?.orderId) return null;
  const frete = Number(item.frete) || 0;
  const total = Number(item.total) || 0;
  return {
    ...item,
    endereco: item.endereco || '—',
    produto: item.produto || '—',
    valorProduto: item.valorProduto ?? Math.max(0, total - frete)
  };
}

async function rebuildOrdersIndexFromKv(env) {
  const list = await env.STORE_KV.list({ prefix: 'order:' });
  const entries = [];
  for (const key of list.keys) {
    const orderId = key.name.startsWith('order:') ? key.name.slice(6) : key.name;
    const order = await getOrder(env, orderId);
    if (order) entries.push(buildIndexEntry(order));
  }
  entries.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const trimmed = entries.slice(0, 2000);
  if (trimmed.length) {
    await env.STORE_KV.put(ORDERS_INDEX, JSON.stringify(trimmed));
  }
  return trimmed;
}

async function listOrdersForAdmin(env) {
  let index = await readOrdersIndex(env);
  if (!index.length) {
    index = await rebuildOrdersIndexFromKv(env);
  }

  const orders = [];
  let missingFull = 0;
  for (const item of index.slice(0, 500)) {
    const full = await getOrder(env, item.orderId);
    if (full) orders.push(full);
    else {
      missingFull++;
      const fallback = orderFromIndexRow(item);
      if (fallback) orders.push(fallback);
    }
  }

  if (missingFull > 0) {
    const rebuilt = await rebuildOrdersIndexFromKv(env);
    if (rebuilt.length && rebuilt.length !== index.length) {
      orders.length = 0;
      for (const item of rebuilt.slice(0, 500)) {
        const full = await getOrder(env, item.orderId);
        orders.push(full || orderFromIndexRow(item));
      }
    }
  }

  return orders;
}

async function saveOrder(env, order) {
  await env.STORE_KV.put('order:' + order.orderId, JSON.stringify(order));
  const index = await readOrdersIndex(env);
  const filtered = index.filter((o) => o.orderId !== order.orderId);
  filtered.unshift(buildIndexEntry(order));
  await env.STORE_KV.put(ORDERS_INDEX, JSON.stringify(filtered.slice(0, 2000)));
  if (order.userId) await linkOrderToUser(env, order.userId, order.orderId);
}

async function unlinkOrderFromUser(env, userId, orderId) {
  if (!userId) return;
  const key = 'user:' + userId + ':orders';
  const list = JSON.parse((await env.STORE_KV.get(key)) || '[]');
  const filtered = list.filter((id) => id !== orderId);
  if (filtered.length !== list.length) {
    await env.STORE_KV.put(key, JSON.stringify(filtered));
  }
}

async function deleteOrder(env, orderId) {
  const order = await getOrder(env, orderId);
  if (!order) return false;

  await env.STORE_KV.delete('order:' + orderId);

  const index = await readOrdersIndex(env);
  await env.STORE_KV.put(
    ORDERS_INDEX,
    JSON.stringify(index.filter((o) => o.orderId !== orderId))
  );

  if (order.userId) await unlinkOrderFromUser(env, order.userId, order.orderId);
  return true;
}

function normalizeWhatsAppPhone(phone) {
  let digits = onlyDigits(phone);
  if (!digits) return '';
  if (digits.length >= 12 && digits.startsWith('55')) return digits;
  if (digits.length === 10 || digits.length === 11) return '55' + digits;
  return digits;
}

async function sendWhatsApp(env, phone, message) {
  const instance = env.ZAPI_INSTANCE_ID;
  const token = env.ZAPI_TOKEN;
  if (!instance || !token) return false;

  const to = normalizeWhatsAppPhone(phone);
  if (!to) return false;

  const headers = { 'Content-Type': 'application/json' };
  if (env.ZAPI_CLIENT_TOKEN) headers['Client-Token'] = env.ZAPI_CLIENT_TOKEN;

  const res = await fetch(
    `https://api.z-api.io/instances/${instance}/token/${token}/send-text`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone: to, message })
    }
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('Z-API:', res.status, errText);
  }
  return res.ok;
}

function pixCustomerHint(order, shopPhone) {
  if (order.paymentProvider === 'static_pix') {
    const wa = onlyDigits(shopPhone);
    return `Pague o PIX exibido no site e envie o comprovante no WhatsApp da loja: ${wa || '5511913394665'}. A loja confirma o pagamento em seguida.`;
  }
  if (order.pagamento === 'PIX' || order.pagamento === 'pix') {
    return 'Pague o PIX gerado no site. A confirmação é automática.';
  }
  return 'Finalize o pagamento no link seguro.';
}

async function notifyWhatsApp(env, config, order, type) {
  const shopPhone = config.whatsapp || env.SHOP_WHATSAPP;
  const msgs = {
    order_customer: `✅ *Sensor Tattoo Fix*\n\nOlá ${order.nome}!\n\nPedido: *${order.orderId}*\n${watchWhatsAppBlock(order)}\nTotal: ${formatBRL(order.total)}\nPagamento: ${order.pagamento}\n\n${pixCustomerHint(order, shopPhone)}\n\nObrigado!`,
    order_shop: `🛒 *NOVO PEDIDO*\n\n${order.orderId}\n${order.nome}\n📱 ${order.telefone}\n${watchWhatsAppBlock(order)}\n🌍 ${order.pais}\n💰 ${formatBRL(order.total)}\n📦 ${order.shippingService}\n📍 ${order.endereco}`,
    paid_customer: shouldDispatchUberDelivery(order)
      ? `✅ *Pagamento confirmado!*\n\nPedido *${order.orderId}* pago.\n\n🚗 Entrega Uber solicitada. Você receberá o link de rastreio por e-mail em instantes.\n\nSensor Tattoo Fix`
      : `✅ *Pagamento confirmado!*\n\nPedido *${order.orderId}* pago com sucesso.\n\nSeu kit será postado em até 2 dias úteis. Você receberá o rastreio por e-mail.\n\nSensor Tattoo Fix`,
    paid_shop: shouldDispatchUberDelivery(order)
      ? `💰 *PAGAMENTO CONFIRMADO*\n\n${order.orderId}\nCliente: ${order.nome}\nValor: ${formatBRL(order.total)}\n${watchWhatsAppBlock(order)}\n\n🚗 Uber Direct — ${order.shippingService}\n📍 ${order.endereco}${order.uberTrackingUrl ? `\n🔗 ${order.uberTrackingUrl}` : ''}`
      : `💰 *PAGAMENTO CONFIRMADO*\n\n${order.orderId}\nCliente: ${order.nome}\nValor: ${formatBRL(order.total)}\n${watchWhatsAppBlock(order)}\n\n📮 Postar via ${order.shippingService}\n📍 ${order.endereco}`
  };

  const customerMsg = msgs[type + '_customer'];
  const shopMsg = msgs[type + '_shop'];

  if (customerMsg && order.telefone) await sendWhatsApp(env, order.telefone, customerMsg);
  if (shopMsg && shopPhone) await sendWhatsApp(env, shopPhone, shopMsg);
}

async function getCorreiosToken(env) {
  const contract = String(env.CORREIOS_CONTRACT || '').trim();
  const cacheKey = 'correios:token:' + (contract || 'user');
  const cached = await env.STORE_KV.get(cacheKey);
  if (cached) {
    const data = JSON.parse(cached);
    if (data.expiresAt > Date.now()) return data.token;
  }
  const user = env.CORREIOS_USER;
  const password = env.CORREIOS_PASSWORD;
  if (!user || !password) return null;

  const basic = btoa(user + ':' + password);
  const res = await fetch(
    contract ? 'https://api.correios.com.br/token/v1/autentica/cartaopostagem' : 'https://api.correios.com.br/token/v1/autentica',
    {
      method: 'POST',
      headers: { Authorization: 'Basic ' + basic, 'Content-Type': 'application/json' },
      body: contract ? JSON.stringify({ numero: contract }) : undefined
    }
  );
  if (!res.ok) {
    console.warn('Correios token:', res.status, await res.text().catch(() => ''));
    return null;
  }
  const data = await res.json();
  await env.STORE_KV.put(cacheKey, JSON.stringify({
    token: data.token,
    expiresAt: Date.now() + (Number(data.expiraEm || 3600) - 60) * 1000
  }));
  return data.token;
}

function uberConfigured(env) {
  return !!(
    env.UBER_DIRECT_CLIENT_ID
    && env.UBER_DIRECT_CLIENT_SECRET
    && env.UBER_DIRECT_CUSTOMER_ID
  );
}

function isUberSandbox(env) {
  const flag = String(env.UBER_DIRECT_SANDBOX || '').trim().toLowerCase();
  return flag === 'true' || flag === '1';
}

function formatCepUber(cep) {
  const d = onlyDigits(cep);
  if (d.length !== 8) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function formatUberStructuredAddress(parts) {
  const rua = String(parts.rua || '').trim();
  const numero = String(parts.numero || '').trim();
  const complemento = String(parts.complemento || '').trim();
  const street = numero ? `${rua}, ${numero}` : rua;
  const streetAddress = [street];
  if (complemento) streetAddress.push(complemento);
  return JSON.stringify({
    street_address: streetAddress.filter(Boolean),
    city: String(parts.cidade || '').trim(),
    state: String(parts.uf || '').trim().toUpperCase(),
    zip_code: formatCepUber(parts.cep),
    country: 'BR'
  });
}

function buildUberPickupParts(config) {
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const sender = ship.sender || {};
  return {
    rua: sender.rua,
    numero: sender.numero,
    complemento: sender.complemento,
    bairro: sender.bairro,
    cidade: sender.cidade,
    uf: sender.uf,
    cep: ship.originCep
  };
}

function dropoffPartsFromParams(params) {
  return {
    cep: params.cep,
    rua: params.rua,
    numero: params.numero,
    complemento: params.complemento,
    bairro: params.bairro,
    cidade: params.cidade,
    uf: params.uf
  };
}

function dropoffPartsFromOrder(order) {
  return {
    cep: order.cep,
    rua: order.rua,
    numero: order.numero,
    complemento: order.complemento,
    bairro: order.bairro,
    cidade: order.cidade,
    uf: order.uf
  };
}

function hasUberDropoffAddress(parts) {
  return onlyDigits(parts.cep).length === 8
    && String(parts.rua || '').trim().length >= 3
    && String(parts.cidade || '').trim().length >= 2
    && String(parts.uf || '').trim().length === 2;
}

function phoneToE164Br(phone) {
  const digits = onlyDigits(phone);
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`;
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return `+${digits}`;
}

function shopPhoneE164(config, env) {
  return phoneToE164Br(config.whatsapp || env.SHOP_WHATSAPP || '5511913394665');
}

async function getUberAccessToken(env) {
  const cached = await env.STORE_KV.get('uber:token');
  if (cached) {
    const data = JSON.parse(cached);
    if (data.expiresAt > Date.now()) return data.token;
  }
  if (!uberConfigured(env)) return null;

  const res = await fetch('https://auth.uber.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.UBER_DIRECT_CLIENT_ID,
      client_secret: env.UBER_DIRECT_CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'eats.deliveries'
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn('Uber OAuth:', res.status, data.error_description || data.error || '');
    await env.STORE_KV.delete('uber:token').catch(() => {});
    return null;
  }
  const ttl = Math.max(60, Number(data.expires_in || 3600) - 60);
  await env.STORE_KV.put('uber:token', JSON.stringify({
    token: data.access_token,
    expiresAt: Date.now() + ttl * 1000
  }));
  return data.access_token;
}

async function uberApiFetch(env, path, options = {}) {
  const token = await getUberAccessToken(env);
  if (!token) throw new Error('Uber Direct não autenticado.');
  const customerId = encodeURIComponent(env.UBER_DIRECT_CUSTOMER_ID);
  const res = await fetch(`https://api.uber.com/v1/customers/${customerId}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || data.error || data.code || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.metadata = data.metadata || data;
    throw err;
  }
  return data;
}

function uberFeeToBRL(data) {
  const cents = Number(data.fee ?? data.quote?.fee ?? 0);
  return Math.round(cents) / 100;
}

function uberEtaMinutes(data) {
  const duration = Number(data.duration ?? data.quote?.duration ?? 0);
  if (duration > 0) return Math.max(15, Math.round(duration));
  const eta = data.dropoff_eta || data.quote?.dropoff_eta;
  if (eta) {
    const diff = (new Date(eta).getTime() - Date.now()) / 60000;
    if (diff > 0) return Math.round(diff);
  }
  return 60;
}

const UBER_MAX_RADIUS_KM = 4.9;

async function uberEstimatedRoadKm(config, dropoffParts) {
  const destCep = dropoffParts?.cep;
  if (!destCep || String(destCep).replace(/\D/g, '').length !== 8) return null;
  const [origin, dest] = await Promise.all([
    fetchOriginCoordinates(config),
    fetchDestCoordinates(destCep, dropoffParts)
  ]);
  if (!origin || !dest) return null;
  const straightKm = haversineKm(origin.lat, origin.lon, dest.lat, dest.lon);
  const roadFactor = getMotoboyConfig(config).roadFactor || DEFAULT_MOTOBOY_SHIPPING.roadFactor;
  return Math.round(straightKm * roadFactor * 10) / 10;
}

async function isWithinUberRadius(config, dropoffParts) {
  const roadKm = await uberEstimatedRoadKm(config, dropoffParts);
  if (roadKm == null) return true;
  return roadKm <= UBER_MAX_RADIUS_KM;
}

function isUberRadiusError(err) {
  const blob = `${err?.message || ''} ${JSON.stringify(err?.metadata || '')}`;
  return /deliverable area|delivery radius|Max Radius/i.test(blob);
}

async function requestUberQuote(env, config, dropoffParts) {
  const pickup = buildUberPickupParts(config);
  if (!hasUberDropoffAddress(dropoffParts)) return null;

  const body = {
    pickup_address: formatUberStructuredAddress(pickup),
    dropoff_address: formatUberStructuredAddress(dropoffParts)
  };
  const data = await uberApiFetch(env, '/delivery_quotes', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  const price = uberFeeToBRL(data);
  if (price <= 0) {
    console.warn('Uber quote sem preço:', JSON.stringify(data).slice(0, 400));
    return null;
  }
  return {
    uberQuoteId: data.id,
    price,
    etaMinutes: uberEtaMinutes(data),
    currency: data.currency || data.currency_type || 'BRL'
  };
}

async function quoteUberShippingOptions(env, config, addressParams, opts = {}) {
  const methods = getEnabledShippingMethods(config, 'BR').filter(isUberMethod);
  if (!methods.length || !uberConfigured(env)) return [];

  const dropoff = dropoffPartsFromParams(addressParams);
  if (!hasUberDropoffAddress(dropoff)) return [];

  try {
    if (!(await isWithinUberRadius(config, dropoff))) {
      console.warn('Uber quote: fora do raio (~5 km)', dropoff.cep);
      return [];
    }
    const quote = await requestUberQuote(env, config, dropoff);
    if (!quote) return [];
    return methods.map((method) => ({
      id: method.id,
      methodId: method.id,
      serviceCode: null,
      service: method.label || 'Entrega Uber',
      price: quote.price,
      days: 0,
      etaMinutes: quote.etaMinutes,
      source: 'uber',
      provider: 'uber',
      uberQuoteId: quote.uberQuoteId,
      testMode: isUberSandbox(env),
      weightGrams: shippingWeightGrams(config, opts.weightGrams)
    }));
  } catch (err) {
    console.warn('Uber quote:', err.message);
    return [];
  }
}

function buildUberManifest(order, config) {
  const items = order.items?.length
    ? order.items
    : [{ name: config.product?.name || 'Kit Sensor Tattoo Fix', qty: 1, price: order.valorProduto || config.product?.price || 62.9 }];
  return items.map((item) => ({
    name: String(item.name || 'Produto').slice(0, 100),
    quantity: Math.max(1, Number(item.qty) || 1),
    size: 'small',
    price: Math.max(0, Math.round((Number(item.price) || 0) * 100))
  }));
}

async function createUberDeliveryForOrder(env, config, order) {
  if (!uberConfigured(env)) throw new Error('Uber Direct não configurado.');
  const pickup = buildUberPickupParts(config);
  const dropoff = dropoffPartsFromOrder(order);
  if (!hasUberDropoffAddress(dropoff)) throw new Error('Endereço incompleto para Uber.');

  const pickupPhone = shopPhoneE164(config, env);
  const dropoffPhone = phoneToE164Br(order.telefone);
  if (!pickupPhone || !dropoffPhone) throw new Error('Telefone inválido para Uber.');

  const pickupAddress = formatUberStructuredAddress(pickup);
  const dropoffAddress = formatUberStructuredAddress(dropoff);
  const sender = config.shipping?.sender || DEFAULT_CONFIG.shipping.sender;

  let quoteId = order.uberQuoteId || null;
  if (!quoteId) {
    const fresh = await requestUberQuote(env, config, dropoff);
    if (!fresh?.uberQuoteId) throw new Error('Não foi possível cotar Uber.');
    quoteId = fresh.uberQuoteId;
    order.uberQuoteId = quoteId;
  }

  const deliveryBody = {
    quote_id: quoteId,
    pickup_name: sender.brand || sender.company || 'Sensor Tattoo Fix',
    pickup_address: pickupAddress,
    pickup_phone_number: pickupPhone,
    dropoff_name: order.nome,
    dropoff_address: dropoffAddress,
    dropoff_phone_number: dropoffPhone,
    manifest_items: buildUberManifest(order, config),
    deliverable_action: 'deliverable_action_meet_at_door',
    undeliverable_action: 'return',
    external_id: order.orderId
  };
  if (isUberSandbox(env)) {
    deliveryBody.test_specifications = {
      robo_courier_specification: { mode: 'auto' }
    };
  }

  let data;
  try {
    data = await uberApiFetch(env, '/deliveries', {
      method: 'POST',
      body: JSON.stringify(deliveryBody)
    });
  } catch (err) {
    if (err.status === 400 || err.status === 409) {
      const fresh = await requestUberQuote(env, config, dropoff);
      if (!fresh?.uberQuoteId) throw err;
      deliveryBody.quote_id = fresh.uberQuoteId;
      order.uberQuoteId = fresh.uberQuoteId;
      data = await uberApiFetch(env, '/deliveries', {
        method: 'POST',
        body: JSON.stringify(deliveryBody)
      });
    } else {
      throw err;
    }
  }

  return {
    uberDeliveryId: data.id || data.delivery_id || null,
    uberTrackingUrl: data.tracking_url || data.trackingUrl || null,
    uberDeliveryStatus: data.status || 'pending',
    uberQuoteId: order.uberQuoteId,
    shippingProvider: 'uber'
  };
}

/** Endereço de teste para integração Uber — mesma rua da loja (~poucas centenas de metros). */
function uberIntegrationTestDropoff(config) {
  const ship = config?.shipping || DEFAULT_CONFIG.shipping;
  const sender = ship.sender || {};
  return {
    cep: ship.originCep || '02537190',
    rua: sender.rua || 'Rua Engenheiro Roberto Dabus Buazar',
    numero: '200',
    bairro: sender.bairro || 'Imirim',
    cidade: sender.cidade || 'São Paulo',
    uf: sender.uf || 'SP'
  };
}

async function checkUberIntegration(env, config) {
  if (!uberConfigured(env)) {
    return { configured: false, authOk: false, error: 'UBER_DIRECT_* não configurados.' };
  }
  const sandbox = isUberSandbox(env);
  try {
    const token = await getUberAccessToken(env);
    if (!token) {
      return {
        configured: true,
        authOk: false,
        sandbox,
        error: 'Token OAuth não obtido. Use Client ID/Secret da aba Developer (modo Test se UBER_DIRECT_SANDBOX=true).'
      };
    }
    const dropoff = uberIntegrationTestDropoff(config);
    const quote = await requestUberQuote(env, config, dropoff);
    if (!quote) {
      return {
        configured: true,
        authOk: true,
        quoteOk: false,
        sandbox,
        error: 'OAuth OK, mas cotação vazia. Confira Customer ID (aba Developer). Uber entrega só em ~5 km da loja (Imirim).'
      };
    }
    return {
      configured: true,
      authOk: true,
      quoteOk: true,
      sandbox,
      samplePrice: quote.price
    };
  } catch (err) {
    if (isUberRadiusError(err)) {
      return {
        configured: true,
        authOk: true,
        quoteOk: false,
        sandbox,
        error: `OAuth OK. A Uber limita entrega a ~5 km (3,1 mi) da loja no Imirim — não dá para aumentar pelo site. Fora disso, o checkout oculta a opção Uber.`
      };
    }
    const extra = err.metadata ? ` — ${JSON.stringify(err.metadata)}` : '';
    return {
      configured: true,
      authOk: !!await getUberAccessToken(env),
      quoteOk: false,
      sandbox,
      error: (err.message || 'Falha na cotação Uber') + extra
    };
  }
}

function estimateBR(originCep, destCep) {
  const o = parseInt(onlyDigits(originCep).slice(0, 5), 10) || 0;
  const d = parseInt(onlyDigits(destCep).slice(0, 5), 10) || 0;
  const diff = Math.abs(o - d);
  if (diff < 800) return { price: 11.9, days: 8 };
  if (diff < 3000) return { price: 15.9, days: 10 };
  if (diff < 8000) return { price: 19.9, days: 12 };
  return { price: 24.9, days: 14 };
}

function estimateBRForMethod(originCep, destCep, method, weightFactor, config) {
  const base = estimateBR(originCep, destCep);
  const ship = config?.shipping || DEFAULT_CONFIG.shipping;
  const code = String(method?.correiosCode || '').trim();
  let priceMult = 1;
  let daysAdj = 0;
  if (code === '8010') {
    priceMult = 1.2;
    daysAdj = -1;
  }
  const maxPrice = Number(ship.estimateMaxPrice) > 0 ? Number(ship.estimateMaxPrice) : 24.9;
  const maxDays = Number(ship.estimateMaxDays) > 0 ? Number(ship.estimateMaxDays) : 14;
  const factor = Math.min(2.5, Math.max(1, Number(weightFactor) || 1));
  const price = Math.min(
    Math.round(base.price * priceMult * factor * 100) / 100,
    Math.round(maxPrice * factor * 100) / 100
  );
  const days = Math.min(Math.max(1, base.days + daysAdj), maxDays);
  return { price, days };
}

/** Estimativa conservadora (teto) quando a API Correios não responde — evita cobrar menos que o frete real. */
function estimateBRMax(config, weightGrams) {
  const ship = config?.shipping || DEFAULT_CONFIG.shipping;
  const baseWeight = shippingWeightGrams(config);
  const w = Number(weightGrams) > 0 ? Number(weightGrams) : baseWeight;
  const weightFactor = Math.min(2.5, Math.max(1, w / baseWeight));
  const maxPrice = Number(ship.estimateMaxPrice) > 0 ? Number(ship.estimateMaxPrice) : 24.9;
  const maxDays = Number(ship.estimateMaxDays) > 0 ? Number(ship.estimateMaxDays) : 14;
  return {
    price: Math.round(maxPrice * weightFactor * 100) / 100,
    days: maxDays
  };
}

const SELF_TEST_PIX_AMOUNT = 0.01;

function normalizeAddrPart(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeStreetNumber(value) {
  return normalizeAddrPart(value).replace(/^(s\/n|sn)$/, '0');
}

/** PIX em produção: R$ 0,01 quando entrega = endereço do remetente (admin). Só com token APP_USR-. */
function isSelfTestPixEligible(order, config, env, billingType) {
  if (billingType !== 'PIX') return false;
  if (isMpSandbox(env)) return false;
  if (!mercadoPagoToken(env)) return false;
  if ((order.paisCode || 'BR') !== 'BR') return false;

  const ship = config.shipping || DEFAULT_CONFIG.shipping || {};
  const sender = ship.sender || {};
  if (!sender.rua || !ship.originCep) return false;

  const orderCep = onlyDigits(order.cep);
  const originCep = onlyDigits(ship.originCep);
  if (orderCep.length !== 8 || orderCep !== originCep) return false;
  if (normalizeAddrPart(order.rua) !== normalizeAddrPart(sender.rua)) return false;
  if (normalizeStreetNumber(order.numero) !== normalizeStreetNumber(sender.numero)) return false;
  if (sender.bairro && normalizeAddrPart(order.bairro) !== normalizeAddrPart(sender.bairro)) return false;
  if (sender.cidade && normalizeAddrPart(order.cidade) !== normalizeAddrPart(sender.cidade)) return false;
  if (sender.uf && normalizeAddrPart(order.uf) !== normalizeAddrPart(sender.uf)) return false;

  return true;
}

function applySelfTestPixPricing(order, config, env, billingType) {
  if (!isSelfTestPixEligible(order, config, env, billingType)) return false;
  if (order.valorProdutoOriginal == null) order.valorProdutoOriginal = order.valorProduto;
  order.freteOriginal = order.frete;
  order.totalOriginal = order.total;
  order.selfTestPix = true;
  order.frete = 0;
  order.valorProduto = SELF_TEST_PIX_AMOUNT;
  order.total = SELF_TEST_PIX_AMOUNT;
  return true;
}

function paypalCredentials(env) {
  return {
    clientId: String(env.PAYPAL_CLIENT_ID || '').trim(),
    secret: String(env.PAYPAL_CLIENT_SECRET || '').trim()
  };
}

function isPayPalSandbox(env, clientId) {
  const id = clientId || paypalCredentials(env).clientId;
  const flag = String(env.PAYPAL_SANDBOX || '').trim().toLowerCase();
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;
  return id.startsWith('sb-');
}

/** PayPal Live: R$ 0,01 quando PAYPAL_SELF_TEST=true (remover após validar). */
function isSelfTestPayPalEligible(env, billingType) {
  if (billingType !== 'PAYPAL') return false;
  if (env.PAYPAL_SELF_TEST !== 'true' && env.PAYPAL_SELF_TEST !== '1') return false;
  const { clientId } = paypalCredentials(env);
  return !isPayPalSandbox(env, clientId) && !!clientId;
}

function applySelfTestPayPalPricing(order, env, billingType) {
  if (!isSelfTestPayPalEligible(env, billingType)) return false;
  if (order.valorProdutoOriginal == null) order.valorProdutoOriginal = order.valorProduto;
  order.freteOriginal = order.frete;
  order.totalOriginal = order.total;
  order.selfTestPayPal = true;
  order.frete = 0;
  order.valorProduto = SELF_TEST_PIX_AMOUNT;
  order.total = SELF_TEST_PIX_AMOUNT;
  return true;
}

/** Pedido simbólico (PIX/PayPal R$ 0,01) — não dispara entrega real. */
function isSelfTestOrder(order) {
  if (order?.selfTestPix || order?.selfTestPayPal) return true;
  const total = Number(order?.total);
  return Number.isFinite(total) && total > 0 && total <= SELF_TEST_PIX_AMOUNT + 1e-9;
}

function shouldDispatchUberDelivery(order) {
  return isUberOrder(order) && !isSelfTestOrder(order);
}

function correiosPackageParams(ship, weightGrams) {
  const weight = Math.max(1, Math.round(Number(weightGrams) || 1));
  return {
    psObjeto: String(weight),
    tpObjeto: '2',
    comprimento: String(Math.max(16, Number(ship.lengthCm) || 16)),
    largura: String(Math.max(11, Number(ship.widthCm) || 12)),
    altura: String(Math.max(2, Number(ship.heightCm) || 2))
  };
}

/** Mini Envios (04227) exige serviço adicional 065 (Valor Declarado Mini Envios) junto com vlDeclarado. */
const CORREIOS_SERV_ADIC_VALOR_DECLARADO_MINI = '065';

function clampCorreiosDeclaredValue(serviceCode, declaredValue) {
  const value = Number(declaredValue);
  if (!Number.isFinite(value) || value <= 0) return 62.9;
  if (String(serviceCode || '').trim() !== '04227') return value;
  return Math.min(116.7, Math.max(12.82, value));
}

function correiosPriceServicosAdicionais(serviceCode, declaredValue) {
  const code = String(serviceCode || '').trim();
  const value = clampCorreiosDeclaredValue(code, declaredValue);
  if (code === '04227' && value > 0) {
    return [{ coServAdicional: CORREIOS_SERV_ADIC_VALOR_DECLARADO_MINI }];
  }
  return [];
}

function appendCorreiosPriceQueryParams(params, serviceCode, declaredValue) {
  for (const item of correiosPriceServicosAdicionais(serviceCode, declaredValue)) {
    params.append('servicosAdicionais', item.coServAdicional);
  }
}

function parseCorreiosPrice(data) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;
  if (row.txErro || row.cdErro) {
    console.warn('Correios preço erro:', row.txErro || row.cdErro);
    return null;
  }
  const raw = row.pcFinal ?? row.vlTotal ?? row.preco ?? row.vlPreco ?? row.valor;
  const price = parseBRPrice(raw);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function parseCorreiosDays(data, fallback = 12) {
  const row = Array.isArray(data) ? data[0] : data;
  const days = Number(row?.prazoEntrega ?? row?.prazo ?? row?.nuPrazo);
  return Number.isFinite(days) && days > 0 ? days : fallback;
}

async function fetchCorreiosPriceGet(token, serviceCode, origin, dest, ship, weightGrams, declaredValue) {
  const vlDeclarado = clampCorreiosDeclaredValue(serviceCode, declaredValue);
  const params = new URLSearchParams({
    cepDestino: dest,
    cepOrigem: origin,
    ...correiosPackageParams(ship, weightGrams),
    vlDeclarado: String(vlDeclarado.toFixed(2))
  });
  appendCorreiosPriceQueryParams(params, serviceCode, vlDeclarado);
  const res = await fetch(`https://api.correios.com.br/preco/v1/nacional/${serviceCode}?${params}`, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
  });
  const bodyText = await res.text().catch(() => '');
  if (!res.ok) {
    console.warn('Correios preço GET:', serviceCode, res.status, bodyText.slice(0, 300));
    return null;
  }
  try {
    return bodyText ? JSON.parse(bodyText) : null;
  } catch {
    console.warn('Correios preço GET: JSON inválido', serviceCode);
    return null;
  }
}

async function fetchCorreiosPricePost(token, serviceCode, origin, dest, ship, weightGrams, declaredValue) {
  const vlDeclarado = clampCorreiosDeclaredValue(serviceCode, declaredValue);
  const servicosAdicionais = correiosPriceServicosAdicionais(serviceCode, vlDeclarado);
  const res = await fetch('https://api.correios.com.br/preco/v1/nacional', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      idLote: '1',
      parametrosProduto: [{
        coProduto: serviceCode,
        nuRequisicao: '1',
        cepOrigem: origin,
        cepDestino: dest,
        ...correiosPackageParams(ship, weightGrams),
        ...(servicosAdicionais.length ? { servicosAdicionais } : {}),
        vlDeclarado: String(vlDeclarado.toFixed(2))
      }]
    })
  });
  const bodyText = await res.text().catch(() => '');
  if (!res.ok) {
    console.warn('Correios preço POST:', serviceCode, res.status, bodyText.slice(0, 300));
    return null;
  }
  try {
    return bodyText ? JSON.parse(bodyText) : null;
  } catch {
    console.warn('Correios preço POST: JSON inválido', serviceCode);
    return null;
  }
}

async function fetchCorreiosPrazo(token, serviceCode, origin, dest) {
  const params = new URLSearchParams({ cepOrigem: origin, cepDestino: dest });
  const res = await fetch(`https://api.correios.com.br/prazo/v1/nacional/${serviceCode}?${params}`, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
  });
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

const CORREIOS_INTEGRATION_TEST_DEST = '01310100';

function correiosIntegrationTestParams(config) {
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const origin = onlyDigits(ship.originCep);
  const serviceCode = String(ship.serviceCode || '04227').trim();
  const weightGrams = shippingWeightGrams(config);
  const declaredValue = Number(config.product?.price) || 62.9;
  return { ship, origin, dest: CORREIOS_INTEGRATION_TEST_DEST, serviceCode, weightGrams, declaredValue };
}

function extractCorreiosApiError(res, bodyText) {
  const raw = String(bodyText || '').trim();
  if (raw.includes('GTW-012')) {
    const apiMatch = raw.match(/API:\s*(\d+)/i);
    return apiMatch
      ? `GTW-012 — API ${apiMatch[1]} restrita (aguardando liberação no contrato)`
      : 'GTW-012 — API restrita (aguardando liberação no contrato)';
  }
  if (!res.ok) {
    try {
      const data = JSON.parse(raw);
      return data.mensagem || data.message || (Array.isArray(data.msgs) && data.msgs[0])
        || data.txErro || (data.cdErro ? `cdErro ${data.cdErro}` : null) || `HTTP ${res.status}`;
    } catch {
      return raw ? raw.slice(0, 140) : `HTTP ${res.status}`;
    }
  }
  try {
    const data = raw ? JSON.parse(raw) : null;
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.txErro) return String(row.txErro);
    if (row?.cdErro) return `cdErro ${row.cdErro}`;
  } catch { /* ignore */ }
  return null;
}

async function probeCorreiosPrecoApi(token, config) {
  const { ship, origin, dest, serviceCode, weightGrams, declaredValue } = correiosIntegrationTestParams(config);
  if (origin.length !== 8) {
    return { ok: false, detail: 'CEP de origem inválido — configure em Frete → Correios BR' };
  }
  const params = new URLSearchParams({
    cepDestino: dest,
    cepOrigem: origin,
    ...correiosPackageParams(ship, weightGrams),
    vlDeclarado: String(clampCorreiosDeclaredValue(serviceCode, declaredValue).toFixed(2))
  });
  appendCorreiosPriceQueryParams(params, serviceCode, declaredValue);
  const res = await fetch(`https://api.correios.com.br/preco/v1/nacional/${serviceCode}?${params}`, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
  });
  const bodyText = await res.text().catch(() => '');
  if (res.ok) {
    try {
      const data = bodyText ? JSON.parse(bodyText) : null;
      const price = parseCorreiosPrice(data);
      if (price) {
        return {
          ok: true,
          detail: `OK — serviço ${serviceCode} teste R$ ${price.toFixed(2).replace('.', ',')}`
        };
      }
      return { ok: false, detail: extractCorreiosApiError(res, bodyText) || 'Resposta sem preço válido' };
    } catch {
      return { ok: false, detail: 'Resposta JSON inválida' };
    }
  }
  return { ok: false, detail: extractCorreiosApiError(res, bodyText) };
}

async function probeCorreiosPrazoApi(token, config) {
  const { origin, dest, serviceCode } = correiosIntegrationTestParams(config);
  if (origin.length !== 8) {
    return { ok: false, detail: 'CEP de origem inválido — configure em Frete → Correios BR' };
  }
  const params = new URLSearchParams({ cepOrigem: origin, cepDestino: dest });
  const res = await fetch(`https://api.correios.com.br/prazo/v1/nacional/${serviceCode}?${params}`, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
  });
  const bodyText = await res.text().catch(() => '');
  if (res.ok) {
    try {
      const data = bodyText ? JSON.parse(bodyText) : null;
      const days = parseCorreiosDays(data, 0);
      if (days > 0) {
        return { ok: true, detail: `OK — serviço ${serviceCode} teste ${days} dia(s)` };
      }
      return { ok: false, detail: extractCorreiosApiError(res, bodyText) || 'Resposta sem prazo válido' };
    } catch {
      return { ok: false, detail: 'Resposta JSON inválida' };
    }
  }
  return { ok: false, detail: extractCorreiosApiError(res, bodyText) };
}

function correiosCnpj(env) {
  return onlyDigits(env.CORREIOS_USER || '');
}

function correiosCommercialContract(env) {
  return String(env.CORREIOS_COMMERCIAL_CONTRACT || '9912752041').trim();
}

function correiosCartaoPostagem(env) {
  return String(env.CORREIOS_CONTRACT || '').trim();
}

async function probeCorreiosCartaoServico(token, env, serviceCode) {
  const cnpj = correiosCnpj(env);
  const contrato = correiosCommercialContract(env);
  const cartao = correiosCartaoPostagem(env);
  if (cnpj.length !== 14) {
    return { ok: false, detail: 'CORREIOS_USER deve ser o CNPJ (14 dígitos)' };
  }
  if (!contrato || !cartao) {
    return {
      ok: false,
      detail: 'Configure CORREIOS_CONTRACT (cartão) e CORREIOS_COMMERCIAL_CONTRACT (contrato comercial)'
    };
  }
  const url = `https://api.correios.com.br/meucontrato/v1/empresas/${cnpj}/contratos/${contrato}/cartoes/${cartao}/servicos/${serviceCode}`;
  const res = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
  });
  const bodyText = await res.text().catch(() => '');
  if (res.ok) {
    try {
      const data = bodyText ? JSON.parse(bodyText) : null;
      const desc = data?.descricao || data?.descricaoServico || 'no cartão';
      return { ok: true, detail: `OK — Correios serviço ${serviceCode} (${desc})` };
    } catch {
      return { ok: true, detail: `OK — Correios serviço ${serviceCode} no cartão ${cartao}` };
    }
  }
  if (res.status === 404 || bodyText.includes('CON-011')) {
    return {
      ok: false,
      detail: `CON-011 — Correios serviço ${serviceCode} ausente no cartão ${cartao} (solicite ao gestor Correios)`
    };
  }
  return { ok: false, detail: extractCorreiosApiError(res, bodyText) || `HTTP ${res.status}` };
}

async function probeCorreiosPrePostagemApi(token) {
  const res = await fetch('https://api.correios.com.br/prepostagem/v1/prepostagens/rotulo/assincrono/pdf', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ idsPrePostagem: [], tipoRotulo: 'P', formatoRotulo: 'ET' })
  });
  const bodyText = await res.text().catch(() => '');
  if (bodyText.includes('GTW-012')) {
    const apiMatch = bodyText.match(/API:\s*(\d+)/i);
    return {
      ok: false,
      detail: apiMatch
        ? `GTW-012 — API ${apiMatch[1]} restrita (aguardando liberação no contrato)`
        : 'GTW-012 — API 36 restrita (aguardando liberação no contrato)'
    };
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, detail: extractCorreiosApiError(res, bodyText) || `HTTP ${res.status}` };
  }
  return { ok: true, detail: 'OK — API 36 (Pré-Postagem) acessível' };
}

function normalizeCorreiosPhone(telefone) {
  const d = onlyDigits(telefone);
  if (d.length >= 10) {
    return { ddd: d.slice(0, 2), numero: d.slice(-8) };
  }
  return { ddd: '11', numero: '00000000' };
}

function buildCorreiosEndereco(parts) {
  return {
    cep: onlyDigits(parts.cep),
    logradouro: String(parts.rua || parts.logradouro || '').trim(),
    numero: String(parts.numero || 'S/N').trim() || 'S/N',
    complemento: String(parts.complemento || '').trim(),
    bairro: String(parts.bairro || '').trim(),
    cidade: String(parts.cidade || '').trim(),
    uf: String(parts.uf || '').trim().toUpperCase()
  };
}

function buildPrePostagemPayload(order, config, env) {
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const sender = ship.sender || {};
  const weightGrams = shippingWeightGrams(config);
  const serviceCode = String(order.shippingServiceCode || ship.serviceCode || '04227').trim();
  const declaredValue = Number(order.valorProduto) || Number(config.product?.price) || 62.9;
  const remetentePhone = normalizeCorreiosPhone(config.whatsapp?.shop || config.whatsapp?.number || '');
  const destPhone = normalizeCorreiosPhone(order.telefone || '');

  return {
    codigoServico: serviceCode,
    pesoInformado: String(Math.max(1, Math.round(weightGrams))),
    codigoFormatoObjetoInformado: '2',
    alturaInformada: String(Math.max(2, Math.ceil(Number(ship.heightCm) || 2))),
    larguraInformada: String(Math.max(11, Math.round(Number(ship.widthCm) || 12))),
    comprimentoInformado: String(Math.max(16, Math.round(Number(ship.lengthCm) || 16))),
    cienteObjetoNaoProibido: '1',
    modalidadePagamento: '1',
    remetente: {
      nome: String(sender.company || sender.brand || 'Remetente').trim(),
      cpfCnpj: onlyDigits(sender.cnpj || env.CORREIOS_USER || ''),
      telefone: remetentePhone.numero,
      dddTelefone: remetentePhone.ddd,
      email: String(config.formsubmit?.email || '').trim(),
      endereco: buildCorreiosEndereco({
        cep: ship.originCep,
        rua: sender.rua,
        numero: sender.numero,
        complemento: sender.complemento,
        bairro: sender.bairro,
        cidade: sender.cidade,
        uf: sender.uf
      })
    },
    destinatario: {
      nome: String(order.nome || '').trim(),
      cpfCnpj: onlyDigits(order.cpf || ''),
      telefone: destPhone.numero,
      dddTelefone: destPhone.ddd,
      email: String(order.email || '').trim(),
      endereco: buildCorreiosEndereco({
        cep: order.cep,
        rua: order.rua,
        numero: order.numero,
        complemento: order.complemento,
        bairro: order.bairro,
        cidade: order.cidade,
        uf: order.uf
      })
    },
    itensDeclaracaoConteudo: [{
      conteudo: String(order.produto || 'Produto Sensor Tattoo Fix').slice(0, 80),
      quantidade: '1',
      valor: declaredValue.toFixed(2)
    }]
  };
}

function summarizeCorreiosTracking(data) {
  const obj = Array.isArray(data?.objetos) ? data.objetos[0] : data?.objeto;
  if (!obj) return { status: 'Sem eventos', lastEvent: null, events: [] };
  const events = Array.isArray(obj.eventos) ? obj.eventos : [];
  const sorted = [...events].sort((a, b) => new Date(b.dtHrCriado) - new Date(a.dtHrCriado));
  const last = sorted[0];
  const lastEvent = last ? {
    date: last.dtHrCriado,
    description: String(last.descricao || '').trim(),
    detail: String(last.detalhe || '').trim()
  } : null;
  const desc = (last?.descricao || '').toLowerCase();
  let status = events.length ? 'Aguardando postagem na agência' : 'Pré-postado';
  if (desc.includes('entregue')) status = 'Entregue';
  else if (desc.includes('saiu para entrega')) status = 'Saiu para entrega';
  else if (desc.includes('postado')) status = 'Postado';
  else if (desc.includes('trânsito') || desc.includes('transito')) status = 'Em trânsito';
  else if (lastEvent?.description) status = lastEvent.description;
  return {
    status,
    lastEvent,
    events: sorted.slice(0, 8).map((e) => ({
      date: e.dtHrCriado,
      description: String(e.descricao || '').trim(),
      detail: String(e.detalhe || '').trim()
    }))
  };
}

async function fetchCorreiosTrackingSummary(token, trackingCode) {
  const code = String(trackingCode || '').trim().toUpperCase();
  if (!code) return null;
  const res = await fetch(
    `https://api.correios.com.br/srorastro/v1/objetos/${encodeURIComponent(code)}?resultado=T`,
    { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } }
  );
  if (!res.ok) {
    return { status: 'Indisponível', lastEvent: null, events: [], error: `HTTP ${res.status}` };
  }
  try {
    return summarizeCorreiosTracking(await res.json());
  } catch {
    return { status: 'Indisponível', lastEvent: null, events: [], error: 'JSON inválido' };
  }
}

async function quoteCorreiosPriceForOrder(env, config, order) {
  if (!isCorreiosBrOrder(order)) return null;
  const dest = onlyDigits(order.cep);
  if (dest.length !== 8) return null;
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const origin = onlyDigits(ship.originCep);
  const serviceCode = String(order.shippingServiceCode || ship.serviceCode || '04227').trim();
  const weightGrams = shippingWeightGrams(config);
  const declaredValue = Number(order.valorProduto) || Number(config.product?.price) || 62.9;

  const token = await getCorreiosToken(env);
  if (!token) return null;

  let data = await fetchCorreiosPriceGet(token, serviceCode, origin, dest, ship, weightGrams, declaredValue);
  let price = parseCorreiosPrice(data);
  if (!price) {
    data = await fetchCorreiosPricePost(token, serviceCode, origin, dest, ship, weightGrams, declaredValue);
    price = parseCorreiosPrice(data);
  }
  return price;
}

async function ensureCorreiosFreteEstimate(env, order, config) {
  if (!isCorreiosBrOrder(order)) return { skipped: true, reason: 'not_correios' };
  const existing = Number(order.correiosFreteEstimado);
  if (Number.isFinite(existing) && existing > 0) {
    return { ok: true, alreadyExists: true, price: existing };
  }
  const price = await quoteCorreiosPriceForOrder(env, config, order);
  if (!price) return { ok: false, error: 'quote_failed' };
  order.correiosFreteEstimado = price;
  order.correiosFreteEstimadoAt = new Date().toISOString();
  await saveOrder(env, order);
  return { ok: true, price };
}

async function fetchCorreiosJson(token, url) {
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } });
  const bodyText = await res.text().catch(() => '');
  if (!res.ok) return null;
  try {
    return bodyText ? JSON.parse(bodyText) : null;
  } catch {
    return null;
  }
}

async function fetchCorreiosPrePostagemById(token, prePostagemId) {
  const id = String(prePostagemId || '').trim();
  if (!id) return null;

  let data = await fetchCorreiosJson(
    token,
    `https://api.correios.com.br/prepostagem/v1/prepostagens/${encodeURIComponent(id)}`
  );
  if (extractCorreiosAvCode(data)) return data;

  const v2Queries = [
    `id=${encodeURIComponent(id)}`,
    `ids=${encodeURIComponent(id)}`,
    `idPrePostagem=${encodeURIComponent(id)}`,
    `codigoPrePostagem=${encodeURIComponent(id)}`
  ];
  for (const q of v2Queries) {
    const listed = await fetchCorreiosJson(token, `https://api.correios.com.br/prepostagem/v2/prepostagens?${q}`);
    if (!listed) continue;
    if (extractCorreiosAvCode(listed)) return listed;
    const rows = listed.itens || listed.items || listed.content || listed.prePostagens || listed.data;
    if (Array.isArray(rows)) {
      const match = rows.find((row) => extractCorreiosAvCode(row));
      if (match) return match;
    }
  }
  return data;
}

function parseCorreiosLabelDownload(dlData) {
  if (!dlData) return { trackingCode: null, pdfBase64: null };
  let trackingCode = extractCorreiosAvCode(dlData);
  let pdfBase64 = null;
  const dados = dlData.dados;

  if (typeof dados === 'string') {
    pdfBase64 = dados;
  } else if (Array.isArray(dados)) {
    for (const row of dados) {
      if (!trackingCode) trackingCode = extractCorreiosAvCode(row);
      if (!pdfBase64) {
        const b64 = row?.conteudo || row?.pdf || row?.dados || row?.rotulo || row?.base64;
        if (typeof b64 === 'string') pdfBase64 = b64;
      }
    }
  } else if (dados && typeof dados === 'object') {
    if (!trackingCode) trackingCode = extractCorreiosAvCode(dados);
    pdfBase64 = dados.conteudo || dados.pdf || dados.dados || dados.rotulo || null;
  }

  if (!pdfBase64) {
    const alt = dlData.conteudo || dlData.pdf || dlData.rotulo || dlData.base64;
    if (typeof alt === 'string') pdfBase64 = alt;
  }
  if (typeof pdfBase64 !== 'string') pdfBase64 = null;
  return { trackingCode, pdfBase64 };
}

const CORREIOS_AV_RE = /^[A-Z]{2}\d{9}[A-Z]{2}$/;
const AV_SCAN_PATTERNS = [/AV\d{9}[A-Z]{2}/g, /[A-Z]{2}\d{9}[A-Z]{2}/g];

function extractCorreiosAvCode(data, depth = 0) {
  if (!data || depth > 8) return null;
  if (typeof data === 'string') {
    const code = data.trim().toUpperCase();
    if (CORREIOS_AV_RE.test(code)) return code;
    for (const re of AV_SCAN_PATTERNS) {
      re.lastIndex = 0;
      const matches = code.match(re);
      if (matches?.length) {
        const av = matches.find((m) => m.startsWith('AV'));
        return av || matches[0];
      }
    }
    return null;
  }
  if (typeof data !== 'object') return null;
  const keys = [
    'codigoObjeto', 'codigoRegistro', 'codigoObjetoCliente', 'numeroObjeto',
    'codigo', 'trackingCode', 'codigoRastreio', 'numeroEtiqueta', 'identificador',
    'objeto', 'numeroRegistro', 'codigoEtiqueta', 'etiqueta', 'rastreio',
    'numeroRastreio', 'barcode', 'codigoBarras', 'awb', 'tracking',
    'identificacaoObjeto', 'registro', 'codigoDeRastreio', 'codigoRastreamento'
  ];
  for (const k of keys) {
    const found = extractCorreiosAvCode(data[k], depth + 1);
    if (found) return found;
  }
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = extractCorreiosAvCode(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  for (const v of Object.values(data)) {
    if (v && (typeof v === 'string' || typeof v === 'object')) {
      const found = extractCorreiosAvCode(v, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

async function requestCorreiosLabelReceipt(token, prePostagemId) {
  const res = await fetch('https://api.correios.com.br/prepostagem/v1/prepostagens/rotulo/assincrono/pdf', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      idsPrePostagem: [prePostagemId],
      tipoRotulo: 'P',
      formatoRotulo: 'ET'
    })
  });
  const bodyText = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(extractCorreiosApiError(res, bodyText) || `Falha ao solicitar rótulo (${res.status})`);
  }
  let data;
  try {
    data = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    throw new Error('Resposta inválida ao solicitar rótulo');
  }
  return data.idRecibo || data.recibo || data.id || null;
}

async function pollCorreiosLabelDownload(token, idRecibo, opts = {}) {
  const requirePdf = opts.requirePdf !== false;
  const maxAttempts = opts.maxAttempts || 30;
  const firstDelay = opts.firstDelayMs ?? 500;
  const nextDelay = opts.nextDelayMs ?? 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleepMs(attempt === 0 ? firstDelay : nextDelay);
    const dlRes = await fetch(
      `https://api.correios.com.br/prepostagem/v1/prepostagens/rotulo/download/assincrono/${encodeURIComponent(idRecibo)}`,
      { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } }
    );
    const dlText = await dlRes.text().catch(() => '');
    if (!dlRes.ok) {
      if (dlRes.status === 404 || dlRes.status === 202) continue;
      throw new Error(extractCorreiosApiError(dlRes, dlText) || `Download do rótulo falhou (${dlRes.status})`);
    }
    let dlData;
    try {
      dlData = dlText ? JSON.parse(dlText) : {};
    } catch {
      continue;
    }
    const parsed = parseCorreiosLabelDownload(dlData);
    const trackingCode = parsed.trackingCode;
    const pdfBase64 = parsed.pdfBase64;
    const codeFromPdf = pdfBase64 ? await extractAvFromPdfBase64(pdfBase64) : null;
    const resolvedCode = trackingCode || codeFromPdf;
    if (resolvedCode && !requirePdf) return { trackingCode: resolvedCode, pdfBase64: pdfBase64 || null };
    if (pdfBase64) return { pdfBase64, trackingCode: resolvedCode || null };
    const status = String(dlData.status || dlData.situacao || '').toUpperCase();
    if (status === 'ERRO' || status === 'FALHA') {
      throw new Error(dlData.mensagem || dlData.message || 'Processamento do rótulo falhou');
    }
  }
  if (requirePdf) throw new Error('Tempo esgotado aguardando PDF do rótulo Correios');
  return null;
}

function pickAvFromMatches(matches) {
  if (!matches?.length) return null;
  const av = matches.find((m) => m.startsWith('AV'));
  return av || matches[0];
}

function scanAvInBytes(bytes) {
  if (!bytes?.length || bytes.length < 13) return null;
  let fallback = null;
  for (let i = 0; i <= bytes.length - 13; i += 1) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    if (b0 < 65 || b0 > 90 || b1 < 65 || b1 > 90) continue;
    let digitsOk = true;
    for (let j = 2; j <= 10; j += 1) {
      const c = bytes[i + j];
      if (c < 48 || c > 57) {
        digitsOk = false;
        break;
      }
    }
    if (!digitsOk) continue;
    const b11 = bytes[i + 11];
    const b12 = bytes[i + 12];
    if (b11 < 65 || b11 > 90 || b12 < 65 || b12 > 90) continue;
    const code = String.fromCharCode(b0, b1, ...bytes.slice(i + 2, i + 13));
    if (code.startsWith('AV')) return code;
    if (!fallback) fallback = code;
  }
  return fallback;
}

function scanAvInString(text) {
  if (!text) return null;
  const upper = String(text).toUpperCase();
  for (const re of AV_SCAN_PATTERNS) {
    re.lastIndex = 0;
    const found = pickAvFromMatches(upper.match(re));
    if (found) return found;
  }
  return null;
}

function decodePdfLiteral(str) {
  return str.replace(/\\([0-7]{1,3}|.)/g, (_, seq) => {
    if (seq.length <= 3 && /^[0-7]+$/.test(seq)) return String.fromCharCode(parseInt(seq, 8));
    if (seq === 'n') return '\n';
    if (seq === 'r') return '\r';
    if (seq === 't') return '\t';
    if (seq === 'b') return '\b';
    if (seq === 'f') return '\f';
    return seq;
  });
}

function scanAvInPdfRaw(raw) {
  let code = scanAvInString(raw);
  if (code) return code;

  const literalRe = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
  let m;
  while ((m = literalRe.exec(raw)) !== null) {
    code = scanAvInString(decodePdfLiteral(m[1]));
    if (code) return code;
  }

  const hexRe = /<([0-9A-Fa-f\s]+)>/g;
  while ((m = hexRe.exec(raw)) !== null) {
    const hex = m[1].replace(/\s/g, '');
    if (hex.length < 26 || hex.length % 2) continue;
    let decoded = '';
    for (let i = 0; i < hex.length; i += 2) {
      decoded += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    }
    code = scanAvInString(decoded);
    if (code) return code;
  }
  return null;
}

async function inflatePdfChunk(bytes) {
  for (const format of ['deflate', 'deflate-raw']) {
    try {
      const buf = await new Response(
        new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format))
      ).arrayBuffer();
      return new Uint8Array(buf);
    } catch {
      /* try next format */
    }
  }
  return null;
}

async function scanAvInFlateStreams(raw) {
  const streamRe = /stream\r?\n/g;
  let match;
  while ((match = streamRe.exec(raw)) !== null) {
    const ctx = raw.slice(Math.max(0, match.index - 400), match.index);
    if (!/\/FlateDecode|\/Fl[^a-zA-Z]/i.test(ctx)) continue;
    const dataStart = match.index + match[0].length;
    const endIdx = raw.indexOf('endstream', dataStart);
    if (endIdx < 0) continue;
    const chunk = raw.slice(dataStart, endIdx).replace(/\r?\n$/, '');
    const bytes = Uint8Array.from(chunk, (c) => c.charCodeAt(0) & 0xff);
    const inflated = await inflatePdfChunk(bytes);
    if (!inflated?.length) continue;
    let code = scanAvInBytes(inflated);
    if (code) return code;
    code = scanAvInPdfRaw(String.fromCharCode.apply(null, inflated.subarray(0, Math.min(inflated.length, 500000))));
    if (code) return code;
  }
  return null;
}

async function extractAvFromPdfBase64(b64) {
  if (!b64) return null;
  try {
    const raw = atob(String(b64));
    const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0) & 0xff);
    let code = scanAvInBytes(bytes);
    if (code) return code;
    code = scanAvInPdfRaw(raw);
    if (code) return code;
    return await scanAvInFlateStreams(raw);
  } catch {
    return null;
  }
}

async function fetchCorreiosLabelSync(token, prePostagemId) {
  const res = await fetch('https://api.correios.com.br/prepostagem/v1/prepostagens/rotulo', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      idsPrePostagem: [prePostagemId],
      tipoRotulo: 'P',
      formatoRotulo: 'ET'
    })
  });
  const bodyText = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(extractCorreiosApiError(res, bodyText) || `Rótulo sync falhou (${res.status})`);
  }
  let data;
  try {
    data = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    throw new Error('Resposta inválida do rótulo sync');
  }
  const parsed = parseCorreiosLabelDownload(data);
  const trackingCode = parsed.trackingCode
    || (parsed.pdfBase64 ? await extractAvFromPdfBase64(parsed.pdfBase64) : null);
  return { pdfBase64: parsed.pdfBase64, trackingCode };
}

async function fetchCorreiosAvFromLabelMeta(token, prePostagemId) {
  const idRecibo = await requestCorreiosLabelReceipt(token, prePostagemId);
  if (!idRecibo) return null;
  const result = await pollCorreiosLabelDownload(token, idRecibo, {
    requirePdf: false,
    maxAttempts: 10,
    firstDelayMs: 400,
    nextDelayMs: 1000
  });
  return result?.trackingCode || null;
}

async function syncCorreiosTrackingCodeFromPrePostagem(token, order, env, opts = {}) {
  if (order.correiosTrackingCode) return order.correiosTrackingCode;
  const id = String(order.correiosPrePostagemId || '').trim();
  if (!id) return null;
  const data = await fetchCorreiosPrePostagemById(token, id);
  let code = extractCorreiosAvCode(data);
  if (!code) {
    try {
      code = await fetchCorreiosAvFromLabelMeta(token, id);
    } catch (err) {
      console.warn('Correios AV label sync:', order.orderId, err.message);
    }
  }
  if (!code && opts.aggressive) {
    try {
      const label = await fetchCorreiosLabelSync(token, id);
      code = label.trackingCode || (label.pdfBase64 ? await extractAvFromPdfBase64(label.pdfBase64) : null);
    } catch (err) {
      console.warn('Correios AV sync label:', order.orderId, err.message);
    }
  }
  if (!code && opts.aggressive) {
    try {
      const label = await fetchCorreiosLabelPdf(token, id);
      code = label.trackingCode || await extractAvFromPdfBase64(label.pdfBase64);
    } catch (err) {
      console.warn('Correios AV pdf sync:', order.orderId, err.message);
    }
  }
  if (!code) return null;
  order.correiosTrackingCode = code;
  await saveOrder(env, order);
  return code;
}

async function ensureCorreiosPrePostagemForOrder(env, order, config) {
  if (!isCorreiosBrOrder(order)) {
    return { skipped: true, reason: 'not_correios' };
  }
  try {
    await ensureCorreiosFreteEstimate(env, order, config);
  } catch (err) {
    console.warn('Correios frete estimate:', order.orderId, err.message);
  }
  if (order.correiosPrePostagemId) {
    if (!order.correiosTrackingCode) {
      try {
        const token = await getCorreiosToken(env);
        if (token) await syncCorreiosTrackingCodeFromPrePostagem(token, order, env);
      } catch (err) {
        console.warn('Correios AV sync:', order.orderId, err.message);
      }
    }
    return {
      ok: true,
      alreadyExists: true,
      prePostagemId: order.correiosPrePostagemId,
      trackingCode: order.correiosTrackingCode || null,
      correiosFreteEstimado: order.correiosFreteEstimado ?? null
    };
  }
  const token = await getCorreiosToken(env);
  if (!token) throw new Error('Correios não configurado no Worker');

  const created = await createCorreiosPrePostagem(token, order, config, env);
  order.correiosPrePostagemId = created.id;
  if (created.codigoObjeto) order.correiosTrackingCode = created.codigoObjeto;
  if (!order.correiosTrackingCode) {
    await syncCorreiosTrackingCodeFromPrePostagem(token, order, env);
  }
  order.correiosPrePostagemAt = new Date().toISOString();
  order.correiosPrePostagemError = null;
  await saveOrder(env, order);
  return {
    ok: true,
    prePostagemId: order.correiosPrePostagemId,
    trackingCode: order.correiosTrackingCode || null,
    correiosFreteEstimado: order.correiosFreteEstimado ?? null
  };
}

async function cancelCorreiosPrePostagem(env, order) {
  if (!isCorreiosBrOrder(order)) return { skipped: true, reason: 'not_correios' };
  const prePostagemId = String(order.correiosPrePostagemId || '').trim();
  const trackingCode = String(order.correiosTrackingCode || '').trim().toUpperCase();
  if (!prePostagemId && !trackingCode) return { skipped: true, reason: 'no_prepostagem' };

  const token = await getCorreiosToken(env);
  if (!token) return { ok: false, error: 'Correios não configurado' };

  const tryDelete = async (url) => {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
    });
    const bodyText = await res.text().catch(() => '');
    if (res.ok || res.status === 404) {
      return {
        ok: true,
        detail: res.status === 404 ? 'Pré-postagem já cancelada ou inexistente' : 'Pré-postagem cancelada nos Correios'
      };
    }
    return {
      ok: false,
      detail: extractCorreiosApiError(res, bodyText) || bodyText.slice(0, 160) || `HTTP ${res.status}`
    };
  };

  if (prePostagemId) {
    const byId = await tryDelete(
      `https://api.correios.com.br/prepostagem/v1/prepostagens/${encodeURIComponent(prePostagemId)}`
    );
    if (byId.ok) return { ...byId, trackingCode: trackingCode || null };
    if (!trackingCode) return byId;
  }

  const byCode = await tryDelete(
    `https://api.correios.com.br/prepostagem/v1/prepostagens/objeto/${encodeURIComponent(trackingCode)}`
  );
  return { ...byCode, trackingCode };
}

async function createCorreiosPrePostagem(token, order, config, env) {
  const payload = buildPrePostagemPayload(order, config, env);
  const res = await fetch('https://api.correios.com.br/prepostagem/v1/prepostagens', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const bodyText = await res.text().catch(() => '');
  if (!res.ok) {
    const detail = extractCorreiosApiError(res, bodyText) || bodyText.slice(0, 200) || `HTTP ${res.status}`;
    throw new Error(detail);
  }
  let data;
  try {
    data = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    throw new Error('Resposta inválida ao criar pré-postagem');
  }
  const id = data.id || data.idPrePostagem;
  if (!id) throw new Error('Pré-postagem criada sem ID');
  return {
    id,
    codigoObjeto: extractCorreiosAvCode(data)
  };
}

async function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCorreiosLabelPdf(token, prePostagemId) {
  const idRecibo = await requestCorreiosLabelReceipt(token, prePostagemId);
  if (!idRecibo) throw new Error('Recibo do rótulo não retornado');
  const result = await pollCorreiosLabelDownload(token, idRecibo, { requirePdf: true });
  if (!result?.pdfBase64) throw new Error('Tempo esgotado aguardando PDF do rótulo Correios');
  return result;
}

async function quoteCorreiosService(env, config, destCep, method, opts = {}) {
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const origin = onlyDigits(ship.originCep);
  const dest = onlyDigits(destCep);
  if (dest.length !== 8) return null;
  const weightGrams = shippingWeightGrams(config, opts.weightGrams);
  const declaredValue = Number(opts.declaredValue) || config.product?.price || 62.9;
  const serviceCode = String(method.correiosCode || ship.serviceCode || '').trim();
  if (!serviceCode) return null;

  const token = await getCorreiosToken(env);
  if (!token) return null;

  let data = await fetchCorreiosPriceGet(token, serviceCode, origin, dest, ship, weightGrams, declaredValue);
  let price = parseCorreiosPrice(data);
  if (!price) {
    data = await fetchCorreiosPricePost(token, serviceCode, origin, dest, ship, weightGrams, declaredValue);
    price = parseCorreiosPrice(data);
  }
  if (!price) return null;

  let days = parseCorreiosDays(data);
  if (!days || days === 12) {
    const prazo = await fetchCorreiosPrazo(token, serviceCode, origin, dest);
    days = parseCorreiosDays(prazo, days);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    id: method.id || serviceCode,
    methodId: method.id || serviceCode,
    serviceCode,
    service: method.label || row?.nmServico || ship.serviceName || 'Correios',
    price,
    days,
    source: 'correios',
    weightGrams
  };
}

async function quoteCorreiosOptions(env, config, destCep, opts = {}) {
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const origin = onlyDigits(ship.originCep);
  const dest = onlyDigits(destCep);
  if (dest.length !== 8) throw new Error('CEP inválido');

  const methods = getEnabledShippingMethods(config, 'BR').filter((m) => !isUberMethod(m) && !isMotoboyMethod(m));
  const weightGrams = shippingWeightGrams(config, opts.weightGrams);
  const weightFactor = Math.min(2.5, Math.max(1, weightGrams / shippingWeightGrams(config)));
  const token = await getCorreiosToken(env);
  const options = [];
  const quotedIds = new Set();

  if (token && methods.length) {
    const quotes = await Promise.all(
      methods.map((method) => quoteCorreiosService(env, config, dest, method, opts))
    );
    quotes.filter(Boolean).forEach((q) => {
      options.push(q);
      quotedIds.add(q.methodId || q.id);
    });
  }

  for (const method of methods) {
    if (quotedIds.has(method.id)) continue;
    const est = estimateBRForMethod(origin, dest, method, weightFactor, config);
    options.push({
      id: method.id,
      methodId: method.id,
      serviceCode: method.correiosCode || ship.serviceCode || null,
      service: method.label || ship.serviceName || 'Correios',
      price: est.price,
      days: est.days,
      source: 'estimate',
      weightGrams,
      note: token
        ? `Estimativa por distância (CEP) — API Correios sem preço para ${method.label || method.correiosCode}.`
        : 'Estimativa por distância — configure CORREIOS_USER e CORREIOS_PASSWORD no Worker.'
    });
  }

  if (!options.length) {
    const est = estimateBRMax(config, weightGrams);
    const fallbackMethod = methods[0] || { id: 'estimate', label: ship.serviceName || 'Mini Envios' };
    options.push({
      id: fallbackMethod.id || 'estimate',
      methodId: fallbackMethod.id || 'estimate',
      serviceCode: fallbackMethod.correiosCode || ship.serviceCode || null,
      service: fallbackMethod.label || ship.serviceName || 'Mini Envios',
      price: est.price,
      days: est.days,
      source: 'estimate',
      weightGrams,
      note: token
        ? 'Estimativa máxima — API Correios sem preço válido para estes serviços.'
        : 'Estimativa máxima — configure CORREIOS_USER e CORREIOS_PASSWORD no Worker.'
    });
  }

  return options.sort((a, b) => a.price - b.price);
}

async function quoteCorreios(env, config, destCep, opts = {}) {
  const options = await quoteCorreiosOptions(env, config, destCep, opts);
  return options[0] || null;
}

function parseBRPrice(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return value;
  return parseFloat(String(value).replace(/\./g, '').replace(',', '.')) || 0;
}

function cookieHeaderFrom(response) {
  const list = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [];
  return list.map((c) => c.split(';')[0]).filter(Boolean).join('; ');
}

async function fetchExportSimulation(config, countryCode, opts = {}) {
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const originCep = onlyDigits(ship.originCep);
  const country = String(countryCode || '').toUpperCase();
  const weightGrams = Math.max(1, Math.round(Number(opts.weightGrams) || shippingWeightGrams(config)));
  if (originCep.length !== 8 || !country) return null;

  try {
    const pageRes = await fetch('https://minhasexportacoes.correios.com.br/simulacao', {
      headers: { 'User-Agent': 'SensorTattooFix/1.0', Accept: 'text/html' }
    });
    if (!pageRes.ok) return null;

    const html = await pageRes.text();
    const csrf = html.match(/name="csrf-token"\s+content="([^"]+)"/i)?.[1];
    const cookies = cookieHeaderFrom(pageRes);
    if (!csrf) return null;

    const simTipo = String(opts.tipo || 'M').toUpperCase() === 'D' ? 'D' : 'M';
    const body = new URLSearchParams({
      tipo: simTipo,
      finalidade: 'V',
      cep_origem: originCep,
      pais_destino: country,
      peso: String(weightGrams)
    });

    const simRes = await fetch('https://minhasexportacoes.correios.com.br/simulacao/simular', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'X-CSRF-TOKEN': csrf,
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'SensorTattooFix/1.0',
        ...(cookies ? { Cookie: cookies } : {})
      },
      body
    });
    const payload = await simRes.json().catch(() => null);
    if (!simRes.ok || !payload?.success || !Array.isArray(payload.data)) return null;

    const services = payload.data.filter((s) => s.precoFinal && !s.txErro);
    return services.length ? { services, country, weightGrams, simTipo } : null;
  } catch (err) {
    console.error('Exporta Fácil:', err.message);
    return null;
  }
}

function prettifyCorreiosServiceName(name) {
  const raw = String(name || '').trim();
  if (!raw) return raw;
  const known = {
    'DOCUMENTO INTERNACION STANDARD': 'Documento Internacional Standard',
    'DOCUMENTO INTERNACION EXPRESSO': 'Documento Internacional Expresso',
    'EXPORTA FACIL ECONOMICO': 'Exporta Fácil Econômico',
    'EXPORTA FACIL STANDARD': 'Exporta Fácil Standard',
    'EXPORTA FACIL EXPRESSO': 'Exporta Fácil Expresso'
  };
  const upper = raw.toUpperCase();
  if (known[upper]) return known[upper];
  return raw
    .replace(/\bINTERNACION\b/gi, 'Internacional')
    .replace(/\bEXPORTA FACIL\b/gi, 'Exporta Fácil')
    .replace(/\bECONOMICO\b/gi, 'Econômico');
}

function mapExportServiceToOption(service, config, country, weightGrams, method, simTipo = 'M') {
  const zones = config.internationalShipping || DEFAULT_CONFIG.internationalShipping;
  const zone = zones[country] || zones.OTHER || {};
  const code = String(service.codigo);
  const price = parseBRPrice(service.precoFinal);
  if (price <= 0) return null;
  const isDocument = simTipo === 'D';
  const serviceName = prettifyCorreiosServiceName(
    service.nome || method?.label || (isDocument ? 'Documento internacional' : 'Internacional')
  );
  return {
    id: code,
    methodId: method?.id || `int-${code}`,
    serviceCode: code,
    service: serviceName,
    price,
    days: Number(service.prazoMedio || service.prazoMaximo || zone.days || 15),
    source: 'correios-export',
    shipmentType: isDocument ? 'documento' : 'encomenda',
    country,
    countryLabel: zone.label || country,
    weightGrams
  };
}

async function quoteCorreiosExportOptions(config, countryCode, opts = {}) {
  const methods = getEnabledShippingMethods(config, 'INT');
  if (!methods.length) return [];

  const tiposNeeded = new Map();
  methods.forEach((method) => {
    resolveIntlSimTipos(method).forEach((tipo) => {
      if (!tiposNeeded.has(tipo)) tiposNeeded.set(tipo, []);
      tiposNeeded.get(tipo).push(method);
    });
  });

  const seenCodes = new Set();
  const options = [];

  for (const [simTipo, tipoMethods] of tiposNeeded) {
    const sim = await fetchExportSimulation(config, countryCode, { ...opts, tipo: simTipo });
    if (!sim) continue;

    tipoMethods.forEach((method) => {
      const codeFilter = String(method.correiosCode || '').trim();
      const includeAll = !codeFilter || codeFilter === '*';
      sim.services
        .filter((s) => includeAll || codeFilter === String(s.codigo))
        .forEach((s) => {
          const code = String(s.codigo);
          if (seenCodes.has(code)) return;
          seenCodes.add(code);
          const opt = mapExportServiceToOption(s, config, sim.country, sim.weightGrams, method, simTipo);
          if (opt) options.push(opt);
        });
    });
  }

  return options.sort((a, b) => a.price - b.price);
}

function pickIntlFallbackQuote(options, config) {
  if (!options?.length) return null;
  const preferredCode = String((config.shipping || {}).intlServiceCode || '45128');
  return options.find((o) => o.serviceCode === preferredCode) || options[0];
}

/** Cotação mais barata via simulador Exporta Fácil (compat. admin). */
async function quoteCorreiosExport(config, countryCode, opts = {}) {
  const options = await quoteCorreiosExportOptions(config, countryCode, opts);
  if (!options.length) return null;
  return pickIntlFallbackQuote(options, config);
}

function intlZoneFromQuote(zone, pick) {
  return {
    ...zone,
    price: pick.price,
    days: pick.days,
    currency: 'BRL',
    lastSyncedAt: new Date().toISOString(),
    lastSyncedSource: pick.source || 'correios-export',
    lastSyncedService: pick.service || null
  };
}

/** Atualiza fallback de um país quando a API Exporta Fácil responde. */
async function updateIntlFallbackZone(env, countryCode, options) {
  const code = String(countryCode || '').toUpperCase();
  if (!code || code === 'BR' || code === 'OTHER') return null;

  const config = await getConfig(env);
  const pick = pickIntlFallbackQuote(options, config);
  if (!pick || pick.source !== 'correios-export') return null;
  const zones = config.internationalShipping || DEFAULT_CONFIG.internationalShipping;
  const prev = zones[code];
  if (!prev) return null;

  if (prev.price === pick.price && prev.days === pick.days && prev.lastSyncedSource === 'correios-export') {
    return config;
  }

  const internationalShipping = {
    ...zones,
    [code]: intlZoneFromQuote(prev, pick)
  };
  return saveConfig(env, { ...config, internationalShipping });
}

/** Sincroniza toda a tabela fallback internacional com o simulador Correios. */
async function syncAllIntlFallbackZones(env, config) {
  const zones = { ...(config.internationalShipping || DEFAULT_CONFIG.internationalShipping) };
  const weightGrams = shippingWeightGrams(config);
  const codes = Object.keys(zones).filter((c) => c !== 'OTHER' && c !== 'BR');
  const results = {};
  const internationalShipping = { ...zones };
  let updated = false;

  await Promise.all(codes.map(async (code) => {
    try {
      const options = await quoteCorreiosExportOptions(config, code, { weightGrams });
      const pick = pickIntlFallbackQuote(options, config);
      if (!pick) {
        results[code] = { ok: false };
        return;
      }
      internationalShipping[code] = intlZoneFromQuote(zones[code] || { label: code }, pick);
      results[code] = { ok: true, price: pick.price, days: pick.days, service: pick.service };
      updated = true;
    } catch (err) {
      results[code] = { ok: false, error: err.message };
    }
  }));

  const syncedPrices = codes
    .filter((c) => results[c]?.ok)
    .map((c) => internationalShipping[c].price);
  if (syncedPrices.length && internationalShipping.OTHER) {
    const maxPrice = Math.max(...syncedPrices);
    const maxDays = Math.max(
      ...codes.filter((c) => results[c]?.ok).map((c) => internationalShipping[c].days || 0),
      internationalShipping.OTHER.days || 25
    );
    internationalShipping.OTHER = {
      ...internationalShipping.OTHER,
      price: Math.round(Math.max(internationalShipping.OTHER.price, maxPrice * 1.15) * 100) / 100,
      days: maxDays,
      lastSyncedAt: new Date().toISOString(),
      lastSyncedSource: 'derived-from-sync'
    };
    updated = true;
    results.OTHER = { ok: true, price: internationalShipping.OTHER.price, days: maxDays, derived: true };
  }

  if (!updated) return { config, results, updated: false };

  const saved = await saveConfig(env, { ...config, internationalShipping });
  return { config: saved, results, updated: true };
}

function getIntlSurcharge(config) {
  const n = Number(config?.internationalSurcharge ?? DEFAULT_CONFIG.internationalSurcharge);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

function applyIntlSurcharge(config, option) {
  if (!option || typeof option !== 'object') return option;
  const surcharge = getIntlSurcharge(config);
  if (!surcharge) return option;
  const base = Number(option.price) || 0;
  return {
    ...option,
    price: Math.round((base + surcharge) * 100) / 100,
    intlSurcharge: surcharge,
    intlBasePrice: base
  };
}

function applyIntlSurchargeToOptions(config, options) {
  const list = options || [];
  const surcharge = getIntlSurcharge(config);
  if (!surcharge) return list;
  let documentSurchargeApplied = false;
  return list.map((opt) => {
    if (documentSurchargeApplied || opt.shipmentType !== 'documento') return opt;
    documentSurchargeApplied = true;
    return applyIntlSurcharge(config, opt);
  });
}

function quoteInternational(config, countryCode) {
  const zones = config.internationalShipping || DEFAULT_CONFIG.internationalShipping;
  const zone = zones[countryCode] || zones.OTHER;
  if (!zone) throw new Error('País não atendido');
  return {
    price: zone.price,
    days: zone.days,
    service: 'Correios Internacional — ' + zone.label,
    source: 'config',
    country: countryCode,
    countryLabel: zone.label
  };
}

async function findAsaasCustomerByCpf(base, apiKey, cpfCnpj) {
  const res = await fetch(`${base}/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}&limit=1`, {
    headers: asaasHeaders(apiKey)
  });
  const data = await asaasReadJson(res, 'Buscar cliente Asaas');
  return data.data?.[0]?.id || null;
}

async function createAsaasCustomer(base, apiKey, order) {
  const cpfCnpj = onlyDigits(order.cpf);
  if (!cpfCnpj || (cpfCnpj.length !== 11 && cpfCnpj.length !== 14)) {
    throw new Error('CPF/CNPJ inválido para cobrança Asaas.');
  }

  const existingId = await findAsaasCustomerByCpf(base, apiKey, cpfCnpj);
  if (existingId) return existingId;

  const res = await fetch(base + '/customers', {
    method: 'POST',
    headers: asaasHeaders(apiKey),
    body: JSON.stringify({
      name: order.nome,
      email: order.email,
      cpfCnpj,
      mobilePhone: normalizePhoneBR(order.telefone),
      postalCode: onlyDigits(order.cep) || '01310100',
      address: order.rua || 'Av Paulista',
      addressNumber: order.numero || 'S/N',
      complement: order.complemento || undefined,
      province: order.bairro || order.cidade || 'Centro',
      externalReference: order.orderId,
      notificationDisabled: true
    })
  });
  const data = await asaasReadJson(res, 'Criar cliente Asaas');
  return data.id;
}

async function fetchAsaasPixQr(base, apiKey, paymentId) {
  let lastError = 'Não foi possível gerar QR Code PIX no Asaas.';
  for (let attempt = 0; attempt < 3; attempt++) {
    const qrRes = await fetch(`${base}/payments/${paymentId}/pixQrCode`, {
      headers: { access_token: apiKey, Accept: 'application/json', 'User-Agent': 'SensorTattooFix/1.0' }
    });
    const text = await qrRes.text();
    let qr = null;
    if (text) {
      try { qr = JSON.parse(text); } catch { /* retry */ }
    }
    if (qrRes.ok && qr?.payload) return qr;
    lastError = qr?.errors?.[0]?.description || text || `HTTP ${qrRes.status}`;
    if (attempt < 2) await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(lastError + ' Cadastre uma chave PIX no painel Asaas.');
}

async function createAsaasPayment(env, order, config, billingType) {
  const apiKey = asaasApiKey(env);
  if (!apiKey) return null;

  const base = asaasBase(env);
  const customerId = await createAsaasCustomer(base, apiKey, order);
  const due = new Date().toISOString().slice(0, 10);

  const res = await fetch(base + '/payments', {
    method: 'POST',
    headers: asaasHeaders(apiKey),
    body: JSON.stringify({
      customer: customerId,
      billingType,
      value: Number(order.total.toFixed(2)),
      dueDate: due,
      description: `${config.product.name} — ${formatOrderSmartwatch(order)} — ${order.orderId}`.slice(0, 500),
      externalReference: order.orderId
    })
  });
  const payment = await asaasReadJson(res, 'Criar cobrança Asaas');

  if (billingType === 'PIX') {
    const qr = await fetchAsaasPixQr(base, apiKey, payment.id);
    return {
      provider: 'asaas',
      billingType: 'PIX',
      paymentId: payment.id,
      pixCopyPaste: qr.payload,
      pixQrEncoded: qr.encodedImage,
      autoConfirm: true
    };
  }

  let invoiceUrl = payment.invoiceUrl || payment.bankSlipUrl;
  if (!invoiceUrl) {
    const detailRes = await fetch(`${base}/payments/${payment.id}`, {
      headers: asaasHeaders(apiKey)
    });
    const detail = await asaasReadJson(detailRes, 'Consultar cobrança Asaas');
    invoiceUrl = detail.invoiceUrl || detail.bankSlipUrl;
  }
  if (!invoiceUrl) {
    throw new Error(
      'Link de pagamento com cartão não foi gerado. No Asaas, ative Cartão de crédito em Configurações → Cobranças e aguarde aprovação da conta.'
    );
  }

  return {
    provider: 'asaas',
    billingType: 'CREDIT_CARD',
    paymentId: payment.id,
    invoiceUrl,
    autoConfirm: true
  };
}

function paypalBase(env) {
  return isPayPalSandbox(env)
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

function storeBaseUrl(config, env) {
  return String(env.STORE_URL || config.store?.url || 'https://www.sensortattoofix.com.br').replace(/\/$/, '');
}

function paypalReturnUrls(config, order, env) {
  const base = storeBaseUrl(config, env);
  const success = new URLSearchParams({
    paypal: 'success',
    orderId: order.orderId,
    accessToken: order.accessToken
  });
  const cancel = new URLSearchParams({
    paypal: 'cancel',
    orderId: order.orderId,
    accessToken: order.accessToken
  });
  return {
    return_url: `${base}/comprar.html?${success}`,
    cancel_url: `${base}/comprar.html?${cancel}`
  };
}

async function getPayPalAccessToken(env) {
  const { clientId, secret } = paypalCredentials(env);
  if (!clientId || !secret) throw new Error('PayPal não configurado no Worker.');

  const res = await fetch(`${paypalBase(env)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${clientId}:${secret}`),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const raw = data.error_description || data.error || 'Falha ao autenticar no PayPal.';
    if (String(raw).toLowerCase().includes('client authentication')) {
      throw new Error(isPayPalSandbox(env, clientId)
        ? 'Credenciais PayPal sandbox inválidas. Use Client ID e Secret do app Sandbox no Worker.'
        : 'Credenciais PayPal Live inválidas. Copie Client ID e Secret do mesmo app (modo Live) e atualize PAYPAL_CLIENT_ID e PAYPAL_CLIENT_SECRET no Worker.');
    }
    throw new Error(raw);
  }
  return data.access_token;
}

async function checkPayPalIntegration(env) {
  const { clientId, secret } = paypalCredentials(env);
  const sandbox = isPayPalSandbox(env, clientId);
  const selfTest = env.PAYPAL_SELF_TEST === 'true' || env.PAYPAL_SELF_TEST === '1';
  if (!clientId || !secret) {
    return {
      configured: false,
      sandbox,
      selfTest,
      authOk: false,
      mode: sandbox ? 'sandbox' : 'live',
      error: 'Secrets PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET não configurados.'
    };
  }
  try {
    await getPayPalAccessToken(env);
    return {
      configured: true,
      sandbox,
      selfTest,
      authOk: true,
      mode: sandbox ? 'sandbox' : 'live',
      clientIdSuffix: clientId.slice(-8)
    };
  } catch (err) {
    return {
      configured: true,
      sandbox,
      selfTest,
      authOk: false,
      mode: sandbox ? 'sandbox' : 'live',
      clientIdSuffix: clientId.slice(-8),
      error: err.message
    };
  }
}

async function checkMercadoPagoIntegration(env) {
  const token = mercadoPagoToken(env);
  const sandbox = isMpSandbox(env);
  if (!token) {
    return { configured: false, authOk: false, sandbox, error: 'MP_ACCESS_TOKEN não configurado.' };
  }
  try {
    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        configured: true,
        authOk: false,
        sandbox,
        error: data.message || `HTTP ${res.status}`
      };
    }
    return { configured: true, authOk: true, sandbox };
  } catch (err) {
    return { configured: true, authOk: false, sandbox, error: err.message };
  }
}

async function checkAsaasIntegration(env) {
  const apiKey = asaasApiKey(env);
  const sandbox = env.ASAAS_SANDBOX === 'true';
  if (!apiKey) {
    return { configured: false, authOk: false, sandbox, error: 'ASAAS_API_KEY não configurada.' };
  }
  try {
    const res = await fetch(`${asaasBase(env)}/finance/balance`, { headers: asaasHeaders(apiKey) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        configured: true,
        authOk: false,
        sandbox,
        error: data.errors?.[0]?.description || `HTTP ${res.status}`
      };
    }
    return { configured: true, authOk: true, sandbox };
  } catch (err) {
    return { configured: true, authOk: false, sandbox, error: err.message };
  }
}

async function checkResendIntegration(env) {
  const apiKey = (env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    return { configured: false, authOk: false, error: 'RESEND_API_KEY não configurada.' };
  }
  try {
    const res = await fetch('https://api.resend.com/domains?limit=1', {
      headers: { Authorization: 'Bearer ' + apiKey }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        configured: true,
        authOk: false,
        error: data.message || data.error || `HTTP ${res.status}`
      };
    }
    return { configured: true, authOk: true };
  } catch (err) {
    return { configured: true, authOk: false, error: err.message };
  }
}

async function checkZApiIntegration(env) {
  const instance = env.ZAPI_INSTANCE_ID;
  const token = env.ZAPI_TOKEN;
  if (!instance || !token) {
    return { configured: false, authOk: false, error: 'ZAPI_INSTANCE_ID / ZAPI_TOKEN não configurados.' };
  }
  const headers = {};
  if (env.ZAPI_CLIENT_TOKEN) headers['Client-Token'] = env.ZAPI_CLIENT_TOKEN;
  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${instance}/token/${token}/status`,
      { headers }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        configured: true,
        authOk: false,
        connected: false,
        error: data.error || data.message || `HTTP ${res.status}`
      };
    }
    const connected = data.connected === true || data.smartphoneConnected === true;
    return {
      configured: true,
      authOk: connected,
      connected,
      error: connected ? null : 'Instância sem WhatsApp conectado.'
    };
  } catch (err) {
    return { configured: true, authOk: false, connected: false, error: err.message };
  }
}

function correiosApiRowStatus(probe) {
  if (!probe) return 'off';
  if (probe.ok) return 'ok';
  if (String(probe.detail || '').includes('GTW-012')) return 'warn';
  return 'error';
}

function buildIntegrationRows(env, config, checks) {
  const {
    paypal, mercadoPago, asaas, resend, zapi, correiosToken, correiosPreco, correiosPrazo,
    correiosPrePostagem, correiosServico04227, correiosServico86720, exportOptions, uber
  } = checks;
  const hasCorreiosCreds = !!(env.CORREIOS_USER && env.CORREIOS_PASSWORD);
  const formsubmitEmail = (config.formsubmit?.email || '').trim();
  const ga4Secret = (env.GA4_API_SECRET || '').trim();
  const exportQuote = exportOptions[0] || null;

  const rows = [
    {
      id: 'worker',
      label: 'Cloudflare Worker',
      description: 'API central — pedidos, checkout e admin',
      status: 'ok',
      detail: 'Online e autenticado'
    }
  ];

  if (!mercadoPago.configured) {
    rows.push({
      id: 'mercadopago',
      label: 'Mercado Pago',
      description: 'PIX e checkout no Brasil',
      status: 'off',
      detail: 'Não configurado'
    });
  } else if (!mercadoPago.authOk) {
    rows.push({
      id: 'mercadopago',
      label: 'Mercado Pago',
      description: 'PIX e checkout no Brasil',
      status: 'error',
      detail: mercadoPago.error || 'Falha na autenticação'
    });
  } else {
    rows.push({
      id: 'mercadopago',
      label: 'Mercado Pago',
      description: 'PIX e checkout no Brasil',
      status: mercadoPago.sandbox ? 'warn' : 'ok',
      detail: mercadoPago.sandbox ? 'Sandbox conectado' : 'Produção conectada'
    });
  }

  if (!asaas.configured) {
    rows.push({
      id: 'asaas',
      label: 'Asaas',
      description: 'PIX alternativo e cartão de crédito BR',
      status: 'off',
      detail: 'Não configurado'
    });
  } else if (!asaas.authOk) {
    rows.push({
      id: 'asaas',
      label: 'Asaas',
      description: 'PIX alternativo e cartão de crédito BR',
      status: 'error',
      detail: asaas.error || 'Falha na autenticação'
    });
  } else {
    rows.push({
      id: 'asaas',
      label: 'Asaas',
      description: 'PIX alternativo e cartão de crédito BR',
      status: asaas.sandbox ? 'warn' : 'ok',
      detail: asaas.sandbox ? 'Sandbox conectado' : 'Produção conectada'
    });
  }

  if (!paypal.configured) {
    rows.push({
      id: 'paypal',
      label: 'PayPal',
      description: 'Pagamentos internacionais',
      status: 'off',
      detail: 'Secrets não configurados'
    });
  } else if (!paypal.authOk) {
    rows.push({
      id: 'paypal',
      label: 'PayPal',
      description: 'Pagamentos internacionais',
      status: 'error',
      detail: paypal.error || 'Falha na autenticação'
    });
  } else {
    let detail = `${paypal.mode === 'sandbox' ? 'Sandbox' : 'Live'} conectado`;
    const paypalAppLabel = String(config.payments?.paypal?.appLabel || '').trim();
    if (paypalAppLabel) detail += ` · ${paypalAppLabel}`;
    if (paypal.selfTest) detail += ' · teste R$ 0,01 ativo';
    rows.push({
      id: 'paypal',
      label: 'PayPal',
      description: 'Pagamentos internacionais',
      status: paypal.sandbox || paypal.selfTest ? 'warn' : 'ok',
      detail
    });
  }

  if (!hasCorreiosCreds) {
    rows.push({
      id: 'correios-token',
      label: 'Correios Token',
      description: 'Autenticação (cartão de postagem)',
      status: 'warn',
      detail: 'Sem credenciais — checkout usa estimativa fixa'
    });
    rows.push({
      id: 'correios-preco-34',
      label: 'Correios API 34',
      description: 'Preço — cotação Mini Envios',
      status: 'off',
      detail: 'Aguardando credenciais'
    });
    rows.push({
      id: 'correios-prazo-35',
      label: 'Correios API 35',
      description: 'Prazo — entrega Mini Envios (04227)',
      status: 'off',
      detail: 'Aguardando credenciais'
    });
    rows.push({
      id: 'correios-prepostagem-36',
      label: 'Correios API 36',
      description: 'Pré-Postagem — etiqueta oficial PDF',
      status: 'off',
      detail: 'Aguardando credenciais'
    });
    rows.push({
      id: 'correios-servico-04227',
      label: 'Correios Serviço 04227',
      description: 'Mini Envios no cartão de postagem',
      status: 'off',
      detail: 'Aguardando credenciais'
    });
    rows.push({
      id: 'correios-servico-86720',
      label: 'Correios Serviço 86720',
      description: 'API Pré-Postagem no cartão',
      status: 'off',
      detail: 'Aguardando credenciais'
    });
  } else if (!correiosToken) {
    rows.push({
      id: 'correios-token',
      label: 'Correios Token',
      description: 'Autenticação (cartão de postagem)',
      status: 'error',
      detail: 'Credenciais configuradas, mas token não obtido'
    });
    rows.push({
      id: 'correios-preco-34',
      label: 'Correios API 34',
      description: 'Preço — cotação Mini Envios',
      status: 'error',
      detail: 'Sem token — teste não executado'
    });
    rows.push({
      id: 'correios-prazo-35',
      label: 'Correios API 35',
      description: 'Prazo — entrega Mini Envios',
      status: 'error',
      detail: 'Sem token — teste não executado'
    });
    rows.push({
      id: 'correios-prepostagem-36',
      label: 'Correios API 36',
      description: 'Pré-Postagem — etiqueta oficial PDF',
      status: 'error',
      detail: 'Sem token — teste não executado'
    });
    rows.push({
      id: 'correios-servico-04227',
      label: 'Correios Serviço 04227',
      description: 'Mini Envios no cartão de postagem',
      status: 'error',
      detail: 'Sem token — teste não executado'
    });
    rows.push({
      id: 'correios-servico-86720',
      label: 'Correios Serviço 86720',
      description: 'API Pré-Postagem no cartão',
      status: 'error',
      detail: 'Sem token — teste não executado'
    });
  } else {
    rows.push({
      id: 'correios-token',
      label: 'Correios Token',
      description: 'Autenticação (cartão de postagem)',
      status: 'ok',
      detail: 'Token obtido'
    });
    rows.push({
      id: 'correios-preco-34',
      label: 'Correios API 34',
      description: 'Preço — cotação Mini Envios (04227)',
      status: correiosApiRowStatus(correiosPreco),
      detail: correiosPreco?.detail || 'Falha no teste de preço'
    });
    rows.push({
      id: 'correios-prazo-35',
      label: 'Correios API 35',
      description: 'Prazo — entrega Mini Envios (04227)',
      status: correiosApiRowStatus(correiosPrazo),
      detail: correiosPrazo?.detail || 'Falha no teste de prazo'
    });
    rows.push({
      id: 'correios-prepostagem-36',
      label: 'Correios API 36',
      description: 'Pré-Postagem — etiqueta oficial PDF',
      status: correiosApiRowStatus(correiosPrePostagem),
      detail: correiosPrePostagem?.detail || 'Falha no teste de pré-postagem'
    });
    rows.push({
      id: 'correios-servico-04227',
      label: 'Correios Serviço 04227',
      description: 'Mini Envios no cartão de postagem',
      status: correiosApiRowStatus(correiosServico04227),
      detail: correiosServico04227?.detail || 'Correios Serviço 04227 não verificado'
    });
    rows.push({
      id: 'correios-servico-86720',
      label: 'Correios Serviço 86720',
      description: 'API Pré-Postagem no cartão',
      status: correiosApiRowStatus(correiosServico86720),
      detail: correiosServico86720?.detail || 'Correios Serviço 86720 não verificado'
    });
  }

  const uberEnabled = getEnabledShippingMethods(config, 'BR').some(isUberMethod);
  if (!uber?.configured) {
    rows.push({
      id: 'uber-direct',
      label: 'Uber Direct',
      description: 'Entrega rápida sob demanda (BR)',
      status: 'off',
      detail: uberEnabled ? 'Modalidade ativa no admin — configure secrets' : 'Não configurado'
    });
  } else if (!uber.authOk) {
    rows.push({
      id: 'uber-direct',
      label: 'Uber Direct',
      description: 'Entrega rápida sob demanda (BR)',
      status: 'error',
      detail: uber.error || 'Falha na autenticação OAuth'
    });
  } else if (uber.quoteOk === false) {
    const radiusLimit = uber.error && /5 km|3,1 mi/i.test(uber.error);
    rows.push({
      id: 'uber-direct',
      label: 'Uber Direct',
      description: 'Entrega rápida sob demanda (BR)',
      status: radiusLimit ? 'warn' : 'error',
      detail: uber.error || 'Cotação de teste falhou'
    });
  } else {
    const priceHint = uber.samplePrice ? ` · teste ~R$ ${Number(uber.samplePrice).toFixed(2)}` : '';
    rows.push({
      id: 'uber-direct',
      label: 'Uber Direct',
      description: 'Entrega rápida sob demanda (BR)',
      status: uber.sandbox ? 'warn' : (uberEnabled ? 'ok' : 'warn'),
      detail: uber.sandbox
        ? `Sandbox conectado${priceHint}`
        : (uberEnabled ? `Produção conectada${priceHint}` : `Conectado — ative modalidade Uber no frete${priceHint}`)
    });
  }

  if (exportOptions.length > 0 && exportQuote) {
    const price = Number(exportQuote.price).toFixed(2).replace('.', ',');
    rows.push({
      id: 'correios-intl',
      label: 'Correios Exporta Fácil',
      description: 'Cotação de frete internacional',
      status: 'ok',
      detail: `Simulador OK — PT ~R$ ${price}`
    });
  } else {
    rows.push({
      id: 'correios-intl',
      label: 'Correios Exporta Fácil',
      description: 'Cotação de frete internacional',
      status: 'error',
      detail: 'Simulador indisponível — usa tabela fallback'
    });
  }

  if (!resend.configured) {
    rows.push({
      id: 'resend',
      label: 'Resend',
      description: 'E-mails transacionais (pedidos, confirmações)',
      status: formsubmitEmail ? 'warn' : 'off',
      detail: formsubmitEmail ? 'Não configurado — só FormSubmit' : 'Não configurado'
    });
  } else if (!resend.authOk) {
    rows.push({
      id: 'resend',
      label: 'Resend',
      description: 'E-mails transacionais (pedidos, confirmações)',
      status: 'error',
      detail: resend.error || 'Falha na autenticação'
    });
  } else {
    rows.push({
      id: 'resend',
      label: 'Resend',
      description: 'E-mails transacionais (pedidos, confirmações)',
      status: 'ok',
      detail: 'Conectado'
    });
  }

  rows.push({
    id: 'formsubmit',
    label: 'FormSubmit',
    description: 'Fallback de e-mail se Resend falhar',
    status: formsubmitEmail ? 'ok' : 'off',
    detail: formsubmitEmail ? formsubmitEmail : 'E-mail de destino não configurado'
  });

  if (!zapi.configured) {
    rows.push({
      id: 'zapi',
      label: 'Z-API',
      description: 'WhatsApp automático (cliente e loja)',
      status: 'off',
      detail: 'Não configurado'
    });
  } else if (!zapi.authOk) {
    rows.push({
      id: 'zapi',
      label: 'Z-API',
      description: 'WhatsApp automático (cliente e loja)',
      status: zapi.connected === false ? 'warn' : 'error',
      detail: zapi.error || 'Falha na conexão'
    });
  } else {
    rows.push({
      id: 'zapi',
      label: 'Z-API',
      description: 'WhatsApp automático (cliente e loja)',
      status: 'ok',
      detail: 'Instância conectada'
    });
  }

  rows.push({
    id: 'ga4',
    label: 'GA4 (server)',
    description: 'Conversões de compra via Measurement Protocol',
    status: ga4Secret ? 'ok' : 'warn',
    detail: ga4Secret ? 'API secret configurado' : 'Só tag no site — sem conversão server-side'
  });

  return rows;
}

async function createPayPalCheckout(env, order, config) {
  const accessToken = await getPayPalAccessToken(env);
  const { return_url, cancel_url } = paypalReturnUrls(config, order, env);
  const description = `Sensor Tattoo Fix — ${order.orderId}`.slice(0, 127);

  const res = await fetch(`${paypalBase(env)}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: order.orderId,
        custom_id: order.orderId,
        description,
        amount: {
          currency_code: 'BRL',
          value: Number(order.total).toFixed(2)
        }
      }],
      application_context: {
        brand_name: 'Sensor Tattoo Fix',
        locale: 'pt-BR',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url,
        cancel_url
      }
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.details?.[0]?.description || data.message;
    throw new Error(detail || 'Falha ao criar pagamento PayPal.');
  }
  const approveUrl = (data.links || []).find((l) => l.rel === 'approve')?.href;
  if (!approveUrl) throw new Error('Link de pagamento PayPal não retornado.');

  return {
    provider: 'paypal',
    billingType: 'PAYPAL',
    paymentId: data.id,
    paypalOrderId: data.id,
    approveUrl,
    autoConfirm: true
  };
}

async function capturePayPalOrder(env, paypalOrderId) {
  const accessToken = await getPayPalAccessToken(env);
  const res = await fetch(`${paypalBase(env)}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const issue = data.details?.[0]?.issue;
    if (issue === 'ORDER_ALREADY_CAPTURED') {
      return { status: 'COMPLETED', id: paypalOrderId, value: null };
    }
    const detail = data.details?.[0]?.description || data.message;
    throw new Error(detail || 'Falha ao capturar pagamento PayPal.');
  }
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    status: data.status,
    id: capture?.id || data.id,
    value: capture?.amount?.value
  };
}

function mpErrorMessage(data, status) {
  const parts = [];
  if (Array.isArray(data.cause)) {
    data.cause.forEach((c) => {
      if (c.description) parts.push(c.description);
      else if (c.code) parts.push(String(c.code));
    });
  }
  if (data.message) parts.push(data.message);
  if (data.error && data.error !== data.message) parts.push(data.error);
  if (data.message === 'internal_error' || data.status === 'internal_error') {
    parts.push('Confira no Mercado Pago se a conta está habilitada para PIX em produção.');
  }
  return parts.filter(Boolean).join(' — ') || `HTTP ${status}`;
}

async function createMercadoPagoPixPayment(env, order, config) {
  const token = mercadoPagoToken(env);
  if (!token) return null;

  const nameParts = String(order.nome || 'Cliente').trim().split(/\s+/);
  const firstName = nameParts[0] || 'Cliente';
  const lastName = nameParts.slice(1).join(' ') || '.';
  const cpf = onlyDigits(order.cpf);

  const payer = {
    email: order.email,
    first_name: firstName.slice(0, 50),
    last_name: lastName.slice(0, 50)
  };
  if (cpf.length === 11) {
    payer.identification = { type: 'CPF', number: cpf };
  }

  const notificationUrl = (env.MP_WEBHOOK_URL || '').trim() || undefined;
  const body = {
    transaction_amount: Number(order.total.toFixed(2)),
    description: `${config.product?.name || 'Kit Sensor Tattoo Fix'} — ${order.orderId}`.slice(0, 200),
    payment_method_id: 'pix',
    external_reference: order.orderId,
    payer
  };
  if (notificationUrl) body.notification_url = notificationUrl;

  const res = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: mpHeaders(env, order.orderId),
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Mercado Pago PIX: ${mpErrorMessage(data, res.status)}`);
  }

  const tx = data.point_of_interaction?.transaction_data;
  if (!tx?.qr_code) {
    throw new Error('Mercado Pago não retornou QR Code PIX.');
  }

  return {
    provider: 'mercadopago',
    billingType: 'PIX',
    paymentId: String(data.id),
    pixCopyPaste: tx.qr_code,
    pixQrEncoded: tx.qr_code_base64 || null,
    autoConfirm: true
  };
}

/** Checkout Pro — cartão internacional (Visa/Mastercard/Amex), valor em BRL. */
async function createMercadoPagoCheckoutPro(env, order, config) {
  const token = mercadoPagoToken(env);
  if (!token) throw new Error('Mercado Pago não configurado no Worker.');

  const base = storeBaseUrl(config, env);
  const successParams = new URLSearchParams({
    mp: 'success', orderId: order.orderId, accessToken: order.accessToken
  });
  const failureParams = new URLSearchParams({
    mp: 'failure', orderId: order.orderId, accessToken: order.accessToken
  });
  const pendingParams = new URLSearchParams({
    mp: 'pending', orderId: order.orderId, accessToken: order.accessToken
  });
  const notificationUrl = (env.MP_WEBHOOK_URL || '').trim() || undefined;

  const body = {
    items: [{
      title: String(order.produto || config.product?.name || 'Sensor Tattoo Fix').slice(0, 256),
      quantity: 1,
      unit_price: Number(order.total.toFixed(2)),
      currency_id: 'BRL'
    }],
    payer: {
      email: order.email,
      name: String(order.nome || 'Cliente').slice(0, 100)
    },
    external_reference: order.orderId,
    back_urls: {
      success: `${base}/comprar.html?${successParams}`,
      failure: `${base}/comprar.html?${failureParams}`,
      pending: `${base}/comprar.html?${pendingParams}`
    },
    auto_return: 'approved',
    statement_descriptor: 'SENSOR TATTOO FIX',
    payment_methods: {
      excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }]
    }
  };
  if (notificationUrl) body.notification_url = notificationUrl;

  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: mpHeaders(env, order.orderId),
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Mercado Pago checkout: ${mpErrorMessage(data, res.status)}`);
  }

  const checkoutUrl = isMpSandbox(env) ? data.sandbox_init_point : data.init_point;
  if (!checkoutUrl) throw new Error('Link de pagamento Mercado Pago não retornado.');

  return {
    provider: 'mercadopago',
    billingType: 'MP_CHECKOUT',
    paymentId: String(data.id),
    mpPreferenceId: String(data.id),
    approveUrl: checkoutUrl,
    invoiceUrl: checkoutUrl,
    autoConfirm: true
  };
}

/** Cartão ou PIX BR — processador configurado no admin, com fallback Asaas ↔ Mercado Pago. */
async function tryBrPaymentProvider(env, order, config, provider, billingType) {
  const hasAsaas = !!asaasApiKey(env);
  const hasMp = !!mercadoPagoToken(env);
  if (provider === 'mercadopago') {
    if (!hasMp) throw new Error('Mercado Pago não configurado no Worker.');
    if (billingType === 'CREDIT_CARD') return createMercadoPagoCheckoutPro(env, order, config);
    return createMercadoPagoPixPayment(env, order, config);
  }
  if (!hasAsaas) throw new Error('Asaas não configurado no Worker.');
  return createAsaasPayment(env, order, config, billingType);
}

async function createBrPaymentWithFallback(env, order, config, billingType, getProvider, fallbackEnabled) {
  const primary = getProvider(config);
  const alternate = primary === 'mercadopago' ? 'asaas' : 'mercadopago';
  const label = billingType === 'PIX' ? 'PIX' : 'Cartão';
  try {
    return await tryBrPaymentProvider(env, order, config, primary, billingType);
  } catch (primaryErr) {
    if (!fallbackEnabled(config)) throw primaryErr;
    console.error(`${label} ${primary}:`, primaryErr.message);
    try {
      const payment = await tryBrPaymentProvider(env, order, config, alternate, billingType);
      console.log(`${label} fallback ${primary} → ${alternate}:`, order.orderId);
      return payment;
    } catch (altErr) {
      console.error(`${label} ${alternate} (fallback):`, altErr.message);
      throw primaryErr;
    }
  }
}

async function createBrCreditCardPayment(env, order, config) {
  return createBrPaymentWithFallback(env, order, config, 'CREDIT_CARD', getCardBrProvider, cardBrFallbackEnabled);
}

async function createBrPixPayment(env, order, config) {
  return createBrPaymentWithFallback(env, order, config, 'PIX', getPixBrProvider, pixBrFallbackEnabled);
}

function getEmails(config) {
  return { ...DEFAULT_CONFIG.emails, ...(config?.emails || {}) };
}

function applyEmailTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => {
    if (vars[key] == null) return '';
    return String(vars[key]);
  });
}

function emailSubject(config, key, vars = {}) {
  return applyEmailTemplate(getEmails(config)[key], vars);
}

function emailMessage(config, key, vars = {}) {
  return applyEmailTemplate(getEmails(config)[key], vars);
}

function emailFrom(env, config) {
  return env.EMAIL_FROM || getEmails(config).from || DEFAULT_CONFIG.emails.from;
}

function fieldsToHtml(fields) {
  const rows = Object.entries(fields)
    .map(([k, v]) => `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">${k}</td><td style="padding:8px;border:1px solid #ddd">${String(v ?? '').replace(/</g, '&lt;')}</td></tr>`)
    .join('');
  return `<div style="font-family:Arial,sans-serif;max-width:560px"><table style="border-collapse:collapse;width:100%">${rows}</table><p style="color:#666;font-size:12px;margin-top:16px">Sensor Tattoo Fix — sensortattoofix.com.br</p></div>`;
}

function fieldsToText(fields) {
  return Object.entries(fields)
    .map(([k, v]) => `${k}: ${String(v ?? '')}`)
    .join('\n');
}

async function sendViaResend(env, config, to, subject, fields, replyTo, content) {
  const apiKey = (env.RESEND_API_KEY || '').trim();
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY não configurada' };

  const payload = {
    from: emailFrom(env, config),
    to: [to],
    subject,
    html: content?.html || fieldsToHtml(fields),
    text: content?.text || fieldsToText(fields)
  };
  if (replyTo) payload.reply_to = [replyTo];
  if (content?.attachments?.length) payload.attachments = content.attachments;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || data.error || res.statusText || 'Erro Resend';
    console.error('Resend:', res.status, msg, JSON.stringify(data));
    return { ok: false, status: res.status, error: msg };
  }
  return { ok: true, id: data.id };
}

async function sendViaFormSubmit(to, subject, fields) {
  const body = new URLSearchParams();
  body.append('_subject', subject);
  body.append('_captcha', 'false');
  body.append('_template', 'table');
  Object.entries(fields).forEach(([k, v]) => body.append(k, String(v ?? '')));
  const res = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(to), {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  const data = await res.json().catch(() => ({}));
  const ok = res.ok && data.success !== false;
  if (!ok) console.error('FormSubmit:', res.status, JSON.stringify(data));
  return { ok, status: res.status, data };
}

async function notifyEmail(env, config, to, subject, fields, replyTo, content) {
  if (!to) return { ok: false, error: 'Destinatário vazio' };
  try {
    const resend = await sendViaResend(env, config, to, subject, fields, replyTo, content);
    if (resend.ok) return { ok: true, provider: 'resend', id: resend.id };

    const formsubmit = await sendViaFormSubmit(to, subject, fields);
    if (formsubmit.ok) return { ok: true, provider: 'formsubmit' };

    return { ok: false, resend, formsubmit };
  } catch (err) {
    console.error('E-mail:', err.message);
    return { ok: false, error: err.message };
  }
}

async function notifyShop(env, config, subject, fields) {
  return notifyEmail(env, config, config.formsubmit?.email, subject, fields);
}

async function notifyCustomer(env, config, order, subject, fields, content) {
  return notifyEmail(env, config, order.email, subject, { Cliente: order.nome, ...fields }, config.formsubmit?.email, content);
}

async function notifyCustomerPendingPix(env, config, order) {
  const qrAttachment = await pixQrInlineAttachment(order);
  const pixMail = buildPixPaymentEmail(order, config, { hasQrImage: !!qrAttachment });
  const fields = {
    Pedido: order.orderId,
    Total: formatBRL(order.total),
    'Link do pedido': resumeOrderUrl(config, order),
    ...orderWatchEmailFields(order)
  };
  return notifyCustomer(
    env,
    config,
    order,
    emailSubject(config, 'customerPixSubject', { orderId: order.orderId }),
    fields,
    {
      ...pixMail,
      attachments: qrAttachment ? [qrAttachment] : []
    }
  );
}

async function handleShippingQuote(request, env, origin, ctx) {
  const url = new URL(request.url);
  const country = (url.searchParams.get('country') || 'BR').toUpperCase();
  const config = await getConfig(env);
  const weightGrams = shippingWeightGrams(config, Number(url.searchParams.get('weightGrams')) || undefined);
  let options = [];

  if (country !== 'BR') {
    options = await quoteCorreiosExportOptions(config, country, { weightGrams });
    if (options.some((o) => o.source === 'correios-export') && ctx) {
      ctx.waitUntil(
        updateIntlFallbackZone(env, country, options).catch((err) => {
          console.error('intl fallback sync:', country, err.message);
        })
      );
    }
    if (!options.length) {
      const fallback = quoteInternational(config, country);
      options = [{
        id: 'config-fallback',
        methodId: 'config-fallback',
        serviceCode: null,
        service: fallback.service,
        price: fallback.price,
        days: fallback.days,
        source: fallback.source || 'config',
        country,
        countryLabel: fallback.countryLabel,
        weightGrams
      }];
    } else {
      options = applyIntlSurchargeToOptions(config, options);
    }
  } else {
    const cep = url.searchParams.get('cep');
    const declaredValue = Number(url.searchParams.get('valor')) || undefined;
    const addressParams = {
      cep,
      rua: url.searchParams.get('rua'),
      numero: url.searchParams.get('numero'),
      complemento: url.searchParams.get('complemento'),
      bairro: url.searchParams.get('bairro'),
      cidade: url.searchParams.get('cidade'),
      uf: url.searchParams.get('uf')
    };
    try {
      options = await quoteCorreiosOptions(env, config, cep, { weightGrams, declaredValue });
      const motoboyOptions = await quoteMotoboyShippingOptions(env, config, addressParams, { weightGrams });
      const uberOptions = await quoteUberShippingOptions(env, config, addressParams, { weightGrams });
      if (motoboyOptions.length || uberOptions.length) {
        options = [...options, ...motoboyOptions, ...uberOptions].sort((a, b) => a.price - b.price);
      }
    } catch (err) {
      return json({ error: err.message }, 400, origin);
    }
  }

  return json({ options, country, weightGrams }, 200, origin);
}

async function registerCustomerUser(env, { nome, email, telefone, cpf, senha }) {
  const normalized = normalizeEmail(email);
  if (!normalized || !senha || senha.length < 6) {
    throw new Error('Informe e-mail e senha com pelo menos 6 caracteres.');
  }
  if (await getUserByEmail(env, normalized)) {
    throw new Error('Já existe uma conta com este e-mail. Faça login em Minha Conta.');
  }
  const creds = await hashPassword(senha);
  const user = {
    userId: crypto.randomUUID(),
    nome: String(nome || '').trim(),
    email: normalized,
    telefone: String(telefone || '').trim(),
    cpf: String(cpf || '').trim(),
    passwordSalt: creds.salt,
    passwordHash: creds.hash,
    createdAt: new Date().toISOString()
  };
  await saveUser(env, user);
  return user;
}

async function handleCustomerRegister(request, env, origin) {
  const body = await request.json();
  try {
    const user = await registerCustomerUser(env, body);
    const token = await createCustomerSession(env, user.userId);
    return json({ ok: true, token, user: publicUserView(user) }, 200, origin);
  } catch (err) {
    return json({ error: err.message }, 400, origin);
  }
}

async function handleCustomerLogin(request, env, origin) {
  const ip = clientIp(request);
  const lock = await getLoginLock(env, ip, 'customer');
  if (lock?.lockedUntil && Date.now() < lock.lockedUntil) {
    return loginLockedResponse(lock, origin);
  }

  const body = await request.json();
  const email = normalizeEmail(body.email);
  const senha = String(body.senha || '');
  const user = await getUserByEmail(env, email);
  if (!user || !(await verifyPassword(senha, user.passwordSalt, user.passwordHash))) {
    await recordLoginFailure(env, ip, 'customer');
    return json({ error: 'E-mail ou senha incorretos.' }, 401, origin);
  }
  await clearLoginFailures(env, ip, 'customer');
  const token = await createCustomerSession(env, user.userId);
  return json({ ok: true, token, user: publicUserView(user) }, 200, origin);
}

async function handleCustomerSession(request, env, origin) {
  const userId = await getCustomerUserId(env, bearerToken(request));
  if (!userId) return json({ ok: false }, 401, origin);
  const user = await getUserById(env, userId);
  if (!user) return json({ ok: false }, 401, origin);
  return json({ ok: true, user: publicUserView(user) }, 200, origin);
}

async function handleCustomerLogout(request, env, origin) {
  const token = bearerToken(request);
  if (token) await env.STORE_KV.delete('customerSession:' + token);
  return json({ ok: true }, 200, origin);
}

async function listAllCustomers(env, max = 500) {
  const users = [];
  let cursor;
  do {
    const page = await env.STORE_KV.list({ prefix: 'user:email:', limit: 100, cursor });
    for (const { name } of page.keys) {
      const userId = await env.STORE_KV.get(name);
      if (!userId) continue;
      const user = await getUserById(env, userId);
      if (!user) continue;
      const orderIds = JSON.parse((await env.STORE_KV.get('user:' + userId + ':orders')) || '[]');
      users.push({
        userId: user.userId,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        cpf: user.cpf || '',
        createdAt: user.createdAt || null,
        orderCount: orderIds.length
      });
      if (users.length >= max) {
        users.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        return users;
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  users.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return users;
}

async function handleAdminCustomers(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const customers = await listAllCustomers(env);
  return json({ customers, total: customers.length, checkedAt: new Date().toISOString() }, 200, origin);
}

async function handleCustomerOrders(request, env, origin) {
  const userId = await getCustomerUserId(env, bearerToken(request));
  if (!userId) return json({ error: 'Não autorizado.' }, 401, origin);
  const ids = JSON.parse((await env.STORE_KV.get('user:' + userId + ':orders')) || '[]');
  const orders = [];
  for (const orderId of ids.slice(0, 100)) {
    const order = await getOrder(env, orderId);
    if (order && order.userId === userId) {
      orders.push(publicOrderView(order, {
        includePayment: order.status === 'pending_payment',
        includeResumeToken: order.status === 'pending_payment'
      }));
    }
  }
  return json({ orders }, 200, origin);
}

async function handleCustomerUpdateProfile(request, env, origin) {
  const userId = await getCustomerUserId(env, bearerToken(request));
  if (!userId) return json({ error: 'Não autorizado.' }, 401, origin);
  const user = await getUserById(env, userId);
  if (!user) return json({ error: 'Conta não encontrada.' }, 404, origin);

  const body = await request.json();

  if (body.nome !== undefined) {
    const nome = String(body.nome || '').trim();
    if (!nome) return json({ error: 'Informe o nome.' }, 400, origin);
    user.nome = nome;
  }
  if (body.telefone !== undefined) {
    const telefone = String(body.telefone || '').trim();
    if (!telefone) return json({ error: 'Informe o WhatsApp.' }, 400, origin);
    user.telefone = telefone;
  }
  if (body.cpf !== undefined) {
    user.cpf = String(body.cpf || '').trim();
  }
  if (body.address !== undefined) {
    user.address = normalizeUserAddress(body.address);
  }

  const senhaNova = String(body.senhaNova || '').trim();
  if (senhaNova) {
    const senhaAtual = String(body.senhaAtual || '').trim();
    if (!senhaAtual) return json({ error: 'Informe a senha atual para alterá-la.' }, 400, origin);
    if (senhaNova.length < 6) return json({ error: 'Nova senha: mínimo 6 caracteres.' }, 400, origin);
    if (!(await verifyPassword(senhaAtual, user.passwordSalt, user.passwordHash))) {
      return json({ error: 'Senha atual incorreta.' }, 401, origin);
    }
    const creds = await hashPassword(senhaNova);
    user.passwordSalt = creds.salt;
    user.passwordHash = creds.hash;
  }

  user.updatedAt = new Date().toISOString();
  await saveUser(env, user);
  return json({ ok: true, user: publicUserView(user) }, 200, origin);
}

async function resolveCheckoutUser(env, request, body) {
  const customerToken = bearerToken(request) || String(body.customerToken || '').trim();
  let userId = await getCustomerUserId(env, customerToken);
  let newToken = null;

  if (!userId && body.criarConta && body.senha) {
    const user = await registerCustomerUser(env, {
      nome: body.nome,
      email: body.email,
      telefone: body.telefone,
      cpf: body.cpf,
      senha: body.senha
    });
    userId = user.userId;
    newToken = await createCustomerSession(env, userId);
  }

  return { userId, newToken };
}

async function handleCreateOrder(request, env, origin, ctx) {
  const body = await request.json();
  const config = await getPublicConfig(env);
  let frete = Number(body.frete) || 0;
  let items;
  try {
    items = resolveOrderItems(config, body);
  } catch (err) {
    return json({ error: err.message }, 400, origin);
  }
  const valorProdutoBruto = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  let couponDiscount = 0;
  let couponRecord = null;
  const couponCodeRaw = String(body.couponCode || '').trim();
  if (couponCodeRaw) {
    couponRecord = findActiveCoupon(config, couponCodeRaw);
    if (!couponRecord) {
      return json({ error: 'Cupom inválido ou inativo.' }, 400, origin);
    }
    couponDiscount = computeCouponDiscount(valorProdutoBruto, couponRecord.percent).discount;
  }
  const valorProduto = Math.max(0, valorProdutoBruto - couponDiscount);
  let couponCommissionPercent = 0;
  let couponCommissionAmount = 0;
  if (couponRecord) {
    const commPct = couponRecord.commissionPercent == null || couponRecord.commissionPercent === ''
      ? 10
      : Number(couponRecord.commissionPercent) || 0;
    const comm = computeCouponCommission(valorProduto, commPct);
    couponCommissionPercent = comm.percent;
    couponCommissionAmount = comm.amount;
  }
  const isIntl = (body.paisCode || 'BR') !== 'BR';
  const uberMethod = !isIntl && getEnabledShippingMethods(config, 'BR').find(
    (m) => isUberMethod(m) && (m.id === body.shippingMethodId || body.shippingProvider === 'uber')
  );
  const motoboyMethod = !isIntl && getMotoboyShippingMethods(config).find(
    (m) => m.id === body.shippingMethodId || body.shippingProvider === 'motoboy'
  );
  let uberQuoteId = body.uberQuoteId || null;
  let motoboyDistanceKm = null;

  if (motoboyMethod) {
    if (!motoboyOperational(config)) {
      return json({ error: 'Envio particular (motoboy) indisponível no momento.' }, 400, origin);
    }
    const destCep = body.cep;
    if (!destCep || String(destCep).replace(/\D/g, '').length !== 8) {
      return json({ error: 'Informe um CEP válido para envio particular.' }, 400, origin);
    }
    try {
      const quote = await computeMotoboyQuote(config, destCep, body);
      if (!quote) {
        return json({ error: 'Endereço fora da área de entrega particular. Escolha outro frete.' }, 400, origin);
      }
      if (Math.abs(quote.price - frete) > 0.05) {
        return json({ error: 'Valor do frete particular desatualizado. Recalcule o frete.' }, 400, origin);
      }
      frete = quote.price;
      motoboyDistanceKm = quote.roadKm;
    } catch (err) {
      return json({ error: 'Envio particular indisponível: ' + err.message }, 400, origin);
    }
  } else if (uberMethod) {
    if (!uberConfigured(env)) {
      return json({ error: 'Entrega Uber indisponível no momento.' }, 400, origin);
    }
    const dropoff = dropoffPartsFromParams(body);
    if (!hasUberDropoffAddress(dropoff)) {
      return json({ error: 'Informe rua, cidade e UF para entrega Uber.' }, 400, origin);
    }
    try {
      const quote = await requestUberQuote(env, config, dropoff);
      if (!quote) {
        return json({ error: 'Uber não atende este endereço. Escolha outro frete.' }, 400, origin);
      }
      if (Math.abs(quote.price - frete) > 0.05) {
        return json({ error: 'Valor do frete Uber desatualizado. Recalcule o frete.' }, 400, origin);
      }
      frete = quote.price;
      uberQuoteId = quote.uberQuoteId;
    } catch (err) {
      return json({ error: 'Uber indisponível: ' + err.message }, 400, origin);
    }
  }

  let billingType;
  let pagamentoLabel;
  if (isIntl) {
    if (body.pagamento === 'PAYPAL') {
      if (!isInternationalPayPalAvailable(config)) {
        return json({ error: 'PayPal temporariamente indisponível. Use PIX ou tente novamente em breve.' }, 400, origin);
      }
      billingType = 'PAYPAL';
      pagamentoLabel = 'PayPal';
    } else if (body.pagamento === 'PIX') {
      billingType = 'PIX';
      pagamentoLabel = 'PIX';
    } else if (body.pagamento === 'CARTAO') {
      if (!mercadoPagoToken(env)) {
        return json({ error: 'Cartão internacional indisponível. Use PIX ou PayPal.' }, 400, origin);
      }
      billingType = 'MP_CHECKOUT';
      pagamentoLabel = 'Cartão internacional';
    } else {
      return json({ error: 'Escolha cartão, PayPal ou PIX para envio internacional.' }, 400, origin);
    }
  } else {
    if (body.pagamento === 'PAYPAL') {
      if (!isBrazilPayPalAvailable(config)) {
        return json({ error: 'PayPal temporariamente indisponível. Use PIX ou cartão.' }, 400, origin);
      }
      billingType = 'PAYPAL';
      pagamentoLabel = 'PayPal';
    } else if (body.pagamento === 'CARTAO') {
      billingType = 'CREDIT_CARD';
      pagamentoLabel = 'Cartão de crédito';
    } else {
      billingType = 'PIX';
      pagamentoLabel = 'PIX';
    }
  }
  const needsWatch = orderRequiresSmartwatch(items);

  let checkoutUser;
  try {
    checkoutUser = await resolveCheckoutUser(env, request, body);
  } catch (err) {
    return json({ error: err.message }, 400, origin);
  }

  const order = {
    orderId: generateOrderId(),
    accessToken: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'pending_payment',
    userId: checkoutUser.userId || null,
    nome: body.nome,
    email: body.email,
    telefone: body.telefone,
    cpf: body.cpf,
    smartwatch: needsWatch ? (body.smartwatch || 'Não informado') : 'N/A',
    pais: body.pais || 'Brasil',
    paisCode: body.paisCode || 'BR',
    cep: body.cep || '',
    rua: body.rua || '',
    numero: body.numero || '',
    complemento: body.complemento || '',
    bairro: body.bairro || '',
    cidade: body.cidade || '',
    uf: body.uf || '',
    endereco: body.endereco,
    observacoes: body.observacoes || '',
    items,
    produto: items.map((i) => `${i.qty}x ${i.name}`).join(', '),
    valorProdutoOriginal: couponDiscount ? valorProdutoBruto : undefined,
    valorProduto,
    couponCode: couponRecord ? normalizeCouponCode(couponRecord.code) : undefined,
    couponPercent: couponRecord ? Number(couponRecord.percent) || 0 : undefined,
    couponDiscount: couponDiscount || undefined,
    couponCommissionerEmail: couponRecord ? String(couponRecord.email || '').trim().toLowerCase() : undefined,
    couponCommissionerName: couponRecord
      ? (String(couponRecord.name || '').trim() || normalizeCouponCode(couponRecord.code))
      : undefined,
    couponCommissionPercent: couponRecord ? couponCommissionPercent : undefined,
    couponCommissionAmount: couponRecord ? couponCommissionAmount : undefined,
    frete,
    total: valorProduto + frete,
    shippingService: body.shippingService || 'Mini Envios',
    shippingServiceCode: body.shippingServiceCode || null,
    shippingMethodId: body.shippingMethodId || null,
    shippingProvider: uberMethod ? 'uber' : (motoboyMethod ? 'motoboy' : (body.shippingProvider || null)),
    uberQuoteId: uberQuoteId || null,
    motoboyDistanceKm: motoboyDistanceKm || null,
    shippingDays: body.shippingDays || null,
    shipmentType: body.shipmentType || null,
    internationalLensOnly: !!body.internationalLensOnly,
    internationalProductNote: body.internationalProductNote || '',
    pagamento: pagamentoLabel
  };

  if (applySelfTestPixPricing(order, config, env, billingType)) {
    console.log('PIX self-test produção:', order.orderId, SELF_TEST_PIX_AMOUNT);
  }
  if (applySelfTestPayPalPricing(order, env, billingType)) {
    console.log('PayPal self-test produção:', order.orderId, SELF_TEST_PIX_AMOUNT);
  }

  let payment = null;
  const hasAsaas = !!asaasApiKey(env);
  const hasMp = !!mercadoPagoToken(env);

  try {
    if (billingType === 'PAYPAL') {
      payment = await createPayPalCheckout(env, order, config);
    } else if (billingType === 'MP_CHECKOUT') {
      payment = await createMercadoPagoCheckoutPro(env, order, config);
    } else if (billingType === 'PIX') {
      if (hasMp || hasAsaas) {
        payment = await createBrPixPayment(env, order, config);
      }
    } else if (billingType === 'CREDIT_CARD') {
      payment = await createBrCreditCardPayment(env, order, config);
    }
  } catch (err) {
    console.error('Payment:', err.message);
    let msg;
    if (billingType === 'CREDIT_CARD') msg = 'Cartão indisponível: ' + err.message;
    else if (billingType === 'PAYPAL') msg = 'PayPal indisponível: ' + err.message;
    else if (billingType === 'MP_CHECKOUT') msg = 'Cartão internacional indisponível: ' + err.message;
    else msg = 'PIX indisponível: ' + err.message;
    if (billingType === 'CREDIT_CARD' || billingType === 'PAYPAL' || billingType === 'MP_CHECKOUT' || hasMp || hasAsaas) {
      return json({ error: msg }, 400, origin);
    }
  }

  if (payment) {
    order.paymentProvider = payment.provider || 'asaas';
    if (payment.provider === 'asaas') order.asaasPaymentId = payment.paymentId;
    if (payment.provider === 'mercadopago') order.mercadoPagoPaymentId = payment.paymentId;
    order.autoConfirm = payment.autoConfirm !== false;
    attachPaymentToOrder(order, payment, config);
  } else if (billingType === 'CREDIT_CARD') {
    return json({ error: 'Cartão indisponível. Configure Asaas ou Mercado Pago.' }, 400, origin);
  } else if (hasAsaas && !hasMp) {
    return json({ error: 'Não foi possível criar cobrança no Asaas. Verifique chave PIX cadastrada no painel.' }, 400, origin);
  } else if (billingType === 'PIX') {
    order.paymentProvider = 'static_pix';
    order.autoConfirm = false;
    attachPaymentToOrder(order, { provider: 'static_pix', billingType: 'PIX', autoConfirm: false }, config);
  }

  await saveOrder(env, order);

  const paymentBillingType = payment?.billingType || billingType;
  const customerEmail = billingType === 'PIX'
    ? notifyCustomerPendingPix(env, config, order)
    : notifyCustomer(env, config, order, emailSubject(config, 'customerOrderSubject', { orderId: order.orderId }), {
      Pedido: order.orderId,
      Status: 'Aguardando pagamento',
      Total: formatBRL(order.total),
      Pagamento: order.pagamento,
      Mensagem: paymentBillingType === 'PAYPAL'
        ? emailMessage(config, 'pendingPaypal')
        : paymentBillingType === 'MP_CHECKOUT'
          ? emailMessage(config, 'pendingMpCheckout')
          : emailMessage(config, 'pendingCard'),
      ...(paymentBillingType === 'PAYPAL' && order.paypalApproveUrl ? { 'Link PayPal': order.paypalApproveUrl } : {}),
      ...(paymentBillingType === 'MP_CHECKOUT' && order.invoiceUrl ? { 'Link pagamento': order.invoiceUrl } : {}),
      'Link do pedido': resumeOrderUrl(config, order),
      ...orderWatchEmailFields(order),
      ...orderIntlProductFields(order)
    });

  const emailWork = Promise.all([
    notifyShop(env, config, config.formsubmit.subject, {
      Pedido: order.orderId, Status: order.status, Nome: order.nome,
      'E-mail': order.email, Telefone: order.telefone,
      País: order.pais, Endereço: order.endereco, Pagamento: order.pagamento,
      Produto: formatBRL(order.valorProdutoOriginal ?? order.valorProduto),
      ...(order.couponDiscount ? {
        'Desconto cupom': formatBRL(order.couponDiscount),
        'Produto c/ desconto': formatBRL(order.valorProduto)
      } : {}),
      Frete: formatBRL(order.frete), Total: formatBRL(order.total),
      Envio: order.shippingService || '—',
      ...orderCouponEmailFields(order),
      ...orderIntlProductFields(order),
      ...(order.selfTestPix ? {
        'Teste PIX produção': `R$ ${SELF_TEST_PIX_AMOUNT.toFixed(2)} — endereço igual ao remetente`,
        'Total original': formatBRL(order.totalOriginal || 0)
      } : {}),
      ...(order.selfTestPayPal ? {
        'Teste PayPal produção': `R$ ${SELF_TEST_PIX_AMOUNT.toFixed(2)} — PAYPAL_SELF_TEST ativo`,
        'Total original': formatBRL(order.totalOriginal || 0)
      } : {}),
      ...orderWatchEmailFields(order)
    }),
    customerEmail,
    notifyWhatsApp(env, config, order, 'order')
  ]).then((results) => {
    results.slice(0, 2).forEach((r, i) => {
      if (r && !r.ok) console.error('E-mail pedido falhou:', i === 0 ? 'loja' : 'cliente', JSON.stringify(r));
    });
  });

  if (ctx) ctx.waitUntil(emailWork);

  if (ctx && billingType === 'PIX' && payment && isMpSandbox(env)) {
    ctx.waitUntil(maybeSandboxAutoConfirmPix(env, order.orderId, payment));
  }

  const response = {
    order: publicOrderView(order),
    accessToken: order.accessToken,
    payment: payment || { provider: 'static_pix', billingType: 'PIX', autoConfirm: false }
  };
  if (checkoutUser.newToken) response.customerToken = checkoutUser.newToken;
  return json(response, 200, origin);
}

async function handlePaymentConfirmed(env, order, payment) {
  const fresh = await getOrder(env, order.orderId);
  if (!fresh || fresh.status === 'paid') return;
  order = fresh;

  order.status = 'paid';
  order.paidAt = new Date().toISOString();
  const value = payment?.value ?? order.total;
  if (payment?.id) {
    order.paymentProof = {
      provider: payment.provider || order.paymentProvider || 'asaas',
      paymentId: payment.id,
      value,
      billingType: payment.billingType
    };
  } else {
    order.paymentProof = {
      provider: payment?.provider || order.paymentProvider || 'manual',
      value,
      confirmedBy: payment?.confirmedBy || 'admin',
      confirmedAt: order.paidAt
    };
  }
  await saveOrder(env, order);

  const config = await getConfig(env);

  try {
    await decrementOrderStock(env, order);
    if (order.stockDecremented) await saveOrder(env, order);
  } catch (err) {
    console.error('Stock decrement:', order.orderId, err.message);
  }

  if (shouldDispatchUberDelivery(order)) {
    try {
      const uber = await createUberDeliveryForOrder(env, config, order);
      Object.assign(order, uber);
      await saveOrder(env, order);
    } catch (err) {
      console.error('Uber dispatch:', order.orderId, err.message);
      order.uberDispatchError = err.message;
      await saveOrder(env, order);
    }
  } else if (isUberOrder(order) && isSelfTestOrder(order)) {
    order.uberDispatchSkipped = `Pedido de teste (${formatBRL(order.total)}) — corrida Uber não criada.`;
    console.log('Uber dispatch ignorado — pedido de teste:', order.orderId, formatBRL(order.total));
    await saveOrder(env, order);
  } else if (isMotoboyOrder(order)) {
    try {
      const courierMails = await notifyMotoboyCouriers(env, config, order);
      order.motoboyNotifiedAt = new Date().toISOString();
      order.motoboyCourierEmails = courierMails.filter((r) => r.ok).map((r) => r.email);
      await saveOrder(env, order);
    } catch (err) {
      console.error('Motoboy notify:', order.orderId, err.message);
      order.motoboyNotifyError = err.message;
      await saveOrder(env, order);
    }
  } else if (isCorreiosBrOrder(order)) {
    try {
      await ensureCorreiosPrePostagemForOrder(env, order, config);
    } catch (err) {
      console.error('Correios pre-postagem:', order.orderId, err.message);
      order.correiosPrePostagemError = err.message;
      await saveOrder(env, order);
    }
  }

  const shopPaidFields = {
    Pedido: order.orderId, Status: 'PAGO', Cliente: order.nome,
    'E-mail cliente': order.email, Telefone: order.telefone,
    Pagamento: order.pagamento || payment?.billingType || '—',
    Valor: formatBRL(value),
    Endereço: order.endereco, Envio: order.shippingService,
    ...orderWatchEmailFields(order),
    ...orderCouponEmailFields(order),
    ...orderIntlProductFields(order)
  };
  if (isUberOrder(order)) {
    if (order.uberDispatchSkipped) {
      shopPaidFields['Uber Direct'] = order.uberDispatchSkipped;
    } else {
      shopPaidFields['Uber Direct'] = order.uberDeliveryId || 'solicitado';
      if (order.uberTrackingUrl) shopPaidFields['Rastreio Uber'] = order.uberTrackingUrl;
      if (order.uberDispatchError) shopPaidFields['Erro Uber'] = order.uberDispatchError;
    }
  } else if (isMotoboyOrder(order)) {
    shopPaidFields['Envio particular'] = 'Motoboy';
    if (order.motoboyDistanceKm) shopPaidFields['Distância'] = `~${order.motoboyDistanceKm} km`;
    if (order.motoboyCourierEmails?.length) {
      shopPaidFields['Motoboys avisados'] = order.motoboyCourierEmails.join(', ');
    }
    if (order.motoboyNotifyError) shopPaidFields['Erro e-mail motoboy'] = order.motoboyNotifyError;
  } else if (isCorreiosBrOrder(order)) {
    if (order.correiosPrePostagemId) shopPaidFields['Pré-postagem Correios'] = 'Registrada automaticamente';
    if (order.correiosTrackingCode) {
      shopPaidFields['Rastreio Correios'] = order.correiosTrackingCode;
      shopPaidFields['Acompanhar envio'] = correiosTrackingUrl(order.correiosTrackingCode);
    }
    shopPaidFields['Imprimir etiqueta'] = labelPrintUrl(config, order.orderId);
    if (order.correiosPrePostagemError) shopPaidFields['Erro pré-postagem'] = order.correiosPrePostagemError;
  } else if ((order.paisCode || 'BR') === 'BR' && !order.internationalLensOnly) {
    shopPaidFields['Imprimir etiqueta'] = labelPrintUrl(config, order.orderId);
  }

  const shopPaid = await notifyShop(env, config, emailSubject(config, 'shopPaidSubject', { orderId: order.orderId }), shopPaidFields);
  if (!shopPaid?.ok) console.error('E-mail PAGO loja falhou:', JSON.stringify(shopPaid));

  let paidCustomerMessage;
  if (isUberOrder(order)) {
    paidCustomerMessage = order.uberTrackingUrl
      ? emailMessage(config, 'paidUberTracking', { url: order.uberTrackingUrl })
      : emailMessage(config, 'paidUberPending');
  } else if (isMotoboyOrder(order)) {
    paidCustomerMessage = emailMessage(config, 'paidMotoboy', { hours: getMotoboyConfig(config).deliveryHours });
  } else if (order.internationalLensOnly) {
    paidCustomerMessage = emailMessage(config, 'paidIntlLens');
  } else if (order.paisCode && order.paisCode !== 'BR') {
    paidCustomerMessage = emailMessage(config, 'paidIntlKit');
  } else {
    paidCustomerMessage = emailMessage(config, 'paidDefault');
  }

  await notifyCustomer(env, config, order, emailSubject(config, 'customerPaidSubject', { orderId: order.orderId }), {
    Pedido: order.orderId,
    Status: 'PAGO',
    Valor: formatBRL(value),
    Mensagem: paidCustomerMessage,
    ...(order.uberTrackingUrl ? { 'Rastreio Uber': order.uberTrackingUrl } : {}),
    ...(order.correiosTrackingCode ? {
      'Rastreio Correios': order.correiosTrackingCode,
      'Acompanhar envio': correiosTrackingUrl(order.correiosTrackingCode)
    } : {}),
    ...orderWatchEmailFields(order),
    ...orderIntlProductFields(order)
  });

  if (order.couponCommissionerEmail && order.couponCommissionAmount != null) {
    const commissionerPaid = await notifyCouponCommissioner(env, config, order);
    if (!commissionerPaid?.ok) console.error('E-mail comissão comissionado falhou:', JSON.stringify(commissionerPaid));
  }

  await notifyWhatsApp(env, config, order, 'paid');
  await trackGa4Purchase(env, order, payment);
}

async function trackGa4Purchase(env, order, payment) {
  const apiSecret = (env.GA4_API_SECRET || '').trim();
  if (!apiSecret) return;

  const measurementId = (env.GA4_MEASUREMENT_ID || 'G-TFLZHJG9RN').trim();
  const value = Number(payment?.value ?? order.total) || 0;
  const paymentType = order.pagamento || payment?.billingType || 'unknown';
  const itemName = order.produto || 'Kit Sensor Tattoo Fix';

  const p = String(paymentType).toLowerCase();
  const forma = p.includes('paypal') ? 'paypal'
    : (p.includes('card') || p.includes('cart') ? 'cartao' : 'pix');

  const eventParams = {
    transaction_id: order.orderId,
    value,
    currency: 'BRL',
    pagamento: forma,
    pedido: order.orderId,
    valor: value,
    moeda: 'BRL'
  };

  const payload = {
    client_id: order.orderId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 36) || 'server',
    events: [
      { name: 'purchase', params: { ...eventParams, items: [{ item_name: itemName, price: value, quantity: 1 }] } },
      { name: 'venda_confirmada', params: eventParams }
    ]
  };

  try {
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) console.error('GA4 MP:', res.status, await res.text().catch(() => ''));
  } catch (err) {
    console.error('GA4 MP:', err.message);
  }
}

async function handleOrderShippingLabel(request, env, origin, orderId) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);
  if (order.status !== 'paid') {
    return json({ error: 'Só é possível gerar etiqueta de pedido PAGO.' }, 400, origin);
  }
  if ((order.paisCode || 'BR') !== 'BR') {
    return json({ error: 'Etiqueta Correios disponível apenas para envio nacional.', mode: 'html', useClient: false }, 400, origin);
  }
  if (isParticularDeliveryOrder(order)) {
    return json({ mode: 'html', useClient: true, message: 'Use etiqueta local para motoboy/Uber.' }, 200, origin);
  }

  const config = await getConfig(env);
  const token = await getCorreiosToken(env);
  if (!token) {
    return json({
      error: 'Correios não configurado no Worker.',
      mode: 'html_fallback',
      useClient: true
    }, 503, origin);
  }

  try {
    await ensureCorreiosPrePostagemForOrder(env, order, config);
    const prePostagemId = order.correiosPrePostagemId;
    if (!prePostagemId) throw new Error('Pré-postagem não criada');

    const label = await fetchCorreiosLabelPdf(token, prePostagemId);
    let labelCode = label.trackingCode
      ? String(label.trackingCode).trim().toUpperCase()
      : await extractAvFromPdfBase64(label.pdfBase64);
    if (!labelCode) {
      labelCode = await syncCorreiosTrackingCodeFromPrePostagem(token, order, env, { aggressive: true });
    } else if (!order.correiosTrackingCode) {
      order.correiosTrackingCode = labelCode;
      await saveOrder(env, order);
    }

    return json({
      mode: 'pdf',
      pdfBase64: label.pdfBase64,
      trackingCode: order.correiosTrackingCode || labelCode || null,
      prePostagemId
    }, 200, origin);
  } catch (err) {
    const msg = String(err.message || 'Falha ao gerar etiqueta Correios');
    const blocked = msg.includes('GTW-012') || msg.includes('86720') || msg.includes('CON-011') || msg.includes('04227');
    return json({
      error: blocked
        ? 'Aguardando liberação Correios (API 36 / serviços 86720 e 04227 no cartão).'
        : msg,
      detail: msg,
      mode: blocked ? 'blocked' : 'html_fallback',
      useClient: !blocked
    }, blocked ? 503 : 502, origin);
  }
}

async function handleOrderCorreiosAv(request, env, origin, orderId) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const body = await request.json().catch(() => ({}));
  const trackingCode = String(body.trackingCode || '').trim().toUpperCase();
  if (!CORREIOS_AV_RE.test(trackingCode)) {
    return json({ error: 'Código AV inválido.' }, 400, origin);
  }
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);
  order.correiosTrackingCode = trackingCode;
  order.correiosTrackingUpdatedAt = new Date().toISOString();
  await saveOrder(env, order);
  return json({ ok: true, trackingCode }, 200, origin);
}

async function handleConfirmOrder(request, env, origin, orderId) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);
  if (order.status === 'paid') return json(order, 200, origin);

  await handlePaymentConfirmed(env, order, {
    provider: order.paymentProvider || 'manual',
    value: order.total,
    confirmedBy: 'admin'
  });
  return json(await getOrder(env, orderId), 200, origin);
}

async function handleConfirmSelfTestOrder(request, env, origin, orderId) {
  const body = await request.json().catch(() => ({}));
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);

  const token = String(body.accessToken || '');
  if (!order.accessToken || token !== order.accessToken) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  if (!isSelfTestOrder(order)) {
    return json({ error: 'Disponível apenas em pedidos de teste.' }, 403, origin);
  }
  if (order.status === 'paid') {
    return json({ order: publicOrderView(order), status: 'paid' }, 200, origin);
  }

  await handlePaymentConfirmed(env, order, {
    provider: order.paymentProvider || 'self_test',
    value: order.total,
    confirmedBy: 'self_test_skip'
  });
  const updated = await getOrder(env, orderId);
  return json({ order: publicOrderView(updated), status: 'paid' }, 200, origin);
}

async function handleAsaasWebhook(request, env, origin) {
  const token = request.headers.get('asaas-access-token');
  if (env.ASAAS_WEBHOOK_TOKEN && token !== env.ASAAS_WEBHOOK_TOKEN) {
    return json({ error: 'Token inválido.' }, 401, origin);
  }
  const body = await request.json();
  if ((body.event === 'PAYMENT_RECEIVED' || body.event === 'PAYMENT_CONFIRMED') && body.payment?.externalReference) {
    const order = await getOrder(env, body.payment.externalReference);
    if (order && order.status !== 'paid') {
      await handlePaymentConfirmed(env, order, body.payment);
    }
  }
  return json({ ok: true }, 200, origin);
}

async function handlePayPalCapture(request, env, origin, orderId) {
  const body = await request.json().catch(() => ({}));
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);

  const accessToken = String(body.accessToken || '');
  if (!order.accessToken || accessToken !== order.accessToken) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  if (order.status === 'paid') {
    return json({ order: publicOrderView(order), status: 'paid' }, 200, origin);
  }

  const paypalOrderId = String(body.paypalOrderId || order.paypalOrderId || '');
  if (!paypalOrderId) return json({ error: 'Pedido PayPal não encontrado.' }, 400, origin);

  try {
    const result = await capturePayPalOrder(env, paypalOrderId);
    if (result.status === 'COMPLETED') {
      await handlePaymentConfirmed(env, order, {
        id: result.id,
        provider: 'paypal',
        billingType: 'PAYPAL',
        value: Number(result.value) || order.total
      });
    } else {
      return json({ error: 'Pagamento PayPal não concluído.', status: result.status }, 400, origin);
    }
  } catch (err) {
    return json({ error: err.message }, 400, origin);
  }

  const updated = await getOrder(env, orderId);
  return json({ order: publicOrderView(updated), status: updated.status }, 200, origin);
}

async function handlePayPalWebhook(request, env, origin) {
  const body = await request.json().catch(() => ({}));
  const eventType = body.event_type;
  const resource = body.resource || {};

  if (eventType === 'PAYMENT.CAPTURE.COMPLETED' || eventType === 'CHECKOUT.ORDER.COMPLETED') {
    const orderId = resource.custom_id || resource.purchase_units?.[0]?.custom_id
      || resource.purchase_units?.[0]?.reference_id;
    if (orderId) {
      const order = await getOrder(env, orderId);
      if (order && order.status !== 'paid') {
        await handlePaymentConfirmed(env, order, {
          id: resource.id,
          provider: 'paypal',
          billingType: 'PAYPAL',
          value: Number(resource.amount?.value) || order.total
        });
      }
    }
  }
  return json({ ok: true }, 200, origin);
}

async function handleMercadoPagoWebhook(request, env, origin) {
  const mpToken = mercadoPagoToken(env);
  if (!mpToken) return json({ error: 'MP não configurado.' }, 500, origin);

  const url = new URL(request.url);
  let paymentId = url.searchParams.get('id') || url.searchParams.get('data.id');

  if (!paymentId && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    paymentId = body?.data?.id || body?.id;
  }
  if (!paymentId) return json({ ok: true }, 200, origin);

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: 'Bearer ' + mpToken, Accept: 'application/json' }
  });
  const payment = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('MP webhook:', res.status, payment);
    return json({ ok: true }, 200, origin);
  }

  if (payment.status === 'approved' && payment.external_reference) {
    const order = await getOrder(env, payment.external_reference);
    if (order && order.status !== 'paid') {
      await handlePaymentConfirmed(env, order, {
        id: payment.id,
        provider: 'mercadopago',
        billingType: payment.payment_method_id === 'pix' ? 'PIX' : 'CREDIT_CARD',
        value: payment.transaction_amount
      });
    }
  }
  return json({ ok: true }, 200, origin);
}

async function handleLogin(request, env, origin) {
  if (!env.ADMIN_PASSWORD) return json({ error: 'ADMIN_PASSWORD não configurado.' }, 500, origin);

  const ip = clientIp(request);
  const lock = await getLoginLock(env, ip, 'admin');
  if (lock?.lockedUntil && Date.now() < lock.lockedUntil) {
    return loginLockedResponse(lock, origin);
  }

  const body = await request.json();
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  if (username !== (env.ADMIN_USERNAME || 'admin') || password !== env.ADMIN_PASSWORD) {
    await recordLoginFailure(env, ip, 'admin');
    return json({ error: 'Usuário ou senha incorretos.' }, 401, origin);
  }

  await clearLoginFailures(env, ip, 'admin');
  return json({ token: await createSession(env), username: env.ADMIN_USERNAME || 'admin' }, 200, origin);
}

async function handleSession(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  return json({ ok: true, username: env.ADMIN_USERNAME || 'admin' }, 200, origin);
}

async function handleAdminIntegrationsStatus(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const config = await getConfig(env);
  const weightGrams = shippingWeightGrams(config);
  const hasCorreiosCreds = !!(env.CORREIOS_USER && env.CORREIOS_PASSWORD);
  const correiosToken = hasCorreiosCreds ? await getCorreiosToken(env) : null;
  const correiosPreco = correiosToken ? await probeCorreiosPrecoApi(correiosToken, config) : null;
  const correiosPrazo = correiosToken ? await probeCorreiosPrazoApi(correiosToken, config) : null;
  const [correiosPrePostagem, correiosServico04227, correiosServico86720] = correiosToken
    ? await Promise.all([
      probeCorreiosPrePostagemApi(correiosToken),
      probeCorreiosCartaoServico(correiosToken, env, '04227'),
      probeCorreiosCartaoServico(correiosToken, env, '86720')
    ])
    : [null, null, null];

  const [paypal, mercadoPago, asaas, resend, zapi, exportOptions, uber] = await Promise.all([
    checkPayPalIntegration(env),
    checkMercadoPagoIntegration(env),
    checkAsaasIntegration(env),
    checkResendIntegration(env),
    checkZApiIntegration(env),
    quoteCorreiosExportOptions(config, 'PT', { weightGrams }).catch(() => []),
    checkUberIntegration(env, config)
  ]);

  const integrations = buildIntegrationRows(env, config, {
    paypal,
    mercadoPago,
    asaas,
    resend,
    zapi,
    correiosToken,
    correiosPreco,
    correiosPrazo,
    correiosPrePostagem,
    correiosServico04227,
    correiosServico86720,
    exportOptions,
    uber
  });

  return json({ integrations, checkedAt: new Date().toISOString() }, 200, origin);
}

async function handleAdminShippingStatus(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  let config = await getConfig(env);
  const paypal = await checkPayPalIntegration(env);
  const sync = await syncAllIntlFallbackZones(env, config);
  config = sync.config;
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const hasCreds = !!(env.CORREIOS_USER && env.CORREIOS_PASSWORD);
  const correiosToken = hasCreds ? await getCorreiosToken(env) : null;
  const [correiosPreco, correiosPrazo, correiosPrePostagem, correiosServico04227, correiosServico86720] = correiosToken
    ? await Promise.all([
      probeCorreiosPrecoApi(correiosToken, config),
      probeCorreiosPrazoApi(correiosToken, config),
      probeCorreiosPrePostagemApi(correiosToken),
      probeCorreiosCartaoServico(correiosToken, env, '04227'),
      probeCorreiosCartaoServico(correiosToken, env, '86720')
    ])
    : [null, null, null, null, null];
  const weightGrams = shippingWeightGrams(config);
  const exportOptions = await quoteCorreiosExportOptions(config, 'PT', { weightGrams });
  const exportQuote = exportOptions[0] || null;
  const products = (config.products || []).map((p) => ({
    id: p.id,
    name: p.name,
    weightGrams: p.weightGrams
  }));
  const shipWeight = Number(ship.weightGrams) || weightGrams;
  const weightMismatch = products.some((p) => Math.abs(Number(p.weightGrams || 0) - shipWeight) > 0.01);

  return json({
    correiosBr: {
      credentialsConfigured: hasCreds,
      apiConnected: !!correiosToken,
      precoApiOk: !!correiosPreco?.ok,
      prazoApiOk: !!correiosPrazo?.ok,
      precoApiDetail: correiosPreco?.detail || null,
      prazoApiDetail: correiosPrazo?.detail || null,
      prePostagemApiOk: !!correiosPrePostagem?.ok,
      prePostagemApiDetail: correiosPrePostagem?.detail || null,
      servico04227OnCard: !!correiosServico04227?.ok,
      servico04227Detail: correiosServico04227?.detail || null,
      servico86720OnCard: !!correiosServico86720?.ok,
      servico86720Detail: correiosServico86720?.detail || null,
      commercialContract: correiosCommercialContract(env),
      contractConfigured: !!env.CORREIOS_CONTRACT,
      serviceCode: ship.serviceCode || '04227',
      originCep: ship.originCep || ''
    },
    correiosExport: {
      simulatorReachable: exportOptions.length > 0,
      preferredServiceCode: ship.intlServiceCode || '45128',
      sampleQuotesPT: exportOptions.slice(0, 6),
      sampleQuotePT: exportQuote
        ? {
          price: exportQuote.price,
          days: exportQuote.days,
          service: exportQuote.service,
          source: exportQuote.source,
          weightGrams: exportQuote.weightGrams
        }
        : null
    },
    package: {
      weightGrams: shipWeight,
      lengthCm: ship.lengthCm,
      widthCm: ship.widthCm,
      heightCm: ship.heightCm,
      originCep: ship.originCep
    },
    products,
    weightMismatch,
    weightMismatchHint: weightMismatch
      ? 'O peso do produto no catálogo difere do peso do pacote (Frete Mini Envios). O checkout usa o peso do pacote.'
      : null,
    internationalShipping: config.internationalShipping,
    intlFallbackSync: sync.results,
    intlFallbackUpdated: sync.updated,
    paypal
  }, 200, origin);
}

async function getClicksIndex(env) {
  try {
    return JSON.parse((await env.STORE_KV.get(CLICKS_INDEX)) || '[]');
  } catch {
    return [];
  }
}

async function getClicksBlob(env) {
  try {
    const raw = await env.STORE_KV.get(CLICKS_BLOB);
    if (!raw) return null;
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : null;
  } catch {
    return null;
  }
}

async function clicksBlobStoreActive(env) {
  const raw = await env.STORE_KV.get(CLICKS_BLOB);
  return raw !== null && raw !== undefined;
}

async function saveClicksBlob(env, list) {
  await env.STORE_KV.put(CLICKS_BLOB, JSON.stringify(list));
}

async function purgeLegacyClickIndex(env, mode) {
  const ids = await getClicksIndex(env);
  if (!ids.length) return 0;
  let removed = 0;
  const kept = [];
  for (const id of ids) {
    const raw = await env.STORE_KV.get('click:' + id);
    if (!raw) {
      if (mode === 'all') removed++;
      continue;
    }
    let row;
    try {
      row = JSON.parse(raw);
    } catch {
      if (mode === 'all') {
        removed++;
        await env.STORE_KV.delete('click:' + id).catch(() => {});
      } else {
        kept.push(id);
      }
      continue;
    }
    const drop = mode === 'all' || isTestClick(row);
    if (drop) {
      removed++;
      await env.STORE_KV.delete('click:' + id).catch(() => {});
    } else {
      kept.push(id);
    }
  }
  await env.STORE_KV.put(CLICKS_INDEX, JSON.stringify(kept));
  return removed;
}

async function appendClickLog(env, entry) {
  const id = crypto.randomUUID();
  const row = { id, ts: Date.now(), ...entry };
  let list = (await getClicksBlob(env)) || [];
  list.unshift(row);
  if (list.length > CLICKS_MAX) list.length = CLICKS_MAX;
  await saveClicksBlob(env, list);
  return row;
}

async function isDuplicateClickEvent(eventId) {
  const id = String(eventId || '').trim().slice(0, 64);
  if (!id) return false;
  const cache = caches.default;
  const req = new Request(`https://stf-click-dedupe/${encodeURIComponent(id)}`);
  return !!(await cache.match(req));
}

async function markClickEventSeen(eventId) {
  const id = String(eventId || '').trim().slice(0, 64);
  if (!id) return;
  const cache = caches.default;
  const req = new Request(`https://stf-click-dedupe/${encodeURIComponent(id)}`);
  await cache.put(req, new Response('1', { headers: { 'Cache-Control': 'max-age=120' } }));
}

const PIXEL_GIF = Uint8Array.from([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 255, 255, 255, 0, 0, 0, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 59]);

function clickField(data, key, maxLen, fallback) {
  return String(data?.[key] ?? fallback ?? '').slice(0, maxLen);
}

function buildClickEntry(data, request) {
  const ip = clientIp(request);
  const paisCf = (request.headers.get('CF-IPCountry') || '').trim();
  return {
    tipo: clickField(data, 'tipo', 24, 'clique'),
    destino: clickField(data, 'destino', 48),
    destino_label: clickField(data, 'destino_label', 80),
    rotulo: clickField(data, 'rotulo', 120),
    secao: clickField(data, 'secao', 60),
    secao_label: clickField(data, 'secao_label', 80),
    elemento: clickField(data, 'elemento', 24),
    href: clickField(data, 'href', 500),
    pagina: clickField(data, 'pagina', 200),
    titulo_pagina: clickField(data, 'titulo_pagina', 120),
    idioma: clickField(data, 'idioma', 24),
    referrer: clickField(data, 'referrer', 200),
    dispositivo: clickField(data, 'dispositivo', 80),
    fuso: clickField(data, 'fuso', 60),
    visitante_id: clickField(data, 'visitante_id', 64),
    sessao_visita: clickField(data, 'sessao_visita', 64),
    sequencia: Math.max(0, Math.min(9999, parseInt(data?.sequencia, 10) || 0)),
    cliente_nome: clickField(data, 'cliente_nome', 80),
    cliente_email: clickField(data, 'cliente_email', 120),
    pais: clickField(data, 'pais', 12, paisCf),
    ip: ip !== 'unknown' ? ip : '',
    ip_prefix: ip !== 'unknown' && ip.includes('.') ? ip.split('.').slice(0, 2).join('.') + '.x.x' : '',
    client_ts: Math.max(0, parseInt(data?.client_ts, 10) || 0),
    origem_trafego: clickField(data, 'origem_trafego', 32),
    origem_trafego_label: clickField(data, 'origem_trafego_label', 80),
    utm_source: clickField(data, 'utm_source', 48),
    utm_medium: clickField(data, 'utm_medium', 32),
    utm_campaign: clickField(data, 'utm_campaign', 64),
    teste: data?.teste === true || data?.teste === 'true' || data?.is_test === true || data?.is_test === 'true'
  };
}

function pixelResponse(origin, status) {
  return new Response(PIXEL_GIF, {
    status: status || 200,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store'
    }
  });
}

async function persistClickLog(env, entry) {
  await appendClickLog(env, entry);
}

const REAL_VISITOR_UUID = /^v_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REAL_VISITOR_TS = /^v_\d{10,13}$/;

function isRealVisitorId(vid) {
  const v = String(vid || '').trim();
  if (!v) return false;
  if (REAL_VISITOR_UUID.test(v)) return true;
  if (REAL_VISITOR_TS.test(v)) return true;
  return false;
}

/** Só tráfego real: visitante gerado pelo analytics.js no site público. */
function isRealClick(row) {
  if (!row || typeof row !== 'object') return false;
  if (row.teste === true || row.is_test === true) return false;

  const vid = String(row.visitante_id || '').trim();
  if (!isRealVisitorId(vid)) return false;
  if (/^v_(fix|test|key|fn|diag|check|proxy|admin)/i.test(vid)) return false;

  const pagina = String(row.pagina || '').toLowerCase();
  if (/admin\.html|\/admin|documentacao|pedidos\.html|imprimir-etiqueta/.test(pagina)) return false;

  const sessao = String(row.sessao_visita || '').toLowerCase();
  if (/^admin_|^s_test|^test_/.test(sessao)) return false;

  const hay = [
    row.rotulo, row.destino, row.destino_label, row.secao, row.secao_label,
    row.elemento, row.referrer
  ].map((s) => String(s || '').toLowerCase()).join(' ');

  if (/\b(teste|test|diag|verify|proxy|deploy)\b|admin_teste|test_diag|pos-fix|pos fix|live_test|admin_panel/.test(hay)) {
    return false;
  }

  return true;
}

function isTestClick(row) {
  return !isRealClick(row);
}

async function handleAdminClearClicks(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const body = await request.json().catch(() => ({}));
  const mode = body.mode === 'all' ? 'all' : 'tests';

  let removed = 0;
  let remaining = 0;
  const blobActive = await clicksBlobStoreActive(env);

  if (blobActive) {
    const list = (await getClicksBlob(env)) || [];
    if (mode === 'all') {
      removed += list.length;
      await saveClicksBlob(env, []);
      remaining = 0;
    } else {
      const kept = list.filter((row) => !isTestClick(row));
      removed += list.length - kept.length;
      await saveClicksBlob(env, kept);
      remaining = kept.length;
    }
  }

  removed += await purgeLegacyClickIndex(env, mode);

  if (mode === 'all') {
    remaining = 0;
  } else if (blobActive) {
    remaining = ((await getClicksBlob(env)) || []).length;
  } else {
    remaining = (await getClicksIndex(env)).length;
  }

  return json({ ok: true, mode, removed, remaining }, 200, origin);
}

async function checkClickRate(env, ip) {
  if (!ip || ip === 'unknown') return true;
  const minute = Math.floor(Date.now() / 60000);
  const cache = caches.default;
  const req = new Request(`https://stf-click-rate/${encodeURIComponent(ip)}/${minute}`);
  const hit = await cache.match(req);
  const n = (hit ? parseInt(await hit.text(), 10) || 0 : 0) + 1;
  if (n > 180) return false;
  await cache.put(req, new Response(String(n), { headers: { 'Cache-Control': 'max-age=120' } }));
  return true;
}

async function handleLogClick(request, env, origin, ctx) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return json({ error: 'Payload inválido.' }, 400, origin);
  }
  if (!isAllowedSiteRequest(request) && !isValidClickLogKey(body, env)) {
    return json({ error: 'Origem não permitida.' }, 403, origin);
  }

  const ip = clientIp(request);
  if (!(await checkClickRate(env, ip))) {
    return json({ ok: true, dropped: true }, 202, origin);
  }

  const eventId = String(body.client_event_id || '').trim().slice(0, 64);
  if (eventId && (await isDuplicateClickEvent(eventId))) {
    return json({ ok: true, deduped: true }, 202, origin);
  }
  if (eventId && ctx) ctx.waitUntil(markClickEventSeen(eventId));
  else if (eventId) await markClickEventSeen(eventId);

  const entry = buildClickEntry(body, request);

  try {
    await persistClickLog(env, entry);
  } catch (err) {
    console.error('click log:', err.message);
    return json({ ok: false, error: 'storage', retry: true }, 503, origin);
  }

  return json({ ok: true }, 202, origin);
}

async function handleLogClickPixel(request, env, origin, ctx) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  if (!isAllowedSiteRequest(request) && !isValidClickLogKey(params, env)) {
    return pixelResponse(origin, 403);
  }

  const ip = clientIp(request);
  if (!(await checkClickRate(env, ip))) {
    return pixelResponse(origin);
  }

  const eventId = String(params.client_event_id || '').trim().slice(0, 64);
  if (eventId && (await isDuplicateClickEvent(eventId))) {
    return pixelResponse(origin);
  }
  if (eventId && ctx) ctx.waitUntil(markClickEventSeen(eventId));
  else if (eventId) await markClickEventSeen(eventId);

  const entry = buildClickEntry(params, request);

  try {
    await persistClickLog(env, entry);
  } catch (err) {
    console.error('click pixel:', err.message);
  }

  return pixelResponse(origin);
}

async function loadClickRows(env, ids, maxRows) {
  const rows = [];
  const batch = 50;
  for (let i = 0; i < ids.length && rows.length < maxRows; i += batch) {
    const slice = ids.slice(i, i + batch);
    const raws = await Promise.all(slice.map((id) => env.STORE_KV.get('click:' + id)));
    for (const raw of raws) {
      if (!raw) continue;
      try {
        rows.push(JSON.parse(raw));
      } catch {
        continue;
      }
    }
  }
  return rows;
}

async function handleAdminListClicks(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const destino = (url.searchParams.get('destino') || '').trim();
  const tipo = (url.searchParams.get('tipo') || '').trim();
  const limit = Math.min(800, Math.max(20, parseInt(url.searchParams.get('limit') || '400', 10) || 400));

  const blobActive = await clicksBlobStoreActive(env);
  let loaded;
  let total;
  if (blobActive) {
    loaded = (await getClicksBlob(env)) || [];
    total = loaded.length;
  } else {
    const ids = await getClicksIndex(env);
    total = ids.length;
    const scanIds = ids.slice(0, Math.min(ids.length, 500));
    loaded = await loadClickRows(env, scanIds, scanIds.length);
  }

  const clicks = [];
  for (const row of loaded) {
    if (destino === 'pageview') {
      if (row.tipo !== 'pageview') continue;
    } else if (destino && row.destino !== destino) continue;
    if (tipo && row.tipo !== tipo) continue;
    if (q) {
      const hay = [
        row.rotulo, row.destino, row.destino_label, row.secao, row.secao_label,
        row.pagina, row.visitante_id, row.sessao_visita, row.cliente_email, row.cliente_nome, row.referrer, row.tipo, row.ip, row.ip_prefix,
        row.origem_trafego, row.origem_trafego_label, row.utm_source, row.utm_medium, row.utm_campaign
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) continue;
    }
    clicks.push(row);
    if (clicks.length >= limit) break;
  }

  const todayKey = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const brDateKey = (ts) => new Date(ts).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const byDestino = {};
  let todayCount = 0;
  const statsSample = loaded.slice(0, 300);
  for (const row of statsSample) {
    if (brDateKey(row.ts) === todayKey) todayCount++;
    const key = row.destino || row.tipo || 'outro';
    byDestino[key] = (byDestino[key] || 0) + 1;
  }

  let lastClickAt = null;
  if (loaded.length && loaded[0]?.ts) {
    lastClickAt = new Date(loaded[0].ts).toISOString();
  }

  return json({
    clicks,
    total,
    todayCount,
    byDestino,
    lastClickAt,
    checkedAt: new Date().toISOString()
  }, 200, origin);
}

async function getFeedbackList(env) {
  try {
    const raw = await env.STORE_KV.get(FEEDBACK_BLOB);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function saveFeedbackList(env, list) {
  await env.STORE_KV.put(FEEDBACK_BLOB, JSON.stringify(list));
}

async function appendFeedback(env, entry) {
  const row = { id: crypto.randomUUID(), ts: Date.now(), ...entry };
  let list = await getFeedbackList(env);
  list.unshift(row);
  if (list.length > FEEDBACK_MAX) list.length = FEEDBACK_MAX;
  await saveFeedbackList(env, list);
  return row;
}

async function checkFeedbackRate(env, ip) {
  if (!ip || ip === 'unknown') return true;
  const hour = Math.floor(Date.now() / 3600000);
  const cache = caches.default;
  const req = new Request(`https://stf-feedback-rate/${encodeURIComponent(ip)}/${hour}`);
  const hit = await cache.match(req);
  const n = (hit ? parseInt(await hit.text(), 10) || 0 : 0) + 1;
  if (n > 12) return false;
  await cache.put(req, new Response(String(n), { headers: { 'Cache-Control': 'max-age=7200' } }));
  return true;
}

function feedbackField(data, key, maxLen) {
  return String(data?.[key] ?? '').trim().slice(0, maxLen);
}

async function handleFeedback(request, env, origin) {
  if (!isAllowedSiteRequest(request)) {
    return json({ error: 'Origem não permitida.' }, 403, origin);
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return json({ error: 'Payload inválido.' }, 400, origin);
  }

  const buscava = feedbackField(body, 'buscava', 800);
  if (buscava.length < 8) {
    return json({ error: 'Descreva o que procurava (mín. 8 caracteres).' }, 400, origin);
  }

  const ip = clientIp(request);
  if (!(await checkFeedbackRate(env, ip))) {
    return json({ error: 'Muitas respostas em pouco tempo. Tente mais tarde.' }, 429, origin);
  }

  const paisCf = (request.headers.get('CF-IPCountry') || '').trim();
  const entry = {
    buscava,
    sugestao: feedbackField(body, 'sugestao', 800),
    email: feedbackField(body, 'email', 120),
    pagina: feedbackField(body, 'pagina', 200),
    titulo_pagina: feedbackField(body, 'titulo_pagina', 120),
    idioma: feedbackField(body, 'idioma', 24),
    referrer: feedbackField(body, 'referrer', 200),
    pais: paisCf,
    ip: ip !== 'unknown' ? ip : ''
  };

  try {
    await appendFeedback(env, entry);
  } catch (err) {
    console.error('feedback save:', err.message);
    return json({ error: 'Falha ao gravar.' }, 503, origin);
  }

  const config = await getConfig(env);
  const when = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  notifyShop(env, config, 'Pesquisa site — o que faltou', {
    'Procurava': buscava,
    'Sugestão': entry.sugestao || '—',
    'E-mail visitante': entry.email || '—',
    'Página': entry.pagina || '—',
    'Idioma': entry.idioma || '—',
    'Referrer': entry.referrer || '—',
    'País': entry.pais || '—',
    'Quando': when
  }).catch(() => {});

  return json({ ok: true }, 202, origin);
}

async function handleAdminListFeedback(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const limit = Math.min(200, Math.max(20, parseInt(url.searchParams.get('limit') || '100', 10) || 100));
  const loaded = await getFeedbackList(env);
  let items = loaded;
  if (q) {
    items = loaded.filter((row) => {
      const hay = [row.buscava, row.sugestao, row.email, row.pagina, row.idioma, row.pais].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }
  return json({
    feedback: items.slice(0, limit),
    total: loaded.length,
    checkedAt: new Date().toISOString()
  }, 200, origin);
}

async function handleAdminClearFeedback(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const list = await getFeedbackList(env);
  const removed = list.length;
  await saveFeedbackList(env, []);
  return json({ ok: true, removed }, 200, origin);
}

async function handleTestEmail(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const config = await getConfig(env);
  const body = await request.json().catch(() => ({}));
  const to = (body.email || getEmails(config).testTo || config.formsubmit?.email || '').trim();
  if (!to) return json({ error: 'Configure o e-mail de destino dos testes (Contato → Testes de e-mail).' }, 400, origin);

  const TEST_EMAIL_TYPES = [
    'generic',
    'shop_order',
    'shop_paid',
    'customer_order',
    'customer_order_paypal',
    'customer_order_mp',
    'customer_pix',
    'customer_paid',
    'motoboy',
    'coupon'
  ];

  const type = body.type || 'generic';
  const normalizedType = type === 'order' ? 'shop_order' : type === 'paid' ? 'shop_paid' : type;
  const types = normalizedType === 'all' ? TEST_EMAIL_TYPES : [normalizedType];
  if (!types.every((t) => TEST_EMAIL_TYPES.includes(t))) {
    return json({ error: 'Tipo de teste inválido.' }, 400, origin);
  }

  const results = [];
  for (const t of types) {
    const result = await sendTestEmailByType(env, config, to, t);
    results.push({ type: t, ...result });
    if (!result.ok && type !== 'all') {
      return json({ ok: false, type: t, results, ...result }, 502, origin);
    }
  }

  const failed = results.filter((r) => !r.ok);
  const ok = failed.length === 0;
  return json({
    ok,
    to,
    sent: results.filter((r) => r.ok).length,
    failed: failed.length,
    results
  }, ok ? 200 : 502, origin);
}

function buildTestOrder(config, to) {
  const orderId = 'STF-TESTE-' + Date.now();
  const price = Number(config.product?.price) || 62.9;
  return {
    orderId,
    nome: 'Cliente Teste',
    email: to,
    telefone: '(11) 99999-9999',
    smartwatch: 'Apple Watch Series 9 (41mm)',
    produto: config.product?.name || 'Kit Sensor Tattoo Fix',
    total: price + 11.9,
    valorProduto: price,
    frete: 11.9,
    pagamento: 'PIX',
    endereco: 'Av Paulista, 1000 — Bela Vista, São Paulo/SP — Brasil 01310100',
    pais: 'Brasil',
    paisCode: 'BR',
    shippingService: 'Mini Envios',
    pixCopyPaste: '00020126580014BR.GOV.BCB.PIX0136123456789012345204000053039865405' + String(Math.round(price * 100)).padStart(4, '0') + '5802BR6009SAO PAULO62070503***6304TEST',
    status: 'pending_payment'
  };
}

async function sendTestEmailByType(env, config, to, type) {
  const order = buildTestOrder(config, to);
  const price = Number(config.product?.price) || 62.9;
  const adminUrl = `${(config.siteUrl || DEFAULT_CONFIG.siteUrl).replace(/\/$/, '')}/pedidos.html`;

  switch (type) {
    case 'generic':
      return notifyEmail(env, config, to, emailSubject(config, 'testSubject'), {
        Teste: 'Envio de e-mail da loja (TESTE)',
        Horário: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        Remetente: emailFrom(env, config)
      }, config.formsubmit?.email);

    case 'shop_order':
      return notifyEmail(env, config, to, config.formsubmit?.subject || 'Novo pedido — teste', {
        Pedido: order.orderId,
        Status: 'pending_payment (TESTE)',
        Nome: order.nome,
        'E-mail': 'cliente@exemplo.com',
        Telefone: order.telefone,
        Smartwatch: order.smartwatch,
        País: order.pais,
        Pagamento: 'PIX',
        Total: formatBRL(order.total)
      }, config.formsubmit?.email);

    case 'shop_paid':
      return notifyEmail(env, config, to, emailSubject(config, 'shopPaidSubject', { orderId: order.orderId }), {
        Pedido: order.orderId,
        Status: 'PAGO (TESTE — não é pedido real)',
        Cliente: order.nome,
        'E-mail cliente': 'cliente@exemplo.com',
        Telefone: order.telefone,
        Pagamento: 'Cartão de crédito',
        Smartwatch: order.smartwatch,
        Valor: formatBRL(price),
        Endereço: order.endereco,
        Envio: order.shippingService
      }, config.formsubmit?.email);

    case 'customer_order':
      return notifyCustomer(env, config, order, emailSubject(config, 'customerOrderSubject', { orderId: order.orderId }), {
        Pedido: order.orderId,
        Status: 'Aguardando pagamento (TESTE)',
        Total: formatBRL(order.total),
        Pagamento: 'Cartão de crédito',
        Mensagem: emailMessage(config, 'pendingCard')
      });

    case 'customer_order_paypal':
      return notifyCustomer(env, config, order, emailSubject(config, 'customerOrderSubject', { orderId: order.orderId }), {
        Pedido: order.orderId,
        Status: 'Aguardando pagamento (TESTE)',
        Total: formatBRL(order.total),
        Pagamento: 'PayPal',
        Mensagem: emailMessage(config, 'pendingPaypal')
      });

    case 'customer_order_mp':
      return notifyCustomer(env, config, order, emailSubject(config, 'customerOrderSubject', { orderId: order.orderId }), {
        Pedido: order.orderId,
        Status: 'Aguardando pagamento (TESTE)',
        Total: formatBRL(order.total),
        Pagamento: 'Mercado Pago',
        Mensagem: emailMessage(config, 'pendingMpCheckout')
      });

    case 'customer_pix': {
      const pixMail = buildPixPaymentEmail(order, config, { hasQrImage: false });
      return notifyCustomer(env, config, order, emailSubject(config, 'customerPixSubject', { orderId: order.orderId }), {
        Pedido: order.orderId,
        Total: formatBRL(order.total),
        'Link do pedido': resumeOrderUrl(config, order)
      }, pixMail);
    }

    case 'customer_paid':
      return notifyCustomer(env, config, order, emailSubject(config, 'customerPaidSubject', { orderId: order.orderId }), {
        Pedido: order.orderId,
        Status: 'PAGO (TESTE)',
        Valor: formatBRL(price),
        Mensagem: emailMessage(config, 'paidDefault')
      });

    case 'motoboy':
      return notifyEmail(env, config, to, emailSubject(config, 'motoboySubject', { orderId: order.orderId }), {
        Motoboy: 'Motoboy Teste',
        Pedido: order.orderId,
        Cliente: order.nome,
        Telefone: order.telefone,
        'E-mail cliente': 'cliente@exemplo.com',
        Endereço: order.endereco,
        Produto: order.produto,
        'Valor frete': formatBRL(order.frete),
        Distância: '~8 km',
        Prazo: `até ${getMotoboyConfig(config).deliveryHours}h`,
        'Painel pedidos': adminUrl,
        Smartwatch: order.smartwatch
      }, config.formsubmit?.email);

    case 'coupon':
      return notifyEmail(env, config, to, emailSubject(config, 'couponSubject', {
        orderId: order.orderId,
        amount: formatBRL(price * 0.1)
      }), {
        Comissionado: 'Comissionado Teste',
        Cupom: 'TESTE10',
        Pedido: order.orderId,
        Cliente: order.nome,
        'E-mail cliente': 'cliente@exemplo.com',
        Produto: order.produto,
        'Valor do produto': formatBRL(price),
        'Desconto aplicado': formatBRL(price * 0.1),
        'Total do pedido': formatBRL(order.total),
        Status: 'Pago (TESTE)',
        'Sua comissão (%)': '10%',
        'Comissão a receber': formatBRL(price * 0.1),
        'Painel pedidos': adminUrl,
        Smartwatch: order.smartwatch
      }, config.formsubmit?.email);

    default:
      return { ok: false, error: 'Tipo desconhecido' };
  }
}

async function handleGetOrder(request, env, origin, orderId) {
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Não encontrado.' }, 404, origin);

  if (await isValidSession(env, bearerToken(request))) {
    return json(order, 200, origin);
  }

  const accessToken = new URL(request.url).searchParams.get('token') || '';
  if (accessToken && order.accessToken && accessToken === order.accessToken) {
    return json(publicOrderView(order, { includePayment: true }), 200, origin);
  }

  const customerId = await getCustomerUserId(env, bearerToken(request));
  if (customerId && order.userId === customerId) {
    return json(publicOrderView(order, { includePayment: order.status === 'pending_payment' }), 200, origin);
  }

  return json({ error: 'Não autorizado.' }, 401, origin);
}

async function handleAdminGetConfig(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  return json(await getConfig(env), 200, origin);
}

async function handlePutConfig(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) return json({ error: 'Não autorizado.' }, 401, origin);
  const body = await request.json();
  const current = await getConfig(env);
  const merged = {
    ...current, ...body,
    product: { ...current.product, ...body.product },
    pix: resolvePixConfig({ ...current.pix, ...body.pix }, DEFAULT_CONFIG.pix),
    shipping: { ...current.shipping, ...body.shipping },
    internationalShipping: { ...current.internationalShipping, ...body.internationalShipping },
    internationalSurcharge: body.internationalSurcharge != null
      ? Math.max(0, Number(body.internationalSurcharge) || 0)
      : current.internationalSurcharge,
    internationalProduct: { ...current.internationalProduct, ...body.internationalProduct },
    payments: {
      ...current.payments,
      ...body.payments,
      paypal: (() => {
        const merged = { ...current.payments?.paypal, ...body.payments?.paypal };
        delete merged.showAfter;
        return merged;
      })(),
      cardBr: mergeCardBrConfig(current.payments?.cardBr, body.payments?.cardBr),
      pixBr: mergePixBrConfig(current.payments?.pixBr, body.payments?.pixBr)
    },
    shippingMethods: body.shippingMethods?.length ? body.shippingMethods : current.shippingMethods,
    smartwatchModels: body.smartwatchModels || current.smartwatchModels,
    products: body.products?.length ? body.products : current.products,
    formsubmit: { ...current.formsubmit, ...body.formsubmit },
    emails: { ...(current.emails || {}), ...(body.emails || {}) },
    api: { ...current.api, ...body.api }
  };
  if (merged.products?.[0]) {
    merged.product = {
      name: merged.products[0].name,
      description: merged.products[0].description,
      price: merged.products[0].price,
      image: merged.products[0].image
    };
  }
  return json(await saveConfig(env, merged), 200, origin);
}

async function handleDeleteOrder(request, env, origin, orderId) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);

  let correiosCancel = null;
  if (isCorreiosBrOrder(order) && (order.correiosPrePostagemId || order.correiosTrackingCode)) {
    correiosCancel = await cancelCorreiosPrePostagem(env, order);
  }

  await deleteOrder(env, orderId);
  return json({ ok: true, orderId, correiosCancel }, 200, origin);
}

async function handleDeletePendingOrders(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }

  const index = await readOrdersIndex(env);
  const pendingIds = index.filter((o) => o.status !== 'paid').map((o) => o.orderId);
  let deleted = 0;
  for (const orderId of pendingIds) {
    if (await deleteOrder(env, orderId)) deleted++;
  }
  return json({ ok: true, deleted }, 200, origin);
}

async function handleAdminCorreiosTracking(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const body = await request.json().catch(() => ({}));
  const orderIds = Array.isArray(body.orderIds) ? body.orderIds.slice(0, 25) : [];
  const forceAvSync = body.forceAvSync === true;
  const token = await getCorreiosToken(env);
  if (!token) return json({ error: 'Correios não configurado.' }, 503, origin);

  const config = await getConfig(env);
  const orders = {};
  let aggressiveBudget = forceAvSync ? orderIds.length : 3;
  for (const orderId of orderIds) {
    const order = await getOrder(env, orderId);
    if (!order) continue;

    if (isCorreiosBrOrder(order) && order.correiosFreteEstimado == null) {
      try {
        await ensureCorreiosFreteEstimate(env, order, config);
      } catch (err) {
        console.warn('Correios frete backfill:', orderId, err.message);
      }
    }

    if (!order.correiosTrackingCode && isCorreiosBrOrder(order)) {
      if (!order.correiosPrePostagemId) {
        try {
          await ensureCorreiosPrePostagemForOrder(env, order, config);
        } catch (err) {
          console.warn('Correios pre-postagem backfill:', orderId, err.message);
        }
      }
      if (order.correiosPrePostagemId) {
        try {
          const useAggressive = forceAvSync || aggressiveBudget > 0;
          if (useAggressive && !forceAvSync) aggressiveBudget -= 1;
          await syncCorreiosTrackingCodeFromPrePostagem(token, order, env, { aggressive: useAggressive });
        } catch (err) {
          console.warn('Correios AV backfill:', orderId, err.message);
        }
      }
    }

    if (!order.correiosTrackingCode) {
      const payload = {};
      if (order.correiosFreteEstimado != null) payload.correiosFreteEstimado = order.correiosFreteEstimado;
      if (order.correiosPrePostagemId || order.correiosPrePostagemAt) payload.status = 'Pré-postado';
      if (Object.keys(payload).length) orders[orderId] = payload;
      continue;
    }
    const summary = await fetchCorreiosTrackingSummary(token, order.correiosTrackingCode);
    order.correiosTrackingStatus = summary.status;
    order.correiosTrackingLastEvent = summary.lastEvent;
    order.correiosTrackingEvents = summary.events;
    order.correiosTrackingUpdatedAt = new Date().toISOString();
    await saveOrder(env, order);
    orders[orderId] = {
      ...summary,
      trackingCode: order.correiosTrackingCode,
      correiosFreteEstimado: order.correiosFreteEstimado ?? null
    };
  }
  return json({ orders }, 200, origin);
}

async function handleListOrders(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) return json({ error: 'Não autorizado.' }, 401, origin);

  const format = new URL(request.url).searchParams.get('format') || 'json';
  const index = await readOrdersIndex(env);
  const indexForExport = index.length ? index : await rebuildOrdersIndexFromKv(env);

  if (format === 'csv') {
    const header = 'orderId,createdAt,status,nome,email,telefone,smartwatch,observacoes,modeloRelogio,pais,pagamento,total,frete,couponCode,couponCommissionerName,couponDiscount,couponCommissionPercent,couponCommissionAmount\n';
    const rows = indexForExport.map((o) =>
      [o.orderId, o.createdAt, o.status, o.nome, o.email, o.telefone, o.smartwatch, o.observacoes, o.modeloRelogio, o.pais, o.pagamento, o.total, o.frete, o.couponCode, o.couponCommissionerName, o.couponDiscount, o.couponCommissionPercent, o.couponCommissionAmount]
        .map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')
    ).join('\n');
    return new Response(header + rows, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=pedidos.csv', ...corsHeaders(origin) }
    });
  }

  return json(await listOrdersForAdmin(env), 200, origin);
}

export default {
  async fetch(request, env, ctx) {
    const origin = resolveRequestOrigin(request);
    const path = new URL(request.url).pathname.replace(/\/$/, '') || '/';

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });

    try {
      if (path === '/config' && request.method === 'GET') {
        return json(publicConfigView(await getPublicConfig(env)), 200, origin);
      }
      if (path === '/admin/config' && request.method === 'GET') return handleAdminGetConfig(request, env, origin);
      if (path === '/auth/register' && request.method === 'POST') return handleCustomerRegister(request, env, origin);
      if (path === '/auth/login' && request.method === 'POST') return handleCustomerLogin(request, env, origin);
      if (path === '/auth/logout' && request.method === 'POST') return handleCustomerLogout(request, env, origin);
      if (path === '/auth/session' && request.method === 'GET') return handleCustomerSession(request, env, origin);
      if (path === '/me/orders' && request.method === 'GET') return handleCustomerOrders(request, env, origin);
      if (path === '/me/profile' && request.method === 'PATCH') {
        return handleCustomerUpdateProfile(request, env, origin);
      }
      if (path === '/config' && request.method === 'PUT') return handlePutConfig(request, env, origin);
      if (path === '/admin/login' && request.method === 'POST') return handleLogin(request, env, origin);
      if (path === '/admin/session' && request.method === 'GET') return handleSession(request, env, origin);
      if (path === '/admin/test-email' && request.method === 'POST') return handleTestEmail(request, env, origin);
      if (path === '/admin/shipping-status' && request.method === 'GET') return handleAdminShippingStatus(request, env, origin);
      if (path === '/admin/correios-tracking' && request.method === 'POST') {
        return handleAdminCorreiosTracking(request, env, origin);
      }
      if (path === '/admin/integrations-status' && request.method === 'GET') {
        return handleAdminIntegrationsStatus(request, env, origin);
      }
      if (path === '/admin/customers' && request.method === 'GET') {
        return handleAdminCustomers(request, env, origin);
      }
      if (path === '/notify/click' && request.method === 'POST') {
        return handleLogClick(request, env, origin, ctx);
      }
      if (path === '/analytics/click' && request.method === 'POST') {
        return handleLogClick(request, env, origin, ctx);
      }
      if ((path === '/analytics/pixel' || path === '/analytics/pixel.gif') && request.method === 'GET') {
        return handleLogClickPixel(request, env, origin, ctx);
      }
      if (path === '/admin/clicks' && request.method === 'GET') {
        return handleAdminListClicks(request, env, origin);
      }
      if ((path === '/admin/clicks/clear' && request.method === 'POST') ||
        (path === '/admin/clicks' && request.method === 'DELETE')) {
        return handleAdminClearClicks(request, env, origin);
      }
      if (path === '/feedback' && request.method === 'POST') {
        return handleFeedback(request, env, origin);
      }
      if (path === '/admin/feedback' && request.method === 'GET') {
        return handleAdminListFeedback(request, env, origin);
      }
      if (path === '/admin/feedback' && request.method === 'DELETE') {
        return handleAdminClearFeedback(request, env, origin);
      }
      if (path === '/shipping/quote' && request.method === 'GET') {
        return handleShippingQuote(request, env, origin, ctx);
      }
      const cepMatch = path.match(/^\/cep\/(\d{8})$/);
      if (cepMatch && request.method === 'GET') {
        return handleGetCep(request, env, origin, cepMatch[1]);
      }
      if (path === '/coupons/validate' && request.method === 'POST') {
        return handleValidateCoupon(request, env, origin);
      }
      if (path === '/orders' && request.method === 'POST') return handleCreateOrder(request, env, origin, ctx);
      if (path === '/orders' && request.method === 'GET') return handleListOrders(request, env, origin);
      if (path === '/webhook/asaas' && request.method === 'POST') return handleAsaasWebhook(request, env, origin);
      if (path === '/webhook/mercadopago' && (request.method === 'POST' || request.method === 'GET')) {
        return handleMercadoPagoWebhook(request, env, origin);
      }
      if (path === '/webhook/paypal' && request.method === 'POST') {
        return handlePayPalWebhook(request, env, origin);
      }

      const paypalCaptureMatch = path.match(/^\/orders\/([^/]+)\/paypal\/capture$/);
      if (paypalCaptureMatch && request.method === 'POST') {
        return handlePayPalCapture(request, env, origin, paypalCaptureMatch[1]);
      }

      if (path === '/orders/pending' && request.method === 'DELETE') {
        return handleDeletePendingOrders(request, env, origin);
      }

      const confirmMatch = path.match(/^\/orders\/([^/]+)\/confirm$/);
      if (confirmMatch && request.method === 'POST') {
        return handleConfirmOrder(request, env, origin, confirmMatch[1]);
      }
      const labelMatch = path.match(/^\/orders\/([^/]+)\/shipping-label$/);
      if (labelMatch && request.method === 'POST') {
        return handleOrderShippingLabel(request, env, origin, labelMatch[1]);
      }
      const correiosAvMatch = path.match(/^\/orders\/([^/]+)\/correios-av$/);
      if (correiosAvMatch && request.method === 'PATCH') {
        return handleOrderCorreiosAv(request, env, origin, correiosAvMatch[1]);
      }
      const selfTestConfirmMatch = path.match(/^\/orders\/([^/]+)\/confirm-test$/);
      if (selfTestConfirmMatch && request.method === 'POST') {
        return handleConfirmSelfTestOrder(request, env, origin, selfTestConfirmMatch[1]);
      }

      const m = path.match(/^\/orders\/([^/]+)$/);
      if (m && request.method === 'GET') return handleGetOrder(request, env, origin, m[1]);
      if (m && request.method === 'DELETE') return handleDeleteOrder(request, env, origin, m[1]);
      return json({ error: 'Rota não encontrada.' }, 404, origin);
    } catch (err) {
      return json({ error: err.message }, 500, origin);
    }
  }
};
