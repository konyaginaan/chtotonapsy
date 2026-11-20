#!/usr/bin/env python3
"""Сбор кандидатов за неделю по постоянным источникам из sources.json.

    python3 -I tools/collect.py 2026-11-13 2026-11-20 > out/candidates.md

Журналы — новые DOI в Crossref за период (по дате регистрации), сгруппированные по номерам;
подкасты и YouTube — записи RSS с датой в периоде. Это сырьё: что из него брать в выпуск,
решает тот, кто собирает обзор, и всё равно проверяет.
Сеть — через curl: у python urllib на этой машине не проходит проверка SSL.
"""
import json, re, subprocess, sys, html
import xml.etree.ElementTree as ET
from collections import defaultdict
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAILTO = "konyagina.an@gmail.com"  # вежливый доступ к Crossref


def get(url):
    r = subprocess.run(["curl", "-sSL", "-m", "60", "-A", "Mozilla/5.0 (chtotonapsy digest)", url],
                       capture_output=True, text=True)
    return r.stdout


def clean(s, n=400):
    s = html.unescape(re.sub(r"<[^>]+>", " ", s or ""))
    s = re.sub(r"\s+", " ", s).strip()
    return s if len(s) <= n else s[:n].rsplit(" ", 1)[0] + "…"


def journals(src, a, b):
    out = []
    for j in src:
        url = (f"https://api.crossref.org/journals/{j['issn']}/works?rows=200&mailto={MAILTO}"
               f"&filter=from-created-date:{a},until-created-date:{b}")
        try:
            items = json.loads(get(url))["message"]["items"]
        except Exception as e:
            out.append({"journal": j["name"], "error": str(e)})
            continue
        issues = defaultdict(list)
        for w in items:
            if w.get("type") != "journal-article":
                continue
            key = (w.get("volume") or "?", w.get("issue") or "онлайн до номера")
            issues[key].append({
                "title": clean(" ".join(w.get("title") or [])),
                "authors": ", ".join(f"{x.get('family', '')} {x.get('given', '')[:1]}.".strip()
                                     for x in (w.get("author") or [])[:4]) + (" и др." if len(w.get("author") or []) > 4 else ""),
                "doi": "https://doi.org/" + w["DOI"],
                "abstract": clean(w.get("abstract"), 600),
            })
        for (vol, iss), arts in sorted(issues.items()):
            out.append({"journal": j["name"], "volume": vol, "issue": iss, "count": len(arts),
                        "filter_by_topic": j.get("filter", False), "articles": arts})
    return out


def feed_items(xml_text):
    """Записи RSS/Atom: (дата ISO, заголовок, ссылка, описание)."""
    try:
        root = ET.fromstring(xml_text.encode())
    except ET.ParseError:
        return []
    ns = {"a": "http://www.w3.org/2005/Atom", "m": "http://search.yahoo.com/mrss/"}
    res = []
    for it in root.iter("item"):
        try:
            d = parsedate_to_datetime(it.findtext("pubDate") or "").date().isoformat()
        except Exception:
            continue
        link = it.findtext("link") or (it.find("enclosure").get("url") if it.find("enclosure") is not None else "")
        res.append((d, it.findtext("title"), link, it.findtext("description")))
    for e in root.findall("a:entry", ns):
        d = (e.findtext("a:published", namespaces=ns) or "")[:10]
        l = e.find("a:link", ns)
        res.append((d, e.findtext("a:title", namespaces=ns), l.get("href") if l is not None else "",
                    e.findtext("m:group/m:description", namespaces=ns)))
    return res


def feeds(src, a, b, url_of):
    out = []
    for s in src:
        items = [x for x in feed_items(get(url_of(s))) if a <= x[0] <= b]
        for d, t, l, desc in items:
            if "/shorts/" in (l or ""):
                continue  # короткие ролики на каналах институтов — почти всегда реклама курсов
            out.append({"source": s["name"], "date": d, "title": clean(t, 200), "url": l, "description": clean(desc, 500)})
    return sorted(out, key=lambda x: x["date"], reverse=True)


def main():
    a, b = sys.argv[1], sys.argv[2]
    src = json.loads((ROOT / "sources.json").read_text())
    res = {
        "period": [a, b],
        "journals": journals(src["journals"], a, b),
        "podcasts": feeds(src["podcasts"], a, b, lambda s: s["rss"]),
        "youtube": feeds(src["youtube"], a, b,
                         lambda s: f"https://www.youtube.com/feeds/videos.xml?channel_id={s['channel']}"),
    }
    print(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
