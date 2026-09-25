'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — S9: Das Dokument wird eine Datei (Auftrag K8/S9, 09.08.2026,
   Zug 2)
   ────────────────────────────────────────────────────────────────────────
   Drei Wege: Drucken (unverändert), als Datei sichern (PDF via jsPDF-Stub-
   Muster wie tests/gesamt-pdf.test.js), ins eigene Depot legen (Mappe). Die
   Wirksamkeits-Zusage steht an JEDER erzeugten Datei — eine gesicherte
   Datei ist eine Kopie des Entwurfs, keine wirksame Verfügung.

   „Nur PDF" (10.08.2026): die HTML-Ausgabe (dokumentHTMLDatei,
   flowDokumentDateiSichern('html')/flowDokumentInMappeAblegen('html')) ist
   entfallen — die ehemaligen Tests S9·4/S9·5/S9·7 dafür sind entfernt, nicht
   nur übersprungen. Beide Flow-Funktionen nehmen keinen `format`-Parameter
   mehr (immer PDF).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Schlanker jsPDF-Stub — dasselbe Muster wie tests/gesamt-pdf.test.js.
function fakeDoc(seitenHoehe) {
  let seiten = 1;
  const texte = [];
  return {
    internal: {
      pageSize: { getWidth: () => 595, getHeight: () => (seitenHoehe || 842) },
      getNumberOfPages: () => seiten,
    },
    setFont() {}, setFontSize() {},
    splitTextToSize: (s) => String(s == null ? '' : s).split('\n'),
    addPage() { seiten += 1; },
    text(t) { (Array.isArray(t) ? t : [t]).forEach(x => texte.push(String(x))); },
    _texte: () => texte,
    _joined: () => texte.join('\n'),
    _seiten: () => seiten,
  };
}

async function baueDepot(V) {
  await V.depotAnlegen('S9-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.identity = { givenName: 'Elisabeth', familyName: 'Beispiel', birthDate: '1958-03-14',
    streetAddress: 'Lindenweg 4', postcodeCity: '80331 München' };
  d.sektoren.advanceCare = { applicableSituations: ['sterbeprozess'],
    provisionInstruments: [ { id: 'vm-1', instrument: 'enduring-power-of-attorney', representationInCourt: 'ja' } ] };
  V.setData(d);
  return d;
}

test('[S9·1] zeichneDokumentPdf schreibt Wirksamkeits-Hinweis, H1 und Wortlaut-Text in den Stub', async () => {
  const { V } = ladeKern({ Blob });
  await baueDepot(V);
  const doc = fakeDoc();
  V.zeichneDokumentPdf(doc, 'patientenverfuegung');
  const t = doc._joined();
  assert.match(t, /keine wirksame Verfügung/, 'Wirksamkeits-Hinweis steht an der Datei');
  assert.match(t, /Patientenverfügung/);
  assert.match(t, /aller Wahrscheinlichkeit nach unabwendbar im unmittelbaren Sterbeprozess/, 'Wortlaut-Inhalt landet im PDF');
});

test('[S9·2] zeichneDokumentPdf bricht die Seite um, wenn der Inhalt eine kleine Seite sprengt', async () => {
  const { V } = ladeKern({ Blob });
  await baueDepot(V);
  const kleineSeite = fakeDoc(120);   // absichtlich winzig — erzwingt mehrere addPage()
  V.zeichneDokumentPdf(kleineSeite, 'patientenverfuegung');
  assert.ok(kleineSeite._seiten() > 1, 'mehrseitiger Inhalt auf einer winzigen Seite muss umbrechen');
});

test('[S9·3] zeichneDokumentPdf trägt die zweite Unterschriftszeile bei der Vollmacht (zwei Parteien)', async () => {
  const { V } = ladeKern({ Blob });
  await baueDepot(V);
  const doc = fakeDoc();
  V.zeichneDokumentPdf(doc, 'vorsorgevollmacht', 'vm-1');
  assert.match(doc._joined(), /Vollmachtnehmerin\/des Vollmachtnehmers/);
  assert.match(doc._joined(), /Vollmachtgeberin\/des Vollmachtgebers/);
});

