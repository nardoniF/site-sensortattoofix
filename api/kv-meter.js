/**
 * Cloudflare Free KV usage meter.
 * Prefer official account analytics (GraphQL) when CF_API_TOKEN is set;
 * otherwise fall back to a local Cache-edge estimate (imprecise across POPs).
 * Free limits reset daily at 00:00 UTC (= 21:00 Brasília).
 */

export const KV_FREE_WRITES_PER_DAY = 1000;
export const KV_FREE_READS_PER_DAY = 100000;
export const KV_FREE_DELETES_PER_DAY = 1000;
export const KV_FREE_LISTS_PER_DAY = 1000;

/** D1 Workers Free daily row limits (billing metrics). */
export const D1_FREE_ROWS_WRITTEN_PER_DAY = 100000;
export const D1_FREE_ROWS_READ_PER_DAY = 5000000;

const CF_USAGE_CACHE_TTL_SEC = 600; // 10 min — dashboard-grade, not live-to-the-second

export function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function nextUtcMidnightDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
}

function writesReq(day = utcDayKey()) {
  return new Request(`https://stf-internal/kv-writes/${day}`);
}

function legacyClickWritesReq(day = utcDayKey()) {
  return new Request(`https://stf-internal/kv-click-writes/${day}`);
}

function exhaustedReq(day = utcDayKey()) {
  return new Request(`https://stf-internal/kv-writes-exhausted/${day}`);
}

function cfUsageReq(day = utcDayKey()) {
  return new Request(`https://stf-internal/kv-cf-usage/${day}`);
}

function cfD1UsageReq(day = utcDayKey()) {
  return new Request(`https://stf-internal/d1-cf-usage/${day}`);
}

function resetFields() {
  const resetAt = nextUtcMidnightDate();
  const resetsAtBr = resetAt.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  return {
    resetsAt: resetAt.toISOString(),
    resetsAtBr,
    resetsHintBr: '21:00 (Brasília) / 00:00 UTC'
  };
}

function pctOf(used, limit) {
  if (!(limit > 0)) return 0;
  return Math.min(100, Math.round((Number(used) / limit) * 100));
}

export async function getKvWriteCounter(day = utcDayKey()) {
  try {
    const hit = await caches.default.match(writesReq(day));
    if (!hit) return 0;
    return Math.max(0, parseInt(await hit.text(), 10) || 0);
  } catch {
    return 0;
  }
}

/** Legacy click-only counter (pre-total meter). Used as a floor so today's UI does not drop. */
async function getLegacyClickWriteCounter(day = utcDayKey()) {
  try {
    const hit = await caches.default.match(legacyClickWritesReq(day));
    if (!hit) return 0;
    return Math.max(0, parseInt(await hit.text(), 10) || 0);
  } catch {
    return 0;
  }
}

export async function bumpKvWriteCounter(n = 1) {
  const day = utcDayKey();
  const req = writesReq(day);
  let count = 0;
  try {
    const hit = await caches.default.match(req);
    if (hit) count = parseInt(await hit.text(), 10) || 0;
  } catch (_) { /* ignore */ }
  count += Math.max(1, Number(n) || 1);
  try {
    await caches.default.put(req, new Response(String(count), {
      headers: { 'Cache-Control': 'max-age=172800' }
    }));
  } catch (_) { /* ignore */ }
  return count;
}

export async function markKvWriteQuotaExhausted() {
  const day = utcDayKey();
  try {
    await caches.default.put(
      exhaustedReq(day),
      new Response('1', { headers: { 'Cache-Control': 'max-age=172800' } })
    );
  } catch (_) { /* ignore */ }
}

export async function isKvWriteQuotaExhaustedMarked() {
  try {
    return !!(await caches.default.match(exhaustedReq()));
  } catch {
    return false;
  }
}

export function isKvQuotaError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return /429|quota|limit|put.*exceed|exceed.*put|write.*limit|delete.*exceed/i.test(msg);
}

