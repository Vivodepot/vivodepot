#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""D2/D29 — Inter-WOFF2-Subsetting der Bildschirm-Schriften (seit v896 Dateien des Erscheinungsbilds, nicht mehr im Kern).

Dampft die 4 eingebetteten Inter-WOFF2 (Base64) auf die im echten Code TATSÄCHLICH
genutzten Glyphen ein (plus robuste Headroom-Unicode-Ranges). Dieselbe Schrift, dieselben
vier Gewichte (400/500/600/700) — nur ungenutzte Glyphen raus, optisch identisch.

WOFF2-Brotli wird über Node's eingebautes zlib-Brotli via Shim (tools/_brotli_shim) delegiert,
da das Python-`brotli`-Modul in der Sandbox fehlt.

Aufruf:
  python3 tools/font-subset.py               # schneidet tools/erscheinung/schriften/Inter-*.woff2 neu zu, schreibt die Fixture
  python3 tools/font-subset.py --aus-quelle  # dasselbe, aber aus den Originalen vor dem Zuschnitt (Git-Historie)
  python3 tools/font-subset.py --check     # nur prüfen: Coverage der EINGEBETTETEN Subsets (kein Schreiben);
                                           # Exit 1, wenn ein fehlender Codepunkt keinen Grund in
                                           # tools/font-subset-ausnahmen.json hat

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

AUSNAHMEN = os.path.join(ROOT, 'tools', 'font-subset-ausnahmen.json')

def ausnahmen_laden(pfad=AUSNAHMEN):
    """Begründete Ausnahmen {codepoint: grund}. grund 'quelle' muss im Headroom liegen: was dort
    fehlt, fehlte schon in der Quelle (der Zuschnitt behält Headroom vollständig)."""
    roh = json.load(open(pfad, encoding='utf-8'))['ausnahmen']
    aus, fehler, hr = {}, [], headroom()
    for e in roh:
        cp = int(e['cp'][2:], 16)
        if e['grund'] not in ('quelle', 'nur-code'): fehler.append(f"{e['cp']}: unbekannter grund {e['grund']!r}")
        elif e['grund'] == 'quelle' and cp not in hr: fehler.append(f"{e['cp']}: grund 'quelle', liegt aber nicht im Headroom")
        if not str(e.get('notiz', '')).strip(): fehler.append(f"{e['cp']}: notiz fehlt")
        aus[cp] = e['grund']
    return aus, fehler

# Die Quelle vor dem Zuschnitt: die vier Inter-WOFF2, wie sie bis a1d5660d4 (09.06.2026) im Kern
# standen — Inter 4.001 (git-9221beed3), SHA-256 = THIRD_PARTY_LICENSES Eintrag 4. Sie liegen in der
# Git-Historie, nicht als Datei; darum wird nichts heruntergeladen, um gegen die Quelle zu messen.
QUELLE_GIT = 'a1d5660d4^:vivodepot-clean-slate-kern.html'

