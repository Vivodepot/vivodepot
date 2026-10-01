'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Adapter itb-shacl (U2-ADR-443) — die Hülle, geprüft ohne Werkzeug
   ────────────────────────────────────────────────────────────────────────
   Diese Datei läuft in der Node-Suite und braucht keinen Validator. Sie hält, was
   der Adapter VOR dem Prüferlauf zusichert: die Fälle kommen aus dem echten Kernweg
   und sind byte-gleich die EU-Beispiele; ohne Werkzeug gibt es kein Urteil, nie ein
   geratenes Grün; die Registerzeile passt zu Adapter, Pins und Kern.
   Den Lauf selbst verlangt tests/edc-itb-shacl-lauf.test.js — als todo, solange ungemessen,
   und rot, sobald das Werkzeug da ist und nicht grün läuft (Befund-Ratsche EDC-SHACL-UNGEMESSEN).
   ════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const ADAPTER = path.join(__dirname, 'konformitaet', 'adapter', 'itb-shacl.mjs');
const REGISTER = path.join(__dirname, '..', 'tools', 'standards-register', 'rdf-shacl.json');
const FX = path.join(__dirname, 'fixtures');
const laden = () => import(ADAPTER);
after(async () => (await laden()).aufraeumen());

// Ohne Werkzeug, auch auf einer Maschine, die es beschafft hat: der Cache zeigt ins Leere.
function ohneWerkzeugUmgebung(fn) {
  const alt = { d: process.env.ITB_SHACL_DOCKER_IMAGE, c: process.env.ITB_SHACL_CACHE };
  delete process.env.ITB_SHACL_DOCKER_IMAGE;
  process.env.ITB_SHACL_CACHE = path.join(require('node:os').tmpdir(), 'vd-itb-shacl-leer-' + process.pid);
  try { return fn(); } finally {
    if (alt.d !== undefined) process.env.ITB_SHACL_DOCKER_IMAGE = alt.d;
    if (alt.c !== undefined) process.env.ITB_SHACL_CACHE = alt.c; else delete process.env.ITB_SHACL_CACHE;
  }
}

test('[itb-shacl] ohne beschafftes Werkzeug: ungemessen mit Grund, und urteile() gibt kein Urteil', async () => {
  const a = (await laden()).default;
  const v = ohneWerkzeugUmgebung(() => a.vorhanden());
  assert.equal(v.ok, false);
  assert.match(v.grund, /nicht beschafft/);
  const u = a.urteile(v, '/egal', 'edc-ap');
  assert.equal(u.gelesen, false, 'ein Urteil ohne Werkzeug wäre geraten');
  assert.equal(u.gueltig, false);
});

test('[itb-shacl] ein Docker-Image ohne Digest-Pin ist kein Pin', async () => {
  const a = (await laden()).default;
  const alt = process.env.ITB_SHACL_DOCKER_IMAGE;
  process.env.ITB_SHACL_DOCKER_IMAGE = 'isaitb/shacl-validator:latest';
  try { const v = a.vorhanden(); assert.equal(v.ok, false); assert.match(v.grund, /Digest/); }
  finally { if (alt === undefined) delete process.env.ITB_SHACL_DOCKER_IMAGE; else process.env.ITB_SHACL_DOCKER_IMAGE = alt; }
});

test('[itb-shacl] artefakte(): je EU-Beispiel ein kern-rundweg-Fall, byte-gleich mit dem Beispiel, dazu das Beispiel selbst', async () => {
  const m = await laden();
  const faelle = await m.default.artefakte();
  assert.equal(faelle.length, 6);
  const kern = faelle.filter((f) => f.herkunft === 'kern-rundweg');
  assert.equal(kern.length, 3, 'je Beispiel ein Fall über den Kern');
  // Gemessen am Werkzeug (Kopf des Adapters): die gesiegelten gültig, der ungesiegelte Entwurf nicht.
  const erwartet = { 'edci-europass-certofpart-signed': 'gueltig', 'edci-europass-certofpart-unsigned': 'ungueltig', 'edci-europass-mc-signed': 'gueltig' };
  for (const f of faelle) {
    assert.equal(f.standard, 'edc-ap');
    assert.equal(f.erwartet, erwartet[f.name.split('·')[0]], f.name);
  }
  for (const f of kern) {
    const datei = f.name.replace('·kern-rundweg', '') + '.jsonld';
    const soll = m.shaclEingabe(fs.readFileSync(path.join(FX, datei)));
    assert.equal(fs.readFileSync(f.pfad, 'utf8'), soll, f.name + ': der Kern gibt etwas anderes heraus, als hereinkam');
    assert.match(soll, /EuropeanDigitalCredential/, 'die SHACL-Eingabe ist das Credential, nicht die JWS-Hülle');
  }
});

test('[itb-shacl] kaputt(): der Fall trägt keinen Aussteller mehr — sonst lehnte der Prüfer nichts ab', async () => {
  const k = await (await laden()).default.kaputt();
  assert.equal(k.length, 1);
  const o = JSON.parse(fs.readFileSync(k[0].pfad, 'utf8'));
  assert.equal(o.issuer, undefined);
  assert.ok(o.credentialSubject, 'der Rest des Credentials ist noch da');
});

