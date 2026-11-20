/* «Что-то на психоаналитическом» — еженедельный обзор.
 *
 * Один воркер:
 *   - журнал: / (все выпуски и все материалы с поиском) и /issue/<id>;
 *   - POST /api/draft — задача по расписанию на маке присылает готовый выпуск,
 *     бот пересылает пост владельцу в личку с кнопками;
 *   - POST /webhook — нажатие «Опубликовать»/«Отклонить» (только от владельца);
 *   - cron — по пятницам после 17:00 и по субботам после 10:00 (Кипр)
 *     напоминает включить мак, если выпуска этой недели ещё нет.
 *
 * Бот общий с каналом @vokruhkipra (@vokrugkipra_bot). Вебхук подписан только
 * на callback_query, чтобы не мешать: кипрские скрипты лишь отправляют посты.
 *
 * Секреты (wrangler secret put):
 *   BOT_TOKEN       — токен бота;
 *   DRAFT_KEY       — ключ задачи на маке (заголовок Authorization: Bearer …);
 *   WEBHOOK_SECRET  — подтверждает, что вебхук дёрнул Telegram.
 */

import { renderIndex, renderIssue, renderNotFound, SECTIONS } from "./render.js";

const TZ = "Asia/Nicosia";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
const html = (body, status = 200) =>
  new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });

const isIssueId = (x) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    try {
      if (p === "/webhook" && request.method === "POST") return await webhook(request, env);
      if (p === "/api/draft" && request.method === "POST") return await postDraft(request, env);
      if (p === "/api/latest") return await latest(env);
      if (p === "/setup") return await setup(env, url);
      if (p === "/") return html(renderIndex(await publishedIssues(env), env));
      const m = p.match(/^\/issue\/(\d{4}-\d{2}-\d{2})\/?$/);
      if (m) return await issuePage(env, m[1]);
      return html(renderNotFound(env), 404);
    } catch (e) {
      console.error("unhandled", e && (e.stack || e.message));
      return json({ error: "internal" }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(remind(env));
  },
};

// ---------- Telegram ----------

async function tg(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!data.ok) console.error("tg", method, data.description);
  return data;
}

const issueUrl = (env, id) => `${env.SITE_URL}/issue/${id}`;

// ---------- Данные ----------

function rowToIssue(r) {
  return { ...r, sections: JSON.parse(r.sections) };
}

async function publishedIssues(env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM issues WHERE status = 'published' ORDER BY id DESC"
  ).all();
  return results.map(rowToIssue);
}

async function issuePage(env, id) {
  const row = await env.DB.prepare("SELECT * FROM issues WHERE id = ?").bind(id).first();
  if (!row || row.status === "rejected") return html(renderNotFound(env), 404);
  const issue = rowToIssue(row);
  // Номер выпуска — порядковый среди опубликованных; у черновика — следующий.
  const { n } = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM issues WHERE status = 'published' AND id < ?"
  ).bind(id).first();
  issue.number = n + 1;
  const prev = await env.DB.prepare(
    "SELECT id, title FROM issues WHERE status = 'published' AND id < ? ORDER BY id DESC LIMIT 1"
  ).bind(id).first();
  const next = await env.DB.prepare(
    "SELECT id, title FROM issues WHERE status = 'published' AND id > ? ORDER BY id ASC LIMIT 1"
  ).bind(id).first();
  const res = html(renderIssue(issue, { prev, next }, env));
  if (issue.status === "draft") res.headers.set("Cache-Control", "no-store");
  return res;
}

async function latest(env) {
  const row = await env.DB.prepare(
    "SELECT id, period_from, period_to, status FROM issues WHERE status != 'rejected' ORDER BY id DESC LIMIT 1"
  ).first();
  return json(row || null);
}

// ---------- Черновик от задачи на маке ----------

function authorized(request, env) {
  const h = request.headers.get("Authorization") || "";
  return env.DRAFT_KEY && h === `Bearer ${env.DRAFT_KEY}`;
}

