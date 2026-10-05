'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Adapter 1edtech-validator (U2-ADR-445) — die Hülle, geprüft ohne Werkzeug
   ────────────────────────────────────────────────────────────────────────
   Läuft in der Node-Suite ohne Docker. Hält, was der Adapter VOR dem Prüferlauf zusichert: die Fälle
   kommen aus dem echten Kernweg und sind byte-gleich die Testdateien; ohne Werkzeug gibt es kein Urteil;
   die Pins im Adapter und im Dockerfile laufen gleich; die Registerzeile passt zu Adapter, Pins und Kern
   und trägt „echt" nur mit gemessenem Lauf. Den Lauf verlangt tests/ob3-1edtech-lauf.test.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const ADAPTER = path.join(__dirname, 'konformitaet', 'adapter', '1edtech-validator.mjs');
const REGISTER = path.join(REPO, 'tools', 'standards-register', 'json-schema.json');
const FX = path.join(__dirname, 'fixtures');
const laden = () => import(ADAPTER);
after(async () => (await laden()).aufraeumen());

test('[1edtech-validator] ohne Werkzeug: ungemessen mit Grund, und urteile() gibt kein Urteil', async () => {
  const a = (await laden()).default;
  const alt = process.env.OB3_VALIDATOR_AUS;
  process.env.OB3_VALIDATOR_AUS = '1';
  try {
    const v = a.vorhanden();
    assert.equal(v.ok, false);
    assert.match(v.grund, /nicht beschafft/);
    const u = a.urteile(v, '/egal', 'open-badges-3');
    assert.equal(u.gelesen, false, 'ein Urteil ohne Werkzeug wäre geraten');
    assert.equal(u.gueltig, false);
  } finally { if (alt === undefined) delete process.env.OB3_VALIDATOR_AUS; else process.env.OB3_VALIDATOR_AUS = alt; }
});

test('[1edtech-validator] artefakte(): je Testdatei ein kern-rundweg-Fall, byte-gleich mit der Datei, dazu die Datei selbst; jede Form hat einen gültigen Fall', async () => {
  const m = await laden();
  const faelle = await m.default.artefakte();
  assert.equal(faelle.length, 2 * m.BEISPIELE.length);
  for (const f of faelle.filter((x) => x.herkunft === 'kern-rundweg')) {
    const datei = m.BEISPIELE.find((b) => f.name === b.datei.replace(/\.[a-z]+$/, '') + '·kern-rundweg' && f.pfad.endsWith(path.extname(b.datei))).datei;
    assert.ok(Buffer.compare(fs.readFileSync(f.pfad), fs.readFileSync(path.join(FX, datei))) === 0, f.name + ': der Kern gibt etwas anderes heraus, als hereinkam');
  }
  for (const endung of ['.json', '.jwt', '.png', '.svg']) {
    assert.ok(m.BEISPIELE.some((b) => b.erwartet === 'gueltig' && b.datei.endsWith(endung)), 'kein gültiger Fall für ' + endung);
  }
});

test('[1edtech-validator] die Pins im Adapter und im Dockerfile laufen gleich', async () => {
  const m = await laden();
  const df = fs.readFileSync(path.join(REPO, m.WERKZEUG.dockerfile), 'utf8');
  for (const x of m.ARTEFAKTE) assert.ok(df.includes(x.sha256), x.id + ': im Dockerfile nicht gepinnt');
  assert.ok(df.includes(m.WERKZEUG.quelle.commit), 'Commit der Quelle fehlt im Dockerfile');
  assert.ok(!/^FROM [^@\n]+$/m.test(df), 'ein Basis-Image ohne Digest');
});

