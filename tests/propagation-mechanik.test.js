'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Propagations-Mechanik (U2-ADR-008; Schritt 1: Mechanik)
   ────────────────────────────────────────────────────────────────────────
   Wiederverwendbare Entitäten (Personen, Institutionen) leben in zentralen
   Speichern. Felder, die solche Entitäten bezeichnen, tragen Referenzen
   `{ref, override}`. Lookup beim Render liefert den aktuellen Eintrag — ändert
   sich der Eintrag, wirkt das in jedem Feld, das auf ihn verweist (Propagation).
   `override` (String) gewinnt vor Lookup. Cross-Sektor-Sichtbarkeit ist eine
   deklarative Tabelle (zunächst LEER); der Render-Pfad existiert.

   Sektor-frei geprüft. Die Mechanik darf keinen konkreten Sektor-Feldnamen kennen.

   Geprüfte Invarianten:
     1) Person in ZWEI Refs → derselbe Name (Propagation via Lookup),
     2) Name-Änderung propagiert in alle Refs,
     3) Telefon-Änderung propagiert ans Datenobjekt (alle Lookups sehen den neuen Wert),
     4) Override (String) gewinnt vor Lookup,
     5) Vorschlag nach Rolle gefiltert; ohne Filter alle,
     6) Institution analog (Render-Helper + Vorschlag nach Art),
     7) Cross-Sektor-Tabelle leer → keine Fremd-Felder im Render-Pfad,
     8) Adressen leben als String-Feld auf Person/Institution (kein eigener Speicher),
     9) Urheberschaft intakt: sektorFeldSetzen funktioniert weiter ohne Sektor-Name im Code.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'anker-pw-propagation';
const STUB_SEKTOR = 'test_sektor';
const STUB_FELD_A = 'test_feld_a';
const STUB_FELD_B = 'test_feld_b';

test('1) Person in zwei Refs → derselbe Name (Propagation via Lookup)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.personHinzufuegen({ name: 'Dr. Sommer', tel: '0123-456' });

  const refA = { ref: id, override: '' };
  const refB = { ref: id, override: '' };
  assert.equal(V.personName(refA), 'Dr. Sommer', 'Ref A liefert den Namen');
  assert.equal(V.personName(refB), 'Dr. Sommer', 'Ref B liefert denselben Namen');
});

test('2) Name-Änderung propagiert: ein Update sieht sich in beiden Refs', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.personHinzufuegen({ name: 'Dr. Sommer' });
  const refA = { ref: id, override: '' };
  const refB = { ref: id, override: '' };
  assert.equal(V.personName(refA), 'Dr. Sommer');
  assert.equal(V.personName(refB), 'Dr. Sommer');

  V.personAktualisieren(id, { name: 'Dr. Sommer-Müller' });
  assert.equal(V.personName(refA), 'Dr. Sommer-Müller', 'Ref A sieht neuen Namen');
  assert.equal(V.personName(refB), 'Dr. Sommer-Müller', 'Ref B sieht neuen Namen — Propagation');
});

test('3) Telefon-Änderung propagiert ans Datenobjekt (alle Lookups sehen den neuen Wert)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.personHinzufuegen({ name: 'Dr. Sommer', tel: '0123-456' });

  V.personAktualisieren(id, { tel: '0987-654' });
  const eintrag = V.getData().menschen.find(p => p.id === id);
  assert.equal(eintrag.tel, '0987-654', 'tel aktualisiert am Datenobjekt');
  // Alle Refs auf diese ID sehen den aktualisierten Datensatz (Propagation am Speicher,
  // nicht an einzelnen Refs).
  const lookup = V.personenVorschlag().find(p => p.id === id);
  assert.equal(lookup.name, 'Dr. Sommer', 'Lookup-Name unverändert');
});

test('4) Override (String) gewinnt vor Lookup', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.personHinzufuegen({ name: 'Dr. Sommer' });
  assert.equal(V.personName({ ref: id, override: 'Manuell anders' }), 'Manuell anders',
    'Override-String hat Vorrang');
  assert.equal(V.personName({ ref: id, override: '' }), 'Dr. Sommer',
    'Leerer Override fällt auf Lookup zurück');
  assert.equal(V.personName({ ref: 'unbekannt', override: 'Notfall-Name' }), 'Notfall-Name',
    'Override gewinnt auch bei unbekanntem Ref');
});

