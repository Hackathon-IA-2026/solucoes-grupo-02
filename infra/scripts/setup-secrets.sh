#!/usr/bin/env bash
# Sexta, passo 3: cria os segredos da task no SSM Parameter Store (uma vez só; rodar de novo não muda nada).
# NÃO sobrescreve: o Postgres grava a senha no disco na primeira subida; trocar depois quebra o login da api.
# Todos precisam existir antes do deploy: se faltar um, a task não sobe.
source "$(dirname "$0")/_common.sh"

criar() { # nome, valor
    if aws ssm get-parameter --name "$1" >/dev/null 2>&1; then
        echo "$1 já existe, mantido."
    else
        aws ssm put-parameter --name "$1" --type SecureString --value "$2" >/dev/null
        echo "$1 criado."
    fi
}

# Gerados aqui: senha do banco, segredo do JWT e a chave entre a api e o serviço Python.
for name in /grupo02/db-password /grupo02/jwt-secret /grupo02/internal-api-key; do
    criar "$name" "$(openssl rand -hex 24)"
done

# Chaves da NVIDIA (classificador, resumidor e embeddings do copiloto): vêm do ambiente
# ou do ai/.env, o mesmo arquivo que o pipeline usa localmente.
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