// Проверяем форму выпуска, чтобы сломанный JSON не испортил журнал.
function validate(d) {
  const errs = [];
  if (!isIssueId(d.id)) errs.push("id: ГГГГ-ММ-ДД");
  if (!d.title || typeof d.title !== "string") errs.push("title");
  if (!isIssueId(d.period_from) || !isIssueId(d.period_to)) errs.push("period_from/period_to");
  if (typeof d.post !== "string" || !d.post.trim()) errs.push("post");
  const plain = (d.post || "").replace(/<[^>]+>/g, "").replace(/&(amp|lt|gt|quot);/g, "x");
  if (plain.length > 4096) errs.push(`post: ${plain.length} знаков, лимит Telegram 4096`);
  if (!Array.isArray(d.sections)) errs.push("sections");
  else
    for (const s of d.sections) {
      if (!SECTIONS[s.key]) errs.push(`раздел ${s.key}: неизвестный`);
      for (const it of s.items || [])
        if (!it.title || !/^https?:\/\//.test(it.url || "")) errs.push(`материал «${it.title}»: нужны title и url`);
    }
  return errs;
}

async function postDraft(request, env) {
  if (!authorized(request, env)) return json({ error: "unauthorized" }, 401);
  const d = await request.json();
  const errs = validate(d);
  if (errs.length) return json({ error: "invalid", details: errs }, 400);

  const old = await env.DB.prepare("SELECT status, draft_msg_id FROM issues WHERE id = ?").bind(d.id).first();
  if (old && old.status === "published") return json({ error: "already_published" }, 409);

  const sections = d.sections.filter((s) => (s.items || []).length);
  await env.DB.prepare(
    `INSERT INTO issues (id, title, lead, period_from, period_to, sections, post, status, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'draft', ?8)
     ON CONFLICT(id) DO UPDATE SET title=?2, lead=?3, period_from=?4, period_to=?5,
       sections=?6, post=?7, status='draft', created_at=?8`
  ).bind(d.id, d.title, d.lead || "", d.period_from, d.period_to, JSON.stringify(sections), d.post,
    new Date().toISOString()).run();

  // Прошлый вариант черновика больше не публикуем — убираем у него кнопки.
  if (old && old.draft_msg_id)
    await tg(env, "editMessageReplyMarkup", { chat_id: env.OWNER_ID, message_id: old.draft_msg_id,
      reply_markup: { inline_keyboard: [] } });

  // Владелец видит пост ровно таким, каким он уйдёт в канал, и под ним кнопки.
  const sent = await tg(env, "sendMessage", {
    chat_id: env.OWNER_ID,
    text: d.post,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: { inline_keyboard: [
      [{ text: "✅ Опубликовать", callback_data: `pub:${d.id}` }],
      [{ text: "📖 Страница выпуска", url: issueUrl(env, d.id) }],
      [{ text: "✖️ Отклонить", callback_data: `rej:${d.id}` }],
    ] },
  });
  if (!sent.ok) return json({ error: "telegram", details: sent.description }, 502);
  await env.DB.prepare("UPDATE issues SET draft_msg_id = ? WHERE id = ?").bind(sent.result.message_id, d.id).run();
  return json({ ok: true, page: issueUrl(env, d.id) });
}

// ---------- Кнопки ----------

async function webhook(request, env) {
  if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.WEBHOOK_SECRET)
    return new Response("forbidden", { status: 403 });
  const u = await request.json();
  const cq = u.callback_query;
  if (!cq) return new Response("ok");
  const answer = (text) => tg(env, "answerCallbackQuery", { callback_query_id: cq.id, text });

  if (String(cq.from.id) !== String(env.OWNER_ID)) { await answer("Нет доступа"); return new Response("ok"); }
  const m = /^(pub|rej):(\d{4}-\d{2}-\d{2})$/.exec(cq.data || "");
  if (!m) { await answer(""); return new Response("ok"); }
  const [, action, id] = m;
  const row = await env.DB.prepare("SELECT * FROM issues WHERE id = ?").bind(id).first();
  const msg = cq.message;
  const reply = (text) => tg(env, "sendMessage", { chat_id: env.OWNER_ID, text,
    reply_parameters: msg ? { message_id: msg.message_id, allow_sending_without_reply: true } : undefined,
    link_preview_options: { is_disabled: true } });
  const dropButtons = () => msg && tg(env, "editMessageReplyMarkup",
    { chat_id: env.OWNER_ID, message_id: msg.message_id, reply_markup: { inline_keyboard: [] } });

  if (!row || (msg && row.draft_msg_id !== msg.message_id)) {
    await answer("Этот черновик устарел");
    await dropButtons();
    return new Response("ok");
  }
  if (row.status === "published") { await answer("Уже опубликовано"); await dropButtons(); return new Response("ok"); }

  if (action === "rej") {
    await env.DB.prepare("UPDATE issues SET status = 'rejected' WHERE id = ?").bind(id).run();
    await answer("Отклонено");
    await dropButtons();
    await reply("Черновик отклонён. Чтобы поправить, напишите Claude, что изменить, — он пришлёт новый вариант.");
    return new Response("ok");
  }

  // Сначала помечаем, потом шлём: двойное нажатие не даст двух постов.
  const lock = await env.DB.prepare(
    "UPDATE issues SET status = 'published', published_at = ? WHERE id = ? AND status = 'draft'"
  ).bind(new Date().toISOString(), id).run();
  if (!lock.meta.changes) { await answer("Уже публикуется"); return new Response("ok"); }

  const sent = await tg(env, "sendMessage", {
    chat_id: env.CHANNEL,
    text: row.post,
    parse_mode: "HTML",
    link_preview_options: { url: issueUrl(env, id), prefer_small_media: true },
  });
  if (!sent.ok) {
    await env.DB.prepare("UPDATE issues SET status = 'draft', published_at = NULL WHERE id = ?").bind(id).run();
    await answer("Telegram не принял пост");
    await reply(`Не получилось опубликовать: ${sent.description}`);
    return new Response("ok");
  }
  await env.DB.prepare("UPDATE issues SET channel_msg_id = ? WHERE id = ?").bind(sent.result.message_id, id).run();
  await answer("Опубликовано");
  await dropButtons();
  const ch = env.CHANNEL.replace(/^@/, "");
  await reply(`✅ Опубликовано: https://t.me/${ch}/${sent.result.message_id}`);
  return new Response("ok");
}

