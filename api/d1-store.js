/** D1 store for checkout orders + marketplace sales. Same DB as clicks (CLICKS_DB). */

let schemaReady = false;

export function storeDb(env) {
  return env.CLICKS_DB || null;
}

export async function ensureStoreD1(env) {
  const db = storeDb(env);
  if (!db) return null;
  if (schemaReady) return db;
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS store_orders (
        order_id TEXT PRIMARY KEY NOT NULL,
        created_at TEXT,
        status TEXT,
        user_id TEXT,
        tracking_code TEXT,
        payload TEXT NOT NULL
      )
    `),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_store_orders_created ON store_orders(created_at DESC)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_store_orders_user ON store_orders(user_id)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_store_orders_tracking ON store_orders(tracking_code)'),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS marketplace_sales (
        channel TEXT NOT NULL,
        external_id TEXT NOT NULL,
        sold_at TEXT,
        payload TEXT NOT NULL,
        PRIMARY KEY (channel, external_id)
      )
    `),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_mkt_sales_sold ON marketplace_sales(channel, sold_at DESC)'),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS app_kv (
        k TEXT PRIMARY KEY NOT NULL,
        v TEXT NOT NULL,
        updated_at TEXT
      )
    `)
  ]);
  schemaReady = true;
  return db;
}

function parsePayload(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function d1SaveOrder(env, order) {
  const db = await ensureStoreD1(env);
  if (!db || !order?.orderId) return false;
  const tracking = String(order.correiosTrackingCode || order.superfreteTrackingCode || '').trim().toUpperCase() || null;
  await db.prepare(`
    INSERT OR REPLACE INTO store_orders (order_id, created_at, status, user_id, tracking_code, payload)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    String(order.orderId),
    order.createdAt || null,
    order.status || null,
    order.userId || null,
    tracking,
    JSON.stringify(order)
  ).run();
  return true;
}

export async function d1GetOrder(env, orderId) {
  const db = await ensureStoreD1(env);
  if (!db || !orderId) return null;
  const row = await db.prepare('SELECT payload FROM store_orders WHERE order_id = ?')
    .bind(String(orderId))
    .first();
  return parsePayload(row?.payload);
}

export async function d1ListOrders(env, limit = 2000) {
  const db = await ensureStoreD1(env);
  if (!db) return [];
  const cap = Math.min(2000, Math.max(1, Number(limit) || 2000));
  const res = await db.prepare(
    'SELECT payload FROM store_orders ORDER BY created_at DESC LIMIT ?'
  ).bind(cap).all();
  return (res.results || []).map((r) => parsePayload(r.payload)).filter(Boolean);
}

export async function d1DeleteOrder(env, orderId) {
  const db = await ensureStoreD1(env);
  if (!db || !orderId) return false;
  await db.prepare('DELETE FROM store_orders WHERE order_id = ?').bind(String(orderId)).run();
  return true;
}

export async function d1OrdersForUser(env, userId) {
  const db = await ensureStoreD1(env);
  if (!db || !userId) return [];
  const res = await db.prepare(
    'SELECT payload FROM store_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 500'
  ).bind(String(userId)).all();
  return (res.results || []).map((r) => parsePayload(r.payload)).filter(Boolean);
}

export async function d1OrderIdByTracking(env, code) {
  const db = await ensureStoreD1(env);
  if (!db || !code) return null;
  const row = await db.prepare(
    'SELECT order_id FROM store_orders WHERE tracking_code = ? LIMIT 1'
  ).bind(String(code).trim().toUpperCase()).first();
  return row?.order_id ? String(row.order_id) : null;
}

export async function d1SaveSale(env, sale) {
  const db = await ensureStoreD1(env);
  const channel = String(sale?.channel || '').toLowerCase();
  const id = sale?.externalId != null ? String(sale.externalId) : '';
  if (!db || !channel || !id) return false;
  await db.prepare(`
    INSERT OR REPLACE INTO marketplace_sales (channel, external_id, sold_at, payload)
    VALUES (?, ?, ?, ?)
  `).bind(channel, id, sale.soldAt || sale.dateCreated || null, JSON.stringify(sale)).run();
  return true;
}

export async function d1GetSale(env, channel, externalId) {
  const db = await ensureStoreD1(env);
  if (!db || !channel || !externalId) return null;
  const row = await db.prepare(
    'SELECT payload FROM marketplace_sales WHERE channel = ? AND external_id = ?'
  ).bind(String(channel).toLowerCase(), String(externalId)).first();
  return parsePayload(row?.payload);
}

export async function d1ListSaleIds(env, channel, limit = 5000) {
  const db = await ensureStoreD1(env);
  if (!db) return [];
  const cap = Math.min(5000, Math.max(1, Number(limit) || 5000));
  const res = await db.prepare(
    'SELECT external_id FROM marketplace_sales WHERE channel = ? ORDER BY sold_at DESC LIMIT ?'
  ).bind(String(channel).toLowerCase(), cap).all();
  return (res.results || []).map((r) => String(r.external_id)).filter(Boolean);
}

export async function d1ListSales(env, channel, limit = 5000) {
  const db = await ensureStoreD1(env);
  if (!db) return [];
  const cap = Math.min(5000, Math.max(1, Number(limit) || 5000));
  const res = await db.prepare(
    'SELECT payload FROM marketplace_sales WHERE channel = ? ORDER BY sold_at DESC LIMIT ?'
  ).bind(String(channel).toLowerCase(), cap).all();
  return (res.results || []).map((r) => parsePayload(r.payload)).filter(Boolean);
}

export async function d1GetAppKv(env, key) {
  const db = await ensureStoreD1(env);
  if (!db || !key) return null;
  const row = await db.prepare('SELECT v FROM app_kv WHERE k = ?').bind(String(key)).first();
  return row?.v != null ? String(row.v) : null;
}

export async function d1PutAppKv(env, key, value) {
  const db = await ensureStoreD1(env);
  if (!db || !key) return false;
  await db.prepare(`
    INSERT OR REPLACE INTO app_kv (k, v, updated_at)
    VALUES (?, ?, ?)
  `).bind(String(key), String(value ?? ''), new Date().toISOString()).run();
  return true;
}

export async function d1CountSales(env, channel) {
  const db = await ensureStoreD1(env);
  if (!db) return 0;
  const row = await db.prepare(
    'SELECT COUNT(*) AS n FROM marketplace_sales WHERE channel = ?'
  ).bind(String(channel).toLowerCase()).first();
  return Number(row?.n || 0);
}
