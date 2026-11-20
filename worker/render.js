/* Вёрстка журнала. Всё текстовое — через esc(), ссылки — только http(s). */

export const SECTIONS = {
  science:   { title: "Наука и исследования", short: "Наука" },
  journals:  { title: "Свежие номера журналов", short: "Журналы" },
  community: { title: "Сообщество",          short: "Сообщество" },
  ru:        { title: "Русскоязычное поле",  short: "По-русски" },
  media:     { title: "Подкасты и видео",    short: "Подкасты и видео" },
  culture:   { title: "Культура и медиа",    short: "Культура" },
};
const ORDER = ["science", "journals", "community", "ru", "media", "culture"];

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа",
  "сентября", "октября", "ноября", "декабря"];

// Префикс ссылок: "" на воркере, "/chtotonapsy" на GitHub Pages. Задаётся в начале каждого
// render*(): отрисовка синхронная, так что между запросами он не перепутается.
let B = "";
const issueHref = (id) => `${B}/issue/${id}/`;

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
// [{it, key, uid}] в порядке показа; uid = <выпуск>-<номер> — по нему открывается пересказ (#r-uid).
const flat = (issue) => {
  let n = 0;
  return sorted(issue.sections).flatMap((s) => s.items.map((it) => ({ it, key: s.key, uid: `${issue.id}-${++n}` })));
};

const FONTS = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&family=Manrope:wght@500;600;700&display=swap";

