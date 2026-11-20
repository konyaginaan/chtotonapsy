#!/usr/bin/env python3
"""История и аналитика канала @chtotonapsy в базе Obsidian «Клодик».

    python3 -I tools/channel_stats.py [путь к базе]   (по умолчанию ~/Desktop/Клодик)

Читает публичную ленту t.me/s/chtotonapsy (просмотры и реакции; пересылки публично не видны)
и пишет в базу:
  Канал/История постов.md          — все посты, свежие сверху, с типом, просмотрами, реакциями;
  Канал/Аналитика/Срез ГГГГ-ММ-ДД.md — сводка по типам, дням недели, топ постов;
  Канал/Данные/срезы.csv          — просмотры и реакции каждого поста на дату среза (для динамики).
Выводы словами в срезы не пишутся — их добавляет человек или Claude поверх цифр.
Сеть — через curl: у python urllib на этой машине не проходит проверка SSL.
"""
import csv, datetime, html, re, statistics as st, subprocess, sys
from collections import defaultdict
from pathlib import Path

CH = "chtotonapsy"
VAULT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Desktop" / "Клодик"
DAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"]


def get(url):
    return subprocess.run(["curl", "-sL", "-m", "40", "-A", "Mozilla/5.0", url], capture_output=True, text=True).stdout


def num(s):
    m = re.search(r"([\d.,]+)\s*([KM]?)", s or "")
    if not m:
        return 0
    v = float(m.group(1).replace(",", "."))
    return int(v * {"K": 1000, "M": 1000000}.get(m.group(2), 1))


def scrape():
    posts, before = {}, None
    for _ in range(80):
        page = get(f"https://t.me/s/{CH}" + (f"?before={before}" if before else ""))
        ids = []
        for b in re.split(r'<div class="tgme_widget_message_wrap', page)[1:]:
            m = re.search(rf'data-post="{CH}/(\d+)"', b)
            if not m:
                continue
            i = int(m.group(1)); ids.append(i)
            t = re.search(r"tgme_widget_message_text[^>]*>(.*?)</div>", b, re.S)
            text = re.sub(r"<[^>]+>", "", html.unescape(re.sub(r"<br\s*/?>", "\n", t.group(1)))).strip() if t else ""
            views = re.search(r'tgme_widget_message_views">([^<]+)<', b)
            date = re.search(r'datetime="([^"]+)"', b)
            react = sum(num(re.sub(r"<[^>]+>", " ", r).split()[-1]) for r in
                        re.findall(r'class="tgme_reaction[^"]*">(.*?)</span>', b, re.S) if re.sub(r"<[^>]+>", " ", r).split())
            media = ("документ" if "tgme_widget_message_document" in b else "видео" if "tgme_widget_message_video" in b
                     else "фото" if "tgme_widget_message_photo" in b else "")
            posts[i] = dict(id=i, date=date.group(1)[:10] if date else "", views=num(views.group(1)) if views else 0,
                            react=react, media=media, text=text)
        if not ids or min(ids) <= 1:
            break
        before = min(ids)
    return sorted(posts.values(), key=lambda p: -p["id"])


def kind(p):
    t = p["text"].lower()
    if not t:
        return "без текста"
    if "психоанализ за неделю" in t:
        return "обзор недели"
    if t.startswith("художка") or "книжный психоаналитический клуб" in t:
        return "книжный клуб"
    if re.search(r"семинар|ридинг|набор |мастерск|старт:|регистрац|записаться|стрим|зум", t):
        return "анонс встречи"
    if re.search(r"obsidian|обсидиан|claude|_bot|\bбот|приложени|читалк|нейросет|chatgpt|чат ?гпт|\bии\b|gpt", t):
        return "инструменты и ИИ"
    if re.search(r"конспект", t) or p["media"] == "документ":
        return "конспект или файл"
    if re.search(r"исследовани|данные показывают|метаанализ|случая", t):
        return "исследование или случай"
    if re.search(r"бион|кляйн|огден|винникотт|фрейд|лакан|розенфельд|проективн|позици|перенос|контейн|мышлени|символизац|пациент|аналитик|бессознат", t):
        return "мысль о теории"
    return "личное и прочее"


def fmt(x):
    """9.0 → 9, 393.5 → 393,5 — по-русски и без лишних нулей."""
    return str(int(x)) if float(x).is_integer() else str(x).replace(".", ",")


def first_line(t, n=90):
    t = re.sub(r"\s+", " ", t).strip().replace("|", "/")
    return (t[:n].rsplit(" ", 1)[0] + "…") if len(t) > n else (t or "—")


