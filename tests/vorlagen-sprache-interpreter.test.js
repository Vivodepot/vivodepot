'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Vorlagen-Sprache — Interpreter-Bausteine (Siebtes Register, Zug 1, 27.08.2026)
   ────────────────────────────────────────────────────────────────────────
   Drei deklarative Schemas ersetzen die drei Stellen, an denen VORSORGE_MODULE
   bislang JS-Code statt Daten trugen (Zug-0-Befund): `crossRef.pruef` →
   Bedingungs-Schema (bedingungAuswerten), `frageAntwortOderLuecke.formatWert`
   → Formatierungs-Schema (formatSchemaAnwenden), `_erbscheinSektorDaten`-
   artige Aggregation → Datenlesen-Schema (datenSchemaLesen). Jedes Schema
   verlustfrei geprüft gegen die Fälle, die die sechs Bestandsmodule und
   Erbschein heute tatsächlich brauchen — keine erfundene Abdeckung.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* ══ Bedingungs-Schema ══════════════════════════════════════════════════ */

test('[Bedingung] feldGleich: wahr wenn das Feld genau diesen Wert hat', async () => {
  const { V } = await ladeKern();
  assert.equal(V.bedingungAuswerten({ typ: 'feldGleich', feld: 'x', wert: 'ja' }, { x: 'ja' }), true);
  assert.equal(V.bedingungAuswerten({ typ: 'feldGleich', feld: 'x', wert: 'ja' }, { x: 'nein' }), false);
  assert.equal(V.bedingungAuswerten({ typ: 'feldGleich', feld: 'x', wert: 'ja' }, {}), false);
});

test('[Bedingung] feldIn: wahr wenn der Feldwert in der erlaubten Menge steht', async () => {
  const { V } = await ladeKern();
  const bed = { typ: 'feldIn', feld: 'x', werte: ['a', 'b'] };
  assert.equal(V.bedingungAuswerten(bed, { x: 'a' }), true);
  assert.equal(V.bedingungAuswerten(bed, { x: 'c' }), false);
});

test('[Bedingung] listeEnthaeltTyp: wahr wenn ein Datensatz mit dieser Diskriminante in der Liste steht', async () => {
  const { V } = await ladeKern();
  const bed = { typ: 'listeEnthaeltTyp', feld: 'provisionInstruments', wertFeld: 'instrument', wert: 'enduring-power-of-attorney' };
  assert.equal(V.bedingungAuswerten(bed, { provisionInstruments: [{ instrument: 'enduring-power-of-attorney' }] }), true);
  assert.equal(V.bedingungAuswerten(bed, { provisionInstruments: [{ instrument: 'will' }] }), false);
  assert.equal(V.bedingungAuswerten(bed, {}), false, 'fehlendes Feld ist kein Absturz, nur falsch');
});

test('[Bedingung] oder: der reale PV-Fall — Instrument-Record ODER altes Flachfeld', async () => {
  const { V } = await ladeKern();
  const bed = { typ: 'oder', bedingungen: [
    { typ: 'listeEnthaeltTyp', feld: 'provisionInstruments', wertFeld: 'instrument', wert: 'enduring-power-of-attorney' },
    { typ: 'feldGleich', feld: 'vollmacht_vorhanden', wert: 'ja' },
  ] };
  assert.equal(V.bedingungAuswerten(bed, { vollmacht_vorhanden: 'ja' }), true);
  assert.equal(V.bedingungAuswerten(bed, { provisionInstruments: [{ instrument: 'enduring-power-of-attorney' }] }), true);
  assert.equal(V.bedingungAuswerten(bed, {}), false);
});

