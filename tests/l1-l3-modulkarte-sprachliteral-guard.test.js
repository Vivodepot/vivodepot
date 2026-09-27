'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   l1-l3-modulkarte-sprachliteral-guard.test.js — Rot-Beweis für L1 UND L3
   (code-review-74-sprachleck-ae0f75b2-2026-09-16.md, in der Befund-Ratsche
   18./19.09.2026 nachgetragen).

   L1 (HOCH): `modulKarteStatus()` trug vier Rückgabe-Zweige mit festem
   deutschem Text — instrumentErteilt/instrumentKeine/instrumentFestgelegt.
   Gemessen als behoben: vivodepot.html:6818-6823 (DE) / :11091-11094 (EN)
   führen alle vier Zweige über STRINGS.

   L3 (MITTEL): der Code-Review-Bericht selbst zeigt, dass keine der drei
   Reparaturen (modulKarteStatus, instrumentZeileOptionen,
   flowPersonRegisterNeu) einen Wächter hatte — jede der 23 gelandeten Proben
   blieb grün, wenn man eine Reparatur einzeln auf das Literal zurückdrehte,
   weil sie den Klassifikator/die Orchestrierung prüfen, nie den reparierten
   Kern selbst. Dieser Test prüft den Kern: er läuft in DE UND EN und verlangt
   UNTERSCHIEDLICHEN Text — ein zurückgedrehtes Literal wäre in beiden
   Sprachen gleich deutsch und würde hier rot.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// S1 + S8 (U2-ADR-426/428): das Gerüst trägt weder einen englischen noch einen deutschen Satz — jede Sprache kommt mit ihrem Standardprodukt. Gemessen wird darum je Sprache
// in einem eigenen gebackenen Kern (privat-de / privat-en), gleiche Aufbauschritte, gleiche Assertions.
async function ergebnis(sprache, aufbau, messen) {
  const { V } = await ladeKern({ produkt: sprache === 'en' ? 'privat-en' : 'privat-de' });
  await V.depotAnlegen('L1-L3-Guard-2026!');
  if (aufbau) aufbau(V);
  const d = V.getData();
  d.textsprache = sprache;
  V.setData(d);
  return messen(V);
}
async function deEn(aufbau, messen) {
  return { de: await ergebnis('de', aufbau, messen), en: await ergebnis('en', aufbau, messen) };
}

test('[L1/L3·Rot-Beweis] modulKarteStatus: Zweig "mehrfach/listeId" (n erteilt) unterscheidet sich DE/EN', async () => {
  const modul = { id: '_test', sektor: 'vorsorge', mehrfach: true, listeId: '_testListe', instrumentTyp: 'x' };
  const { de, en } = await deEn((V) => {
    const d = V.getData();
    d.sektoren = d.sektoren || {};
    d.sektoren.vorsorge = { _testListe: [{ instrument: 'x' }] };
    V.setData(d);
  }, (V) => V.modulKarteStatus(modul));
  assert.equal(de, '1 erteilt');
  assert.equal(en, '1 granted');
  assert.notEqual(de, en, 'ein zurückgedrehtes Literal wäre in DE und EN identisch deutsch');
});

test('[L1/L3·Rot-Beweis] modulKarteStatus: Zweig "kein Record" (instrumentKeine) unterscheidet sich DE/EN', async () => {
  const modul = { id: '_test', sektor: 'vorsorge', instrumentTyp: 'nichtVorhandenesInstrument' };
  const { de, en } = await deEn(null, (V) => V.modulKarteStatus(modul));
  assert.equal(de, 'keine');
  assert.equal(en, 'none');
  assert.notEqual(de, en);
});

test('[L1/L3·Rot-Beweis] modulKarteStatus: Zweig "ki-verfuegung ohne Record" (instrumentFestgelegt) unterscheidet sich DE/EN', async () => {
  const modul = { id: 'ki-verfuegung', sektor: 'vorsorge', instrumentTyp: 'kiVerfuegungDieEsNichtGibt' };
  const { de: deKeine, en: enKeine } = await deEn(null, (V) => V.modulKarteStatus(modul));
  assert.equal(deKeine, 'keine');
  assert.equal(enKeine, 'none');
  assert.notEqual(deKeine, enKeine);
});

test('[L1/L3·Rot-Beweis] modulKarteStatus: Zweig "Record vorhanden" (instrumentVorhanden) unterscheidet sich DE/EN', async () => {
  const modul = { id: '_test', sektor: 'vorsorge', instrumentTyp: 'will' };
  const { de, en } = await deEn((V) => {
    const d = V.getData();
    d.sektoren = d.sektoren || {};
    d.sektoren.advanceCare = { provisionInstruments: [{ id: 't1', instrument: 'will' }] };
    V.setData(d);
  }, (V) => V.modulKarteStatus(modul));
  assert.equal(de, 'vorhanden');
  assert.equal(en, 'present');
  assert.notEqual(de, en);
});

test('[L1/L3·Rot-Beweis] instrumentZeileOptionen: das einzige Options-Label unterscheidet sich DE/EN', async () => {
  const { de, en } = await deEn(null, (V) => V.instrumentZeileModell('will').feld.optionen[0].label);
  assert.equal(de, 'vorhanden');
  assert.equal(en, 'present');
  assert.notEqual(de, en);
});

test('[L1/L3·Rot-Beweis] flowPersonRegisterNeu: Modal-Titel/Primär-Knopf kommen aus STRINGS, nicht als Literal', async () => {
  const { src } = await ladeKern();
  const rumpf = src.slice(src.indexOf('function flowPersonRegisterNeu('),
    src.indexOf('function flowPersonRegisterBearbeiten('));
  assert.ok(rumpf.includes('STRINGS.refNeuePersonOption'), 'Titel kommt aus STRINGS, kein Literal "Neue Person"');
  assert.ok(rumpf.includes('STRINGS.btnSpeichern'), 'Primär-Knopf kommt aus STRINGS');
  assert.ok(!/titel:\s*'[^']*[A-Za-zÄÖÜäöüß]{3,}[^']*'/.test(rumpf), 'kein deutsches Literal im Titel-Feld');
});
