'use strict';
/* Der Antwort-Umschlag v1 (U2-ADR-153) ist aus dem Kern entfernt (05.10.2026, schließt ANTWORT-V1-SCHREIBER-RUECKBAU).
   Seit U2-ADR-449 (v833) schreibt der Kern die Antwort als JWE; die v1-Schreiber, -Öffner, ihre AAD, die ECDH-Helfer,
   `_angDeriveKey` und `ANG_PBKDF2_ITERATIONEN` hatten im Kern keinen Aufrufer mehr außer Proben.

   Drei Proben:
   1. Kein Kern-Weg erreicht `_angDeriveKey` oder einen v1-Namen: im Code des Kerns (ohne Kommentare und Zeichenketten)
      steht keiner davon, weder als Definition noch als Aufruf.
   2. Im Kern leitet kein PBKDF2-Aufruf mit einer anderen Iterationszahl ab als PBKDF2_ITERATIONS. Einzige zweite Form ist
      `iterations: p2c` in `_jwePbes2Schluessel` (gemeinsamer JWE-Block); jeder Kern-Aufruf davon übergibt ANTWORT_JWE_P2C,
      und der ist gleich PBKDF2_ITERATIONS.
   3. Rückwärts: die Lese-App öffnet die eingefrorenen v1-Umschläge (tests/fixtures/antwort-v1-umschlaege.json, erzeugt mit
      dem Kern vor dem Rückbau) in beiden Verfahren, und ein umetikettierter Vorgang scheitert.
   Jede der ersten beiden hat ihren Rot-Beweis an einer veränderten Kopie des Kerns. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { HTML_PATH, extrahiereScripts } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');
const { nurCode } = require('../tools/anzeige-index-leser.js');

const FIXTURE = path.join(__dirname, 'fixtures', 'antwort-v1-umschlaege.json');
const V1_NAMEN = ['_angDeriveKey', 'ANG_PBKDF2_ITERATIONEN', 'antwortVerschluesselnPasswort', 'antwortEntschluesselnPasswort',
  'antwortVerschluesselnSchluessel', 'antwortEntschluesselnSchluessel', '_antwortSiegeln', '_antwortOeffnen', '_antwortRumpf',
  '_antwortAad', '_antwortEcdhImportPublic', '_antwortEcdhImportPrivate', '_antwortEcdhSchluessel', 'istAntwortUmschlag',
  'ANTWORT_FORMAT_ID', 'ANTWORT_FORMAT_VERSION', 'ANTWORT_VERFAHREN', 'ANTWORT_ECDH_KURVE', 'ANTWORT_HKDF_INFO'];

function kernCode(html) {
  const { script1, script2 } = extrahiereScripts(html);
  return nurCode(script1 + '\n' + script2);
}

function v1Funde(html) {
  const code = kernCode(html);
  return V1_NAMEN.filter((n) => new RegExp('(^|[^A-Za-z0-9_$.])' + n.replace(/\$/g, '\\$') + '(?![A-Za-z0-9_$])').test(code));
}

/* Liefert die Verletzungen: jede `iterations:`-Stelle, die nicht PBKDF2_ITERATIONS ist und nicht der eine p2c-Weg. */
function pbkdf2Verletzungen(html) {
  const code = kernCode(html);
  const v = [];
  const re = /iterations\s*:\s*([A-Za-z0-9_$.]+)/g;
  let m, stellen = 0;
  while ((m = re.exec(code))) {
    stellen++;
    if (m[1] === 'PBKDF2_ITERATIONS') continue;
    if (m[1] === 'p2c') {
      const davor = code.lastIndexOf('function ', m.index);
      const fn = (code.slice(davor).match(/^function\s+([A-Za-z0-9_$]+)/) || [])[1];
      if (fn === '_jwePbes2Schluessel') continue;
    }
    v.push('iterations:' + m[1]);
  }
  const aufrufe = code.match(/_jwePbes2Schluessel\(([^)]*)\)/g) || [];
  for (const a of aufrufe) {
    if (/^_jwePbes2Schluessel\(passwort, p2s, p2c\)$/.test(a)) continue;   // die Definition selbst
    const arg = a.slice(a.indexOf('(') + 1, -1).split(',').map((s) => s.trim())[2];
    if (arg !== 'ANTWORT_JWE_P2C') v.push('pbes2-aufruf:' + arg);
  }
  if (stellen === 0) v.push('keine-stelle-gefunden');
  return v;
}

test('[Antwort v1 · entfernt] im Code des Kerns steht kein v1-Name und kein `_angDeriveKey`', () => {
  assert.deepEqual(v1Funde(fs.readFileSync(HTML_PATH, 'utf8')), []);
});

