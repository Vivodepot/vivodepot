'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-465 — Format-Module: Felder aus mehreren Bereichen, feste Werte, Namensraum aus dem Modul (01.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Anlass: Ein Antrag nach einem FIM-Stammdatenschema braucht Identität, Vertretung und Gesundheit zugleich, feste Werte
   und den Namensraum, den sein XSD verlangt. Allgemein gebaut, für jeden Zielsystem-Eingang.
   Zusicherungen:
     · `bereich` je Zuordnung und `fest` tragen nur in der Ausgabe; die Elementfolge ist die Folge der Zuordnung.
     · jedes Feld läuft durch denselben Filter wie bisher (sensibel nur mit Zustimmung).
     · `namensraum` nur mit dem XML-Schreiber; ein FREMDER Namensraum (alles außer dem eigenen) nur bei verifizierter
       Signatur (`ungeprueft === false`) — sonst kein Kanal. Rot-Beweis: ein unsigniertes Modul mit urn:xoev-de.
     · ein Modul ohne die neuen Schlüssel schreibt wie zuvor.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const NS_FREMD = 'urn:xoev-de:xfall:standard:fim-s99000001_1.0';   // erfundene Leistung, echter Namensraum-Stil
const MODUL = Object.freeze({
  modulTyp: 'format', moduleVersion: 1, sprache: 'de', format: 'probe-antrag', richtung: 'export', schreiber: 'xml@1',
  sektor: 'identity', label: 'Probe Antrag', quelle: 'antrag',
  zuordnung: [
    { feld: 'familyName', ziel: 'G99000002.F99000003' },
    { fest: 'true', ziel: 'G99000002.F99000009' },
    { feld: 'givenName', ziel: 'G99000002.F99000004' },
    { bereich: 'health', feld: 'bloodType', ziel: 'G99000005.F99000006' },
  ],
});

async function depot() {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.betreteApp();
  V.sektorFeldSetzen('identity', 'givenName', 'Ann');
  V.sektorFeldSetzen('identity', 'familyName', 'Bö & Co');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  return V;
}

test('[U2-ADR-465] Felder aus zwei Bereichen und ein fester Wert, in der Folge der Zuordnung', async () => {
  const V = await depot();
  const kanal = V.formatModulZuExportKanal(MODUL);
  assert.ok(kanal, 'das Modul ergibt einen Ausgabe-Kanal');
  const xml = kanal.baue({ sensibel: true });
  assert.equal(xml, '<?xml version="1.0" encoding="UTF-8"?>\n<antrag><G99000002><F99000003>Bö &amp; Co</F99000003><F99000009>true</F99000009>'
    + '<F99000004>Ann</F99000004></G99000002><G99000005><F99000006>A +</F99000006></G99000005></antrag>');   // A + : die Optionsbeschriftung, wie sie der Textweg liest
});

test('[U2-ADR-465] der eine Filter bleibt: ein sensibles Feld aus dem zweiten Bereich fehlt ohne Zustimmung', async () => {
  const V = await depot();
  assert.ok(V.feldIstSensibel(V.feldDefFuer('health', 'bloodType'), 'health'), 'Vorbedingung: die Blutgruppe ist sensibel');
  const xml = V.formatModulZuExportKanal(MODUL).baue({});
  assert.doesNotMatch(xml, /F99000006|G99000005/, 'das Element fehlt ganz, nicht nur sein Wert');
  assert.match(xml, /<F99000004>Ann<\/F99000004>/);
});

test('[U2-ADR-465] der eigene Namensraum steht an der Wurzel; ein fremder nur mit verifizierter Signatur', async () => {
  const V = await depot();
  const eigen = V.formatModulZuExportKanal(Object.assign({}, MODUL, { namensraum: 'urn:vivodepot:probe:1' }));
  assert.match(eigen.baue({}), /<antrag xmlns="urn:vivodepot:probe:1">/);
  const signiert = V.formatModulZuExportKanal(Object.assign({}, MODUL, { namensraum: NS_FREMD, ungeprueft: false }));
  assert.match(signiert.baue({}), new RegExp('<antrag xmlns="' + NS_FREMD.replace(/[.:]/g, '\\$&') + '">'));
  assert.equal(V.formatNamensraumFremd(NS_FREMD), true);
  assert.equal(V.formatNamensraumFremd('https://vivodepot.de/ns/probe'), false);
});

test('[U2-ADR-465·Rot-Beweis] ein unsigniertes Modul mit urn:xoev-de-Namensraum bekommt keinen Kanal', async () => {
  const V = await depot();
  assert.equal(V.formatModulZuExportKanal(Object.assign({}, MODUL, { namensraum: NS_FREMD })), null, 'ohne Kennzeichen');
  assert.equal(V.formatModulZuExportKanal(Object.assign({}, MODUL, { namensraum: NS_FREMD, ungeprueft: true })), null, 'selbst angedockt');
});

