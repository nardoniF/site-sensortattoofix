/**
 * API Sensor TattooFix — Cloudflare Worker
 *
 * Rotas:
 *   GET  /config
 *   PUT  /config              (admin)
 *   POST /admin/login
 *   GET  /shipping/quote      ?cep=destino
 *   POST /orders              criar pedido + PIX
 *   GET  /orders/:id          status do pedido
 *   GET  /orders              listar/exportar (admin)
 *   POST /webhook/asaas       confirmação PIX automática
 */

const ALLOWED_ORIGINS = ['https://sensortattoofix.com.br', 'http://localhost:8080', 'http://127.0.0.1:5500'];
const CONFIG_KEY = 'store-config';
const ORDERS_INDEX = 'orders:index';

const DEFAULT_CONFIG = {
  product: {
    name: 'Kit Sensor TattooFix',
    description: 'Lente ótica para smartwatch em pele tatuada — kit completo',
    price: 59.9,
    image: 'https://sensortattoofix.com.br/sensortattoofix.jpg'
  },
  pix: {
    key: '29321223000132',
    keyType: 'cnpj',
    merchantName: '3N20 SOLUCOES TEC',
    merchantCity: 'SAO PAULO'
  },
  shipping: {
    originCep: '01153000',
    weightGrams: 120,
    lengthCm: 16,
    widthCm: 12,
    heightCm: 3,
    serviceCode: '04227',
    serviceName: 'Mini Envios'
  },
  formsubmit: {
    email: 'sensortattoofix@gmail.com',
    subject: 'Novo pedido — Loja Oficial Sensor TattooFix'
  },
  whatsapp: '5511913394665',
  siteUrl: 'https://sensortattoofix.com.br',
  api: { baseUrl: '' },
  updatedAt: new Date().toISOString()
};

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, asaas-access-token',
    'Access-Control-Max-Age': '86400'
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}

function onlyDigits(v) {
  return (v || '').replace(/\D/g, '');
}

async function getConfig(env) {
  const raw = await env.STORE_KV.get(CONFIG_KEY);
  if (!raw) return structuredClone(DEFAULT_CONFIG);
  try {
    return JSON.parse(raw);
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
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
  if (!token) return false;
  return !!(await env.STORE_KV.get('session:' + token));
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
    frete: order.frete
  });
  await env.STORE_KV.put(ORDERS_INDEX, JSON.stringify(filtered.slice(0, 1000)));
}

async function getCorreiosToken(env) {
  const cached = await env.STORE_KV.get('correios:token');
  if (cached) {
    const data = JSON.parse(cached);
    if (data.expiresAt > Date.now()) return data.token;
  }

  const user = env.CORREIOS_USER;
  const password = env.CORREIOS_PASSWORD;
  const contract = env.CORREIOS_CONTRACT;
  if (!user || !password) return null;

  const basic = btoa(user + ':' + password);
  let res;
  if (contract) {
    res = await fetch('https://api.correios.com.br/token/v1/autentica/cartaopostagem', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + basic,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ numero: contract })
    });
  } else {
    res = await fetch('https://api.correios.com.br/token/v1/autentica', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + basic }
    });
  }

  if (!res.ok) return null;
  const data = await res.json();
  const token = data.token;
  const expiresAt = Date.now() + (Number(data.expiraEm || 3600) - 60) * 1000;
  await env.STORE_KV.put('correios:token', JSON.stringify({ token, expiresAt }));
  return token;
}

function estimateShipping(originCep, destCep) {
  const o = parseInt(onlyDigits(originCep).slice(0, 5), 10) || 0;
  const d = parseInt(onlyDigits(destCep).slice(0, 5), 10) || 0;
  const diff = Math.abs(o - d);
  if (diff < 800) return { price: 11.9, days: 8, source: 'estimate' };
  if (diff < 3000) return { price: 15.9, days: 10, source: 'estimate' };
  if (diff < 8000) return { price: 19.9, days: 12, source: 'estimate' };
  return { price: 24.9, days: 14, source: 'estimate' };
}

async function quoteCorreios(env, config, destCep) {
  const ship = config.shipping || DEFAULT_CONFIG.shipping;
  const origin = onlyDigits(ship.originCep);
  const dest = onlyDigits(destCep);
  if (dest.length !== 8) throw new Error('CEP inválido');

  const token = await getCorreiosToken(env);
  if (token && ship.serviceCode) {
    const params = new URLSearchParams({
      cepDestino: dest,
      cepOrigem: origin,
      psObjeto: String(ship.weightGrams || 120),
      tpObjeto: '2',
      comprimento: String(ship.lengthCm || 16),
      largura: String(ship.widthCm || 12),
      altura: String(ship.heightCm || 3),
      vlDeclarado: String(config.product.price || 59.9)
    });

    const url = `https://api.correios.com.br/preco/v1/nacional/${ship.serviceCode}?${params}`;
    const res = await fetch(url, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
    });

    if (res.ok) {
      const data = await res.json();
      const price = parseFloat(String(data.pcFinal || data.vlTotal || '0').replace(',', '.'));
      if (price > 0) {
        return {
          price,
          days: Number(data.prazoEntrega || data.prazo || 12),
          service: ship.serviceName || 'Mini Envios',
          serviceCode: ship.serviceCode,
          source: 'correios'
        };
      }
    }
  }

  const est = estimateShipping(origin, dest);
  return {
    price: est.price,
    days: est.days,
    service: ship.serviceName || 'Mini Envios',
    serviceCode: ship.serviceCode,
    source: est.source
  };
}

