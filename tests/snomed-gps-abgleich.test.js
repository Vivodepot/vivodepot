'use strict';
/* ════════════════════════════════════════════════════════════════════════
   tools/snomed-gps-abgleich.js gegen seine erfundene Fixture (26.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Ohne --gps läuft das Werkzeug gegen tests/fixtures/snomed-gps-abgleich/ —
   so fährt die Suite es, ohne den Release (der nicht ins Repo kommt). Dazu:
   jede freigegebene Kennung im Repo trägt `gps: { release, aktiv: true }`.
   ROT-BEWEIS: eine inaktive, eine fehlende Kennung, ein abweichender Begriff,
   ein fehlendes gps-Feld; ein unlesbarer Release endet mit 2, nie grün.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { releaseTabelle, releaseAusName, abgleich, main } = require('../tools/snomed-gps-abgleich.js');

const REPO = path.join(__dirname, '..');
const FIX = path.join(__dirname, 'fixtures', 'snomed-gps-abgleich');
const GPS = path.join(FIX, 'SnomedINTL_GPSRelease_PRODUCTION_20990101T120000Z.txt');
const tabelle = releaseTabelle(fs.readFileSync(GPS, 'utf8'));
const gpsFeld = { release: '20990101', aktiv: true };
// Eine erfundene Kennung, die im Fixture-Release fehlt — zur Laufzeit gefügt (sonst fände der SNOMED-Erkenner sie hier).
const FEHLT = String(1000000000 + 9);

test('[SNOMED·GPS-Abgleich] ohne Argument grün gegen die Fixture', () => {
  assert.equal(releaseAusName(path.basename(GPS)), '20990101');
  const leise = console.log; console.log = () => {};
  try { assert.equal(main([]), 0); } finally { console.log = leise; }
});

test('[SNOMED·GPS-Abgleich] jede freigegebene Kennung im Repo nennt ihren GPS-Release und ist dort aktiv', () => {
  const frei = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'snomed-freigabe.json'), 'utf8')).freigegeben;
  const ohne = Object.entries(frei).filter(([, e]) => !e.gps || e.gps.aktiv !== true || !/^\d{8}$/.test(e.gps.release || '')).map(([id]) => id);
  assert.deepEqual(ohne, []);
});

test('[SNOMED·GPS-Abgleich·Rot-Beweis] inaktiv, fehlend, anderer Begriff, ohne gps-Feld — und unlesbar endet mit 2', () => {
  const freigabe = { freigegeben: {
    1000000001: { begriff: 'Erfundenes Konzept A', gps: gpsFeld },
    1000000002: { begriff: 'Anderer Begriff', gps: gpsFeld },
    1000000003: { begriff: 'Erfundenes Konzept C', gps: gpsFeld },
    [FEHLT]: { begriff: 'Gibt es nicht', gps: gpsFeld },
  } };
  freigabe.freigegeben['1000000001'] = { begriff: 'Erfundenes Konzept A' };
  const { befund } = abgleich({ freigabe, offen: null, tabelle, release: '20990101' });
  assert.ok(befund.some((b) => b.startsWith('1000000001: Feld gps')), befund.join('\n'));
  assert.ok(befund.some((b) => b.startsWith('1000000002: begriff')), befund.join('\n'));
  assert.ok(befund.some((b) => b === '1000000003: im GPS 20990101 INAKTIV'), befund.join('\n'));
  assert.ok(befund.some((b) => b === FEHLT + ': nicht im GPS 20990101'), befund.join('\n'));
  const leise = console.error; console.error = () => {};
  try { assert.equal(main(['--gps', path.join(FIX, 'gibt-es-nicht_20990101T120000Z.txt')]), 2); } finally { console.error = leise; }
});
