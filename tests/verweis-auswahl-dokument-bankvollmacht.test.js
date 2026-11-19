'use strict';
/* Auswahl für Dokumente und Bankvollmachten trägt gespeicherte Verweise (Befunde VERWEIS-VERLUST-DOKUMENT,
   VERWEIS-VERLUST-BANKVOLLMACHT, 18.11.2026).
   Die Auswahl eines Dokuments aus „Meine Dokumente“ und die Ankreuzliste der Bankvollmachten zeigten nur Einträge unter
   ihren Vorschlägen. Ein verwaister Verweis (Dokument entfernt, Vollmacht gelöscht) oder einer auf eine Vollmacht anderer
   Art bekam keine Option bzw. kein Kästchen; beim Sichern ohne Eingabe ging er still verloren.
   Diese Probe hält fest: jeder gespeicherte Verweis steht genau einmal gewählt bzw. angehakt da. Klasse im Browser: der
   Wächter „Bearbeiten ohne Änderung“ (Bereichsformular und Dialog eines Listeneintrags). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const PW = 'pw';

function gewaehlteOptionen(html) {
  return Array.from(html.matchAll(/<option value="([^"]*)"[^>]*\bselected\b/g)).map((m) => m[1]);
}
function angehakt(html) {
  return Array.from(html.matchAll(/<input type="checkbox"[^>]*value="([^"]*)"[^>]*\bchecked\b/g)).map((m) => m[1]);
}
async function mitVollmachten() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.ankerDaten().sektoren.advanceCare = {
    provisionInstruments: [
      { id: 'vm-bank', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank', storageLocation: 'Schrank' },
      { id: 'vm-vorsorge', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', storageLocation: 'Ordner' },
    ],
  };
  return V;
}

test('[Verweis-Auswahl·Dokument] verwaister Dokument-Verweis steht gewählt da', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const html = V.feldInputHTML({ id: 'probeBescheinigung', typ: 'ref', entitaet: 'mappe' }, { ref: 'm-weg' });
  assert.deepEqual(gewaehlteOptionen(html), ['m-weg']);
});

test('[Verweis-Auswahl·Bankvollmacht] Ankreuzliste: verwaiste und andersartige Verweise bleiben angehakt, je einmal', async () => {
  const V = await mitVollmachten();
  const html = V.feldInputHTML({ id: 'probeVollmachten', typ: 'refMehrfach', entitaet: 'bank-power-of-attorney' },
    [{ ref: 'vm-bank' }, { ref: 'vm-vorsorge' }, { ref: 'vm-weg' }]);
  assert.deepEqual(angehakt(html).sort(), ['vm-bank', 'vm-vorsorge', 'vm-weg']);
  assert.ok(html.includes('Ordner'), 'die andersartige Vollmacht trägt ihren Namen');
});

test('[Verweis-Auswahl·Bankvollmacht] Einzelauswahl: andersartiger Verweis steht gewählt da', async () => {
  const V = await mitVollmachten();
  const html = V.feldInputHTML({ id: 'probeVollmacht', typ: 'ref', entitaet: 'bank-power-of-attorney' }, { ref: 'vm-vorsorge' });
  assert.deepEqual(gewaehlteOptionen(html), ['vm-vorsorge']);
});

test('[Verweis-Auswahl·Dokument/Bankvollmacht·Rot-Beweis] fehlt die Option bzw. das Kästchen, fällt es auf', async () => {
  const V = await mitVollmachten();
  const html = V.feldInputHTML({ id: 'probeVollmachten', typ: 'refMehrfach', entitaet: 'bank-power-of-attorney' }, [{ ref: 'vm-weg' }]);
  const ohne = html.replace(/<label class="refm-check-zeile"><input type="checkbox"[^>]*value="vm-weg"[\s\S]*?<\/label>/, '');
  assert.notEqual(ohne, html, 'Vorbedingung: das Kästchen ließ sich entfernen');
  assert.deepEqual(angehakt(ohne), []);
});
