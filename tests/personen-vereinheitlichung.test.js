'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Personen-Vereinheitlichung + C2 (U2-ADR-022)
   ────────────────────────────────────────────────────────────────────────
   „Umbau, nicht Brücke. Ein Topf: das Register." Das Sektor-Listenfeld
   `meine-menschen/menschen` ist entfallen; Bereich 2 rendert direkt das EINE
   Register data.menschen[]. Eine dort (oder per Import) angelegte Person ist
   sofort überall als ref:person wählbar (A1: rollenlos). Kinder/erwachsene
   Kinder sind Register-Personen (C2) — die Liste hält nur noch die Beziehung
   (ref) plus relationale Bezugsfelder. Entscheidungen: A = Akteur/Inhaberin
   aus dem vCard-Export filtern; C = geburtsort→Person, wohnort→Person.adresse.

   Node-testbar ist die Render-HTML-Ausgabe + das Datenmodell; die UI-Klick-
   pfade (Modale) gehen auf die Mac-Abnahme.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
async function frisch(name) {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren(name || 'Inhaberin');
  return k;
}
// Das echte Erben-Feld (vorsorge/erben) aus der Sektor-Definition holen.
function erbenFeldDef(V) {
  const sek = V.SEKTOR_BY_ID.advanceCare;
  for (const s of (sek.sektionen || [])) for (const f of (s.felder || [])) if (f.id === 'heirsBriefOverview') return f;
  throw new Error('erben-Feld nicht gefunden');
}

/* ── Bereich 2 rendert das Register ───────────────────────────────────────── */

test('Bereich 2 rendert das Register data.menschen[] als editierbare Liste', async () => {
  const { V } = await frisch();
  V.personHinzufuegen({ name: 'Anna Schmidt', beziehung: 'Schwester' });
  const html = V.menschenRegisterHTML(true);
  assert.ok(html.includes('data-menschen-register="1"'), 'Register-Container');
  assert.ok(html.includes('Anna Schmidt'), 'Person in der Liste');
  assert.ok(/data-person-id="[^"]+"/.test(html), 'Person trägt data-person-id');
  assert.ok(html.includes('data-person-hinzufuegen'), 'Hinzufügen-Knopf bei Schreibrecht');
  assert.ok(html.includes('data-person-bearbeiten') && html.includes('data-person-entfernen'), 'Bearbeiten/Entfernen bei Schreibrecht');
  // read-only (z. B. Vertrauensperson-Sicht): keine Aktions-/Hinzufügen-Knöpfe.
  const ro = V.menschenRegisterHTML(false);
  assert.ok(ro.includes('data-menschen-register="1"') && ro.includes('Anna Schmidt'), 'Register auch read-only sichtbar');
  assert.ok(!ro.includes('data-person-bearbeiten') && !ro.includes('data-person-hinzufuegen'), 'read-only ohne Schreib-Knöpfe');
});

/* ── A1: eine angelegte/importierte Person ist überall im Picker ─────────────── */

test('In Bereich 2 angelegte Person ist sofort im ref:person-Picker wählbar (A1)', async () => {
  const { V } = await frisch();
  const id = V.personHinzufuegen({ name: 'Bea Klar', beziehung: 'Freundin' });
  assert.ok(V.personenVorschlag().some(p => p.id === id && p.name === 'Bea Klar'), 'im Personen-Vorschlag');
  const html = V.feldInputHTML({ id: 'erben', typ: 'ref', entitaet: 'person' }, null);
  assert.ok(html.includes('Bea Klar'), 'als Option im Picker');
  assert.ok(html.includes('value="' + id + '"'), 'Option trägt die Personen-id');
});

test('Importierter Kontakt (vCard) erscheint im Personen-Picker', async () => {
  const { V } = await frisch();
  const vcf = 'BEGIN:VCARD\r\nVERSION:4.0\r\nFN:Carl Import\r\nTEL;TYPE=voice:0151 9\r\nNOTE:Nachbar\r\nEND:VCARD\r\n';
  V.kernAPI.importiere('vcard-menschen', vcf, { alleKonflikte: true });
  const carl = (V.getData().menschen || []).find(m => m.name === 'Carl Import');
  assert.ok(carl, 'importierter Kontakt im Register');
  assert.equal(carl.beziehung, 'Nachbar', 'vCard NOTE → beziehung');
  const html = V.feldInputHTML({ id: 'erben', typ: 'ref', entitaet: 'person' }, null);
  assert.ok(html.includes('Carl Import'), 'importierter Kontakt als Picker-Option');
});

/* ── Entscheidung A: Inhaberin nicht als Kontakt exportieren ─────────────────── */

test('vCard-Export filtert den Sitzungs-Akteur/Inhaberin heraus (Entscheidung A)', async () => {
  const { V } = await frisch('Inhaberin');
  V.personHinzufuegen({ name: 'Eve Extern' });
  const vcf = V.kernAPI.exportiere('vcard-menschen');
  assert.ok(vcf.includes('FN:Eve Extern'), 'Kontakt exportiert');
  assert.ok(!vcf.includes('FN:Inhaberin'), 'Inhaberin NICHT als Kontakt exportiert');
  assert.equal((vcf.match(/BEGIN:VCARD/g) || []).length, 1, 'genau eine Karte (ohne Inhaberin)');
});

