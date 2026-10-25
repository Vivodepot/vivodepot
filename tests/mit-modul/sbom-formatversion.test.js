'use strict';
/* sbom-formatversion.test.js — die SBOM in einer Formatversion, die BSI TR-03183-2 zulässt (23.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Befund SBOM-CYCLONEDX-UNTER-1-6 (HOCH): vivodepot.sbom.cdx.json war CycloneDX 1.4. BSI TR-03183-2 v2.1.0 §4
   verlangt für eine neu erzeugte oder aktualisierte SBOM CycloneDX 1.6 oder höher (oder SPDX 3.0.1 oder höher); die
   Übergangsfrist nach §7 ist abgelaufen. Die Datei war auch gegen 1.4 nicht gültig: Komponenten vom Typ `data` und
   `annotations` gibt es erst ab 1.5, und 1.6 verlangt je Anmerkung `annotator` und `timestamp`.
   Jetzt setzt tools/sbom-pflegen.js die Fassung selbst (CYCLONEDX_VERSION), und die erzeugte SBOM wird hier gegen das
   offizielle 1.6-Schema geprüft (tests/fixtures/cyclonedx-1.6/, Herkunft und Prüfsummen im README dort).
   PRÜFUNG: Ajv 8 (in package.json gepinnt), Standard-Strenge, offline — Verweise lösen nur zwischen den drei Dateien
   auf. Die vier Formate des Schemas sind hier ausdrücklich geprüft statt übergangen (ajv-formats ist nicht
   eingebunden); `meta:enum` ist ein reines Beschreibungsfeld des Schemas.
   ROT-BEWEISE: die SBOM in der Fassung vor dem Umstieg (Anmerkungen ohne annotator/timestamp) fällt im selben
   Validator; eine geänderte Schemadatei fällt an der Prüfsumme. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const Ajv = require('ajv');
const S = require('../../tools/sbom-pflegen.js');

const REPO = path.join(__dirname, '..', '..');
const SCHEMA_ORDNER = path.join(__dirname, '..', 'fixtures', 'cyclonedx-1.6');
const SBOM = JSON.parse(fs.readFileSync(path.join(REPO, 'vivodepot.sbom.cdx.json'), 'utf8'));

/* Die Prüfsummen aus dem README des Schema-Ordners, je Zeile `| \`<datei>\` | <bytes> | \`<sha256>\` |`. */
function pruefsummenAusReadme() {
  const text = fs.readFileSync(path.join(SCHEMA_ORDNER, 'README.md'), 'utf8');
  return new Map([...text.matchAll(/^\| `([a-z0-9.-]+\.schema\.json)` \| \d+ \| `([0-9a-f]{64})` \|$/gm)].map((m) => [m[1], m[2]]));
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/* CycloneDX-Version als Zahlenpaar; true, wenn sie mindestens `min` ist. */
function mindestens(version, min) {
  const [a, b] = String(version).split('.').map(Number);
  const [x, y] = min.split('.').map(Number);
  return a > x || (a === x && b >= y);
}

/* Ein Validator für bom-1.6.schema.json samt seinen zwei Verweisen. */
function validator16() {
  const lade = (f) => JSON.parse(fs.readFileSync(path.join(SCHEMA_ORDNER, f), 'utf8'));
  const ajv = new Ajv({
    allErrors: true,
    formats: {
      'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
      uri: (s) => { try { new URL(s); return true; } catch { return false; } },
      'iri-reference': /^\S*$/,
      'idn-email': /^[^\s@]+@[^\s@]+$/,
    },
  });
  ajv.addKeyword('meta:enum');
  ajv.addSchema(lade('spdx.schema.json'));
  ajv.addSchema(lade('jsf-0.82.schema.json'));
  return ajv.compile(lade('bom-1.6.schema.json'));
}

const fehler = (v) => (v.errors || []).map((e) => e.instancePath + ' ' + e.message);

test('[SBOM·Format] die SBOM ist CycloneDX und nennt ihr Schema', () => {
  assert.equal(SBOM.bomFormat, 'CycloneDX');
  assert.equal(SBOM.$schema, S.CYCLONEDX_SCHEMA);
  assert.equal(SBOM.specVersion, S.CYCLONEDX_VERSION);
});

test('[SBOM·Format·TR-03183] die SBOM ist CycloneDX 1.6 oder höher', () => {
  assert.ok(mindestens(SBOM.specVersion, '1.6'), 'specVersion ' + SBOM.specVersion);
});

test('[SBOM·Format·Schema] die SBOM ist gültig gegen das CycloneDX-1.6-Schema', () => {
  const v = validator16();
  assert.ok(v(SBOM), fehler(v).join('; '));
});

test('[SBOM·Format·Schema] die Schemadateien sind die aus dem README (Quelle CycloneDX/specification 1.6.2)', () => {
  const soll = pruefsummenAusReadme();
  assert.deepEqual([...soll.keys()].sort(), ['bom-1.6.schema.json', 'jsf-0.82.schema.json', 'spdx.schema.json']);
  for (const [datei, wert] of soll) assert.equal(sha256(fs.readFileSync(path.join(SCHEMA_ORDNER, datei))), wert, datei);
});

test('[SBOM·Format·Rot-Beweis] die SBOM vor dem Umstieg fällt im selben Validator', () => {
  const vorher = JSON.parse(JSON.stringify(SBOM));
  vorher.specVersion = '1.4';
  delete vorher.$schema;
  vorher.annotations = vorher.annotations.map(({ subjects, text }) => ({ subjects, text }));
  const v = validator16();
  assert.equal(v(vorher), false);
  const f = fehler(v);
  assert.ok(f.some((z) => /annotations\/0 must have required property 'annotator'/.test(z)), f.join('; '));
  assert.ok(f.some((z) => /annotations\/0 must have required property 'timestamp'/.test(z)), f.join('; '));
});

test('[SBOM·Format·Rot-Beweis] ein falscher Zeitstempel fällt am geprüften Format', () => {
  const kaputt = JSON.parse(JSON.stringify(SBOM));
  kaputt.metadata.timestamp = '23.10.2026';
  const v = validator16();
  assert.equal(v(kaputt), false);
  assert.ok(fehler(v).some((z) => z.startsWith('/metadata/timestamp must match format "date-time"')), fehler(v).join('; '));
});

test('[SBOM·Format·Rot-Beweis] eine geänderte Schemadatei fällt an der Prüfsumme', () => {
  const echt = fs.readFileSync(path.join(SCHEMA_ORDNER, 'spdx.schema.json'));
  assert.notEqual(sha256(Buffer.concat([echt, Buffer.from(' ')])), pruefsummenAusReadme().get('spdx.schema.json'));
});

test('[SBOM·Format·Rot-Beweis] der Vergleich unterscheidet 1.4, 1.5, 1.6 und 1.7', () => {
  assert.equal(mindestens('1.4', '1.6'), false);
  assert.equal(mindestens('1.5', '1.6'), false);
  assert.equal(mindestens('1.6', '1.6'), true);
  assert.equal(mindestens('1.7', '1.6'), true);
  assert.equal(mindestens('2.0', '1.6'), true);
});

test('[SBOM·Format] der Erzeuger ergänzt fehlende Anmerkungsfelder und behält vorhandene', () => {
  const a = S.annotationNach16({ subjects: ['x'], text: 't' }, '2026-10-23T00:00:00Z');
  assert.deepEqual(a, { subjects: ['x'], annotator: { organization: { name: 'Vivodepot GmbH' } }, timestamp: '2026-10-23T00:00:00Z', text: 't' });
  const b = S.annotationNach16({ subjects: ['x'], annotator: { individual: { name: 'y' } }, timestamp: '2026-01-01T00:00:00Z', text: 't' }, '2026-10-23T00:00:00Z');
  assert.equal(b.timestamp, '2026-01-01T00:00:00Z');
  assert.deepEqual(b.annotator, { individual: { name: 'y' } });
});
