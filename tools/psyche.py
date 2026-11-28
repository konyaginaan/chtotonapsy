#!/usr/bin/env python3
"""Новые номера журнала PSYCHE (Klett-Cotta) для отдельных постов в канале.

    python3 -I tools/psyche.py            — свежий номер: JSON с оглавлением и аннотациями,
                                             поле "new" — вышел ли он после последнего поста;
    python3 -I tools/psyche.py --mark 80-12 — записать номер как обработанный (пост отправлен
                                             на одобрение или номер пропущен по безопасности).

Номера и DOI — из Crossref (ISSN 0033-2623), аннотации — со страниц статей в eLibrary
Klett-Cotta (doi.org/10.21706/ps-…). Состояние — state/psyche.json.
Сеть — через curl: у python urllib на этой машине не проходит проверка SSL.
"""
import html, json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / "state" / "psyche.json"
ISSN = "0033-2623"


def get(url):
    r = subprocess.run(["curl", "-sSL", "-m", "60", "-A", "Mozilla/5.0 (chtotonapsy digest)", url],
                       capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"Не загрузилось: {url}\n{r.stderr}")
    return r.stdout


def state():
    return json.loads(STATE.read_text()) if STATE.exists() else {"done": []}


def text_lines(page):
    page = re.sub(r"(?s)<(script|style).*?</\1>", "", page)
    page = html.unescape(re.sub(r"<[^>]+>", "\n", page))
    return [l.strip() for l in page.splitlines() if l.strip()]


def article(doi, title):
    L = text_lines(get(f"https://doi.org/{doi}"))
    def after(label, stop):
        idx = [i for i, l in enumerate(L) if l == label]
        if not idx or (label == "Zusammenfassung" and len(idx) < 2):
            return ""  # «Zusammenfassung» встречается дважды: вкладка и сам раздел
        out = []
        for l in L[idx[-1] + 1:]:
            if l in stop:
                break
            out.append(l)
        return " ".join(out)
    stops = {"Abstract", "Schlüsselwörter", "Literatur", "Ähnlicher Inhalt", "Résumé"}
    sub = ""
    months = ("Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August",
              "September", "Oktober", "November", "Dezember")
    try:
        i = L.index("PSYCHE", L.index("Dokument verlinken"))
        j = next(k for k in range(i + 1, i + 6) if L[k] == title)
        sub = "" if L[j + 1].startswith(months) else L[j + 1]
    except (ValueError, IndexError, StopIteration):
        pass
    return {"subtitle": sub, "abstract_de": after("Zusammenfassung", stops)[:3000],
            "abstract_en": after("Abstract", stops)[:3000]}


def latest():
    q = f"https://api.crossref.org/journals/{ISSN}/works?sort=published&order=desc&rows=60&select=DOI,title,issue,volume,author,page,published"
    items = json.loads(get(q))["message"]["items"]
    vol, iss = items[0]["volume"], items[0]["issue"]
    key = f"{vol}-{iss}".replace("/", "-")
    arts = []
    for w in items:
        if w.get("volume") != vol or w.get("issue") != iss or not w.get("title"):
            continue
        a = {"doi": w["DOI"], "title": w["title"][0], "pages": w.get("page", ""),
             "authors": [" ".join(filter(None, [x.get("given"), x.get("family")])) for x in w.get("author", [])],
             "url": f"https://doi.org/{w['DOI']}"}
        a.update(article(w["DOI"], a["title"]))
        arts.append(a)
    arts.sort(key=lambda a: int(re.match(r"\d+", a["pages"] or "0").group() or 0))
    return {"key": key, "volume": vol, "issue": iss, "year": items[0]["published"]["date-parts"][0][0],
            "issue_url": f"https://elibrary.klett-cotta.de/journal/ps/{vol}/{iss}",
            "new": key not in state()["done"], "articles": arts}


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--mark":
        s = state()
        if sys.argv[2] not in s["done"]:
            s["done"].append(sys.argv[2])
        STATE.parent.mkdir(exist_ok=True)
        STATE.write_text(json.dumps(s, ensure_ascii=False, indent=1) + "\n")
        print("отмечен", sys.argv[2])
    else:
        print(json.dumps(latest(), ensure_ascii=False, indent=1))
