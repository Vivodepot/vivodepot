#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A1 · KANN EINE VORLAGE EIN FELD IN DIE EIGENE RUBRIK EINES MODULS LEGEN?
   ────────────────────────────────────────────────────────────────────────────
   Gemeldet am 21.08.2026 als „geht nicht" — die Meldung stammt von mir und war
   **zu absolut.** Sie hält seither A2 an (den Anwalts-Prüfstoff auf eine eigene
   Kennung umstellen). Der Auftrag verlangt: **Erhebung, dann Vorlage — ob es ein
   Defekt oder eine fehlende Fähigkeit ist, entscheidet den Zuschnitt.**

   DIE ANTWORT IST BEIDES NICHT: **es ist eine REIHENFOLGE.**

   `_bereichZuSektorId` löst gegen `SEKTOR_BY_ID` auf — und das ist der
   LAUFZEIT-Index, der über `_sektorIndexNeuBauen()` aus `bereicheAlle()` entsteht
   und angedockte Bereiche kennt. **Ist das Bereichsmodul angemeldet, kommt das
   Feld an. Ist es das nicht, wird es benannt verworfen** (`grund: 'bereich'`) —
   und das ist richtig, denn dann gibt es die Rubrik wirklich nicht.

   WORAN DIE ERSTE MESSUNG SCHEITERTE: sie übersetzte die Vorlage in einem Depot
   OHNE das Modul. Der Fehler lag in der Probe, nicht im Kern.

   WAS TATSÄCHLICH KLEMMT, und das ist der Rest des Befundes: das
   Einreich-Schema führt für `bereich` einen GESCHLOSSENEN enum der zwölf
   eingebauten Kennungen — `validateTemplate`, das laufende Tor, prüft ihn NICHT.
   **Schema und Tor sagen Verschiedenes.** Das ist eine Drift in der
   Dokumentation, kein Riegel im Weg.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const fs = require('node:fs');

const FELD = Object.freeze([{ feldname: 'Fristensystem', feldtyp: 'text', bereich: 'obhut' }]);
// Schnitt Glied 5 (23.08.2026, A484): `bereiche` ist seither ein Objekt (Schlüssel = ID).
const MODUL = Object.freeze({ modulTyp: 'bereich', sprache: 'de', moduleVersion: 1, herkunft: 'rak-koeln',
  bereiche: { obhut: { label: 'Fremde Daten in meiner Obhut' } } });

function messen(V) {
  /* (1) OHNE das Modul — die Lage, aus der die falsche Meldung entstand. */
  const ohne = V._templateFelderUebersetzen({ felder: FELD.map((f) => Object.assign({}, f)) });

  /* (2) MIT dem Modul, angemeldet wie im Produkt. */
  const d = V.leeresDepot();
  d.bereichsModule = [MODUL];
  V.setData(d);
  V._bereichsModuleAusDepotAnmelden(d);
  const imIndex = !!V._sektorIndexHalter()['obhut'];
  const mit = V._templateFelderUebersetzen({ felder: FELD.map((f) => Object.assign({}, f)) });

  /* POSITIVKONTROLLE: ein EINGEBAUTER Bereich muss in beiden Lagen durchgehen — sonst misst
     diese Messung nicht die Rubrik, sondern einen kaputten Übersetzer. */
  const eingebaut = V._templateFelderUebersetzen({
    felder: [{ feldname: 'Probe', feldtyp: 'text', bereich: 'administration' }] });

  /* (3) Das Tor gegen das Schema. */
  const schema = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'docs', 'template-generator', 'submission-schema.json'), 'utf8'));
  const enumListe = schema.properties.templates.items.properties.felder.items.properties.bereich.enum || [];
  const torSagt = V.validateTemplate({ felder: FELD.map((f) => Object.assign({}, f)) });

  return {
    ohneModul: { angekommen: ohne.feldDefinitionen.length, verworfen: ohne.verworfeneFelder },
    mitModul: { angekommen: mit.feldDefinitionen.length, verworfen: mit.verworfeneFelder,
      sektorId: (mit.feldDefinitionen[0] || {}).sektorId, imIndex },
    kontrolleEingebaut: eingebaut.feldDefinitionen.length,
    schemaEnum: enumListe.length,
    schemaKenntObhut: enumListe.includes('obhut'),
    torSagt: torSagt === null ? 'GÜLTIG' : torSagt,
  };
}

function bericht(m) {
  const z = [];
  z.push('OHNE angedocktes Bereichsmodul:');
  z.push('    angekommen: ' + m.ohneModul.angekommen + ' · verworfen: ' + JSON.stringify(m.ohneModul.verworfen));
  z.push('MIT angedocktem Bereichsmodul:');
  z.push('    im Laufzeit-Index: ' + m.mitModul.imIndex);
  z.push('    angekommen: ' + m.mitModul.angekommen + ' · sektorId: ' + m.mitModul.sektorId
    + ' · verworfen: ' + JSON.stringify(m.mitModul.verworfen));
  z.push('POSITIVKONTROLLE (eingebauter Bereich `administration`): ' + m.kontrolleEingebaut + ' angekommen');
  z.push('');
  z.push('Schema gegen Tor:');
  z.push('    Einreich-Schema `bereich`: geschlossener enum mit ' + m.schemaEnum + ' Kennungen · kennt `obhut`: ' + m.schemaKenntObhut);
  z.push('    `validateTemplate` (das laufende Tor) sagt: ' + m.torSagt);
  return z.join('\n');
}

function laufen(kernPfad) {
  if (kernPfad) process.env.KERN_HTML_PATH = kernPfad;
  const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));
  return messen(ladeKern().V);
}

if (require.main === module) {
  const i = process.argv.indexOf('--kern');
  const m = laufen(i > -1 ? process.argv[i + 1] : null);
  console.log(bericht(m));
  if (!m.kontrolleEingebaut) { console.error('\nABBRUCH: die Positivkontrolle trägt nicht.'); process.exit(2); }
}

module.exports = { messen, bericht, laufen, FELD, MODUL };
