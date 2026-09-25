'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Erhebungsregel für Trefferflächen misst, was sie messen soll
   ────────────────────────────────────────────────────────────────────────
   WOZU SIE DA IST. `tools/lib/trefferflaechen.js` trägt seit A5 die Eingrenzung
   für ZWEI Gegenstände: die Prüfung von Fixliste Nr. 6 und die Abnahme-Ebene 4b
   der Kampagne. Beide melden im Regelfall NULL Funde — und eine Null ist ohne
   diese Prüfung von „ich habe nichts angesehen" nicht zu unterscheiden.

   Genau diese Verwechslung ist am 28.07.2026 einmal passiert: die Ausleseregel
   von Ebene 4 liess jeden Knopf MIT SYMBOL aus (`children.length` als
   Ausschluss), meldete darüber aber nicht „anderer Wert", sondern GAR NICHTS.
   Nr. 4 wäre grün abgenommen worden, ohne dass ihr Gegenstand gemessen war.

   SIE IST ROTMACHBAR, an drei verschiedenen Zeilen der Regel:
   · fällt die Fliesstext-Ausnahme weg, wird 3 rot;
   · wird sie auf jeden `<a>` ausgeweitet, wird 4 rot;
   · wächst `ECHT` auf alles mit `cursor:pointer`, wird 5 rot — das ist die
     Rohzahl 1308, von der 1116 SVG-Knoten in Knöpfen sind.
   Alle drei am 28.07. gefahren.

   KEINE DATEI IM ARBEITSBAUM. Der Prüfling kommt über `setContent` in die Seite,
   wie bei der Ausleseregel nebenan. Was nie auf die Platte kommt, kann dort
   nicht liegenbleiben.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { erheben, PFLICHT_PX } = require(path.join(__dirname, '..', '..', 'tools', 'lib', 'trefferflaechen.js'));

/* Ein Prüfling, der jeden Fall der Eingrenzung genau einmal enthält.
   Die beiden Links unterscheiden sich NUR in `display` — inline gegen block —,
   damit die Ausnahme an ihrer eigenen Bedingung hängt und nicht am Zufall des
   umgebenden Textes. Beide stehen in einem Absatz, der mehr Text trägt als sie. */
const SEITE = `
  <style>
    body { margin: 0; font: 12px/1.25 sans-serif; }
    select { height: 21px; width: 200px; }          /* der Nr.-6-Fall: neunmal 21 px */
    .block-schmal { display: block; height: 18px; width: 200px; }  /* der B12-Fall: 18,6 px */
    /* cursor:pointer gehört zum Prüfling, nicht zur Zier: die 1116 SVG-Knoten
       der Rohzahl waren genau die, die ihn von ihrem Knopf GEERBT haben. Ohne
       ihn prüfte Fall 5 eine Lage, die es in der Anwendung nicht gibt. */
    .gross { display: block; height: 40px; width: 120px; cursor: pointer; }
    .weg { display: none; }
    /* Der Equivalent-Target-Fall (WCAG 2.5.8, zweite Ausnahme): ein natives
       Kästchen bleibt klein, aber sein umschliessendes Label trägt die
       Trefferfläche. .etikett-passend erreicht 24 px, .etikett-zuklein
       nicht — beide mit demselben Kästchen darin, damit die Grösse des
       LABELS die einzige Variable ist. */
    .etikett-passend { display: flex; min-height: 24px; width: 200px; cursor: pointer; }
    .etikett-zuklein { display: flex; min-height: 10px; width: 200px; cursor: pointer; }
  </style>
  <p>Ein längerer Absatz mit <a href="#" id="im-text">einem Link mittendrin</a> und noch mehr Text danach.</p>
  <p>Vorspann mit reichlich Text und <a href="#" id="eigene-zeile" class="block-schmal">Link auf eigener Zeile</a> plus Nachspann.</p>
  <p>Quelle:<br><a href="#" id="allein-nach-umbruch">Link allein auf seiner Zeile</a></p>
  <button id="mit-symbol" class="gross"><svg width="8" height="8"><circle cx="4" cy="4" r="3"></circle></svg>Knopf mit Symbol</button>
  <select id="zu-flach"><option>eins</option></select>
  <input type="hidden" id="verstecktes-feld">
  <a id="ohne-ziel">kein href</a>
  <button id="unsichtbar" class="weg">weg</button>
  <label class="etikett-passend"><input type="checkbox" class="kaestchen-passend">Kästchen mit ausreichendem Etikett</label>
  <label class="etikett-zuklein"><input type="checkbox" class="kaestchen-zuklein">Kästchen mit zu kleinem Etikett</label>
`;

