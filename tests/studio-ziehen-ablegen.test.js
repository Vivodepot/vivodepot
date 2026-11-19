'use strict';
/* ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Studio per Ziehen und Ablegen (UX-RbB 12.11.2026): was am Studio-Erstnutzer-Weg hakte
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   (1) Ablegen setzt an die Stelle des Ablegens: „+“ und die freie Fläche ans Ende, eine Karte davor oder dahinter; die
       Katalog-Ordnung geschieht nur auf „Nach Themen ordnen“.
   (2) Es gibt eine Arbeitsfläche mit einer Bausteinliste (Katalog-Bausteine, „+“, Ziehen); ein Baustein steht höchstens einmal.
   (3) Jede Karte trägt ihr Menü dauerhaft (Nach oben, Nach unten, Entfernen, Bearbeiten); das Bearbeitungsblatt öffnet nicht
       mehr beim Antippen der Karte. Ziehen mit dem Finger: zeigerZiehenBinden (Browserprobe tests/e2e/studio-ziehen-ablegen.spec.js).
   (4) Wörter: Kennung/Code-Wert/IT-Fachleute fort aus den genannten Stellen.
   Jede Prüfung mit Rot-Beweis (Marke „Rot-Beweis“) an einer verschlechterten Fassung (ladeGenerator({ html })).
   ═════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
const nativ = (x) => JSON.parse(JSON.stringify(x));
const ersetzt = (alt, neu) => { assert.ok(HTML.includes(alt), 'Vorbedingung: die Stelle steht noch so da: ' + alt.slice(0, 70)); return HTML.replace(alt, neu); };
const KAT = (V, kennung) => { const i = V.FELDKATALOG.findIndex((k) => k.kennung === kennung); assert.ok(i >= 0, kennung); return i; };
const DREI = ['identity.familyName', 'identity.givenName', 'identity.birthDate'];

/* Bis 14.11.2026 trug der einfache Weg eine zweite Liste; seither gibt es eine Arbeitsfläche. Die Aussagen des einfachen Wegs
   („+“ ans Ende in der Folge des Antippens, ein Baustein höchstens einmal) stehen hier an ihr. */
function flaecheMit(V, kennungen) {
  V.STATE.felder = [];
  kennungen.forEach((k) => V.feldEinfuegen(V.feldAusKatalog(KAT(V, k)), null));
  return nativ(V.STATE.felder).map((f) => f.feldname);
}
const NAMEN = (V, kennungen) => kennungen.map((k) => V.FELDKATALOG[KAT(V, k)].label);

/* ── (1)+(2) „+“ und Doppel ─────────────────────────────────────────────────────────────────────────────────── */
test('[Ziehen · „+“] „+“ setzt ans Ende, in der Folge des Antippens (nicht nach Katalog); ein Baustein steht höchstens einmal', () => {
  const { V } = ladeGenerator(); V.spracheFuerProbeSetzen('de');
  assert.deepEqual(flaecheMit(V, DREI), NAMEN(V, DREI));
  V.feldEinfuegen(V.feldAusKatalog(KAT(V, DREI[2])), null);
  assert.equal(V.STATE.felder.length, 3, 'zweimal derselbe Baustein');
});
test('[Ziehen · „+“ · Rot-Beweis] ein „+“, das vorn einsetzt, fällt auf; ohne die Prüfung entsteht ein Doppel', () => {
  const a = ladeGenerator({ html: ersetzt('  if (pos == null) pos = STATE.felder.length;\n  pos = Math.max(0, Math.min(pos, STATE.felder.length));', '  if (pos == null) pos = 0;\n  pos = Math.max(0, Math.min(pos, STATE.felder.length));') });
  a.V.spracheFuerProbeSetzen('de');
  assert.notDeepEqual(flaecheMit(a.V, DREI), NAMEN(a.V, DREI));
  const b = ladeGenerator({ html: ersetzt('  const da = vorhandenesRegisterfeld(basis);\n  if (da >= 0) {', '  const da = -1;\n  if (da >= 0) {') });
  b.V.spracheFuerProbeSetzen('de');
  assert.equal(flaecheMit(b.V, [DREI[0], DREI[0]]).length, 2);
});

/* ── (1) Arbeitsfläche ───────────────────────────────────────────────────────────────────────────────────────── */
test('[Ziehen · Arbeitsfläche] Ablegen auf eine Karte setzt dorthin, auf die freie Fläche ans Ende; Verschieben ordnet um', () => {
  const { V } = ladeGenerator(); V.spracheFuerProbeSetzen('de');
  V.STATE.felder = [];
  V.dndAblegen({ art: 'kat', idx: KAT(V, DREI[0]) }, { index: 0, karte: null });
  V.dndAblegen({ art: 'kat', idx: KAT(V, DREI[1]) }, { index: 0, karte: null });
  V.dndAblegen({ art: 'kat', idx: KAT(V, DREI[2]) }, { index: 1, karte: {}, vor: true });
  const namen = () => nativ(V.STATE.felder).map((f) => f.feldname);
  const kat = (k) => V.FELDKATALOG[KAT(V, k)].label;
  assert.deepEqual(namen(), [kat(DREI[0]), kat(DREI[2]), kat(DREI[1])]);
  V.dndAblegen({ art: 'feld', i: 2 }, { index: 0, karte: {}, vor: true });
  assert.deepEqual(namen(), [kat(DREI[1]), kat(DREI[0]), kat(DREI[2])]);
  V.verschiebe(0, 1);
  assert.deepEqual(namen(), [kat(DREI[0]), kat(DREI[1]), kat(DREI[2])]);
  V.loescheFeld(1);
  assert.deepEqual(namen(), [kat(DREI[0]), kat(DREI[2])]);
});
test('[Ziehen · Arbeitsfläche · Rot-Beweis] ein Ablegen, das die Stelle verwirft, und ein Menü ohne Wirkung fallen auf', () => {
  const alt = ersetzt('feldEinfuegen(feldAusKatalog(d.idx), z.karte ? z.index : null);   // in die leere Fläche: ans Ende', 'feldEinfuegen(feldAusKatalog(d.idx), null);');
  const { V } = ladeGenerator({ html: alt }); V.spracheFuerProbeSetzen('de'); V.STATE.felder = [];
  V.dndAblegen({ art: 'kat', idx: KAT(V, DREI[0]) }, { index: 0, karte: null });
  V.dndAblegen({ art: 'kat', idx: KAT(V, DREI[1]) }, { index: 0, karte: {}, vor: true });
  assert.equal(nativ(V.STATE.felder)[0].feldname, V.FELDKATALOG[KAT(V, DREI[0])].label, 'mit der Stelle stünde der zweite vorn');
});

