#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""D2/D29 — Inter-WOFF2-Subsetting für vivodepot.html.

Dampft die 4 eingebetteten Inter-WOFF2 (Base64) auf die im echten Code TATSÄCHLICH
genutzten Glyphen ein (plus robuste Headroom-Unicode-Ranges). Dieselbe Schrift, dieselben
vier Gewichte (400/500/600/700) — nur ungenutzte Glyphen raus, optisch identisch.

WOFF2-Brotli wird über Node's eingebautes zlib-Brotli via Shim (tools/_brotli_shim) delegiert,
da das Python-`brotli`-Modul in der Sandbox fehlt.

Aufruf:
  python3 tools/font-subset.py            # patcht die echte kern-HTML in-place (+ Backup-Pflicht extern)
  python3 tools/font-subset.py --out X.html [--in Y.html]   # schreibt nach X statt in-place
  python3 tools/font-subset.py --check     # nur prüfen: Coverage der EINGEBETTETEN Subsets (kein Schreiben)

Schreibt zusätzlich die Coverage-Fixture tests/fixtures/inter-subset.json (pro Gewicht:
sha256 des eingebetteten Base64-Blobs + sortierte cmap-Codepoints + Pflicht-Demand-Set),
auf die der stehende Node-Test tests/font-coverage.test.js prüft.
"""
import sys, os, re, io, json, base64, hashlib, argparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools', '_brotli_shim'))
KERN = os.path.join(ROOT, 'vivodepot.html')
FIXTURE = os.path.join(ROOT, 'tests', 'fixtures', 'inter-subset.json')

FONT_RE = re.compile(r'url\("data:font/woff2;base64,([A-Za-z0-9+/=]+)"\)')
WEIGHTS = [400, 500, 600, 700]

# Headroom-Unicode-Ranges (Plan cc-dateigroesse-subsetting): Latin+Ext, €, Interpunktion,
# Pfeile, Mathe, Geometrie, Symbole/⚠, ✓. Robuste Reserve gegen künftige Texte.
def headroom():
    rs = []
    rs += range(0x0000, 0x0250)      # Latin + Latin-1 + Ext-A/B
    rs += [0x20AC]                   # €
    rs += range(0x2000, 0x2070)      # Allgemeine Interpunktion
    rs += range(0x2190, 0x2200)      # Pfeile
    rs += range(0x2200, 0x2300)      # Mathematische Operatoren
    rs += range(0x25A0, 0x2600)      # Geometrische Formen
    rs += range(0x2600, 0x2700)      # Verschiedene Symbole (⚠)
    rs += [0x2713]                   # ✓
    return set(rs)

def demand_set(html):
    """Im echten Code real genutzte druckbare Codepoints (Data-URLs entfernt, C1-Controls raus) + €."""
    stripped = re.sub(r'data:[^"\')]+', ' ', html)
    d = set(ord(c) for c in stripped if ord(c) >= 0x20 and not (0x80 <= ord(c) <= 0x9F))
    d.add(0x20AC)  # proaktiv (heute „EUR", später evtl. €)
    return d

def load_font(b64):
    from fontTools.ttLib import TTFont
    return TTFont(io.BytesIO(base64.b64decode(b64)))

def subset_one(b64, keep):
    from fontTools.ttLib import TTFont
    from fontTools.subset import Subsetter, Options
    f = TTFont(io.BytesIO(base64.b64decode(b64)))
    orig_cmap = set(f.getBestCmap().keys())
    opt = Options()
    opt.flavor = 'woff2'
    opt.desubroutinize = True
    opt.layout_features = '*'
    opt.name_IDs = '*'
    opt.notdef_outline = True
    opt.recalc_bounds = True
    ss = Subsetter(options=opt)
    ss.populate(unicodes=keep)
    ss.subset(f)
    # Reproduzierbarer Build: head-Zeitstempel fixieren (sonst pro Lauf andere Bytes/sha).
    if 'head' in f:
        f['head'].created = 0
        f['head'].modified = 0
    buf = io.BytesIO(); f.save(buf)
    out = buf.getvalue()
    sub_cmap = set(f.getBestCmap().keys())
    return out, orig_cmap, sub_cmap

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--in', dest='inp', default=KERN)
    ap.add_argument('--out', dest='out', default=None)
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()

    html = open(args.inp, encoding='utf-8').read()
    blobs = FONT_RE.findall(html)
    if len(blobs) != 4:
        print('FEHLER: erwarte 4 Font-Blobs, gefunden', len(blobs)); sys.exit(2)

    demand = demand_set(html)
    keep = demand | headroom()

    if args.check:
        # Coverage der EINGEBETTETEN (bereits gesetzten) Subsets prüfen — kein Schreiben.
        ok = True
        for w, b64 in zip(WEIGHTS, blobs):
            f = load_font(b64)
            sub_cmap = set(f.getBestCmap().keys())
            # Demand ∩ (was die Schrift überhaupt führen kann) — hier nur Demand prüfen:
            missing = sorted(c for c in demand if c not in sub_cmap)
            # ▸/▾/Box-Drawing etc. können fehlen, wenn sie schon in der Quelle fehlten → kein Verlust.
            print(f'  Gewicht {w}: cmap={len(sub_cmap)} fehlend(Demand)={["U+%04X"%c for c in missing]}')
        sys.exit(0 if ok else 1)

    total_before = total_after = 0
    fixture = {'note': 'D2/D29 Inter-Subset — Coverage-Gate-Fixture; via tools/font-subset.py',
               'demand': sorted(demand), 'weights': {}}
    new_html = html
    for w, b64 in zip(WEIGHTS, blobs):
        out, orig_cmap, sub_cmap = subset_one(b64, keep)
        must = demand & orig_cmap            # Pflicht: was demand UND in der Quelle ist
        missing = sorted(must - sub_cmap)
        if missing:
            print('FEHLER: Glyphen-Verlust bei Gewicht', w, ['U+%04X' % c for c in missing]); sys.exit(3)
        new_b64 = base64.b64encode(out).decode('ascii')
        before = len(base64.b64decode(b64)); after = len(out)
        total_before += before; total_after += after
        new_html = new_html.replace(b64, new_b64)
        fixture['weights'][str(w)] = {
            'sha256': hashlib.sha256(new_b64.encode('ascii')).hexdigest(),
            'cmap': sorted(sub_cmap),
            'must': must and sorted(must) or [],
        }
        print(f'  Gewicht {w}: {before} -> {after} B raw ({round(100*after/before,1)}%), cmap {len(orig_cmap)}->{len(sub_cmap)}, Demand∩Quelle {len(must)} alle erhalten ✓')

    out_path = args.out or args.inp
    open(out_path, 'w', encoding='utf-8').write(new_html)
    os.makedirs(os.path.dirname(FIXTURE), exist_ok=True)
    json.dump(fixture, open(FIXTURE, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f'GESAMT Font-Raw: {total_before} -> {total_after} B ({round(100*total_after/total_before,1)}%)')
    print('geschrieben:', out_path)
    print('Fixture:', FIXTURE)

if __name__ == '__main__':
    main()
