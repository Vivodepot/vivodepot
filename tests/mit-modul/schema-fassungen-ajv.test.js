'use strict';
/* Jede ausgelieferte Schema-Fassung lässt sich mit Ajv 2020 im Strict-Modus übersetzen (U2-ADR-488, 06.10.2026).
   Anlass: ein Annotationsfeld im Schema („x-vivodepot-fassung“) hätte Ajv 8 schon in der Standard-Einstellung
   gebrochen („strict mode: unknown keyword“) — unsere Proben und jeden Integrator. Diese Klasse soll nicht wiederkommen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Ajv2020 = require('ajv/dist/2020');
const S = require('../../tools/schema-fassungen.js');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..', '..');
// Ajv 2020 mit strictSchema (der Teil des Strict-Modus, der unbekannte Schlüsselwörter abweist — die Klasse, um die es
// geht). Die Stil-Prüfungen strictTypes, strictTuples und strictRequired bleiben aus: submission-schema nutzt gültige
// Muster, die sie anmahnen („anyOf: [{ required: [a] }, …]“, „minItems“ ohne „type: array“ in einem then-Zweig). Ajvs
// eigene Voreinstellung wirft bei ihnen ebenfalls nicht. validateFormats aus, weil „date-time“ ohne ajv-formats unbekannt ist.
const OPTIONEN = { strictSchema: true, strictTypes: false, strictTuples: false, strictRequired: false, validateFormats: false, allErrors: true };
const VERZ = S.verzeichnisLesen(fs.readFileSync(path.join(REPO, S.VERZEICHNIS), 'utf8'));

test('[Schema-Fassungen·Ajv strict] jede ausgelieferte Datei übersetzt mit Ajv 2020, strict', () => {
  const inhalt = S.ordnerInhalt({ verzeichnis: VERZ });
  const dateien = Object.keys(inhalt).filter((r) => r !== 'schemas/index.json');
  assert.ok(dateien.length >= 38, 'Nicht-leer-Wache: geltende und versionierte Fassungen');
  for (const rel of dateien) {
    const ajv = new Ajv2020(OPTIONEN);
    assert.doesNotThrow(() => ajv.compile(JSON.parse(inhalt[rel])), rel);
  }
});

test('[Schema-Fassungen·Ajv strict·Rot-Beweis] ein unbekanntes Schlüsselwort im Schema bricht die Übersetzung', () => {
  const rel = Object.keys(S.ordnerInhalt({ verzeichnis: VERZ })).find((r) => r.endsWith('-schema.json'));
  const s = JSON.parse(S.ordnerInhalt({ verzeichnis: VERZ })[rel]);
  s['x-vivodepot-fassung'] = 1;
  assert.throws(() => new Ajv2020(OPTIONEN).compile(s), /unknown keyword/);
});