test('[Bedingung] und: alle Teilbedingungen muessen zutreffen', async () => {
  const { V } = await ladeKern();
  const bed = { typ: 'und', bedingungen: [{ typ: 'feldGleich', feld: 'a', wert: 'ja' }, { typ: 'feldGleich', feld: 'b', wert: 'ja' }] };
  assert.equal(V.bedingungAuswerten(bed, { a: 'ja', b: 'ja' }), true);
  assert.equal(V.bedingungAuswerten(bed, { a: 'ja', b: 'nein' }), false);
});

test('[Bedingung] nicht: kehrt das Ergebnis um', async () => {
  const { V } = await ladeKern();
  const bed = { typ: 'nicht', bedingung: { typ: 'feldGleich', feld: 'a', wert: 'ja' } };
  assert.equal(V.bedingungAuswerten(bed, { a: 'ja' }), false);
  assert.equal(V.bedingungAuswerten(bed, { a: 'nein' }), true);
});

test('[Bedingung·Gegenprobe-Baukasten] ein unbekannter typ wirft nicht, liefert nur false', async () => {
  const { V } = await ladeKern();
  assert.equal(V.bedingungAuswerten({ typ: 'noch-nicht-erfunden' }, {}), false);
});

/* ══ Formatierungs-Schema ═══════════════════════════════════════════════ */

test('[Format] liste: verbindet ein Array mit dem Trenner (Default ", ")', async () => {
  const { V } = await ladeKern();
  assert.equal(V.formatSchemaAnwenden({ typ: 'liste' }, ['Anna', 'Ben']), 'Anna, Ben');
  assert.equal(V.formatSchemaAnwenden({ typ: 'liste', trenner: '; ' }, ['Anna', 'Ben']), 'Anna; Ben');
});

test('[Format] codeListeLabel: loest einen Roh-Code ueber die kanonische Felddefinition auf', async () => {
  const { V } = await ladeKern();
  const label = V.formatSchemaAnwenden({ typ: 'codeListeLabel', sektor: 'identity', feld: 'maritalStatus' }, 'verh');
  assert.equal(label, 'verheiratet');
});

test('[Format] codeListeLabel mit praefix: der reale Erbschein-Fall ("Testament, " + Label)', async () => {
  const { V } = await ladeKern();
  const text = V.formatSchemaAnwenden(
    { typ: 'codeListeLabel', praefix: 'Testament, ', sektor: 'advanceCare', feld: 'provisionInstruments', unterfeld: 'form' },
    'beurkundet');
  assert.equal(text, 'Testament, notariell beurkundet');
});

test('[Format·Gegenprobe-Baukasten] ein unbekannter typ wirft nicht, liefert den Rohwert als Text', async () => {
  const { V } = await ladeKern();
  assert.equal(V.formatSchemaAnwenden({ typ: 'noch-nicht-erfunden' }, 'x'), 'x');
  assert.equal(V.formatSchemaAnwenden(null, 'x'), 'x');
});

/* ══ Datenlesen-Schema ══════════════════════════════════════════════════ */

async function mitDepot(V, sektoren) {
  await V.depotAnlegen('vorlagen-sprache-pw');
  const d = V.getData();
  d.sektoren = Object.assign({}, d.sektoren, sektoren);
  V.setData(d);
  return d;
}

test('[Daten] feld: liest ein einzelnes Sektor-Feld', async () => {
  const { V } = await ladeKern();
  await mitDepot(V, { identity: { maritalStatus: 'verh' } });
  const out = V.datenSchemaLesen({ familienstand: { typ: 'feld', sektor: 'identity', feld: 'maritalStatus' } }, V.getData());
  assert.equal(out.familienstand, 'verh');
});

test('[Daten] feld: fehlender Wert bleibt unbesetzt (kein erfundener Default)', async () => {
  const { V } = await ladeKern();
  await mitDepot(V, {});
  const out = V.datenSchemaLesen({ familienstand: { typ: 'feld', sektor: 'identity', feld: 'maritalStatus' } }, V.getData());
  assert.equal('familienstand' in out, false);
});

