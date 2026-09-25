'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „Die Ereignis-Achse — Einträge, die veralten, sagen es"
   (13.08.2026), Zug 1 — Datenmodell + Migration.
   ────────────────────────────────────────────────────────────────────────
   Ein Prüfanlass kann aus einem EREIGNIS kommen statt aus der Zeit
   (Familienstandswechsel/Tod/Betreuungsbeginn), zusätzlich zu ablaufDatum/
   pruefIntervallMonate. Bestandseinträge bekommen KEINEN rückwirkenden
   Anlass (Migration ist additiv, erfindet nichts — derselbe Grundsatz wie
   bei „Ausdrücklich keine", 12.08.2026).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'ereignis-achse-pw';

async function depotMitVollmacht() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  const partnerId = V.personHinzufuegen({ name: 'Jonas Partner' });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
    { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', authorizedPersons: [{ ref: partnerId }] });
  const zeile = V.getData().sektoren.advanceCare.provisionInstruments[0];
  return { V, partnerId, zeilenId: zeile.id };
}

test('[Zug1] EREIGNIS_ACHSE_FELDER: authorizedPersons trägt alle drei Ereignisse', async () => {
  const { V } = ladeKern();
  const e = V.EREIGNIS_ACHSE_FELDER.find(x => x.feldId === 'provisionInstruments' && x.unterFeldId === 'authorizedPersons');
  assert.ok(e, 'authorizedPersons fehlt in der Registry');
  assert.deepEqual(e.ereignisse.slice().sort(), ['betreuung', 'familienstand', 'tod']);
});

test('[Zug1] ereignisMarkieren: legt ein neues, UNDATIERTES Dokument an, wenn noch keines existiert', async () => {
  const { V, partnerId, zeilenId } = await depotMitVollmacht();
  assert.equal(V.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', zeilenId).length, 0,
    'Vorbedingung: noch kein Dokument (kein Datum gesetzt)');
  const m = V.ereignisMarkieren('familienstand', partnerId, new Date());
  assert.equal(m.length, 1, 'ROT ERWARTET, wenn falsch: genau ein Dokument muss markiert werden');
  const docs = V.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', zeilenId);
  assert.equal(docs.length, 1);
  assert.equal(docs[0].gueltigAb, null, 'neu angelegtes Dokument bleibt undatiert (kein erfundenes Datum)');
  assert.ok(Array.isArray(docs[0].ereignisAnlaesse) && docs[0].ereignisAnlaesse.some(a => a.typ === 'familienstand'));
});

test('[Zug1] ereignisMarkieren: nicht-referenzierte Person markiert nichts', async () => {
  const { V } = await depotMitVollmacht();
  const fremdeId = V.personHinzufuegen({ name: 'Fremde Person' });
  const m = V.ereignisMarkieren('familienstand', fremdeId, new Date());
  assert.equal(m.length, 0);
});

test('[Zug1] ereignisMarkieren: idempotent — zweimal derselbe Anlass erzeugt keinen zweiten Eintrag', async () => {
  const { V, partnerId, zeilenId } = await depotMitVollmacht();
  V.ereignisMarkieren('familienstand', partnerId, new Date());
  V.ereignisMarkieren('familienstand', partnerId, new Date());
  const doc = V.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', zeilenId)[0];
  assert.equal(doc.ereignisAnlaesse.filter(a => a.typ === 'familienstand').length, 1);
});

test('[Zug1] ereignisMarkieren: kein Ereignis für einen Kontakt (hausarzt) — Registry lehnt ab (kein provisionInstruments-Unterfeld)', async () => {
  const { V, partnerId } = await depotMitVollmacht();
  V.sektorFeldSetzen('health', 'generalPractitioner', { ref: partnerId });
  const m = V.ereignisMarkieren('familienstand', partnerId, new Date());
  // Die Vollmacht selbst bleibt der einzige Treffer — generalPractitioner ist kein registriertes
  // provisionInstruments-Unterfeld und kann per Konstruktion nicht auftauchen.
  assert.equal(m.length, 1);
});

test('[Zug1] dokumentEreignisSchliessen: nimmt EINEN Anlass, ohne den Eintrag zu bearbeiten', async () => {
  const { V, partnerId, zeilenId } = await depotMitVollmacht();
  V.ereignisMarkieren('familienstand', partnerId, new Date());
  V.ereignisMarkieren('tod', partnerId, new Date());
  const [doc] = V.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', zeilenId);
  assert.equal(doc.ereignisAnlaesse.length, 2);
  V.dokumentEreignisSchliessen(doc.id, 'familienstand');
  const nachher = V.dokumentLesen(doc.id);
  assert.equal(nachher.ereignisAnlaesse.length, 1, 'ROT ERWARTET, wenn falsch: nur der eine Anlass verschwindet');
  assert.equal(nachher.ereignisAnlaesse[0].typ, 'tod');
  // Die eigentlichen Vorsorge-Daten (authorizedPersons) bleiben unberührt — kein Bearbeiten nötig.
  const zeile = V.getData().sektoren.advanceCare.provisionInstruments.find(z => z.id === zeilenId);
  assert.equal(zeile.authorizedPersons[0].ref, partnerId);
});

test('[Zug1] dokumentEreignisSchliessen ohne Typ-Argument: schließt ALLE Anlässe', async () => {
  const { V, partnerId, zeilenId } = await depotMitVollmacht();
  V.ereignisMarkieren('familienstand', partnerId, new Date());
  V.ereignisMarkieren('tod', partnerId, new Date());
  const [doc] = V.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', zeilenId);
  V.dokumentEreignisSchliessen(doc.id);
  assert.equal(V.dokumentLesen(doc.id).ereignisAnlaesse.length, 0);
});

/* ── Wächter (Zug 4 an dieser Stelle mitgeprüft, weil er dieselbe Registry trägt) ── */

test('[Zug4] ereignisAchseWaechterFunde: gegen die ECHTE Struktur — 0 unregistrierte Personen-Referenzfelder', async () => {
  const { V } = ladeKern();
  const funde = V.ereignisAchseWaechterFunde();
  assert.deepEqual(funde, [],
    'ROT ERWARTET, wenn falsch: jedes entitaet:person-Feld muss zugeordnet oder ausgenommen sein:\n'
    + JSON.stringify(funde, null, 1));
});

test('[Zug4·Rotmachbarkeit] ein neues, unregistriertes Personen-Referenzfeld schlägt an', async () => {
  const { V } = ladeKern();
  const vorher = V.SEKTOREN.length;
  const fingiert = { id: 'ganz_neues_vorsorge_referenzfeld', label: 'Testfeld', typ: 'ref', entitaet: 'person' };
  const sek = V.SEKTOREN.find(s => s.id === 'identity');
  sek.sektionen[0].felder.push(fingiert);
  try {
    const funde = V.ereignisAchseWaechterFunde();
    assert.equal(vorher, V.SEKTOREN.length, 'Positivkontrolle: kein Sektor verschwunden');
    assert.ok(funde.some(f => f.feldId === 'ganz_neues_vorsorge_referenzfeld'),
      'ROT ERWARTET, wenn falsch: der Wächter muss ein frisch eingesetztes, unregistriertes Feld finden');
  } finally {
    sek.sektionen[0].felder.pop();   // zurücknehmen
  }
  assert.deepEqual(V.ereignisAchseWaechterFunde(), [], 'nach der Rücknahme wieder sauber');
});

/* ── Migration: additiv, KEIN erfundener Anlass an Bestandseinträgen ── */

test('[Zug1·Migration] ein Alt-Depot mit bestehenden Dokumenten bekommt KEINE ereignisAnlaesse fabriziert', async () => {
  const { V } = await depotMitVollmacht();
  const alt = V.getData();
  // Ein Bestands-Dokument simulieren, wie es vor Schema 62 aussah (kein ereignisAnlaesse-Feld).
  alt.dokumente.push({ id: 'alt-dok-1', typ: 'enduring-power-of-attorney', sektorId: 'vorsorge', gueltigAb: '2020-01-01',
    aktualisiertAm: '2020-01-01', erstelltAm: '2020-01-01', felder: [], mappeRef: null,
    istStandard: false, quelle: 'eigen', sensibel: false, adresse: '', partei: '' });
  alt.schemaVersion = 61;
  V.depotNormalisieren(alt);
  assert.ok(alt.schemaVersion >= 62, 'Migration bis mindestens Schema 62 gelaufen');
  for (const doc of alt.dokumente) {
    assert.ok(!doc.ereignisAnlaesse || doc.ereignisAnlaesse.length === 0,
      'ROT ERWARTET, wenn falsch: kein Bestandsdokument darf einen erfundenen Ereignis-Anlass tragen — Dokument ' + doc.id);
  }
});