// ---------- Напоминание включить мак ----------

function nicosiaNow(d = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", year: "numeric", month: "2-digit",
      day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(d).map((x) => [x.type, x.value])
  );
  return { weekday: parts.weekday, hour: +parts.hour, date: `${parts.year}-${parts.month}-${parts.day}` };
}

// Пятница той недели, к которой относится момент (сб и вс — ещё прошлая пятница).
export function weekFriday(dateStr, weekday) {
  const back = { Fri: 0, Sat: 1, Sun: 2, Mon: 3, Tue: 4, Wed: 5, Thu: 6 }[weekday];
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

export async function remind(env, now = new Date()) {
  const t = nicosiaNow(now);
  let slot = null;
  if (t.weekday === "Fri" && t.hour >= 17) slot = "fri";
  if (t.weekday === "Sat" && t.hour >= 10) slot = "sat";
  if (!slot) return;
  const id = weekFriday(t.date, t.weekday);
  const exists = await env.DB.prepare("SELECT 1 FROM issues WHERE id = ?").bind(id).first();
  if (exists) return;
  const key = `remind:${id}:${slot}`;
  if (await env.DB.prepare("SELECT 1 FROM meta WHERE key = ?").bind(key).first()) return;
  await env.DB.prepare("INSERT INTO meta (key, value) VALUES (?, ?)").bind(key, now.toISOString()).run();
  await tg(env, "sendMessage", {
    chat_id: env.OWNER_ID,
    text: slot === "fri"
      ? "🔔 Обзор недели для @chtotonapsy не собрался — похоже, мак выключен. Включите его и откройте Claude: черновик придёт сюда сам."
      : "🔔 Напоминаю: обзора недели всё ещё нет. Включите мак и откройте Claude — задача догонит пропущенное.",
  });
}

// ---------- Разовая настройка вебхука ----------

async function setup(env, url) {
  if (!env.DRAFT_KEY || url.searchParams.get("k") !== env.DRAFT_KEY) return json({ error: "unauthorized" }, 401);
  const info = await tg(env, "getWebhookInfo", {});
  const ours = `${env.SITE_URL}/webhook`;
  const current = info.result && info.result.url;
  // Чужой вебхук не перезаписываем молча: бот общий с кипрским каналом.
  if (current && current !== ours && url.searchParams.get("force") !== "1")
    return json({ changed: false, reason: "у бота уже есть другой вебхук", current });
  const set = await tg(env, "setWebhook", {
    url: ours, secret_token: env.WEBHOOK_SECRET, allowed_updates: ["callback_query"],
  });
  const me = await tg(env, "getMe", {});
  const member = me.ok ? await tg(env, "getChatMember", { chat_id: env.CHANNEL, user_id: me.result.id }) : {};
  const m = member.result || {};
  return json({ changed: set.ok, previous: current || null, bot: me.result && me.result.username,
    channel: { status: m.status || member.description, can_post: m.can_post_messages ?? null } });
}