test('[Daten] verbinden: fuegt mehrere Sektor-Felder zusammen, leere werden uebersprungen', async () => {
  const { V } = await ladeKern();
  await mitDepot(V, { identity: { streetAddress: 'Musterweg 1', postcodeCity: '80331 München' } });
  const schema = { lebensmittelpunkt: { typ: 'verbinden', teile: [{ sektor: 'identity', feld: 'streetAddress' }, { sektor: 'identity', feld: 'postcodeCity' }], trenner: ', ' } };
  const out = V.datenSchemaLesen(schema, V.getData());
  assert.equal(out.lebensmittelpunkt, 'Musterweg 1, 80331 München');
});

test('[Daten] verbinden: nur EIN Teil vorhanden reicht, kein doppelter Trenner', async () => {
  const { V } = await ladeKern();
  await mitDepot(V, { identity: { postcodeCity: '80331 München' } });
  const schema = { lebensmittelpunkt: { typ: 'verbinden', teile: [{ sektor: 'identity', feld: 'streetAddress' }, { sektor: 'identity', feld: 'postcodeCity' }], trenner: ', ' } };
  const out = V.datenSchemaLesen(schema, V.getData());
  assert.equal(out.lebensmittelpunkt, '80331 München');
});

test('[Daten] verbinden: kein Teil vorhanden bleibt unbesetzt', async () => {
  const { V } = await ladeKern();
  await mitDepot(V, {});
  const schema = { lebensmittelpunkt: { typ: 'verbinden', teile: [{ sektor: 'identity', feld: 'streetAddress' }, { sektor: 'identity', feld: 'postcodeCity' }], trenner: ', ' } };
  const out = V.datenSchemaLesen(schema, V.getData());
  assert.equal('lebensmittelpunkt' in out, false);
});

test('[Daten] listenfeld: findet den Datensatz per Diskriminante und liest sein Unterfeld', async () => {
  const { V } = await ladeKern();
  await mitDepot(V, { advanceCare: { provisionInstruments: [{ instrument: 'will', form: 'beurkundet' }] } });
  const schema = { testament_form: { typ: 'listenfeld', sektor: 'advanceCare', feld: 'provisionInstruments', diskriminante: { feld: 'instrument', wert: 'will' }, unterfeld: 'form' } };
  const out = V.datenSchemaLesen(schema, V.getData());
  assert.equal(out.testament_form, 'beurkundet');
});

test('[Daten] listenfeld: kein Treffer bleibt unbesetzt', async () => {
  const { V } = await ladeKern();
  await mitDepot(V, { advanceCare: { provisionInstruments: [] } });
  const schema = { testament_form: { typ: 'listenfeld', sektor: 'advanceCare', feld: 'provisionInstruments', diskriminante: { feld: 'instrument', wert: 'will' }, unterfeld: 'form' } };
  const out = V.datenSchemaLesen(schema, V.getData());
  assert.equal('testament_form' in out, false);
});

test('[Daten] personenNamen: loest ein direktes Array von Personen-Verweisen auf (z. B. erben)', async () => {
  const { V } = await ladeKern();
  await mitDepot(V, {});
  const erbeId = V.personHinzufuegen({ name: 'Neffe Beispiel' });
  const d0 = V.getData();
  d0.sektoren.advanceCare = { heirsBriefOverview: [{ ref: erbeId }] };
  V.setData(d0);
  const schema = { erben_namen: { typ: 'personenNamen', sektor: 'advanceCare', feld: 'heirsBriefOverview' } };
  const out = V.datenSchemaLesen(schema, V.getData());
  assert.deepEqual(out.erben_namen, ['Neffe Beispiel']);
});

test('[Daten] personenNamen: leeres Array bleibt als leeres Array bestehen (immer gesetzt, nie erfunden)', async () => {
  const { V } = await ladeKern();
  await mitDepot(V, {});
  const schema = { erben_namen: { typ: 'personenNamen', sektor: 'advanceCare', feld: 'heirsBriefOverview' } };
  const out = V.datenSchemaLesen(schema, V.getData());
  assert.deepEqual(out.erben_namen, []);
});

