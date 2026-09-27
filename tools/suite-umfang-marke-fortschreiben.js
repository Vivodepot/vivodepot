#!/usr/bin/env node
'use strict';
/* ══════════════════════════════════════════════════════════════
   suite-umfang-marke-fortschreiben.js — die Hochwassermarke der Suite-Grundlinie „Testdateien im Baum" (21.09.2026)
   ──────────────────────────────────────────────────────────────
   Der Zustand steht in tests/suite-umfang-gate.test.js (`ist >= Marke`). DIESES Werkzeug pflegt ihn: läuft in
   tools/landung-vorbereiten.js, also im Zug, und schreibt die Marke hoch, wenn der Baum mehr Testdateien trägt.
   Warum es das braucht und warum es EINE gemeinsame Funktion ist: tools/lib/hochwassermarke.js (Kopf-Kommentar) —
   die Marke stand auf 440, der Ist auf 1295, die Lücke stand seit dem 19.08. aufgeschrieben in der Datei selbst.

   WARUM IM ZUG UND NICHT IM COMMIT-HOOK: die Zahl steigt mit jeder Landung; eine Zahl, die jeder parallele Zweig vor dem
   Umsetzen schreibt, kollidierte an dieser einen Zeile. landung-vorbereiten läuft NACH dem Umsetzen auf den Kanon
   (Ablauf: umsetzen → landung-vorbereiten → Landungs-Gate → Hook → Push) und schreibt damit auf dem Endstand — derselbe
   Mechanismus wie für Faktenbasis, Rezepte und Prüfsumme, die im selben Commit landen. Das Ergebnis hängt nur vom Baum ab
   (Marke = Höchststand), nicht von einer Rechnung „+1": ein zweiter Lauf ändert nichts.

   AUFRUF
     node tools/suite-umfang-marke-fortschreiben.js                     Marke hoch, wenn der Baum mehr trägt; sonst nichts geschrieben
     node tools/suite-umfang-marke-fortschreiben.js --senkung --grund "…"   benannte Senkung (Grund ab 40 Zeichen, datiert)
     [--datei <grundlinie.json>] [--wurzel <ordner>]     für Proben an Wegwerf-Kopien

   AUSGÄNGE (drei, wie die stehende Regel es will): 0 eingehalten (Marke gestiegen oder unverändert) · 1 verletzt (Baum trägt
   WENIGER als die Marke: nichts geschrieben, die Meldung nennt den benannten Weg) · 1 nicht messbar (Marke oder Zählung keine Zahl).
   ══════════════════════════════════════════════════════════════ */
const path = require('node:path');
const M = require('./lib/hochwassermarke.js');

const REPO = path.join(__dirname, '..');
const FELD = 'dateien_test_js';
const heute = () => new Date().toISOString().slice(0, 10);

function main(argv, { datum = heute() } = {}) {
  const wert = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
  const datei = wert('--datei') ? path.resolve(wert('--datei')) : path.join(REPO, 'tools', 'suite-umfang-grundlinie.json');
  const wurzel = wert('--wurzel') ? path.resolve(wert('--wurzel')) : path.join(REPO, 'tests');
  const g = M.lesen(datei);
  const ist = M.dateienZaehlen(wurzel).length;

  if (argv.includes('--senkung')) {
    const r = M.senken(g, FELD, ist, { datum, grund: wert('--grund') });
    if (!r.ok) { console.error('[suite-umfang-marke] Senkung NICHT geschrieben — ' + r.grund); return 1; }
    M.schreiben(datei, r.grundlinie);
    console.log('[suite-umfang-marke] gesenkt: ' + r.von + ' → ' + r.auf + ' Testdateien (' + datum + '), Grund eingetragen.');
    return 0;
  }

  const p = M.pruefen(g, FELD, ist);
  if (!p.messbar) { console.error('[suite-umfang-marke] NICHT MESSBAR — Marke ' + p.marke + ', Zählung ' + p.ist + ' (keine ganze Zahl). Nichts geschrieben.'); return 1; }
  if (!p.ok) {
    console.error('[suite-umfang-marke] ROT — der Baum trägt ' + p.ist + ' Testdateien, die Marke steht auf ' + p.marke + ': ' + p.fehlt + ' Datei(en) fehlen. Nichts geschrieben.');
    console.error('  Ein Verlust: erst auflisten, nicht sofort nachbauen. Eine bewusste Zusammenlegung: node tools/suite-umfang-marke-fortschreiben.js --senkung --grund "<was ist weg, und warum ist das kein Verlust>"');
    return 1;
  }
  const r = M.fortschreiben(g, FELD, ist, { datum });
  if (!r.ok) { console.error('[suite-umfang-marke] NICHT MESSBAR — ' + r.grund); return 1; }
  if (!r.geaendert) { console.log('[suite-umfang-marke] Marke ' + r.von + ' = Ist ' + ist + ': unverändert, nichts geschrieben.'); return 0; }
  M.schreiben(datei, r.grundlinie);
  console.log('[suite-umfang-marke] Marke fortgeschrieben: ' + r.von + ' → ' + r.auf + ' Testdateien (' + datum + ').');
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { main, FELD };
