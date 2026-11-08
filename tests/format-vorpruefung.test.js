'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-465 Nachtrag (W6, 04.11.2026) — Vorprüfung der Ausgabe nach den Regeln, die das Format-Modul aus dem XSD trägt
   ────────────────────────────────────────────────────────────────────────
   Zusicherungen:
     · `formatVorpruefung` meldet je Element Feld und Grund: pflicht (nur wenn die Elterngruppe in der Datei steht), anzahl,
       reihenfolge, unbekannt, typ, laenge, bereich, werte, muster. Eine gültige Datei hat keinen Fehler.
     · Ein Muster prüft der Kern nur in enger Form (formatMusterUebersetzen); sonst steht das Feld unter `ungeprueft`, nie grün.
       `^` und `$` gelten bis zur Messung mit KoSIT (W7) als nicht vorgeprüft (Wort 04.11.2026).
     · `pruefung` nur an einem xml@1-Ausgabe-Modul mit `wurzel`, nur in fester Form; sonst kein Kanal.
     · Der Kanal füllt `_vorpruefung` nur, wenn der Aufrufer danach fragt; die Datei selbst ändert sich nicht.
     · Der Erzeuger schreibt die Regeln aus dem XSD und lehnt einen Basistyp ab, den die Vorprüfung nicht kennt.
   Gleichlauf mit KoSIT an der erfundenen Leistung S99000001: tests/kosit-validator-lauf.test.js („Vorprüfung“).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const FX = path.join(__dirname, 'fixtures', 'fim-schema');
const FIXTURE_MODUL = () => JSON.parse(fs.readFileSync(path.join(FX, 'S99000001-format-modul.json'), 'utf8'));

let _V = null;
const kern = () => (_V || (_V = ladeKern().V));

const REGELN = Object.freeze([
  { ziel: 'A', name: 'Gruppe A', min: 1, max: 1, gruppe: true },
  { ziel: 'A.Name', name: 'Name', min: 1, max: 1, typ: 'string', laenge: [1, 5] },
  { ziel: 'A.Art', name: 'Art', min: 1, max: 1, typ: 'token', werte: ['01', '02'] },
  { ziel: 'A.Zahl', name: 'Zahl', min: 0, max: 1, typ: 'integer', bereich: [1, 9] },
  { ziel: 'A.Plz', name: 'Postleitzahl', min: 0, max: 1, typ: 'token', muster: '([0]{1}[1-9]{1}|[1-9]{1}[0-9]{1})[0-9]{3}' },
  { ziel: 'A.Mail', name: 'E-Mail', min: 0, max: 1, typ: 'string', muster: '[a-z]+@[a-z]+\\.[a-z]{1,63}$' },
  { ziel: 'B', name: 'Gruppe B', min: 0, max: 1, gruppe: true },
  { ziel: 'B.Pflicht', name: 'Pflicht in B', min: 1, max: 1, typ: 'boolean' },
  { ziel: 'C', name: 'Anhang', min: 1, max: null, typ: 'anhang' },
  { ziel: 'D', name: 'Datum', min: 0, max: 2, typ: 'dateTime' },
]);
const regeln = () => kern().formatPruefungFormPruefen(JSON.parse(JSON.stringify(REGELN)));
const gut = () => ({ A: { Name: 'Erika', Art: ' 01 ', Zahl: '3', Plz: '01234' }, C: ['QUJD', 'REVG'], D: '2026-11-04T10:00:00Z' });
const pruefe = (claims) => kern().formatVorpruefung(claims, regeln());
const gruende = (r) => r.fehler.map((f) => f.ziel + ':' + f.grund).sort();

test('[W6] eine gültige Datei hat keinen Fehler; Leerraum bei token wird zusammengefasst', () => {
  const r = pruefe(gut());
  assert.deepEqual(r.fehler, []);
  assert.deepEqual(r.nichtVorgeprueft, []);
});

