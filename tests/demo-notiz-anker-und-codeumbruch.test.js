'use strict';
/* demo-notiz-anker-und-codeumbruch.test.js — Probe zu Befund DEMO-ITALIEN-NOTIZ-NICHT-SICHTBAR (16.10.2026).
   Zwei Ursachen, beide in der Demo „Unterwegs in Italien“ gefunden:
   1. Schritt 6 (Freigabe direkt nach einer Lese-App-Seite): die Notiz suchte sich den zuletzt geöffneten Dialog als Anker. Nach dem
      Seitenwechsel ist das die Zwischenkarte der Vorführung (#vorfuehrung-wechsel, role=dialog) — die Notiz landete darin und ging mit
      deren „Weiter“.
   2. Schritt 2 (Handy, iPhone): der amtliche Titel eines Codes (.feld-code.code-amtlich) stand mit white-space: nowrap; der Bereich
      wurde breiter als der Bildschirm, #app seitlich scrollbar, die Notiz verschoben bzw. verdeckt.
   Am gerenderten Produkt halten es die Demo-Journeys der E2E (alle Szenarien, drei Geräte, „kein seitliches Scrollen in der
   Anwendung“). Hier die Regeln selbst, mit Rot-Beweis. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const lesen = (p) => fs.readFileSync(path.join(REPO, p), 'utf8');

function ankerQuelle(html) {
  const a = html.indexOf('function _vorfuehrungNotizAnker(');
  assert.ok(a >= 0, '_vorfuehrungNotizAnker steht nicht mehr im Kern — die Probe muss mitziehen');
  return html.slice(a, html.indexOf('\n}\n', a));
}
const schliesstKarteAus = (q) => /querySelectorAll\('\[role="dialog"\]'\)\]\.filter\([^;]*!d\._vorfuehrungKarte/.test(q);

test('[Demo-Notiz·Anker] die Notiz nimmt nie eine Karte der Vorführung als Dialog', () => {
  const html = lesen('vivodepot.html');
  assert.ok(schliesstKarteAus(ankerQuelle(html)), 'die Dialogsuche der Notiz muss markierte Karten der Vorführung ausnehmen');
  const w = html.indexOf('function _vorfuehrungWechselSetzen(');
  assert.ok(w >= 0 && /k\._vorfuehrungKarte = true/.test(html.slice(w, html.indexOf('\n}\n', w))),
    'die Zwischenkarte muss die Markierung tragen, sonst greift der Ausschluss nicht');
});

test('[Demo-Notiz·Anker·Rot-Beweis] ohne den Ausschluss fällt die Probe', () => {
  const alt = "const offen = [...document.querySelectorAll('[role=\"dialog\"]')].filter((d) => d.offsetWidth > 0 && d.offsetHeight > 0);";
  assert.equal(schliesstKarteAus('function _vorfuehrungNotizAnker(station) {\n' + alt + '\n'), false);
});

const umbrichtAmtlich = (css) => /\.feld-code\.code-amtlich\s*\{[^}]*white-space:\s*normal/.test(css);

test('[Code-Umbruch] der amtliche Titel eines Codes bricht um — in der Quelle und in beiden Erscheinungsbildern', () => {
  assert.ok(umbrichtAmtlich(lesen('tools/erscheinung/stil/grundlage.css')), 'grundlage.css');
  for (const m of ['tools/erscheinung/erscheinungsbild-heute-modul.json', 'tools/erscheinung/erscheinungsbild-salbei-glas-modul.json']) {
    assert.ok(umbrichtAmtlich(lesen(m).replace(/\\n/g, '\n')), m + ' trägt die Regel nicht — Modul neu erzeugen');
  }
});

test('[Code-Umbruch·Rot-Beweis] die alte Regel allein (nowrap) fällt', () => {
  assert.equal(umbrichtAmtlich('.feld-code { font-size: 1em; white-space: nowrap; }'), false);
});
