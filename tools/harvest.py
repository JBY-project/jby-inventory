#!/usr/bin/env python3
"""Harvest the production catalogue into one JSON the prototype can render from."""
import json, re, time, urllib.request, html, os

BASE = "https://jb.apdstack.com"
HDR = {"User-Agent": "jby-prototype-harvest"}

def get(url):
    req = urllib.request.Request(url, headers=HDR)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")

CARD = re.compile(r'<a href="(/yachts/[^"]+)" class="home-vessels-v2-card yacht-card">(.*?)</a>', re.S)

def field(block, pat, default=""):
    m = re.search(pat, block, re.S)
    return html.unescape(" ".join(m.group(1).split())) if m else default

def cards(page_html):
    out = []
    for m in CARD.finditer(page_html):
        href, body = m.group(1), m.group(2)
        out.append({
            "id": href.rsplit("/", 1)[-1],
            "href": BASE + href,
            "image": field(body, r'<img\s+src="([^"]+)"[^>]*class="home-vessels-v2-card__image'),
            "video": field(body, r'<source src="([^"]+)"'),
            "brand": field(body, r'class="home-vessels-v2-card__brand">\s*<img\s+src="([^"]+)"'),
            "brandAlt": field(body, r'class="home-vessels-v2-card__brand">\s*<img[^>]*alt="([^"]*)"'),
            "location": field(body, r'__location">(.*?)</p>'),
            "name": field(body, r'__name">(.*?)</h3>'),
            "price": field(body, r'__price">(.*?)</p>'),
        })
    return out

listings, order = {}, []
for p in range(1, 12):
    h = get(f"{BASE}/yachts?page={p}")
    if "home-vessels-v2-card yacht-card" not in h:
        break
    for c in cards(h):
        if c["id"] not in listings:
            listings[c["id"]] = c
            order.append(c["id"])
    print("page", p, "->", len(order), flush=True)

for cond in ("new", "preOwned"):
    for p in range(1, 8):
        h = get(f"{BASE}/yachts?vesselCondition={cond}&page={p}")
        ids = [c["id"] for c in cards(h)]
        if not ids:
            break
        for i in ids:
            if i in listings:
                listings[i]["condition"] = cond
    print("condition", cond, "done", flush=True)

LEN = re.compile(r"Length(?: Overall)?\s*</?[^>]*>?\s*([\d.,]+)\s*ft", re.I)
for n, i in enumerate(order, 1):
    try:
        d = get(listings[i]["href"])
        text = " ".join(re.sub(r"<[^>]+>", " ", d).split())
        m = re.search(r"Length Overall\s+([\d.,]+)\s*ft", text) or re.search(r"Length\s+([\d.,]+)\s*ft", text)
        listings[i]["length"] = float(m.group(1).replace(",", "")) if m else None
        m2 = re.search(r"Beam\s+([\d.,]+)\s*ft", text)
        listings[i]["beam"] = float(m2.group(1).replace(",", "")) if m2 else None
    except Exception as e:
        listings[i]["length"] = None
        print("  !", i, e, flush=True)
    if n % 10 == 0:
        print("  specs", n, "/", len(order), flush=True)
    time.sleep(0.2)

data = [listings[i] for i in order]
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "listings.json")
json.dump(data, open(out, "w"), indent=1)
print("wrote", out, len(data), "listings")
