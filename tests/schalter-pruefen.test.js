'use strict';
/* `--help` und unbekannte Schalter halten ein Werkzeug an (22.10.2026). Anlass: `node tools/faktenbasis-erzeugen.js --help`
   fuhr eine Suite ohne Platz und schrieb docs/faktenbasis.md neu. Die Klasse: jedes Werkzeug in tools/, das eine Datei
   schreibt UND einen Testlauf startet — dort kostet ein falscher Schalter einen Suite-Lauf und eine umgeschriebene Datei.
   Die Klassenprobe leitet die Menge aus dem Quelltext ab, keine gepflegte Liste: ein neues Werkzeug dieser Art ohne
   den Aufruf geht hier rot. */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { schalterUrteil, bekannteSchalter } = require('../tools/lib/schalter-pruefen.js');

const REPO = path.join(__dirname, '..');
const TOOLS = path.join(REPO, 'tools');
const AUFRUF = /require\('\.\/lib\/schalter-pruefen\.js'\)\.schalterPruefen\(module\)/;

/* Schreibt eine Datei, startet einen Testlauf und ist als Kommandozeile gedacht. */
function inDerKlasse(quelltext) {
  return /writeFileSync/.test(quelltext)
    && /mitTestLauf|npm', \['test|suiteDateien|'--test'/.test(quelltext)
    && /require\.main === module/.test(quelltext);
}
const ohneAufruf = (q) => q.split('\n').filter((z) => !AUFRUF.test(z)).join('\n');

test('[Schalter] --help/-h ist Hilfe, ein unbekannter Schalter hält an, bekannte und Werte laufen weiter', () => {
  const q = "const argv = process.argv; argv.includes('--check'); const i = argv.indexOf('--ausgabe');";
  assert.equal(schalterUrteil(['--help'], q).art, 'hilfe');
  assert.equal(schalterUrteil(['-h'], q).art, 'hilfe');
  assert.deepEqual(schalterUrteil(['--chek'], q), { art: 'unbekannt', unbekannt: ['--chek'] });
  assert.equal(schalterUrteil(['--check', '--ausgabe', '/tmp/x.md'], q).art, 'weiter');
  assert.equal(schalterUrteil([], q).art, 'weiter');
});

test('[Schalter] eine Passphrase im argv sperrt mit dem Satz der Werkzeuge, nicht als unbekannter Schalter', () => {
  const q = "argv.includes('--trocken');";
  assert.equal(schalterUrteil(['--trocken', '--passphrase=x'], q).art, 'passphrase');
  assert.equal(schalterUrteil(['-passphrase', 'x'], q).art, 'passphrase');
  assert.equal(schalterUrteil(['--help', '--passphrase=x'], q).art, 'passphrase');
});

test('[Schalter] Schalter über einen Leser `arg(\'name\')` zählen als bekannt', () => {
  const q = "const arg = (n) => { const i = argv.indexOf('--' + n); return argv[i + 1]; }; arg('ziel'); arg('repo');";
  const b = bekannteSchalter(q);
  assert.ok(b.has('--ziel') && b.has('--repo'), [...b].join(' '));
  assert.equal(schalterUrteil(['--ziel', 'x'], q).art, 'weiter');
});

test('[Schalter·Klasse] jedes schreibende Werkzeug mit Testlauf ruft schalterPruefen(module), bevor es etwas tut', () => {
  const klasse = fs.readdirSync(TOOLS).filter((f) => f.endsWith('.js'))
    .map((f) => [f, fs.readFileSync(path.join(TOOLS, f), 'utf8')]).filter(([, q]) => inDerKlasse(q));
  assert.ok(klasse.length >= 10, 'Positivkontrolle: die Klasse ist besetzt (' + klasse.length + ')');
  const ohne = klasse.filter(([, q]) => !AUFRUF.test(q.split('\n').slice(0, 5).join('\n'))).map(([f]) => f);
  assert.deepEqual(ohne, [], 'ohne Aufruf in den ersten fünf Zeilen');
});

test('[Schalter·Klasse·Rot-Beweis] faktenbasis-erzeugen.js in der Fassung bis 22.10.2026 fällt unter die Klasse und hat den Aufruf nicht', () => {
  const alt = ohneAufruf(fs.readFileSync(path.join(TOOLS, 'faktenbasis-erzeugen.js'), 'utf8'));
  assert.ok(inDerKlasse(alt));
  assert.ok(!AUFRUF.test(alt));
});

test('[Schalter·Lauf] faktenbasis-erzeugen.js --help und --gibts-nicht geben Hilfe aus und schreiben nichts', () => {
  const ziel = path.join(REPO, 'docs', 'faktenbasis.md');
  const summe = () => crypto.createHash('sha256').update(fs.readFileSync(ziel)).digest('hex');
  assert.match(fs.readFileSync(path.join(TOOLS, 'faktenbasis-erzeugen.js'), 'utf8').split('\n').slice(0, 5).join('\n'), AUFRUF,
    'ohne Aufruf liefe hier eine Suite — erst der Klassentest');
  const vorher = summe();
  for (const [schalter, exit] of [['--help', 0], ['--gibts-nicht', 2]]) {
    const r = spawnSync(process.execPath, [path.join(TOOLS, 'faktenbasis-erzeugen.js'), schalter], { encoding: 'utf8', cwd: REPO, timeout: 20000 });
    assert.equal(r.status, exit, schalter + ': ' + r.stderr);
    assert.match(r.stdout, /^\/\*/, schalter + ': der Kopfkommentar als Hilfe');
  }
  assert.equal(summe(), vorher, 'docs/faktenbasis.md unverändert');
});
