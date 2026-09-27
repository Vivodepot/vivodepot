'use strict';
/* DATENSATZ-ROH (25.09.2026, HOCH): der Datensatz jeder Herausgabe (Zusammenstellung, Anlass, Anfrage-Antwort) trägt je Feld
   neben dem Anzeigetext `wert` den Rohwert `roh`. Bei einer Liste ist `roh` die ganze Liste — und damit ging hinaus, was die
   Anzeige zurückhält:
   · die Bedingungen einer KI-Verfügung, nachdem die Grundentscheidung auf „untersagung“ umgestellt wurde (dieselbe Klasse wie
     U2-ADR-NNN vom 17.09.2026, „offener JSON-Vollexport entfernt“, nur an einem anderen Ausgang);
   · ein sensibles Unterfeld (die Eintragungsnummer im Zentralen Vorsorgeregister) ohne Opt-in der Inhaberin.
   Gemessen am Kanon 2cfee5ea8: zusammenstellungDatensatz und anlassDatensatz('krankenhausakut') trugen beides, ohne Opt-in;
   die Dateien dazu schreiben flowZusammenstellungHerausgeben und flowAnlassExport unverschlüsselt.
   Die Regel danach: `roh` geht durch DIESELBE Sichtbarkeit (feldSichtbar gegen die Zeile) und DIESELBE Sensibilität
   (unterfeldIstSensibel) wie der Anzeigetext; ein Verweis ({ ref }) auf eine Person bleibt — an ihm hängt der Name in der
   Antwort (v797, SUB-DEPOT-PERSONEN). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const BEDINGUNGEN = Object.freeze({
  purpose: 'trauer', authorizedParties: 'benannte', scope: 'privat', permittedDataTypes: 'sprache',
  timeLimit: 'jahre', numberOfYears: 'zehn', behaviouralLimit: 'belegt', digitalEstateAdministration: 'benannt',
});
const ZVR = 'ZVR-2021-0815';
const LISTE = 'advanceCare.provisionInstruments';

async function depot() {
  const { V } = ladeKern();
  await V.depotAnlegen('datensatz-roh-pw-2026');
  V.akteurSelbstErklaeren('Gertrud Beispiel');
  const anna = V.personHinzufuegen({ name: 'Anna Beispiel', beziehung: 'kind' });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', Object.assign({ instrument: 'ki-verfuegung', basicDecision: 'untersagung' }, BEDINGUNGEN));
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
    { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', authorizedPersons: [{ ref: anna }], centralRegisterOfPowersOf: ZVR });
  return { V, anna };
}
const verborgeneIn = (wert) => {
  const s = JSON.stringify(wert);
  return Object.values(BEDINGUNGEN).filter((m) => s.includes('"' + m + '"'));
};
const rohDerListe = (ds) => (ds.felder.find((f) => f.kennung === LISTE) || {}).roh;

test('[DATENSATZ-ROH·KI] die Bedingungen einer untersagten KI-Verfügung gehen in keinem Datensatz hinaus — auch nicht im Rohwert', async () => {
  const { V } = await depot();
  for (const sensibel of [false, true]) {
    const ds = V.zusammenstellungDatensatz([LISTE], { id: 'x', titel: '' }, sensibel ? { sensibel: true } : {});
    assert.ok(rohDerListe(ds), 'Vorbedingung: die Liste steht im Datensatz');
    assert.deepEqual(verborgeneIn(ds), [], 'Zusammenstellung, sensibel=' + sensibel);
  }
  for (const anlass of ['krankenhausakut', 'pflegeheimakut', 'behoerden_nachlass']) {
    assert.deepEqual(verborgeneIn(V.anlassDatensatz(anlass, {})), [], 'Anlass ' + anlass);
  }
});

test('[DATENSATZ-ROH·Sensibel] ein sensibles Unterfeld reist im Rohwert nur mit Opt-in', async () => {
  const { V } = await depot();
  const ohne = JSON.stringify(V.zusammenstellungDatensatz([LISTE], { id: 'x', titel: '' }, {}));
  assert.ok(!ohne.includes(ZVR), 'ohne Opt-in: die Eintragungsnummer bleibt zurück');
  assert.ok(!JSON.stringify(V.anlassDatensatz('krankenhausakut', {})).includes(ZVR), 'Anlass ohne Opt-in');
  const mit = JSON.stringify(V.zusammenstellungDatensatz([LISTE], { id: 'x', titel: '' }, { sensibel: true }));
  assert.ok(mit.includes(ZVR), 'mit Opt-in reist sie mit — die Inhaberin entscheidet');
});

test('[DATENSATZ-ROH·Verweis] der sichtbare Personen-Verweis bleibt im Rohwert, die Zeilen-Kennung auch', async () => {
  const { V, anna } = await depot();
  const zeilen = rohDerListe(V.zusammenstellungDatensatz([LISTE], { id: 'x', titel: '' }, {}));
  const vollmacht = zeilen.find((z) => z.instrument === 'enduring-power-of-attorney');
  assert.deepEqual(vollmacht.authorizedPersons, [{ ref: anna }]);
  assert.ok(typeof vollmacht.id === 'string' && vollmacht.id, 'die Zeilen-Kennung trägt Verweise auf die Zeile (Bankvollmacht)');
  const ki = zeilen.find((z) => z.instrument === 'ki-verfuegung');
  assert.equal(ki.basicDecision, 'untersagung', 'die Grundentscheidung selbst ist sichtbar und reist');
});

test('[DATENSATZ-ROH·Gegenprobe] die Kontrolle ist nicht blind: der rohe Depot-Zustand trägt die Bedingungen und die Nummer', async () => {
  const { V } = await depot();
  const roh = V.vollExportJSON({ sensibel: true });
  assert.equal(verborgeneIn(roh).length, Object.keys(BEDINGUNGEN).length);
  assert.ok(JSON.stringify(roh).includes(ZVR));
});

/* ── Die Klasse (G3): je Zurückhaltungsart ein Marker, über JEDEN Datensatz-Ausgang und jede Kennung des Katalogs ──
   Zurückhaltungsarten: (1) Tor des Assistenten (KI-Bedingungen bei Untersagung), (2) sensibles Unterfeld ohne Opt-in,
   (3) von der Inhaberin als sensibel markiertes Unterfeld, (4) in der Zeile unsichtbares Unterfeld (sichtbarWenn),
   (5) ein Schlüssel, den die Definition nicht kennt und der nicht als Zeilen-Metadatum benannt ist. */
