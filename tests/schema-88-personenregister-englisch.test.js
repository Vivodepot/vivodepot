'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Schema 88 (23.09.2026, DoD-Punkt 2): das Personenregister `data.menschen[]` trägt Geburtsdatum,
   Geburtsjahr und Geburtsort unter denselben englischen Namen wie der Bereich `identity`:
   `birthDate`, `yearOfBirthIfTheExactDayIs`, `birthPlace`. Das Depot ist die Schnittstelle — wer
   eine Vivodepot-Datei mit anderer Software liest, soll an Person und Identität dieselben Namen finden.

   Geprüft werden die Stufe, der Rundlauf einer alten Datei, beide Schreibwege (Register-Formular,
   Inline-Neuanlage) und die Lesewege — jeweils bis zur gespeicherten und wieder geöffneten Datei.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { depotImProduktAnlegen, depotImProduktLaden } = require('./produkt-html-erzeugen.js');

const PW = 'schema-88-personen-pw-2026!';
const ALT = Object.freeze({ datum: 'geburtsdatum', jahr: 'geburtsjahr', ort: 'geburtsort' });
const NEU = Object.freeze({ datum: 'birthDate', jahr: 'yearOfBirthIfTheExactDayIs', ort: 'birthPlace' });
const WERTE = Object.freeze({ datum: '1950-03-04', jahr: '1950', ort: 'Köln' });

const altePerson = () => ({ id: 'p-alt', name: 'Anna Alt', [ALT.datum]: WERTE.datum, [ALT.jahr]: WERTE.jahr, [ALT.ort]: WERTE.ort });

function traegtNeu(p, name) {
  assert.ok(p, name + ': Person fehlt');
  assert.equal(p[NEU.datum], WERTE.datum, name + ': Geburtsdatum unter ' + NEU.datum);
  assert.equal(p[NEU.jahr], WERTE.jahr, name + ': Geburtsjahr unter ' + NEU.jahr);
  assert.equal(p[NEU.ort], WERTE.ort, name + ': Geburtsort unter ' + NEU.ort);
  for (const k of Object.values(ALT)) assert.equal(k in p, false, name + ': deutscher Schlüssel ' + k + ' steht noch');
}

/* ── die Stufe ──────────────────────────────────────────────────────────────── */

test('[Stufe 88] ein Depot auf Schema 87 mit deutschen Personen-Schlüsseln trägt die Werte danach unter den englischen Namen', () => {
  const { V } = ladeKern({ blank: true });
  const d = { schemaVersion: 87, menschen: [altePerson()], sektoren: {} };
  V.depotNormalisieren(d);
  traegtNeu(d.menschen[0], 'nach der Stufe');
  assert.ok(d.schemaVersion >= 88, 'die Stufe hebt die Schemanummer');
});

test('[Stufe 88·Vorrang] steht der englische Name schon, gewinnt er; der deutsche wird entfernt', () => {
  const { V } = ladeKern({ blank: true });
  const p = Object.assign(altePerson(), { [NEU.ort]: 'Bonn' });
  const d = { schemaVersion: 87, menschen: [p], sektoren: {} };
  V.depotNormalisieren(d);
  assert.equal(d.menschen[0][NEU.ort], 'Bonn', 'der vorhandene englische Wert wird nicht überschrieben');
  assert.equal(ALT.ort in d.menschen[0], false);
});

test('[Stufe 88·Sicherung] trägt eine Person beide Namen mit verschiedenen Werten, bleibt der alte in _migrationSicherung88 — nie im Export', async () => {
  const { V } = ladeKern({ blank: true });
  const d = { schemaVersion: 87, sektoren: {},
    menschen: [Object.assign(altePerson(), { [NEU.ort]: 'Bonn' }), { id: 'p-gleich', name: 'Gleich', [ALT.datum]: WERTE.datum, [NEU.datum]: WERTE.datum }] };
  V.depotNormalisieren(d);
  assert.deepEqual(d._migrationSicherung88, { schemaVersion: 87, menschen: [{ id: 'p-alt', [ALT.ort]: WERTE.ort }] },
    'nur der verdrängte, abweichende Wert steht in der Sicherung; gleiche Werte gehen nicht hinein');

  const { V: W } = ladeKern();
  await W.depotAnlegen('schema-88-sicherung-2026!');
  W.akteurSelbstErklaeren('S');
  W.setData(Object.assign(W.getData(), { _migrationSicherung88: d._migrationSicherung88 }));
  const export_ = JSON.stringify(W.vollExportJSON({ sensibel: false })) + JSON.stringify(W.vollExportJSON({ sensibel: true }));
  assert.ok(W.getData()._migrationSicherung88, 'Vorbedingung: die Sicherung steht im Depot');
  assert.equal(export_.includes('_migrationSicherung88'), false, 'die Sicherung verlässt das Depot nicht über den Export');
});

test('[Stufe 88·Idempotenz] zweimal normalisiert ist dasselbe wie einmal', () => {
  const { V } = ladeKern({ blank: true });
  const d = { schemaVersion: 87, menschen: [altePerson()], sektoren: {} };
  V.depotNormalisieren(d);
  const einmal = JSON.stringify(d.menschen);
  V.depotNormalisieren(d);
  assert.equal(JSON.stringify(d.menschen), einmal);
});

/* ── alt öffnen → speichern → wieder öffnen ────────────────────────────────── */

