#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A446 · ZUG 0 — HAT EIN ANGEDOCKTER BEREICH EINEN PAPIERWEG?
   ────────────────────────────────────────────────────────────────────────────
   DER AUFTRAG (Laufzettel „Nach den dreizehn" Posten 10a, Auftrag „Der grosse
   Zug" Teil A): Bevor irgendetwas repariert wird, ist der leere Weg
   FESTZUHALTEN — und zwar getrennt für PDF, DOCX und Export. „Drei Ausgaben,
   drei Messpunkte, nicht eine stellvertretend."

   DIE POSITIVKONTROLLE IST DER GEGENSTAND, nicht eine Beigabe: „das Blatt ist
   leer" ist ohne sie nicht von „der Messweg läuft nicht" zu unterscheiden. Das
   ist hier keine Formel — beim ersten Lauf am 21.08. war die Kontrolle SELBST
   rot, weil als Kontrollfeld ein `gesundheit`-Feld gewählt war: dort trägt
   JEDES Feld `sensibel: true`, und ohne Opt-in hält der Kern sie zurück. Die
   Messung hätte „auch der eingebaute Bereich ist leer" gemeldet und damit den
   ganzen Befund umgedreht. Das Kontrollfeld wird darum nicht genannt, sondern
   GESUCHT: erstes eingebautes Feld, das nicht sensibel und nicht bedingt ist.

   WAS DIESES WERKZEUG NICHT TUT: urteilen, ob eine leere Ausgabe ein Defekt
   ist. Es sagt, was ankommt und was nicht. Die Bewertung steht im Bericht.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

/* Das Fixture-Bündel: EIN eigener Bereich, den der Kern nicht kennt, mit drei
   befüllten Feldern. Der Kammerfall des Laufzettels in seiner kleinsten Form —
   Lagerort, Archivdienstleister, Fristenende. Keines ist sensibel: die Messung
   soll den Papierweg messen, nicht die Sensibel-Zurückhaltung. */
const MODUL = Object.freeze({
  modulTyp: 'bereich', sprache: 'de', moduleVersion: 1, herkunft: 'rak-koeln-anwaltsdepot',
  bereiche: { obhut: { label: 'Fremde Daten in meiner Obhut', icon: 'folder' } },
});
const ABSCHNITT = 'Fremde Daten in meiner Obhut';
const DEFS = Object.freeze([
  { sektorId: 'obhut', feldId: 'tpl_lagerort', label: 'Lagerort', typ: 'text', abschnitt: ABSCHNITT },
  { sektorId: 'obhut', feldId: 'tpl_archivdienstleister', label: 'Archivdienstleister', typ: 'text', abschnitt: ABSCHNITT },
  { sektorId: 'obhut', feldId: 'tpl_fristenende', label: 'Fristenende', typ: 'datum', abschnitt: ABSCHNITT },
]);
const WERTE = Object.freeze({
  tpl_lagerort: 'Keller Regal 3',
  tpl_archivdienstleister: 'Rheinarchiv GmbH',
  tpl_fristenende: '2031-12-31',
});
const KONTROLLWERT = 'Kontrollwert Zug 0';

/* Das Kontrollfeld wird gesucht, nicht genannt — s. Kopfkommentar. */
function kontrollfeldSuchen(V) {
  for (const s of V.bereicheAlle()) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        if (f.typ === 'text' && !f.sensibel && !f.sichtbarWenn) {
          return { sektorId: s.id, feldId: f.id, label: f.label };
        }
      }
    }
  }
  return null;
}

function depotBauen(V, kontrolle) {
  const d = V.leeresDepot();
  d.bereichsModule = [MODUL];
  d.feldDefinitionen = DEFS.map((x) => Object.assign({}, x));
  d.sektoren.obhut = Object.assign({}, WERTE);
  d.sektoren[kontrolle.sektorId] = Object.assign({}, d.sektoren[kontrolle.sektorId] || {},
    { [kontrolle.feldId]: KONTROLLWERT });
  V.setData(d);
  V._bereichsModuleAusDepotAnmelden(d);
  V.depotNormalisieren(d);
  return d;
}

/* ── Die drei Messpunkte ──────────────────────────────────────────────────────
   Jeder liefert dasselbe Paar: was am ANGEDOCKTEN Bereich ankommt und was am
   eingebauten Kontrollfeld ankommt. Erst das Paar ist eine Aussage. */