test('5) A1 (U2-ADR-021): personenVorschlag liefert IMMER alle Personen (kein Rollen-Silo)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.personHinzufuegen({ name: 'Dr. Sommer' });
  V.personHinzufuegen({ name: 'Dr. Winter' });
  V.personHinzufuegen({ name: 'Notar Müller' });
  V.personHinzufuegen({ name: 'Anonym' });

  // Register ist rollenlos: kein Eintrag trägt eine `rolle` (auch nicht, wenn eine übergeben würde).
  for (const m of V.getData().menschen) assert.ok(!('rolle' in m), 'kein rolle-Feld am Register-Eintrag: ' + m.name);

  // Ohne Argument: alle vier.
  const alle = V.personenVorschlag();
  assert.equal(alle.length, 4, 'alle vier Personen vorgeschlagen');
  assert.equal(alle.map(p => p.name).sort().join(','), 'Anonym,Dr. Sommer,Dr. Winter,Notar Müller');

  // Mit (jetzt ignoriertem) Rollen-Argument: weiterhin alle vier — der frühere Silo-Filter ist weg.
  const mitArg = V.personenVorschlag(V.PERSON_ROLLEN.ARZT);
  assert.equal(mitArg.length, 4, 'Rollen-Argument wird ignoriert — weiterhin alle vier');
});

test('6) Institution analog: Hinzufügen, Anzeige mit Override, Vorschlag nach Art', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.institutionHinzufuegen({ name: 'AOK Bayern', art: V.INSTITUTION_ART.KRANKENKASSE, tel: '089-111' });
  V.institutionHinzufuegen({ name: 'BKK Mobil', art: V.INSTITUTION_ART.KRANKENKASSE });
  V.institutionHinzufuegen({ name: 'Sparkasse', art: V.INSTITUTION_ART.BANK });

  // Lookup + Override
  assert.equal(V.institutionName({ ref: id, override: '' }), 'AOK Bayern');
  assert.equal(V.institutionName({ ref: id, override: 'Manuell' }), 'Manuell');
  // Vorschlag gefiltert
  const kassen = V.institutionenVorschlag(V.INSTITUTION_ART.KRANKENKASSE);
  assert.equal(kassen.length, 2, 'zwei Krankenkassen');
  // entitaetAnzeige-Dispatcher
  assert.equal(V.entitaetAnzeige({ ref: id, override: '' }, 'institution'), 'AOK Bayern');
});

test('7) Cross-Sektor-Tabelle: kein Block bei Ziel ohne deklarierte Refs', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  // Tabelle ist veränderlich und enthält initial die Spec-Cross-Refs.
  // Einzelne Einträge sind eingefroren (s. propagation Test „Befüllbar").
  assert.ok(Array.isArray(V.CROSS_SEKTOR_FELDER), 'CROSS_SEKTOR_FELDER existiert');
  // Identität ist KEIN Cross-Ref-Ziel → kein Cross-Sektor-Block im Render.
  const hatRefsFuerIdentitaet = V.CROSS_SEKTOR_FELDER.some(e => e.ziel === 'identitaet');
  assert.equal(hatRefsFuerIdentitaet, false, 'identitaet ist kein Cross-Ref-Ziel');
  V.renderSektor('identity');
  const html = document.getElementById('content').innerHTML;
  assert.equal(html.includes(V.STRINGS.crossSektorTitel), false,
    'kein Cross-Sektor-Block für Sektor ohne deklarierte Refs');
});

test('8) Adressen leben als String-Feld auf Person/Institution (kein eigener data.adressen[]-Speicher)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.personHinzufuegen({ name: 'Dr. Sommer', adresse: 'Hauptstr. 1, 80331 München' });
  const p = V.getData().menschen.find(m => m.id === id);
  assert.equal(p.adresse, 'Hauptstr. 1, 80331 München', 'Adresse am Person-Eintrag');
  assert.equal(typeof p.adresse, 'string', 'Adresse ist String, kein Verweis');
  assert.equal('adressen' in V.getData(), false, 'kein separater data.adressen[]-Speicher');
});

test('9) Urheberschaft intakt: sektorFeldSetzen funktioniert weiter ohne Sektor-Name im Code', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const akteur = V.akteurSelbstErklaeren('Inhaberin');
  V.sektorFeldSetzen(STUB_SEKTOR, STUB_FELD_A, 'wert-a');
  V.sektorFeldSetzen(STUB_SEKTOR, STUB_FELD_B, 'wert-b');

  // Beide Felder gestempelt, beide Code-Slots angelegt.
  assert.equal(V.liesUrheberschaft(STUB_SEKTOR, STUB_FELD_A).length, 1);
  assert.equal(V.liesUrheberschaft(STUB_SEKTOR, STUB_FELD_B).length, 1);
  assert.equal(V.liesCode(STUB_SEKTOR, STUB_FELD_A), null);
  assert.equal(V.liesCode(STUB_SEKTOR, STUB_FELD_B), null);
  // Akteur-Bezug konsistent mit data.menschen[]
  const k = V.liesUrheberschaft(STUB_SEKTOR, STUB_FELD_A)[0];
  assert.equal(k.akteur, akteur.personId);
  assert.equal(V.akteurName(k.akteur), 'Inhaberin');
});
