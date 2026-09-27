'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   template-fixtures-json-parse-probe.test.js — jede Template-Fixture parst
   ────────────────────────────────────────────────────────────────────────────
   Auftrag (05.09.2026): dieselbe Falle traf U2-ADR-287 (Notarin) UND
   U2-ADR-295 (Geschäftsführerin) am selben Tag — ein ASCII-`"` statt des
   typografischen schließenden Anführungszeichens `"` am Ende einer deutschen
   Anführung `„…"` INNERHALB eines JSON-Strings bricht die Zeichenkette
   vorzeitig ab (`JSON.parse`: „Expected ',' or ']'/'}' after..."). Beide Male
   von Hand gefangen, vor dem ersten Testlauf, nie automatisch. Zwei Funde
   derselben Klasse am selben Tag sind kein Zufall mehr — diese Probe fängt
   jeden künftigen dritten Fund automatisch, ohne dass jemand von Hand
   JSON.parse aufrufen muss.

   Jede `*logikmodul*.json`-Fixture unter tests/fixtures/ — die Namensform, die
   alle drei bisherigen Template-Bundles (Erbschein, Notarin, Geschäftsführerin)
   tragen, s. tests/fixtures/README bzw. die jeweiligen ADRs.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const DATEIEN = fs.readdirSync(FIXTURES_DIR)
  .filter((n) => /logikmodul/i.test(n) && n.endsWith('.json'));

test('[Template-Fixtures] mindestens eine *logikmodul*.json-Fixture liegt vor — sonst prüft diese Probe nichts', () => {
  assert.ok(DATEIEN.length > 0, 'kein Fixture-Name passt auf *logikmodul*.json — Muster geändert?');
});

for (const datei of DATEIEN) {
  test('[Template-Fixtures] ' + datei + ' ist gültiges JSON', () => {
    const roh = fs.readFileSync(path.join(FIXTURES_DIR, datei), 'utf8');
    assert.doesNotThrow(() => JSON.parse(roh), 'JSON.parse scheitert — vermutlich ein ASCII-`"` statt '
      + 'des typografischen schließenden Anführungszeichens `"` innerhalb einer deutschen `„…"`-Anführung');
  });
}

test('[Template-Fixtures·Rot-Beweis] eine gepflanzte ASCII-Anführungszeichen-Falle lässt die Probe scheitern', () => {
  const verstuemmelt = '{"texte": ["Die Angaben aus dem Pro-Modul „Beispiel" — nach dem Komma bricht es"]}';
  assert.throws(() => JSON.parse(verstuemmelt), SyntaxError,
    'die Falle selbst muss JSON.parse tatsächlich zum Scheitern bringen — sonst prüft diese Probe nichts');
});
