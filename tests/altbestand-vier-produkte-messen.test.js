'use strict';
/* ════════════════════════════════════════════════════════════════════════
   tools/altbestand-vier-produkte-messen.js — die vier Fragen tragen (16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Das Werkzeug öffnet alte Stände in allen vier Produkten und meldet Ablehnung, rohe Kennungen,
   Waisen und in Pro Unerreichbares. Diese Probe hält zweierlei:

   1. KEINE FALSCHMELDUNG an einer alten Datei, die heute ganz öffnet — die Vorführdatei demo-de
      (vor dem Kennungs-Umbau erzeugt, verschlüsselt) in allen vier Produkten ohne Fund.
   2. JEDE FRAGE FINDET IHRE KLASSE, an gepflanzten Stellen im echten Produktkern: ein Schlüssel,
      den der Katalog nicht kennt, ein verlorener und ein verschobener Markierungswert, ein
      Dokument ohne Zeile, ein verlorenes Modul, eine rohe Kennung, eine Kennung, deren Text
      unter der alten Kennung liegt.

   BEWUSST NICHT HIER: die Standard-Fixtures in alter Form mit ihren heutigen Funden. Sie hängen
   am Landestand anderer Fixes (KI-Stufe, Stufe 59, Übersetzung alter Sprachmodule) und kippten
   mit jedem davon. Ihr Rot-Beweis ist gemessen und steht im Bericht vom 16.09.2026: auf dem Zweig
   mit beiden Fixes 0 Funde, KI-Fix zurückgenommen genau die drei ki_*-Waisen in pro-de und pro-en,
   Stufe-59-Fix zurückgenommen genau das Dokument ohne Zeile in allen vier Produkten.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const T = require('../tools/altbestand-vier-produkte-messen.js');

const DEMO_DE = T.STANDARD_DATEIEN.find((x) => x.pfad.endsWith(path.join('vorfuehrung-zugang-zum-recht', 'demo-de.vivodepot')));

test('[Altbestand·Gegenprobe] die Vorführdatei von vor dem Umbau öffnet in allen vier Produkten ohne Fund', async () => {
  assert.ok(DEMO_DE && DEMO_DE.passwort, 'Standard-Probe demo-de fehlt');
  const r = await T.dateiMessen(DEMO_DE, () => {});
  assert.equal(r.art, 'umschlag');
  assert.deepEqual(Object.keys(r.produkte), T.PRODUKT_SLUGS);
  for (const [slug, p] of Object.entries(r.produkte)) assert.ok(p.bereicheMitWerten >= 4, slug + ': Datei nicht wirklich geöffnet');
  assert.deepEqual(r.funde, []);
});

test('[Altbestand·Waise·Rot-Beweis] unbekannter Schlüssel, verlorener und verschobener Wert, Dokument ohne Zeile, verlorenes Modul', async () => {
  const k = await T.oeffnen('pro-de', { art: 'umschlag', umschlag: JSON.parse(require('node:fs').readFileSync(DEMO_DE.pfad, 'utf8').replace(/^[^{]*/, '')), passwort: DEMO_DE.passwort });
  const d = k.V.getData();
  assert.deepEqual(T.waisen(k.V), [], 'Ausgangslage: ohne Pflanzung keine Waise');
  d.sektoren.identity.gibtEsNicht = 'x';
  d.sektoren.advanceCare = d.sektoren.advanceCare || {};
  d.sektoren.advanceCare.provisionInstruments = [
    { id: 'z1', instrument: 'enduring-power-of-attorney' },
    { id: 'z2', instrument: 'living-will', unbekanntesUnterfeld: 'y' },
  ];
  d.dokumente = (d.dokumente || []).concat([{ id: 'doc-probe', typ: 'living-will',
    felder: [{ sektorId: 'advanceCare', feldId: 'provisionInstruments' }] }]);
  d.ablageDraussen = 'ALTBESTAND·verschoben';
  const w = T.waisen(k.V, ['ALTBESTAND·verloren', 'ALTBESTAND·verschoben'], ['logikModule:gibt-es-nicht']);
  assert.ok(w.includes('Schlüssel identity.gibtEsNicht'), w.join(' | '));
  assert.ok(w.includes('Schlüssel advanceCare.provisionInstruments/unbekanntesUnterfeld'), w.join(' | '));
  assert.ok(w.includes('Wert verloren verloren'), w.join(' | '));
  assert.ok(w.includes('Wert nur an unbekannter Stelle verschoben'), w.join(' | '));
  assert.ok(w.some((x) => x.startsWith('Dokument doc-probe → advanceCare.provisionInstruments ohne Zeile')), w.join(' | '));
  assert.ok(w.includes('Modul verloren logikModule:gibt-es-nicht'), w.join(' | '));
  d.dokumente[d.dokumente.length - 1].felder[0].zeilenId = 'z2';
  assert.ok(!T.waisen(k.V).some((x) => x.startsWith('Dokument doc-probe')), 'mit Zeile gebunden ist das Dokument keine Waise');
});

