'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-104 — Datenmodell-Block: vier Skalar→Liste, ein Feld-Split, Schema 41
   ────────────────────────────────────────────────────────────────────────
   BEFUND (26.07.2026): Vier Felder trugen mehrere Sachverhalte in einem Freitext
   („Blinddarm 2008; Hüft-TEP rechts 2019"). Der FHIR-Generator machte daraus EINEN
   `Procedure`-Eintrag — für beliebig viele Eingriffe. `vermieter_tel` mischte Telefon
   und E-Mail und konnte darum kein `eingabeTyp` tragen.

   DER GEFÄHRLICHE TEIL war nicht die Konvertierung, sondern was danach noch skalar
   schrieb: `sektorFeldSetzen` auf ein Listenfeld warf NICHT — der String überschrieb
   die Liste, und `_listeOder` ersetzte ihn beim nächsten Listen-Zugriff wortlos durch
   `[]`. Stiller Datenverlust. Darum trägt dieser Umbau einen TYP-WÄCHTER, und die
   Proben unten prüfen ihn zuerst.

   FORM (U2-ADR-099): jede Prüfung sammelt über eine benannte Diskriminante VERSTÖSSE
   und fordert die leere Liste — so greift der mechanische Aufruf-Nachweis des
   Prüfstands. Der Suchraum ist je Prüfung im Fixture selbst gefüllt, nie ein Grep.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { bindungPruefen } = require('./bindung-pruefen.js');

const ADR = 'U2-ADR-104';
const HERKUNFT = 'invariante';
const PRUEFUNGEN = [
  'u2-104-skalar-schreibweg-auf-liste-wirft',
  'u2-104-alt-depot-wird-ein-listen-eintrag',
  'u2-104-leerer-skalar-wird-leere-liste',
  'u2-104-vermieter-kontakt-wird-getrennt',
];

// Die vier konvertierten Felder mit dem Unterfeld, in das der Alt-Wert wandert.
const KONVERTIERT = [
  ['health',         'operationsProcedures',  'procedure'],
  ['health',         'familyMedicalHistory',  'condition'],
  ['finance',        'assetsForTheEstate',    'asset'],
  ['administration', 'homeKeyWhoHoldsOne',    'note'],
];

// Schema 40 ist VOR der 80→81-Umschreibung (Kennungen Englisch, U2-ADR-XXX „Englisch vor v1"):
// die Stufe 40→41 (U2-ADR-104) liest/schreibt bewusst noch unter der ALTEN deutschen
// Bereichs-/Feld-Kennung — erst die spätere 80→81-Stufe schreibt sie auf Englisch um. Ein
// Alt-Depot dieses Fixtures MUSS also die alten Schlüssel tragen, sonst greift die zu prüfende
// Migrationsstufe gar nicht (s. vivodepot.html `_skalarZuListe41`).
function altDepot40(werte) {
  return {
    schemaVersion: 40,
    menschen: [{ id: 'ich', vorname: 'Maria', nachname: 'Muster' }],
    verwalteteDepots: [],
    sektoren: {
      gesundheit: { voroperationen: werte.voroperationen, familienanamnese: werte.familienanamnese },
      finanzen:   { nachlass_vermoegen: werte.nachlass_vermoegen },
      verwaltung: { wohnungsschluessel_ort: werte.wohnungsschluessel_ort },
      wohnen:     { vermieter_tel: werte.vermieter_tel,
                    weitere_wohnungen: werte.weitere_wohnungen || [] },
    },
  };
}

/* ── Probe 1 · der Typ-Wächter ────────────────────────────────────────────── */
// Diskriminante: welche Listenfelder nehmen einen Skalar-Schreibweg WIDERSPRUCHSLOS an?
function listenOhneWaechter(V) {
  const durchgerutscht = [];
  for (const [sektor, feld] of KONVERTIERT.concat([['advanceCare', 'provisionInstruments']])) {
    let warf = false;
    try { V.sektorFeldSetzen(sektor, feld, 'Skalar-Text'); } catch (_) { warf = true; }
    if (!warf) durchgerutscht.push(sektor + '.' + feld);
  }
  return durchgerutscht;
}

test('u2-104-skalar-schreibweg-auf-liste-wirft', () => {
  const { V } = ladeKern();
  V.setData(altDepot40({ voroperationen: '', familienanamnese: '', nachlass_vermoegen: '',
                         wohnungsschluessel_ort: '', vermieter_tel: '' }));
  V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
  assert.ok(KONVERTIERT.length >= 4, 'Positivkontrolle: der Suchraum ist besetzt');
  assert.deepEqual(listenOhneWaechter(V), [],
    'ein Skalar-Schreibweg auf ein Listenfeld MUSS werfen — sonst überschreibt der String die Liste '
    + 'und `_listeOder` verwirft ihn beim nächsten Listen-Zugriff wortlos');
});

test('[Negativprobe] u2-104-Probe-1: ohne Wächter geht der Wert lautlos verloren', () => {
  const { V } = ladeKern();
  V.setData(altDepot40({ voroperationen: '', familienanamnese: '', nachlass_vermoegen: '',
                         wohnungsschluessel_ort: '', vermieter_tel: '' }));
  V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
  // Der Zustand VOR dem 26.07. nachgestellt: direkt am Datenobjekt vorbei am Wächter schreiben.
  // (Diese Probe schreibt bewusst am Katalog vorbei, direkt aufs Rohobjekt — das steht hier noch
  // unter der alten Kennung, s. Kopfkommentar bei `altDepot40`.)
  V.getData().sektoren.gesundheit.voroperationen = 'Blinddarm 2008';
  V.__ungeprueft.listenEintragHinzufuegen('gesundheit', 'voroperationen', { eingriff: 'Hüft-TEP' });   // alte Kennung absichtlich — Harness-Prüfung umgangen
  const liste = V.getData().sektoren.gesundheit.voroperationen;
  assert.equal(Array.isArray(liste) && liste.length, 1);
  assert.equal(liste.map(z => z.eingriff).join('|'), 'Hüft-TEP',
    '„Blinddarm 2008" ist spurlos weg — genau der Verlust, den der Wächter verhindert');
});

/* ── Probe 2 · Migration: gefüllter Skalar → genau EIN Eintrag ─────────────── */
function migrationsVerstoesse(d) {
  const fehler = [];
  for (const [sektor, feld, unterfeld] of KONVERTIERT) {
    const w = d.sektoren[sektor] && d.sektoren[sektor][feld];
    if (!Array.isArray(w)) { fehler.push(sektor + '.' + feld + ': keine Liste (' + typeof w + ')'); continue; }
    if (w.length !== 1) { fehler.push(sektor + '.' + feld + ': ' + w.length + ' Einträge statt 1'); continue; }
    if (!w[0][unterfeld]) fehler.push(sektor + '.' + feld + ': Wert nicht im Unterfeld `' + unterfeld + '`');
  }
  return fehler;
}

test('u2-104-alt-depot-wird-ein-listen-eintrag', () => {
  const { V } = ladeKern();
  const alt = altDepot40({
    voroperationen: 'Blinddarm 2008', familienanamnese: 'Vater Herzinfarkt',
    nachlass_vermoegen: 'Eigentumswohnung', wohnungsschluessel_ort: 'Nachbarin Sarah',
    vermieter_tel: '',
  });
  // Positivkontrolle: vor der Migration sind es Strings, sonst prüft die Probe nichts.
  assert.equal(typeof alt.sektoren.gesundheit.voroperationen, 'string', 'Vorbedingung: Alt-Wert ist Skalar');

  const d = V.depotNormalisieren(JSON.parse(JSON.stringify(alt)));

  assert.deepEqual(migrationsVerstoesse(d), [], 'jeder gefüllte Skalar wird EIN Eintrag im richtigen Unterfeld');
  assert.equal(d.schemaVersion, V.SCHEMA_VERSION_AKTUELL,
    'Kettenende — die Konstante, nicht die Zahl: diese Zeile meint „aktuell", nicht „42" (C10, 29.07.2026)');
  // Der Alt-Wert von `wohnungsschluessel_ort` enthält einen NAMEN — er darf trotzdem nicht ins
  // ref-Feld `who` wandern: importierter/alter Freitext ist keine Referenz.
  assert.equal(d.sektoren.administration.homeKeyWhoHoldsOne[0].note, 'Nachbarin Sarah');
  assert.ok(!d.sektoren.administration.homeKeyWhoHoldsOne[0].who,
    'Freitext gehört NICHT in ein ref-Feld — die Bürgerin verknüpft die Person selbst');
});

/* ── Probe 3 · leerer Skalar → leere Liste, nicht [""] und nicht [{}] ──────── */
function geisterzeilen(d) {
  const fehler = [];
  for (const [sektor, feld] of KONVERTIERT) {
    const w = d.sektoren[sektor] && d.sektoren[sektor][feld];
    if (!Array.isArray(w)) { fehler.push(sektor + '.' + feld + ': keine Liste'); continue; }
    if (w.length !== 0) fehler.push(sektor + '.' + feld + ': ' + JSON.stringify(w) + ' statt []');
  }
  return fehler;
}

test('u2-104-leerer-skalar-wird-leere-liste', () => {
  const { V } = ladeKern();
  const alt = altDepot40({ voroperationen: '', familienanamnese: '   ', nachlass_vermoegen: '',
                           wohnungsschluessel_ort: '', vermieter_tel: '' });
  const d = V.depotNormalisieren(JSON.parse(JSON.stringify(alt)));
  assert.deepEqual(geisterzeilen(d), [],
    'leer MUSS `[]` werden — `[""]` oder `[{}]` erzeugten im Listen-Editor eine Geisterzeile, '
    + 'die die Bürgerin löschen müsste');
});

test('[Negativprobe] u2-104-Probe-3: eine Geisterzeile wäre sichtbar, aber „nicht eingetragen"', () => {
  const { V } = ladeKern();
  const def = V.feldDefFuer('health', 'operationsProcedures');
  assert.ok(def && def.typ === 'liste', 'Vorbedingung: Felddef ist eine Liste');
  // `feldEingetragen` erkennt alle drei Leerformen — die Geisterzeile wäre also NICHT als „Daten"
  // gezählt, aber im Editor trotzdem als Zeile sichtbar. Genau darum ist `[]` die richtige Form.
  assert.equal(V.feldEingetragen(def, []), false);
  assert.equal(V.feldEingetragen(def, [{}]), false);
  assert.equal(V.feldEingetragen(def, [{ procedure: 'Blinddarm' }]), true, 'Positivkontrolle: echte Zeile zählt');
});

/* ── Probe 4 · der vermieter_tel-Split, an BEIDEN Stellen ─────────────────── */
function splitVerstoesse(d) {
  const fehler = [];
  const w = d.sektoren.housing || {};
  const stellen = [['Hauptwohnung', w]].concat(
    (Array.isArray(w.furtherHomes) ? w.furtherHomes : []).map((z, i) => ['furtherHomes[' + i + ']', z]));
  for (const [name, obj] of stellen) {
    if (typeof obj.landlordPhone !== 'string') continue;
    if (/@/.test(obj.landlordPhone)) fehler.push(name + ': E-Mail steckt noch im Telefon-Feld');
  }
  return fehler;
}

test('u2-104-vermieter-kontakt-wird-getrennt', () => {
  const { V } = ladeKern();
  const alt = altDepot40({
    voroperationen: '', familienanamnese: '', nachlass_vermoegen: '', wohnungsschluessel_ort: '',
    vermieter_tel: '089 12345-678 · vermieter@example.de',
    weitere_wohnungen: [
      { strasse: 'Seestraße 12', vermieter_tel: '08051 12345 · chiemsee@example.de' },
      { strasse: 'Bergweg 3',    vermieter_tel: '030 998877' },              // ohne @ — Negativfall
    ],
  });
  assert.ok(/@/.test(alt.sektoren.wohnen.vermieter_tel), 'Positivkontrolle: der Alt-Wert ist gemischt');

  const d = V.depotNormalisieren(JSON.parse(JSON.stringify(alt)));
  const w = d.sektoren.housing;

  assert.deepEqual(splitVerstoesse(d), [], 'an KEINER Stelle darf eine E-Mail im Telefon-Feld bleiben');
  assert.equal(w.landlordPhone, '089 12345-678');
  assert.equal(w.landlordEmail, 'vermieter@example.de');
  // Der Split gilt auch in der Liste — sonst liefen Haupt- und Zweitwohnung auseinander.
  assert.equal(w.furtherHomes[0].landlordPhone, '08051 12345');
  assert.equal(w.furtherHomes[0].landlordEmail, 'chiemsee@example.de');
  // KEIN RATEN: ohne `@` bleibt das E-Mail-Feld leer und die Nummer unangetastet.
  assert.equal(w.furtherHomes[1].landlordPhone, '030 998877');
  assert.ok(!w.furtherHomes[1].landlordEmail, 'ohne @ wird nichts erfunden');
});

test('[Negativprobe] u2-104-Probe-4: die Trennregel rät nicht', () => {
  const { V } = ladeKern();
  const alt = altDepot40({ voroperationen: '', familienanamnese: '', nachlass_vermoegen: '',
                           wohnungsschluessel_ort: '', vermieter_tel: 'Hausverwaltung Meier & Co.' });
  const d = V.depotNormalisieren(JSON.parse(JSON.stringify(alt)));
  assert.equal(d.sektoren.housing.landlordPhone, 'Hausverwaltung Meier & Co.',
    'ein Wert ohne @ bleibt UNVERÄNDERT stehen — lieber am sichtbar falschen Platz als erraten');
  assert.ok(!d.sektoren.housing.landlordEmail);
});

/* ── Bindung ─────────────────────────────────────────────────────────────── */
test('[Klausel] U2-ADR-104 nennt diese vier Pruefungen', () => {
  bindungPruefen(ADR, HERKUNFT, PRUEFUNGEN, __filename);
});

/* ── Proben-Deklaration (U2-ADR-099) ─────────────────────────────────────── */
module.exports = {
  PROBEN: [
    { fuer: 'u2-104-skalar-schreibweg-auf-liste-wirft', diskriminante: listenOhneWaechter },
    { fuer: 'u2-104-alt-depot-wird-ein-listen-eintrag', diskriminante: migrationsVerstoesse },
    { fuer: 'u2-104-leerer-skalar-wird-leere-liste',    diskriminante: geisterzeilen },
    { fuer: 'u2-104-vermieter-kontakt-wird-getrennt',   diskriminante: splitVerstoesse },
  ],
};
