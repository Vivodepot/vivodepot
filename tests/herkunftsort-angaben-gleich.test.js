'use strict';
/* ═════════════════════════════════════════════════════════════════
   Der Block HERKUNFTSORT_ANGABEN ist in jedem Träger derselbe, ERZEUGT aus der einen Quelle (Spezifikation 34.7, md5 aa468bfa)
   ─────────────────────────────────────────────────────────────────
   „Zwei Kopien sind zwei Wahrheiten, sobald eine gepflegt wird und die andere nicht.“ Kern und Lese-App tragen je eine erzeugte Fundstelle aus
   tools/herkunftsort-angaben.json, byte-gleich wie der Krypto-Kern in allen Trägern. Diese Datei ist die Probe der DAUERHAFTEN Region HERKUNFTSORT-ANGABEN im
   Gerüst-Wächter (`tools/geruest-waechter-grundlinie.json`, `regionen.dauerhaft`): sie ist rot, wenn die Angabe weg ist oder abweicht.
   Das Werkzeug wird als PROZESS gefahren; sein Exit-Code ist das Ergebnis.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const L = require('../tools/lib/herkunftsort-angaben.js');
// LAZY: der Erzeuger gehört zum Fix; vor ihm scheitert nur die jeweilige Probe (als `todo` mit Grund im Verlauf), nicht das Laden der Datei.
const traeger = () => require('../tools/herkunftsort-angaben-schreiben.js').TRAEGER;

const REPO = path.join(__dirname, '..');
const WERKZEUG = path.join(REPO, 'tools', 'herkunftsort-angaben-schreiben.js');
const lese = (d) => fs.readFileSync(path.join(REPO, d), 'utf8');
const fahre = (args) => spawnSync(process.execPath, [WERKZEUG, ...args], { encoding: 'utf8', timeout: 60000 });

test('[Herkunftsort-Angaben] jeder Träger trägt den erzeugten Block, byte-gleich mit dem aus der Quelle (Exit 0)', () => {
  const r = fahre(['--check']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal((r.stdout.match(/: gleich/g) || []).length, traeger().length, 'Positivkontrolle: jeder Träger wurde verglichen');
  const soll = L.blockErzeugen(L.quelleLesen());
  for (const t of traeger()) assert.equal(L.blockFinden(lese(t.datei)).text, soll, t.datei);
});

test('[Herkunftsort-Angaben] die Angabe steht NUR im Block: kein zweites Literal des Namens in einem Träger', () => {
  for (const t of traeger()) {
    const text = lese(t.datei);
    const b = L.blockFinden(text);
    assert.ok(b, t.datei + ': der Träger trägt den erzeugten Block HERKUNFTSORT_ANGABEN nicht');
    const rest = text.slice(0, b.start) + text.slice(b.ende);
    assert.ok(!rest.includes("'Vivodepot GmbH'"), t.datei + ': der Name der Urheberin steht als Literal außerhalb des Blocks (zwei Wahrheiten)');
    assert.ok(!rest.includes("lizenz: 'EUPL-1.2'"), t.datei + ': die Lizenzkennung steht als Literal außerhalb des Blocks');
  }
  assert.match(lese('vivodepot-lesen.html'), /const URHEBER_LESEN = Object\.freeze\(\{ name: HERKUNFTSORT_ANGABEN\.urheberin\.name,/, 'URHEBER_LESEN ist aus dem Block abgeleitet, kein eigenes Literal');
});

test('[Herkunftsort-Angaben·Rot-Beweis] eine Abweichung in einem Träger und ein fehlender Block sind rot (Exit 1)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'herkunftsort-angaben-'));
  try {
    for (const t of traeger()) fs.copyFileSync(path.join(REPO, t.datei), path.join(tmp, t.datei));
    const lesen = path.join(tmp, 'vivodepot-lesen.html');
    const kern = path.join(tmp, 'vivodepot.html');
    const orig = fs.readFileSync(lesen, 'utf8');
    assert.ok(orig.includes("name: 'Vivodepot GmbH'"), 'Pflanzung ohne Anker');
    fs.writeFileSync(lesen, orig.replace("name: 'Vivodepot GmbH'", "name: 'Fremdfirma GmbH'"));
    const abw = fahre(['--check', '--depot', tmp]);
    assert.equal(abw.status, 1, abw.stdout + abw.stderr);
    assert.match(abw.stdout, /vivodepot-lesen\.html: ABWEICHUNG/);
    assert.match(abw.stdout, /vivodepot\.html: gleich/);
    fs.writeFileSync(lesen, orig);
    const kernText = fs.readFileSync(kern, 'utf8');
    const b = L.blockFinden(kernText);
    fs.writeFileSync(kern, kernText.slice(0, b.start) + kernText.slice(b.ende));
    const fehlt = fahre(['--check', '--depot', tmp]);
    assert.equal(fehlt.status, 1);
    assert.match(fehlt.stdout, /vivodepot\.html: Block FEHLT/);
    // Schreiben behebt es (Umkehr): danach ist die Prüfung grün.
    assert.equal(fahre(['--depot', tmp]).status, 0);
    assert.equal(fahre(['--check', '--depot', tmp]).status, 0);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Herkunftsort-Angaben] der Konfektionierer liest DIESELBE Schlüsselmenge aus dem Kern-Text (rezeptPruefen)', () => {
  const kern = lese('vivodepot.html');
  const a = L.angabenLesen(kern);
  assert.ok(a, 'der Kern trägt den erzeugten Block HERKUNFTSORT_ANGABEN nicht');
  assert.deepEqual(Object.keys(a.schluessel).sort(), ['herkunftLizenzhinweis', 'herkunftPoweredBy']);
  const modul = (texte) => [{ modulTyp: 'textsatz', sprache: 'xx', texte }];
  assert.deepEqual(L.rezeptPruefen(kern, modul({ 'strings:herkunftPoweredBy.text': 'Made by {urheberin}' })), []);
  assert.equal(L.rezeptPruefen(kern, modul({ 'strings:herkunftPoweredBy.text': 'Made by someone' })).length, 1);
  assert.equal(L.rezeptPruefen(kern, modul({ 'strings:herkunftLizenzhinweis.text': '{urheberin} under {marke}' })).length >= 2, true);
  assert.deepEqual(L.rezeptPruefen(kern, modul({ 'strings:anderer.text': 'ohne Bezug' })), [], 'ein anderer Schlüssel ist kein Verstoß');
  assert.equal(L.rezeptPruefen('kein Block hier', modul({})).length, 1, 'ein Kern ohne Block ist nicht prüfbar — nicht grün');
});
