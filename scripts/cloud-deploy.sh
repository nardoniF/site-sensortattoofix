#!/usr/bin/env bash
# Deploy Workers (API + site proxy). Requer CLOUDFLARE_API_TOKEN no ambiente.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export CF_ACCOUNT_ID="${CF_ACCOUNT_ID:-80ab4f6ff1553d2ee530c0880edce594}"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Erro: defina CLOUDFLARE_API_TOKEN (token Cloudflare com permissão Workers)." >&2
  exit 1
fi

echo "→ Deploy sensortattoofix-payments (API)…"
cd "$ROOT/api"
npx wrangler@4 deploy --config wrangler.toml

echo "→ Deploy stf-com-proxy (site .com / .com.br)…"
cd "$ROOT/cloudflare"
npx wrangler@4 deploy --config wrangler.toml

echo "Deploy concluído."
