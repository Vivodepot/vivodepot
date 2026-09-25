#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   sprachregister-bauen.js — Register-Katalog-Plan §6 Schritt 4 (14.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   KORRIGIERTE PRÄMISSE (gemessen, nicht aus dem Plan übernommen): der Plan-Entwurf
   nannte `TEXTSATZ_TEXTE_EINGEBAUT` als Startbestand-Quelle — das ist FALSCH.
   `TEXTSATZ_TEXTE_EINGEBAUT` (`vivodepot-template-generator.html:1325`) ist die
   Zeichenkette DES TEMPLATE-GENERATORS EIGENER Oberfläche (ein Eintrag: der
   deutsche Untertitel) — ein Werkzeug-internes i18n-Detail, keine Liste von
   Sprachen des Bürgerdepots.

   Die tatsächliche Sprach-ACHSE lebt im Kern (`vivodepot.html`): `TEXTSATZ_
   SPRACHE_EINGEBAUT`/`AB_WERK_TEXTSATZ_DE` (reserviert, 'de') plus das
   ab-Werk-mitgelieferte, ECHTE Sprachmodul `tools/textsatz-en-modul.json`
   (gemessen: `sprache: "en", moduleVersion: 1, anbieterId: "vivodepot"`).

   STARTBESTAND DAMIT: zwei Einträge (de, en) — unverändert übernommen, keiner
   erfunden. Eine dritte Sprache (z. B. Gälisch) kommt über den künftigen
   Vorschlagsweg (Register-Katalog-Plan §4), nicht durch Raten an dieser Stelle.

   Aufruf:
     node tools/sprachregister-bauen.js                → schreibt nach register-ausgabe/
     node tools/sprachregister-bauen.js --ziel <ordner> → anderer Zielordner
     node tools/sprachregister-bauen.js --kern <datei>  → andere Kern-Datei (Standzahl)
     node tools/sprachregister-bauen.js --datum JJJJ-MM-TT → Fassungsdatum setzen (sonst heute)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { hashVonText, pruefsummenZeile, achsenRegisterJson, eintraegeFormPruefen } = require('./lib/achsenregister-bauen.js');
const { INDEX_DATEI, indexEintragBauen, indexJsonBauen, vorhandenenIndexLesen } = require('./lib/register-index.js');
const { standzahlLesen, heute, ZIEL_VORGABE: FELDREGISTER_ZIEL_VORGABE } = require('./feldregister-bauen.js');

const REPO = path.join(__dirname, '..');
const ZIEL_VORGABE = FELDREGISTER_ZIEL_VORGABE;
const JSON_DATEI = 'sprachregister.json';
const PRUEFSUMMEN_DATEI = JSON_DATEI + '.sha256';
const INDEX_ACHSE = 'sprache';

const KOPFZEILE = 'ERZEUGT von tools/sprachregister-bauen.js. Nicht von Hand bearbeiten — '
  + 'der Kern (vivodepot.html, tools/textsatz-en-modul.json) ist die Quelle.';

/* Gemessen am 14.09.2026 — vivodepot.html (TEXTSATZ_SPRACHE_EINGEBAUT/AB_WERK_TEXTSATZ_DE)
   und tools/textsatz-en-modul.json (sprache:"en", anbieterId:"vivodepot"), nicht angenommen. */
const STARTBESTAND = Object.freeze([
  {
    sprache: 'de',
    label: { de: 'Deutsch', en: 'German' },
    status: 'permanent',
    quelle: 'nativ (TEXTSATZ_SPRACHE_EINGEBAUT/AB_WERK_TEXTSATZ_DE, U2-ADR-367)',
  },
  {
    sprache: 'en',
    label: { de: 'Englisch', en: 'English' },
    status: 'permanent',
    quelle: 'ab-werk (tools/textsatz-en-modul.json, anbieterId: vivodepot)',
  },
]);

function bauen(opt) {
  const o = opt || {};
  const eintraege = o.eintraege || STARTBESTAND;
  eintraegeFormPruefen(eintraege, 'sprache');
  const fassung = { datum: o.datum || heute(), kern: standzahlLesen(o.kernPfad) };
  const json = achsenRegisterJson({
    schluesselraum: 'sprache',
    kopfzeile: KOPFZEILE,
    herkunft: { quelle: 'vivodepot.html (textsatzModulPruefen, modul.sprache) + tools/textsatz-en-modul.json', pruefsumme: PRUEFSUMMEN_DATEI },
    eintraege,
    fassung,
  });
  const hash = hashVonText(json);
  return {
    fassung,
    anzahl: eintraege.length,
    json,
    hash,
    pruefsumme: pruefsummenZeile(hash, JSON_DATEI),
    indexEintrag: indexEintragBauen({
      achse: INDEX_ACHSE, datei: JSON_DATEI, pruefsummeDatei: PRUEFSUMMEN_DATEI,
      hash, anzahl: eintraege.length, fassung,
    }),
  };
}

function schreiben(zielOrdner, artefakt) {
  fs.mkdirSync(zielOrdner, { recursive: true });
  const index = indexJsonBauen(vorhandenenIndexLesen(zielOrdner), artefakt.indexEintrag);
  const dateien = [
    [JSON_DATEI, artefakt.json],
    [PRUEFSUMMEN_DATEI, artefakt.pruefsumme],
    [INDEX_DATEI, index],
  ];
  return dateien.map(([name, inhalt]) => {
    const p = path.join(zielOrdner, name);
    fs.writeFileSync(p, inhalt);
    return { name, pfad: p, bytes: Buffer.byteLength(inhalt, 'utf8') };
  });
}

function main() {
  const argv = process.argv.slice(2);
  const wert = (flagge) => { const i = argv.indexOf(flagge); return (i >= 0 && argv[i + 1]) ? argv[i + 1] : null; };
  const ziel = wert('--ziel') ? path.resolve(wert('--ziel')) : ZIEL_VORGABE;
  const datum = wert('--datum');
  if (datum && !/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    console.error('sprachregister-bauen: --datum erwartet JJJJ-MM-TT, bekam "' + datum + '".');
    process.exit(1);
  }
  const artefakt = bauen({ kernPfad: wert('--kern') ? path.resolve(wert('--kern')) : null, datum });
  const geschrieben = schreiben(ziel, artefakt);
  console.log('sprachregister-bauen: ' + artefakt.anzahl + ' Sprache(n) · Fassung '
    + artefakt.fassung.datum + ' · Kern ' + artefakt.fassung.kern);
  for (const g of geschrieben) {
    console.log('  ' + g.name.padEnd(26) + (g.bytes / 1024).toFixed(2).padStart(7) + ' KB  ' + g.pfad);
  }
}

if (require.main === module) main();
module.exports = { bauen, schreiben, STARTBESTAND, JSON_DATEI, PRUEFSUMMEN_DATEI, INDEX_ACHSE, ZIEL_VORGABE };
