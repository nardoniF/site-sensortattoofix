-- Store orders + marketplace sales (KV stays for config/tokens/cache).
CREATE TABLE IF NOT EXISTS store_orders (
  order_id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT,
  status TEXT,
  user_id TEXT,
  tracking_code TEXT,
  payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_store_orders_created ON store_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_orders_user ON store_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_tracking ON store_orders(tracking_code);

CREATE TABLE IF NOT EXISTS marketplace_sales (
  channel TEXT NOT NULL,
  external_id TEXT NOT NULL,
  sold_at TEXT,
  payload TEXT NOT NULL,
  PRIMARY KEY (channel, external_id)
);

CREATE INDEX IF NOT EXISTS idx_mkt_sales_sold ON marketplace_sales(channel, sold_at DESC);
