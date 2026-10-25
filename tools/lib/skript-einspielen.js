'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   skript-einspielen.js — ein Prüfskript (axe-core) in eine Anwendung einspielen, ohne ihre CSP zu umgehen (U2-ADR-470)
   ────────────────────────────────────────────────────────────────────────────
   page.addScriptTag setzt den Text eines <script>-Elements. Seit U2-ADR-470 lehnt die Vertrauensregel der Anwendung jedes
   Skript aus Text ab (Trusted Types, createScript), und die CSP ließe den Block ohne passenden Hash ohnehin nicht laufen —
   die Probe stirbt dann an „vertrauensregel-abgelehnt:skript-aus-text“ statt an ihrer Aussage (gemessen 20.10.2026 an der
   Landmarks-Probe). page.evaluate läuft über das Protokoll des Browsers, nicht über eine Senke der Seite: das Prüfskript
   kommt hinein, die Seite selbst behält CSP und Vertrauensregel unverändert. Wer addScriptTag noch nutzen darf, steht in
   tests/skript-einspielen-statt-addscripttag.test.js.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');

async function skriptEinspielen(seite, pfad) {
  await seite.evaluate(fs.readFileSync(pfad, 'utf8'));
}

module.exports = { skriptEinspielen };
