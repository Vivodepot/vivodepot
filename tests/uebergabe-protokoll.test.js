'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Übergabe-Protokoll (U2-ADR-120), Zug 1 + Zug 2 des Bau-Auftrags
   ────────────────────────────────────────────────────────────────────────
   data.uebergabeProtokoll[] ist EIGENSTÄNDIG neben verwalteteDepots/
   delegationsGeschichte (Sub-Depot-Verwaltung, anderer Gegenstand — CC-120-M).
   Geprüft hier: der Kern-Mutator uebergabeProtokollEintragen (Pflichtfelder,
   Kennung, Dirty-Flag) und Abnahme 1 — ein Eintrag übersteht echtes
   Speichern/Öffnen (Krypto-Roundtrip, kein Mock).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'anker-pw-uebergabe-123';
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

test('Zug 1 — data.uebergabeProtokoll[] ist bei einem frischen Depot ein leeres Array', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  assert.ok(Array.isArray(V.getData().uebergabeProtokoll), 'ist ein Array');
  assert.equal(V.getData().uebergabeProtokoll.length, 0, 'startet leer');
});

test('Zug 2 — uebergabeProtokollEintragen legt einen Eintrag mit allen vier Feldern an', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const vorher = V.ungespeichertAnzahl();
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Dr. Müller', zweck: 'Behandlung', umfang: 'Kopie Patientenverfügung', herkunft: 'export:fhir-ips' });
  assert.ok(e.kennung && typeof e.kennung === 'string', 'Kennung vorhanden');
  assert.equal(e.empfaenger, 'Dr. Müller');
  assert.equal(e.zweck, 'Behandlung');
  assert.match(e.zeitpunkt, ISO, 'Zeitpunkt ISO-8601');
  assert.equal(e.herkunft, 'export:fhir-ips');
  assert.equal(V.getData().uebergabeProtokoll.length, 1, 'im Depot gelandet');
  assert.ok(V.ungespeichertAnzahl() > vorher, 'markiert ungespeichert (Autosave-Pfad, Feedback-Regel)');
});

test('[Negativprobe] uebergabeProtokollEintragen wirft ohne Empfänger oder ohne Zweck — kein Halb-Eintrag', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  assert.throws(() => V.uebergabeProtokollEintragen({ empfaenger: '', zweck: 'Behandlung', umfang: 'Kopie' }), /Pflicht/);
  assert.throws(() => V.uebergabeProtokollEintragen({ empfaenger: 'Dr. Müller', zweck: '  ', umfang: 'Kopie' }), /Pflicht/);
  assert.equal(V.getData().uebergabeProtokoll.length, 0, 'kein Eintrag bei fehlenden Pflichtfeldern');
});

test('Jede Kennung ist eindeutig (zwei Einträge, zwei verschiedene Kennungen)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const a = V.uebergabeProtokollEintragen({ empfaenger: 'Amt A', zweck: 'Antrag', umfang: 'Antragsformular', herkunft: 'manuell' });
  const b = V.uebergabeProtokollEintragen({ empfaenger: 'Amt B', zweck: 'Antrag', umfang: 'Antragsformular', herkunft: 'manuell' });
  assert.notEqual(a.kennung, b.kennung);
});

test('delegationsGeschichte/verwalteteDepots bleiben unberührt — anderer Gegenstand (CC-120-M)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.uebergabeProtokollEintragen({ empfaenger: 'Amt A', zweck: 'Antrag', umfang: 'Antragsformular' });
  assert.equal(V.getData().delegationsGeschichte.length, 0, 'Anker-delegationsGeschichte unverändert');
  assert.equal(V.getData().verwalteteDepots.length, 0, 'verwalteteDepots unverändert');
});

