'use strict';
/* A5 (11.11.2026): Die Sprachwahl ist auch im offenen Depot im Menü erreichbar (Seitenleiste, bei schmaler Breite das Schubfach).
   Der Knopf trägt den Namen der Sprache, zu der er schaltet, und ruft dieselbe Funktion wie das Auswahlfeld der Einstellungen
   (textsatzSpracheWaehlen). Die Kopfzeile bleibt unverändert (Entscheidung 31.10.2026 22:40): dort steht kein Sprachknopf.
   Ohne zweites volles Fach gibt es nichts zu wählen — kein Knopf (wie vor dem Depot, U2-ADR-428).
   Rot-Beweis (gemessen am Kern ohne depotSprachKnopfHTML): die Seitenleiste trägt keinen #sb-sprache, die Probe fällt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { produktHtml, kernAus, depotImProduktAnlegen, depotImProduktLaden } = require('./produkt-html-erzeugen.js');

const PW = 'probe-sprachknopf-a5-2026-11-11';

async function zweisprachigesDepot() {
  const { umschlag } = await depotImProduktAnlegen('privat-en', PW, (V) => { V.akteurSelbstErklaeren('Amina'); });
  const r = await depotImProduktLaden('privat-de', umschlag, PW);
  r.V.akteurSelbstErklaeren('Amina');
  r.V.betreteApp();
  return r;
}

const sb = (document) => document.getElementById('sidebar').innerHTML;

test('[Sprache·A5] mit zwei vollen Sprachen steht der Knopf im Menü, benannt nach der Sprache, zu der er schaltet', async () => {
  const { document } = await zweisprachigesDepot();
  const html = sb(document);
  assert.match(html, /<button class="nav-item nav-item-klein" id="sb-sprache" data-sprachwechsel="de" lang="de">/, 'das Depot ist englisch, der Knopf schaltet auf Deutsch');
  assert.match(html, /id="sb-sprache"[^>]*>.*?<span>Deutsch<\/span><\/button>/s, 'der Name steht in der eigenen Sprache');
});

test('[Sprache·A5] die Wahl des Knopfes schaltet die ganze Oberfläche, und der Knopf schaltet danach zurück', async () => {
  const { V, document } = await zweisprachigesDepot();
  assert.equal(V.STRINGS.navHauptLabel, 'Main navigation');
  assert.equal(V.textsatzSpracheWaehlen('de'), true, 'derselbe Aufruf wie der Klick auf den Knopf');
  assert.equal(V.getData().textsprache, 'de');
  assert.equal(V.STRINGS.navHauptLabel, 'Hauptnavigation');
  assert.match(sb(document), /id="sb-sprache" data-sprachwechsel="en" lang="en">.*?<span>English<\/span>/s);
});

test('[Sprache·A5] der Klick ist verdrahtet: derselbe Weg wie das Auswahlfeld der Einstellungen', () => {
  const kern = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.match(kern, /querySelectorAll\('\[data-sprachwechsel\]'\)\.forEach\(b => \{\s*b\.onclick = \(\) => textsatzSpracheWaehlen\(b\.getAttribute\('data-sprachwechsel'\)\);/);
});

test('[Sprache·A5] die Kopfzeile bekommt keinen Sprachknopf (Entscheidung 31.10.2026 22:40: bleibt unverändert)', () => {
  const kern = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const kopf = kern.slice(kern.indexOf('<header class="topbar">'), kern.indexOf('</header>'));
  assert.ok(kopf.length > 500, 'die Kopfzeile ist gefunden');
  assert.doesNotMatch(kopf, /sprachwechsel|sb-sprache/);
});

test('[Sprache·A5·Gegenprobe] ohne zweites volles Fach gibt es keinen Knopf', async () => {
  const { V, document } = kernAus(produktHtml('privat-de'));
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Amina');
  V.betreteApp();
  assert.deepEqual(V.textsatzVolleSprachen(), ['de']);
  assert.doesNotMatch(sb(document), /sb-sprache/);
});
