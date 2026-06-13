#!/usr/bin/env bash
# Atualiza branch stable e cria tag de backup datada (site + ponto de restauração Git).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TAG="backup-$(date +%Y-%m-%d)"
MSG="Backup snapshot $(date '+%Y-%m-%d %H:%M')"

echo "→ Verificando working tree..."
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Erro: há alterações não commitadas. Commit ou stash antes do backup."
  exit 1
fi

echo "→ Fetch origin..."
git fetch origin

BRANCH="$(git branch --show-current)"
if [[ "$BRANCH" != "main" ]]; then
  echo "Aviso: você está em '$BRANCH', não em main. O backup usará o HEAD atual."
fi

echo "→ Atualizando origin/stable..."
git push origin "HEAD:stable"

if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  TAG="${TAG}-$(date +%H%M)"
  echo "Tag do dia já existe; usando $TAG"
fi

echo "→ Criando tag $TAG..."
git tag -a "$TAG" -m "$MSG"
git push origin "$TAG"

echo ""
echo "Concluído."
echo "  stable → origin/stable (mesmo commit que HEAD)"
echo "  tag    → $TAG"
echo ""
echo "Restaurar site (GitHub Pages): git checkout $TAG"
echo "KV/config: exporte JSON no admin + CSV em pedidos.html (semanal)."
