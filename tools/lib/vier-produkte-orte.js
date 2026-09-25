'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   vier-produkte-orte.js — WO die Vier-Produkte-Zusammensetzung heute lebt
   (U2-ADR-386, 08.09.2026, Auftrag)
   ────────────────────────────────────────────────────────────────────────────
   ZENTRALE ARCHITEKTURAUSSAGE: "Ein fünftes Produkt anzulegen ist EINE
   Zeile an EINEM Ort." Heute stimmt das nicht — U2-ADR-383 hat gemessen, dass
   ein echtes fünftes Produkt DREI Dateien braucht, je eine Datenzeile:
   `tools/lib/vier-produkte.js` (e2s Gebiet, das Einbacken), `tools/lib/vier-
   produkte-zusammensetzung.js` (die Fünf-Achsen-Tabelle) und `tools/lib/vier-
   produkte-dateinamen.js` (die Namensgebung). Dieses Modul macht die Zahl zu
   einem MECHANISMUS statt einem Satz im ADR.

   DIE MESSUNG, NICHT EINE ANNAHME: eine Datei "trägt Zusammensetzung", wenn
   sie ALLE VIER aktuellen Produkt-Slugs als einzelne, angeführte String-
   Literale enthält (`'privat-de'` usw.) — ein einzelner Slug-Treffer beweist
   nichts (er kann ein Testfall für EIN Produkt sein), aber alle vier
   zusammen sind ein starkes Signal: die Datei zählt die Produkte selbst auf.
   GEMESSEN, NICHT ANGENOMMEN (08.09.2026): dieselbe Suche über `tests/`
   fand mehrere Treffer, die NICHTS mit der Zusammensetzung zu tun haben
   (z. B. `tests/produkt-konfektionieren.test.js` ruft `konfektionieren()`
   einmal je Slug auf — vier Aufrufe, keine Tabelle). Der Scope bleibt darum
   auf `tools/` (rekursiv, alle .js-Dateien) beschränkt, wo dieselbe Suche exakt und
   ausschließlich die drei bekannten Orte trifft (geprüft, nicht vermutet).

   DIESER WÄCHTER STEHT ABSICHTLICH UMGEDREHT (dieselbe Bauform wie
   U2-ADR-378): er behauptet die HEUTIGE Wahrheit — drei Orte, namentlich —
   und ist damit grün. Er wird ROT, sobald ein VIERTER Ort entsteht (jemand
   fügt Zusammensetzungsdaten an einer neuen Stelle hinzu) ODER einer der
   drei verschwindet (jemand führt zusammen, ohne den Wächter zu drehen).
   Beides zwingt zu einer bewussten Entscheidung: die Liste nachziehen, oder
   — im Erfolgsfall der eigentlichen Zusicherung — den Wächter umdrehen, weil
   dann nur noch EIN Ort übrig ist.

   `tools/lib/vier-produkte.js` wird HIER NUR GELESEN, nie verändert — e2
   arbeitet dort gerade (Ab-Werk-Backen, eigener noch nicht gelandeter Zug).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..', '..');
const TOOLS_ORDNER = path.join(REPO, 'tools');

// DIE NAMENTLICHE LISTE — der eigentliche Gegenstand dieses Wächters. Relative Pfade ab
// Repo-Wurzel, damit ein Diff sofort zeigt, was sich ändert.
const DREI_ORTE_NAMENTLICH = Object.freeze([
  'tools/lib/vier-produkte.js',
  'tools/lib/vier-produkte-zusammensetzung.js',
  'tools/lib/vier-produkte-dateinamen.js',
]);

function alleJsDateien(ordner) {
  const raus = [];
  for (const eintrag of fs.readdirSync(ordner, { withFileTypes: true })) {
    const voll = path.join(ordner, eintrag.name);
    if (eintrag.isDirectory()) { if (eintrag.name !== 'node_modules') raus.push(...alleJsDateien(voll)); }
    else if (eintrag.name.endsWith('.js')) raus.push(voll);
  }
  return raus;
}

// Eine Datei "trägt Zusammensetzung", wenn sie ALLE `slugs` als angeführte String-Literale
// enthält (`'slug'` oder `"slug"`) — keine Teilstring-Suche, ein einzelner Treffer beweist nichts.
function traegtZusammensetzung(dateiText, slugs) {
  return slugs.every((slug) => new RegExp(
    "['\"]" + slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "['\"]").test(dateiText));
}

// Sucht über einen beliebigen Ordner (Produktionscode standardmäßig `tools/`, per Parameter
// austauschbar für Proben auf einer Fixture-Kopie). Liefert relative Pfade ab `wurzel`.
function datenTragendeDateien(slugs, ordner, wurzel) {
  const basis = ordner || TOOLS_ORDNER;
  const w = wurzel || REPO;
  const raus = [];
  for (const datei of alleJsDateien(basis)) {
    const text = fs.readFileSync(datei, 'utf8');
    if (traegtZusammensetzung(text, slugs)) raus.push(path.relative(w, datei).split(path.sep).join('/'));
  }
  return raus.sort();
}

module.exports = { REPO, TOOLS_ORDNER, DREI_ORTE_NAMENTLICH, traegtZusammensetzung, datenTragendeDateien };
