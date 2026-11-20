/* Вёрстка журнала. Всё текстовое — через esc(), ссылки — только http(s). */

export const SECTIONS = {
  science:   { title: "Наука и исследования", short: "Наука" },
  community: { title: "Сообщество",          short: "Сообщество" },
  ru:        { title: "Русскоязычное поле",  short: "По-русски" },
  culture:   { title: "Культура и медиа",    short: "Культура" },
};
const ORDER = ["science", "community", "ru", "culture"];

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа",
  "сентября", "октября", "ноября", "декабря"];

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? esc(u) : "#");

function parts(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}
export function period(from, to) {
  const a = parts(from), b = parts(to);
  if (a.y !== b.y) return `${a.d} ${MONTHS[a.m - 1]} ${a.y} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
  if (a.m !== b.m) return `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
  return `${a.d}–${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
}
// Дата материала: ГГГГ-ММ-ДД превращаем в «18 ноября», остальное оставляем как есть.
function itemDate(s) {
  if (!s) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${+m[3]} ${MONTHS[+m[2] - 1]}` : s;
}
const plural = (n, one, few, many) => {
  const a = n % 10, b = n % 100;
  return n + " " + (a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many);
};
const countItems = (issue) => issue.sections.reduce((n, s) => n + s.items.length, 0);
const sorted = (sections) =>
  ORDER.map((k) => sections.find((s) => s.key === k)).filter((s) => s && s.items.length);

const FONTS = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&family=Manrope:wght@500;600;700&display=swap";