// Was an der Registerzeile nicht stimmt, als Liste — dieselbe Prüfung für den echten Bestand und den Rot-Beweis.
function registerFunde(r, m, V) {
  const f = [];
  if (r.adapter !== m.default.id) f.push('adapter ' + r.adapter);
  const pins = new Set(m.ARTEFAKTE.map((x) => x.id));
  for (const s of r.standards) {
    // Zeilen derselben Familie, über die dieser Adapter nicht urteilt (etwa Eigenformate oder eine Selbstauskunft, die
    // in tools/standards-register-pruefen.js ihren eigenen Prüfer nennen): sie dürfen nicht „echt“ sein, sonst nichts.
    if (!m.default.standards.includes(s.id)) { if (s.status === 'echt') f.push(s.id + ': echt, aber der Adapter urteilt diesen Standard nicht'); continue; }
    for (const aid of s.artefakte) if (!pins.has(aid)) f.push(s.id + ': Artefakt ohne Pin: ' + aid);
    for (const w of s.importwege) if (!V.IMPORT_FORMAT_BY_ID[w]) f.push(s.id + ': Importweg fehlt im Kern: ' + w);
    if (s.exportwege.length) f.push(s.id + ': Holder mit Exportweg (U2-ADR-097 §6)');
    if (s.richtung.includes('schreiben')) f.push(s.id + ': Holder schreibt keinen Bildungsnachweis');
    const g = s.gemessen;
    if (s.status === 'echt' && !(g && g.datum && g.probe && fs.existsSync(path.join(REPO, g.probe)))) f.push(s.id + ': echt ohne gemessenen Prüferlauf');
    if (s.status === 'echt' && !(s.lizenz && s.lizenz.status === 'geprueft')) f.push(s.id + ': echt ohne geprüfte Lizenz');
    if (s.werkzeugHerkunft !== m.WERKZEUG.herkunft) f.push(s.id + ': Herkunft des Werkzeugs nicht „' + m.WERKZEUG.herkunft + '"');
  }
  for (const x of m.ARTEFAKTE) if (!/^[0-9a-f]{64}$/.test(x.sha256)) f.push(x.id + ': ohne SHA-256');
  return f;
}

test('[1edtech-validator] Registerzeile json-schema passt zu Adapter, Pins und Kern', async () => {
  const m = await laden();
  const { V } = ladeKern();
  assert.deepEqual(registerFunde(JSON.parse(fs.readFileSync(REGISTER, 'utf8')), m, V), []);
});

test('[1edtech-validator · Rot-Beweis] eine Registerzeile mit ungepinntem Artefakt, Exportweg, „echt" ohne Messung und ohne geprüfte Lizenz und „offiziellem Artefakt" wird fünffach gefunden', async () => {
  const m = await laden();
  const { V } = ladeKern();
  const r = JSON.parse(fs.readFileSync(REGISTER, 'utf8'));
  const s = r.standards[0];
  s.artefakte = s.artefakte.concat(['nie-gepinnt']);
  s.exportwege = ['bildungsangaben'];
  s.status = 'echt';
  delete s.gemessen;
  s.werkzeugHerkunft = 'offizielles Artefakt';
  const f = registerFunde(r, m, V);
  // vier gepflanzte Mängel, dazu „echt ohne geprüfte Lizenz", weil inspector-core ohne Lizenzangabe ist
  assert.equal(f.length, 5, f.join(' | '));
  assert.ok(f.some((x) => /ohne geprüfte Lizenz/.test(x)), f.join(' | '));
});

test('[1edtech-validator] Adapter und Beschaffungs-Manifest laufen gleich: das Werkzeug steht dort mit derselben Quelle', async () => {
  const m = await laden();
  const manifest = new Map(JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'standards-artefakte.json'), 'utf8')).map((a) => [a.id, a]));
  const w = manifest.get(m.default.werkzeug);
  assert.ok(w, 'das Werkzeug ' + m.default.werkzeug + ' fehlt im Manifest');
  assert.equal(w.quelle, m.WERKZEUG.quelle.repo + '@' + m.WERKZEUG.quelle.commit, 'Quelle im Adapter ≠ im Manifest');
});

test('[1edtech-validator · Rot-Beweis] eine fremde Zeile derselben Familie auf „echt“ wird gefunden', async () => {
  const m = await laden();
  const { V } = ladeKern();
  const r = JSON.parse(fs.readFileSync(REGISTER, 'utf8'));
  const fremd = r.standards.find((s) => !m.default.standards.includes(s.id));
  assert.ok(fremd, 'Vorbedingung: die Datei trägt eine Zeile, über die der Adapter nicht urteilt');
  fremd.status = 'echt';
  assert.deepEqual(registerFunde(r, m, V), [fremd.id + ': echt, aber der Adapter urteilt diesen Standard nicht']);
});
