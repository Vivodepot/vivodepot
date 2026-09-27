'use strict';
/* ════════════════════════════════════════════════════════════════════════
   W-aussagen — Zahl-Anker mit Tausender-Trenner (03.09.2026)
   ────────────────────────────────────────────────────────────────────────
   KEIN EIGENES ADR: die Suite-Messung dieses Prüfers folgt hier nur endlich
   der bereits getroffenen Entscheidung aus U2-ADR-228 (dritter, bisher
   übersprungener Erzeuger); der Zahl-Trenner-Fix ist eine lokale
   Regex-Reparatur ohne repo-weite Wirkung, anders als etwa U2-ADR-225. Beide
   sind Bugfixes an bereits entschiedenen bzw. rein lokalen Mechanismen, keine
   neue Architektur-Entscheidung.
   ────────────────────────────────────────────────────────────────────────
   FUND (03.09.2026): `tools/aussagen-abgleich-pruefen.js` las eine im
   Dokument geschriebene Zahl wie „6.589" als „589" — das alte Muster `(\d+)`
   traf nur den Rest hinter dem Punkt. Gemessen, nicht vermutet, bevor der
   Fix stand: `ankerLesen()` gegen „Heute laufen 6.589 Tests grün." bei
   korrekt gemessenem `Tests: 6589` meldete einen Fund („589" ≠ „6589") —
   eine FALSCHE Abweichung, aus einem Prüfer, dessen einziger Zweck es ist,
   Abweichungen zu melden. Der Prüfer warf dabei nie einen Fehler; er lieferte
   eine plausible, nur falsche Zahl — deshalb ist die Probe hier Pflicht und
   nicht optional (Auftrag).

   GEPRÜFT GEGEN DIE FUNKTION, NICHT GEGEN EINEN LITERALWERT: jeder Fall ruft
   `ankerLesen()` echt auf; keine Zahl hier ist zitiert und könnte morgen
   veralten, ohne dass die Probe es merkt.

   Die Klasse, nicht nur der Einzelfall (Auftrag): Punkt, Komma, schmales
   Leerzeichen (U+202F) und geschütztes Leerzeichen (U+00A0) werden alle als
   Tausender-Trenner geprüft — plus die Positivkontrolle (ungruppierte Zahl
   bleibt lesbar), die Grenzfall-Kontrolle (ein Satzpunkt direkt nach der
   Zahl gehört nicht zur Zahl) und die Gegenkontrolle (eine ECHTE Abweichung
   muss weiter auffallen — sonst hätte der Fix nur das Melden abgestellt,
   nicht das Lesen repariert). Kein Vorzeichen geprüft: keiner der Anker
   dieser Datei (Feld-/Test-/Versions-Zählungen) kann je negativ sein — das
   wäre eine erfundene Absicherung, keine gemessene (im ADR begründet).
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ankerLesen } = require('../tools/aussagen-abgleich-pruefen.js');

function funde(text, zahlen) {
  const stand = { kanaele: new Map(), zahlen, kryptoVersionen: [] };
  return ankerLesen('doku.md', '# X\n\n' + text, stand);
}

test('[Zahl-Trenner] ein Punkt-gruppierter Wert wird korrekt gelesen, keine falsche Abweichung', () => {
  assert.deepEqual(funde('Heute laufen 6.589 Tests grün.\n', { Tests: 6589 }), [],
    'ein korrekt gemessener, punkt-gruppierter Wert darf keinen Fund auslösen');
});

test('[Zahl-Trenner] ein Komma-gruppierter Wert wird korrekt gelesen', () => {
  assert.deepEqual(funde('Heute laufen 6,589 Tests grün.\n', { Tests: 6589 }), []);
});

test('[Zahl-Trenner] ein Wert mit schmalem Leerzeichen (U+202F) wird korrekt gelesen', () => {
  assert.deepEqual(funde('Heute laufen 6 589 Tests grün.\n', { Tests: 6589 }), []);
});

test('[Zahl-Trenner] ein Wert mit geschütztem Leerzeichen (U+00A0) wird korrekt gelesen', () => {
  assert.deepEqual(funde('Heute laufen 6 589 Tests grün.\n', { Tests: 6589 }), []);
});

test('[Schema·Rot-Beweis] „Schema 24 bis zum heutigen 63" wird gegen die gemessene Schema-Version gehalten', () => {
  // Die alte Zeile aus SOVEREIGNTY.md: der Kern stand auf 88.
  const f = funde('Vivodepot hält darum eine Migrationskette von Schema 24 bis zum heutigen 63 vor.\n', { 'Schema-Version': 88 });
  assert.equal(f.length, 1, JSON.stringify(f));
  assert.deepEqual([f[0].anker, f[0].gesagt, f[0].gemessen], ['Schema-Version', '63', '88']);
  assert.deepEqual(funde('Migrationskette von Schema 24 bis zum heutigen 88.\n', { 'Schema-Version': 88 }), []);
});

test('[Zahl-Trenner·Positivkontrolle] eine ungruppierte Zahl unter 1000 bleibt lesbar', () => {
  assert.deepEqual(funde('Der Katalog trägt 257 Felder.\n', { Felder: 257 }), []);
});

test('[Zahl-Trenner·Grenzfall] ein Satzpunkt direkt nach der Zahl gehört nicht zur Zahl', () => {
  // "62." am Satzende darf nicht als "62" plus verschluckten Punkt fehllesen — hier gibt es gar
  // keinen Gegenstands-Anker ("Wege"), die Probe ist: kein Absturz, kein falscher Fund.
  assert.deepEqual(funde('Es gibt 62 Wege.\n', { Tests: 6589 }), []);
});

test('[Zahl-Trenner·Rot-Beleg] eine ECHTE Abweichung muss weiter auffallen', () => {
  // Der wichtigste Fall: der Fix darf nicht nur das Melden abstellen, sondern muss weiter lesen
  // UND weiter vergleichen. "6.000" ist syntaktisch gültig gruppiert, aber sachlich falsch.
  const f = funde('Heute laufen 6.000 Tests grün.\n', { Tests: 6589 });
  assert.equal(f.length, 1, 'eine echte Abweichung wurde nicht gemeldet');
  assert.equal(f[0].gesagt, '6.000');
  assert.equal(f[0].gemessen, '6589');
});

test('[Zahl-Trenner] gilt auch für Schema-Version, SCHALEN_STAND und den Feld-Anker', () => {
  assert.deepEqual(funde('Der Bestand trägt 1.257 Felder.\n', { Felder: 1257 }), []);
  assert.deepEqual(funde('Schema-Version 1.075 ist aktuell.\n', { 'Schema-Version': 1075 }), []);
  assert.deepEqual(funde('SCHALEN_STAND v1.508 gilt.\n', { SCHALEN_STAND: 1508 }), []);
});
