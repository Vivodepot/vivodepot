'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Codelisten-Anzeige in der Lese-App folgt der Sprache der Leserin (01.11.2026, gleiche Klasse wie tests/codeliste-sprache-anzeige.test.js:
   eine englische Leserin sah bei einem codierten Chip den gespeicherten deutschen Text, z. B. „Allergie gegen Penicillin“ zu SNOMED 91936005)
   ────────────────────────────────────────────────────────────────────────
   Schnitt: dieselbe Kennung wie im Kern, `codeliste:<systemId>/<Code>.anzeige` (U2-ADR-480). Die Lese-App führt keine Listenkopie; sie
   erkennt die Kennungen als eigene (erzeugt aus tools/textsatz-codelisten-daten.js) und zeigt den Namen aus dem Sprachmodul. Ohne Eintrag
   (Deutsch, ICD, ATC, Freitext, unbekannter Code) bleibt der gespeicherte Text; gespeichert wird nichts neu.
   Gehalten wird: Klasse (jede Liste mit Daten ist englisch belegt oder mit Entscheidung offen), Anzeige alter Chips in beiden Sprachen,
   Freitext und OFFEN-Listen unverändert. LESEN_HTML_PATH lenkt die Lese-App um (Rot-Beweis gegen die alte Fassung).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeLesen } = require('./load-lesen.js');
const { TEXTSATZ_EN_CODELISTEN, listenMitFeld } = require('../tools/textsatz-codelisten-daten.js');

const ORDNER = path.join(__dirname, '..', 'code-listen');
const LISTEN = fs.readdirSync(ORDNER).filter((f) => f.endsWith('.json')).sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(ORDNER, f), 'utf8')))
  .filter((l) => Array.isArray(l.daten) && l.daten.length > 0);

// Listen mit Daten, die kein englisches Primär-Begriffswerk tragen: je Zeile die Entscheidung in Worten (wie im Kern-Test).
const OFFEN = {
  icd10: 'Entscheidung 06.10.2026: ICD-Anzeige amtlich statt eigen, im englischen Produkt deutsch',
  atc: 'Lizenzprüfung 15.09.2026: keine englischen WHOCC-Bezeichnungen bis zur Antwort des WHOCC',
  iso4217: 'U2-ADR-480: Namen je Sprache aus dem Textsatz',
};
// Anzeigenamen gibt es nur für Listen, deren Feld es gibt (02.11.2026); LOINC hat keins.
const MIT_FELD = listenMitFeld();
const ENGLISCH = LISTEN.filter((l) => l.quellSprache === 'en' && MIT_FELD.has(l.systemId));

function lesen(sprache) {
  const { V } = ladeLesen();
  const d = { schemaVersion: 1, sektoren: {}, situationen: {}, menschen: [], textsprache: sprache };
  if (sprache === 'en') d.textsatzModule = [{ sprache: 'en', moduleVersion: 1, texte: Object.assign({}, TEXTSATZ_EN_CODELISTEN) }];
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(V.getData());
  return V;
}
const text = (V, liste, chips) => V.feldWertText({ id: 'x', typ: 'text', codeListe: liste }, chips, 'gesundheit');

test('[Codeliste·Sprache·Lese-App·Klasse] jede Liste mit Daten ist englisch belegt (quellSprache en) oder mit Entscheidung offen', () => {
  assert.ok(ENGLISCH.some((l) => l.systemId === 'snomedAllergen') && !ENGLISCH.some((l) => l.systemId === 'loinc'), 'Vorbedingung: SNOMED ist englisch belegt; LOINC hat kein Feld, also keine Anzeigenamen');
  const unklar = LISTEN.filter((l) => l.quellSprache !== 'en' && !OFFEN[l.systemId]).map((l) => l.systemId);
  assert.deepEqual(unklar, [], 'Liste mit Daten ohne quellSprache en und ohne Eintrag in OFFEN');
  for (const [id, entscheidung] of Object.entries(OFFEN)) assert.ok(entscheidung.length > 20, id);
});

test('[Codeliste·Sprache·Lese-App·Anzeige] englisch: ein alter Chip zeigt den amtlichen englischen Begriff, deutsch den gespeicherten Text', () => {
  const de = lesen('de');
  const en = lesen('en');
  for (const l of ENGLISCH) {
    for (const e of l.daten) {
      assert.notEqual(e.anzeigeName, e.quellBegriff, l.systemId + ' ' + e.code + ': Vorbedingung, die deutsche Anzeige ist eine andere');
      const chips = [{ text: e.anzeigeName, code: { system: l.uri, code: e.code } }];
      const vorher = JSON.stringify(chips);
      assert.equal(text(en, l.systemId, chips), e.quellBegriff, l.systemId + ' ' + e.code + ' (en)');
      assert.equal(text(de, l.systemId, chips), e.anzeigeName, l.systemId + ' ' + e.code + ' (de)');
      assert.equal(JSON.stringify(chips), vorher, 'der gespeicherte Chip bleibt unverändert');
    }
  }
});

test('[Codeliste·Sprache·Lese-App·Offen] ICD und ATC zeigen englisch den gespeicherten Text, nichts Erfundenes', () => {
  const en = lesen('en');
  const offene = LISTEN.filter((l) => OFFEN[l.systemId] && l.quellSprache !== 'en' && l.systemId !== 'iso4217');
  assert.ok(offene.length >= 2, 'Vorbedingung: ICD und ATC liegen mit Daten vor');
  for (const l of offene) {
    for (const e of l.daten) {
      assert.equal(text(en, l.systemId, [{ text: 'gespeichert', code: { system: l.uri, code: e.code } }]), 'gespeichert', l.systemId + ' ' + e.code);
    }
  }
});

test('[Codeliste·Sprache·Lese-App·Freitext] Chip ohne Code, Code ohne Listeneintrag und mehrere Chips zeigen den eigenen Text', () => {
  for (const V of [lesen('de'), lesen('en')]) {
    assert.equal(text(V, 'snomedAllergen', [{ text: 'Katzenhaare' }]), 'Katzenhaare');
    assert.equal(text(V, 'snomedAllergen', [{ text: 'Eigener Text', code: { system: 'http://snomed.info/sct', code: '000000000' } }]), 'Eigener Text');
  }
  const e = ENGLISCH.find((l) => l.systemId === 'snomedAllergen').daten[0];
  const gemischt = [{ text: e.anzeigeName, code: { system: 'http://snomed.info/sct', code: e.code } }, { text: 'Katzenhaare' }];
  assert.equal(text(lesen('en'), 'snomedAllergen', gemischt), e.quellBegriff + ', Katzenhaare');
});
