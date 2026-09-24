#!/usr/bin/env bash
# Faz o build da imagem (web + api), envia e atualiza a stack. Leva alguns minutos.
# Durante o redeploy a aplicação fica ~1-2 min fora do ar (a task antiga cai antes da nova subir).
source "$(dirname "$0")/_common.sh"
cd "$(dirname "$0")/.."

docker info >/dev/null 2>&1 || { echo "Docker não está rodando nesta máquina."; exit 1; }
npm ci --silent
npx cdk deploy --require-approval never "$@"

echo; scripts/url.sh || true