const CSS = `
:root{
  --bg:#ece8e2; --paper:#f7f4ef; --ink:#1d2225; --muted:#5c6266; --faint:#8e9396;
  --rule:#d9d2c8; --accent:#b9532a; --accent-ink:#943f1d; --soft:#e4ddd3; --mark:#f0c7a6;
  --gold:#b8955a; --plum:#1c2729;
  --grad:linear-gradient(100deg,#b9532a 0%,#d98a5f 45%,#c9a24a 100%);
  --science:#3b7476; --journals:#a67a26; --community:#b9532a; --ru:#9c4436; --media:#56698a; --culture:#2f6a5a;
  --shadow:0 1px 2px rgba(20,30,30,.05),0 18px 50px rgba(20,30,30,.10);
}
@media (prefers-color-scheme:dark){:root{
  --bg:#121617; --paper:#1a2022; --ink:#ece7df; --muted:#a9afb1; --faint:#7a8184;
  --rule:#2d3538; --accent:#ec9468; --accent-ink:#f5b08c; --soft:#232b2e; --mark:#5a3a2a;
  --science:#7fc4c2; --journals:#e2be6e; --community:#ec9468; --ru:#e48a78; --media:#9fb3d6; --culture:#7fc7a8;
  --shadow:0 14px 40px rgba(0,0,0,.35);
}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:400 17px/1.65 Literata,Georgia,serif;font-optical-sizing:auto}
a{color:inherit}
img{display:block;max-width:100%}
.wrap{max-width:1160px;margin:0 auto;padding:0 24px}
.over{font:700 11px/1.3 Manrope,system-ui,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:var(--accent)}
.muted{color:var(--muted)}
h1,h2,h3{font-family:"Cormorant Garamond",Georgia,serif;font-weight:600;line-height:1.06;margin:0;letter-spacing:-.005em}
.gt{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}

/* шапка */
.top{position:relative;z-index:5}
.top .wrap{display:flex;justify-content:space-between;align-items:center;gap:12px;height:68px}
.brand{display:flex;align-items:center;gap:10px;font:600 21px/1 "Cormorant Garamond",Georgia,serif;text-decoration:none}
.brand .psi{width:34px;height:34px;border-radius:50%;background:var(--accent);display:grid;place-items:center;
  color:#fff;font:italic 600 21px/1 "Cormorant Garamond",serif;box-shadow:0 0 0 2px rgba(255,255,255,.5) inset}
.brand i{font-style:italic}
.tg{font:600 12.5px/1 Manrope,sans-serif;letter-spacing:.02em;text-decoration:none;
  padding:11px 16px;border-radius:99px;white-space:nowrap;border:1px solid var(--rule);background:var(--paper)}
.tg:hover{border-color:var(--accent);color:var(--accent)}
.on-hero .top{position:absolute;left:0;right:0;top:0;color:#f6f1ea}
.on-hero .top .tg{background:rgba(16,24,26,.35);border-color:rgba(246,241,234,.45);color:#f6f1ea;backdrop-filter:blur(8px)}

/* главная: обложка */
.hero{position:relative;min-height:min(92vh,780px);color:#f6f1ea;display:flex;align-items:center;overflow:hidden;
  background:#1c2729 image-set(url("{{B}}/assets/hero.webp") 1x) center 30%/cover no-repeat}
.hero:before{content:"";position:absolute;inset:0;
  background:linear-gradient(90deg,rgba(16,24,26,.82) 0%,rgba(16,24,26,.55) 34%,rgba(16,24,26,.1) 62%,rgba(16,24,26,0) 80%)}
.hero .wrap{position:relative;width:100%;padding-top:110px;padding-bottom:150px}
.hero .over{color:#f0c7a6}
.hero h1{font-size:clamp(54px,9vw,118px);font-weight:500;line-height:.95;margin:18px 0 22px;max-width:640px;text-shadow:0 4px 40px rgba(20,0,30,.5)}
.hero h1 em{font-style:italic;color:#f0b48c}
.hero p{max-width:520px;font-size:18.5px;line-height:1.6;color:#e9e3da;margin:0}
.cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
.btn{font:700 12px/1 Manrope,sans-serif;letter-spacing:.16em;text-transform:uppercase;text-decoration:none;padding:18px 26px;border-radius:2px;
  background:var(--accent);color:#fff;white-space:nowrap;transition:background .2s,transform .2s}
.btn:hover{background:var(--accent-ink);transform:translateY(-1px)}
.btn.ghost{background:transparent;border:1px solid rgba(246,241,234,.6)}
.btn.ghost:hover{background:rgba(246,241,234,.12)}
.fade{position:absolute;left:0;right:0;bottom:-1px;height:140px;background:linear-gradient(0deg,var(--bg),transparent);pointer-events:none}

/* свежий выпуск */
.feat{position:relative;margin-top:-60px;z-index:2;background:var(--paper);border-radius:4px;box-shadow:var(--shadow);
  display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);overflow:hidden;border:1px solid var(--rule)}
.feat .cv{display:flex;align-items:center;background:var(--plum) url("{{B}}/assets/cover-bg-900.webp") center/cover}
.feat .cv img{width:100%;height:auto;aspect-ratio:16/9;box-shadow:0 20px 50px rgba(20,0,30,.45)}
.feat .tx{padding:clamp(24px,4vw,44px);display:flex;flex-direction:column;justify-content:center}
.feat h2{font-size:clamp(32px,4vw,48px);margin:12px 0 14px}
.feat h2 a{text-decoration:none}
.feat h2 a:hover{color:var(--accent)}
.feat .lead{font-size:16.5px;color:var(--muted);margin:0}
.feat .btn{align-self:flex-start;margin-top:24px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}
.chip{font:600 12.5px/1 Manrope,system-ui,sans-serif;padding:6px 13px 6px 6px;border-radius:99px;background:var(--soft);
  color:var(--ink);border:1px solid transparent;display:inline-flex;align-items:center;gap:8px;text-decoration:none;transition:border-color .2s}
.chip:hover{border-color:var(--c,var(--accent))}
.em{width:24px;height:24px;border-radius:50%;flex:none;object-fit:cover;box-shadow:0 0 0 1.5px var(--gold)}
.dot{width:7px;height:7px;border-radius:50%;background:var(--c,var(--accent));flex:none}

/* сетка: материалы + выпуски */
.grid{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:56px;margin:80px auto 90px}
.h-sec{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding-bottom:12px;margin-bottom:6px;position:relative}
.h-sec:after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:var(--ink)}
.h-sec h2{font-size:38px}
.tools{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0 8px}
.search{flex:1 1 240px;font:500 15px/1 Manrope,system-ui,sans-serif;color:var(--ink);background:var(--paper);
  border:1px solid var(--rule);border-radius:2px;padding:13px 18px;min-width:0}
.search:focus{outline:2px solid var(--accent);outline-offset:1px}
.filter{cursor:pointer}
.filter[aria-pressed=true]{background:var(--ink);color:var(--bg)}

.item{padding:26px 0;border-bottom:1px solid var(--rule)}
.meta{font:600 12px/1.5 Manrope,system-ui,sans-serif;color:var(--muted);letter-spacing:.02em;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center}
.meta .kind{color:var(--c);text-transform:uppercase;letter-spacing:.12em;display:inline-flex;gap:6px;align-items:center;font-family:Manrope,sans-serif;font-size:10.5px;font-weight:600}
.item h3{font-size:27px;margin:9px 0 6px;font-weight:600}
.item h3 a{text-decoration:none;background-image:linear-gradient(var(--mark),var(--mark));
  background-size:0 38%;background-position:0 88%;background-repeat:no-repeat;transition:background-size .3s}
.item h3 a:hover{background-size:100% 38%}
.ext{font:400 .62em/1 Manrope,sans-serif;color:var(--faint);margin-left:5px}
.authors{font-style:italic;color:var(--muted);font-size:15px;margin:0 0 7px}
.item p.sum{margin:0;font-size:16.5px}
.arts{list-style:none;margin:14px 0 0;padding:4px 0 4px 18px;border-left:3px solid var(--c);font-size:15.5px;border-radius:2px}
.arts li{padding:7px 0;line-height:1.45}
.arts a{text-decoration:none;font-weight:600}
.arts a:hover{color:var(--accent)}
.arts .o{display:block;font-size:13.5px;color:var(--muted);font-style:italic}
.flag{font:700 10px/1 Manrope,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.1em;border-radius:2px;padding:4px 7px;
  color:var(--culture);border:1px solid currentColor}
.from{font:600 12.5px/1 Manrope,system-ui,sans-serif;color:var(--faint);margin-top:12px;display:inline-block;text-decoration:none}
.from:hover{color:var(--accent)}
.empty{padding:40px 0;color:var(--muted);font-style:italic}

.issues{list-style:none;margin:18px 0 0;padding:0}
.issues li{border-bottom:1px solid var(--rule)}
.issues a{display:grid;grid-template-columns:92px 1fr;gap:14px;align-items:center;padding:14px 0;text-decoration:none}
.issues img{width:92px;aspect-ratio:16/9;object-fit:cover;border-radius:10px;background:var(--plum)}
.issues .n{font:600 11px/1 Manrope,sans-serif;color:var(--accent);letter-spacing:.06em}
.issues .t{font:600 20px/1.12 "Cormorant Garamond",Georgia,serif;margin-top:5px}
.issues a:hover .t{color:var(--accent)}
.issues .d{font:500 12px/1.3 Manrope,system-ui,sans-serif;color:var(--faint);margin-top:5px}
aside .sticky{position:sticky;top:24px}
.about{margin-top:32px;padding:24px;border-radius:4px;font-size:15px;color:var(--muted);background:var(--paper);border:1px solid var(--rule)}
.about b{color:var(--ink);font-weight:600}
.about .ems{display:flex;margin-bottom:14px}
.about .ems img{width:34px;height:34px;border-radius:50%;margin-right:-8px;box-shadow:0 0 0 2px var(--paper)}

/* страница выпуска */
.draft{position:fixed;left:0;right:0;bottom:0;z-index:20;background:#f0c7a6;color:#3b2a00;font:700 13px/1.4 Manrope,system-ui,sans-serif;text-align:center;padding:10px 16px}
.ihero{position:relative;color:#f6f1ea;overflow:hidden;
  background:#1c2729 url("{{B}}/assets/cover-bg.webp") right center/cover no-repeat}
.ihero:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(16,24,26,.88),rgba(16,24,26,.6) 50%,rgba(16,24,26,.15))}
.ihead{position:relative;max-width:780px;padding:120px 0 150px}
.back{font:600 13px/1 Manrope,system-ui,sans-serif;color:#e9ddd0;text-decoration:none}
.back:hover{color:#fff}
.ihead .over{margin-top:34px;color:#f0c7a6}
.ihead h1{font-size:clamp(44px,7vw,84px);margin:14px 0 22px;font-weight:500;line-height:.98}
.ihead .lead{font:italic 400 19px/1.6 Literata,Georgia,serif;color:#e6dfd5;margin:0}
.toc{display:flex;flex-wrap:wrap;gap:8px;margin:30px 0 0}
.ihead .chip{background:rgba(246,241,234,.1);color:#f6f1ea;border-color:rgba(246,241,234,.3);backdrop-filter:blur(6px)}
.body{max-width:780px;margin:0 auto 40px}
.sec{margin-top:56px;scroll-margin-top:20px;border-bottom:1px solid var(--rule)}
.sec>summary{list-style:none;cursor:pointer;padding:6px 0 14px}
.sec>summary::-webkit-details-marker{display:none}
.sec .tog{width:36px;height:36px;border-radius:50%;border:1px solid var(--rule);display:grid;place-items:center;flex:none;
  color:var(--muted);font:400 20px/1 Manrope,sans-serif;transition:transform .25s,border-color .2s}
.sec>summary:hover .tog{border-color:var(--c);color:var(--c)}
.sec[open] .tog{transform:rotate(45deg)}
.sec .peek{font:500 13.5px/1.5 Manrope,system-ui,sans-serif;color:var(--faint);margin:6px 0 0 90px}
.sec[open] .peek{display:none}
.allsw{background:none;border:0;padding:0;margin-top:22px;font:700 11px/1 Manrope,sans-serif;letter-spacing:.2em;text-transform:uppercase;
  color:#f0c7a6;cursor:pointer}
.sec-h{display:flex;align-items:center;gap:18px;margin-bottom:6px}
.sec-h img{width:72px;height:72px;border-radius:50%;box-shadow:0 0 0 2px var(--gold),0 10px 24px rgba(70,20,60,.18);flex:none}
.sec-h h2{font-size:40px}
.sec-h .rule{flex:1;height:2px;background:linear-gradient(90deg,var(--c),transparent)}
.sec-h .cnt{font:600 12px/1 Manrope,sans-serif;color:var(--c)}
.inav{max-width:780px;margin:24px auto 80px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
.inav a{display:block;padding:20px;border:1px solid var(--rule);border-radius:18px;text-decoration:none;background:var(--paper)}
.inav a:hover{border-color:var(--accent)}
.inav .over{font-size:10.5px}
.inav .t{font:600 21px/1.2 "Cormorant Garamond",Georgia,serif;margin-top:6px}
.inav .r{text-align:right;grid-column:2}
.foot{position:relative;background:var(--plum);color:#d9d4cc;margin-top:40px;padding:110px 0 46px;
  font:500 13.5px/1.7 Manrope,system-ui,sans-serif;text-align:center}
.foot .fade{display:none}
.foot a{color:#f0c7a6}
.foot .ems{display:flex;justify-content:center;gap:10px;margin-bottom:18px}
.foot .ems img{width:40px;height:40px;border-radius:50%;box-shadow:0 0 0 1.5px var(--gold)}

/* заметка-пересказ */
.rt{margin-top:14px;font:600 12px/1 Manrope,system-ui,sans-serif;letter-spacing:.02em;color:var(--accent);background:var(--soft);
  border:1px solid transparent;border-radius:99px;padding:10px 16px 10px 13px;cursor:pointer;display:inline-flex;gap:8px;align-items:center;transition:all .2s}
.rt:hover{background:var(--accent);color:#fff}
.rt svg{width:14px;height:14px}
dialog.note{border:0;padding:0;width:min(700px,calc(100% - 32px));max-width:none;max-height:min(86vh,920px);
  border-radius:6px;background:var(--paper);color:var(--ink);box-shadow:0 40px 100px rgba(10,20,20,.45);overflow:hidden}
dialog.note[open]{display:flex;flex-direction:column;animation:pop .25s ease-out}
dialog.note:before{content:"";height:4px;flex:none;background:var(--accent)}
dialog.note::backdrop{background:rgba(16,24,26,.55);backdrop-filter:blur(5px)}
@keyframes pop{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
.ns{overflow:auto;padding:34px 42px 30px;overscroll-behavior:contain}
.nx{position:absolute;top:22px;right:16px;width:40px;height:40px;border-radius:50%;border:1px solid var(--rule);
  background:var(--paper);color:var(--muted);font:400 22px/1 Manrope,sans-serif;cursor:pointer;z-index:1}
.nx:hover{color:var(--accent);border-color:var(--accent)}
.note .meta{padding-right:44px}
.note h3{font-size:34px;margin:10px 0 8px;font-weight:600}
.note .orig{font-style:italic;color:var(--muted);font-size:15px;margin:0 0 20px}
.note .nb p{margin:0 0 14px;font-size:17px;line-height:1.72}
.note .nb p:first-child::first-letter{font:500 3.4em/.8 "Cormorant Garamond",serif;float:left;margin:6px 10px 0 0;color:var(--accent)}
.nf{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px 16px;align-items:center;border-top:1px solid var(--rule);
  margin-top:12px;padding-top:16px;font:600 12.5px/1.4 Manrope,system-ui,sans-serif;color:var(--faint)}
.nf a{color:var(--accent);text-decoration:none}
.nf a:hover{text-decoration:underline}

@media (max-width:900px){
  .grid{grid-template-columns:1fr;gap:48px}
  aside{order:-1}
  aside .sticky{position:static}
  .feat{grid-template-columns:1fr}
  .hero{background-image:url("{{B}}/assets/hero-900.webp");background-position:70% center}
  .hero:before{background:linear-gradient(0deg,rgba(34,8,42,.94) 0%,rgba(34,8,42,.75) 45%,rgba(34,8,42,.2) 100%)}
  .hero{align-items:flex-end;min-height:88vh}
  .ihero{background-image:url("{{B}}/assets/cover-bg-900.webp")}
}
@media (max-width:560px){
  .wrap{padding:0 16px}
  body{font-size:16.5px}
  .brand span{display:none}
  .hero .wrap{padding-bottom:120px}
  .hero p{font-size:16.5px}
  .item h3{font-size:23px}
  .ihead{padding:96px 0 130px}
  .ihead .lead{font-size:17px}
  .sec-h img{width:56px;height:56px}
  .sec-h h2{font-size:31px}
  .inav{grid-template-columns:1fr}
  .inav .r{grid-column:1}
  .tg span{display:none}
  .waves{height:70px}
  dialog.note{width:100%;margin:auto 0 0;border-radius:8px 8px 0 0;max-height:90vh}
  dialog.note[open]{animation:up .28s ease-out}
  .ns{padding:28px 22px 26px}
  .note h3{font-size:28px}
}
@keyframes up{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}
`;
// Картинки оформления лежат в public/assets: на воркере их отдаёт статика, на Pages их копирует сборка.
const css = () => CSS.replaceAll("{{B}}", B);
const em = (key) => `${B}/assets/${key}.webp`;
// Психоделические волны-разделители (цвета из иллюстраций ChatGPT).
const WAVES = `<div class="fade" aria-hidden="true"></div>`;


