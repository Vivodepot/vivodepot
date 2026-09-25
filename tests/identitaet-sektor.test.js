'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Sektor 1: Identität & Person (Spec 30.05.)
   ────────────────────────────────────────────────────────────────────────
   Sektor-Definition als reine Daten gegen die Maschine. Quelle: docs/spec/
   vivodepot-elf-bereiche-definition-2026-05-29.md (Bereich 1).

   Belegt:
     1) Sektor-Metadaten (id, label, format, icon, einfuehrungstext) und zwei
        Sektionen (Person, Haustiere).
     2) Person-Kern enthält die Spec-Kern-Felder (vorname … ausweis_nr) plus
        profilfoto (ref:mappe-Deckblatt, U2-ADR-013 Schritt 6, frisch — keine
        Migration); notizen_start ist Modul-Feld.
     3) Auswahl-Felder geschlecht (4 Optionen) und familienstand (6 Optionen)
        tragen die Spec-Werte; hints an geburtsname und familienstand.
     4) Haustiere-Sektion mit fünf Text-Feldern und Abschnitts-Hint.
     5) Werte setzen läuft sauber durch sektorFeldSetzen — gestempelt
        (U2-ADR-005), Code-Slot angelegt (U2-ADR-006).
     6) Render: Einführungstext + Pausen-Zeile sichtbar; keine ToC (2 Sektionen).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'anker-pw-identitaet';

const KERN_FELDER = [
  'givenName', 'familyName', 'secondLastName',   // A460 (22.08.2026): zweiter Nachname, eigener Ort statt geburtsname
  'displayFamilyNameFirst',   // U2-ADR-256 (04.09.2026): Anzeige-Reihenfolge als eigenes Feld
  'birthDate', 'yearOfBirthIfTheExactDayIs',   // A461 (22.08.2026): Rückfall, wenn der Tag unbekannt ist
  'telephone', 'streetAddress', 'postcodeCity',
  'email', 'nationality', 'birthName', 'birthPlace', 'gender',
  'maritalStatus', 'maritalPropertyRegime',
  'dateOfSeparation',   // Auftragskette 14.08.2026, Glied 3 (Trennung/Scheidung)
  // CW-9 (24.08.2026): Namenswahl-nach-der-Heirat rückt direkt neben den Familienstand-
  // Block (vorher durch Ausweis/Aufenthaltstitel getrennt) — kein ebene:'modul' mehr, CW-8 gibt
  // ihr stattdessen sichtbarWenn(familienstand: verh/elp).
  'choiceOfNameAfterMarriage', 'choiceOfNameAfterMarriage2',
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `ausweis_nr`/_ausgestellt/_gueltig sind zur
  // Liste `ausweis` geworden (mehrwertig); `aufenthaltstitel_nr`/_ausgestellt/_gueltig/_behoerde/
  // _aktenzeichen ebenso zur Liste `aufenthaltstitel` — nur `aufenthaltstitel_art` bleibt Flachfeld
  // (Korb 2, unverändert). K2/Phase 6: gueterstand jetzt sichtbares Grundfeld, direkt hinter familienstand.
  'idDocuments',
  'residencePermitType', 'residencePermit',   // „Aufenthaltstitel" (11.08.2026)
  'profilePhotoCoverPage',   // U2-ADR-013 Schritt 6: frisches ref:mappe-Deckblatt-Feld (kein Migrations-Umzug)
];
// U2-ADR-073 (Phase 4, Teil 1): Haustiere ist jetzt EINE Liste — die fünf Angaben sind Unterfelder.
const HAUSTIERE_UNTERFELDER = [
  'petNameSpecies', 'emergencyCarePersonContact', 'vetNameContact', 'medication', 'otherNotes',
];

test('1) Sektor-Metadaten und drei Sektionen', () => {
  const { V } = ladeKern();
  const s = V.SEKTOR_BY_ID.identity;
  assert.ok(s, 'identitaet existiert in SEKTOREN');
  assert.equal(s.label, 'Identität & Person');
  assert.equal(s.format, V.SEKTOR_FORMATE.SD_JWT_VC);
  assert.equal(s.icon, 'user');
  assert.equal(s.einfuehrungstext, 'Name, Foto, Kontakt — das Deckblatt Ihres Depots.');
  // genau drei Sektionen, in Spec-Reihenfolge — „Frühere Namen" (11.08.2026)
  // fügt die dritte ein (zwischen person und pets).
  assert.equal(s.sektionen.length, 3);
  assert.equal(s.sektionen[0].id, 'person');
  assert.equal(s.sektionen[1].id, 'fruehere-namen');
  assert.equal(s.sektionen[2].id, 'pets');
});

