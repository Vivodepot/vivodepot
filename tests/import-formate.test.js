'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Format-Import (Import-Welle 1, Klasse-A)
   ────────────────────────────────────────────────────────────────────────
   SYMMETRIE-BEWEIS: pro Format ein Round-Trip — Test-Daten setzen → exportieren
   → in ein FRISCHES Depot importieren → die Sektor-Felder sind feldweise identisch.
   Plus: Vorschau-Plan (neu/gleich/konflikt), NICHT-stilles-Überschreiben (Konflikt
   bleibt, sofern nicht ausdrücklich gewählt), Import-Provenienz-Stempel, Bürger-
   Sprache der Labels. VdCrypto bleibt unberührt (kein Krypto-Pfad angefasst).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}
// Liest die gespeicherten Roh-Werte einer Feldmenge eines Sektors aus `data`.
function felder(V, sektorId, ids) {
  const sd = (V.getData().sektoren[sektorId]) || {};
  const out = {};
  for (const id of ids) out[id] = sd[id];
  return out;
}
// Export-Text eines Format-Builders (Objekt → JSON-Text; String bleibt String).
// 'json' ist U2-ADR-NNN (18.09.2026) NUR NOCH Import (kernAPI.exportiere('json') wirft daher
// "nicht angedockt") — der Round-Trip-Beweis hier gilt trotzdem, über das interne
// Meßinstrument vollExportJSON() direkt, s. auch tests/round-trip-wirkung.test.js.
function exportText(V, formatId, opt) {
  const roh = (formatId === 'json') ? V.vollExportJSON(opt) : V.kernAPI.exportiere(formatId, opt);
  return (typeof roh === 'string') ? roh : JSON.stringify(roh);
}
// Round-Trip-Kern: Felder in A setzen, exportieren, in frisches B importieren, B zurückgeben.
async function roundTrip(setzeA, formatId, exportOpt) {
  const a = await frischMitDepot();
  setzeA(a.V);
  const text = exportText(a.V, formatId, exportOpt);
  const b = await frischMitDepot();
  const ergebnis = b.V.kernAPI.importiere(formatId, text, { alleKonflikte: true });
  return { b, text, ergebnis };
}

/* ── Registry-Symmetrie ─────────────────────────────────────────────────── */

test('1) IMPORT_FORMATE spiegelt EXPORT_FORMATE: jede Export-ID hat eine Import-ID', async () => {
  const { V } = await frischMitDepot();
  for (const ex of V.EXPORT_FORMATE) {
    if (ex.nurExport) continue;   // reine Ausgabe-Formate (FHIR-Laborbericht) haben bewusst KEIN Import-
                                  // Gegenstück (medizinischer Interchange-OUT; die Datenportabilität der
                                  // Laborwerte deckt der JSON-Voll-Export). Symmetrisch zu nurImport.
    assert.ok(V.IMPORT_FORMAT_BY_ID[ex.id], 'Import-Format für Export-ID fehlt: ' + ex.id);
  }
  // und umgekehrt: kein symmetrisches Import-Format ohne Export-Gegenstück.
  // Ausnahme: Welle-2-EINLESE-Standards (nurImport) haben bewusst KEIN Export-Gegenstück
  // (externe Quell-Formate wie Kontoauszug/Meldedaten/Steuerdaten — reiner Einlese-Pfad).
  for (const im of V.IMPORT_FORMATE) {
    if (im.nurImport) continue;
    assert.ok(V.EXPORT_FORMAT_BY_ID[im.id], 'Export-Format für Import-ID fehlt: ' + im.id);
  }
});

test('2) Bürger-Sprache: Import-Labels ohne Format-Abkürzungen', async () => {
  const { V } = await frischMitDepot();
  for (const im of V.IMPORT_FORMATE) {
    assert.ok(!/SD-?JWT|XÖV|FIM|vCard|VCARD|ICS|EDCI|FHIR/.test(im.label), 'Label ohne Kürzel: ' + im.label);
  }
});

test('3) Bereiche zeigen den „Daten einlesen"-Knopf (auch im LEEREN Bereich)', async () => {
  const { V, document } = await frischMitDepot();
  V.betreteApp();
  V.oeffneSektor('finance');   // frisch leer — Import füllt leere Bereiche, daher trotzdem sichtbar
  assert.ok(document.getElementById('content').innerHTML.includes('data-einlesen="finance"'), 'Einlesen-Knopf im leeren Bereich');
});

