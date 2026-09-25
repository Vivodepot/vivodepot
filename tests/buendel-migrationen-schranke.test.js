'use strict';
/* Schranke der erledigten Bündel-Migrationen (tools/lib/buendel-migration-schranke.js, 21.09.2026).
   Die vier Werkzeuge wizards-ins-buendel-schreiben, dokumentmodule-ins-buendel-schreiben,
   zugang-recht-vorlagen-ins-buendel-schreiben und situationen-ins-buendel-schreiben schrieben in das Bündel
   BUERGERMODUL_BUENDEL, das der Schnitt geleert hat (`const BUERGERMODUL_BUENDEL = null;`). Ohne Schranke
   stürzten drei beim Lesen ab, und eines (situationen … --check) meldete Exit 0, ohne sein Ziel je anzusehen.
   Diese Probe hält: jedes der vier bricht mit Exit 1 und Meldung ab, in BEIDEN Modi, und die Kern-Datei
   bleibt byte-gleich (nichts gelesen, nichts geschrieben). Die Schranke ist kein Reparaturauftrag. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buendelLeer, erledigt } = require('../tools/lib/buendel-migration-schranke.js');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');
const WERKZEUGE = [
  'wizards-ins-buendel-schreiben',
  'dokumentmodule-ins-buendel-schreiben',
  'zugang-recht-vorlagen-ins-buendel-schreiben',
  'situationen-ins-buendel-schreiben',
];
const hash = (pfad) => crypto.createHash('sha256').update(fs.readFileSync(pfad)).digest('hex');

test('[Bündel-Schranke] der echte Kern führt das Bündel als null: die Migration ist erledigt', () => {
  assert.equal(erledigt(KERN), true, 'Vorbedingung dieser Schranke: `const BUERGERMODUL_BUENDEL = null;` steht in vivodepot.html');
});

test('[Bündel-Schranke·Rot-Beweis] die Erkennung unterscheidet ein geleertes von einem gefüllten Bündel', () => {
  assert.equal(buendelLeer('x\nconst BUERGERMODUL_BUENDEL = null;\ny'), true);
  assert.equal(buendelLeer('const BUERGERMODUL_BUENDEL = {"schema":1};'), false, 'ein gefülltes Bündel ist nicht erledigt');
  assert.equal(buendelLeer('// const BUERGERMODUL_BUENDEL = null; nur ein Kommentar\nconst X = 1;'), false, 'ein Kommentar zählt nicht');
});

for (const name of WERKZEUGE) {
  test('[Bündel-Schranke] ' + name + ' bricht in BEIDEN Modi mit Exit 1 und Meldung ab und lässt den Kern byte-gleich', () => {
    const vorher = hash(KERN);
    for (const args of [[], ['--check']]) {
      const r = spawnSync(process.execPath, [path.join(REPO, 'tools', name + '.js'), ...args], { encoding: 'utf8', timeout: 60000 });
      assert.equal(r.status, 1, name + ' ' + args.join(' ') + ': Exit 1 statt Absturz oder Erfolgsmeldung. stderr: ' + r.stderr.slice(0, 200));
      assert.match(r.stderr, /ERLEDIGT: BUERGERMODUL_BUENDEL ist in vivodepot\.html null/);
      assert.match(r.stderr, /nichts gelesen, nichts geschrieben/);
      assert.doesNotMatch(r.stdout + r.stderr, /TypeError|SyntaxError/, 'die Schranke greift VOR dem Absturz');
    }
    assert.equal(hash(KERN), vorher, name + ' hat den Kern angefasst');
  });
}

test('[Bündel-Schranke·Rot-Beweis] situationen-ins-buendel-schreiben --check meldet nicht mehr "in Ordnung" über ein Ziel, das es nicht gibt', () => {
  const r = spawnSync(process.execPath, [path.join(REPO, 'tools', 'situationen-ins-buendel-schreiben.js'), '--check'], { encoding: 'utf8', timeout: 60000 });
  assert.notEqual(r.status, 0, 'früher Exit 0 und "nur gemessen, nichts geschrieben": ein grüner Lauf ohne Gegenstand');
  assert.doesNotMatch(r.stdout, /Situationen aus dem nativen Bestand gelesen/, 'er liest den Bestand gar nicht erst');
});