test('2) Person: Kern-Felder inkl. profilfoto (ref:mappe, U2-ADR-013 Schritt 6); notizen_start als Modul', () => {
  const { V } = ladeKern();
  const person = V.SEKTOR_BY_ID.identity.sektionen[0];
  // Alle Kern-Felder in Spec-Reihenfolge — jetzt mit profilfoto als Deckblatt am Ende.
  const kernIds = person.felder.filter(f => (f.ebene || 'kern') === 'kern').map(f => f.id);
  assert.equal(kernIds.join(','), KERN_FELDER.join(','), 'Kern-Felder genau wie Spec (inkl. profilfoto)');
  // Modul-Felder der Person-Sektion. Phase 6 (K4): gueterstand ist jetzt sichtbares Grundfeld (ebene:'modul'
  // gestrichen, direkt hinter familienstand) — NICHT mehr Modul. CW-9 (24.08.2026): heirat_namenswahl(_frueher)
  // ebenso zum Grundfeld geworden (jetzt neben familienstand, sichtbarWenn statt ebene:'modul'). Rest:
  // notizen_start + verbleibende Welle-3-Wizard-Felder (heirwiz: steuerklasse; umzwiz: umzug_ummeldung).
  const modulIds = person.felder.filter(f => f.ebene === 'modul').map(f => f.id);
  assert.equal(modulIds.join(','), 'furtherDetails,taxClass,taxClassEarlierEntry,reRegistrationWithTheResidents',
    'notizen_start + verbleibende Welle-3-Wizard-Felder als Modul (gueterstand + heirat_namenswahl(_frueher) sind jetzt Grundfelder)');
  // profilfoto ist ein ref:mappe-Feld (frisch gebaut mit der Mappe, keine Migration).
  const pf = person.felder.find(f => f.id === 'profilePhotoCoverPage');
  assert.ok(pf && pf.typ === 'ref' && pf.entitaet === 'mappe', 'profilfoto ist ref:mappe');
});

test('3) geschlecht: vier Optionen mit Spec-Labels', () => {
  const { V } = ladeKern();
  const geschlecht = V.SEKTOR_BY_ID.identity.sektionen[0].felder.find(f => f.id === 'gender');
  assert.equal(geschlecht.typ, 'auswahl');
  const labels = geschlecht.optionen.map(o => o.label).join(',');
  assert.equal(labels, 'männlich,weiblich,divers,keine Angabe', 'Spec-Labels in Reihenfolge');
  assert.equal(geschlecht.optionen.length, 4);
});

test('3) familienstand: sechs Optionen + Hint', () => {
  const { V } = ladeKern();
  const fs = V.SEKTOR_BY_ID.identity.sektionen[0].felder.find(f => f.id === 'maritalStatus');
  assert.equal(fs.typ, 'auswahl');
  assert.equal(fs.optionen.length, 6);
  const labels = fs.optionen.map(o => o.label).join(',');
  assert.equal(labels,
    'ledig,verheiratet,eingetragene Lebenspartnerschaft,getrennt lebend,geschieden,verwitwet',
    'Spec-Labels in Reihenfolge');
  assert.equal(fs.hint, 'Bestimmt die gesetzliche Erbfolge.');
});

test('3) geburtsname: Hint vorhanden', () => {
  const { V } = ladeKern();
  const f = V.SEKTOR_BY_ID.identity.sektionen[0].felder.find(x => x.id === 'birthName');
  // „Frühere Namen" (11.08.2026): der alte Hint „z. B. Name vor der Heirat" hat das
  // Feld zweckentfremdet — jetzt verweist er auf die neue Liste statt selbst jede Namensänderung
  // aufzunehmen.
  assert.ok(f.hint && f.hint.includes('Frühere Namen'), 'geburtsname-Hint verweist auf die neue Liste');
});

test('3) Beispiele als placeholder: vorname/nachname/telefon/strasse tragen das Beispiel', () => {
  const { V } = ladeKern();
  const felder = V.SEKTOR_BY_ID.identity.sektionen[0].felder;
  const beispielVon = (id) => (felder.find(f => f.id === id) || {}).beispiel;
  assert.equal(beispielVon('givenName'),       'Maria');
  assert.equal(beispielVon('familyName'),      'Mustermann');
  assert.equal(beispielVon('telephone'),       '0151 12345678');
  assert.equal(beispielVon('streetAddress'),       'Lindenweg 4');
  assert.equal(beispielVon('postcodeCity'),       '80331 München');
  assert.equal(beispielVon('email'),         'maria.mustermann@example.de');
  assert.equal(beispielVon('nationality'), 'deutsch');
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `ausweis_nr` ist Unterfeld `documentNumber` der Liste
  // `idDocuments` geworden — das Beispiel sitzt jetzt am Unterfeld, nicht mehr am Top-Level-Feld.
  const ausweis = felder.find(f => f.id === 'idDocuments');
  const nr = (ausweis.unterFelder || []).find(u => u.id === 'documentNumber');
  assert.equal(nr.beispiel, 'T012345678');
});