/* ── Round-Trip pro Format (Symmetrie-Beweis) ────────────────────────────── */

test('4) Round-Trip JSON-Voll-Depot: alle Felder feldweise identisch', async () => {
  /* `allergien` trägt eine `codeListe` und wird als Chip-Array `[{text, code}]`
     gelesen (A44). Ein String hier hätte den Round-Trip über einen Weg geführt,
     den das Produkt nicht geht — Regel 13. Der Vergleich ist darum
     `deepEqual`: bei einem Array prüft `equal` die Referenz und wäre immer rot,
     bei einem Skalar bleibt es dieselbe Aussage. */
  const proben = [
    ['identity', 'givenName', 'Maria'], ['identity', 'familyName', 'Mustermann'],
    ['health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin, Haselnuss' }]],
    ['education', 'schoolLeavingQualification', 'Abitur 1985'],
  ];
  // N4 (09.08.2026): `allergien` ist seit N4 Zug 1 schema-sensibel — Opt-in, die Probe gilt der Feldtreue.
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `bundid_email` ist jetzt Unterfeld der Liste
  // `bundid` (U2-ADR-104 weist den Skalar-Setter für Listenfelder ab) — die JSON-Voll-Export
  // Route dumpt Sektoren roh, ein Listen-Eintrag reist darum unverändert mit durch den Round-Trip.
  const { b } = await roundTrip((V) => {
    for (const [s, f, w] of proben) V.sektorFeldSetzen(s, f, w);
    V.listenEintragHinzufuegen('administration', 'bundid', { system: 'DE', bundidEmailAddress: 'maria@example.de' });
  }, 'json', { sensibel: true });
  for (const [s, f, w] of proben) {
    assert.deepEqual((b.V.getData().sektoren[s] || {})[f], w, 'JSON Round-Trip ' + s + '.' + f);
  }
  const bundid = (b.V.getData().sektoren.administration || {}).bundid || [];
  assert.equal(bundid.length, 1, 'JSON Round-Trip administration.bundid (Liste) — Eintrag verloren');
  assert.equal(bundid[0].bundidEmailAddress, 'maria@example.de', 'JSON Round-Trip administration.bundid/bundidEmailAddress');
});

test('5) Round-Trip JSON: Personen (Register) werden wiederhergestellt', async () => {
  // U2-ADR-022: Kontakte sind kein Sektor-Listenfeld mehr, sondern das EINE Register
  // (data.menschen[]). JSON-Voll-Depot trägt das Register feldweise durch den Round-Trip.
  // „Herausgabe ohne Auswahl" (13.08.2026), Zug 2: vollExportJSON haelt menschen[]
  // ohne Opt-in jetzt zurueck (Befund 2) — Round-Trip-Treue der Feldwerte braucht sensibel:true,
  // wie Probe 4 direkt darueber.
  const { b } = await roundTrip((V) => { V.personHinzufuegen({ name: 'Anna Schmidt', beziehung: 'Schwester', tel: '0151 111' }); }, 'json', { sensibel: true });
  const liste = (b.V.getData().menschen || []).filter(m => m.name === 'Anna Schmidt');
  assert.equal(liste.length, 1);
  assert.equal(liste[0].name, 'Anna Schmidt');
  assert.equal(liste[0].beziehung, 'Schwester');
});

test('6) Round-Trip vCard Identität: Name/Kontakt/Adresse/Geburtsdatum identisch', async () => {
  const ids = ['givenName', 'familyName', 'telephone', 'email', 'streetAddress', 'postcodeCity', 'birthDate'];
  const werte = { givenName: 'Maria', familyName: 'Mustermann', telephone: '0151 12345678',
    email: 'maria@example.de', streetAddress: 'Lindenweg 4', postcodeCity: '80331 München', birthDate: '1980-05-15' };
  const { b } = await roundTrip((V) => { for (const id of ids) V.sektorFeldSetzen('identity', id, werte[id]); }, 'vcard-identitaet');
  assert.deepEqual(felder(b.V, 'identity', ids), werte);
});