async function createAsaasPix(env, order, config) {
  const apiKey = env.ASAAS_API_KEY;
  if (!apiKey) return null;

  const base = env.ASAAS_SANDBOX === 'true'
    ? 'https://sandbox.asaas.com/api/v3'
    : 'https://api.asaas.com/api/v3';

  const customerRes = await fetch(base + '/customers', {
    method: 'POST',
    headers: {
      access_token: apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: order.nome,
      email: order.email,
      cpfCnpj: onlyDigits(order.cpf),
      mobilePhone: onlyDigits(order.telefone),
      postalCode: onlyDigits(order.cep),
      address: order.rua,
      addressNumber: order.numero,
      complement: order.complemento || undefined,
      province: order.bairro,
      externalReference: order.orderId
    })
  });

  const customer = await customerRes.json();
  if (!customerRes.ok) throw new Error(customer.errors?.[0]?.description || 'Erro ao criar cliente Asaas');

  const due = new Date().toISOString().slice(0, 10);
  const payRes = await fetch(base + '/payments', {
    method: 'POST',
    headers: {
      access_token: apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customer: customer.id,
      billingType: 'PIX',
      value: order.total,
      dueDate: due,
      description: config.product.name + ' — ' + order.orderId,
      externalReference: order.orderId
    })
  });

  const payment = await payRes.json();
  if (!payRes.ok) throw new Error(payment.errors?.[0]?.description || 'Erro ao criar PIX Asaas');

  const qrRes = await fetch(base + '/payments/' + payment.id + '/pixQrCode', {
    headers: { access_token: apiKey }
  });
  const qr = await qrRes.json();

  return {
    provider: 'asaas',
    paymentId: payment.id,
    pixCopyPaste: qr.payload,
    pixQrEncoded: qr.encodedImage,
    autoConfirm: true
  };
}

async function notifyFormSubmit(config, order) {
  const body = new URLSearchParams();
  body.append('_subject', config.formsubmit.subject);
  body.append('_captcha', 'false');
  body.append('_template', 'table');
  body.append('Pedido', order.orderId);
  body.append('Status', order.status);
  body.append('Nome', order.nome);
  body.append('E-mail', order.email);
  body.append('Telefone', order.telefone);
  body.append('CPF', order.cpf);
  body.append('Endereço', order.endereco);
  body.append('Produto', order.produto);
  body.append('Valor produto', 'R$ ' + order.valorProduto.toFixed(2));
  body.append('Frete Mini Envios', 'R$ ' + order.frete.toFixed(2));
  body.append('Total', 'R$ ' + order.total.toFixed(2));

  await fetch('https://formsubmit.co/ajax/' + config.formsubmit.email, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
}

async function handleLogin(request, env, origin) {
  if (!env.ADMIN_PASSWORD) return json({ error: 'ADMIN_PASSWORD não configurado.' }, 500, origin);
  const body = await request.json();
  const adminUser = env.ADMIN_USERNAME || 'admin';
  if ((body.username || '').trim() !== adminUser || body.password !== env.ADMIN_PASSWORD) {
    return json({ error: 'Usuário ou senha incorretos.' }, 401, origin);
  }
  const token = await createSession(env);
  return json({ token, username: adminUser }, 200, origin);
}

async function handlePutConfig(request, env, origin) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!(await isValidSession(env, token))) return json({ error: 'Não autorizado.' }, 401, origin);

  const body = await request.json();
  const current = await getConfig(env);
  const merged = {
    ...current,
    ...body,
    product: { ...current.product, ...body.product },
    pix: { ...current.pix, ...body.pix },
    shipping: { ...current.shipping, ...body.shipping },
    formsubmit: { ...current.formsubmit, ...body.formsubmit },
    api: { ...current.api, ...body.api }
  };
  return json(await saveConfig(env, merged), 200, origin);
}

async function handleShippingQuote(request, env, origin) {
  const cep = new URL(request.url).searchParams.get('cep');
  const config = await getConfig(env);
  const quote = await quoteCorreios(env, config, cep);
  return json(quote, 200, origin);
}

