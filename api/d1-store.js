/** D1 store for checkout orders + marketplace sales. Same DB as clicks (CLICKS_DB). */

let schemaReady = false;
/** Isolate-level soft circuit when free-tier D1 read quota is exhausted (resets on new isolate / next day). */
let d1ReadsExhausted = false;

export function storeDb(env) {
  return env.CLICKS_DB || null;
}

export function isD1ReadsExhausted() {
  return d1ReadsExhausted;
}

/** Same CLICKS_DB — mark when clicks OR store hits free-tier read cap. */
export function markD1ReadsExhausted() {
  d1ReadsExhausted = true;
}

function noteD1Error(err) {
  const msg = String(err?.message || err || '');
  if (/exceeded D1.*(?:read|row read) limit|free tier daily row read|SQLITE_FULL/i.test(msg)) {
    d1ReadsExhausted = true;
  }
  console.warn('D1 store:', msg.slice(0, 240));
}

export async function ensureStoreD1(env) {
  const db = storeDb(env);
  if (!db) return null;
  if (d1ReadsExhausted) return null;
  if (schemaReady) return db;
  try {
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
    `),
      db.prepare(`
      CREATE TABLE IF NOT EXISTS superfrete_cart_operations (
        order_id TEXT PRIMARY KEY NOT NULL,
        cart_id TEXT,
        state TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    ]);
    schemaReady = true;
    return db;
  } catch (err) {
    noteD1Error(err);
    return null;
  }
}

