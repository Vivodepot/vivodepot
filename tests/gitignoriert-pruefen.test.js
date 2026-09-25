'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Rot-Beweis für tests/gitignoriert-pruefen.js (Auftrag, 01.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   OHNE diese Datei (bzw. mit `istAbsichtlichAusgeschlossen` durch ein reines
   `fs.existsSync` ersetzt) schlagen zwei Wächter in einem frischen Klon an:
   `u2-106-kein-kommentar-behauptet-eine-datei-die-es-nicht-gibt`
   (tests/zusagen-in-kommentaren.test.js) und
   `[Fixture-Felder] keine Ausnahme zeigt auf eine Datei, die es nicht gibt`
   (tests/fixture-felder-im-modell.test.js) — beide verwechselten "existiert
   nicht auf der Platte" mit "existiert nicht mehr". Gemessen an einem echten
   frischen Arbeitsbaum von origin/u2-kanon: 6370 Tests, 6368 grün, GENAU diese
   zwei rot, bevor der Fix stand.

   DREI der VIER Proben unten sind deterministisch, egal in welchem Arbeitsbaum
   sie laufen: sie prüfen einen fabrizierten Pfad unter einem real, dauerhaft
   gitignorierten Verzeichnis (`tests/fixtures/kette-beispiel/`, .gitignore
   Zeile ~171) — der Pfad existiert garantiert nirgends (Fantasie-Dateiname),
   das Verzeichnis-Muster greift aber unabhängig davon, ob eine Datei darunter
   je angelegt wurde. Ein Pfad, der lokal existieren MÜSSTE, damit die Probe
   etwas zeigt, würde in einem frischen Arbeitsbaum nichts beweisen — genau der
   Fehler, den dieser Auftrag behebt.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { istAbsichtlichAusgeschlossen } = require('./gitignoriert-pruefen.js');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');

test('[gitignoriert-pruefen] ein Pfad unter einem real gitignorierten Verzeichnis gilt als absichtlich ausgeschlossen', () => {
  const fantasiePfad = 'tests/fixtures/kette-beispiel/pruefstand-fantasie-ZZ9-negativprobe-nichtvorhanden.md';
  assert.equal(fs.existsSync(path.join(REPO, fantasiePfad)), false,
    'Vorbedingung: dieser Fantasiename darf nirgends existieren — sonst prüft die Probe die Platte, nicht das Muster');
  assert.equal(istAbsichtlichAusgeschlossen(fantasiePfad, REPO), true);
});

test('[gitignoriert-pruefen] ein bekannter, nicht ignorierter Pfad gilt NICHT als ausgeschlossen', () => {
  // load-kern.js ist eine reale, getrackte, niemals ignorierte Testdatei — Gegenprobe,
  // damit die Prüfung nicht einfach immer "true" liefert.
  assert.equal(istAbsichtlichAusgeschlossen('tests/load-kern.js', REPO), false);
});

test('[gitignoriert-pruefen] ein frei erfundener, nirgends erwähnter Pfad gilt NICHT als ausgeschlossen', () => {
  assert.equal(istAbsichtlichAusgeschlossen('tests/gibt-es-ganz-sicher-nicht-ZZ9.js', REPO), false);
});

test('[gitignoriert-pruefen] antwortet git selbst nicht (kein erreichbares Repo), wird das SICHTBAR — weder ignoriert noch nicht-ignoriert', () => {
  /* ZWEI FRÜHERE ENTWÜRFE scheiterten je an einer anderen Umgebungs-Annahme, die sich
     erst im vollen Suite-Lauf UNTER DEM PRE-COMMIT-HOOK als falsch erwies — isoliert
     liefen beide grün:
       1. Nur os.tmpdir() als Sandkasten: lag in dieser Umgebung doch in einem Git-Baum.
       2. GIT_CEILING_DIRECTORIES allein: git-Hooks laufen mit GIT_DIR/GIT_WORK_TREE/
          GIT_INDEX_FILE/GIT_COMMON_DIR bereits GESETZT (git reicht sie an Hooks weiter,
          damit deren eigene git-Aufrufe dasselbe Repo/denselben Index treffen) — ein
          KIND-Prozess erbt sie automatisch, und ein gesetztes GIT_DIR macht jede
          Verzeichnis-Suche (also auch GIT_CEILING_DIRECTORIES) gegenstandslos: git
          nutzt das benannte Repo direkt, unabhängig vom cwd.
     Deterministisch wird es erst, wenn ALLE VIER zusätzlich zum aktuellen Prozess
     entfernt werden, bevor die Grenze gesetzt wird — geprüft an genau diesem Vorher/
     Nachher-Fall, nicht nur vermutet. */
  const sandkasten = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-gitignoriert-kein-repo-'));
  const GIT_UMGEBUNG_SCHLUESSEL = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_CEILING_DIRECTORIES'];
  const vorher = Object.fromEntries(GIT_UMGEBUNG_SCHLUESSEL.map((k) => [k, process.env[k]]));
  for (const k of GIT_UMGEBUNG_SCHLUESSEL) delete process.env[k];
  process.env.GIT_CEILING_DIRECTORIES = sandkasten;
  try {
    assert.throws(
      () => execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: sandkasten, env: ohneGitUmgebung(), stdio: 'ignore' }),
      'Vorbedingung: mit gesetzter Grenze und ohne geerbtes GIT_DIR darf git dort KEIN Repo finden');
    assert.throws(
      () => istAbsichtlichAusgeschlossen('irgendein/pfad.js', sandkasten),
      /Konnte nicht bestimmen/,
      'ohne Git-Antwort muss der dritte Zustand als eigener Fehlschlag sichtbar werden, nicht als true/false geraten');
  } finally {
    for (const k of GIT_UMGEBUNG_SCHLUESSEL) {
      if (vorher[k] === undefined) delete process.env[k]; else process.env[k] = vorher[k];
    }
    fs.rmSync(sandkasten, { recursive: true, force: true });
  }
});
