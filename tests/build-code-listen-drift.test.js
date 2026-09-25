'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   tools/build-code-listen.js — Drift-Wächter („Drift-Wächter
   vervollständigen", 09.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   `--check` läuft ohne `--html`-Override immer gegen die echte vivodepot.html
   und die echten code-listen/<systemId>.json-Quellen — bisher nur von Hand
   aufgerufen, nie in `npm test`. Bislang nur in einem Prosa-Kommentar in
   tests/styleguide-klassen-vollstaendig.test.js erwähnt („Muster wie
   build-code-listen.js"), nie selbst gefahren.

   EIN ROTER DRIFT-WÄCHTER HEISST PRÜFEN, NICHT NEU BACKEN: wird er rot, zuerst
   prüfen, welche code-listen/<systemId>.json sich geändert hat und ob die
   inline-Region das wirklich korrekt nachzieht, bevor
   `node tools/build-code-listen.js` läuft.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const WERKZEUG = path.join(REPO, 'tools', 'build-code-listen.js');
const KERN = path.join(REPO, 'vivodepot.html');
const BEGIN = '<!-- CODE-LISTEN:BEGIN — generierter Bereich (tools/build-code-listen.js); Quellen: code-listen/<systemId>.json -->';
const ENDE = '<!-- CODE-LISTEN:END -->';

test('[build-code-listen·Drift-Wächter] die inline @vd-codeliste-Blöcke in vivodepot.html sind aktuell — kein Drift zum Erzeuger', () => {
  assert.doesNotThrow(() => execFileSync(process.execPath, [WERKZEUG, '--check'], { stdio: 'pipe' }),
    'node tools/build-code-listen.js --check meldet Drift gegen den echten Bestand — '
    + 'ERST die Meldung lesen, dann ggf. `node tools/build-code-listen.js` ausführen');
});

test('[build-code-listen·Rot-Beweis] eine verfälschte Region in einer Kopie lässt --check anschlagen', () => {
  /* `--html <pfad>` läuft NUR gegen eine Kopie — die echte vivodepot.html bleibt unberührt
     (Regel 18). */
  const original = fs.readFileSync(KERN, 'utf8');
  const a = original.indexOf(BEGIN), b = original.indexOf(ENDE);
  assert.ok(a >= 0 && b >= 0, 'ANKER VERFEHLT: CODE-LISTEN-Marker stehen nicht mehr so in vivodepot.html');
  const verfaelscht = original.slice(0, a + BEGIN.length) + '\n<script>/* leer */</script>\n' + original.slice(b);
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'build-code-listen-rot-')), 'kern-kopie.html');
  fs.writeFileSync(tmp, verfaelscht, 'utf8');
  try {
    assert.throws(() => execFileSync(process.execPath, [WERKZEUG, '--html', tmp, '--check'], { stdio: 'pipe' }),
      'ROT ERWARTET: eine geleerte CODE-LISTEN-Region in der Kopie muss --check zum Scheitern bringen');
  } finally {
    fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  }
});
