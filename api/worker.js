/**
 * Cloudflare Worker — cria preferência Mercado Pago com token seguro no servidor.
 *
 * Deploy (gratuito):
 *   cd api
 *   npm i -g wrangler   # ou: npx wrangler
 *   wrangler login
 *   wrangler secret put MP_ACCESS_TOKEN   # token de produção do Mercado Pago
 *   wrangler deploy
 *
 * Depois cole a URL do Worker em js/checkout-config.js → mercadoPago.apiUrl
 */

const ALLOWED_ORIGIN = 'https://sensortattoofix.com.br';

function corsHeaders(origin) {
  const allowed = origin === ALLOWED_ORIGIN || origin === 'http://localhost:8080';
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ALLOWED_ORIGIN;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
      });
    }

    if (!env.MP_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: 'MP_ACCESS_TOKEN não configurado' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
      });
    }

    try {
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
          identification: body.payer?.cpf
            ? { type: 'CPF', number: body.payer.cpf }
            : undefined,
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
          Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preference)
      });

      const data = await mpRes.json();

      if (!mpRes.ok) {
        return new Response(JSON.stringify({ error: data.message || 'Erro Mercado Pago', details: data }), {
          status: mpRes.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
        });
      }

      return new Response(
        JSON.stringify({
          id: data.id,
          init_point: data.init_point,
          sandbox_init_point: data.sandbox_init_point
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
      );
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
      });
    }
  }
};
