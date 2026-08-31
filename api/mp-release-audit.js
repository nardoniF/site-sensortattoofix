/**
 * Auditoria transacional MP — "Dinheiro a liberar"
 * Endpoint debug/admin only. Não altera saldo exibido em produção.
 *
 * Cloudflare Workers: ~50 subrequests/invocação. Usamos só /search (+ users/me);
 * detalhe GET /payments/{id} só quando o resumo da busca não traz net_received.
 */

const MP_AUDIT_SUBREQUEST_BUDGET = 46;

function roundMoney(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function createSubrequestTracker(budget = MP_AUDIT_SUBREQUEST_BUDGET) {
  let used = 0;
  return {
    used: () => used,
    remaining: () => Math.max(0, budget - used),
    fetch: async (url, init) => {
      if (used >= budget) {
        const err = new Error(`Subrequest budget exhausted (${budget})`);
        err.code = 'SUBREQUEST_BUDGET';
        throw err;
      }
      used += 1;
      return fetch(url, init);
    }
  };
}

function parseMpDateMs(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 1e9) return n < 1e12 ? n * 1000 : n;
  const ms = Date.parse(String(raw));
  return Number.isFinite(ms) ? ms : null;
}

async function mpSearchPayments(tracker, token, params, offset = 0, limit = 100) {
  const qs = new URLSearchParams({ ...params, offset: String(offset), limit: String(limit) });
  const res = await tracker.fetch(`https://api.mercadopago.com/v1/payments/search?${qs}`, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data.message || data.error || `HTTP ${res.status}`, results: [], total: 0 };
  }
  return {
    ok: true,
    results: data.results || [],
    total: Number(data?.paging?.total) || 0,
    paging: data.paging || {}
  };
}

