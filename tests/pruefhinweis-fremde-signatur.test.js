'use strict';
/* Prüfhinweis beim Weitergeben eines Originals mit fremder Signatur (14.10.2026, Option O2 des Berichts zur Übergabe an
   Fachverfahren): Vivodepot prüft nicht; der Dialog des Mappe-Eintrags sagt, wer prüft und womit.
   - EDC und Open Badge nennen die offizielle Prüfstelle im Hinweis (Adresse als Text, kein Link).
   - FHIR-Dokumente und PDF bekommen einen Satz nur bei ERKANNTER Signatur; ohne sie steht nichts da.
   - Zu jedem Prüfhinweis gehört ein Text zum Markieren und Kopieren; die Zwischenablage wird nicht angefasst. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
const FX = path.join(__dirname, 'fixtures');
const LAB = fs.readFileSync(path.join(FX, 'eigenprobe-eu-lab.json'), 'utf8');
const modal = (document) => document.getElementById('modal-inhalt').innerHTML;
const ABLEGEN = (V, datei) => V.importAutoritativDokument(fs.readFileSync(path.join(FX, datei), 'utf8'), new Uint8Array(fs.readFileSync(path.join(FX, datei))));

async function frisch() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}
function pdfDatenUrl(inhalt) { return 'data:application/pdf;base64,' + Buffer.from(inhalt, 'latin1').toString('base64'); }

test('[Prüfhinweis] ein EDC nennt den Europass-Viewer als Text und trägt den Text zum Kopieren', async () => {
  const { V, document } = await frisch();
  const id = ABLEGEN(V, 'edci-europass-certofpart-signed.jsonld');
  assert.ok(id);
  V.flowMappeVorschau(id);
  const html = modal(document);
  assert.match(html, /europa\.eu\/europass\/digital-credentials\/viewer/, 'Prüfstelle im Hinweis');
  assert.match(html, /data-pruef-kopie-text[^>]*>[^<]*europa\.eu\/europass\/digital-credentials\/viewer/, 'Prüfstelle im Text zum Kopieren');
  assert.doesNotMatch(html, /href="https?:\/\/europa\.eu/, 'Adresse ist Text, kein Link');
});

test('[Prüfhinweis] ein Open Badge nennt den 1EdTech-Verifier als Text', async () => {
  const { V, document } = await frisch();
  const id = ABLEGEN(V, 'ob3-simple.json');
  assert.ok(id);
  V.flowMappeVorschau(id);
  const html = modal(document);
  assert.match(html, /vc\.1ed\.tech/);
  assert.doesNotMatch(html, /href="https?:\/\/vc\.1ed\.tech/, 'Adresse ist Text, kein Link');
});

test('[Prüfhinweis·Rot-Beweis] ein Gesundheitsoriginal OHNE erkannte Signatur bekommt gar keinen Prüfhinweis', async () => {
  const { V, document } = await frisch();
  const id = V.importAutoritativDokument(LAB);
  assert.ok(id);
  assert.equal(V.mappePruefArt(V.mappeEintrag(id)), null);
  V.flowMappeVorschau(id);
  const html = modal(document);
  assert.doesNotMatch(html, /data-pruef-kopie/, 'kein Text zum Kopieren');
  assert.doesNotMatch(html, /trägt eine Signatur/, 'kein Satz zur Signatur');
});

test('[Prüfhinweis] ein FHIR-Dokument MIT Signatur im Bündel bekommt den Satz ohne Adresse', async () => {
  const { V, document } = await frisch();
  const bundle = JSON.parse(LAB);
  bundle.signature = { type: [{ system: 'urn:iso-astm:E1762-95:2013', code: '1.2.840.10065.1.12.1.1' }], when: '2026-10-01T10:00:00Z', who: { display: 'Muster-Labor' }, sigFormat: 'application/jose', data: 'ZXlK' };
  const id = V.importAutoritativDokument(JSON.stringify(bundle));
  assert.ok(id, 'das signierte Bündel wird als Original abgelegt');
  assert.equal(V.mappePruefArt(V.mappeEintrag(id)), 'signatur');
  V.flowMappeVorschau(id);
  const html = modal(document);
  assert.match(html, /trägt eine Signatur/);
  assert.doesNotMatch(html, /europa\.eu|vc\.1ed\.tech|digital-building-blocks/, 'keine Adresse bei FHIR');
  assert.match(html, /das übliche Prüfwerkzeug Ihrer Stelle/, 'der Text zum Kopieren sagt „das übliche Prüfwerkzeug“');
});

test('[Prüfhinweis] ein PDF mit Signaturfeld bekommt den Satz, ein PDF ohne nicht', async () => {
  const { V, document } = await frisch();
  const mit = V.mappeEintragHinzufuegen({ beschriftung: 'Bescheid', mime: 'application/pdf', inhalt: pdfDatenUrl('%PDF-1.7\n1 0 obj\n<< /Type /Sig /ByteRange [0 100 200 300] /Contents <00> >>\nendobj\n') });
  const ohne = V.mappeEintragHinzufuegen({ beschriftung: 'Scan', mime: 'application/pdf', inhalt: pdfDatenUrl('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n') });
  assert.equal(V.mappePruefArt(V.mappeEintrag(mit)), 'signatur');
  assert.equal(V.mappePruefArt(V.mappeEintrag(ohne)), null);
  V.flowMappeVorschau(mit);
  assert.match(modal(document), /trägt eine Signatur/);
  assert.doesNotMatch(modal(document), /europa\.eu|digital-building-blocks/, 'keine Prüfadresse beim PDF');
  V.flowMappeVorschau(ohne);
  assert.doesNotMatch(modal(document), /trägt eine Signatur|data-pruef-kopie/);
});

test('[Prüfhinweis·Wächter] keine Zwischenablage, keine Links auf die Prüfstellen im Kern', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.equal(/navigator\.clipboard/.test(kern), false, 'der Text wird markiert, nicht in die Zwischenablage geschrieben');
  assert.equal(/href\s*=\s*["'`]https?:\/\/(europa\.eu\/europass|vc\.1ed\.tech|ec\.europa\.eu\/digital-building-blocks)/.test(kern), false);
});

test('[Prüfhinweis·Wächter·Rot-Beweis] eine Zwischenablage-Nutzung würde erkannt', () => {
  assert.equal(/navigator\.clipboard/.test('await navigator.clipboard.writeText(t);'), true);
});
