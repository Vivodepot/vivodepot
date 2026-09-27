'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Jeder Ausgabeweg ist eingeordnet (MyTerms v1-Schnitt, Teil D, 16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Weitergabe an Dritte wird gesperrt, eigene Sicherung und Notfall nie. Ein neuer Ausgabeweg ohne
   Einordnung ist rot — dieselbe Ratsche wie ab-werk-rangfolge-pruefen.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ausgabewegePruefen, ausgabewegeSammeln } = require('../tools/ausgabewege-pruefen.js');
const { AUSGABEWEGE_EINORDNUNG } = require('../tools/lib/ausgabewege-einordnung.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

test('[Ausgabewege] jeder Ausgabeweg im Kern hat eine Zeile, jede Zeile einen Ausgabeweg', () => {
  const r = ausgabewegePruefen(KERN);
  assert.deepEqual({ uneingeordnet: r.uneingeordnet, veraltet: r.veraltet, klasseFalsch: r.klasseFalsch },
    { uneingeordnet: [], veraltet: [], klasseFalsch: [] });
});

test('[Ausgabewege] Notfallkarte und Notfallblatt sind ausdrücklich nie gesperrt, die Depot-Datei ebenso', () => {
  assert.equal(AUSGABEWEGE_EINORDNUNG.flowNotfallkartePdf.klasse, 'notfall');
  assert.equal(AUSGABEWEGE_EINORDNUNG.notfallblattOeffnen.klasse, 'notfall');
  assert.equal(AUSGABEWEGE_EINORDNUNG._depotBlobSpeichern.klasse, 'eigene-sicherung');
});

test('[Ausgabewege·Rot-Beweis] ein neuer Ausgabeweg ohne Zeile wird rot; ein Kommentar oder Stil-Block nicht', () => {
  const zusatz = '\n<script>\nfunction flowNeuerExport() {\n  dateiAusgeben(new Blob([]), "x.json");\n}\n'
    + '// window.print() nur erwähnt\n/* navigator.share( im Kommentar */\n</script>\n<style>\n/* window.print() */\n</style>\n';
  const r = ausgabewegePruefen(KERN + zusatz);
  assert.equal(r.ok, false);
  assert.deepEqual(r.uneingeordnet, ['flowNeuerExport']);
  assert.equal(ausgabewegeSammeln(zusatz).size, 1);
});

test('[Ausgabewege·Rot-Beweis] eine Zeile ohne Ausgabeweg im Kern wird rot', () => {
  const t = Object.assign({}, AUSGABEWEGE_EINORDNUNG, { gibtEsNicht: { klasse: 'weitergabe', grund: 'x' } });
  assert.deepEqual(ausgabewegePruefen(KERN, t).veraltet, ['gibtEsNicht']);
});

/* Die Sperre sitzt an genau den Wegen der Klasse `weitergabe` — und an keinem anderen. */
function funktionsKoerper(name) {
  const m = KERN.match(new RegExp('\\n(?:async\\s+)?function\\s+' + name + '\\s*\\('));
  if (!m) return null;
  const start = m.index + 1;
  const ende = KERN.indexOf('\n}\n', start);
  return KERN.slice(start, ende);
}
const TUER = /\b(?:mitVereinbarung|vereinbarungFreigabeHolen)\s*\(/;
/* Code-Review Teil C, C-2 (16.09.2026): eine Sperre, die nur noch in einem KOMMENTAR steht („// mitVereinbarung(…"
   nach einem Umbau), zählte vorher als getragen. Geprüft wird darum der Rumpf ohne Kommentare. `://` in URLs
   bleibt stehen. */
function ohneKommentare(code) {
  return String(code).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}
const traegtSperre = (koerperText) => TUER.test(ohneKommentare(koerperText));

test('[Sperre] jede Weitergabe trägt die Sperre (oder ihr Aufrufer, `sperreIn`), keine andere Klasse tut es', () => {
  for (const [name, zeile] of Object.entries(AUSGABEWEGE_EINORDNUNG)) {
    if (zeile.klasse === 'weitergabe') {
      for (const traeger of (zeile.sperreIn || [name])) {
        const k = funktionsKoerper(traeger);
        assert.ok(k, traeger + ' nicht gefunden');
        assert.ok(traegtSperre(k), traeger + ' (Weitergabe ' + name + ') ruft die Sperre nicht');
      }
    } else if (name !== 'dateiAusgeben') {
      const k = funktionsKoerper(name);
      assert.ok(k && !traegtSperre(k), name + ' (' + zeile.klasse + ') darf nie gesperrt sein');
    }
  }
});

test('[Sperre·Rot-Beweis] eine Weitergabe ohne Sperre würde bemerkt', () => {
  const k = funktionsKoerper('flowErbscheinXmlSichern');
  assert.ok(traegtSperre(k));
  assert.equal(traegtSperre(k.replace(/vereinbarungFreigabeHolen\(/g, 'irgendwas(')), false);
});

test('[Sperre·Rot-Beweis C-2] eine Sperre, die nur noch im Kommentar steht, zählt nicht', () => {
  const k = funktionsKoerper('flowBereichPdf');
  assert.ok(traegtSperre(k), 'Vorbedingung: das Bereichs-PDF trägt die Sperre');
  const umgebaut = k.replace("mitVereinbarung('bereich-pdf:' + sektorId, () => {", "((f) => f())(() => {   // war: mitVereinbarung('bereich-pdf:' + sektorId, …)");
  assert.notEqual(umgebaut, k, 'die Ersetzung muss greifen');
  assert.equal(traegtSperre(umgebaut), false, 'Zeilenkommentar');
  assert.equal(traegtSperre('function f() { /* mitVereinbarung( */ dateiAusgeben(x); }'), false, 'Blockkommentar');
  assert.equal(traegtSperre("function f() { const u = 'https://x'; mitVereinbarung('w', () => 1); }"), true, 'URL bricht nichts ab');
});