test('[W6] jeder Grund mit Feld und Name', () => {
  const fall = (aendern, erwartet) => { const c = gut(); aendern(c); assert.deepEqual(gruende(pruefe(c)), erwartet.sort(), JSON.stringify(c)); };
  fall((c) => { delete c.A.Name; }, ['A.Name:pflicht']);
  fall((c) => { c.A.Name = 'Erikaa'; }, ['A.Name:laenge']);
  fall((c) => { c.A.Name = ''; }, ['A.Name:laenge']);
  fall((c) => { c.A.Art = '03'; }, ['A.Art:werte']);
  fall((c) => { c.A.Zahl = '12'; }, ['A.Zahl:bereich']);
  fall((c) => { c.A.Zahl = 'drei'; }, ['A.Zahl:typ']);
  fall((c) => { c.A.Plz = '00123'; }, ['A.Plz:muster']);
  fall((c) => { c.A.Name = ['Erika', 'Lea']; }, ['A.Name:anzahl']);
  fall((c) => { c.D = ['2026-11-04T10:00:00Z', '2026-11-04T10:00:00Z', '2026-11-04T10:00:00Z']; }, ['D:anzahl']);
  fall((c) => { c.D = '04.11.2026'; }, ['D:typ']);
  fall((c) => { c.A = { Art: '01', Name: 'Erika' }; }, ['A.Name:reihenfolge']);
  fall((c) => { c.A.Fremd = 'x'; }, ['A.Fremd:unbekannt']);
  fall((c) => { c.Z = 'x'; }, ['Z:unbekannt']);
  fall((c) => { delete c.C; }, ['C:pflicht']);
  fall((c) => { c.A = 'kein Objekt'; }, ['A:typ']);
  const r = pruefe((() => { const c = gut(); delete c.A.Name; return c; })());
  assert.equal(r.fehler[0].name, 'Name', 'der Name aus dem Modul, nicht die Kennung');
});

test('[W6] Pflicht gilt nur, wenn die Elterngruppe in der Datei steht', () => {
  assert.deepEqual(pruefe(gut()).fehler, [], 'Gruppe B fehlt, ihr Pflichtkind also auch nicht');
  const mitB = (b) => { const g = gut(); return { A: g.A, B: b, C: g.C, D: g.D }; };
  assert.deepEqual(gruende(pruefe(mitB({}))), ['B.Pflicht:pflicht']);
  assert.deepEqual(pruefe(mitB({ Pflicht: 'true' })).fehler, []);
  assert.deepEqual(gruende(pruefe(mitB({ Pflicht: 'ja' }))), ['B.Pflicht:typ']);
  const hinten = gut(); hinten.B = { Pflicht: 'true' };
  assert.deepEqual(gruende(pruefe(hinten)), ['B:reihenfolge'], 'die Gruppe hinter C und D steht an falscher Stelle');
});

test('[W6] ein Muster mit $ ist nicht vorgeprüft — nie grün, kein Fehler', () => {
  const c = gut(); c.A.Mail = 'lea@example.org';
  const r = pruefe(c);
  assert.deepEqual(r.fehler, []);
  assert.deepEqual(r.nichtVorgeprueft, [{ ziel: 'A.Mail', name: 'E-Mail', grund: 'muster' }]);
});

