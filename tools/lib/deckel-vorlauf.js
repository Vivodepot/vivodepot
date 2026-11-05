'use strict';
/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   deckel-vorlauf.js — die zählenden Proben vor dem Volllauf (30.10.2026)
   ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   ANLASS: am 30.10.2026 endeten zwei als „gezielt grün“ gemeldete Zugköpfe erst im Volllauf rot, an Deckeln, die die gezielte
   Wagenstufe nicht wählt: eine feste Zahl in einer Probe (Specs mit Testfläche 141 > 140, eine neue e2e-Spec, kein Kern-Code)
   und ein Hash-Abgleich einer Ausnahmeliste. Der Volllauf brauchte bis zum Rot 35 bis 70 Minuten; die zählenden Proben allein
   fanden beide in vier bis fünf Minuten (gemessen an den roten Ständen beider Züge).

   WAS GEWÄHLT WIRD: jede Probe in tests/ und tests/mit-modul/, die
     · eine Grundlinie, eine Ausnahmeliste oder das Deckel-Register liest (MUSTER[0]), oder
     · eine feste Zahl über eine Länge prüft, `….length, N)` mit N ≥ 10 (MUSTER[1]), oder
     · sich mit der Zeile `deckel-vorlauf: zählt` selbst meldet (MUSTER[2]) — für Proben, die einen Abgleich ohne Grundlinie
       fahren (03.11.2026: neue Kernfelder gegen die Nativ-A/B-Listen), oder
     · die Probe tests/<stamm>.test.js eines gleichnamigen Werkzeugs tools/<stamm>.js ist, das eine Grundlinie liest und
       `--grundlinie-schreiben` kennt, und das Werkzeug nennt (03.11.2026: die Probe der Bereichs-Literale liest ihre
       Grundlinie über das Werkzeug, trug den Dateinamen also nicht selbst und fehlte im Vorlauf; erst die Landung wurde rot).
       Eng gewählt: jede Probe, die irgendein Werkzeug mit Grundlinie lädt, wären 145 Proben mehr gewesen, diese Regel 4.
   Gewählt wird nach dem Text der Datei, nicht nach dem Diff: ein Deckel zählt über den ganzen Baum.
   Eine leere Wahl ist ein Fehler, kein Grün — `node --test` ohne Dateien führe die ganze Suite.

   Diese Datei wählt nur. Den Lauf baut und fährt die Landungsvorbereitung, vor dem Volllauf und nach den Erzeugern, über ihren
   Schrittläufer mit dem Temp-Helfer.
   ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const MUSTER = Object.freeze([/grundlinie[a-z-]*\.json|-ausnahmen\.json|deckel-register/, /\.length, *[0-9]{2,}\)/, /deckel-vorlauf: zählt/]);
const ORTE = Object.freeze(['tests', path.join('tests', 'mit-modul')]);
function eigenesWerkzeugMitGrundlinie(wurzel, stamm, text, lesen) {
  const esc = stamm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp('tools/' + esc + '(\\.js)?[\'"]').test(text)) return false;
  let werkzeug = '';
  try { werkzeug = lesen(path.join(wurzel, 'tools', stamm + '.js')); } catch (_) { return false; }
  return MUSTER[0].test(werkzeug) && werkzeug.includes('--grundlinie-schreiben');
}
function dateienWaehlen(wurzel, { liste = (d) => fs.readdirSync(d), lesen = (p) => fs.readFileSync(p, 'utf8') } = {}) {
  const gewaehlt = [];
  for (const ort of ORTE) {
    let namen = [];
    try { namen = liste(path.join(wurzel, ort)); } catch (_) { continue; }
    for (const n of namen) {
      if (!n.endsWith('.test.js')) continue;
      const rel = path.join(ort, n);
      let text = '';
      try { text = lesen(path.join(wurzel, rel)); } catch (_) { continue; }
      if (MUSTER.some((m) => m.test(text)) || eigenesWerkzeugMitGrundlinie(wurzel, n.slice(0, -'.test.js'.length), text, lesen)) gewaehlt.push(rel);
    }
  }
  return gewaehlt.sort();
}

module.exports = { MUSTER, ORTE, dateienWaehlen, eigenesWerkzeugMitGrundlinie };
