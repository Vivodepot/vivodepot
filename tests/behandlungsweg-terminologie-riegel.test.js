'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Der Riegel gegen ICD-O-3 und TNM
   (Bauplan zur Vorlage Mein Behandlungsweg, 15.09.2026,
   Abschnitt 1.3 und 1.4c)
   ────────────────────────────────────────────────────────────────────────
   WARUM GERADE DIESE ZWEI: Beide liegen fuer eine gynaekologisch-onkologische
   Vorlage nahe und sind beide gesperrt.

   ICD-O-3: Die BfArM-Downloadbedingungen (Teil V, § 1 Nr. 3 bis 5) binden die
   Klassifikation an „innerhalb der Landesgrenzen der Bundesrepublik
   Deutschland" und schliessen den Einsatz „in Verbindung mit … Marketing oder
   zu Werbezwecken" aus. Eine verkaufte App und eine Vertriebs-Demo fallen
   beide heraus.

   TNM: Verlagswerk (UICC, deutsch bei Wiley-VCH). Freie Nutzungsbedingungen
   sind nicht belegt.

   DER RIEGEL HAT ZWEI SEITEN:
   1. Nichts Ausgeliefertes traegt eine dieser URIs (`code-listen/*.json`).
   2. Der Kern nimmt auch keine mitgebrachte Liste damit an — A110 laesst nur
      eine bei uns gefuehrte Terminologie zu. Die zweite Probe ist die
      wichtigere: sie haelt auch das, was ein FREMDES Modul mitbringen wollte.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const CODE_LISTEN = path.join(REPO, 'code-listen');

/* Die Schreibweisen, unter denen die beiden Systeme in FHIR-Umgebungen
   auftauchen — Grossschreibung egal, Teilstring genuegt. */
const GESPERRT = Object.freeze([
  'icd-o-3', 'icd-o3', 'icdo3', 'sid/icd-o', 'uicc', 'tnm',
]);

function gesperrterTreffer(text) {
  const t = String(text || '').toLowerCase();
  return GESPERRT.find((m) => t.includes(m)) || null;
}

test('Keine ausgelieferte Code-Liste traegt ICD-O-3 oder TNM', () => {
  const treffer = [];
  for (const datei of fs.readdirSync(CODE_LISTEN).filter((d) => d.endsWith('.json'))) {
    const liste = JSON.parse(fs.readFileSync(path.join(CODE_LISTEN, datei), 'utf8'));
    for (const feld of ['systemId', 'uri', 'kuerzel']) {
      const m = gesperrterTreffer(liste[feld]);
      if (m) treffer.push(datei + ' -> ' + feld + ' enthaelt ' + m);
    }
  }
  assert.deepEqual(treffer, [], treffer.join('; '));
});

test('Positivkontrolle — der Erkenner erkennt die gesperrten Schreibweisen wirklich', () => {
  assert.equal(gesperrterTreffer('http://terminology.hl7.org/CodeSystem/icd-o-3'), 'icd-o-3');
  assert.equal(gesperrterTreffer('https://www.uicc.org/tnm'), 'uicc');
  assert.equal(gesperrterTreffer('http://hl7.org/fhir/sid/icd-10-gm'), null, 'die erlaubte ICD-10-GM darf NICHT anschlagen');
});

test('Der Kern nimmt eine mitgebrachte Liste mit ICD-O-3-URI nicht an (A110)', () => {
  const { V } = ladeKern();
  const tpl = {
    felder: [{ feldname: 'Histologie', feldtyp: 'text', pflicht: false, bereich: 'health', codeSystem: 'icdO3' }],
    codeListen: [{
      systemId: 'icdO3', uri: 'http://terminology.hl7.org/CodeSystem/icd-o-3',
      kuerzel: 'ICD-O-3', eintraege: [{ code: '8441/3', anzeige: 'Serioeses Karzinom' }],
    }],
  };
  const grund = V.validateTemplate(tpl);
  assert.notEqual(grund, null, 'eine Liste mit gesperrter Terminologie muss benannt abgelehnt werden');
});

test('Gegenprobe — dieselbe Vorlage mit ICD-10-GM wird angenommen', () => {
  const { V } = ladeKern();
  const tpl = {
    felder: [{ feldname: 'Diagnose aus dem Schreiben', feldtyp: 'text', pflicht: false, bereich: 'health', codeSystem: 'icd10' }],
    codeListen: [{
      systemId: 'icd10', uri: 'http://hl7.org/fhir/sid/icd-10-gm',
      kuerzel: 'ICD-10-GM', eintraege: [{ code: 'C56', anzeige: 'Boesartige Neubildung des Ovars' }],
    }],
  };
  assert.equal(V.validateTemplate(tpl), null, 'die erlaubte Terminologie muss durchkommen — sonst prueft der Riegel nichts');
});