/* ── C2: Kind als Register-Person + relationale Bezugszeile ──────────────────── */

test('C2: Kind ist Register-Person (birthDate/geburtsort); Zeile trägt sorgerecht/betreuungsmodell; Kind im Erben-Picker', async () => {
  const { V } = await frisch();
  // Klickpfad-Modell: Kind = Register-Person; die Kinder-Zeile referenziert sie und trägt die
  // relationalen Felder. Geburtsdatum/Geburtsort wohnen an der Person (Entscheidung C).
  const kindId = V.personHinzufuegen({ name: 'Kim Kind', birthDate: '2015-03-01', birthPlace: 'Köln' });
  V.listenEintragHinzufuegen('people', 'childrenAndDependants', {
    person: { ref: kindId }, legalRepresentationParental: 'gemeinsam', custodyArrangement: 'Wechselmodell',
  });
  const kind = (V.getData().menschen || []).find(m => m.id === kindId);
  assert.equal(kind.birthDate, '2015-03-01', 'Geburtsdatum an der Person');
  assert.equal(kind.birthPlace, 'Köln', 'Geburtsort an der Person (Entscheidung C)');
  const zeile = (V.getData().sektoren['people'].childrenAndDependants || [])[0];
  assert.equal(JSON.stringify(zeile.person), JSON.stringify({ ref: kindId }), 'Zeile referenziert die Kind-Person');
  assert.equal(zeile.legalRepresentationParental, 'gemeinsam', 'Sorgerecht an der Bezugszeile');
  assert.equal(zeile.custodyArrangement, 'Wechselmodell', 'Betreuungsmodell an der Bezugszeile');
  assert.ok(zeile.birthDate == null && zeile.name == null, 'keine Personen-Daten an der Zeile (wohnen an der Person)');
  // Kind ist im echten Erben-Feld (vorsorge/erben, refMehrfach:person) wählbar. Personen-Widget (08.07.):
  // die Vorschläge kommen DYNAMISCH aus personenVorschlag() (Combobox-Live-Filter), nicht mehr als statische
  // <option> im HTML — die relevante Invariante ist die Vorschlags-Quelle plus das Combobox-Feld.
  const erbenFeld = erbenFeldDef(V);
  assert.equal(erbenFeld.typ, 'refMehrfach');   // U2-ADR-065: mehrere Erben
  assert.equal(erbenFeld.entitaet, 'person');
  assert.ok(V.personenVorschlag().some(p => p.id === kindId && p.name === 'Kim Kind'), 'Kind wird im Erben-Combobox angeboten');
  assert.ok(V.feldInputHTML(erbenFeld, null).includes('data-edit-refm="heirsBriefOverview"'), 'Erben nutzt das refMehrfach-Combobox');
});

test('U2-ADR-023: EINE Kinder-Liste (erwachsene_kinder entfällt); Zeile trägt ref + relationale Felder + Ausbildungs-Marker', async () => {
  const { V } = await frisch();
  const sek = V.SEKTOR_BY_ID['people'];
  const felder = sek.sektionen.flatMap(s => s.felder || []);
  assert.ok(!felder.some(f => f.id === 'erwachsene_kinder'), 'erwachsene_kinder ist entfallen (vereinheitlicht)');
  const kinder = felder.find(f => f.id === 'childrenAndDependants');
  assert.ok(kinder && kinder.typ === 'liste', 'eine kinder-Liste');
  // U2-ADR-036: Beziehungs-Enum + Freitext, Sorgerecht-Enum + Freitext (entdoppelt) an der Zeile.
  // U2-ADR-109: `kind`→`person`, `kind_beziehung`→`art` (Diskriminante), plus die Betreuungs-Felder.
  assert.equal(kinder.unterFelder.map(u => u.id).join(','),
    'person,type,typeAdditionalDetail,note,legalRepresentationParental,custodyAdditionalDetailPartial,custodyArrangement,training,trainingExpectedToEnd,birthCertificateStorage,basisOfRepresentation,areasOfResponsibility,careCourt,fileReferenceNumber,validSince',
    'Beziehung (ref) + Kind-Beziehung-Enum + Sorgerecht-Enum + Freitexte + Ausbildungs-Marker an der Zeile');
  assert.equal(kinder.unterFelder[0].typ, 'ref');
  assert.equal(kinder.unterFelder[0].entitaet, 'person');
  // §3b: Ausbildungs-Marker ist ein Eingabe-Feld an der Bezugszeile (nicht an der Person), mit optionalem Ende.
  const aus = kinder.unterFelder.find(u => u.id === 'training');
  assert.equal(aus.typ, 'auswahl');
  assert.equal(kinder.unterFelder.find(u => u.id === 'trainingExpectedToEnd').typ, 'datum');
});