async function handleCreateOrder(request, env, origin) {
  const body = await request.json();
  const config = await getConfig(env);
  const frete = Number(body.frete) || 0;
  const valorProduto = Number(config.product.price) || 59.9;

  const order = {
    orderId: body.orderId || ('STF-' + Date.now()),
    createdAt: new Date().toISOString(),
    status: 'pending_payment',
    nome: body.nome,
    email: body.email,
    telefone: body.telefone,
    cpf: body.cpf,
    smartwatch: body.smartwatch || '',
    cep: body.cep,
    rua: body.rua,
    numero: body.numero,
    complemento: body.complemento || '',
    bairro: body.bairro,
    cidade: body.cidade,
    uf: body.uf,
    endereco: body.endereco,
    produto: config.product.name,
    valorProduto,
    frete,
    total: valorProduto + frete,
    shippingService: body.shippingService || config.shipping?.serviceName,
    shippingDays: body.shippingDays || null,
    pagamento: 'PIX'
  };

  try {
    const asaasPix = await createAsaasPix(env, order, config);
    if (asaasPix) {
      order.pixProvider = 'asaas';
      order.asaasPaymentId = asaasPix.paymentId;
      order.autoConfirm = true;
      await saveOrder(env, order);
      await notifyFormSubmit(config, order);
      return json({ order, pix: asaasPix }, 200, origin);
    }
  } catch (err) {
    console.error('Asaas error:', err.message);
  }

  order.pixProvider = 'static';
  order.autoConfirm = false;
  await saveOrder(env, order);
  await notifyFormSubmit(config, order);
  return json({ order, pix: { provider: 'static', autoConfirm: false } }, 200, origin);
}

async function handleGetOrder(orderId, env, origin) {
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: 'Pedido não encontrado.' }, 404, origin);
  return json(order, 200, origin);
}

async function handleListOrders(request, env, origin) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!(await isValidSession(env, token))) return json({ error: 'Não autorizado.' }, 401, origin);

  const format = new URL(request.url).searchParams.get('format') || 'json';
  const index = JSON.parse((await env.STORE_KV.get(ORDERS_INDEX)) || '[]');

  if (format === 'csv') {
    const header = 'orderId,createdAt,status,nome,email,total,frete\n';
    const rows = index.map((o) =>
      [o.orderId, o.createdAt, o.status, o.nome, o.email, o.total, o.frete]
        .map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"')
        .join(',')
    ).join('\n');
    return new Response(header + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=pedidos.csv',
        ...corsHeaders(origin)
      }
    });
  }

  const orders = [];
  for (const item of index.slice(0, 200)) {
    const full = await getOrder(env, item.orderId);
    if (full) orders.push(full);
  }
  return json(orders, 200, origin);
}

async function handleAsaasWebhook(request, env, origin) {
  const token = request.headers.get('asaas-access-token');
  if (env.ASAAS_WEBHOOK_TOKEN && token !== env.ASAAS_WEBHOOK_TOKEN) {
    return json({ error: 'Token inválido.' }, 401, origin);
  }

  const body = await request.json();
  const event = body.event;
  const payment = body.payment;
  if (!payment?.externalReference) return json({ ok: true }, 200, origin);

  if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
    const order = await getOrder(env, payment.externalReference);
    if (order) {
      order.status = 'paid';
      order.paidAt = new Date().toISOString();
      order.paymentProof = {
        provider: 'asaas',
        paymentId: payment.id,
        value: payment.value,
        confirmedAt: order.paidAt
      };
      await saveOrder(env, order);

      const config = await getConfig(env);
      const proofBody = new URLSearchParams();
      proofBody.append('_subject', '✅ PIX CONFIRMADO — ' + order.orderId);
      proofBody.append('_captcha', 'false');
      proofBody.append('_template', 'table');
      proofBody.append('Pedido', order.orderId);
      proofBody.append('Status', 'PAGO');
      proofBody.append('Valor recebido', 'R$ ' + Number(payment.value).toFixed(2));
      proofBody.append('Cliente', order.nome);
      proofBody.append('E-mail', order.email);
      proofBody.append('Endereço', order.endereco);
      proofBody.append('Postar via', order.shippingService || 'Mini Envios');

      await fetch('https://formsubmit.co/ajax/' + config.formsubmit.email, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: proofBody.toString()
      });
    }
  }

  return json({ ok: true }, 200, origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ALLOWED_ORIGINS[0];
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    try {
      if (path === '/config' && request.method === 'GET') return json(await getConfig(env), 200, origin);
      if (path === '/config' && request.method === 'PUT') return handlePutConfig(request, env, origin);
      if (path === '/admin/login' && request.method === 'POST') return handleLogin(request, env, origin);
      if (path === '/shipping/quote' && request.method === 'GET') return handleShippingQuote(request, env, origin);
      if (path === '/orders' && request.method === 'POST') return handleCreateOrder(request, env, origin);
      if (path === '/orders' && request.method === 'GET') return handleListOrders(request, env, origin);
      if (path === '/webhook/asaas' && request.method === 'POST') return handleAsaasWebhook(request, env, origin);

      const orderMatch = path.match(/^\/orders\/([^/]+)$/);
      if (orderMatch && request.method === 'GET') {
        return handleGetOrder(orderMatch[1], env, origin);
      }

      return json({ error: 'Rota não encontrada.' }, 404, origin);
    } catch (err) {
      return json({ error: err.message }, 500, origin);
    }
  }
};
