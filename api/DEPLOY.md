# Deploy completo — Sensor Tattoo Fix API

> **Manual completo (URLs, secrets, frete, Correios):** [documentacao.html](../documentacao.html) no site ou aba **Documentação** no admin.

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
wrangler secret put CF_API_TOKEN            # Cloudflare → API Token → Account Analytics Read (KV real no Admin)
wrangler secret put ADMIN_PASSWORD          # senha do admin/pedidos
wrangler secret put MP_ACCESS_TOKEN         # Mercado Pago → Credenciais de produção
wrangler secret put ML_CLIENT_ID            # Mercado Livre → app pedidosml (vendas)
wrangler secret put ML_CLIENT_SECRET
wrangler secret put ML_REFRESH_TOKEN        # OAuth offline (rotaciona no KV após refresh)
wrangler secret put AMZ_LWA_CLIENT_ID       # Amazon SP-API (vendas)
wrangler secret put AMZ_LWA_CLIENT_SECRET
wrangler secret put AMZ_LWA_REFRESH_TOKEN
wrangler secret put ASAAS_API_KEY           # Asaas → Integrações → API (cartão)
wrangler secret put ASAAS_WEBHOOK_TOKEN     # token do webhook Asaas (cartão)
wrangler secret put PAYPAL_CLIENT_ID          # PayPal Developer → app REST (internacional)
wrangler secret put PAYPAL_CLIENT_SECRET
wrangler secret put STRIPE_SECRET_KEY              # Stripe → Developers → Secret key
wrangler secret put STRIPE_PUBLISHABLE_KEY         # Stripe → pk_live_… ou pk_test_…
wrangler secret put STRIPE_WEBHOOK_SECRET          # Stripe → Webhooks → signing secret
```

### KV real no Admin (`CF_API_TOKEN`)

O banner de % de writes no Admin lê a **mesma GraphQL Analytics** do dashboard Workers KV.

1. Cloudflare → My Profile → **API Tokens** → Create Token  
2. Template **Read analytics and logs**, ou custom com **Account → Account Analytics → Read**  
3. Account Resources: a conta `f.nardoni@…`  
4. `cd api && wrangler secret put CF_API_TOKEN` (cole o token)  
5. `CF_ACCOUNT_ID` já está em `[vars]` no `wrangler.toml`  

Sem o token, o Admin mostra só estimativa local (imprecisa) em amarelo.

Opcional:

```bash
wrangler secret put PAYPAL_SANDBOX            # "true" para testes sandbox
wrangler secret put PAYPAL_SELF_TEST            # "true" = PayPal Live cobra R$ 0,01 (remover após teste)
wrangler secret put STORE_URL                 # https://www.sensortattoofix.com (retorno PayPal/Stripe no .com)
```

Opcional (outros):

```bash
wrangler secret put MP_WEBHOOK_URL
# Ex.: https://sensortattoofix-payments.xxx.workers.dev/webhook/mercadopago
```

### Mercado Livre (vendas — app `pedidosml`)

Separado do Mercado Pago (checkout). Redirect URI no app ML:

`https://api.sensortattoofix.com.br/admin/ml/oauth/callback`

Autorizar (gera `code=` e o callback troca por tokens):

```
https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=SEU_CLIENT_ID&redirect_uri=https://api.sensortattoofix.com.br/admin/ml/oauth/callback
```

O refresh token rotaciona a cada renovação e fica em `STORE_KV` (`ml:oauth`). `ML_REFRESH_TOKEN` é só bootstrap / fallback.

Sync de pedidos pagos (KV `sale:ml:{id}`, índice `sales:ml:index`):

- `POST /admin/ml/sync` — importa (padrão: últimos 90 dias; `?full=1&days=90`)
- `GET /admin/ml/sync` — meta do último sync
- `GET /admin/ml/sales` — lista normalizada (auth admin)
- Cron `*/5` com throttle de 1h

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

