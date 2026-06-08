/**
 * API Sensor TattooFix — Cloudflare Worker
 * PIX + Cartão (Asaas) · WhatsApp · Correios · Internacional · Pedidos
 */

const ALLOWED_ORIGINS = [
  'https://sensortattoofix.com.br',
  'https://www.sensortattoofix.com.br',
  'http://localhost:8080',
  'http://127.0.0.1:5500'
];
const CONFIG_KEY = 'store-config';
const ORDERS_INDEX = 'orders:index';

const DEFAULT_CONFIG = {
  product: {
    name: 'Kit Sensor TattooFix',
    description: 'Lente ótica para smartwatch em pele tatuada — kit completo',
    price: 59.9,
    image: 'https://sensortattoofix.com.br/sensortattoofix.jpg'
  },
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
    'Apple Watch Series 9 (41mm)',
    'Apple Watch Series 9 (45mm)',
    'Apple Watch Series 10 (42mm)',
    'Apple Watch Series 10 (46mm)',
    'Apple Watch Ultra / Ultra 2',
    'Samsung Galaxy Watch 4 (40mm)',
    'Samsung Galaxy Watch 4 (44mm)',
    'Samsung Galaxy Watch 5 (40mm)',
    'Samsung Galaxy Watch 5 (44mm)',
    'Samsung Galaxy Watch 6 (40mm)',
    'Samsung Galaxy Watch 6 (44mm)',
    'Samsung Galaxy Watch 7 (40mm)',
    'Samsung Galaxy Watch 7 (44mm)',
    'Garmin Forerunner',
    'Garmin Fenix',
    'Garmin Venu',
    'Garmin Vivoactive',
    'Huawei Watch GT',
    'Huawei Watch Fit',
    'Xiaomi Watch S1 / S3',
    'Amazfit GTR / GTS',
    'Outro modelo (informar nas observações)'
  ],
  formsubmit: { email: 'sensortattoofix@gmail.com', subject: 'Novo pedido — Loja Oficial Sensor TattooFix' },
  whatsapp: '5511913394665',
  siteUrl: 'https://sensortattoofix.com.br',
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
      : base.smartwatchModels
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

function publicOrderView(order) {
  return {
    orderId: order.orderId,
    status: order.status,
    total: order.total,
    frete: order.frete,
    valorProduto: order.valorProduto,
    pagamento: order.pagamento,
    paidAt: order.paidAt || null
  };
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
    pais: order.pais,
    pagamento: order.pagamento
  });
  await env.STORE_KV.put(ORDERS_INDEX, JSON.stringify(filtered.slice(0, 2000)));
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
  return order.pagamento === 'PIX'
    ? 'Pague o PIX gerado no site. A confirmação é automática.'
    : 'Finalize o pagamento no link seguro.';
}

