'use strict';
/* ════════════════════════════════════════════════════════════════════════
   tools/fim-schema-beschaffen.mjs — Schema, Codelisten und amtliches XSD holen, ohne Inhalt ins Repo zu tragen
   ────────────────────────────────────────────────────────────────────────
   Gegen die erfundene Fixture tests/fixtures/fim-schema/ (Kennungen aus dem Nummernkreis 99), mit einem fetch-Ersatz:
   kein Netz. Rot-Beweise: ein unbekanntes Schema, eine fehlende Codeliste und ein Umwandler, der kein XSD liefert,
   brechen ab, statt eine halbe Ablage zu schreiben.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const laden = () => import('../tools/fim-schema-beschaffen.mjs');
function ordner(t) { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'fim-schema-probe-')); t.after(() => fs.rmSync(d, { recursive: true, force: true })); return d; }

test('[FIM-Schema·Kopf] nur Kennung, Fassung, Generation und Codelisten-Kennungen werden gelesen', async () => {
  const { schemaKopf, codelistenAusXdf, FIXTURE } = await laden();
  const xdf = fs.readFileSync(path.join(FIXTURE, 'S99000001_V1.0.xdf.xml'), 'utf8');
  assert.deepEqual(schemaKopf(xdf), { kennung: 'S99000001', fassung: '1.0', generation: 2 });
  assert.deepEqual(codelistenAusXdf(xdf), ['urn:beispiel:codeliste:farbe_1']);
  assert.throws(() => schemaKopf('<irgendwas/>'), /kein FIM-Stammdatenschema/);
});

test('[FIM-Schema·Beschaffen] Schema, Codeliste und XSD landen im Ziel, das Manifest trägt Prüfsumme und Freigabestatus', async (t) => {
  const { beschaffen, fixtureHolen } = await laden();
  const ziel = ordner(t);
  const zeilen = await beschaffen({ schema: 'S99000001', fassung: '1.0', ziel, holen: fixtureHolen(), heute: '2000-01-01' });
  assert.deepEqual(zeilen.map((z) => z.datei), ['S99000001_V1.0.xdf.xml', 'urn_beispiel_codeliste_farbe_1.gc.xml', 'S99000001_V1.0.xsd']);
  const manifest = JSON.parse(fs.readFileSync(path.join(ziel, 'MANIFEST-schemata.json'), 'utf8'));
  const xdf = manifest.find((z) => z.datei === 'S99000001_V1.0.xdf.xml');
  assert.equal(xdf.freigabestatus, 6);
  assert.match(xdf.sha256, /^[0-9a-f]{64}$/);
  for (const z of manifest) assert.ok(fs.existsSync(path.join(ziel, z.datei)), z.datei);
  // Ein zweiter Lauf ersetzt die Zeilen derselben Dateien, statt sie doppelt zu führen.
  await beschaffen({ schema: 'S99000001', fassung: '1.0', ziel, holen: fixtureHolen(), heute: '2000-01-02' });
  const zwei = JSON.parse(fs.readFileSync(path.join(ziel, 'MANIFEST-schemata.json'), 'utf8'));
  assert.equal(zwei.length, 3);
  assert.ok(zwei.every((z) => z.abgerufen === '2000-01-02'));
});

test('[FIM-Schema·Rot-Beweis] unbekanntes Schema, fehlende Codeliste und ein Umwandler ohne XSD brechen ab', async (t) => {
  const { beschaffen, fixtureHolen, XREPOSITORY, PORTAL } = await laden();
  await assert.rejects(beschaffen({ schema: 'S99000001', fassung: '9.9', ziel: ordner(t), holen: fixtureHolen() }), /steht nicht im FIM-Portal/);
  const ohneCodeliste = async (url, opt) => (url.startsWith(XREPOSITORY) ? { ok: false, status: 404, text: async () => 'nein' } : fixtureHolen()(url, opt));
  await assert.rejects(beschaffen({ schema: 'S99000001', fassung: '1.0', ziel: ordner(t), holen: ohneCodeliste }), /404/);
  const ohneXsd = async (url, opt) => (url === PORTAL + '/tools/xdf2-xsd-converter'
    ? { ok: true, status: 200, text: async () => '{}', arrayBuffer: async () => Buffer.from('{"detail":"Missing code lists"}') } : fixtureHolen()(url, opt));
  await assert.rejects(beschaffen({ schema: 'S99000001', fassung: '1.0', ziel: ordner(t), holen: ohneXsd }), /kein XSD/);
  await assert.rejects(beschaffen({ schema: 'X1', fassung: '1.0', ziel: ordner(t), holen: fixtureHolen() }), /Pflicht/);
});
