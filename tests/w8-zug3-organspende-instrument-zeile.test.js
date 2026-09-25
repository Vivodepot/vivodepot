'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — W-8 Zug 3 („W-8 Doppelerfassung", 09.08.2026): pvwiz
   schreibt die Organspende-Antwort in die Instrument-Zeile, nicht nur daneben.
   ────────────────────────────────────────────────────────────────────────
   ENTWURFSENTSCHEIDUNG (für den Bericht, nicht selbstverständlich aus dem
   Auftragstext ableitbar — hier begründet):

   Der Dokument-Generator (`pvDokumentHTML`/MODUL_BLOCK_HANDLER) braucht die
   AMTLICHE BMJ-Formulierung (zustimmung/ablehnung, lange Rechtstexte als
   Options-Label) unverändert — „Der Dokument-Generator bleibt unangetastet"
   UND ist hart per Golden-Fixture (tests/fixtures/pv-golden.json, 42
   Zweig-Fälle) abgesichert. `pv_organspende` bleibt darum als FLACHES Feld
   bestehen und wird von pvwiz WEITERHIN unverändert geschrieben (Zug 3 rührt
   PV_BMJ.steps/pvwiz.ziel NICHT an).

   ZUSÄTZLICH — nicht ersetzend — schreibt derselbe Schritt beim Speichern
   die auf vier Werte abgebildete Antwort in die vorsorge_instrumente-Zeile
   (`typ:'living-will'`, Unterfeld `organspende`), die pvwiz damit
   zum ersten Mal überhaupt anlegt (W-5). Die Abbildung ist zwei→vier
   (zustimmung→ja, ablehnung→nein — „familie"/„teil" haben keine BMJ-
   Entsprechung, bleiben dem manuellen Bearbeiten der Zeile vorbehalten),
   NICHT umgekehrt — genau wie im Auftrag verlangt.

   PV_ORGANSPENDE_BRUECKE entfällt ERSATZLOS (Auftragswortlaut) — auch als
   Lese-Fallback. Bestandsdaten (pv_organspende gefüllt, Instrument-Zeile
   fehlt/leer) werden NICHT rückwirkend migriert (kein Schema-Bump, keine
   stille Migration — Auftragswortlaut, Verwaisungsregel U2-ADR-050):
   Erneutes Durchlaufen des UNVERÄNDERTEN Organspende-Schritts (auch ohne
   den Wert zu ändern — jedes „Weiter" ruft wizardSchrittSpeichern() erneut)
   befüllt die Zeile nachträglich. Ihr alter pv_organspende-Wert bleibt in
   jedem Fall vollständig erhalten (kein Datenverlust) und ist über
   data.sektoren.advanceCare weiterhin lesbar — nur die Notfallkarte zeigt ihn
   ohne diesen einen Schritt nicht mehr automatisch an. Diese Lesart ist eine
   Interpretation der Auftragsformulierung „entfällt ersatzlos" — im Bericht
   ausdrücklich als Entwurfsentscheidung markiert.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function frisch() {
  const { V } = ladeKern();
  await V.depotAnlegen('w8zug3-pw-999');
  V.akteurSelbstErklaeren('Maria');
  return V;
}

function organspendeSchrittIndex(V) {
  const def = V.WIZARD_BY_ID.pvwiz;
  return def.schritte.findIndex((s) => s.feld.id === 'organDonationDecision');
}

test('[W8-Zug3] PV_ORGANSPENDE_BRUECKE existiert nicht mehr als Konstante (entfällt ersatzlos)', () => {
  const { html, V } = ladeKern();
  // NUR die Deklaration verboten — ein erklärender Kommentar, WARUM sie entfernt wurde, darf den
  // alten Namen nennen (steht genau da, s. notfallKernModell()-Kopf).
  assert.doesNotMatch(html, /const PV_ORGANSPENDE_BRUECKE/, 'keine Deklaration mehr');
  assert.doesNotMatch(html, /function _organspendeMitBruecke/, 'keine Lese-Brücke mehr');
  assert.equal(V.PV_ORGANSPENDE_BRUECKE, undefined);
});

test('[W8-Zug3] das Beantworten von "Organspende — zustimmung" legt die Instrument-Zeile an und trägt organspende:"ja"', async () => {
  const V = await frisch();
  const idx = organspendeSchrittIndex(V);
  assert.ok(idx > -1, 'Organspende-Schritt gefunden');
  const r = V.wizardSchrittSetzen('pvwiz', idx, 'zustimmung');
  assert.equal(r.ok, true);
  const liste = V.getData().sektoren.advanceCare.provisionInstruments || [];
  const zeile = liste.find((e) => e.instrument === 'living-will');
  assert.ok(zeile, 'Instrument-Zeile wurde angelegt — W-5 (pvwiz legt sein Instrument an)');
  assert.equal(zeile.organDonation, 'ja');
  // Generator-Quelle bleibt UNVERÄNDERT geschrieben (Der Dokument-Generator bleibt unangetastet).
  assert.equal(V.getData().sektoren.advanceCare.organDonationDecision, 'zustimmung');
});

test('[W8-Zug3] "ablehnung" bildet auf "nein" ab', async () => {
  const V = await frisch();
  const idx = organspendeSchrittIndex(V);
  V.wizardSchrittSetzen('pvwiz', idx, 'ablehnung');
  const liste = V.getData().sektoren.advanceCare.provisionInstruments || [];
  const zeile = liste.find((e) => e.instrument === 'living-will');
  assert.equal(zeile.organDonation, 'nein');
  assert.equal(V.getData().sektoren.advanceCare.organDonationDecision, 'ablehnung');
});

test('[W8-Zug3] eine bereits bestehende Instrument-Zeile (z. B. aus einer manuellen Eintragung) wird AKTUALISIERT, nicht verdoppelt', async () => {
  const V = await frisch();
  if (!V.getData().sektoren.advanceCare) V.getData().sektoren.advanceCare = {};
  V.getData().sektoren.advanceCare.provisionInstruments = [
    { instrument: 'living-will', storageLocation: 'Aktenordner Vorsorge' },
  ];
  const idx = organspendeSchrittIndex(V);
  V.wizardSchrittSetzen('pvwiz', idx, 'zustimmung');
  const liste = V.getData().sektoren.advanceCare.provisionInstruments;
  assert.equal(liste.length, 1, 'keine zweite Zeile — dieselbe Zeile wird aktualisiert');
  assert.equal(liste[0].organDonation, 'ja');
  assert.equal(liste[0].storageLocation, 'Aktenordner Vorsorge', 'bereits vorhandene Unterfelder bleiben erhalten');
});

test('[W8-Zug3] erneutes unverändertes Beantworten (Bestandsdaten-Reparaturweg) befüllt die Zeile nachträglich', async () => {
  const V = await frisch();
  // Bestandsdaten-Simulation: pv_organspende gefüllt (alter Stand), KEINE Instrument-Zeile.
  if (!V.getData().sektoren.advanceCare) V.getData().sektoren.advanceCare = {};
  V.getData().sektoren.advanceCare.pv_organspende = 'zustimmung';
  assert.equal((V.getData().sektoren.advanceCare.provisionInstruments || []).length, 0, 'Vorbedingung: keine Zeile');
  const idx = organspendeSchrittIndex(V);
  V.wizardSchrittSetzen('pvwiz', idx, 'zustimmung');   // derselbe Wert erneut "beantwortet"
  const zeile = (V.getData().sektoren.advanceCare.provisionInstruments || []).find((e) => e.instrument === 'living-will');
  assert.ok(zeile, 'die Zeile entsteht nachträglich, sobald der Schritt erneut durchlaufen wird');
  assert.equal(zeile.organDonation, 'ja');
});

test('[W8-Zug3] andere pvwiz-Schritte (z. B. Wertvorstellungen) lösen KEINEN Instrument-Zeilen-Seiteneffekt aus', async () => {
  const V = await frisch();
  const idx = V.WIZARD_BY_ID.pvwiz.schritte.findIndex((s) => s.feld.id === 'personalValuesOrFurtherDocuments');
  assert.ok(idx > -1);
  V.wizardSchrittSetzen('pvwiz', idx, 'Meine Werte sind …');
  assert.equal((V.getData().sektoren.advanceCare.provisionInstruments || []).length, 0,
    'nur der Organspende-Schritt legt/aktualisiert die Zeile — die 27 übrigen BMJ-Felder bleiben, wo sie sind');
});

test('[W8-Zug3] die Notfallkarte liest die Instrument-Zeile direkt, ohne Brücke', async () => {
  const V = await frisch();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  const idx = organspendeSchrittIndex(V);
  V.wizardSchrittSetzen('pvwiz', idx, 'zustimmung');
  const modell = V.notfallKernModell();
  const zeile = modell.find((z) => z.label && z.label.toLowerCase().includes('organspende'));
  assert.ok(zeile, 'Organspende erscheint auf der Notfallkarte');
  assert.match(String(zeile.wert), /ja/i);
});

test('[W8-Zug3] ohne jede Angabe bleibt die Organspende-Zeile auf der Notfallkarte weiterhin weg (kein Erfinden)', async () => {
  const V = await frisch();
  const zeile = V.notfallKernModell().find((z) => z.label && z.label.includes('Organspende'));
  assert.equal(zeile, undefined);
});

test('[W8-Zug3] W-5 geht auf 0 — pvwiz gilt als repariert (seit dem pvwiz-Auftrag strukturell, nicht mehr per Ausnahme)', () => {
  const w5Grundlinie = require('../tools/w5-wizard-instrument-zeile-grundlinie.json');
  assert.deepEqual(w5Grundlinie, [], 'W-5-Grundlinie ist leer — kein Wizard mehr ohne Instrument-Zeile bekannt');
});

// „pvwiz und die ADR-Kollision" (10.08.2026) — die vorherige SEITENEFFEKT_ERFUELLT-
// Ausnahme ist entfallen (s. tools/w5-wizard-instrument-zeile-pruefen.js): `pvwiz.ziel` trägt
// jetzt selbst liste+typ, die Struktur-Prüfung sieht den reparierten Fall direkt. Rotmachbarkeit
// jetzt gegen eine SIMULIERTE Regression (ziel zurück auf flach), nicht mehr gegen eine
// Ausnahme-Liste — belegt, dass die Prüfung selbst greift, nicht ein Schalter daneben.
test('[W8-Zug3·Rotmachbarkeit] ein flaches pvwiz.ziel würde W-5 wieder melden — die Struktur-Prüfung greift ohne Ausnahme', () => {
  const { V } = ladeKern();
  const { wizardsOhneInstrumentZeile } = require('../tools/w5-wizard-instrument-zeile-pruefen.js');
  const pvwiz = V.WIZARDS.find((w) => w.id === 'pvwiz');
  const echtesZiel = pvwiz.ziel;
  pvwiz.ziel = { sektor: 'vorsorge' };   // simulierte Regression: liste/typ verloren
  try {
    const funde = wizardsOhneInstrumentZeile(V);
    assert.ok(funde.some((f) => f.wizard === 'pvwiz'),
      'ohne liste/typ an ziel meldet die Struktur-Prüfung pvwiz wieder — kein stiller Blindfleck');
  } finally {
    pvwiz.ziel = echtesZiel;
  }
});
