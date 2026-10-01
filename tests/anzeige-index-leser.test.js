'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Jede Stelle, die den Anzeige-Index liest, ist eingeordnet — und die Funde werden nur weniger
   ────────────────────────────────────────────────────────────────────────
   Werkzeug und Begründung: tools/anzeige-index-leser.js. Grundlinie:
   tools/anzeige-index-leser-grundlinie.json (anzeige mit Grund, fund = bekannte Datenfrage).

   ROT WIRD DIESE PROBE, wenn eine neue Stelle `SEKTOR_BY_ID` liest und nicht eingetragen ist, wenn
   eine eingetragene nicht mehr liest (dann schrumpft die Liste — das ist der Sinn), und wenn ein
   Eintrag keine Art oder keinen Grund trägt.

   ROT-BEWEIS, EINGEBAUT: die letzte Probe nimmt den Fix an `_bereichZuSektorId` in einer Kopie des
   Kerns zurück und verlangt, dass das Werkzeug genau diese Stelle als neue, nicht eingetragene meldet.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { leser } = require('../tools/anzeige-index-leser.js');
const GRUNDLINIE = require('../tools/anzeige-index-leser-grundlinie.json');

test('[Anzeige-Index·Ratsche] jede lesende Stelle ist eingetragen, und jede eingetragene liest noch', () => {
  const ist = leser();
  assert.ok(ist.length > 10, 'das Werkzeug findet fast nichts — dann prüft diese Probe nichts');
  const neu = ist.filter((k) => !GRUNDLINIE.stellen[k]);
  const weg = Object.keys(GRUNDLINIE.stellen).filter((k) => !ist.includes(k));
  assert.deepEqual(neu, [], 'NEUE Stelle liest den Anzeige-Index: Anzeige (mit Grund eintragen) oder Datenfrage (Katalog fragen)?');
  assert.deepEqual(weg, [], 'diese Stelle liest den Anzeige-Index nicht mehr — aus der Grundlinie entfernen, die Liste schrumpft');
});

test('[Anzeige-Index·Ratsche] jeder Eintrag trägt Art und Grund', () => {
  for (const [k, e] of Object.entries(GRUNDLINIE.stellen)) {
    assert.ok(e.art === 'anzeige' || e.art === 'fund', k + ': Art');
    assert.ok(typeof e.grund === 'string' && e.grund.trim().length > 10, k + ': Grund');
  }
});

test('[Anzeige-Index·Werkzeug] Kommentare und Strings zählen nicht, Code schon', () => {
  const { nurCode } = require('../tools/anzeige-index-leser.js');
  assert.ok(!nurCode('// SEKTOR_BY_ID\n/* SEKTOR_BY_ID */ const a = "SEKTOR_BY_ID";').includes('SEKTOR_BY_ID'));
  assert.ok(nurCode('const s = SEKTOR_BY_ID[id]; // Kommentar').includes('SEKTOR_BY_ID'));
  assert.ok(nurCode('const r = /[/]x/g; const s = SEKTOR_BY_ID;').includes('SEKTOR_BY_ID'), 'ein Regex-Literal verschluckt den Rest der Zeile');
});

test('[Anzeige-Index·Rot-Beweis] fragt _bereichZuSektorId wieder den Anzeige-Index, meldet das Werkzeug die Stelle', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const vorher = '  if (_sektorAusKatalog(b)) return b;';
  assert.ok(kern.includes(vorher), 'die Zeile in _bereichZuSektorId hat sich geändert — der Rot-Beweis prüft nichts mehr');
  const kopie = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vd-anzeige-index-')), 'vivodepot.html');
  fs.writeFileSync(kopie, kern.replace(vorher, '  if (Object.prototype.hasOwnProperty.call(SEKTOR_BY_ID, b)) return b;'));
  let ist;
  const tmp = path.dirname(kopie);
  try { ist = leser(kopie); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  assert.ok(ist.includes('_bereichZuSektorId') && !GRUNDLINIE.stellen._bereichZuSektorId);
});
