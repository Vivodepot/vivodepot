#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   STRESSTEST 4 · DAS SEHR VOLLE DEPOT — die Grenzen als Zahlen
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „zehn Stresstests" (21.08.2026), Posten 4.
   *„Die Grenzen sind nirgends gezogen. Der Bericht nennt sie als Zahlen, nicht
   als Eindruck. Die Zielgruppe ist alt, ihre Geräte sind es auch."*

   IM ECHTEN BROWSER, nicht im Node-Harnisch — und das ist bei diesem Posten
   keine Formalie, sondern die Voraussetzung: PDF entsteht über jsPDF, der
   Speicherverbrauch ist eine Eigenschaft der JS-Umgebung, und Posten 1 hat
   gerade gezeigt, was ein Node-Ergebnis über das Produkt aussagt, wenn man es
   nicht nachprüft (nämlich nichts).

   GEMESSEN WIRD JE GRÖSSENSTUFE, nicht nur am Maximum: eine Zahl allein sagt
   nicht, ob etwas linear wächst oder kippt. Die kleinste Stufe ist zugleich die
   Positivkontrolle — bricht sie schon, misst der Lauf nicht die Größe.

   AUFRUF:  node tools/sehr-volles-depot-messen.mjs [--stufen 1,10,40]
   ════════════════════════════════════════════════════════════════════════════ */
import { chromium } from 'playwright';
import path from 'node:path';
import process from 'node:process';

const i = process.argv.indexOf('--stufen');
const STUFEN = i > -1 ? process.argv[i + 1].split(',').map(Number) : [1, 10, 40];

/* Der Aufbau je Stufe. Faktor 40 ist das Ziel des Auftrags: dreissig Jahre
   Krankengeschichte, hundert Kontakte, vierzig Dokumente. */