test('[Antwort v1 · entfernt · Rot] eine Kern-Fassung, die `_angDeriveKey` wieder ruft, wird gemeldet', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const anker = 'async function antwortVerschluesseln(datensatz, anfrage, opt) {';
  assert.equal(html.split(anker).length, 2, 'Vorbedingung: der Einstieg steht genau einmal');
  const rot = html.replace(anker, anker + "\n  if (opt && opt.alt) return _angDeriveKey(opt.passwort, new Uint8Array(16));");
  assert.deepEqual(v1Funde(rot), ['_angDeriveKey']);
  const rot2 = html.replace(anker, 'function istAntwortUmschlag(o) { return !!o; }\n' + anker);
  assert.deepEqual(v1Funde(rot2), ['istAntwortUmschlag']);
});

test('[Antwort v1 · entfernt · Gegenprobe] ein Name nur im Kommentar oder in einer Zeichenkette zählt nicht', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const anker = 'async function antwortVerschluesseln(datensatz, anfrage, opt) {';
  const harmlos = html.replace(anker, "/* früher: _angDeriveKey */\nconst _hinweis = 'istAntwortUmschlag';\n" + anker);
  assert.deepEqual(v1Funde(harmlos), []);
});

test('[PBKDF2 · Kern] kein PBKDF2-Aufruf im Kern leitet mit einer anderen Iterationszahl ab als PBKDF2_ITERATIONS', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  assert.deepEqual(pbkdf2Verletzungen(html), []);
  assert.match(html, /const PBKDF2_ITERATIONS = 600000;/);
  assert.match(html, /const ANTWORT_JWE_P2C = 600000;/);
});

test('[PBKDF2 · Kern · Rot] eine eigene Iterationszahl und ein PBES2-Aufruf mit anderem p2c werden gemeldet', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const anker = 'async function antwortVerschluesseln(datensatz, anfrage, opt) {';
  const rot = html.replace(anker, "const ANG_PBKDF2_ITERATIONEN = 600000;\nasync function _x(pw, salt) {\n"
    + "  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ANG_PBKDF2_ITERATIONEN, hash: 'SHA-256' }, pw, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);\n}\n"
    + 'async function _y(pw, p2s) { return _jwePbes2Schluessel(pw, p2s, 1000); }\n' + anker);
  assert.deepEqual(pbkdf2Verletzungen(rot), ['iterations:ANG_PBKDF2_ITERATIONEN', 'pbes2-aufruf:1000']);
});

test('[Antwort v1 · rückwärts] die Lese-App öffnet die eingefrorenen v1-Umschläge in beiden Verfahren', async () => {
  const f = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const L = ladeLesen().V;
  for (const u of [f.einmalpasswort.umschlag, f.schluesselpaar.umschlag]) {
    assert.equal(u.dateiTyp, 'vivodepot-antwort');
    assert.equal(u.v, 1);
    assert.equal(L.erkenneFormat(u), 'antwort');
    assert.equal(L.istAntwortUmschlag(u), true);
  }
  const a = await L.antwortEntschluesselnPasswort(f.einmalpasswort.umschlag, f.einmalpasswort.testPasswort);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), f.datensatz);
  const b = await L.antwortEntschluesselnSchluessel(f.schluesselpaar.umschlag, f.schluesselpaar.testPrivateJwk);
  assert.deepEqual(JSON.parse(JSON.stringify(b)), f.datensatz);
});

test('[Antwort v1 · rückwärts · Rot] ein umetikettierter Vorgang, ein falsches Passwort und ein verfälschtes Byte öffnen nichts', async () => {
  const f = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const L = ladeLesen().V;
  const um = (u) => Object.assign({}, u, { vorgang: u.vorgang + '-X' });
  await assert.rejects(() => L.antwortEntschluesselnPasswort(um(f.einmalpasswort.umschlag), f.einmalpasswort.testPasswort));
  await assert.rejects(() => L.antwortEntschluesselnSchluessel(um(f.schluesselpaar.umschlag), f.schluesselpaar.testPrivateJwk));
  await assert.rejects(() => L.antwortEntschluesselnPasswort(f.einmalpasswort.umschlag, f.einmalpasswort.testPasswort + 'x'));
  // Ein einziges Byte des Chiffrats verfälscht: GCM lehnt ab, in beiden Verfahren.
  const einByte = (u) => {
    const b = Buffer.from(u.ct, 'base64'); b[Math.floor(b.length / 2)] ^= 0x01;
    return Object.assign({}, u, { ct: b.toString('base64') });
  };
  await assert.rejects(() => L.antwortEntschluesselnPasswort(einByte(f.einmalpasswort.umschlag), f.einmalpasswort.testPasswort));
  await assert.rejects(() => L.antwortEntschluesselnSchluessel(einByte(f.schluesselpaar.umschlag), f.schluesselpaar.testPrivateJwk));
});
