#!/usr/bin/env bash
# Acompanha os logs ao vivo. Filtrar por container:  scripts/logs.sh api   |   scripts/logs.sh postgres
source "$(dirname "$0")/_common.sh"
aws logs tail /grupo02/app --follow --since 30m ${1:+--log-stream-name-prefix "$1"}