test('7) Round-Trip vCard Meine Menschen: Einträge feldweise identisch', async () => {
  // U2-ADR-022: Export/Import laufen über das Register. Beziehung faltet beim Export nach vCard NOTE
  // und beim Import zurück nach `beziehung` (NOTE→rolle→beziehung). Der Sitzungs-Akteur „Tester"
  // wird beim Export NICHT mit-exportiert (Entscheidung A) und bleibt darum hier außen vor.
  const e1 = { name: 'Anna Schmidt', beziehung: 'Schwester', tel: '0151 111', email: 'anna@example.de', adresse: 'Kastanienweg 5, 80331 München' };
  const e2 = { name: 'Ben Klein', beziehung: 'Freund', tel: '0152 222' };
  const { b } = await roundTrip((V) => {
    V.personHinzufuegen(e1);
    V.personHinzufuegen(e2);
  }, 'vcard-menschen');
  const liste = (b.V.getData().menschen || []).filter(m => m.name === 'Anna Schmidt' || m.name === 'Ben Klein');
  assert.equal(liste.length, 2);
  const anna = liste.find(m => m.name === 'Anna Schmidt');
  const ben = liste.find(m => m.name === 'Ben Klein');
  assert.deepEqual({ name: anna.name, beziehung: anna.beziehung, tel: anna.tel, email: anna.email, adresse: anna.adresse }, e1);
  assert.deepEqual({ name: ben.name, beziehung: ben.beziehung, tel: ben.tel }, e2);
});

// C7/U2-ADR-118: „8) Round-Trip ICS" ENTFERNT — `ics-vorsorge` ist reiner Export (nurExport), kein
// Reimport. Ein Kalender ist ein Abkömmling des Depots, keine Quelle. Der ICS-Export-Nachweis steht
// in weitere-formate.test.js (Test 9/9b, aus den Prüfterminen).

test('9) Round-Trip SD-JWT-VC Identität: Claims + Adresse + Nationalität identisch', async () => {
  const ids = ['givenName', 'familyName', 'birthDate', 'birthName', 'birthPlace', 'nationality', 'streetAddress', 'postcodeCity'];
  const werte = { givenName: 'Maria', familyName: 'Mustermann', birthDate: '1980-05-15', birthName: 'Müller',
    birthPlace: 'Augsburg', nationality: 'deutsch', streetAddress: 'Lindenweg 4', postcodeCity: '80331 München' };
  // nationalitaet ist seit Zug 3 (Sensibel-Architektur, 09.08.2026) schema-sensibel — Opt-in.
  const { b } = await roundTrip((V) => { for (const id of ids) V.sektorFeldSetzen('identity', id, werte[id]); }, 'sd-jwt-vc-identitaet', { sensibel: true });
  assert.deepEqual(felder(b.V, 'identity', ids), werte);
});

test('10) Round-Trip SD-JWT-VC Finanzen: inkl. sensibler Claims (mit Zustimmung) identisch', async () => {
  // U2-ADR-074: konto_haupt_bank/-iban entfielen aus dem Finanz-VC (Konten sind Liste, VC ruht).
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `steuerid` ist jetzt ebenfalls eine Liste —
  // dieselbe Begründung, aus den Proben hier entfernt (s. Test 10b für die ehrliche Abwesenheit).
  // Der Round-Trip deckt die verbleibenden gemappten Skalar-Claims ab.
  const ids = ['privatePensionProvision', 'companyPensionSchemeBav'];
  const werte = { privatePensionProvision: 'Allianz', companyPensionSchemeBav: 'Betriebsrente XY' };
  const { b } = await roundTrip((V) => { for (const id of ids) V.sektorFeldSetzen('finance', id, werte[id]); }, 'sd-jwt-vc-finanzen', { sensibel: true });
  assert.deepEqual(felder(b.V, 'finance', ids), werte);
});

// Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): die Zeile `{ feld: 'taxIdsTaxNumbers', ziel: 'tax_id' }`
// in VC_FINANZEN_MAPPING ist ENTFALLEN, nicht auf einen Eintrag geraten (dokumentierter Gap,
// eigener Zug offen, s. Kommentar an der Mapping-Tabelle). Ehrliche Abwesenheit statt Round-Trip.
test('10b) `tax_id` fehlt im SD-JWT-VC-Finanzen-Export — Mapping entfallen, nicht der Round-Trip schuld', async () => {
  const { V } = await frischMitDepot();
  V.listenEintragHinzufuegen('finance', 'taxIdsTaxNumbers', { system: 'DE', taxNumber: '12 345 678 901' });
  const claims = V.sdJwtVcFinanzen({ sensibel: true }).claims;
  assert.equal(claims.tax_id, undefined, 'kein Mapping mehr auf steuerid — Liste statt Skalar');
});