const KATALOG = require('../bereiche/feldkatalog.json');
const ALLE_KENNUNGEN = (KATALOG.felder || KATALOG).map((f) => f.kennung);

test('[DATENSATZ-ROH·Klasse] kein Datensatz-Ausgang trägt eine zurückgehaltene Angabe — über alle Kennungen, alle Anlässe, alle eingebauten Exporte', async () => {
  const { V } = await depot();
  const zeilen = V.ankerDaten().sektoren.advanceCare.provisionInstruments;
  const vollmacht = zeilen.find((z) => z.instrument === 'enduring-power-of-attorney');
  // (3) die Inhaberin markiert ein sonst nicht sensibles Unterfeld als sensibel
  vollmacht.morePreciseDescription = 'MARKER-INHABERIN';
  V.sensibelFeldSetzen('advanceCare', 'liste:provisionInstruments:enduring-power-of-attorney:morePreciseDescription', true);
  // (4) ein Unterfeld einer anderen Instrument-Art, in dieser Zeile unsichtbar
  vollmacht.basicDecision = 'MARKER-UNSICHTBAR';
  // (5) ein Schlüssel ohne Definition
  vollmacht.fremderSchluessel = 'MARKER-FREMD';
  const marker = [...Object.values(BEDINGUNGEN).map((m) => '"' + m + '"'), ZVR, 'MARKER-INHABERIN', 'MARKER-UNSICHTBAR', 'MARKER-FREMD'];
  const funde = [];
  const pruefe = (name, wert) => { const s = JSON.stringify(wert); for (const m of marker) if (s.includes(m)) funde.push(name + ': ' + m); };
  pruefe('zusammenstellung:alle', V.zusammenstellungDatensatz(ALLE_KENNUNGEN, { id: 'x', titel: '' }, {}));
  for (const a of V.anlaesseMitDaten()) pruefe('anlass:' + a.id, V.anlassDatensatz(a.id, {}));
  for (const def of V.EXPORT_FORMATE) if (typeof def.baue === 'function') pruefe('export:' + def.id, def.baue({}));
  pruefe('vollDepotModell', V.vollDepotModell({}));
  assert.deepEqual(funde, []);
  // Gegenprobe: die Marker stehen wirklich im Depot, die Prüfung ist nicht blind
  const roh = JSON.stringify(V.vollExportJSON({ sensibel: true }));
  for (const m of marker) assert.ok(roh.includes(m), 'Kontrolle: ' + m + ' steht im Depot');
});
