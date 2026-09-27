'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   STRESSTEST 4 · Der Papierweg trug einen langen Wert nicht — jetzt trägt er ihn
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „zehn Stresstests" (21.08.2026), Posten 4 — dort gefunden, während
   die Grenzen des sehr vollen Depots als Zahlen gemessen wurden.
   Messwerkzeug: `tools/sehr-volles-depot-messen.mjs`.

   DER FUND (21.08.2026): `zeichneVollDepotPdf` brach die Seite JE BLOCK um, nicht
   je Zeile. `seitenUmbruch(wl.length * 13 + 6)` fragte, ob der GANZE Wert auf die
   Restseite paßt; paßte er nicht, begann eine neue Seite — und dann zeichnete
   `doc.text(wl, …)` **alle** Zeilen auf einmal ab dem Seitenanfang. Was über den
   unteren Rand hinausreichte, war gezeichnet und fort.

   **Ein Feldwert über einer Seite (rund 56 Zeilen, etwa 3 300 Zeichen) verlor
   alles danach — ohne Hinweis, ohne Auslassungszeichen.**

   WEN DAS TRAF: eine Patientenverfügung im Freitext, einen Brief an die
   Angehörigen, eine lange Krankengeschichte. Also genau die Felder, in die eine
   Bürgerin viel schreibt.

   BEHOBEN (A4 des Laufzettels Nacht 21./22.08.2026, Registerzeile A470). Die
   Entscheidung stand schon: die Produktentscheidung hat am 20.08.2026 gesetzt, *alles was
   gespeichert wurde muss auch wieder aufrufbar sein* — und alle Verlustwege gehen
   vor v1. Der Umbruch läuft jetzt JE ZEILE, über EINEN gemeinsamen Helfer
   (`pdfZeilenZeichnen`), den alle vier betroffenen Zeichenwege rufen.

   **DIESE PROBE IST UMGEDREHT.** Sie hielt bis zum 21.08. den Mangel fest; seit
   dem 22.08. hält sie die Behebung fest: die Seitenzahl WÄCHST mit der Länge des
   Werts, und 200 000 Zeichen ergeben mehr Seiten als 3 000.

   IM BROWSER UND NICHT IM NODE-HARNISCH, weil sie es sein muß: das PDF entsteht
   über jsPDF, und der Node-Stub kennt `getTextWidth` nicht einmal (der Kern sagt
   das an der Stelle selbst). Das ist zugleich die Gegenprobe, die der Laufzettel
   für jede Grenzen-Behauptung verlangt — gemessen am ausgelieferten Kern im
   echten Chromium, nicht im Harnisch.

   NACHTRAG (03.09.2026): die Positivkontrolle 500-gegen-3.000-Zeichen fiel auf
   klar rotem Grund um — nicht weil die Behebung nicht trägt, sondern weil sie
   an der falschen Stelle gemessen wurde. Gemessen am echten Weg: 500→2, 3.000→2,
   12.000→5, 200.000→56 Seiten. Im VOLLEN Depot (`vollDepotModell()`, dreizehn
   Bereiche plus was `akteurSelbstErklaeren` schon setzt) füllen die anderen
   Felder Seite 1 und 2 bereits so weit, daß 24 zusätzliche Zeilen (500→3.000
   Zeichen sind 5→29 Zeilen) keine dritte Seite erzwingen. Das ist KEIN
   Wachstumsfehler — ab 12.000 Zeichen schlägt der Umbruch sichtbar durch —
   sondern ein zu enger Sprung relativ zur vollen Baseline. Zwei Zusicherungen
   ersetzen die eine:
   GROB, im vollen Modell: 500 gegen 200.000 statt gegen 3.000 — beweist, daß
   das Wachstum in der echten Depotform durchschlägt, robust gegen künftige
   Bereiche, die die Baseline weiter füllen.
   FEIN, im SCHLANKEN Modell (ein Bereich, eine Sektion, ein Feld, ohne
   `vollDepotModell()`): derselbe 500-gegen-3.000-Vergleich wie vorher, aber
   ohne den Rest des Depots, der zufällig mitschiebt — hier mißt es den
   Umbruch selbst. Ein Wert allein reicht nicht: nur der grobe Sprung ließe
   moderate Zuwächse durch, wie sie eine Bürgerin mit normal gefülltem Depot
   träfe; nur der feine bemerkte nicht, wenn die reale Depotform den Umbruch
   aushebelt.
   LEBENDIGKEITSPROBE gefahren, an genau der Stelle, an der die alte Kontrolle
   scheiterte: beide neuen Vergleiche testweise umgedreht — behauptet, das
   große Modell habe WENIGER Seiten als das kleine. Beide fielen sofort und
   eindeutig rot (56 nicht < 2; 2 nicht < 1). Das beweist nicht,
   daß die Probe einen Produktfehler fände — das leistet der Mechanismus-Beleg in
   `tests/pdf-umbruch-je-zeile.test.js` — sondern daß der Vergleich selbst lebt
   und nicht wie die alte Positivkontrolle zwei Werte vergleicht, die nie
   auseinandergehen konnten.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp } = require('./helpers');