test('[Daten] personenNamen mit unterfeld: loest ein Array verschachtelter Personen-Verweise auf (z. B. kinder[].person)', async () => {
  const { V } = await ladeKern();
  await mitDepot(V, {});
  const kindId = V.personHinzufuegen({ name: 'Tochter Beispiel' });
  const d0 = V.getData();
  d0.sektoren.people = { childrenAndDependants: [{ id: 'k1', person: { ref: kindId }, type: 'leiblich' }] };
  V.setData(d0);
  const schema = { kinder_namen: { typ: 'personenNamen', sektor: 'people', feld: 'childrenAndDependants', unterfeld: 'person' } };
  const out = V.datenSchemaLesen(schema, V.getData());
  assert.deepEqual(out.kinder_namen, ['Tochter Beispiel']);
});

test('[Daten] listenfeldPersonenNamen: findet den Datensatz und loest sein Personen-Array auf (Testament-Bedachte)', async () => {
  const { V } = await ladeKern();
  await mitDepot(V, {});
  const bedachtId = V.personHinzufuegen({ name: 'Freundin Beispiel' });
  const d0 = V.getData();
  d0.sektoren.advanceCare = { provisionInstruments: [{ instrument: 'will', personsNamedInTheWill: [{ ref: bedachtId }] }] };
  V.setData(d0);
  const schema = { testament_bedachte_namen: { typ: 'listenfeldPersonenNamen', sektor: 'advanceCare', feld: 'provisionInstruments', diskriminante: { feld: 'instrument', wert: 'will' }, unterfeld: 'personsNamedInTheWill' } };
  const out = V.datenSchemaLesen(schema, V.getData());
  assert.deepEqual(out.testament_bedachte_namen, ['Freundin Beispiel']);
});

test('[Daten] listenfeldPersonenNamen: kein Treffer liefert ein leeres Array, keine Luecke im Objekt', async () => {
  const { V } = await ladeKern();
  await mitDepot(V, { advanceCare: { provisionInstruments: [] } });
  const schema = { testament_bedachte_namen: { typ: 'listenfeldPersonenNamen', sektor: 'advanceCare', feld: 'provisionInstruments', diskriminante: { feld: 'instrument', wert: 'will' }, unterfeld: 'personsNamedInTheWill' } };
  const out = V.datenSchemaLesen(schema, V.getData());
  assert.deepEqual(out.testament_bedachte_namen, []);
});

test('[Daten·Gegenprobe-Baukasten] ein unbekannter typ wirft nicht, das Feld bleibt einfach unbesetzt', async () => {
  const { V } = await ladeKern();
  await mitDepot(V, {});
  const out = V.datenSchemaLesen({ x: { typ: 'noch-nicht-erfunden', sektor: 'identitaet', feld: 'x' } }, V.getData());
  assert.equal('x' in out, false);
});