// env.PUBLIC_URL — постоянный адрес журнала (GitHub Pages); на воркере страницы закрыты от
// индексации (NOINDEX), чтобы поисковики не видели два одинаковых сайта.
function layout({ title, description, body, env, path = "/", image, noindex, ld, onHero }) {
  const ch = env.CHANNEL.replace(/^@/, "");
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Что-то на психоаналитическом">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(env.PUBLIC_URL + path)}">
<link rel="canonical" href="${esc(env.PUBLIC_URL + path)}">
${noindex || env.NOINDEX ? `<meta name="robots" content="noindex">` : ""}
${env.GOOGLE_VERIFY ? `<meta name="google-site-verification" content="${esc(env.GOOGLE_VERIFY)}">` : ""}
${env.YANDEX_VERIFY ? `<meta name="yandex-verification" content="${esc(env.YANDEX_VERIFY)}">` : ""}
${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>` : ""}
${image ? `<meta property="og:image" content="${esc(image)}"><meta name="twitter:card" content="summary_large_image">` : ""}
<meta name="color-scheme" content="light dark">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#b9532a"/><stop offset="1" stop-color="#d98a5f"/></linearGradient></defs><circle cx="16" cy="16" r="16" fill="url(#g)"/><text x="16" y="23" font-family="Georgia,serif" font-size="20" font-style="italic" text-anchor="middle" fill="#fff">ψ</text></svg>')}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>${css()}</style></head><body${onHero ? ' class="on-hero"' : ""}>
<header class="top"><div class="wrap">
<a class="brand" href="${B}/"><span class="psi">ψ</span><span>Что-то на <i>психоаналитическом</i></span></a>
<a class="tg" href="https://t.me/${esc(ch)}">✈︎ <span>Канал в Telegram</span></a>
</div></header>
${body}
<dialog class="note" id="note" aria-label="Пересказ"><button class="nx" aria-label="Закрыть">×</button><div class="ns"></div></dialog>
<script>
(function(){
  var d=document.getElementById('note'), box=d.querySelector('.ns');
  function open(id,mark){
    var t=document.getElementById('t-'+id); if(!t) return;
    box.innerHTML=t.innerHTML; box.scrollTop=0;
    if(!d.open) d.showModal();
    if(mark) history.replaceState(null,'','#r-'+id);
  }
  document.addEventListener('click',function(e){var b=e.target.closest('[data-r]'); if(b) open(b.dataset.r,true);});
  d.querySelector('.nx').addEventListener('click',function(){d.close();});
  d.addEventListener('click',function(e){if(e.target===d) d.close();});
  d.addEventListener('close',function(){if(location.hash.indexOf('#r-')===0) history.replaceState(null,'',location.pathname+location.search);});
  if(location.hash.indexOf('#r-')===0) open(location.hash.slice(3),false);
})();
</script>
<footer class="foot">${WAVES}<div class="wrap"><div class="ems">${ORDER.map((k) => `<img src="${em(k)}" alt="" loading="lazy">`).join("")}</div>«Психоанализ за неделю» — еженедельный обзор канала <a href="https://t.me/${esc(ch)}">@${esc(ch)}</a>.<br>Каждый материал ведёт на первоисточник; англоязычные — с пересказом по-русски.</div></footer>
</body></html>`;
}

const BOOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/></svg>';

// Пересказ лежит скрытым блоком рядом с материалом (его видят поисковики) и открывается в общем окне — без отдельных страниц.
function retellingHtml(it, key, uid, meta) {
  const paras = String(it.retelling).split(/\n\s*\n/).map((p) => `<p>${esc(p.trim())}</p>`).join("");
  return `<div hidden class="rtx" id="t-${uid}"><div style="--c:var(--${key})">
<div class="meta">${meta}</div>
<h3>${esc(it.title)}</h3>
${it.original || it.authors ? `<p class="orig">${[it.authors, it.original && `«${it.original}»`].filter(Boolean).map(esc).join(" · ")}</p>` : ""}
<div class="nb">${paras}</div>
<div class="nf"><span>Пересказ по ${esc(it.retelling_basis || "аннотации")}</span><a href="${safeUrl(it.url)}" target="_blank" rel="noopener">Оригинал ↗</a></div>
</div></div>`;
}

function itemHtml(it, key, issue, uid, showFrom) {
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
${Array.isArray(it.articles) && it.articles.length ? `<ul class="arts">${it.articles.map((a) =>
  `<li><a href="${safeUrl(a.url)}" target="_blank" rel="noopener">${esc(a.title)}</a>${a.authors ? ` · ${esc(a.authors)}` : ""}${a.original ? `<span class="o">${esc(a.original)}</span>` : ""}</li>`).join("")}</ul>` : ""}
${it.retelling ? `<button class="rt" data-r="${esc(uid)}">${BOOK}Пересказ по-русски</button>${retellingHtml(it, key, uid, meta)}` : ""}
${showFrom ? `<a class="from" href="${issueHref(issue.id)}">из выпуска № ${issue.number} · ${esc(period(issue.period_from, issue.period_to))}</a>` : ""}
</article>`;
}

export function renderIndex(issues, env) {
  B = env.BASE || "";
  issues.forEach((is, i) => (is.number = issues.length - i));
  const last = issues[0];
  const total = issues.reduce((n, is) => n + countItems(is), 0);

  const feat = last ? `<section class="wrap"><div class="feat">
<a class="cv" href="${issueHref(last.id)}"><img src="${B}/cover/${esc(last.id)}.jpg" alt="Обложка выпуска № ${last.number}" onerror="this.parentNode.style.display='none'"></a>
<div class="tx"><div class="over">Свежий выпуск · № ${last.number} · ${esc(period(last.period_from, last.period_to))}</div>
<h2><a href="${issueHref(last.id)}">${esc(last.title)}</a></h2>
<p class="lead">${esc(last.lead)}</p>
<div class="chips">${sorted(last.sections).map((s) =>
  `<a class="chip" style="--c:var(--${s.key})" href="${issueHref(last.id)}#${s.key}"><img class="em" src="${em(s.key)}" alt="">${esc(SECTIONS[s.key].short)} · ${s.items.length}</a>`).join("")}</div>
<a class="btn" href="${issueHref(last.id)}">Читать выпуск →</a></div>
</div></section>` : `<section class="wrap"><div class="feat"><div class="tx"><div class="over">Скоро</div>
<h2>Первый выпуск готовится</h2><p class="lead">Каждую пятницу здесь будет появляться обзор недели: новые исследования, статьи журналов, подкасты, новости сообщества и культура.</p></div></div></section>`;

  const items = issues.flatMap((is) => flat(is).map((x) => ({ ...x, is })));
  const list = items.map(({ it, key, is, uid }) => {
    const text = [it.title, it.summary, it.source, it.authors, it.kind, it.original].join(" ").toLowerCase();
    return `<div class="row" data-s="${key}" data-q="${esc(text)}">${itemHtml(it, key, is, uid, true)}</div>`;
  }).join("");

  const filters = ORDER.map((k) =>
    `<button class="chip filter" style="--c:var(--${k})" data-f="${k}" aria-pressed="false"><img class="em" src="${em(k)}" alt="">${esc(SECTIONS[k].short)}</button>`).join("");

  const body = `
<section class="hero"><div class="wrap">
<div class="over">Еженедельный обзор · по пятницам</div>
<h1>Психоанализ <em>за&nbsp;неделю</em></h1>
<p>Всё, что за неделю вышло о психоанализе: исследования, свежие номера журналов, подкасты и видео, новости сообщества, книги и культура — с пересказами по-русски.</p>
<div class="cta">${last ? `<a class="btn" href="${issueHref(last.id)}">Читать свежий выпуск</a>` : ""}<a class="btn ghost" href="https://t.me/${esc(env.CHANNEL.replace(/^@/, ""))}">Канал в Telegram</a></div>
</div>${WAVES}</section>
${feat}
<div class="wrap grid">
<main>
<div class="h-sec"><h2>Все материалы</h2><span class="over muted">${plural(total, "материал", "материала", "материалов")}</span></div>
${items.length ? `<div class="tools"><input class="search" type="search" placeholder="Поиск: автор, журнал, тема…" aria-label="Поиск по материалам">${filters}</div>
<div id="list">${list}</div><p class="empty" id="none" hidden>Ничего не нашлось.</p>` : `<p class="empty">Материалы появятся с первым выпуском.</p>`}
</main>
<aside><div class="sticky">
<div class="h-sec"><h2>Выпуски</h2></div>
<ul class="issues">${issues.map((is) => `<li><a href="${issueHref(is.id)}"><img src="${B}/cover/${esc(is.id)}.jpg" alt="" loading="lazy">
<div><div class="n">№ ${is.number}</div><div class="t">${esc(is.title)}</div>
<div class="d">${esc(period(is.period_from, is.period_to))}</div></div></a></li>`).join("") || `<li class="empty">Пока пусто</li>`}</ul>
<div class="about"><div class="ems">${ORDER.map((k) => `<img src="${em(k)}" alt="">`).join("")}</div><b>Как собирается обзор.</b> Каждую неделю мы просматриваем три десятка психоаналитических журналов, научные базы, подкасты и видеоканалы, сайты обществ, издательства и прессу. В обзор попадает только то, что можно открыть и проверить по ссылке; англоязычные материалы мы пересказываем по-русски.</div>
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
    title: "Психоанализ за неделю — Что-то на психоаналитическом", onHero: true,
    ld: { "@context": "https://schema.org", "@type": "Periodical", name: "Психоанализ за неделю", inLanguage: "ru",
      url: env.PUBLIC_URL + "/", description: "Еженедельный обзор: исследования, новые статьи психоаналитических журналов, подкасты, новости сообщества и культура." },
    description: "Всё, что за неделю вышло о психоанализе: исследования, новые статьи журналов, подкасты и видео, новости сообщества и культура — с пересказами по-русски.",
    body, env,
  });
}

