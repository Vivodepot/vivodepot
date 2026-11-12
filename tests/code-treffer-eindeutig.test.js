'use strict';
/* Probe: Ein Code entsteht aus einer eigenen Eingabe nur bei einem eindeutigen Treffer in der Liste. Trifft ein Begriff mehrere Codes,
   bleibt die Eingabe Text. Geprüft wird jeder Begriff jeder belegten Code-Liste.
   Rot-Beweis: die Probe [Rot·ErsterTreffer] pflanzt „der erste Treffer gilt“ in eine Kopie des Kerns und sieht die Zusicherung fallen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN_PFAD = path.join(__dirname, '..', 'vivodepot.html');
const KERN = fs.readFileSync(KERN_PFAD, 'utf8');

function begriffe(e) {
  return [e.anzeigeName, e.anzeigeQuelle, e.quellBegriff].concat(e.synonyme || []).filter((b) => typeof b === 'string' && b);
}

function zusicherung(V, systemId) {
  const nachBegriff = new Map();
  for (const e of V.liesCodeListe(systemId).daten) {
    for (const b of begriffe(e)) {
      const k = b.toLowerCase();
      if (!nachBegriff.has(k)) nachBegriff.set(k, { wortlaut: b, codes: new Set() });
      nachBegriff.get(k).codes.add(e.code);
    }
  }
  for (const { wortlaut, codes } of nachBegriff.values()) {
    const wert = V.codeWertAus(systemId, wortlaut);
    if (codes.size === 1) {
      assert.equal(wert && wert.code, [...codes][0], systemId + ': „' + wortlaut + '“ trägt seinen einzigen Code');
    } else {
      assert.equal(wert, wortlaut, systemId + ': „' + wortlaut + '“ trifft mehrere Codes und bleibt Text');
    }
  }
}

test('[Eindeutig·Alle] in jeder Liste trägt ein Begriff nur bei genau einem Code einen Code', () => {
  const { V } = ladeKern();
  const belegt = Object.keys(V.CODE_LISTEN).filter((id) => V.liesCodeListe(id).daten.length > 0);
  for (const id of ['snomedAllergen', 'icd10', 'atc']) assert.ok(belegt.includes(id), id + ' ist belegt');
  for (const systemId of belegt) zusicherung(V, systemId);
});

test('[Eindeutig·Chip] ein mehrdeutiger Begriff ergibt einen Chip ohne Code, ein eindeutiger behält ihn', () => {
  const { V } = ladeKern();
  assert.deepEqual({ ...V.chipAusEingabe('atc', 'Penicillin') }, { text: 'Penicillin' });
  const g = V.chipAusEingabe('atc', 'Penicillin G');
  assert.equal(g.code.code, 'J01CE01');
});

test('[Rot·ErsterTreffer] mit „der erste Treffer gilt“ fällt die Zusicherung', () => {
  const a = 'new Set(treffer.map((e) => e.code)).size === 1 ? treffer[0] : null';
  assert.ok(KERN.includes(a), 'die Stelle steht im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-eindeutig-'));
  try {
    const kopie = path.join(dir, 'kern.html');
    fs.writeFileSync(kopie, KERN.split(a).join('treffer[0]'));
    const { V } = ladeKern({ htmlPfad: kopie, backen: true });
    assert.throws(() => zusicherung(V, 'atc'), /mehrere Codes/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
