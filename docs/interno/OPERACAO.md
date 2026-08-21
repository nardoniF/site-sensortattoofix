# Manual de operação — Sensor Tattoo Fix

Versão para o repositório (espelho de [documentacao.html](../documentacao.html)).

**Acesso no navegador:** https://www.sensortattoofix.com.br/documentacao.html (exige login do admin)  
**No admin:** aba **Documentação** ou link na barra superior.

---

## Site e painéis

| O quê | URL |
|-------|-----|
| Site | https://www.sensortattoofix.com.br |
| Checkout | /comprar.html |
| Admin | /admin.html |
| Pedidos | /pedidos.html |
| Documentação | /documentacao.html |
| GitHub | https://github.com/nardoniF/site-sensortattoofix |

Login admin/pedidos: `admin` + secret `ADMIN_PASSWORD` (mín. 16 caracteres — ver rotação abaixo).

### Trocar senha do admin (recomendado 1×/ano ou se suspeitar de vazamento)

```bash
./scripts/rotate-admin-password.sh
```

Ou com senha escolhida por você (mín. 16 caracteres):

```bash
./scripts/rotate-admin-password.sh 'SuaSenhaForteCom20Chars'
```

Opcional: troque também o usuário padrão `admin` em `api/wrangler.toml` (`ADMIN_USERNAME`) e rode `wrangler deploy` em `api/`.

---

## API (Worker)

- Base: `https://sensortattoofix-payments.sensortattoofix.workers.dev`
- Config em `js/config-bootstrap.js`
- Cloudflare: https://dash.cloudflare.com

---

## Integrações — painéis externos

| Serviço | Função | URL |
|---------|--------|-----|
| Mercado Pago | PIX Brasil | https://www.mercadopago.com.br/developers/panel/app |
| Asaas | Cartão crédito BR | https://www.asaas.com |
| PayPal | Pagamentos internacionais | https://developer.paypal.com/dashboard/ |
| Stripe | Cartão internacional | https://dashboard.stripe.com |
| Mercado Livre | Marketplace BR | https://www.mercadolivre.com.br |
| Amazon SP-API | Marketplace BR/intl | https://sellercentral.amazon.com.br |
| Shopee | Marketplace BR | https://seller.shopee.com.br |
| Meu Correios | Conta CNPJ | https://meucorreios.correios.com.br |
| Correios Empresas | Contrato | https://empresas.correios.com.br |
| CWS (API Correios) | Código de acesso API | https://cws.correios.com.br |
| Contratar Correios | Clube / planos | https://www.correios.com.br/correios-empresas |
| CADESP (IE SP) | Inscrição estadual | https://www.cadesp.fazenda.sp.gov.br |
| Resend | E-mails transacionais | https://resend.com |
| Z-API | WhatsApp automático | https://z-api.io |
| GA4 | Métricas | https://analytics.google.com |

---

## Pagamentos

### Stripe

Pagamentos com cartão internacional. Endpoints Worker:
- `POST /orders/{id}/stripe/payment-intent`
- `POST /orders/{id}/stripe/checkout-session`
- `POST /webhook/stripe`

Secrets: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.

---

## Cupons e comissionados

- Criação: Admin → Cupons → Novo cupom.
- Campos: código, desconto (% ou R$), comissionado (nome + e-mail + %), validade.
- Ao vender com cupom: Worker envia e-mail automático ao comissionado.
- Página pública de cadastro: `/comissionado.html`.

---

## Vendas dos marketplaces

| Marketplace | Lookback padrão | Dados mantidos |
|-------------|-----------------|----------------|
| Mercado Livre | 400 dias | Desde início (sem TTL) |
| Amazon SP-API | 90 dias (janela de import) | Desde início (sem TTL) |
| Shopee | 90 dias (janela de import) | Desde início (sem TTL) |

- Sync automático: cron no Worker, mínimo 1h de intervalo.
- Sync manual: Admin → Vendas → botão Sincronizar.
- Comparação YoY disponível no consolidado.
- Exportação Excel: aba por marketplace + resumo + Flex a pagar.

### Flex ML — a pagar

- Admin → Vendas → seção "Flex a pagar" (colapsável).
- Custo configurável em Admin → Frete → "Custo Flex por envio".
- Bônus ML calculado via `api/ml-settlement.js` (`mlFlexBonusFromCosts`).
- Settlement versão 9 — fonte de frete: `senders[].cost` → repair → implícito → não resolvido.

---

## Comunidade (fórum)

- Página pública: `/comunidade.html`.
- Modo beta (padrão): só usuários `tester`.
- Liberar para todos: Admin → Comunidade → toggle.
- Moderação, tópicos exemplo e busca de tópicos relacionados via aba Comunidade do admin.

---

## Testes unitários

```bash
cd api
node --test *.test.js
# Esperado: 0 fail
```

