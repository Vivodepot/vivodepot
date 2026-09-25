'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — K8: eine Ausgabeschicht statt vier (Auftrag K8/S9 —
   Dokumentausgabe, 09.08.2026, Zug 1)
   ────────────────────────────────────────────────────────────────────────
   Der Auftrag verlangt Byte-Gleichheit als Nachweis, nicht Ähnlichkeit:
   die vier Dokumente aus Zug 0 (vor dem Umbau, mit dem alten vierfach
   kopierten Code erzeugt, eingefroren in tests/fixtures/k8-vorher/*.html)
   müssen nach dem Umbau auf die eine geteilte Ausgabeschicht (dokumentHTML/
   dokumentOeffnen + VORSORGE_MODULE[].dokAusgabe) IDENTISCH herauskommen.

   Das Probe-Depot hier reproduziert exakt das Rezept, mit dem die Zug-0-
   Fixtures erzeugt wurden (s. Kommentar am Ende der Datei) — jede
   Abweichung im Rezept macht diesen Test wertlos, darum steht das Rezept
   hier UND nicht nur im Bericht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

async function baueZug0Depot(V) {
  await V.depotAnlegen('K8-Zug0-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.personHinzufuegen({ name: 'Partner Person', birthDate: '1961-11-02', birthPlace: 'Koeln',
    adresse: 'Musterweg 1, 50667 Koeln', tel: '0221 123456', email: 'partner@beispiel.example' });
  const d = V.getData();
  const partner = d.menschen.find(p => p.name === 'Partner Person');
  d.sektoren.identity = { givenName: 'Elisabeth', familyName: 'Beispiel', birthDate: '1958-03-14',
    birthPlace: 'Augsburg', streetAddress: 'Lindenweg 4', postcodeCity: '80331 Muenchen',
    telephone: '089 87654321', email: 'elisabeth@beispiel.example' };
  d.sektoren.advanceCare = {
    applicableSituations: ['sterbeprozess'],
    ki_grundentscheidung: 'erlaubnis', ki_zweck: ['trauer'],
    provisionInstruments: [
      { id: 'vm-1', instrument: 'enduring-power-of-attorney', authorizedPersons: [{ ref: partner.id }],
        healthCareGeneralDecision: 'ja', disposeOfAssets: 'ja' },
      { id: 'bv-1', instrument: 'custodianship-declaration', proposedPerson: { ref: partner.id }, whatTheCareArrangementShould: 'Wohnung halten' },
    ],
  };
  V.setData(d);
  return d;
}

function golden(name) {
  return fs.readFileSync(path.join(__dirname, 'fixtures', 'k8-vorher', name + '.html'), 'utf8');
}

test('[K8·Byte-Gleichheit] PV — dokumentHTML(\'patientenverfuegung\') == altes pvDokumentHTML() (Zug-0-Fixture)', async () => {
  const { V } = ladeKern();
  await baueZug0Depot(V);
  assert.equal(V.pvDokumentHTML(), golden('pv'));
});

test('[K8·Byte-Gleichheit] KI — dokumentHTML(\'ki-verfuegung\') == altes kiDokumentHTML() (Zug-0-Fixture)', async () => {
  const { V } = ladeKern();
  await baueZug0Depot(V);
  assert.equal(V.kiDokumentHTML(), golden('ki'));
});

test('[K8·Byte-Gleichheit] VM — dokumentHTML(\'vorsorgevollmacht\', id) == altes vollmachtDokumentHTML(id) (Zug-0-Fixture)', async () => {
  const { V } = ladeKern();
  await baueZug0Depot(V);
  assert.equal(V.vollmachtDokumentHTML('vm-1'), golden('vm'));
});

test('[K8·Byte-Gleichheit] BV — dokumentHTML(\'betreuungsverfuegung\') == altes betreuungDokumentHTML() (Zug-0-Fixture)', async () => {
  const { V } = ladeKern();
  await baueZug0Depot(V);
  assert.equal(V.betreuungDokumentHTML(), golden('bv'));
});

test('[K8·1] dokumentHTML() ist direkt über den Modul-Namen aufrufbar, nicht nur über die vier Alt-Namen', async () => {
  const { V } = ladeKern();
  await baueZug0Depot(V);
  assert.equal(typeof V.dokumentHTML, 'function');
  assert.equal(V.dokumentHTML('patientenverfuegung'), golden('pv'));
  assert.equal(V.dokumentHTML('vorsorgevollmacht', 'vm-1'), golden('vm'));
});

test('[K8·2] dokumentOeffnen() trägt dasselbe Kern-Gate wie die alten *Oeffnen()-Funktionen (PV/VM/BV ja, KI nein)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('K8-Gate-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.identity = {};   // weder Name noch Geburtsdatum
  d.sektoren.advanceCare = { applicableSituations: ['sterbeprozess'], ki_grundentscheidung: 'erlaubnis', ki_zweck: ['trauer'],
    provisionInstruments: [ { id: 'vm-1', instrument: 'enduring-power-of-attorney', representationInCourt: 'ja' },
      { id: 'bv-1', instrument: 'custodianship-declaration', whatTheCareArrangementShould: 'x' } ] };
  V.setData(d);
  assert.equal(V.dokumentOeffnen('patientenverfuegung'), 'identitaet-unvollstaendig');
  assert.equal(V.dokumentOeffnen('vorsorgevollmacht', 'vm-1'), 'identitaet-unvollstaendig');
  assert.equal(V.dokumentOeffnen('betreuungsverfuegung'), 'identitaet-unvollstaendig');
  assert.notEqual(V.dokumentOeffnen('ki-verfuegung'), 'identitaet-unvollstaendig', 'KI trägt bewusst KEIN Kern-Gate — unverändert gegenüber vorher');
});

/* Rezept, mit dem tests/fixtures/k8-vorher/*.html am 10.08.2026 gegen den Vor-K8-Code
   (Commit efdbfeb, letzter F8-Commit) erzeugt wurden — s. baueZug0Depot() oben, identisch. */
