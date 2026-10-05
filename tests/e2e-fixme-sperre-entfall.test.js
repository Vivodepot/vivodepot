'use strict';
/* Entfall der Sperr-fixmes (04.10.2026, Wort der Gegenlesung): solange die Erweiterung aus Dateien gesperrt ist, stehen
   die Proben des Einlass-Knopfs als test.fixme mit einer Kennung SPERRE-EINLASS-*. Fällt der Schalter im Kern, müssen sie
   zurück auf test — diese Probe wird sonst rot. Umgekehrt: steht der Schalter und fehlt eine Kennung, ist das kein Fehler
   dieser Probe, sondern der fixme-Ratsche. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const gesperrt = (kern) => /\nvar SELBST_EINLASS_GESPERRT = true;/.test(kern);
function sperrStellen(repo) {
  const dir = path.join(repo, 'tests', 'e2e');
  const raus = [];
  for (const d of fs.readdirSync(dir).filter((n) => n.endsWith('.spec.js'))) {
    const t = fs.readFileSync(path.join(dir, d), 'utf8');
    for (const m of t.matchAll(/\/\/\s*FIXME-ID:\s*(SPERRE-EINLASS-[A-Z0-9-]+)/g)) raus.push(d + ': ' + m[1]);
  }
  return raus;
}
const urteil = (kern, stellen) => (gesperrt(kern) ? [] : stellen);

test('[Sperr-fixme·Entfall] fällt der Sperr-Schalter, stehen keine SPERRE-EINLASS-fixmes mehr', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.deepEqual(urteil(kern, sperrStellen(REPO)), [], 'der Schalter ist gefallen — die Proben zurück auf test');
});

test('[Sperr-fixme·Rot-Beweis] ohne Schalter sind stehende fixmes rot, mit Schalter nicht', () => {
  const stellen = ['x.spec.js: SPERRE-EINLASS-X'];
  assert.deepEqual(urteil('\nvar SELBST_EINLASS_GESPERRT = true;\n', stellen), []);
  assert.deepEqual(urteil('\nvar SELBST_EINLASS_GESPERRT = false;\n', stellen), stellen);
  assert.ok(sperrStellen(REPO).length >= 12, 'Vorbedingung: die Sperr-fixmes sind gefunden');
});

/* Rückkehr des Prüfstands (04.10.2026, Wort der Gegenlesung): solange die Erbschein-E2E über den Klickweg als fixme ruht, zählt
   tests/pruefstand-bindung.test.js eine Klausel-Bindung weniger (706 → 705) und eine Konstruktions-Form weniger (492 → 491).
   Fällt der Sperr-Schalter oder steht die Probe wieder als test, müssen beide Zahlen zurück — diese Probe wird sonst rot. */
const RUECKKEHR = { gueltig: 706, konstruktion: 492 };
const ERBSCHEIN_FIXME = /test\.fixme\('volles Depot: Testament, Familienstand und Kind/;
function prueftandWerte(text) {
  const wert = (k) => Number((new RegExp('^\\s*' + k + ':\\s*\\{\\s*wert:\\s*(\\d+)', 'm').exec(text) || [])[1]);
  return { gueltig: wert('gueltig'), konstruktion: wert('konstruktion') };
}
function rueckkehrUrteil(kern, spec, werte) {
  if (gesperrt(kern) && ERBSCHEIN_FIXME.test(spec)) return [];
  const raus = [];
  if (!(werte.gueltig >= RUECKKEHR.gueltig)) raus.push('gueltig ' + werte.gueltig + ' < ' + RUECKKEHR.gueltig);
  if (werte.konstruktion !== RUECKKEHR.konstruktion) raus.push('konstruktion ' + werte.konstruktion + ' ≠ ' + RUECKKEHR.konstruktion);
  return raus;
}

test('[Sperr-fixme·Rückkehr] fällt die Sperre oder ruht die Erbschein-E2E nicht mehr, steht der Prüfstand wieder auf 706/492', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const spec = fs.readFileSync(path.join(REPO, 'tests', 'e2e', 'erbschein-vorbereitungsauszug-abnahme.spec.js'), 'utf8');
  const werte = prueftandWerte(fs.readFileSync(path.join(REPO, 'tests', 'pruefstand-bindung.test.js'), 'utf8'));
  assert.ok(Number.isFinite(werte.gueltig) && Number.isFinite(werte.konstruktion), 'Vorbedingung: beide Stände gelesen');
  assert.deepEqual(rueckkehrUrteil(kern, spec, werte), [], 'die Sperre ist gefallen oder die Probe läuft wieder — die Stände zurück auf 706/492');
});

test('[Sperr-fixme·Rückkehr·Rot-Beweis] Sperre aus und Stand 705/491 ist rot; ruht die Probe unter der Sperre, nicht', () => {
  const an = '\nvar SELBST_EINLASS_GESPERRT = true;\n', aus = '\nvar SELBST_EINLASS_GESPERRT = false;\n';
  const ruht = "test.fixme('volles Depot: Testament, Familienstand und Kind erscheinen", laeuft = "test('volles Depot: Testament, Familienstand und Kind erscheinen";
  const gesenkt = { gueltig: 705, konstruktion: 491 };
  assert.deepEqual(rueckkehrUrteil(an, ruht, gesenkt), []);
  assert.equal(rueckkehrUrteil(aus, ruht, gesenkt).length, 2, 'Sperre aus, Stand gesenkt: rot');
  assert.equal(rueckkehrUrteil(an, laeuft, gesenkt).length, 2, 'Probe läuft wieder, Stand gesenkt: rot');
  assert.deepEqual(rueckkehrUrteil(aus, laeuft, RUECKKEHR), [], 'zurückgekehrt: grün');
});