function aufbauCode(faktor) {
  return `(async () => {
    const t = {};
    const V = window.__vdOeffentlich;
    const uhr = () => performance.now();
    let t0 = uhr();
    await V.depotAnlegen('sehr-voll-pw');
    V.akteurSelbstErklaeren('Messung');
    t.anlegenMs = uhr() - t0;

    const F = ${faktor};
    t0 = uhr();
    for (let n = 0; n < F * 3; n++) {
      V.personHinzufuegen({ name: 'Kontakt ' + n, beziehung: 'Bekannt', tel: '0300 ' + n });
    }
    for (let n = 0; n < F; n++) {
      V.institutionHinzufuegen({ name: 'Stelle ' + n, art: 'behoerde' });
      V.dokumentAnlegen({ typ: 'sonstiges', name: 'Unterlage ' + n,
        sektorId: 'gesundheit', gueltigAb: '199' + (n % 10) + '-04-01' });
    }
    /* Dreissig Jahre Krankengeschichte: die Freitextfelder der Gesundheit,
       gefuellt wie ein langes Leben sie fuellt. */
    const jahre = [];
    let zeichenEingegeben = 0;
    for (let j = 0; j < F * 30; j++) {
      const eintrag = { text: (1995 + (j % 30)) + ': Befund, Behandlung, Nachsorge — Eintrag ' + j
        + ', mit Arzt, Ort und Verlauf in einem Satz, wie es eine Buergerin schreibt.', code: null };
      zeichenEingegeben += eintrag.text.length;
      jahre.push(eintrag);
    }
    /* Der Bereich Gesundheit fuehrt KEIN Freitextfeld — kein einziges textarea.
       Die dreissig Jahre gehen darum in krankheiten — ein CODE-LISTEN-Feld, das
       Chips der Form [{text, code}] verlangt und einen rohen String laut
       zurueckweist (A43/A44). Ein Diagnose-Chip je Jahr ist ohnehin das bessere
       Modell als ein Textblock. Dass der Bereich kein Freitextfeld fuehrt, ist
       ein Nebenbefund und steht im Bericht. */
    V.sektorFeldSetzen('gesundheit', 'krankheiten', jahre);

    /* UND DIE FELDER SELBST. Der erste Anlauf fuellte nur Container (Menschen,
       Institutionen, Dokumente) — das PDF zeichnet aber FELDER, und blieb darum
       bei jeder Stufe 6 KB und eine Seite. Das war mein Pruefstoff, nicht der
       Kern. Hier bekommt jedes Textfeld jedes Bereichs einen langen Wert. */
    let gefuellt = 0;
    for (const sek of V.SEKTOREN) {
      for (const gruppe of (sek.sektionen || [])) {
        for (const f of (gruppe.felder || [])) {
          if (f.typ !== 'text' && f.typ !== 'textarea') continue;
          try {
            const wert = ('Ein ausgeschriebener Wert, wie ihn eine Buergerin eintraegt, mit Ort, '
               + 'Datum und Zusatz — Feld ' + f.id + '. ').repeat(Math.max(1, Math.floor(F / 4)));
            V.sektorFeldSetzen(sek.id, f.id, wert);
            zeichenEingegeben += wert.length;
            gefuellt++;
          } catch (e) { /* Code-Listen- und Sonderfelder weisen einen rohen String zurueck — richtig so */ }
        }
      }
    }
    t.felderGefuellt = gefuellt;
    t.fuellenMs = uhr() - t0;
    /* KEINE BACKTICKS IN DIESEM BLOCK: er ist selbst ein Template-Literal, und
       ein Backtick im Kommentar beendet es. (Genau daran ist der zweite Anlauf
       gescheitert — dieselbe Falle wie im EXPORT_HOOK von load-kern.js.)
       Der Schluessel heisst menschen, nicht personen: die Schreibfunktion heisst
       personHinzufuegen, der Slot heisst anders. Der erste Anlauf brach daran ab
       — mein Messmodell, nicht der Kern. */
    // U2-ADR-NNN-Nachtrag (18.09.2026, Kern-Verschluss): data selbst bleibt bewusst
    // ausserhalb von window.__vdOeffentlich (kompletter Live-Depot-Zustand, s. Kommentar
    // am Export-Block) — Personen/Institutionen/Dokumente sind hier ohnehin aus den
    // Schleifen oben bekannt (F*3/F/F), kein Grund, den Bestand zurückzulesen. Die
    // Zeichenzahl ist die SELBST EINGEGEBENE (oben mitgezählt), nicht die aus data
    // zurückgelesene — eine ehrliche Umbenennung, keine stille Weiterführung derselben Zahl.
    t.personen = F * 3;
    t.institutionen = F;
    t.dokumente = F;
    t.zeichenEingegeben = zeichenEingegeben;

    /* SPEICHERN — Dauer und Groesse des Umschlags. */
    t0 = uhr();
    const umschlag = await V.depotSerialisieren();
    t.speichernMs = uhr() - t0;
    t.umschlagZeichen = JSON.stringify(umschlag).length;

    /* LADEN — die Zahl, die die Buergerin auf einem alten Geraet spuert. */
    t0 = uhr();
    await V.depotLaden(umschlag, 'sehr-voll-pw');
    t.ladenMs = uhr() - t0;

    /* MIGRATION ueber denselben Bestand. KEINE BACKTICKS in diesem Kommentar (s. Hinweis
       oben) — ohne Argument faellt depotNormalisieren(d) intern auf sein eigenes,
       ambientes data zurueck (const ziel = d || data), dieselbe Wirkung wie
       depotNormalisieren(data) vorher, ohne dass der Aufrufer hier data selbst braucht. */
    t0 = uhr();
    V.depotNormalisieren();
    t.migrationMs = uhr() - t0;

    // DATENSATZ-Messung (t.datensatzMs/t.datensatzZeichen) entfernt (U2-ADR-NNN, 18.09.2026):
    // maß Dauer/Größe von vollExportJSON() — einer Fähigkeit, die das Produkt nicht mehr
    // anbietet (offener JSON-Vollexport entfernt). Der Umschlag (oben, speichernMs/
    // umschlagZeichen) ist der Gegenstand, den eine Bürgerin tatsächlich weitergibt.

    /* SPEICHER: was der Tab haelt. Nur in Chromium und nur grob — als
       Groessenordnung, nicht als Zusage. */
    t.speicherMB = (performance.memory && performance.memory.usedJSHeapSize)
      ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;

    return t;
  })()`;
}

/* PDF und QR laufen getrennt: beide brauchen einen eigenen Aufruf, und ein
   Fehlschlag des einen darf den anderen nicht verschlucken. */
const PDF_CODE = `(async () => {
  const t = {};
  const V = window.__vdOeffentlich;
  let t0 = performance.now();
  try {
    /* WIE flowVollDepotPdf ES TUT, nur ohne Dialog und ohne Dateiausgabe:
       zeichneVollDepotPdf(doc, modell, meta) nimmt drei Argumente. Der erste
       Anlauf rief sie ohne und bekam „Cannot read properties of undefined
       (reading 'internal')" — mein Messmodell, nicht der Kern. */
    /* OHNE Sensibel — so, wie die Buergerin es standardmaessig bekommt. */
    const modell = V.vollDepotModell({});
    const meta = V.vollDepotPdfMeta();
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    V.zeichneVollDepotPdf(doc, modell, meta);
    const blob = doc.output('blob');
    t.pdfMs = performance.now() - t0;
    t.pdfKB = blob && blob.size ? Math.round(blob.size / 1024) : null;
    t.pdfSeiten = doc.internal.getNumberOfPages();
    /* Und die obere Schranke: MIT den sensiblen Werten. */
    const t1 = performance.now();
    const docS = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    V.zeichneVollDepotPdf(docS, V.vollDepotModell({ sensibel: true }), V.vollDepotPdfMeta());
    t.pdfVollKB = Math.round(docS.output('blob').size / 1024);
    t.pdfVollSeiten = docS.internal.getNumberOfPages();
    t.pdfVollMs = performance.now() - t1;
  } catch (e) { t.pdfFehler = String(e && e.message).slice(0, 120); }
  return t;
})()`;

