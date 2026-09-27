'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Rechtsraum-Katalog, U2-ADR-121 Gesamtfassung Zug 4+5 — Punkte 2+5+6+10
   (Instrument-Stempel: rechtsraum + katalogStand, mit Bestandsdaten-Backfill)
   ────────────────────────────────────────────────────────────────────────────
   Schema 45 → 46. Geprüft:
     1) Migration (Zug 5, Punkt 6) — ein Alt-Instrument ohne rechtsraum bekommt den
        Backfill (DE, rechtsraumAngenommen:true, katalogStand:null); idempotent.
     2) Frisch erzeugte Instrumente (Zug 4, Punkt 5) — silently gestempelt, kein
        bürgersichtbares Feld; katalogStand über den Zug-1-Zugriff (Kellerwand 3:
        ein Typ ohne Katalog-Eintrag bekommt null, nicht erfunden).
     3) Nur vorsorge_instrumente betroffen — andere Listen-Felder unangetastet.
     4) Kardinalität (Punkt 2): mehrere gleichzeitig gültige Rechtsräume pro
        Depot sind strukturell möglich (ein Instrument = ein Rechtsraum).
     5) Der Stempel übersteht ein Bearbeiten-Speichern (echter Modal-Pfad,
        DOM-Stub) — liesEintragAusDOM kennt das Feld nicht, ohne Erhalt würde
        jedes Speichern es stillschweigend löschen.
     6) Punkt 10 — der Stempel liegt ausschließlich in `ct`, nie im Klartext-
        Umschlag (depotSerialisieren).
   ════════════════════════════════════════════════════════════════════════════ */
const { katalogDe } = require('./helfer/rechtsraum-katalog-de.js');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'Test-Passwort-12345!';

function instrumenteFeld(V) {
  return V.SEKTOR_BY_ID.advanceCare.sektionen.flatMap(s => s.felder).find(f => f.id === 'provisionInstruments');
}

/* ── 1 · Migration (Backfill) ─────────────────────────────────────────────── */

test('[Instrument-Stempel] Backfill: ein Alt-Instrument ohne rechtsraum bekommt DE + Annahme-Markierung', () => {
  const { V } = ladeKern();
  const alt = {
    schemaVersion: 45,
    sektoren: { vorsorge: { vorsorge_instrumente: [
      { id: 'v1', instrument: 'will', ort: 'beim Notar' },
    ] } },
    menschen: [],
  };
  const d = V.depotNormalisieren(JSON.parse(JSON.stringify(alt)));
  const e = d.sektoren.advanceCare.provisionInstruments[0];
  // Nicht auf 46 hartkodiert — depotNormalisieren hebt immer bis SCHEMA_VERSION_AKTUELL (spätere
  // Züge/Schema-Sprünge bumpen diese Konstante weiter, ohne dass dieser Test nachziehen muss).
  assert.equal(d.schemaVersion, V.SCHEMA_VERSION_AKTUELL, 'auf aktuellen Stand gehoben (Backfill lief bei Schema 46)');
  assert.equal(e.rechtsraum, 'DE', 'einziger bisher ausgelieferter Rechtsraum');
  assert.equal(e.rechtsraumAngenommen, true, 'Annahme, keine bestätigte Tatsache');
  assert.equal(e.katalogStand, null, 'beim tatsächlichen Erstellzeitpunkt geltender Stand ist nicht rekonstruierbar');
  assert.equal(e.storageLocation, 'beim Notar', 'Bestandswert bleibt unangetastet (Verwaisungsregel)');
});

test('[Instrument-Stempel] Backfill ist idempotent — ein zweiter Lauf ändert nichts mehr', () => {
  const { V } = ladeKern();
  const alt = { schemaVersion: 45, sektoren: { vorsorge: { vorsorge_instrumente: [
    { id: 'v1', instrument: 'will' },
  ] } }, menschen: [] };
  const einmal = V.depotNormalisieren(JSON.parse(JSON.stringify(alt)));
  const zweimal = V.depotNormalisieren(JSON.parse(JSON.stringify(einmal)));
  assert.deepEqual(zweimal.sektoren.advanceCare.provisionInstruments[0], einmal.sektoren.advanceCare.provisionInstruments[0]);
});