test('[Rundlauf] eine Datei von Schema 87 öffnet, speichert und öffnet wieder — alle drei Werte stehen unter den neuen Namen', async () => {
  // Die alte Datei: Schema 87, eine Person mit den deutschen Schlüsseln, über den echten Schreibweg gespeichert.
  const { umschlag: alt } = await depotImProduktAnlegen('privat-de', PW, (V) => {
    const data = V.getData();
    data.schemaVersion = 87;
    data.menschen = [altePerson()];
  });
  const erst = await depotImProduktLaden('privat-de', alt, PW);
  traegtNeu(erst.d.menschen.find((m) => m.id === 'p-alt'), 'nach dem ersten Öffnen');
  const gespeichert = await erst.V.depotSerialisieren();
  const wieder = await depotImProduktLaden('privat-de', gespeichert, PW);
  traegtNeu(wieder.d.menschen.find((m) => m.id === 'p-alt'), 'nach Speichern und erneutem Öffnen');
});

/* ── die Schreibwege ─────────────────────────────────────────────────────────── */

test('[Formularweg] eine über das Register-Formular erfasste Person trägt Geburtsdatum, -jahr und -ort — auch nach Speichern und Öffnen', async () => {
  const { umschlag } = await depotImProduktAnlegen('privat-de', PW, (V) => {
    const ids = V.MENSCHEN_REGISTER_FELD.unterFelder.map((u) => u.id);
    for (const k of Object.values(NEU)) assert.ok(ids.includes(k), 'das Register-Formular führt ' + k + ' (Ids: ' + ids.join(',') + ')');
    // Derselbe Weg wie flowPersonRegisterNeu: liesEintragAusDOM sammelt je Unterfeld-Id, liesEintragAusWerten baut daraus den Eintrag.
    const werte = V.liesEintragAusWerten(V.MENSCHEN_REGISTER_FELD,
      { name: 'Frieda Formular', [NEU.datum]: WERTE.datum, [NEU.jahr]: WERTE.jahr, [NEU.ort]: WERTE.ort });
    V.personHinzufuegen(werte);
  });
  const { d } = await depotImProduktLaden('privat-de', umschlag, PW);
  traegtNeu(d.menschen.find((m) => m.name === 'Frieda Formular'),
    'Formularweg (am 14.09.2026 liefen Schreib- und Leseweg auseinander, und das Geburtsdatum blieb leer)');
});

test('[Inline-Neuanlage] eine Person aus dem Inline-Weg (data-neu-geburtsdatum/-jahr) trägt Datum und Jahr unter den neuen Namen', async () => {
  const { umschlag } = await depotImProduktAnlegen('privat-de', PW, (V) => {
    // Derselbe Patch, den der Knopf „Hinzufügen" der Inline-Neuanlage baut.
    V.personHinzufuegen(V.personPatchAusInlineNeuanlage('Ilse Inline', WERTE.datum, WERTE.jahr));
  });
  const { d } = await depotImProduktLaden('privat-de', umschlag, PW);
  const p = d.menschen.find((m) => m.name === 'Ilse Inline');
  assert.ok(p, 'Person fehlt');
  assert.equal(p[NEU.datum], WERTE.datum);
  assert.equal(p[NEU.jahr], WERTE.jahr);
  for (const k of [ALT.datum, ALT.jahr]) assert.equal(k in p, false, 'deutscher Schlüssel ' + k + ' steht noch');
});

/* ── die Lesewege ───────────────────────────────────────────────────────────── */

test('[Leseweg] Geburtsjahr, Alter und Personalien-Satz lesen die neuen Namen', async () => {
  await depotImProduktAnlegen('privat-de', PW, (V) => {
    const id = V.personHinzufuegen({ name: 'Lea Lesen', [NEU.datum]: WERTE.datum, [NEU.ort]: WERTE.ort });
    const p = V.getData().menschen.find((m) => m.id === id);
    assert.equal(V.personGeburtsjahr(p), 1950);
    assert.equal(V.personAlter(p, new Date('2026-09-23T12:00:00Z')), 76);
    const satz = V.personVollzeile({ ref: id });
    assert.match(satz, /Köln/, 'der Geburtsort steht im Personalien-Satz: ' + satz);
    assert.match(satz, /1950/, 'das Geburtsdatum steht im Personalien-Satz: ' + satz);
    const nurJahr = V.personHinzufuegen({ name: 'Jan Jahr', [NEU.jahr]: '1961' });
    assert.equal(V.personGeburtsjahr(V.getData().menschen.find((m) => m.id === nurJahr)), 1961, 'Rückfall auf das Jahr');
  });
});

/* ── Positivkontrolle ─────────────────────────────────────────────────────── */

test('[Positivkontrolle] ein neues Depot schreibt nur noch die englischen Namen — ein deutscher Schlüssel im Patch landet nicht im Depot', async () => {
  const { umschlag } = await depotImProduktAnlegen('privat-de', PW, (V) => {
    V.personHinzufuegen({ name: 'Paul Neu', [NEU.datum]: WERTE.datum, [NEU.jahr]: WERTE.jahr, [NEU.ort]: WERTE.ort });
    // Der alte Name im Patch ist unbekannt und wird verworfen (ungeprüft gerufen: die Hülle des Laders würde den unbekannten Schlüssel melden).
    V.__ungeprueft.personHinzufuegen({ name: 'Grete Alt', [ALT.datum]: WERTE.datum });
  });
  const { d } = await depotImProduktLaden('privat-de', umschlag, PW);
  traegtNeu(d.menschen.find((m) => m.name === 'Paul Neu'), 'neues Depot');
  const grete = d.menschen.find((m) => m.name === 'Grete Alt');
  assert.equal(ALT.datum in grete, false, 'ein deutscher Schlüssel im Patch wird nicht geschrieben');
  const roh = JSON.stringify(d.menschen);
  for (const k of Object.values(ALT)) assert.equal(roh.includes('"' + k + '"'), false, 'kein ' + k + ' im gespeicherten Register');
});
