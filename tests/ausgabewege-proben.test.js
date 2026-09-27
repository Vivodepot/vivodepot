'use strict';
/* ═══════════════════════════════════════════════════════
   Wächter „jeder Ausgabeweg hat eine Probe am Artefakt" (AUS1, 19.09.2026)
   ───────────────────────────────────────────────────────
   Das Inventar der Ausgabewege ist tools/lib/ausgabewege-einordnung.js (Wächter: tools/ausgabewege-pruefen.js
   — ein neuer Weg ohne Zeile ist dort rot). Dieser Wächter verlangt für jeden dieser Wege die Bindung an
   eine Probe am ERZEUGTEN Artefakt (tools/lib/ausgabewege-proben.js): der Test-Titel muss im Quelltext
   der genannten Datei stehen; oder der Weg steht als benannte Lücke da, deren Zahl nur sinken darf.
   Dasselbe je Format der Export-Registry (EXPORT_FORMATE). Ein neuer Weg ohne Probe: rot.
   ═══════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { AUSGABEWEGE_EINORDNUNG } = require('../tools/lib/ausgabewege-einordnung.js');
const { WEGE, FORMATE, FORMAT_DATEI } = require('../tools/lib/ausgabewege-proben.js');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const DECKEL_LUECKEN = 0;   // sinkt nur

function ausgabewege(einordnung) { return Object.keys(einordnung).filter((k) => einordnung[k].klasse !== 'kein-ausgabeweg').sort(); }
function befunde(wege, einordnung, lesen) {
  const f = [];
  for (const k of ausgabewege(einordnung)) if (!wege[k]) f.push('Ausgabeweg ohne Bindung an eine Probe: ' + k);
  for (const k of Object.keys(wege)) if (!ausgabewege(einordnung).includes(k)) f.push('Bindung ohne Ausgabeweg (veraltet): ' + k);
  for (const [k, e] of Object.entries(wege)) {
    if (!e.fremd) f.push(k + ': ohne Angabe, womit das Artefakt gelesen wird');
    const hatProben = Array.isArray(e.proben) && e.proben.length > 0;
    if (hatProben === !!e.luecke) f.push(k + ': genau eines von proben/luecke');
    if (e.luecke && e.luecke.length < 30) f.push(k + ': Lücke ohne Begründung');
    for (const p of (e.proben || [])) {
      const text = lesen(p.datei);
      if (text === null) f.push(k + ': Probe-Datei fehlt: ' + p.datei);
      else if (!text.includes(p.titel)) f.push(k + ': Titel „' + p.titel + '" steht nicht in ' + p.datei);
    }
  }
  return f;
}
const lesenEcht = (rel) => { const p = path.join(REPO, rel); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; };

test('[Ausgabewege·Proben·Ausbeute] das Inventar ist besetzt', () => {
  assert.ok(ausgabewege(AUSGABEWEGE_EINORDNUNG).length >= 20, 'Wege im Inventar: ' + ausgabewege(AUSGABEWEGE_EINORDNUNG).length);
});

test('[Ausgabewege·Proben] jeder Ausgabeweg des Inventars ist an eine Probe am Artefakt gebunden, oder als Lücke benannt', () => {
  assert.deepEqual(befunde(WEGE, AUSGABEWEGE_EINORDNUNG, lesenEcht), []);
});

test('[Ausgabewege·Proben·Ratsche] die Zahl der benannten Lücken darf nur sinken', () => {
  const luecken = Object.keys(WEGE).filter((k) => WEGE[k].luecke);
  assert.ok(luecken.length <= DECKEL_LUECKEN, 'Lücken: ' + luecken.length + ' (Deckel ' + DECKEL_LUECKEN + '): ' + luecken.join(', '));
});

test('[Ausgabewege·Proben·Formate] jedes Format der Export-Registry hat eine Probe am Inhalt, und die Bindung nennt kein Format, das es nicht gibt', () => {
  const { V } = ladeKern();
  const ids = V.EXPORT_FORMATE.map((e) => e.id).sort();
  assert.deepEqual(Object.keys(FORMATE).sort(), ids, 'FORMATE und EXPORT_FORMATE weichen ab');
  const text = lesenEcht(FORMAT_DATEI);
  for (const id of ids) {
    assert.ok(FORMATE[id].fremd, id + ': ohne Angabe, womit es gelesen wird');
    assert.ok(text.includes(FORMATE[id].titel), id + ': Titel „' + FORMATE[id].titel + '" steht nicht in ' + FORMAT_DATEI);
  }
});

test('[Ausgabewege·Proben·Rot-Beweis] ein neuer Weg ohne Bindung, eine veraltete Bindung, ein fehlender Titel und eine unbegründete Lücke werden gefunden', () => {
  const einordnung = Object.assign({}, AUSGABEWEGE_EINORDNUNG, { flowNeuerExport: { klasse: 'weitergabe', grund: 'gepflanzt' } });
  const f1 = befunde(WEGE, einordnung, lesenEcht);
  assert.ok(f1.some((z) => /ohne Bindung an eine Probe: flowNeuerExport/.test(z)), 'ein neuer Weg ohne Probe ist rot');
  const wege = Object.assign({}, WEGE, {
    gibtEsNicht: { fremd: 'x', proben: [{ datei: 'tests/ausgabewege-proben.test.js', titel: '[Ausgabewege·Proben·Ausbeute]' }] },
    flowVollDepotPdf: { fremd: 'x', proben: [{ datei: 'tests/ausgabewege-artefakte-pdf.test.js', titel: '[Titel den es nicht gibt]' }] },
    flowBereichPdf: { fremd: 'x', luecke: 'kurz' },
  });
  const f2 = befunde(wege, AUSGABEWEGE_EINORDNUNG, lesenEcht);
  assert.ok(f2.some((z) => /veraltet\): gibtEsNicht/.test(z)), 'veraltete Bindung');
  assert.ok(f2.some((z) => /flowVollDepotPdf: Titel/.test(z)), 'fehlender Titel');
  assert.ok(f2.some((z) => /flowBereichPdf: Lücke ohne Begründung/.test(z)), 'unbegründete Lücke');
});
