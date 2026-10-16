'use strict';
/* Pfad-Helfer für die Demo-Aufnahmen. Standard-Ausgabe liegt im Repo unter demo-ausgabe/ (NICHT
   unter test-results/ — Playwright leert seinen test-results-Ordner bei JEDEM Testlauf komplett,
   auch bei fremden Spec-Dateien; demo-roh lag dort vorher mit drin und wurde am 06.08. mehrfach
   durch spätere Läufe gelöscht, bevor die Clips gesichert waren). VD_DEMO_AUSGABE (absoluter Pfad)
   überschreibt das Ziel für den echten Abgabe-Ordner (siehe Auftrag Abschnitt 6 — der Pfad liegt
   außerhalb des Repos und wird bewusst nicht hier hineinkopiert). */

const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..', '..', '..');

function vivodepotUrl() {
  return 'file://' + path.join(REPO_ROOT, 'vivodepot.html');
}

function fixturePfad(name) {
  return path.join(REPO_ROOT, 'tests', 'fixtures', 'gazelle-samples', name);
}

function ausgabeVerzeichnis() {
  return process.env.VD_DEMO_AUSGABE || path.join(REPO_ROOT, 'demo-ausgabe');
}

module.exports = { REPO_ROOT, vivodepotUrl, fixturePfad, ausgabeVerzeichnis };
