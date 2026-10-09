'use strict';
/* speicherstatus-schutz.test.js — die Fehler-Plakette des Speicherstatus malt mit der Tinte der Wurzel (Befund ERSCHEINUNGSBILD-RUECKFALL-SPEICHERSTATUS,
   07.10.2026). Ein Erscheinungsbild darf --auf-akzent in der Kopfzeile umdeuten (das Glas tut es für die helle Fläche); der geschützte Zustand
   „Sicherung fehlgeschlagen“ steht auf --error und braucht die Tinte, die die Paarprüfung [--auf-akzent, --error] an der Wurzel hält. Darum leitet der
   Schutz-Stil --auf-fehler-kern an :root ab, und kein Modul darf es setzen. Im Glas folgt --auf-akzent in der Kopfzeile einer Marke.
   Die Laufzeit hält tests/e2e/speicherstatus-lesbar.spec.js; diese Probe hält den Wortlaut, mit Rot-Beweis am früheren Stand. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const GLAS = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'erscheinung', 'erscheinungsbild-salbei-glas-modul.json'), 'utf8'));

function schutzStil(kern) {
  const a = kern.indexOf('<style id="schutz-stil">'); const e = kern.indexOf('</style>', a);
  return a < 0 ? '' : kern.slice(a, e);
}
function funde(kern, glasStil) {
  const s = schutzStil(kern); const aus = [];
  if (!/:root\s*\{\s*--auf-fehler-kern:\s*var\(--auf-akzent\)\s*!important;\s*\}/.test(s)) aus.push('keine Ableitung an :root');
  const fehler = s.split('\n').filter((z) => /\.tb-save-status\.ist-fehlgeschlagen/.test(z));
  if (!fehler.length) aus.push('keine Regel für den Fehlerzustand');
  if (fehler.some((z) => /color:\s*var\(--auf-akzent\)/.test(z))) aus.push('Fehlerzustand malt mit --auf-akzent');
  if (!fehler.some((z) => /color:\s*var\(--auf-fehler-kern\)\s*!important/.test(z))) aus.push('Fehlerzustand ohne --auf-fehler-kern');
  if (!/"geschuetzt": \[[^\]]*"--auf-fehler-kern"/.test(kern)) aus.push('--auf-fehler-kern nicht geschützt');
  if (!/\.topbar \{\s*--auf-akzent: var\(--vd-branding-topbar-text, var\(--ink\)\)/.test(glasStil)) aus.push('Glas: --auf-akzent der Kopfzeile folgt keiner Marke');
  return aus;
}
const glasStil = Object.values(GLAS.stil || {}).join('\n');

test('[Speicherstatus·Schutz] die Fehler-Plakette malt mit der Tinte der Wurzel; im Glas folgt die Kopfzeile der Marke', () => {
  assert.deepEqual(funde(KERN, glasStil), []);
});

test('[Speicherstatus·Schutz·Rot-Beweis] der frühere Wortlaut fällt auf', () => {
  const alt = KERN.replace(/\.tb-save-status\.ist-fehlgeschlagen \{ color: var\(--auf-fehler-kern\)/, '.tb-save-status.ist-fehlgeschlagen { color: var(--auf-akzent)');
  assert.ok(funde(alt, glasStil).includes('Fehlerzustand malt mit --auf-akzent'));
  assert.ok(funde(KERN.replace(':root { --auf-fehler-kern: var(--auf-akzent) !important; }', ''), glasStil).includes('keine Ableitung an :root'));
  assert.ok(funde(KERN, glasStil.replace('--auf-akzent: var(--vd-branding-topbar-text, var(--ink))', '--auf-akzent: var(--ink)')).includes('Glas: --auf-akzent der Kopfzeile folgt keiner Marke'));
});
