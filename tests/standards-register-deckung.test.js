'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Standards-Register — die Deckung (docs/standards-schnittstelle.md, Abschnitt Deckung)
   ────────────────────────────────────────────────────────────────────────
   Grundsatz des Projekts: „Für jeden Standard muss es mindestens einen Prüfer geben.“ Jede Kennung aus
   EXPORT_FORMATE und IMPORT_FORMATE steht in einer Registerzeile; jede Zeile hat einen Prüfer (`echt` oder
   `pruefer`) oder sagt, warum nicht (`kandidat` oder `suche`); die Zahl der Zeilen ohne Prüfer darf nur sinken.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../tools/standards-register-pruefen.js');

const KONTEXT = { exportIds: new Set(['weg-x']), importIds: new Set(['ein-x']), dateiExistiert: (p) => p === 'tests/da.test.js' };
const zeile = (extra = {}) => ({ id: 'std-x', status: 'teilweise', exportwege: ['weg-x'], importwege: ['ein-x'], ...extra });
const datei = (standards) => [{ datei: 'tools/standards-register/fhir-ig.json', inhalt: { familie: 'fhir-ig', adapter: null, standards } }];
const KANDIDAT = { werkzeug: 'Prüfer X 1.0', quelle: 'https://example.org/pruefer-x' };

test('[Standards·Deckung] eine Zeile mit gemessenem Prüfer und beide Wege gedeckt: kein Mangel', () => {
  const r = R.pruefeDeckung(datei([zeile({ pruefer: 'tests/da.test.js' })]), KONTEXT, { ohnePruefer: 0 });
  assert.deepEqual(r.maengel, []);
  assert.equal(r.ohnePruefer, 0);
});

test('[Standards·Deckung·Rot-Beweis] ein Export- oder Importweg ohne Registerzeile fällt', () => {
  const r = R.pruefeDeckung(datei([zeile({ exportwege: [], importwege: [], pruefer: 'tests/da.test.js' })]), KONTEXT, null);
  assert.ok(r.maengel.includes('Exportweg weg-x steht in keiner Registerzeile'), r.maengel.join('\n'));
  assert.ok(r.maengel.includes('Importweg ein-x steht in keiner Registerzeile'), r.maengel.join('\n'));
});

test('[Standards·Deckung·Rot-Beweis] eine Zeile ohne Prüfer, ohne Kandidat und ohne Suche fällt; mit einem davon nicht', () => {
  assert.ok(R.pruefeDeckung(datei([zeile()]), KONTEXT, null).maengel.some((x) => /std-x: ohne Prüfer/.test(x)));
  assert.ok(R.pruefeDeckung(datei([zeile({ kandidat: { werkzeug: 'X' } })]), KONTEXT, null).maengel.some((x) => /ohne Prüfer/.test(x)), 'ein Kandidat ohne Quelle zählt nicht');
  assert.deepEqual(R.pruefeDeckung(datei([zeile({ kandidat: KANDIDAT })]), KONTEXT, null).maengel, []);
  assert.deepEqual(R.pruefeDeckung(datei([zeile({ suche: { quelle: 'https://example.org/suche', ergebnis: 'kein Prüfer veröffentlicht' } })]), KONTEXT, null).maengel, []);
});

test('[Standards·Deckung·Rot-Beweis] ein pruefer, den es nicht gibt, fällt; echt zählt als Prüfer', () => {
  assert.ok(R.pruefeDeckung(datei([zeile({ pruefer: 'tests/weg.test.js' })]), KONTEXT, null).maengel.some((x) => /pruefer tests\/weg\.test\.js gibt es nicht/.test(x)));
  assert.equal(R.hatPruefer({ status: 'echt' }), true);
  assert.equal(R.hatPruefer({ status: 'teilweise' }), false);
});

test('[Standards·Deckung·Ratsche] der Deckel der Zeilen ohne Prüfer sinkt nur', () => {
  const ohne = datei([zeile({ kandidat: KANDIDAT })]);
  assert.deepEqual(R.pruefeDeckung(ohne, KONTEXT, { ohnePruefer: 1 }).maengel, []);
  assert.ok(R.pruefeDeckung(ohne, KONTEXT, { ohnePruefer: 0 }).maengel.some((x) => /Deckel 0 —/.test(x)), 'eine neue Zeile ohne Prüfer über dem Deckel');
  assert.ok(R.pruefeDeckung(ohne, KONTEXT, { ohnePruefer: 2 }).maengel.some((x) => /steht zu hoch/.test(x)), 'Luft im Deckel');
});

test('[Standards·Deckung·Bestand] jedes Format des Kerns steht im Register, jede Zeile hat Prüfer, Kandidat oder Suche, der Deckel stimmt', () => {
  const kontext = R.kontextLesen();
  const r = R.pruefeDeckung(R.registerLesen(), kontext, R.deckungGrundlinieLesen());
  assert.deepEqual(r.maengel, [], r.maengel.join('\n'));
  assert.ok(kontext.exportIds.size >= 10 && kontext.importIds.size >= 18, 'Vorbedingung: die Format-Registries wurden gelesen');
});
