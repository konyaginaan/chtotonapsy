#!/bin/bash
# Отправляет выпуск воркеру: бот пришлёт черновик владельцу с кнопкой «Опубликовать».
#   tools/send-draft.sh issues/2026-11-20.json
# Ключ лежит в ~/.config/chtotonapsy/draft_key (тот же, что секрет DRAFT_KEY воркера).
set -euo pipefail
file="${1:?укажите файл выпуска}"
key=$(cat ~/.config/chtotonapsy/draft_key)
curl -sS -m 60 -X POST https://chtotonapsy.norevia.workers.dev/api/draft \
  -H "Authorization: Bearer $key" -H "Content-Type: application/json" \
  --data-binary @"$file"
echo
