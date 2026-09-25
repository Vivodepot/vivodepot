'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „M3 Eintrag-Bezug" (Weg B, 11.08.2026), Zug 1 — die Eintrag-Modell-
   Grundlage. `doc.felder[]`-Referenzen bekommen ein optionales `zeilenId`
   (stabile Listen-Zeilen-id, U2-ADR-071-Nachtrag), WO eindeutig auflösbar:
     (a) Standard-Dokument-Erzeugung kennt ihren `typ` — trifft der Diskriminant
         einer Listen-Zeile (provisionInstruments.typ, bankvollmacht-Sonderfall
         typ='enduring-power-of-attorney'+art='bank'), wird die Zeile referenziert.
     (b) Migration bestehender `felder[]`-Referenzen: trägt die Ziel-Liste HEUTE
         genau eine Zeile, ist das eindeutig (Auftrag erlaubt das ausdrücklich).
   Alle anderen Fälle bleiben UNVERÄNDERT feld-basiert (Rettungsfeld, U2-ADR-050-
   Muster) — KEIN Raten, wenn mehrere Zeilen infrage kommen.
   Zug 0 (Messung, dieselbe Nacht): 14 standardDokumente-Katalogeinträge tragen
   felder[], 7 „Feld ohne Liste" (eindeutig, unverändert), 7 zeigen ALLE auf
   `advanceCare.provisionInstruments` — genau der Fall, den dieser Zug auflöst.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const JETZT = new Date('2026-08-11T10:00:00Z');

async function depot() {
  const { V } = ladeKern();
  await V.depotAnlegen('m3-eintrag-bezug-2026!');
  V.akteurSelbstErklaeren('Tester');
  return V;
}

/* ── Zug 0 — pinned: die Bestandsdaten-Messung darf nicht unbemerkt wegdriften ──
   Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): fünf standardDokumente-Einträge
   (personalausweis/aufenthaltstitel/elefand/krankenkassenkarte/schwerbehindertenausweis) zeigen
   jetzt auf `{feldId:'<liste>', unterfeldId:'gueltig'}` statt auf ein Flachfeld — ihr `feldId`
   trifft darum jetzt selbst einen `typ:'liste'`-Eintrag (dieselbe Messlogik hier zählt nach
   `sektorId.feldId`, ohne `unterfeldId`). Aus „7 eindeutig / 7 listenZiel" wird „2 eindeutig
   (reisepass_gueltig, fuehrerschein_gueltig) / 12 listenZiel", und `provisionInstruments` ist
   nicht mehr die EINZIGE Ziel-Liste — fünf weitere kommen hinzu. Die Gesamtzahl 14 bleibt: es
   sind dieselben Referenzen, nur anders eingeordnet. */
test('[M3·Zug0] standardDokumente-Katalog: 14 Referenzen, 2 eindeutig, 12 auf sechs verschiedene Listen', () => {
  const { V } = ladeKern();
  const listenFelder = new Set();
  for (const s of V.SEKTOREN) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        if (f.typ === 'liste') listenFelder.add(s.id + '.' + f.id);
      }
    }
  }
  let gesamt = 0, eindeutig = 0, listenZiel = 0;
  const listenZielSektorFeld = new Set();
  for (const s of V.SEKTOREN) {
    for (const sd of (s.standardDokumente || [])) {
      if (!Array.isArray(sd.felder) || !sd.felder.length) continue;
      for (const ref of sd.felder) {
        gesamt++;
        const key = ref.sektorId + '.' + ref.feldId;
        if (listenFelder.has(key)) { listenZiel++; listenZielSektorFeld.add(key); }
        else eindeutig++;
      }
    }
  }
  assert.equal(gesamt, 14, 'Gesamtzahl der standardDokumente-Feld-Referenzen');
  assert.equal(eindeutig, 2, 'Feld ohne Liste — unverändert eindeutig (reisepass_gueltig, fuehrerschein_gueltig)');
  assert.equal(listenZiel, 12, 'Listenfeld-Ziel — der Zug-1-Fall, seit Glied 3 fünf mehr');
  assert.deepEqual([...listenZielSektorFeld].sort(), [
    'advanceCare.provisionInstruments',
    'identity.idDocuments', 'identity.residencePermit', 'mobility.elefandRegistrations',
    'health.healthInsuranceCards', 'socialInsurance.severeDisabilityCards',
  ].sort(), 'sechs verschiedene Ziel-Listen statt nur einer');
});

/* ── _dokumentFelderNormalisieren trägt zeilenId ─────────────────────────── */
test('[M3·Zug1] _dokumentFelderNormalisieren behält eine gültige zeilenId', () => {
  const { V } = ladeKern();
  const out = V._dokumentFelderNormalisieren([
    { sektorId: 'advanceCare', feldId: 'provisionInstruments', zeilenId: 'row-1' },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].zeilenId, 'row-1');
});

