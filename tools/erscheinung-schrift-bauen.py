#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Baut aus einer variablen OFL-TTF (Quelle) EINE variable WOFF2 für erscheinung.schriften[] (v896).

Achsen werden festgesetzt oder auf eine Spanne begrenzt (fontTools.varLib.instancer), danach auf Latein,
Latein-Erweitert und denselben Headroom wie tools/font-subset.py zugeschnitten. Reproduzierbar: head-Zeitstempel
auf 0. WOFF2-Brotli über den Node-Shim (tools/_brotli_shim), ohne Python-Modul `brotli`.

Aufruf:
  python3 tools/erscheinung-schrift-bauen.py --quelle <variabel.ttf> --ziel <aus.woff2> \
      [--achse wdth=100] [--achse wght=400:700]
Gibt Bytes roh, Zeichen base64, cmap-Größe und fsType aus.
"""
import sys, os, io, argparse
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools', '_brotli_shim'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))

def headroom():
    import importlib.util
    spec = importlib.util.spec_from_file_location('font_subset', os.path.join(ROOT, 'tools', 'font-subset.py'))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m.headroom()

def achse(s):
    tag, wert = s.split('=', 1)
    if ':' in wert:
        a, b = wert.split(':', 1); return tag, (float(a), float(b))
    return tag, float(wert)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--quelle', required=True)
    ap.add_argument('--ziel', required=True)
    ap.add_argument('--achse', action='append', default=[])
    a = ap.parse_args()
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    from fontTools.subset import Subsetter, Options
    f = TTFont(a.quelle)
    fs = f['OS/2'].fsType
    if fs & 0x0302:
        print(f'FEHLER: fsType {fs:#06x} verbietet Einbetten oder Zuschneiden (Bit 1, 8 oder 9).'); sys.exit(2)
    if a.achse:
        f = instancer.instantiateVariableFont(f, dict(achse(s) for s in a.achse))
    o = Options(); o.flavor = 'woff2'; o.layout_features = '*'; o.name_IDs = '*'; o.notdef_outline = True
    ss = Subsetter(options=o); ss.populate(unicodes=headroom()); ss.subset(f)
    # Options.flavor wirkt nur im Subset-CLI; hier muss das Flavor am Font stehen, sonst entsteht TTF.
    f.flavor = 'woff2'
    # save() rechnet head.modified sonst neu (Uhrzeit) — dann wäre der Bau nicht reproduzierbar.
    f.recalcTimestamp = False
    f['head'].created = 0; f['head'].modified = 0
    buf = io.BytesIO(); f.save(buf); daten = buf.getvalue()
    if daten[:4] != b'wOF2':
        print('FEHLER: Ergebnis ist kein WOFF2 (Signatur ' + repr(daten[:4]) + ').'); sys.exit(3)
    open(a.ziel, 'wb').write(daten)
    print(f'{a.ziel}: {len(daten)} B roh, {(len(daten) + 2) // 3 * 4} Zeichen base64, cmap {len(f.getBestCmap())}, fsType {fs:#06x}')

if __name__ == '__main__':
    main()
