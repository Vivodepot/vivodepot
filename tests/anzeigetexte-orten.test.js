'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   anzeigetexte-orten.test.js — Gegenprobe für die JSON-Form-Musterlücke
   (Schnitt-Reparatur, 18.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER FUND, AUS DEM DIESE PROBE ENTSTEHT: `SCHLUESSEL` in `tools/anzeigetexte-
   orten.js` erkannte nur `label: '…'` (JS-Literal, unquotierter Schlüssel),
   nicht `"label":"…"` (JSON-Literal, gequotet) — genau die Form, in der
   gebackene Bereiche/Module vorliegen. Gemessen: 502 JSON-quotierte
   label/titel/…-Kennungen unsichtbar (nicht 494 — die frühere Roh-Zählung
   erkannte keine zusammengesetzten Schlüssel wie `"gruppenTitel"`, dieselbe
   Lücke, eine Ebene tiefer).

   WAS DIESE PROBE PRÜFT, DAS DIE ROHZAHL ALLEIN NICHT BEWEIST: dass das
   Werkzeug die JSON-Form wirklich ERKENNT, nicht nur zufällig dieselbe Zahl
   trifft. Eine Kennung, die man absichtlich aus dem Quelltext entfernt, MUSS
   aus dem Fund verschwinden — sonst zählt das Werkzeug etwas anderes als den
   Quelltext. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { _findenInCode, jsonFormRohZaehlen } = require('../tools/anzeigetexte-orten.js');

const BEISPIEL_CODE = `
const FIXTUR_A = {
  label: 'Reisepass — gültig bis',
  hint: 'ledig',
};
const FIXTUR_B = {
  "label":"Führerschein — gültig bis",
  "gruppenTitel":"Fahrzeuge und Führerschein",
  "hint":"C1E"
};
`;

test('[Anzeigetexte-Orten] findet BEIDE Formen — JS-Literal und JSON-Literal, unquotiert wie gequotet', () => {
  const funde = _findenInCode(BEISPIEL_CODE);
  const schluessel = funde.map((f) => f.schluessel).sort();
  assert.deepEqual(schluessel, ['gruppenTitel', 'hint', 'hint', 'label', 'label'].sort(),
    'FIXTUR_A (JS-Form) und FIXTUR_B (JSON-Form, inkl. zusammengesetztem Schlüssel) müssen beide vollständig gefunden werden');
});

test('[Anzeigetexte-Orten] die JSON-Form-Funde tragen `quotiert: true`, die JS-Form-Funde `quotiert: false`', () => {
  const funde = _findenInCode(BEISPIEL_CODE);
  const jsForm = funde.filter((f) => f.ort === 'FIXTUR_A');
  const jsonForm = funde.filter((f) => f.ort === 'FIXTUR_B');
  assert.equal(jsForm.length, 2);
  assert.equal(jsonForm.length, 3);
  assert.ok(jsForm.every((f) => f.quotiert === false), 'FIXTUR_A ist JS-Form, keine quotierten Schlüssel');
  assert.ok(jsonForm.every((f) => f.quotiert === true), 'FIXTUR_B ist JSON-Form, alle Schlüssel quotiert');
});

test('[Anzeigetexte-Orten] Klassifikation bleibt unverändert von der Schlüssel-Quotierung — nur der Wert entscheidet', () => {
  const funde = _findenInCode(BEISPIEL_CODE);
  const gruppenTitel = funde.find((f) => f.schluessel === 'gruppenTitel');
  assert.equal(gruppenTitel.art, 'anzeigetext', 'Leerzeichen im Wert — Anzeigetext, unabhängig von der Schlüsselform');
  const cKlasse = funde.find((f) => f.wert === 'C1E');
  assert.equal(cKlasse.art, 'bezeichner', 'Führerschein-Klasse bleibt Bezeichner, auch in JSON-Form');
});

test('[Anzeigetexte-Orten·Rot-Beweis] eine entfernte JSON-Form-Fundstelle verschwindet aus dem Fund — das Werkzeug liest wirklich', () => {
  const vorher = _findenInCode(BEISPIEL_CODE);
  const ohneGruppenTitel = BEISPIEL_CODE.replace('  "gruppenTitel":"Fahrzeuge und Führerschein",\n', '');
  const nachher = _findenInCode(ohneGruppenTitel);
  assert.equal(vorher.length, nachher.length + 1, 'genau EIN Fund weniger, kein Kollateralschaden an den übrigen');
  assert.ok(vorher.some((f) => f.schluessel === 'gruppenTitel'));
  assert.ok(!nachher.some((f) => f.schluessel === 'gruppenTitel'), 'die entfernte Kennung ist wirklich fort, nicht nur umbenannt');
});

test('[Anzeigetexte-Orten·Gegenprobe] die unabhängige Roh-Zählung stimmt mit den JSON-Form-Funden überein', () => {
  const funde = _findenInCode(BEISPIEL_CODE);
  const jsonErfasst = funde.filter((f) => f.quotiert).length;
  assert.equal(jsonFormRohZaehlen(BEISPIEL_CODE), jsonErfasst,
    'weicht die unabhängige Rohzählung von den erfassten JSON-Funden ab, hat SCHLUESSEL selbst wieder eine Lücke');
});

test('[Anzeigetexte-Orten·Gegenprobe·Rot-Beweis] ein Schlüssel mit unquotiertem Wert lässt die Gegenprobe auseinanderlaufen', () => {
  // `"titel":123` — SCHLUESSEL_JSON_ROH (die einfache Rohzählung) sieht nur den Schlüssel und
  // zählt mit; SCHLUESSEL (der volle Fund-Läufer) verlangt zusätzlich einen QUOTIERTEN Wert
  // (`(['"])` direkt hinter dem Doppelpunkt) und lässt einen numerischen Wert durchfallen.
  // Genau diese Art Abweichung soll die Gegenprobe zeigen, nicht stillschweigend übereinstimmen.
  const unquotierterWert = '{"titel":123}';
  const funde = _findenInCode(unquotierterWert);
  const jsonErfasst = funde.filter((f) => f.quotiert).length;
  assert.equal(jsonErfasst, 0, 'SCHLUESSEL selbst findet hier nichts — der Wert ist keine Zeichenkette');
  assert.equal(jsonFormRohZaehlen(unquotierterWert), 1, 'die Rohzählung sieht den Schlüssel trotzdem — das IST die Abweichung');
  assert.notEqual(jsonFormRohZaehlen(unquotierterWert), jsonErfasst,
    'die Gegenprobe muss hier auseinanderlaufen — sonst prüft sie nichts');
});
