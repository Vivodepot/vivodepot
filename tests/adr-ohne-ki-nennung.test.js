'use strict';
/* ════════════════════════════════════════════════════════════════════════
   ADRs nennen keine KI-Beteiligten (26.09.2026, Entscheidung der Produktverantwortung)
   ────────────────────────────────────────────────────────────────────────
   Entscheidungsdokumente halten die Entscheidung fest, nicht, mit welchem
   Werkzeug sie vorbereitet wurde. Felder wie „Konsultiert: <Werkzeug>
   (strategischer Gesprächspartner)", Verweise auf eine Regeldatei des
   Werkzeugs oder eine Klärungsrunde mit dem Werkzeug entfallen oder sind
   neutral gefasst. Die Muster stehen zusammengesetzt (s. tests/repo-ohne-ki-
   nennung.test.js, die dieselbe Regel auf das ganze Repo ausdehnt).
   Das gilt für jede ADR im Repo — sie ist öffentlich oder wird es.
   ROT-BEWEIS an den Formen, die bis 26.09.2026 dastanden.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
const { KI_NENNUNG_MUSTER, WOERTER } = require('../tools/lib/ki-nennung-muster.js');

const REPO = path.join(__dirname, '..');
// Die eine Musterquelle (tools/lib/ki-nennung-muster.js), keine eigene Kopie.
const { WERKZEUG: W, GESPRAECH: S, ZWEITES: Z } = WOERTER;
const MUSTER = KI_NENNUNG_MUSTER;

function befund(dateien, lesen) {
  const funde = [];
  for (const d of dateien) {
    lesen(d).split('\n').forEach((z, i) => { if (MUSTER.test(z)) funde.push(d + ':' + (i + 1) + '  ' + z.trim().slice(0, 120)); });
  }
  return funde;
}

test('[ADR·ohne KI-Nennung] keine ADR nennt das KI-Werkzeug', () => {
  const dateien = execFileSync('git', ['ls-files', 'docs/adr'], { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung() })
    .split('\n').filter((d) => d.endsWith('.md'));
  assert.ok(dateien.length > 100, 'Vorbedingung: der ADR-Bestand ist da');
  assert.deepEqual(befund(dateien, (d) => fs.readFileSync(path.join(REPO, d), 'utf8')), []);
});

test('[ADR·ohne KI-Nennung·Rot-Beweis] die Formen vom 26.09.2026 fallen', () => {
  const G = W[0].toUpperCase() + W.slice(1);
  const alt = [
    '- **Konsultiert:** ' + G + ' (strategischer ' + S[0].toUpperCase() + S.slice(1) + 'spartner)',
    W.toUpperCase() + '.md vom 24.04.2026 — interne Quelle für den Angehörigen-Modus mit Situationsblättern.',
    '**Klärungs-Sitzung:** ' + S[0].toUpperCase() + S.slice(1) + ' vom 22.05.2026 (Begriffs-Konsolidierung)',
    'Beauftragung an ' + G + ' Code würde sieben separate Runden brauchen.',
    // B16-ADR-066/-067 bis 26.09.2026: das zweite Werkzeugwort.
    Z[0].toUpperCase() + Z.slice(1) + 's-Feedback empfahl CI/CD-Härtung mit verschiedenen Tools.',
  ];
  assert.equal(befund(['alt.md'], () => alt.join('\n')).length, 5);
  assert.deepEqual(befund(['neu.md'], () => '**Klärungs-Sitzung:** 22.05.2026 (Begriffs-Konsolidierung)'), []);
  assert.deepEqual(befund(['neu2.md'], () => 'Ein externes Review empfahl CI/CD-Härtung mit verschiedenen Tools.'), []);
});
