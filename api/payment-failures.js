/**
 * Payment failure log + shop e-mail alerts.
 * KV: payment_fail:<id> + payment_fails:index (newest first).
 */

export const PAY_FAIL_INDEX_KEY = 'payment_fails:index';
export const PAY_FAIL_KEY_PREFIX = 'payment_fail:';
export const PAY_FAIL_EMAIL_GATE_KEY = 'payment_fail:email_gate';
export const PAY_FAIL_INDEX_MAX = 80;
/** Min gap between shop alert e-mails (avoid flood). Failures are always logged. */
export const PAY_FAIL_EMAIL_COOLDOWN_MS = 3 * 60 * 1000;

function clip(s, max = 500) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

function cleanProvider(p) {
  const v = String(p || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const ok = new Set(['paypal', 'stripe', 'pix', 'mp', 'asaas', 'card', 'order', 'unknown']);
  return ok.has(v) ? v : 'unknown';
}

function cleanStage(s) {
  const v = String(s || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const ok = new Set([
    'create', 'capture', 'confirm', 'sdk', 'ui', 'intent', 'webhook', 'return', 'mount', 'other'
  ]);
  return ok.has(v) ? v : 'other';
}

export function normalizePaymentFailureInput(body, meta = {}) {
  const orderId = clip(body?.orderId || body?.order_id || '', 64);
  const provider = cleanProvider(body?.provider || body?.gateway);
  const stage = cleanStage(body?.stage || body?.step);
  const message = clip(body?.message || body?.error || body?.reason || 'Falha de pagamento', 500);
  const lang = clip(body?.lang || body?.locale || '', 12).toLowerCase();
  let href = clip(body?.href || body?.path || '', 200);
  try {
    if (href.startsWith('http')) href = new URL(href).pathname + (new URL(href).search || '');
  } catch (_) { /* keep */ }
  const currency = clip(body?.currency || body?.chargeCurrency || '', 8).toUpperCase();
  const email = clip(body?.email || '', 120).toLowerCase();
  const nome = clip(body?.nome || body?.name || '', 120);
  return {
    id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    at: new Date().toISOString(),
    orderId: orderId || null,
    provider,
    stage,
    message,
    lang: lang || null,
    href: href || null,
    currency: currency || null,
    email: email || null,
    nome: nome || null,
    ip: meta.ip || null,
    host: meta.host || null,
    source: clip(body?.source || meta.source || 'client', 40) || 'client'
  };
}

async function readIndex(env) {
  if (!env?.STORE_KV) return [];
  try {
    const raw = await env.STORE_KV.get(PAY_FAIL_INDEX_KEY, 'json');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

async function writeIndex(env, list) {
  if (!env?.STORE_KV) return;
  await env.STORE_KV.put(PAY_FAIL_INDEX_KEY, JSON.stringify(list.slice(0, PAY_FAIL_INDEX_MAX)));
}

/**
 * Persist failure + optionally e-mail the shop.
 * @param {function} notifyShopFn - (env, config, subject, fields, content) => Promise
 */
export async function recordPaymentFailure(env, config, raw, meta, notifyShopFn) {
  if (!env?.STORE_KV) {
    return { ok: false, error: 'KV unavailable' };
  }
  const entry = normalizePaymentFailureInput(raw, meta);
  try {
    await env.STORE_KV.put(
      PAY_FAIL_KEY_PREFIX + entry.id,
      JSON.stringify(entry),
      { expirationTtl: 60 * 60 * 24 * 45 } // ~45 days
    );
  } catch (err) {
    return { ok: false, error: err.message || 'KV put failed' };
  }

  const index = await readIndex(env);
  index.unshift({
    id: entry.id,
    ts: entry.ts,
    at: entry.at,
    orderId: entry.orderId,
    provider: entry.provider,
    stage: entry.stage,
    message: entry.message,
    lang: entry.lang,
    currency: entry.currency,
    email: entry.email,
    nome: entry.nome,
    href: entry.href,
    source: entry.source
  });
  try {
    await writeIndex(env, index);
  } catch (_) { /* index best-effort */ }

  let emailed = false;
  if (typeof notifyShopFn === 'function' && config) {
    try {
      let gate = null;
      try { gate = await env.STORE_KV.get(PAY_FAIL_EMAIL_GATE_KEY, 'json'); } catch (_) { /* ignore */ }
      const lastAt = Number(gate?.at) || 0;
      const now = Date.now();
      if (now - lastAt >= PAY_FAIL_EMAIL_COOLDOWN_MS) {
        const subject = `⚠️ Pagamento falhou — ${entry.provider.toUpperCase()} (${entry.stage})`;
        const fields = {
          Quando: entry.at,
          Provedor: entry.provider,
          Etapa: entry.stage,
          Mensagem: entry.message,
          Pedido: entry.orderId || '—',
          Moeda: entry.currency || '—',
          Idioma: entry.lang || '—',
          Cliente: entry.nome || '—',
          Email: entry.email || '—',
          Página: entry.href || '—',
          Origem: entry.source,
          Host: entry.host || '—'
        };
        const content = {
          title: 'Tentativa de pagamento com falha',
          intro: 'Alguém tentou pagar na loja e o fluxo falhou. Vale checar PayPal/Stripe/PIX e o pedido (se houver).',
          footer: `Log id: ${entry.id}`
        };
        const mail = await notifyShopFn(env, config, subject, fields, content);
        emailed = !!(mail && mail.ok);
        if (emailed) {
          await env.STORE_KV.put(
            PAY_FAIL_EMAIL_GATE_KEY,
            JSON.stringify({ at: now, id: entry.id }),
            { expirationTtl: 60 * 60 * 24 }
          ).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('payment-fail email:', err.message);
    }
  }

  return { ok: true, id: entry.id, emailed, unreadHint: true };
}

export async function listPaymentFailures(env, { limit = 40 } = {}) {
  const index = await readIndex(env);
  const lim = Math.min(100, Math.max(1, Number(limit) || 40));
  const items = index.slice(0, lim);
  const since24h = Date.now() - 24 * 60 * 60 * 1000;
  const last24h = index.filter((x) => Number(x.ts) >= since24h);
  const byProvider = {};
  for (const x of last24h) {
    const p = x.provider || 'unknown';
    byProvider[p] = (byProvider[p] || 0) + 1;
  }
  return {
    items,
    total: index.length,
    last24h: last24h.length,
    byProvider,
    latestAt: items[0]?.at || null
  };
}
