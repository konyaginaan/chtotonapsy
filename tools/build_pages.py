#!/usr/bin/env python3
"""Собирает статическую копию журнала для GitHub Pages из /api/export воркера.

    python3 tools/build_pages.py _site

Воркер отдаёт готовые страницы (с префиксом /chtotonapsy в ссылках) и адреса обложек;
здесь они только раскладываются по папкам.
"""
import json, shutil, sys, urllib.request
from pathlib import Path

API = "https://chtotonapsy.norevia.workers.dev/api/export"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "chtotonapsy-pages"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main():
    out = Path(sys.argv[1])
    data = json.loads(fetch(API))
    for path, text in data["files"].items():
        f = out / path
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(text, encoding="utf-8")
    for path, url in data["covers"].items():
        f = out / path
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_bytes(fetch(url))
    # картинки оформления лежат в репозитории
    shutil.copytree(Path(__file__).resolve().parent.parent / "public", out, dirs_exist_ok=True)
    (out / ".nojekyll").write_text("")
    print(f"{len(data['files'])} страниц, {len(data['covers'])} обложек → {out}")


if __name__ == "__main__":
    main()
