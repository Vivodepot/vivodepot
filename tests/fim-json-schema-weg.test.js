'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-465 Nachtrag — FIM als JSON: Ziele als Liste von Pfadstufen, `schemaUri`, Prüfung gegen das JSON-Schema (Ajv)
   ────────────────────────────────────────────────────────────────────────
   Anlass: Die JSON-Schemas des FIM-Portals tragen Schlüssel aus Kennung und Fassung („G99000002V1.0“) — mit Punkt. Ein
   Zielpfad, der an Punkten trennt, ist dort mehrdeutig. Darum darf `ziel` eine Liste von Pfadstufen sein.
   Zusicherungen:
     · `ziel` als Liste trägt in json@1 und xml@1; jede Stufe wird auf Form geprüft (kein leeres Teilstück, kein
       `__proto__`/`constructor`/`prototype`); eine Stufe mit Punkt gibt es nur in der Listenform (der Punkt-String trennt).
     · Pfadstufen sind fremde Eingabe: abgewiesen und nie in die Prototypenkette geschrieben (Auflage Krypto-Gegenlesung 1).
     · `schemaUri` ist nur Text — https, feste Form, nie aufgelöst, kein Netzaufruf (Auflage 2). Nur an Ausgabe-Modulen.
       Eine `schemaUri` außerhalb von vivodepot behauptet einen fremden Standard wie ein fremder `namensraum`: Kanal nur mit
       verifizierter Signatur (U2-ADR-465 Nr. 7). Rot-Beweis: unsigniert keine Ausgabe.
     · Die Ausgabe des Kerns erfüllt das Fixture-Schema (Ajv 2020, strict, offline); fehlt ein Pflichtfeld im Depot, lehnt
       Ajv ab — der Kern erfindet nichts. Ajv exakt gepinnt, das Schema-Fixture per SHA-256 (Auflage 3).
   ════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const FX = path.join(__dirname, 'fixtures', 'fim-schema');
const SCHEMA_PFAD = path.join(FX, 'S99000001_V1.0.schema.json');
const MODUL_PFAD = path.join(FX, 'S99000001-format-modul-json.json');
// Auflage 3: die Prüfsumme des Schema-Fixtures steht HIER, nicht im Adapter — eine stille Änderung des Fixtures fällt auf.
const SCHEMA_SHA256 = '47ffbe9875cbe62dca3b432555568425bb62af6e45df1c51de6118a909a4e262';
const ADAPTER = path.join(__dirname, 'konformitaet', 'adapter', 'ajv-json-schema.mjs');
const laden = () => import(ADAPTER);
after(async () => (await laden()).default.aufraeumen());

const modulLesen = () => JSON.parse(fs.readFileSync(MODUL_PFAD, 'utf8'));
const URI_FREMD = 'https://schema.example.org/immutable/schemas/S99000001V1.0.schema.json';
const URI_EIGEN = 'https://vivodepot.de/schemas/probe-antrag.schema.json';
const JSON_MODUL = Object.freeze({
  modulTyp: 'format', moduleVersion: 1, sprache: 'de', format: 'probe-liste', richtung: 'export', schreiber: 'json@1',
  sektor: 'identity', label: 'Probe Liste', zuordnung: [
    { feld: 'familyName', ziel: ['G99000002V1.0', 'F99000003V1.0'] },
    { feld: 'givenName', ziel: ['G99000002V1.0', 'F99000004V1.0'] },
  ],
});

async function depot(zusatz) {
  const { V, window } = ladeKern(zusatz ? { zusatzBindungen: zusatz } : undefined);
  V.setData(V.leeresDepot());
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.betreteApp();
  V.sektorFeldSetzen('identity', 'givenName', 'Ann');
  V.sektorFeldSetzen('identity', 'familyName', 'Bö');
  return { V, window };
}
const signiert = (V, m) => { const k = Object.assign({}, m); V._modulBelegAlsGeprueftSetzen(k, { stufe: 'extern-ungeprueft', anbieterId: null }); return k; };

