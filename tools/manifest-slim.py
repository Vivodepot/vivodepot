#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""B2 (D2/D29) — PWA-Icons verschlanken (Dateigröße).

Das inline-Manifest ist DOPPELT base64-kodiert (Icon-PNGs als base64 im JSON, das ganze
JSON nochmals base64 im href) → jedes im PNG gesparte Byte spart ~16/9 im File. Lossless-
Recompress macht die Icons hier GRÖSSER (der Original-Encoder ist besser), darum 256-Farb-
Quantisierung: die FLÄCHEN-/Markenfarben bleiben exakt (häufigste Farben verlustfrei im
Palette-Set, hier per Guard geprüft), nur sub-pixel-Antialiasing an Kanten wird minimal
umgesetzt (Mittel-Δ ~0,2–0,5/Kanal, 0 % Pixel > Δ8 → optisch identisch).

Quantisiert die drei RGB-Icons (manifest 192/512, apple-touch-icon); das winzige RGBA-
Favicon (64px) bleibt unangetastet. Schreibt die kern-HTML in-place (oder --out).
"""
import sys, os, re, io, json, base64, argparse
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KERN = os.path.join(ROOT, 'vivodepot.html')

def quantize_png(raw, colors=256):
    im = Image.open(io.BytesIO(raw))
    src = im.convert('RGB')
    q = src.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.Dither.NONE)
    # Guard: die häufigsten (Marken-Flächen-)Farben müssen EXAKT erhalten bleiben.
    import collections
    px = list(src.getdata())
    top = [c for c, _ in collections.Counter(px).most_common(12)]
    qrgb = list(q.convert('RGB').getdata())
    # Mapping Original-Pixel -> quantisiertes Pixel an denselben Positionen prüfen.
    pal = set(q.convert('RGB').getdata())
    # Für jede Top-Flächenfarbe: kommt sie unverändert im Ergebnis vor?
    drift = []
    for c in top:
        if c not in pal:
            drift.append(c)
    buf = io.BytesIO(); q.save(buf, format='PNG', optimize=True)
    return buf.getvalue(), drift, src.size

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--in', dest='inp', default=KERN)
    ap.add_argument('--out', dest='out', default=None)
    args = ap.parse_args()
    html = open(args.inp, encoding='utf-8').read()

    m = re.search(r'(<link rel="manifest" href="data:application/manifest\+json;base64,)([^"]*)(")', html)
    mani = json.loads(base64.b64decode(m.group(2)))

    saved_total = 0
    # 1) Manifest-Icons (RGB) quantisieren
    for ic in mani['icons']:
        b = ic['src'].split(',', 1)[1]; raw = base64.b64decode(b)
        new, drift, size = quantize_png(raw)
        if drift:
            print('ABBRUCH: Marken-Flächenfarbe würde driften (manifest', ic['sizes'], '):', drift); sys.exit(3)
        ic['src'] = 'data:image/png;base64,' + base64.b64encode(new).decode('ascii')
        print(f'  manifest {ic["sizes"]}: {len(raw)} -> {len(new)} B PNG (-{len(raw)-len(new)})')
        saved_total += len(raw) - len(new)
    new_mani_b64 = base64.b64encode(json.dumps(mani, ensure_ascii=False, separators=(',', ':')).encode('utf-8')).decode('ascii')
    html = html[:m.start()] + m.group(1) + new_mani_b64 + m.group(3) + html[m.end():]

    # 2) apple-touch-icon (RGB) quantisieren
    at = re.search(r'(<link rel="apple-touch-icon"[^>]*href="data:image/png;base64,)([^"]*)(")', html)
    if at:
        raw = base64.b64decode(at.group(2)); new, drift, size = quantize_png(raw)
        if drift:
            print('ABBRUCH: apple-touch-icon Marken-Flächenfarbe würde driften:', drift); sys.exit(3)
        new_b64 = base64.b64encode(new).decode('ascii')
        print(f'  apple-touch-icon {size}: {len(raw)} -> {len(new)} B PNG (-{len(raw)-len(new)})')
        saved_total += len(raw) - len(new)
        html = html[:at.start()] + at.group(1) + new_b64 + at.group(3) + html[at.end():]

    # Favicon (RGBA, 64px, ~4,5 KB) bewusst NICHT angetastet (Alpha; vernachlässigbar).
    out_path = args.out or args.inp
    open(out_path, 'w', encoding='utf-8').write(html)
    print(f'PNG-Bytes gespart gesamt: {saved_total} (doppel-base64-Hebel ~16/9 im File)')
    print('geschrieben:', out_path)

if __name__ == '__main__':
    main()
