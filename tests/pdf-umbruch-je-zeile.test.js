'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — A4 des Laufzettels Nacht 21./22.08.2026: der Umbruch JE ZEILE
   ────────────────────────────────────────────────────────────────────────
   DER FUND (Stresstest-Posten 4, Registerzeile A470): alle PDF-Zeichenwege
   prüften den Seitenumbruch JE BLOCK. `seitenUmbruch(zeilen.length * h)`
   fragte, ob der GANZE Wert auf die Restseite paßt; paßte er nicht, begann
   eine neue Seite — und `doc.text(zeilen, …)` zeichnete danach ALLE Zeilen
   auf einmal ab dem Seitenanfang. Ein Feldwert über einer Seite lief über
   den unteren Rand hinaus; alles danach war fort, ohne Hinweis.

   DIE BEHEBUNG: `pdfZeilenZeichnen` — Umbruch je Zeile, EINE Stelle, von
   allen vier betroffenen Zeichenwegen gerufen (Gesamt-/Bereichs-PDF,
   Situationsblatt, Notfallkarte, Dokument-Ausgabeweg).

   WARUM HIER UND NICHT NUR IM BROWSER: die Browser-Probe
   (`tests/e2e/stresstest-04-papierlaenge.spec.js`) mißt den ausgelieferten
   Kern mit echtem jsPDF und ist der Beleg für die GRENZE. Diese Datei prüft
   den Helfer selbst und die drei ÜBRIGEN Zeichenwege, die im Browser keine
   eigene Probe haben — mit einem Stub, dessen `splitTextToSize` wirklich
   umbricht (der Stub in `gesamt-pdf.test.js` gibt eine einzige Zeile zurück
   und könnte einen Umbruch gar nicht sehen).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Stub mit ECHTEM Umbruch: je `proZeile` Zeichen eine Zeile. Zählt Seiten und
// merkt sich, auf welcher Seite jede Zeile mit welchem y landete.
function docMitUmbruch(proZeile) {
  let seiten = 1, aktuelle = 1;
  const gezeichnet = [];
  return {
    internal: {
      pageSize: { getWidth: () => 595, getHeight: () => 842 },
      getNumberOfPages: () => seiten,
    },
    setFont() {}, setFontSize() {}, setTextColor() {}, setDrawColor() {}, setLineWidth() {}, line() {},
    addImage() {},
    splitTextToSize(s) {
      s = String(s == null ? '' : s);
      if (!s) return [''];
      const raus = [];
      for (let i = 0; i < s.length; i += proZeile) raus.push(s.slice(i, i + proZeile));
      return raus;
    },
    addPage() { seiten += 1; aktuelle = seiten; },
    setPage(p) { aktuelle = p; },
    text(t, x, y) { (Array.isArray(t) ? t : [t]).forEach(z => gezeichnet.push({ text: String(z), x, y, seite: aktuelle })); },
    _gezeichnet: () => gezeichnet,
    _seiten: () => seiten,
  };
}

test('[A4·Helfer] pdfZeilenZeichnen bricht JE ZEILE um und zeichnet keine Zeile unter die Grenze', () => {
  const { V } = ladeKern();
  const doc = docMitUmbruch(10);
  const zeilen = Array.from({ length: 100 }, (_, i) => 'Z' + i);
  const GRENZE = 794, OBEN = 56, H = 13;
  const yEnde = V.pdfZeilenZeichnen(doc, zeilen, 56, OBEN, H, GRENZE, OBEN);

  assert.equal(doc._gezeichnet().length, 100, 'JEDE Zeile wird gezeichnet — keine geht verloren');
  for (const g of doc._gezeichnet()) {
    assert.ok(g.y + H <= GRENZE, 'keine Zeile liegt unter der Grenze (y=' + g.y + ')');
    assert.ok(g.y >= OBEN, 'keine Zeile liegt über dem oberen Rand');
  }
  // 56 Zeilen je Seite ((794-56)/13 = 56,8 → 56), 100 Zeilen ⇒ zwei Seiten.
  assert.equal(doc._seiten(), 2, 'genau zwei Seiten für 100 Zeilen');
  assert.ok(yEnde > OBEN, 'das zurückgegebene y steht hinter der letzten Zeile');
});

test('[A4·Helfer·Positivkontrolle] ein kurzer Block bricht NICHT um', () => {
  const { V } = ladeKern();
  const doc = docMitUmbruch(10);
  V.pdfZeilenZeichnen(doc, ['a', 'b', 'c'], 56, 56, 13, 794, 56);
  assert.equal(doc._seiten(), 1, 'drei Zeilen bleiben auf einer Seite — sonst bewiese der Test oben nichts');
  assert.equal(doc._gezeichnet().length, 3);
});

test('[A4·Helfer] eine leere Zeilenliste zeichnet nichts und gibt y unverändert zurück', () => {
  const { V } = ladeKern();
  const doc = docMitUmbruch(10);
  assert.equal(V.pdfZeilenZeichnen(doc, [], 56, 200, 13, 794, 56), 200);
  assert.equal(V.pdfZeilenZeichnen(doc, null, 56, 200, 13, 794, 56), 200);
  assert.equal(doc._gezeichnet().length, 0);
  assert.equal(doc._seiten(), 1);
});

test('[A4·Gesamt-PDF] ein Wert über einer Seite wächst das Papier — und keine Zeile fällt unter den Rand', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'furtherDetails', 'x'.repeat(20000));

  const doc = docMitUmbruch(60);                     // 20 000 Zeichen ⇒ 334 Zeilen
  V.zeichneVollDepotPdf(doc, V.vollDepotModell({ sensibel: true }), V.vollDepotPdfMeta());

  // 334 Wertzeilen ⇒ mindestens sechs Seiten (56 je Seite). Unter dem alten
  // Verhalten blieb es bei einer einzigen Seite mit 334 übereinander
  // gezeichneten Zeilen, von denen 278 unter dem Blattrand lagen.
  assert.ok(doc._seiten() >= 6, 'mindestens sechs Seiten, gemessen: ' + doc._seiten());
  const langeZeilen = doc._gezeichnet().filter(g => /^x{60}$/.test(g.text));
  assert.equal(langeZeilen.length, 333, 'alle vollen Wertzeilen sind gezeichnet');
  for (const g of langeZeilen) assert.ok(g.y + 13 <= 842 - 48, 'Wertzeile unter dem Blattrand: y=' + g.y);
});

test('[A4·Situationsblatt] derselbe Helfer, derselbe Schutz', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  const modell = {
    titel: 'Prüfblatt',
    bloecke: [{ titel: 'Block', zeilen: [{ label: 'Feld', wert: 'y'.repeat(12000) }] }],
  };
  const doc = docMitUmbruch(60);                     // 12 000 Zeichen ⇒ 200 Zeilen
  V.zeichneSituationPdf(doc, modell, V.vollDepotPdfMeta());
  assert.ok(doc._seiten() >= 4, 'mindestens vier Seiten, gemessen: ' + doc._seiten());
  for (const g of doc._gezeichnet().filter(z => /^y{60}$/.test(z.text))) {
    assert.ok(g.y + 14 <= 842 - 48, 'Wertzeile unter dem Blattrand: y=' + g.y);
  }
});