test('[U2-ADR-465·Liste] json@1: Stufen mit Punkt werden Schlüssel, nicht Trennstellen', async () => {
  const { V } = await depot();
  const g = V.formatModulPruefen(JSON_MODUL);
  assert.equal(g.gueltig, true, 'Grund: ' + g.grund);
  assert.deepEqual(JSON.parse(V.formatModulZuExportKanal(JSON_MODUL).baue({})),
    { 'G99000002V1.0': { 'F99000003V1.0': 'Bö', 'F99000004V1.0': 'Ann' } });
  // Gegenprobe: derselbe Pfad als Punkt-String trennt an jedem Punkt — genau die Mehrdeutigkeit, die die Liste auflöst.
  const punkt = Object.assign({}, JSON_MODUL, { zuordnung: [{ feld: 'givenName', ziel: 'G99000002V1.0.F99000004V1.0' }] });
  assert.deepEqual(JSON.parse(V.formatModulZuExportKanal(punkt).baue({})), { G99000002V1: { '0': { F99000004V1: { '0': 'Ann' } } } });
});

test('[U2-ADR-465·Liste] xml@1: dieselbe Listenform, jede Stufe ein XML-Name (Punkte erlaubt)', async () => {
  const { V } = await depot();
  const m = Object.assign({}, JSON_MODUL, { schreiber: 'xml@1', wurzel: 'antrag' });
  assert.equal(V.formatModulZuExportKanal(m).baue({}),
    '<?xml version="1.0" encoding="UTF-8"?>\n<antrag><G99000002V1.0><F99000003V1.0>Bö</F99000003V1.0><F99000004V1.0>Ann</F99000004V1.0></G99000002V1.0></antrag>');
  const kaputt = Object.assign({}, m, { zuordnung: [{ feld: 'givenName', ziel: ['G1', 'a b'] }] });
  assert.equal(V.formatModulPruefen(kaputt).grund, 'schreiber-xml-zielname', 'der XML-Name-Test gilt je Stufe');
});

test('[U2-ADR-465·Liste] Einlesen: eine Listen-Zuordnung liest denselben Schlüssel zurück', async () => {
  const { V } = await depot();
  const imp = { modulTyp: 'format', moduleVersion: 1, sprache: 'de', format: 'probe-liste-ein', richtung: 'import', leser: 'json@1',
    sektor: 'identity', label: 'Probe Liste ein', zuordnung: [{ feld: 'givenName', ziel: ['G99000002V1.0', 'F99000004V1.0'] }] };
  const kanal = V.formatModulZuImportKanal(imp);
  const r = kanal.parse(JSON.stringify({ 'G99000002V1.0': { 'F99000004V1.0': 'Lea' } }));
  assert.deepEqual(r.felder.map((f) => [f.feldId, f.wert]), [['givenName', 'Lea']]);
});

test('[U2-ADR-465·Liste·Rot-Beweis] Auflage 1: verbotene, leere und fremde Stufen werden abgewiesen, nie geschrieben', async () => {
  const { V } = await depot(['_formatPfadSchreiben', '_formatPfadTeile']);
  const teile = V.__zusatz._formatPfadTeile;
  const schreiben = V.__zusatz._formatPfadSchreiben;
  for (const stufe of ['__proto__', 'constructor', 'prototype']) {
    assert.equal(teile(['a', stufe]), null, stufe);
    const m = Object.assign({}, JSON_MODUL, { zuordnung: [JSON_MODUL.zuordnung[0], { feld: 'givenName', ziel: ['x', stufe, 'polluted'] }] });
    const g = V.formatModulPruefen(m);
    assert.ok(g.verworfene.some((x) => x.grund === 'zuordnung-ziel'), stufe + ': die Zuordnung ist verworfen');
    const o = {};
    assert.equal(schreiben(o, [stufe, 'polluted'], 'ja'), false, stufe + ': der Schreiber lehnt ab');
    assert.equal(schreiben(o, ['x', stufe, 'polluted'], 'ja'), false, stufe + ': auch auf der zweiten Ebene lehnt der Schreiber ab');
    assert.equal(o.x === undefined || Object.getPrototypeOf(o.x) === Object.prototype, true, stufe + ': ein angelegtes Zwischenobjekt behält seinen Prototyp');
    assert.equal(Object.getPrototypeOf(o), Object.prototype, stufe + ': der Prototyp des Ziels ist unberührt');
  }
  assert.equal({}.polluted, undefined, 'Object.prototype trägt nichts');
  for (const roh of [[], [''], ['a', ''], ['  '], ['a', 1], [null], 'a..b', ['a', ['b']]]) assert.equal(teile(roh), null, JSON.stringify(roh));
  assert.equal(teile(new Array(65).fill('a')), null, 'eine Höchstzahl an Stufen');
  assert.deepEqual(teile(['G1V1.0', 'F2V1.0']), ['G1V1.0', 'F2V1.0']);
  assert.deepEqual(teile('a.b'), ['a', 'b'], 'der Punkt-String bleibt Trennung');
  // Ein vorhandener geerbter Name ist keine Abkürzung in die Kette: geschrieben wird ein eigenes Objekt.
  const o = {};
  assert.equal(schreiben(o, ['toString', 'x'], 1), true);
  assert.ok(Object.prototype.hasOwnProperty.call(o, 'toString') && o.toString.x === 1);
  assert.equal(typeof Object.prototype.toString, 'function');
});