test('[Altbestand·Pro erreichbar·Rot-Beweis] ein Wert aus Privat, den Pro nicht trägt oder nicht deklariert, wird gemeldet', async () => {
  const k = await T.oeffnen('pro-de', { art: 'umschlag', umschlag: JSON.parse(require('node:fs').readFileSync(DEMO_DE.pfad, 'utf8').replace(/^[^{]*/, '')), passwort: DEMO_DE.passwort });
  const stellen = Object.entries(k.V.getData().sektoren).flatMap(([b, i]) => Object.keys(i || {}).map((f) => b + '.' + f));
  assert.ok(stellen.length > 5);
  assert.deepEqual(T.proErreichbar(stellen.filter((s) => T.modellSchluessel(k.V).has(s)), k.V), []);
  assert.deepEqual(T.proErreichbar(['identity.gibtEsNicht', 'finance.nieGesetzt'], k.V),
    ['identity.gibtEsNicht: Wert fehlt', 'finance.nieGesetzt: Wert fehlt']);
  k.V.getData().sektoren.identity.gibtEsNicht = 'x';
  assert.deepEqual(T.proErreichbar(['identity.gibtEsNicht'], k.V), ['identity.gibtEsNicht: im Katalog nicht deklariert']);
});

test('[Altbestand·rohe Kennung] Kennungsform und Feld-ID werden erkannt, Text nicht', () => {
  for (const roh of ['identity.givenName.label', 'identity.label', 'advanceCare.provisionInstruments.instrument.label', '']) {
    assert.equal(T.istRoheKennung(roh, 'givenName'), true, roh);
  }
  assert.equal(T.istRoheKennung('givenName', 'givenName'), true, 'Feld-ID als Beschriftung');
  assert.equal(T.istRoheKennung(undefined), true);
  for (const text of ['First name', 'Vorname', 'z. B. Hausarzt', 'e.g.', 'Name', 'Sonstiges']) {
    assert.equal(T.istRoheKennung(text, 'name'), false, text);
  }
});

test('[Altbestand·alte Kennung] der Text liegt unter der alten Kennung — und nur dann wird es gesagt', () => {
  const V = {
    KENNUNG_MAPPING: [
      { kennungAlt: 'identitaet.vorname', kennungNeu: 'identity.givenName', bereichAlt: 'identitaet', bereichNeu: 'identity' },
      { kennungAlt: 'vorsorge.vorsorge_instrumente/typ', kennungNeu: 'advanceCare.provisionInstruments/instrument', bereichAlt: 'vorsorge', bereichNeu: 'advanceCare' },
    ],
    getData: () => ({ textsatzModule: [{ sprache: 'en', texte: {
      'identitaet.vorname.label': 'First name', 'identitaet.label': 'Identity', 'vorsorge.vorsorge_instrumente.typ.label': 'Instrument' } }] }),
  };
  assert.equal(T.alteKennungMitText(V, 'identity.givenName.label'), 'identitaet.vorname.label');
  assert.equal(T.alteKennungMitText(V, 'identity.label'), 'identitaet.label');
  assert.equal(T.alteKennungMitText(V, 'advanceCare.provisionInstruments.instrument.label'), 'vorsorge.vorsorge_instrumente.typ.label');
  assert.equal(T.alteKennungMitText(V, 'identity.familyName.label'), null, 'keine Zeile in der Tabelle');
  const ohneText = Object.assign({}, V, { getData: () => ({ textsatzModule: [{ texte: {} }] }) });
  assert.equal(T.alteKennungMitText(ohneText, 'identity.givenName.label'), null, 'Tabelle ja, Text nein — dann ist es die andere Klasse');
});

test('[Altbestand·Art] jede Eingangsform wird erkannt, eine fremde Datei nicht', () => {
  assert.equal(T.artErkennen('x/vivodepot.html', '<html><script>1</script>').art, 'anwendung');
  assert.equal(T.artErkennen('a.js', 'window.__vorDepotKonfiguration = [{"a":1}];').art, 'buendel');
  assert.equal(T.artErkennen('a.json', '{"modulTyp":"textsatz","sprache":"en","texte":{}}').art, 'buendel');
  assert.equal(T.artErkennen('a.vivodepot', 'VIVODEPOT\n{"kryptoVersion":3,"pbkdf2":{}}').art, 'umschlag');
  assert.equal(T.artErkennen('a.json', '{"_typ":"vivodepot-klartext-export","depot":{"sektoren":{}}}').art, 'klartext');
  assert.equal(T.artErkennen('a.json', '{"export":{"_typ":"vivodepot-klartext-export","depot":{"sektoren":{}}}}').art, 'klartext');
  assert.equal(T.artErkennen('a.json', '{"schemaVersion":39,"sektoren":{}}').art, 'datenstand');
  assert.equal(T.artErkennen('a.json', '{"irgendwas":1}').art, null);
});

test('[Altbestand·rohe Kennung·Rot-Beweis] Struktur und gerenderter Inhalt werden gelesen, nur angezeigte Bereiche', () => {
  let gerendert = '';
  const k = {
    V: {
      KENNUNG_MAPPING: [{ kennungAlt: 'identitaet.vorname', kennungNeu: 'identity.givenName', bereichAlt: 'identitaet', bereichNeu: 'identity' }],
      bereicheAlle: () => [{ id: 'identity', label: 'Identity', sektionen: [{ titel: 'Person', felder: [
        { id: 'givenName', typ: 'text', label: 'identity.givenName.label' },
        { id: 'familyName', typ: 'text', label: 'Last name' },
        { id: 'pets', typ: 'liste', label: 'Pets', unterFelder: [{ id: 'hinweisText', typ: 'hinweis' }, { id: 'petName', typ: 'text', label: 'petName' }] },
      ] }] }],
      getData: () => ({ sektoren: { identity: { familyName: 'Probe' }, versteckt: { x: 'y' } },
        textsatzModule: [{ texte: { 'identitaet.vorname.label': 'First name' } }] }),
      renderSektor: (id) => { gerendert = id === 'identity' ? '<label>identity.secondName.hint</label><span>Probe</span>' : 'FALSCH'; },
    },
    document: { getElementById: () => ({ innerHTML: gerendert }) },
  };
  assert.deepEqual(T.roheKennungen(k), [
    'gerendert identity: identity.secondName.hint',
    'identity.givenName: identity.givenName.label' + T.ALT_MARKE + 'identitaet.vorname.label',
    'identity.pets/petName: petName',
  ]);
});
