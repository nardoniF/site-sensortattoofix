/**
 * API Sensor TattooFix — Cloudflare Worker
 * PIX (Mercado Pago) + Cartão (Asaas) + PayPal (intl) · WhatsApp · Correios · Uber Direct · Pedidos
 */

const ALLOWED_ORIGINS = [
  'https://sensortattoofix.com.br',
  'https://www.sensortattoofix.com.br',
  'http://localhost:8080',
  'http://127.0.0.1:5500'
];
const CONFIG_KEY = 'store-config';
const ORDERS_INDEX = 'orders:index';
const CUSTOMER_SESSION_TTL = 2592000; // 30 dias

const DEFAULT_CONFIG = {
  product: {
    name: 'Kit Sensor TattooFix',
    description: 'Lente ótica para smartwatch em pele tatuada — kit completo',
    price: 59.9,
    image: 'https://www.sensortattoofix.com.br/site/sensortattoofix.jpg'
  },
  products: [
    {
      id: 'kit-sensor-tattoofix',
      slug: 'kit-sensor-tattoofix',
      name: 'Kit Sensor TattooFix',
      description: 'Lente ótica para smartwatch em pele tatuada — kit completo',
      price: 59.9,
      image: 'https://www.sensortattoofix.com.br/site/sensortattoofix.jpg',
      active: true,
      requiresSmartwatch: true,
      weightGrams: 3
    }
  ],
  pix: { key: '29321223000132', keyType: 'cnpj', merchantName: '3N20 SOLUCOES TEC', merchantCity: 'SAO PAULO' },
  shipping: {
    originCep: '02537190',
    weightGrams: 3,
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
  internationalProduct: {
    title: 'Envio internacional',
    hint: '',
    encomendaNotice: 'Nesse tipo de frete é enviado o kit completo.',
    documentNotice: 'Lente de melhor fixação, sem potencializador (este frete não permite líquidos).\n\nKit completo: escolha outra opção de envio.'
  },
  payments: {
    paypal: {
      internationalEnabled: true
    }
  },
  smartwatchModels: [
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
    'Amazfit GTR / GTS',
    'Amazfit T-Rex',
    'Fitbit Versa / Sense',
    'Polar Pacer / Ignite',
    'Outro modelo (informar nas observações)'
  ],
  formsubmit: { email: 'sensortattoofix@gmail.com', subject: 'Novo pedido — Loja Oficial Sensor TattooFix' },
  whatsapp: '5511913394665',
  siteUrl: 'https://www.sensortattoofix.com.br',
  api: { baseUrl: 'https://sensortattoofix-payments.sensortattoofix.workers.dev' }
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
    Smartwatch: order.smartwatch,
    'Valor frete': formatBRL(order.frete),
    Distância: order.motoboyDistanceKm ? `~${order.motoboyDistanceKm} km` : '—',
    Prazo: `até ${cfg.deliveryHours}h`,
    'Painel pedidos': adminUrl,
    ...orderWatchEmailFields(order)
  };

  const subject = `Entrega motoboy — ${order.orderId}`;
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

function withConfigDefaults(stored) {
  const base = structuredClone(DEFAULT_CONFIG);
  if (!stored || typeof stored !== 'object') return base;

  return {
    ...base,
    ...stored,
    product: { ...base.product, ...(stored.product || {}) },
    pix: resolvePixConfig({ ...base.pix, ...(stored.pix || {}) }, base.pix),
    shipping: {
      ...base.shipping,
      ...(stored.shipping || {}),
      sender: { ...base.shipping.sender, ...(stored.shipping?.sender || {}) }
    },
    formsubmit: { ...base.formsubmit, ...(stored.formsubmit || {}) },
    api: { ...base.api, ...(stored.api || {}) },
    internationalShipping: { ...base.internationalShipping, ...(stored.internationalShipping || {}) },
    internationalProduct: { ...base.internationalProduct, ...(stored.internationalProduct || {}) },
    payments: {
      ...base.payments,
      ...(stored.payments || {}),
      paypal: mergePaypalConfig(base.payments?.paypal, stored.payments?.paypal)
    },
    smartwatchModels: (stored.smartwatchModels && stored.smartwatchModels.length)
      ? stored.smartwatchModels
      : base.smartwatchModels,
    products: normalizeProducts(stored, base),
    shippingMethods: mergeShippingMethods(stored.shippingMethods),
    motoboyShipping: {
      ...DEFAULT_MOTOBOY_SHIPPING,
      ...(stored.motoboyShipping || {}),
      couriers: Array.isArray(stored.motoboyShipping?.couriers)
        ? stored.motoboyShipping.couriers
        : DEFAULT_MOTOBOY_SHIPPING.couriers
    }
  };
}

function normalizeProducts(stored, base) {
  if (stored?.products?.length) return stored.products;
  const legacy = stored?.product || base.product;
  if (!legacy) return base.products || [];
  return [{
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

function shippingWeightGrams(config, override) {
  const ship = config?.shipping || DEFAULT_CONFIG.shipping;
  const n = Number(override ?? ship.weightGrams);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

function getActiveProducts(config) {
  const list = config.products?.length ? config.products : normalizeProducts({}, { product: config.product });
  return list.filter((p) => p.active !== false);
}

function resolveOrderItems(config, body) {
  const products = getActiveProducts(config);
  if (!products.length) throw new Error('Nenhum produto disponível na loja.');

  if (Array.isArray(body.items) && body.items.length) {
    return body.items.map((item) => {
      const p = products.find((x) => x.id === item.productId || x.slug === item.productId);
      if (!p) throw new Error('Produto não encontrado.');
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
  }

  const pick = body.productId || body.productSlug || products[0].id;
  const p = products.find((x) => x.id === pick || x.slug === pick) || products[0];
  return [{
    productId: p.id,
    slug: p.slug,
    name: p.name,
    price: Number(p.price) || 0,
    qty: Math.max(1, Math.min(10, Number(body.qty) || 1)),
    requiresSmartwatch: p.requiresSmartwatch !== false,
    weightGrams: Number(p.weightGrams) || shippingWeightGrams(config)
  }];
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

function isInternationalPayPalAvailable(config) {
  const paypal = config.payments?.paypal || {};
  if (paypal.internationalEnabled === false) return false;
  const showAfterRaw = paypal.showAfter;
  if (!showAfterRaw) return true;
  const showAfter = Date.parse(showAfterRaw);
  if (Number.isFinite(showAfter) && Date.now() < showAfter) return false;
  return true;
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
    internationalProduct: config.internationalProduct || DEFAULT_CONFIG.internationalProduct,
    payments: {
      paypal: {
        internationalEnabled: paypal.internationalEnabled !== false,
        showAfter: paypal.showAfter || null
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
  const allowed = ALLOWED_ORIGINS.includes(origin);
  const headers = {
    'Access-Control-Allow-Methods': 'GET, PUT, PATCH, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, asaas-access-token',
    'Access-Control-Max-Age': '86400'
  };
  if (allowed) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
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
    produto: order.produto || null,
    smartwatch: order.smartwatch || null,
    observacoes: trimObs(order) || null,
    modeloRelogio: formatOrderSmartwatch(order),
    pagamento: order.pagamento,
    paidAt: order.paidAt || null,
    createdAt: order.createdAt || null
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
  const fields = { 'Modelo do relógio': formatOrderSmartwatch(order) };
  if (model && model !== 'N/A') fields.Smartwatch = model;
  if (obs) fields.Observações = obs;
  return fields;
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
  const resumeUrl = resumeOrderUrl(config, order);
  const total = formatBRL(order.total);
  const copyPaste = order.pixCopyPaste || '';
  const qrImg = hasQrImage
    ? `<img src="cid:${PIX_QR_CID}" width="220" height="220" alt="QR Code PIX" style="display:block;margin:16px auto;border:1px solid #eee;border-radius:8px" />`
    : '';
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#222">
    <p>Olá, <strong>${escapeHtml(order.nome)}</strong>!</p>
    <p>Seu pedido <strong>${escapeHtml(order.orderId)}</strong> foi registrado. Para concluir a compra, pague o PIX abaixo:</p>
    <p style="font-size:18px"><strong>Total: ${escapeHtml(total)}</strong></p>
    ${qrImg}
    <p style="font-size:13px;color:#555">Escaneie o QR Code no app do seu banco ou copie o código PIX:</p>
    <p style="word-break:break-all;font-family:monospace;font-size:11px;background:#f5f5f5;padding:12px;border-radius:8px;border:1px solid #ddd">${escapeHtml(copyPaste)}</p>
    <p style="margin-top:20px"><a href="${escapeHtml(resumeUrl)}" style="display:inline-block;background:#ffc107;color:#000;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px">Abrir pedido e pagar</a></p>
    <p style="font-size:12px;color:#666">Guarde este e-mail — se fechar a página, use o link acima para voltar ao QR Code.</p>
    <p style="font-size:12px;color:#666;margin-top:16px">Modelo do relógio: ${escapeHtml(formatOrderSmartwatch(order))}${trimObs(order) && !String(order.smartwatch || '').includes('Outro modelo') ? `<br>Observações: ${escapeHtml(trimObs(order))}` : ''}<br>Sensor Tattoo Fix — sensortattoofix.com.br</p>
  </div>`;
  const text = [
    `Olá, ${order.nome}!`,
    `Pedido ${order.orderId} — Total: ${total}`,
    '',
    'Código PIX (copia e cola):',
    copyPaste,
    '',
    `Abrir pedido: ${resumeUrl}`,
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

async function saveOrder(env, order) {
  await env.STORE_KV.put('order:' + order.orderId, JSON.stringify(order));
  const index = JSON.parse((await env.STORE_KV.get(ORDERS_INDEX)) || '[]');
  const filtered = index.filter((o) => o.orderId !== order.orderId);
  filtered.unshift({
    orderId: order.orderId,
    createdAt: order.createdAt,
    status: order.status,
    total: order.total,
    nome: order.nome,
    email: order.email,
    telefone: order.telefone,
    frete: order.frete,
    smartwatch: order.smartwatch,
    observacoes: trimObs(order) || null,
    modeloRelogio: formatOrderSmartwatch(order),
    pais: order.pais,
    pagamento: order.pagamento,
    userId: order.userId || null
  });
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

  const index = JSON.parse((await env.STORE_KV.get(ORDERS_INDEX)) || '[]');
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
    order_customer: `✅ *Sensor TattooFix*\n\nOlá ${order.nome}!\n\nPedido: *${order.orderId}*\n${watchWhatsAppBlock(order)}\nTotal: ${formatBRL(order.total)}\nPagamento: ${order.pagamento}\n\n${pixCustomerHint(order, shopPhone)}\n\nObrigado!`,
    order_shop: `🛒 *NOVO PEDIDO*\n\n${order.orderId}\n${order.nome}\n📱 ${order.telefone}\n${watchWhatsAppBlock(order)}\n🌍 ${order.pais}\n💰 ${formatBRL(order.total)}\n📦 ${order.shippingService}\n📍 ${order.endereco}`,
    paid_customer: isUberOrder(order)
      ? `✅ *Pagamento confirmado!*\n\nPedido *${order.orderId}* pago.\n\n🚗 Entrega Uber solicitada. Você receberá o link de rastreio por e-mail em instantes.\n\nSensor TattooFix`
      : `✅ *Pagamento confirmado!*\n\nPedido *${order.orderId}* pago com sucesso.\n\nSeu kit será postado em até 2 dias úteis. Você receberá o rastreio por e-mail.\n\nSensor TattooFix`,
    paid_shop: isUberOrder(order)
      ? `💰 *PAGAMENTO CONFIRMADO*\n\n${order.orderId}\nCliente: ${order.nome}\nValor: ${formatBRL(order.total)}\n${watchWhatsAppBlock(order)}\n\n🚗 Uber Direct — ${order.shippingService}\n📍 ${order.endereco}${order.uberTrackingUrl ? `\n🔗 ${order.uberTrackingUrl}` : ''}`
      : `💰 *PAGAMENTO CONFIRMADO*\n\n${order.orderId}\nCliente: ${order.nome}\nValor: ${formatBRL(order.total)}\n${watchWhatsAppBlock(order)}\n\n📮 Postar via ${order.shippingService}\n📍 ${order.endereco}`
  };

  const customerMsg = msgs[type + '_customer'];
  const shopMsg = msgs[type + '_shop'];

  if (customerMsg && order.telefone) await sendWhatsApp(env, order.telefone, customerMsg);
  if (shopMsg && shopPhone) await sendWhatsApp(env, shopPhone, shopMsg);
}

async function getCorreiosToken(env) {
  const cached = await env.STORE_KV.get('correios:token');
  if (cached) {
    const data = JSON.parse(cached);
    if (data.expiresAt > Date.now()) return data.token;
  }
  const user = env.CORREIOS_USER;
  const password = env.CORREIOS_PASSWORD;
  if (!user || !password) return null;

  const basic = btoa(user + ':' + password);
  const contract = env.CORREIOS_CONTRACT;
  const res = await fetch(
    contract ? 'https://api.correios.com.br/token/v1/autentica/cartaopostagem' : 'https://api.correios.com.br/token/v1/autentica',
    {
      method: 'POST',
      headers: { Authorization: 'Basic ' + basic, 'Content-Type': 'application/json' },
      body: contract ? JSON.stringify({ numero: contract }) : undefined
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  await env.STORE_KV.put('correios:token', JSON.stringify({
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
    : [{ name: config.product?.name || 'Kit Sensor Tattoo Fix', qty: 1, price: order.valorProduto || config.product?.price || 59.9 }];
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
    const dropoff = {
      cep: '01310100',
      rua: 'Avenida Paulista',
      numero: '1000',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      uf: 'SP'
    };
    const quote = await requestUberQuote(env, config, dropoff);
    if (!quote) {
      return {
        configured: true,
        authOk: true,
        quoteOk: false,
        sandbox,
        error: 'OAuth OK, mas cotação vazia. Confira Customer ID (aba Developer, não o ID da URL).'
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
  order.valorProdutoOriginal = order.valorProduto;
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
  order.valorProdutoOriginal = order.valorProduto;
  order.freteOriginal = order.frete;
  order.totalOriginal = order.total;
  order.selfTestPayPal = true;
  order.frete = 0;
  order.valorProduto = SELF_TEST_PIX_AMOUNT;
  order.total = SELF_TEST_PIX_AMOUNT;
  return true;
}

async function quoteCorreiosService(env, config, destCep, method, opts = {}) {
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const origin = onlyDigits(ship.originCep);
  const dest = onlyDigits(destCep);
  if (dest.length !== 8) return null;
  const weightGrams = shippingWeightGrams(config, opts.weightGrams);
  const declaredValue = Number(opts.declaredValue) || config.product?.price || 59.9;
  const serviceCode = String(method.correiosCode || ship.serviceCode || '').trim();
  if (!serviceCode) return null;

  const token = await getCorreiosToken(env);
  if (!token) return null;

  const params = new URLSearchParams({
    cepDestino: dest,
    cepOrigem: origin,
    psObjeto: String(weightGrams),
    tpObjeto: '2',
    comprimento: String(ship.lengthCm || 16),
    largura: String(ship.widthCm || 12),
    altura: String(ship.heightCm || 0.5),
    vlDeclarado: String(declaredValue.toFixed(2))
  });
  const res = await fetch(`https://api.correios.com.br/preco/v1/nacional/${serviceCode}?${params}`, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
  });
  if (!res.ok) {
    console.warn('Correios preço nacional:', serviceCode, res.status, await res.text().catch(() => ''));
    return null;
  }
  const data = await res.json();
  const price = parseFloat(String(data.pcFinal || data.vlTotal || '0').replace(',', '.'));
  if (price <= 0) return null;

  return {
    id: method.id || serviceCode,
    methodId: method.id || serviceCode,
    serviceCode,
    service: method.label || data.nmServico || ship.serviceName || 'Correios',
    price,
    days: Number(data.prazoEntrega || data.prazo || 12),
    source: 'correios',
    weightGrams
  };
}

async function quoteCorreiosOptions(env, config, destCep, opts = {}) {
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const origin = onlyDigits(ship.originCep);
  const dest = onlyDigits(destCep);
  if (dest.length !== 8) throw new Error('CEP inválido');

  const methods = getEnabledShippingMethods(config, 'BR').filter((m) => !isUberMethod(m));
  const weightGrams = shippingWeightGrams(config, opts.weightGrams);
  const token = await getCorreiosToken(env);
  const options = [];

  if (token && methods.length) {
    const quotes = await Promise.all(
      methods.map((method) => quoteCorreiosService(env, config, dest, method, opts))
    );
    quotes.filter(Boolean).forEach((q) => options.push(q));
  }

  if (!options.length) {
    const est = estimateBR(origin, dest);
    const baseWeight = shippingWeightGrams(config);
    const weightFactor = Math.min(2.5, Math.max(1, weightGrams / baseWeight));
    const price = Math.round(est.price * weightFactor * 100) / 100;
    const fallbackMethod = methods[0] || { id: 'estimate', label: ship.serviceName || 'Mini Envios' };
    options.push({
      id: fallbackMethod.id || 'estimate',
      methodId: fallbackMethod.id || 'estimate',
      serviceCode: fallbackMethod.correiosCode || ship.serviceCode || null,
      service: fallbackMethod.label || ship.serviceName || 'Mini Envios',
      price,
      days: est.days,
      source: 'estimate',
      weightGrams,
      note: token
        ? 'API Correios sem preço válido para estes serviços.'
        : 'Configure CORREIOS_USER e CORREIOS_PASSWORD no Worker para cotações reais.'
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

function buildIntegrationRows(env, config, checks) {
  const { paypal, mercadoPago, asaas, resend, zapi, correiosToken, exportOptions, uber } = checks;
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
    if (paypal.clientIdSuffix) detail += ` · …${paypal.clientIdSuffix}`;
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
      id: 'correios-br',
      label: 'Correios BR',
      description: 'Cotação de frete nacional (Mini Envios)',
      status: 'warn',
      detail: 'Sem credenciais — usa estimativa fixa'
    });
  } else if (!correiosToken) {
    rows.push({
      id: 'correios-br',
      label: 'Correios BR',
      description: 'Cotação de frete nacional (Mini Envios)',
      status: 'error',
      detail: 'Credenciais configuradas, mas token não obtido'
    });
  } else {
    rows.push({
      id: 'correios-br',
      label: 'Correios BR',
      description: 'Cotação de frete nacional (Mini Envios)',
      status: 'ok',
      detail: 'API conectada'
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
    rows.push({
      id: 'uber-direct',
      label: 'Uber Direct',
      description: 'Entrega rápida sob demanda (BR)',
      status: 'error',
      detail: uber.error || 'Cotação de teste falhou'
    });
  } else {
    const priceHint = uber.samplePrice ? ` · teste Av. Paulista ~R$ ${Number(uber.samplePrice).toFixed(2)}` : '';
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

function emailFrom(env, config) {
  return env.EMAIL_FROM || config.emailFrom || 'Sensor Tattoo Fix <pedidos@sensortattoofix.com.br>';
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
    `PIX do pedido ${order.orderId} — Sensor Tattoo Fix`,
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
        source: 'config',
        country,
        countryLabel: fallback.countryLabel,
        weightGrams
      }];
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
  const config = await getConfig(env);
  let frete = Number(body.frete) || 0;
  let items;
  try {
    items = resolveOrderItems(config, body);
  } catch (err) {
    return json({ error: err.message }, 400, origin);
  }
  const valorProduto = items.reduce((sum, i) => sum + i.price * i.qty, 0);
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
      return json({ error: 'PayPal disponível apenas para envio internacional.' }, 400, origin);
    }
    billingType = body.pagamento === 'CARTAO' ? 'CREDIT_CARD' : 'PIX';
    pagamentoLabel = billingType === 'CREDIT_CARD' ? 'Cartão de crédito' : 'PIX';
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
    valorProduto,
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
      if (hasMp) {
        try {
          payment = await createMercadoPagoPixPayment(env, order, config);
        } catch (mpErr) {
          console.error('MP PIX:', mpErr.message);
          if (hasAsaas) {
            payment = await createAsaasPayment(env, order, config, 'PIX');
          } else {
            throw mpErr;
          }
        }
      } else if (hasAsaas) {
        payment = await createAsaasPayment(env, order, config, 'PIX');
      }
    } else {
      if (!hasAsaas) {
        return json({ error: 'Cartão indisponível. Configure ASAAS_API_KEY.' }, 400, origin);
      }
      payment = await createAsaasPayment(env, order, config, 'CREDIT_CARD');
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
    return json({ error: 'Cartão indisponível. Configure ASAAS_API_KEY.' }, 400, origin);
  } else if (hasAsaas && !hasMp) {
    return json({ error: 'Não foi possível criar cobrança no Asaas. Verifique chave PIX cadastrada no painel.' }, 400, origin);
  } else if (billingType === 'PIX') {
    order.paymentProvider = 'static_pix';
    order.autoConfirm = false;
    attachPaymentToOrder(order, { provider: 'static_pix', billingType: 'PIX', autoConfirm: false }, config);
  }

  await saveOrder(env, order);

  const customerEmail = billingType === 'PIX'
    ? notifyCustomerPendingPix(env, config, order)
    : notifyCustomer(env, config, order, `Pedido ${order.orderId} registrado — Sensor Tattoo Fix`, {
      Pedido: order.orderId,
      Status: 'Aguardando pagamento',
      Total: formatBRL(order.total),
      Pagamento: order.pagamento,
      Mensagem: billingType === 'PAYPAL'
        ? 'Finalize o pagamento no PayPal. Você receberá outro e-mail quando o pagamento for confirmado.'
        : billingType === 'MP_CHECKOUT'
          ? 'Finalize o pagamento com cartão no Mercado Pago (Visa/Mastercard). Seu banco pode converter de USD/EUR para reais.'
          : 'Finalize o pagamento no link enviado. Você receberá outro e-mail quando o pagamento for confirmado.',
      ...(billingType === 'PAYPAL' && order.paypalApproveUrl ? { 'Link PayPal': order.paypalApproveUrl } : {}),
      ...(billingType === 'MP_CHECKOUT' && order.invoiceUrl ? { 'Link pagamento': order.invoiceUrl } : {}),
      'Link do pedido': resumeOrderUrl(config, order),
      ...orderWatchEmailFields(order),
      ...orderIntlProductFields(order)
    });

  const emailWork = Promise.all([
    notifyShop(env, config, config.formsubmit.subject, {
      Pedido: order.orderId, Status: order.status, Nome: order.nome,
      'E-mail': order.email, Telefone: order.telefone,
      País: order.pais, Endereço: order.endereco, Pagamento: order.pagamento,
      Produto: formatBRL(order.valorProduto), Frete: formatBRL(order.frete), Total: formatBRL(order.total),
      Envio: order.shippingService || '—',
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

  if (isUberOrder(order)) {
    try {
      const uber = await createUberDeliveryForOrder(env, config, order);
      Object.assign(order, uber);
      await saveOrder(env, order);
    } catch (err) {
      console.error('Uber dispatch:', order.orderId, err.message);
      order.uberDispatchError = err.message;
      await saveOrder(env, order);
    }
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
  }

  const shopPaidFields = {
    Pedido: order.orderId, Status: 'PAGO', Cliente: order.nome,
    'E-mail cliente': order.email, Telefone: order.telefone,
    Pagamento: order.pagamento || payment?.billingType || '—',
    Valor: formatBRL(value),
    Endereço: order.endereco, Envio: order.shippingService,
    ...orderWatchEmailFields(order),
    ...orderIntlProductFields(order)
  };
  if (isUberOrder(order)) {
    shopPaidFields['Uber Direct'] = order.uberDeliveryId || 'solicitado';
    if (order.uberTrackingUrl) shopPaidFields['Rastreio Uber'] = order.uberTrackingUrl;
    if (order.uberDispatchError) shopPaidFields['Erro Uber'] = order.uberDispatchError;
  } else if (isMotoboyOrder(order)) {
    shopPaidFields['Envio particular'] = 'Motoboy';
    if (order.motoboyDistanceKm) shopPaidFields['Distância'] = `~${order.motoboyDistanceKm} km`;
    if (order.motoboyCourierEmails?.length) {
      shopPaidFields['Motoboys avisados'] = order.motoboyCourierEmails.join(', ');
    }
    if (order.motoboyNotifyError) shopPaidFields['Erro e-mail motoboy'] = order.motoboyNotifyError;
  } else {
    shopPaidFields['Imprimir etiqueta'] = labelPrintUrl(config, order.orderId);
  }

  const shopPaid = await notifyShop(env, config, 'PAGO — ' + order.orderId, shopPaidFields);
  if (!shopPaid?.ok) console.error('E-mail PAGO loja falhou:', JSON.stringify(shopPaid));

  let paidCustomerMessage;
  if (isUberOrder(order)) {
    paidCustomerMessage = order.uberTrackingUrl
      ? `Entrega Uber confirmada. Acompanhe em: ${order.uberTrackingUrl}`
      : 'Entrega Uber solicitada. Você receberá o link de rastreio por e-mail em breve.';
  } else if (isMotoboyOrder(order)) {
    const hours = getMotoboyConfig(config).deliveryHours;
    paidCustomerMessage = `Seu pedido será entregue por motoboy em até ${hours} horas. O entregador entrará em contato se necessário.`;
  } else if (order.internationalLensOnly) {
    paidCustomerMessage = 'Sua lente internacional será postada em até 2 dias úteis. Você receberá o rastreio por e-mail.';
  } else if (order.paisCode && order.paisCode !== 'BR') {
    paidCustomerMessage = 'Seu kit Prime será postado em até 2 dias úteis. Você receberá o rastreio por e-mail.';
  } else {
    paidCustomerMessage = 'Seu kit será postado em até 2 dias úteis. Você receberá o rastreio por e-mail.';
  }

  await notifyCustomer(env, config, order, `Pagamento confirmado — ${order.orderId}`, {
    Pedido: order.orderId,
    Status: 'PAGO',
    Valor: formatBRL(value),
    Mensagem: paidCustomerMessage,
    ...(order.uberTrackingUrl ? { 'Rastreio Uber': order.uberTrackingUrl } : {}),
    ...orderWatchEmailFields(order),
    ...orderIntlProductFields(order)
  });

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

  const [paypal, mercadoPago, asaas, resend, zapi, correiosToken, exportOptions, uber] = await Promise.all([
    checkPayPalIntegration(env),
    checkMercadoPagoIntegration(env),
    checkAsaasIntegration(env),
    checkResendIntegration(env),
    checkZApiIntegration(env),
    hasCorreiosCreds ? getCorreiosToken(env) : Promise.resolve(null),
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

async function handleTestEmail(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const config = await getConfig(env);
  const body = await request.json().catch(() => ({}));
  const to = (body.email || config.formsubmit?.email || '').trim();
  if (!to) return json({ error: 'E-mail de destino não configurado.' }, 400, origin);

  const type = body.type || 'generic';
  let result;

  if (type === 'paid') {
    const orderId = 'STF-TESTE-' + new Date().toISOString().slice(0, 10).replace(/-/g, '');
    result = await notifyShop(env, config, 'PAGO — ' + orderId, {
      Pedido: orderId,
      Status: 'PAGO (TESTE — não é pedido real)',
      Cliente: 'Cliente Teste',
      'E-mail cliente': 'cliente@exemplo.com',
      Telefone: '(11) 99999-9999',
      Pagamento: 'Cartão de crédito',
      Smartwatch: 'Apple Watch Series 9 (41mm)',
      Valor: formatBRL(config.product?.price || 59.9),
      Endereço: 'Av Paulista, 1000 — Bela Vista, São Paulo/SP — Brasil 01310100',
      Envio: 'Mini Envios'
    });
  } else if (type === 'order') {
    result = await notifyShop(env, config, config.formsubmit?.subject || 'Novo pedido — teste', {
      Pedido: 'STF-TESTE-' + Date.now(),
      Status: 'pending_payment (TESTE)',
      Nome: 'Cliente Teste',
      'E-mail': 'cliente@exemplo.com',
      Telefone: '(11) 99999-9999',
      Smartwatch: 'Apple Watch Series 9 (41mm)',
      País: 'Brasil',
      Pagamento: 'PIX',
      Total: formatBRL((config.product?.price || 59.9) + 11.9)
    });
  } else {
    result = await notifyEmail(env, config, to, 'Teste — Sensor Tattoo Fix', {
      Teste: 'Envio de e-mail da loja',
      Horário: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      Remetente: emailFrom(env, config)
    }, config.formsubmit?.email);
  }

  return json({ ...result, type }, result?.ok ? 200 : 502, origin);
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
    internationalProduct: { ...current.internationalProduct, ...body.internationalProduct },
    payments: {
      ...current.payments,
      ...body.payments,
      paypal: { ...current.payments?.paypal, ...body.payments?.paypal }
    },
    shippingMethods: body.shippingMethods?.length ? body.shippingMethods : current.shippingMethods,
    smartwatchModels: body.smartwatchModels || current.smartwatchModels,
    products: body.products?.length ? body.products : current.products,
    formsubmit: { ...current.formsubmit, ...body.formsubmit },
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
  await deleteOrder(env, orderId);
  return json({ ok: true, orderId }, 200, origin);
}

async function handleDeletePendingOrders(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }

  const index = JSON.parse((await env.STORE_KV.get(ORDERS_INDEX)) || '[]');
  const pendingIds = index.filter((o) => o.status !== 'paid').map((o) => o.orderId);
  let deleted = 0;
  for (const orderId of pendingIds) {
    if (await deleteOrder(env, orderId)) deleted++;
  }
  return json({ ok: true, deleted }, 200, origin);
}

async function handleListOrders(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) return json({ error: 'Não autorizado.' }, 401, origin);

  const format = new URL(request.url).searchParams.get('format') || 'json';
  const index = JSON.parse((await env.STORE_KV.get(ORDERS_INDEX)) || '[]');

  if (format === 'csv') {
    const header = 'orderId,createdAt,status,nome,email,telefone,smartwatch,observacoes,modeloRelogio,pais,pagamento,total,frete\n';
    const rows = index.map((o) =>
      [o.orderId, o.createdAt, o.status, o.nome, o.email, o.telefone, o.smartwatch, o.observacoes, o.modeloRelogio, o.pais, o.pagamento, o.total, o.frete]
        .map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')
    ).join('\n');
    return new Response(header + rows, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=pedidos.csv', ...corsHeaders(origin) }
    });
  }

  const orders = [];
  for (const item of index.slice(0, 500)) {
    const full = await getOrder(env, item.orderId);
    if (full) orders.push(full);
  }
  return json(orders, 200, origin);
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || ALLOWED_ORIGINS[0];
    const path = new URL(request.url).pathname.replace(/\/$/, '') || '/';

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });

    try {
      if (path === '/config' && request.method === 'GET') return json(publicConfigView(await getConfig(env)), 200, origin);
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
      if (path === '/admin/integrations-status' && request.method === 'GET') {
        return handleAdminIntegrationsStatus(request, env, origin);
      }
      if (path === '/admin/customers' && request.method === 'GET') {
        return handleAdminCustomers(request, env, origin);
      }
      if (path === '/shipping/quote' && request.method === 'GET') {
        return handleShippingQuote(request, env, origin, ctx);
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

      const m = path.match(/^\/orders\/([^/]+)$/);
      if (m && request.method === 'GET') return handleGetOrder(request, env, origin, m[1]);
      if (m && request.method === 'DELETE') return handleDeleteOrder(request, env, origin, m[1]);
      return json({ error: 'Rota não encontrada.' }, 404, origin);
    } catch (err) {
      return json({ error: err.message }, 500, origin);
    }
  }
};