test('3) feldInputHTML rendert das Beispiel als placeholder-Attribut', () => {
  const { V } = ladeKern();
  const f = { id: 'x', label: 'X', typ: 'text', beispiel: 'Maria' };
  const html = V.feldInputHTML(f, '');
  assert.match(html, /placeholder="Maria"/, 'placeholder gerendert');
  // Felder ohne beispiel zeigen keinen placeholder-Anteil
  const ohne = V.feldInputHTML({ id: 'y', label: 'Y', typ: 'text' }, '');
  assert.equal(/placeholder=/.test(ohne), false, 'ohne beispiel: kein placeholder');
});

test('1c) feldInputHTML: eingabeTyp rendert type="email"/"tel"; inputmode als reiner Hinweis (kein Pattern)', () => {
  const { V } = ladeKern();
  // E-Mail- und Telefon-Annotation steuern NUR den nativen Eingabe-Typ (Soft-Keyboard mobil).
  const mail = V.feldInputHTML({ id: 'e', typ: 'text', eingabeTyp: 'email' }, 'a@b.example.de');
  assert.match(mail, /type="email"/, 'eingabeTyp email → type="email"');
  assert.match(mail, /data-typ="text"/, 'data-typ bleibt text (Speicher-Pfad unverändert)');
  const tel = V.feldInputHTML({ id: 't', typ: 'text', eingabeTyp: 'tel' }, '0151');
  assert.match(tel, /type="tel"/, 'eingabeTyp tel → type="tel"');
  // inputmode ist ein Tastatur-Hinweis ohne Validierung; Bestandswert mit Einheit/Tausenderpunkt bleibt erhalten.
  const geld = V.feldInputHTML({ id: 'g', typ: 'text', inputmode: 'decimal' }, '5.200 EUR');
  assert.match(geld, /inputmode="decimal"/, 'inputmode decimal gerendert');
  assert.match(geld, /type="text"/, 'Geldfeld bleibt type="text"');
  assert.match(geld, /value="5.200 EUR"/, 'Bestandswert bleibt unverändert (kein number-Leeren)');
  assert.equal(/pattern=/.test(geld), false, 'kein Pattern-Attribut');
  const jahr = V.feldInputHTML({ id: 'j', typ: 'text', inputmode: 'numeric' }, '1995');
  assert.match(jahr, /inputmode="numeric"/, 'inputmode numeric gerendert');
});

test('1c) Identität: telefon trägt eingabeTyp "tel", email trägt eingabeTyp "email"', () => {
  const { V } = ladeKern();
  const felder = V.SEKTOR_BY_ID.identity.sektionen[0].felder;
  const tel = felder.find(f => f.id === 'telephone');
  const mail = felder.find(f => f.id === 'email');
  assert.equal(tel.eingabeTyp, 'tel', 'telefon → tel');
  assert.equal(mail.eingabeTyp, 'email', 'email → email');
  // plz_ort bleibt bewusst text ohne inputmode (kombiniert PLZ & Ort, enthält Buchstaben).
  const plz = felder.find(f => f.id === 'postcodeCity');
  assert.equal(plz.eingabeTyp, undefined, 'plz_ort ohne nativen Typ');
  assert.equal(plz.inputmode, undefined, 'plz_ort ohne inputmode (enthält Ortsnamen)');
});

test('4) Haustiere: EINE Liste mit fünf Unterfeldern + Abschnitts-Hint (U2-ADR-073)', () => {
  const { V } = ladeKern();
  const ht = V.SEKTOR_BY_ID.identity.sektionen[2];
  assert.equal(ht.label, 'Haustiere');
  assert.equal(ht.hint, 'Wenn Sie plötzlich ins Krankenhaus müssen oder nicht mehr nach Hause kommen — wer kümmert sich um Ihr Tier?');
  // Genau EIN Feld: die haustiere-Liste (mehrere Tiere).
  assert.equal(ht.felder.length, 1);
  const liste = ht.felder[0];
  assert.equal(liste.id, 'pets');
  assert.equal(liste.typ, 'liste');
  const ids = (liste.unterFelder || []).map(f => f.id);
  assert.equal(ids.join(','), HAUSTIERE_UNTERFELDER.join(','), 'Haustier-Unterfelder genau wie Spec');
  // E2 D1 (15.07.2026): betreuung/tierarzt sind jetzt ref-Widget (Weiche B), kein Freitext mehr.
  const nachTyp = Object.fromEntries((liste.unterFelder || []).map(f => [f.id, f.typ]));
  assert.equal(nachTyp.petNameSpecies, 'text');
  assert.equal(nachTyp.emergencyCarePersonContact, 'ref', 'betreuung ist jetzt ref:person (D1)');
  assert.equal(nachTyp.vetNameContact, 'ref', 'tierarzt ist jetzt ref:person (D1)');
  assert.equal(nachTyp.medication, 'text');
  assert.equal(nachTyp.otherNotes, 'text');
});

