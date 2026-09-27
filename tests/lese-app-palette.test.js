'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Nachtrag (Fund, 13.09.2026) — die Lese-App-Palette folgt der Marke
   ────────────────────────────────────────────────────────────────────────────
   Direkter Nachbar von U2-ADR-408 im Kern ("die Palette folgt der Marke"): eine gebrandete
   Kopfzeile über einer weiterhin salbeigrünen Lesesicht ist dasselbe Loch, nur eine Zeile
   tiefer. Fünf Tokens (--tinte, --tinte-weich, --leer, --linie, --flaeche-warm) — nicht
   sechzehn wie im Kern, weil diese App keine Akzent-Familie zu vergeben hat: --akzent trägt
   hier MODUS-Bedeutung (anker/sub/notfall über setModusFarbe(), auf jedem Render neu gesetzt),
   keine Marken-Erscheinung. Eigene, engere Herleitung (_lesenPaletteAbleiten), nicht der
   gespiegelte Kern-Algorithmus (s. lese-app-branding-css-huelle.test.js, Gegenprobe).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');

const TOKENS = ['--tinte', '--tinte-weich', '--leer', '--linie', '--flaeche-warm'];

function gesetzt(document, eigenschaft) {
  return document.documentElement.style.getPropertyValue(eigenschaft);
}
function branding(farbePrimaer) {
  return { sektoren: {}, menschen: [], brandingModule: [
    { modulTyp: 'branding', moduleVersion: 1, herkunft: 'x', name: 'Muster AG', farbePrimaer },
  ] };
}

test('[Palette] ohne Branding-Modul werden keine Palette-Tokens gesetzt', () => {
  const { V, document } = ladeLesen();
  V.setData({ sektoren: {}, menschen: [] });
  V._markePaletteAnwenden();
  for (const tok of TOKENS) assert.equal(gesetzt(document, tok), '', tok + ' muss leer bleiben, damit die :root-Vorgabe gilt');
});

test('[Palette] ein weißgelabeltes Depot setzt alle fünf Tokens, jedes Paar hält AA (4.5:1)', () => {
  const { V, document } = ladeLesen();
  V.setData(branding('#004990')); // Sparkassen-artiges Blau
  V._markePaletteAnwenden();
  const pal = {};
  for (const tok of TOKENS) {
    const wert = gesetzt(document, tok);
    assert.match(wert, /^#[0-9a-f]{6}$/, tok + ' muss ein gültiger 6-stelliger Hex-Wert sein, gefunden: ' + JSON.stringify(wert));
    pal[tok] = wert;
  }
  for (const [vorne, hinten] of V._LESEN_BRANDING_PALETTE_PAARE) {
    const hintenWert = (hinten === '--flaeche') ? '#ffffff' : pal[hinten];
    const v = V._brandingKontrastVerhaeltnisHex(pal[vorne], hintenWert);
    assert.ok(v >= 4.5, vorne + ' auf ' + hinten + ' = ' + v.toFixed(2) + ', unter 4.5');
  }
});

test('[Palette] eine Institutionsfarbe, die bei KEINEM Kandidaten AA erreicht, wird GANZ abgewiesen', () => {
  const { V, document } = ladeLesen();
  const grenzfall = '#8a8a8a';
  assert.equal(V._brandingMarkentonTragfaehig(grenzfall), null, 'Vorbedingung: dieser Ton erreicht bei keinem Text-Kandidaten AA');
  V.setData(branding(grenzfall));
  V._markePaletteAnwenden();
  for (const tok of TOKENS) assert.equal(gesetzt(document, tok), '', tok + ' darf nicht gesetzt sein — die ganze Ableitung fällt zurück, kein Teilerfolg');
});

test('[Palette] --akzent bleibt von _markePaletteAnwenden() UNBERÜHRT — keine Race mit setModusFarbe()', () => {
  // Genau der Fund, der die engere Rollen-Tabelle begründet: --akzent trägt hier Modus-Bedeutung.
  // Würde _markePaletteAnwenden() diese Variable mitsetzen, überschriebe setModusFarbe() sie auf
  // jedem Render sofort wieder — eine stumme Race, keine Zusicherung.
  const { V, document } = ladeLesen();
  V.setData(branding('#004990'));
  V._markePaletteAnwenden();
  assert.equal(gesetzt(document, '--akzent'), '', '_markePaletteAnwenden() darf --akzent nie anfassen');
});

test('[Palette·Rot-Beweis] entladen() räumt alle fünf Tokens — kein Farb-Leck übers Schliessen hinaus', () => {
  const { V, document } = ladeLesen();
  V.setData(branding('#004990'));
  V._markePaletteAnwenden();
  assert.notEqual(gesetzt(document, '--tinte'), '', 'Voraussetzung: die Palette steht');
  V.entladen();
  assert.equal(V.getData(), null);
  for (const tok of TOKENS) assert.equal(gesetzt(document, tok), '', tok + ' muss nach entladen() wieder leer sein');
});

test('[Palette] die Quelle ist das GEÖFFNETE Fremd-Depot — zwei Depots färben nicht ineinander', () => {
  const { V, document } = ladeLesen();
  V.setData(branding('#004990'));
  V._markePaletteAnwenden();
  const erste = gesetzt(document, '--tinte');
  V.setData(branding('#8a2a2a'));
  V._markePaletteAnwenden();
  const zweite = gesetzt(document, '--tinte');
  assert.notEqual(zweite, erste, 'das zweite Depot muss seine EIGENE Palette liefern, nicht die des ersten');
  assert.notEqual(zweite, '', 'und tatsächlich eine gesetzt haben, nicht nur geräumt');
});