test('[S4] ein Feldwert über einer Seite läuft im Gesamt-PDF auf der nächsten weiter', async ({ page }) => {
  await oeffneApp(page);
  const mess = await page.evaluate(async () => {
    await window.__vdOeffentlich.depotAnlegen('stresstest-04-pw');
    window.__vdOeffentlich.akteurSelbstErklaeren('Messung');
    const raus = [];
    for (const zeichen of [500, 3000, 12000, 200000]) {
      const wert = 'Wort '.repeat(Math.ceil(zeichen / 5));
      window.__vdOeffentlich.sektorFeldSetzen('identity', 'furtherDetails', wert);
      const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
      /* DAS MESSMODELL, und es muß zum Zeichenweg passen — der erste Anlauf tat es
         NICHT: `splitTextToSize` auf einem frischen doc rechnet mit der
         Standardschrift (helvetica 16), der Kern zeichnet den Wert aber in
         `times` 10. Derselbe Text ergab so 3 360 statt 1 482 Zeilen, und die
         Probe wäre an einer erfundenen Zahl gescheitert. Darum: erst die Schrift
         setzen, die der Kern setzt, dann messen.
         Die Breite ist die GROSSZÜGIGSTE des Blatts (`SB - 2*RAND`), nicht die
         schmalere Wert-Spalte — damit ist `zeilenNoetig` eine untere Schranke und
         die Aussage unten hält, ohne eine Spaltenbreite fest zu verdrahten. */
      doc.setFont('times', 'normal'); doc.setFontSize(10);
      const zeilenNoetig = doc.splitTextToSize(wert, 595.28 - 2 * 56).length;
      window.__vdOeffentlich.zeichneVollDepotPdf(doc, window.__vdOeffentlich.vollDepotModell({ sensibel: true }), window.__vdOeffentlich.vollDepotPdfMeta());
      raus.push({ zeichen, zeilenNoetig, seiten: doc.internal.getNumberOfPages() });
    }

    /* SCHLANKES MODELL, ohne `vollDepotModell()` — ein Bereich, eine Sektion, ein
       Feld, in der Form, die `zeichneVollDepotPdf` selbst erwartet (s. dort:
       `modell.bereiche[].sektionen[].zeilen[].{label,wert}`). Keine anderen
       Bereiche, die Seite 1 schon füllen, bevor der lange Wert überhaupt dran ist. */
    const schlank = [];
    for (const zeichen of [500, 3000]) {
      const wert = 'Wort '.repeat(Math.ceil(zeichen / 5));
      const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
      const modell = {
        titel: 'Schlankes Modell', untertitel: '',
        bereiche: [{ id: 'test', titel: 'Test-Bereich', leer: false,
          sektionen: [{ titel: 'Test-Sektion', zeilen: [{ label: 'Wert', wert }] }] }],
      };
      window.__vdOeffentlich.zeichneVollDepotPdf(doc, modell, window.__vdOeffentlich.vollDepotPdfMeta());
      schlank.push({ zeichen, seiten: doc.internal.getNumberOfPages() });
    }

    return { raus, schlank };
  });

  const { raus, schlank } = mess;
  const [klein, mittel, gross, riesig] = raus;
  const [schlankKlein, schlankMittel] = schlank;

  /* POSITIVKONTROLLE, GROB (volles Modell): der Weg läuft überhaupt, und das
     Wachstum trägt über einen großen Sprung — robust gegen künftige Bereiche,
     die die Baseline weiter füllen. NICHT 500 gegen 3.000: die beiden bleiben
     im vollen `vollDepotModell()` auf derselben Seite (s. Nachtrag oben), das
     wäre wieder dieselbe Falle. */
  expect(klein.seiten).toBeGreaterThan(0);
  expect(riesig.seiten).toBeGreaterThan(klein.seiten);

  /* POSITIVKONTROLLE, FEIN (schlankes Modell): derselbe 500-gegen-3.000-Sprung,
     aber ohne den Rest des Depots — hier mißt es den Umbruch selbst, nicht was
     anderswo schon auf die Seiten drängt. */
  expect(schlankKlein.seiten).toBeGreaterThan(0);
  expect(schlankMittel.seiten).toBeGreaterThan(schlankKlein.seiten);

  /* DIE BEHEBUNG, erste Aussage: der Wert wächst um das Vierfache, und das Papier
     wächst mit. Vorher blieb hier die Seitenzahl stehen. */
  expect(gross.zeilenNoetig).toBeGreaterThan(mittel.zeilenNoetig * 3);
  expect(gross.seiten).toBeGreaterThan(mittel.seiten);

  /* Zweite Aussage, die der Laufzettel ausdrücklich verlangt: 200 000 Zeichen
     ergeben MEHR Seiten als 3 000. */
  expect(riesig.zeilenNoetig).toBeGreaterThan(1000);
  expect(riesig.seiten).toBeGreaterThan(gross.seiten);

  /* Dritte Aussage — und sie ist die eigentliche: keine Zeile geht verloren. Auf
     eine A4-Seite passen 56 Textzeilen (Satzspiegel zwischen RAND=56 und
     FUSS=48, Zeilenhöhe 13 pt). Das Papier muß also mindestens so viele Seiten
     tragen, wie der Wert allein bei der großzügigsten Spaltenbreite braucht.
     UNTER DEM ALTEN VERHALTEN war das unerfüllbar: dort blieb es bei den zwei
     Seiten, die der 3-000-Zeichen-Wert erzeugte. */
  expect(riesig.seiten).toBeGreaterThanOrEqual(Math.ceil(riesig.zeilenNoetig / 56));
});
