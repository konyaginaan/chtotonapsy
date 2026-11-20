# Обзор психоанализа для @chtotonapsy

Еженедельный обзор для канала «Что-то на психоаналитическом» (психоаналитики и психологи; время событий — по Москве).
Журнал для читателей: **https://konyaginaan.github.io/chtotonapsy/** (репозиторий konyaginaan/chtotonapsy, Pages через Actions: `tools/build_pages.py` берёт готовые страницы из `/api/export` воркера). Воркер https://chtotonapsy.norevia.workers.dev + D1 `chtotonapsy` — «мотор»: бот, кнопки, хранение, черновики; его страницы noindex. После «Опубликовать» воркер шлёт repository_dispatch (секрет GITHUB_TOKEN), страховка — сборка раз в час. Карта сайта, robots, canonical, JSON-LD; коды Google/Яндекса — vars GOOGLE_VERIFY/YANDEX_VERIFY в wrangler.jsonc.

- Выпуски — `issues/ГГГГ-ММ-ДД.json`, черновик отправляется `tools/send-draft.sh` (ключ в `~/.config/chtotonapsy/draft_key`).
- Пост средней длины, остальное — в журнале. Черновик приходит владелице в личку с кнопкой «Опубликовать»; самому в канал не публиковать.
- Задача по расписанию `psy-weekly-digest`, пт 15:30. Если Мак был выключен — собрать при включении, всё равно через одобрение. Бот напоминает включить компьютер в пт после 17:00 и сб после 10:00 (Кипр).
- Постоянные источники: sources.json + tools/collect.py (Crossref по ISSN, RSS подкастов, RSS YouTube) → разделы journals и media.
- Поиск: PubMed E-utilities (через curl — у python urllib проблемы с SSL), Perplexity в Chrome (perplexity.ai/search?q=), WebSearch. Perplexity путает даты — проверять всё.
- Бот общий с кипрским каналом (@vokrugkipra_bot, `~/projects/dust-cyprus`); вебхук подписан только на callback_query.
- Поисковики (20.11.2026): корневой репозиторий konyaginaan/konyaginaan.github.io (~/projects/konyaginaan.github.io) — robots.txt с картой сайта журнала, метатеги Google и Яндекса, переход на /chtotonapsy/. Google Search Console: ресурс https://konyaginaan.github.io/ подтверждён, карта сайта отправлена. Яндекс.Вебмастер: сайт https://konyaginaan.github.io, подтверждение метатегом. Новые проекты на этом домене добавлять Sitemap-строкой в корневой robots.txt.
