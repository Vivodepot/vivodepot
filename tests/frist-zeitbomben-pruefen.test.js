'use strict';
/* Wächter gegen Zeitbomben (Befund ZEITBOMBE-RENDER-CHARAKTERISIERUNG, Klasse): ein festes Datum, das in einer Probe oder einem
   Werkzeug mit der aktuellen Zeit verglichen wird, kippt am Stichtag von selbst. tools/frist-zeitbomben-pruefen.js findet jede
   solche Stelle; diese Probe hält den Bestand gegen die Grundlinie und zeigt am Beispiel, dass eine Frist in zwei Tagen rot ist,
   bevor sie kippt. Die Beispielzeilen sind zusammengesetzt, damit diese Datei selbst keine Zeitbombe trägt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const F = require('../tools/frist-zeitbomben-pruefen.js');

const REPO = path.join(__dirname, '..');
const JETZT_NEU = 'new ' + 'Date()';
const JETZT_NOW = 'Date' + '.now()';
const tagIso = (heute, plus) => new Date(Date.parse(heute + 'T00:00:00Z') + plus * 86400000).toISOString().slice(0, 10);
const HEUTE = '2026-11-01';

test('[Fristen] der Bestand trägt keine Frist ohne Grundlinie und keine, die in drei Tagen abläuft', () => {
  const { fristen, fehler } = F.pruefen({ repo: REPO });
  assert.deepEqual(fehler, [], 'künftige Fristen: ' + fristen.map((f) => f.datum + ' ' + f.datei + ':' + f.zeile).join(', '));
});

test('[Fristen·Rot-Beweis] eine Frist in zwei Tagen ist rot, auch mit Grundlinie; in vier Tagen mit Grundlinie grün', () => {
  const in2 = tagIso(HEUTE, 2);
  const in4 = tagIso(HEUTE, 4);
  const dateien = {
    'tests/bald.test.js': "if (" + JETZT_NEU + " >= new Date('" + in2 + "T00:00:00Z')) assert.ok(liste.length > 0);\n",
    'tests/spaeter.test.js': "const FRIST = Date.parse('" + in4 + "');\nif (" + JETZT_NOW + " > FRIST) assert.fail('abgelaufen');\n",
  };
  const lesen = (d) => dateien[d];
  const fristen = F.fristenFinden(Object.keys(dateien), lesen, HEUTE);
  assert.deepEqual(fristen.map((f) => f.datei + ' ' + f.datum), ['tests/bald.test.js ' + in2, 'tests/spaeter.test.js ' + in4]);

  const ohne = F.urteil(fristen, { eintraege: [] }, HEUTE);
  assert.equal(ohne.length, 2, ohne.join('\n'));
  assert.ok(ohne.every((f) => /^neue Frist ohne Grundlinie/.test(f)), ohne.join('\n'));

  const gl = { eintraege: [
    { datei: 'tests/bald.test.js', datum: in2, eigentuemer: 'Beispiel-Strang', grund: 'Beispiel: Förderfrist, die in zwei Tagen kippt' },
    { datei: 'tests/spaeter.test.js', datum: in4, eigentuemer: 'Beispiel-Strang', grund: 'Beispiel: Förderfrist, die in vier Tagen kippt' },
  ] };
  const mit = F.urteil(fristen, gl, HEUTE);
  assert.deepEqual(mit, ['Frist läuft ab: tests/bald.test.js:1 ' + in2 + ' in 2 Tagen — verschieben oder streichen']);
  assert.equal(F.VORLAUF_TAGE, 3, 'der Vorlauf steht fest im Werkzeug');
  assert.deepEqual(F.urteil(fristen, gl, tagIso(HEUTE, -2)).filter((f) => /läuft ab/.test(f)), [], 'vier Tage vorher noch grün');
});

test('[Fristen·Rot-Beweis] die Bauform des Vorfalls vom 03.11.2026 wird gefunden, vorher und am Stichtag', () => {
  const zeile = '  if (' + JETZT_NEU + " >= new Date('2026-11-03T00:00:00Z')) assert.ok(pfade.length > 0, 'die Pfade fehlen noch');\n";
  const funde = F.fristenFinden(['tests/vorfall.test.js'], () => zeile, '2026-10-31');
  assert.deepEqual(funde, [{ datei: 'tests/vorfall.test.js', zeile: 1, datum: '2026-11-03' }]);
  assert.match(F.urteil(funde, { eintraege: [{ datei: 'tests/vorfall.test.js', datum: '2026-11-03', eigentuemer: 'Beispiel-Strang', grund: 'Förderfrist des Vorfalls, Beispiel' }] }, '2026-10-31')[0], /^Frist läuft ab: .* in 3 Tagen/);
  assert.equal(F.fristenFinden(['tests/vorfall.test.js'], () => zeile, '2026-11-03').length, 1, 'am Stichtag selbst noch gefunden');
});

test('[Fristen·Abgrenzung] feste Uhr, vergangenes Datum und Zahlenform', () => {
  const feste = "assert.equal(urteil(letzte, new Date('2026-11-05T00:00:00Z')).stufe, 'still');\n";
  assert.deepEqual(F.stellenInText(feste), [], 'ein festes Datum ohne aktuelle Zeit ist eine feste Uhr');
  const alt = 'const alter = ' + JETZT_NOW + " - Date.parse('2021-09-12');\n";
  assert.deepEqual(F.fristenFinden(['t.js'], () => alt, HEUTE), [], 'ein vergangenes Datum kippt nicht mehr');
  const zahl = 'if (' + JETZT_NOW + ' > Date.UTC(2026, 10, 3)) x();\n';
  assert.deepEqual(F.stellenInText(zahl), [{ zeile: 1, datum: '2026-11-03' }], 'Monat ab 0');
  const uhren = '  for (const t of [tag, new Date(2076, 11, 31), new Date(2027, 0, 1), ' + JETZT_NEU + ']) pruefe(t);\n';
  assert.deepEqual(F.stellenInText(uhren), [], 'eine Liste fester Uhren ohne Vergleich');
  const pfeil = 'const f = () => ' + JETZT_NOW + " === Date.parse('2027-01-01');\n";
  assert.deepEqual(F.stellenInText(pfeil), [], 'ein Pfeil ist kein Vergleich');
  const ungueltig = 'if (' + JETZT_NEU + " > new Date('2026-13-01')) x();\n";
  assert.deepEqual(F.stellenInText(ungueltig), [], 'kein Kalenderdatum');
});

test('[Fristen·Grundlinie] ein Eintrag ohne Fund, ohne Eigentümer oder ohne Grund ist rot, bis er gestrichen ist', () => {
  const f = F.urteil([], { eintraege: [{ datei: 'tests/weg.test.js', datum: '2027-01-01', grund: 'kurz' }] }, HEUTE);
  assert.ok(f.some((x) => /^Grund fehlt/.test(x)), f.join('\n'));
  assert.ok(f.some((x) => /^Eigentümer fehlt/.test(x)), f.join('\n'));
  assert.ok(f.some((x) => /^Grundlinie senken: tests\/weg\.test\.js/.test(x)), f.join('\n'));
});