test('5) Werte setzen läuft durch sektorFeldSetzen — Stempel und Code-Slot', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const akteur = V.akteurSelbstErklaeren('Maria Beispiel');

  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Beispiel');
  V.sektorFeldSetzen('identity', 'gender', 'w');
  V.sektorFeldSetzen('identity', 'maritalStatus', 'verh');

  const d = V.getData().sektoren.identity;
  assert.equal(d.givenName, 'Maria');
  assert.equal(d.familyName, 'Beispiel');
  assert.equal(d.gender, 'w');
  assert.equal(d.maritalStatus, 'verh');
  // Stempel pro Feld
  assert.equal(V.liesUrheberschaft('identity', 'givenName').length, 1);
  assert.equal(V.liesUrheberschaft('identity', 'givenName')[0].akteur, akteur.personId);
  // Code-Slot leer (null) — Andockpunkt für späteres Template
  assert.equal(V.liesCode('identity', 'givenName'), null);
});

test('6) Render: Einführungstext + Pausen-Zeile; ToC ab drei Sektionen (seit „Frühere Namen", 11.08.2026)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderSektor('identity');
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /Name, Foto, Kontakt — das Deckblatt Ihres Depots\./, 'Einführungstext');
  assert.ok(html.includes('<p class="pause-erlaubnis">' + V.STRINGS.pausenErlaubnis + '</p>'), 'Pausen-Zeile');
  assert.ok(html.includes(V.STRINGS.tocTitel), 'ToC ab drei Sektionen (person/fruehere-namen/haustiere)');
  // Alle drei Sektion-Labels und ausgewählte Feld-Labels sichtbar
  assert.ok(html.includes('Person'));
  assert.ok(html.includes('Frühere Namen'));
  assert.ok(html.includes('Haustiere'));
  assert.ok(html.includes('Vorname'));
  assert.match(html, />Tiere</, 'Haustier-Liste-Feld „Tiere" gerendert (U2-ADR-073; Sub-Labels wie Tierarzt jetzt im Eintrags-Modal)');
  // Statuskarten (Task B.1, 26.08.2026): `person` rendert nicht mehr flach/mehr-Block, sondern als
  // fünf Cluster-Karten (SEKTION_STATUSKARTEN_CLUSTER). Modul-Feld notizen_start ("Weitere Angaben")
  // steckt jetzt in der Karte „Frühere Namen" statt im mehr-Block.
  const kartenBloecke = html.split('<details class="feldgruppen-karte"');
  assert.equal(kartenBloecke.length - 1, 5, 'fünf Statuskarten für person');
  // Der Karten-TITEL (feldgruppen-karte-titel), nicht bloß irgendein Vorkommen des Textes —
  // "Frühere Namen" steht zusätzlich als ToC-Link (nav.toc) VOR der ersten Karte und träfe sonst dort.
  const fruehereNamenKarte = kartenBloecke.find(b => b.includes('feldgruppen-karte-titel">Frühere Namen<'));
  assert.ok(fruehereNamenKarte && fruehereNamenKarte.includes('Weitere Angaben'),
    'notizen_start ("Weitere Angaben") steckt in der Karte „Frühere Namen"');
});

test('7) Deckblatt: Foto-Platzhalter + Name oben; profilfoto nicht doppelt als Feld-Zeile', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.renderSektor('identity');
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('class="deckblatt"'), 'Deckblatt-Block oben');
  assert.ok(html.includes('deckblatt-platzhalter'), 'Foto-Platzhalter, solange kein Foto gesetzt');
  assert.ok(html.includes('id="deckblatt-foto"'), 'Foto klickbar (Upload)');
  assert.ok(html.includes('Maria Mustermann'), 'Name im Deckblatt');
  // Das Foto-Feld erscheint NICHT mehr als gewöhnliche Zeile (es ist das Deckblatt).
  assert.ok(!html.includes('Profilfoto (Deckblatt)'), 'profilfoto nicht doppelt als Feld-Zeile');
  // Deklaration trägt das Deckblatt data-driven.
  const s = V.SEKTOR_BY_ID.identity;
  assert.equal(s.deckblatt.fotoFeld, 'profilePhotoCoverPage');
  assert.equal(s.deckblatt.nameFelder.join(','), 'givenName,familyName,secondLastName');   // A460 (22.08.2026)
});