async function mpFetchPayment(tracker, token, paymentId) {
  const res = await tracker.fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(paymentId))}`, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.message || `HTTP ${res.status}`, payment: null };
  return { ok: true, payment: data };
}

function mpPaymentNetAmountStrict(payment) {
  const net = Number(payment?.transaction_details?.net_received_amount);
  return Number.isFinite(net) && net > 0 ? net : null;
}

function mpPaymentIsPendingRelease(payment, collectorId) {
  if (String(payment?.status || '').toLowerCase() !== 'approved') return false;
  if (collectorId != null && payment?.collector_id != null
    && String(payment.collector_id) !== String(collectorId)) {
    return false;
  }
  return String(payment?.money_release_status || '').toLowerCase() === 'pending';
}

function extractAuditPayment(payment, meta = {}) {
  const td = payment?.transaction_details || {};
  const releaseMs = parseMpDateMs(payment?.money_release_date);
  const nowMs = meta.nowMs || Date.now();
  const net = mpPaymentNetAmountStrict(payment);
  const txnAmt = Number(payment?.transaction_amount);
  const refunded = Number(payment?.transaction_amount_refunded || 0);
  const collectorId = meta.collectorId ?? null;

  return {
    id: payment?.id != null ? String(payment.id) : null,
    status: payment?.status || null,
    status_detail: payment?.status_detail || null,
    date_created: payment?.date_created || null,
    date_approved: payment?.date_approved || null,
    money_release_date: payment?.money_release_date || null,
    money_release_status: payment?.money_release_status || null,
    transaction_amount: Number.isFinite(txnAmt) ? roundMoney(txnAmt) : null,
    net_received_amount: net != null ? roundMoney(net) : null,
    total_paid_amount: td.total_paid_amount != null ? roundMoney(Number(td.total_paid_amount)) : null,
    installment_amount: td.installment_amount != null ? roundMoney(Number(td.installment_amount)) : null,
    financial_institution: td.financial_institution || null,
    collector_id: payment?.collector_id != null ? String(payment.collector_id) : null,
    payer: payment?.payer || null,
    payment_type_id: payment?.payment_type_id || null,
    operation_type: payment?.operation_type || null,
    live_mode: payment?.live_mode,
    transaction_amount_refunded: Number.isFinite(refunded) ? roundMoney(refunded) : 0,
    refunds: payment?.refunds || [],
    transaction_details: td,
    money_release_future: releaseMs != null && releaseMs > nowMs,
    money_release_past_or_now: releaseMs != null && releaseMs <= nowMs,
    inProductionPendingSum: mpPaymentIsPendingRelease(payment, collectorId) && net != null,
    productionPendingNet: mpPaymentIsPendingRelease(payment, collectorId) && net != null ? roundMoney(net) : 0,
    foundInSearches: meta.foundInSearches || [],
    searchHitCount: (meta.foundInSearches || []).length
  };
}

const AUDIT_SEARCHES = [
  {
    key: 'approved_money_release_window',
    label: 'approved · money_release_date NOW→+120d (produção)',
    params: {
      sort: 'money_release_date',
      criteria: 'asc',
      range: 'money_release_date',
      begin_date: 'NOW',
      end_date: 'NOW+120DAYS',
      status: 'approved'
    }
  },
  {
    key: 'approved_date_approved_year',
    label: 'approved · date_approved últimos 365d',
    params: {
      sort: 'date_approved',
      criteria: 'desc',
      range: 'date_approved',
      begin_date: 'NOW-365DAYS',
      end_date: 'NOW',
      status: 'approved'
    }
  },
  {
    key: 'pending_date_created_year',
    label: 'pending · date_created últimos 365d',
    params: {
      sort: 'date_created',
      criteria: 'desc',
      range: 'date_created',
      begin_date: 'NOW-365DAYS',
      end_date: 'NOW',
      status: 'pending'
    }
  },
  {
    key: 'in_process_date_created_year',
    label: 'in_process · date_created últimos 365d',
    params: {
      sort: 'date_created',
      criteria: 'desc',
      range: 'date_created',
      begin_date: 'NOW-365DAYS',
      end_date: 'NOW',
      status: 'in_process'
    }
  },
  {
    key: 'authorized_date_created_year',
    label: 'authorized · date_created últimos 365d',
    params: {
      sort: 'date_created',
      criteria: 'desc',
      range: 'date_created',
      begin_date: 'NOW-365DAYS',
      end_date: 'NOW',
      status: 'authorized'
    }
  }
];

async function collectPaymentIndex(tracker, token, opts = {}) {
  const maxPagesPerSearch = Number(opts.maxPagesPerSearch) || 3;
  const pageLimit = Number(opts.pageLimit) || 100;
  const index = new Map();
  const searchStats = [];

  for (const spec of AUDIT_SEARCHES) {
    let offset = 0;
    let pages = 0;
    let hits = 0;
    let total = null;
    let lastError = null;

    while (pages < maxPagesPerSearch) {
      if (tracker.remaining() < 2) {
        lastError = lastError || 'Subrequest budget exhausted during search';
        break;
      }
      const page = await mpSearchPayments(tracker, token, spec.params, offset, pageLimit);
      pages += 1;
      if (!page.ok) {
        lastError = page.error;
        break;
      }
      total = page.total;
      for (const p of page.results) {
        const id = p?.id != null ? String(p.id) : '';
        if (!id) continue;
        hits += 1;
        const prev = index.get(id) || { id, searchHits: [], summary: null };
        if (!prev.searchHits.includes(spec.key)) prev.searchHits.push(spec.key);
        if (!prev.summary) prev.summary = p;
        index.set(id, prev);
      }
      offset += pageLimit;
      if (page.results.length < pageLimit) break;
      if (Number.isFinite(page.total) && offset >= page.total) break;
    }

    searchStats.push({
      key: spec.key,
      label: spec.label,
      pagesFetched: pages,
      hits,
      totalReported: total,
      error: lastError
    });
  }

  return { index, searchStats };
}

function sumRows(rows, pickAmount) {
  let count = 0;
  let total = 0;
  const ids = [];
  for (const row of rows) {
    const amt = pickAmount(row);
    if (amt == null || !Number.isFinite(amt) || amt <= 0) continue;
    count += 1;
    total += amt;
    ids.push(row.id);
  }
  return { count, total: roundMoney(total), ids };
}

function computeBuckets(rows) {
  const approved = rows.filter((r) => String(r.status).toLowerCase() === 'approved');
  const pendingStatus = rows.filter((r) => String(r.status).toLowerCase() === 'pending');
  const inProcess = rows.filter((r) => String(r.status).toLowerCase() === 'in_process');
  const authorized = rows.filter((r) => String(r.status).toLowerCase() === 'authorized');

  return {
    A_sum_transaction_amount_all: sumRows(rows, (r) => r.transaction_amount),
    B_sum_net_received_all: sumRows(rows, (r) => r.net_received_amount),
    C_sum_net_money_release_status_pending: sumRows(
      approved.filter((r) => String(r.money_release_status).toLowerCase() === 'pending'),
      (r) => r.net_received_amount
    ),
    D_sum_net_approved_future_release: sumRows(
      approved.filter((r) => r.money_release_future),
      (r) => r.net_received_amount
    ),
    E_sum_net_approved_pending_and_future: sumRows(
      approved.filter((r) => String(r.money_release_status).toLowerCase() === 'pending' && r.money_release_future),
      (r) => r.net_received_amount
    ),
    F_production_current_algorithm: sumRows(
      rows.filter((r) => r.inProductionPendingSum),
      (r) => r.productionPendingNet
    ),
    G_sum_net_pending_status: sumRows(pendingStatus, (r) => r.net_received_amount),
    H_sum_net_in_process: sumRows(inProcess, (r) => r.net_received_amount),
    I_sum_net_authorized: sumRows(authorized, (r) => r.net_received_amount),
    J_sum_net_approved_pending_not_future: sumRows(
      approved.filter((r) => String(r.money_release_status).toLowerCase() === 'pending' && !r.money_release_future),
      (r) => r.net_received_amount
    ),
    K_sum_net_approved_future_not_pending_status: sumRows(
      approved.filter((r) => r.money_release_future && String(r.money_release_status).toLowerCase() !== 'pending'),
      (r) => r.net_received_amount
    ),
    L_sum_net_with_refunds_excluded: sumRows(
      rows.filter((r) => r.inProductionPendingSum && !(Number(r.transaction_amount_refunded) > 0)),
      (r) => r.productionPendingNet
    )
  };
}

const CANDIDATE_RULES = [
  {
    id: 'prod_current',
    label: 'Produção atual: approved + money_release_status=pending + net>0'
  },
  {
    id: 'approved_pending_future_net',
    label: 'approved + pending + money_release_date futuro + net>0'
  },
  {
    id: 'approved_future_net',
    label: 'approved + money_release_date futuro + net>0'
  },
  {
    id: 'approved_pending_net_no_refund',
    label: 'produção atual excluindo transaction_amount_refunded>0'
  },
  {
    id: 'approved_pending_past_release',
    label: 'approved + pending + money_release_date passado + net>0'
  }
];

function ruleMatches(ruleId, row) {
  switch (ruleId) {
    case 'prod_current':
      return row.inProductionPendingSum;
    case 'approved_pending_future_net':
      return String(row.status).toLowerCase() === 'approved'
        && String(row.money_release_status).toLowerCase() === 'pending'
        && row.money_release_future
        && row.net_received_amount > 0;
    case 'approved_future_net':
      return String(row.status).toLowerCase() === 'approved'
        && row.money_release_future
        && row.net_received_amount > 0;
    case 'approved_pending_net_no_refund':
      return row.inProductionPendingSum && !(Number(row.transaction_amount_refunded) > 0);
    case 'approved_pending_past_release':
      return String(row.status).toLowerCase() === 'approved'
        && String(row.money_release_status).toLowerCase() === 'pending'
        && row.money_release_past_or_now
        && row.net_received_amount > 0;
    default:
      return false;
  }
}

function evaluateRules(rows, target) {
  return CANDIDATE_RULES.map((rule) => {
    const matched = rows.filter((r) => ruleMatches(rule.id, r));
    const sum = sumRows(matched, (r) => r.net_received_amount);
    return {
      ...rule,
      ...sum,
      deltaVsTarget: roundMoney(sum.total - target)
    };
  }).sort((a, b) => Math.abs(a.deltaVsTarget) - Math.abs(b.deltaVsTarget));
}

function buildExcessAnalysis(rows, target, productionRuleId = 'prod_current') {
  const productionRows = rows.filter((r) => ruleMatches(productionRuleId, r));
  const productionTotal = sumRows(productionRows, (r) => r.net_received_amount).total;
  const ruleRanking = evaluateRules(rows, target);
  const best = ruleRanking[0] || null;
  const bestRows = best ? rows.filter((r) => ruleMatches(best.id, r)) : [];
  const bestIds = new Set(bestRows.map((r) => r.id));
  const excessInProduction = productionRows
    .filter((r) => !bestIds.has(r.id))
    .map((r) => ({
      id: r.id,
      net_received_amount: r.net_received_amount,
      transaction_amount: r.transaction_amount,
      status: r.status,
      money_release_status: r.money_release_status,
      money_release_date: r.money_release_date,
      money_release_future: r.money_release_future,
      transaction_amount_refunded: r.transaction_amount_refunded,
      foundInSearches: r.foundInSearches,
      reason: `Entra na produção (${roundMoney(r.productionPendingNet)}) mas não na regra mais próxima do alvo: ${best?.id || '—'}`
    }));
  const missingFromProduction = bestRows
    .filter((r) => !ruleMatches(productionRuleId, r))
    .map((r) => ({
      id: r.id,
      net_received_amount: r.net_received_amount,
      status: r.status,
      money_release_status: r.money_release_status,
      money_release_date: r.money_release_date,
      reason: `Entra na regra ${best?.id} mas não na produção atual`
    }));

  return {
    target,
    productionRuleId,
    productionTotal,
    productionDeltaVsTarget: roundMoney(productionTotal - target),
    bestRule: best,
    excessInProduction,
    excessInProductionSum: roundMoney(excessInProduction.reduce((s, r) => s + Number(r.net_received_amount || 0), 0)),
    missingFromProduction,
    ruleRanking
  };
}

async function fetchOfficialBalance(tracker, token, userId) {
  const urls = [
    `https://api.mercadopago.com/users/${encodeURIComponent(userId)}/mercadopago_account/balance`
  ];
  for (const url of urls) {
    if (tracker.remaining() < 1) break;
    try {
      const res = await tracker.fetch(url, {
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) continue;
      return {
        ok: true,
        available_balance: Number(data.available_balance),
        unavailable_balance: Number(data.unavailable_balance),
        total_amount: Number(data.total_amount),
        currency_id: data.currency_id || 'BRL',
        last_modified: data.last_modified || null,
        raw: data
      };
    } catch { /* next */ }
  }
  return { ok: false, error: 'API /balance indisponível (403 ou erro)' };
}