test('Abnahme 1 — ein Übergabe-Eintrag übersteht echtes Speichern und erneutes Öffnen (Krypto-Roundtrip)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Dr. Müller', zweck: 'Behandlung', umfang: 'Kopie Patientenverfügung', herkunft: 'export:fhir-ips' });
  const umschlag = await V.depotSerialisieren();

  const K2 = ladeKern();                         // frischer Kontext — kein geteilter State
  await K2.V.depotLaden(umschlag, PW);
  const wieder = K2.V.getData().uebergabeProtokoll;
  assert.equal(wieder.length, 1, 'genau der eine Eintrag kommt zurück');
  assert.equal(wieder[0].kennung, e.kennung);
  assert.equal(wieder[0].empfaenger, 'Dr. Müller');
  assert.equal(wieder[0].zweck, 'Behandlung');
  assert.equal(wieder[0].umfang, 'Kopie Patientenverfügung');
  assert.equal(wieder[0].zeitpunkt, e.zeitpunkt);
  /* F2 (Kette Auftrag 2, Zug 2, 20.08.2026): Beim Öffnen läuft Stufe 67 und versioniert die
     Format-Kennung — `export:fhir-ips` wird `export:fhir-ips@1`. Ohne die Version zeigte dieser
     Eintrag nach einer künftigen Umbenennung ins Leere, und die Datei liegt allein beim Bürger. */
  assert.equal(wieder[0].herkunft, 'export:fhir-ips@1');
  assert.equal(K2.V.getData().schemaVersion, K2.V.SCHEMA_VERSION_AKTUELL, 'auf aktuellen Schema-Stand gehoben nach dem Laden');
});

/* ── Zug 3 — manueller Nachtrag ─────────────────────────────────────────── */

test('Zug 3 — flowUebergabeProtokollManuellErfassen legt einen herkunft:manuell-Eintrag an', async () => {
  const { V, document: dok } = ladeKern();
  await V.depotAnlegen(PW);
  V.flowUebergabeProtokollManuellErfassen();
  dok.getElementById('up-empfaenger').value = 'Nachbarin Frau Kohl';
  dok.getElementById('up-zweck').value = 'Ausdruck übergeben';
  dok.getElementById('up-umfang').value = 'Ausdruck der Patientenverfügung';
  await dok.getElementById('m-ok').onclick();
  const liste = V.getData().uebergabeProtokoll;
  assert.equal(liste.length, 1);
  assert.equal(liste[0].herkunft, 'manuell');
  assert.equal(liste[0].empfaenger, 'Nachbarin Frau Kohl');
});

test('[Negativprobe] leeres Absenden zeigt Inline-Fehler statt stillem Blockieren — kein Halb-Eintrag', async () => {
  const { V, document: dok } = ladeKern();
  await V.depotAnlegen(PW);
  V.flowUebergabeProtokollManuellErfassen();
  dok.getElementById('up-empfaenger').value = '';
  dok.getElementById('up-zweck').value = '';
  await dok.getElementById('m-ok').onclick();
  assert.equal(V.getData().uebergabeProtokoll.length, 0, 'kein Eintrag ohne Empfänger');
  const fehler = dok.getElementById('up-empfaenger-fehler');
  assert.equal(fehler.hidden, false, 'Inline-Fehler wird gezeigt (D48/D49-Muster), kein toter Knopf');
  assert.equal(fehler.textContent, V.STRINGS.uebergabeEmpfaengerPflicht);
});

test('Abnahme 2 — manueller Eintrag ist von einem Export-Eintrag unterscheidbar (Badge in der Liste)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.uebergabeProtokollEintragen({ empfaenger: 'Dr. Müller', zweck: 'Behandlung', umfang: 'Kopie Patientenverfügung', herkunft: 'export:fhir-ips' });
  V.uebergabeProtokollEintragen({ empfaenger: 'Nachbarin Frau Kohl', zweck: 'Ausdruck', umfang: 'Ausdruck der Patientenverfügung', herkunft: 'manuell' });
  const zeilenHtml = V.getData().uebergabeProtokoll.map(e => V.uebergabeProtokollZeileHTML(e));
  const exportZeile  = zeilenHtml.find(h => h.includes('Dr. Müller'));
  const manuellZeile = zeilenHtml.find(h => h.includes('Nachbarin Frau Kohl'));
  assert.ok(!exportZeile.includes(V.STRINGS.uebergabeNachgetragenBadge), 'Export-Eintrag trägt KEIN Nachtrag-Badge');
  assert.ok(manuellZeile.includes(V.STRINGS.uebergabeNachgetragenBadge), 'manueller Eintrag trägt das Nachtrag-Badge');
});