const CSS = `
:root{
  --bg:#f6f2f4; --paper:#fffdfb; --ink:#241c29; --muted:#6e6476; --faint:#9a90a2;
  --rule:#e4d9e2; --accent:#7b3a63; --accent-ink:#5f2a4b; --soft:#f1e5ee; --mark:#efd9e8;
  --science:#4f5fa8; --community:#7b3a63; --ru:#a2573a; --culture:#3f7f6e;
  --shadow:0 1px 2px rgba(60,30,60,.05),0 8px 28px rgba(60,30,60,.06);
}
@media (prefers-color-scheme:dark){:root{
  --bg:#141117; --paper:#1c171f; --ink:#eee7f0; --muted:#b0a5b6; --faint:#857a8c;
  --rule:#33293a; --accent:#e0a3c8; --accent-ink:#f0c2dd; --soft:#2a2030; --mark:#3a2840;
  --science:#9eaaf0; --community:#e0a3c8; --ru:#eaa688; --culture:#86cbb6;
  --shadow:none;
}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:400 17px/1.65 Literata,Georgia,serif;
  font-optical-sizing:auto}
a{color:inherit}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.sans{font-family:Manrope,system-ui,sans-serif}
.over{font:700 12px/1.3 Manrope,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.muted{color:var(--muted)}
h1,h2,h3{font-family:"Cormorant Garamond",Georgia,serif;font-weight:600;line-height:1.08;margin:0;letter-spacing:-.005em}

/* шапка */
.top{border-bottom:1px solid var(--rule)}
.top .wrap{display:flex;justify-content:space-between;align-items:center;gap:12px;height:56px}
.brand{font:600 20px/1 "Cormorant Garamond",Georgia,serif;text-decoration:none}
.brand i{color:var(--accent);font-style:italic}
.tg{font:600 13px/1 Manrope,system-ui,sans-serif;text-decoration:none;color:var(--accent);
  border:1px solid var(--rule);padding:9px 14px;border-radius:99px;white-space:nowrap}
.tg:hover{background:var(--soft)}

.mast{padding:64px 0 40px;text-align:center}
.mast h1{font-size:clamp(46px,8vw,84px);font-weight:500}
.mast h1 em{color:var(--accent)}
.mast p{max-width:560px;margin:18px auto 0;color:var(--muted);font-size:17px}
.orn{display:flex;align-items:center;gap:14px;justify-content:center;color:var(--faint);margin-top:28px}
.orn:before,.orn:after{content:"";height:1px;width:64px;background:var(--rule)}

/* свежий выпуск */
.feat{background:var(--paper);border:1px solid var(--rule);border-radius:18px;box-shadow:var(--shadow);
  padding:clamp(24px,5vw,48px);display:grid;grid-template-columns:1fr auto;gap:28px;align-items:end}
.feat h2{font-size:clamp(32px,5vw,50px);margin:12px 0 14px}
.feat h2 a{text-decoration:none}
.feat h2 a:hover{color:var(--accent)}
.feat .lead{font-size:18px;color:var(--muted);margin:0;max-width:680px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}
.chip{font:600 12.5px/1 Manrope,system-ui,sans-serif;padding:8px 12px;border-radius:99px;background:var(--soft);
  color:var(--ink);border:1px solid transparent;display:inline-flex;align-items:center;gap:7px;text-decoration:none}
.dot{width:7px;height:7px;border-radius:50%;background:var(--c,var(--accent));flex:none}
.btn{font:700 14px/1 Manrope,system-ui,sans-serif;background:var(--accent);color:var(--paper);text-decoration:none;
  padding:16px 22px;border-radius:12px;white-space:nowrap}
.btn:hover{background:var(--accent-ink)}

/* сетка: материалы + выпуски */
.grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:56px;margin:64px 0 80px}
.h-sec{display:flex;align-items:baseline;justify-content:space-between;gap:12px;
  border-bottom:2px solid var(--ink);padding-bottom:10px;margin-bottom:6px}
.h-sec h2{font-size:32px}
.tools{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 8px}
.search{flex:1 1 220px;font:500 15px/1 Manrope,system-ui,sans-serif;color:var(--ink);background:var(--paper);
  border:1px solid var(--rule);border-radius:10px;padding:12px 14px;min-width:0}
.search:focus{outline:2px solid var(--accent);outline-offset:1px}
.filter{cursor:pointer}
.filter[aria-pressed=true]{background:var(--ink);color:var(--bg)}
.filter[aria-pressed=true] .dot{background:var(--bg)}

.item{padding:24px 0;border-bottom:1px solid var(--rule)}
.meta{font:600 12px/1.5 Manrope,system-ui,sans-serif;color:var(--muted);letter-spacing:.02em;
  display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center}
.meta .kind{color:var(--c);text-transform:uppercase;letter-spacing:.1em;display:inline-flex;gap:6px;align-items:center}
.item h3{font-size:25px;margin:8px 0 6px;font-weight:600}
.item h3 a{text-decoration:none;background-image:linear-gradient(var(--mark),var(--mark));
  background-size:0 40%;background-position:0 88%;background-repeat:no-repeat;transition:background-size .25s}
.item h3 a:hover{background-size:100% 40%}
.ext{font:400 .7em/1 Manrope,sans-serif;color:var(--faint);margin-left:4px}
.authors{font-style:italic;color:var(--muted);font-size:15px;margin:0 0 6px}
.item p.sum{margin:0;font-size:16.5px}
.flag{font:700 10.5px/1 Manrope,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.08em;
  border:1px solid currentColor;border-radius:4px;padding:3px 5px;color:var(--culture)}
.from{font:600 12.5px/1 Manrope,system-ui,sans-serif;color:var(--faint);margin-top:10px;display:inline-block;text-decoration:none}
.from:hover{color:var(--accent)}
.empty{padding:40px 0;color:var(--muted);font-style:italic}

.issues{list-style:none;margin:18px 0 0;padding:0}
.issues li{border-bottom:1px solid var(--rule)}
.issues a{display:block;padding:16px 0;text-decoration:none}
.issues .n{font:700 12px/1 Manrope,system-ui,sans-serif;color:var(--accent);letter-spacing:.06em}
.issues .t{font:600 21px/1.15 "Cormorant Garamond",Georgia,serif;margin-top:6px}
.issues a:hover .t{color:var(--accent)}
.issues .d{font:500 12.5px/1 Manrope,system-ui,sans-serif;color:var(--faint);margin-top:6px}
aside .sticky{position:sticky;top:24px}
.about{margin-top:32px;padding:22px;border-radius:14px;background:var(--soft);font-size:15px;color:var(--muted)}
.about b{color:var(--ink);font-weight:600}

/* страница выпуска */
.draft{background:#f5d48a;color:#3b2a00;font:700 13px/1.4 Manrope,system-ui,sans-serif;text-align:center;padding:10px 16px}
.ihead{max-width:760px;margin:0 auto;padding:56px 0 8px;text-align:center}
.back{font:600 13px/1 Manrope,system-ui,sans-serif;color:var(--muted);text-decoration:none}
.back:hover{color:var(--accent)}
.ihead .over{margin-top:36px}
.ihead h1{font-size:clamp(40px,7vw,68px);margin:14px 0 22px;font-weight:500}
.ihead .lead{font:italic 400 20px/1.6 Literata,Georgia,serif;color:var(--muted);margin:0}
.toc{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:32px 0 0}
.body{max-width:760px;margin:0 auto 40px}
.sec{margin-top:64px;scroll-margin-top:20px}
.sec-h{display:flex;align-items:center;gap:14px;margin-bottom:4px}
.sec-h h2{font-size:36px}
.sec-h .rule{flex:1;height:1px;background:var(--rule)}
.sec-h .cnt{font:700 12px/1 Manrope,system-ui,sans-serif;color:var(--faint)}
.sec-mark{width:12px;height:12px;border-radius:3px;background:var(--c);transform:rotate(45deg);flex:none}
.inav{max-width:760px;margin:24px auto 80px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
.inav a{display:block;padding:20px;border:1px solid var(--rule);border-radius:14px;text-decoration:none;background:var(--paper)}
.inav a:hover{border-color:var(--accent)}
.inav .over{font-size:11px}
.inav .t{font:600 20px/1.2 "Cormorant Garamond",Georgia,serif;margin-top:6px}
.inav .r{text-align:right;grid-column:2}
.foot{border-top:1px solid var(--rule);padding:28px 0 40px;font:500 13px/1.6 Manrope,system-ui,sans-serif;color:var(--faint);text-align:center}
.foot a{color:var(--muted)}

@media (max-width:900px){
  .grid{grid-template-columns:1fr;gap:48px}
  aside{order:-1}
  aside .sticky{position:static}
  .feat{grid-template-columns:1fr}
  .btn{justify-self:start}
}
@media (max-width:560px){
  .wrap{padding:0 16px}
  body{font-size:16.5px}
  .mast{padding:44px 0 28px}
  .item h3{font-size:22px}
  .ihead .lead{font-size:18px}
  .sec-h h2{font-size:30px}
  .inav{grid-template-columns:1fr}
  .inav .r{grid-column:1}
  .tg span{display:none}
}
`;

