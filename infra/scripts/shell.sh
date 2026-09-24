#!/usr/bin/env bash
# Abre um terminal dentro do container rodando. Precisa do Session Manager plugin instalado.
#   scripts/shell.sh              → sh no container da api
#   scripts/shell.sh postgres     → psql no banco
source "$(dirname "$0")/_common.sh"
container=${1:-api}
cmd=$([ "$container" = postgres ] && echo "psql -U app -d app" || echo "sh")
aws ecs execute-command --cluster "$(output ClusterName)" --task "$(running_task)" \
    --container "$container" --interactive --command "$cmd"