/* ── Zug 4 — Löschbarkeit ───────────────────────────────────────────────── */

test('Zug 4 — uebergabeProtokollLoeschen entfernt den Eintrag vollständig (splice, keine Markierung)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Amt A', zweck: 'Antrag', umfang: 'Antragsformular' });
  const ok = V.uebergabeProtokollLoeschen(e.kennung);
  assert.equal(ok, true);
  assert.equal(V.getData().uebergabeProtokoll.length, 0);
  assert.equal(JSON.stringify(V.getData().uebergabeProtokoll).includes(e.kennung), false, 'keine Spur der Kennung');
});

test('[Negativprobe] uebergabeProtokollLoeschen mit unbekannter Kennung: false, nichts verändert sich', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.uebergabeProtokollEintragen({ empfaenger: 'Amt A', zweck: 'Antrag', umfang: 'Antragsformular' });
  const ok = V.uebergabeProtokollLoeschen('unbekannte-kennung');
  assert.equal(ok, false);
  assert.equal(V.getData().uebergabeProtokoll.length, 1, 'der echte Eintrag bleibt unangetastet');
});

test('flowUebergabeProtokollLoeschen warnt vor dem Löschen (nennt den Empfänger) und löscht erst nach Bestätigung', async () => {
  const { V, document: dok } = ladeKern();
  await V.depotAnlegen(PW);
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Amt A', zweck: 'Antrag', umfang: 'Antragsformular' });
  V.flowUebergabeProtokollLoeschen(e.kennung);
  const warnHtml = dok.getElementById('modal-inhalt').innerHTML;
  assert.ok(warnHtml.includes('Amt A'), 'Warnung nennt den Empfänger');
  assert.equal(V.getData().uebergabeProtokoll.length, 1, 'vor der Bestätigung noch nicht gelöscht');
  await dok.getElementById('m-ok').onclick();
  assert.equal(V.getData().uebergabeProtokoll.length, 0, 'nach der Bestätigung gelöscht');
});

test('Abnahme 3 — nach Löschen + Speichern + erneutem Öffnen ist keine Spur mehr auffindbar', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const bleibt = V.uebergabeProtokollEintragen({ empfaenger: 'Bleibt', zweck: 'Bleibt-Zweck', umfang: 'Bleibt-Umfang' });
  const weg    = V.uebergabeProtokollEintragen({ empfaenger: 'Dr. Gelöscht', zweck: 'Wird gelöscht', umfang: 'Wird-gelöscht-Umfang' });
  V.uebergabeProtokollLoeschen(weg.kennung);
  const umschlag = await V.depotSerialisieren();

  const K2 = ladeKern();
  await K2.V.depotLaden(umschlag, PW);
  const wieder = K2.V.getData().uebergabeProtokoll;
  assert.equal(wieder.length, 1, 'nur der eine verbliebene Eintrag');
  assert.equal(wieder[0].kennung, bleibt.kennung);
  assert.equal(JSON.stringify(wieder).includes('Gelöscht'), false, 'keine Spur des gelöschten Empfängers');
  assert.equal(JSON.stringify(umschlag).includes(weg.kennung), false, 'auch im rohen Umschlag keine Spur (Klartext wäre ohnehin ein Krypto-Bruch)');
});

/* ── Zug 5 — Oberfläche ─────────────────────────────────────────────────── */

