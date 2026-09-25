'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Probe — der Feldkatalog liest über den konfektionierten Kern, nicht mehr
   über die native `vivodepot.html` direkt (Strang D, 17.09.2026)
   ────────────────────────────────────────────────────────────────────────
   ANLASS: sobald die zwölf Bereiche als eigene `modulTyp:'bereich'`-Dateien
   vorliegen (Strang A) und der native Kern sie nicht mehr trägt, läse
   `katalogAusKern()` gegen die rohe `vivodepot.html` nur noch einen
   Bruchteil der Felder — der Katalog verlöre welche, ohne dass etwas rot
   würde. Der Erzeuger läuft darum jetzt gegen ein KONFEKTIONIERTES
   `privat-de` (`_konfektioniertenKernBauen`, mit leerem Zusatz-Bündel),
   nicht mehr gegen das Repo-Original direkt.

   WAS DIESE PROBE HÄLT: dass `_konfektioniertenKernBauen()` wirklich einen
   ANDEREN Kern liefert als das Repo-Original (Rot-Beweis über den Dateipfad
   und eine echte `ladeKern()`-Probe dagegen) — eine Probe, die nur „dieselbe
   Feldzahl" prüfte, hätte auch bestanden, wenn `main()` versehentlich wieder
   die rohe `vivodepot.html` gelesen hätte (heute liefern beide Wege zufällig
   dieselbe Zahl, weil Strang A noch nicht gelandet ist). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { _konfektioniertenKernBauen } = require('../tools/build-feldkatalog.js');

test('[Feldkatalog·Kern] _konfektioniertenKernBauen liefert einen ANDEREN Kern-Pfad als das Repo-Original', () => {
  const kern = _konfektioniertenKernBauen();
  try {
    assert.notEqual(kern.kernPfad, path.join(__dirname, '..', 'vivodepot.html'),
      'der Katalog-Erzeuger muss gegen einen Wegwerf-Kern laufen, nicht gegen das Repo-Original');
    assert.ok(fs.existsSync(kern.kernPfad), 'der konfektionierte Kern muss real auf der Platte liegen');
    assert.match(kern.kernPfad, /privat-de/, 'konfektioniert gegen den privat-de-Slug, wie im Kommentar behauptet');
  } finally {
    kern.aufraeumen();
  }
  assert.equal(fs.existsSync(kern.kernPfad), false, 'aufraeumen() muss den Wegwerf-Ordner wirklich entfernen');
});

test('[Feldkatalog·Kern] der konfektionierte Kern lädt echt und trägt alle dreizehn Bereiche', () => {
  const kern = _konfektioniertenKernBauen();
  try {
    const vorher = process.env.KERN_HTML_PATH;
    process.env.KERN_HTML_PATH = kern.kernPfad;
    // Frischer Node-Prozess wäre sauberer (Modul-Cache von load-kern.js), aber innerhalb
    // DIESES Testlaufs ist load-kern.js hier zum ersten Mal an der Reihe — derselbe Aufbau
    // wie in main() selbst, s. Kommentar dort zur Reihenfolge.
    delete require.cache[require.resolve('../tests/load-kern.js')];
    const { ladeKern } = require('../tests/load-kern.js');
    const { V } = ladeKern();
    assert.equal(V.bereicheAlle().length, 13, 'privat-de trägt heute zwölf Buendel-Bereiche + housing (BEREICH_QUELLEN_EINGEBAUT)');
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve('../tests/load-kern.js')];
  } finally {
    kern.aufraeumen();
  }
});