test('11) Round-Trip FHIR-IPS: Patient-Demografie + klinische Felder identisch', async () => {
  const { b } = await roundTrip((V) => {
    V.sektorFeldSetzen('identity', 'givenName', 'Maria');
    V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
    V.sektorFeldSetzen('identity', 'birthDate', '1980-05-15');
    V.sektorFeldSetzen('identity', 'gender', 'w');
    // Chip-Mechanik (E1 Option C): je EIN Chip pro Eintrag, kein Kommasplitten mehr.
    V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }, { text: 'Haselnuss' }]);
    V.sektorFeldSetzen('health', 'medicationOngoing', [{ text: 'Ramipril' }]);
    V.sektorFeldSetzen('health', 'chronicConditionsDiagnoses', [{ text: 'Bluthochdruck' }, { text: 'Diabetes Typ 2' }]);
  // N4 (09.08.2026): die drei Gesundheitsfelder sind seit N4 Zug 1 schema-sensibel — Opt-in.
  }, 'fhir-ips', { sensibel: true });
  assert.deepEqual(felder(b.V, 'identity', ['givenName', 'familyName', 'birthDate', 'gender']),
    { givenName: 'Maria', familyName: 'Mustermann', birthDate: '1980-05-15', gender: 'w' });
  // reference-gleich (andere Object.prototype). Über JSON normalisiert, wie an anderer Stelle
  // im Suite üblich (vgl. qr-kette.test.js).
  assert.deepEqual(JSON.parse(JSON.stringify(felder(b.V, 'health', ['allergiesMedicationFoodOther', 'medicationOngoing', 'chronicConditionsDiagnoses']))), {
    allergiesMedicationFoodOther: [{ text: 'Penicillin' }, { text: 'Haselnuss' }],
    medicationOngoing: [{ text: 'Ramipril' }],
    chronicConditionsDiagnoses: [{ text: 'Bluthochdruck' }, { text: 'Diabetes Typ 2' }],
  });
});

test('12) Round-Trip XÖV-Verwaltung: Datensatz identisch', async () => {
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): bundid_email/bundid_ort sind jetzt Unterfelder
  // der Liste `bundid` — aus den Proben entfernt (s. Test 12b für die ehrliche Abwesenheit).
  // bundid_status bleibt unverändert ein Flachfeld.
  const ids = ['bundidVerificationLevel'];
  const werte = { bundidVerificationLevel: 'hoch' };
  const { b } = await roundTrip((V) => { for (const id of ids) V.sektorFeldSetzen('administration', id, werte[id]); }, 'xoev-verwaltung', { sensibel: true });
  assert.deepEqual(felder(b.V, 'administration', ids), werte);
});

// Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): die Zeilen `{ feld: 'bundid_email', ziel:
// 'bundIdKennung' }`/`{ feld: 'bundid_ort', ziel: 'unterlagenAblage' }` in XOEV_VERWALTUNG_MAPPING
// sind ENTFALLEN, nicht auf einen Eintrag geraten (dokumentierter Gap, eigener Zug offen).
test('12b) `bundIdKennung`/`unterlagenAblage` fehlen im XÖV-Export — Mapping entfallen, nicht der Round-Trip schuld', async () => {
  const { V } = await frischMitDepot();
  V.listenEintragHinzufuegen('administration', 'bundid', { system: 'DE', bundidEmailAddress: 'maria@example.de', bundidDocumentsStorageLocation: 'Ordner' });
  const datensatz = V.xoevVerwaltung({ sensibel: true }).datensatz;
  assert.equal(datensatz.bundIdKennung, undefined, 'kein Mapping mehr auf bundid_email — Liste statt Skalar');
  assert.equal(datensatz.unterlagenAblage, undefined, 'kein Mapping mehr auf bundid_ort — Liste statt Skalar');
});

test('13) Round-Trip FIM-JSON: Stammdaten identisch', async () => {
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): bundid_email/bundid_ort — dieselbe Begründung
  // wie bei Test 12 (FIM teilt XOEV_VERWALTUNG_MAPPING). bundid_status bleibt unverändert.
  const ids = ['bundidVerificationLevel'];
  const werte = { bundidVerificationLevel: 'substanziell' };
  const { b } = await roundTrip((V) => { for (const id of ids) V.sektorFeldSetzen('administration', id, werte[id]); }, 'fim-json', { sensibel: true });
  assert.deepEqual(felder(b.V, 'administration', ids), werte);
});

