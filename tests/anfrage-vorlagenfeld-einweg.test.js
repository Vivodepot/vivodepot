'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Wächter: jedes Feld einer Anfrage wird nur über die EINE Prüfung aufgelöst (U2-ADR-366-Nachtrag, 08.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund ANFRAGE-VORLAGENFELD-ANBIETERUEBERGREIFEND: Antwort, Abgleich und Einstieg lösten die Kennungen einer Anfrage je auf
   eigene Faust auf — und damit auch `tpl_`-Felder aus der Vorlage einer anderen Stelle. Jetzt geht jedes Feld einer Anfrage
   durch `anfrageVorlagenfeldPruefen` (direkt oder über `_anfrageZusammenstellung`).
   REGEL: eine Funktion im Kern, die die Felder einer Anfrage durchläuft (`anfrage.felder`, `a.felder`, `g.anfrage.felder`) UND eine
   Kennung auflöst (`kennungPruefen`, `kennungZuSelektor`, `kennungFeldDef`, `zusammenstellungDatensatz`), ruft die Prüfung —
   Ausnahmen gibt es keine: `_anfrageZusammenstellung` ruft die Prüfung selbst. ROT-BEWEIS: synthetischer Code ohne die Prüfung fällt, mit ihr nicht.
   Die übrigen Wege mit Feldliste von außen (Angehörigen-Vorlage, Vorlagen-Dokument, logikModul) hält der Klassenbefund
   VORLAGENFELD-OHNE-EIGENTUEMERPRUEFUNG, nicht dieser Wächter.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const DURCHLAUF = /\b(?:g\.anfrage|anfrage|a)\.felder\b/;
const AUFLOESER = /\b(?:kennungPruefen|kennungZuSelektor|kennungFeldDef|zusammenstellungDatensatz)\(/;
const PRUEFUNG = /\b(?:anfrageVorlagenfeldPruefen|_anfrageZusammenstellung)\(/;

function funktionen(text) {
  const zeilen = text.split('\n');
  const raus = [];
  let name = null, rumpf = [];
  for (const z of zeilen) {
    const m = /^(?:async )?function (\w+)/.exec(z);
    if (m) { if (name) raus.push({ name, rumpf: rumpf.join('\n') }); name = m[1]; rumpf = [z]; continue; }
    if (name) rumpf.push(z);
  }
  if (name) raus.push({ name, rumpf: rumpf.join('\n') });
  return raus;
}
function verstoesse(text) {
  return funktionen(text)
    .filter((f) => DURCHLAUF.test(f.rumpf) && AUFLOESER.test(f.rumpf) && !PRUEFUNG.test(f.rumpf.replace(/^.*\n/, '')))
    .map((f) => f.name);
}

test('[Anfrage·Einweg] jede Funktion, die Felder einer Anfrage auflöst, geht durch die eine Prüfung', () => {
  assert.deepEqual(verstoesse(KERN), []);
});

test('[Anfrage·Einweg·Positivkontrolle] die drei Wege von heute sind im Suchraum und erfüllen die Regel', () => {
  const namen = funktionen(KERN).filter((f) => DURCHLAUF.test(f.rumpf) && AUFLOESER.test(f.rumpf)).map((f) => f.name);
  for (const n of ['anfrageAbgleich', 'anfrageEinstiegSchritte', '_anfrageZusammenstellung']) assert.ok(namen.includes(n), n + ' im Suchraum');
});

test('[Anfrage·Einweg·Rot-Beweis] ein Weg ohne die Prüfung fällt, derselbe mit ihr nicht', () => {
  const ohne = 'function neuerWeg(anfrage) {\n  for (const f of anfrage.felder) kennungPruefen(f.kennung);\n}\n';
  const mit = 'function neuerWeg(anfrage, pruef) {\n  for (const f of anfrage.felder) { anfrageVorlagenfeldPruefen(f.kennung, pruef, data); kennungPruefen(f.kennung); }\n}\n';
  assert.deepEqual(verstoesse(ohne), ['neuerWeg']);
  assert.deepEqual(verstoesse(mit), []);
  // Der alte Abgleich (vor dem 08.10.2026) fällt.
  const alt = 'function anfrageAbgleich(anfrage, optionen) {\n  const a = g.anfrage;\n  const ds = zusammenstellungDatensatz(a.felder.map(f => f.kennung), {}, {});\n}\n';
  assert.deepEqual(verstoesse(alt), ['anfrageAbgleich']);
});
