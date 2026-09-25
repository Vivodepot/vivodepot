'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — K2 (Auftrag K1/K2/K6, 09.08.2026): die Anwendung liest ihren
   eigenen Zustand.
   ────────────────────────────────────────────────────────────────────────
   Drei bestätigte Fälle (zwei WIDERLEGTE — wizardHatDaten, "kein Rhythmus
   ohne Statuspunkt" — bleiben bewusst unangetastet, hier nicht Gegenstand):

   1. bereichOhneEintraege(): "Meine Menschen" trägt die Personenliste NICHT
      über sek.felder (U2-ADR-022, felder:[] an der Sektion) — die Leerstands-
      Box blieb stehen, obwohl echte Personen im Register standen.
   2. "Als geprüft markieren": dokumentAlsGeprueft() wirkte, aber markierte
      das Depot nie als ungespeichert, und der Dokument-Panel-Weg baute sich
      nie neu auf — "Erfolg ohne Wirkung" (08.08.), an einer dritten Stelle.
   3. renderBestandsAuswahl(): zeigte allen dieselben Kacheln, unabhängig
      vom Depot-Stand — liest jetzt data, filtert aber nicht (Grenze aus
      dem Auftrag: reine Darstellung).

   Regel 18 (K2-Verschärfung, Rang 0.2): jede Probe hier nennt die Prüfung,
   die OHNE den Fix rot wird — bei "Erfolg ohne Wirkung" ist das die einzige
   Absicherung, die trägt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'k2-test-2026!';
async function frischesDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Testerin');
  return k;
}

/* ── 1) bereichOhneEintraege: "Meine Menschen" liest data.menschen[] ───── */

test('[K2·1] bereichOhneEintraege: "Meine Menschen" meldet leer, wenn außer der (explizit erklärten) Inhaberin niemand im Register steht', async () => {
  const { V } = await frischesDepot();
  // akteurSelbstErklaeren() (in frischesDepot()) legt bereits EINEN Register-Eintrag an — den
  // markieren wir hier als Inhaberin über data.inhaberPersonId (der erste, explizite Prüfweg von
  // _inhaberPersonIdFinden — derselbe, den tests/k1-zeilenkomponente.test.js schon nutzt). Die
  // schwächere Rückfallebene (jüngster 'selbst'-Stempel) braucht einen echten Feld-Schreibvorgang
  // mit Urheberschaft, den akteurSelbstErklaeren() allein nicht hinterlässt.
  V.getData().inhaberPersonId = V.getData().menschen[0].id;
  const s = V.SEKTOR_BY_ID['people'];
  const sektorDaten = (V.getData().sektoren && V.getData().sektoren['people']) || {};
  assert.equal(V.bereichOhneEintraege(s, sektorDaten), true);
});

test('[K2·2] bereichOhneEintraege: "Meine Menschen" meldet NICHT leer, sobald eine ZWEITE Person im Register steht — ohne den Fix bleibt dies rot (immer "leer", ignoriert data.menschen)', async () => {
  const { V } = await frischesDepot();
  V.getData().inhaberPersonId = V.getData().menschen[0].id;
  V.personHinzufuegen({ name: 'Peter Partner', beziehung: 'Ehemann' });
  const s = V.SEKTOR_BY_ID['people'];
  const sektorDaten = (V.getData().sektoren && V.getData().sektoren['people']) || {};
  assert.equal(V.bereichOhneEintraege(s, sektorDaten), false, 'die Leerstands-Box darf jetzt nicht mehr erscheinen');
});

test('[K2·3] bereichOhneEintraege: andere Bereiche bleiben unberührt (nur "meine-menschen" hat den Register-Sonderfall)', async () => {
  const { V } = await frischesDepot();
  const s = V.SEKTOR_BY_ID.finance;
  const sektorDaten = {};
  assert.equal(V.bereichOhneEintraege(s, sektorDaten), true);
});

/* ── 2) "Als geprüft markieren" wirkt wirklich ──────────────────────────── */

