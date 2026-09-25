'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — xShare Yellow Button: das Zeichen sitzt an der Funktion (Nachtrag U2-ADR-400, 16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Produktentscheidung 16.09.2026: das Programmzeichen steht am Knopf der drei Funktionen,
   die dem Yellow-Button-Standard folgen — Herunterladen (autoritatives Original), Hochladen
   (Labor-/Entlassbefund), einmaliges Teilen (SHL) — und bleibt bei White Label stehen, weil
   es den Standard benennt, nicht den Sprecher.

   Geprüft am erzeugten Modal-/Dialog-HTML, nicht am Quelltext: dieselben Flows, die die
   Bürgerin öffnet. Rot-Beweise: ein NICHT autoritativer Eintrag trägt beim Herunterladen
   KEIN Zeichen, ein Nicht-Yellow-Button-Import auch nicht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
const FIXTURE = path.join(__dirname, 'fixtures', 'eigenprobe-eu-lab.json');
const PNG_SIGNATUR = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

async function frisch() {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.importAutoritativDokument(fs.readFileSync(FIXTURE, 'utf8'));
  assert.ok(id, 'Fixture wird als autoritativer Eintrag abgelegt');
  return { V, document, id };
}
const modal = (document) => document.getElementById('modal-inhalt').innerHTML;

test('[YB-Zeichen] drei eingebettete Zeichen sind echte PNG-Dateien, je Funktion eines', () => {
  const { V } = ladeKern();
  for (const funktion of ['download', 'upload', 'share']) {
    const html = V.ybZeichenHTML(funktion);
    const m = /src="data:image\/png;base64,([A-Za-z0-9+/=]+)"/.exec(html);
    assert.ok(m, funktion + ': data:-URI vorhanden');
    const bytes = Buffer.from(m[1], 'base64');
    assert.ok(bytes.subarray(0, 8).equals(PNG_SIGNATUR), funktion + ': PNG-Signatur');
    assert.ok(bytes.length < 16 * 1024, funktion + ': verkleinert (unter 16 KB)');
    assert.match(html, new RegExp('data-yb-zeichen="' + funktion + '"'));
    assert.match(html, /alt="xShare Yellow Button"/);
  }
  assert.equal(V.ybZeichenHTML('gibtsnicht'), '', 'unbekannte Funktion → kein Zeichen');
});

test('[YB-Zeichen] Herunterladen und Teilen eines autoritativen Originals tragen das Zeichen', async () => {
  const { V, document, id } = await frisch();
  V.flowMappeVorschau(id);
  const html = modal(document);
  assert.match(html, /data-mappe-herunterladen="[^"]+">[^]*?data-yb-zeichen="download"/, 'Herunterladen');
  assert.match(html, /data-mappe-shl="[^"]+">[^]*?data-yb-zeichen="share"/, 'Sicher weitergeben');
});

test('[YB-Zeichen] der Teilen-Dialog selbst zeigt das Zeichen', async () => {
  const { V, document, id } = await frisch();
  await V.flowShlVorbereiten(id);
  assert.match(modal(document), /data-yb-zeichen="share"/);
});

test('[YB-Zeichen] der Hochladen-Dialog für Labor-/Entlassbefund zeigt das Zeichen', async () => {
  const { V, document } = await frisch();
  V.flowImportDatei('fhir-lab');
  assert.match(modal(document), /data-yb-zeichen="upload"/);
});

test('[YB-Zeichen·Rot-Beweis] ein eigenes (nicht autoritatives) Dokument trägt beim Herunterladen KEIN Zeichen', async () => {
  const { V, document } = await frisch();
  const eigen = V.mappeEintragHinzufuegen({ beschriftung: 'Scan', mime: 'application/pdf', inhalt: 'data:application/pdf;base64,JVBER' });
  V.flowMappeVorschau(eigen);
  const html = modal(document);
  assert.match(html, /data-mappe-herunterladen=/, 'Knopf ist da');
  assert.doesNotMatch(html, /data-yb-zeichen=/, 'aber ohne Yellow-Button-Zeichen');
});

test('[YB-Zeichen·Rot-Beweis] ein Import außerhalb des Yellow-Button-Standards trägt KEIN Zeichen', async () => {
  const { V, document } = await frisch();
  V.flowImportDatei('json');
  assert.doesNotMatch(modal(document), /data-yb-zeichen=/);
});

test('[YB-Zeichen] bei White Label (angedocktes Branding-Modul) bleibt das Zeichen stehen', async () => {
  const { V, document, id } = await frisch();
  V.akteurSelbstErklaeren('Tester');
  const d = V.getData();
  d.brandingModule = [{
    modulTyp: 'branding', moduleVersion: 1, herkunft: 'achsentest-yb-zeichen',
    name: 'Muster-Partner', domain: 'muster-partner.example',
    farbePrimaer: '#2E5C8A', farbeSekundaer: '#F2A900', schriftart: 'Inter', logo: null,
  }];
  V.setData(d);
  V.flowMappeVorschau(id);
  const html = modal(document);
  assert.match(html, /data-yb-zeichen="download"/);
  assert.match(html, /data-yb-zeichen="share"/);
});
