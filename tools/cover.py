#!/usr/bin/env python3
"""Обложка выпуска для поста: issues/<id>.json → issues/<id>.jpg (1280×720 при плотности 1.5).

    python3 tools/cover.py issues/2026-11-20.json [номер]

Номер выпуска передаётся вторым аргументом (по умолчанию берётся поле number из JSON или 1).
Снимок делает headless Chrome, шрифты — Google Fonts, как в журнале.
"""
import html, json, subprocess, sys, tempfile
from pathlib import Path

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
W, H = 1280, 720
MONTHS = "января февраля марта апреля мая июня июля августа сентября октября ноября декабря".split()
SECTIONS = [("science", "Наука", "#a9b4f5"), ("journals", "Журналы", "#e8cd86"),
            ("community", "Сообщество", "#eab0d3"), ("ru", "По-русски", "#f0b496"),
            ("media", "Подкасты и видео", "#f4a9b6"), ("culture", "Культура", "#93d6c1")]


def period(a, b):
    (ya, ma, da), (yb, mb, db) = [map(int, x.split("-")) for x in (a, b)]
    if ma != mb:
        return f"{da} {MONTHS[ma-1]} – {db} {MONTHS[mb-1]} {yb}"
    return f"{da}–{db} {MONTHS[mb-1]} {yb}"


def page(d, number):
    e = html.escape
    counts = {s["key"]: len(s["items"]) for s in d["sections"]}
    if "journals" in counts:
        counts["journals"] = sum(len(i.get("articles", [])) or 1 for s in d["sections"] if s["key"] == "journals" for i in s["items"])
    chips = "".join(
        f'<span class="chip"><i style="background:{c}"></i>{name} · {counts[k]}</span>'
        for k, name, c in SECTIONS if counts.get(k))
    title = e(d["title"])
    size = 104 if len(d["title"]) <= 28 else 88 if len(d["title"]) <= 44 else 72
    return f"""<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Manrope:wght@600;700&display=block" rel="stylesheet">
<style>
*{{margin:0;box-sizing:border-box}}
body{{width:{W}px;height:{H}px;overflow:hidden;color:#fbf3f8;font-family:Manrope,sans-serif;
  background:radial-gradient(120% 140% at 85% 10%,#7b3a63 0%,#4a2040 45%,#22121f 100%)}}
.psi{{position:absolute;right:-40px;top:-170px;font:italic 500 900px/1 "Cormorant Garamond",serif;color:rgba(255,220,240,.05)}}
.frame{{position:absolute;inset:28px;border:1px solid rgba(255,225,242,.28);border-radius:18px}}
.in{{position:absolute;inset:72px 84px 64px;display:flex;flex-direction:column}}
.over{{font-weight:700;font-size:17px;letter-spacing:.24em;text-transform:uppercase;color:#e9bfdc}}
.kick{{font:italic 500 40px/1 "Cormorant Garamond",serif;color:#f4d9ea;margin-top:56px}}
h1{{font:500 {size}px/1.02 "Cormorant Garamond",serif;margin-top:14px;max-width:1000px;letter-spacing:-.01em}}
.foot{{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:24px}}
.no{{font-weight:700;font-size:22px;letter-spacing:.04em}}
.no b{{display:block;font:500 64px/1 "Cormorant Garamond",serif;letter-spacing:0;margin-bottom:6px}}
.chips{{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;max-width:820px}}
.chip{{font-weight:600;font-size:18px;padding:10px 16px;border-radius:99px;background:rgba(255,235,247,.1);
  border:1px solid rgba(255,225,242,.2);display:inline-flex;align-items:center;gap:9px}}
.chip i{{width:9px;height:9px;border-radius:50%;display:inline-block}}
</style></head><body>
<div class="psi">ψ</div><div class="frame"></div>
<div class="in">
<div class="over">Что-то на психоаналитическом</div>
<div class="kick">Психоанализ за неделю</div>
<h1>{title}</h1>
<div class="foot"><div class="no"><b>№ {number}</b>{e(period(d["period_from"], d["period_to"]))}</div>
<div class="chips">{chips}</div></div>
</div></body></html>"""


def main():
    src = Path(sys.argv[1])
    d = json.loads(src.read_text())
    number = int(sys.argv[2]) if len(sys.argv) > 2 else d.get("number", 1)
    out = src.with_suffix(".jpg")
    png = Path(tempfile.gettempdir()) / f"cover-{src.stem}.png"
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp) / "cover.html"
        p.write_text(page(d, number))
        subprocess.run([CHROME, "--headless=new", "--hide-scrollbars", "--force-device-scale-factor=1.5",
                        f"--window-size={W},{H}", "--virtual-time-budget=8000",
                        f"--screenshot={png}", p.as_uri()], check=True, capture_output=True)
    # PNG весит ~700 КБ, JPEG того же вида — в несколько раз меньше.
    subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "88", str(png), "--out", str(out)],
                   check=True, capture_output=True)
    png.unlink()
    print(out)


if __name__ == "__main__":
    main()
