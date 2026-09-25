'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Dokumenten-Mappe Schritt 5 (U2-ADR-013): Vorschau + Suche
   ────────────────────────────────────────────────────────────────────────
   Suche Stufe 1 über Beschriftung/Dateiname/Bereich (id + Bürger-Label),
   case-insensitiv. Vorschau: Bild im Modal, PDF im Browser-Viewer (iframe),
   sonst dezenter Hinweis. Das eigentliche Bild-/PDF-Rendering ist Browser-
   Sache; hier geprüft: Filter (rein) + welcher Modal-Inhalt erzeugt wird.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

async function mitEintraegen() {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  const bild = V.mappeEintragHinzufuegen({ beschriftung: 'Ausweis-Kopie', bereich: 'identity', mime: 'image/jpeg', inhalt: 'data:image/jpeg;base64,AAA' });
  const pdf = V.mappeEintragHinzufuegen({ beschriftung: 'Patientenverfügung', bereich: 'advanceCare', mime: 'application/pdf', inhalt: 'data:application/pdf;base64,JVBER' });
  const txt = V.mappeEintragHinzufuegen({ beschriftung: 'Notiz', dateiname: 'notiz.bin', mime: 'application/octet-stream', inhalt: 'data:;base64,QQ' });
  return { V, document, bild, pdf, txt };
}

test('mappeSuche: filtert über Beschriftung, Dateiname, Bereich-id und Bürger-Label (case-insensitiv)', async () => {
  const { V } = await mitEintraegen();
  const alle = V.getData().mappe;
  assert.equal(V.mappeSuche(alle, '').length, 3, 'leere Anfrage → alle');
  assert.equal(V.mappeSuche(alle, 'ausweis').length, 1, 'Beschriftung');
  assert.equal(V.mappeSuche(alle, 'NOTIZ.BIN').length, 1, 'Dateiname, case-insensitiv');
  assert.equal(V.mappeSuche(alle, 'advanceCare').length, 1, 'Bereich-id');
  assert.equal(V.mappeSuche(alle, 'Vorsorge & Recht').length, 1, 'Bürger-Bereich-Label');
  assert.equal(V.mappeSuche(alle, 'identität').length, 1, 'Label „Identität & Person"');
  assert.equal(V.mappeSuche(alle, 'gibtsnicht').length, 0, 'kein Treffer');
});

test('renderMappe: Suchfeld + Listen-Host vorhanden (sobald Einträge da sind)', async () => {
  const { V, document } = await mitEintraegen();
  V.betreteApp();
  V.oeffneMappe();
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('id="mappe-suche"'), 'Suchfeld');
  assert.ok(html.includes('id="mappe-liste-host"'), 'Listen-Host');
  assert.ok(html.includes('mappe-liste-thumb'), 'Bild-Eintrag zeigt Thumbnail');
  assert.ok(html.includes('Patientenverfügung'), 'PDF-Eintrag gelistet');
});

test('mappeListeHTML: leere (gefilterte) Liste → „kein Treffer"-Hinweis', async () => {
  const { V } = await mitEintraegen();
  const html = V.mappeListeHTML([]);
  assert.ok(html.includes(V.STRINGS.mappeKeinTreffer), 'kein-Treffer-Hinweis');
  assert.ok(!html.includes('mappe-eintrag'), 'keine Einträge');
});

test('flowMappeVorschau: Bild → <img> im Modal; PDF → <iframe>; sonst Hinweis', async () => {
  const { V, document, bild, pdf, txt } = await mitEintraegen();
  V.flowMappeVorschau(bild);
  let m = document.getElementById('modal-inhalt').innerHTML;
  assert.ok(m.includes('mappe-vorschau-bild') && m.includes('<img'), 'Bild im Modal');
  assert.ok(m.includes('Ausweis-Kopie'), 'Titel = Beschriftung');
  assert.ok(!m.includes('id="m-abbr"'), 'nur Schließen, kein Abbrechen');

  V.flowMappeVorschau(pdf);
  m = document.getElementById('modal-inhalt').innerHTML;
  assert.ok(m.includes('mappe-vorschau-pdf') && m.includes('<iframe'), 'PDF im Viewer');

  V.flowMappeVorschau(txt);
  m = document.getElementById('modal-inhalt').innerHTML;
  assert.ok(m.includes(V.STRINGS.mappeKeineVorschau), 'sonst dezenter Hinweis');
});
