#!/usr/bin/env bash
# Reconhecimento da conta. Não cria nada.
source "$(dirname "$0")/_common.sh"
set +e

echo "== Quem sou eu"
aws sts get-caller-identity --output table

echo; echo "== CDK já está preparado (bootstrap)? Deve mostrar CREATE_COMPLETE ou UPDATE_COMPLETE"
aws cloudformation describe-stacks --stack-name CDKToolkit --query 'Stacks[0].StackStatus' --output text

echo; echo "== VPCs"
aws ec2 describe-vpcs --query 'Vpcs[].[VpcId,CidrBlock,IsDefault]' --output table

echo; echo "== Subnets (queremos MapPublicIp = True, em AZs diferentes)"
aws ec2 describe-subnets --query 'Subnets[].[VpcId,SubnetId,AvailabilityZone,MapPublicIpOnLaunch]' --output table

echo; echo "== Rotas para a internet (igw-...) por subnet — pode ser negado, tudo bem"
aws ec2 describe-route-tables \
    --query 'RouteTables[].{Subnets:Associations[].SubnetId,Main:Associations[0].Main,Internet:Routes[?starts_with(GatewayId||`x`,`igw-`)].GatewayId}' --output json

echo; echo "== Docker disponível nesta máquina? (o cdk deploy precisa para construir a imagem)"
docker info --format 'Docker {{.ServerVersion}} OK'
