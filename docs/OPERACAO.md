# Manual de operação — Sensor TattooFix

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

Login admin/pedidos: `admin` + secret `ADMIN_PASSWORD`.

---

## API (Worker)

- Base: `https://sensortattoofix-payments.sensortattoofix.workers.dev`
- Config em `js/config-bootstrap.js`
- Cloudflare: https://dash.cloudflare.com

---

## Integrações — painéis externos

| Serviço | URL |
|---------|-----|
| Mercado Pago | https://www.mercadopago.com.br/developers/panel/app |
| Asaas | https://www.asaas.com |
| PayPal | https://developer.paypal.com/dashboard/ |
| Meu Correios | https://meucorreios.correios.com.br |
| Correios Empresas | https://empresas.correios.com.br |
| CWS (API Correios) | https://cws.correios.com.br |
| Contratar Correios | https://www.correios.com.br/correios-empresas |
| CADESP (IE SP) | https://www.cadesp.fazenda.sp.gov.br |
| Resend | https://resend.com |
| Z-API | https://z-api.io |
| GA4 | https://analytics.google.com |

---

## Secrets (Worker)

Ver tabela completa em [documentacao.html](../documentacao.html#secrets).  
Deploy: `api/DEPLOY.md`.

---

## Webhooks

Base Worker + `/webhook/mercadopago`, `/webhook/asaas`, `/webhook/paypal`.

---

## Frete

- **BR sem Correios:** estimativa fixa (checkout funciona).
- **BR com Correios:** API Mini Envios após contrato + cartão.
- **Internacional:** Exporta Fácil + fallback no admin.

---

## Uber Direct (planejado)

Não implementado. Referência: https://direct.uber.com · direct-pt@uber.com