function parsePayload(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function superfreteCartOperationsDb(env) {
  const db = await ensureStoreD1(env);
  if (!db) throw new Error('D1 indisponível: não é seguro criar carrinho Super Frete sem lock persistente.');
  return db;
}

export async function d1ClaimSuperfreteCartCreation(env, orderId) {
  const db = await superfreteCartOperationsDb(env);
  const id = String(orderId || '').trim();
  if (!id) throw new Error('Pedido sem identificador para lock do carrinho Super Frete.');
  const result = await db.prepare(`
    INSERT OR IGNORE INTO superfrete_cart_operations (order_id, cart_id, state, updated_at)
    VALUES (?, NULL, 'creating', ?)
  `).bind(id, new Date().toISOString()).run();
  const acquired = Number(result?.meta?.changes || 0) > 0;
  if (acquired) return true;
  return false;
}

export async function d1GetSuperfreteCartOperation(env, orderId) {
  const db = await superfreteCartOperationsDb(env);
  const row = await db.prepare(`
    SELECT cart_id AS cartId, state FROM superfrete_cart_operations WHERE order_id = ?
  `).bind(String(orderId || '')).first();
  return row || null;
}

export async function d1RecordSuperfreteCartId(env, orderId, cartId) {
  const db = await superfreteCartOperationsDb(env);
  const id = String(orderId);
  const cart = String(cartId);
  const result = await db.prepare(`
    UPDATE superfrete_cart_operations
    SET cart_id = ?, state = 'created', updated_at = ?
    WHERE order_id = ? AND state = 'creating' AND cart_id IS NULL
  `).bind(cart, new Date().toISOString(), id).run();
  if (Number(result?.meta?.changes || 0) === 1) return;

  const existing = await db.prepare(`
    SELECT cart_id AS cartId FROM superfrete_cart_operations WHERE order_id = ?
  `).bind(id).first();
  if (String(existing?.cartId || '') === cart) return;
  if (existing) throw new Error('Já existe outro ID registrado para o lock deste pedido; nenhum carrinho novo será criado.');

  const recovered = await db.prepare(`
    INSERT OR IGNORE INTO superfrete_cart_operations (order_id, cart_id, state, updated_at)
    VALUES (?, ?, 'created', ?)
  `).bind(id, cart, new Date().toISOString()).run();
  if (Number(recovered?.meta?.changes || 0) !== 1) {
    throw new Error('O lock persistente do carrinho Super Frete foi perdido; ID não registrado.');
  }
}

export async function d1CompleteSuperfreteCartOperation(env, orderId, cartId) {
  const db = await superfreteCartOperationsDb(env);
  const result = await db.prepare(`
    UPDATE superfrete_cart_operations
    SET state = 'ready', updated_at = ?
    WHERE order_id = ? AND cart_id = ?
  `).bind(new Date().toISOString(), String(orderId), String(cartId)).run();
  if (Number(result?.meta?.changes || 0) !== 1) {
    throw new Error('Não foi possível concluir o registro do carrinho Super Frete.');
  }
}

export async function d1ReleaseSuperfreteCartCreation(env, orderId) {
  const db = await superfreteCartOperationsDb(env);
  await db.prepare(`
    DELETE FROM superfrete_cart_operations WHERE order_id = ? AND cart_id IS NULL
  `).bind(String(orderId)).run();
}

export async function d1SaveOrder(env, order) {
  try {
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
  } catch (err) {
    noteD1Error(err);
    return false;
  }
}

export async function d1GetOrder(env, orderId) {
  try {
    const db = await ensureStoreD1(env);
    if (!db || !orderId) return null;
    const row = await db.prepare('SELECT payload FROM store_orders WHERE order_id = ?')
      .bind(String(orderId))
      .first();
    return parsePayload(row?.payload);
  } catch (err) {
    noteD1Error(err);
    return null;
  }
}

export async function d1ListOrders(env, limit = 2000) {
  try {
    const db = await ensureStoreD1(env);
    if (!db) return [];
    const cap = Math.min(2000, Math.max(1, Number(limit) || 2000));
    const res = await db.prepare(
      'SELECT payload FROM store_orders ORDER BY created_at DESC LIMIT ?'
    ).bind(cap).all();
    return (res.results || []).map((r) => parsePayload(r.payload)).filter(Boolean);
  } catch (err) {
    noteD1Error(err);
    return [];
  }
}

export async function d1FindOrdersWithShippingLabelForRecipient(env, recipient) {
  try {
    const db = await ensureStoreD1(env);
    if (!db) {
      if (storeDb(env) && !d1ReadsExhausted) {
        throw new Error('D1 indisponível para verificar etiquetas existentes.');
      }
      return [];
    }

    const clauses = [];
    const values = [];
    const email = String(recipient?.email || '').trim().toLowerCase();
    const cpf = String(recipient?.cpf || '').replace(/\D/g, '');
    const phone = String(recipient?.telefone || '').replace(/\D/g, '');
    const jsonDigits = (path) => ['.', '-', '/', '(', ')', ' ', '+']
      .reduce((expr, char) => `REPLACE(${expr}, '${char}', '')`, `json_extract(payload, '${path}')`);

    if (email) {
      clauses.push("lower(trim(json_extract(payload, '$.email'))) = ?");
      values.push(email);
    }
    if (cpf.length === 11 || cpf.length === 14) {
      clauses.push(`${jsonDigits('$.cpf')} = ?`);
      values.push(cpf);
    }
    if (phone.length >= 10) {
      clauses.push(`substr(${jsonDigits('$.telefone')}, -11) = ?`);
      values.push(phone.slice(-11));
    }
    if (!clauses.length) return [];

    const labels = [
      'correiosPrePostagemId',
      'superfreteCartId',
      'correiosTrackingCode',
      'superfreteTrackingCode',
      'correiosLabelCachedAt'
    ].map((field) => `COALESCE(json_extract(payload, '$.${field}'), '') <> ''`).join(' OR ');
    const result = await db.prepare(`
      SELECT payload FROM store_orders
      WHERE (${clauses.join(' OR ')}) AND (${labels})
      ORDER BY created_at DESC
      LIMIT 50
    `).bind(...values).all();
    return (result.results || []).map((row) => parsePayload(row.payload)).filter(Boolean);
  } catch (err) {
    noteD1Error(err);
    throw err;
  }
}

export async function d1DeleteOrder(env, orderId) {
  try {
    const db = await ensureStoreD1(env);
    if (!db || !orderId) return false;
    await db.prepare('DELETE FROM store_orders WHERE order_id = ?').bind(String(orderId)).run();
    return true;
  } catch (err) {
    noteD1Error(err);
    return false;
  }
}

export async function d1OrdersForUser(env, userId) {
  try {
    const db = await ensureStoreD1(env);
    if (!db || !userId) return [];
    const res = await db.prepare(
      'SELECT payload FROM store_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 500'
    ).bind(String(userId)).all();
    return (res.results || []).map((r) => parsePayload(r.payload)).filter(Boolean);
  } catch (err) {
    noteD1Error(err);
    return [];
  }
}

export async function d1OrderIdByTracking(env, code) {
  try {
    const db = await ensureStoreD1(env);
    if (!db || !code) return null;
    const row = await db.prepare(
      'SELECT order_id FROM store_orders WHERE tracking_code = ? LIMIT 1'
    ).bind(String(code).trim().toUpperCase()).first();
    return row?.order_id ? String(row.order_id) : null;
  } catch (err) {
    noteD1Error(err);
    return null;
  }
}

export async function d1SaveSale(env, sale) {
  try {
    const db = await ensureStoreD1(env);
    const channel = String(sale?.channel || '').toLowerCase();
    const id = sale?.externalId != null ? String(sale.externalId) : '';
    if (!db || !channel || !id) return false;
    await db.prepare(`
    INSERT OR REPLACE INTO marketplace_sales (channel, external_id, sold_at, payload)
    VALUES (?, ?, ?, ?)
  `).bind(channel, id, sale.soldAt || sale.dateCreated || null, JSON.stringify(sale)).run();
    return true;
  } catch (err) {
    noteD1Error(err);
    return false;
  }
}

export async function d1GetSale(env, channel, externalId) {
  try {
    const db = await ensureStoreD1(env);
    if (!db || !channel || !externalId) return null;
    const row = await db.prepare(
      'SELECT payload FROM marketplace_sales WHERE channel = ? AND external_id = ?'
    ).bind(String(channel).toLowerCase(), String(externalId)).first();
    return parsePayload(row?.payload);
  } catch (err) {
    noteD1Error(err);
    return null;
  }
}

export async function d1ListSaleIds(env, channel, limit = 5000) {
  try {
    const db = await ensureStoreD1(env);
    if (!db) return [];
    const cap = Math.min(5000, Math.max(1, Number(limit) || 5000));
    const res = await db.prepare(
      'SELECT external_id FROM marketplace_sales WHERE channel = ? ORDER BY sold_at DESC LIMIT ?'
    ).bind(String(channel).toLowerCase(), cap).all();
    return (res.results || []).map((r) => String(r.external_id)).filter(Boolean);
  } catch (err) {
    noteD1Error(err);
    return [];
  }
}

export async function d1ListSales(env, channel, limit = 5000) {
  try {
    const db = await ensureStoreD1(env);
    if (!db) return [];
    const cap = Math.min(5000, Math.max(1, Number(limit) || 5000));
    const res = await db.prepare(
      'SELECT payload FROM marketplace_sales WHERE channel = ? ORDER BY sold_at DESC LIMIT ?'
    ).bind(String(channel).toLowerCase(), cap).all();
    return (res.results || []).map((r) => parsePayload(r.payload)).filter(Boolean);
  } catch (err) {
    noteD1Error(err);
    return [];
  }
}

export async function d1GetAppKv(env, key) {
  try {
    const db = await ensureStoreD1(env);
    if (!db || !key) return null;
    const row = await db.prepare('SELECT v FROM app_kv WHERE k = ?').bind(String(key)).first();
    return row?.v != null ? String(row.v) : null;
  } catch (err) {
    noteD1Error(err);
    return null;
  }
}

export async function d1PutAppKv(env, key, value) {
  try {
    const db = await ensureStoreD1(env);
    if (!db || !key) return false;
    await db.prepare(`
    INSERT OR REPLACE INTO app_kv (k, v, updated_at)
    VALUES (?, ?, ?)
  `).bind(String(key), String(value ?? ''), new Date().toISOString()).run();
    return true;
  } catch (err) {
    noteD1Error(err);
    return false;
  }
}

export async function d1CountSales(env, channel) {
  try {
    const db = await ensureStoreD1(env);
    if (!db) return 0;
    const row = await db.prepare(
      'SELECT COUNT(*) AS n FROM marketplace_sales WHERE channel = ?'
    ).bind(String(channel).toLowerCase()).first();
    return Number(row?.n || 0);
  } catch (err) {
    noteD1Error(err);
    return 0;
  }
}
