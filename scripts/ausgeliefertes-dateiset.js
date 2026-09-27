'use strict';
/* ════════════════════════════════════════════════════════════════════════
   ausgeliefertes-dateiset.js — die eine Quelle für „was wird ausgeliefert"
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-215. Vorher führten `tools/testfassung-legen.js` (der Auslieferungs-
   Orchestrator) und `scripts/schalen-lockstep-kern.js` (der Lockstep-Wächter)
   je ihre eigene Liste — zwei von vier Dateien im Wächter, alle vier im
   tatsächlichen Auslieferungssatz. Beide Listen wurden nirgends gegeneinander
   geprüft; sie konnten auseinanderlaufen, ohne dass irgendetwas das meldet.

   Absichtlich abhängigkeitslos: `schalen-lockstep-kern.js` läuft in jedem
   `pre-commit` und `pre-push`; `testfassung-legen.js`s eigene Requires
   (`g11-js-code-ohne-kommentare-strings.js`, `index-weiterleitung-erzeugen.js`)
   sollen darum nicht in diesen heißen Pfad hineingezogen werden. Dieses Modul
   trägt nur die Liste, sonst nichts.

   `index.html` gehört bewusst NICHT hierher — es wird zur Auslieferungszeit
   aus `vivodepot.html` generiert (`index-weiterleitung-erzeugen.js`), nicht
   versioniert verglichen, und kann nicht unabhängig auseinanderlaufen.
   ════════════════════════════════════════════════════════════════════════ */
const DATEISATZ = ['vivodepot.html', 'vivodepot-lesen.html', 'sw.js', 'manifest.webmanifest'];

module.exports = { DATEISATZ };
