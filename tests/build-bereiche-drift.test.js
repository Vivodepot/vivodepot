'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   tools/build-bereiche.js — Drift-Wächter („Drift-Wächter
   vervollständigen", 09.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Das Werkzeug trägt seit seinem Bau (17.08.2026, Zug 1) ein `--check`, das ohne
   Override-Argumente immer gegen die echten, eingecheckten Dateien läuft
   (vivodepot.html, vivodepot-lesen.html, vivodepot-studio.html,
   vivodepot-vc-issuer.html, docs/template-generator/submission-schema.json,
   bereiche/bereiche.json) — es lief bisher nur von Hand, nie in `npm test`.

   EIN ROTER DRIFT-WÄCHTER HEISST PRÜFEN, NICHT NEU BACKEN: wird er rot, zuerst
   die gemeldete Abweichung lesen (Bereichs-ID fehlt? Transport veraltet? Region
   in einer der vier Anwendungen weicht ab?), bevor `node tools/build-bereiche.js`
   läuft — ein zu kurz gegriffener Kern-Leseweg würde sonst als „gepflegter"
   Transport committet.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const WERKZEUG = path.join(REPO, 'tools', 'build-bereiche.js');
const GENERATOR = path.join(REPO, 'vivodepot-studio.html');

test('[build-bereiche·Drift-Wächter] Transport + generierte Regionen sind aktuell — kein Drift zum Erzeuger', () => {
  assert.doesNotThrow(() => execFileSync(process.execPath, [WERKZEUG, '--check'], { stdio: 'pipe' }),
    'node tools/build-bereiche.js --check meldet Drift gegen den echten Bestand — '
    + 'ERST die Meldung lesen, dann ggf. `node tools/build-bereiche.js` ausführen');
});

test('[build-bereiche·Rot-Beweis] eine verfälschte BEREICHE-Region in einer Kopie lässt --check anschlagen', () => {
  /* `--generator <pfad>` läuft NUR gegen eine Kopie — die echte
     vivodepot-studio.html bleibt unberührt (Regel 18). */
  const original = fs.readFileSync(GENERATOR, 'utf8');
  const begin = '/* BEREICHE:BEGIN — generierter Bereich (tools/build-bereiche.js); Quelle: vivodepot.html SEKTOREN */';
  const ende = '/* BEREICHE:END */';
  const a = original.indexOf(begin), b = original.indexOf(ende);
  assert.ok(a >= 0 && b >= 0, 'ANKER VERFEHLT: BEREICHE-Marker stehen nicht mehr so in vivodepot-studio.html');
  const verfaelscht = original.slice(0, a + begin.length) + '\nconst BEREICHE = [];\n' + original.slice(b);
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'build-bereiche-rot-')), 'generator-kopie.html');
  fs.writeFileSync(tmp, verfaelscht, 'utf8');
  try {
    assert.throws(() => execFileSync(process.execPath, [WERKZEUG, '--generator', tmp, '--check'], { stdio: 'pipe' }),
      'ROT ERWARTET: eine geleerte BEREICHE-Region in der Kopie muss --check zum Scheitern bringen');
  } finally {
    fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  }
});
