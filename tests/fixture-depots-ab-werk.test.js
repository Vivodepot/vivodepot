'use strict';
/* fixture-depots-ab-werk.test.js — jedes Fixture-Depot trägt nur ausgelieferte Module (04.10.2026, Abnahme der Gegenlesung)
   ───────────────────────────────────────────────────────────────────────────────────────────
   Seit der Sperre (v885) wird ein Modul im Einlass-Fach einer Depot-Datei nur eingelassen, wenn es ab Werk ist. Das
   englische Vorführ-Depot „Zugang zum Recht“ trug ein eingelassenes Sprachmodul eines Zwischenstands, der nie
   ausgeliefert wurde; jede Vorführung zeigte darum den Sperr-Hinweis, und auf einem langsamen Rechner lag er über dem
   Knopf. Gehalten wird für JEDE .vivodepot-Datei unter tests/fixtures: in jedem der vier Produkte geöffnet, sperrt sie
   nichts — oder sie steht unten mit Grund als benannter Fall (Altdatei für Rückfall- und Altbestands-Proben, oder kein
   öffenbares Depot). Eine neue Fixture ohne Eintrag und ohne bekanntes Passwort ist rot. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const P = require('./produkt-html-erzeugen.js');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const PRODUKTE = ['privat-de', 'privat-en', 'pro-de', 'pro-en'];
const VZR = 'tests/fixtures/vorfuehrung-zugang-zum-recht/';
const PASSWORT = {
  [VZR + 'demo-de.vivodepot']: 'zugang-zum-recht-vorfuehrung-2026',
  [VZR + 'demo-en.vivodepot']: 'zugang-zum-recht-vorfuehrung-2026',
  'tests/fixtures/v515-ohne-auszuege/depot-v515-ohne-auszuege.vivodepot': 'v515-fixture-ohne-auszuege-2026',
};
/* Benannte Fälle: Datei → Grund. Eine Altdatei bleibt absichtlich alt — Proben brauchen genau sie. */
const BENANNT = {
  [VZR + 'altdatei-demo-de-2026-09-10.vivodepot']: 'Altdatei vor dem Kennungs-Umbau (ihre Prüfsumme ist in einer Altbestands-Probe gepinnt)',
  [VZR + 'altdatei-demo-en-2026-09-10.vivodepot']: 'Altdatei mit eingelassenem Sprachmodul eines Zwischenstands (Rückfall-Probe U2-ADR-463, alte Kennungen einlesen)',
  'tests/fixtures/depot-diagnose/beispiel-anker-v3.vivodepot': 'Umschlag-Beispiel für die Depot-Diagnose, kein öffenbares Depot',
  'tests/fixtures/depot-diagnose/beispiel-anker-v4.vivodepot': 'Umschlag-Beispiel für die Depot-Diagnose, kein öffenbares Depot',
};

function fixtureDepots() {
  return execFileSync('git', ['ls-files', 'tests/fixtures/**/*.vivodepot', 'tests/fixtures/*.vivodepot'], { cwd: REPO, env: ohneGitUmgebung(), encoding: 'utf8' })
    .split('\n').filter(Boolean).sort();
}

async function gesperrtIn(datei, slug, passwort) {
  const t = fs.readFileSync(path.join(REPO, datei), 'utf8');
  const { V } = P.kernAus(P.produktHtml(slug));
  await V.depotLaden(JSON.parse(t.slice(t.indexOf('{'))), passwort);
  return V.gesperrteDepotModule().map((m) => m.typ + ' · ' + m.kennung);
}

test('[Fixture-Depots·ab Werk] jede Fixture-Depotdatei öffnet in allen vier Produkten ohne gesperrtes Modul — oder ist benannt', async () => {
  const dateien = fixtureDepots();
  assert.ok(dateien.length >= 5, 'Vorbedingung: die Fixture-Depots sind gefunden (' + dateien.length + ')');
  const funde = [];
  for (const datei of dateien) {
    if (BENANNT[datei]) continue;
    if (!PASSWORT[datei]) { funde.push(datei + ': weder benannt noch mit bekanntem Passwort'); continue; }
    for (const slug of PRODUKTE) {
      const g = await gesperrtIn(datei, slug, PASSWORT[datei]);
      if (g.length) funde.push(datei + ' in ' + slug + ': ' + g.join(', '));
    }
  }
  assert.deepEqual(funde, []);
  for (const datei of Object.keys(BENANNT)) assert.ok(dateien.includes(datei), 'benannter Fall ohne Datei: ' + datei);
});

test('[Fixture-Depots·ab Werk·Rot-Beweis] die Altdatei mit eingelassenem Zwischenstand-Sprachmodul wird gefunden', async () => {
  const g = await gesperrtIn(VZR + 'altdatei-demo-en-2026-09-10.vivodepot', 'privat-en', 'zugang-zum-recht-vorfuehrung-2026');
  assert.deepEqual(g, ['textsatz · en'], 'die alte englische Vorführ-Datei sperrt ihr Sprachmodul — genau das fände die Probe ohne Eintrag');
});
