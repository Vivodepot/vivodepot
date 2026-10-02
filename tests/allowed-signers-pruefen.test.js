'use strict';
/* ═════════════════════════════════════════════════════════════════
   .github/allowed_signers enthält nur öffentliche Schlüssel (30.09.2026)
   ─────────────────────────────────────────────────────────────────
   Liegt die Datei im Repo, besteht sie tools/allowed-signers-pruefen.js mit der Tagger-Adresse als Prinzipal.
   Die Beispiele unten benutzen Wegwerf-Schlüssel, im Temp erzeugt; kein echter Schlüssel wird gelesen.
   ROT-BEWEIS: ein privater Schlüssel, ein unbekannter Typ, kaputtes Base64, ein Typ, der nicht zum Base64
   passt, eine leere Datei und ein fehlender Prinzipal sind rot, und keine Meldung gibt den Inhalt wieder.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pruefen } = require('../tools/allowed-signers-pruefen.js');

const TAGGER = 'dev@vivodepot.de';

function wegwerf() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'allowed-signers-'));
  const p = path.join(tmp, 'k');
  execFileSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-C', 'wegwerf', '-f', p], { stdio: 'pipe' });
  const r = { oeffentlich: fs.readFileSync(p + '.pub', 'utf8').trim(), privat: fs.readFileSync(p, 'utf8') };
  fs.rmSync(tmp, { recursive: true, force: true });
  return r;
}

// Seit v1.0.857 sind die Release-Tags SSH-signiert. Der Schlüssel liegt NICHT im Repo (Signier-Anleitung 01.10.2026: auch der
// öffentliche Teil nicht als Datei); SECURITY.md 2.1 nennt stattdessen die Adresse auf der Website, unter der Vivodepot ihn
// veröffentlicht, seinen Fingerabdruck und den Prüfbefehl; die erwartete Ausgabe nennt genau diesen Fingerabdruck. Liegt doch eine .github/allowed_signers im Repo, besteht sie die Formprüfung.
const ECHT = path.join(__dirname, '..', '.github', 'allowed_signers');
const SCHLUESSEL_QUELLE = /https:\/\/vivodepot\.de\/\.well-known\/vivodepot-allowed-signers/;
const FINGERABDRUCK = /SHA256:[A-Za-z0-9+\/]{43}/g;
function tagPruefwegBefund(sec, dateiDa) {
  if (/Die Tags sind nicht signiert/.test(sec)) return 'SECURITY.md sagt noch, die Tags seien nicht signiert';
  if (!/tag -v v1\.0\.\d+/.test(sec)) return 'SECURITY.md nennt keinen Prüfbefehl git tag -v';
  if (!SCHLUESSEL_QUELLE.test(sec)) return 'SECURITY.md nennt keine öffentliche Quelle des Signierschlüssels';
  const abdruecke = new Set(sec.slice(sec.indexOf('### 2.1'), sec.indexOf('### 2.2')).match(FINGERABDRUCK) || []);
  if (abdruecke.size !== 1) return 'SECURITY.md 2.1 nennt nicht genau einen Fingerabdruck des Release-Schlüssels (' + abdruecke.size + ')';
  if (!dateiDa && /\.github\/allowed_signers/.test(sec)) return 'SECURITY.md verweist auf eine allowed_signers im Repo, die es nicht gibt';
  return null;
}
test('[allowed_signers] SECURITY.md nennt den Prüfweg für signierte Tags mit öffentlicher Schlüsselquelle; eine Repo-Datei bestünde die Formprüfung', () => {
  const dateiDa = fs.existsSync(ECHT);
  if (dateiDa) assert.deepEqual(pruefen(fs.readFileSync(ECHT, 'utf8'), { prinzipal: TAGGER }), []);
  const sec = fs.readFileSync(path.join(__dirname, '..', 'SECURITY.md'), 'utf8');
  assert.equal(tagPruefwegBefund(sec, dateiDa), null);
});

test('[allowed_signers·Rot-Beweis] alter Satz, fehlender Prüfbefehl, fehlende Schlüsselquelle, fehlender oder zweiter Fingerabdruck, Verweis auf fehlende Datei: rot', () => {
  const fp = 'SHA256:' + 'A'.repeat(43);
  const gut = '### 2.1 Tags ab v1.0.857 sind SSH-signiert, Fingerabdruck ' + fp + '. curl -s https://vivodepot.de/.well-known/vivodepot-allowed-signers … git tag -v v1.0.857 … with ED25519 key ' + fp + ' ### 2.2';
  assert.equal(tagPruefwegBefund(gut, false), null);
  assert.match(tagPruefwegBefund(gut + ' Die Tags sind nicht signiert.', false), /nicht signiert/);
  assert.match(tagPruefwegBefund(gut.replace('tag -v v1.0.857', ''), false), /Prüfbefehl/);
  assert.match(tagPruefwegBefund(gut.replace(/https:\S+/, ''), false), /Quelle/);
  assert.match(tagPruefwegBefund(gut.split(fp).join(''), false), /Fingerabdruck/);
  assert.match(tagPruefwegBefund(gut.replace(' ### 2.2', ' SHA256:' + 'B'.repeat(43) + ' ### 2.2'), false), /genau einen/);
  assert.match(tagPruefwegBefund(gut + ' .github/allowed_signers', false), /gibt/);
  assert.equal(tagPruefwegBefund(gut + ' .github/allowed_signers', true), null);
});

test('[allowed_signers] eine gültige Zeile mit Optionen und Kommentar ist grün', () => {
  const k = wegwerf();
  const [typ, b64] = k.oeffentlich.split(' ');
  assert.deepEqual(pruefen('# Kommentar\n' + TAGGER + ' namespaces="git" ' + typ + ' ' + b64 + ' kommentar\n', { prinzipal: TAGGER }), []);
});

test('[allowed_signers·Rot-Beweis] privat, falscher Typ, kaputtes Base64, Typ passt nicht, leer, fremder Prinzipal: rot, ohne Inhalt', () => {
  const k = wegwerf();
  const [typ, b64] = k.oeffentlich.split(' ');
  const faelle = {
    privat: TAGGER + ' ' + typ + ' ' + b64 + '\n' + k.privat,
    unbekannterTyp: TAGGER + ' ssh-dss ' + b64 + '\n',
    kaputtesBase64: TAGGER + ' ' + typ + ' !!nicht-base64!!\n',
    typPasstNicht: TAGGER + ' ecdsa-sha2-nistp256 ' + b64 + '\n',
    leer: '# nur ein Kommentar\n',
    fremderPrinzipal: 'jemand@example.invalid ' + typ + ' ' + b64 + '\n',
  };
  for (const [name, text] of Object.entries(faelle)) {
    const befunde = pruefen(text, { prinzipal: TAGGER });
    assert.ok(befunde.length >= 1, name + ' muss rot sein');
    for (const b of befunde) assert.ok(!b.includes(b64.slice(0, 20)), name + ': eine Meldung gibt Schlüsselinhalt wieder');
  }
  assert.match(pruefen(faelle.privat)[0], /privates Schlüsselmaterial/);
});
