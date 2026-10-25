'use strict';
/* sbom-codelisten-vollstaendig.test.js — jede eingebundene Codeliste steht in der SBOM (23.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Befund SBOM-CODELISTE-FEHLT: tools/sbom-pflegen.js nannte vier Codelisten in einer festen Liste. ISO 4217
   (U2-ADR-480), ESCO und XÖV-Rollencode standen als `@vd-codeliste`-Block im Kern und in NOTICE.md, aber nicht in
   der SBOM; kein Wächter verlangte es. Jetzt wird jede Quelle unter code-listen/ zur Komponente, und eine neue
   Quelle ohne Komponente bricht die Erzeugung ab.
   ROT-BEWEISE: eine gepflanzte Quelle ohne Komponente bricht die Erzeugung ab; eine SBOM ohne die ISO-4217-Komponente
   fällt in derselben Prüfung, die hier die echte SBOM prüft. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../tools/sbom-pflegen.js');

const REPO = path.join(__dirname, '..');
const lies = (f) => fs.readFileSync(path.join(REPO, f), 'utf8');
const SBOM = JSON.parse(lies('vivodepot.sbom.cdx.json'));
const KERN = lies('vivodepot.html');

/* Die systemIds der Codelisten-Blöcke im Kern, gelesen am Block selbst (`/* @vd-codeliste <systemId> — …`). */
function codelistenImKern(html) {
  return [...new Set([...html.matchAll(/\/\* @vd-codeliste ([A-Za-z0-9-]+) /g)].map((m) => m[1]))].sort();
}

/* Je systemId: fehlt eine Komponente mit Dateiname code-listen/<systemId>.json und dem SHA-256 des Blocks? */
function fehlendeKomponenten(systemIds, sbom, quellen) {
  const fehlend = [];
  for (const id of systemIds) {
    const quelle = quellen.find((l) => l.systemId === id);
    const soll = quelle ? crypto.createHash('sha256').update(S.codeListenBlockText(quelle)).digest('hex') : null;
    const k = sbom.components.find((c) => (c.properties || []).some((p) => p.name === 'bsi:component:filename' && p.value === 'code-listen/' + id + '.json'));
    const sha = k && (k.hashes || []).find((h) => h.alg === 'SHA-256');
    if (!k || !sha || sha.content !== soll) fehlend.push(id);
  }
  return fehlend;
}

test('[SBOM·Codelisten] jede Codeliste im Kern steht in der SBOM, mit Dateiname und dem Hash ihres Blocks', () => {
  const imKern = codelistenImKern(KERN);
  assert.ok(imKern.length >= 7, 'Vorbedingung: die Codelisten-Blöcke werden gefunden (' + imKern.join(', ') + ')');
  assert.ok(imKern.includes('iso4217'), 'Vorbedingung: ISO 4217 ist eingebunden (U2-ADR-480)');
  assert.deepEqual(fehlendeKomponenten(imKern, SBOM, S.ladeCodeListenQuellen()), []);
});

test('[SBOM·Codelisten] jede Quelle unter code-listen/ hat eine Komponente, und jeder Block im Kern hat eine Quelle', () => {
  const quellen = S.ladeCodeListenQuellen().map((l) => l.systemId).sort();
  assert.deepEqual(S.codeListenKomponenten(S.ladeCodeListenQuellen()).map(([id]) => id), quellen);
  assert.deepEqual(codelistenImKern(KERN), quellen);
});

test('[SBOM·Codelisten·Rot-Beweis] eine gepflanzte Quelle ohne Komponente bricht die Erzeugung ab', () => {
  const gepflanzt = S.ladeCodeListenQuellen().concat([{ systemId: 'zz-probe', version: '1', lizenz: 'x', daten: [] }]);
  assert.throws(() => S.codeListenKomponenten(gepflanzt), /Codeliste zz-probe .* hat keine SBOM-Komponente/);
});

test('[SBOM·Codelisten·Rot-Beweis] eine SBOM ohne die ISO-4217-Komponente oder mit falschem Hash fällt', () => {
  const quellen = S.ladeCodeListenQuellen();
  const ohne = Object.assign({}, SBOM, { components: SBOM.components.filter((c) => c.name !== 'code-liste-iso4217') });
  assert.deepEqual(fehlendeKomponenten(['iso4217'], ohne, quellen), ['iso4217']);
  const falsch = JSON.parse(JSON.stringify(SBOM));
  const k = falsch.components.find((c) => c.name === 'code-liste-iso4217');
  assert.ok(k, 'Vorbedingung: die echte SBOM führt code-liste-iso4217');
  k.hashes = k.hashes.map((h) => (h.alg === 'SHA-256' ? { alg: h.alg, content: '0'.repeat(64) } : h));
  assert.deepEqual(fehlendeKomponenten(['iso4217'], falsch, quellen), ['iso4217']);
});
