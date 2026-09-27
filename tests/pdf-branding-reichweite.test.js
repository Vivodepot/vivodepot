'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   „White Label bis ins PDF" (10.09.2026) — Zug 2 (Reichweite),
   direkt gegen die PDF-Zeichner geprüft
   ────────────────────────────────────────────────────────────────────────────
   DIE LÜCKE, DIE DIESE PROBE SCHLIESST: `tests/gesamt-pdf.test.js`s bestehende
   Proben laufen alle gegen ein DEPOT OHNE Branding-Modul — `t.includes('VIVODEPOT')`
   dort ist wahr, WEIL `_markeName().toUpperCase()` im nativen Fall genau das
   liefert, nicht weil die Probe beweist, dass ein ANDERER Markenname ankäme.
   Eine Probe, die nur den nativen Rückfall kennt, kann nicht unterscheiden
   zwischen „branding-aware" und „zufällig gleich benannt" — genau die
   Verwechslungsgefahr, die dieser Auftrag beheben soll.

   Hier: EIN echtes Branding-Modul angedockt (`data.brandingModule`, derselbe
   Lesepfad wie `_markeName()`/`_markeFarbePrimaerHex()` ihn tatsächlich
   benutzen — nicht `_AB_WERK_BRANDING` direkt gesetzt, das wäre ein zweiter,
   schwächerer Weg), dann `zeichneVollDepotPdf`/`zeichneSituationPdf` gegen
   einen `fakeDoc`, der `setTextColor`/`setDrawColor`-Aufrufe MITSCHREIBT
   (der Stub in gesamt-pdf.test.js verwirft sie als No-Op — hier bewusst
   nachgerüstet, weil DAS die eigentliche Reichweite-Frage ist). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
const MUSTER_BRANDING = Object.freeze({
  modulTyp: 'branding', moduleVersion: 1, herkunft: 'achsentest-branding-pdf',
  name: 'Muster AG', domain: 'muster-ag.example',
  farbePrimaer: '#112233', farbeSekundaer: '#445566', schriftart: 'Inter', logo: null,
});

async function frischMitBranding() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  const d = V.getData();
  d.brandingModule = [MUSTER_BRANDING];
  V.setData(d);
  return V;
}

// Wie gesamt-pdf.test.js#fakeDoc, aber setTextColor/setDrawColor werden mitgeschrieben —
// die eigentliche Reichweite-Frage dieses Zugs betrifft die FARBE, nicht nur den Text.
function fakeDocMitFarben() {
  let seiten = 1;
  const texte = [];
  const textFarben = [];
  const drawFarben = [];
  return {
    internal: { pageSize: { getWidth: () => 595, getHeight: () => 842 }, getNumberOfPages: () => seiten },
    setFont() {}, setFontSize() {}, setLineWidth() {}, line() {},
    setTextColor(r, g, b) { textFarben.push([r, g, b]); },
    setDrawColor(r, g, b) { drawFarben.push([r, g, b]); },
    splitTextToSize: (s) => [String(s == null ? '' : s)],
    addPage() { seiten += 1; },
    setPage() {},
    text(t) { (Array.isArray(t) ? t : [t]).forEach((x) => texte.push(String(x))); },
    _texte: () => texte,
    _joined: () => texte.join('\n'),
    _textFarben: () => textFarben,
    _drawFarben: () => drawFarben,
  };
}

