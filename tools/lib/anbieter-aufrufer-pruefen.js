'use strict';
// SPDX-License-Identifier: EUPL-1.2
// Copyright (c) 2026 Vivodepot GmbH, Berlin. Teil des Template-/Trust-Authority-Mechanismus - Lizenz siehe LICENSE, Teil 1.
/* ════════════════════════════════════════════════════════════════════════════
   anbieter-aufrufer-pruefen.js — Klassen-Wächter: JEDER Aufrufer von
   kundenzertifikat-ausstellen.js/behoerden-zertifikat-ausstellen.js reicht die neuen
   Pflichtfelder weiter (19.09.2026, Auftrag nach den vier vergessenen Demo-Werkzeugen)
   ────────────────────────────────────────────────────────────────────────────
   „Demonstriertes gehört zum Produkt" (Produktentscheidung) — die vier Demo-Werkzeuge (tools/pro-modul-
   andock-demo*.js, tools/pro-modul-demo-depotdatei*.js) riefen kundenzertifikat-ausstellen.js
   auf, ohne die neuen Pflichtfelder (anbieter-angaben/Anbieterprüfung) zu kennen — von Hand
   gefunden, nicht von einer Probe. Dieser Wächter bewacht die KLASSE, nicht nur die vier: jede
   Datei in tools/, die kundenzertifikatAusstellen/behoerdenZertifikatAusstellen aufruft, muss
   an JEDEM Aufruf `anbieterAngaben` UND (`anbieterPruefung` ODER `ohneAnbieterpruefung`) tragen
   — als Eigenschaft im Argument-Objekt, wörtlich oder durchgereicht (`opts.anbieterAngaben`
   zählt genauso wie ein Literal).

   STATISCH, NICHT DYNAMISCH: die Aufrufer haben zu verschiedene Signaturen (lauf(opts) vs.
   demo() vs. erzeugen({passwort})), ein einheitlicher Fixture-Lauf über alle wäre selbst
   fragiler als das, was er bewacht. Ein ECHTER Rauchtest für die vier Demo-Werkzeuge (ihre
   exportierten demo()/erzeugen()-Funktionen laufen gegen eine echte Kette) steht daneben als eigene
   Probe der Suite — dieser Wächter hier sichert die BREITE (jede
   Datei), der dynamische Lauf die TIEFE (läuft es wirklich durch).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const TOOLS_DIR = path.join(__dirname, '..');
const ZIEL_MODULE = Object.freeze(['kundenzertifikat-ausstellen.js', 'behoerden-zertifikat-ausstellen.js']);

function toolsDateien(ordner = TOOLS_DIR) {
  return fs.readdirSync(ordner).filter((f) => f.endsWith('.js') && !ZIEL_MODULE.includes(f) && !fs.statSync(path.join(ordner, f)).isDirectory());
}

// Findet jeden Aufruf `alias({ ... })` in `quelltext` und gibt den klammern-ausgeglichenen
// Text des Argument-Objekts zurück (übersteht verschachtelte Objekte im Argument selbst).
function aufrufKlammernInhalte(quelltext, alias) {
  const treffer = [];
  const muster = new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(\\s*\\{', 'g');
  let m;
  while ((m = muster.exec(quelltext))) {
    const start = m.index + m[0].length - 1; // Position der öffnenden '{'
    let tiefe = 0, j = start;
    for (; j < quelltext.length; j++) {
      if (quelltext[j] === '{') tiefe++;
      else if (quelltext[j] === '}') { tiefe--; if (tiefe === 0) break; }
    }
    treffer.push(quelltext.slice(start, j + 1));
    muster.lastIndex = j + 1;
  }
  return treffer;
}

// EIN Aliasname je Zielmodul, egal wie lokal benannt (`const { lauf: xyz } = require(...)`).
function aliasFuer(quelltext, ziel) {
  const m = quelltext.match(new RegExp("const\\s*\\{\\s*lauf:\\s*(\\w+)[^}]*\\}\\s*=\\s*require\\('[^']*" + ziel.replace('.', '\\.') + "'\\);"));
  return m ? m[1] : null;
}

// Prüft EINE Datei gegen BEIDE Zielmodule; wirft keine Ausnahme, gibt Funde zurück.
function pruefeDatei(pfad) {
  const quelltext = fs.readFileSync(pfad, 'utf8');
  const funde = [];
  for (const ziel of ZIEL_MODULE) {
    const alias = aliasFuer(quelltext, ziel);
    if (!alias) continue; // diese Datei ruft dieses Zielmodul gar nicht auf
    const aufrufe = aufrufKlammernInhalte(quelltext, alias);
    aufrufe.forEach((text, index) => {
      const hatAngaben = /\banbieterAngaben\b/.test(text);
      const hatPruefungOderSchalter = /\banbieterPruefung\b/.test(text) || /\bohneAnbieterpruefung\b/.test(text);
      if (!hatAngaben || !hatPruefungOderSchalter) {
        funde.push({
          datei: path.basename(pfad), ziel, aufrufIndex: index,
          grund: !hatAngaben ? 'anbieterAngaben fehlt' : 'weder anbieterPruefung noch ohneAnbieterpruefung',
        });
      }
    });
  }
  return funde;
}

function alleFunde(ordner = TOOLS_DIR) {
  const funde = [];
  for (const datei of toolsDateien(ordner)) funde.push(...pruefeDatei(path.join(ordner, datei)));
  return funde;
}

module.exports = { toolsDateien, aufrufKlammernInhalte, aliasFuer, pruefeDatei, alleFunde, ZIEL_MODULE, TOOLS_DIR };