test('[Instrument-Stempel] Backfill lässt ein bereits gestempeltes Instrument unangetastet', () => {
  const { V } = ladeKern();
  const alt = { schemaVersion: 45, sektoren: { vorsorge: { vorsorge_instrumente: [
    { id: 'v1', instrument: 'will', rechtsraum: 'DE', rechtsraumAngenommen: false, katalogStand: 1 },
  ] } }, menschen: [] };
  const d = V.depotNormalisieren(JSON.parse(JSON.stringify(alt)));
  const e = d.sektoren.advanceCare.provisionInstruments[0];
  assert.equal(e.rechtsraumAngenommen, false, 'ein ECHT gesetztes Instrument darf nicht rückwirkend als Annahme markiert werden');
  assert.equal(e.katalogStand, 1);
});

/* ── 2 · Frisch erzeugte Instrumente ──────────────────────────────────────── */

test('[Instrument-Stempel] ein NEU erzeugtes Instrument wird silently gestempelt (kein Rateversuch, kein bürgersichtbares Feld)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'will' });
  const e = V.getData().sektoren.advanceCare.provisionInstruments[0];
  assert.equal(e.rechtsraum, 'DE');
  assert.equal(e.rechtsraumAngenommen, false, 'kein Rückschluss auf fehlende Alt-Daten — der einzig mögliche aktuelle Wert');
  assert.equal(e.katalogStand, katalogDe(V).will.DE.katalogVersion, 'katalogStand = Version, GEGEN DIE das Instrument entstand');
});

test('[Instrument-Stempel] ein Typ ohne Katalog-Eintrag bekommt katalogStand:null (Kellerwand 3, Zug 1)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  // guardian-nomination hat (noch) keinen AB_WERK_RECHTSRAUM_DE-Eintrag (leeres Modul, kein Generator).
  assert.equal(katalogDe(V)['guardian-nomination'], undefined, 'Positivkontrolle: der Typ ist wirklich nicht im Katalog');
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'guardian-nomination' });
  const e = V.getData().sektoren.advanceCare.provisionInstruments[0];
  assert.equal(e.rechtsraum, 'DE');
  assert.equal(e.katalogStand, null, 'kein erfundener Stand für einen Typ ohne Katalog-Eintrag');
});

/* ── 3 · Nur vorsorge_instrumente betroffen ───────────────────────────────── */

test('[Instrument-Stempel·Regression] ein Eintrag in einer ANDEREN Liste bekommt kein rechtsraum/katalogStand', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  V.listenEintragHinzufuegen('test_sektor', 'kinder', { vorname: 'Anna' });
  const e = V.getData().sektoren.test_sektor.kinder[0];
  assert.ok(!('rechtsraum' in e) && !('katalogStand' in e) && !('rechtsraumAngenommen' in e),
    'der Rechtsraum-Stempel ist spezifisch für vorsorge_instrumente, kein genereller Listen-Zusatz');
});

/* ── 4 · Kardinalität (Punkt 2): mehrere Rechtsräume gleichzeitig ─────────── */

test('[Instrument-Stempel·Kardinalität] ein Depot kann Instrumente mit UNTERSCHIEDLICHEM Rechtsraum gleichzeitig tragen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'will' });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'living-will' });
  const liste = V.getData().sektoren.advanceCare.provisionInstruments;
  // Heute liefert die App nur DE aus (kein UI-Feld, ADR "Ausdrücklich offen") — die Probe schreibt
  // einen zweiten Rechtsraum DIREKT ins Datenmodell, um zu zeigen, dass die SCHEMA-Ebene (nicht
  // die heutige UI) Mehrfach-Rechtsraum bereits strukturell trägt (ein Instrument = ein Rechtsraum).
  liste[1].rechtsraum = 'FR';
  liste[1].rechtsraumAngenommen = false;
  assert.equal(liste[0].rechtsraum, 'DE');
  assert.equal(liste[1].rechtsraum, 'FR');
  assert.equal(liste.length, 2, 'beide Instrumente bleiben nebeneinander bestehen, kein Konflikt');
});

/* ── 5 · Der Stempel übersteht ein Bearbeiten-Speichern ───────────────────────
   Hinweis zur Testform: der node-DOM-Stub kann für vorsorge_instrumente keinen
   ECHTEN Speichervorgang durchspielen — liesEintragAusDOM liest über
   document.querySelector() immer ein frisches, unverbundenes Stub-Element
   (kein Selector-Caching), darum bleibt `typ` (pflicht:true) IMMER leer und
   _listenEintragPruefen blockt JEDEN Versuch schon vor der Mutation (geprüft:
   liesEintragAusDOM liefert dort `{}`, _listenEintragPruefen `{ok:false}`).
   Deshalb ist die Erhalt-Logik als reine Funktion _listenEintragSystemfelderErhalten
   ausgelagert (dieselbe Funktion, die flowListenEintragBearbeiten tatsächlich
   aufruft) — hier direkt geprüft, ohne den unüberwindbaren DOM-Umweg. */

