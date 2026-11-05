'use strict';
/* ═════════════════════════════════════════════════════════════════════════
   Befund UX-DOKUMENT-ABLEGEN (Usability-Durchlauf v963, 30.10.2026)
   ─────────────────────────────────────────────────────────────────────────
   Eine PDF ließ sich nur über „Meine Dokumente“ › „Dokument hinzufügen“ ablegen.
   Wer sie in einem Bereich über „Datei in diesen Bereich einlesen“ versuchte,
   bekam „nicht erkannt“ und keinen Weg weiter. „Was hier hineingehört“ in
   „Meine Dokumente“ verließ die Seite und hatte keinen Rückweg.

   Abnahme: In jedem Bereich steht unter „Dokumente & Austausch“ der Knopf
   „Dokument ablegen (PDF, Foto)“. Eine PDF beim Einlesen bekommt die Meldung
   „Eine PDF wird nicht eingelesen, aber Sie können sie ablegen.“ mit dem Knopf
   „Als Dokument ablegen“, der den Ablage-Dialog mit dem Bereich vorgewählt öffnet;
   eine PDF aus Gesundheit liegt danach in „Meine Dokumente“. „Was hier
   hineingehört“ öffnet als Dialog mit „Schließen“.

   Rot-Beweis: auf dem Stand vor dem Fix fehlt der Knopf in den Bereichen, das
   Einlesen einer PDF endet ohne Dialog, und „Was hier hineingehört“ wechselt die Ansicht.
   ═════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'dokument-ablegen-pw-981';
const PDF = new Uint8Array(Buffer.from('%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n', 'latin1'));

async function frischMitDepot() {
  const k = ladeKern({ zusatzBindungen: ['bereicheAlle'] });
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  k.V.betreteApp();
  return k;
}
function pdfDatei(name) {
  return { name, type: 'application/pdf', size: PDF.length, arrayBuffer: async () => PDF.buffer.slice(PDF.byteOffset, PDF.byteOffset + PDF.length) };
}
const modal = (document) => document.getElementById('modal-inhalt').innerHTML;
async function pdfEinlesen(V, document, sektorId, name) {
  V.flowImportAuto(sektorId);
  document.getElementById('i-datei-auto').files = [pdfDatei(name)];
  await document.getElementById('m-ok').onclick();
}

test('[Dokument ablegen] in jedem Bereich steht unter „Dokumente & Austausch“ „Dokument ablegen (PDF, Foto)“', async () => {
  const { V, document } = await frischMitDepot();
  assert.equal(V.STRINGS.bereichDokumentAblegen, 'Dokument ablegen (PDF, Foto)');
  const bereiche = V.__zusatz.bereicheAlle();
  assert.ok(bereiche.length > 10, 'alle Bereiche sind gelesen');
  for (const s of bereiche) {
    V.oeffneSektor(s.id);
    const html = document.getElementById('content').innerHTML;
    const block = html.slice(html.indexOf('class="zusatz-aktionen"'));
    assert.ok(html.includes('class="zusatz-aktionen"'), s.id + ': der Block „Dokumente & Austausch“ steht da');
    assert.ok(block.includes('data-dokument-ablegen="' + s.id + '"'), s.id + ': der Knopf steht im Block');
    assert.ok(block.includes(V.STRINGS.bereichDokumentAblegen), s.id + ': der Knopf trägt seinen Text');
  }
});

test('[Dokument ablegen] eine PDF aus Gesundheit: Meldung mit Ausweg, Ablage-Dialog mit Gesundheit vorgewählt, danach in „Meine Dokumente“', async () => {
  const { V, document } = await frischMitDepot();
  const vorher = (V.getData().mappe || []).length;
  await pdfEinlesen(V, document, 'health', 'Befund.pdf');
  const meldung = modal(document);
  assert.ok(meldung.includes('Eine PDF wird nicht eingelesen, aber Sie können sie ablegen.'), 'die Meldung nennt den Ausweg');
  assert.ok(meldung.includes('>Als Dokument ablegen</button>'), 'der Ausweg ist ein Knopf');
  await document.getElementById('m-ok').onclick();
  const dialog = modal(document);
  assert.ok(dialog.includes(V.STRINGS.mappeHinzufuegenTitel), 'der Ablage-Dialog aus „Meine Dokumente“ ist offen');
  assert.match(dialog, /mappe-bereich-opt aktiv" data-bereich="health"/, 'Gesundheit ist vorgewählt');
  assert.ok(dialog.includes('<strong>Befund.pdf</strong>'), 'oben steht die gewählte Datei');
  assert.ok(dialog.includes('data-mappe-andere-datei>' + V.STRINGS.mappeAndereDatei + '</button>'), 'mit „Andere Datei wählen“');
  await document.getElementById('m-ok').onclick();
  const mappe = V.getData().mappe || [];
  assert.equal(mappe.length, vorher + 1, 'genau ein neues Dokument');
  const neu = mappe[mappe.length - 1];
  assert.equal(neu.mime, 'application/pdf');
  assert.equal(neu.dateiname, 'Befund.pdf');
  assert.ok(String(neu.inhalt).startsWith('data:application/pdf;base64,'), 'die Bytes liegen unverändert als PDF');
});

test('[Dokument ablegen] „Was hier hineingehört“ öffnet als Dialog mit „Schließen“ und lässt „Meine Dokumente“ stehen', async () => {
  const { V, document } = await frischMitDepot();
  V.oeffneMappe();
  const vorher = document.getElementById('content').innerHTML;
  document.getElementById('mappe-bestand-link').onclick();
  const dialog = modal(document);
  assert.ok(dialog.includes('<h3 id="modal-titel">' + V.STRINGS.navBestand + '</h3>'), 'der Dialog trägt den Titel');
  assert.ok(dialog.includes('data-lage="'), 'der Dialog zeigt die Lebenslagen');
  assert.ok(dialog.includes('>' + V.STRINGS.btnSchliessen + '</button>'), 'der Dialog hat „Schließen“');
  assert.equal(document.getElementById('content').innerHTML, vorher, '„Meine Dokumente“ bleibt stehen');
});

// Wächter gegen die Klasse: aus keinem Bereich endet eine PDF beim Einlesen ohne Ausweg, und der Ausweg legt sie im selben
// Bereich ab. Ganzes Depot (ohne Bereich) bietet die Ablage ohne Vorwahl an.
test('[Dokument ablegen·Wächter] aus keinem Bereich endet eine PDF beim Einlesen ohne Ausweg', async () => {
  const { V, document } = await frischMitDepot();
  const ziele = V.__zusatz.bereicheAlle().map((s) => s.id).concat([undefined]);
  for (const b of ziele) {
    await pdfEinlesen(V, document, b, 'Brief.pdf');
    assert.ok(modal(document).includes('>Als Dokument ablegen</button>'), 'Bereich ' + b + ': die Meldung bietet die Ablage an');
    await document.getElementById('m-ok').onclick();
    const dialog = modal(document);
    assert.ok(dialog.includes(V.STRINGS.mappeHinzufuegenTitel), 'Bereich ' + b + ': der Ablage-Dialog ist offen');
    if (b) assert.ok(dialog.includes('mappe-bereich-opt aktiv" data-bereich="' + b + '"'), 'Bereich ' + b + ' ist vorgewählt');
  }
});
