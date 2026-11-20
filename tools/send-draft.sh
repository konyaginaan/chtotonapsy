#!/bin/bash
# Отправляет выпуск воркеру: сначала обложку (issues/<id>.jpg, если есть), затем сам выпуск —
# бот пришлёт черновик владельцу с кнопкой «Опубликовать».
#   tools/send-draft.sh issues/2026-11-20.json
# Ключ лежит в ~/.config/chtotonapsy/draft_key (тот же, что секрет DRAFT_KEY воркера).
set -euo pipefail
file="${1:?укажите файл выпуска}"
key=$(cat ~/.config/chtotonapsy/draft_key)
site=https://chtotonapsy.norevia.workers.dev
id=$(basename "$file" .json)
cover="${file%.json}.jpg"
if [ -f "$cover" ]; then
  curl -sS -m 60 -X PUT "$site/api/cover/$id" -H "Authorization: Bearer $key" \
    -H "Content-Type: image/jpeg" --data-binary @"$cover"
  echo
fi
curl -sS -m 60 -X POST "$site/api/draft" \
  -H "Authorization: Bearer $key" -H "Content-Type: application/json" \
  --data-binary @"$file"
echo
