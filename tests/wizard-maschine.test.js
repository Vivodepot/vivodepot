'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Generische Wizard-Maschine (Teil 2, Schnitt 2.1)
   ────────────────────────────────────────────────────────────────────────
   wizardLauf(wizardId) rendert eine deklarative WIZARDS-Definition Schritt für
   Schritt. Geprüft (gemäß Plan-Disziplin):
     1) Registry ist deklarativ + eingefroren; gebwiz als Inaugural-Definition.
     2) Definition rendert (Titel, Frage, Fortschritt „Schritt X von Y").
     3) Auto-Save pro Schritt — schreibt in dieselbe Daten-Tasche wie die manuelle
        Eingabe (situationFeldSetzen-Pfad), gestempelt; KEIN paralleles Modell.
     4) Wiedereintritt: vorhandene Daten werden erkannt (wizardHatDaten → „bearbeiten").
     5) Abbruch-Rückweg: wizardAbbrechen führt über geheZuZuhause zurück zur Welcome.
     6) Navigation: Zurück/Weiter bewegen den Schritt; Fertig löst die Abschluss-Aktion.
     7) Ziel-Generik: Setter/Leser dispatchen über { sektor } UND { situation }.
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

test('1) WIZARDS ist deklarativ + eingefroren; gebwiz vorhanden, Schritte wohlgeformt', async () => {
  const { V } = await frischMitDepot();
  assert.ok(Array.isArray(V.WIZARDS), 'WIZARDS ist ein Array');
  assert.ok(Object.isFrozen(V.WIZARDS), 'Registry eingefroren');
  const def = V.WIZARD_BY_ID.gebwiz;
  assert.ok(def, 'gebwiz registriert');
  assert.equal(typeof def.titel, 'string');
  assert.ok(def.ziel && (def.ziel.sektor || def.ziel.situation), 'Ziel deklariert');
  assert.ok(def.schritte.length >= 1, 'mindestens ein Schritt');
  for (const s of def.schritte) {
    assert.equal(typeof s.frage, 'string', 'jeder Schritt trägt eine Frage');
    assert.ok(s.feld && s.feld.id, 'jeder Schritt trägt eine Felddefinition mit id');
  }
});

test('2) Definition rendert: Titel, erste Frage, Fortschritt „Schritt 1 von N"', async () => {
  const { V, document } = await frischMitDepot();
  V.betreteApp();
  assert.equal(V.wizardLauf('gebwiz'), true);
  const def = V.WIZARD_BY_ID.gebwiz;
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes(def.titel), 'Titel gerendert');
  assert.ok(html.includes(def.schritte[0].frage), 'erste Frage gerendert');
  assert.ok(html.includes(V.STRINGS.wizSchritt + ' 1 ' + V.STRINGS.wizVon + ' ' + def.schritte.length),
    'Fortschritt „Schritt 1 von N" gerendert');
  assert.ok(html.includes(V.STRINGS.wizWeiter), 'Weiter-Knopf da');
  assert.ok(html.includes(V.STRINGS.wizAbbrechen), 'Abbrechen-Knopf da');
  assert.equal(V.getViewState().aktiveAnsicht, 'wizard');
});

test('3) Auto-Save pro Schritt: schreibt in dieselbe Tasche, gestempelt, kein paralleles Modell', async () => {
  const { V } = await frischMitDepot();
  const r = V.wizardSchrittSetzen('gebwiz', 0, 'Klinikum Großhadern');
  assert.equal(r.ok, true);
  const d = V.getData();
  // Ziel ist die Situation 'geburt' — identischer Pfad wie situationFeldSetzen.
  assert.equal(d.situationen.geburt.geburt_klinik, 'Klinikum Großhadern');
  assert.equal(d.sektoren.geburt, undefined, 'kein Sektor-Namespace-Übergriff');
  // Stempel im sit-Namespace (U2-ADR-005).
  assert.equal(d.urheberschaft['sit:geburt'].geburt_klinik.length, 1, 'ein Stempel');
  // Code-Slot angelegt (U2-ADR-006).
  assert.equal(V.liesCode('sit:geburt', 'geburt_klinik'), null);
});

test('3b) leere optionale Eingabe schreibt NICHT (kein Stempel auf Leeres)', async () => {
  const { V } = await frischMitDepot();
  const r = V.wizardSchrittSetzen('gebwiz', 1, '   ');
  assert.equal(r, null, 'leere optionale Eingabe → nichts geschrieben');
  const d = V.getData();
  assert.equal(d.situationen.geburt, undefined, 'keine Daten, kein Namespace');
});

test('4) Wiedereintritt: wizardHatDaten erkennt vorhandene Werte', async () => {
  const { V } = await frischMitDepot();
  assert.equal(V.wizardHatDaten('gebwiz'), false, 'frisch: keine Daten');
  V.wizardSchrittSetzen('gebwiz', 0, 'Klinikum München');
  assert.equal(V.wizardHatDaten('gebwiz'), true, 'nach Schritt: Daten erkannt → bearbeiten');
});

