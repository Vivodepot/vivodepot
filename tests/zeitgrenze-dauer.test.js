'use strict';
/* tools/mit-zeitgrenze.pl schreibt je Lauf Grenze, Dauer, Anteil und Ergebnis (29.09.2026) und sagt bei einem
   Abbruch nach Zeit ausdrücklich, dass kein Test rot war. Anlass: ein Push kam bei halber Parallelität nahe an die
   Suite-Grenze; ein Zeitabbruch hätte ausgesehen wie Rot. Rot-Beweis: ohne die Zeile gäbe es keine Messung, und die
   Abbruch-Meldung trüge den Satz nicht. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const PL = path.join(REPO, 'tools', 'mit-zeitgrenze.pl');

function lauf(grenze, befehl, env = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'zeitgrenze-dauer-'));
  try {
    const datei = path.join(d, 'dauer.ndjson');
    const r = spawnSync('perl', [PL, String(grenze), '--', ...befehl], { encoding: 'utf8',
      env: { ...process.env, VD_ZEITGRENZE_DAUER_DATEI: datei, VD_ZEITGRENZE_PROTOKOLL_DIR: d, ...env } });
    const zeilen = fs.existsSync(datei) ? fs.readFileSync(datei, 'utf8').trim().split('\n').map((z) => JSON.parse(z)) : [];
    return { r, zeilen };
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
}

test('[Gegenprobe] ein grüner Lauf schreibt Grenze, Dauer, Anteil und Ergebnis', () => {
  const { r, zeilen } = lauf(10, ['true']);
  assert.strictEqual(r.status, 0);
  assert.strictEqual(zeilen.length, 1);
  assert.deepStrictEqual([zeilen[0].grenze_s, zeilen[0].ergebnis], [10, 'gruen']);
  assert.ok(typeof zeilen[0].dauer_s === 'number' && zeilen[0].anteil < 0.8);
});

test('[Gegenprobe] ein roter Befehl ist „rot" und behält seinen Exit-Code', () => {
  const { r, zeilen } = lauf(10, ['sh', '-c', 'exit 3']);
  assert.strictEqual(r.status, 3);
  assert.strictEqual(zeilen[0].ergebnis, 'rot');
});

test('[Rot-Beweis] ein Abbruch nach Zeit ist „zeitgrenze", Exit 142, und die Meldung sagt: kein roter Test', () => {
  const { r, zeilen } = lauf(1, ['sleep', '5']);
  assert.strictEqual(r.status, 142);
  assert.strictEqual(zeilen[0].ergebnis, 'zeitgrenze');
  assert.match(r.stderr, /ZEITGRENZE 1 s GERISSEN — das ist KEIN roter Test/);
});

test('[Gegenprobe] ein Lauf aus einem Test trägt quelle=test und meldet keinen 80-%-Hinweis', () => {
  const { r, zeilen } = lauf(2, ['sleep', '1.8'], { VD_HOOK_SPERRE_JE_PID: '1' });
  assert.strictEqual(zeilen[0].quelle, 'test');
  assert.ok(!/HINWEIS/.test(r.stderr));
});

test('[Gegenprobe] ein echter Lauf über 80 % der Grenze meldet sich', () => {
  const env = { ...process.env }; delete env.VD_HOOK_SPERRE_JE_PID;
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'zeitgrenze-dauer-'));
  try {
    const r = spawnSync('perl', [PL, '2', '--', 'sleep', '1.8'], { encoding: 'utf8', env: { ...env, VD_ZEITGRENZE_DAUER_DATEI: path.join(d, 'x.ndjson') } });
    assert.match(r.stderr, /HINWEIS: .* % der Grenze 2 s \(ueber 80 %\)/);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('[Gegenprobe] ein Testlauf ohne ausdrückliche Datei schreibt nichts ins gemeinsame Git-Verzeichnis', () => {
  const src = fs.readFileSync(PL, 'utf8');
  assert.match(src, /return 1 if !\$datei && \$ENV\{VD_HOOK_SPERRE_JE_PID\};/);
});

/* LAST UND BELEGUNG (20.10.2026): je Lauf die 1-Minuten-Last und die Zahl der Suite-Plätze, die beim Start ein lebender Lauf
   hielt — sonst ist nicht messbar, ob zwei Plätze mehr Durchsatz bringen und wo die Lastschwelle liegt. */
test('[Dauer·Last und Belegung] jede Zeile trägt last_start und plaetze_belegt_start; gezählt wird nur ein lebender Halter', () => {
  const pd = fs.mkdtempSync(path.join(os.tmpdir(), 'zeitgrenze-plaetze-'));
  try {
    fs.writeFileSync(path.join(pd, 'platz-1.lock'), JSON.stringify({ pid: process.pid, name: 'pre-commit' }));
    fs.writeFileSync(path.join(pd, 'platz-2.lock'), JSON.stringify({ pid: 2 ** 22 + 12345, name: 'tot' }));   // kein lebender Prozess
    const { r, zeilen } = lauf(10, ['true'], { VD_SUITE_PLATZ_DIR: pd });
    assert.strictEqual(r.status, 0);
    assert.ok(typeof zeilen[0].last_start === 'number' && zeilen[0].last_start >= 0, JSON.stringify(zeilen[0]));
    assert.strictEqual(zeilen[0].plaetze_belegt_start, 1, 'der tote Halter zählt nicht');
    fs.rmSync(path.join(pd, 'platz-1.lock'));
    assert.strictEqual(lauf(10, ['true'], { VD_SUITE_PLATZ_DIR: pd }).zeilen[0].plaetze_belegt_start, 0);
  } finally { fs.rmSync(pd, { recursive: true, force: true }); }
});