function messen(V) {
  const kontrolle = kontrollfeldSuchen(V);
  if (!kontrolle) throw new Error('kein Kontrollfeld gefunden — der Kern trägt kein nicht-sensibles, unbedingtes Textfeld');
  depotBauen(V, kontrolle);

  const ergebnis = [];

  /* (1) PDF — `vollDepotModell` ist das Gesamt-PDF-Modell. */
  const pdf = V.vollDepotModell({ sensibel: false });
  const pdfAngedockt = (pdf.bereiche.find((b) => b.id === 'obhut') || { sektionen: [] })
    .sektionen.flatMap((s) => s.zeilen);
  const pdfKontrolle = (pdf.bereiche.find((b) => b.id === kontrolle.sektorId) || { sektionen: [] })
    .sektionen.flatMap((s) => s.zeilen);
  ergebnis.push({
    ausgabe: 'PDF', weg: 'vollDepotModell → _bereichSektionenModell',
    angedockt: pdfAngedockt.map((z) => z.label + ' = ' + z.wert),
    kontrolleGefunden: pdfKontrolle.some((z) => z.wert === KONTROLLWERT),
    bereichVorhanden: !!pdf.bereiche.find((b) => b.id === 'obhut'),
  });

  /* (1b) Bereichs-PDF — der ZWEITE Aufrufer von `_bereichSektionenModell`, den der Auftrag
     ausdrücklich zu messen und zu berichten aufgibt („`:38512` ist ein zweiter Aufrufer — ob
     er dasselbe braucht, ist zu messen und zu berichten"). Er ruft dieselbe Funktion, also
     trägt er, was sie trägt — aber genau das ist eine Messung wert und keine Annahme. */
  const bereichPdf = V.bereichVollModell('obhut', { sensibel: false });
  const bereichPdfKontrolle = V.bereichVollModell(kontrolle.sektorId, { sensibel: false });
  ergebnis.push({
    ausgabe: 'Bereichs-PDF', weg: 'bereichVollModell → _bereichSektionenModell',
    angedockt: (bereichPdf ? bereichPdf.bereiche[0].sektionen.flatMap((x) => x.zeilen) : [])
      .map((z) => z.label + ' = ' + z.wert),
    kontrolleGefunden: !!bereichPdfKontrolle && bereichPdfKontrolle.bereiche[0].sektionen
      .flatMap((x) => x.zeilen).some((z) => z.wert === KONTROLLWERT),
    bereichVorhanden: !!bereichPdf,
  });

  /* (2) DOCX — `docxBereichModell` ist der Zwilling, ein Bereich je Aufruf. */
  const dxA = V.docxBereichModell('obhut', { sensibel: false });
  const dxK = V.docxBereichModell(kontrolle.sektorId, { sensibel: false });
  ergebnis.push({
    ausgabe: 'DOCX', weg: 'docxBereichModell',
    angedockt: (dxA ? dxA.zeilen : []).map((z) => z.label + ' = ' + z.wert),
    kontrolleGefunden: !!dxK && dxK.zeilen.some((z) => z.wert === KONTROLLWERT),
    bereichVorhanden: !!dxA,
  });

  /* (3) Export — der Depot-Vollexport. Die FORMAT-Exporte (FHIR, XÖV, …) sind
     hier NICHT der Gegenstand: A173 hat entschieden, dass ein Modul-Feld kein
     Export-Mapping hat und keines bekommen soll. */
  const roh = V.vollExportJSON({ sensibel: false });
  const txt = (typeof roh === 'string') ? roh : JSON.stringify(roh);
  const drin = Object.values(WERTE).filter((w) => txt.includes(w));
  ergebnis.push({
    ausgabe: 'Export (JSON-Vollexport)', weg: 'vollExportJSON',
    angedockt: drin.map((w) => 'Wert im Export: ' + w),
    kontrolleGefunden: txt.includes(KONTROLLWERT),
    bereichVorhanden: txt.includes('obhut'),
  });

  return { kontrolle, ergebnis };
}

function bericht(mess) {
  const zeilen = [];
  zeilen.push('Kontrollfeld (gesucht, nicht genannt): '
    + mess.kontrolle.sektorId + '.' + mess.kontrolle.feldId + ' („' + mess.kontrolle.label + '")');
  zeilen.push('Angedocktes Bündel: ' + MODUL.herkunft + ' → Bereich „obhut", ' + DEFS.length + ' befüllte Felder');
  zeilen.push('');
  for (const e of mess.ergebnis) {
    const kontrolle = e.kontrolleGefunden ? 'Kontrolle GRÜN' : 'Kontrolle ROT — der Messweg selbst läuft nicht';
    const stand = !e.kontrolleGefunden ? 'UNBRAUCHBAR'
      : (e.angedockt.length ? 'TRÄGT (' + e.angedockt.length + ')' : 'LEER');
    zeilen.push(e.ausgabe + ' [' + e.weg + ']: ' + stand + ' · ' + kontrolle);
    for (const a of e.angedockt) zeilen.push('    · ' + a);
    if (!e.bereichVorhanden) zeilen.push('    · der Bereich kommt in dieser Ausgabe gar nicht vor');
  }
  return zeilen.join('\n');
}

function laufen(kernPfad) {
  if (kernPfad) process.env.KERN_HTML_PATH = kernPfad;
  const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  return messen(V);
}

if (require.main === module) {
  const i = process.argv.indexOf('--kern');
  const mess = laufen(i > -1 ? process.argv[i + 1] : null);
  console.log(bericht(mess));
  const unbrauchbar = mess.ergebnis.filter((e) => !e.kontrolleGefunden);
  if (unbrauchbar.length) {
    console.error('\nABBRUCH: ' + unbrauchbar.length + ' Messpunkt(e) ohne Positivkontrolle — '
      + 'ihre Aussage über den angedockten Weg ist wertlos.');
    process.exit(2);
  }
}

module.exports = { messen, bericht, laufen, MODUL, DEFS, WERTE, KONTROLLWERT, kontrollfeldSuchen, depotBauen };