test('5) Abbruch-Rückweg: wizardAbbrechen führt zur Welcome, Sicht-Zustand zurück, Modus Anker', async () => {
  const { V, document } = await frischMitDepot();
  V.betreteApp();
  V.wizardLauf('gebwiz');
  assert.equal(V.getViewState().aktiveAnsicht, 'wizard');
  V.wizardAbbrechen();
  const overlay = document.getElementById('overlay-inhalt').innerHTML;
  assert.ok(overlay.includes(V.STRINGS.welcomeWeiter) || overlay.includes(V.STRINGS.appName),
    'Welcome frisch gerendert');
  const vs = V.getViewState();
  assert.equal(vs.aktiveAnsicht, 'sektor');
  assert.equal(V.getWizardState().aktiverWizardId, null, 'kein Wizard mehr aktiv');
  assert.equal(V.Modus.aktuell(), 'anker');
});

test('5b) Abbruch ist Pause: ein bereits getragener Schritt bleibt erhalten', async () => {
  const { V } = await frischMitDepot();
  V.betreteApp();
  V.wizardLauf('gebwiz');
  V.wizardSchrittSetzen('gebwiz', 0, 'Klinikum Nord');   // simuliert getragenen Wert
  V.wizardAbbrechen();
  assert.equal(V.getData().situationen.geburt.geburt_klinik, 'Klinikum Nord', 'Daten überleben den Abbruch');
});

test('6) Navigation: Weiter/Zurück bewegen den Schritt-Index', async () => {
  const { V, document } = await frischMitDepot();
  V.betreteApp();
  V.wizardLauf('gebwiz');
  assert.equal(V.getWizardState().wizardSchrittIndex, 0);
  V.wizardWeiter();
  assert.equal(V.getWizardState().wizardSchrittIndex, 1, 'Weiter → Schritt 2');
  const def = V.WIZARD_BY_ID.gebwiz;
  assert.ok(document.getElementById('content').innerHTML.includes(
    V.STRINGS.wizSchritt + ' 2 ' + V.STRINGS.wizVon + ' ' + def.schritte.length));
  V.wizardZurueck();
  assert.equal(V.getWizardState().wizardSchrittIndex, 0, 'Zurück → Schritt 1');
});

test('6b) Fertig am letzten Schritt löst die Abschluss-Aktion (Ziel-Sicht öffnen)', async () => {
  const { V } = await frischMitDepot();
  V.betreteApp();
  const def = V.WIZARD_BY_ID.gebwiz;
  V.wizardLauf('gebwiz');
  // bis zum letzten Schritt blättern
  for (let i = 0; i < def.schritte.length - 1; i++) V.wizardWeiter();
  assert.equal(V.getWizardState().wizardSchrittIndex, def.schritte.length - 1, 'am letzten Schritt');
  V.wizardWeiter();   // = Fertig
  const vs = V.getViewState();
  assert.equal(vs.aktiveAnsicht, 'situation', 'Ziel-Situation geöffnet');
  assert.equal(vs.aktiveSituationId, 'geburt');
  assert.equal(V.getWizardState().aktiverWizardId, null, 'Wizard geschlossen');
});

test('7) Ziel-Generik: wizardZielSetzen/Lesen dispatchen über { sektor } UND { situation }', async () => {
  const { V } = await frischMitDepot();
  // Situations-Ziel
  const sitDef = { id: 'tsit', ziel: { situation: 'geburt' } };
  V.wizardZielSetzen(sitDef, 'geburt_klinik', 'X-Klinik');
  assert.equal(V.wizardZielLesen(sitDef).geburt_klinik, 'X-Klinik');
  // Sektor-Ziel (z. B. Bereich 8)
  const sekDef = { id: 'tsek', ziel: { sektor: 'advanceCare' } };
  V.wizardZielSetzen(sekDef, 'testament_ort', 'beim Notar');
  assert.equal(V.wizardZielLesen(sekDef).testament_ort, 'beim Notar');
  assert.equal(V.getData().sektoren.advanceCare.testament_ort, 'beim Notar', 'Sektor-Pfad identisch zur manuellen Eingabe');
});

test('8) wizardFehlerText bildet Validierungs-Gründe auf STRINGS ab', async () => {
  const { V } = await frischMitDepot();
  assert.equal(V.wizardFehlerText('datum'), V.STRINGS.feldFehlerDatum);
  assert.equal(V.wizardFehlerText('pflicht'), V.STRINGS.feldFehlerPflicht);
  assert.equal(V.wizardFehlerText('irgendwas'), V.STRINGS.feldFehlerPflicht, 'Default = Pflicht-Phrase');
});

test('9) unbekannter Wizard startet nicht (toast statt Crash)', async () => {
  const { V } = await frischMitDepot();
  V.betreteApp();
  assert.equal(V.wizardLauf('gibtsnicht'), false);
  assert.equal(V.getViewState().aktiveAnsicht, 'sektor', 'Ansicht unverändert');
});
