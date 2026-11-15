'use strict';
/* ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Studio per Ziehen und Ablegen (UX-RbB 12.11.2026): was am Studio-Erstnutzer-Weg hakte
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   (1) Ablegen setzt an die Stelle des Ablegens: „+“ und die freie Fläche ans Ende, eine Karte davor oder dahinter; die
       Katalog-Ordnung geschieht nur auf „Nach Themen ordnen“. Im einfachen Weg (Assistent) und in der Arbeitsfläche gleich.
   (2) Der einfache Weg trägt dieselbe Palette (Katalog-Bausteine, „+“, Ziehen); ein Baustein steht höchstens einmal.
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

function assistentMit(V, kennungen) {
  V.ASSISTENT.fragen = []; V.ASSISTENT.sprache = 'de';
  kennungen.forEach((k) => V.assistentKatHinzu(KAT(V, k), null));
  return V.ASSISTENT.fragen.map((f) => f.kat);
}

/* ── (1)+(2) einfacher Weg ───────────────────────────────────────────────────────────────────────────────────── */
test('[Ziehen · einfacher Weg] „+“ setzt ans Ende, in der Folge des Antippens (nicht nach Katalog)', () => {
  const { V } = ladeGenerator(); V.spracheFuerProbeSetzen('de');
  assert.deepEqual(assistentMit(V, DREI), DREI);
});
test('[Ziehen · einfacher Weg · Rot-Beweis] ein „+“, das vorn einsetzt, fällt auf', () => {
  const { V } = ladeGenerator({ html: ersetzt('const p = (pos == null) ? ASSISTENT.fragen.length :', 'const p = (pos == null) ? 0 :') }); V.spracheFuerProbeSetzen('de');
  assert.notDeepEqual(assistentMit(V, DREI), DREI);
});
test('[Ziehen · einfacher Weg] Ablegen auf eine Frage setzt davor oder dahinter; ein Baustein steht höchstens einmal', () => {
  const { V } = ladeGenerator(); V.spracheFuerProbeSetzen('de');
  assistentMit(V, DREI.slice(0, 2));
  V.assistentAblegen({ art: 'kat', idx: KAT(V, DREI[2]) }, { index: 1, karte: {}, vor: true });
  assert.deepEqual(V.ASSISTENT.fragen.map((f) => f.kat), [DREI[0], DREI[2], DREI[1]]);
  V.assistentKatHinzu(KAT(V, DREI[2]), null);
  assert.equal(V.ASSISTENT.fragen.length, 3, 'zweimal derselbe Baustein');
});
test('[Ziehen · einfacher Weg · Rot-Beweis] ohne die Stelle landet der Baustein am Ende; ohne die Prüfung entsteht ein Doppel', () => {
  const a = ladeGenerator({ html: ersetzt("if (d.art === 'kat') assistentKatHinzu(d.idx, z.karte ? z.index : null);", "if (d.art === 'kat') assistentKatHinzu(d.idx, null);") });
  a.V.spracheFuerProbeSetzen('de'); assistentMit(a.V, DREI.slice(0, 2));
  a.V.assistentAblegen({ art: 'kat', idx: KAT(a.V, DREI[2]) }, { index: 1, karte: {}, vor: true });
  assert.deepEqual(a.V.ASSISTENT.fragen.map((f) => f.kat), [DREI[0], DREI[1], DREI[2]]);
  const b = ladeGenerator({ html: ersetzt('if (da >= 0) { assistentMarkieren(da); return; }', '') });
  b.V.spracheFuerProbeSetzen('de'); assistentMit(b.V, [DREI[0], DREI[0]]);
  assert.equal(b.V.ASSISTENT.fragen.length, 2);
});
test('[Ziehen · einfacher Weg] eine Frage lässt sich verschieben; die Fragen werden Felder der Vorlage in genau dieser Folge', () => {
  const { V } = ladeGenerator(); V.spracheFuerProbeSetzen('de');
  assistentMit(V, DREI);
  V.assistentAblegen({ art: 'feld', i: 2 }, { index: 0, karte: {}, vor: true });
  assert.deepEqual(V.ASSISTENT.fragen.map((f) => f.kat), [DREI[2], DREI[0], DREI[1]]);
  const namen = nativ(V.assistentFelder()).map((f) => f.feldname);
  assert.deepEqual(namen, V.ASSISTENT.fragen.map((f) => V.assistentFrageName(f)));
});
test('[Ziehen · einfacher Weg · Rot-Beweis] ein Verschieben, das ans Ende hängt, fällt auf', () => {
  const { V } = ladeGenerator({ html: ersetzt('ASSISTENT.fragen.splice(ziel, 0, f); assistentZeigen(); assistentMarkieren(ziel);', 'ASSISTENT.fragen.push(f); assistentZeigen();') });
  V.spracheFuerProbeSetzen('de'); assistentMit(V, DREI);
  V.assistentAblegen({ art: 'feld', i: 2 }, { index: 0, karte: {}, vor: true });
  assert.notDeepEqual(V.ASSISTENT.fragen.map((f) => f.kat), [DREI[2], DREI[0], DREI[1]]);
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
  for (const t of ["'aria-label': L('Feld bearbeiten'", "'aria-label': L('Feld nach oben'", "'aria-label': L('Feld nach unten'", "'aria-label': L('Feld löschen'"]) assert.ok(q.includes(t), t);
  assert.ok(!/karte\.addEventListener\('click'/.test(q), 'ein Klick auf die Karte öffnet das Bearbeitungsblatt');
  assert.match(HTML, /#tpl-felder \.vk > \.vk-aktionen:not\(\.bk-aktionen\) \{ position: static; display: flex;/);
  assert.match(HTML, /#tpl-felder \.vk > \.vk-aktionen button\.mini \{ min-width: 48px; min-height: 48px;/);
});
test('[Ziehen · Karte · Rot-Beweis] das frühere Klick-Öffnen und ein Menü nur bei Hover fallen auf', () => {
  const alt = HTML.replace("    karte.addEventListener('keydown', (e) => {", "    karte.addEventListener('click', () => { if (!probierenAn) oeffneEditor(i); });\n    karte.addEventListener('keydown', (e) => {");
  assert.ok(/karte\.addEventListener\('click'/.test(KARTEN_QUELLE(alt)));
  const hover = HTML.replace('#tpl-felder .vk > .vk-aktionen:not(.bk-aktionen) { position: static; display: flex;', '#tpl-felder .vk > .vk-aktionen:not(.bk-aktionen) { position: static; display: none;');
  assert.ok(!/display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px;/.test(hover.split('#tpl-felder .vk > .vk-aktionen:not(.bk-aktionen)')[1].slice(0, 80)));
});
test('[Ziehen · Finger] Halten und Ziehen ist an Palette und Karten beider Wege gebunden', () => {
  assert.match(HTML, /const ZEIGER_HALTEN_MS = \d+;/);
  assert.match(HTML, /dndBinden\(\); dndZeigerBinden\(\); assistentDndBinden\(\);/);
  assert.match(HTML, /e\.pointerType !== 'touch'/);
  assert.match(HTML, /document\.addEventListener\('touchmove', \(e\) => \{ if \(st && st\.aktiv && e\.cancelable\) e\.preventDefault\(\); \}, \{ passive: false \}\);/);
});
test('[Ziehen · Finger · Rot-Beweis] eine nicht gebundene Fingerbedienung fällt auf', () => {
  const alt = ersetzt('dndBinden(); dndZeigerBinden(); assistentDndBinden();', 'dndBinden();');
  assert.ok(!/dndZeigerBinden\(\); assistentDndBinden\(\);/.test(alt));
});

/* ── (4) Wörter ─────────────────────────────────────────────────────────────────────────────────────────────── */
const WORTE = [
  ['Baustein vorschlagen', 'Suggest a building block'], ['Fehlt etwas?', 'Is something missing?'],
  ['Werte in der Liste', 'Values in the list'], ['+ Wert in der Liste', '+ Value in the list'],
  ['Für Fachleute: alle Einstellungen.', 'For specialists: all settings.'], ['Nach Themen ordnen', 'Sort by topic'],
];
const ALT = ['>Kennung vorschlagen<', '>Code-Werte<', '>+ Code-Wert<', 'Für IT-Fachleute: Bausteine', 'Nach Bereichen ordnen'];
const wortBefunde = (h) => WORTE.flat().filter((t) => !h.includes(t)).concat(ALT.filter((t) => h.includes(t)));
test('[Ziehen · Wörter] die neuen Wörter stehen deutsch und englisch, die alten sind fort', () => {
  assert.deepEqual(wortBefunde(HTML), []);
});
test('[Ziehen · Wörter · Rot-Beweis] ein altes Wort zurück fällt auf', () => {
  assert.ok(wortBefunde(ersetzt('>Werte in der Liste<', '>Code-Werte<')).includes('>Code-Werte<'));
});