test('[U2-ADR-465·Rot-Beweis] Prüfung: Namensraum ohne XML, bereich/fest beim Einlesen, unbekannter Bereich, nur feste Werte', () => {
  const { V } = ladeKern();
  assert.equal(V.formatModulPruefen(Object.assign({}, MODUL, { schreiber: 'json@1', namensraum: 'urn:vivodepot:x:1' })).grund, 'namensraum-ohne-xml');
  assert.equal(V.formatModulPruefen(Object.assign({}, MODUL, { namensraum: 'kein uri' })).grund, 'namensraum');
  const imp = V.formatModulPruefen(Object.assign({}, MODUL, { richtung: 'import', leser: 'xml@1', schreiber: undefined }));
  assert.deepEqual(imp.verworfene.filter((x) => x.grund === 'nur-ausgabe').length, 2, 'fest und bereich tragen nur in der Ausgabe');
  const fremdBereich = V.formatModulPruefen(Object.assign({}, MODUL, { zuordnung: [...MODUL.zuordnung, { bereich: 'gibtsnicht', feld: 'x', ziel: 'a.b' }] }));
  assert.ok(fremdBereich.verworfene.some((x) => x.grund === 'zuordnung-bereich'));
  assert.equal(V.formatModulPruefen(Object.assign({}, MODUL, { zuordnung: [{ fest: 'x', ziel: 'a.b' }] })).grund, 'zuordnung-nur-fest');
  const beides = V.formatModulPruefen(Object.assign({}, MODUL, { zuordnung: [...MODUL.zuordnung, { feld: 'givenName', fest: 'x', ziel: 'a.c' }] }));
  assert.ok(beides.verworfene.some((x) => x.grund === 'zuordnung-fest'), 'feld und fest zugleich ist ein Widerspruch');
});

test('[U2-ADR-465] ein Modul ohne die neuen Schlüssel schreibt wie zuvor (ein Bereich, ohne Namensraum)', async () => {
  const V = await depot();
  const alt = { modulTyp: 'format', moduleVersion: 1, sprache: 'de', format: 'probe-alt', richtung: 'export', schreiber: 'xml@1',
    sektor: 'identity', label: 'Probe alt', quelle: 'datensatz', zuordnung: [{ feld: 'givenName', ziel: 'person.vorname' }] };
  assert.equal(V.formatModulZuExportKanal(alt).baue({}), '<?xml version="1.0" encoding="UTF-8"?>\n<datensatz><person><vorname>Ann</vorname></person></datensatz>');
});

test('[U2-ADR-465] `wurzel` nennt einen Wurzelnamen mit Punkten, wie ihn das XSD eines FIM-Schemas verlangt', async () => {
  const V = await depot();
  const m = Object.assign({}, MODUL, { quelle: undefined, wurzel: 'fim.S99000001.00000001001000', namensraum: 'urn:vivodepot:probe:1' });
  delete m.quelle;
  const xml = V.formatModulZuExportKanal(m).baue({});
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<fim\.S99000001\.00000001001000 xmlns="urn:vivodepot:probe:1"><G99000002>/);
  assert.equal(V.formatModulPruefen(Object.assign({}, MODUL, { wurzel: 'w' })).grund, 'schreiber-xml-zwei-wurzeln', 'quelle und wurzel zugleich');
  assert.equal(V.formatModulPruefen(Object.assign({}, m, { wurzel: '1kein' })).grund, 'schreiber-xml-wurzelname');
  assert.equal(V.formatModulPruefen(Object.assign({}, m, { schreiber: 'json@1', namensraum: undefined })).grund, 'wurzel-ohne-xml');
});

const MIT_WERTEN = Object.freeze(Object.assign({}, MODUL, {
  zuordnung: [
    { feld: 'gender', ziel: 'G99000002.F99000010', werte: { m: 'm', w: 'w', d: 'd' } },
    { feld: 'birthDate', ziel: 'G99000007.F99000011', teil: 'tag' },
    { feld: 'birthDate', ziel: 'G99000007.F99000012', teil: 'monat' },
    { feld: 'birthDate', ziel: 'G99000007.F99000013', teil: 'jahr' },
    { feld: 'givenName', ziel: 'G99000002.F99000004' },
  ],
}));

