'use strict';
/* S8 (U2-ADR-428): DER WEG ÜBER DAS MODUL TRÄGT — ohne Alias auf die alte Konstante.
   Jede Lesestelle der Sprachbasis liest das Sprachmodul DES PRODUKTS (AB_WERK_SPRACHE_PRODUKT). Bewiesen wird das an zwei winzigen, selbst gebauten
   Produkt-Kernen mit ENTGEGENGESETZTEM Inhalt (A kennt „probe“, B kennt „anders“): dieselbe Frage, gegenteilige Antwort — also kommt die Antwort aus dem Modul
   und nicht aus einer eingebauten Tabelle. Dazu das nackte Gerüst (kein Modul: leer) und das englische Produkt (Basissprache Englisch). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { produktHtml, kernAus } = require('./produkt-html-erzeugen.js');
const { ladeKern } = require('./load-kern.js');

function kernMitBasis(texte, sprache) {
  const html = fs.readFileSync(produktHtml('privat-de'), 'utf8');
  const modul = { modulTyp: 'textsatz', sprache: sprache || 'de', moduleVersion: 1, anbieterId: 'probe', texte,
    regeln: { datumsformat: 'TT.MM.JJJJ', dezimaltrenner: ',', tausendertrenner: '.', sprachkennung: 'de-DE' } };
  const neu = html.replace(/\/\* AB_WERK_SPRACHE_PRODUKT:BEGIN \*\/[\s\S]*?\/\* AB_WERK_SPRACHE_PRODUKT:END \*\//,
    () => '/* AB_WERK_SPRACHE_PRODUKT:BEGIN */\nconst AB_WERK_SPRACHE_PRODUKT = ' + JSON.stringify(modul) + ';\n/* AB_WERK_SPRACHE_PRODUKT:END */');
  assert.notEqual(neu, html, 'Vorbedingung: die Region wurde ersetzt');
  const datei = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sprach-basis-')), 'vivodepot.html');
  fs.writeFileSync(datei, neu);
  return kernAus(datei).V;
}
/* Ein Produkt, dessen Sprachmodul die Wizard-Kennungen nicht trägt, bootet nicht (_wizardOptionenAusMaterialisieren findet dann keine Felder und wirft, um keine leere Messung grün aussehen
   zu lassen). Die Mini-Produkte tragen darum die echten wizard:-Kennungen des deutschen Moduls mit — zu prüfen ist die Sprachbasis, nicht dieser Start-Wächter. */
const WIZARD_TEXTE = Object.fromEntries(Object.entries(require('../tools/textsatz-de-modul.json').texte).filter(([k]) => k.startsWith('wizard:')));
const A_TEXTE = {
  ...WIZARD_TEXTE,
  'probe.label': 'Probe-Bereich', 'probe.hint': 'Hinweis zur Probe',
  'strings:probeText.text': 'Probetext {x}',
  'dok:probedok#abschnitt.titel': 'Dokumenttitel', 'dok:probedok#abschnitt.texte[0]': 'Erster Satz',
  'situation:probe.label': 'Probesituation',
};
const B_TEXTE = { ...WIZARD_TEXTE, 'anders.label': 'Anders-Bereich', 'strings:andersText.text': 'Anderer Text' };
let _a, _b, _leer, _en;
const A = () => _a || (_a = kernMitBasis(A_TEXTE));
const B = () => _b || (_b = kernMitBasis(B_TEXTE));
const LEER = () => _leer || (_leer = ladeKern({ blank: true }).V);
const EN = () => _en || (_en = ladeKern({ produkt: 'privat-en' }).V);

test('[Modulweg·Basis] _sprachBasis() ist das Modul des Produkts: A trägt genau seine Kennungen, B genau seine, das nackte Gerüst keine', () => {
  assert.deepEqual(Object.keys(A()._sprachBasis()).sort(), Object.keys(A_TEXTE).sort());
  assert.deepEqual(Object.keys(B()._sprachBasis()).sort(), Object.keys(B_TEXTE).sort());
  assert.deepEqual(Object.keys(LEER()._sprachBasis()), []);
  assert.equal(A()._sprachBasisSprache(), 'de');
  assert.equal(EN()._sprachBasisSprache(), 'en', 'im englischen Produkt ist die Basis Englisch');
});

test('[Modulweg·4998 stellensatzModulPruefen] ein natives Feld ist bekannt, WEIL das Modul es führt — gleiche Frage, gegenteilige Antwort', () => {
  const modul = { rechtsraum: 'XX', moduleVersion: 1, stellen: { probe: 'Stelle' } };
  assert.deepEqual(A().stellensatzModulPruefen(modul).verworfene, [], 'A führt probe.label');
  assert.deepEqual(B().stellensatzModulPruefen(modul).verworfene.map((v) => v.grund), ['unbekannt'], 'B kennt es nicht');
});

test('[Modulweg·10163 _textsatzKennungBekannt] bekannt ist, was das Modul des Produkts führt (Bereichs-Bezeichnungen sind strukturell bekannt, darum die strings:-Kennung)', () => {
  assert.equal(A()._textsatzKennungBekannt('strings:probeText.text'), true);
  assert.equal(B()._textsatzKennungBekannt('strings:probeText.text'), false);
  assert.equal(B()._textsatzKennungBekannt('strings:andersText.text'), true);
  assert.equal(LEER()._textsatzKennungBekannt('strings:probeText.text'), false, 'das nackte Gerüst kennt keine Sprachkennung');
});