Arquivos: `kv-meter`, `order-financials`, `order-normalizer`, `sales-money`, `store-products-core`, `ml-settlement`, `shopee-settlement`, `amazon-settlement`, `store-rules` (cupons/frete), `forum` + `forum-seeds`, `d1-store`, `commissioner-banners`, `clicks-retention`, `front-scripts` (PIX, origem, película).

---

## Secrets (Worker)

Ver tabela completa em [documentacao.html](../documentacao.html#secrets).  
Deploy: `api/DEPLOY.md`.

---

## Webhooks

Base Worker + `/webhook/mercadopago`, `/webhook/asaas`, `/webhook/paypal`.

---

## Frete

- **BR Correios:** Mini Envios / serviços do cartão (quando `CORREIOS_*` no Worker).
- **BR Super Frete:** PAC, SEDEX, Mini, Jadlog, Loggi — secret `SUPERFRETE_TOKEN`; só checkout Brasil.
- **BR Uber Direct / motoboy:** entrega local (secrets Uber + cadastro motoboy no admin).
- **Internacional:** Exporta Fácil + fallback no admin (etiqueta/rastreio manual quando a API intl não gera).

### Checklist ao incluir uma API nova

1. Secret(s) no Worker + linha em `api/DEPLOY.md`
2. Linha em **Admin → API → Status das integrações** (`INTEGRATION_ROW_ORDER` + probe em `buildIntegrationRows`)
3. Uso no fluxo real (checkout / pedido / e-mail)
4. Texto de ajuda no admin + favoritos/docs se houver painel externo

---

## Uber Direct

Implementado. Painel: https://direct.uber.com · docs: https://developer.uber.com/docs/deliveries

## Super Frete

Implementado (só BR). Token: https://web.superfrete.com/#/integrations · docs: https://superfrete.readme.io/

---

## Backup e recuperação

| Camada | O quê | Frequência |
|--------|-------|------------|
| **Git `main`** | Site estático (HTML/JS/CSS) | A cada deploy |
| **Branch `stable`** | Último snapshot estável aprovado | Ao rodar backup |
| **Tag `backup-AAAA-MM-DD`** | Ponto fixo para voltar no tempo | Ao rodar backup |
| **KV Cloudflare** | Pedidos, clientes, config da loja | Export manual semanal |
| **Admin** | JSON da loja + CSV de pedidos | Semanal |

### Criar backup Git (stable + tag)

Na raiz do repositório, com tudo commitado em `main`:

```bash
./scripts/backup-release.sh
```

### Restaurar site após problema

```bash
git fetch origin
git checkout backup-2026-06-13   # ou a tag desejada
# ou: git checkout stable && git push origin HEAD:main  (cuidado — sobrescreve main)
```

### Segurança de login

- **Admin** e **Minha Conta**: 5 tentativas erradas → bloqueio 30 min por IP (Worker).
- Secrets só no Cloudflare (`wrangler secret`), nunca no Git.

---

## 2FA (autenticação em duas etapas)

Ative em **todas** as contas abaixo. Prefira **app autenticador** (Google Authenticator, Authy, 1Password) em vez de SMS.

| Conta | Onde | Link |
|-------|------|------|
| GitHub (código do site) | Settings → Password and authentication | https://github.com/settings/security |
| Cloudflare (Worker + DNS) | My Profile → Authentication | https://dash.cloudflare.com/profile/authentication |
| Domínio `.com.br` | Registro.br → Segurança | https://registro.br |

### GitHub

1. Acesse **Settings** → **Password and authentication** → **Two-factor authentication**.
2. Escolha **Authenticator app** (recomendado).
3. Escaneie o QR no app e confirme o código.
4. **Baixe os recovery codes** e guarde offline (pasta segura ou cofre).
5. Em **Sessions**, revogue sessões antigas se trocar de computador.

### Cloudflare

1. Login em https://dash.cloudflare.com
2. Ícone do perfil (canto superior direito) → **My Profile** → **Authentication**.
3. Ative **Two-Factor Authentication** com app autenticador.
4. Salve os **backup codes** da Cloudflare.
5. Confirme que a conta que tem o Worker `sensortattoofix-payments` e o KV está protegida.

### Registro.br (domínio sensortattoofix.com.br)

1. Login em https://registro.br
2. Menu do domínio → **Segurança** / configurações da conta.
3. Ative **verificação em duas etapas** (quando disponível na conta).
4. Ative **bloqueio de transferência** do domínio (impede mudar titular sem procedimento).
5. Confirme que o **e-mail de contato** do domínio é seu e está ativo (recuperação).

### Depois de ativar

- Guarde recovery codes em local **fora** do Git e do e-mail da loja.
- Não compartilhe códigos 2FA por WhatsApp.
- Se o DNS estiver na Cloudflare, proteger **GitHub + Cloudflare + Registro.br** cobre site, API e domínio.
