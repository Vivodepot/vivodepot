'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Kontrast-Rechnung, an einer gemessenen Stelle der Anwendung
   ────────────────────────────────────────────────────────────────────────
   DER ANLASS (28.07.2026). `tools/kampagne.js` hängt seit dem 27.07. als
   Wächter im `pre-push`. Seine Kontrast-Rechnung war zweifach falsch:

     · sie nahm die ersten drei Zahlengruppen einer Farbzeichenkette und
       verwarf das Alpha
     · sie brach die Vorfahrenkette beim ersten Hintergrund ab, der nicht
       exakt `rgba(0, 0, 0, 0)` war — ein halbdurchsichtiger Schleier galt
       damit als deckender Grund

   Beide Fehler zeigten in dieselbe Richtung: zu dunkle Hintergründe, zu
   niedrige Werte, gemeldete Funde, die keine sind.

   WARUM ES DIESE DATEI GIBT UND NICHT NUR DIE REPARATUR. Die Rechnung stand
   INNERHALB eines `seite.evaluate()`. Dort war sie nicht prüfbar — man kann
   ihr keinen Fall vorlegen, keine Positivkontrolle bauen, sie nicht rot
   machen. Sie ist deshalb nicht nur repariert, sondern nach
   `tools/lib/kontrast.js` umgezogen. Erst dadurch gibt es diese Prüfung.

   DER PRÜFVEKTOR IST GEMESSEN, NICHT ERFUNDEN. `tools/kontrast-messen.js`
   liest die echte Farbkette des Foto-Griffs im Bereich „Identität & Person"
   ab. Eine Zusicherung auf eine selbst gewählte Zahl bewiese sich selbst.

   UND DIE ALTE RECHNUNG BLEIBT ALS NEGATIVKONTROLLE. Eine Zusicherung „der
   Wert ist 5,5" allein ist von einer, die jede Zahl bestätigt, nicht zu
   unterscheiden. Erst der Nachweis, dass dieselbe Stelle unter der alten
   Rechnung 1,66 ergibt, zeigt: der Unterschied hängt an der Reparatur und
   nicht an der Messstelle. Ohne sie wäre die Reparatur eine Zusage ohne
   Deckung.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const K = require('../tools/lib/kontrast.js');

/* ── Der gemessene Prüfvektor ──────────────────────────────────────────────
   Foto-Griff, Bereich „Identität & Person", 390 px, helles Theme.
   Abgelesen am 28.07.2026 mit `node tools/kontrast-messen.js --alt 1.66`.

   Die Kette ist die VOLLE Vorfahrenkette. Bemerkenswert ist Position 5: eine
   deckende Karte. Alles dahinter — auch der Seitengrund [7] — kommt beim
   Malen nie zum Vorschein, und darum darf es auch beim Rechnen nicht. */
const FOTO_GRIFF = {
  text: 'Foto',
  farbe: 'rgb(118, 92, 48)',
  schriftgroesse: 10,
  kette: [
    'rgba(0, 0, 0, 0)',            // [0] das <span> selbst
    'rgba(35, 71, 49, 0.06)',      // [1] der Schleier — hier brach die alte Rechnung ab
    'rgba(0, 0, 0, 0)',            // [2]
    'rgba(0, 0, 0, 0)',            // [3]
    'rgba(0, 0, 0, 0)',            // [4]
    'rgb(253, 251, 247)',          // [5] die deckende Karte — hier ist Schluss
    'rgba(0, 0, 0, 0)',            // [6]
    'rgb(246, 245, 241)',          // [7] Seitengrund, vom Deckenden verdeckt
    'rgba(0, 0, 0, 0)',            // [8]
  ],
};

/* ── 1 · DIE ZUSICHERUNG ───────────────────────────────────────────────── */

test('[Kontrast] der Foto-Griff besteht — 5,5 gegen die deckende Karte', () => {
  const r = K.kontrast(FOTO_GRIFF.farbe, FOTO_GRIFF.kette);
  assert.equal(r.wert, 5.5,
    'Der Schleier rgba(35,71,49,0.06) wird über die deckende Karte rgb(253,251,247) gelegt. ' +
    'Weicht diese Zahl ab, hat sich entweder die Komposition geändert oder die Stelle in der App.');
  assert.equal(r.gedeckt, true,
    'die Kette erreicht einen deckenden Grund — sonst wäre gegen angenommenes Weiß gerechnet');
  assert.ok(r.wert >= 4.5, 'die Stelle BESTEHT WCAG AA — sie war nie ein Fund');
});

