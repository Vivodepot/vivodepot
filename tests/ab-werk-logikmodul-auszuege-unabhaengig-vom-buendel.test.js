'use strict';
/* ═══════════════════════════════════════════════════════
   Ab-Werk-Auszüge des Kerns: keine mehr (Schema 87, 21.09.2026)
   ───────────────────────────────────────────────────────
   Der Erbschein-Vorbereitungsauszug und der Zugang-Auszug liefen bis dahin über eine eigene, immer befüllte Konstante im
   Kern (`AB_WERK_LOGIK_MODUL_AUSZUEGE_QUELLEN`); `_abWerkAuszugPflicht` warf beim Boot, wenn ein Pflicht-Auszug fehlte.
   Beides ist Inhalt im Gerüst. Seit dem Zug tragen die Produkte privat-de und privat-en beide Auszüge als Template im Rezept
   (U2-ADR-427, tests/zugang-zum-recht-template.test.js, tests/erbschein-template.test.js), und das Gerüst startet ohne sie.
   Diese Datei hält, was von der alten Zusicherung bleibt:
   (1) DIE REGION IST LEER und die abgeleiteten Konstanten samt Pflicht-Wurf sind weg,
   (2) DAS NACKTE GERÜST STARTET — der Boot-Riegel ist nicht nur behauptet gelöst: eine Kopie mit geleerter Region lädt,
   (3) das erzeugte Kern-Artefakt ist driftfrei (der Erzeuger schreibt die leere Liste).
   ═══════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

function ladeRoh() {
  // KERN_HTML_PATH gesetzt: ladeKern() bäckt dann NICHT, es lädt das Gerüst so, wie es im Repo liegt.
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = path.join(REPO, 'vivodepot.html');
  delete require.cache[require.resolve('./load-kern.js')];
  try { return require('./load-kern.js').ladeKern().V; } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
  }
}

test('[Ab-Werk-Auszüge·Leer] die Region ist leer, die abgeleiteten Konstanten und der Pflicht-Wurf gibt es nicht mehr', () => {
  const V = ladeRoh();
  assert.deepEqual(V.AB_WERK_LOGIK_MODUL_AUSZUEGE_QUELLEN, []);
  assert.equal(V._abWerkAuszugPflicht, undefined, 'der Boot-Riegel ist weg');
  assert.equal(V.ERBSCHEIN_VORBEREITUNG_BUNDLE_TEXT_EINGEBAUT, undefined);
  assert.equal(V.AB_WERK_AUSZUG_BUNDLE_TEXTE, undefined);
});

test('[Ab-Werk-Auszüge·Leer · Rot-Beweis] das nackte Gerüst startet OHNE Auszug — es verlangt beim Start keinen bestimmten Inhalt', () => {
  const V = ladeRoh();   // wirft beim Laden, wenn ein Boot-Riegel steht
  assert.ok(V, 'das Gerüst lädt');
  assert.deepEqual(V._logikModuleAlle().map((m) => m.id), [], 'ohne Produkt trägt es keinen Auszug');
});

test('[Ab-Werk-Auszüge·Leer] das erzeugte Kern-Artefakt ist driftfrei (der Erzeuger schreibt die leere Liste)', () => {
  const { execFileSync } = require('node:child_process');
  const werkzeug = path.join(REPO, 'tools', 'ab-werk-logikmodul-auszuege-kern-schreiben.js');
  const aus = execFileSync(process.execPath, [werkzeug, '--check'], { encoding: 'utf8' });
  assert.match(aus, /kein Drift/, 'Abhilfe: node tools/ab-werk-logikmodul-auszuege-kern-schreiben.js');
});
