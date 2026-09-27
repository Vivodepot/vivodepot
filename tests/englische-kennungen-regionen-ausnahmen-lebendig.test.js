'use strict';
/* Lebendigkeit von REGIONEN_AUSNAHMEN (22.09.2026, Fund beim DoD-2-Nachzug)
   ───────────────────────────────────────────────────────────────────────────────────────────
   BEFUND: eine Region in `tools/englische-kennungen-pruefen.js#REGIONEN_AUSNAHMEN`, deren `beginn`/
   `ende`-Anker keine Stelle mehr im Bestand findet, verschwindet LAUTLOS — `dateiPruefen` prüft
   `if (start < 0) continue;` und überspringt die Region ersatzlos, ohne Fehler, ohne Meldung. Der
   betroffene Text-Abschnitt wird dann wieder VOLL geprüft, was die gemeldete Fundstellen-Zahl nach
   oben ODER unten verschiebt — je nachdem, ob der Abschnitt heute Alt-Kennungen trägt oder nicht —
   OHNE dass sich eine Produktzeile geändert hätte. Ebenso lautlos: ein `nurMuster`, das innerhalb
   seiner (gefundenen) Region null Treffer hat, maskiert nichts, obwohl die Region selbst existiert.

   GEMESSEN, 22.09.2026: von 20 Einzel- und Sammel-Einträgen in `REGIONEN_AUSNAHMEN` finden 11
   ihren Anker nicht mehr oder maskieren nichts — davon einer ausdrücklich bewusst stehengelassen
   (`BUERGERMODUL_BUENDEL`, die Konstante ist heute nur noch `null`, s. eigener Bericht), die
   übrigen zehn (davon neun allein in `vivodepot-lesen.html`) sind ein neuer, eigenständiger Fund
   und NICHT Gegenstand dieser Datei — sie hält nur fest, DASS der Wächter sie findet, nicht warum
   jede einzelne verwaist ist.

   LANDEN MIT GRUNDLINIE: ein Gate, das beim Landen rot ist, blockiert die Suite für alle — darum
   steht der Bestand NICHT als rohe Positivkontrolle (`assert.deepEqual(befunde, [])`, die heute
   fehlschlagen MÜSSTE), sondern als RATSCHE gegen `tools/englische-kennungen-grundlinie.json`
   (`tote_anker`, eine Positivliste von NAMEN, keine Zahl/Obergrenze). Ein neuer, unlisteter
   Fund ist rot; ein Listen-Eintrag, zu dem kein Fund mehr passt, ist wieder lebendig geworden und
   muss aus der Liste — sonst hält sie einen Stand, den es nicht mehr gibt. So bleibt sichtbar,
   DASS neun Lese-App-Rückstände noch offen sind, ohne den Wächter beim Landen zu blockieren.

   Diese Datei hält zwei Dinge:
     1) den echten Bestand — die REALEN `REGIONEN_AUSNAHMEN` gegen die echten Dateien, als
        Ratsche gegen die Grundlinie (s. o.) — der Bestand ist heute NICHT lebendig, das ist der
        Punkt, aber jeder tote Anker ist benannt und darf nicht kommentarlos wachsen.
     2) den WÄCHTER selbst, an einer erfundenen, injizierten Dateizuordnung — Positivkontrolle
        (lebendige Anker sind kein Fund) und Rot-Beweis (toter `beginn`, toter `ende`, `nurMuster`
        mit 0 Treffern), unabhängig vom echten Bestand.
   ═════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const K = require('../tools/englische-kennungen-pruefen.js');

const GRUNDLINIE_PFAD = path.join(__dirname, '..', 'tools', 'englische-kennungen-grundlinie.json');
const echteGrundlinie = () => JSON.parse(fs.readFileSync(GRUNDLINIE_PFAD, 'utf8'));

/* ── 1 · der echte Bestand: heute NICHT lebendig — als RATSCHE, nicht als Positivkontrolle ────
   Ein Gate, das beim Landen rot ist, blockiert die Suite für alle. Die elf heute toten/wirkungslosen
   Einträge stehen darum NAMENTLICH (nicht als Zahl) in `tools/englische-kennungen-grundlinie.json`
   (`tote_anker`). Ein NEUER toter Anker (nicht in der Liste) ist rot. Ein Listen-Eintrag, zu dem
   kein Fund mehr passt, ist wieder lebendig geworden und muss aus der Liste — die Zahl kann nur
   sinken. So bleibt „gebaut, aber die Lese-App-Rückstände nicht geprüft" sichtbar, statt lautlos
   grün zu werden. */
test('[Regionen-Lebendigkeit·Ratsche] jeder heute tote/wirkungslose Anker steht namentlich in der Grundlinie — kein neuer, keiner heimlich verschwunden', () => {
  const befunde = K.regionenAusnahmenLebendigkeit(K.REGIONEN_AUSNAHMEN);
  const r = K.regionenAusnahmenRatsche(echteGrundlinie(), befunde);
  assert.deepEqual(r.neu.map((b) => b.datei + ': ' + (b.beginn || '').slice(0, 60)), [], 'NEUER toter Anker, nicht in der Grundlinie — Nachziehen: node -e "console.log(JSON.stringify(require(\'./tools/englische-kennungen-pruefen.js\').regionenAusnahmenLebendigkeit(require(\'./tools/englische-kennungen-pruefen.js\').REGIONEN_AUSNAHMEN)))"');
  assert.deepEqual(r.wiederLebendig.map((e) => e.eintrag), [], 'ein Grundlinien-Eintrag ist wieder lebendig — aus tools/englische-kennungen-grundlinie.json entfernen, sonst hält sie einen Stand, den es nicht mehr gibt');
});

