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
SECTIONS = [("science", "Наука", "#8fd0cd"), ("neuro", "Мозг и психика", "#c3b3e6"), ("journals", "Журналы", "#e6c27a"),
            ("community", "Сообщество", "#f0a37c"), ("ru", "По-русски", "#e8998a"),
            ("media", "Подкасты и видео", "#a9bde0"), ("culture", "Культура", "#8fd2b4")]


def period(a, b):
    (ya, ma, da), (yb, mb, db) = [map(int, x.split("-")) for x in (a, b)]
    if ma != mb:
        return f"{da} {MONTHS[ma-1]} – {db} {MONTHS[mb-1]} {yb}"
    return f"{da}–{db} {MONTHS[mb-1]} {yb}"


BRAND = Path(__file__).resolve().parent.parent / "brand"


def background(issue_id):
    """Своя иллюстрация выпуска (brand/issues/<id>.jpg), иначе общая картинка журнала."""
    own = BRAND / "issues" / f"{issue_id}.jpg"
    return (own if own.exists() else BRAND / "cover-bg.jpg").as_uri()


def rgb(hex_, default):
    h = (hex_ or default).lstrip("#")
    return ",".join(str(int(h[i:i + 2], 16)) for i in (0, 2, 4))


def page(d, number):
    e = html.escape
    counts = {s["key"]: len(s["items"]) for s in d["sections"]}
    if "journals" in counts:
        counts["journals"] = sum(len(i.get("articles", [])) or 1 for s in d["sections"] if s["key"] == "journals" for i in s["items"])
    chips = "".join(
        f'<span class="chip"><i style="background:{c}"></i>{name} · {counts[k]}</span>'
        for k, name, c in SECTIONS if counts.get(k))
    title = e(d["title"])
    theme = d.get("theme") or {}
    bg, shade = background(d["id"]), rgb(theme.get("shade"), "#10181a")
    size = 96 if len(d["title"]) <= 28 else 80 if len(d["title"]) <= 44 else 66
    return f"""<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Manrope:wght@600;700&display=block" rel="stylesheet">
<style>
*{{margin:0;box-sizing:border-box}}
body{{width:{W}px;height:{H}px;overflow:hidden;color:#f6f1ea;font-family:Manrope,sans-serif;
  background:#1c2729 url("{bg}") right center/cover no-repeat}}
.shade{{position:absolute;inset:0;background:linear-gradient(90deg,rgba({shade},.72) 0%,rgba({shade},.45) 45%,rgba({shade},0) 70%)}}
.frame{{position:absolute;inset:26px;border:1px solid rgba(240,215,190,.55);border-radius:4px}}
.in{{position:absolute;inset:70px 84px 62px;display:flex;flex-direction:column;max-width:760px}}
.over{{font:700 15px/1 Manrope,sans-serif;letter-spacing:.28em;text-transform:uppercase;color:#f0c7a6}}
.kick{{font:italic 500 40px/1 "Cormorant Garamond",serif;color:#f2d6c2;margin-top:52px}}
h1{{font:500 {size}px/1.0 "Cormorant Garamond",serif;margin-top:14px;letter-spacing:-.01em;text-shadow:0 2px 24px rgba(30,0,40,.45)}}
.foot{{margin-top:auto;display:flex;flex-direction:column;gap:22px}}
.no{{font-weight:700;font-size:21px;letter-spacing:.04em;color:#ffe9c9}}
.no b{{font:500 40px/1 "Cormorant Garamond",serif;letter-spacing:0;margin-right:14px;color:#f0b48c}}
.chips{{display:flex;gap:9px;flex-wrap:wrap;max-width:740px}}
.chip{{font-weight:600;font-size:17px;padding:9px 15px;border-radius:99px;background:rgba({shade},.4);
  border:1px solid rgba(240,215,190,.35);display:inline-flex;align-items:center;gap:9px;backdrop-filter:blur(6px)}}
.chip i{{width:9px;height:9px;border-radius:50%;display:inline-block}}
</style></head><body>
<div class="shade"></div><div class="frame"></div>
<div class="in">
<div class="over">Что-то на психоаналитическом</div>
<div class="kick">Психоанализ за неделю</div>
<h1>{title}</h1>
<div class="foot"><div class="chips">{chips}</div><div class="no"><b>№ {number}</b>{e(period(d["period_from"], d["period_to"]))}</div></div>
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
                        f"--window-size={W},{H}", "--virtual-time-budget=8000", "--allow-file-access-from-files",
                        f"--screenshot={png}", p.as_uri()], check=True, capture_output=True)
    # PNG весит ~700 КБ, JPEG того же вида — в несколько раз меньше.
    subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "88", str(png), "--out", str(out)],
                   check=True, capture_output=True)
    png.unlink()
    print(out)


if __name__ == "__main__":
    main()