test('Zug 5 — leere Liste zeigt den Leer-Hinweis, keinen Fehler', async () => {
  const { V, document: dok } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderUebergabeProtokoll();
  const html = dok.getElementById('content').innerHTML;
  assert.ok(html.includes(V.STRINGS.uebergabeProtokollLeer));
  assert.ok(html.includes('id="uebergabe-add"'), 'Neuer-Eintrag-Knopf ist da, auch bei leerer Liste');
});

test('Zug 5 — Liste zeigt Empfänger, Zweck, Datum und je eine Zurücknehmen-/Löschen-Aktion', async () => {
  const { V, document: dok } = ladeKern();
  await V.depotAnlegen(PW);
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Dr. Müller', zweck: 'Behandlung', umfang: 'Kopie Patientenverfügung' });
  V.renderUebergabeProtokoll();
  const html = dok.getElementById('content').innerHTML;
  assert.ok(html.includes('Dr. Müller'));
  assert.ok(html.includes('Behandlung'));
  assert.ok(html.includes('data-uebergabe-zuruecknehmen="' + e.kennung + '"'), 'Rücknahme-Weg AM Eintrag (kein eigener Menüpunkt)');
  assert.ok(html.includes('data-uebergabe-loeschen="' + e.kennung + '"'));
});

test('Zug 5 — oeffneUebergabeProtokoll setzt die Ansicht (kein eigener Menüpunkt „Widerruf" nötig, gleicher Ort)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.oeffneUebergabeProtokoll();
  assert.equal(V.getViewState().aktiveAnsicht, 'uebergabe-protokoll');
});

/* ── Zug 6 — Wahrhaftigkeits-Hinweis (Abnahme 5: VOR der Erzeugung, nicht danach) ────────── */

test('Abnahme 5 — der Wirkungsgrenzen-Hinweis erscheint VOR der Erzeugung, nicht danach', async () => {
  const { V, document: dok } = ladeKern();
  await V.depotAnlegen(PW);
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Dr. Müller', zweck: 'Behandlung', umfang: 'Kopie Patientenverfügung' });
  V.flowUebergabeWiderrufErzeugen(e.kennung);
  const html = dok.getElementById('modal-inhalt').innerHTML;
  assert.ok(html.includes(V.STRINGS.uebergabeWiderrufHinweisText), 'Hinweistext steht, bevor irgendein Artefakt entsteht');
  assert.ok(!/Häkchen|checkbox/i.test(html), 'kein Häkchen, das Löschung beim Empfänger suggeriert (ADR-120 §5, wörtlich)');
});

/* ── Zug 7 — Widerruf-Artefakt: lesbar + maschinenlesbar, Kennung verweist auf den Eintrag ── */

test('uebergabeWiderrufNutzlast — maschinenlesbare Nutzlast trägt die Kennung des Ursprungseintrags', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Dr. Müller', zweck: 'Behandlung', umfang: 'Kopie Patientenverfügung' });
  const nutzlast = V.uebergabeWiderrufNutzlast(e);
  assert.equal(nutzlast.typ, 'vivodepot-widerruf');
  assert.equal(nutzlast.kennung, e.kennung, 'Kennung verweist auf den ursprünglichen Eintrag');
  assert.equal(nutzlast.empfaenger, 'Dr. Müller');
  assert.match(nutzlast.widerrufZeitpunkt, ISO);
});

