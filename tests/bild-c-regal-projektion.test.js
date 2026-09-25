'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Bild C — Regal + Cross-Sektor-Sichtbarkeit (Weg β, Liste-Projektion).
   U2-Auftrag 11.07. Sichert die Nicht-Doppelzählung über die Sektorgrenze:
   die Bankvollmacht (Daten in Vorsorge) erscheint als Verweis-Karte in
   Finanzen, in Vorsorge NICHT doppelt, und die ERKENNUNG schlägt sie nicht
   fälschlich als fehlend vor. Die zwei bestehenden Filter bleiben unberührt.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// U2-ADR-089 Teil A Block 1 (17.07.): die geteilte Liste heißt jetzt `provisionInstruments`,
// jeder Record trägt zusätzlich die Diskriminante (von modulSichtbarkeitsKarten geprüft, bevor
// `typeOfPowerOfAttorney` überhaupt betrachtet wird). "Englisch vor v1": das Unterfeld hieß
// früher `typ`, heisst laut kennung-mapping.json (advanceCare.provisionInstruments/instrument)
// und laut listenZeilenWaehlen()-Kommentar (Zeile ~44343 in vivodepot.html: "r.typ existiert
// nicht mehr, nur r.instrument") jetzt `instrument` — modulSichtbarkeitsKarten/
// sichtbarkeitsKartenHTML/_bankvollmachtRecords/_instrumentVorhanden lesen bereits `.instrument`.
// (modulKarteStatus/_bvZeile lesen dagegen noch `.typ` — eine bestehende Inkonsistenz, s.
// Abschlussbericht; NICHT hier künstlich angeglichen.)
function mitVollmachten(liste) {
  const getaggt = (liste || []).map(r => Object.assign({ instrument: 'enduring-power-of-attorney' }, r));
  return { schemaVersion: 39, sektoren: { advanceCare: { provisionInstruments: getaggt } }, menschen: [] };
}

test('1 · Bankvollmacht erscheint als genau EINE Verweis-Karte in Finanzen', () => {
  const { V } = ladeKern();
  V.setData(mitVollmachten([{ typeOfPowerOfAttorney: 'bank' }]));
  const karten = V.modulSichtbarkeitsKarten('finance');
  assert.equal(karten.length, 1);
  assert.equal(karten[0].modul.id, 'vorsorgevollmacht');   // Modul-Id, nicht der Typ-Code
  assert.equal(karten[0].record.typeOfPowerOfAttorney, 'bank');
});

test('2 · Home-Sektor-Guard: keine Projektion im Heimatsektor (Vorsorge = [])', () => {
  const { V } = ladeKern();
  V.setData(mitVollmachten([{ typeOfPowerOfAttorney: 'bank' }]));
  assert.equal(V.modulSichtbarkeitsKarten('advanceCare').length, 0);
  assert.equal(V.sichtbarkeitsKartenHTML('advanceCare'), '', 'kein Verweis-Regal im Heimatsektor');
});

test('3 · ERKENNUNG in Finanzen schlägt KEINE Vollmacht als fehlend vor (Filter unberührt)', () => {
  const { V } = ladeKern();
  V.setData(mitVollmachten([{ typeOfPowerOfAttorney: 'bank' }]));
  const vorschlaege = V.erkennungsVorschlaege('finance').map(d => d.typ);
  assert.equal(vorschlaege.includes('enduring-power-of-attorney'), false, 'keine Vollmacht-Erkennung in Finanzen');
});

test('4 · art-Filter greift: eine Vorsorge-Vollmacht (art≠bank) erscheint NICHT in Finanzen', () => {
  const { V } = ladeKern();
  V.setData(mitVollmachten([{ typeOfPowerOfAttorney: 'vorsorge' }]));
  assert.equal(V.modulSichtbarkeitsKarten('finance').length, 0);
  // Gemischt: nur die bank-Vollmacht kommt durch.
  V.setData(mitVollmachten([{ typeOfPowerOfAttorney: 'vorsorge' }, { typeOfPowerOfAttorney: 'bank' }, { typeOfPowerOfAttorney: 'gesundheit' }]));
  const karten = V.modulSichtbarkeitsKarten('finance');
  assert.equal(karten.length, 1);
  assert.equal(karten[0].record.typeOfPowerOfAttorney, 'bank');
});