/* ── (3) Menü der Karte, Bearbeiten ─────────────────────────────────────────────────────────────────────────── */
const KARTEN_QUELLE = (h) => h.slice(h.indexOf('function rendereFelder()'), h.indexOf('function verschiebe('));
test('[Ziehen · Karte] das Menü steht immer da und trägt Bearbeiten, Nach oben, Nach unten, Entfernen; Antippen öffnet das Blatt nicht', () => {
  const q = KARTEN_QUELLE(HTML);
  /* Dummy 14.11.2026: rechts kleine Symbolknöpfe ✎ ↑ ↓ ✕, je mit Namen für Vorlesegeräte und 44 px Fläche. */
  for (const t of ["symbol(' vk-bearbeiten', 'Feld bearbeiten', 'Edit field', '✎'", "symbol('', 'Feld nach oben', 'Move field up', '↑'", "symbol('', 'Feld nach unten', 'Move field down', '↓'", "symbol(' gefahr', 'Feld löschen', 'Delete field', '✕'"]) assert.ok(q.includes(t), t);
  assert.ok(q.includes("'aria-label': L(de, en)"), 'jeder Symbolknopf trägt seinen Namen');
  assert.ok(!/karte\.addEventListener\('click'/.test(q), 'ein Klick auf die Karte öffnet das Bearbeitungsblatt');
  assert.match(HTML, /#tpl-felder \.vk > \.vk-aktionen:not\(\.bk-aktionen\) \{ position: absolute;[^}]*display: flex;/);
  assert.match(HTML, /\.vk-symbol \{ min-width: 44px; min-height: 44px;/);
});
test('[Ziehen · Karte · Rot-Beweis] das frühere Klick-Öffnen und ein Menü nur bei Hover fallen auf', () => {
  const alt = HTML.replace("    karte.addEventListener('keydown', (e) => {", "    karte.addEventListener('click', () => { if (!probierenAn) oeffneEditor(i); });\n    karte.addEventListener('keydown', (e) => {");
  assert.ok(/karte\.addEventListener\('click'/.test(KARTEN_QUELLE(alt)));
  const hover = HTML.replace('transform: translateY(-50%); display: flex; gap: 2px;', 'transform: translateY(-50%); display: none; gap: 2px;');
  assert.doesNotMatch(hover, /#tpl-felder \.vk > \.vk-aktionen:not\(\.bk-aktionen\) \{ position: absolute;[^}]*display: flex;/);
});
test('[Ziehen · Finger] Halten und Ziehen ist an Bausteinliste und Karten der Arbeitsfläche gebunden', () => {
  assert.match(HTML, /const ZEIGER_HALTEN_MS = \d+;/);
  assert.match(HTML, /dndBinden\(\); dndZeigerBinden\(\);/);
  assert.match(HTML, /e\.pointerType !== 'touch'/);
  assert.match(HTML, /document\.addEventListener\('touchmove', \(e\) => \{ if \(st && st\.aktiv && e\.cancelable\) e\.preventDefault\(\); \}, \{ passive: false \}\);/);
});
test('[Ziehen · Finger · Rot-Beweis] eine nicht gebundene Fingerbedienung fällt auf', () => {
  const alt = ersetzt('dndBinden(); dndZeigerBinden();', 'dndBinden();');
  assert.ok(!/dndBinden\(\); dndZeigerBinden\(\);/.test(alt));
});

/* ── (4) Wörter ─────────────────────────────────────────────────────────────────────────────────────────────── */
const WORTE = [
  ['Baustein vorschlagen', 'Suggest a building block'], ['Fehlt etwas?', 'Is something missing?'],
  ['Antworten zur Auswahl', 'Answers to choose from'], ['+ Wert in der Liste', '+ Value in the list'],   // seit S-3 aus Sicht der Stelle (16.11.2026)
  ['Nach Themen ordnen', 'Sort by topic'],   // „Für Fachleute: alle Einstellungen.“ stand auf der Kachel „Etwas anderes“, die mit S-1 entfällt
];
const ALT = ['>Werte in der Liste<', '>Kennung vorschlagen<', '>Code-Werte<', '>+ Code-Wert<', 'Für IT-Fachleute: Bausteine', 'Nach Bereichen ordnen'];
const wortBefunde = (h) => WORTE.flat().filter((t) => !h.includes(t)).concat(ALT.filter((t) => h.includes(t)));
test('[Ziehen · Wörter] die neuen Wörter stehen deutsch und englisch, die alten sind fort', () => {
  assert.deepEqual(wortBefunde(HTML), []);
});
test('[Ziehen · Wörter · Rot-Beweis] ein altes Wort zurück fällt auf', () => {
  assert.ok(wortBefunde(ersetzt('>Antworten zur Auswahl<', '>Code-Werte<')).includes('>Code-Werte<'));
});
