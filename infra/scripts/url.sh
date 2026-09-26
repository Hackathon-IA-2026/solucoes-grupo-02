#!/usr/bin/env bash
# Mostra a URL atual. O IP público muda a cada task nova (redeploy ou reinício).
source "$(dirname "$0")/_common.sh"

task=$(running_task)
[ "$task" = "None" ] && { echo "Nenhuma task rodando agora (subindo ou caindo em loop?). Veja: scripts/logs.sh"; exit 1; }

# 1) Pela interface de rede da task (precisa de ec2:DescribeNetworkInterfaces).
eni=$(aws ecs describe-tasks --cluster "$(output ClusterName)" --tasks "$task" \
    --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text)
ip=$(aws ec2 describe-network-interfaces --network-interface-ids "$eni" \
    --query 'NetworkInterfaces[0].Association.PublicIp' --output text 2>/dev/null || true)

# 2) Negado na conta do hackathon: a api anuncia o próprio IP no log ao subir ("task-public-ip=...").
if [ -z "$ip" ] || [ "$ip" = "None" ]; then
    ip=$(aws logs filter-log-events --log-group-name /grupo02/app --log-stream-name-prefix api \
        --filter-pattern '"task-public-ip"' --start-time $(( ($(date +%s) - 7 * 86400) * 1000 )) \
        --query 'sort_by(events, &timestamp)[-1].message' --output text 2>/dev/null |
        grep -oE '[0-9]+(\.[0-9]+){3}' | tail -1 || true)
fi

[ -z "$ip" ] && { echo "IP não encontrado. A task acabou de subir? Espere 1 min, ou veja: scripts/logs.sh api"; exit 1; }
echo "http://$ip"