async function erhebung() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const seite = await browser.newPage({ viewport: { width: 390, height: 900 } });
    await seite.setContent(SEITE);
    return await seite.evaluate(erheben, { mindest: PFLICHT_PX, raum: 'body *' });
  } finally { await browser.close(); }
}

let ergebnis = null;
const einmal = async () => (ergebnis ||= await erhebung());
const stellen = (liste) => liste.map((f) => f.stelle);

/* ── 1 · DIE SCHWELLE IST DIE DER NORM ────────────────────────────────── */

test('[Trefferflächen] die Pflichtgrösse ist 24 px — WCAG 2.5.8 AA, nicht 2.5.5 AAA', () => {
  assert.equal(PFLICHT_PX, 24,
    '44 px waere 2.5.5 AAA und bindet nicht; wer die Zahl hebt, hebt eine Design-Entscheidung ' +
    'in den Rang einer Reparatur. Wer sie senkt, unterschreitet die Norm.');
});

/* ── 2 · DIE KERNFÄLLE — beide reparierten Klassen aus Nr. 6 und B12 ──── */

test('[Trefferflächen] ein <select> von 21 px wird gefunden', { timeout: 120000 }, async () => {
  const r = await einmal();
  assert.equal(stellen(r.zuKlein).includes('select'), true,
    'das ist der Fall, den Fixliste Nr. 6 neunmal trug. Gefunden wurde: ' + JSON.stringify(stellen(r.zuKlein)));
});

test('[Trefferflächen] ein Link auf EIGENER Zeile wird gefunden, obwohl Text ihn umgibt',
  { timeout: 120000 }, async () => {
    const r = await einmal();
    assert.equal(stellen(r.zuKlein).includes('a.block-schmal'), true,
      'der B12-Fall: die drei Fusszeilen-Links rendern `display: block`, jeder auf eigener Zeile. ' +
      'Die Inline-Ausnahme gilt fuer Ziele, deren Groesse durch die Zeilenhoehe umgebenden Textes ' +
      'bedingt ist — hier ist keiner. Gefunden wurde: ' + JSON.stringify(stellen(r.zuKlein)));
  });

/* ── 3 · DIE AUSNAHME GILT — und sie wird GEZÄHLT ─────────────────────── */

test('[Trefferflächen] ein Link IM FLIESSTEXT bleibt aussen vor — steht aber in `ausgenommen`',
  { timeout: 120000 }, async () => {
    const r = await einmal();
    /* Am TEXT geprüft, nicht an `stelle`: seit A14 stehen zwei klassenlose `<a>`
       im Prüfling, und beide heissen `a`. Eine Zusicherung, die den einen meint
       und den anderen trifft, ist keine. */
    const texte = (l) => l.map((f) => f.text);
    assert.equal(texte(r.zuKlein).includes('einem Link mittendrin'), false,
      'WCAG 2.5.8 nimmt Links im Fliesstext aus. Sie hier mitzuzaehlen hiesse, die Norm strenger ' +
      'zu lesen, als sie ist, und den Fliesstext auseinanderzureissen.');
    assert.equal(texte(r.ausgenommen).includes('einem Link mittendrin'), true,
      'Eine Ausnahme, die niemand zaehlt, ist eine Behauptung. Wuechse sie still, saenke die ' +
      'Fundzahl — und ein besserer Stand und ein weicheres Kriterium saehen gleich aus.');
  });

/* ── 3b · DIE ZWEITE AUSNAHME DER NORM: „equivalent target" ──────────────
   WCAG 2.5.8 nimmt auch das Ziel aus, das ein gleichwertiges, ausreichend
   grosses Bedienelement daneben hat. Bei einem Kästchen ist das umschliessende
   Label das gleichwertige Element — klickt man es an, wirkt es wie ein Klick
   auf das Kästchen selbst. */

test('[Trefferflächen] ein Kästchen mit ausreichendem Etikett bleibt aussen vor — steht aber in `ausgenommen`',
  { timeout: 120000 }, async () => {
    const r = await einmal();
    const klassen = (l) => l.map((f) => f.klasse);
    assert.equal(klassen(r.zuKlein).includes('kaestchen-passend'), false,
      'das Etikett traegt die Trefferflaeche, das Kaestchen selbst muss es nicht.');
    assert.equal(klassen(r.ausgenommen).includes('kaestchen-passend'), true,
      'auch diese Ausnahme wird gezaehlt, sonst waere sie eine Behauptung wie die Fliesstext-Ausnahme.');
  });

