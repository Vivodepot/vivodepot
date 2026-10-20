'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Keine Platzhalter-ADR-Nummer im obersten Ordner (06.10.2026, U2-ADR-487)
   ────────────────────────────────────────────────────────────────────────
   Befund U2-ADR-409-P12-AUFHEBUNG-OHNE-ADR: der Kern verwies an der Kennungs-Migration zweimal auf „U2-ADR-XXX (Entwurf)“ —
   die Entscheidung war gefallen und gebaut, die ADR fehlte. Ein Platzhalter im Produkt verspricht eine Begründung, die niemand
   findet. REGEL: keine getrackte Datei im obersten Ordner (Kern, Lese-App, Studio, Issuer, sw.js, Dokumente) trägt
   „U2-ADR-XXX“. ADR-Dokumente selbst dürfen die Schreibweise erklären.
   NOCH NICHT IM MUSTER: „U2-ADR-NNN“ und „U2-ADR-NNN2“ — der Kern trägt sie noch (gemessen 17.10.2026: neunmal), Befund
   ADR-PLATZHALTER-IM-KERN mit eigenem Eigentümer. Wer ihn schließt, nimmt NNN\d* hier ins Muster auf.
   ROT-BEWEIS: die zwei Kern-Zeilen in ihrer Fassung vor dem 06.10.2026.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const PLATZHALTER = /\bU2-ADR-XXX\b/;

function funde(rel, text) {
  return text.split('\n').map((z, i) => [i + 1, z]).filter(([, z]) => PLATZHALTER.test(z)).map(([n, z]) => rel + ':' + n + ': ' + z.trim().slice(0, 120));
}

test('[ADR-Platzhalter·Wurzel] keine Datei im obersten Ordner trägt U2-ADR-XXX', () => {
  const wurzel = execFileSync('git', ['ls-files'], { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung() })
    .split('\n').filter((f) => f && !f.includes('/'));
  assert.ok(wurzel.includes('vivodepot.html'), 'Vorbedingung: der Kern liegt im obersten Ordner');
  const alle = [];
  for (const rel of wurzel) {
    let text; try { text = fs.readFileSync(path.join(REPO, rel), 'utf8'); } catch (_) { continue; }
    alle.push(...funde(rel, text));
  }
  assert.deepEqual(alle, []);
});

test('[ADR-Platzhalter·Wurzel·Rot-Beweis] die Kern-Zeilen vor dem 06.10.2026 fallen, die neuen nicht', () => {
  assert.equal(funde('vivodepot.html', '   U2-ADR-XXX (Entwurf), Umbauplan „Englisch vor v1", Plan-Commit 3. Wortgleich').length, 1);
  assert.equal(funde('vivodepot.html', '  /* Schema 80 -> 81 (U2-ADR-XXX, Umbauplan „Englisch vor v1", Plan-Commit 3): einmalige,').length, 1);
  assert.deepEqual(funde('vivodepot.html', '  /* Schema 80 -> 81 (U2-ADR-487, Umbau „Englisch vor v1", Plan-Commit 3): einmalige,'), []);
});