/* ── „Die Ausgabewege, an denen die Prüfung vorbeiläuft" (12.08.2026), Befund 1 ──
   `extraHTML` (ärztliche Aufklärung PV, KI-Formhinweis) erreichte den PDF-Pfad nie —
   `zeichneDokumentPdf` kannte nur `abschnitte`. Seit „Nur PDF" (10.08.2026) ist die PDF-Datei
   der EINZIGE Ausgabeweg — was dort fehlt, existiert für den Empfänger nicht. Behoben über eine
   strukturierte Zwillingsform `extraAbschnitt` (dieselben Inhalte wie `extraHTML`, PDF-tauglich). */
test('[Befund 1] PV-PDF trägt die ärztliche Aufklärung (Titel + Wortlaut)', async () => {
  const { V } = ladeKern({ Blob });
  await baueDepot(V);
  const doc = fakeDoc();
  V.zeichneDokumentPdf(doc, 'patientenverfuegung');
  const t = doc._joined();
  assert.match(t, /Ärztliche Aufklärung.*Einwilligungsfähigkeit/,
    'die Aufklärungs-Überschrift muss im PDF stehen — bisher fehlte sie vollständig');
  const erwarteterWortlaut = V.VORSORGE_MODUL_BY_ID.patientenverfuegung.dokAusgabe.extraAbschnitt().zeilen[0];
  assert.ok(t.includes(erwarteterWortlaut), 'der Wortlaut der ärztlichen Bestätigung muss im PDF stehen');
});

test('[Befund 1] KI-Verfügungs-PDF trägt den Formhinweis', async () => {
  const { V } = ladeKern({ Blob });
  await baueDepot(V);
  const d = V.getData();
  d.sektoren.advanceCare.provisionInstruments.push({ id: 'ki-1', instrument: 'ki-verfuegung' });
  V.setData(d);
  const doc = fakeDoc();
  V.zeichneDokumentPdf(doc, 'ki-verfuegung', 'ki-1');
  const t = doc._joined();
  const erwarteterHinweis = V.VORSORGE_MODUL_BY_ID['ki-verfuegung'].dokAusgabe.extraAbschnitt().zeilen[0];
  assert.ok(t.includes(erwarteterHinweis), 'der KI-Formhinweis muss im PDF stehen — bisher fehlte er vollständig');
});

test('[Rotmachbarkeit Befund 1] ohne extraAbschnitt fehlt der Inhalt real im PDF (rot ⇄ grün)', async () => {
  const { V } = ladeKern({ Blob });
  await baueDepot(V);
  const original = V.VORSORGE_MODUL_BY_ID.patientenverfuegung.dokAusgabe.extraAbschnitt;
  assert.equal(typeof original, 'function', 'Vorbedingung: extraAbschnitt existiert wirklich');
  const wortlautAusschnitt = original().zeilen[0].slice(0, 40);
  // Grün: mit extraAbschnitt.
  const docGruen = fakeDoc();
  V.zeichneDokumentPdf(docGruen, 'patientenverfuegung');
  assert.ok(docGruen._joined().includes(wortlautAusschnitt), 'Vorbedingung: der Text steht im unveränderten PDF');
  // Rot: extraAbschnitt entfernt (simuliert den Zustand vor diesem Fix) — derselbe Wortlaut darf
  // dann NICHT mehr im PDF stehen.
  V.VORSORGE_MODUL_BY_ID.patientenverfuegung.dokAusgabe.extraAbschnitt = null;
  try {
    const docRot = fakeDoc();
    V.zeichneDokumentPdf(docRot, 'patientenverfuegung');
    assert.ok(!docRot._joined().includes(wortlautAusschnitt),
      'ohne extraAbschnitt darf der Aufklärungs-Wortlaut nicht im PDF stehen — genau das war der gemeldete Fehler');
  } finally {
    V.VORSORGE_MODUL_BY_ID.patientenverfuegung.dokAusgabe.extraAbschnitt = original;   // Zustand zurücksetzen
  }
});