/* ── 2 · DIE NEGATIVKONTROLLE ──────────────────────────────────────────── */

test('[Kontrast·Negativkontrolle] dieselbe Stelle ergibt unter der ALTEN Rechnung 1,66', () => {
  const alt = K.kontrastAlt(FOTO_GRIFF.farbe, K.ersterNichtTransparenter(FOTO_GRIFF.kette));
  assert.equal(alt, 1.66,
    'Ohne diesen Nachweis wäre die Reparatur eine Zusage ohne Deckung: erst der Abstand ' +
    'zwischen 1,66 und 5,5 zeigt, dass der Unterschied an der Rechnung hängt und nicht an der Stelle.');
  assert.ok(alt < 4.5, 'die alte Rechnung meldete hier einen Fund, den es nicht gab');
});

test('[Kontrast·Negativkontrolle] die alte Rechnung verwirft das Alpha nachweislich', () => {
  // Derselbe Schleier, einmal mit und einmal ohne Alpha — die alte Rechnung
  // sieht keinen Unterschied. Das IST der Fehler, nicht seine Folge.
  const a = K.kontrastAlt('rgb(255, 255, 255)', 'rgba(35, 71, 49, 0.06)');
  const b = K.kontrastAlt('rgb(255, 255, 255)', 'rgb(35, 71, 49)');
  assert.equal(a, b, 'die alte Rechnung behandelt 6 % Deckung wie volle Deckung');
  const neuA = K.kontrast('rgb(255, 255, 255)', ['rgba(35, 71, 49, 0.06)']).wert;
  const neuB = K.kontrast('rgb(255, 255, 255)', ['rgb(35, 71, 49)']).wert;
  assert.notEqual(neuA, neuB, 'die neue Rechnung unterscheidet sie — sonst wäre nichts repariert');
});

/* ── 3 · DIE KOMPOSITION SELBST ────────────────────────────────────────── */

test('[Kontrast] die Kette hält beim ersten DECKENDEN Grund an', () => {
  // Hinter der deckenden Karte liegt tiefschwarz. Käme es zur Geltung, wäre
  // der Wert ein völlig anderer — es darf nicht.
  const mitSchwarzDahinter = K.kontrast(FOTO_GRIFF.farbe,
    [...FOTO_GRIFF.kette, 'rgb(0, 0, 0)']).wert;
  assert.equal(mitSchwarzDahinter, 5.5,
    'was hinter einem deckenden Grund liegt, malt der Browser nicht — und rechnet er nicht');
});

test('[Kontrast] ohne deckenden Grund wird gegen Weiß komponiert und das gesagt', () => {
  const r = K.kontrast('rgb(0, 0, 0)', ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)']);
  assert.equal(r.wert, 21, 'Schwarz auf Weiß ist der Höchstwert');
  assert.equal(r.gedeckt, false, 'und der Bericht sagt, dass der Grund angenommen wurde');
});

test('[Kontrast] halbdurchsichtiger TEXT wird ebenfalls komponiert', () => {
  const deckend = K.kontrast('rgb(0, 0, 0)', ['rgb(255, 255, 255)']).wert;
  const halb = K.kontrast('rgba(0, 0, 0, 0.5)', ['rgb(255, 255, 255)']).wert;
  assert.ok(halb < deckend,
    'halbdurchsichtige Schrift auf hellem Grund ist heller, nicht gleich dunkel — ' +
    'die alte Rechnung hätte beide gleich bewertet');
});

test('[Kontrast·Negativkontrolle] gleiche Farbe auf gleicher Farbe ergibt 1', () => {
  assert.equal(K.kontrast('rgb(120, 120, 120)', ['rgb(120, 120, 120)']).wert, 1,
    'sonst wäre die Rechnung von einer, die immer hohe Werte liefert, nicht zu unterscheiden');
});

test('[Kontrast] eine nicht deutbare Farbe liefert null, nicht still eine Zahl', () => {
  assert.equal(K.parseFarbe('linear-gradient(red, blue)'), null);
  assert.equal(K.kontrast('linear-gradient(red, blue)', ['rgb(255,255,255)']), null,
    'Verläufe werden nicht stillschweigend als durchsichtig behandelt — wer sie braucht, merkt es');
});
