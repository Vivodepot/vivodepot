'use strict'; require('./helfer/platz-isoliert.js').platzIsolieren();   // eigener Suite-Platz (PLATZ-LECK-HOOK-TESTS); in derselben Zeile, damit keine Zeilennummer wandert
/* ════════════════════════════════════════════════════════════════════════
   Befund NODE-MODULES-LOCKFILE (MITTEL, 27.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Mit ajv 8.20.0 kam eine neue devDependency. Arbeitsbäume, deren node_modules per Symlink auf
   einen fremden Bestand zeigte, hatten kein ajv; ihre Suite fiel an sechzehn Folgefehlern
   („Cannot find module 'ajv/dist/2020'“). Jetzt prüft EINE Funktion
   (tools/lib/node-modules-lockfile-pruefen.js) jedes Paket aus package-lock.json nach Name und
   Version, vor dem ersten Test (tools/lib/node-modules-preload.js, im npm-test-Aufruf) wie in
   tools/landung-vorbereiten.js, und die Meldung nennt das Symlink-Ziel und den Befehl zum Beheben.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pruefen } = require('../tools/lib/node-modules-lockfile-pruefen.js');

const LIB = path.join(__dirname, '..', 'tools', 'lib');

/* Ein Baum mit Lockfile über `pakete` ({name: version}); `bestand` ist ein getrennter
   node_modules-Ordner mit `installiert`, auf den der Baum per Symlink zeigt (wie ein Arbeitsbaum). */
function baumMitSymlink(pakete, installiert, weitere = {}) {
  const wurzel = fs.mkdtempSync(path.join(os.tmpdir(), 'nm-lockfile-probe-'));
  const baum = path.join(wurzel, 'baum');
  const bestand = path.join(wurzel, 'fremder-baum', 'node_modules');
  fs.mkdirSync(baum, { recursive: true });
  fs.writeFileSync(path.join(baum, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3,
    packages: Object.assign({ '': {} }, ...Object.entries(pakete).map(([n, v]) => ({ ['node_modules/' + n]: { version: v, ...(weitere[n] || {}) } }))) }));
  for (const [n, v] of Object.entries(installiert)) {
    fs.mkdirSync(path.join(bestand, n), { recursive: true });
    fs.writeFileSync(path.join(bestand, n, 'package.json'), JSON.stringify({ name: n, version: v }));
  }
  fs.mkdirSync(bestand, { recursive: true });
  fs.symlinkSync(bestand, path.join(baum, 'node_modules'));
  fs.mkdirSync(path.join(baum, 'tools', 'lib'), { recursive: true });
  for (const f of ['node-modules-lockfile-pruefen.js', 'node-modules-preload.js']) fs.copyFileSync(path.join(LIB, f), path.join(baum, 'tools', 'lib', f));
  return { wurzel, baum };
}
const LOCK = { ajv: '8.20.0', 'fast-check': '4.9.0' };

function preloadLauf(baum) {
  const env = { ...process.env };
  delete env.VD_NODE_MODULES_GEPRUEFT;
  return spawnSync(process.execPath, ['--require', path.join(baum, 'tools', 'lib', 'node-modules-preload.js'), '-e', 'console.log("erster Test")'],
    { cwd: baum, env, encoding: 'utf8' });
}

test('[NODE-MODULES-LOCKFILE·Rot-Beweis] Symlink auf ein node_modules ohne ajv: der Lauf bricht vor dem ersten Test ab und sagt, was fehlt, wohin der Symlink zeigt und wie man es behebt', () => {
  const { wurzel, baum } = baumMitSymlink(LOCK, { 'fast-check': '4.9.0' });
  try {
    const r = preloadLauf(baum);
    assert.equal(r.status, 1, 'der Lauf muss abbrechen');
    assert.doesNotMatch(r.stdout, /erster Test/, 'kein Test darf starten');
    assert.match(r.stderr, /fehlt ajv@8\.20\.0/);
    assert.match(r.stderr, /Symlink auf .*fremder-baum/);
    assert.match(r.stderr, /arbeitsbaum-einsatzbereit-machen/);
  } finally { fs.rmSync(wurzel, { recursive: true, force: true }); }
});

test('[NODE-MODULES-LOCKFILE·Gegenprobe] vollständiger Bestand: der Lauf startet', () => {
  const { wurzel, baum } = baumMitSymlink(LOCK, LOCK);
  try {
    const r = preloadLauf(baum);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /erster Test/);
  } finally { fs.rmSync(wurzel, { recursive: true, force: true }); }
});

test('[NODE-MODULES-LOCKFILE] geprüft wird die Version, nicht nur das Vorhandensein', () => {
  const { wurzel, baum } = baumMitSymlink(LOCK, { ajv: '8.12.0', 'fast-check': '4.9.0' });
  try {
    const r = pruefen(baum);
    assert.equal(r.ok, false);
    assert.deepEqual(r.falscheVersion, ['ajv 8.12.0 statt 8.20.0']);
  } finally { fs.rmSync(wurzel, { recursive: true, force: true }); }
});

test('[NODE-MODULES-LOCKFILE] ein optionales Paket dieser Plattform fehlt zu Recht, ein verschachteltes wird unter seinem Pfad geprüft', () => {
  const { wurzel, baum } = baumMitSymlink({ ...LOCK, fsevents: '2.3.2' }, LOCK, { fsevents: { optional: true } });
  try {
    assert.equal(pruefen(baum).ok, true);
    const lock = JSON.parse(fs.readFileSync(path.join(baum, 'package-lock.json'), 'utf8'));
    lock.packages['node_modules/ajv/node_modules/fast-uri'] = { version: '3.0.1' };
    fs.writeFileSync(path.join(baum, 'package-lock.json'), JSON.stringify(lock));
    assert.deepEqual(pruefen(baum).fehlend, ['fast-uri@3.0.1']);
  } finally { fs.rmSync(wurzel, { recursive: true, force: true }); }
});

test('[NODE-MODULES-LOCKFILE] der echte Baum erfüllt seinen Lockfile, und npm test lädt die Prüfung', () => {
  const r = pruefen(path.join(__dirname, '..'));
  assert.ok(r.geprueft >= 10, 'Vorbedingung: die Pakete des Lockfiles werden gelesen');
  assert.equal(r.ok, true, r.grund);
  const skript = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).scripts.test;
  assert.match(skript, /--require \.\/tools\/lib\/node-modules-preload\.js/);
});
