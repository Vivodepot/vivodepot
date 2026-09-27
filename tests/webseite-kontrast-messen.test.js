'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Das Werkzeug für die Website-Kontraste — und seine Positivkontrolle
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „der entschiedene Rest", Posten 5. Das Werkzeug misst einen Baum,
   der NICHT in diesem Repo liegt (`docs/webseite/` ist unverfolgt). Damit die
   Suite es trotzdem fährt, läuft es ohne Argument gegen eine Fixture — und die
   Fixture trägt eine gepflanzte Unterschreitung.

   WARUM DAS NICHT VERZICHTBAR IST: ein Werkzeug, das am echten Stand „0 rot"
   meldet, ist von einem, das gar nichts misst, nur an der Positivkontrolle zu
   unterscheiden. Genau diese Sorte hat am 10.08. die stummen Prüfer gestellt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const WERKZEUG = path.join(REPO, 'tools', 'webseite-kontrast-messen.js');
const FIXTURE = path.join(REPO, 'tests', 'fixtures', 'webseite-kontrast');

function lauf(ordner) {
  const ziel = path.join(os.tmpdir(), 'webseite-kontrast-' + process.pid + '.json');
  try {
    execFileSync('node', [WERKZEUG, '--ordner', ordner, '--json', ziel],
      { cwd: REPO, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    return JSON.parse(fs.readFileSync(ziel, 'utf8'));
  } finally { fs.rmSync(ziel, { force: true }); }
}

test('[Webseite-Kontrast] die Fixture wird gemessen — und die gepflanzte Stelle gefunden', () => {
  const b = lauf(FIXTURE);
  assert.equal(b.gesamt.seiten, 1);
  assert.equal(b.gesamt.gemessen, 4, 'vier Textstellen, jede mit eigenem Text');
  assert.equal(b.gesamt.unterschreitungen, 1, 'genau die eine gepflanzte');
  const rot = b.seiten[0].rot[0];
  assert.match(rot.text, /unterschreitet/);
  assert.ok(rot.wert < 3, 'die gepflanzte liegt deutlich darunter: ' + rot.wert);
});

test('[Webseite-Kontrast] grosse Schrift wird an der NIEDRIGEREN Schwelle gemessen', () => {
  const b = lauf(FIXTURE);
  const stellen = b.seiten[0];
  /* Die Fixture trägt eine grosse Schrift mit rund 3:1 — an der 4.5er-Schwelle wäre sie rot,
     an der richtigen (3:1 ab 24px, WCAG 1.4.3) besteht sie. Ohne diese Probe wäre die
     Schwellenwahl eine Behauptung im Kopf des Werkzeugs. */
  assert.equal(stellen.unterschreitungen, 1, 'die grosse Schrift zählt NICHT als Unterschreitung');
});

test('[Webseite-Kontrast] ein Ordner ohne Seiten bricht ab statt „alles gut" zu melden', () => {
  const leer = fs.mkdtempSync(path.join(os.tmpdir(), 'webseite-kontrast-leer-'));
  try {
    assert.throws(() => execFileSync('node', [WERKZEUG, '--ordner', leer],
      { cwd: REPO, encoding: 'utf8' }), 'ein Leerlauf darf nicht wie ein sauberer Befund aussehen');
  } finally { fs.rmSync(leer, { recursive: true, force: true }); }
});
