/**
 * Saldo Shopee — carteira (disponível) + pedidos confirmados ainda não liberados (a receber).
 * "A receber" ≠ total de vendas: só pedidos pagos em trânsito/confirmação (status Shopee).
 */

export const SHOPEE_AWAITING_RELEASE_STATUSES = new Set([
  'READY_TO_SHIP',
  'PROCESSED',
  'SHIPPED',
  'TO_CONFIRM_RECEIVE'
]);

export const SHOPEE_AWAITING_RELEASE_LABEL = 'Pronto p/ enviar · Processado · Enviado · Aguardando confirmação';

function roundMoney(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function formatBrl(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * @param {object} data
 * @param {number|null} data.available
 * @param {number} data.toReceive
 * @param {number} data.toReceiveCount
 * @param {string|null} data.lastSyncedAt
 */
export function formatShopeeBalanceResult(data) {
  if (!data?.ok) {
    return {
      ok: false,
      lines: [data?.error || 'Saldo Shopee indisponível.'],
      amounts: [],
      error: data?.error || null,
      asOf: null
    };
  }

  const lines = [];
  const amounts = [];

  if (Number.isFinite(data.available)) {
    lines.push(`Disponível: ${formatBrl(data.available)}`);
    lines.push('Fonte disponível: carteira Shopee (wallet)');
    amounts.push({ kind: 'available', currency: 'BRL', value: data.available });
  } else {
    lines.push('Disponível: indisponível via API wallet');
  }

  if (Number.isFinite(data.toReceive) && data.toReceive >= 0) {
    lines.push(`A receber: ${formatBrl(data.toReceive)}`);
    lines.push(`Fonte a receber: ${data.toReceiveCount || 0} pedido(s) confirmado(s) — ${SHOPEE_AWAITING_RELEASE_LABEL}`);
    lines.push('Não inclui vendas totais nem pedidos já concluídos/liberados.');
    if (data.toReceive > 0) {
      amounts.push({ kind: 'pending', currency: 'BRL', value: data.toReceive });
    }
  }

  if (data.lastSyncedAt) {
    try {
      const when = new Date(data.lastSyncedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      lines.push(`Índice de pedidos atualizado: ${when}`);
    } catch { /* ignore */ }
  } else {
    lines.push('Dica: sincronize pedidos em Vendas → Shopee para atualizar “A receber”.');
  }

  return {
    ok: Number.isFinite(data.available) || (Number(data.toReceive) >= 0),
    lines,
    amounts,
    asOf: data.asOf || new Date().toISOString(),
    error: null
  };
}

/**
 * @param {object} deps
 * @param {Function} deps.shopeeShopGet
 * @param {string} deps.token
 * @param {string} deps.shopId
 * @param {object} deps.env
 */
export async function fetchShopeeWalletAvailable(deps) {
  const now = Math.floor(Date.now() / 1000);
  const data = await deps.shopeeShopGet(deps.env, '/api/v2/payment/get_wallet_transaction_list', deps.token, deps.shopId, {
    page_no: '1',
    page_size: '40',
    create_time_from: String(now - 15 * 86400),
    create_time_to: String(now)
  });
  const list = Array.isArray(data.response?.transaction_list) ? data.response.transaction_list : [];
  if (!list.length) return null;
  list.sort((a, b) => Number(b.create_time || 0) - Number(a.create_time || 0));
  const bal = Number(list[0].current_balance);
  return Number.isFinite(bal) ? roundMoney(bal) : null;
}

/**
 * @param {string[]} index
 * @param {Function} loadSale - async (orderSn) => sale | null
 * @param {number} [maxScan]
 */
export async function sumShopeeToReceiveFromIndex(index, loadSale, maxScan = 2000) {
  let total = 0;
  let count = 0;
  const scanned = (index || []).slice(0, maxScan);
  for (const sn of scanned) {
    const sale = await loadSale(sn);
    const status = String(sale?.status || '');
    if (!SHOPEE_AWAITING_RELEASE_STATUSES.has(status)) continue;
    const net = Number(sale?.net ?? sale?.payoutNet ?? 0);
    if (!Number.isFinite(net) || net <= 0) continue;
    total += net;
    count += 1;
  }
  return { toReceive: roundMoney(total), count, scanned: scanned.length };
}
