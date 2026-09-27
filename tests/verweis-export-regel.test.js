'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — E2 D0: Verweis-Export-Regel (15.07.2026, D0-Matrix)
   ────────────────────────────────────────────────────────────────────────
   Ein Verweis (ref/refMehrfach auf Person oder Institution) verschwindet
   heute an der Sektor-Grenze bis auf den bloßen Namen. Diese Suite prüft
   die reine Filterfunktion (verweisExportFelder, generatoragnostisch) und
   ihre Verdrahtung in docxBereichModell — den EINEN generischen Export für
   alle GENERISCH-Sektoren (per Bauauftrag zuerst dran; FHIR/Finanzen/
   Bildung-Generatoren sind eigener Nachzug).

   Der Negativtest ist wichtiger als der Positivtest (Bauauftrag E2,
   15.07.): pro Zweck muss bewiesen werden, dass beziehung/Geburtsdaten/
   email NICHT im Verweis-Export stehen — Datenschutz-Begründung in der
   D0-Matrix, fest verankert im Code-Kommentar über verweisExportFelder.

   ACHTUNG Abgrenzung (Stufe-1-Befund desselben Auftrags): Der Register-
   Gesamtexport der „Meine Menschen"-Liste (vcard-menschen, U2-ADR-022)
   bleibt UNBERÜHRT und trägt `beziehung` weiterhin — das ist ein anderer
   Export (die Bürgerin exportiert ihre eigene Kontaktliste), nicht der
   hier geregelte Verweis-Export aus fremdem Sektor-Kontext. Test dazu:
   tests/weitere-formate.test.js Test 8.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

/* ── Reine Filterfunktion — pro Zweck Positiv- UND Negativtest ─────────── */

test('verweisExportFelder (Person, jeder Zweck außer familiaer): name/tel/adresse mit, beziehung/Geburtsdaten/email/aufgabe/anmerkung/id NIE', () => {
  const { V } = ladeKern();
  const eintrag = {
    id: 'p1', name: 'Dr. Müller', beziehung: 'Hausarzt seit 2001', tel: '089 123',
    adresse: 'Musterstr. 1', birthDate: '1970-01-01', yearOfBirthIfTheExactDayIs: '1970',
    birthPlace: 'München', email: 'a@b.example.de', aufgabe: 'Notfallkontakt', anmerkung: 'nett',
  };
  for (const zweck of ['aerztlich', 'vollmacht', 'pflege', 'geschaeftlich', 'wohnen']) {
    const out = V.verweisExportFelder(zweck, 'person', eintrag);
    assert.equal(out.name, 'Dr. Müller', zweck + ': name mit');
    assert.equal(out.tel, '089 123', zweck + ': tel mit');
    assert.equal(out.adresse, 'Musterstr. 1', zweck + ': adresse mit');
    assert.ok(!('beziehung' in out), zweck + ': beziehung NICHT mit');
    assert.ok(!('birthDate' in out), zweck + ': geburtsdatum NICHT mit');
    assert.ok(!('yearOfBirthIfTheExactDayIs' in out), zweck + ': geburtsjahr NICHT mit');
    assert.ok(!('birthPlace' in out), zweck + ': geburtsort NICHT mit');
    assert.ok(!('email' in out), zweck + ': email NICHT mit');
    assert.ok(!('aufgabe' in out), zweck + ': aufgabe NICHT mit');
    assert.ok(!('anmerkung' in out), zweck + ': anmerkung NICHT mit');
    assert.ok(!('id' in out), zweck + ': id NICHT mit');
  }
});

test('verweisExportFelder (Person, Zweck familiaer): adresse geht NICHT mit — einziger Unterschied zur allgemeinen Regel', () => {
  const { V } = ladeKern();
  const eintrag = { id: 'p1', name: 'Anna', tel: '0151 1', adresse: 'Kastanienweg 5', beziehung: 'Tochter' };
  const out = V.verweisExportFelder('familiaer', 'person', eintrag);
  assert.equal(out.name, 'Anna');
  assert.equal(out.tel, '0151 1');
  assert.ok(!('adresse' in out), 'familiaer: adresse NICHT mit');
  assert.ok(!('beziehung' in out), 'familiaer: beziehung NICHT mit');
});