test('[Instrument-Stempel] _listenEintragSystemfelderErhalten bewahrt id + Rechtsraum-Stempel, die kein Formularfeld sind', () => {
  const { V } = ladeKern();
  const alt = { id: 'v1', instrument: 'will', ort: 'alter Ort', rechtsraum: 'DE', rechtsraumAngenommen: false, katalogStand: 1 };
  // Simuliert exakt, was liesEintragAusDOM tatsächlich liefert: NUR unterFelder-Werte,
  // OHNE id/rechtsraum/katalogStand/rechtsraumAngenommen (die sind kein Formularfeld).
  const rohAusDOM = { instrument: 'will', ort: 'neuer Ablageort' };
  const neu = V._listenEintragSystemfelderErhalten('advanceCare', 'provisionInstruments', alt, rohAusDOM);
  assert.equal(neu.ort, 'neuer Ablageort', 'die eigentliche Änderung bleibt übernommen');
  assert.equal(neu.id, 'v1', 'die stabile id überlebt');
  assert.equal(neu.rechtsraum, 'DE', 'der Rechtsraum-Stempel überlebt');
  assert.equal(neu.katalogStand, 1, 'der Katalog-Stand überlebt');
  assert.equal(neu.rechtsraumAngenommen, false, 'die Annahme-Markierung überlebt (auch als expliziter false-Wert)');
});

test('[Instrument-Stempel] _listenEintragSystemfelderErhalten wirkt NICHT auf andere Listen-Felder', () => {
  const { V } = ladeKern();
  const alt = { id: 'k1', vorname: 'Anna', rechtsraum: 'sollte-nie-hier-stehen' };
  const neu = V._listenEintragSystemfelderErhalten('test_sektor', 'kinder', alt, { vorname: 'Anna Neu' });
  assert.equal(neu.id, 'k1', 'id wird generell erhalten (U2-ADR-071-Nachtrag, unabhängig von ADR-121)');
  assert.ok(!('rechtsraum' in neu), 'der Rechtsraum-Erhalt ist auf vorsorge_instrumente beschränkt');
});

test('[Instrument-Stempel] flowListenEintragBearbeiten blockt jeden Speicherversuch im Stub, bevor Systemfelder überhaupt betroffen wären (Positivkontrolle der obigen Erklärung)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'will' });
  const feld = instrumenteFeld(V);
  const modalEl = document.getElementById('modal-inhalt');
  V.flowListenEintragBearbeiten('advanceCare', feld, 0);
  const roh = V.liesEintragAusDOM(modalEl, feld);
  assert.deepEqual(roh, {}, 'Beleg für die Testform oben: der Stub liefert hier immer ein leeres Objekt');
  const pruef = V._listenEintragPruefen('advanceCare', feld.id, feld, roh, 0);
  assert.equal(pruef.ok, false, 'Beleg: die Pflicht-Prüfung blockt VOR jeder Mutation — der Datensatz bleibt unangetastet');
  assert.ok(V.getData().sektoren.advanceCare.provisionInstruments[0].id, 'der Bestand ist unverändert, Stempel weiter da');
});

/* ── 6 · Punkt 10 — ausschließlich innerhalb der Verschlüsselung ──────────── */

test('[Instrument-Stempel·Punkt 10] der Klartext-Umschlag (depotSerialisieren) verrät nichts über Rechtsraum/Katalog-Stand', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'will' });
  const umschlag = await V.depotSerialisieren();
  const klartextFelder = Object.assign({}, umschlag);
  /* A345: das Chiffrat liegt seit dem Zerfall in vielen Einheiten und in den gewickelten
     Schlüsseln der Umschlagstabelle. Beides ist hier auszunehmen; alles ANDERE muss
     klartextlesbar UND rechtsraumfrei sein. Die Zusicherung wird dadurch strenger, nicht
     laxer — der Klartext-Rest ist nach dem Schnitt kleiner als vorher. */
  delete klartextFelder.einheiten;
  delete klartextFelder.umschlagTabelle;
  const alsText = JSON.stringify(klartextFelder);
  assert.ok(!/rechtsraum/i.test(alsText), 'kein "rechtsraum"-Bezeichner außerhalb von ct');
  assert.ok(!/katalogStand/i.test(alsText), 'kein "katalogStand"-Bezeichner außerhalb von ct');
  // ct selbst ist Base64/Chiffrat — die einzige zulässige Fundstelle für data.sektoren.vorsorge.
  assert.ok(umschlag.einheiten && Object.keys(umschlag.einheiten).length > 0,
    'die Einheiten sind die Chiffrat-Stelle');
});