test('[Modulweg·10241 _textsatzZusicherungFormOk] der Originaltext zum Vergleich kommt aus dem Modul', () => {
  assert.equal(A()._textsatzZusicherungFormOk('strings:probeText.text', 'Anderer {x}'), true);
  assert.equal(A()._textsatzZusicherungFormOk('strings:probeText.text', 'Anderer {y}'), false, 'Platzhalter weichen vom Original des Moduls ab');
  assert.equal(B()._textsatzZusicherungFormOk('strings:probeText.text', 'Anderer {y}'), true, 'B führt die Kennung nicht: nichts zu vergleichen');
});

test('[Modulweg·11147/11196 STRINGS] der Schlüsselraum der Zeichenketten ist der des Moduls', () => {
  assert.deepEqual(A()._stringsAusSatz(), ['probeText']);
  assert.deepEqual(B()._stringsAusSatz(), ['andersText']);
  assert.equal('probeText' in A().STRINGS, true);
  assert.equal('probeText' in B().STRINGS, false);
});

test('[Modulweg·11322–11345 Knoten füllen] welche Art-Slots an einer Kennung existieren, sagt das Modul; eine fehlende Bezeichnung wird als Fehlstelle gemeldet', () => {
  const kA = {}; A()._textsatzKnotenFuellen(kA, 'probe');
  assert.equal(kA.label, 'Probe-Bereich'); assert.equal(kA.hint, 'Hinweis zur Probe');
  const kB = {}; const vorher = B().TEXTSATZ_FEHLSTELLEN.length; B()._textsatzKnotenFuellen(kB, 'probe');
  assert.equal(kB.label, undefined); assert.equal(kB.hint, undefined);
  assert.ok(B().TEXTSATZ_FEHLSTELLEN.length > vorher && B().TEXTSATZ_FEHLSTELLEN.includes('probe.label'), 'B: „probe.label“ ist Fehlstelle');
  const ohne = {}; A()._textsatzKnotenFuellenOhnePflicht(ohne, 'probe');
  assert.equal(ohne.hint, 'Hinweis zur Probe');
});

test('[Modulweg·11452 Rücknahme] nur Art-Slots, die das Modul an dieser Kennung führt, werden zurückgenommen', () => {
  const kA = { label: 'x', hint: 'y', beispiel: 'z' }; A()._TEXTSATZ_ZURUECK(kA, 'probe');
  assert.equal('label' in kA, false); assert.equal('hint' in kA, false); assert.equal(kA.beispiel, 'z', 'das Modul führt „probe.beispiel“ nicht');
  const kB = { label: 'x', hint: 'y' }; B()._TEXTSATZ_ZURUECK(kB, 'probe');
  assert.deepEqual(kB, { label: 'x', hint: 'y' }, 'B führt „probe“ nicht: nichts wird zurückgenommen');
});

test('[Modulweg·11690/94 Listen füllen] ein Listenelement wird aus dem Modul gefüllt; ohne Modultext bleibt es', () => {
  const kA = { texte: [null] }; A()._textsatzListeFuellen(kA, 'dok:probedok#abschnitt', () => {});
  assert.equal(kA.texte[0], 'Erster Satz');
  const kB = { texte: [null] }; B()._textsatzListeFuellen(kB, 'dok:probedok#abschnitt', () => {});
  assert.equal(kB.texte[0], null);
});

test('[Modulweg·45237 Bezeichnungen] die Forderung „muss übersetzt sein“ ist die Liste der Kennungen des Moduls', () => {
  const je = A()._bezeichnungenJePraefix();
  assert.deepEqual(je.probe, ['probe.label']);
  assert.deepEqual(je['situation:probe'], ['situation:probe.label']);
  assert.equal(je.anders, undefined);
  assert.deepEqual(B()._bezeichnungenJePraefix().anders, ['anders.label']);
  assert.equal(B()._bezeichnungenJePraefix().probe, undefined);
  assert.deepEqual(Object.keys(LEER()._bezeichnungenJePraefix()), []);
});

test('[Modulweg·47051 unübersetzte Stellen] in der Sprache, in der das Produkt gebaut ist, gibt es keine — das gilt auch für das englische Produkt', () => {
  const v = EN();
  assert.equal(v.textsatzSpracheAktiv(), 'en');
  assert.equal(v._dokumentUnuebersetzteStellen({ id: 'x', abschnitte: [] }), 0);
});

test('[Modulweg·10634 Saat] das Modul des Produkts steht in der Registry seiner Sprache', () => {
  assert.equal(A()._TEXTSATZ_MODUL_REGISTRY.de[''] ['probe.label'], 'Probe-Bereich');
  assert.equal(B()._TEXTSATZ_MODUL_REGISTRY.de[''] ['probe.label'], undefined);
});

test('[Modulweg·Rot-Beweis] ohne Modul im Produkt beantwortet der Kern jede Frage an die Sprachbasis mit „nein“ — die Antworten oben kommen also aus dem Modul, nicht aus etwas Eingebautem', () => {
  const leer = LEER();
  assert.deepEqual(Object.keys(leer._sprachBasis()), []);
  for (const k of Object.keys(A_TEXTE)) assert.equal(Object.prototype.hasOwnProperty.call(leer._sprachBasis(), k), false, k);
  assert.equal(leer._textsatzKennungBekannt('strings:probeText.text'), false);
  assert.deepEqual(leer._stringsAusSatz(), []);
  assert.equal(leer._sprachBasisSprache(), 'de', 'die Sprache des nackten Gerüsts ist die eingebaute Kennung, nicht ein Text');
});
