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

function ohneWerkzeugUmgebung(fn) {
  const alt = { d: process.env.ITB_SHACL_DOCKER_IMAGE, j: process.env.ITB_SHACL_JAR };
  delete process.env.ITB_SHACL_DOCKER_IMAGE; delete process.env.ITB_SHACL_JAR;
  try { return fn(); } finally {
    if (alt.d !== undefined) process.env.ITB_SHACL_DOCKER_IMAGE = alt.d;
    if (alt.j !== undefined) process.env.ITB_SHACL_JAR = alt.j;
  }
}

test('[itb-shacl] ohne beschafftes Werkzeug: ungemessen mit Grund, und urteile() gibt kein Urteil', async () => {
  const a = (await laden()).default;
  const v = ohneWerkzeugUmgebung(() => a.vorhanden());
  assert.equal(v.ok, false);
  assert.match(v.grund, /nicht beschafft/);
  const u = a.urteile({}, '/egal', 'edc-ap');
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
  for (const f of faelle) {
    assert.equal(f.standard, 'edc-ap');
    assert.equal(f.erwartet, 'gueltig');
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
  const pins = new Set(m.ARTEFAKTE.map((x) => x.id));
  for (const s of r.standards) {
    if (!m.default.standards.includes(s.id)) f.push(s.id + ': der Adapter urteilt diesen Standard nicht');
    for (const aid of s.artefakte) if (!pins.has(aid)) f.push(s.id + ': Artefakt ohne Pin: ' + aid);
    for (const w of s.importwege) if (!V.IMPORT_FORMAT_BY_ID[w]) f.push(s.id + ': Importweg fehlt im Kern: ' + w);
    if (s.exportwege.length) f.push(s.id + ': Holder mit Exportweg (U2-ADR-097 §6)');
    if (s.richtung.includes('schreiben')) f.push(s.id + ': Holder schreibt keinen Bildungsnachweis');
    if (s.status === 'echt') f.push(s.id + ': echt ohne gemessenen Prüferlauf');
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
  const f = registerFunde(r, m, V);
  assert.equal(f.length, 3, f.join(' | '));
});
