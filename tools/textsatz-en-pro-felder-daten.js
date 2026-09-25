'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   textsatz-en-pro-felder-daten.js — die englischen Sektion-/Feld-/UnterFeld-/
   Options-Kennungen für die 56 Pro-Felder (Auftrag, 10.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   ZIEHT, SCHREIBT NICHT AB: die englischen Texte kommen wörtlich aus
   tests/fixtures/pro-geschaeftsfuehrerin-notfallmappe-vorlage-en.json — hier
   steht keine zweite Übersetzung, nur dieselbe Ableitung wie in
   tools/pro-bereichsersatz-erzeugen.js (tools/lib/pro-felder-aus-vorlage.js),
   gegen dieselben 56 Felder gefahren, damit Kennung UND Wert garantiert aus
   demselben Feldpaar stammen — kein Indexversatz möglich.

   `notiz` fehlt hier bewusst: sein Label bleibt literal Deutsch (unverändert
   seit vor diesem Auftrag, kein `tpl_`-Präfix, `_MODULFELD_KENNUNG` würde die
   Kennung ohnehin verwerfen) — außerhalb des Auftragsumfangs (56 recherchierte
   Felder), nicht vergessen.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { baueSektionen } = require('./lib/pro-felder-aus-vorlage.js');

const REPO = path.join(__dirname, '..');
const VORLAGE_DE = path.join(REPO, 'tools', 'templates', 'vivodepot-pro-geschaeftsfuehrerin-notfallmappe-vorlage-de.json');
const VORLAGE_EN = path.join(REPO, 'tools', 'templates', 'vivodepot-pro-geschaeftsfuehrerin-notfallmappe-vorlage-en.json');

function bauen() {
  const vorlageDe = JSON.parse(fs.readFileSync(VORLAGE_DE, 'utf8')).felder;
  const vorlageEn = JSON.parse(fs.readFileSync(VORLAGE_EN, 'utf8')).felder;
  return baueSektionen(vorlageDe, vorlageEn).enTexte;
}

const TEXTSATZ_EN_PRO_FELDER = Object.freeze(bauen());

module.exports = { TEXTSATZ_EN_PRO_FELDER, bauen };