/* ── 4 · NEGATIVKONTROLLE: die Ausnahme ist kein Scheunentor ──────────── */

test('[Trefferflächen·Negativkontrolle] ein Kästchen mit zu kleinem Etikett bleibt ein Fund',
  { timeout: 120000 }, async () => {
    const r = await einmal();
    const klassen = (l) => l.map((f) => f.klasse);
    assert.equal(klassen(r.zuKlein).includes('kaestchen-zuklein'), true,
      'die Ausnahme greift NUR, wenn sie wirklich greift — ein Label unter 24 px traegt keine Trefferflaeche.');
    assert.equal(klassen(r.ausgenommen).includes('kaestchen-zuklein'), false,
      'ein zu kleines Etikett darf das Kaestchen nicht durchwinken.');
  });

test('[Trefferflächen·Negativkontrolle] die Ausnahme greift NUR bei inline gesetzten Links',
  { timeout: 120000 }, async () => {
    const r = await einmal();
    assert.equal(stellen(r.ausgenommen).includes('a.block-schmal'), false,
      'Der Block-Link steht im selben Absatz wie der Inline-Link und traegt weniger Text als sein ' +
      'Elternknoten — er erfuellt also JEDE Bedingung der Ausnahme ausser `display: inline`. ' +
      'Faellt diese Bedingung, verschwindet der ganze B12-Posten aus der Erhebung.');
  });

/* ── 4b · DAS LOCH, das die alte Bedingung hatte (A14, 28.07.2026) ────────
   WCAG 2.5.8 nimmt inline gesetzte Ziele aus, wenn ihre Grösse „durch die
   Zeilenhöhe von Nicht-Ziel-Text bedingt" ist. Ein Link ALLEIN auf seiner Zeile
   ist von nichts bedingt — auch dann nicht, wenn sein Elternknoten anderswo mehr
   Text trägt. Genau das erfüllte die alte Bedingung („Eltern hat mehr Text") und
   liess ihn still durchgehen.

   Der Prüfling stellt den Fall exakt her: `Quelle:<br><a>…</a>` — Elterntext
   länger, `display: inline`, und trotzdem teilt der Link seine Zeile mit
   niemandem. Er MUSS ein Fund sein. */

test('[Trefferflächen·Negativkontrolle] ein Link allein auf seiner Zeile ist NICHT ausgenommen',
  { timeout: 120000 }, async () => {
    const r = await einmal();
    const texte = (l) => l.map((f) => f.text);
    assert.equal(texte(r.ausgenommen).includes('Link allein auf seiner Zeile'), false,
      'Er erfuellt JEDE Bedingung der alten Fassung — inline, Elterntext laenger — und ist von ' +
      'keiner Zeilenhoehe bedingt. Bis A14 rutschte er durch.');
    assert.equal(texte(r.zuKlein).includes('Link allein auf seiner Zeile'), true,
      'und er gehoert in die Funde, nicht bloss aus der Ausnahme heraus');
  });

/* ── 5 · NEGATIVKONTROLLE: die Eingrenzung bleibt eng ─────────────────── */

test('[Trefferflächen·Negativkontrolle] das SVG IM Knopf ist keine Trefferfläche',
  { timeout: 120000 }, async () => {
    const r = await einmal();
    assert.equal(stellen(r.zuKlein).some((s) => /^(svg|circle|path)/.test(s)), false,
      '1116 der 1308 Rohtreffer waren SVG-Knoten INNERHALB von Knoepfen, die `cursor:pointer` erben. ' +
      'Der Knopf ist gross genug, sein Symbol ist es nie. Wer an der Rohzahl repariert, repariert ' +
      'Dekoration. Gefunden wurde: ' + JSON.stringify(stellen(r.zuKlein)));
    assert.equal(stellen(r.zuKlein).includes('button.gross'), false,
      'der Knopf selbst ist 120x40 und darf nicht auffallen');
  });

test('[Trefferflächen·Negativkontrolle] versteckte Felder, Links ohne Ziel und Unsichtbares zählen nicht mit',
  { timeout: 120000 }, async () => {
    const r = await einmal();
    const alle = [...stellen(r.zuKlein), ...stellen(r.ausgenommen)];
    assert.equal(alle.includes('input'), false, '`input[type=hidden]` hat keine Flaeche und keine Bedienung');
    assert.equal(alle.includes('button'), false, '`display:none` wird nicht gerendert und nicht gemessen');
    assert.equal(r.ausgenommen.some((f) => f.text === 'kein href'), false,
      'ein `<a>` OHNE href ist kein Ziel — er steht in keiner der beiden Listen');
  });

