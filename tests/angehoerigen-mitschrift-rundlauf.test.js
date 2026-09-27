/* ANG1 Stufe c — das elfte Mitschrift-Fach `angehoerigen`. Die Datei bringt die Angehörigen-
   Vorlage des Produkts mit ("die Datei bringt alles mit"), damit ein Programm ohne dieses Ab-Werk
   (nacktes Gerüst, die Lese-App) die Blätter kennt. Rangfolge wie bei den übrigen Fächern:
   ein lebendes Ab-Werk gewinnt, die Mitschrift nur ohne es. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw-ang-mitschrift';
const FREMD = {
  modulTyp: 'angehoerigenVorlage', moduleVersion: 1, herkunft: 'test-fremd', sprache: 'de', rechtsraum: 'AT',
  situationen: { 'nur-in-der-mitschrift': { titel: 'Nur Mitschrift', icon: 'star', bloecke: [] } },
};

test('[Fach 11] ein frisch angelegtes Depot trägt die Vorlage des Produkts in der Mitschrift', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const m = V.getData().abWerkMitschrift.angehoerigen;
  assert.ok(Array.isArray(m) && m.length === 1, 'genau eine Vorlage (privat-de)');
  assert.equal(m[0].rechtsraum, 'DE');
  assert.deepEqual(Object.keys(m[0].situationen).sort(),
    ['beerdigung', 'behoerden_nachlass', 'krankenhausakut', 'meine_menschen', 'pflegeheimakut']);
});

test('[Fach 11] ein nacktes Gerüst liest die fünf Blätter aus der Mitschrift der Datei — ohne sie sieht es keine', async () => {
  const voll = ladeKern();
  await voll.V.depotAnlegen(PW);
  const mitschrift = JSON.parse(JSON.stringify(voll.V.getData().abWerkMitschrift));

  const { V } = ladeKern({ blank: true });
  V._angehoerigenVorlagenAusDepotAnmelden({ abWerkMitschrift: mitschrift });
  assert.deepEqual(V.angehoerigenSituationenAlle().map((s) => s.id).sort(),
    ['beerdigung', 'behoerden_nachlass', 'krankenhausakut', 'meine_menschen', 'pflegeheimakut']);

  // Gegenprobe: dieselbe Datei ohne das Fach zeigt nichts — die Probe prüft wirklich etwas.
  V._angehoerigenVorlagenAusDepotAnmelden({ abWerkMitschrift: Object.assign({}, mitschrift, { angehoerigen: [] }) });
  assert.deepEqual(V.angehoerigenSituationenAlle(), []);
});

test('[Fach 11] eine ältere Datei ohne das Fach öffnet ohne Fehler und ohne Blätter', () => {
  const { V } = ladeKern({ blank: true });
  V._angehoerigenVorlagenAusDepotAnmelden({ abWerkMitschrift: { bereich: [], sprache: null } });
  assert.deepEqual(V.angehoerigenSituationenAlle(), []);
});

test('[Fach 11] ein lebendes Ab-Werk gewinnt gegen eine widersprechende Mitschrift', () => {
  const { V } = ladeKern();
  V._angehoerigenVorlagenAusDepotAnmelden({ abWerkMitschrift: { angehoerigen: [FREMD] } });
  const ids = V.angehoerigenSituationenAlle().map((s) => s.id);
  assert.ok(!ids.includes('nur-in-der-mitschrift'), 'die Mitschrift wird nur ohne lebendes Ab-Werk gelesen');
  assert.equal(ids.length, 5);
});

test('[Fach 11] der Vollexport hält das Fach zurück, wie die übrigen Mitschrift-Fächer', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const text = JSON.stringify(V.vollExportJSON({ sensibel: true }));
  assert.ok(!text.includes('krankenhausakut'), 'die Blatt-Kennungen der Mitschrift stehen nicht im Klartext-Export');
});