// Was an der Registerzeile nicht stimmt, als Liste — dieselbe Prüfung für den echten Bestand und den Rot-Beweis.
function registerFunde(r, m, V) {
  const f = [];
  if (r.adapter !== m.default.id) f.push('adapter ' + r.adapter);
  const pins = new Set([...m.ARTEFAKTE.map((x) => x.id), m.default.werkzeug]);   // Datenpins und das Werkzeug selbst
  for (const s of r.standards) {
    if (!m.default.standards.includes(s.id)) f.push(s.id + ': der Adapter urteilt diesen Standard nicht');
    for (const aid of s.artefakte) if (!pins.has(aid)) f.push(s.id + ': Artefakt ohne Pin: ' + aid);
    for (const w of s.importwege) if (!V.IMPORT_FORMAT_BY_ID[w]) f.push(s.id + ': Importweg fehlt im Kern: ' + w);
    if (s.exportwege.length) f.push(s.id + ': Holder mit Exportweg (U2-ADR-097 §6)');
    if (s.richtung.includes('schreiben')) f.push(s.id + ': Holder schreibt keinen Bildungsnachweis');
    // „echt" nur mit gemessenem Prüferlauf: Werkzeug mit Digest, Datum, und die Probe, die den Lauf verlangt.
    const g = s.gemessen;
    if (s.status === 'echt' && !(g && /@sha256:[0-9a-f]{64}$/.test(g.werkzeug || '') && g.datum && g.probe && fs.existsSync(path.join(__dirname, '..', g.probe)))) {
      f.push(s.id + ': echt ohne gemessenen Prüferlauf');
    }
    if (s.status === 'echt' && !(s.lizenz && s.lizenz.status === 'geprueft')) f.push(s.id + ': echt ohne geprüfte Lizenz');
  }
  for (const x of m.ARTEFAKTE) if (!/^[0-9a-f]{64}$/.test(x.sha256)) f.push(x.id + ': ohne SHA-256');
  return f;
}

test('[itb-shacl] Registerzeile rdf-shacl passt zu Adapter, Pins und Kern', async () => {
  const m = await laden();
  const { V } = ladeKern();
  assert.deepEqual(registerFunde(JSON.parse(fs.readFileSync(REGISTER, 'utf8')), m, V), []);
});

test('[itb-shacl · Rot-Beweis] eine Registerzeile mit ungepinntem Artefakt, Exportweg und „echt" wird dreifach gefunden', async () => {
  const m = await laden();
  const { V } = ladeKern();
  const r = JSON.parse(fs.readFileSync(REGISTER, 'utf8'));
  const s = r.standards[0];
  s.artefakte = s.artefakte.concat(['nie-gepinnt']);
  s.exportwege = ['edci-bildung'];
  s.status = 'echt';
  delete s.gemessen;
  const f = registerFunde(r, m, V);
  assert.equal(f.length, 3, f.join(' | '));
});

test('[itb-shacl] kontexteEinbetten: ohne Netz ersetzt der Adapter jede gepinnte Kontext-Adresse durch die gepinnte Datei — eine Adresse ohne Pin ist ein Fehler, kein Urteil', async () => {
  const m = await laden();
  // Eigener Cache unter os.tmpdir, damit die Probe auf jeder Maschine läuft — beschafft oder nicht.
  const cache = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'vd-itb-shacl-cache-'));
  for (const x of m.ARTEFAKTE.filter((a) => a.kontextFuer)) fs.writeFileSync(path.join(cache, x.id), JSON.stringify({ '@context': { gepinnt: x.id } }));
  const alt = process.env.ITB_SHACL_CACHE;
  process.env.ITB_SHACL_CACHE = cache;
  let e, rot;
  try {
    e = m.kontexteEinbetten(JSON.stringify({ '@context': ['https://www.w3.org/2018/credentials/v1', 'http://data.europa.eu/snb/model/context/edc-ap'], type: ['VerifiableCredential'] }));
    rot = m.kontexteEinbetten(JSON.stringify({ '@context': ['https://example.org/nie-gepinnt'] }));
  } finally {
    if (alt === undefined) delete process.env.ITB_SHACL_CACHE; else process.env.ITB_SHACL_CACHE = alt;
    fs.rmSync(cache, { recursive: true, force: true });
  }
  assert.deepEqual(e.fehlend, []);
  const o = JSON.parse(e.json);
  assert.deepEqual(o['@context'], [{ gepinnt: 'w3c-credentials-v1-kontext' }, { gepinnt: 'edc-ap-kontext-20230928-0' }], 'eine Adresse blieb stehen — ohne Netz scheitert ITB daran');
  assert.deepEqual(o.type, ['VerifiableCredential'], 'der Rest bleibt unverändert');
  assert.deepEqual(rot.fehlend, ['https://example.org/nie-gepinnt']);
});

test('[itb-shacl] Adapter und Beschaffungs-Manifest laufen gleich: Werkzeug per Digest, jede Datenpin mit derselben Prüfsumme', async () => {
  const m = await laden();
  const manifest = new Map(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'standards-artefakte.json'), 'utf8')).map((a) => [a.id, a]));
  const w = manifest.get(m.default.werkzeug);
  assert.ok(w, 'das Werkzeug ' + m.default.werkzeug + ' fehlt im Manifest');
  assert.equal(w.docker, m.IMAGE, 'Digest im Adapter ≠ Digest im Manifest');
  for (const x of m.ARTEFAKTE) {
    assert.ok(manifest.get(x.id), x.id + ' fehlt im Manifest');
    assert.equal(manifest.get(x.id).sha256, x.sha256, x.id + ': Prüfsumme im Adapter ≠ im Manifest');
  }
});