test('[Daten] das volle Erbschein-Schema, gegen dasselbe Depot wie der bestehende Bestandstest, liefert dieselben Werte wie _erbscheinSektorDaten()', async () => {
  const { V } = await ladeKern();
  await mitDepot(V, {});
  const kindId = V.personHinzufuegen({ name: 'Tochter Beispiel' });
  const erbeId = V.personHinzufuegen({ name: 'Neffe Beispiel' });
  const bedachtId = V.personHinzufuegen({ name: 'Freundin Beispiel' });
  const d0 = V.getData();
  d0.sektoren.identity = Object.assign({}, d0.sektoren.identity, {
    nationality: 'deutsch', streetAddress: 'Musterweg 1', postcodeCity: '80331 München',
    maritalStatus: 'verh',
  });
  // U2-ADR-248 (04.09.2026): `kinder` lebt im Sektor 'meine-menschen', nicht 'identitaet' — am
  // echten Geburts-Wizard gemessen (tests/e2e/gebwiz-kind-abnahme.spec.js schreibt dorthin).
  // Bis 04.09.2026 stand hier `identitaet.kinder`, und beide verglichenen Funktionen lasen
  // gleichermaßen dort — sie stimmten überein, weil beide falsch waren, nicht weil sie richtig
  // waren. Die deepEqual-Prüfung unten allein hätte das nie gefangen (zwei gleich falsche Werte
  // sind auch gleich); die neue Positivbehauptung danach schon.
  d0.sektoren['people'] = Object.assign({}, d0.sektoren['people'], {
    childrenAndDependants: [{ id: 'k1', person: { ref: kindId }, type: 'leiblich' }],
  });
  d0.sektoren.advanceCare = Object.assign({}, d0.sektoren.advanceCare, {
    provisionInstruments: [{ id: 't1', instrument: 'will', form: 'beurkundet', personsNamedInTheWill: [{ ref: bedachtId }] }],
    heirsBriefOverview: [{ ref: erbeId }],
  });
  V.setData(d0);
  // Feld-Namen hier bewusst deckungsgleich mit dem, was _erbscheinSektorDaten() SELBST liest
  // (identity.streetAddress/postcodeCity/nationality/maritalStatus, advanceCare.provisionInstruments,
  // r.instrument, testamentRec.personsNamedInTheWill, heirsBriefOverview). Stand 15.09.2026: die
  // Kennungs-Kampagne hat die bespoke Funktion mit umgestellt — Depot und Schema folgen ihr.
  // Nachtrag 20.09.2026 (L4, zweiter Code): der Instrument-Wert selbst ist jetzt 'will' — die
  // L4-Stufe (Schema 84->85) hat ihn umbenannt, anders als der 15.09.-Stand hier noch annahm.
  const schema = {
    staatsangehoerigkeit: { typ: 'feld', sektor: 'identity', feld: 'nationality' },
    lebensmittelpunkt: { typ: 'verbinden', teile: [{ sektor: 'identity', feld: 'streetAddress' }, { sektor: 'identity', feld: 'postcodeCity' }], trenner: ', ' },
    testament_form: { typ: 'listenfeld', sektor: 'advanceCare', feld: 'provisionInstruments', diskriminante: { feld: 'instrument', wert: 'will' }, unterfeld: 'form' },
    familienstand: { typ: 'feld', sektor: 'identity', feld: 'maritalStatus' },
    kinder_namen: { typ: 'personenNamen', sektor: 'people', feld: 'childrenAndDependants', unterfeld: 'person' },
    testament_bedachte_namen: { typ: 'listenfeldPersonenNamen', sektor: 'advanceCare', feld: 'provisionInstruments', diskriminante: { feld: 'instrument', wert: 'will' }, unterfeld: 'personsNamedInTheWill' },
    erben_namen: { typ: 'personenNamen', sektor: 'advanceCare', feld: 'heirsBriefOverview' },
  };
  const ausSchema = V.datenSchemaLesen(schema, V.getData());
  const ausAlt = V._erbscheinSektorDaten();
  assert.deepEqual(ausSchema, ausAlt, 'das deklarative Schema muss verlustfrei dasselbe liefern wie die bespoke Funktion');
  // Rot-Beweis-Gegenstück zur deepEqual-Prüfung oben (U2-ADR-248): eine echte Wert-Behauptung,
  // nicht nur gegenseitige Übereinstimmung — sonst hätte diese Probe den ursprünglichen
  // Sektor-Fehler nie gefangen (zwei gleich falsche leere Arrays sind einander auch gleich).
  assert.deepEqual(ausSchema.kinder_namen, ['Tochter Beispiel'], 'kinder_namen muss den echten Namen liefern, nicht nur mit sich selbst übereinstimmen');
  assert.deepEqual(ausAlt.kinder_namen, ['Tochter Beispiel'], 'dasselbe gilt für den bespoke XML-Lesepfad');
});

