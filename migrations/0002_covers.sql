-- Обложка выпуска (JPEG). Хранится в D1: она одна на неделю и весит ~150–250 КБ.
CREATE TABLE covers (
  id         TEXT PRIMARY KEY,
  img        BLOB NOT NULL,    -- JPEG
  version    TEXT NOT NULL      -- меняется при каждой загрузке, чтобы Telegram не взял старую из кэша
);
