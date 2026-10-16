'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Aktionen an den Karten der Verwaltung finden ihre Karte, auch im betretenen Sub-Depot
   (Befund SUB-DEPOT-EXPORT-KLICKWEG, HOCH, 15.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Die Verwaltungsliste zeigt die Karten aus dem Anker-Depot (renderVerwalteteDepots liest ankerDaten()). Die Aktionen an
   einer Karte suchten ihren Eintrag in `data`. Hatte die Person ein Sub-Depot betreten, ist `data` dessen Inhalt; dann
   fand der Export als verschlüsselte Datei die Karte nicht („Sub-Depot nicht gefunden“, angezeigt als „Das hat nicht
   geklappt“), ebenso Aushängen, Wiederaufnehmen und Widerspruch.

   Teil 1, Verhalten: Anker, Sub-Depot, betreten, dann exportieren; die Datei öffnet mit dem Passwort des Sub-Depots.
   Teil 2, die Klasse: jede Funktion, die die Liste an eine Karte bindet (onclick in renderVerwalteteDepots), und jede
   Sub-Depot-Funktion, die sie aufruft, sucht ihren Eintrag nicht in `data.verwalteteDepots`. Rot-Beweis je Teil.
   Probe im Browser über den echten Klickweg: tests/e2e/sub-depot-export-klickweg.spec.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const ANKER_PW = 'karten-aus-anker-anker-311';
const SUB_PW = 'karten-aus-anker-sub-722';

async function betretenesSubDepot() {
  const { V } = ladeKern();
  await V.depotAnlegen(ANKER_PW);
  const e = await V.subDepotAnlegen({ bezeichnung: 'Depot Klara', inhaberin: 'Klara', verwaltungsTyp: 'verwaltet' }, SUB_PW);
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB_PW);
  V.subKontextBetreten(e.depotUUID);
  V.akteurSelbstErklaeren('Verwalterin');
  assert.equal(V.imSubKontext(), true, 'Vorbedingung: Sub-Kontext aktiv');
  return { V, depotUUID: e.depotUUID };
}

test('[Verwaltung·Karten aus dem Anker] im betretenen Sub-Depot: Export als verschlüsselte Datei, Datei öffnet mit eigenem Passwort', async () => {
  const { V, depotUUID } = await betretenesSubDepot();
  const datei = V.subDepotBlackboxExportieren(depotUUID);
  assert.equal(datei.dateiTyp, 'vivodepot-blackbox-export');
  assert.equal(datei.umschlag.depotUUID, depotUUID);
  await V.subDepotEntsiegeln(datei.umschlag, SUB_PW);   // wirft, wenn die Datei nicht mit dem eigenen Passwort öffnet
});

test('[Verwaltung·Karten aus dem Anker] aus dem eigenen Depot: Export wie bisher', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(ANKER_PW);
  const e = await V.subDepotAnlegen({ bezeichnung: 'Depot Klara', inhaberin: 'Klara', verwaltungsTyp: 'verwaltet' }, SUB_PW);
  const datei = V.subDepotBlackboxExportieren(e.depotUUID);
  await V.subDepotEntsiegeln(datei.umschlag, SUB_PW);
});

/* ── Teil 2: die Klasse, am Quelltext ─────────────────────────────────────────────────────────────────────── */

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const SUCHE_IN_DATA = /\bdata\s*(?:&&\s*data)?\s*\.\s*verwalteteDepots|Array\.isArray\(\s*data\.verwalteteDepots\s*\)/;

function funktionsKoerper(text, name) {
  const m = new RegExp('\\n(?:async )?function ' + name + '\\s*\\(').exec(text);
  if (!m) return null;
  const rest = text.slice(m.index + 1);
  const ende = rest.slice(1).search(/\n(?:async )?function [A-Za-z_$]/);
  return ende < 0 ? rest : rest.slice(0, ende + 1);
}

/** Die Funktionen hinter den Karten der Liste, samt der Sub-Depot-Funktionen, die sie rufen. */
function kartenFunktionen(text) {
  const liste = funktionsKoerper(text, 'renderVerwalteteDepots');
  if (!liste) throw new Error('renderVerwalteteDepots nicht gefunden');
  const namen = new Set([...liste.matchAll(/onclick = (?:async )?\(\) => (?:await )?([A-Za-z_$][\w$]*)\(/g)].map((x) => x[1]));
  for (const n of [...namen]) {
    const k = funktionsKoerper(text, n) || '';
    for (const x of k.matchAll(/\b(subDepot[A-Z]\w*)\(/g)) namen.add(x[1]);
  }
  return [...namen].filter((n) => funktionsKoerper(text, n));
}

function befunde(text) {
  return kartenFunktionen(text).filter((n) => SUCHE_IN_DATA.test(funktionsKoerper(text, n)));
}

test('[Verwaltung·Karten aus dem Anker·Klasse] keine Kartenaktion sucht ihren Eintrag in data.verwalteteDepots', () => {
  const namen = kartenFunktionen(KERN);
  assert.ok(namen.includes('flowSubDepotBlackboxExport') && namen.includes('subDepotBlackboxExportieren'),
    'der Wächter erkennt den Export nicht als Kartenaktion: ' + namen.join(', '));
  assert.deepEqual(befunde(KERN), []);
});

test('[Verwaltung·Karten aus dem Anker·Rot-Beweis] die alte Suche in data wird gefunden', () => {
  const alt = KERN.replace(/(\nfunction flowSubDepotBlackboxExport\(depotUUID\) \{\n  const e = )verwalteterEintrag\(depotUUID\);/,
    '$1(data && data.verwalteteDepots || []).find(x => x.depotUUID === depotUUID);');
  assert.notEqual(alt, KERN, 'Rot-Beweis ohne Anker: die Stelle hat nicht die erwartete Form');
  assert.deepEqual(befunde(alt), ['flowSubDepotBlackboxExport']);
});
