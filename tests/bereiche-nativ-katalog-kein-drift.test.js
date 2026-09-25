'use strict';
/* ═══════════════════════════════════════════════════════════
   tools/bereiche-nativ-katalog-erzeugen.js — Drift-Wächter (B12-Reparatur, 19.09.2026; Gerüst-Schnitt S7, 21.09.2026)
   ───────────────────────────────────────────────────────────
   Die dreizehn nativen Bereichs-Definitionen — Grundlage für RUHENDE BEREICHE, wenn ein Produkt einen nativen Bereich nicht selbst
   anbietet (Pro bis auf `identity`, s. Kern-Kommentar an `_BEREICH_IDS_RUHEND`) — stehen seit S7 in
   `tools/bereiche-nativ-katalog-modul.json` und nicht mehr im Gerüst. Einzige Quelle bleiben die dreizehn Dateien in
   `tools/bereich-templates/`; die Moduldatei ist ihr Abbild, NICHT von Hand gepflegt.
   Ein roter Wächter heißt PRÜFEN, nicht neu erzeugen: erst die gemeldete Abweichung lesen,
   dann ggf. `node tools/bereiche-nativ-katalog-erzeugen.js` ausführen.
   ═══════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const WERKZEUG = path.join(REPO, 'tools', 'bereiche-nativ-katalog-erzeugen.js');
const { DATEI_STANDARD } = require(WERKZEUG);

test('[Bereiche-nativ-Katalog·Drift-Wächter] die Moduldatei entspricht den dreizehn Bereichs-Vorlagen', () => {
  assert.doesNotThrow(() => execFileSync(process.execPath, [WERKZEUG, '--pruefen'], { stdio: 'pipe' }),
    'node tools/bereiche-nativ-katalog-erzeugen.js --pruefen meldet Drift gegen tools/bereiche-nativ-katalog-modul.json — '
    + 'ERST die Meldung lesen, dann ggf. `node tools/bereiche-nativ-katalog-erzeugen.js` ausführen');
});

test('[Bereiche-nativ-Katalog·Rot-Beweis] eine verfälschte Kopie der Moduldatei lässt --pruefen anschlagen', () => {
  const modul = JSON.parse(fs.readFileSync(DATEI_STANDARD, 'utf8'));
  assert.ok(Object.keys(modul.bereiche).length === 13, 'Voraussetzung: die Moduldatei trägt dreizehn Bereiche');
  delete modul.bereiche.identity;
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bereiche-nativ-katalog-rot-')), 'modul-kopie.json');
  fs.writeFileSync(tmp, JSON.stringify(modul, null, 2) + '\n', 'utf8');
  try {
    assert.throws(() => execFileSync(process.execPath, [WERKZEUG, '--datei', tmp, '--pruefen'], { stdio: 'pipe' }),
      'ROT ERWARTET: eine Kopie ohne `identity` muss --pruefen zum Scheitern bringen');
  } finally {
    fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  }
});

test('[Bereiche-nativ-Katalog·Rot-Beweis] eine fehlende Moduldatei ist ein Fund, kein stilles Grün', () => {
  assert.throws(() => execFileSync(process.execPath, [WERKZEUG, '--datei', path.join(os.tmpdir(), 'gibt-es-nicht-' + process.pid + '.json'), '--pruefen'], { stdio: 'pipe' }));
});
