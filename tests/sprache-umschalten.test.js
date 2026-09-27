'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Sprache umschalten (21.09.2026, Entscheidung 20.09.2026: „wenn alles mitreist, muss auch die dt. sprache
   mitreisen, und sie müsste dann beim öffnen evtl. umschalten können“)
   ────────────────────────────────────────────────────────────────────────
   Ein Depot trägt seine Sprache; die Bürgerin wählt unter den Sprachen, die die Registry VOLL trägt. Die Namen
   der Sprachen kommen aus Intl.DisplayNames, es steht kein neues Wort im Gerüst.

   ROT-BEWEIS, GEMESSEN (21.09.2026, u2-kanon f82f6314 ohne Umschalter): textsatzVolleSprachen, textsatzSpracheWaehlen
   und _sprachWahlHTML existieren nicht — jede Probe unten ist dort rot; die Depot-Sprache der Produktwechsel-Proben
   war `undefined`. Die Gegenprobe steht in der Probe „nur ein volles Fach": ein Produkt ohne zweite volle Sprache
   zeigt keine Auswahl.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { produktHtml, kernAus, depotImProduktAnlegen, depotImProduktLaden } = require('./produkt-html-erzeugen.js');

const PW = 'probe-sprache-umschalten-2026-09-21';

async function englischesDepotImDeutschenProdukt() {
  const { umschlag } = await depotImProduktAnlegen('privat-en', PW, (V) => { V.akteurSelbstErklaeren('Amina'); });
  return depotImProduktLaden('privat-de', umschlag, PW);
}

test('[Sprache·Depot] ein Depot trägt die Sprache des Produkts, in dem es entsteht — das deutsche trägt keine', async () => {
  const en = await depotImProduktAnlegen('privat-en', PW);
  assert.equal(en.V.getData().textsprache, 'en');
  const de = await depotImProduktAnlegen('privat-de', PW);
  assert.equal(de.V.getData().textsprache, undefined);
});

test('[Sprache·Angebot] nur Sprachen mit vollem Fach stehen zur Wahl — die Vor-Depot-Teilmenge ist kein Angebot', async () => {
  const { V } = await englischesDepotImDeutschenProdukt();
  assert.deepEqual(V.textsatzVolleSprachen(), ['de', 'en']);
  // Gegenprobe: das deutsche Produkt allein kennt Englisch nur als kleine Teilmenge — kein zweites volles Fach.
  const { V: allein } = kernAus(produktHtml('privat-de'));
  assert.deepEqual(allein.textsatzVolleSprachen(), ['de']);
  assert.equal(allein._sprachWahlHTML(), '', 'ohne zweite volle Sprache keine Auswahl');
});

test('[Sprache·Namen] die Sprachen heißen in ihrer eigenen Sprache', async () => {
  const { V } = await englischesDepotImDeutschenProdukt();
  assert.equal(V.textsatzSprachnameEigen('de'), 'Deutsch');
  assert.equal(V.textsatzSprachnameEigen('en'), 'English');
  const html = V._sprachWahlHTML();
  assert.match(html, /<select id="einst-sprache"/);
  assert.match(html, /<option value="de">Deutsch<\/option>/);
  assert.match(html, /<option value="en" selected>English<\/option>/, 'die aktive Sprache ist gewählt');
});

test('[Sprache·Wahl] die Wahl wirkt sofort, ist im Depot festgehalten und lehnt eine Sprache ohne volles Fach ab', async () => {
  const { V, document } = await englischesDepotImDeutschenProdukt();
  V.akteurSelbstErklaeren('Amina');
  V.betreteApp();
  assert.equal(V.STRINGS.navHauptLabel, 'Main navigation');
  assert.equal(V.textsatzSpracheWaehlen('de'), true);
  assert.equal(V.getData().textsprache, 'de', 'die Wahl steht im Depot');
  assert.equal(V.STRINGS.navHauptLabel, 'Hauptnavigation');
  assert.match(document.getElementById('sidebar').innerHTML, /Gesundheit/, 'die Seitenleiste ist neu gezeichnet');
  const vorher = V.getData().textsprache;
  assert.equal(V.textsatzSpracheWaehlen('xx'), false, 'eine Sprache ohne Fach wird abgelehnt');
  assert.equal(V.getData().textsprache, vorher, 'und ändert nichts');
});

test('[Sprache·Einstellungen] die Auswahl steht in den Einstellungen, neben dem Einlesen einer Modul-Datei', async () => {
  const { V } = await englischesDepotImDeutschenProdukt();
  V.akteurSelbstErklaeren('Amina');
  V.betreteApp();
  const html = V.einstellungenHTML();
  assert.match(html, /id="einst-sprache"/);
  assert.match(html, /id="einst-modul-einlassen"/, 'der Weg über eine Datei bleibt');
});
