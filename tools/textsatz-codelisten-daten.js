'use strict';
/* Die Namen der Codelisten-Einträge je Sprache (U2-ADR-480, Befund WAEHRUNG-FEST-EUR, Option iii). Im Gerüst steht je Eintrag
   nur der Code (code-listen/<systemId>.json, anzeigeName = Code); den Namen liefert das Sprachmodul unter
   `codeliste:<systemId>/<Code>.anzeige`. Fehlt der Eintrag in einem Modul, zeigt der Kern den Code — nie leer, nie eine Kennung.
   Gelesen von tools/textsatz-de-modul-erzeugen.js und tools/textsatz-en-modul-erzeugen.js; Probe tests/codeliste-iso4217.test.js. */
const TEXTSATZ_DE_CODELISTEN = Object.freeze(Object.assign({
  'codeliste:iso4217/EUR.anzeige': 'Euro',
  'codeliste:iso4217/USD.anzeige': 'US-Dollar',
  'codeliste:iso4217/GBP.anzeige': 'Pfund Sterling',
  'codeliste:iso4217/CHF.anzeige': 'Schweizer Franken',
}, codelistenNamenDe()));
/* Englisch (01.11.2026): außer den eigenen Währungsnamen (iso4217) folgt der Name jedes Eintrags einer Liste, deren Kopf
   `quellSprache: "en"` führt (SNOMED, LOINC), dem amtlichen englischen Begriff `quellBegriff` — abgeleitet aus code-listen/*.json,
   nicht abgeschrieben, keine eigene Übersetzung. Listen mit `quellSprache: "de"` (ICD-10-GM) und ohne englische Primärquelle (ATC)
   bleiben im englischen Produkt bei der Anzeige der Liste. Probe: tests/codeliste-sprache-anzeige.test.js. */
/* Dieselben Kennungen stehen im deutschen Satz mit dem Namen der Liste (anzeigeName): beide Sätze tragen dieselbe Kennungsmenge
   (DE/EN-Parität), und Deutsch zeigt, was die Liste zeigt. */
/* Nur Listen, die ein Feld trägt (02.11.2026): eine Kennung ohne Feld zeigt niemand — LOINC steht nur in
   den FHIR-Abschnitten des Kerns, dort mit dem amtlichen Begriff aus der Liste. Gelesen aus den Bereichsquellen, nicht abgeschrieben;
   Probe: tests/codeliste-sprache-anzeige.test.js [Codeliste·Sprache·nur mit Feld]. */
function listenMitFeld() {
  const fs = require('node:fs');
  const path = require('node:path');
  const { vorlageAufloesen, vorlagenOrdnerAufloesen } = require('./lib/vorlage-aufloesen.js');
  const repo = path.join(__dirname, '..');
  const ordner = vorlagenOrdnerAufloesen(repo, path.join(repo, 'tools', 'bereich-templates')); // zuschnitt-privat: öffentlich liest die Ableitung das erfundene Gegenstück
  const quellen = ordner ? fs.readdirSync(ordner).filter((n) => n.endsWith('.json')).map((n) => path.join(ordner, n)) : [];
  quellen.push(vorlageAufloesen(repo, path.join(repo, 'tools', 'bereiche-nativ-katalog-modul.json'))); // zuschnitt-privat: öffentlich liest die Ableitung das erfundene Gegenstück
  const ids = new Set();
  for (const q of quellen) for (const m of fs.readFileSync(q, 'utf8').matchAll(/"codeListe"\s*:\s*"([A-Za-z0-9]+)"/g)) ids.add(m[1]);
  return ids;
}
function codelistenNamenDe() {
  const fs = require('node:fs');
  const path = require('node:path');
  const ordner = path.join(__dirname, '..', 'code-listen');
  const aus = {};
  const mitFeld = listenMitFeld();
  for (const f of fs.readdirSync(ordner).filter((n) => n.endsWith('.json')).sort()) {
    const liste = JSON.parse(fs.readFileSync(path.join(ordner, f), 'utf8'));
    if (liste.quellSprache !== 'en' || !Array.isArray(liste.daten) || !mitFeld.has(liste.systemId)) continue;
    for (const e of liste.daten) {
      if (e && e.code != null && typeof e.quellBegriff === 'string' && e.quellBegriff && typeof e.anzeigeName === 'string') {
        aus['codeliste:' + liste.systemId + '/' + e.code + '.anzeige'] = e.anzeigeName;
      }
    }
  }
  return aus;
}
function codelistenQuellbegriffeEn() {
  const fs = require('node:fs');
  const path = require('node:path');
  const ordner = path.join(__dirname, '..', 'code-listen');
  const aus = {};
  const mitFeld = listenMitFeld();
  for (const f of fs.readdirSync(ordner).filter((n) => n.endsWith('.json')).sort()) {
    const liste = JSON.parse(fs.readFileSync(path.join(ordner, f), 'utf8'));
    if (liste.quellSprache !== 'en' || !Array.isArray(liste.daten) || !mitFeld.has(liste.systemId)) continue;
    for (const e of liste.daten) {
      if (e && e.code != null && typeof e.quellBegriff === 'string' && e.quellBegriff) {
        aus['codeliste:' + liste.systemId + '/' + e.code + '.anzeige'] = e.quellBegriff;
      }
    }
  }
  return aus;
}
const TEXTSATZ_EN_CODELISTEN = Object.freeze(Object.assign({
  'codeliste:iso4217/EUR.anzeige': 'euro',
  'codeliste:iso4217/USD.anzeige': 'US dollar',
  'codeliste:iso4217/GBP.anzeige': 'pound sterling',
  'codeliste:iso4217/CHF.anzeige': 'Swiss franc',
}, codelistenQuellbegriffeEn()));
module.exports = { TEXTSATZ_DE_CODELISTEN, TEXTSATZ_EN_CODELISTEN, listenMitFeld };
