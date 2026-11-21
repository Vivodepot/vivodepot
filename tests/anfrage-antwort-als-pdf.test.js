'use strict';
/* Die Antwort auf eine Anfrage geht auf allen drei Wegen hinaus: maschinenlesbar (Datei, Link), als PDF und als QR-Code
   (Regel der Produktverantwortung 10.11.2026 und 14.11.2026: Maschine, PDF, QR). Heute bietet die Wahl nach „Antworten“
   Herunterladen (.jwe), Link senden und die QR-Serie; eine PDF der Antwort fehlt.
   Die Probe liest die eine Aufrufstelle der Wahl in der Antwort und verlangt dort einen PDF-Weg, und sie verlangt, dass die Wahl
   selbst einen PDF-Knopf führt.
   Erwartete Röte bis zum Fix (todo mit Kennung). ROT-BEWEIS: am heutigen Kern rot (die Wahl bekommt herunterladen, linkSenden, qrZeigen und nichts weiter). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Antwort · PDF] die Wahl nach „Antworten“ führt einen PDF-Weg', { todo: 'Befund ANTWORT-OHNE-PDF (HOCH): die Antwort geht nur als Datei, Link oder QR-Serie hinaus, eine PDF fehlt; Eigentümer Pro' }, () => {
  const { V, html } = ladeKern();
  const a = html.indexOf('function _anfrageAntwortSchreiben(');
  const rumpf = html.slice(a, html.indexOf('\n}\n', a));
  const aufruf = /_ausgabeWegWaehlen\(STRINGS\.anfrageAntwortenCta,([^)]*)\)/.exec(rumpf);
  assert.ok(aufruf, 'Vorbedingung: die Antwort ruft die Wahl');
  const rufe = [];
  V.ui.modal = (opt) => { rufe.push(opt); return () => {}; };
  V._ausgabeWegWaehlen('Antworten', 'antwort.jwe', () => {}, () => {}, () => {});
  const knoepfe = rufe.length ? [rufe[0].primaerLabel, rufe[0].zweitAktion && rufe[0].zweitAktion.label, rufe[0].drittAktion && rufe[0].drittAktion.label].filter(Boolean) : [];
  assert.ok(/pdf/i.test(aufruf[1]) || knoepfe.some((k) => /pdf/i.test(String(k))),
    'die Antwort geht nur als Datei, Link oder QR-Serie hinaus (' + aufruf[1].trim() + '; Knöpfe: ' + knoepfe.join(' / ') + '); eine PDF fehlt');
});
