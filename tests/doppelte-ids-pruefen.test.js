'use strict';
/* ═════════════════════════════════════════════════════════════════════════
   Doppelte IDs (Studio-Befund as-k-name, 10.11.2026)
   ─────────────────────────────────────────────────────────────────────────
   (1) Jede ausgelieferte Seite besteht tools/doppelte-ids-pruefen.js gegen tools/doppelte-ids-grundlinie.json; das Studio steht
       bei 0 doppelten IDs im Markup, alle anderen Seiten ebenfalls.
   (2) Die Vorschau-Kopfzeile der Anfrage hat eine eigene ID, und anfrageVorschauRendern() schreibt den Namen dorthin, nicht in das
       Eingabefeld (as-k-name).
   (3) ROT-BEWEIS: eine gepflanzte Doppelung im Markup wird gefunden; dieselbe ID im Skript nicht als Markup-Doppelung; eine
       dynamische ID wird gezählt, nicht verglichen.
   (4) Die Grundlinie sinkt nur: ein neuer Kandidat in den Skriptvorlagen ist rot, ein verschwundener verlangt den Eintrag zu streichen.
   Das Verhalten im Browser (die Vorschau zeigt den Namen nach der Eingabe) liegt in tests/e2e-cross/T-CROSS-43-studio-vorschau-name.spec.js.
   ═════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const W = require('../tools/doppelte-ids-pruefen.js');

const REPO = path.join(__dirname, '..');
const STUDIO = fs.readFileSync(path.join(REPO, 'vivodepot-studio.html'), 'utf8');
const GRUND = JSON.parse(fs.readFileSync(W.GRUNDLINIE, 'utf8'));

test('[Doppelte IDs] jede ausgelieferte Seite besteht die Grundlinie, das Studio hat 0 doppelte IDs im Markup', () => {
  for (const s of W.SEITEN) {
    const m = W.messeDatei(path.join(REPO, s));
    assert.deepEqual(m.doppeltMarkup, [], s + ': doppelte IDs im Markup');
    assert.deepEqual(W.gegenGrundlinie(s, m, GRUND), [], s);
  }
  assert.equal(GRUND.seiten['vivodepot-studio.html'].markup, 0);
  for (const s of W.SEITEN) assert.equal(GRUND.seiten[s].markup, 0, s + ': die Grundlinie für Markup-Doppelungen ist 0');
});

test('[Doppelte IDs] das Werkzeug ohne Argument: Exit 0 auf dem Stand des Repos', () => {
  const r = spawnSync(process.execPath, [path.join(REPO, 'tools', 'doppelte-ids-pruefen.js')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /doppelte-ids: nichts Neues/);
});

test('[Studio · Vorschau] die Kopfzeile der Vorschau hat eine eigene ID, anfrageVorschauRendern schreibt den Namen dorthin', () => {
  const a = STUDIO.indexOf('<div id="anfrage-vorschau"');
  const kopf = STUDIO.slice(a).match(/<div class="as-kopf">[\s\S]{0,400}?<b id="([^"]+)"/);
  assert.ok(kopf, 'Kopfzeile .as-kopf mit <b id="…"> nicht gefunden');
  assert.notEqual(kopf[1], 'as-k-name', 'die Kopfzeile darf nicht die ID des Eingabefelds tragen');
  const eingabe = STUDIO.match(/<input[^>]*id="as-k-name"[^>]*>/);
  assert.ok(eingabe, 'das Eingabefeld as-k-name fehlt');
  const i = STUDIO.indexOf('function anfrageVorschauRendern()');
  const rumpf = STUDIO.slice(i, STUDIO.indexOf('\nfunction ', i + 10));
  assert.ok(rumpf.includes("$('" + kopf[1] + "')") && rumpf.includes('ASSISTENT.name'), 'anfrageVorschauRendern schreibt nicht in die Kopfzeile der Vorschau (' + kopf[1] + ')');
  assert.ok(!rumpf.includes("$('as-k-name')"), 'anfrageVorschauRendern greift das Eingabefeld statt der Vorschau');
});

test('[Doppelte IDs · Rot-Beweis] eine gepflanzte Doppelung im Markup wird gefunden, im Skript und bei dynamischen IDs nicht als Markup-Doppelung', () => {
  const sauber = '<body><input id="a"><b id="b"></b></body>';
  assert.deepEqual(W.messen(sauber).doppeltMarkup, []);
  const gepflanzt = W.messen('<body><input id="a"><b id="b"></b><i id="a"></i></body>');
  assert.deepEqual(gepflanzt.doppeltMarkup, [{ id: 'a', n: 2 }]);
  const skript = W.messen('<body><b id="a"></b><script>var x = \'<p id="a">\' + y + \'<p id="r-\' + n + \'">\';</script></body>');
  assert.deepEqual(skript.doppeltMarkup, []);
  assert.deepEqual(skript.kandidaten, ['a'], 'dieselbe ID im Markup und in einer Vorlage ist ein Kandidat, keine Markup-Doppelung');
  assert.equal(skript.ausnahmen.length, 1);
  const vorlagen = W.messen('<script>a = \'<p id="z">\'; b = \'<p id="z">\';</script>');
  assert.deepEqual(vorlagen.kandidaten, ['z']);
  const imMarkupUndInVorlage = W.messen('<b id="q"></b><script>a = \'<p id="q">\';</script>');
  assert.deepEqual(imMarkupUndInVorlage.kandidaten, ['q']);
});

test('[Doppelte IDs · Rot-Beweis] die Studio-Seite mit gepflanzter Doppelung gegen die Grundlinie ist rot', () => {
  const kopie = STUDIO.replace('</body>', '<i id="as-strasse"></i></body>');
  assert.notEqual(kopie, STUDIO);
  const m = W.messen(kopie);
  const f = W.gegenGrundlinie('vivodepot-studio.html', m, GRUND);
  assert.equal(f.length, 1);
  assert.match(f[0], /as-strasse ×2/);
});

test('[Doppelte IDs · Ratsche] ein neuer Kandidat ist rot, ein verschwundener verlangt das Streichen, mehr dynamische IDs sind rot', () => {
  const m = { doppeltMarkup: [], kandidaten: ['neu-1'], ausnahmen: new Array(2).fill('x') };
  const f = W.gegenGrundlinie('vivodepot-studio.html', m, GRUND);
  assert.ok(f.some((z) => /neue Kandidaten.*neu-1/.test(z)), f.join('|'));
  const weniger = W.gegenGrundlinie('vivodepot-lesen.html', { doppeltMarkup: [], kandidaten: GRUND.seiten['vivodepot-lesen.html'].skriptvorlagen.slice(1), ausnahmen: new Array(3).fill('x') }, GRUND);
  assert.ok(weniger.some((z) => /aus der Grundlinie streichen/.test(z)), weniger.join('|'));
  const mehr = W.gegenGrundlinie('vivodepot-studio.html', { doppeltMarkup: [], kandidaten: [], ausnahmen: new Array(3).fill('x') }, GRUND);
  assert.ok(mehr.some((z) => /dynamische IDs/.test(z)), mehr.join('|'));
  assert.ok(W.gegenGrundlinie('gibt-es-nicht.html', m, GRUND)[0].includes('steht nicht in der Grundlinie'));
});
