'use strict';
/* ════════════════════════════════════════════════════════════════════════
   F3 Zug 1 — ein Katalog statt zwei („F3", 09.08.2026).

   Befund: `vorsorge_instrumente.art`-Optionen und `VERTRETUNGS_GRUNDLAGEN`
   waren zwei Kopien desselben Fünfer-Katalogs (vorsorge/gesundheit/bank/
   betreuung/general) — ein W-8-Fall, der dem mechanischen Wächter aber
   strukturell entgeht (er prüft Schema-Felder/Situationsfelder/Wizard-Ziele,
   keine freien JS-Objektkonstanten wie VERTRETUNGS_GRUNDLAGEN; Regel-23-Fund,
   kein Grundlinie-Eintrag nötig — es gibt nichts, das der Wächter je markiert
   hätte).

   `RECHTSGRUNDLAGEN_VERTRETUNG` ist jetzt die EINE Quelle. `instrumentWaehlbar`
   kennzeichnet, ob ein Wert bei `vorsorge_instrumente.art` wählbar ist (ein
   besessenes Instrument); `grundlageWaehlbar`, ob er bei einem Sub-Depot als
   `vertretungsGrundlage` wählbar ist (woraus sich die Befugnis ableitet, ein
   fremdes Depot zu führen). Beide Fragen sind nicht dieselbe — eine Vollmacht
   kann beides sein, eine Betreuerbestellung nur das zweite.

   `betreuung` („Betreuungsvollmacht") bleibt im Katalog (Label unverändert,
   bestehende Tests in verwaltete-depots.test.js lesen ihn weiter) — aber
   `grundlageWaehlbar:false`: rechtlich leer (Befund), darum nicht mehr für
   NEUE Sub-Depots wählbar, dieselbe Konsequenz wie am `art`-Feld (Zug 3),
   konsistent auf beide Kataloge gezogen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

test('[F3] RECHTSGRUNDLAGEN_VERTRETUNG: die fünf alten Werte + die zwei neuen/bestehenden gesetzlichen Grundlagen, mit Kennzeichnung', async () => {
  const { V } = ladeKern();
  const K = V.RECHTSGRUNDLAGEN_VERTRETUNG;
  assert.equal(K.vorsorge.label, 'Vorsorgevollmacht');
  assert.equal(K.vorsorge.instrumentWaehlbar, true);
  assert.equal(K.vorsorge.grundlageWaehlbar, true);
  assert.equal(K.bank.instrumentWaehlbar, true);
  assert.equal(K.bank.grundlageWaehlbar, true);
  assert.equal(K.gesundheit.instrumentWaehlbar, false, 'Umfang, kein eigenes Instrument (Zug 3)');
  assert.equal(K.gesundheit.grundlageWaehlbar, true);
  assert.equal(K.general.instrumentWaehlbar, false);
  assert.equal(K.general.grundlageWaehlbar, true);
  assert.equal(K.betreuung.instrumentWaehlbar, false);
  assert.equal(K.betreuung.grundlageWaehlbar, false, 'rechtlich leer — nicht mehr neu wählbar');
  assert.equal(K.betreuung.label, 'Betreuungsvollmacht', 'Label unverändert — Bestandsdaten bleiben lesbar');
  assert.ok(K.gesetzliche_betreuung, 'neue Grundlage existiert (Zug 2)');
  assert.equal(K.gesetzliche_betreuung.instrumentWaehlbar, false, 'kein Dokument der Inhaberin, sondern eines über sie');
  assert.equal(K.gesetzliche_betreuung.grundlageWaehlbar, true);
  assert.match(K.gesetzliche_betreuung.label, /Betreuungsgericht|§ ?1814/);
  assert.equal(K.elterliche_sorge.grundlageWaehlbar, true);
  assert.equal(K.elterliche_sorge.instrumentWaehlbar, false);
});

test('[F3] vertretungsGrundlageLabel liest weiterhin alle Bestandsschlüssel unverändert (Regression)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  assert.equal(V.vertretungsGrundlageLabel({ vertretungsGrundlage: 'vorsorge' }), 'Vorsorgevollmacht');
  assert.equal(V.vertretungsGrundlageLabel({ vertretungsGrundlage: 'gesundheit' }), 'Gesundheitsvollmacht');
  assert.equal(V.vertretungsGrundlageLabel({ vertretungsGrundlage: 'bank' }), 'Bankvollmacht');
  assert.equal(V.vertretungsGrundlageLabel({ vertretungsGrundlage: 'betreuung' }), 'Betreuungsvollmacht');
  assert.equal(V.vertretungsGrundlageLabel({ vertretungsGrundlage: 'general' }), 'Generalvollmacht');
  assert.equal(V.vertretungsGrundlageLabel({ vertretungsGrundlage: 'elterliche_sorge' }), 'elterliche Sorge (minderjähriges Kind)');
});

test('[F3] vertretungsGrundlageOptionenHTML: bietet die gesetzliche Betreuung neu an, "Betreuungsvollmacht" NICHT mehr', async () => {
  const { V } = ladeKern();
  const html = V.vertretungsGrundlageOptionenHTML('');
  assert.match(html, /value="gesetzliche_betreuung"/, 'neue Option ist wählbar');
  assert.doesNotMatch(html, /value="emergencyCarePersonContact"/, 'rechtlich leerer Begriff nicht mehr in der Auswahl');
  assert.match(html, /value="vorsorge"/);
  assert.match(html, /value="bank"/);
  assert.match(html, /value="gesundheit"/);
  assert.match(html, /value="general"/);
  assert.match(html, /value="elterliche_sorge"/);
});

test('[F3] subDepotAnlegen akzeptiert die neue Grundlage "gesetzliche_betreuung"', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const eintrag = await V.subDepotAnlegen({ vertretungsGrundlage: 'gesetzliche_betreuung', vorname: 'Erika' }, 'subpw12345');
  // E1 (Kette Auftrag 2, Zug 3): angenommen wird sie weiterhin — sie liegt nur nicht mehr
  // im Klartext-Eintrag, sondern hinter dem Sub-Passwort.
  assert.equal(Object.prototype.hasOwnProperty.call(eintrag, 'vertretungsGrundlage'), false);
  const inhalt = await V.subDepotVertrauenOeffnen(eintrag.depotUUID, 'subpw12345');
  assert.equal(inhalt.vertretungsGrundlage, 'gesetzliche_betreuung');
});
