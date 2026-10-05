'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Herkunft eines FHIR-Pakets aus einem Quell-Stand (U2-ADR-468) — tools/fhir-paket-herkunft-vergleichen.js
   ───────────────────────────────────────────────────────────────────────────
   Ein Paket kommt nur ins Manifest, wenn sein Inhalt mit dem Tag des lizenzierten Repos übereinstimmt. Geprüft:
     · was der Paketbau ergänzt (snapshot, text, Metadaten, Reihenfolge), ist kein Unterschied;
     · jede Abweichung im differential, im compose oder in einem Konzept ist einer — Rot-Beweis je Art;
     · verfolgt wird die Hülle ab dem Start (Extension, ValueSet, CodeSystem), nicht nur das Startprofil;
     · fehlt eine Ressource in der Quelle oder der Start im Paket, ist das kein „gleich“.
   Rot-Beweise an Wegwerf-Kopien der Fixture, nie an der Fixture selbst.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { vergleichen } = require('../tools/fhir-paket-herkunft-vergleichen.js');

const FIXTURE = path.join(__dirname, 'fixtures', 'paket-herkunft');
const WERKZEUG = path.join(__dirname, '..', 'tools', 'fhir-paket-herkunft-vergleichen.js');
const B = 'https://example.org/fhir';
const START = [B + '/StructureDefinition/BeispielDokument'];

function kopie(t) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'paket-herkunft-'));
  t.after(() => fs.rmSync(d, { recursive: true, force: true }));
  fs.cpSync(FIXTURE, d, { recursive: true });
  return d;
}
function aendern(datei, f) {
  const r = JSON.parse(fs.readFileSync(datei, 'utf8'));
  f(r);
  fs.writeFileSync(datei, JSON.stringify(r));
}
const imPaket = (d, name) => path.join(d, 'paket', 'package', name);

test('[Paket-Herkunft] die Fixture: gleich, obwohl das Paket snapshot, text, Metadaten und eine andere Reihenfolge trägt', () => {
  const e = vergleichen(path.join(FIXTURE, 'paket'), path.join(FIXTURE, 'quelle'), START);
  assert.equal(e.urteil, 'gleich');
  assert.deepEqual(e.gleich, [B + '/CodeSystem/beispiel-typ', B + '/StructureDefinition/BeispielDokument',
    B + '/StructureDefinition/beispiel-herkunft', B + '/ValueSet/beispiel-typ'], 'die Hülle: Profil, Extension, ValueSet, CodeSystem');
  assert.deepEqual(e.ausserhalb, ['http://hl7.org/fhir/StructureDefinition/DocumentReference', 'http://hl7.org/fhir/StructureDefinition/Extension']);
});

test('[Paket-Herkunft·Rot] eine Abweichung im differential, im compose oder in einem Konzept ist ungleich', (t) => {
  const faelle = [
    ['StructureDefinition-BeispielDokument.json', (r) => { r.differential.element[0].min = 0; }, B + '/StructureDefinition/BeispielDokument'],
    ['StructureDefinition-beispiel-herkunft.json', (r) => { r.differential.element[0].type[0].code = 'code'; }, B + '/StructureDefinition/beispiel-herkunft'],
    ['ValueSet-beispiel-typ.json', (r) => { r.compose.include[0].concept = [{ code: 'brief' }]; }, B + '/ValueSet/beispiel-typ'],
    ['CodeSystem-beispiel-typ.json', (r) => { r.concept[0].display = 'Anders'; }, B + '/CodeSystem/beispiel-typ'],
  ];
  for (const [datei, f, url] of faelle) {
    const d = kopie(t);
    aendern(imPaket(d, datei), f);
    const e = vergleichen(path.join(d, 'paket'), path.join(d, 'quelle'), START);
    assert.equal(e.urteil, 'ungleich', datei);
    assert.deepEqual(e.ungleich, [url], datei);
  }
});

test('[Paket-Herkunft·Rot] fehlt eine Ressource in der Quelle oder der Start im Paket, ist das nicht gleich', (t) => {
  const d = kopie(t);
  fs.rmSync(path.join(d, 'quelle', 'fsh-generated', 'resources', 'CodeSystem-beispiel-typ.json'));
  const e = vergleichen(path.join(d, 'paket'), path.join(d, 'quelle'), START);
  assert.equal(e.urteil, 'ungleich');
  assert.deepEqual(e.fehltInQuelle, [B + '/CodeSystem/beispiel-typ']);
  const s = vergleichen(path.join(FIXTURE, 'paket'), path.join(FIXTURE, 'quelle'), [B + '/StructureDefinition/GibtEsNicht']);
  assert.equal(s.urteil, 'ungleich');
  assert.deepEqual(s.startFehlt, [B + '/StructureDefinition/GibtEsNicht']);
});

test('[Paket-Herkunft·CLI] ohne Argument Fixture und Exit 0; mit Abweichung Exit 1; unvollständige Argumente Exit 2', (t) => {
  assert.equal(spawnSync(process.execPath, [WERKZEUG], { encoding: 'utf8' }).status, 0);
  const d = kopie(t);
  aendern(imPaket(d, 'CodeSystem-beispiel-typ.json'), (r) => { r.concept.pop(); });
  const rot = spawnSync(process.execPath, [WERKZEUG, '--paket', path.join(d, 'paket'), '--quelle', path.join(d, 'quelle'), '--start', START[0]], { encoding: 'utf8' });
  assert.equal(rot.status, 1, rot.stdout);
  assert.match(rot.stdout, /ungleich: .*CodeSystem\/beispiel-typ/);
  assert.equal(spawnSync(process.execPath, [WERKZEUG, '--paket', d], { encoding: 'utf8' }).status, 2);
});

test('[Paket-Herkunft·Codes] FSH-Quelle: genannte Konzepte mit wörtlich gleichem display sind gleich; ein anderes display, ein fehlender Code und ein ValueSet-Konzept nicht', (t) => {
  const { codesVergleichen } = require('../tools/fhir-paket-herkunft-vergleichen.js');
  const CS = B + '/CodeSystem/beispiel-typ';
  const paket = path.join(FIXTURE, 'paket');
  const fsh = path.join(FIXTURE, 'quelle-fsh');
  assert.equal(codesVergleichen(paket, fsh, [CS + '|brief', CS + '|vollmacht']).urteil, 'gleich');
  // ein Code aus dem ValueSet-Block der FSH-Datei ist kein Konzept des CodeSystems
  assert.deepEqual(codesVergleichen(paket, fsh, [CS + '|fremd']).startFehlt, [CS + '|fremd']);
  const d = kopie(t);
  const datei = path.join(d, 'quelle-fsh', 'typ.fsh');
  fs.writeFileSync(datei, fs.readFileSync(datei, 'utf8').replace('#brief "Brief"', '#brief "Briefe"'));
  const e = codesVergleichen(path.join(d, 'paket'), path.join(d, 'quelle-fsh'), [CS + '|brief']);
  assert.equal(e.urteil, 'ungleich');
  assert.equal(e.ungleich.length, 1);
  fs.writeFileSync(datei, fs.readFileSync(datei, 'utf8').replace('* #vollmacht', '// entfernt'));
  assert.deepEqual(codesVergleichen(path.join(d, 'paket'), path.join(d, 'quelle-fsh'), [CS + '|vollmacht']).fehltInQuelle, [CS + '|vollmacht']);
});