/**
 * @param {object} env
 * @param {object} opts
 * @param {string} opts.token
 * @param {string|null} opts.collectorId
 * @param {number} opts.target - app oficial "Dinheiro a liberar"
 * @param {number} opts.maxDetailFetches
 * @param {number} opts.maxPagesPerSearch
 */
export async function runMpReleaseAudit(env, opts) {
  const token = opts.token;
  const collectorId = opts.collectorId || null;
  const target = Number(opts.target) > 0 ? Number(opts.target) : 766.6;
  const maxDetailFetches = Number(opts.maxDetailFetches) >= 0 ? Number(opts.maxDetailFetches) : 0;
  const maxPagesPerSearch = Number(opts.maxPagesPerSearch) > 0 ? Number(opts.maxPagesPerSearch) : 3;
  const includeBalance = opts.includeBalance === true;
  const nowMs = Date.now();
  const tracker = opts.tracker || createSubrequestTracker();

  const { index, searchStats } = await collectPaymentIndex(tracker, token, { maxPagesPerSearch });
  const ids = [...index.keys()];
  const payments = [];
  const fetchErrors = [];
  let detailFetches = 0;
  let usedSearchSummaries = 0;

  for (const id of ids) {
    const hit = index.get(id);
    const summary = hit?.summary;
    if (summary && mpPaymentNetAmountStrict(summary) != null) {
      usedSearchSummaries += 1;
      payments.push(extractAuditPayment(summary, {
        collectorId,
        nowMs,
        foundInSearches: hit?.searchHits || []
      }));
      continue;
    }
    if (detailFetches >= maxDetailFetches || tracker.remaining() < 1) continue;
    detailFetches += 1;
    const full = await mpFetchPayment(tracker, token, id);
    if (!full.ok || !full.payment) {
      fetchErrors.push({ id, error: full.error || 'fetch failed' });
      if (summary) {
        usedSearchSummaries += 1;
        payments.push(extractAuditPayment(summary, {
          collectorId,
          nowMs,
          foundInSearches: hit?.searchHits || []
        }));
      }
      continue;
    }
    payments.push(extractAuditPayment(full.payment, {
      collectorId,
      nowMs,
      foundInSearches: hit?.searchHits || []
    }));
  }

  const buckets = computeBuckets(payments);
  const analysis = buildExcessAnalysis(payments, target);
  const official = includeBalance && collectorId
    ? await fetchOfficialBalance(tracker, token, collectorId)
    : { ok: false, skipped: true, error: 'omitido (economia de subrequests)' };

  return {
    ok: true,
    auditAt: new Date().toISOString(),
    targetAppOficial: target,
    collectorId,
    officialBalance: official,
    searchStats,
    subrequests: {
      budget: MP_AUDIT_SUBREQUEST_BUDGET,
      used: tracker.used(),
      remaining: tracker.remaining()
    },
    coverage: {
      uniqueIdsFromSearch: ids.length,
      paymentsInReport: payments.length,
      usedSearchSummaries,
      detailFetches,
      maxDetailFetches,
      truncated: ids.length > payments.length,
      fetchErrors: fetchErrors.slice(0, 50)
    },
    buckets,
    analysis,
    payments
  };
}

