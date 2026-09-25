'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Folgeauftrag (10.09.2026) — „die Lese-App bekommt Branding"
   ────────────────────────────────────────────────────────────────────────────
   Direkte Fortsetzung des weiter oben gebauten White-Label-Zugs (U2-ADR-400): der eigene Befund
   dieses Auftrags war, dass `vivodepot-lesen.html` Branding strukturell gar nicht kannte — ihr
   einziger `brandingModule`-Bezug (MODUL_SLOTS, modulHerkunftBerechnen) zählt Module, liest aber
   nie deren Wert. Ein weißgelabeltes Depot, das eine Empfängerin per Lese-App öffnet, zeigte
   „Vivodepot" statt der Partnermarke — genau die Stelle, an der das Produkt eine DRITTE Person
   erreicht (die Empfängerin, nicht die Partnerin selbst).

   DERSELBE Mechanismus wie der Kern (U2-ADR-362, `_markeName()`/`_markeDomain()`), KEIN zweiter
   Weg: letztes Element von `data.brandingModule` gewinnt, sonst der native Rückfall. ANDERS als
   der Kern: kein Ab-Werk-Rückfall, weil diese Datei nie produktweise konfektioniert wird
   (tools/produkt-konfektionieren.js kopiert nur vivodepot.html/sw.js/manifest.webmanifest) — der
   Rückfall ist der nackte native Name „Vivodepot".

   `data` ist hier IMMER die FREMDE, gerade geöffnete Depot-Datei, nie eine eingebackene Konstante
   dieser Datei selbst — sonst bliebe die Marke des vorigen Depots am nächsten (oder am leeren
   Eingangsschirm) hängen. Probe 3 unten beweist genau diese Trennung.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');

const MUSTER_BRANDING = Object.freeze({
  modulTyp: 'branding', moduleVersion: 1, herkunft: 'achsentest-lese-app',
  name: 'Muster AG', domain: 'muster-ag.example',
  farbePrimaer: '#112233', farbeSekundaer: '#445566', schriftart: 'Inter', logo: null,
});

test('[Lese-App] ohne Branding-Modul bleibt der native Name „Vivodepot" (Rot-Beweis-Gegenprobe)', () => {
  const { V, document } = ladeLesen();
  assert.equal(V.getData(), null, 'Voraussetzung: kein Depot offen');
  assert.equal(V._markeName(), 'Vivodepot', 'ohne offenes Depot gilt der native Rückfall');
  V.setData({ sektoren: {}, menschen: [] }); // Depot ohne brandingModule
  assert.equal(V._markeName(), 'Vivodepot', 'ein Depot ohne Branding-Modul zeigt weiterhin Vivodepot');
  assert.ok(V.topbarHTML('x', false).includes(V.escapeHTML('Vivodepot · Lesen')),
    'die Topbar trägt weiterhin den nativen Namen, unverändert wie vor diesem Zug');
});

test('[Lese-App] ein weißgelabeltes Depot zeigt die Partnermarke — im Tab-Titel UND in der Topbar', () => {
  const { V, document } = ladeLesen();
  V.setData({ sektoren: {}, menschen: [], brandingModule: [MUSTER_BRANDING] });
  assert.equal(V._markeName(), 'Muster AG', 'derselbe Lesepfad wie der Kern: letztes Element von brandingModule gewinnt');
  assert.ok(V.topbarHTML('x', false).includes(V.escapeHTML('Muster AG · Lesen')),
    'die Topbar muss die Partnermarke zeigen, nicht „Vivodepot"');
  assert.ok(!V.topbarHTML('x', false).includes('Vivodepot'),
    'das native Literal darf nicht mehr auftauchen, sobald ein Branding-Modul andockt ist');
  V._markeAnzeigeAnwenden();
  assert.equal(document.title, 'Muster AG · Lesen', 'der Tab-Titel muss dieselbe Marke tragen — bislang gab es dafür keinen Aufrufort');
});

test('[Lese-App·Rot-Beweis] entladen() setzt den Tab-Titel sofort zurück — keine Marke des vorigen Depots bleibt hängen', () => {
  const { V, document } = ladeLesen();
  V.setData({ sektoren: {}, menschen: [], brandingModule: [MUSTER_BRANDING] });
  V._markeAnzeigeAnwenden();
  assert.equal(document.title, 'Muster AG · Lesen', 'Voraussetzung: die Partnermarke steht im Titel');
  V.entladen();
  assert.equal(V.getData(), null, 'entladen() muss data nullen (bestehende Zusicherung, T-A-07)');
  assert.equal(document.title, 'Vivodepot · Lesen',
    'ohne dieses Zurücksetzen bliebe die Marke des geschlossenen Depots am leeren Eingangsschirm — oder am nächsten, unbeteiligten Depot — hängen');
});

test('[Lese-App] die Quelle ist das GEÖFFNETE Fremd-Depot, keine eingebackene Konstante dieser Datei', () => {
  const { V, document } = ladeLesen();
  // Zwei verschiedene, nacheinander geöffnete Depots dürfen sich nicht gegenseitig färben.
  V.setData({ sektoren: {}, menschen: [], brandingModule: [MUSTER_BRANDING] });
  assert.equal(V._markeName(), 'Muster AG');
  V.setData({ sektoren: {}, menschen: [], brandingModule: [{ ...MUSTER_BRANDING, name: 'Andere Bank' }] });
  assert.equal(V._markeName(), 'Andere Bank', 'der zweite Depot-Öffnungsvorgang liest seine EIGENE Marke, nicht die des ersten');
});

/* White Label Fall 2 (16.09.2026, Stadtbank-Vorführung): Texte mit {marke} erreichen seit der
   Neutralisierung (U2-ADR-371/374, „handelnde Marke") auch die Lese-App — als angedockter
   Textsatz aus der Depot-Datei. Die Lese-App kannte _markeName(), löste den Platzhalter aber nie
   auf: die Empfängerin las wörtlich „{marke}". Spiegel von _markePlatzhalterAufloesen im Kern. */
function depotMitMarkeUndTextsatz(V, branding) {
  V.setData({ sektoren: {}, menschen: [], textsprache: 'en',
    brandingModule: branding ? [branding] : [],
    textsatzModule: [{ modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1,
      texte: { 'strings:leerZustand.text': 'not recorded in {marke}' } }] });
  V._textsatzModuleAusDepotAnmelden(V.getData());
}

function markeAufloesungVerstoesse(V, erwartet) {
  const ist = V.textLesen('strings:leerZustand.text');
  return ist === erwartet ? [] : ['Lese-App liest „' + ist + '" statt „' + erwartet + '"'];
}

test('[White Label·Lese-App] {marke} im angedockten Textsatz wird zur Partnermarke', () => {
  const { V } = ladeLesen();
  depotMitMarkeUndTextsatz(V, MUSTER_BRANDING);
  const verstoesse = markeAufloesungVerstoesse(V, 'not recorded in Muster AG');
  assert.deepEqual(verstoesse, [], verstoesse.join(' · '));
});

test('[White Label·Lese-App] {marke} ohne Branding-Modul wird zum nativen Namen (Gegenprobe)', () => {
  const { V } = ladeLesen();
  depotMitMarkeUndTextsatz(V, null);
  assert.equal(V.textLesen('strings:leerZustand.text'), 'not recorded in Vivodepot');
});

/* Proben-Deklaration (U2-ADR-099 B-2). */
module.exports = {
  PROBEN: [
    { fuer: '[White Label·Lese-App] {marke} im angedockten Textsatz wird zur Partnermarke', diskriminante: markeAufloesungVerstoesse },
  ],
};
