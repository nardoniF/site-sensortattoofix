/**
 * API Sensor TattooFix — Cloudflare Worker
 * PIX (Mercado Pago) + Cartão (Asaas) · WhatsApp · Correios · Internacional · Pedidos
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
    image: 'https://www.sensortattoofix.com.br/sensortattoofix.jpg'
  },
  products: [
    {
      id: 'kit-sensor-tattoofix',
      slug: 'kit-sensor-tattoofix',
      name: 'Kit Sensor TattooFix',
      description: 'Lente ótica para smartwatch em pele tatuada — kit completo',
      price: 59.9,
      image: 'https://www.sensortattoofix.com.br/sensortattoofix.jpg',
      active: true,
      requiresSmartwatch: true,
      weightGrams: 120
    }
  ],
  pix: { key: '29321223000132', keyType: 'cnpj', merchantName: '3N20 SOLUCOES TEC', merchantCity: 'SAO PAULO' },
  shipping: { originCep: '01153000', weightGrams: 120, lengthCm: 16, widthCm: 12, heightCm: 3, serviceCode: '04227', serviceName: 'Mini Envios' },
  internationalShipping: {
    US: { label: 'Estados Unidos', price: 89.9, days: 15, currency: 'BRL' },
    PT: { label: 'Portugal', price: 79.9, days: 12, currency: 'BRL' },
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

function withConfigDefaults(stored) {
  const base = structuredClone(DEFAULT_CONFIG);
  if (!stored || typeof stored !== 'object') return base;

  return {
    ...base,
    ...stored,
    product: { ...base.product, ...(stored.product || {}) },
    pix: { ...base.pix, ...(stored.pix || {}) },
    shipping: { ...base.shipping, ...(stored.shipping || {}) },
    formsubmit: { ...base.formsubmit, ...(stored.formsubmit || {}) },
    api: { ...base.api, ...(stored.api || {}) },
    internationalShipping: { ...base.internationalShipping, ...(stored.internationalShipping || {}) },
    smartwatchModels: (stored.smartwatchModels && stored.smartwatchModels.length)
      ? stored.smartwatchModels
      : base.smartwatchModels,
    products: normalizeProducts(stored, base)
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
    weightGrams: 120
  }];
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
        weightGrams: Number(p.weightGrams) || 120
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
    weightGrams: Number(p.weightGrams) || 120
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
    cpf: user.cpf || ''
  };
}

function publicConfigView(config) {
  const products = getActiveProducts(config).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    price: p.price,
    image: p.image,
    requiresSmartwatch: p.requiresSmartwatch !== false,
    weightGrams: Number(p.weightGrams) || 120
  }));
  const primary = products[0] || config.product;
  return {
    ...config,
    product: primary ? {
      name: primary.name,
      description: primary.description,
      price: primary.price,
      image: primary.image
    } : config.product,
    products
  };
}

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_SEC = 1800;

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin);
  const headers = {
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
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
  const pix = config.pix || {};
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

async function getLoginLock(env, ip) {
  const raw = await env.STORE_KV.get('login:' + ip);
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

async function recordLoginFailure(env, ip) {
  const key = 'login:' + ip;
  const current = (await getLoginLock(env, ip)) || { attempts: 0 };
  if (current.lockedUntil && Date.now() < current.lockedUntil) return current;
  const attempts = (current.attempts || 0) + 1;
  const data = attempts >= LOGIN_MAX_ATTEMPTS
    ? { attempts: 0, lockedUntil: Date.now() + LOGIN_LOCKOUT_SEC * 1000 }
    : { attempts };
  await env.STORE_KV.put(key, JSON.stringify(data), { expirationTtl: LOGIN_LOCKOUT_SEC });
  return data;
}

async function clearLoginFailures(env, ip) {
  await env.STORE_KV.delete('login:' + ip);
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

/** PIX sandbox na API /v1/payments não aprova sozinho; só com token TEST- simula confirmação. */
async function maybeSandboxAutoConfirmMpPix(env, orderId, paymentId) {
  if (!isMpSandbox(env) || !paymentId) return;

  const token = mercadoPagoToken(env);
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 2500));
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

  const order = await getOrder(env, orderId);
  if (order && order.status !== 'paid') {
    console.log('MP sandbox: auto-confirma pedido de teste', orderId);
    await handlePaymentConfirmed(env, order, {
      provider: 'mercadopago',
      billingType: 'PIX',
      value: order.total,
      confirmedBy: 'mp_sandbox_test'
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
  const toSave = { ...config, updatedAt: new Date().toISOString() };
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
    paid_customer: `✅ *Pagamento confirmado!*\n\nPedido *${order.orderId}* pago com sucesso.\n\nSeu kit será postado em até 2 dias úteis. Você receberá o rastreio por e-mail.\n\nSensor TattooFix`,
    paid_shop: `💰 *PAGAMENTO CONFIRMADO*\n\n${order.orderId}\nCliente: ${order.nome}\nValor: ${formatBRL(order.total)}\n${watchWhatsAppBlock(order)}\n\n📮 Postar via ${order.shippingService}\n📍 ${order.endereco}`
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

function estimateBR(originCep, destCep) {
  const o = parseInt(onlyDigits(originCep).slice(0, 5), 10) || 0;
  const d = parseInt(onlyDigits(destCep).slice(0, 5), 10) || 0;
  const diff = Math.abs(o - d);
  if (diff < 800) return { price: 11.9, days: 8 };
  if (diff < 3000) return { price: 15.9, days: 10 };
  if (diff < 8000) return { price: 19.9, days: 12 };
  return { price: 24.9, days: 14 };
}

async function quoteCorreios(env, config, destCep, opts = {}) {
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const origin = onlyDigits(ship.originCep);
  const dest = onlyDigits(destCep);
  if (dest.length !== 8) throw new Error('CEP inválido');
  const weightGrams = Math.max(120, Number(opts.weightGrams) || ship.weightGrams || 120);
  const declaredValue = Number(opts.declaredValue) || config.product?.price || 59.9;

  const token = await getCorreiosToken(env);
  if (token && ship.serviceCode) {
    const params = new URLSearchParams({
      cepDestino: dest, cepOrigem: origin,
      psObjeto: String(weightGrams), tpObjeto: '2',
      comprimento: String(ship.lengthCm || 16), largura: String(ship.widthCm || 12),
      altura: String(ship.heightCm || 3), vlDeclarado: String(declaredValue.toFixed(2))
    });
    const res = await fetch(`https://api.correios.com.br/preco/v1/nacional/${ship.serviceCode}?${params}`, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      const price = parseFloat(String(data.pcFinal || data.vlTotal || '0').replace(',', '.'));
      if (price > 0) {
        return { price, days: Number(data.prazoEntrega || data.prazo || 12), service: ship.serviceName || 'Mini Envios', source: 'correios' };
      }
    }
  }
  const est = estimateBR(origin, dest);
  return { price: est.price, days: est.days, service: ship.serviceName || 'Mini Envios', source: 'estimate' };
}

function quoteInternational(config, countryCode) {
  const zones = config.internationalShipping || DEFAULT_CONFIG.internationalShipping;
  const zone = zones[countryCode] || zones.OTHER;
  if (!zone) throw new Error('País não atendido');
  return {
    price: zone.price,
    days: zone.days,
    service: 'Correios Internacional — ' + zone.label,
    source: 'international',
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
    headers: mpHeaders(env),
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || data.cause?.[0]?.description || data.error || `HTTP ${res.status}`;
    throw new Error(`Mercado Pago PIX: ${msg}`);
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

async function handleShippingQuote(request, env, origin) {
  const url = new URL(request.url);
  const country = (url.searchParams.get('country') || 'BR').toUpperCase();
  const config = await getConfig(env);

  if (country !== 'BR') {
    return json(quoteInternational(config, country), 200, origin);
  }
  const cep = url.searchParams.get('cep');
  const weightGrams = Number(url.searchParams.get('weightGrams')) || undefined;
  const declaredValue = Number(url.searchParams.get('valor')) || undefined;
  return json(await quoteCorreios(env, config, cep, { weightGrams, declaredValue }), 200, origin);
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
  const body = await request.json();
  const email = normalizeEmail(body.email);
  const senha = String(body.senha || '');
  const user = await getUserByEmail(env, email);
  if (!user || !(await verifyPassword(senha, user.passwordSalt, user.passwordHash))) {
    return json({ error: 'E-mail ou senha incorretos.' }, 401, origin);
  }
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
  const frete = Number(body.frete) || 0;
  let items;
  try {
    items = resolveOrderItems(config, body);
  } catch (err) {
    return json({ error: err.message }, 400, origin);
  }
  const valorProduto = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const billingType = body.pagamento === 'CARTAO' ? 'CREDIT_CARD' : 'PIX';
  const pagamentoLabel = billingType === 'CREDIT_CARD' ? 'Cartão de crédito' : 'PIX';
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
    shippingDays: body.shippingDays || null,
    pagamento: pagamentoLabel
  };

  let payment = null;
  const hasAsaas = !!asaasApiKey(env);
  const hasMp = !!mercadoPagoToken(env);

  try {
    if (billingType === 'PIX') {
      if (hasMp) {
        payment = await createMercadoPagoPixPayment(env, order, config);
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
    const msg = billingType === 'CREDIT_CARD'
      ? 'Cartão indisponível: ' + err.message
      : 'PIX indisponível: ' + err.message;
    if (billingType === 'CREDIT_CARD' || hasMp || hasAsaas) {
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
      Mensagem: 'Finalize o pagamento no link enviado. Você receberá outro e-mail quando o pagamento for confirmado.',
      'Link do pedido': resumeOrderUrl(config, order),
      ...orderWatchEmailFields(order)
    });

  const emailWork = Promise.all([
    notifyShop(env, config, config.formsubmit.subject, {
      Pedido: order.orderId, Status: order.status, Nome: order.nome,
      'E-mail': order.email, Telefone: order.telefone,
      País: order.pais, Endereço: order.endereco, Pagamento: order.pagamento,
      Produto: formatBRL(order.valorProduto), Frete: formatBRL(order.frete), Total: formatBRL(order.total),
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

  if (ctx && payment?.provider === 'mercadopago' && billingType === 'PIX' && isMpSandbox(env)) {
    ctx.waitUntil(maybeSandboxAutoConfirmMpPix(env, order.orderId, payment.paymentId));
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
  const shopPaid = await notifyShop(env, config, 'PAGO — ' + order.orderId, {
    Pedido: order.orderId, Status: 'PAGO', Cliente: order.nome,
    'E-mail cliente': order.email, Telefone: order.telefone,
    Pagamento: order.pagamento || payment?.billingType || '—',
    Valor: formatBRL(value),
    Endereço: order.endereco, Envio: order.shippingService,
    ...orderWatchEmailFields(order)
  });
  if (!shopPaid?.ok) console.error('E-mail PAGO loja falhou:', JSON.stringify(shopPaid));

  await notifyCustomer(env, config, order, `Pagamento confirmado — ${order.orderId}`, {
    Pedido: order.orderId,
    Status: 'PAGO',
    Valor: formatBRL(value),
    Mensagem: 'Seu kit será postado em até 2 dias úteis. Você receberá o rastreio por e-mail.',
    ...orderWatchEmailFields(order)
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

  const forma = String(paymentType).toLowerCase().includes('card') || String(paymentType).toLowerCase().includes('cart')
    ? 'cartao' : 'pix';

  const payload = {
    client_id: order.orderId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 36) || 'server',
    events: [{
      name: 'venda_confirmada',
      params: {
        pedido: order.orderId,
        valor: value,
        moeda: 'BRL',
        pagamento: forma
      }
    }]
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
        billingType: 'PIX',
        value: payment.transaction_amount
      });
    }
  }
  return json({ ok: true }, 200, origin);
}

async function handleLogin(request, env, origin) {
  if (!env.ADMIN_PASSWORD) return json({ error: 'ADMIN_PASSWORD não configurado.' }, 500, origin);

  const ip = clientIp(request);
  const lock = await getLoginLock(env, ip);
  if (lock?.lockedUntil && Date.now() < lock.lockedUntil) {
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

  const body = await request.json();
  if ((body.username || '').trim() !== (env.ADMIN_USERNAME || 'admin') || body.password !== env.ADMIN_PASSWORD) {
    await recordLoginFailure(env, ip);
    return json({ error: 'Usuário ou senha incorretos.' }, 401, origin);
  }

  await clearLoginFailures(env, ip);
  return json({ token: await createSession(env), username: env.ADMIN_USERNAME || 'admin' }, 200, origin);
}

async function handleSession(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  return json({ ok: true, username: env.ADMIN_USERNAME || 'admin' }, 200, origin);
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
    pix: { ...current.pix, ...body.pix },
    shipping: { ...current.shipping, ...body.shipping },
    internationalShipping: { ...current.internationalShipping, ...body.internationalShipping },
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
  if (!(await deleteOrder(env, orderId))) {
    return json({ error: 'Pedido não encontrado.' }, 404, origin);
  }
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
      if (path === '/config' && request.method === 'PUT') return handlePutConfig(request, env, origin);
      if (path === '/admin/login' && request.method === 'POST') return handleLogin(request, env, origin);
      if (path === '/admin/session' && request.method === 'GET') return handleSession(request, env, origin);
      if (path === '/admin/test-email' && request.method === 'POST') return handleTestEmail(request, env, origin);
      if (path === '/shipping/quote' && request.method === 'GET') return handleShippingQuote(request, env, origin);
      if (path === '/orders' && request.method === 'POST') return handleCreateOrder(request, env, origin, ctx);
      if (path === '/orders' && request.method === 'GET') return handleListOrders(request, env, origin);
      if (path === '/webhook/asaas' && request.method === 'POST') return handleAsaasWebhook(request, env, origin);
      if (path === '/webhook/mercadopago' && (request.method === 'POST' || request.method === 'GET')) {
        return handleMercadoPagoWebhook(request, env, origin);
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