function cfCredentials(env) {
  const accountId = String(env?.CF_ACCOUNT_ID || '').trim();
  const apiToken = String(env?.CF_API_TOKEN || '').trim();
  if (!accountId || !apiToken) return null;
  return { accountId, apiToken };
}

async function readCachedCfUsage(day) {
  try {
    const hit = await caches.default.match(cfUsageReq(day));
    if (!hit) return null;
    const data = await hit.json();
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

async function writeCachedCfUsage(day, payload) {
  try {
    await caches.default.put(
      cfUsageReq(day),
      new Response(JSON.stringify(payload), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${CF_USAGE_CACHE_TTL_SEC}`
        }
      })
    );
  } catch (_) { /* ignore */ }
}

/**
 * Same numbers as Dashboard → Workers KV (account-wide for the UTC day).
 * https://developers.cloudflare.com/kv/observability/metrics-analytics/
 */
export async function fetchCloudflareKvUsage(env, { forceRefresh = false } = {}) {
  const creds = cfCredentials(env);
  if (!creds) return null;

  const day = utcDayKey();
  if (!forceRefresh) {
    const cached = await readCachedCfUsage(day);
    if (cached?.source === 'cloudflare' && cached.refreshedAt) return cached;
  }

  const query = `query KvOps($accountTag: string!, $start: Date, $end: Date) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        kvOperationsAdaptiveGroups(
          filter: { date_geq: $start, date_leq: $end }
          limit: 100
        ) {
          sum { requests }
          dimensions { actionType }
        }
      }
    }
  }`;

  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      variables: {
        accountTag: creds.accountId,
        start: day,
        end: day
      }
    })
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.errors?.[0]?.message || body?.messages?.[0] || `HTTP ${res.status}`;
    throw new Error(`Cloudflare Analytics: ${msg}`);
  }
  if (Array.isArray(body.errors) && body.errors.length) {
    throw new Error(`Cloudflare Analytics: ${body.errors[0].message || 'GraphQL error'}`);
  }

  const groups = body?.data?.viewer?.accounts?.[0]?.kvOperationsAdaptiveGroups || [];
  let readsToday = 0;
  let writesToday = 0;
  let deletesToday = 0;
  let listsToday = 0;
  for (const row of groups) {
    const n = Number(row?.sum?.requests || 0) || 0;
    const action = String(row?.dimensions?.actionType || '').toLowerCase();
    if (action === 'read') readsToday += n;
    else if (action === 'write') writesToday += n;
    else if (action === 'delete') deletesToday += n;
    else if (action === 'list') listsToday += n;
  }

  const writeLimit = KV_FREE_WRITES_PER_DAY;
  const readLimit = KV_FREE_READS_PER_DAY;
  const deleteLimit = KV_FREE_DELETES_PER_DAY;
  const listLimit = KV_FREE_LISTS_PER_DAY;
  const percent = pctOf(writesToday, writeLimit);
  const readPercent = pctOf(readsToday, readLimit);
  const hardExhausted = await isKvWriteQuotaExhaustedMarked();
  const overFreeLimit = writesToday >= writeLimit;
  const resets = resetFields();

  const payload = {
    source: 'cloudflare',
    writesToday,
    readsToday,
    deletesToday,
    listsToday,
    clickWritesToday: writesToday,
    limit: writeLimit,
    writeLimit,
    readLimit,
    deleteLimit,
    listLimit,
    percent,
    readPercent,
    deletePercent: pctOf(deletesToday, deleteLimit),
    listPercent: pctOf(listsToday, listLimit),
    // "exhausted" = Worker actually got a KV quota/429 error — not merely analytics > 1000.
    // Free tier often soft-overages; checkout can still write while count shows 1.4k+.
    exhausted: hardExhausted,
    overFreeLimit,
    near: !hardExhausted && percent >= 70,
    critical: !hardExhausted && (percent >= 85 || overFreeLimit),
    refreshedAt: new Date().toISOString(),
    lagHint: 'Cloudflare Analytics (pode atrasar alguns minutos)',
    sources: 'conta Cloudflare — mesma fonte do dashboard Workers KV',
    ...resets
  };

  await writeCachedCfUsage(day, payload);
  return payload;
}

/** Local Cache-edge estimate (imprecise). Kept as fallback when CF token is missing. */
export async function buildLocalKvDailyWriteBudget() {
  const day = utcDayKey();
  const fromTotal = await getKvWriteCounter(day);
  const fromLegacyClicks = await getLegacyClickWriteCounter(day);
  const writesToday = Math.max(fromTotal, fromLegacyClicks);
  const limit = KV_FREE_WRITES_PER_DAY;
  const percent = pctOf(writesToday, limit);
  const exhausted = await isKvWriteQuotaExhaustedMarked();
  return {
    source: 'local_estimate',
    writesToday,
    clickWritesToday: writesToday,
    readsToday: null,
    deletesToday: null,
    listsToday: null,
    limit,
    writeLimit: limit,
    readLimit: KV_FREE_READS_PER_DAY,
    percent,
    readPercent: null,
    exhausted,
    overFreeLimit: writesToday >= limit,
    near: !exhausted && percent >= 70,
    critical: !exhausted && (percent >= 85 || writesToday >= limit),
    refreshedAt: new Date().toISOString(),
    lagHint: null,
    sources: 'estimativa local (imprecisa) — configure CF_API_TOKEN para números oficiais',
    ...resetFields()
  };
}

/**
 * Prefer Cloudflare GraphQL analytics; fall back to local estimate.
 * Pass env from the Worker so secrets/vars are available.
 */
export async function buildKvDailyWriteBudget(env) {
  if (env && cfCredentials(env)) {
    try {
      const cf = await fetchCloudflareKvUsage(env);
      if (cf) return cf;
    } catch (err) {
      console.warn('KV Cloudflare usage:', err.message || err);
      const local = await buildLocalKvDailyWriteBudget();
      return {
        ...local,
        cfError: String(err.message || err).slice(0, 200)
      };
    }
  }
  return buildLocalKvDailyWriteBudget();
}

async function readCachedD1Usage(day) {
  try {
    const hit = await caches.default.match(cfD1UsageReq(day));
    if (!hit) return null;
    const data = await hit.json();
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

async function writeCachedD1Usage(day, payload) {
  try {
    await caches.default.put(
      cfD1UsageReq(day),
      new Response(JSON.stringify(payload), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${CF_USAGE_CACHE_TTL_SEC}`
        }
      })
    );
  } catch (_) { /* ignore */ }
}