## 4b. Uber Direct (entrega rápida BR)

Cadastro: [direct.uber.com](https://direct.uber.com) · Docs: [developer.uber.com/docs/deliveries](https://developer.uber.com/docs/deliveries/get-started)

```bash
wrangler secret put UBER_DIRECT_CLIENT_ID
wrangler secret put UBER_DIRECT_CLIENT_SECRET
wrangler secret put UBER_DIRECT_CUSTOMER_ID
wrangler secret put UBER_DIRECT_SANDBOX      # opcional: "true" para sandbox
```

No admin → Frete, ative a modalidade **Entrega Uber (rápida)**. A cotação Uber exige endereço completo (rua, cidade, UF) no checkout.

## 4c. Super Frete (cotação + etiqueta BR)

Docs: [superfrete.readme.io](https://superfrete.readme.io/) · Token: painel → Integrações → Desenvolvedores.

```bash
wrangler secret put SUPERFRETE_TOKEN          # Bearer do ambiente (prod ou sandbox)
wrangler secret put SUPERFRETE_SANDBOX        # opcional: "true" → sandbox.superfrete.com
# wrangler secret put SUPERFRETE_AUTO_CHECKOUT  # opcional: "true" paga etiqueta com saldo na conta
# wrangler secret put SUPERFRETE_USER_AGENT    # opcional (padrão: SensorTattooFix + e-mail)
```

No admin → Frete, ative as modalidades **PAC / SEDEX / Mini Envios (Super Frete)** (ou adicione Jadlog/Loggi/J&T). Sem `SUPERFRETE_TOKEN` as opções não aparecem no checkout. Pedido pago cria etiqueta no carrinho Super Frete (`pending`); com `SUPERFRETE_AUTO_CHECKOUT=true` tenta pagar com saldo.

## 5. Deploy

```bash
wrangler deploy
```

Copie a URL (ex: `https://sensortattoofix-payments.xxx.workers.dev`) em:

- `js/config-bootstrap.js` → `configApiUrl`

## 6. Webhook Mercado Pago (PIX + cartão internacional)

O mesmo webhook confirma PIX e pagamentos do **Checkout Pro** (cartão internacional no exterior).

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

## 8c. Stripe (.com — cartão, Apple Pay, Google Pay)

No [Stripe Dashboard](https://dashboard.stripe.com/):

1. Ative **Apple Pay** e **Google Pay** em Settings → Payment methods
2. Verifique o domínio `www.sensortattoofix.com` em Settings → Apple Pay
3. Crie webhook → **URL:** `https://api.sensortattoofix.com.br/webhook/stripe`
4. Evento: `payment_intent.succeeded`

Secrets no Worker:

```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_PUBLISHABLE_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put STORE_URL    # https://www.sensortattoofix.com
```

Checkout `.com` cobra em **USD** (conversão via `/fx/rate`). Mercado BR (`.com.br`) permanece inalterado.

## 8d. PayPal embedded (.com)

No [PayPal Developer](https://developer.paypal.com/) → app Live:

- Ative **JavaScript SDK** (embedded buttons)
- Opcional: Apple Pay / Google Pay via PayPal SDK
- `PAYPAL_CLIENT_ID` já usado no Worker
- Return URL: `STORE_URL=https://www.sensortattoofix.com`

## 8e. Tabela fallback internacional

A tabela em **Admin → Frete** sincroniza sozinha com o simulador Exporta Fácil quando a API responde (ao abrir o admin ou em cada cotação no checkout). Serve só se a API dos Correios falhar.

## 9. Painéis

| URL | Função |
|-----|--------|
| `/admin.html` | Configurar preço, PIX, frete, modelos |
| `/pedidos.html` | Listar todos os pedidos |
| `/comprar.html` | Checkout do cliente |
| `/documentacao.html` | Manual de operação e URLs |

Usuário admin padrão: `admin` + senha definida em `ADMIN_PASSWORD`.
