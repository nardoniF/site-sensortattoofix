/**
 * Cloudflare Free KV write meter (account limit ≈ 1000 writes/day, resets 00:00 UTC = 21:00 Brasília).
 * Counts every put/delete we perform — Cloudflare does not expose remaining quota via API.
 */

export const KV_FREE_WRITES_PER_DAY = 1000;

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

/** Real budget from all instrumented puts/deletes today (UTC day). */
export async function buildKvDailyWriteBudget() {
  const day = utcDayKey();
  const fromTotal = await getKvWriteCounter(day);
  const fromLegacyClicks = await getLegacyClickWriteCounter(day);
  const writesToday = Math.max(fromTotal, fromLegacyClicks);
  const limit = KV_FREE_WRITES_PER_DAY;
  const percent = Math.min(100, Math.round((writesToday / limit) * 100));
  const exhausted = await isKvWriteQuotaExhaustedMarked();
  const resetAt = nextUtcMidnightDate();
  const resetsAtBr = resetAt.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  return {
    writesToday,
    clickWritesToday: writesToday, // compat com Admin antigo
    limit,
    percent,
    near: !exhausted && percent >= 70,
    critical: !exhausted && percent >= 85,
    exhausted,
    resetsAt: resetAt.toISOString(),
    resetsAtBr,
    resetsHintBr: '21:00 (Brasília) / 00:00 UTC',
    sources: 'todos os puts/deletes do Worker (pedidos, cliques, sync, fórum, admin)'
  };
}