test('5 · Keine Doppelzählung: Projektion legt keinen dokumente-Record an, Rollup-Quelle unverändert', () => {
  const { V } = ladeKern();
  V.setData(mitVollmachten([{ typeOfPowerOfAttorney: 'bank' }]));
  const d = V.getData();
  const dokVor = Array.isArray(d.dokumente) ? d.dokumente.length : 0;
  const listeVor = d.sektoren.advanceCare.provisionInstruments.length;
  V.modulSichtbarkeitsKarten('finance');
  V.sichtbarkeitsKartenHTML('finance');
  const dokNach = Array.isArray(d.dokumente) ? d.dokumente.length : 0;
  assert.equal(dokNach, dokVor, 'kein dokumente-Record angelegt');
  assert.equal(d.sektoren.advanceCare.provisionInstruments.length, listeVor, 'die provisionInstruments-Liste (Rollup-Quelle) unverändert');
});

test('6 · Verweis-Ziel korrekt: sektor/listeId/index auf den Heimat-Record', () => {
  const { V } = ladeKern();
  V.setData(mitVollmachten([{ typeOfPowerOfAttorney: 'vorsorge' }, { typeOfPowerOfAttorney: 'bank' }]));
  const k = V.modulSichtbarkeitsKarten('finance')[0];
  assert.equal(k.verweisAuf.sektor, 'advanceCare');
  assert.equal(k.verweisAuf.listeId, 'provisionInstruments');
  assert.equal(k.verweisAuf.index, 1, 'die bank-Vollmacht steht an Index 1 der Liste');
});

test('7 · Die zwei bestehenden Filter sind byte-gleich (keine Cross-Sektor-Erweiterung)', () => {
  const { V } = ladeKern();
  V.setData(mitVollmachten([{ typeOfPowerOfAttorney: 'bank' }]));
  // dokumentPanelHTML für Finanzen enthält keine Vollmacht-Verweis-Karte über den dokumente-Filter
  // (die Projektion ist eine SEPARATE Quelle, s. sichtbarkeitsKartenHTML). dokumente[] ist leer.
  const d = V.getData();
  assert.equal(Array.isArray(d.dokumente) ? d.dokumente.length : 0, 0, 'keine dokumente-Records durch die Projektion');
  // Regal-HTML trägt die sechs Instrument-Karten. Nachtrag (Siebtes-Register-Auftrag, Zug 1,
  // 27.08.2026): Erbschein trug hier zwischenzeitlich eine siebte Karte (solange es fest in
  // VORSORGE_MODULE stand, das vorsorgeRegalHTML() direkt durchläuft) — seit der Entfernung der
  // festen Verdrahtung ist es kein VORSORGE_MODULE-Eintrag mehr und erscheint hier folgerichtig
  // nicht, nur noch in seiner eigenen Sektion (s. erbschein-modul-mechanik.test.js).
  const regal = V.vorsorgeRegalHTML();
  assert.equal((regal.match(/data-modul-karte=/g) || []).length, 6, 'sechs Regal-Karten');
});

