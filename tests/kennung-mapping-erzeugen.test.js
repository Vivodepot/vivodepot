'use strict';
/* Code-Review 16.09.2026, A4: tools/kennung-mapping-erzeugen.js würde beim Aufruf gegen den
   heutigen (seit v695 englischen) bereiche/feldkatalog.json die Alt→Neu-Umbau-Tabelle durch eine
   englisch→englisch-Tabelle ersetzen — still, ohne Fehler. Kein Werkzeug, Test oder Hook rief das
   Skript je auf; diese Probe ist die erste. Sie prüft nicht die Tabelle selbst (die ist seit dem
   Umbau ohnehin nicht mehr der Zweck des Skripts), sondern die Schranke, die einen Lauf gegen den
   heutigen Katalog verhindert. */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const SKRIPT = path.join(REPO, 'tools', 'kennung-mapping-erzeugen.js');

test('[A4·Rot-Beweis] ein Lauf gegen den heutigen (bereits englischen) Feldkatalog bricht ab, statt eine Unsinns-Tabelle zu schreiben', () => {
  assert.throws(() => {
    execFileSync('node', [SKRIPT], { cwd: REPO, stdio: 'pipe' });
  }, (e) => {
    const ausgabe = String(e.stderr || '');
    assert.match(ausgabe, /bereits migriert/, 'die Fehlermeldung muss den Grund nennen, nicht nur abstürzen');
    assert.match(ausgabe, /Abgebrochen, nichts geschrieben/, 'muss ausdrücklich sagen, dass nichts geschrieben wurde');
    return true;
  });
});