export function renderIssue(issue, { prev, next }, env) {
  B = env.BASE || "";
  const secs = sorted(issue.sections);
  const n = countItems(issue);
  const uids = new Map(flat(issue).map((x) => [x.it, x.uid]));
  const body = `
${issue.status === "draft" ? `<div class="draft">Черновик — ещё не опубликован в канале</div>` : ""}
<section class="ihero"><div class="wrap">
<header class="ihead">
<a class="back" href="${B}/">← Все выпуски и материалы</a>
<div class="over">Выпуск № ${issue.number} · ${esc(period(issue.period_from, issue.period_to))}</div>
<h1>${esc(issue.title)}</h1>
${issue.lead ? `<p class="lead">${esc(issue.lead)}</p>` : ""}
<nav class="toc">${secs.map((s) =>
  `<a class="chip" style="--c:var(--${s.key})" href="#${s.key}"><img class="em" src="${em(s.key)}" alt="">${esc(SECTIONS[s.key].title)} · ${s.items.length}</a>`).join("")}</nav>
<button class="allsw" type="button">Развернуть все разделы</button>
</header></div>${WAVES}</section>
<div class="wrap">
<div class="body">
${secs.map((s, i) => `<details class="sec" id="${s.key}" style="--c:var(--${s.key})"${i === 0 ? " open" : ""}>
<summary><div class="sec-h"><img src="${em(s.key)}" alt="" loading="lazy"><h2>${esc(SECTIONS[s.key].title)}</h2><span class="rule"></span><span class="cnt">${s.items.length}</span><span class="tog" aria-hidden="true">+</span></div>
<div class="peek">${esc(s.items.slice(0, 3).map((it) => it.title).join(" · "))}${s.items.length > 3 ? " …" : ""}</div></summary>
${s.items.map((it) => itemHtml(it, s.key, issue, uids.get(it), false)).join("")}
</details>`).join("")}
<script>
(function(){
  var secs=[].slice.call(document.querySelectorAll('details.sec')), sw=document.querySelector('.allsw');
  function label(){ if(sw) sw.textContent = secs.every(function(d){return d.open}) ? 'Свернуть все разделы' : 'Развернуть все разделы'; }
  function openHash(){ var h=location.hash.slice(1); var d=h && document.getElementById(h);
    if(d && d.tagName==='DETAILS'){ d.open=true; d.scrollIntoView(); }
    var r=h && h.indexOf('r-')===0 && document.getElementById('t-'+h.slice(2)); if(r){ var p=r.closest('details'); if(p) p.open=true; } label(); }
  if(sw) sw.addEventListener('click',function(){ var all=secs.every(function(d){return d.open}); secs.forEach(function(d){d.open=!all}); label(); });
  secs.forEach(function(d){ d.addEventListener('toggle', label); });
  window.addEventListener('hashchange', openHash); openHash();
})();
</script>
</div>
${prev || next ? `<nav class="inav">
${prev ? `<a href="${issueHref(prev.id)}"><div class="over">← Предыдущий</div><div class="t">${esc(prev.title)}</div></a>` : ""}
${next ? `<a class="r" href="${issueHref(next.id)}"><div class="over">Следующий →</div><div class="t">${esc(next.title)}</div></a>` : ""}
</nav>` : `<div style="height:60px"></div>`}
</div>`;
  return layout({
    title: `№ ${issue.number}. ${issue.title} — Психоанализ за неделю`,
    description: issue.lead || `${plural(n, "материал", "материала", "материалов")} за ${period(issue.period_from, issue.period_to)}`,
    body, env, path: `/issue/${issue.id}/`, image: issue.cover, onHero: true, noindex: issue.status !== "published",
    ld: {
      "@context": "https://schema.org", "@type": "PublicationIssue", issueNumber: issue.number,
      name: issue.title, description: issue.lead, inLanguage: "ru",
      datePublished: (issue.published_at || issue.created_at || "").slice(0, 10) || undefined,
      url: env.PUBLIC_URL + `/issue/${issue.id}/`, image: issue.cover || undefined,
      isPartOf: { "@type": "Periodical", name: "Психоанализ за неделю", url: env.PUBLIC_URL + "/",
        publisher: { "@type": "Organization", name: "Что-то на психоаналитическом", url: `https://t.me/${env.CHANNEL.replace(/^@/, "")}` } },
      hasPart: flat(issue).filter((x) => x.key !== "journals").map(({ it }) => ({
        "@type": "CreativeWork", name: it.title, alternateName: it.original,
        url: /^https?:\/\//i.test(it.url || "") ? it.url : undefined, abstract: it.summary })),
    },
  });
}

export function renderNotFound(env) {
  B = env.BASE || "";
  return layout({
    title: "Не найдено — Психоанализ за неделю", description: "", env, noindex: true,
    body: `<section class="wrap mast"><div class="over">404</div><h1>Такой страницы <em>нет</em></h1>
<p><a href="${B}/">Вернуться к выпускам</a></p></section>`,
  });
}