test('[Regionen-Lebendigkeit·Bestand] der EINE bewusst stehengelassene Blindgänger steht mit seinem ECHTEN Grund in der Grundlinie (nicht „nicht geprüft")', () => {
  const eintrag = echteGrundlinie().tote_anker.find((e) => e.datei === 'vivodepot.html' && /BUERGERMODUL_BUENDEL/.test(e.eintrag));
  assert.ok(eintrag, 'der bekannte Blindgänger muss in der Grundlinie stehen');
  assert.match(eintrag.grund, /null/, 'sein Grund muss den echten Zustand nennen (die Konstante ist heute null), nicht "nicht root-cause-geprüft"');
  assert.doesNotMatch(eintrag.grund, /^nicht root-cause-geprueft/, 'BUERGERMODUL_BUENDEL und "noch nicht geprüft" sind zwei verschiedene Zustände');
});

/* ── 2 · der Wächter selbst: erfunden, injiziert, unabhängig vom echten Bestand ──────────────── */

const dateien = (zuordnung) => (datei) => Object.prototype.hasOwnProperty.call(zuordnung, datei) ? zuordnung[datei] : null;

test('[Regionen-Lebendigkeit·Positivkontrolle] lebendige Anker (beginn, ende, nurMuster mit Treffer) sind kein Fund', () => {
  const regionen = {
    'erfunden.js': [
      { beginn: 'ANFANG', ende: 'ENDE', grund: 'ohne nurMuster' },
      { beginn: 'START(', ende: ')SCHLUSS', nurMuster: /'[a-z]+'/g, grund: 'mit nurMuster, ein Treffer innerhalb' },
    ],
  };
  const text = "ANFANG mittendrin ENDE\nSTART( 'treffer' )SCHLUSS";
  const befunde = K.regionenAusnahmenLebendigkeit(regionen, dateien({ 'erfunden.js': text }));
  assert.deepEqual(befunde, []);
});

test('[Regionen-Lebendigkeit·Rot-Beweis] ein toter `beginn`-Anker wird gefunden', () => {
  const regionen = { 'erfunden.js': [{ beginn: 'GIBT_ES_NICHT_MEHR', ende: 'ENDE', grund: 'x' }] };
  const befunde = K.regionenAusnahmenLebendigkeit(regionen, dateien({ 'erfunden.js': 'ANFANG mittendrin ENDE' }));
  assert.equal(befunde.length, 1);
  assert.match(befunde[0].fehler, /`beginn` nicht gefunden/);
});

test('[Regionen-Lebendigkeit·Rot-Beweis] ein toter `ende`-Anker wird gefunden (beginn existiert, ende nicht — z. B. nach einem Refactor DANACH)', () => {
  const regionen = { 'erfunden.js': [{ beginn: 'ANFANG', ende: 'GIBT_ES_NICHT_MEHR', grund: 'x' }] };
  const befunde = K.regionenAusnahmenLebendigkeit(regionen, dateien({ 'erfunden.js': 'ANFANG mittendrin ENDE' }));
  assert.equal(befunde.length, 1);
  assert.match(befunde[0].fehler, /`ende` nicht gefunden/);
});

test('[Regionen-Lebendigkeit·Rot-Beweis] ein `nurMuster` ohne Treffer innerhalb der (gefundenen) Region wird gefunden', () => {
  const regionen = { 'erfunden.js': [{ beginn: 'ANFANG', ende: 'ENDE', nurMuster: /GIBT_ES_HIER_NICHT/g, grund: 'x' }] };
  const befunde = K.regionenAusnahmenLebendigkeit(regionen, dateien({ 'erfunden.js': "ANFANG 'treffer' ENDE" }));
  assert.equal(befunde.length, 1);
  assert.match(befunde[0].fehler, /`nurMuster` trifft 0 Zeilen/);
});

test('[Regionen-Lebendigkeit·Rot-Beweis] eine nicht lesbare Datei ist ein eigener, benannter Fehlschlag — nicht stumm übersprungen', () => {
  const regionen = { 'gibt-es-nicht.js': [{ beginn: 'x', ende: 'y', grund: 'z' }] };
  const befunde = K.regionenAusnahmenLebendigkeit(regionen, dateien({}));
  assert.equal(befunde.length, 1);
  assert.equal(befunde[0].fehler, 'Datei nicht lesbar');
});

test('[Regionen-Lebendigkeit·Rot-Beweis] mehrere Regionen derselben Datei werden unabhängig geprüft — ein toter Anker verdeckt nicht die anderen', () => {
  const regionen = {
    'erfunden.js': [
      { beginn: 'LEBT', ende: 'LEBT_ENDE', grund: 'x' },
      { beginn: 'TOT', ende: 'TOT_ENDE', grund: 'y' },
    ],
  };
  const befunde = K.regionenAusnahmenLebendigkeit(regionen, dateien({ 'erfunden.js': 'LEBT mitte LEBT_ENDE' }));
  assert.equal(befunde.length, 1);
  assert.equal(befunde[0].index, 1);
});
