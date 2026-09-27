#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Vivodepots eigene Marke als expliziter Datenwert (U2-ADR-296, 05.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Bislang war „Vivodepot" im Gerüst nur die ABWESENHEIT eines Branding-Moduls —
   die im Stylesheet fest eingetragenen Werte (`--salbei-dunkel`, `--gold`,
   „Inter"), nie ein Datensatz, der dieselbe `brandingModulPruefen`-Prüfung
   durchläuft wie ein fremdes Institutions-Branding. „Alles ist modular" gilt
   erst, wenn auch die EIGENE Marke ein Modul ist, kein impliziter Rest.

   GEMESSEN, NICHT MEHR ZWEIMAL GESETZT (U2-ADR-384, 08.09.2026): bis dahin
   stand hier eine von Hand getippte zweite Fassung derselben Werte — derselbe
   Fehler, den `tools/buergermodul-schnitt.js` für den Markennamen schon
   ausschließt („DER MARKENNAME WIRD GEMESSEN, NICHT GESETZT"). Seit U2-ADR-384
   ist `AB_WERK_BRANDING` ein echter Kern-Wert (`vivodepot.html`, direkt vor
   `_markeName`) — Vivodepots eigene Marke läuft dort ab Werk durch dieselbe
   `brandingModulPruefen`-Prüfung wie ein fremdes Institutions-Branding, nur
   ohne Signatur (Konfektionieren ist nicht Einlassen — der signierte Weg
   bleibt FREMDEN Modulen vorbehalten, s. Kopf-Kommentar dort). Dieses
   Werkzeug liest den Kern-Wert über `ladeKern()`, statt ihn ein zweites Mal
   zu behaupten — eine Abweichung fiele hier sofort auf, weil es nichts mehr
   gäbe, das abweichen könnte.

   Signiert NICHTS. Fasst keinen Schlüssel an. Nur Dateninhalt — derselbe
   Grundsatz wie tools/betriebssatz-aufbereiten.js.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));

const { V } = ladeKern();
const VIVODEPOT_BRANDING = V.AB_WERK_BRANDING;

if (require.main === module) {
  console.log(JSON.stringify(VIVODEPOT_BRANDING, null, 2));
}

module.exports = { VIVODEPOT_BRANDING };
