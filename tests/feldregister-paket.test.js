'use strict';
/* Proben zu U2-ADR-NNN, npm-Paket @vivodepot/feldregister. Gebaut, nie veröffentlicht: kein `npm publish`, kein Token,
   keine Anmeldung in diesen Proben. `npm pack --dry-run` liest nur den Ordner. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const P = require('../tools/feldregister-paket-bauen.js');
const { bauen } = require('../tools/feldregister-bauen.js');

const ARTEFAKT = bauen({ datum: '2026-10-06' });
function ordner() { return fs.mkdtempSync(path.join(os.tmpdir(), 'feldregister-paket-')); }

test('[Feldregister·Paket] npm pack --dry-run führt genau die sechs Dateien; nur Daten, CC0, öffentlich', () => {
  const o = ordner();
  try {
    const aus = path.join(o, 'paket');
    const r = P.paketBauen({ ausgabe: aus, artefakt: ARTEFAKT });
    assert.equal(r.version, '1.0.0');
    const pack = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
      cwd: aus, encoding: 'utf8', env: { ...process.env, npm_config_cache: path.join(o, 'cache'), npm_config_offline: 'true' },
    }))[0];
    assert.equal(pack.name, '@vivodepot/feldregister');
    assert.deepEqual(pack.files.map((f) => f.path).sort(), P.DATEIEN.slice().sort());
    const pj = JSON.parse(fs.readFileSync(path.join(aus, 'package.json'), 'utf8'));
    assert.equal(pj.license, 'CC0-1.0');
    assert.deepEqual(pj.publishConfig, { access: 'public' });
    for (const verboten of ['scripts', 'dependencies', 'main', 'bin', 'optionalDependencies', 'peerDependencies']) {
      assert.ok(!(verboten in pj), 'das Paket trägt kein ' + verboten);
    }
    assert.match(fs.readFileSync(path.join(aus, 'LICENSE'), 'utf8'), /CC0 1\.0 Universal/);
    const register = JSON.parse(fs.readFileSync(path.join(aus, 'feldregister.json'), 'utf8'));
    assert.equal(register.lizenz.spdx, 'CC0-1.0');
  } finally { fs.rmSync(o, { recursive: true, force: true }); }
});

test('[Feldregister·Paket·Rot-Beweis] ein veränderter Rechtstext und ein Register ohne CC0 bauen kein Paket', () => {
  const o = ordner();
  try {
    const kaputt = path.join(o, 'reg');
    fs.mkdirSync(kaputt);
    const ohne = JSON.parse(ARTEFAKT.json); delete ohne.lizenz;
    fs.writeFileSync(path.join(kaputt, 'feldregister.json'), JSON.stringify(ohne));
    fs.writeFileSync(path.join(kaputt, 'feldregister.jsonld'), ARTEFAKT.jsonld);
    assert.throws(() => P.paketBauen({ ausgabe: path.join(o, 'a'), registerOrdner: kaputt }), /keine CC0-Lizenz/);
    assert.throws(() => P.paketBauen({ ausgabe: path.join(o, 'reg'), artefakt: ARTEFAKT }), /nicht leer/);
  } finally { fs.rmSync(o, { recursive: true, force: true }); }
});

test('[Feldregister·Paket·Version] neu → MINOR, Beschriftung → PATCH, entfernt oder anderer Bereich → Abbruch, gleich → Abbruch', () => {
  const jetzt = JSON.parse(ARTEFAKT.json);
  const ohneErste = { ...jetzt, felder: jetzt.felder.slice(1) };
  assert.equal(P.naechsteVersion('1.2.3', P.aenderungen(ohneErste, jetzt)), '1.3.0');
  const andereBeschriftung = { ...jetzt, felder: jetzt.felder.map((f, i) => (i ? f : { ...f, label: { ...f.label, de: 'alt' } })) };
  assert.equal(P.naechsteVersion('1.2.3', P.aenderungen(andereBeschriftung, jetzt)), '1.2.4');
  const andererStatus = { ...jetzt, felder: jetzt.felder.map((f, i) => (i ? f : { ...f, status: 'deprecated' })) };
  assert.equal(P.naechsteVersion('1.2.3', P.aenderungen(andererStatus, jetzt)), '1.3.0');
  assert.throws(() => P.naechsteVersion('1.2.3', P.aenderungen(jetzt, ohneErste)), /ändert sich\s+nicht/);
  const andererBereich = { ...jetzt, felder: jetzt.felder.map((f, i) => (i ? f : { ...f, bereich: 'anders' })) };
  assert.throws(() => P.naechsteVersion('1.2.3', P.aenderungen(andererBereich, jetzt)), /ändert sich\s+nicht/);
  assert.throws(() => P.naechsteVersion('1.2.3', P.aenderungen(jetzt, jetzt)), /nichts zu veröffentlichen/);
});

test('[Feldregister·Paket] das Werkzeug ruft keinen Prozess auf und liest kein Token', () => {
  const t = fs.readFileSync(path.join(__dirname, '..', 'tools', 'feldregister-paket-bauen.js'), 'utf8');
  assert.ok(!/child_process/.test(t), 'das Werkzeug startet keinen Prozess — also auch kein npm publish');
  assert.ok(!/NPM_TOKEN|_authToken|\.npmrc/i.test(t), 'das Werkzeug fasst kein Token an');
});