def main():
    posts = scrape()
    today = datetime.date.today().isoformat()
    base = VAULT / "Канал"
    (base / "Аналитика").mkdir(parents=True, exist_ok=True)
    (base / "Данные").mkdir(parents=True, exist_ok=True)

    rows = "\n".join(
        f"| [{p['id']}](https://t.me/{CH}/{p['id']}) | {p['date']} | {kind(p)} | {p['views']} | {p['react']} | {first_line(p['text'])} |"
        for p in posts)
    (base / "История постов.md").write_text(f"""---
обновлено: {today}
cssclasses: [klodik]
---
# История постов @{CH}

> [!цифры] {len(posts)} постов · обновлено {today}
> Свежие сверху. Обновляется скриптом `tools/channel_stats.py` (проект chtotonapsy), обычно по пятницам. Пересылки публично не видны, есть только просмотры и реакции. Разбор цифр — в срезах, см. [[Канал — хаб]].

| Пост | Дата | Тип | Просмотры | Реакции | Начало текста |
|---|---|---|---|---|---|
{rows}
""", encoding="utf-8")

    # Сырые цифры всех срезов; повторный запуск в тот же день заменяет строки этого дня.
    csv_path = base / "Данные" / "срезы.csv"
    old = []
    if csv_path.exists():
        with csv_path.open(encoding="utf-8") as f:
            old = [r for r in csv.reader(f)][1:]
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["срез", "пост", "дата", "тип", "просмотры", "реакции"])
        w.writerows(r for r in old if r and r[0] != today)
        for p in posts:
            w.writerow([today, p["id"], p["date"], kind(p), p["views"], p["react"]])

    year_ago = (datetime.date.today() - datetime.timedelta(days=365)).isoformat()
    recent = [p for p in posts if p["date"] >= year_ago and p["views"]]
    by = defaultdict(list)
    for p in recent:
        by[kind(p)].append(p)
    types = "\n".join(
        f"| {k} | {len(v)} | {fmt(st.median([p['react'] for p in v]))} | {max(p['react'] for p in v)} | {fmt(st.median([p['views'] for p in v]))} | {fmt(round(100 * sum(p['react'] for p in v) / max(1, sum(p['views'] for p in v)), 1))} |"
        for k, v in sorted(by.items(), key=lambda kv: -st.median([p["react"] for p in kv[1]])))
    wd = defaultdict(list)
    for p in recent:
        wd[datetime.date.fromisoformat(p["date"]).weekday()].append(p["react"])
    days = " · ".join(f"{DAYS[d]} — {len(wd[d])}" for d in range(7) if wd[d])
    top = lambda key, n=10: "\n".join(
        f"| [{p['id']}](https://t.me/{CH}/{p['id']}) | {p['date']} | {kind(p)} | {p['views']} | {p['react']} | {first_line(p['text'], 70)} |"
        for p in sorted(recent, key=lambda p: -p[key])[:n])
    med_r = fmt(st.median([p["react"] for p in recent])) if recent else 0
    med_v = fmt(st.median([p["views"] for p in recent])) if recent else 0
    order = sorted(by.items(), key=lambda kv: -st.median([p["react"] for p in kv[1]]))
    bars = ", ".join(f'"{k}"' for k, _ in order)
    vals = ", ".join(str(st.median([p["react"] for p in v])) for _, v in order)
    pie = "\n".join(f'    "{k}" : {sum(p["react"] for p in v)}' for k, v in order)
    dvals = ", ".join(str(st.median(wd[d]) if wd[d] else 0) for d in range(7))
    best = order[0][0] if order else "—"
    (base / "Аналитика" / f"Срез {today}.md").write_text(f"""---
дата: {today}
период: последние 12 месяцев
постов: {len(recent)}
cssclasses: [klodik]
---
# Срез аналитики · {today}

> [!цифры] Коротко
> - Обычный пост: **{med_r}** реакций и **{med_v}** просмотров (медианы за 12 месяцев, {len(recent)} постов).
> - Всего публичных постов в канале: **{len(posts)}**.
> - Лучше всего работает тип «**{best}**».

## Реакции по типам постов
```mermaid
xychart-beta
  title "Медиана реакций на пост"
  x-axis [{bars}]
  y-axis "реакции"
  bar [{vals}]
```

```mermaid
pie showData
  title Все реакции за год по типам
{pie}
```

| Тип | Постов | Медиана реакций | Максимум | Медиана просмотров | Реакций на 100 просмотров |
|---|---|---|---|---|---|
{types}

## Дни недели
```mermaid
xychart-beta
  title "Медиана реакций по дням публикации"
  x-axis [пн, вт, ср, чт, пт, сб, вс]
  y-axis "реакции"
  bar [{dvals}]
```
Число постов по дням: {days}

## Больше всего реакций
| Пост | Дата | Тип | Просмотры | Реакции | Начало |
|---|---|---|---|---|---|
{top('react')}

## Больше всего просмотров
Скорее всего, эти посты пересылали.

| Пост | Дата | Тип | Просмотры | Реакции | Начало |
|---|---|---|---|---|---|
{top('views')}

## Выводы
> [!вывод] Что говорят цифры
> _Дописывается поверх цифр._
""", encoding="utf-8")
    print(f"{len(posts)} постов, срез {today} → {base}")


if __name__ == "__main__":
    main()
