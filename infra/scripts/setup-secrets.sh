#!/usr/bin/env bash
# Sexta, passo 3: cria a senha do banco e o segredo do JWT no SSM Parameter Store (uma vez só).
# NÃO sobrescreve: o Postgres grava a senha no disco na primeira subida; trocar depois quebra o login da api.
source "$(dirname "$0")/_common.sh"

for name in /grupo02/db-password /grupo02/jwt-secret; do
    if aws ssm get-parameter --name "$name" >/dev/null 2>&1; then
        echo "$name já existe, mantido."
    else
        aws ssm put-parameter --name "$name" --type SecureString --value "$(openssl rand -hex 24)" >/dev/null
        echo "$name criado."
    fi
done