test('[U2-ADR-465·schemaUri] Form, nur Ausgabe, und der Kanal trägt sie unverändert', async () => {
  const { V } = await depot();
  const mit = (u, x) => Object.assign({}, JSON_MODUL, { schemaUri: u }, x || {});
  assert.equal(V.formatModulPruefen(mit(URI_EIGEN)).gueltig, true);
  for (const u of ['http://vivodepot.de/x.json', 'https://', 'kein uri', 'https://Vivodepot.de/x', 'https://a.example/x y', 'https://a.example/x?y=1',
    'https://a.example/x#f', 'https://user@a.example/x', 'javascript:alert(1)', 1, '']) {
    assert.equal(V.formatModulPruefen(mit(u)).grund, 'schemaUri', JSON.stringify(u));
  }
  const imp = mit(URI_EIGEN, { richtung: 'import', leser: 'json@1', schreiber: undefined });
  assert.equal(V.formatModulPruefen(imp).grund, 'schemaUri-ohne-ausgabe');
  assert.equal(V.formatModulZuExportKanal(mit(URI_EIGEN)).schemaUri, URI_EIGEN);
  assert.equal(V.formatModulZuExportKanal(JSON_MODUL).schemaUri, null);
  assert.equal(V.formatSchemaUriFremd(URI_FREMD), true);
  assert.equal(V.formatSchemaUriFremd(URI_EIGEN), false);
  assert.equal(V.formatSchemaUriFremd(null), false);
});

test('[U2-ADR-465·schemaUri·Rot-Beweis] eine fremde schemaUri ohne verifizierte Signatur bekommt keinen Kanal', async () => {
  const { V } = await depot();
  const fremd = Object.assign({}, JSON_MODUL, { schemaUri: URI_FREMD });
  assert.equal(V.formatModulPruefen(fremd).gueltig, true, 'Vorbedingung: das Modul selbst ist gültig');
  assert.equal(V.formatModulZuExportKanal(fremd), null, 'ohne Beleg');
  assert.equal(V.formatModulZuExportKanal(Object.assign({}, fremd, { ungeprueft: false })), null, 'Selbstauskunft zählt nicht');
  assert.ok(V.formatModulZuExportKanal(signiert(V, fremd)), 'mit Beleg der Ladeprüfung');
  assert.ok(V.formatModulZuExportKanal(V._alsAbWerkFestgestellt(Object.assign({}, fremd))), 'nach Inhalt ab Werk');
  assert.ok(V.formatModulZuExportKanal(Object.assign({}, JSON_MODUL, { schemaUri: URI_EIGEN })), 'die eigene braucht keine Signatur');
});

