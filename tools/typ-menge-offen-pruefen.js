#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Rechtsraum-Katalog, Posten 4 (U2-ADR-121) — Wächter gegen eine geschlossen
   behandelte Instrument-Typ-Menge
   ────────────────────────────────────────────────────────────────────────────
   Punkt 4 des ADR: die Menge der `typ`-Werte ist NICHT auf die fünf deutschen
   Instrumente begrenzt — Kardinalität `typ` ↔ Rechtsraum ist 0, 1 oder mehrere
   in beide Richtungen. Der Auftrag nennt zwei konkrete Verstoßmuster, gegen die
   dieser Wächter scannt:

     1) SCHALTER OHNE DEFAULT-FALL — ein `switch (typ)` oder
        `switch (instrumentTyp)`, dessen Zweige die bekannten Werte einzeln
        behandeln, OHNE `default:`-Zweig. Ein von außen mitgebrachter `typ`
        fiele durch den Schalter, statt übersprungen zu werden (Kellerwand 3).
        Die App verwendet für Instrument-Typ-Dispatch durchgehend
        Lookup-Objekte mit Fallback (AB_WERK_RECHTSRAUM_DE, VORSORGE_EINZIGARTIG,
        _MODUL_KARTE) statt `switch` — dieser Wächter hält das so.

     2) ARRAY-LÄNGE-ANNAHME — ein `.length === N`/`.length == N` auf derselben
        Zeile wie eine der drei bekannten Instrument-Typ-Sammlungen
        (`AB_WERK_RECHTSRAUM_DE`, `VORSORGE_MODULE`, `vorsorge_instrumente`).
        Eine feste Zahl bricht lautlos, sobald ein sechster/siebter Typ dazu
        kommt, ohne dass irgendein Test rot würde.

   ZERO-TOLERANCE, KEINE GRUNDLINIE: anders als beim BGB-Wächter (Posten 4 der
   ersten Fassung) gibt es hier keinen legitimen Bestandsfall, den man
   klassifizieren müsste — beide Muster sollen schlicht nicht vorkommen.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const HTML_PFAD = process.env.KERN_HTML_PATH
  ? path.resolve(process.env.KERN_HTML_PATH)
  : path.join(REPO, 'vivodepot.html');

const TYP_VARIABLEN = ['instrumentTyp', 'typ'];
const TYP_SAMMLUNGEN = ['AB_WERK_RECHTSRAUM_DE', 'VORSORGE_MODULE', 'vorsorge_instrumente'];

/* ── 1 · Schalter ohne Default-Fall ─────────────────────────────────────────── */
// Findet `switch (<var>)` für <var> aus TYP_VARIABLEN, liest den Block über
// Klammer-Balance (kein Parser — reicht für ein reales, gut formatiertes
// switch/case; s. Grenzen unten) und prüft ihn auf einen `default:`-Zweig.
function switchBloeckeOhneDefault(quelle) {
  const treffer = [];
  // Bewusst NUR die nackte Variable (kein `x.typ`) — ein Feld-Typ-Schalter (`feld.typ`:
  // text/zahl/datum/…) ist ein ANDERER Namensraum als der Instrument-`typ`, syntaktisch aber nicht
  // unterscheidbar; ein Mitfangen von `feld.typ` wäre ein Fehlalarm im falschen Namensraum.
  const oeffner = new RegExp('switch\\s*\\(\\s*(' + TYP_VARIABLEN.join('|') + ')\\s*\\)\\s*\\{', 'g');
  let m;
  while ((m = oeffner.exec(quelle))) {
    const startKlammer = quelle.indexOf('{', m.index);
    if (startKlammer === -1) continue;
    let tiefe = 0, i = startKlammer;
    for (; i < quelle.length; i++) {
      if (quelle[i] === '{') tiefe++;
      else if (quelle[i] === '}') { tiefe--; if (tiefe === 0) break; }
    }
    const block = quelle.slice(startKlammer, i + 1);
    if (!/\bdefault\s*:/.test(block)) {
      const zeile = quelle.slice(0, m.index).split('\n').length;
      treffer.push({ variable: m[1], zeile, ausschnitt: m[0] });
    }
  }
  return treffer;
}

/* ── 2 · Array-Länge-Annahme ─────────────────────────────────────────────────── */
// Pro Zeile: enthält sie sowohl eine der drei Typ-Sammlungen als auch einen
// `.length === N`/`.length == N`-Vergleich?
function laengeAnnahmenZeilen(quelle) {
  const treffer = [];
  const laengeMuster = /\.length\s*={2,3}\s*\d+/;
  const sammlungMuster = new RegExp(TYP_SAMMLUNGEN.join('|'));
  quelle.split('\n').forEach((zeile, idx) => {
    if (laengeMuster.test(zeile) && sammlungMuster.test(zeile)) {
      treffer.push({ zeile: idx + 1, ausschnitt: zeile.trim() });
    }
  });
  return treffer;
}

function main() {
  const quelle = fs.readFileSync(HTML_PFAD, 'utf8');
  const schalter = switchBloeckeOhneDefault(quelle);
  const laenge = laengeAnnahmenZeilen(quelle);
  const rot = schalter.length > 0 || laenge.length > 0;

  if (!rot) {
    console.log('GATE grün — kein switch(typ)/switch(instrumentTyp) ohne default, keine .length===N-Annahme '
      + 'auf AB_WERK_RECHTSRAUM_DE/VORSORGE_MODULE/vorsorge_instrumente.');
    return;
  }
  console.error('GATE ROT — geschlossen behandelte Instrument-Typ-Menge (U2-ADR-121 Punkt 4):');
  for (const t of schalter) console.error(`    SCHALTER OHNE DEFAULT: Zeile ${t.zeile} — ${t.ausschnitt}`);
  for (const t of laenge) console.error(`    LÄNGE-ANNAHME: Zeile ${t.zeile} — ${t.ausschnitt}`);
  process.exitCode = 1;
}

if (require.main === module) main();
module.exports = { switchBloeckeOhneDefault, laengeAnnahmenZeilen, TYP_VARIABLEN, TYP_SAMMLUNGEN };