export async function handleAdminMpReleaseAudit(request, env, origin, helpers) {
  const { isValidSession, bearerToken, json, mercadoPagoToken } = helpers;
  if (!(await isValidSession(env, bearerToken(request)))) {
    return json({ error: 'Não autorizado.' }, 401, origin);
  }
  const token = mercadoPagoToken(env);
  if (!token) {
    return json({ error: 'MP_ACCESS_TOKEN não configurado.' }, 400, origin);
  }

  const url = new URL(request.url);
  const target = Number(url.searchParams.get('target') || '766.6');
  const maxDetail = Number(url.searchParams.get('maxDetail') || '0');
  const maxPages = Number(url.searchParams.get('maxPages') || '3');
  const includePayments = url.searchParams.get('includePayments') !== '0';
  const includeBalance = url.searchParams.get('includeBalance') === '1';

  let collectorId = url.searchParams.get('collectorId');
  const tracker = createSubrequestTracker();
  if (!collectorId) {
    const meRes = await tracker.fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const me = await meRes.json().catch(() => ({}));
    if (me?.id != null) collectorId = String(me.id);
  }

  try {
    const report = await runMpReleaseAudit(env, {
      token,
      collectorId,
      target,
      maxDetailFetches: maxDetail,
      maxPagesPerSearch: maxPages,
      includeBalance,
      tracker
    });
    if (!includePayments) {
      const { payments, ...rest } = report;
      return json({ ...rest, paymentsCount: payments.length }, 200, origin);
    }
    return json(report, 200, origin);
  } catch (err) {
    return json({ error: err.message || String(err) }, 500, origin);
  }
}