test('[W6] Muster: enge Form wird übersetzt und verankert, alles andere nicht', () => {
  const V = kern();
  const t = V.formatMusterUebersetzen('([0]{1}[1-9]{1}|[1-9]{1}[0-9]{1})[0-9]{3}');
  assert.ok(t);
  assert.deepEqual(['01234', '10115', '00123', '1234', '101155'].map((x) => t.test(x)), [true, true, false, false, false], 'ganzer Wert');
  assert.ok(V.formatMusterUebersetzen('[A-Z]{6,6}[A-Z2-9][A-NP-Z0-9]([A-Z0-9]{3,3}) {0,1}'));
  assert.ok(V.formatMusterUebersetzen('[a-zA-Z]{2,2}[0-9]{2,2}[a-zA-Z0-9]{1,30}'));
  assert.ok(V.formatMusterUebersetzen('a|b'));
  assert.ok(V.formatMusterUebersetzen('[\\]a]+'), 'ein maskiertes ] in der Klasse');
  for (const m of ['(a+)+', '(a|aa)+', '((a)b*)*', '\\p{L}+', '\\i\\c*', 'a\\1', '[a-z-[aeiou]]', '(?:a)', '^a', 'a$', '(a', 'a)', '[a', 'a{1,2,3}', '', 'x'.repeat(501)]) {
    assert.equal(V.formatMusterUebersetzen(m), null, m);
  }
});

test('[W6·Rot-Beweis] ohne Ablehnung verschachtelter Quantoren liefe ein Muster ohne Ende', () => {
  // Gegenprobe zur Regel: dasselbe Muster als rohe JS-Regel braucht für 24 Zeichen messbar lange, die Übersetzung lehnt es ab.
  const roh = new RegExp('^(?:(a+)+)$');
  const anfang = Date.now();
  roh.test('a'.repeat(23) + 'b');
  assert.ok(Date.now() - anfang > 20, 'die rohe Regel läuft zurück — genau das verhindert die enge Form');
  assert.equal(kern().formatMusterUebersetzen('(a+)+'), null);
});

test('[W6] Form der Regeln: was das Modul-Schema ausdrückt', () => {
  const V = kern();
  assert.equal(regeln().length, REGELN.length);
  assert.equal(regeln()[0].name, 'Gruppe A');
  assert.equal(V.formatPruefungFormPruefen([{ ziel: 'a', min: 1, max: 1, typ: 'string' }])[0].name, 'a', 'ohne Namen gilt die Kennung');
  for (const falsch of [null, [], [null], [{ ziel: 'a', min: 1, typ: 'string' }], [{ ziel: 'a', min: -1, max: 1, typ: 'string' }],
    [{ ziel: 'a', min: 1, max: 0, typ: 'string' }], [{ ziel: 'a', min: 1, max: 1, typ: 'anyURI' }], [{ ziel: '', min: 1, max: 1, typ: 'string' }],
    [{ ziel: 'a', min: 1, max: 1, gruppe: true, werte: ['x'] }], [{ ziel: 'a', min: 1, max: 1, gruppe: false }],
    [{ ziel: 'a', min: 1, max: 1, typ: 'string', werte: [] }], [{ ziel: 'a', min: 1, max: 1, typ: 'string', werte: [1] }],
    [{ ziel: 'a', min: 1, max: 1, typ: 'string', laenge: [1] }], [{ ziel: 'a', min: 1, max: 1, typ: 'string', name: 5 }],
    [{ ziel: 'a', min: 1, max: 1, typ: 'string', x: 1 }]]) {
    assert.equal(V.formatPruefungFormPruefen(falsch), null, JSON.stringify(falsch));
  }
});

test('[W6] pruefung nur am xml@1-Ausgabe-Modul mit wurzel; der Kanal füllt _vorpruefung nur auf Nachfrage', () => {
  const V = kern();
  const m = FIXTURE_MODUL();
  assert.equal(V.formatModulPruefen(Object.assign({}, m, { schreiber: 'json@1', wurzel: undefined, namensraum: undefined })).grund, 'pruefung-ohne-xml');
  assert.equal(V.formatModulPruefen(Object.assign({}, m, { pruefung: [{ ziel: 'x', min: 1, max: 1, typ: 'uri' }] })).grund, 'pruefung');
  const g = V.formatModulPruefen(m);
  assert.equal(g.gueltig, true, g.grund);
  assert.equal(g.kanal.pruefung.length, m.pruefung.length);
  const ohne = Object.assign({}, m); delete ohne.pruefung;
  assert.equal(V.formatModulPruefen(ohne).kanal.pruefung, null, 'ein Modul ohne Regeln bleibt gültig, ohne Vorprüfung');
});

