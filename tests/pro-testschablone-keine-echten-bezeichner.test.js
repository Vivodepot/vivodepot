'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   pro-testschablone-keine-echten-bezeichner.test.js — die Auflage aus dem
   Lizenz-Fund vom 18.09.2026: verkäuflicher Pro-Inhalt lag
   in tests/fixtures/ und wäre mit der EUPL nach GitHub/openCode gegangen. Der
   echte Inhalt (54 Felder der Geschäftsführerin-Vorlage, Notar-Kanzleivertretung)
   zog nach tools/templates/; die Testdateien, die nur STRUKTUR brauchen (nicht
   den echten Inhalt), bekamen erfundene, strukturgleiche Ersatzfixtures unter
   tests/fixtures/pro-*-testschablone*.json.

   DIESE DATEI IST DIE PROBE, DIE DAS FESTHÄLT (Auflage 3 aus dem Auftrag,
   wörtlich): „die Fixture enthält keinen der echten Bezeichner. Sonst wandert
   beim nächsten Nachziehen einer zurück." Geprüft wird NICHT nur heute grün,
   sondern strukturell: JEDES feldname/gruppe/anzeige/titel/frage/texte aus
   den ECHTEN Dateien (tools/templates/vivodepot-pro-*.json) darf in KEINER
   erfundenen Testschablone vorkommen — als Volltext-Suche über die gesamte
   erfundene Datei, nicht nur über bekannte Felder.

   UND STRUKTURGLEICH bleibt die Gegenprobe: dieselbe Feldanzahl, dieselbe
   feldtyp-/bereich-Verteilung, dieselbe Anzahl codeWerte/unterFelder — sonst
   prüfen die 15 umgebauten Testdateien nach dem Umbau weniger als vorher,
   und niemand merkt es (Auflage 2).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const ECHT = path.join(REPO, 'tools', 'templates');
const ERFUNDEN = path.join(__dirname, 'fixtures');

const PAARE = [
  ['vivodepot-pro-geschaeftsfuehrerin-notfallmappe-vorlage-de.json', 'pro-vorlage-testschablone-de.json'],
  ['vivodepot-pro-geschaeftsfuehrerin-notfallmappe-vorlage-en.json', 'pro-vorlage-testschablone-en.json'],
  ['vivodepot-pro-geschaeftsfuehrerin-notfallmappe-logikmodul.json', 'pro-logikmodul-testschablone-de.json'],
  ['vivodepot-pro-geschaeftsfuehrerin-notfallmappe-logikmodul-en.json', 'pro-logikmodul-testschablone-en.json'],
  ['vivodepot-pro-notar-kanzleivertretung-logikmodul.json', 'pro-logikmodul-testschablone-zwei-de.json'],
  ['vivodepot-pro-notar-kanzleivertretung-logikmodul-en.json', 'pro-logikmodul-testschablone-zwei-en.json'],
  ['vivodepot-pro-geschaeftsfuehrerin-notfallmappe-bereich.json', 'pro-bereich-testschablone.json'],
];

/* Jeder String-Wert unter einem INHALTS-Schlüssel — nicht Struktur-Schlüssel
   wie modulTyp/bereich/sektor/feldtyp/typ/icon, die architektonische, nicht
   kommerzielle Kennungen tragen und absichtlich unverändert bleiben (s.
   Bericht: nur der AUTORISCHE Inhalt zieht um, nicht die Sektor-IDs). */
const INHALTS_SCHLUESSEL = new Set([
  'feldname', 'gruppe', 'anzeige', 'titel', 'frage', 'h1', 'herkunftText',
  'unterschriftErsatzHinweis', 'fussText', 'toolbarHinweis', 'label',
]);
// 'id' bleibt ABSICHTLICH ausgenommen: ein technischer Registry-Schlüssel
// (wie die datenSchema-Schlüssel), keine Geschäftsprosa — bleibt unverändert
// (s. Kommentar an transformLogikModul in tools/erfundene-testfixture-erzeugen.js).

function inhaltsStrings(wert, pfad, raus) {
  if (Array.isArray(wert)) {
    for (const w of wert) inhaltsStrings(w, pfad, raus);
    return;
  }
  if (wert && typeof wert === 'object') {
    for (const [k, v] of Object.entries(wert)) {
      if (INHALTS_SCHLUESSEL.has(k) && typeof v === 'string') raus.push(v);
      else if (k === 'texte' && Array.isArray(v)) for (const t of v) raus.push(t);
      inhaltsStrings(v, pfad, raus);
    }
  }
}

for (const [echteDatei, erfundeneDatei] of PAARE) {
  test('[Testschablone·keine-echten-Bezeichner] ' + erfundeneDatei + ' enthält keinen Inhalts-String aus ' + echteDatei, () => {
    const echt = JSON.parse(fs.readFileSync(path.join(ECHT, echteDatei), 'utf8'));
    const erfundenRoh = fs.readFileSync(path.join(ERFUNDEN, erfundeneDatei), 'utf8');

    const echteStrings = [];
    inhaltsStrings(echt, echteDatei, echteStrings);
    assert.ok(echteStrings.length > 0, 'nichts zu prüfen — die echte Datei lieferte keine Inhalts-Strings, Prüfung wirkungslos.');

    const treffer = echteStrings.filter((s) => s.length >= 4 && erfundenRoh.includes(s));
    assert.deepEqual(treffer, [], erfundeneDatei + ' enthält echte Bezeichner aus ' + echteDatei + ': ' + treffer.join(' | '));
  });
}

test('[Testschablone·strukturgleich] vorlage-de: gleiche Feldanzahl und -verteilung wie das echte Original', () => {
  const echt = JSON.parse(fs.readFileSync(path.join(ECHT, 'vivodepot-pro-geschaeftsfuehrerin-notfallmappe-vorlage-de.json'), 'utf8'));
  const erf = JSON.parse(fs.readFileSync(path.join(ERFUNDEN, 'pro-vorlage-testschablone-de.json'), 'utf8'));
  const verteil = (d) => {
    const typen = {}; const bereiche = {};
    for (const f of d.felder) { typen[f.feldtyp] = (typen[f.feldtyp] || 0) + 1; bereiche[f.bereich] = (bereiche[f.bereich] || 0) + 1; }
    return {
      anzahl: d.felder.length, typen, bereiche,
      codeWerte: d.felder.filter((f) => f.codeWerte).length,
      unterFelder: d.felder.filter((f) => f.unterFelder).length,
      pflicht: d.felder.filter((f) => f.pflicht).length,
    };
  };
  assert.deepEqual(verteil(erf), verteil(echt));
});