// s. Test 12b (FIM teilt XOEV_VERWALTUNG_MAPPING mit XÖV-Verwaltung).
test('13b) `bundIdKennung`/`unterlagenAblage` fehlen im FIM-Export — Mapping entfallen, nicht der Round-Trip schuld', async () => {
  const { V } = await frischMitDepot();
  V.listenEintragHinzufuegen('administration', 'bundid', { system: 'DE', bundidEmailAddress: 'hans@example.de', bundidDocumentsStorageLocation: 'Schreibtisch' });
  const stammdaten = V.fimVerwaltung({ sensibel: true }).stammdaten;
  assert.equal(stammdaten.bundIdKennung, undefined, 'kein Mapping mehr auf bundid_email — Liste statt Skalar');
  assert.equal(stammdaten.unterlagenAblage, undefined, 'kein Mapping mehr auf bundid_ort — Liste statt Skalar');
});

test('14) Round-Trip EDCI-Bildung: Textfelder identisch (ref-Felder ausgenommen)', async () => {
  const ids = ['schoolLeavingQualification', 'school', 'vocationalTraining', 'universityDegreeType', 'occupationRole', 'qualifications', 'volunteerWork'];
  const werte = { schoolLeavingQualification: 'Abitur 1985', school: 'Maximiliansgymnasium', vocationalTraining: 'Bankkauffrau',
    universityDegreeType: 'Diplom-Volkswirtin', occupationRole: 'Volkswirtin', qualifications: 'Bilanzbuchhalterin', volunteerWork: 'Tafel München' };
  // ehrenamt ist seit Zug 3 (Sensibel-Architektur, 09.08.2026) schema-sensibel (Grenzfall) — Opt-in.
  const { b } = await roundTrip((V) => { for (const id of ids) V.sektorFeldSetzen('education', id, werte[id]); }, 'edci-bildung', { sensibel: true });
  assert.deepEqual(felder(b.V, 'education', ids), werte);
});

/* ── Vorschau-Plan: neu / gleich / konflikt ──────────────────────────────── */

test('15) Plan stuft leeres Zielfeld als „neu" ein', async () => {
  const a = await frischMitDepot();
  a.V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  const text = exportText(a.V, 'vcard-identitaet');
  const b = await frischMitDepot();
  const plan = b.V.kernAPI.importVorschau('vcard-identitaet', text);
  const vorname = plan.zeilen.find(z => z.feldId === 'givenName');
  assert.ok(vorname && vorname.status === 'neu', 'leeres Feld → neu');
  assert.equal(vorname.neuText, 'Maria');
});

test('16) Plan stuft identischen Wert als „gleich" ein (kein Rauschen)', async () => {
  const a = await frischMitDepot();
  a.V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  const text = exportText(a.V, 'vcard-identitaet');
  const plan = a.V.kernAPI.importVorschau('vcard-identitaet', text);   // dasselbe Depot
  const vorname = plan.zeilen.find(z => z.feldId === 'givenName');
  assert.ok(vorname && vorname.status === 'gleich', 'identisch → gleich');
});

test('17) NICHT still überschreiben: belegtes Feld mit abweichendem Wert ist Konflikt', async () => {
  const a = await frischMitDepot();
  a.V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  const text = exportText(a.V, 'vcard-identitaet');
  const b = await frischMitDepot();
  b.V.sektorFeldSetzen('identity', 'givenName', 'Bestehend');   // Zielfeld bereits belegt
  const plan = b.V.kernAPI.importVorschau('vcard-identitaet', text);
  const vorname = plan.zeilen.find(z => z.feldId === 'givenName');
  assert.equal(vorname.status, 'konflikt');
  assert.equal(vorname.altText, 'Bestehend');
  assert.equal(vorname.neuText, 'Maria');
  // Anwenden OHNE Auswahl: Konflikt bleibt, Wert NICHT überschrieben
  const r1 = b.V.importAnwenden(plan, {});
  assert.equal((b.V.getData().sektoren.identity || {}).givenName, 'Bestehend', 'still NICHT überschrieben');
  assert.equal(r1.konflikteOffen, 1);
  // Anwenden MIT Auswahl: jetzt überschrieben
  b.V.importAnwenden(plan, { auswahl: ['identity/givenName'] });
  assert.equal((b.V.getData().sektoren.identity || {}).givenName, 'Maria', 'mit Wahl überschrieben');
});