test('verweisExportFelder (Institution, jeder Zweck): name/art/tel/adresse mit, email/anmerkung/id NIE', () => {
  const { V } = ladeKern();
  const eintrag = { id: 'i1', name: 'Praxis Dr. Müller', art: 'krankenhaus', tel: '089 1', adresse: 'Musterstr. 1', email: 'x@y.example.de', anmerkung: 'nur mittwochs' };
  for (const zweck of ['aerztlich', 'vollmacht', 'pflege', 'geschaeftlich', 'wohnen']) {
    const out = V.verweisExportFelder(zweck, 'institution', eintrag);
    assert.equal(out.name, 'Praxis Dr. Müller', zweck);
    assert.equal(out.art, 'krankenhaus', zweck);
    assert.equal(out.tel, '089 1', zweck);
    assert.equal(out.adresse, 'Musterstr. 1', zweck);
    assert.ok(!('email' in out), zweck + ': email NICHT mit');
    assert.ok(!('anmerkung' in out), zweck + ': anmerkung NICHT mit');
    assert.ok(!('id' in out), zweck + ': id NICHT mit');
  }
});

test('verweisExportFelder: unbekannter Zweck oder fehlender Eintrag liefert null (nichts geht mit)', () => {
  const { V } = ladeKern();
  assert.equal(V.verweisExportFelder('unbekannt', 'person', { name: 'X' }), null);
  assert.equal(V.verweisExportFelder('aerztlich', 'person', null), null);
});

test('verweisExportFelder: kontextWert (fach/stelle) landet separat unter _kontext, kein Register-Feld', () => {
  const { V } = ladeKern();
  const out = V.verweisExportFelder('aerztlich', 'person', { name: 'Dr. X', tel: '1' }, 'Kardiologie');
  assert.equal(out._kontext, 'Kardiologie');
});

/* ── docxBereichModell-Integration — Top-Level ref/refMehrfach-Felder ───── */

test('docxBereichModell (housing.landlordPropertyManagement, Zweck wohnen): Name+Tel+Adresse mit, beziehung NICHT', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const id = V.personHinzufuegen({ name: 'Hausverwaltung Bayer', tel: '089 555', adresse: 'Ring 3', beziehung: 'Cousine der Vermieterin' });
  V.sektorFeldSetzen('housing', 'landlordPropertyManagement', { ref: id });
  const modell = V.docxBereichModell('housing');
  const zeile = modell.zeilen.find(z => z.label === 'Vermieter / Hausverwaltung');
  assert.ok(zeile, 'Zeile vorhanden');
  assert.match(zeile.wert, /Hausverwaltung Bayer/);
  assert.match(zeile.wert, /089 555/);
  assert.match(zeile.wert, /Ring 3/);
  assert.doesNotMatch(zeile.wert, /Cousine/, 'beziehung geht nicht mit');
});

test('docxBereichModell (people.spouseOrCivilPartner, Zweck familiaer): Name+Tel mit, Adresse NICHT (familiaer-Ausnahme)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const id = V.personHinzufuegen({ name: 'Klaus Muster', tel: '0171 2', adresse: 'Seeweg 9' });
  V.sektorFeldSetzen('people', 'spouseOrCivilPartner', { ref: id });
  const modell = V.docxBereichModell('people');
  const zeile = modell.zeilen.find(z => z.label === 'Ehepartnerin/Ehepartner oder Lebenspartnerin/Lebenspartner');
  assert.match(zeile.wert, /Klaus Muster/);
  assert.match(zeile.wert, /0171 2/);
  assert.doesNotMatch(zeile.wert, /Seeweg 9/, 'adresse geht bei familiaer nicht mit');
});

// U2-ADR-116 §7 (29.07.2026): geprüft wird jetzt `pflegedienst` — `pflegedienst_kontakt` ist
// entfallen. Der Gegenstand der Prüfung bleibt derselbe: ein Institutions-Verweis mit Zweck
// `aerztlich` gibt Name/Art/Tel/Adresse heraus und die E-Mail nicht.
test('docxBereichModell (socialInsurance.homeCareServiceNameContact, Institution, Zweck aerztlich): Name+Art+Tel+Adresse mit, email NICHT', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const id = V.institutionHinzufuegen({ name: 'Pflegedienst Sonnenschein', art: 'pflegedienst', tel: '089 999', adresse: 'Amselweg 2', email: 'kontakt@pd.example.de' });
  V.sektorFeldSetzen('socialInsurance', 'homeCareServiceNameContact', { ref: id });
  // N4 (09.08.2026): `pflegedienst` ist seit N4 Zug 1 schema-sensibel — Opt-in, die Probe gilt der Verweis-Anreicherung.
  const modell = V.docxBereichModell('socialInsurance', { sensibel: true });
  const zeile = modell.zeilen.find(z => z.label === 'Ambulanter Pflegedienst — Name & Kontakt');
  assert.match(zeile.wert, /Pflegedienst Sonnenschein/);
  assert.match(zeile.wert, /pflegedienst/);
  assert.match(zeile.wert, /089 999/);
  assert.match(zeile.wert, /Amselweg 2/);
  assert.doesNotMatch(zeile.wert, /kontakt@pd\.de/, 'email geht nicht mit');
});