// Fake jsPDF-Dokument: zeichnet nichts wirklich, zeichnet nur AUF, was aufgerufen wurde —
// genug, um zeichneWiderrufPdf ohne die echte (nur inline im Browser vorhandene) Lib zu prüfen.
// A477 (22.08.2026): internal.pageSize/addPage/setPage ergänzt (Bauart wie in gesamt-pdf.test.js)
// — die Höhe in mm (echtes A4-Format des Widerruf-PDFs, s. `unit: 'mm'` in uebergabeWiderrufPdfErzeugen).
function fakeDoc(opt) {
  const texte = [];
  const bilder = [];
  let seiten = 1;
  // splitTextToSize bricht wie im echten jsPDF nach SPALTENBREITE um (Zeichen je Zeile), nicht
  // pauschal nach Textlänge — sonst würden auch kurze Felder (Datum, Kennung) künstlich
  // mehrzeilig und der Test könnte "kurzer Zweck" und "langer Zweck" nicht unterscheiden.
  // opt.zeichenJeZeile Default: sehr breit (praktisch nie Umbruch), s. A477-Proben für den Wert,
  // der echten Umbruch auslöst.
  const zeichenJeZeile = (opt && opt.zeichenJeZeile) || 100000;
  return {
    _texte: texte, _bilder: bilder,
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 }, getNumberOfPages: () => seiten },
    setFont() {}, setFontSize() {}, setTextColor() {},
    // PDF-Titel-Pflicht (18.09.2026): uebergabeWiderrufPdfErzeugen() ruft jetzt setProperties()
    // an der Erzeugung — derselbe Stub-Nachtrag wie in nur-pdf-einziges-format.test.js.
    setProperties() {},
    text(t) { texte.push(Array.isArray(t) ? t.join(' ') : String(t)); },
    splitTextToSize(t) {
      const s = String(t);
      const n = Math.max(1, Math.ceil(s.length / zeichenJeZeile));
      const stueck = Math.ceil(s.length / n) || s.length;
      return Array.from({ length: n }, (_, i) => s.slice(i * stueck, i * stueck + stueck) || s);
    },
    addImage(dataUrl) { bilder.push(dataUrl); },
    addPage() { seiten += 1; },
    output() { return 'stub-blob'; },
  };
}

test('Abnahme 6 — das PDF ist lesbar (Empfänger/Zweck/Kennung im Text) und trägt den QR (maschinenlesbar)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Dr. Müller', zweck: 'Behandlung', umfang: 'Kopie Patientenverfügung' });
  const nutzlast = V.uebergabeWiderrufNutzlast(e);
  const doc = fakeDoc();
  V.zeichneWiderrufPdf(doc, e, nutzlast, 'data:image/png;base64,FAKE');
  const text = doc._texte.join(' | ');
  assert.ok(text.includes('Dr. Müller'), 'Empfänger im lesbaren Text');
  assert.ok(text.includes('Behandlung'), 'Zweck im lesbaren Text');
  assert.ok(text.includes(e.kennung), 'Kennung im lesbaren Text — verweist auf den Eintrag (Abnahme 6, wörtlich)');
  assert.deepEqual(doc._bilder, ['data:image/png;base64,FAKE'], 'QR-Bild eingebettet — maschinenlesbarer Teil');
});

/* ══ A477 · Seitenumbruch — ein langer Zweck darf die Kennung nicht vom Blatt schieben ══ */

test('[A477·Rot-Beweis] ein sehr langer Zweck löst einen Seitenumbruch aus — die Kennung bleibt lesbar', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const langerZweck = 'Ein sehr ausführlicher Übergabezweck. '.repeat(100);   // ~3900 Zeichen
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Dr. Müller', zweck: langerZweck, umfang: 'Kopie Patientenverfügung' });
  const nutzlast = V.uebergabeWiderrufNutzlast(e);
  const doc = fakeDoc({ zeichenJeZeile: 50 });   // simuliert echten Zeilenumbruch nach Breite
  V.zeichneWiderrufPdf(doc, e, nutzlast, null);
  assert.ok(doc.internal.getNumberOfPages() > 1, 'ein Blatt reicht bei diesem Zweck nicht mehr — addPage() muss gelaufen sein');
  assert.ok(doc._texte.join(' ').includes(e.kennung), 'die Kennung bleibt Teil des gezeichneten Texts, egal wie lang der Zweck ist');
});