function d1DatabaseId(env) {
  return String(env?.CF_D1_DATABASE_ID || env?.CLICKS_D1_ID || '').trim();
}

/**
 * Same numbers as Dashboard → D1 → Metrics (rows read/written for the UTC day).
 * https://developers.cloudflare.com/d1/observability/metrics-analytics/
 */
export async function fetchCloudflareD1Usage(env, { forceRefresh = false } = {}) {
  const creds = cfCredentials(env);
  if (!creds) return null;
  const databaseId = d1DatabaseId(env);
  if (!databaseId) return null;

  const day = utcDayKey();
  if (!forceRefresh) {
    const cached = await readCachedD1Usage(day);
    if (cached?.source === 'cloudflare' && cached.refreshedAt) return cached;
  }

  const query = `query D1Ops($accountTag: string!, $start: Date, $end: Date, $databaseId: string) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        d1AnalyticsAdaptiveGroups(
          filter: { date_geq: $start, date_leq: $end, databaseId: $databaseId }
          limit: 100
        ) {
          sum {
            rowsRead
            rowsWritten
            readQueries
            writeQueries
          }
        }
      }
    }
  }`;

  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      variables: {
        accountTag: creds.accountId,
        start: day,
        end: day,
        databaseId
      }
    })
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.errors?.[0]?.message || body?.messages?.[0] || `HTTP ${res.status}`;
    throw new Error(`Cloudflare D1 Analytics: ${msg}`);
  }
  if (Array.isArray(body.errors) && body.errors.length) {
    throw new Error(`Cloudflare D1 Analytics: ${body.errors[0].message || 'GraphQL error'}`);
  }

  const groups = body?.data?.viewer?.accounts?.[0]?.d1AnalyticsAdaptiveGroups || [];
  let rowsRead = 0;
  let rowsWritten = 0;
  let readQueries = 0;
  let writeQueries = 0;
  for (const row of groups) {
    rowsRead += Number(row?.sum?.rowsRead || 0) || 0;
    rowsWritten += Number(row?.sum?.rowsWritten || 0) || 0;
    readQueries += Number(row?.sum?.readQueries || 0) || 0;
    writeQueries += Number(row?.sum?.writeQueries || 0) || 0;
  }

  const writeLimit = D1_FREE_ROWS_WRITTEN_PER_DAY;
  const readLimit = D1_FREE_ROWS_READ_PER_DAY;
  const percent = pctOf(rowsWritten, writeLimit);
  const readPercent = pctOf(rowsRead, readLimit);
  const overFreeLimit = rowsWritten >= writeLimit;
  const resets = resetFields();

  const payload = {
    source: 'cloudflare',
    kind: 'd1',
    databaseId,
    rowsWritten,
    rowsRead,
    readQueries,
    writeQueries,
    // Alias so UI can reuse the same banner helpers as KV (writesToday = rows written).
    writesToday: rowsWritten,
    readsToday: rowsRead,
    limit: writeLimit,
    writeLimit,
    readLimit,
    percent,
    readPercent,
    exhausted: overFreeLimit,
    overFreeLimit,
    near: !overFreeLimit && percent >= 70,
    critical: percent >= 85 || overFreeLimit,
    refreshedAt: new Date().toISOString(),
    lagHint: 'Cloudflare D1 Analytics (pode atrasar alguns minutos)',
    sources: 'D1 stf-clicks — mesma fonte do dashboard D1 Metrics',
    ...resets
  };

  await writeCachedD1Usage(day, payload);
  return payload;
}

