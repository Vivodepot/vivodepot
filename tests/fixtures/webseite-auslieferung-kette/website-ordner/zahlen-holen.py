#!/usr/bin/env python3
"""Fixtur: winziger Stellvertreter für zahlen-holen.py (Vivodepot-intern, docs/webseite/<datum>/),
nur für tools/webseite-auslieferung-kette.js — schreibt nichts, prüft nichts, meldet nur Erfolg,
damit der echte `python3`-Unterprozess-Aufruf in der Kette geprobt wird, ohne einen echten
vd-repo-Checkout zu brauchen."""
import sys
if "--repo" not in sys.argv:
    sys.exit("Fixtur-zahlen-holen.py: --repo fehlt")
print("Fixtur-zahlen-holen.py: OK (kein echter Kanon-Zugriff, nur Kettenlogik geprobt)")
sys.exit(0)
