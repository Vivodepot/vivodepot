'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   logikmodul-inline-lesestellen.js — der Wächter gegen die achte Kopie
   (Auftrag, Ab-Werk-Rangfolge, 08.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Vorher standen SIEBEN Kopien derselben Prüfung im Kern
   (`Array.isArray(data.logikModule) ? data.logikModule : []`), alle auf
   `_logikModuleAlle(d)` gezogen. Dieser Wächter hält fest, dass keine achte
   dazukommt: `data.logikModule`/`d.logikModule`/`ziel.logikModule` darf im
   Kern-Quelltext nur an GENAU ZWEI Stellen als Eigenschaftszugriff auftauchen
   — im Helfer selbst (`_logikModuleAlle`) und im Einlassweg, der schreibt
   (`_abWerkAuszuegeEinlassen`s Dedup-Prüfung vor `modulEinlassen`).

   Kommentare zählen nicht mit (mehrere ältere Kommentare erwähnen
   `data.logikModule` als Text, kein Code) — `entkommentiert()` ist wörtlich
   dieselbe, bereits bestehende Funktion wie in
   `tools/nur-vom-test-erreicht-pruefen.js`, nicht neu erfunden.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const { entkommentiert } = require(path.join(__dirname, '..', '..', 'tools', 'nur-vom-test-erreicht-pruefen.js'));

const MUSTER = /\b(?:data|d|ziel)\.logikModule\b/g;

// Die zwei erlaubten Code-Zeilen, wörtlich — jede andere Fundstelle ist eine achte Kopie.
const ERLAUBTE_ZEILEN = new Set([
  'const eigene = (d && Array.isArray(d.logikModule)) ? d.logikModule : [];',
  /* Code-Review 17.09.2026 (B2): das Merkmal `abWerk` wird beim Laden an den Einträgen des Depots neu
     gesetzt. Ein SCHREIBVORGANG an der Datei-Liste selbst, keine Lese-Kopie; über `_logikModuleAlle`
     ginge es gerade nicht, weil die Ab-Werk-Saat nie in der Datei steht. */
  "const eigeneImDepot = (ziel && typeof ziel === 'object' && Array.isArray(ziel.logikModule)) ? ziel.logikModule : null;",
  /* Gerüst-Schnitt S5 (21.09.2026): Stufe 81 räumt eine alte Kopie des Zugang-Auszugs aus der Datei-Liste des Depots, wenn das
     Produkt das Modul selbst trägt (sonst verdeckt sie es: eigene Module gewinnen bei gleicher Kennung). Ein SCHREIBVORGANG an
     der Datei-Liste, keine Lese-Kopie; über _logikModuleAlle ginge es nicht, weil die Saat des Produkts nie in der Datei steht. */
  'if (Array.isArray(ziel.logikModule) && Array.isArray(AB_WERK_LOGIK_MODUL_QUELLEN) && AB_WERK_LOGIK_MODUL_QUELLEN.some((m) => m && m.id === zugangId)) {',
  "ziel.logikModule = ziel.logikModule.filter((m) => !(m && m.id === zugangId && m.herkunft === 'vivodepot'));",
  /* Schema 87 (21.09.2026): dieselbe Räumung für den Erbschein-Auszug, aus demselben Grund und mit derselben Schranke. */
  'if (Array.isArray(ziel.logikModule) && Array.isArray(AB_WERK_LOGIK_MODUL_QUELLEN) && AB_WERK_LOGIK_MODUL_QUELLEN.some((m) => m && m.id === erbscheinId)) {',
  "ziel.logikModule = ziel.logikModule.filter((m) => !(m && m.id === erbscheinId && m.herkunft === 'vivodepot'));",
]);

function pruefeInlineLesestellen(quelltext) {
  const ohneKommentare = entkommentiert(quelltext);
  const zeilen = ohneKommentare.split('\n');
  const unerlaubt = [];
  zeilen.forEach((zeile, i) => {
    const treffer = zeile.match(MUSTER);
    if (!treffer) return;
    if (ERLAUBTE_ZEILEN.has(zeile.trim())) return;
    unerlaubt.push({ zeile: i + 1, text: zeile.trim() });
  });
  return { unerlaubt };
}

module.exports = { pruefeInlineLesestellen, ERLAUBTE_ZEILEN };
