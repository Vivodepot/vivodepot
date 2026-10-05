'use strict';
/* Wackel-Quarantäne (30.09.2026): je Test, mit einmaligem Wiederholungslauf. Echte Läufe über die Wache um
   `npm test` in einem Wegwerf-Repo. Rot-Beweis der Gegenlesung: ein quarantänierter Test, der deterministisch rot
   ist, macht den Lauf rot. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const w = require('../tools/geteilte-git-config-wache.js');
const Q = require('../tools/lib/wackel-quarantaene.js');

const REPORTER = path.join(__dirname, '..', 'tools', 'lib', 'datei-zeiten-reporter.mjs');
const HEUTE = new Date().toISOString().slice(0, 10);
const MORGEN = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
const GESTERN = new Date(Date.now() - 864e5).toISOString().slice(0, 10);

/* JEDE MARKE (03.10.2026, öffentlich rot auf Linux): `replace` traf nur die erste Stelle; `writeFileSync('MARKE')` blieb
   relativ. Auf macOS sind MARKE und marke dieselbe Datei (Groß-/Kleinschreibung egal), dort war die Gegenprobe grün,
   auf dem Linux-Runner nie. */
function vorlageEinsetzen(testQuelle, repo) { return testQuelle.replaceAll('MARKE', path.join(repo, 'marke')); }

function lauf(testQuelle, eintraege) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'wackel-quarantaene-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: repo, env: w.ohneGitUmgebung() });
    fs.writeFileSync(path.join(repo, 'p.test.js'), vorlageEinsetzen(testQuelle, repo));
    const liste = path.join(repo, 'q.json');
    fs.writeFileSync(liste, JSON.stringify({ deckel: eintraege.length, eintraege }));
    const alt = { ...process.env }; process.env.VD_WACKEL_QUARANTAENE = liste; delete process.env.NODE_TEST_CONTEXT;
    const zeilen = []; const ae = console.error; console.error = (x) => zeilen.push(String(x));
    let rc;
    try {
      rc = w.bewachterLauf(['node', '--test', '--test-reporter=spec', '--test-reporter-destination=stdout',
        '--test-reporter=' + REPORTER, '--test-reporter-destination=stderr', 'p.test.js'], { repo, temp: true, tempBasis: repo, stdio: 'ignore' });
    } finally { console.error = ae; process.env = alt; }
    return { rc, text: zeilen.join('\n') };
  } finally { fs.rmSync(repo, { recursive: true, force: true }); }
}
const WACKLER = "const fs=require('fs');const {test}=require('node:test');test('wackelt',()=>{if(!fs.existsSync('MARKE')){fs.writeFileSync('MARKE','1');throw new Error('erstes Mal rot')}});\n";
const IMMER_ROT = "const {test}=require('node:test');test('immer rot',()=>{throw new Error('rot')});\n";
const eintrag = (t, frist = MORGEN) => ({ datei: 'p.test.js', test: t, eigentuemer: 'Probe', seit: HEUTE, frist, grund: 'Probe', ratsche: 'probe' });

test('[Gegenprobe·Linux·Rot-Beweis] die Vorlage ersetzt jede MARKE, nicht nur die erste', () => {
  const q = vorlageEinsetzen(WACKLER, '/tmp/x');
  assert.ok(!q.includes('MARKE'), 'eine relative MARKE bliebe — auf einem Dateisystem mit Groß-/Kleinschreibung zwei Dateien');
  assert.equal(q.split('/tmp/x/marke').length - 1, 2);
  assert.ok(WACKLER.replace('MARKE', '/tmp/x/marke').includes('MARKE'), 'Gegenprobe: replace allein ließe eine stehen');
});

test('[Gegenprobe] ein Wackler in der Quarantäne: zweiter Lauf grün → HINWEIS „wackelt", Lauf grün', () => {
  const r = lauf(WACKLER, [eintrag('wackelt')]);
  assert.strictEqual(r.rc, 0, r.text);
  assert.match(r.text, /HINWEIS — wackelt/);
});

test('[Rot-Beweis] ein quarantänierter Test, der deterministisch rot ist, macht den Lauf rot', () => {
  const r = lauf(IMMER_ROT, [eintrag('immer rot')]);
  assert.notStrictEqual(r.rc, 0, r.text);
  assert.match(r.text, /auch im zweiten Lauf rot/);
});

test('[Rot-Beweis] ein Wackler OHNE Quarantäne-Eintrag bleibt rot (je Test, nicht je Datei)', () => {
  const r = lauf(WACKLER, [eintrag('ein anderer Test derselben Datei')]);
  assert.notStrictEqual(r.rc, 0, r.text);
});

test('[Rot-Beweis] abgelaufene Frist: rot, mit Eigentümer', () => {
  const r = lauf(WACKLER, [eintrag('wackelt', GESTERN)]);
  assert.notStrictEqual(r.rc, 0, r.text);
  assert.match(r.text, /abgelaufen — der Eigentümer ist dran/);
});

test('[Gegenprobe] der Wiederholungsbefehl behält die Optionen und nimmt nur die genannten Dateien', () => {
  assert.deepStrictEqual(Q.nurDateien(['node', '--test', '--require', './a.js', '--test-timeout=5', "tests/**/*.test.js", 'x.test.js'], ['q.test.js']),
    ['node', '--test', '--require', './a.js', '--test-timeout=5', 'q.test.js']);
});

test('[Gegenprobe] ohne VD_WACKEL_QUARANTAENE gibt es keine Quarantäne', () => {
  assert.strictEqual(Q.lesen(undefined), null);
});