test('[K2·4] dokumentAlsGeprueft über den Prüfblatt-Weg markiert das Depot als ungespeichert — ohne den Fix bleibt _ungespeichertAnzahl() bei 0', async () => {
  const { V } = await frischesDepot();
  const JETZT = new Date('2026-06-03T10:00:00Z');
  const d = V.dokumentAnlegen({ name: 'Rhythmisch', sektorId: 'vorsorge', gueltigAb: '2025-01-03', pruefIntervallMonate: 12 }, JETZT);
  V.markiereGespeichert();
  assert.equal(V.ungespeichertAnzahl(), 0, 'Ausgangszustand: gespeichert');
  const knopf = { getAttribute: () => d.id, onclick: null };
  const host = { querySelectorAll: (sel) => {
    if (sel === '[data-prtm-geprueft]') return [knopf];
    return [];
  } };
  V.verdrahtePrueftermine(host);
  knopf.onclick();
  assert.ok(V.ungespeichertAnzahl() > 0, 'ein echter Schreibvorgang markiert das Depot als ungespeichert');
});

test('[K2·5] dokumentAlsGeprueft über den Dokument-Panel-Weg (data-doku-geprueft) markiert ebenfalls als ungespeichert UND baut das Panel neu auf — ohne den Fix weder noch ("Erfolg ohne Wirkung")', async () => {
  const { V } = await frischesDepot();
  const JETZT = new Date('2026-06-03T10:00:00Z');
  const d = V.dokumentAnlegen({ name: 'Panel-Dokument', sektorId: 'vorsorge', gueltigAb: '2025-01-03', pruefIntervallMonate: 12 }, JETZT);
  V.markiereGespeichert();
  let renderContentAufrufe = 0;
  const echtesRenderContent = V.renderContent;
  V.renderContent = (...args) => { renderContentAufrufe++; return echtesRenderContent(...args); };
  try {
    // Direkter Aufruf der Kern-Bausteine, denselben Reihenfolge wie der reale Klick-Handler
    // (dokumentAlsGeprueft → markiereUngespeichert → renderContent) — der echte Klickweg über
    // ein DOM-Panel braucht Browser-Abnahme (s. Bericht), hier zählt die reine Wirkung.
    V.dokumentAlsGeprueft(d.id, JETZT);
    V.markiereUngespeichert();
    V.renderContent();
  } finally {
    V.renderContent = echtesRenderContent;
  }
  assert.ok(V.ungespeichertAnzahl() > 0, 'als ungespeichert markiert');
  assert.equal(renderContentAufrufe, 1, 'das Panel baut sich tatsächlich neu auf');
});

/* ── 3) renderBestandsAuswahl liest data ────────────────────────────────── */

test('[K2·6] _bausteinHatEintraege: false für ein frisches Depot ohne jedes Baustein-Feld', async () => {
  const { V } = await frischesDepot();
  assert.equal(V._bausteinHatEintraege('behinderung'), false);
});

test('[K2·7] _bausteinHatEintraege: true, sobald EIN deklariertes Feld des Bausteins gesetzt ist — ohne den Fix bleibt dies rot (liest data nirgends)', async () => {
  const { V } = await frischesDepot();
  V.sektorFeldSetzen('socialInsurance', 'degreeOfDisabilityGdb', '50');
  assert.equal(V._bausteinHatEintraege('behinderung'), true);
});

test('[K2·8] renderBestandsAuswahl: die Kachel trägt den Zusatz-Hinweis, sobald begonnen — bleibt aber weiterhin anklickbar (Grenze: Darstellung, keine Filterung)', async () => {
  const { V, document } = await frischesDepot();
  V.sektorFeldSetzen('socialInsurance', 'degreeOfDisabilityGdb', '50');
  V.renderBestandsAuswahl();
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /data-lage="behinderung"[^]*?lage-erfasst-marker/, 'die begonnene Kachel trägt den Hinweis');
  assert.match(html, /data-lage="behinderung"/, 'die Kachel bleibt im Markup — kein Herausfiltern');
});

test('[K2·9] renderBestandsAuswahl: eine unbegonnene Kachel trägt KEINEN Zusatz-Hinweis (Gegenprobe)', async () => {
  const { V, document } = await frischesDepot();
  V.renderBestandsAuswahl();
  const html = document.getElementById('content').innerHTML;
  const start = html.indexOf('data-lage="behinderung"');
  const block = html.slice(start, start + 400);
  assert.ok(!block.includes('lage-erfasst-marker'), 'ohne Eintrag kein Hinweis');
});
