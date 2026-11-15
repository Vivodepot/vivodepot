'use strict';
/* Studio-Schritt 5 (12.11.2026): der Wächter über die Ausgabewege des Studios (tools/studio-ausgabewege-pruefen.js).
   Gehalten:
     · am Studio: jeder Weg ist geschlossen oder als Lücke geführt, und der geschlossene Weg „Vorlage sichern“ ruft
       Questionnaire und PDF — ROT, bis Schritt 5 gebaut ist;
     · die Grundlinie führt jede gemessene Lücke genau einmal und keine, die es nicht gibt;
     · Rot-Beweise an erfundenen Quelltexten: ein neuer Weg, eine verschwundene Lücke, ein geschlossener Weg ohne PDF-Aufruf. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const W = require('../tools/studio-ausgabewege-pruefen.js');

const GL = JSON.parse(fs.readFileSync(W.GRUNDLINIE, 'utf8'));
const studio = () => fs.readFileSync(W.STUDIO, 'utf8');

test('[Studio·Ausgabewege] jeder Weg ist geschlossen oder geführt; „Vorlage sichern“ gibt Questionnaire und PDF aus', () => {
  const { befunde } = W.pruefen({ quelle: studio(), grundlinie: GL });
  assert.deepEqual(befunde, []);
});

test('[Studio·Ausgabewege·Grundlinie] die Lücken sind genau die gemessenen Wege ohne Standard und PDF', () => {
  const wege = W.wegeMessen(studio());
  const gemessen = Object.keys(wege).filter((n) => !GL.geschlossen[n]).sort();
  assert.deepEqual(Object.keys(GL.luecken).sort(), gemessen);
  for (const [n, grund] of Object.entries(GL.luecken)) assert.ok(typeof grund === 'string' && grund.length > 10, 'Grund fehlt: ' + n);
  assert.deepEqual(GL.geschlossen.vorlageSichern.ruft, ['vorlageQuestionnaire', 'vorlagePdfBauen']);
});

const FIX = [
  'function blobDownload(dateiname, text, typ) { }',
  'function altWeg() {',
  "  blobDownload('a.json', '{}');",
  '}',
  'function vorlageSichern() {',
  "  blobDownload('v.json', '{}');",
  "  blobDownload('v.questionnaire.json', JSON.stringify(vorlageQuestionnaire()));",
  "  vorlagePdfBauen().then((b) => blobDownload('v.pdf', b, 'application/pdf'));",
  '}',
].join('\n');
const FIX_GL = { geschlossen: { vorlageSichern: { standard: 'fhir-r4-questionnaire', ruft: ['vorlageQuestionnaire', 'vorlagePdfBauen'] } }, luecken: { altWeg: 'Probe' } };

test('[Studio·Ausgabewege·Rot-Beweis] neuer Weg, verschwundene Lücke und fehlender PDF-Aufruf werden rot', () => {
  assert.deepEqual(W.pruefen({ quelle: FIX, grundlinie: FIX_GL }).befunde, [], 'Vorbedingung: die Fixture ist grün');
  assert.deepEqual(W.wegeMessen(FIX), { altWeg: 1, vorlageSichern: 3 }, 'die Deklaration zählt nicht');
  const neu = FIX + "\nfunction nochEiner() {\n  blobDownload('n.txt', 'x');\n}\n";
  assert.match(W.pruefen({ quelle: neu, grundlinie: FIX_GL }).befunde.join('\n'), /neuer Ausgabeweg ohne Standard und PDF: nochEiner/);
  const ohneAlt = FIX.replace("  blobDownload('a.json', '{}');\n", '');
  assert.match(W.pruefen({ quelle: ohneAlt, grundlinie: FIX_GL }).befunde.join('\n'), /Lücke altWeg gibt es nicht mehr/);
  const ohnePdf = FIX.replace('vorlagePdfBauen()', 'Promise.resolve(new Uint8Array())');
  assert.match(W.pruefen({ quelle: ohnePdf, grundlinie: FIX_GL }).befunde.join('\n'), /vorlageSichern ruft vorlagePdfBauen nicht/);
  const ohneWeg = FIX.replace('function vorlageSichern', 'function andererName');
  assert.match(W.pruefen({ quelle: ohneWeg, grundlinie: FIX_GL }).befunde.join('\n'), /geschlossener Weg vorlageSichern fehlt/);
});
