'use strict';
/* ═════════════════════════════════════════════════════════════════
   Keine Aufzählung mit doppeltem Satzzeichen — Kern und Lese-App (28.09.2026)
   Befund: das PDF und die Lese-App zeigten die Situationen der Patientenverfügung als „… befinde,, ich mich im Endstadium …".
   Die amtlichen Optionstexte enden selbst auf ein Komma (Glieder eines Satzes); die Aufzählung der Mehrfachauswahl setzte ein
   zweites. Gefunden in der Abnahme gegen das Nativ, als die Festlegungen Felder wurden (U2-ADR-440).
   Wächter gegen die ganze Klasse: JEDE Mehrfachauswahl des Kerns und der Lese-App, mit allen Optionen gewählt, ergibt eine
   Aufzählung ohne „,,", „;," oder „, ,". Die Probe am Einzelfall steht in tests/pv-festlegungen-kennungen.test.js [PV·Aufzählung].
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const DOPPELT = /[,;]\s*,|,\s*[,;]/;

function mehrfachauswahlen(sektoren) {
  const raus = [];
  for (const s of sektoren || []) for (const sek of (s.sektionen || [])) for (const f of (sek.felder || [])) {
    if (f.typ === 'mehrfachauswahl' && Array.isArray(f.optionen) && f.optionen.length > 1) raus.push({ s, f });
  }
  return raus;
}

test('[Aufzählung·Kern] jede Mehrfachauswahl, alle Optionen gewählt: kein doppeltes Satzzeichen', () => {
  const { V } = ladeKern();
  const alle = mehrfachauswahlen(V.bereicheAlle());
  assert.ok(alle.length >= 5, 'Suchraum besetzt: ' + alle.length + ' Mehrfachauswahlen');
  assert.ok(alle.some(({ f }) => f.optionen.some((o) => /[,;]\s*$/.test(String(o.label)))),
    'Vorbedingung: mindestens eine Option endet selbst auf ein Satzzeichen — sonst misst der Wächter nichts');
  const funde = alle.map(({ s, f }) => ({ k: s.id + '.' + f.id, t: V.feldWertText(f, f.optionen.map((o) => o.wert)) }))
    .filter((x) => DOPPELT.test(x.t)).map((x) => x.k + ': ' + x.t.slice(0, 80));
  assert.deepEqual(funde, []);
});

test('[Aufzählung·Lese-App] dieselbe Klasse in der Lese-App, die die Institution liest', () => {
  const { V } = ladeLesen();
  const alle = mehrfachauswahlen(V.SEKTOREN);
  assert.ok(alle.length >= 5, 'Suchraum besetzt: ' + alle.length + ' Mehrfachauswahlen');
  const funde = alle.map(({ s, f }) => ({ k: s.id + '.' + f.id, t: V.feldWertText(f, f.optionen.map((o) => o.wert), s.id) }))
    .filter((x) => DOPPELT.test(x.t)).map((x) => x.k + ': ' + x.t.slice(0, 80));
  assert.deepEqual(funde, []);
});

test('[Aufzählung·Rot-Beweis] eine Aufzählung ohne Kürzung fiele durch — das Muster erkennt den Fehler', () => {
  const texte = ['ich mich im Sterbeprozess befinde,', 'ich mich im Endstadium befinde,'];
  assert.match(texte.join(', '), DOPPELT, 'ungekürzt: doppeltes Komma');
  assert.doesNotMatch(texte.map((t) => t.replace(/[\s,;]+$/, '')).join(', '), DOPPELT, 'gekürzt: sauber');
});
