'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Template-Generator: Allergene mit SNOMED CT aus dem Global Patient Set (U2-ADR-446)
   ────────────────────────────────────────────────────────────────────────
   Am 26.09.2026 wurden Peanut und Tree nut aus dem Generator genommen, weil sie
   bei SNOMED International noch angefragt waren und der Generator ins Register
   ausgeliefert wird. Seit der Antwort vom 28.09.2026 gilt das Nutzungsmuster:
   jedes aktive GPS-Konzept, unveränderter Begriff, keine Hierarchie. Beide
   Konzepte sind aktiv im gepinnten Release und stehen unter den genutzten.

   Die Vorschlagsliste und das Beispiel „Anamnese“ tragen sie wieder. Der deutsche
   Name steht als `anzeige` (die Beschriftung der Auswahl); der Kern gibt als
   FHIR-display nur den Begriff seiner eigenen Liste aus, nie diese Beschriftung.

   ROT-BEWEIS: am Stand vor diesem Commit ist die Liste leer und „Bekannte
   Allergien“ Freitext ohne Code — beide Proben fallen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');
const { freigegebeneKennungen } = require('../tools/lib/snomed-positivliste.js');

const REPO = path.join(__dirname, '..');
const SNOMED = 'http://snomed.info/sct';
// Zur Laufzeit gefügt, damit der Kennungs-Erkenner diese Probe nicht selbst als Nutzung zählt.
const PEANUT = ['7629', '52008'].join('');
const TREE_NUT = ['4425710', '00124108'].join('');

test('[Generator·SNOMED-Allergene] die Vorschlagsliste trägt Peanut und Tree nut, beide aktiv im gepinnten GPS-Release', () => {
  const { V } = ladeGenerator();
  const liste = V.VD_CODE_LISTEN.snomedAllergen;
  assert.equal(liste.uri, SNOMED);
  const codes = Array.from(liste.daten, (d) => String(d.code)).sort();
  assert.deepEqual(codes, [TREE_NUT, PEANUT].sort());
  const frei = freigegebeneKennungen(REPO);
  for (const c of codes) assert.ok(frei.has(c), c + ' steht nicht unter den genutzten Kennungen (tools/snomed-freigabe.json)');
  for (const d of liste.daten) assert.ok(d.anzeige && !/peanut|tree nut/i.test(d.anzeige), 'die Beschriftung ist der deutsche Name, nicht der SNOMED-Begriff: ' + d.anzeige);
});

test('[Generator·SNOMED-Allergene] das Beispiel „Anamnese“ codiert „Bekannte Allergien“ mit denselben zwei Konzepten', () => {
  const { V } = ladeGenerator();
  const feld = V.BEISPIEL_TEMPLATES.anamnese.felder.find((f) => f.feldname === 'Bekannte Allergien');
  assert.ok(feld, 'Feld „Bekannte Allergien“ fehlt im Beispiel');
  assert.equal(feld.feldtyp, 'mehrfachauswahl');
  assert.equal(feld.codeSystem, SNOMED);
  assert.deepEqual(Array.from(feld.codeWerte, (c) => String(c.code)).sort(), [TREE_NUT, PEANUT].sort());
});

/* ── Befund GENERATOR-CODESYSTEM-SCHLUESSEL (29.09.2026): die Tabelle „welche Code-Systeme bei welchem Bereich“
   war mit gesundheit/verwaltung/bildung geschlüsselt, die Bereichs-IDs heißen health/administration/education.
   Im Editor bot darum kein Bereich ein Code-System an — auch die Allergen-Vorschläge oben wären nie erschienen.
   ROT-BEWEIS: am Stand vor diesem Commit liefert codeSystemeFuerBereich('health') eine leere Liste. */
test('[Generator·Code-Systeme] der Bereich Gesundheit bietet LOINC, ICD-10-GM, ATC und die SNOMED-Allergene an', () => {
  const { V } = ladeGenerator();
  const sys = Array.from(V.codeSystemeFuerBereich('health'), String);
  for (const id of ['loinc', 'icd10', 'atc', 'snomedAllergen']) assert.ok(sys.includes(id), id + ' fehlt bei health: ' + sys.join(', '));
});

test('[Generator·Code-Systeme·Klasse] jeder Schlüssel der Tabelle ist eine Bereichs-ID, jeder Eintrag eine Code-Liste, jede URI einmal', () => {
  const { V } = ladeGenerator();
  const bereiche = new Set(Array.from(V.BEREICHE, String));
  for (const [bereich, ids] of Object.entries(V.BEREICH_CODESYSTEME)) {
    assert.ok(bereiche.has(bereich), 'kein Bereich mit der ID „' + bereich + '“ — die Code-Systeme dort erscheinen nie');
    for (const id of ids) assert.ok(Object.prototype.hasOwnProperty.call(V.VD_CODE_LISTEN, id), bereich + ': unbekannte Code-Liste ' + id);
    const uris = Array.from(ids, (id) => V.VD_CODE_LISTEN[id].uri);
    assert.equal(new Set(uris).size, uris.length, bereich + ': dieselbe URI steht mehrfach zur Wahl — ' + uris.join(', '));
  }
});
