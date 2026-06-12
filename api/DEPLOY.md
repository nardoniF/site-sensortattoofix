# Deploy completo — Sensor TattooFix API

## O que esta API faz

- Confirmação automática **PIX** (Mercado Pago), **cartão** (Asaas) e **PayPal** (internacional)
- Cotação **Mini Envios** (Correios) e **frete internacional**
- **WhatsApp** para cliente e loja ao criar pedido e ao confirmar pagamento
- **Base de pedidos** listável em `/pedidos.html`

## 1. Cloudflare Worker

```bash
cd api
npm i -g wrangler   # ou: npx wrangler
wrangler login
wrangler kv namespace create STORE_KV
# Cole o id em wrangler.toml → [[kv_namespaces]] → id
```

## 2. Secrets obrigatórios

```bash
wrangler secret put ADMIN_PASSWORD          # senha do admin/pedidos
wrangler secret put MP_ACCESS_TOKEN         # Mercado Pago → Credenciais de produção
wrangler secret put ASAAS_API_KEY           # Asaas → Integrações → API (cartão)
wrangler secret put ASAAS_WEBHOOK_TOKEN     # token do webhook Asaas (cartão)
wrangler secret put PAYPAL_CLIENT_ID          # PayPal Developer → app REST (internacional)
wrangler secret put PAYPAL_CLIENT_SECRET
```

Opcional:

```bash
wrangler secret put PAYPAL_SANDBOX            # "true" para testes sandbox
wrangler secret put PAYPAL_SELF_TEST            # "true" = PayPal Live cobra R$ 0,01 (remover após teste)
wrangler secret put STORE_URL                 # URL do site (retorno PayPal)
```

Opcional (outros):

```bash
wrangler secret put MP_WEBHOOK_URL
# Ex.: https://sensortattoofix-payments.xxx.workers.dev/webhook/mercadopago
```

## 3. WhatsApp automático (Z-API — z-api.io)

```bash
wrangler secret put ZAPI_INSTANCE_ID
wrangler secret put ZAPI_TOKEN
wrangler secret put ZAPI_CLIENT_TOKEN       # se usar
```

Sem Z-API, pedidos e e-mails funcionam; WhatsApp não é enviado automaticamente.

## 4. Correios (frete real Mini Envios)

```bash
wrangler secret put CORREIOS_USER
wrangler secret put CORREIOS_PASSWORD
wrangler secret put CORREIOS_CONTRACT       # opcional
```

## 5. Deploy

```bash
wrangler deploy
```

Copie a URL (ex: `https://sensortattoofix-payments.xxx.workers.dev`) em:

- `js/config-bootstrap.js` → `configApiUrl`

## 6. Webhook Mercado Pago (PIX)

No [Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel/app) → sua aplicação → Webhooks:

- **URL:** `https://SUA-URL.workers.dev/webhook/mercadopago`
- **Evento:** `payment` (pagamentos)

## 7. Webhook Asaas (cartão)

No painel Asaas → Integrações → Webhooks:

- **URL:** `https://SUA-URL.workers.dev/webhook/asaas`
- **Eventos:** `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`
- **Token:** mesmo valor de `ASAAS_WEBHOOK_TOKEN`

## 8. Webhook PayPal (internacional)

No [PayPal Developer](https://developer.paypal.com/) → sua aplicação → Webhooks:

- **URL:** `https://SUA-URL.workers.dev/webhook/paypal`
- **Eventos:** `PAYMENT.CAPTURE.COMPLETED`, `CHECKOUT.ORDER.COMPLETED`

O cliente também confirma ao voltar do PayPal para `/comprar.html` (captura automática).

## 8b. Tabela fallback internacional

A tabela em **Admin → Frete** sincroniza sozinha com o simulador Exporta Fácil quando a API responde (ao abrir o admin ou em cada cotação no checkout). Serve só se a API dos Correios falhar.

## 9. Painéis

| URL | Função |
|-----|--------|
| `/admin.html` | Configurar preço, PIX, frete, modelos |
| `/pedidos.html` | Listar todos os pedidos |
| `/comprar.html` | Checkout do cliente |

Usuário admin padrão: `admin` + senha definida em `ADMIN_PASSWORD`.