test('18) Leere Felder füllen, ohne belegte anzutasten (Merge)', async () => {
  const a = await frischMitDepot();
  a.V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  a.V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  const text = exportText(a.V, 'vcard-identitaet');
  const b = await frischMitDepot();
  b.V.sektorFeldSetzen('identity', 'familyName', 'Bestehend');   // belegt, soll bleiben
  const plan = b.V.kernAPI.importVorschau('vcard-identitaet', text);
  b.V.importAnwenden(plan, {});   // ohne Konflikt-Auswahl
  assert.equal((b.V.getData().sektoren.identity || {}).givenName, 'Maria', 'leeres gefüllt');
  assert.equal((b.V.getData().sektoren.identity || {}).familyName, 'Bestehend', 'belegtes unangetastet');
});

/* ── Import-Provenienz ───────────────────────────────────────────────────── */

test('19) Importierte Einträge tragen den Provenienz-Stempel eingabeArt=import + Quelle', async () => {
  const a = await frischMitDepot();
  a.V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  const text = exportText(a.V, 'vcard-identitaet');
  const b = await frischMitDepot();
  b.V.kernAPI.importiere('vcard-identitaet', text, { alleKonflikte: true });
  const kette = b.V.liesUrheberschaft('identity', 'givenName');
  const letzter = kette[kette.length - 1];
  assert.equal(letzter.eingabeArt, 'import', 'Stempel als Import gekennzeichnet');
  assert.ok(letzter.quelle && /Kontakt/.test(letzter.quelle), 'Quelle (Bürger-Label) am Stempel');
});

test('20) Manuelle Eingabe trägt KEINEN Import-Marker (Standard unverändert)', async () => {
  const a = await frischMitDepot();
  a.V.sektorFeldSetzen('identity', 'givenName', 'Maria');   // manuell
  const kette = a.V.liesUrheberschaft('identity', 'givenName');
  assert.ok(kette.length >= 1);
  assert.equal(kette[kette.length - 1].eingabeArt, undefined, 'manuell → kein Import-Marker');
});

test('21) Listen-Import stempelt ebenfalls als Import', async () => {
  // U2-ADR-022: Kontakte wandern beim Import ins Register (data.menschen[]) — die Person trägt ihre
  // eigene Provenienz, der Listen-Stempel-Pfad entfällt dort. Bewiesen wird das Listen-Stempeln
  // weiter über ein echtes gestempeltes Sektor-Listenfeld: `unterhalt` bleibt eine Liste.
  const b16 = JSON.stringify({ unterhalt_liste: [{ person: 'Lukas Beispiel', art: 'Kindesunterhalt', betrag: '300' }] });
  const b = await frischMitDepot();
  b.V.kernAPI.importiere('vivodepot-beta', b16, { alleKonflikte: true });
  const kette = b.V.liesUrheberschaft('people', 'maintenanceObligationsAnd');
  assert.ok(kette.length, 'Unterhalt-Liste importiert');
  assert.ok(kette.some(e => e.eingabeArt === 'import'), 'Listen-Import gestempelt');
});

/* ── Robustheit / Read-only-Disziplin ────────────────────────────────────── */

test('22) Ungültige Datei → ungueltig-Plan, kein Wurf, keine Mutation', async () => {
  const { V } = await frischMitDepot();
  const vorher = JSON.stringify(V.getData());
  const plan = V.kernAPI.importVorschau('json', 'das ist kein json {{{');
  assert.equal(plan.ungueltig, true);
  const r = V.importAnwenden(plan, { alleKonflikte: true });
  assert.equal(r.gesetzt, 0);
  assert.equal(JSON.stringify(V.getData()), vorher, 'keine Mutation bei ungültiger Datei');
});

test('23) Parser mutieren `data` nicht (reine Lese-/Parse-Schicht)', async () => {
  const a = await frischMitDepot();
  a.V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  const text = exportText(a.V, 'vcard-identitaet');
  const vorher = JSON.stringify(a.V.getData());
  a.V.parseVCards(text);
  a.V.kernAPI.importVorschau('vcard-identitaet', text);   // nur Vorschau, kein Anwenden
  assert.equal(JSON.stringify(a.V.getData()), vorher, 'Parsen/Vorschau ohne Mutation');
});

test('24) VdCrypto-Block bleibt unberührt (Hash byte-identisch)', async () => {
  const { extrahiereScripts, kryptoBlock, sha256, BLOCK_HASH_ERWARTET } = require('./load-kern.js');
  const fs = require('node:fs');
  const html = fs.readFileSync(require('./load-kern.js').HTML_PATH, 'utf8');
  const { script1 } = extrahiereScripts(html);
  assert.equal(sha256(kryptoBlock(script1)), BLOCK_HASH_ERWARTET, 'Krypto-Block-Hash unverändert');
});
