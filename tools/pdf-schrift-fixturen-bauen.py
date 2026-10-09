#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Baut die kleinen Test-Schriften für tests/pdf-schrift-pruefen.test.js (v896, Befund BRANDING-NICHT-IM-PDF).

Quelle: die PDF-Inter des Ab-Werk-Erscheinungsbilds (tools/erscheinung/erscheinungsbild-heute-modul.json, `schriften[]` mit
`pdf: true`, stil normal; OFL-1.1, Inter 4.x) — nichts wird heruntergeladen. Bis v895 stand sie als _PDF_INTER_REGULAR_B64 im Kern.
Jede Fixture ist auf Basis-Latein + Latein-1 (+ je nach Fall „ő“) zugeschnitten, damit sie klein bleibt:
  gut.ttf            fsType 0, trägt ő (U+0151)
  ohne-oe.ttf        fsType 0, ohne ő — Probe „Ödön Erdős“ → Rückfall auf die Template-Schrift
  fstype-bit1.ttf    fsType 0x0002 (Restricted License)
  fstype-bit8.ttf    fsType 0x0100 (kein Subsetting)
  fstype-bit9.ttf    fsType 0x0200 (nur Bitmap)
  ohne-umlaute.ttf   fsType 0, Basis-Latein + Latein-1 OHNE ä ö ü Ä Ö Ü ß — eine Profilschrift ohne Latein-Grunddeckung (baut nicht)
  gut.woff2          dieselbe Schrift als WOFF2 — jsPDF liest kein WOFF2, also „format“
  gut.ttf.cmap.json  cmap von gut.ttf, gelesen mit fontTools — Gegenprobe für den cmap-Leser des Kerns
Reproduzierbar (head-Zeitstempel 0). Aufruf: python3 tools/pdf-schrift-fixturen-bauen.py [--ziel <dir>] [--nur <name> …]
"""
import sys, os, io, re, base64, argparse
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools', '_brotli_shim'))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ziel', default=os.path.join(ROOT, 'tests', 'fixtures', 'pdf-schrift'))
    ap.add_argument('--nur', action='append', default=[])
    a = ap.parse_args()
    from fontTools.ttLib import TTFont
    from fontTools.subset import Subsetter, Options
    import json
    modul = json.load(open(os.path.join(ROOT, 'tools', 'erscheinung', 'erscheinungsbild-heute-modul.json'), encoding='utf-8'))
    b64 = next(s['ttf'] for s in modul['schriften'] if s.get('pdf') is True and s.get('stil') == 'normal' and s.get('familie') == 'Inter')
    basis = set(range(0x20, 0x7F)) | set(range(0xA0, 0x100))
    def bauen(name, unicodes, fstype=0, flavor=None):
        if a.nur and name not in a.nur:
            return
        f = TTFont(io.BytesIO(base64.b64decode(b64)))
        o = Options(); o.name_IDs = '*'; o.notdef_outline = True; o.layout_features = []
        ss = Subsetter(options=o); ss.populate(unicodes=unicodes); ss.subset(f)
        f['OS/2'].fsType = fstype
        f.recalcTimestamp = False; f['head'].created = 0; f['head'].modified = 0
        if flavor: f.flavor = flavor
        buf = io.BytesIO(); f.save(buf)
        open(os.path.join(a.ziel, name), 'wb').write(buf.getvalue())
        print(f'{name}: {len(buf.getvalue())} B')
        if name == 'gut.ttf':
            # Gegenprobe für den cmap-Leser des Kerns: die cmap, wie fontTools sie liest.
            import json
            json.dump(sorted(TTFont(io.BytesIO(buf.getvalue())).getBestCmap()), open(os.path.join(a.ziel, 'gut.ttf.cmap.json'), 'w'))
    os.makedirs(a.ziel, exist_ok=True)
    mit_oe = basis | {0x0151}
    bauen('gut.ttf', mit_oe)
    bauen('ohne-oe.ttf', basis)
    bauen('fstype-bit1.ttf', mit_oe, 0x0002)
    bauen('fstype-bit8.ttf', mit_oe, 0x0100)
    bauen('fstype-bit9.ttf', mit_oe, 0x0200)
    bauen('gut.woff2', mit_oe, 0, 'woff2')
    bauen('ohne-umlaute.ttf', basis - {0xE4, 0xF6, 0xFC, 0xC4, 0xD6, 0xDC, 0xDF})

if __name__ == '__main__':
    main()
