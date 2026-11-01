'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   baum-gehen.js — rekursiver Gang durch einen Ordner, der verschwundene Einträge überspringt (27.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Befund BAUMSCAN-STAT-WETTLAUF: ein Bestandsscanner ging mit readdirSync und dann statSync durch den Baum. Lief daneben eine
   Probe, die eine Fixtur kurz in den Baum legt und wieder löscht, warf statSync ENOENT, und der Scanner war rot, ohne dass am
   Bestand etwas falsch war. Eine Datei, die es zwischen Lesen und Stat nicht mehr gibt, kann nichts tragen: sie wird übersprungen.
   Ein Verzeichnis, das beim Lesen fehlt, ebenso. Jeder andere Fehler (Rechte, kaputtes Dateisystem) wirft weiter.
   Neue Baumgänger nehmen diesen Helfer; die übrigen stehen in einer Grundlinie, die nur kürzer werden darf, mit eigener Probe.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const verschwunden = (e) => !!e && (e.code === 'ENOENT' || e.code === 'ENOTDIR');

/* Alle Dateien unter `wurzel`, rekursiv, je Verzeichnis sortiert; `behalten(name, pfad)` wählt aus. Links werden wie bisher
   verfolgt (statSync); ein hängender Link zählt als verschwunden. */
function dateienUnter(wurzel, behalten = () => true) {
  const raus = [];
  (function ab(d) {
    let namen;
    try { namen = fs.readdirSync(d).sort(); } catch (e) { if (verschwunden(e)) return; throw e; }
    for (const n of namen) {
      const p = path.join(d, n);
      let st;
      try { st = fs.statSync(p); } catch (e) { if (verschwunden(e)) continue; throw e; }
      if (st.isDirectory()) ab(p);
      else if (behalten(n, p)) raus.push(p);
    }
  })(wurzel);
  return raus;
}

module.exports = { dateienUnter, verschwunden };
