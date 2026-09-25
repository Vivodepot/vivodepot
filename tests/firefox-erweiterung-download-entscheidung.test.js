'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   firefox-erweiterung-download-entscheidung.test.js — Rot-Beweis für die
   Firefox-Erweiterung (27.08.2026, Entscheidung 24.08.2026, Option A)
   ────────────────────────────────────────────────────────────────────────────
   Prüft die REINE Entscheidungsfunktion (`entscheideUeberDownload`) ohne
   echte Firefox-Laufzeit — sie trifft die Wahl, `wireListener` verdrahtet sie
   nur an `browser.downloads`. Ein gefälschter `downloads`-API-Stub steht für
   den Verdrahtungs-Beleg (Gegenprobe: der EINE Aufrufer ruft `suggest`
   tatsächlich mit dem Entscheidungsergebnis auf).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { entscheideUeberDownload, wireListener } = require('../firefox-erweiterung/background.js');

test('[Firefox-Erweiterung] eine .vivodepot-Datei bekommt conflictAction:overwrite', () => {
  const r = entscheideUeberDownload({ filename: 'Mein-Vivodepot-2026-08-27.vivodepot' });
  assert.deepEqual(r, { filename: 'Mein-Vivodepot-2026-08-27.vivodepot', conflictAction: 'overwrite' });
});

test('[Firefox-Erweiterung] Groß-/Kleinschreibung der Endung ist unerheblich', () => {
  const r = entscheideUeberDownload({ filename: 'Mein-Depot.VIVODEPOT' });
  assert.equal(r.conflictAction, 'overwrite');
});

test('[Firefox-Erweiterung·Gegenprobe] eine andere Endung bleibt unangetastet (null, nicht zuständig)', () => {
  assert.equal(entscheideUeberDownload({ filename: 'urlaub-foto.jpg' }), null);
  assert.equal(entscheideUeberDownload({ filename: 'export.pdf' }), null);
  assert.equal(entscheideUeberDownload({ filename: 'sicherung.vivodepot.zip' }), null,
    'Endung MUSS .vivodepot sein, nicht nur enthalten');
});

test('[Firefox-Erweiterung·Gegenprobe] fehlender/leerer Dateiname wirft nicht, entscheidet sich für "nicht zuständig"', () => {
  assert.equal(entscheideUeberDownload({}), null);
  assert.equal(entscheideUeberDownload(null), null);
  assert.equal(entscheideUeberDownload({ filename: '' }), null);
});

test('[Firefox-Erweiterung·Rot] wireListener registriert einen Listener, der suggest() mit der Entscheidung aufruft', () => {
  let registrierterHandler = null;
  const stubDownloadsApi = {
    onDeterminingFilename: { addListener: (fn) => { registrierterHandler = fn; } },
  };
  wireListener(stubDownloadsApi);
  assert.equal(typeof registrierterHandler, 'function', 'wireListener hat keinen Handler registriert');

  let suggestArg = 'UNVERÄNDERT';
  registrierterHandler({ filename: 'Mein-Vivodepot.vivodepot' }, (arg) => { suggestArg = arg; });
  assert.deepEqual(suggestArg, { filename: 'Mein-Vivodepot.vivodepot', conflictAction: 'overwrite' });
});

test('[Firefox-Erweiterung·Rot·Gegenprobe] wireListener ruft suggest(undefined) für Nicht-Vivodepot-Downloads — Firefox behält sein Standardverhalten', () => {
  let registrierterHandler = null;
  const stubDownloadsApi = {
    onDeterminingFilename: { addListener: (fn) => { registrierterHandler = fn; } },
  };
  wireListener(stubDownloadsApi);

  let suggestArg = 'UNVERÄNDERT';
  registrierterHandler({ filename: 'urlaub-foto.jpg' }, (arg) => { suggestArg = arg; });
  assert.equal(suggestArg, undefined, 'suggest(undefined) heißt: Firefox entscheidet selbst, kein Eingriff');
});