/* ── 6 · DER NENNER, ohne den jede Null bedeutungslos ist ─────────────── */

test('[Trefferflächen] die Erhebung nennt ihren Nenner — und er ist kleiner als das Gesehene',
  { timeout: 120000 }, async () => {
    const r = await einmal();
    assert.equal(r.bedienelemente > 0, true,
      'Ohne diese Zahl ist „null zu kleine Ziele" von „ich habe nichts angesehen" nicht zu ' +
      'unterscheiden. Ebene 4b macht ihre Vollstaendigkeit je Breite genau davon abhaengig.');
    assert.equal(r.gesehen > r.bedienelemente, true,
      'die Eingrenzung IST die Regel: von 1308 sichtbaren Knoten bleiben 195 echte Bedienelemente. ' +
      `Hier: gesehen ${r.gesehen}, Bedienelemente ${r.bedienelemente}.`);
    assert.equal(r.bedienelemente, 5,
      'genau fuenf: der Knopf mit Symbol, das <select>, der Block-Link, der Link allein auf seiner ' +
      'Zeile (seit A14) und das Kaestchen mit zu kleinem Etikett (seit der Equivalent-Target-Ausnahme). ' +
      'Weder der Fliesstext-Link noch das Kaestchen mit ausreichendem Etikett zaehlen mit: beide sind ' +
      'ausgenommen, bevor der Nenner hochzaehlt, und stuenden sie darin, waere der Nenner ein anderer ' +
      `als die Menge, aus der die Funde kommen. Gezaehlt: ${r.bedienelemente}.`);
  });

/* ── 7 · DER TRICHTER — jeder Ausnahmegrund zählt, und die Summe geht auf ──
   A10, 28.07.2026. Bis dahin nannte die Erhebung EINEN ihrer drei Gründe. Ein
   Ausnahmegrund ohne Zähler ist der Ort, an dem Funde verschwinden, ohne dass
   die Fundzahl es sagt.

   ROTMACHBAR an jedem einzelnen `continue`: wer einen Grund überspringt, ohne
   ihn zu zählen, bricht die Summe — und die Ebene macht ihre Breite davon
   abhängig, nicht nur diese Prüfung. */

test('[Trefferflächen] jeder Ausnahmegrund ist gezählt — der Trichter geht auf',
  { timeout: 120000 }, async () => {
    const r = await einmal();
    assert.equal(r.betrachtet, r.ausnahmen.unsichtbar + r.gesehen,
      'erste Stufe: alles Betrachtete ist entweder unsichtbar oder gesehen. ' +
      `Betrachtet ${r.betrachtet}, unsichtbar ${r.ausnahmen.unsichtbar}, gesehen ${r.gesehen}.`);
    assert.equal(r.gesehen,
      r.ausnahmen.keinBedienelement + r.ausnahmen.fliesstext + r.ausnahmen.gleichwertigesEtikett + r.bedienelemente,
      'zweite Stufe: alles Sichtbare ist entweder kein Bedienelement, Fliesstext, ein gleichwertig ' +
      `beschriftetes Kaestchen oder ein gemessenes Ziel. Gesehen ${r.gesehen}, kein Bedienelement ` +
      `${r.ausnahmen.keinBedienelement}, Fliesstext ${r.ausnahmen.fliesstext}, gleichwertiges Etikett ` +
      `${r.ausnahmen.gleichwertigesEtikett}, Bedienelemente ${r.bedienelemente}. ` +
      'Geht das nicht auf, gibt es einen fuenften, ungezaehlten Grund.');
  });

test('[Trefferflächen] jeder der vier Gründe hat im Prüfling einen echten Fall',
  { timeout: 120000 }, async () => {
    const r = await einmal();
    /* Ohne diese Prüfung wäre „der Trichter geht auf" auch von einem Prüfling
       erfüllt, in dem drei der vier Gründe nie zuschlagen — dann prüfte die
       Summe eine Null gegen eine Null. */
    assert.equal(r.ausnahmen.unsichtbar > 0, true, 'der `display:none`-Knopf muss hier landen');
    assert.equal(r.ausnahmen.keinBedienelement > 0, true,
      'die SVG-Knoten im Knopf und die Absaetze muessen hier landen — das ist die grosse Menge, ' +
      '1116 von 1308 in der Anwendung');
    assert.equal(r.ausnahmen.fliesstext, 1, 'genau der eine Inline-Link im Absatz');
    assert.equal(r.ausnahmen.gleichwertigesEtikett, 1, 'genau das eine Kaestchen mit ausreichendem Etikett');
  });