test('[U2-ADR-465] werte bildet den Rohwert ab, teil zerlegt das Datum; gelesen wird der Rohwert, nicht die Beschriftung', async () => {
  const V = await depot();
  V.sektorFeldSetzen('identity', 'gender', 'w');
  V.sektorFeldSetzen('identity', 'birthDate', '1958-03-14');
  const xml = V.formatModulZuExportKanal(MIT_WERTEN).baue({});
  assert.match(xml, /<G99000002><F99000010>w<\/F99000010><F99000004>Ann<\/F99000004><\/G99000002><G99000007><F99000011>14<\/F99000011><F99000012>3<\/F99000012><F99000013>1958<\/F99000013><\/G99000007>/);
});

test('[U2-ADR-465·Rot-Beweis] ein Rohwert ohne Eintrag wird nicht geraten: er fehlt und steht in optionen._unabgebildet', async () => {
  const V = await depot();
  V.sektorFeldSetzen('identity', 'gender', 'k');
  V.sektorFeldSetzen('identity', 'birthDate', '1958');
  const opt = { _unabgebildet: [] };
  const xml = V.formatModulZuExportKanal(MIT_WERTEN).baue(opt);
  assert.doesNotMatch(xml, /F99000010|F99000011|F99000012/, 'kein geratener Code, kein erfundener Tag oder Monat');
  assert.match(xml, /<F99000013>1958<\/F99000013>/, 'das Jahr allein trägt');
  assert.deepEqual(opt._unabgebildet.map((u) => u.ziel), ['G99000002.F99000010', 'G99000007.F99000011', 'G99000007.F99000012']);
});

test('[U2-ADR-465·Rot-Beweis] werte und teil: nur Ausgabe, Form geprüft, nicht beides zugleich', () => {
  const { V } = ladeKern();
  const mit = (z) => V.formatModulPruefen(Object.assign({}, MODUL, { zuordnung: [{ feld: 'givenName', ziel: 'a.b' }, z] }));
  assert.ok(mit({ feld: 'gender', ziel: 'a.c', werte: [] }).verworfene.some((x) => x.grund === 'zuordnung-werte'));
  assert.ok(mit({ feld: 'gender', ziel: 'a.c', werte: { m: { x: 1 } } }).verworfene.some((x) => x.grund === 'zuordnung-werte'));
  assert.ok(mit({ feld: 'birthDate', ziel: 'a.c', teil: 'stunde' }).verworfene.some((x) => x.grund === 'zuordnung-teil'));
  assert.ok(mit({ feld: 'birthDate', ziel: 'a.c', teil: 'jahr', werte: { a: 'b' } }).verworfene.some((x) => x.grund === 'zuordnung-werte-und-teil'));
  const imp = V.formatModulPruefen(Object.assign({}, MODUL, { richtung: 'import', leser: 'xml@1', schreiber: undefined,
    zuordnung: [{ feld: 'givenName', ziel: 'a.b' }, { feld: 'gender', ziel: 'a.c', werte: { m: 'm' } }] }));
  assert.ok(imp.verworfene.some((x) => x.grund === 'nur-ausgabe'));
});

test('[U2-ADR-465] `hinweis` steht in der Datei selbst, als Kommentar zwischen Deklaration und Wurzel', async () => {
  const V = await depot();
  const m = Object.assign({}, MODUL, { hinweis: 'Vorführung: nicht einreichbar ohne Anhang' });
  assert.equal(V.formatModulPruefen(m).gueltig, true);
  const xml = V.formatModulZuExportKanal(m).baue({});
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<!-- Vorführung: nicht einreichbar ohne Anhang -->\n<antrag>/);
  assert.doesNotMatch(V.formatModulZuExportKanal(MODUL).baue({}), /<!--/, 'Gegenprobe: ohne hinweis kein Kommentar');
});

test('[U2-ADR-465·Rot-Beweis] `hinweis`: kein „--“, nicht auf „-“ endend, nur am XML-Ausgabe-Modul', () => {
  const { V } = ladeKern();
  assert.equal(V.formatModulPruefen(Object.assign({}, MODUL, { hinweis: 'a -- b' })).grund, 'hinweis');
  assert.equal(V.formatModulPruefen(Object.assign({}, MODUL, { hinweis: 'endet auf -' })).grund, 'hinweis');
  assert.equal(V.formatModulPruefen(Object.assign({}, MODUL, { hinweis: 'x --> <wurzel/>' })).grund, 'hinweis');
  assert.equal(V.formatModulPruefen(Object.assign({}, MODUL, { hinweis: '' })).grund, 'hinweis');
  assert.equal(V.formatModulPruefen(Object.assign({}, MODUL, { schreiber: 'json@1', hinweis: 'x' })).grund, 'hinweis-ohne-xml');
});