const QR_CODE = `(() => {
  const t = {};
  const V = window.__vdOeffentlich;
  try {
    // t.nutzlastZeichen (vormals aus vollExportJSON()) entfernt (U2-ADR-NNN, 18.09.2026) —
    // war ohnehin nur ein informativer Nebenwert, die eigentliche Chunking-Messung unten
    // läuft an einer synthetischen Füllzeichenkette, nicht an echten Nutzdaten.
    t.qrTeilMax = V.QR_TEIL_MAX;
    /* Gemessen an einer Fuellzeichenkette, nicht am Datensatz: der Datensatz
       ist kuerzer als die groesste Stufe, und dann misst „60000" in Wahrheit
       seine eigene Laenge. (Genau das lieferte der erste Lauf: 3 Teile fuer
       60 000 Zeichen — es waren nie 60 000.) */
    const fuell = 'x'.repeat(60000);
    for (const zeichen of [200, 600, 1200, 6000, 60000]) {
      const teile = V.qrTeilePacken(fuell.slice(0, zeichen));
      t['teile_' + zeichen] = Array.isArray(teile) ? teile.length : String(teile);
    }
  } catch (e) { t.qrFehler = String(e && e.message).slice(0, 160); }
  return t;
})()`;

const browser = await chromium.launch();
const ergebnisse = [];
for (const faktor of STUFEN) {
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve('vivodepot.html'));
  await page.waitForSelector('.welcome-brand');
  const t = await page.evaluate(aufbauCode(faktor));
  Object.assign(t, await page.evaluate(PDF_CODE));
  Object.assign(t, await page.evaluate(QR_CODE));
  t.faktor = faktor;
  ergebnisse.push(t);
  await page.close();
}
await browser.close();

const Z = (n) => (n == null ? '—' : (typeof n === 'number' ? n.toFixed(0) : String(n)));
console.log('Stufe  Personen  Dok.  Eingegeben(KB)  Umschlag(KB)  speichern  laden  Migration  PDF(KB)  PDF(ms)  Seiten  Heap(MB)');
for (const t of ergebnisse) {
  console.log(
    String(t.faktor).padStart(5)
    + String(t.personen).padStart(10) + String(t.dokumente).padStart(6)
    + Z(t.zeichenEingegeben / 1024).padStart(16) + Z(t.umschlagZeichen / 1024).padStart(14)
    + (Z(t.speichernMs) + 'ms').padStart(11) + (Z(t.ladenMs) + 'ms').padStart(7)
    + (Z(t.migrationMs) + 'ms').padStart(11)
    + Z(t.pdfKB).padStart(9) + Z(t.pdfMs).padStart(9) + Z(t.pdfSeiten).padStart(8)
    + Z(t.speicherMB).padStart(10)
    + ('   voll: ' + Z(t.pdfVollKB) + ' KB / ' + Z(t.pdfVollSeiten) + ' S / ' + Z(t.pdfVollMs) + ' ms'
       + '   Felder: ' + Z(t.felderGefuellt)));
  if (t.pdfFehler) console.log('       PDF-FEHLER: ' + t.pdfFehler);
}
// U2-ADR-NNN-Nachtrag (18.09.2026): keine "Datensatz der groessten Stufe"-Zeile mehr — sie
// bezog sich auf nutzlastZeichen (vollExportJSON(), entfernt). Die QR-Chunking-Messung läuft
// seither an einer synthetischen Füllzeichenkette fester Größen (200..60000), nicht am echten
// Datensatz — die teile_*-Werte unten sind bereits die vollständige, aussagekräftige Ausgabe.
const q = ergebnisse[ergebnisse.length - 1];
console.log('\nQR: ' + JSON.stringify(Object.fromEntries(
  Object.entries(q).filter(([k]) => k.startsWith('teile_') || k.startsWith('qr')))));
console.log('\nPositivkontrolle: die kleinste Stufe traegt: '
  + (ergebnisse[0] && !ergebnisse[0].pdfFehler && ergebnisse[0].umschlagZeichen > 0));
