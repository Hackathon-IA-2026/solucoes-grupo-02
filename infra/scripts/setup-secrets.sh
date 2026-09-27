#!/usr/bin/env bash
# Cria os segredos da task no SSM Parameter Store. Não sobrescreve: o Postgres grava a senha
# no disco na primeira subida, e trocá-la depois quebra o login da api.
source "$(dirname "$0")/_common.sh"

criar() { # nome, valor
    if aws ssm get-parameter --name "$1" >/dev/null 2>&1; then
        echo "$1 já existe, mantido."
    else
        aws ssm put-parameter --name "$1" --type SecureString --value "$2" >/dev/null
        echo "$1 criado."
    fi
}

for name in /grupo02/db-password /grupo02/jwt-secret /grupo02/internal-api-key; do
    criar "$name" "$(openssl rand -hex 24)"
done

env_ai="$(dirname "$0")/../../ai/.env"
chave() { # nome da variável
    local valor="${!1:-}"
    [ -z "$valor" ] && [ -f "$env_ai" ] && valor="$(grep -E "^$1=" "$env_ai" | head -1 | cut -d= -f2- | tr -d '"'"'"'')"
    echo "$valor"
}
for par in "NVIDIA_KEY_CLASSIFIER:/grupo02/nvidia-key-classifier" "NVIDIA_KEY_SUMMARIZER:/grupo02/nvidia-key-summarizer"; do
    variavel="${par%%:*}"; name="${par#*:}"
    valor="$(chave "$variavel")"
    if [ -z "$valor" ] && ! aws ssm get-parameter --name "$name" >/dev/null 2>&1; then
        echo "Falta $variavel: defina no ambiente ou em ai/.env e rode de novo."; exit 1
    fi
    criar "$name" "$valor"
done
