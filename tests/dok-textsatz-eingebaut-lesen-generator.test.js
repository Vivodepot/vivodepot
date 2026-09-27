'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   tools/build-dok-textsatz-eingebaut-lesen.js — Drift-Wächter („Drift-Wächter vervollständigen", 09.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   GESCHWISTER von tests/textsatz-eingebaut-lesen-generator.test.js (dasselbe
   Muster für tools/build-textsatz-eingebaut-lesen.js) — bisher fehlte das
   Gegenstück für dieses Werkzeug völlig; nur der Dateiname stand in einem
   Kopf-Kommentar von tests/zug1-textsatz-erzeuger-leseart.test.js, das etwas
   anderes prüft (Leseart-Vollständigkeit bei einem gesäten Bereich, nicht
   Drift gegen den eingecheckten Ausgabestand).

   EIN ROTER DRIFT-WÄCHTER HEISST PRÜFEN, NICHT NEU BACKEN: wird er rot, zuerst
   prüfen, ob `kennungenAusKern()` noch die richtige Kern-Struktur liest (die
   zwei Ab-Werk-Vorlagen, nicht die Sektor-/Feldbeschriftungen), bevor
   `node tools/build-dok-textsatz-eingebaut-lesen.js` läuft.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const G = require('../tools/build-dok-textsatz-eingebaut-lesen.js');

function leseApp() { return fs.readFileSync(G.LESEN, 'utf8'); }

test('[DOK-TEXTSATZ_EINGEBAUT_LESEN·Erzeuger·Drift-Wächter] die Region ist da und trägt genau den frischen Kennungsraum aus dem Kern', () => {
  const s = leseApp();
  assert.ok(s.includes(G.BEGIN), 'BEGIN-Marker fehlt');
  assert.ok(s.includes(G.ENDE), 'END-Marker fehlt');
  const ausKern = G.kennungenAusKern();
  assert.equal(Object.keys(ausKern).length, 83, 'Vorbedingung: 83 Kennungen (U2-ADR-357-Kopfkommentar)');
  const region = G.region(ausKern);
  assert.ok(s.includes(region.split('\n').slice(1, -1).join('\n')),
    'vivodepot-lesen.html führt einen anderen Kennungsraum als frisch aus dem Kern erzeugt — '
    + 'kein Drift zum Erzeuger erwartet, sonst node tools/build-dok-textsatz-eingebaut-lesen.js ausführen');
});

test('[DOK-TEXTSATZ_EINGEBAUT_LESEN·Erzeuger·Rot-Beweis] eine abweichende Region lässt --check anschlagen', () => {
  const s = leseApp();
  const verfaelscht = G.regionErsetzen(s, G.region({ 'erfunden.label': 'x' }), 'probe');
  assert.notEqual(verfaelscht, s, 'Vorbedingung: die Mutation greift');
  const ausKern = G.region(G.kennungenAusKern());
  assert.notEqual(G.regionErsetzen(verfaelscht, ausKern, 'probe'), verfaelscht,
    'ROT ERWARTET: ein danebengepflegter Kennungsraum muss auffallen');
});
