#!/usr/bin/env node
/**
 * Smoke test: MP saldo com pendente > 0 via API (produção ou wrangler dev).
 * Uso: ADMIN_PASSWORD=... node api/scripts/smoke-mp-balance.mjs
 *      API_BASE=https://api.sensortattoofix.com.br (default)
 */
const API_BASE = (process.env.API_BASE || 'https://api.sensortattoofix.com.br').replace(/\/$/, '');
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

if (!ADMIN_PASSWORD) {
  console.error('Defina ADMIN_PASSWORD (secret do Worker).');
  process.exit(2);
}

const loginRes = await fetch(`${API_BASE}/admin/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASSWORD })
});
const login = await loginRes.json().catch(() => ({}));
if (!login.token) {
  console.error('Login falhou:', login.error || login);
  process.exit(1);
}

const balRes = await fetch(`${API_BASE}/admin/integrations-status?refreshBalances=1`, {
  headers: { Authorization: `Bearer ${login.token}` },
  cache: 'no-store'
});
const data = await balRes.json().catch(() => ({}));
if (!balRes.ok) {
  console.error('Saldos falharam:', data.error || data);
  process.exit(1);
}

const mp = data?.paymentBalances?.mercadopago;
const amounts = mp?.amounts || [];
const avail = amounts.find((a) => a.kind === 'available');
const pend = amounts.find((a) => a.kind === 'pending');
const out = {
  api: API_BASE,
  disponivel: avail?.value ?? null,
  pendente: pend?.value ?? null,
  asOf: mp?.asOf || null
};
console.log(JSON.stringify(out, null, 2));

if (!(Number(out.disponivel) > 0)) {
  console.error('FAIL: disponível inválido');
  process.exit(1);
}
if (!(Number(out.pendente) > 0)) {
  console.error('FAIL: pendente vazio ou zero');
  process.exit(1);
}
console.log('PASS: MP pendente OK');
