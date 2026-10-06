'use strict';
/* Der Drag-Zustand der Vorlagen-Arbeitsfläche (Template-Generator): ein verspätetes `dragend` darf einen LAUFENDEN Drag nicht entwaffnen (22.09.2026).
   Anlass: der E2E-Flake tests/e2e-cross/T-CROSS-30-generator-arbeitsflaeche.spec.js:58 (zwei Drags hintereinander, danach fehlt ein Feld). Ob das verspätete `dragend` der
   Grund der Flake ist, ist aus dem Code nicht zu entscheiden (dafür bräuchte es einen Lauf mit Ereignisprotokoll) — die Zusicherung hier steht für sich: der Generator hält den
   Zustand eines Drags in EINEM globalen Platz (`DND`), den `drop` und zwei `dragend`-Handler leeren, und verwirft einen Drop ohne Zustand still. Ein `dragend`, das zu einem FRÜHEREN
   Drag gehört, darf den Zustand des jetzt laufenden nicht löschen.
   Gemessen wird am ECHTEN Handler-Code: der Lader (tests/load-generator.js) führt das Skript des Generators aus; hier werden nur die Listener aufgezeichnet, die `dndBinden()` an
   Palette und Vorschau hängt, und die Ereignisse selbst eingespielt — in der Reihenfolge, in der der Browser sie zustellt. Kein Browser, kein Wiederholen bis zum Fehlschlag. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { ladeGenerator } = require('./load-generator.js');

/** Ein frisch geladener Generator, dessen Drag-Listener aufgezeichnet sind. */
function harnisch() {
  const g = ladeGenerator();
  // Der DOM-Stub des Laders liefert für jede Eigenschaft eine Funktion — auch für `firstChild`; `leeren()` (while (node.firstChild) …) liefe endlos. Jedes Stub-Element hat hier keine Kinder.
  const dok = g.document, holeId = dok.getElementById, holeNeu = dok.createElement;
  dok.getElementById = (id) => { const e = holeId(id); if (e) e.firstChild = null; return e; };
  dok.createElement = (...a) => { const e = holeNeu(...a); e.firstChild = null; return e; };
  const aufgezeichnet = { palette: {}, vorschau: {} };
  const haenge = (id, ziel) => {
    const el = g.document.getElementById(id);
    el.addEventListener = (typ, fn) => { (ziel[typ] = ziel[typ] || []).push(fn); };
  };
  haenge('palette', aufgezeichnet.palette);
  haenge('tpl-felder', aufgezeichnet.vorschau);
  vm.runInContext('dndBinden()', g.sandbox);
  const ausfuehren = (code) => vm.runInContext(code, g.sandbox);
  const eintrag = (idx) => ({ dataset: { kat: String(idx) }, closest: () => null });
  const ereignis = (ziel, extra = {}) => ({ target: ziel, dataTransfer: { setData() {}, dropEffect: '', effectAllowed: '' }, clientY: 0, preventDefault() { this.verhindert = true; }, ...extra });
  const senden = (liste, e) => { for (const fn of liste || []) fn(e); return e; };
  const palette = (typ, quelle) => senden(aufgezeichnet.palette[typ], ereignis({ closest: () => quelle }));
  const vorschau = (typ) => senden(aufgezeichnet.vorschau[typ], ereignis({ closest: () => null }));
  return {
    STATE: g.V.STATE, ausfuehren, eintrag,
    dragstart: (quelle) => palette('dragstart', quelle),
    dragend: (quelle) => palette('dragend', quelle),
    kartenStart: (karte) => senden(aufgezeichnet.vorschau.dragstart, ereignis({ closest: () => karte })),
    kartenEnde: (karte) => senden(aufgezeichnet.vorschau.dragend, ereignis({ closest: () => karte })),
    dragover: () => vorschau('dragover'),
    drop: () => vorschau('drop'),
    dnd: () => ausfuehren('DND'),
    felder: () => g.V.STATE.felder.length,
  };
}