test('[M3·Zug1] _dokumentFelderNormalisieren verwirft eine leere/nicht-string zeilenId', () => {
  const { V } = ladeKern();
  const out = V._dokumentFelderNormalisieren([
    { sektorId: 'advanceCare', feldId: 'provisionInstruments', zeilenId: '' },
    { sektorId: 'identity', feldId: 'ausweis_gueltig', zeilenId: 42 },
  ]);
  assert.equal(out.length, 2);
  assert.ok(!('zeilenId' in out[0]));
  assert.ok(!('zeilenId' in out[1]));
});

/* ── dokumentFelder löst die konkrete Zeile auf, nicht mehr die ganze Liste ── */
test('[M3·Zug1] dokumentFelder mit zeilenId liefert die EINE Zeile, nicht die ganze Liste', async () => {
  const V = await depot();
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'will', dateOfLastChange: '2024-01-01' });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'living-will', dateOfLastChange: '2024-02-02' });
  const zeilen = V.getData().sektoren.advanceCare.provisionInstruments;
  const testamentZeile = zeilen.find(z => z.instrument === 'will');
  const doc = V.dokumentAnlegen({ name: 'Testament', sektorId: 'advanceCare',
    felder: [{ sektorId: 'advanceCare', feldId: 'provisionInstruments', zeilenId: testamentZeile.id }] }, JETZT);
  const aufgeloest = V.dokumentFelder(doc);
  assert.equal(aufgeloest.length, 1);
  assert.equal(aufgeloest[0].vorhanden, true);
  assert.equal(aufgeloest[0].wert.id, testamentZeile.id);
  assert.equal(aufgeloest[0].wert.instrument, 'will');
});

test('[M3·Zug1] dokumentFelder mit zeilenId auf gelöschte Zeile: verwaist, wirft nie (Konsequenz 8)', async () => {
  const V = await depot();
  const doc = V.dokumentAnlegen({ name: 'X', sektorId: 'advanceCare',
    felder: [{ sektorId: 'advanceCare', feldId: 'provisionInstruments', zeilenId: 'nie-existiert' }] }, JETZT);
  const aufgeloest = V.dokumentFelder(doc);
  assert.equal(aufgeloest[0].vorhanden, false);
  assert.equal(aufgeloest[0].wert, null);
});

test('[M3·Zug1] dokumentFelder OHNE zeilenId bleibt unverändert (Feld ohne Liste)', async () => {
  const V = await depot();
  // Feld ohne Liste: `ausweis_gueltig` gibt es seit Glied 3 nicht mehr (Liste idDocuments) — die Probe
  // schrieb seither ins Leere; ein echtes flaches Datumsfeld trägt dieselbe Aussage.
  V.sektorFeldSetzen('identity', 'birthDate', '2030-01-01');
  const doc = V.dokumentAnlegen({ name: 'Perso', sektorId: 'identity',
    felder: [{ sektorId: 'identity', feldId: 'birthDate' }] }, JETZT);
  const aufgeloest = V.dokumentFelder(doc);
  assert.equal(aufgeloest[0].vorhanden, true);
  assert.equal(aufgeloest[0].wert, '2030-01-01');
  assert.ok(!('zeilenId' in aufgeloest[0]));
});

/* ── dokumentAusStandard löst die Zeile über den Diskriminanten auf (kein Raten) ── */
test('[M3·Zug1] dokumentAusStandard(testament): genau eine Zeile → zeilenId gesetzt', async () => {
  const V = await depot();
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'will', dateOfLastChange: '2024-01-01' });
  const zeile = V.getData().sektoren.advanceCare.provisionInstruments[0];
  const doc = V.dokumentAusStandard('will', 'advanceCare', JETZT);
  assert.ok(doc);
  const ref = doc.felder.find(f => f.feldId === 'provisionInstruments');
  assert.ok(ref, 'die Vorverknüpfung bleibt bestehen');
  assert.equal(ref.zeilenId, zeile.id);
});

test('[M3·Zug1] dokumentAusStandard(bankvollmacht): Sonderfall typ=vorsorgevollmacht+art=bank', async () => {
  const V = await depot();
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank', dateOfLastChange: '2024-03-03' });
  const zeile = V.getData().sektoren.advanceCare.provisionInstruments[0];
  const doc = V.dokumentAusStandard('bank-power-of-attorney', 'finance', JETZT);
  assert.ok(doc);
  const ref = doc.felder.find(f => f.feldId === 'provisionInstruments');
  assert.equal(ref.zeilenId, zeile.id);
});

