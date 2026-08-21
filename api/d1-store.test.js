import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  d1CountSales,
  d1DeleteOrder,
  d1GetAppKv,
  d1GetOrder,
  d1GetSale,
  d1ListOrders,
  d1ListSaleIds,
  d1OrderIdByTracking,
  d1OrdersForUser,
  d1PutAppKv,
  d1SaveOrder,
  d1SaveSale,
  storeDb
} from './d1-store.js';

function createMemoryD1() {
  const orders = new Map();
  const sales = new Map();
  const kv = new Map();

  function keySale(channel, id) {
    return `${String(channel).toLowerCase()}|${id}`;
  }

  return {
    prepare(sql) {
      const s = String(sql).replace(/\s+/g, ' ');
      return {
        bind(...a) {
          return {
            async run() {
              if (s.includes('INSERT OR REPLACE INTO store_orders')) {
                orders.set(a[0], {
                  order_id: a[0],
                  created_at: a[1],
                  status: a[2],
                  user_id: a[3],
                  tracking_code: a[4],
                  payload: a[5]
                });
              } else if (s.includes('DELETE FROM store_orders')) {
                orders.delete(a[0]);
              } else if (s.includes('INSERT OR REPLACE INTO marketplace_sales')) {
                sales.set(keySale(a[0], a[1]), {
                  channel: a[0],
                  external_id: a[1],
                  sold_at: a[2],
                  payload: a[3]
                });
              } else if (s.includes('INSERT OR REPLACE INTO app_kv')) {
                kv.set(a[0], a[1]);
              }
              return { success: true };
            },
            async first() {
              if (s.includes('FROM store_orders WHERE order_id')) {
                const row = orders.get(a[0]);
                return row ? { payload: row.payload } : null;
              }
              if (s.includes('FROM store_orders WHERE tracking_code')) {
                for (const row of orders.values()) {
                  if (row.tracking_code === a[0]) return { order_id: row.order_id };
                }
                return null;
              }
              if (s.includes('FROM marketplace_sales WHERE channel') && s.includes('external_id')) {
                const row = sales.get(keySale(a[0], a[1]));
                return row ? { payload: row.payload } : null;
              }
              if (s.includes('FROM app_kv')) {
                return kv.has(a[0]) ? { v: kv.get(a[0]) } : null;
              }
              if (s.includes('COUNT(*)')) {
                let n = 0;
                for (const row of sales.values()) {
                  if (row.channel === String(a[0]).toLowerCase()) n += 1;
                }
                return { n };
              }
              return null;
            },
            async all() {
              if (s.includes('FROM store_orders WHERE user_id')) {
                const rows = [...orders.values()]
                  .filter((r) => r.user_id === a[0])
                  .map((r) => ({ payload: r.payload }));
                return { results: rows };
              }
              if (s.includes('SELECT payload FROM store_orders')) {
                return { results: [...orders.values()].map((r) => ({ payload: r.payload })) };
              }
              if (s.includes('SELECT external_id FROM marketplace_sales')) {
                const rows = [...sales.values()]
                  .filter((r) => r.channel === String(a[0]).toLowerCase())
                  .map((r) => ({ external_id: r.external_id }));
                return { results: rows };
              }
              return { results: [] };
            }
          };
        }
      };
    },
    async batch() {}
  };
}

test('storeDb is null without CLICKS_DB', () => {
  assert.equal(storeDb({}), null);
});

test('d1 order save/get/list/delete/user/tracking', async () => {
  const env = { CLICKS_DB: createMemoryD1() };
  const order = {
    orderId: 'ORD-1',
    createdAt: '2026-08-01T10:00:00Z',
    status: 'paid',
    userId: 'u1',
    correiosTrackingCode: 'aa123br',
    total: 99
  };
  assert.equal(await d1SaveOrder(env, {}), false);
  assert.equal(await d1SaveOrder(env, order), true);
  const got = await d1GetOrder(env, 'ORD-1');
  assert.equal(got.total, 99);
  assert.equal(got.correiosTrackingCode, 'aa123br');
  assert.equal(await d1OrderIdByTracking(env, 'AA123BR'), 'ORD-1');
  const forUser = await d1OrdersForUser(env, 'u1');
  assert.equal(forUser.length, 1);
  const listed = await d1ListOrders(env, 10);
  assert.equal(listed.length, 1);
  assert.equal(await d1DeleteOrder(env, 'ORD-1'), true);
  assert.equal(await d1GetOrder(env, 'ORD-1'), null);
});

test('d1 sales save/get/ids/count and app kv', async () => {
  const env = { CLICKS_DB: createMemoryD1() };
  const sale = { channel: 'ML', externalId: '123', soldAt: '2026-08-01', gross: 80 };
  assert.equal(await d1SaveSale(env, {}), false);
  assert.equal(await d1SaveSale(env, sale), true);
  const got = await d1GetSale(env, 'ml', '123');
  assert.equal(got.gross, 80);
  const ids = await d1ListSaleIds(env, 'ml');
  assert.deepEqual(ids, ['123']);
  assert.equal(await d1CountSales(env, 'ml'), 1);
  assert.equal(await d1PutAppKv(env, 'k', 'v'), true);
  assert.equal(await d1GetAppKv(env, 'k'), 'v');
});

test('d1 helpers no-op without database', async () => {
  const env = {};
  assert.equal(await d1SaveOrder(env, { orderId: 'x' }), false);
  assert.equal(await d1GetOrder(env, 'x'), null);
  assert.deepEqual(await d1ListOrders(env), []);
  assert.equal(await d1CountSales(env, 'ml'), 0);
});
