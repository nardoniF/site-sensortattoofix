-- Click / visit analytics (replaces KV clicks:blob rewrites).
CREATE TABLE IF NOT EXISTS clicks (
  id TEXT PRIMARY KEY NOT NULL,
  ts INTEGER NOT NULL,
  tipo TEXT,
  destino TEXT,
  visitante_id TEXT,
  sessao_visita TEXT,
  pagina TEXT,
  teste INTEGER NOT NULL DEFAULT 0,
  payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clicks_ts ON clicks(ts DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_destino ON clicks(destino);
CREATE INDEX IF NOT EXISTS idx_clicks_visitante ON clicks(visitante_id);
CREATE INDEX IF NOT EXISTS idx_clicks_teste ON clicks(teste);