export async function buildD1DailyBudget(env) {
  if (env && cfCredentials(env) && d1DatabaseId(env)) {
    try {
      const cf = await fetchCloudflareD1Usage(env);
      if (cf) return cf;
    } catch (err) {
      console.warn('D1 Cloudflare usage:', err.message || err);
      return {
        source: 'unavailable',
        kind: 'd1',
        writesToday: 0,
        readsToday: 0,
        rowsWritten: 0,
        rowsRead: 0,
        limit: D1_FREE_ROWS_WRITTEN_PER_DAY,
        writeLimit: D1_FREE_ROWS_WRITTEN_PER_DAY,
        readLimit: D1_FREE_ROWS_READ_PER_DAY,
        percent: 0,
        exhausted: false,
        overFreeLimit: false,
        near: false,
        critical: false,
        cfError: String(err.message || err).slice(0, 200),
        sources: 'falha ao ler Analytics D1',
        ...resetFields()
      };
    }
  }
  return {
    source: 'unconfigured',
    kind: 'd1',
    writesToday: 0,
    readsToday: 0,
    rowsWritten: 0,
    rowsRead: 0,
    limit: D1_FREE_ROWS_WRITTEN_PER_DAY,
    writeLimit: D1_FREE_ROWS_WRITTEN_PER_DAY,
    readLimit: D1_FREE_ROWS_READ_PER_DAY,
    percent: 0,
    exhausted: false,
    overFreeLimit: false,
    near: false,
    critical: false,
    sources: 'configure CF_API_TOKEN + CF_D1_DATABASE_ID',
    ...resetFields()
  };
}
