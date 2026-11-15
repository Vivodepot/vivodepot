'use strict';
/* Eine Probe, die am echten Repo einen Commit beim Hash nennt, nennt nur einen Vorfahren des geprüften Stands (14.11.2026).
   Anlass: [Gebaut-ohne-Landung·B13] fragte einen Commit ab, der nur in einem lokalen Zweig lag. Auf dem Prüfrechner (Klon mit
   allen Remote-Zweigen) hieß das Urteil „Commit nicht im Repo“, und jeder Lauf war rot, lokal blieb er grün.
   Gelesen werden die Stellen, an denen ein Hash als Commit ins echte Repo geht: in Zeilen, die REPO (oder cwd: repo) nennen,
   git-Aufrufe mit Hash-Argument, `stand: '<hash>'` und „gebaut <hash>“. Jeder muss `git merge-base --is-ancestor <hash> HEAD` bestehen. */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const MUSTER = [
  /\bgebaut ([0-9a-f]{7,40})\b/g,
  /\bstand: '([0-9a-f]{7,40})'/g,
  /'git',\s*\[\s*'(?:show|archive|cat-file|rev-parse|merge-base|log|diff|ls-tree)'(?:,\s*'-[^']*')*,\s*'([0-9a-f]{7,40})(?:[:^~][^']*)?'/g,
];
// Nur Zeilen, die das echte Repo ansprechen (REPO oder cwd: repo); erfundene Hashes in Fixture-Tabellen gehen nie ans Repo.
const AM_REPO = /\bREPO\b|\bcwd: repo\b/;
function hashesIn(text) {
  const aus = new Set();
  for (const zeile of String(text).split('\n')) {
    if (!AM_REPO.test(zeile)) continue;
    for (const re of MUSTER) for (const m of zeile.matchAll(re)) aus.add(m[1]);
  }
  return [...aus];
}
function vorfahr(hash) {
  return spawnSync('git', ['merge-base', '--is-ancestor', hash, 'HEAD'], { cwd: REPO, env: ohneGitUmgebung() }).status === 0;
}

test('[Proben-Commits·Kanon] jeder Commit, den eine Probe am echten Repo beim Hash nennt, ist Vorfahr des Stands', () => {
  const ordner = path.join(REPO, 'tests');
  const fehlt = [];
  let gezaehlt = 0;
  for (const d of fs.readdirSync(ordner).filter((x) => x.endsWith('.test.js'))) {
    for (const h of hashesIn(fs.readFileSync(path.join(ordner, d), 'utf8'))) { gezaehlt++; if (!vorfahr(h)) fehlt.push('tests/' + d + ': ' + h); }
  }
  assert.ok(gezaehlt >= 3, 'das Muster trifft die bekannten Stellen (gefunden ' + gezaehlt + ')');
  assert.deepEqual(fehlt, [], 'Commit nicht im Stand — ein Klon des Remote kennt ihn nicht:\n' + fehlt.join('\n'));
});

test('[Proben-Commits·Kanon·Rot-Beweis] ein Hash aus einem lokalen Zweig oder ein erfundener wird gefunden', () => {
  const lokal = '275e9' + 'c9f3';   // der frühere B13-Hash, nur in einem lokalen Zweig; zusammengesetzt, damit dieser Wächter ihn nicht selbst liest
  const text = "G.auswerten('| B13 | gebaut " + lokal + " |', { repo: REPO, stand: 'a8609a2c7' });\n"
    + "execFileSync('g" + "it', ['show', 'dead" + "beef1:x.js'], "
    + '{ cwd: ' + 'REPO });\n'   // zusammengesetzt: die Git-Umgebungs-Wächter lesen sonst einen Aufruf ohne env
    + "const fixture = '| A1 | HOCH | G | gebaut abc" + "1234 |';   // Fixture-Text ohne Repo-Bezug, zählt nicht\n";
  assert.deepEqual(hashesIn(text).sort(), [lokal, 'a8609a2c7', 'dead' + 'beef1'].sort());
  assert.equal(vorfahr(lokal), false, 'nicht Vorfahr des Stands');
  assert.equal(vorfahr('dead' + 'beef1'), false);
  assert.equal(vorfahr('a8609a2c7'), true);
});