test('[U2-ADR-465·schemaUri] Auflage 2: Prüfen, Kanal und Ausgabe rufen kein Netz', async () => {
  const { V, window } = await depot();
  const zaehler = { fetch: 0, xhr: 0 };
  const vorher = { fetch: globalThis.fetch, xhr: globalThis.XMLHttpRequest, wfetch: window.fetch, wxhr: window.XMLHttpRequest };
  const f = () => { zaehler.fetch += 1; return Promise.reject(new Error('kein Netz')); };
  function X() { zaehler.xhr += 1; }
  globalThis.fetch = f; globalThis.XMLHttpRequest = X; window.fetch = f; window.XMLHttpRequest = X;
  try {
    const m = signiert(V, Object.assign({}, modulLesen()));
    assert.equal(V.formatModulPruefen(m).gueltig, true);
    const text = V.formatModulZuExportKanal(m).baue({});
    assert.equal(typeof text, 'string');
    assert.equal(V.formatModulZuExportKanal(Object.assign({}, modulLesen())), null);
  } finally {
    globalThis.fetch = vorher.fetch; globalThis.XMLHttpRequest = vorher.xhr; window.fetch = vorher.wfetch; window.XMLHttpRequest = vorher.wxhr;
  }
  assert.deepEqual(zaehler, { fetch: 0, xhr: 0 });
  // Und im Quelltext: die Prüf- und Kanalfunktionen nennen keinen Netzweg.
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  for (const name of ['formatModulPruefen', 'formatModulZuExportKanal', 'formatSchemaUriFremd', '_formatPfadTeile']) {
    const i = kern.indexOf('function ' + name + '(');
    assert.ok(i > 0, name);
    const rumpf = kern.slice(i, kern.indexOf('\n}\n', i));
    assert.doesNotMatch(rumpf, /\bfetch\s*\(|XMLHttpRequest|\bimport\s*\(|new URL\(|sendBeacon|WebSocket|EventSource/, name);
  }
});

test('[U2-ADR-465·JSON] Auflage 3: ajv exakt gepinnt (package.json, Lockfile, installiert) und das Schema-Fixture per SHA-256', async () => {
  const { WERKZEUG, ajvFassung } = await laden();
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(REPO, 'package-lock.json'), 'utf8'));
  assert.equal(pkg.devDependencies.ajv, WERKZEUG.version, 'package.json ohne ^ oder ~');
  assert.equal(lock.packages['node_modules/ajv'].version, WERKZEUG.version);
  assert.match(lock.packages['node_modules/ajv'].integrity, /^sha512-/);
  assert.equal(ajvFassung(), WERKZEUG.version);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(SCHEMA_PFAD)).digest('hex'), SCHEMA_SHA256);
});

test('[U2-ADR-465·JSON] die Ausgabe des Kerns erfüllt das JSON-Schema (Ajv 2020, strict, offline)', async () => {
  const a = await laden();
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PFAD, 'utf8'));
  const modul = modulLesen();
  assert.equal(modul.schemaUri, schema.$id, 'das Modul nennt das Schema, gegen das geprüft wird');
  const text = await a.kernText(modul);
  assert.deepEqual(JSON.parse(text), {
    'F99000009V1.0': '01',
    'G99000002V1.0': { 'F99000003V1.0': 'Beispiel', 'F99000004V1.0': 'Lea', 'F99000005V1.0': 'w', 'G99000006V1.0': { 'F99000013V1.0': 1958 } },
  });
  const u = a.urteilText(schema, text);
  assert.deepEqual(u, { gelesen: true, gueltig: true, fehler: [] });
  assert.deepEqual(a.default.vorhanden(), { ok: true });
});

test('[U2-ADR-465·JSON·Rot-Beweis] fehlt ein Pflichtfeld im Depot, lehnt Ajv ab — der Kern erfindet nichts', async () => {
  const a = await laden();
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PFAD, 'utf8'));
  const text = await a.kernText(modulLesen(), { ohne: ['familyName'] });
  assert.equal(JSON.parse(text)['G99000002V1.0']['F99000003V1.0'], undefined, 'kein erfundener Wert');
  const u = a.urteilText(schema, text);
  assert.equal(u.gueltig, false);
  assert.ok(u.fehler.some((f) => /F99000003V1\.0/.test(f)), u.fehler.join(' | '));
  // Der Adapter-Weg (kaputt) urteilt genauso.
  const [k] = await a.default.kaputt();
  assert.equal(a.default.urteile({}, k.pfad).gueltig, false);
  // Strict: ein unbekanntes Schlüsselwort im Schema ist ein Fehler, kein stilles Durchwinken.
  assert.throws(() => a.pruefer(Object.assign({}, schema, { 'x-unbekannt': 1 })), /strict mode/);
});
