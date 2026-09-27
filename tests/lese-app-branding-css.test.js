'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Nachtrag (Auftrag, 13.09.2026) — die Lese-App bekommt einen CSS-Hook
   ────────────────────────────────────────────────────────────────────────────
   U2-ADR-400 hatte den NAME/Titel-Teil dieser Lücke geschlossen (tests/lese-app-marke.
   test.js) und den FARB-Teil ausdrücklich REST-OFFEN geführt: "die Lese-App bleibt
   strukturell blind für Branding — kein CSS-Hook, keine Farb-/Namenslesung". Genau diesen
   Rest holt dieser Test nach — direkter Sitzungs-Nachbar des `verweis`-Feldtyps: dieselbe
   "Zweiter Ort bei Speicherumzug"-Klasse (A359), eine Ebene weiter.

   Anders als der Kern: kein Fall-1/Fall-2-Unterschied hier (die Lese-App dockt nie ein
   In-Depot-Modul selbst an, sie öffnet immer nur ein fremdes Depot) — EIN Mechanismus,
   `data.brandingModule`, letztes Element gewinnt, dieselbe Quelle wie `_markeName()`.

   Die AA-Zusicherung wird zur LAUFZEIT hergestellt (Institutionsfarbe ist beliebiger Hex aus
   einer fremden Depot-Datei, keine handgeprüfte Palette) — dieselbe Formel wie im Kern
   (`_brandingKontrastVerhaeltnisHex`/`_brandingTopbarKontrastText`), wörtlich gespiegelt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');

const CSS_PRIMAER = '--vd-branding-topbar-primaer';
const CSS_SEKUNDAER = '--vd-branding-topbar-sekundaer';
const CSS_TEXT = '--vd-branding-topbar-text';

function gesetzt(document, eigenschaft) {
  return document.documentElement.style.getPropertyValue(eigenschaft);
}

test('[Farbe] ohne Branding-Modul werden keine Hook-Variablen gesetzt (nativer Fallback gilt)', () => {
  const { V, document } = ladeLesen();
  V.setData({ sektoren: {}, menschen: [] }); // Depot ohne brandingModule
  V._markeFarbeAnwenden();
  assert.equal(gesetzt(document, CSS_PRIMAER), '', 'ohne Modul bleibt --akzent/#fff aus der CSS-Fallback-Kette in Kraft');
  assert.equal(gesetzt(document, CSS_TEXT), '');
});

test('[Farbe] ein weißgelabeltes Depot setzt Primär- und Textfarbe auf der Topbar', () => {
  const { V, document } = ladeLesen();
  V.setData({ sektoren: {}, menschen: [], brandingModule: [
    { modulTyp: 'branding', moduleVersion: 1, herkunft: 'x', name: 'Muster AG', farbePrimaer: '#112233', farbeSekundaer: '#445566' },
  ] });
  V._markeFarbeAnwenden();
  assert.equal(gesetzt(document, CSS_PRIMAER), '#112233');
  assert.equal(gesetzt(document, CSS_SEKUNDAER), '#445566');
  const text = gesetzt(document, CSS_TEXT);
  assert.ok(text === '#ffffff' || text === '#1c2a1e', 'die Textfarbe muss einer der beiden AA-Kandidaten sein');
  assert.ok(V._brandingKontrastVerhaeltnisHex(text, '#112233') >= 4.5, 'und tatsächlich AA (4.5:1) gegen die Primärfarbe erreichen');
});

test('[Farbe] eine Institutionsfarbe, die bei KEINEM Kandidaten AA erreicht, wird abgewiesen — kein Rundum-Verwurf des Moduls', () => {
  const { V, document } = ladeLesen();
  // Ein Grauton mittlerer Leuchtdichte: gegen Weiß UND #1c2a1e unter 4.5:1.
  const grenzfall = '#8a8a8a';
  assert.ok(V._brandingTopbarKontrastText(grenzfall) === null, 'Vorbedingung: dieser Ton erreicht bei keinem Kandidaten AA');
  V.setData({ sektoren: {}, menschen: [], brandingModule: [
    { modulTyp: 'branding', moduleVersion: 1, herkunft: 'x', name: 'Graufirma', farbePrimaer: grenzfall },
  ] });
  V._markeFarbeAnwenden();
  assert.equal(gesetzt(document, CSS_PRIMAER), '', 'die Farbfläche wird zurückgewiesen, statt eine Textfarbe unter AA durchzulassen');
  assert.equal(gesetzt(document, CSS_TEXT), '');
  assert.equal(V._markeName(), 'Graufirma', 'der Name/Titel bleibt unberührt — nur die Farbfläche dieses einen Boot-Vorgangs fällt zurück');
});