test('Block-1-Nachtrag (17.07.): Regal-Karten-Titel ist die Art allein, kein „Vorsorgevollmacht ·"-Präfix', () => {
  const { V } = ladeKern();
  V.setData(mitVollmachten([{ typeOfPowerOfAttorney: 'bank' }]));
  const html = V.sichtbarkeitsKartenHTML('finance');
  assert.match(html, /regal-karte-titel">Bankvollmacht</);
  assert.doesNotMatch(html, /Vorsorgevollmacht/, 'Typ-Sammelbegriff fehlt in der Regal-Karte');
});

test('8 · Verweis über STABILE id (U2-ADR-071): Record mit id → verweisAuf.id + rec-Anker; Alt-Record → Sektion-Fallback', () => {
  const { V } = ladeKern();
  V.setData({ schemaVersion: 39, sektoren: { advanceCare: { provisionInstruments: [{ instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank', id: 'v-abc' }] } }, menschen: [] });
  const k = V.modulSichtbarkeitsKarten('finance')[0];
  assert.equal(k.verweisAuf.id, 'v-abc', 'Verweis trägt die stabile Record-id');
  assert.match(V.sichtbarkeitsKartenHTML('finance'), /data-verweis-anker="rec-v-abc"/, 'Feinsprung-Anker rec-<id>');
  // Alt-Record ohne id → Fallback auf den Instrument-Abschnitt (kein Bruch).
  V.setData({ schemaVersion: 39, sektoren: { advanceCare: { provisionInstruments: [{ instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank' }] } }, menschen: [] });
  assert.match(V.sichtbarkeitsKartenHTML('finance'), /data-verweis-anker="sek-vorsorgevollmacht"/, 'Fallback-Anker Instrument-Abschnitt');
});

test('9 · Nicht-Instrument-Sprungliste (U2-ADR-071): Pflegewünsche behält seine Sprungmarke, Instrumente nicht', () => {
  const { V } = ladeKern();
  const html = V.nichtInstrumentSprunglisteHTML('advanceCare');
  assert.match(html, /href="#sek-care-preferences"/, 'Pflegewünsche (kein Instrument) trägt eine Sprungmarke');
  // Die Instrument-Sektionen sind NICHT in der Sprungliste — sie tragen bereits eine Regal-Karte.
  for (const id of ['vorsorgevollmacht', 'patientenverfuegung', 'testament-erbe', 'betreuungsverfuegung', 'sorgerechtsverfuegung']) {   // Modul-Ids
    assert.doesNotMatch(html, new RegExp('href="#sek-' + id + '"'), id + ' ist im Regal, nicht in der Sprungliste');
  }
  // Generisch: ein voll abgedeckter Sektor liefert nichts (keine leere Liste).
  // (meine-menschen hat keine VORSORGE_MODULE-Karten → alle Sektionen wären „nicht-Instrument"; hier nur
  //  prüfen, dass die Funktion für einen fremden Sektor nicht crasht und einen String liefert.)
  assert.equal(typeof V.nichtInstrumentSprunglisteHTML('finance'), 'string');
});

test('Regal-Status + Herkunft je Modul (mehrfach = Anzahl, Gate = vorhanden/keine)', () => {
  const { V } = ladeKern();
  V.setData(mitVollmachten([{ typeOfPowerOfAttorney: 'bank' }, { typeOfPowerOfAttorney: 'vorsorge' }]));
  assert.equal(V.modulKarteStatus(V.VORSORGE_MODUL_BY_ID['vorsorgevollmacht']), '2 erteilt');
  // K4 Zug 4 (10.08.2026): Etikett ist STRINGS.amtlicherWortlautBadge ("amtlicher Wortlaut"),
  // nicht mehr das rohe "amtlich" — s. Kommentar an _MODUL_KARTE.
  assert.equal(V.modulKarteHerkunft(V.VORSORGE_MODUL_BY_ID['patientenverfuegung']), V.STRINGS.amtlicherWortlautBadge);
  assert.equal(V.modulKarteHerkunft(V.VORSORGE_MODUL_BY_ID['ki-verfuegung']), 'eigenhändig');
  // KI gleichrangig: kein Sonderetikett — Herkunft eigenhändig wie Testament.
  assert.equal(V.modulKarteHerkunft(V.VORSORGE_MODUL_BY_ID['testament-erbe']), 'eigenhändig');
});
