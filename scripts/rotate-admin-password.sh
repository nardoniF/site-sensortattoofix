#!/usr/bin/env bash
# Gera e aplica senha forte em ADMIN_PASSWORD (Cloudflare Worker).
# Uso:
#   ./scripts/rotate-admin-password.sh              # gera senha e aplica
#   ./scripts/rotate-admin-password.sh 'SuaSenha!'  # aplica senha escolhida
#   ./scripts/rotate-admin-password.sh --print-only # só gera (não aplica)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/api"

gen_password() {
  # 20 chars: letras + números, sem símbolos problemáticos em terminal
  openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 20
}

validate_password() {
  local p="$1"
  if [[ ${#p} -lt 16 ]]; then
    echo "Erro: use pelo menos 16 caracteres." >&2
    exit 1
  fi
  if [[ "$p" == "admin" || "$p" == "123456" || "$p" == "password" || "$p" == "senha" ]]; then
    echo "Erro: senha muito óbvia." >&2
    exit 1
  fi
}

if [[ "${1:-}" == "--print-only" ]]; then
  gen_password
  echo
  exit 0
fi

NEW_PASS="${1:-$(gen_password)}"
validate_password "$NEW_PASS"

echo "→ Atualizando ADMIN_PASSWORD no Worker..."
(cd "$API_DIR" && printf '%s' "$NEW_PASS" | npx wrangler secret put ADMIN_PASSWORD)

echo ""
echo "✓ Senha do admin atualizada no Cloudflare."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GUARDE AGORA (não fica no Git):"
echo "  Usuário: admin  (ou o valor de ADMIN_USERNAME no wrangler.toml)"
echo "  Senha:   $NEW_PASS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Teste em /admin.html e /pedidos.html. Sessões antigas expiram ao sair ou fechar o navegador."
