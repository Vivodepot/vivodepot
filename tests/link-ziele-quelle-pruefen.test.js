'use strict';
/* Wächter gegen die Klasse QR-ABHOLSEITE-ANFRAGE-FEHLT (16.11.2026): jedes Link- und QR-Ziel auf einem eigenen Host hat eine
   Quelle im Repo oder steht in der Positivliste, und die Positivliste darf nur sinken. Werkzeug: tools/link-ziele-quelle-pruefen.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const W = require('../tools/link-ziele-quelle-pruefen.js');

const REPO = path.join(__dirname, '..');
const lesen = (p) => fs.readFileSync(path.join(REPO, p), 'utf8');
const GL = W.grundlinieLesen();

test('[Link-Ziele] Kern und Studio: jedes Ziel hat eine Quelle oder steht in der Positivliste', () => {
  assert.deepEqual(W.pruefen(), []);
  const r = spawnSync(process.execPath, [path.join(REPO, 'tools', 'link-ziele-quelle-pruefen.js')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

test('[Link-Ziele·Rot-Beweis] das Studio ohne share/anfrage.html (der Stand vor dem Befund) ist rot', () => {
  const leer = fs.mkdtempSync(path.join(os.tmpdir(), 'lzq-'));
  fs.cpSync(path.join(REPO, 'share'), path.join(leer, 'share'), { recursive: true });
  fs.cpSync(path.join(REPO, 'pod'), path.join(leer, 'pod'), { recursive: true });
  try {
    assert.deepEqual(W.pruefeText(lesen('vivodepot-studio.html'), GL.ohneQuelle, leer), []);
    fs.unlinkSync(path.join(leer, 'share', 'anfrage.html'));
    const b = W.pruefeText(lesen('vivodepot-studio.html'), GL.ohneQuelle, leer);
    assert.deepEqual(b.map((x) => x.ziel), ['share.vivodepot.de/anfrage.html']);
  } finally { fs.rmSync(leer, { recursive: true, force: true }); }
});

test('[Link-Ziele·Rot-Beweis] ein gepflanztes Ziel ohne Quelle fällt, auf jedem eigenen Host; Kennungen nicht', () => {
  const basis = lesen('vivodepot-studio.html');
  for (const ziel of ['https://share.vivodepot.de/neu.html', 'https://pod.vivodepot.de/neu.html', 'https://neu.vivodepot.de/seite', 'https://vivodepot.org/x']) {
    const b = W.pruefeText(basis.replace('</body>', '<a href="' + ziel + '?a=1#b">x</a></body>'), GL.ohneQuelle);
    assert.equal(b.length, 1, ziel);
    assert.equal(b[0].ziel, ziel.replace('https://', ''));
  }
  assert.deepEqual(W.pruefeText('"https://vivodepot.de/schemas/x.json" "https://vivodepot.de/credentials/v1"', []), []);
  assert.deepEqual(W.pruefeText('https://share.vivodepot.de/empfangen.html#x', []), [], 'share/empfangen.html liegt im Repo');
});

test('[Link-Ziele·Mechanik] --datei prüft die genannte Datei, Exit 1 mit Fund', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'lzq-'));
  try {
    const datei = path.join(d, 'x.html');
    fs.writeFileSync(datei, '<a href="https://share.vivodepot.de/gibtsnicht.html">x</a>');
    const r = spawnSync(process.execPath, [path.join(REPO, 'tools', 'link-ziele-quelle-pruefen.js'), '--datei', datei], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /gibtsnicht\.html/);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('[Link-Ziele·Ratsche] die Positivliste darf nur sinken: kein Eintrag ohne Vorkommen, keiner mit Quelle im Repo, höchstens der Deckel', () => {
  const liste = GL.ohneQuelle;
  assert.ok(liste.length <= GL.deckel, 'Deckel ' + GL.deckel + ' überschritten: ' + liste.length + ' (Anheben nur mit eigenem Befund)');
  assert.ok(liste.every((e) => e.adresse && e.grund && e.datum), 'je Eintrag Adresse, Grund, Datum');
  assert.deepEqual(W.veralteteEintraege(W.STANDARD_DATEIEN.map(lesen), liste), [], 'Eintrag ohne Vorkommen: streichen, Deckel senken');
  for (const e of liste) assert.equal(W.quelleVon(e.adresse), null, e.adresse + ' hat jetzt eine Quelle im Repo: Eintrag streichen, Deckel senken');
  assert.equal(GL.deckel, liste.length, 'der Deckel steht auf dem Ist-Wert');
});

test('[Link-Ziele·Rot-Beweis] eine Liste über dem Deckel oder mit überholtem Eintrag fällt', () => {
  assert.ok(W.veralteteEintraege(['https://vivodepot.de/'], [{ adresse: 'register.vivodepot.de/' }]).length === 1);
  assert.notEqual(W.quelleVon('share.vivodepot.de/anfrage.html'), null, 'ein Eintrag für eine vorhandene Quelle wäre überholt');
});
