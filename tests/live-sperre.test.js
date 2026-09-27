'use strict';
/* ════════════════════════════════════════════════════════════════════════
   live-sperre.test.js — Werkzeuge, die gegen einen Live-Host schreiben,
   laufen nicht aus einer Agentensitzung und nicht aus einem Test
   (26.09.2026, Befund LIVE-FREIGABE-AUS-SITZUNG)
   ────────────────────────────────────────────────────────────────────────
   Eine Sitzung startete tools/shl-empfangen-probe.js mit `--help`, das es
   nicht kannte, und fuhr damit einen echten Lauf gegen share.vivodepot.de.
   Die Probe startet die Werkzeuge NIE selbst: ginge die Sperre verloren,
   schriebe genau dieser Test gegen den Live-Host. Geprüft werden die reine
   Funktion (Umgebung injiziert) und, statisch, dass jedes Werkzeug die
   Sperre vor seinem ersten Abruf durchsetzt.
   ROT-BEWEIS: ein Werkzeug-Text ohne die Sperre, und einer, der sie erst
   nach dem Abruf setzt, fallen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { liveSperre } = require('../tools/lib/live-sperre.js');

const REPO = path.join(__dirname, '..');
// Werkzeug → die Stelle, an der es zum ersten Mal gegen den Host schreibt.
const LIVE_WERKZEUGE = {
  'tools/shl-empfangen-probe.js': "fetch(HOST + '/hochladen.php'",
  'tools/shl-belegstrecke.js': 'await hochladen(jwe)',
};

function sperreBefund(quelle, ersterAbruf) {
  const s = quelle.indexOf('liveSperreDurchsetzen(');
  const a = quelle.indexOf(ersterAbruf);
  if (a < 0) return ['erster Abruf nicht gefunden: ' + ersterAbruf];
  if (s < 0) return ['keine Live-Sperre'];
  if (s > a) return ['die Sperre steht erst nach dem ersten Abruf'];
  return [];
}

test('[Live-Sperre] CLAUDECODE und der Testschalter sperren, eine leere Umgebung nicht', () => {
  assert.match(liveSperre({ CLAUDECODE: '1' }), /CLAUDECODE/);
  assert.match(liveSperre({ VD_SCHLUESSELBUND_GESPERRT: '1' }), /Testumgebung/);
  assert.equal(liveSperre({}), null, 'Positivkontrolle: im eigenen Terminal ist nichts gesperrt');
});

test('[Live-Sperre] jedes Werkzeug, das live schreibt, setzt die Sperre vor seinem ersten Abruf durch', () => {
  for (const [datei, abruf] of Object.entries(LIVE_WERKZEUGE)) {
    assert.deepEqual(sperreBefund(fs.readFileSync(path.join(REPO, datei), 'utf8'), abruf), [], datei);
  }
});

test('[Live-Sperre·Rot-Beweis] ohne Sperre, und mit der Sperre erst nach dem Abruf, fällt es', () => {
  const echt = fs.readFileSync(path.join(REPO, 'tools/shl-empfangen-probe.js'), 'utf8');
  const abruf = LIVE_WERKZEUGE['tools/shl-empfangen-probe.js'];
  assert.deepEqual(sperreBefund(echt.replace(/liveSperreDurchsetzen\(/g, 'x('), abruf), ['keine Live-Sperre']);
  const spaet = echt.replace(/liveSperreDurchsetzen\(/g, 'x(') + '\nliveSperreDurchsetzen(\'spaet\');\n';
  assert.deepEqual(sperreBefund(spaet, abruf), ['die Sperre steht erst nach dem ersten Abruf']);
});
