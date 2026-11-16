'use strict';
/* Form-Probe der Umbau-Verzeichnisse (Erreichbarkeits-Probe U-E, Bau Div RbB 13.11.2026).
   Prüft ohne Browser: jede tests/fixtures/umbau-verzeichnis-*.json hat die Felder, jeder Eintrag hat einen Weg
   oder einen Befund, jede lage ist bekannt, keine Kennung ist doppelt, ein „neu platziert“ hat ein neuer_platz.
   ROT-BEWEIS: der gepflanzte Fall unten (ein Eintrag „neu platziert“ ohne Weg) muss genau diesen Eintrag melden. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ARTEN = ['knopf', 'feld', 'menue', 'flow'];
const ZUSTAENDE = ['gemessen', 'neu platziert', 'entfällt mit Befund'];

function lageBekannt(lage) {
  return lage === 'start' || lage === 'sub-kontext' || /^bereich:.+/.test(String(lage));
}

/* Liefert die Probleme eines Verzeichnisses als Liste von Texten, je Eintrag einer. */
function probleme(verz) {
  const out = [];
  const gesehen = new Set();
  for (const e of verz.eintraege || []) {
    const id = e.kennung || '(ohne Kennung)';
    if (typeof e.kennung !== 'string' || !e.kennung) out.push(`${id}: Kennung fehlt`);
    if (gesehen.has(e.kennung)) out.push(`${id}: Kennung doppelt`);
    gesehen.add(e.kennung);
    if (!ARTEN.includes(e.art)) out.push(`${id}: art unbekannt (${e.art})`);
    if (!ZUSTAENDE.includes(e.zustand)) out.push(`${id}: zustand unbekannt (${e.zustand})`);
    if (e.zustand === 'entfällt mit Befund') {
      if (!e.befund) out.push(`${id}: entfällt ohne befund`);
      continue;
    }
    const np = e.neuer_platz;
    const hatWeg = np && typeof np === 'object' && np.weg && typeof np.weg === 'object' && Object.keys(np.weg).length > 0;
    if (e.zustand === 'neu platziert') {
      if (!hatWeg) out.push(`${id}: neu platziert ohne Weg`);
      if (np && typeof np === 'object' && np.lage !== undefined && !lageBekannt(np.lage)) out.push(`${id}: lage unbekannt (${np.lage})`);
    } else if (!hatWeg && !e.befund) {
      out.push(`${id}: ohne Weg und ohne Befund (stilles Weglassen)`);
    }
  }
  return out;
}

test('[Umbau-Form] jedes Umbau-Verzeichnis im Repo hat die Form (heute: keine Datei, also leer)', () => {
  const ziel = path.join(__dirname, 'fixtures');
  const dateien = fs.readdirSync(ziel).filter((n) => /^umbau-verzeichnis-.*\.json$/.test(n));
  for (const n of dateien) {
    const verz = JSON.parse(fs.readFileSync(path.join(ziel, n), 'utf8'));
    assert.deepEqual(probleme(verz), [], n);
  }
});

test('[Umbau-Form] gepflanzter Wegfall: genau der Eintrag ohne Weg wird gemeldet', () => {
  const verz = {
    eintraege: [
      { kennung: 'flowA', art: 'flow', beschriftung: '', fundort_alt: 'x', zustand: 'neu platziert',
        neuer_platz: { lage: 'start', weg: { alle: ['#a'] } } },
      { kennung: 'flowB', art: 'flow', beschriftung: '', fundort_alt: 'x', zustand: 'neu platziert',
        neuer_platz: { lage: 'start' } },
    ],
  };
  assert.deepEqual(probleme(verz), ['flowB: neu platziert ohne Weg']);
});

test('[Umbau-Form] ein Befund ersetzt den Weg; ein stilles Weglassen wird gemeldet', () => {
  const verz = {
    eintraege: [
      { kennung: 'knopfC', art: 'knopf', beschriftung: '', fundort_alt: 'x', zustand: 'entfällt mit Befund', befund: 'UMBAU-X' },
      { kennung: 'knopfD', art: 'knopf', beschriftung: '', fundort_alt: 'x', zustand: 'gemessen' },
    ],
  };
  assert.deepEqual(probleme(verz), ['knopfD: ohne Weg und ohne Befund (stilles Weglassen)']);
});
