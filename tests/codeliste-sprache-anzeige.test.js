'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Codelisten-Anzeige folgt der Sprache der Oberfläche (01.11.2026, Befund mittel: im englischen Produkt zeigte und speicherte ein
   codierter Chip den deutschen Namen, z. B. „Allergie gegen Penicillin“ zu SNOMED 91936005)
   ────────────────────────────────────────────────────────────────────────
   Schnitt: der amtliche englische Begriff steht als `quellBegriff` in der Liste; Listen mit `quellSprache: "en"` (SNOMED, LOINC)
   liefern ihn im englischen Produkt über den Textsatz (`codeliste:<systemId>/<Code>.anzeige`, U2-ADR-480, abgeleitet in
   tools/textsatz-codelisten-daten.js). Die Anzeige nimmt für einen Code, den die Liste führt, den Namen der Liste in der
   Sprache der Oberfläche; der gespeicherte Chip-Text bleibt unverändert. Keine eigene Übersetzung.
   Gehalten wird: Klasse (jede Liste mit Daten ist englisch belegt oder mit Entscheidung offen), Anzeige alter und neuer Chips in
   beiden Sprachen, Freitext und unbekannter Code unverändert. KERN_HTML_PATH lenkt den Kern um (Rot-Beweis gegen den alten Kern).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const ORDNER = path.join(REPO, 'code-listen');
const LISTEN = fs.readdirSync(ORDNER).filter((f) => f.endsWith('.json')).sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(ORDNER, f), 'utf8')))
  .filter((l) => Array.isArray(l.daten) && l.daten.length > 0);

// Listen mit Daten, die kein englisches Primär-Begriffswerk tragen: je Zeile die Entscheidung in Worten.
const OFFEN = {
  icd10: 'Entscheidung 06.10.2026: ICD-Anzeige amtlich statt eigen, im englischen Produkt deutsch',
  atc: 'Lizenzprüfung 15.09.2026: keine englischen WHOCC-Bezeichnungen bis zur Antwort des WHOCC',
  iso4217: 'U2-ADR-480: Namen je Sprache aus dem Textsatz',
};
const { listenMitFeld } = require('../tools/textsatz-codelisten-daten.js');
const MIT_FELD = listenMitFeld();
const ENGLISCH = LISTEN.filter((l) => l.quellSprache === 'en' && MIT_FELD.has(l.systemId));

async function kern(produkt) {
  const { V } = ladeKern({ produkt, backen: true });   // Absicht: das volle Produkt, auch wenn ein Rot-Beweis KERN_HTML_PATH umlenkt
  await V.depotAnlegen('Codeliste-Sprache-2026!');
  V.akteurSelbstErklaeren('T');
  return V;
}
const html = (V, sys, chip) => V.codeChipInhaltHTML(V.liesCodeListe(sys), chip);
const klar = (V, sys, chip) => V.codeChipKlartext(V.liesCodeListe(sys), chip);
// Was am Bildschirm steht: der Text zwischen den Tags.
const sichtbar = (h) => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

test('[Codeliste·Sprache·Klasse] jede Liste mit Daten ist englisch belegt (quellSprache en) oder mit Entscheidung offen', () => {
  assert.ok(ENGLISCH.some((l) => l.systemId === 'snomedAllergen') && !ENGLISCH.some((l) => l.systemId === 'loinc'), 'Vorbedingung: SNOMED ist englisch belegt; LOINC hat kein Feld, also keine Anzeigenamen');
  const unklar = LISTEN.filter((l) => l.quellSprache !== 'en' && !OFFEN[l.systemId]).map((l) => l.systemId);
  assert.deepEqual(unklar, [], 'Liste mit Daten ohne quellSprache en und ohne Eintrag in OFFEN');
  for (const l of ENGLISCH) for (const e of l.daten) assert.ok(e.quellBegriff, l.systemId + ' ' + e.code + ': englische Liste ohne quellBegriff');
  for (const [id, entscheidung] of Object.entries(OFFEN)) assert.ok(entscheidung.length > 20, id);
});

