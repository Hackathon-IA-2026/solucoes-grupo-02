#!/usr/bin/env bash
# Mostra a URL atual. O IP público muda a cada task nova (redeploy ou reinício).
source "$(dirname "$0")/_common.sh"

task=$(running_task)
[ "$task" = "None" ] && { echo "Nenhuma task rodando agora (subindo ou caindo em loop?). Veja: scripts/logs.sh"; exit 1; }

eni=$(aws ecs describe-tasks --cluster "$(output ClusterName)" --tasks "$task" \
    --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text)
# Se este comando for negado: console do ECS → cluster → task → aba Networking → "Public IP".
ip=$(aws ec2 describe-network-interfaces --network-interface-ids "$eni" \
    --query 'NetworkInterfaces[0].Association.PublicIp' --output text)
echo "http://$ip"