test('[W6] der Erzeuger schreibt die Regeln aus dem XSD und lehnt einen unbekannten Basistyp ab', async () => {
  const E = await import(path.join(__dirname, '..', 'tools', 'fim-modul-erzeugen.mjs'));
  const xsd = fs.readFileSync(path.join(FX, 'S99000001-antrag.xsd'), 'utf8');
  const { wurzel } = E.schemaLesen(xsd);
  const fehler = [];
  const p = E.pruefungAusSchema(wurzel, fehler);
  assert.deepEqual(fehler, []);
  assert.deepEqual(p, FIXTURE_MODUL().pruefung, 'das Fixture-Modul trägt genau die Regeln des Fixture-XSD');
  assert.ok(kern().formatPruefungFormPruefen(p), 'der Kern nimmt die Regeln des Erzeugers an');
  const fremd = xsd.replace('<xs:restriction base="xs:integer">', '<xs:restriction base="xs:anyURI">');
  const f2 = [];
  E.pruefungAusSchema(E.schemaLesen(fremd).wurzel, f2);
  assert.deepEqual(f2, ['G99000002.F99000012: Basistyp xs:anyURI ist nicht vorprüfbar']);
});

test('[W6·Export] verletzt die Datei eine Regel, speichert der Export nichts und nennt das Feld; ein nicht vorgeprüftes Muster wird gesagt', async () => {
  const dateien = [];
  const k = ladeKern({ ausgabeErfassen: (d) => dateien.push(d) });
  const { V } = k;
  V.setData(V.leeresDepot());
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Probe');
  V.betreteApp();
  const modul = { modulTyp: 'format', moduleVersion: 1, sprache: 'de', format: 'probe-vorpruefung', richtung: 'export', schreiber: 'xml@1',
    sektor: 'identity', label: 'Probe Vorprüfung', wurzel: 'Antrag',
    zuordnung: [{ feld: 'familyName', ziel: 'P.Name' }, { feld: 'givenName', ziel: 'P.Vorname' }],
    pruefung: [{ ziel: 'P', min: 1, max: 1, gruppe: true }, { ziel: 'P.Name', name: 'Familienname', min: 1, max: 1, typ: 'string', laenge: [1, 5] },
      { ziel: 'P.Vorname', name: 'Vorname', min: 1, max: 1, typ: 'string', muster: '[A-Z][a-z]+$' }] };
  const kanal = V.formatModulZuExportKanal(modul);
  assert.ok(kanal && kanal.vorpruefung === true);
  const modale = [], toasts = [];
  V.ui.modal = (o) => { modale.push(o); };
  V.ui.toast = (t) => { toasts.push(String(t)); };
  V.sektorFeldSetzen('identity', 'familyName', 'Musterfrau');
  V.sektorFeldSetzen('identity', 'givenName', 'Erika');
  V._formatExportDownload(kanal, { sensibel: false });
  assert.equal(dateien.length, 0, 'keine Datei');
  assert.equal(modale.length, 1, 'die Felder werden genannt');
  assert.match(modale[0].koerperHTML, /<li>[^<]*Familienname[^<]*<\/li>/);
  assert.doesNotMatch(modale[0].koerperHTML, /\{name\}|formatVorpruefung/, 'kein Platzhalter, keine Kennung im Text');

  modale.length = 0;
  V.sektorFeldSetzen('identity', 'familyName', 'Lang');
  await V._formatExportDownload(kanal, { sensibel: false });
  assert.ok(modale.every((m) => !/Regeln des Antrags/.test(String(m.koerperHTML || ''))), 'kein Fehler der Vorprüfung');
  assert.ok(toasts.some((t) => /Vorname/.test(t) && !/\{felder\}/.test(t)), 'das nicht vorgeprüfte Feld wird gesagt: ' + JSON.stringify(toasts));
});
