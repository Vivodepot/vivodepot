'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   textsatz-de-pro-felder-daten.js — die deutschen Sektion-/Feld-/UnterFeld-/
   Options-Kennungen für die 56 Pro-Felder (Strang C, 17.09.2026,
   Fund: 0/206 EN-pro-*-Kennungen standen auf Deutsch in tools/textsatz-de-
   modul.json — Pro-Beschriftungen liefen bislang ausschließlich über den
   literalen Rückfall, nie über eine deutsche Textsatz-Kennung)
   ────────────────────────────────────────────────────────────────────────────
   WÖRTLICHER SPIEGEL von tools/textsatz-en-pro-felder-daten.js — SELBE Quelle
   (tools/lib/pro-felder-aus-vorlage.js, baueSektionen), SELBE Ableitung, EIN
   Unterschied: baueSektionen(vorlageDe, vorlageDe) statt (vorlageDe,
   vorlageEn) — dieselbe, unveränderte Funktion liefert dann ihre `enTexte`
   aus der DEUTSCHEN Vorlage befüllt (der zweite Parameter ist "die Sprache,
   deren Werte in die Kennungen kommen", nicht zwingend Englisch). KEINE
   eigene Ableitungslogik, kein zweiter Nachbau — dieselbe Regel wie im
   EN-Erzeuger: ZIEHT, SCHREIBT NICHT AB.

   WARUM DAS KEINE ÜBERSETZUNG IST: die deutschen Werte stehen bereits WORT-
   GLEICH in den sechs Pro-Bereichsersatz-Dateien als literale Feld-Labels
   (pro-bereichsersatz-erzeugen.js: "Deutsch ist der Rückfall, nicht die
   Übersetzung"). Dieser Erzeuger HEBT sie nur in die Sprachachse, erfindet
   nichts — exakt der Schritt, den der DE-Textsatz-Erzeuger für den nativen
   Bestand schon einmal gegangen ist (U2-ADR-367, "Besitz-Zug").

   REIHENFOLGE, NICHT VERHANDELBAR (17.09.2026): dieser Erzeuger LANDET
   zuerst — die sechs Pro-Bereichsersatz-Dateien behalten ihre literalen Labels,
   bis die deutschen Kennungen hier UND im gebauten tools/textsatz-de-modul.json
   stehen. Reihenfolge falsch herum: Pro zeigt leere Beschriftungen.

   `notiz` fehlt hier bewusst — wörtlicher Spiegel des EN-Erzeugers (s. dessen
   Kopf-Kommentar): eigene, feste Kennung `<bereichId>.notiz.label`, nicht Teil
   der 56 Vorlage-Felder, kommt aus tools/textsatz-de-pro-bereich-daten.js.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { baueSektionen } = require('./lib/pro-felder-aus-vorlage.js');

const REPO = path.join(__dirname, '..');
const VORLAGE_DE = path.join(REPO, 'tools', 'templates', 'vivodepot-pro-geschaeftsfuehrerin-notfallmappe-vorlage-de.json');

function bauen() {
  const vorlageDe = JSON.parse(fs.readFileSync(VORLAGE_DE, 'utf8')).felder;
  // baueSektionen(de, de, {ja:'Ja', nein:'Nein'}): dieselbe Funktion wie im
  // EN-Erzeuger, unveraendert — ihr `enTexte`-Rueckgabewert heisst so nach dem
  // zweiten Parameter, nicht nach der Sprache Englisch. Mit DE als beiden
  // Parametern liefert sie DE-Text; der dritte Parameter ersetzt die sonst
  // hart codierten "Yes"/"No" (s. Kopf-Kommentar an baueSektionen) — OHNE ihn
  // stuenden "Yes"/"No" mitten im deutschen Satz, gefunden beim ersten Bau
  // dieses Erzeugers (17.09.2026), nicht vermutet.
  return baueSektionen(vorlageDe, vorlageDe, { ja: 'Ja', nein: 'Nein' }).enTexte;
}

const TEXTSATZ_DE_PRO_FELDER = Object.freeze(bauen());

module.exports = { TEXTSATZ_DE_PRO_FELDER, bauen };