test('[S9·6] flowDokumentDateiSichern ohne jsPDF im Node-Harness: sauberer Rückgabewert, kein Wurf', async () => {
  const { V } = ladeKern({ Blob });
  await baueDepot(V);
  const weg = await V.flowDokumentDateiSichern('patientenverfuegung');
  assert.equal(weg, 'kein-jspdf', 'kein jsPDF im Node-Harness (window.jspdf fehlt) → sauberer Hinweis statt Absturz');
});

test('[S9·8] flowDokumentInMappeAblegen ohne jsPDF im Node-Harness: kein Mappe-Eintrag, sauberer Rückgabewert', async () => {
  const { V } = ladeKern({ Blob });
  await baueDepot(V);
  const vorher = (V.getData().mappe || []).length;
  const weg = await V.flowDokumentInMappeAblegen('living-will');
  assert.equal(weg, 'kein-jspdf');
  assert.equal((V.getData().mappe || []).length, vorher, 'kein halber Eintrag ohne erzeugbaren Inhalt');
});

test('[S9·9] _dokumentDateiname trägt Modul-Basis + heutiges Datum + Endung', async () => {
  const { V } = ladeKern({ Blob });
  await baueDepot(V);
  // Vorbestehender Fund (13.08.2026, während dieser Sitzung real ausgelöst): `_dokumentDateiname`
  // rechnet über `heuteLokal()` (Orts-Datum, richtig für eine Bürgerin) — die Probe rechnete über
  // `toISOString()` (UTC) und fiel in jedem CEST-Fenster zwischen 22:00 und 00:00 UTC-Mitternacht
  // real auseinander (Lokalzeit bereits am nächsten Tag, UTC noch nicht). Kein Produktfehler,
  // reiner Test-Fehler — behoben, dieselbe Uhr wie das Produkt.
  const heute = V.heuteLokal();
  assert.equal(V._dokumentDateiname('patientenverfuegung', 'pdf'), 'Vivodepot_Patientenverfuegung_' + heute + '.pdf');
  assert.equal(V._dokumentDateiname('vorsorgevollmacht', 'html'), 'Vivodepot_Vollmacht_' + heute + '.html');
});

test('[S9·11] dokumentOeffnen() bindet die zwei Knöpfe (PDF/Mappe — HTML entfallen, „Nur PDF" 10.08.2026), wirft für keines der vier Module', async () => {
  const { V } = ladeKern({ Blob });
  await baueDepot(V);
  assert.doesNotThrow(() => V.dokumentOeffnen('patientenverfuegung'), 'PV');
  assert.doesNotThrow(() => V.dokumentOeffnen('vorsorgevollmacht', 'vm-1'), 'VM');
  assert.doesNotThrow(() => V.dokumentOeffnen('ki-verfuegung'), 'KI');
  const d = V.getData();
  d.sektoren.advanceCare.provisionInstruments.push({ id: 'bv-1', instrument: 'custodianship-declaration', whatTheCareArrangementShould: 'x' });
  V.setData(d);
  assert.doesNotThrow(() => V.dokumentOeffnen('betreuungsverfuegung'), 'BV');
});

test('[S9·10] _blobZuDataUrl kodiert dieselben Bytes, die hineingingen (Rundreise über dataUrlZuBlob)', async () => {
  const { V } = ladeKern({ Blob });
  const blob = new Blob(['Hallo Vivodepot'], { type: 'text/plain' });
  const url = await V._blobZuDataUrl(blob);
  assert.match(url, /^data:text\/plain;base64,/);
  const zurueck = V.dataUrlZuBlob(url);
  const text = await zurueck.text();
  assert.equal(text, 'Hallo Vivodepot');
});
