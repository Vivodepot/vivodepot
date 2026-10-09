'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   modul-ohne-signatur-erzeugen.test.js — der offene Modul-Erzeuger baut, was andockt, und nichts, was geprüft wirkt (05.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Das Erzeugen ist offen, das Signieren nicht. Diese Probe hält beides fest:
     - jedes Beispiel unter docs/modules/angaben/ wird gebaut und vom Kern unsigniert angenommen, als
       `ungeprueft: true`, ohne `pruefstufe`, ohne geprüfte Anbieterkennung (Branding nimmt der Kern nur
       signiert — so steht es in der Anleitung);
     - Vertrauensfelder in den Angaben kommen im Modul nicht an;
     - ein Blocker schreibt nichts (Exit 1), ein falscher Aufruf endet mit Exit 2;
     - der Quelltext kann nichts signieren und liest keinen Schlüssel.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ladeKern } = require('./load-kern.js');
const E = require('../tools/modul-ohne-signatur-erzeugen.js');

const WERKZEUG = path.join(__dirname, '..', 'tools', 'modul-ohne-signatur-erzeugen.js');
const VERTRAUEN = { ungeprueft: false, pruefstufe: 'extern-geprueft:pruefer', abWerk: true, anbieterIdGeprueft: true, beleg: { x: 1 }, signiert: true, verifiziert: true };

function beispiele() {
  return fs.readdirSync(E.ANGABEN_ORDNER).filter((d) => d.endsWith('.angaben.json'))
    .map((d) => ({ typ: d.replace(/\.angaben\.json$/, ''), angaben: JSON.parse(fs.readFileSync(path.join(E.ANGABEN_ORDNER, d), 'utf8')) }));
}

test('[modul-ohne-signatur-erzeugen·Positivkontrolle] jedes Beispiel wird gebaut und dockt unsigniert an — nie als geprüft', () => {
  const { V } = ladeKern();
  const liste = beispiele();
  assert.ok(liste.length >= 5);
  for (const { typ, angaben } of liste) {
    const r = E.modulBauen(typ, angaben);
    assert.equal(r.ok, true, typ + ': ' + r.blocker.join('; '));
    for (const f of Object.keys(VERTRAUEN)) assert.ok(!(f in r.modul), typ + ': ' + f + ' im gebauten Modul');
    const d = V.leeresDepot();
    const e = V.modulEinlassen(JSON.stringify(r.modul), d);
    if (r.modul.modulTyp === 'branding') { assert.equal(e.grund, 'nur-signiert-erlaubt', typ); continue; }
    assert.equal(e.angenommen, true, typ + ': ' + e.grund);
    const slot = V.EINLASS_REGISTER.find((x) => x.typ === e.typ).slot;
    const m = d[slot][d[slot].length - 1];
    assert.equal(m.ungeprueft, true, typ);
    assert.equal(m.anbieterIdGeprueft, false, typ);
    assert.ok(!('pruefstufe' in m), typ + ': pruefstufe');
  }
});

test('[modul-ohne-signatur-erzeugen·Rot-Beweis] Vertrauensfelder in den Angaben kommen im Modul nicht an', () => {
  for (const { typ, angaben } of beispiele()) {
    const r = E.modulBauen(typ, Object.assign({}, angaben, VERTRAUEN));
    assert.equal(r.ok, true, typ);
    for (const f of Object.keys(VERTRAUEN)) assert.ok(!(f in r.modul), typ + ': ' + f);
  }
});