def quelle_cmaps():
    """cmap je Gewicht der Quelle vor dem Zuschnitt, oder None ohne Git-Historie (flacher Klon)."""
    import subprocess
    try:
        h = subprocess.run(['git', 'show', QUELLE_GIT], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    except Exception:
        return None
    blobs = FONT_RE.findall(h)
    if len(blobs) != 4: return None
    return [set(load_font(b).getBestCmap().keys()) for b in blobs]

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

SCHRIFT_ORDNER = os.path.join(ROOT, 'tools', 'erscheinung', 'schriften')

def blobs_laden(aus_quelle=False):
    """Die vier Bildschirm-Schnitte als base64. Seit v896 Dateien des Erscheinungsbilds (tools/erscheinung/schriften/);
    mit aus_quelle die Originale vor dem Zuschnitt (Git-Historie, QUELLE_GIT) — um verlorene Zeichen zurückzuholen."""
    if aus_quelle:
        import subprocess
        h = subprocess.run(['git', 'show', QUELLE_GIT], cwd=ROOT, capture_output=True, text=True, check=True).stdout
        return FONT_RE.findall(h)
    return [base64.b64encode(open(os.path.join(SCHRIFT_ORDNER, f'Inter-{w}.woff2'), 'rb').read()).decode('ascii') for w in WEIGHTS]

def bedarf_messen(regionen):
    """Der Zeichenbedarf der vier gebackenen Produkte (tools/schrift-bedarf-messen.js) — derselbe, den tests/font-coverage.test.js prüft."""
    import subprocess
    cmd = ['node', os.path.join(ROOT, 'tools', 'schrift-bedarf-messen.js')]
    for r in regionen: cmd += ['--ausserhalb', r]
    d = json.loads(subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    return set(d['alle']), {k: set(v) for k, v in d['ausserhalb'].items()}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--aus-quelle', action='store_true')
    ap.add_argument('--bedarf-zusatz', default='')   # nur für Rot-Beweise: zusätzliche Zeichen in den Bedarf
    args = ap.parse_args()

    blobs = blobs_laden(args.aus_quelle)
    if len(blobs) != 4:
        print('FEHLER: erwarte 4 Schnitte, gefunden', len(blobs)); sys.exit(2)
    roh = json.load(open(AUSNAHMEN, encoding='utf-8'))
    bereiche = roh.get('bereiche', [])
    demand, ausserhalb = bedarf_messen(sorted({b['region'] for b in bereiche}))
    demand |= {ord(c) for c in args.bedarf_zusatz}
    keep = demand | headroom()

    if args.check:
        # Coverage der Schnitte prüfen — kein Schreiben. Bis 02.10.2026 endete dieser Zweig immer mit 0 (`ok` wurde nie
        # False). Jetzt: jeder fehlende Codepunkt braucht einen begründeten Eintrag in tools/font-subset-ausnahmen.json
        # (einzeln, oder als Bereich 'nur-export', der nur gilt, wenn keines seiner Zeichen außerhalb seiner Region steht);
        # dieselbe Regel hält tests/font-coverage.test.js in der Suite.
        ausnahmen, fehler = ausnahmen_laden()
        ok = not fehler
        for m in fehler: print('FEHLER:', m)
        def im_bereich(c):
            for b in bereiche:
                if int(b['von'][2:], 16) <= c <= int(b['bis'][2:], 16): return b
            return None
        alle_fehlend = set()
        for w, b64 in zip(WEIGHTS, blobs):
            f = load_font(b64)
            sub_cmap = set(f.getBestCmap().keys())
            missing = sorted(c for c in demand if c not in sub_cmap)
            alle_fehlend |= set(missing)
            unbegruendet = []
            for c in missing:
                if c in ausnahmen: continue
                b = im_bereich(c)
                if not b or c in ausserhalb.get(b['region'], set()): unbegruendet.append(c)
            print(f'  Gewicht {w}: cmap={len(sub_cmap)} fehlend={len(missing)} davon ohne Grund={["U+%04X"%c for c in unbegruendet]}')
            if unbegruendet: ok = False
        quelle = quelle_cmaps()
        if quelle is None:
            print('HINWEIS: Quelle vor dem Zuschnitt nicht lesbar (' + QUELLE_GIT + '), grund \'quelle\' nur am Headroom geprüft.')
        else:
            falsch = sorted(c for c, g in ausnahmen.items() if g == 'quelle' and any(c in cm for cm in quelle))
            if falsch:
                print('FEHLER: grund \'quelle\', aber in der Quelle vorhanden (Zuschnitt-Verlust):', ['U+%04X' % c for c in falsch])
                ok = False
            verloren = sorted(c for c in alle_fehlend if any(c in cm for cm in quelle) and c not in ausnahmen and not im_bereich(c))
            verloren_alle = sorted(c for c in alle_fehlend if any(c in cm for cm in quelle))
            print('  in der Quelle vorhanden, im Zuschnitt nicht:', len(verloren_alle), 'davon ohne Grund:', ['U+%04X' % c for c in verloren])
        veraltet = sorted(c for c in ausnahmen if c not in alle_fehlend)
        if veraltet:
            print('FEHLER: Ausnahmen, die nicht mehr fehlen (aus der Liste streichen):', ['U+%04X' % c for c in veraltet])
            ok = False
        print('OK.' if ok else 'ROT.')
        sys.exit(0 if ok else 1)

    total_before = total_after = 0
    fixture = {'note': 'D2/D29 Inter-Subset — Coverage-Gate-Fixture; via tools/font-subset.py',
               'demand': sorted(demand), 'weights': {}}
    for w, b64 in zip(WEIGHTS, blobs):
        out, orig_cmap, sub_cmap = subset_one(b64, keep)
        must = demand & orig_cmap            # Pflicht: was demand UND in der Quelle ist
        missing = sorted(must - sub_cmap)
        if missing:
            print('FEHLER: Glyphen-Verlust bei Gewicht', w, ['U+%04X' % c for c in missing]); sys.exit(3)
        new_b64 = base64.b64encode(out).decode('ascii')
        before = len(base64.b64decode(b64)); after = len(out)
        total_before += before; total_after += after
        open(os.path.join(SCHRIFT_ORDNER, f'Inter-{w}.woff2'), 'wb').write(out)
        fixture['weights'][str(w)] = {
            'sha256': hashlib.sha256(new_b64.encode('ascii')).hexdigest(),
            'cmap': sorted(sub_cmap),
            'must': must and sorted(must) or [],
        }
        print(f'  Gewicht {w}: {before} -> {after} B raw ({round(100*after/before,1)}%), cmap {len(orig_cmap)}->{len(sub_cmap)}, Demand∩Quelle {len(must)} alle erhalten ✓')

    os.makedirs(os.path.dirname(FIXTURE), exist_ok=True)
    json.dump(fixture, open(FIXTURE, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f'GESAMT Font-Raw: {total_before} -> {total_after} B ({round(100*total_after/total_before,1)}%)')
    print('geschrieben:', SCHRIFT_ORDNER, '— danach: node tools/erscheinungsbild-modul.js')
    print('Fixture:', FIXTURE)

if __name__ == '__main__':
    main()
