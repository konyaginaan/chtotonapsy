# Психоанализ за неделю — обзор для @chtotonapsy

Журнал: https://konyaginaan.github.io/chtotonapsy/ (GitHub Pages; страницы собираются из воркера https://chtotonapsy.norevia.workers.dev)

- Задача по расписанию «Обзор недели для @chtotonapsy» в приложении Claude: каждую пятницу (около 15:45) ищет материалы, проверяет их, пишет `issues/<пятница>.json` и отправляет `tools/send-draft.sh`. Если мак был выключен, задача запустится при следующем открытии приложения.
- Воркер (`worker/`, база D1 `chtotonapsy`) хранит выпуски, рисует журнал, присылает черновик в личку (Telegram ID 400206093) с кнопками «Опубликовать» и «Отклонить» и публикует пост в канал только по нажатию кнопки.
- Если к 17:00 в пятницу черновика нет, бот напоминает включить мак; если его нет и к 10:00 субботы, напоминает ещё раз.
- Бот общий с @vokruhkipra (@vokrugkipra_bot). Вебхук подписан только на нажатия кнопок.

Секреты: `BOT_TOKEN` (вводит владелец), `DRAFT_KEY` (лежит и в `~/.config/chtotonapsy/draft_key`), `WEBHOOK_SECRET`.
Привязка вебхука (один раз): `https://chtotonapsy.norevia.workers.dev/setup?k=<DRAFT_KEY>`.
Деплой: `npm run deploy`.