function layout({ title, description, body, env, path = "/", image }) {
  const ch = env.CHANNEL.replace(/^@/, "");
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Что-то на психоаналитическом">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(env.SITE_URL + path)}">
${image ? `<meta property="og:image" content="${esc(image)}"><meta name="twitter:card" content="summary_large_image">` : ""}
<meta name="color-scheme" content="light dark">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#7b3a63"/><text x="16" y="23" font-family="Georgia,serif" font-size="20" font-style="italic" text-anchor="middle" fill="#fff">ψ</text></svg>')}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>${CSS}</style></head><body>
<header class="top"><div class="wrap">
<a class="brand" href="/">Что-то на <i>психоаналитическом</i></a>
<a class="tg" href="https://t.me/${esc(ch)}">✈︎ <span>Канал в Telegram</span></a>
</div></header>
${body}
<footer class="foot"><div class="wrap">Еженедельный обзор канала <a href="https://t.me/${esc(ch)}">@${esc(ch)}</a>. Каждый материал ведёт на первоисточник.</div></footer>
</body></html>`;
}

function itemHtml(it, key, issue) {
  const meta = [
    `<span class="kind"><span class="dot"></span>${esc(it.kind || SECTIONS[key].short)}</span>`,
    it.source && `<span>${esc(it.source)}</span>`,
    it.date && `<span>${esc(itemDate(it.date))}</span>`,
    it.open_access && `<span class="flag">открытый доступ</span>`,
    it.lang && it.lang !== "ru" && `<span>${esc(it.lang.toUpperCase())}</span>`,
  ].filter(Boolean).join("");
  return `<article class="item" style="--c:var(--${key})">
<div class="meta">${meta}</div>
<h3><a href="${safeUrl(it.url)}" target="_blank" rel="noopener">${esc(it.title)}<span class="ext">↗</span></a></h3>
${it.authors || it.original ? `<p class="authors">${[it.authors, it.original && `«${it.original}»`].filter(Boolean).map(esc).join(" · ")}</p>` : ""}
${it.summary ? `<p class="sum">${esc(it.summary)}</p>` : ""}
${issue ? `<a class="from" href="/issue/${esc(issue.id)}">из выпуска № ${issue.number} · ${esc(period(issue.period_from, issue.period_to))}</a>` : ""}
</article>`;
}

export function renderIndex(issues, env) {
  issues.forEach((is, i) => (is.number = issues.length - i));
  const last = issues[0];
  const total = issues.reduce((n, is) => n + countItems(is), 0);

  const feat = last ? `<section class="wrap"><div class="feat">
<div><div class="over">Свежий выпуск · № ${last.number} · ${esc(period(last.period_from, last.period_to))}</div>
<h2><a href="/issue/${esc(last.id)}">${esc(last.title)}</a></h2>
<p class="lead">${esc(last.lead)}</p>
<div class="chips">${sorted(last.sections).map((s) =>
  `<a class="chip" style="--c:var(--${s.key})" href="/issue/${esc(last.id)}#${s.key}"><span class="dot"></span>${esc(SECTIONS[s.key].short)} · ${s.items.length}</a>`).join("")}</div></div>
<a class="btn" href="/issue/${esc(last.id)}">Читать выпуск →</a>
</div></section>` : `<section class="wrap"><div class="feat"><div><div class="over">Скоро</div>
<h2>Первый выпуск готовится</h2><p class="lead">Каждую пятницу здесь будет появляться обзор недели: новые исследования, новости психоаналитического сообщества, книги, события и культура.</p></div></div></section>`;

  const items = issues.flatMap((is) =>
    sorted(is.sections).flatMap((s) => s.items.map((it) => ({ it, key: s.key, is }))));
  const list = items.map(({ it, key, is }) => {
    const text = [it.title, it.summary, it.source, it.authors, it.kind].join(" ").toLowerCase();
    return `<div class="row" data-s="${key}" data-q="${esc(text)}">${itemHtml(it, key, is)}</div>`;
  }).join("");

  const filters = ORDER.map((k) =>
    `<button class="chip filter" style="--c:var(--${k})" data-f="${k}" aria-pressed="false"><span class="dot"></span>${esc(SECTIONS[k].short)}</button>`).join("");

  const body = `
<section class="wrap mast">
<div class="over">Еженедельный обзор</div>
<h1>Психоанализ <em>за неделю</em></h1>
<p>Новые исследования, новости сообщества, книги, события и культура — всё, что связано с психоанализом. Выпуск выходит по пятницам.</p>
<div class="orn">ψ</div>
</section>
${feat}
<div class="wrap grid">
<main>
<div class="h-sec"><h2>Все материалы</h2><span class="over muted">${plural(total, "материал", "материала", "материалов")}</span></div>
${items.length ? `<div class="tools"><input class="search" type="search" placeholder="Поиск: автор, журнал, тема…" aria-label="Поиск по материалам">${filters}</div>
<div id="list">${list}</div><p class="empty" id="none" hidden>Ничего не нашлось.</p>` : `<p class="empty">Материалы появятся с первым выпуском.</p>`}
</main>
<aside><div class="sticky">
<div class="h-sec"><h2>Выпуски</h2></div>
<ul class="issues">${issues.map((is) => `<li><a href="/issue/${esc(is.id)}">
<div class="n">№ ${is.number}</div><div class="t">${esc(is.title)}</div>
<div class="d">${esc(period(is.period_from, is.period_to))} · ${plural(countItems(is), "материал", "материала", "материалов")}</div></a></li>`).join("") || `<li class="empty">Пока пусто</li>`}</ul>
<div class="about"><b>Как собирается обзор.</b> Каждую неделю мы просматриваем научные базы и журналы, сайты психоаналитических обществ, издательства и прессу. В обзор попадает только то, что можно открыть и проверить по ссылке.</div>
</div></aside>
</div>
<script>
(function(){
  var q=document.querySelector('.search'); if(!q) return;
  var rows=[].slice.call(document.querySelectorAll('#list .row')), none=document.getElementById('none'), on=null;
  function apply(){
    var s=q.value.trim().toLowerCase(), n=0;
    rows.forEach(function(r){var ok=(!on||r.dataset.s===on)&&(!s||r.dataset.q.indexOf(s)>=0);r.hidden=!ok;if(ok)n++;});
    none.hidden=n>0;
  }
  q.addEventListener('input',apply);
  [].forEach.call(document.querySelectorAll('.filter'),function(b){
    b.addEventListener('click',function(){
      on=on===b.dataset.f?null:b.dataset.f;
      [].forEach.call(document.querySelectorAll('.filter'),function(x){x.setAttribute('aria-pressed',x.dataset.f===on);});
      apply();
    });
  });
})();
</script>`;
  return layout({
    title: "Психоанализ за неделю — Что-то на психоаналитическом",
    description: "Еженедельный обзор: исследования, новости сообщества, книги, события и культура вокруг психоанализа.",
    body, env,
  });
}

export function renderIssue(issue, { prev, next }, env) {
  const secs = sorted(issue.sections);
  const n = countItems(issue);
  const body = `
${issue.status === "draft" ? `<div class="draft">Черновик — ещё не опубликован в канале</div>` : ""}
<div class="wrap">
<header class="ihead">
<a class="back" href="/">← Все выпуски и материалы</a>
<div class="over">Выпуск № ${issue.number} · ${esc(period(issue.period_from, issue.period_to))}</div>
<h1>${esc(issue.title)}</h1>
${issue.lead ? `<p class="lead">${esc(issue.lead)}</p>` : ""}
<nav class="toc">${secs.map((s) =>
  `<a class="chip" style="--c:var(--${s.key})" href="#${s.key}"><span class="dot"></span>${esc(SECTIONS[s.key].title)} · ${s.items.length}</a>`).join("")}</nav>
</header>
<div class="body">
${secs.map((s) => `<section class="sec" id="${s.key}" style="--c:var(--${s.key})">
<div class="sec-h"><span class="sec-mark"></span><h2>${esc(SECTIONS[s.key].title)}</h2><span class="rule"></span><span class="cnt">${s.items.length}</span></div>
${s.items.map((it) => itemHtml(it, s.key)).join("")}
</section>`).join("")}
</div>
${prev || next ? `<nav class="inav">
${prev ? `<a href="/issue/${esc(prev.id)}"><div class="over">← Предыдущий</div><div class="t">${esc(prev.title)}</div></a>` : ""}
${next ? `<a class="r" href="/issue/${esc(next.id)}"><div class="over">Следующий →</div><div class="t">${esc(next.title)}</div></a>` : ""}
</nav>` : `<div style="height:60px"></div>`}
</div>`;
  return layout({
    title: `№ ${issue.number}. ${issue.title} — Психоанализ за неделю`,
    description: issue.lead || `${plural(n, "материал", "материала", "материалов")} за ${period(issue.period_from, issue.period_to)}`,
    body, env, path: `/issue/${issue.id}`, image: issue.cover,
  });
}

export function renderNotFound(env) {
  return layout({
    title: "Не найдено — Психоанализ за неделю", description: "", env,
    body: `<section class="wrap mast"><div class="over">404</div><h1>Такой страницы <em>нет</em></h1>
<p><a href="/">Вернуться к выпускам</a></p></section>`,
  });
}