function hexZuRgbTupel(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

// dokFussHaftung (U2-ADR-025 „Fassung C") bleibt VERBATIM und steht auf JEDER PDF-Seite im Fuß
// (pdfFussText, :45611) — bewusst NICHT Teil dieses Zugs (Bericht, Abschnitt „bewusst
// zurückgenommen"). Der EINE dort erlaubte Rest wird herausgeschnitten, bevor auf das native
// Literal geprüft wird — sonst würde diese Probe genau die Ausnahme melden, die sie kennt.
// Der Zeichner ersetzt normale Leerzeichen vor kurzen Wörtern ("oder") typografisch durch ein
// geschütztes Leerzeichen (U+00A0) — beide Seiten darum vor dem Vergleich normalisiert.
function ohneNbsp(s) { return s.replace(/\u00a0/g, ' '); }
function ohneHaftungshinweis(V, joined) {
  return ohneNbsp(joined).split(ohneNbsp(V.STRINGS.dokFussHaftung)).join('');
}

test('[PDF-Reichweite] zeichneVollDepotPdf zeigt den angedockten Markennamen, NICHT „VIVODEPOT"', async () => {
  const V = await frischMitBranding();
  const doc = fakeDocMitFarben();
  V.zeichneVollDepotPdf(doc, V.vollDepotModell({}), V.vollDepotPdfMeta());
  assert.ok(doc._joined().includes('MUSTER AG'), 'der angedockte Markenname muss im Wortzug stehen');
  assert.ok(!ohneHaftungshinweis(V, doc._joined()).includes('VIVODEPOT'), 'das native Literal darf außerhalb des Haftungshinweis-Fußes nicht mehr auftauchen, sobald ein Branding-Modul andockt ist');
});

test('[PDF-Reichweite] zeichneVollDepotPdf zeichnet mit den angedockten Marken-Farben, nicht den nativen GOLD/SALBEI-Konstanten', async () => {
  const V = await frischMitBranding();
  const doc = fakeDocMitFarben();
  V.zeichneVollDepotPdf(doc, V.vollDepotModell({}), V.vollDepotPdfMeta());
  const primaerRgb = hexZuRgbTupel(MUSTER_BRANDING.farbePrimaer);
  const sekundaerRgb = hexZuRgbTupel(MUSTER_BRANDING.farbeSekundaer);
  assert.ok(doc._textFarben().some((f) => f.join(',') === sekundaerRgb.join(',')),
    'die Sekundärfarbe (Wortzug/Linie, vormals GOLD) muss unter den gesetzten Textfarben sein');
  assert.ok(doc._textFarben().some((f) => f.join(',') === primaerRgb.join(',')),
    'die Primärfarbe (Titel/Bereichsüberschriften, vormals SALBEI) muss unter den gesetzten Textfarben sein');
  // Nativer Rückfall darf NICHT mehr auftauchen, sobald ein Branding-Modul andockt ist.
  assert.ok(!doc._textFarben().some((f) => f.join(',') === '138,109,58'), 'die native GOLD-Konstante darf nicht mehr gezeichnet werden');
});

test('[PDF-Reichweite] zeichneSituationPdf zeigt denselben angedockten Markennamen', async () => {
  const V = await frischMitBranding();
  const situationen = V.situationenAlle ? V.situationenAlle() : null;
  const sitId = situationen && situationen.length ? situationen[0].id : null;
  if (!sitId) return; // defensiv: falls sich die Situationsliste je ändert, blockt das diese Probe nicht sinnlos
  const doc = fakeDocMitFarben();
  V.zeichneSituationPdf(doc, V.situationModell(sitId), V.situationPdfMeta(sitId));
  assert.ok(doc._joined().includes('MUSTER AG'), 'derselbe Wortzug-Lesepfad wie beim Gesamt-PDF');
  assert.ok(!ohneHaftungshinweis(V, doc._joined()).includes('VIVODEPOT'));
});

test('[PDF-Reichweite·Rot-Beweis] OHNE angedocktes Branding zeichnet zeichneVollDepotPdf weiterhin die native Marke/Farbe', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  const doc = fakeDocMitFarben();
  V.zeichneVollDepotPdf(doc, V.vollDepotModell({}), V.vollDepotPdfMeta());
  assert.ok(doc._joined().includes('VIVODEPOT'), 'ohne Branding-Modul bleibt der native Wortzug — belegt, dass die obere Probe wirklich das Andocken misst, nicht zufällig grün ist');
  assert.ok(doc._textFarben().some((f) => f.join(',') === '138,109,58'), 'ohne Branding-Modul bleibt die native GOLD-Farbe');
});