/* ══ Ende-zu-Ende: ein eingelassenes logikModul-Bundle wird ueber dieselbe Engine gerendert
   wie ein internes Modul (dokumentHTML/_modulOderVorlage/modulDokumentAbschnitte) ══════════ */

function synthetischesBundle() {
  return {
    id: 'zzz-testmodul',
    titel: 'Test-Bundle',
    sektor: 'advanceCare',
    herkunft: 'test-anbieter',
    datenSchema: { x: { typ: 'feld', sektor: 'identity', feld: 'maritalStatus' } },
    abschnitte: [
      { titel: 'Testabschnitt', bloecke: [
        { typ: 'frageAntwortOderLuecke', feldId: 'x', frage: 'Familienstand?',
          format: { typ: 'codeListeLabel', sektor: 'identity', feld: 'maritalStatus' }, luecke: '— nicht erfasst —' },
        { typ: 'crossRef', text: 'Verheiratet-Hinweis.', bedingung: { typ: 'feldGleich', feld: 'x', wert: 'verh' } },
      ] },
    ],
    dokAusgabe: { h1: 'Test-Bundle-Dokument', klasse: '', herkunftText: '', unterschrift: false,
      unterschriftErsatzHinweis: 'Testhinweis.', fussText: ' · Test' },
  };
}

test('[logikModul·Ende-zu-Ende] ein eingelassenes Bundle wird korrekt gerendert (Formatierungs- + Bedingungs-Schema greifen)', async () => {
  const { V } = await ladeKern();
  await V.depotAnlegen('logikmodul-e2e-pw');
  const d = V.getData();
  d.sektoren.identity = { maritalStatus: 'verh' };
  d.logikModule = [synthetischesBundle()];
  V.setData(d);
  const html = V.dokumentHTML('zzz-testmodul');
  assert.match(html, /Test-Bundle-Dokument/);
  assert.match(html, /Familienstand\? verheiratet/, 'das Formatierungs-Schema muss den Code ueber codeListeLabel aufloesen');
  assert.match(html, /Verheiratet-Hinweis\./, 'das Bedingungs-Schema muss bei feldGleich zutreffen');
  assert.match(html, /Testhinweis\./, 'unterschrift:false muss den Ersatzhinweis zeigen, wie bei internen Modulen');
  assert.ok(!html.includes('Ort, Datum, Unterschrift'));
});

test('[logikModul·Gegenprobe] eine nicht zutreffende Bedingung unterdrueckt die crossRef-Zeile', async () => {
  const { V } = await ladeKern();
  await V.depotAnlegen('logikmodul-e2e-pw2');
  const d = V.getData();
  d.sektoren.identity = { maritalStatus: 'ledig' };
  d.logikModule = [synthetischesBundle()];
  V.setData(d);
  const html = V.dokumentHTML('zzz-testmodul');
  assert.ok(!html.includes('Verheiratet-Hinweis.'), 'die Bedingung feldGleich:verh trifft bei "ledig" nicht zu');
});

test('[logikModul] _modulOderVorlage findet ein eingelassenes Bundle VOR einer importierten Vorlage gleicher id-Kollision nicht relevant, aber NACH VORSORGE_MODUL_BY_ID', async () => {
  const { V } = await ladeKern();
  await V.depotAnlegen('logikmodul-e2e-pw3');
  const d = V.getData();
  d.logikModule = [synthetischesBundle()];
  V.setData(d);
  const reg = V._modulOderVorlage('zzz-testmodul');
  assert.ok(reg, 'das Bundle wird gefunden');
  assert.equal(typeof reg.generator.datenLesen, 'function');
  assert.equal(reg.dokAusgabe.h1, 'Test-Bundle-Dokument');
});
