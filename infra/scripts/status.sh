#!/usr/bin/env bash
# Por que a task não sobe? Mostra os últimos eventos do service e o motivo das últimas tasks que pararam.
source "$(dirname "$0")/_common.sh"
cluster=$(output ClusterName); service=$(output ServiceName)

echo "== Eventos do service (mais recentes primeiro)"
aws ecs describe-services --cluster "$cluster" --services "$service" \
    --query 'services[0].events[:8].[createdAt,message]' --output text

echo; echo "== Tasks que pararam recentemente e o motivo"
stopped=$(aws ecs list-tasks --cluster "$cluster" --service-name "$service" --desired-status STOPPED --query 'taskArns[:3]' --output text)
[ -n "$stopped" ] && [ "$stopped" != "None" ] && aws ecs describe-tasks --cluster "$cluster" --tasks $stopped \
    --query 'tasks[].{motivo:stoppedReason,containers:containers[].[name,exitCode,reason]}' --output json