test('[Farbe] ein ungültig-formatierter Hex (z. B. altes/manipuliertes Depot) wird re-validiert und abgewiesen', () => {
  const { V, document } = ladeLesen();
  V.setData({ sektoren: {}, menschen: [], brandingModule: [
    { modulTyp: 'branding', moduleVersion: 1, herkunft: 'x', name: 'X', farbePrimaer: 'javascript:alert(1)' },
  ] });
  V._markeFarbeAnwenden();
  assert.equal(gesetzt(document, CSS_PRIMAER), '', 'die Lese-App vertraut der fremden Depot-Datei nicht blind — dieselbe Form-Prüfung wie beim Schreiben, hier erneut');
});

test('[Farbe] ohne farbeSekundaer wird die Variable entfernt, nicht mit einem alten Wert stehen gelassen', () => {
  const { V, document } = ladeLesen();
  V.setData({ sektoren: {}, menschen: [], brandingModule: [
    { modulTyp: 'branding', moduleVersion: 1, herkunft: 'x', name: 'X', farbePrimaer: '#112233', farbeSekundaer: '#445566' },
  ] });
  V._markeFarbeAnwenden();
  assert.equal(gesetzt(document, CSS_SEKUNDAER), '#445566', 'Voraussetzung: gesetzt');
  V.setData({ sektoren: {}, menschen: [], brandingModule: [
    { modulTyp: 'branding', moduleVersion: 1, herkunft: 'x', name: 'X', farbePrimaer: '#112233' },
  ] });
  V._markeFarbeAnwenden();
  assert.equal(gesetzt(document, CSS_SEKUNDAER), '', 'das nächste Depot ohne Sekundärfarbe darf die Sekundärfarbe des vorigen nicht erben');
});

test('[Farbe·Rot-Beweis] entladen() setzt die Topbar-Farbe sofort zurück — kein Farb-Leck übers Schliessen hinaus', () => {
  const { V, document } = ladeLesen();
  V.setData({ sektoren: {}, menschen: [], brandingModule: [
    { modulTyp: 'branding', moduleVersion: 1, herkunft: 'x', name: 'Muster AG', farbePrimaer: '#112233' },
  ] });
  V._markeFarbeAnwenden();
  assert.equal(gesetzt(document, CSS_PRIMAER), '#112233', 'Voraussetzung: die Partnerfarbe steht auf der Topbar');
  V.entladen();
  assert.equal(V.getData(), null, 'entladen() muss data nullen (bestehende Zusicherung, T-A-07)');
  assert.equal(gesetzt(document, CSS_PRIMAER), '',
    'ohne dieses Zurücksetzen bliebe die Farbe des geschlossenen Depots am leeren Eingangsschirm — oder am nächsten, unbeteiligten Depot — hängen');
  assert.equal(gesetzt(document, CSS_TEXT), '');
});

test('[Farbe] die Quelle ist das GEÖFFNETE Fremd-Depot, keine eingebackene Konstante dieser Datei', () => {
  const { V, document } = ladeLesen();
  V.setData({ sektoren: {}, menschen: [], brandingModule: [
    { modulTyp: 'branding', moduleVersion: 1, herkunft: 'x', name: 'Erste Bank', farbePrimaer: '#112233' },
  ] });
  V._markeFarbeAnwenden();
  assert.equal(gesetzt(document, CSS_PRIMAER), '#112233');
  V.setData({ sektoren: {}, menschen: [], brandingModule: [
    { modulTyp: 'branding', moduleVersion: 1, herkunft: 'x', name: 'Zweite Bank', farbePrimaer: '#665544' },
  ] });
  V._markeFarbeAnwenden();
  assert.equal(gesetzt(document, CSS_PRIMAER), '#665544', 'der zweite Depot-Öffnungsvorgang liest seine EIGENE Farbe, nicht die des ersten');
});