test('[A477·Gegenprobe] ein kurzer Zweck bleibt bei einer Seite (kein unnötiger Umbruch)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Dr. Müller', zweck: 'Behandlung', umfang: 'Kopie Patientenverfügung' });
  const nutzlast = V.uebergabeWiderrufNutzlast(e);
  const doc = fakeDoc({ zeichenJeZeile: 50 });
  V.zeichneWiderrufPdf(doc, e, nutzlast, null);
  assert.equal(doc.internal.getNumberOfPages(), 1, 'ein kurzer Zweck braucht kein zweites Blatt');
  assert.ok(doc._texte.join(' ').includes(e.kennung));
});

test('ohne QR-Lib (window.qrcode fehlt): PDF entsteht trotzdem, nur ohne Bild — kein Absturz', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Dr. Müller', zweck: 'Behandlung', umfang: 'Kopie Patientenverfügung' });
  const nutzlast = V.uebergabeWiderrufNutzlast(e);
  const doc = fakeDoc();
  V.zeichneWiderrufPdf(doc, e, nutzlast, null);
  assert.equal(doc._bilder.length, 0, 'kein Bild ohne QR-Daten');
  assert.ok(doc._texte.join(' ').includes(e.kennung), 'Text bleibt vollständig, auch ohne QR');
});

test('flowUebergabeWiderrufErzeugen end-to-end: Hinweis bestätigen -> PDF wird ausgegeben (kein Netzverkehr, Abnahme 8 — Blob/URL/Datei sind rein lokal)', async () => {
  let gebautesDoc = null;
  const FakeJsPdf = class { constructor() { gebautesDoc = fakeDoc(); return gebautesDoc; } };
  const fakeQr = () => ({ addData() {}, make() {}, createDataURL: () => 'data:image/png;base64,FAKE' });
  const { V, document: dok } = ladeKern({ jspdf: { jsPDF: FakeJsPdf }, qrcode: fakeQr, Blob: function (parts) { this.parts = parts; } });
  await V.depotAnlegen(PW);
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Dr. Müller', zweck: 'Behandlung', umfang: 'Kopie Patientenverfügung' });
  V.flowUebergabeWiderrufErzeugen(e.kennung);
  await dok.getElementById('m-ok').onclick();
  assert.ok(gebautesDoc, 'ein PDF-Dokument wurde tatsächlich gebaut (nicht nur der Hinweis gezeigt)');
  assert.ok(gebautesDoc._texte.join(' ').includes(e.kennung), 'die Kennung steht im erzeugten PDF');
});

/* ══ D.3 (Rest-Sichten, 26.08.2026) — Anfragen-Ort hinter <details>, offen bei m.anzahl > 0 ══
   Der Zustand "leer" allein reicht nicht: eine bereits beantwortete oder abgelaufene Anfrage
   ist nicht "offen" im Sinn von ANFRAGE_ZUSTAENDE, gehört aber trotzdem sofort sichtbar —
   darum m.anzahl (jede vorhandene Anfrage), nicht m.nachZustand.offen. */

test('[anfragenOrtHTML] leerer Fall: details ist ZU', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const html = V.anfragenOrtHTML();
  const details = html.match(/<details class="anfragen-ort"[^>]*>/);
  assert.ok(details, 'ein details-Element mit dieser Klasse steht im Markup');
  assert.ok(!details[0].includes(' open'), 'ohne Anfrage bleibt es zu');
});

test('[anfragenOrtHTML] mindestens eine Anfrage vorhanden (auch beantwortet/nicht offen): details ist OFFEN', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  // Fixture: eine bereits beantwortete Anfrage (Zustand "beantwortet", nicht "offen") — testet
  // ausdrücklich m.anzahl > 0 statt der zu engen "nur bei Zustand offen"-Bedingung.
  V.getData().anfragen = [{ id: 'a1', zustand: 'beantwortet', zweck: 'Test' }];
  const html = V.anfragenOrtHTML();
  const details = html.match(/<details class="anfragen-ort"[^>]*>/);
  assert.ok(details);
  assert.ok(details[0].includes(' open'), 'muss bei JEDER vorhandenen Anfrage offen sein, nicht nur bei Zustand "offen"');
});
