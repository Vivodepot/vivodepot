'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Kontrast — Farben komponieren, bevor man sie vergleicht
   ────────────────────────────────────────────────────────────────────────────
   DER BEFUND (28.07.2026). Die Kontrast-Rechnung der Kampagne hatte zwei
   Fehler, und beide zeigten in dieselbe Richtung: zu dunkle Hintergründe,
   also zu niedrige Kontraste, also gemeldete Funde, die keine sind — und
   daneben echte, die im Rauschen untergehen.

     1 · `num()` nahm die ersten drei Zahlengruppen einer Farbzeichenkette und
         VERWARF DAS ALPHA. Aus `rgba(0, 0, 0, 0.5)` wurde reines Schwarz.
         Nebenwirkung, die niemand sieht: `rgba(0, 0, 0, 0.5)` liefert die
         Ziffernfolge 0,0,0,0,5 — die ersten drei sind zufällig richtig, bei
         `rgba(255, 255, 255, 0.5)` wären es 255,255,255. Die Rechnung ist also
         nicht offensichtlich kaputt, sie ist LEISE kaputt.

     2 · Die Vorfahrenkette brach beim ERSTEN Hintergrund ab, der nicht exakt
         `rgba(0, 0, 0, 0)` war. Ein halbdurchsichtiger Schleier galt damit als
         deckender Grund, und was darunter lag, kam nie zur Sprache.

   Zusammen ergaben sie am Foto-Griff des Deckblatts einen Kontrast von 1,66 —
   und zwar in allen neun Theme-Skalen-Kombinationen gleich, weil das verworfene
   Alpha den Unterschied zwischen ihnen einebnete.

   KORREKT KOMPONIERT IST ES KEINE EINZIGE ZAHL, sondern drei: hell 5,5 ·
   high-contrast 5,68 · dark-mode 2,72. In zwei von drei Themes wird aus einem
   Durchfall ein Bestehen, im Nachtmodus bleibt es ein Fund.

   Diese Zeile stand bis zum 28.07. auf „5,23" — der Zahl aus einer Handprobe,
   die vor der Messung entstand. Ein Kommentar, der etwas anderes behauptet als
   die Pruefung neben ihm, ist die Fehlerklasse dieser Datei in Reinform: eine
   Zahl ohne die Bedingung, unter der sie gilt.

   WAS HIER GERECHNET WIRD. Source-over, wie der Browser malt: die vordere
   Farbe über die hintere, bis ein deckender Grund erreicht ist. Ist die Kette
   zu Ende und immer noch nichts deckend, wird gegen den Seitengrund komponiert
   (Weiß, sofern nicht anders übergeben) — das ist die Annahme, die der Browser
   auch trifft.

   WAS HIER NICHT GERECHNET WIRD, ausdrücklich: Verläufe, Bilder und
   `backdrop-filter`. Sie kommen als Hintergrund nicht vor, und eine Rechnung,
   die sie stillschweigend als durchsichtig behandelte, wäre wieder eine, die
   leise falsch ist. Wer sie braucht, erweitert `parseFarbe` — und merkt es,
   weil sie `null` liefert.
   ════════════════════════════════════════════════════════════════════════════ */

/** `rgb(…)`, `rgba(…)`, `transparent` → {r,g,b,a}. Alles andere → null. */
function parseFarbe(s) {
  if (s == null) return null;
  const t = String(s).trim();
  if (t === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  const m = t.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i);
  if (!m) return null;
  let a = 1;
  if (m[4] != null) a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  return { r: +m[1], g: +m[2], b: +m[3], a: Number.isFinite(a) ? a : 1 };
}

/** Source-over: `vorne` über `hinten`. Die Formel, mit der der Browser malt. */
function ueber(vorne, hinten) {
  const aA = vorne.a, aB = hinten.a;
  const aOut = aA + aB * (1 - aA);
  if (aOut === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const k = (cA, cB) => (cA * aA + cB * aB * (1 - aA)) / aOut;
  return { r: k(vorne.r, hinten.r), g: k(vorne.g, hinten.g), b: k(vorne.b, hinten.b), a: aOut };
}

/**
 * Eine Kette von Hintergründen — VORDERSTER ZUERST, so wie sie vom Element
 * aufwärts eingesammelt wird — zu einer deckenden Farbe zusammenlegen.
 * Bricht ab, sobald Deckung erreicht ist; sonst gegen `grund`.
 */
function komponiereKette(kette, grund = { r: 255, g: 255, b: 255, a: 1 }) {
  let aus = { r: 0, g: 0, b: 0, a: 0 };
  for (const roh of kette) {
    const f = typeof roh === 'string' ? parseFarbe(roh) : roh;
    if (!f || f.a === 0) continue;
    aus = ueber(aus, f);
    if (aus.a >= 1) return { ...aus, a: 1, gedeckt: true };
  }
  aus = ueber(aus, grund);
  return { ...aus, a: 1, gedeckt: false };
}

function relativeLeuchtdichte({ r, g, b }) {
  const k = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * k(r) + 0.7152 * k(g) + 0.0722 * k(b);
}

function verhaeltnis(a, b) {
  const la = relativeLeuchtdichte(a), lb = relativeLeuchtdichte(b);
  return +((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)).toFixed(2);
}

/**
 * Der ganze Weg: Textfarbe und die Hintergrundkette, wie sie im Browser
 * abgelesen wurden. Auch die TEXTFARBE wird komponiert — halbdurchsichtiger
 * Text über hellem Grund ist heller, nicht gleich dunkel.
 */
function kontrast(textfarbe, hintergrundKette, grund) {
  const hinten = komponiereKette(hintergrundKette, grund);
  const vorneRoh = typeof textfarbe === 'string' ? parseFarbe(textfarbe) : textfarbe;
  if (!vorneRoh) return null;
  const vorne = vorneRoh.a >= 1 ? vorneRoh : ueber(vorneRoh, hinten);
  return { wert: verhaeltnis(vorne, hinten), vorne, hinten, gedeckt: hinten.gedeckt };
}

/* ── Die alte, fehlerhafte Rechnung ───────────────────────────────────────
   Sie bleibt hier stehen, und zwar nicht aus Nostalgie: ohne sie liesse sich
   die Reparatur nicht absichtlich rot machen. Eine Zusicherung „5,5" allein
   ist von einer, die jede Zahl bestätigt, nicht zu unterscheiden — erst der
   Nachweis, dass die alte Rechnung 1,66 liefert und die neue 5,5 (helles Theme),
   zeigt, dass der Unterschied AN DER REPARATUR hängt und nicht an der Messstelle. */
function kontrastAlt(textfarbe, ersterNichtTransparenterHintergrund) {
  const num = (x) => (String(x).match(/\d+/g) || []).slice(0, 3).map(Number);
  const v = num(textfarbe), h = num(ersterNichtTransparenterHintergrund);
  if (v.length < 3 || h.length < 3) return null;
  return verhaeltnis({ r: v[0], g: v[1], b: v[2] }, { r: h[0], g: h[1], b: h[2] });
}

/** Was die alte Kette genommen hätte: der erste Hintergrund ungleich `rgba(0, 0, 0, 0)`. */
function ersterNichtTransparenter(kette) {
  for (const s of kette) if (s && String(s).trim() !== 'rgba(0, 0, 0, 0)') return s;
  return null;
}

module.exports = {
  parseFarbe, ueber, komponiereKette, relativeLeuchtdichte, verhaeltnis,
  kontrast, kontrastAlt, ersterNichtTransparenter,
};