async function notifyWhatsApp(env, config, order, type) {
  const shopPhone = config.whatsapp || env.SHOP_WHATSAPP;
  const msgs = {
    order_customer: `✅ *Sensor TattooFix*\n\nOlá ${order.nome}!\n\nPedido: *${order.orderId}*\nSmartwatch: ${order.smartwatch}\nTotal: ${formatBRL(order.total)}\nPagamento: ${order.pagamento}\n\n${pixCustomerHint(order, shopPhone)}\n\nObrigado!`,
    order_shop: `🛒 *NOVO PEDIDO*\n\n${order.orderId}\n${order.nome}\n📱 ${order.telefone}\n⌚ ${order.smartwatch}\n🌍 ${order.pais}\n💰 ${formatBRL(order.total)}\n📦 ${order.shippingService}\n📍 ${order.endereco}`,
    paid_customer: `✅ *Pagamento confirmado!*\n\nPedido *${order.orderId}* pago com sucesso.\n\nSeu kit será postado em até 2 dias úteis. Você receberá o rastreio por e-mail.\n\nSensor TattooFix`,
    paid_shop: `💰 *PAGAMENTO CONFIRMADO*\n\n${order.orderId}\nCliente: ${order.nome}\nValor: ${formatBRL(order.total)}\n⌚ ${order.smartwatch}\n\n📮 Postar via ${order.shippingService}\n📍 ${order.endereco}`
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

async function quoteCorreios(env, config, destCep) {
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const origin = onlyDigits(ship.originCep);
  const dest = onlyDigits(destCep);
  if (dest.length !== 8) throw new Error('CEP inválido');

  const token = await getCorreiosToken(env);
  if (token && ship.serviceCode) {
    const params = new URLSearchParams({
      cepDestino: dest, cepOrigem: origin,
      psObjeto: String(ship.weightGrams || 120), tpObjeto: '2',
      comprimento: String(ship.lengthCm || 16), largura: String(ship.widthCm || 12),
      altura: String(ship.heightCm || 3), vlDeclarado: String(config.product.price || 59.9)
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
      description: `${config.product.name} — ${order.smartwatch} — ${order.orderId}`.slice(0, 500),
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

async function sendViaResend(env, config, to, subject, fields, replyTo) {
  const apiKey = (env.RESEND_API_KEY || '').trim();
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY não configurada' };

  const payload = {
    from: emailFrom(env, config),
    to: [to],
    subject,
    html: fieldsToHtml(fields),
    text: fieldsToText(fields)
  };
  if (replyTo) payload.reply_to = [replyTo];

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

async function notifyEmail(env, config, to, subject, fields, replyTo) {
  if (!to) return { ok: false, error: 'Destinatário vazio' };
  try {
    const resend = await sendViaResend(env, config, to, subject, fields, replyTo);
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

async function notifyCustomer(env, config, order, subject, fields) {
  await notifyEmail(env, config, order.email, subject, { Cliente: order.nome, ...fields }, config.formsubmit?.email);
}

async function handleShippingQuote(request, env, origin) {
  const url = new URL(request.url);
  const country = (url.searchParams.get('country') || 'BR').toUpperCase();
  const config = await getConfig(env);

  if (country !== 'BR') {
    return json(quoteInternational(config, country), 200, origin);
  }
  const cep = url.searchParams.get('cep');
  return json(await quoteCorreios(env, config, cep), 200, origin);
}

async function handleCreateOrder(request, env, origin, ctx) {
  const body = await request.json();
  const config = await getConfig(env);
  const frete = Number(body.frete) || 0;
  const valorProduto = Number(config.product.price) || 59.9;
  const billingType = body.pagamento === 'CARTAO' ? 'CREDIT_CARD' : 'PIX';
  const pagamentoLabel = billingType === 'CREDIT_CARD' ? 'Cartão de crédito' : 'PIX';

  const order = {
    orderId: generateOrderId(),
    accessToken: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'pending_payment',
    nome: body.nome,
    email: body.email,
    telefone: body.telefone,
    cpf: body.cpf,
    smartwatch: body.smartwatch || 'Não informado',
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
    produto: config.product.name,
    valorProduto,
    frete,
    total: valorProduto + frete,
    shippingService: body.shippingService || 'Mini Envios',
    shippingDays: body.shippingDays || null,
    pagamento: pagamentoLabel
  };

  let payment = null;
  const hasAsaas = !!asaasApiKey(env);
  try {
    payment = await createAsaasPayment(env, order, config, billingType);
  } catch (err) {
    console.error('Asaas:', err.message);
    if (hasAsaas) {
      return json({
        error: billingType === 'CREDIT_CARD'
          ? 'Cartão indisponível: ' + err.message
          : 'PIX Asaas indisponível: ' + err.message
      }, 400, origin);
    }
    if (billingType === 'CREDIT_CARD') {
      return json({ error: 'Cartão indisponível. Configure ASAAS_API_KEY ou escolha PIX.' }, 400, origin);
    }
  }

  if (payment) {
    order.paymentProvider = 'asaas';
    order.asaasPaymentId = payment.paymentId;
    order.autoConfirm = true;
  } else if (hasAsaas) {
    return json({ error: 'Não foi possível criar cobrança no Asaas. Verifique chave PIX cadastrada no painel.' }, 400, origin);
  } else {
    order.paymentProvider = 'static_pix';
    order.autoConfirm = false;
  }

  await saveOrder(env, order);

  const emailWork = Promise.all([
    notifyShop(env, config, config.formsubmit.subject, {
      Pedido: order.orderId, Status: order.status, Nome: order.nome,
      'E-mail': order.email, Telefone: order.telefone, Smartwatch: order.smartwatch,
      País: order.pais, Endereço: order.endereco, Pagamento: order.pagamento,
      Produto: formatBRL(order.valorProduto), Frete: formatBRL(order.frete), Total: formatBRL(order.total)
    }),
    notifyCustomer(env, config, order, `Pedido ${order.orderId} registrado — Sensor Tattoo Fix`, {
      Pedido: order.orderId,
      Status: 'Aguardando pagamento',
      Smartwatch: order.smartwatch,
      Total: formatBRL(order.total),
      Pagamento: order.pagamento,
      Mensagem: 'Finalize o pagamento no site. Você receberá outro e-mail quando o pagamento for confirmado.'
    }),
    notifyWhatsApp(env, config, order, 'order')
  ]).then((results) => {
    results.slice(0, 2).forEach((r, i) => {
      if (r && !r.ok) console.error('E-mail pedido falhou:', i === 0 ? 'loja' : 'cliente', JSON.stringify(r));
    });
  });

  if (ctx) ctx.waitUntil(emailWork);

  return json({
    order: publicOrderView(order),
    accessToken: order.accessToken,
    payment: payment || { provider: 'static_pix', billingType: 'PIX', autoConfirm: false }
  }, 200, origin);
}

async function handlePaymentConfirmed(env, order, payment) {
  order.status = 'paid';
  order.paidAt = new Date().toISOString();
  const value = payment?.value ?? order.total;
  if (payment?.id) {
    order.paymentProof = {
      provider: 'asaas',
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
    Smartwatch: order.smartwatch, Valor: formatBRL(value),
    Endereço: order.endereco, Envio: order.shippingService
  });
  if (!shopPaid?.ok) console.error('E-mail PAGO loja falhou:', JSON.stringify(shopPaid));

  await notifyCustomer(env, config, order, `Pagamento confirmado — ${order.orderId}`, {
    Pedido: order.orderId,
    Status: 'PAGO',
    Valor: formatBRL(value),
    Smartwatch: order.smartwatch,
    Mensagem: 'Seu kit será postado em até 2 dias úteis. Você receberá o rastreio por e-mail.'
  });

  await notifyWhatsApp(env, config, order, 'paid');
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

  const result = await notifyEmail(env, config, to, 'Teste — Sensor Tattoo Fix', {
    Teste: 'Envio de e-mail da loja',
    Horário: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    Remetente: emailFrom(env, config)
  }, config.formsubmit?.email);

  return json(result, result.ok ? 200 : 502, origin);
}

async function handleGetOrder(request, env, origin, orderId) {
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Não encontrado.' }, 404, origin);

  if (await isValidSession(env, bearerToken(request))) {
    return json(order, 200, origin);
  }

  const accessToken = new URL(request.url).searchParams.get('token') || '';
  if (accessToken && order.accessToken && accessToken === order.accessToken) {
    return json(publicOrderView(order), 200, origin);
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
    formsubmit: { ...current.formsubmit, ...body.formsubmit },
    api: { ...current.api, ...body.api }
  };
  return json(await saveConfig(env, merged), 200, origin);
}

async function handleListOrders(request, env, origin) {
  if (!(await isValidSession(env, bearerToken(request)))) return json({ error: 'Não autorizado.' }, 401, origin);

  const format = new URL(request.url).searchParams.get('format') || 'json';
  const index = JSON.parse((await env.STORE_KV.get(ORDERS_INDEX)) || '[]');

  if (format === 'csv') {
    const header = 'orderId,createdAt,status,nome,email,telefone,smartwatch,pais,pagamento,total,frete\n';
    const rows = index.map((o) =>
      [o.orderId, o.createdAt, o.status, o.nome, o.email, o.telefone, o.smartwatch, o.pais, o.pagamento, o.total, o.frete]
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
      if (path === '/config' && request.method === 'GET') return json(await getConfig(env), 200, origin);
      if (path === '/config' && request.method === 'PUT') return handlePutConfig(request, env, origin);
      if (path === '/admin/login' && request.method === 'POST') return handleLogin(request, env, origin);
      if (path === '/admin/session' && request.method === 'GET') return handleSession(request, env, origin);
      if (path === '/admin/test-email' && request.method === 'POST') return handleTestEmail(request, env, origin);
      if (path === '/shipping/quote' && request.method === 'GET') return handleShippingQuote(request, env, origin);
      if (path === '/orders' && request.method === 'POST') return handleCreateOrder(request, env, origin, ctx);
      if (path === '/orders' && request.method === 'GET') return handleListOrders(request, env, origin);
      if (path === '/webhook/asaas' && request.method === 'POST') return handleAsaasWebhook(request, env, origin);

      const confirmMatch = path.match(/^\/orders\/([^/]+)\/confirm$/);
      if (confirmMatch && request.method === 'POST') {
        return handleConfirmOrder(request, env, origin, confirmMatch[1]);
      }

      const m = path.match(/^\/orders\/([^/]+)$/);
      if (m && request.method === 'GET') return handleGetOrder(request, env, origin, m[1]);
      return json({ error: 'Rota não encontrada.' }, 404, origin);
    } catch (err) {
      return json({ error: err.message }, 500, origin);
    }
  }
};
