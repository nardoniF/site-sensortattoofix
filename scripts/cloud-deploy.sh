#!/usr/bin/env bash
# Deploy Workers (API + site proxy). Requer CLOUDFLARE_API_TOKEN no ambiente.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export CF_ACCOUNT_ID="${CF_ACCOUNT_ID:-80ab4f6ff1553d2ee530c0880edce594}"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  if ! npx wrangler@4 whoami >/dev/null 2>&1; then
    echo "Erro: defina CLOUDFLARE_API_TOKEN ou faça wrangler login (OAuth)." >&2
    exit 1
  fi
fi

echo "→ Deploy sensortattoofix-payments (API)…"
cd "$ROOT/api"
npx wrangler@4 deploy --config wrangler.toml

echo "→ Deploy stf-com-proxy (site .com / .com.br)…"
cd "$ROOT/cloudflare"
npx wrangler@4 deploy --config wrangler.toml

echo "Deploy concluído."
