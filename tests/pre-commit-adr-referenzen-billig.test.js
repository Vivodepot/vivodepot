'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Der ADR-Referenzen-Wächter läuft auch im billigen Zweig des pre-commit (28.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Anlass: ein reiner Reservierungs-Commit (nur die Nummern-Reservierungsliste) nannte im zweck-Text
   „U2-ADR-<n>" für eine ADR, deren Datei noch nicht auf dem Kanon lag. Der pre-commit übersprang die Suite
   (reiner Dokument-Commit), der Wächter lief nicht; erst der pre-push fand es, nach einer ganzen Suite.
   Hier gehalten: der Rot-Beweis an genau diesem Fall — eine Reservierungsliste mit einer ADR-Nummer ohne Datei im
   zweck-Text ist rot, dieselbe Liste ohne sie grün. Gegen eine erfundene Liste unter os.tmpdir, nie im Arbeitsbaum
   und ohne zurückgehaltene Dateien zu lesen, damit die Probe auch im öffentlichen Zuschnitt läuft. Dass der Hook den
   Wächter ruft, hält das Wächter-Register (W-adr-referenzen-im-billigen-pre-commit, Eintritt im pre-commit).
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');

const REPO = path.join(__dirname, '..');
const WAECHTER = path.join(REPO, 'tools', 'adr-referenzen-pruefen.js');

function gateGegen(reservierungText) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-adr-ref-billig-'));
  try {
    fs.writeFileSync(path.join(ordner, 'nummern-reservierung.json'), reservierungText);
    return cp.spawnSync(process.execPath, [WAECHTER, '--gate'], {
      encoding: 'utf8', env: { ...process.env, ADR_TOOLS_PATH: ordner },
    });
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
}

// Eine erfundene Reservierungsliste in der Form der echten (adr, schema, fassung).
const liste = (zweck) => JSON.stringify({ zweck: 'Probe', adr: [], schema: [],
  fassung: [{ nummer: 99998, sitzung: 'Probe', zweck, datum: '2026-09-28' }] }, null, 2);

test('[pre-commit·billig·Gegenprobe] eine Reservierungsliste ohne ADR-Nummer im zweck-Text ist grün', () => {
  const gruen = gateGegen(liste('Open Badges halten (P3b Holder)'));
  assert.equal(gruen.status, 0, gruen.stdout + gruen.stderr);
});

test('[pre-commit·billig·Rot-Beweis] eine Reservierungsliste mit einer ADR-Nummer ohne Datei im zweck-Text ist rot', () => {
  const rot = gateGegen(liste('Probe (U2-ADR-99999)'));
  assert.equal(rot.status, 1, rot.stdout + rot.stderr);
  assert.match(rot.stderr, /nummern-reservierung\.json:\d+ „U2-ADR-99999"/);
});