test('[modul-ohne-signatur-erzeugen] ein Blocker schreibt nichts (Exit 1); ein falscher Aufruf endet mit Exit 2', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'modul-ohne-signatur-'));
  try {
    const angaben = path.join(tmp, 'a.json');
    const ziel = path.join(tmp, 'modul.json');
    fs.writeFileSync(angaben, JSON.stringify({ herkunft: 'x', sprache: 'en', bereiche: [] }));
    const r = spawnSync(process.execPath, [WERKZEUG, '--typ', 'bereich', '--angaben', angaben, '--ausgabedatei', ziel], { encoding: 'utf8' });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /Blocker/);
    assert.ok(!fs.existsSync(ziel), 'nichts geschrieben');
    fs.writeFileSync(angaben, JSON.stringify({ rechtsraum: 'de', moduleVersion: 1, typen: [{ typ: 'living-will', katalogVersion: 1 }] }));
    assert.equal(spawnSync(process.execPath, [WERKZEUG, '--typ', 'rechtsraum', '--angaben', angaben, '--ausgabedatei', ziel], { encoding: 'utf8' }).status, 1, 'DE ist reserviert');
    assert.equal(spawnSync(process.execPath, [WERKZEUG, '--typ', 'bereich'], { encoding: 'utf8' }).status, 2);
    assert.equal(E.modulBauen('textsatz', {}).ok, false, 'textsatz entsteht nicht aus Angaben');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('[modul-ohne-signatur-erzeugen·Schreibweg] ohne --ausgabedatei entsteht nichts, mit ihr nur die genannte Datei — nie eine getrackte, und das Repo bleibt sauber', () => {
  const REPO = path.join(__dirname, '..');
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith('GIT_')) delete env[k];
  const stand = () => spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: REPO, env, encoding: 'utf8' }).stdout;
  const vorher = stand();
  const angaben = path.join(REPO, 'docs', 'modules', 'angaben', 'bereich.angaben.json');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'modul-ohne-signatur-schreibweg-'));
  try {
    // Ohne --ausgabedatei: Exit 2, kein Modul irgendwo, das Repo unverändert.
    const ohne = spawnSync(process.execPath, [WERKZEUG, '--typ', 'bereich', '--angaben', angaben], { cwd: tmp, encoding: 'utf8' });
    assert.equal(ohne.status, 2, ohne.stdout + ohne.stderr);
    assert.deepEqual(fs.readdirSync(tmp), [], 'ohne --ausgabedatei wird nichts geschrieben');
    // Mit --ausgabedatei außerhalb des Repos: genau diese Datei.
    const ziel = path.join(tmp, 'modul.json');
    const mit = spawnSync(process.execPath, [WERKZEUG, '--typ', 'bereich', '--angaben', angaben, '--ausgabedatei', ziel], { encoding: 'utf8' });
    assert.equal(mit.status, 0, mit.stdout + mit.stderr);
    assert.deepEqual(fs.readdirSync(tmp), ['modul.json']);
    // Rot-Beweis: eine getrackte Datei als Ziel wird verweigert und bleibt byte-gleich.
    const getrackt = path.join(REPO, 'docs', 'modules', 'examples', 'bereich.example.json');
    const bytes = fs.readFileSync(getrackt);
    const r = spawnSync(process.execPath, [WERKZEUG, '--typ', 'bereich', '--angaben', angaben, '--ausgabedatei', getrackt], { encoding: 'utf8' });
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stderr, /von git verfolgte Datei/);
    assert.ok(fs.readFileSync(getrackt).equals(bytes), 'die getrackte Datei ist unverändert');
    assert.equal(stand(), vorher, 'git status ist nach allen Läufen derselbe wie vorher');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('[modul-ohne-signatur-erzeugen·Leitplanke] kein Signieren, kein Schlüssel, kein Zertifikat im Werkzeug', () => {
  const quelle = fs.readFileSync(WERKZEUG, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const verboten of ['Signiert', '_signJWS', '_jwsImportSignKey', 'generateKey', 'vdkey', 'schluesselbund', 'kundenzertifikat', 'privateJwk']) {
    assert.ok(!quelle.includes(verboten), 'kommt vor: ' + verboten);
  }
});

test('[modul-ohne-signatur-erzeugen·--pruefen] die Einlassprüfung des Kerns: Beispiele angenommen, DE abgelehnt, Branding nur signiert', () => {
  const run = (...a) => spawnSync(process.execPath, [WERKZEUG, '--pruefen', ...a], { encoding: 'utf8' });
  const BSP = path.join(__dirname, '..', 'docs', 'modules', 'examples');
  for (const d of fs.readdirSync(BSP).filter((x) => x.endsWith('.example.json') && !x.startsWith('branding'))) {
    const r = run(path.join(BSP, d));
    assert.equal(r.status, 0, d + ': ' + r.stdout + r.stderr);
    assert.match(r.stdout, /angenommen \(.+\), unsigniert, geprüft gegen privat-de/);
  }
  const b = run(path.join(BSP, 'branding.example.json'));
  assert.equal(b.status, 1);
  assert.match(b.stdout, /nur-signiert-erlaubt/);
  assert.equal(E.modulPruefen(JSON.stringify({ modulTyp: 'rechtsraum', rechtsraum: 'de', moduleVersion: 1, typen: { 'living-will': { katalogVersion: 1 } } })).grund, 'reserviert');
});