/* Ein vollständiger Drag, in der Reihenfolge des Browsers: dragstart → dragover → drop → dragend. */
function vollerDrag(h, quelle) {
  h.dragstart(quelle);
  const over = h.dragover();
  h.drop();
  h.dragend(quelle);
  return over;
}

test('[Drag-Zustand·Positivkontrolle] der Harnisch ist echt: zwei Drags nacheinander, jeder mit eigenem dragend, legen zwei Felder an — und ohne Drag-Zustand geschieht nichts', () => {
  const h = harnisch();
  assert.equal(h.STATE.art === 'blatt', false, 'die Arbeitsfläche steht im Vorlagen-Modus');
  const vor = h.felder();
  const over = vollerDrag(h, h.eintrag(0));
  assert.equal(over.verhindert, true, 'dragover erlaubt den Drop (preventDefault) — sonst käme im Browser gar kein drop');
  assert.equal(h.felder(), vor + 1, 'der erste Drag legt ein Feld an');
  vollerDrag(h, h.eintrag(1));
  assert.equal(h.felder(), vor + 2, 'der zweite auch');
  assert.equal(h.dnd(), null, 'nach einem vollständigen Drag ist der Zustand leer');
  // Ohne dragstart kein Zustand: der drop wird verworfen (das stille return) — die Probe unten mißt also wirklich diese Stelle.
  h.drop();
  assert.equal(h.felder(), vor + 2);
});

test('[Drag-Zustand] ein verspätetes dragend eines früheren Drags entwaffnet den laufenden nicht', () => {
  const h = harnisch();
  const vor = h.felder();
  const a = h.eintrag(0), b = h.eintrag(1);
  h.dragstart(a); h.dragover(); h.drop();                 // Drag 1 ist eingefallen …
  h.dragstart(b);                                         // … Drag 2 läuft …
  h.dragend(a);                                           // … und das dragend von Drag 1 wird jetzt erst zugestellt.
  assert.notEqual(h.dnd(), null, 'der laufende Drag hat seinen Zustand noch');
  const over = h.dragover();
  assert.equal(over.verhindert, true, 'der laufende Drag darf weiter fallen gelassen werden');
  h.drop();
  assert.equal(h.felder(), vor + 2, 'das zweite Feld ist angekommen, nicht still verworfen');
});

test('[Drag-Zustand] das dragend des LAUFENDEN Drags leert den Zustand weiterhin (der Fix darf das Aufräumen nicht abschaffen)', () => {
  const h = harnisch();
  const a = h.eintrag(0);
  h.dragstart(a);
  assert.notEqual(h.dnd(), null);
  h.dragend(a);                                           // abgebrochen: Esc, ausserhalb losgelassen
  assert.equal(h.dnd(), null, 'ein abgebrochener Drag räumt auf');
  const vor = h.felder();
  h.dragover(); h.drop();
  assert.equal(h.felder(), vor, 'ohne Zustand kein Drop');
});

test('[Drag-Zustand] dasselbe für einen Drag einer KARTE (umsortieren): das verspätete dragend einer früheren Karte entwaffnet den laufenden nicht', () => {
  const h = harnisch();
  h.dragstart(h.eintrag(0)); h.dragover(); h.drop(); h.dragend(h.eintrag(0));
  h.dragstart(h.eintrag(1)); h.dragover(); h.drop(); h.dragend(h.eintrag(1));
  assert.equal(h.felder(), 2, 'Vorbedingung: zwei Felder');
  const karte = (i) => ({ dataset: { i: String(i) }, classList: { add() {}, remove() {} }, closest: () => karte0 });
  const karte0 = karte(0), karte1 = karte(1);
  h.kartenStart(karte0); h.dragover(); h.drop(); h.kartenEnde(karte0);      // Drag 1: Karte 0 umsortiert
  h.kartenStart(karte1);                                                      // Drag 2 läuft
  h.kartenEnde(karte0);                                                       // verspätetes dragend von Drag 1
  assert.notEqual(h.dnd(), null, 'der laufende Karten-Drag hat seinen Zustand noch');
  h.kartenEnde(karte1);                                                       // sein eigenes Ende räumt auf
  assert.equal(h.dnd(), null);
});