test('docxBereichModell (finance.taxAdvisor, Zweck geschaeftlich): Name+Tel mit', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const id = V.personHinzufuegen({ name: 'Steuerkanzlei Weiß', tel: '089 42' });
  V.sektorFeldSetzen('finance', 'taxAdvisor', { ref: id });
  const modell = V.docxBereichModell('finance');
  const zeile = modell.zeilen.find(z => z.label === 'Steuerberater');
  assert.match(zeile.wert, /Steuerkanzlei Weiß/);
  assert.match(zeile.wert, /089 42/);
});

/* ── docxBereichModell-Integration — Listen-Unterfelder mit Kontext (fach/stelle) ── */

test('docxBereichModell (health.specialistDoctors, Zweck aerztlich + Kontext fach): Name+Tel+Fachgebiet mit', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const id = V.personHinzufuegen({ name: 'Dr. Kardio', tel: '089 77', beziehung: 'kennt Familie seit Jahren' });
  V.listenEintragHinzufuegen('health', 'specialistDoctors', { specialistDoctor: { ref: id }, specialty: 'Kardiologie' });
  // N4 (09.08.2026): `fachaerzte` ist seit N4 Zug 1 schema-sensibel — Opt-in, die Probe gilt der Verweis-Anreicherung.
  const modell = V.docxBereichModell('health', { sensibel: true });
  const zeile = modell.zeilen.find(z => z.label === 'Fachärztinnen und Fachärzte');
  assert.match(zeile.wert, /Dr\. Kardio/);
  assert.match(zeile.wert, /089 77/);
  assert.match(zeile.wert, /Kardiologie/);
  assert.doesNotMatch(zeile.wert, /kennt Familie/, 'beziehung geht nicht mit');
});

test('docxBereichModell (advanceCare.provisionInstruments, Zweck vollmacht + Kontext stelle): Name+Tel+beurkundende Stelle mit', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const id = V.personHinzufuegen({ name: 'Maria Vollmacht', tel: '089 33' });
  // U2-ADR-089 Teil A Block 1 (17.07.): vollmachten ist nach vorsorge_instrumente umgehängt (typ='enduring-power-of-attorney').
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', {
    instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'general', authorizedPersons: [{ ref: id }], form: 'beurkundet',
    certifyingBody: 'Notar Dr. Sommer, München', storageLocation: 'beim Notar',
  });
  const modell = V.docxBereichModell('advanceCare');
  const zeile = modell.zeilen.find(z => z.label === 'Vorsorge-Instrumente');
  assert.match(zeile.wert, /Maria Vollmacht/);
  assert.match(zeile.wert, /089 33/);
  assert.match(zeile.wert, /Notar Dr\. Sommer/);
  // 'stelle' erscheint NUR im Verweis-Text, nicht zusätzlich als eigene Zeile im selben Eintrag.
  const belegeStelle = (zeile.wert.match(/Notar Dr\. Sommer/g) || []).length;
  assert.equal(belegeStelle, 1, 'Stelle nicht doppelt');
});

/* ── Register-Gesamtexport bleibt unberührt (Abgrenzungs-Beweis) ────────── */

test('vcard-menschen (Register-Gesamtexport) trägt beziehung weiterhin — anderer Export als der Verweis-Export', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.personHinzufuegen({ name: 'Anna Schmidt', tel: '0151 1', beziehung: 'Schwester' });
  const vcf = V.kernAPI.exportiere('vcard-menschen');
  assert.ok(vcf.includes('NOTE:Schwester'), 'Register-Export trägt beziehung weiterhin (U2-ADR-022, unberührt von D0)');
});
