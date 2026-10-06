'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   scripts/pruefe-standards-echt-gate.js — „echt" verlangt den gemessenen Prüferlauf, nur bei Anlass (28.09.2026).
   Rot-Beweis: eine Datei des Prüferlaufs, eine Kern-Zeile am Verwahr-/Vorzeigepfad und ein nicht messbarer Bereich
   lösen das Gate aus. Gegenprobe: eine Kern-Zeile anderswo und eine reine Dokument-Änderung lösen nichts aus, und ein
   Push ohne Diff läuft gar nicht erst — mit dem Datum des letzten gemessenen Laufs im Hinweis.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const { anlassGegeben, kernStellenMitBildungstyp, ausgang, EXIT_WERKZEUG_FEHLT, ITB_EIGENE_DATEIEN, KERN_WEG } = require('../scripts/pruefe-standards-echt-gate.js');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');

test('[Standards-echt-Gate·Rot-Beweis] eine Datei des Prüferlaufs, der Kern am Verwahrpfad und ein nicht messbarer Bereich lösen das Gate aus', () => {
  assert.equal(anlassGegeben([ITB_EIGENE_DATEIEN[0]], []).ja, true, 'wer den Adapter ändert, muss ihn fahren');
  assert.equal(anlassGegeben(['vivodepot.html'], ['+function _edcOriginalAblegen(text, rohBytes) {']).ja, true, 'Kern am Verwahrpfad');
  assert.equal(anlassGegeben(['vivodepot.html'], null).ja, true, 'Kern-Diff nicht messbar: sicher fahren');
  assert.equal(anlassGegeben(['tests/fixtures/ob3-simple.json'], []).ja, true, 'eine Badge-Testdatei geändert');
  assert.equal(anlassGegeben(['vivodepot.html'], ['-function _ob3Lesen(text) {']).ja, true, 'Kern am Badge-Pfad');
  assert.equal(anlassGegeben(null, null).ja, true, 'kein messbarer Bereich: sicher fahren');
});

test('[Standards-echt-Gate·Gegenprobe] eine Kern-Zeile anderswo und eine Dokument-Änderung lösen nichts aus; ohne Diff läuft nichts', () => {
  assert.equal(anlassGegeben(['vivodepot.html'], ['+const SCHALEN_STAND = \'v999\';']).ja, false);
  assert.equal(anlassGegeben(['docs/adr/irgendein-adr.md'], []).ja, false);
  const env = ohneGitUmgebung();
  const kopf = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, env, encoding: 'utf8' }).trim();
  const r = spawnSync('node', [path.join(REPO, 'scripts', 'pruefe-standards-echt-gate.js')], {
    cwd: REPO, env, encoding: 'utf8', input: 'refs/heads/x ' + kopf + ' refs/heads/x ' + kopf + '\n',
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /kein Anlass/);
  assert.match(r.stdout, /Letzter gemessener Lauf: edc-ap \d{4}-\d{2}-\d{2}, open-badges-3 \d{4}-\d{2}-\d{2}/);
});

/* Die Anlass-Liste im Kern hängt an Namen. Liest eine Stelle unter neuem Namen den Bildungstyp, ginge ein
   neuer EDC-Pfad am Gate vorbei — darum muß jede solche Stelle in KERN_WEG stehen (Gegenlesung, 28.09.2026). */
const deckt = (name) => new RegExp('^(?:' + KERN_WEG.source + ')$').test(name);
test('[Standards-echt-Gate·Vollständigkeit] jede Kern-Stelle, die EDC_AP_KONTEXT, OB3_KENNUNG oder BILDUNG_DOK_TYPEN liest, steht in der Anlass-Liste', () => {
  const stellen = kernStellenMitBildungstyp(fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8'));
  assert.ok(stellen.length >= 5, 'Positivkontrolle: die Stellen werden gefunden (' + stellen.join(', ') + ')');
  assert.deepEqual(stellen.filter((n) => !deckt(n)), []);
});

test('[Standards-echt-Gate·Vollständigkeit·Rot-Beweis] eine neue Funktion, die den Bildungstyp liest, fällt auf', () => {
  const kern = 'function _neuerEdcWeg(e) {\n  return BILDUNG_DOK_TYPEN.find((d) => d.ig === e.ig);\n}\n';
  const stellen = kernStellenMitBildungstyp(kern);
  assert.deepEqual(stellen, ['_neuerEdcWeg']);
  assert.deepEqual(stellen.filter((n) => !deckt(n)), ['_neuerEdcWeg']);
});

/* Ein abgeschaltetes Docker ist kein Standardverstoß (Gegenlesung, 29.09.2026): fehlt das Werkzeug, endet das Gate mit
   eigenem Exit und „KEIN roter Prüfbefund"; nur ein rotes Urteil des Prüfers ist Exit 1. */
test('[Standards-echt-Gate·Werkzeug fehlt] ohne Werkzeug: eigener Exit und „KEIN roter Prüfbefund" — am echten Skript, über einen Bereich mit Anlass', () => {
  const env = { ...ohneGitUmgebung(), ITB_SHACL_AUS: '1', OB3_VALIDATOR_AUS: '1' };
  const neu = execFileSync('git', ['log', '-1', '--format=%H', '--', 'tests/konformitaet/adapter/itb-shacl.mjs'], { cwd: REPO, env, encoding: 'utf8' }).trim();
  const alt = execFileSync('git', ['rev-parse', neu + '^'], { cwd: REPO, env, encoding: 'utf8' }).trim();
  const r = spawnSync('node', [path.join(REPO, 'scripts', 'pruefe-standards-echt-gate.js')], {
    cwd: REPO, env, encoding: 'utf8', input: 'refs/heads/x ' + neu + ' refs/heads/x ' + alt + '\n',
  });
  assert.match(r.stdout, /Anlass: Datei des Prüferlaufs/, 'Positivkontrolle: der Bereich hat einen Anlass — ' + r.stdout + r.stderr);
  assert.equal(r.status, EXIT_WERKZEUG_FEHLT, r.stdout + r.stderr);
  assert.match(r.stderr, /KEIN roter Prüfbefund/);
  assert.doesNotMatch(r.stderr, /ROT für/);
});

test('[Standards-echt-Gate·Werkzeug fehlt·Rot-Beweis] ein rotes Urteil bleibt Exit 1 und heißt Befund — auch wenn daneben ein Werkzeug fehlt', () => {
  const rot = ausgang({ rot: ['edc-ap'], fehlt: ['open-badges-3: Docker fehlt'] });
  assert.equal(rot.code, 1);
  assert.match(rot.text, /ROT für edc-ap/);
  assert.doesNotMatch(rot.text, /KEIN roter Prüfbefund/);
  const fehlt = ausgang({ fehlt: ['edc-ap: Docker fehlt'] });
  assert.equal(fehlt.code, EXIT_WERKZEUG_FEHLT);
  assert.notEqual(EXIT_WERKZEUG_FEHLT, 1, 'derselbe Exit wie ein Befund wäre nicht unterscheidbar');
  assert.deepEqual(ausgang({}), { code: 0, text: '' });
});
