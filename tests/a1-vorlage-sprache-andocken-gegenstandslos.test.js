'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A1 (Review U2-ADR-417-Zweig, 0d7d8824, 17.09.2026) — „gegenstandslos" statt
   „offen" (Befund-Ratsche, 19.09.2026): der Befund beschrieb einen
   Kommentar in `tests/vorlage-sprache-andocken.test.js`, der seit der Landung
   von Commit `010dbcd0` (derselben Landung) nicht mehr stimmte — eine
   zweisprachige Vorlage dockt in Pro seither für identity/advanceCare/health
   an, ohne die im Kommentar behauptete Verwerfung.

   GEMESSEN, NICHT GESCHLOSSEN: die Datei existiert auf dem gelandeten Kanon
   (`origin/u2-kanon`, dceab851) gar nicht — der 0d7d8824-Zweig hat nie in
   dieser Form gelandet. `git grep` gegen `origin/u2-kanon` findet weder die
   Datei noch den zitierten Testnamen „[Sprache·Einlass]" noch einen
   Nachfolgetest, den ein früherer Bericht als Ersatzdeckung nannte:
   `tests/pro-vorlage-buergerbereich.test.js` existiert nicht.
   Der Gegenstand des Befunds ist weg, nicht behoben.

   Diese Probe hält NUR fest, dass er weg bleibt — nicht, dass er nie
   wiederkehren darf in anderer, korrekter Form (das wäre kein Fund mehr).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const os = require('node:os');
const datei = (wurzel) => path.join(wurzel, 'tests', 'vorlage-sprache-andocken.test.js');

test('[A1·Gegenstandslos] tests/vorlage-sprache-andocken.test.js existiert auf diesem Stand nicht', () => {
  assert.equal(fs.existsSync(datei(REPO)), false,
    'die Datei ist wieder da — A1 braucht eine neue Prüfung, kein "gegenstandslos" mehr');
});

test('[A1·Gegenstandslos·Rot-Beweis] liegt die Datei wieder da, sieht dieselbe Prüfung sie: eine gepflanzte Kopie in einer Wegwerf-Wurzel wird gefunden', () => {
  const wurzel = fs.mkdtempSync(path.join(os.tmpdir(), 'a1-gegenstandslos-'));
  try {
    assert.equal(fs.existsSync(datei(wurzel)), false, 'Vorbedingung: die leere Wurzel trägt die Datei nicht');
    fs.mkdirSync(path.join(wurzel, 'tests'), { recursive: true });
    fs.writeFileSync(datei(wurzel), '// gepflanzt\n');
    assert.equal(fs.existsSync(datei(wurzel)), true, 'die Prüfung sieht die gepflanzte Datei');
  } finally { fs.rmSync(wurzel, { recursive: true, force: true }); }
});
