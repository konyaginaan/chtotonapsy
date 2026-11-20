-- Выпуск — неделя обзора. id — дата пятницы (ГГГГ-ММ-ДД), к которой выпуск относится.
CREATE TABLE issues (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  lead           TEXT NOT NULL DEFAULT '',
  period_from    TEXT NOT NULL,
  period_to      TEXT NOT NULL,
  sections       TEXT NOT NULL,           -- JSON: [{key, items: [...]}]
  post           TEXT NOT NULL,           -- текст поста в Telegram (HTML)
  status         TEXT NOT NULL DEFAULT 'draft',  -- draft | published | rejected
  created_at     TEXT NOT NULL,
  published_at   TEXT,
  draft_msg_id   INTEGER,                 -- сообщение с кнопками в личке владельца
  channel_msg_id INTEGER
);

-- Отметки «напоминание уже отправлено» и прочие мелочи.
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);
