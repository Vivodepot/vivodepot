'use strict';
/* FELD-FEHLER-NICHT-ZUGEORDNET (Barrierefreiheits-Audit 06.09.2026, Befund 3; WCAG 3.3.1 und 4.1.2, Stufe A) — Klassenschutz
   Ein fehlerhaftes Feld trug die Klasse feld-fehler (roter Rand, Meldung daneben), aber weder aria-invalid noch einen Verweis auf
   die Meldung. Ein Vorleseprogramm erfuhr nicht, welches Feld falsch ist. Seit 23.10.2026 setzen nur die Helfer feldFehlerSetzen,
   feldFehlerLoesen und feldFehlerMeldungHTML die Klasse, und zwar immer zusammen mit aria-invalid und dem Verweis.
   Diese Probe hält das für den ganzen Kern und die Lese-App fest: außerhalb des Helfer-Blocks setzt niemand die Klasse.
   Das Verhalten im Browser (Dialog, Bearbeiten-Strecke, Wizard) misst tests/e2e/feld-fehler-zugeordnet.spec.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');   // im pre-commit sind GIT_DIR/GIT_INDEX_FILE gesetzt
const VORHER = 'a8243ba7e';   // der Stand vor dem Wagen; öffentlich fehlt die private Geschichte
function vorherDa() {
  try { execFileSync('git', ['cat-file', '-e', VORHER + '^{commit}'], { cwd: REPO, env: ohneGitUmgebung(), stdio: 'ignore' }); return true; } catch { return false; }
}
const vorher = (d) => execFileSync('git', ['show', VORHER + ':' + d], { cwd: REPO, env: ohneGitUmgebung(), maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' });
const DATEIEN = ['vivodepot.html', 'vivodepot-lesen.html'];
const SETZT_KLASSE = /classList\.(add|toggle|remove)\(\s*['"]feld-fehler['"]|class(Name)?\s*=\s*\\?['"][^'"]*\bfeld-fehler\b(?!-)/;

/** @returns {string[]} Zeilen außerhalb des Helfer-Blocks, die die Klasse feld-fehler setzen */
function stellenAmHelferVorbei(text) {
  const start = text.indexOf('let _feldFehlerZaehler = 0;');
  const ende = start < 0 ? -1 : text.indexOf('\n}\n', text.indexOf('function feldFehlerMeldungHTML('));
  const rest = start < 0 || ende < 0 ? text : text.slice(0, start) + text.slice(ende);
  return rest.split('\n').filter((z) => SETZT_KLASSE.test(z) && !/^\s*(\/\/|\*|\/\*)/.test(z)).map((z) => z.trim().slice(0, 140));
}

test('[Feld-Fehler·Klasse] feld-fehler wird in Kern und Lese-App nur über den gemeinsamen Helfer gesetzt', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.ok(kern.includes('function feldFehlerSetzen(') && kern.includes('function feldFehlerLoesen(') && kern.includes('function feldFehlerMeldungHTML('),
    'die Helfer fehlen im Kern');
  for (const d of DATEIEN) assert.deepEqual(stellenAmHelferVorbei(fs.readFileSync(path.join(REPO, d), 'utf8')), [], d + ': feld-fehler am Helfer vorbei');
});

test('[Feld-Fehler·Klasse·Rot-Beweis] der Kern vor dem Helfer (a8243ba7e) setzt die Klasse ohne aria-invalid — die Probe findet es', (t) => {
  if (!vorherDa()) return t.skip('ohne Git-Historie: der Stand ' + VORHER + ' fehlt');
  const alt = vorher('vivodepot.html');
  assert.ok(stellenAmHelferVorbei(alt).length >= 4, 'die alten Stellen (Dialoge, Wizard) wurden nicht gefunden');
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const mitNeuerStelle = kern + "\nfunction x(f) { f.classList.add('feld-fehler'); }\n";
  assert.equal(stellenAmHelferVorbei(mitNeuerStelle).length, 1, 'eine neue Stelle am Helfer vorbei bleibt unbemerkt');
});

test('[Feld-Fehler·HTML] feldFehlerMeldungHTML: die Eingabe trägt aria-invalid und verweist auf die Meldung mit dem Text', () => {
  const { V } = ladeKern();
  const r = V.feldFehlerMeldungHTML('<input type="date" data-edit="x" aria-describedby="fh-9"><input type="hidden" name="y">', 'Bitte ein gültiges Datum.');
  const id = /<p class="feld-fehler" role="alert" id="(ff-\d+)">Bitte ein gültiges Datum\.<\/p>/.exec(r.meldung);
  assert.ok(id, 'Meldung ohne id oder Text: ' + r.meldung);
  assert.match(r.eingabe, new RegExp('<input aria-invalid="true" type="date" data-edit="x" aria-describedby="fh-9 ' + id[1] + '">'));
  assert.match(r.eingabe, /<input type="hidden" name="y">/, 'ein verstecktes Feld bleibt unberührt');
});
