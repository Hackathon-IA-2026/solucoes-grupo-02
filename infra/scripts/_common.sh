# Carregado pelos outros scripts. Garante a região certa e acha o cluster/service da stack.
set -euo pipefail
export AWS_REGION=us-east-1 AWS_DEFAULT_REGION=us-east-1
STACK=Grupo02App

output() {
    aws cloudformation describe-stacks --stack-name "$STACK" \
        --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

running_task() {
    aws ecs list-tasks --cluster "$(output ClusterName)" --service-name "$(output ServiceName)" \
        --desired-status RUNNING --query 'taskArns[0]' --output text
}
