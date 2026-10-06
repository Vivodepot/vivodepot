'use strict';
/* ════════════════════════════════════════════════════════════════════════
   T-CROSS-08 — Submission-Schema-Konsistenz (KLASSE-A der Vier-Komponenten-Schicht)
   ────────────────────────────────────────────────────────────────────────
   Statische Cross-Component-Prüfung der Vertrauenskette Generator → VC-Issuer.
   Ergänzt T-A-05/T-A-06 der beiden Säulen, indem sie den GETEILTEN Vertrag als
   eigenständigen Architektur-Test absichert:

     1. Das eingebettete Submission-Schema ist im Template-Generator (Komponente 4)
        und im VC-Issuer (Komponente 3) byte-für-byte identisch — beide Komponenten
        reden über DENSELBEN Vertrag.
     2. Das eingebettete Schema stimmt mit der dokumentierten Quelle
        `docs/template-generator/submission-schema.json` überein.
     3. Das Beispiel-Submission-Paket (`beispiel-submission.json`) validiert
        gegen das Schema — geprüft über BEIDE Komponenten-Validatoren (Generator
        UND Issuer akzeptieren es), zusätzlich gegen das Datei-Schema.
     4. Negativ-Gegenprobe: ein manipuliertes Paket (Pflichtfeld entfernt) wird
        von beiden Validatoren abgelehnt — der Vertrag greift wirklich.

   BROWSER-FREI: nutzt die DOM-freien, bereits getesteten Validatoren der beiden
   Säulen (`_validateSchema`, `validiereSubmission`) über die Lade-Hilfen
   `load-generator.js` / `load-issuer.js`. SOFORT grün, kein Playwright nötig.
   Die HTMLs werden nur gelesen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('../load-generator.js');
const { ladeIssuer } = require('../load-issuer.js');

const REPO = path.join(__dirname, '..', '..');
const SCHEMA_DATEI = path.join(REPO, 'docs', 'template-generator', 'submission-schema.json');
const BEISPIEL_DATEI = path.join(REPO, 'docs', 'template-generator', 'beispiel-submission.json');

// Realm-Grenze (vm): über JSON normalisieren, damit Validatoren aus anderen
// vm-Kontexten reine, eigene Objekte sehen (gleiche Technik wie die Säulen-Tests).
const rein = (x) => JSON.parse(JSON.stringify(x));

test('[Klasse-A] T-CROSS-08: eingebettetes Schema in Generator und Issuer byte-identisch', () => {
  const { V: GEN } = ladeGenerator();
  const { V: ISS } = ladeIssuer();
  // Vergleich über kanonisches Stringify (Schlüssel rekursiv sortiert) —
  // reihenfolge-unabhängig, aber struktur-treu.
  const norm = (o) => JSON.stringify(sortTief(rein(o)));
  assert.equal(
    norm(GEN.SUBMISSION_SCHEMA), norm(ISS.SUBMISSION_SCHEMA),
    'Submission-Schema von Template-Generator und VC-Issuer weichen ab — geteilter Vertrag verletzt.',
  );
});

test('[Klasse-A] T-CROSS-08: eingebettetes Schema == dokumentierte Datei submission-schema.json', () => {
  const { V: GEN } = ladeGenerator();
  const { V: ISS } = ladeIssuer();
  const datei = JSON.parse(fs.readFileSync(SCHEMA_DATEI, 'utf8'));
  const norm = (o) => JSON.stringify(sortTief(rein(o)));
  assert.equal(norm(GEN.SUBMISSION_SCHEMA), norm(datei),
    'Template-Generator-Schema weicht von der dokumentierten Datei ab.');
  assert.equal(norm(ISS.SUBMISSION_SCHEMA), norm(datei),
    'VC-Issuer-Schema weicht von der dokumentierten Datei ab.');
});

test('[Klasse-A] T-CROSS-08: beispiel-submission.json valide gegen das Datei-Schema', () => {
  const { V: GEN } = ladeGenerator();
  const datei = JSON.parse(fs.readFileSync(SCHEMA_DATEI, 'utf8'));
  const beispiel = JSON.parse(fs.readFileSync(BEISPIEL_DATEI, 'utf8'));
  assert.deepEqual(
    rein(GEN._validateSchema(datei, beispiel)), [],
    'beispiel-submission.json validiert nicht gegen das Datei-Schema.',
  );
});

test('[Klasse-A] T-CROSS-08: beide Komponenten-Validatoren akzeptieren beispiel-submission.json', () => {
  const { V: GEN } = ladeGenerator();
  const { V: ISS } = ladeIssuer();
  const beispiel = JSON.parse(fs.readFileSync(BEISPIEL_DATEI, 'utf8'));
  // Der Generator produziert ein Paket nach diesem Muster …
  assert.deepEqual(rein(GEN.validiereSubmission(beispiel)), [],
    'Template-Generator-Validator lehnt das Beispiel-Paket ab.');
  // … und der VC-Issuer akzeptiert genau dasselbe Muster (Vertrauenskette).
  assert.deepEqual(rein(ISS.validiereSubmission(beispiel)), [],
    'VC-Issuer-Validator lehnt das Beispiel-Paket ab.');
});

test('[Klasse-A] T-CROSS-08: Negativ-Gegenprobe — manipuliertes Paket wird abgelehnt', () => {
  const { V: GEN } = ladeGenerator();
  const { V: ISS } = ladeIssuer();
  const beispiel = JSON.parse(fs.readFileSync(BEISPIEL_DATEI, 'utf8'));

  // Pflichtfeld entfernen → muss ungültig werden.
  const ohneAnbieter = rein(beispiel);
  delete ohneAnbieter.anbieter;
  assert.notDeepEqual(rein(GEN.validiereSubmission(ohneAnbieter)), [],
    'Generator-Validator akzeptiert fälschlich ein Paket ohne anbieter.');
  assert.notDeepEqual(rein(ISS.validiereSubmission(ohneAnbieter)), [],
    'Issuer-Validator akzeptiert fälschlich ein Paket ohne anbieter.');

  // Private-Key in der Submission (verbotenes 'd') → muss ungültig werden.
  const mitPrivat = rein(beispiel);
  mitPrivat.publicKeyJwk = Object.assign({}, mitPrivat.publicKeyJwk, { d: 'VERBOTEN-privat-key-material' });
  const datei = JSON.parse(fs.readFileSync(SCHEMA_DATEI, 'utf8'));
  assert.notDeepEqual(rein(GEN._validateSchema(datei, mitPrivat)), [],
    'Schema akzeptiert fälschlich ein Paket mit Private-Key-Material (d).');
});

/* Rekursives Schlüssel-Sortieren für kanonischen Vergleich. */
function sortTief(o) {
  if (Array.isArray(o)) return o.map(sortTief);
  if (o && typeof o === 'object') {
    const out = {};
    for (const k of Object.keys(o).sort()) out[k] = sortTief(o[k]);
    return out;
  }
  return o;
}
