/**
 * Cloudflare Worker — API da loja Sensor TattooFix
 *
 * Rotas:
 *   GET  /config        → config pública (preço, PIX, etc.)
 *   PUT  /config        → atualizar config (admin, Bearer token)
 *   POST /admin/login   → login admin
 *   POST /payment       → criar checkout Mercado Pago
 *
 * Deploy:
 *   cd api
 *   npx wrangler login
 *   npx wrangler kv namespace create STORE_KV
 *   # cole o id em wrangler.toml
 *   npx wrangler secret put ADMIN_PASSWORD
 *   npx wrangler secret put MP_ACCESS_TOKEN   # opcional
 *   npx wrangler deploy
 */

const ALLOWED_ORIGINS = ['https://sensortattoofix.com.br', 'http://localhost:8080', 'http://127.0.0.1:5500'];
const CONFIG_KEY = 'store-config';

const DEFAULT_CONFIG = {
  product: {
    name: 'Kit Sensor TattooFix',
    description: 'Lente ótica para smartwatch em pele tatuada — kit completo',
    price: 59.9,
    shipping: 0,
    image: 'https://sensortattoofix.com.br/sensortattoofix.jpg'
  },
  pix: {
    key: '25648188897',
    keyType: 'cpf',
    merchantName: '3N20 SOLUCOES TEC',
    merchantCity: 'SAO PAULO'
  },
  mercadoPago: {
    apiUrl: '',
    successUrl: 'https://sensortattoofix.com.br/comprar.html?status=aprovado',
    pendingUrl: 'https://sensortattoofix.com.br/comprar.html?status=pendente',
    failureUrl: 'https://sensortattoofix.com.br/comprar.html?status=recusado'
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}

async function getConfig(env) {
  const raw = await env.STORE_KV.get(CONFIG_KEY);
  if (!raw) return { ...DEFAULT_CONFIG };
  try {
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT_CONFIG };
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

async function handleLogin(request, env, origin) {
  if (!env.ADMIN_PASSWORD) {
    return json({ error: 'ADMIN_PASSWORD não configurado no Worker.' }, 500, origin);
  }

  const body = await request.json();
  const username = (body.username || '').trim();
  const adminUser = env.ADMIN_USERNAME || 'admin';

  if (username !== adminUser || body.password !== env.ADMIN_PASSWORD) {
    return json({ error: 'Usuário ou senha incorretos.' }, 401, origin);
  }

  const token = await createSession(env);
  return json({ token, username: adminUser }, 200, origin);
}

async function handleGetConfig(env, origin) {
  const config = await getConfig(env);
  return json(config, 200, origin);
}

async function handlePutConfig(request, env, origin) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();

  if (!(await isValidSession(env, token))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }

  const body = await request.json();
  const current = await getConfig(env);
  const merged = {
    ...current,
    ...body,
    product: { ...current.product, ...body.product },
    pix: { ...current.pix, ...body.pix },
    mercadoPago: { ...current.mercadoPago, ...body.mercadoPago },
    formsubmit: { ...current.formsubmit, ...body.formsubmit },
    api: { ...current.api, ...body.api }
  };

  const saved = await saveConfig(env, merged);
  return json(saved, 200, origin);
}

async function handlePayment(request, env, origin) {
  if (!env.MP_ACCESS_TOKEN) {
    return json({ error: 'MP_ACCESS_TOKEN não configurado.' }, 500, origin);
  }

  const body = await request.json();
  const preference = {
    items: [
      {
        id: body.orderId,
        title: body.title,
        description: body.description || body.title,
        quantity: body.quantity || 1,
        currency_id: 'BRL',
        unit_price: Number(body.price)
      }
    ],
    payer: {
      name: body.payer?.name,
      email: body.payer?.email,
      identification: body.payer?.cpf ? { type: 'CPF', number: body.payer.cpf } : undefined,
      phone: body.payer?.phone
        ? { area_code: body.payer.phone.slice(0, 2), number: body.payer.phone.slice(2) }
        : undefined,
      address: body.shipping
        ? {
            zip_code: body.shipping.zip_code,
            street_name: body.shipping.street_name,
            street_number: Number(body.shipping.street_number) || body.shipping.street_number
          }
        : undefined
    },
    shipments: body.shipping
      ? {
          cost: 0,
          mode: 'not_specified',
          receiver_address: {
            zip_code: body.shipping.zip_code,
            street_name: body.shipping.street_name,
            street_number: String(body.shipping.street_number),
            city_name: body.shipping.city,
            state_name: body.shipping.state,
            country_name: 'Brasil'
          }
        }
      : undefined,
    external_reference: body.orderId,
    back_urls: body.backUrls,
    auto_return: 'approved',
    statement_descriptor: 'SENSORTATTOOFIX',
    notification_url: env.MP_WEBHOOK_URL || undefined
  };

  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.MP_ACCESS_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(preference)
  });

  const data = await mpRes.json();
  if (!mpRes.ok) {
    return json({ error: data.message || 'Erro Mercado Pago', details: data }, mpRes.status, origin);
  }

  return json({ id: data.id, init_point: data.init_point, sandbox_init_point: data.sandbox_init_point }, 200, origin);
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
      if (path === '/config' && request.method === 'GET') {
        return handleGetConfig(env, origin);
      }
      if (path === '/config' && request.method === 'PUT') {
        return handlePutConfig(request, env, origin);
      }
      if (path === '/admin/login' && request.method === 'POST') {
        return handleLogin(request, env, origin);
      }
      if (path === '/payment' && request.method === 'POST') {
        return handlePayment(request, env, origin);
      }

      return json({ error: 'Rota não encontrada.' }, 404, origin);
    } catch (err) {
      return json({ error: err.message }, 500, origin);
    }
  }
};
