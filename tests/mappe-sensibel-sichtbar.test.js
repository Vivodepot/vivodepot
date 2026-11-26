'use strict';
/* ═════════════════════════════════════════════════════════════════
   MAPPE-SENSIBEL-ANGESCHNITTEN (23.11.2026)

   Im Dialog „Dokument ablegen“ lag die Zeile „Sensibel“ am Handy unter dem Rand des Dialogs: über ihr standen eine Vorschau von 220px
   und die lange Reihe der Bereiche. Jetzt steht sie vor der Bereichsreihe, und die Vorschau ist am Handy kleiner.

   Proben:
   [Sensibel·Reihenfolge] die Zeile steht vor der Frage nach dem Bereich.
   [Sensibel·Vorschau]    die Vorschau ist am Handy höchstens 120px hoch.
   [Sensibel·Rot-Beweis]  ein Kern mit der Reihenfolge von vorher fällt durch [Sensibel·Reihenfolge].
   (Das Bild bei 375px gehört zum Browser-Beleg des Wagens.)
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

function dialogKoerper(V) {
  let dialog = null;
  const echt = V.ui.modal;
  V.ui.modal = (opt) => { dialog = opt; return () => {}; };
  try {
    V.flowMappeMetadaten({ beschriftung: 'Befund', dateiname: 'befund.png', mime: 'image/png', groesse: 70,
      inhalt: 'data:image/png;base64,iVBORw0KGgo=' }, null);
  } finally { V.ui.modal = echt; }
  return dialog.koerperHTML;
}
const sensibelVorBereich = (h) => h.indexOf('mappe-sensibel-zeile') >= 0 && h.indexOf('mappe-sensibel-zeile') < h.indexOf('id="mappe-bereich"');

test('[Sensibel·Reihenfolge] die Zeile „Sensibel“ steht vor der Bereichsreihe', () => {
  const { V } = ladeKern({ backen: true });
  const h = dialogKoerper(V);
  assert.ok(h.includes('id="mappe-bereich"'), 'Vorbedingung: die Bereichsreihe steht im Dialog');
  assert.ok(sensibelVorBereich(h), 'die Zeile „Sensibel“ steht vor der Bereichsreihe');
});

test('[Sensibel·Vorschau] am Handy ist die Vorschau höchstens 120px hoch', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');
  const i = css.indexOf('    .mappe-vorschau { max-height: 120px; }');
  assert.ok(i > 0, 'die Regel steht');
  // Die Regel steht innerhalb eines Blocks @media (max-width: …): Klammern ab dem Blockanfang zählen.
  const blockAnfaenge = [...css.matchAll(/@media \(max-width: \d+px\) \{/g)].map((m) => m.index).filter((a) => a < i);
  const drin = blockAnfaenge.some((a) => {
    let tiefe = 0;
    for (let j = css.indexOf('{', a); j < css.length; j++) {
      if (css[j] === '{') tiefe++;
      else if (css[j] === '}') { tiefe--; if (tiefe === 0) return j > i; }
    }
    return false;
  });
  assert.ok(drin, 'die Regel gilt im schmalen Fenster');
});

/* Rot-Beweis: die Reihenfolge von vorher (Bereichsreihe, dann „Sensibel“) fällt durch [Sensibel·Reihenfolge]. */
test('[Sensibel·Rot-Beweis] ein Kern mit der Reihenfolge von vorher fällt durch', () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const neu = `    '<label class="mappe-sensibel-zeile"><input id="mappe-sensibel" type="checkbox"> ' + STRINGS.mappeSensibelFrage + '</label>' +
    '<label>' + STRINGS.mappeBereichFrage + '</label>' +
    mappeBereichKnopfreiheHTML(vorbelegterBereich);`;
  assert.equal(quelle.split(neu).length, 2, 'Vorbedingung: der Anker steht genau einmal');
  const alt = `    '<label>' + STRINGS.mappeBereichFrage + '</label>' +
    mappeBereichKnopfreiheHTML(vorbelegterBereich) +
    '<label class="mappe-sensibel-zeile"><input id="mappe-sensibel" type="checkbox"> ' + STRINGS.mappeSensibelFrage + '</label>';`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sensibel-rot-'));
  const datei = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(datei, quelle.replace(neu, alt));
  try {
    const { V } = ladeKern({ backen: true, htmlPfad: datei });
    assert.equal(sensibelVorBereich(dialogKoerper(V)), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
