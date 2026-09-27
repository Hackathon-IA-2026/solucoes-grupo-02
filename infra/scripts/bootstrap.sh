#!/usr/bin/env bash
# Bootstrap da CDK (uma vez só). O padrão falha nesta conta por configurar no repositório ECR
# ações bloqueadas; aqui o repositório é criado antes e o bootstrap usa infra/bootstrap/template.yaml.
source "$(dirname "$0")/_common.sh"
cd "$(dirname "$0")/.."

CONTA=$(aws sts get-caller-identity --query Account --output text)
REPO="cdk-hnb659fds-container-assets-${CONTA}-${AWS_REGION}"

estado() {
    aws cloudformation describe-stacks --stack-name CDKToolkit --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo NENHUMA
}

remover_toolkit() { # argumentos extras do delete-stack
    aws cloudformation delete-stack --stack-name CDKToolkit "$@"
    aws cloudformation wait stack-delete-complete --stack-name CDKToolkit 2>/dev/null || true
}

status=$(estado)
if [[ "$status" == *ROLLBACK* || "$status" == CREATE_FAILED ]]; then
    echo "CDKToolkit em $status: removendo a tentativa anterior."
    remover_toolkit # falha de novo no repositório e cai em DELETE_FAILED (tratado abaixo)
    status=$(estado)
fi
if [ "$status" = DELETE_FAILED ]; then
    echo "CDKToolkit em DELETE_FAILED: removendo a pilha e mantendo o repositório ECR."
    remover_toolkit --retain-resources ContainerAssetsRepository
    status=$(estado)
fi
if [ "$status" != NENHUMA ]; then
    echo "CDKToolkit está em $status. Se for *_COMPLETE, o bootstrap já foi feito; senão, veja os eventos no console."
    exit 1
fi

if aws ecr describe-repositories --repository-names "$REPO" >/dev/null 2>&1; then
    echo "Repositório $REPO já existe, reaproveitado."
else
    aws ecr create-repository --repository-name "$REPO" --image-tag-mutability IMMUTABLE >/dev/null
    echo "Repositório $REPO criado."
fi

npm ci --silent
npx cdk bootstrap "aws://${CONTA}/${AWS_REGION}" --template bootstrap/template.yaml
