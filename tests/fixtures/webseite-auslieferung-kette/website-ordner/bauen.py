#!/usr/bin/env python3
"""Fixtur: winziger Stellvertreter für bauen.py (Vivodepot-intern, docs/webseite/<datum>/), nur für
tools/webseite-auslieferung-kette.js — baut nichts, prüft nur, dass die beiden Downloaddateien schon
kopiert wurden (Schritt 2 muss vor diesem Schritt gelaufen sein), damit die Kettenreihenfolge selbst
geprobt wird, ohne einen echten Seitenbau zu brauchen."""
import os
import sys

if "--repo" not in sys.argv:
    sys.exit("Fixtur-bauen.py: --repo fehlt")
hier = os.path.dirname(os.path.abspath(__file__))
fehlt = [d for d in ("vivodepot-privat-de.html", "vivodepot-privat-en.html")
         if not os.path.exists(os.path.join(hier, d))]
if fehlt:
    sys.exit("Fixtur-bauen.py: fehlt (Schritt 2 lief nicht vor diesem Schritt): " + ", ".join(fehlt))
print("Fixtur-bauen.py: OK (nichts gebaut, nur Kettenreihenfolge geprobt)")
sys.exit(0)
