#!/usr/bin/env python3
"""Статистика журнала из Яндекс Метрики → заметка в базе Obsidian «Клодик».

    python3 -I tools/site_stats.py [дней=7] [путь к базе]

Токен Метрики (права metrika:read) лежит в связке ключей macOS:
    security add-generic-password -a "$USER" -s yandex-metrika-chtotonapsy -w
Пишет «Канал/Сайт/Сайт ГГГГ-ММ-ДД.md»: посещаемость, источники, выпуски, цели
(пересказы, разделы, первоисточники, переход в канал) и какие пересказы открывали.
Выводы словами дописывает человек или Claude поверх цифр.
"""
import json, re, subprocess, sys, urllib.parse, datetime
from pathlib import Path

COUNTER = 114414582
GOALS = {"retelling": (686785100, "открыли пересказ"), "section": (686785117, "развернули раздел"),
         "source": (686785119, "перешли к первоисточнику"), "telegram": (686785120, "перешли в канал")}
DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 7
VAULT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path.home() / "Desktop" / "Клодик"
ROOT = Path(__file__).resolve().parent.parent


def token():
    r = subprocess.run(["security", "find-generic-password", "-s", "yandex-metrika-chtotonapsy", "-w"],
                       capture_output=True, text=True)
    if r.returncode:
        sys.exit("Нет токена Метрики в связке ключей (yandex-metrika-chtotonapsy) — см. начало файла.")
    return r.stdout.strip()


TOKEN = None


def api(**params):
    params.setdefault("ids", COUNTER)
    params.setdefault("date1", f"{DAYS}daysAgo")
    params.setdefault("date2", "today")
    params.setdefault("accuracy", "full")
    url = "https://api-metrika.yandex.net/stat/v1/data?" + urllib.parse.urlencode(params)
    r = subprocess.run(["curl", "-sS", "-m", "60", "-H", f"Authorization: OAuth {TOKEN}", url],
                       capture_output=True, text=True)
    d = json.loads(r.stdout or "{}")
    if "errors" in d:
        sys.exit(f"Метрика ответила ошибкой: {d.get('message') or d['errors']}")
    return d


def rows(d):
    return [([x.get("name") or x.get("id") or "—" for x in r["dimensions"]], r["metrics"]) for r in d.get("data", [])]


def titles():
    """uid материала (<выпуск>-<k>) → название, по файлам выпусков (порядок как на сайте)."""
    order = ["science", "journals", "community", "ru", "media", "culture"]
    out = {}
    for f in sorted((ROOT / "issues").glob("*.json")):
        d = json.loads(f.read_text())
        n = 0
        for key in order:
            for s in d["sections"]:
                if s["key"] == key:
                    for it in s["items"]:
                        n += 1
                        out[f"{d['id']}-{n}"] = it["title"]
    return out


def n(x):
    x = float(x)
    return str(int(round(x))) if abs(x - round(x)) < 0.05 or x >= 100 else f"{x:.1f}".replace(".", ",")


def main():
    global TOKEN
    TOKEN = token()
    today = datetime.date.today().isoformat()
    tot = api(metrics="ym:s:visits,ym:s:users,ym:s:pageviews,ym:s:avgVisitDurationSeconds,ym:s:bounceRate,ym:s:pageDepth")["totals"]
    visits, users, pv, dur, bounce, depth = tot
    src = rows(api(dimensions="ym:s:lastTrafficSource", metrics="ym:s:visits", sort="-ym:s:visits"))
    utm = rows(api(dimensions="ym:s:UTMCampaign", metrics="ym:s:visits", sort="-ym:s:visits"))
    pages = rows(api(dimensions="ym:pv:URLPath", metrics="ym:pv:pageviews", sort="-ym:pv:pageviews", limit=30))
    gm = ",".join(f"ym:s:goal{gid}reaches" for gid, _ in GOALS.values())
    goals = api(metrics=gm)["totals"]
    params = rows(api(dimensions="ym:s:paramsLevel1,ym:s:paramsLevel2", metrics="ym:s:visits",
                      sort="-ym:s:visits", limit=50))
    names = titles()

    goal_rows = "\n".join(f"| {label} | {n(v)} | {n(100 * float(v) / max(1, float(visits)))}% |"
                          for (gid, label), v in zip(GOALS.values(), goals))
    src_rows = "\n".join(f"| {d[0]} | {n(m[0])} |" for d, m in src) or "| — | 0 |"
    pie = "\n".join(f'    "{d[0]}" : {n(m[0])}' for d, m in src if float(m[0]) > 0)
    utm_rows = "\n".join(f"| {d[0]} | {n(m[0])} |" for d, m in utm if d[0] not in ("—", None)) or "| — | — |"
    page_rows = "\n".join(f"| {d[0]} | {n(m[0])} |" for d, m in pages) or "| — | 0 |"
    ret = [(names.get(d[1], d[1]), m[0]) for d, m in params if d[0] == "uid"]
    sec = [(d[1], m[0]) for d, m in params if d[0] == "key"]
    ret_rows = "\n".join(f"| {t} | {n(v)} |" for t, v in ret[:15]) or "| пока никто | — |"
    sec_rows = "\n".join(f"| {t} | {n(v)} |" for t, v in sec) or "| пока никто | — |"

    out = VAULT / "Канал" / "Сайт"
    out.mkdir(parents=True, exist_ok=True)
    (out / f"Сайт {today}.md").write_text(f"""---
дата: {today}
период: последние {DAYS} дней
cssclasses: [klodik]
---
# Журнал на сайте · {today}

> [!цифры] За {DAYS} дней
> - Визитов **{n(visits)}**, посетителей **{n(users)}**, просмотров страниц **{n(pv)}**.
> - В среднем **{n(depth)}** страницы за визит, **{n(float(dur) / 60)}** мин на сайте, отказов **{n(bounce)}%**.

## Откуда приходят
```mermaid
pie showData
  title Визиты по источникам
{pie or '    "нет данных" : 1'}
```

| Источник | Визиты |
|---|---|
{src_rows}

Из постов в Telegram (метки выпусков):

| Выпуск | Визиты |
|---|---|
{utm_rows}

## Что делают на сайте
| Действие | Сколько раз | На 100 визитов |
|---|---|---|
{goal_rows}

### Какие пересказы открывали
| Материал | Визиты с открытием |
|---|---|
{ret_rows}

### Какие разделы разворачивали
| Раздел | Визиты |
|---|---|
{sec_rows}

## Какие страницы смотрят
| Страница | Просмотры |
|---|---|
{page_rows}

## Выводы
> [!вывод] Что говорят цифры
> _Дописывается поверх цифр._
""", encoding="utf-8")
    print(f"Метрика: {n(visits)} визитов за {DAYS} дней → {out}")


if __name__ == "__main__":
    main()