test('[M3·Zug1] dokumentAusStandard(testament): KEINE passende Zeile → kein Raten, Referenz bleibt feld-basiert', async () => {
  const V = await depot();
  // Liste leer — keine Zeile zum Zuordnen.
  const doc = V.dokumentAusStandard('will', 'advanceCare', JETZT);
  assert.ok(doc);
  const ref = doc.felder.find(f => f.feldId === 'provisionInstruments');
  assert.ok(ref, 'die Vorverknüpfung bleibt bestehen');
  assert.ok(!('zeilenId' in ref), 'kein Raten ohne auflösbare Zeile');
});

test('[M3·Zug1] dokumentAusStandard(testament): ZWEI Zeilen desselben Typs → Diskriminant bleibt eindeutig (erste Zeile)', async () => {
  const V = await depot();
  // Zwei Testament-Zeilen sind fachlich ungewöhnlich, aber möglich — der Diskriminant
  // selbst bleibt hier die Auflösung; keine künstliche Mehrdeutigkeit erzwungen.
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'will', dateOfLastChange: '2020-01-01' });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'will', dateOfLastChange: '2024-01-01' });
  const erste = V.getData().sektoren.advanceCare.provisionInstruments[0];
  const doc = V.dokumentAusStandard('will', 'advanceCare', JETZT);
  const ref = doc.felder.find(f => f.feldId === 'provisionInstruments');
  assert.equal(ref.zeilenId, erste.id);
});

/* ── C7/Weg-3-Pfad (instrumentDokumentNachtragen) bekommt dieselbe Auflösung ────── */
test('[M3·Zug1] instrumentDokumentNachtragen (C7 Weg 3) löst dieselbe Zeile auf', async () => {
  const V = await depot();
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'living-will', dateOfLastChange: '2022-03-04' });
  const zeile = V.getData().sektoren.advanceCare.provisionInstruments[0];
  const doc = V.instrumentDokumentNachtragen({ instrument: 'living-will', dateOfLastChange: '2022-03-04' }, JETZT);
  assert.ok(doc);
  const ref = doc.felder.find(f => f.feldId === 'provisionInstruments');
  assert.ok(ref);
  assert.equal(ref.zeilenId, zeile.id);
});

/* ── dokumentAusErkennung (Vorschlag annehmen) bekommt dieselbe Auflösung ────────── */
test('[M3·Zug1] dokumentAusErkennung löst die Zeile über denselben Diskriminanten auf', async () => {
  const V = await depot();
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'will', dateOfLastChange: '2023-05-11' });
  const zeile = V.getData().sektoren.advanceCare.provisionInstruments[0];
  const doc = V.dokumentAusErkennung('will', JETZT);
  assert.ok(doc, 'testament ist in ERKENNUNG_LEITFELDER geführt');
  const ref = doc.felder.find(f => f.feldId === 'provisionInstruments');
  assert.ok(ref);
  assert.equal(ref.zeilenId, zeile.id);
});

/* ── Migration Schema 58→59: bestehende felder[]-Referenzen ohne zeilenId ────────── */
/* ECHTE ALTE FORM (16.09.2026). Bis hierher baute `altesDepot58` die Akte aus `leeresDepot()` mit den
   NEUEN Kennungen (`advanceCare.provisionInstruments`, Unterfeld `typ` daneben). So sah eine Datei vor
   Schema 59 nie aus: die Stufe läuft vor der Umbenennungsstufe und sieht die Kennungen der alten
   Datei. Die Probe prüfte die Stufe gegen dieselbe Landkarte, die die Stufe benutzte, und sah darum
   nicht, dass Weg (a) — der Diskriminant — unter den alten Kennungen in keinem Produkt griff.
   Jetzt wörtlich in der alten Form: `vorsorge.vorsorge_instrumente`, `finanzen.konten`.

   HERAUSGENOMMEN, weil tests/migration-59-alte-kennung.test.js sie in der echten Form und in zwei
   Produkten prüft: „Diskriminant löst eine Alt-Referenz auf" (dort mit ZWEI Zeilen, damit Weg (b)
   nicht mitrettet — hier mit einer Zeile hätte der Fall nie zwischen (a) und (b) unterschieden) und
   „zwei Zeilen ohne Diskriminant-Treffer → kein Raten" (dort die Gegenprobe). */
function altesDepot58() {
  const { V } = ladeKern();
  const d = {
    schemaVersion: 58,
    sektoren: {
      vorsorge: { vorsorge_instrumente: [{ id: 'zeile-testament', typ: 'testament' }] },
    },
    dokumente: [{
      id: 'doc-1', typ: 'testament', name: 'Testament', sektorId: 'vorsorge',
      gueltigAb: null, ablaufDatum: null, aktualisiertAm: null, erstelltAm: '2024-01-01',
      felder: [{ sektorId: 'vorsorge', feldId: 'vorsorge_instrumente' }],
      mappeRef: null, istStandard: true, quelle: 'standard', sensibel: false,
    }],
  };
  return { V, d };
}