test('[Codeliste·Sprache·Anzeige] englisch: neuer und alter Chip zeigen den amtlichen englischen Begriff, der gespeicherte Text bleibt', async () => {
  const de = await kern('privat-de');
  const en = await kern('privat-en');
  for (const l of ENGLISCH) {
    for (const e of l.daten) {
      const deutsch = de.CODE_LISTEN[l.systemId].daten.find((d) => d.code === e.code).anzeigeName;
      assert.notEqual(deutsch, e.quellBegriff, l.systemId + ' ' + e.code + ': Vorbedingung, die deutsche Anzeige ist eine andere');
      const neu = de.chipAusEingabe(l.systemId, deutsch);
      assert.equal(neu.code.code, e.code, 'Vorbedingung: die deutsche Eingabe trifft den Code');
      const alt = { text: deutsch, code: { system: l.uri, code: e.code } };
      for (const [name, chip] of [['neu', neu], ['alt', alt]]) {
        const vorher = JSON.stringify(chip);
        assert.equal(sichtbar(html(en, l.systemId, chip)), e.quellBegriff, l.systemId + ' ' + e.code + ' ' + name + ' (HTML, en)');
        assert.equal(klar(en, l.systemId, chip), e.quellBegriff, l.systemId + ' ' + e.code + ' ' + name + ' (Klartext, en)');
        assert.equal(JSON.stringify(chip), vorher, 'der gespeicherte Chip bleibt unverändert');
        assert.equal(sichtbar(html(de, l.systemId, chip)), deutsch, l.systemId + ' ' + e.code + ' ' + name + ' (HTML, de)');
        assert.equal(klar(de, l.systemId, chip), deutsch, l.systemId + ' ' + e.code + ' ' + name + ' (Klartext, de)');
      }
    }
  }
});

test('[Codeliste·Sprache·Offen] Listen ohne englische Primärquelle zeigen englisch dasselbe wie deutsch, nichts Erfundenes', async () => {
  const de = await kern('privat-de');
  const en = await kern('privat-en');
  const offene = LISTEN.filter((l) => OFFEN[l.systemId] && l.quellSprache !== 'en' && l.systemId !== 'iso4217');
  assert.ok(offene.length >= 2, 'Vorbedingung: ICD und ATC liegen mit Daten vor');
  for (const l of offene) {
    for (const e of l.daten) {
      const chip = { text: 'gespeichert', code: { system: l.uri, code: e.code } };
      assert.equal(html(en, l.systemId, chip), html(de, l.systemId, chip), l.systemId + ' ' + e.code + ' (HTML)');
      assert.equal(klar(en, l.systemId, chip), klar(de, l.systemId, chip), l.systemId + ' ' + e.code + ' (Klartext)');
    }
  }
});

test('[Codeliste·Sprache·Freitext] ein Chip ohne Code und ein Code ohne Listeneintrag zeigen den eigenen Text in beiden Sprachen', async () => {
  const de = await kern('privat-de');
  const en = await kern('privat-en');
  for (const V of [de, en]) {
    for (const sys of ['snomedAllergen', 'loinc', 'icd10', 'atc']) {
      assert.equal(sichtbar(html(V, sys, { text: 'Katzenhaare' })), 'Katzenhaare');
      assert.equal(klar(V, sys, { text: 'Katzenhaare' }), 'Katzenhaare');
    }
    const fremd = { text: 'Eigener Text', code: { system: 'http://snomed.info/sct', code: '000000000' } };
    assert.equal(sichtbar(html(V, 'snomedAllergen', fremd)), 'Eigener Text');
    assert.equal(klar(V, 'snomedAllergen', fremd), 'Eigener Text');
  }
});

test('[Codeliste·Sprache·Eingabe] der Wortlaut der Liste trifft in beiden Sprachen denselben Code, auch der englische Name im englischen Produkt', async () => {
  const de = await kern('privat-de');
  const en = await kern('privat-en');
  for (const l of ENGLISCH) {
    for (const e of l.daten.slice(0, 5)) {
      for (const V of [de, en]) {
        const chip = V.chipAusEingabe(l.systemId, e.anzeigeName);
        assert.ok(chip && chip.code && chip.code.code === e.code, l.systemId + ' ' + e.code + ': „' + e.anzeigeName + '" wird zum Code');
      }
      const englisch = en.liesCodeListe(l.systemId).daten.find((x) => x.code === e.code).anzeigeName;
      const chipEn = en.chipAusEingabe(l.systemId, englisch);
      assert.ok(chipEn && chipEn.code && chipEn.code.code === e.code, l.systemId + ' ' + e.code + ': der englische Name wird zum Code');
    }
  }
});

test('[Codeliste·Sprache·nur mit Feld] Anzeige-Kennungen gibt es nur für Listen, die ein Feld trägt — LOINC steht in keinem Feld', () => {
  const de = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-de-modul.json'), 'utf8')).texte;
  const en = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8')).texte;
  assert.ok(MIT_FELD.has('snomedAllergen') && !MIT_FELD.has('loinc'), 'Vorbedingung: SNOMED trägt ein Feld, LOINC nicht');
  for (const t of [de, en]) {
    assert.deepEqual(Object.keys(t).filter((k) => k.startsWith('codeliste:loinc/')), [], 'keine LOINC-Kennung');
    assert.ok(Object.keys(t).some((k) => k.startsWith('codeliste:snomedAllergen/')), 'SNOMED-Kennungen stehen da');
  }
});
