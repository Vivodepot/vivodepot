'use strict';
/* Die Antwort auf eine Anfrage geht auf allen drei Wegen hinaus: maschinenlesbar (Datei, Link), als PDF und als QR-Code
   (Regel der Produktverantwortung 10.11.2026 und 14.11.2026: Maschine, PDF, QR). Heute bietet die Wahl nach „Antworten“
   Herunterladen (.jwe), Link senden und die QR-Serie; eine PDF der Antwort fehlt.
   Die Probe liest die eine Aufrufstelle der Wahl in der Antwort und verlangt dort einen PDF-Weg, und sie verlangt, dass die Wahl
   selbst einen PDF-Knopf führt.
   Geschlossen am 20.11.2026 (TODESFALL B): die Antwort ruft die Wahl mit `pdfAusgeben`, die Wahl führt „Als PDF“ als zweiten Knopf.
   ROT-BEWEIS: ohne `pdfAusgeben` (Stand vor dem Fix: herunterladen, linkSenden, qrZeigen und nichts weiter) ist die Probe rot; die
   zweite Probe hält das fest. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Antwort · PDF] die Wahl nach „Antworten“ führt einen PDF-Weg', () => {
  const { V, html } = ladeKern();
  const a = html.indexOf('function _anfrageAntwortSchreiben(');
  const rumpf = html.slice(a, html.indexOf('\n}\n', a));
  const aufruf = /_ausgabeWegWaehlen\(STRINGS\.anfrageAntwortenCta,([^)]*)\)/.exec(rumpf);
  assert.ok(aufruf, 'Vorbedingung: die Antwort ruft die Wahl');
  const rufe = [];
  V.ui.modal = (opt) => { rufe.push(opt); return () => {}; };
  V._ausgabeWegWaehlen('Antworten', 'antwort.jwe', () => {}, () => {}, () => {}, () => {});
  const knoepfe = rufe.length ? [rufe[0].primaerLabel, rufe[0].zweitAktion && rufe[0].zweitAktion.label, rufe[0].drittAktion && rufe[0].drittAktion.label].filter(Boolean) : [];
  assert.ok(/pdf/i.test(aufruf[1]) || knoepfe.some((k) => /pdf/i.test(String(k))),
    'die Antwort geht nur als Datei, Link oder QR-Serie hinaus (' + aufruf[1].trim() + '; Knöpfe: ' + knoepfe.join(' / ') + '); eine PDF fehlt');
});

test('[Antwort · PDF · Rot-Beweis] ohne pdfAusgeben bietet die Wahl kein PDF, mit ihm steht „Als PDF“ als zweiter Knopf und der Satz zur Verschlüsselung', () => {
  const { V } = ladeKern();
  const rufe = [];
  V.ui.modal = (opt) => { rufe.push(opt); return () => {}; };
  V._ausgabeWegWaehlen('Antworten', 'antwort.jwe', () => {}, () => {}, () => {});
  const ohne = [rufe[0].primaerLabel, rufe[0].zweitAktion && rufe[0].zweitAktion.label, rufe[0].drittAktion && rufe[0].drittAktion.label];
  assert.ok(!ohne.some((k) => /pdf/i.test(String(k))), 'ohne den Weg kein PDF-Knopf: ' + ohne.join(' / '));
  assert.ok(!/ausgabe-pdf-hinweis/.test(rufe[0].koerperHTML));
  V._ausgabeWegWaehlen('Antworten', 'antwort.jwe', () => {}, () => {}, () => {}, () => {});
  assert.equal(rufe[1].zweitAktion.label, V.STRINGS.antwortPdfKnopf);
  assert.equal(rufe[1].drittAktion.label, V.STRINGS.antwortQrKnopf);
  assert.match(rufe[1].nebenwegHTML, /id="ausgabe-link-senden"/, '„Link senden“ bleibt als Zweitweg');
  assert.match(rufe[1].koerperHTML, /id="ausgabe-pdf-hinweis"/);
  assert.ok(rufe[1].koerperHTML.includes(V.escapeHTML(V.STRINGS.antwortPdfUnverschluesselt)), 'der Satz zur Verschlüsselung steht an der Wahl');
});