test('[M3·Zug1] Migration 58→59: ohne Diskriminant, aber genau EINE Zeile → auch eindeutig (Auftragsvorgabe)', () => {
  const { V, d } = altesDepot58();
  d.dokumente[0].typ = 'eigen-ohne-katalog-typ';   // kein Diskriminant-Treffer möglich
  const migriert = V.depotNormalisieren(d);
  assert.equal(migriert.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
  const ref = migriert.dokumente[0].felder[0];
  assert.equal(ref.zeilenId, 'zeile-testament', 'genau eine Zeile in der Liste — eindeutig migrierbar');
  assert.equal(ref.sektorId, 'advanceCare', 'die Umbenennungsstufe am Kettenende läuft weiter');
  assert.equal(ref.feldId, 'provisionInstruments');
});

test('[M3·Zug1] Migration 58→59: einzeilige Regel gilt auch außerhalb der Instrumente (Feld-Klasse „Listenfeld")', () => {
  const { V, d } = altesDepot58();
  d.sektoren.finanzen = { konten: [{ id: 'konto-1', bank: 'Sparkasse' }] };
  d.dokumente.push({
    id: 'doc-2', typ: 'kontoauszug', name: 'Kontoauszug', sektorId: 'finanzen',
    gueltigAb: null, ablaufDatum: null, aktualisiertAm: null, erstelltAm: '2024-01-01',
    felder: [{ sektorId: 'finanzen', feldId: 'konten' }],
    mappeRef: null, istStandard: false, quelle: 'eigen', sensibel: false,
  });
  const migriert = V.depotNormalisieren(d);
  const ref = migriert.dokumente[1].felder[0];
  assert.equal(ref.zeilenId, 'konto-1');
});

test('[M3·Zug1] Migration 58→59: bereits zeilenId-tragende Referenz bleibt unangetastet (Idempotenz-Baustein)', () => {
  const { V, d } = altesDepot58();
  d.dokumente[0].felder[0].zeilenId = 'schon-gesetzt';
  d.sektoren.vorsorge.vorsorge_instrumente = [{ id: 'andere-zeile', typ: 'testament' }];
  const migriert = V.depotNormalisieren(d);
  assert.equal(migriert.dokumente[0].felder[0].zeilenId, 'schon-gesetzt', 'nicht überschrieben');
});

test('[M3·Zug1] Migration 58→59 ist idempotent: zweiter Lauf verändert nichts mehr', () => {
  const { V, d } = altesDepot58();
  const erst = V.depotNormalisieren(d);
  const nachErst = JSON.parse(JSON.stringify(erst));
  const zweit = V.depotNormalisieren(erst);
  assert.deepEqual(JSON.parse(JSON.stringify(zweit)), nachErst);
});

test('[M3·Zug1] Migration 58→59: 0 Zeilen in der Liste → kein Raten, unverändert', () => {
  const { V, d } = altesDepot58();
  d.sektoren.vorsorge.vorsorge_instrumente = [];
  d.dokumente[0].typ = 'eigen-ohne-katalog-typ';
  const migriert = V.depotNormalisieren(d);
  const ref = migriert.dokumente[0].felder[0];
  assert.ok(!('zeilenId' in ref));
});

/* ── Rückrichtung (Zeile → Dokumente) — BERECHNET, nicht gespeichert ────────────── */
test('[M3·Zug1] dokumenteFuerEintrag findet das Dokument über die Zeile (Rückrichtung)', async () => {
  const V = await depot();
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'will', dateOfLastChange: '2024-01-01' });
  const zeile = V.getData().sektoren.advanceCare.provisionInstruments[0];
  const doc = V.dokumentAusStandard('will', 'advanceCare', JETZT);
  const treffer = V.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', zeile.id);
  assert.equal(treffer.length, 1);
  assert.equal(treffer[0].id, doc.id);
});

test('[M3·Zug1] dokumenteFuerEintrag: andere Zeile derselben Liste liefert nichts', async () => {
  const V = await depot();
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'will', dateOfLastChange: '2024-01-01' });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'living-will', dateOfLastChange: '2024-02-02' });
  const zeilen = V.getData().sektoren.advanceCare.provisionInstruments;
  const pvZeile = zeilen.find(z => z.instrument === 'living-will');
  V.dokumentAusStandard('will', 'advanceCare', JETZT);   // referenziert NUR die Testament-Zeile
  assert.equal(V.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', pvZeile.id).length, 0);
});

test('[M3·Zug1] dokumenteFuerEintrag ist rein/defensiv: kein Depot, keine zeilenId → leeres Array, wirft nie', () => {
  const { V } = ladeKern();
  assert.deepEqual(V.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', 'egal'), []);
  assert.deepEqual(V.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', ''), []);
});
