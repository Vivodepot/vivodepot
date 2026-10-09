'use strict';
/* „Gilt bis“ je Fach (U2-ADR-452). Ein Fach kann ein Enddatum tragen; nach dem Tag öffnet Vivodepot es nicht mehr — an
   beiden Öffnungswegen: die Datei mit dem Fachpasswort direkt geöffnet (depotLaden) und das Depot als Sub-Depot eingehängt
   (subDepotVertrauenOeffnen). Der Tag selbst gilt noch. Das Datum reist im Geheimteil des Fachs, verschlüsselt und durch GCM
   geschützt: es steht nicht lesbar in der Datei, und ein Fach mit Datum ist nicht länger als eines ohne.
   Das ist ein Bedienschutz, keine kryptographische Sperre (wer Datei und Passwort hat, hat den Schlüssel) — die Probe hält
   fest, was die App zusagt, nicht mehr.
   Kein Uhr-Haken nötig: ein Datum in der Vergangenheit, der heutige Tag und eines weit in der Zukunft decken die Grenze ab.
   GERÜST-TEST: der Rot-Beweis entfernt die Prüfung im QUELLTEXT des Kerns; ausgeführt wird der gebackene Kern. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const PW = 'Inhaberin-2026!';
const PW_FACH = 'Gesundheit-Probe-2026!';
const PW_TOCHTER = 'Tochter-Probe-2026!';
const VERGANGEN = '2020-01-31';
const ZUKUNFT = '2099-12-31';
const heute = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); };

const kern = () => require('./load-kern.js').ladeKern;

async function mutterDatei(giltBis, lade) {
  const { V } = (lade || kern())();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Gerda Beispiel');
  const d = V.getData();
  d.sektoren.health = { ongoingTreatmentNext: 'WERT-IM-FACH' };
  // Freigegeben (Einzelfreigabe über die Markierung): seit SENSIBEL-FILTER-BEREICHSBAUSTEIN hält ein Bereichs-Baustein
  // sensible Felder zurück (tests/empfaenger-sensibel-filter.test.js); dieses Feld ist ab Werk sensibel.
  d.sensibelFelder = { health: { ongoingTreatmentNext: false } };
  V.setData(d);
  await V.empfaengerkreisSetzen({ name: 'Anna Gesundheit', bausteine: ['bereich:health'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], PW_FACH, undefined, giltBis);
  return JSON.parse(JSON.stringify(await V.depotSerialisierenV4()));
}
async function direktOeffnen(datei, pw, lade) {
  const { V } = (lade || kern())();
  await V.depotLaden(JSON.parse(JSON.stringify(datei)), pw);
  return V.getData();
}
async function alsSubOeffnen(datei, lade) {
  const { V } = (lade || kern())();
  await V.depotAnlegen(PW_TOCHTER);
  V.akteurSelbstErklaeren('Anna Beispiel');
  const e = V.subDepotEinhaengen(JSON.parse(JSON.stringify(datei)), { bezeichnung: 'Mama' });
  await V.subDepotVertrauenOeffnen(e.depotUUID, PW_FACH);
  return { V, uuid: e.depotUUID };
}
const abgelaufen = (e) => e && e.code === 'fach-abgelaufen';

test('[gilt bis] abgelaufen: die Datei öffnet sich mit dem Fachpasswort nicht mehr — die Meldung ist nicht „falsches Passwort“', async () => {
  const datei = await mutterDatei(VERGANGEN);
  await assert.rejects(direktOeffnen(datei, PW_FACH), (e) => abgelaufen(e) && e.giltBis === VERGANGEN);
  const d = await direktOeffnen(datei, PW);   // die Inhaberin ist nicht betroffen
  assert.equal(d.sektoren.health.ongoingTreatmentNext, 'WERT-IM-FACH');
});

test('[gilt bis] abgelaufen: als Sub-Depot eingehängt öffnet das Fach ebenso wenig', async () => {
  const datei = await mutterDatei(VERGANGEN);
  await assert.rejects(alsSubOeffnen(datei), abgelaufen);
});

test('[gilt bis] der Tag selbst gilt noch, ein Datum in der Zukunft auch — an beiden Wegen', async () => {
  for (const bis of [heute(), ZUKUNFT]) {
    const datei = await mutterDatei(bis);
    const d = await direktOeffnen(datei, PW_FACH);
    assert.equal(d.sektoren.health.ongoingTreatmentNext, 'WERT-IM-FACH', 'direkt, gilt bis ' + bis);
    const { V, uuid } = await alsSubOeffnen(datei);
    assert.equal(V.sessionSubKeys.get(uuid).giltBis, bis, 'die Sitzung kennt das Enddatum des Fachs');
  }
});

test('[gilt bis] ohne Datum bleibt alles wie bisher', async () => {
  const datei = await mutterDatei(undefined);
  const d = await direktOeffnen(datei, PW_FACH);
  assert.equal(d.sektoren.health.ongoingTreatmentNext, 'WERT-IM-FACH');
});

test('[gilt bis] das Datum steht nicht lesbar in der Datei, und ein Fach mit Datum ist nicht länger als eines ohne', async () => {
  const mit = await mutterDatei(ZUKUNFT);
  const ohne = await mutterDatei(undefined);
  assert.equal(JSON.stringify(mit).includes(ZUKUNFT), false);
  const laenge = (u) => u.umschlagTabelle.slice(1).map((e) => JSON.stringify(e.geheim).length);
  assert.deepEqual(laenge(mit), laenge(ohne));
});

test('[gilt bis] ein ungültiges Datum wird abgewiesen, bevor ein Fach entsteht', async () => {
  const { V } = kern()();
  await V.depotAnlegen(PW);
  await V.empfaengerkreisSetzen({ name: 'Anna', bausteine: ['bereich:health'] });
  const k = V.empfaengerkreiseListe()[0];
  await assert.rejects(V.empfaengerkreisFachEinrichten(k, PW_FACH, undefined, '2026-02-30'), (e) => e.code === 'gilt-bis-ungueltig');
  assert.equal(V.empfaengerkreisHatFach(V.empfaengerkreiseListe()[0]), false);
  await V.empfaengerkreisFachEinrichten(k, PW_FACH, undefined, '2031-05-01');
  assert.equal(V.empfaengerkreiseListe()[0].giltBis, '2031-05-01');
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], PW_FACH, undefined, '');
  assert.equal('giltBis' in V.empfaengerkreiseListe()[0], false, 'ein leeres Datum löscht es wieder');
});

test('[gilt bis] Vorschlag aus der Vorsorge: eine befristete Vollmacht liefert ihr Datum', async () => {
  const { V } = kern()();
  await V.depotAnlegen(PW);
  const d = V.getData();
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'i1', instrument: 'enduring-power-of-attorney', timeLimitedUntilIfAgreed: '2030-06-30', authorizedPersons: [] },
    { id: 'i2', instrument: 'enduring-power-of-attorney' },
  ] };
  V.setData(d);
  assert.deepEqual(V.empfaengerkreisGiltBisVorschlaege().map((v) => v.giltBis), ['2030-06-30']);
});

test('[gilt bis·Rot-Beweis] ohne die Prüfung beim Öffnen geht ein abgelaufenes Fach wieder auf', async () => {
  const original = fs.readFileSync(KERN, 'utf8');
  const anker = '        if (fachAbgelaufen(giltBis)) {';
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: die Prüfung steht genau einmal im Kern');
  const tmp = path.join(os.tmpdir(), 'fach-gilt-bis-probe-' + process.pid + '.html');
  fs.writeFileSync(tmp, original.replace(anker, '        if (false) {'));
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    const lade = (o) => require('./load-kern.js').ladeKern(Object.assign({ backen: true }, o || {}));
    const datei = await mutterDatei(VERGANGEN, lade);
    const d = await direktOeffnen(datei, PW_FACH, lade);
    assert.equal(d.sektoren.health.ongoingTreatmentNext, 'WERT-IM-FACH', 'genau die Lücke: das abgelaufene Fach öffnet');
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.rmSync(tmp, { force: true });
  }
});

/* ── FHIR: die Vertretung als RelatedPerson (U2-ADR-452) ─────────────────────────────────────────────────────────
   Beim delegierten IPS-Export trägt die RelatedPerson neben der Verwandtschaft die Rolle der Vertretungsgrundlage
   (v3-RoleCode) und das Ende des Fachs als `period.end`. Gegen den HL7-Validator geprüft im Fall
   „delegiert-vertretung-gilt-bis“ (tests/konformitaet/externe-validatoren.mjs). */
const ROLECODE = 'http://terminology.hl7.org/CodeSystem/v3-RoleCode';
const JETZT = new Date('2026-09-29T10:00:00Z');
const rpAus = (bundle) => bundle.entry.map((e) => e.resource).find((r) => r.resourceType === 'RelatedPerson');

async function exportDepot() {
  const { V } = kern()();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('identity', 'givenName', 'Erika');
  V.sektorFeldSetzen('identity', 'familyName', 'Beispiel');
  V.sektorFeldSetzen('identity', 'birthDate', '1940-03-11');
  return V;
}

test('[gilt bis·FHIR] RelatedPerson trägt Verwandtschaft, Vertretungsrolle und period.end', async () => {
  const V = await exportDepot();
  const rp = rpAus(V.fhirIpsBundle(JETZT, { anker: { name: 'Anna Beispiel', beziehungCode: 'CHILD', grundlage: 'vorsorge', giltBis: '2031-05-01' } }));
  assert.deepEqual(rp.relationship.map((r) => r.coding[0].code), ['CHILD', 'DPOWATT']);
  assert.equal(rp.relationship[1].coding[0].system, ROLECODE);
  assert.equal(rp.relationship[1].coding[0].display, undefined, 'nur system und code; die Displays nennt U2-ADR-452');
  assert.deepEqual(rp.period, { end: '2031-05-01' });
});

test('[gilt bis·FHIR] auch „nur unter Vollmacht“ (ohne Namen) trägt Rolle und Ende — sie beschreiben das Recht, nicht die Person', async () => {
  const V = await exportDepot();
  const rp = rpAus(V.fhirIpsBundle(JETZT, { anker: { beziehungCode: 'OTH', grundlage: 'gesetzliche_betreuung', giltBis: '2030-01-01' } }));
  assert.equal(rp.name, undefined);
  assert.deepEqual(rp.relationship.map((r) => r.coding[0].code), ['OTH', 'GUARD']);
  assert.deepEqual(rp.period, { end: '2030-01-01' });
});

test('[gilt bis·FHIR] ohne Grundlage keine geratene Rolle, ohne Datum keine period', async () => {
  const V = await exportDepot();
  const rp = rpAus(V.fhirIpsBundle(JETZT, { anker: { name: 'Anna Beispiel', beziehungCode: 'CHILD', grundlage: 'betreuung' } }));
  assert.deepEqual(rp.relationship.map((r) => r.coding[0].code), ['CHILD']);
  assert.equal(rp.period, undefined);
});

test('[gilt bis·FHIR] die Tabelle der Rollen: jeder Code im v3-RoleCode-System, Bank = SPOWATT, elterliche Sorge = RESPRSN', () => {
  const { V } = kern()();
  const t = V.VERTRETUNG_ROLECODES;
  assert.deepEqual(Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v.code])), {
    vorsorge: 'DPOWATT', gesundheit: 'HPOWATT', general: 'POWATT', bank: 'SPOWATT',
    gesetzliche_betreuung: 'GUARD', elterliche_sorge: 'RESPRSN',
  });
});

test('[gilt bis·FHIR] über ein Fach geöffnet: Grundlage und Ende kommen aus dem Fach in den Export', async () => {
  const M = kern()().V;
  await M.depotAnlegen(PW);
  M.akteurSelbstErklaeren('Gerda Beispiel');
  await M.empfaengerkreisSetzen({ name: 'Anna Gesundheit', bausteine: ['bereich:health'] });
  await M.empfaengerkreisFachEinrichten(M.empfaengerkreiseListe()[0], PW_FACH, undefined, ZUKUNFT, 'gesundheit');
  const datei = JSON.parse(JSON.stringify(await M.depotSerialisierenV4()));
  assert.equal(JSON.stringify(datei).includes('gesundheit'), false, 'die Grundlage steht nicht lesbar in der Datei');
  const { V, uuid } = await alsSubOeffnen(datei);
  V.subKontextBetreten(uuid);
  assert.deepEqual(V._delegationsRecht(), { grundlage: 'gesundheit', giltBis: ZUKUNFT });
});

test('[gilt bis·FHIR] eine unbekannte oder nicht wählbare Grundlage wird beim Einrichten abgewiesen', async () => {
  const { V } = kern()();
  await V.depotAnlegen(PW);
  await V.empfaengerkreisSetzen({ name: 'Anna', bausteine: ['bereich:health'] });
  const k = V.empfaengerkreiseListe()[0];
  for (const falsch of ['erfunden', 'betreuung']) {
    await assert.rejects(V.empfaengerkreisFachEinrichten(k, PW_FACH, undefined, undefined, falsch), (e) => e.code === 'vertretung-ungueltig');
  }
});

test('[gilt bis·FHIR·Rot-Beweis] ohne die Rolle im Bau fehlt die Vertretung in der RelatedPerson', async () => {
  const original = fs.readFileSync(KERN, 'utf8');
  const anker = '    if (rolle) rp.relationship.push(';
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: der Rollen-Bau steht genau einmal im Kern');
  const tmp = path.join(os.tmpdir(), 'fach-gilt-bis-fhir-probe-' + process.pid + '.html');
  fs.writeFileSync(tmp, original.replace(anker, '    if (false) rp.relationship.push('));
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    const { V } = require('./load-kern.js').ladeKern({ backen: true });
    await V.depotAnlegen(PW);
    V.akteurSelbstErklaeren('B');
    const rp = rpAus(V.fhirIpsBundle(JETZT, { anker: { name: 'Anna Beispiel', beziehungCode: 'CHILD', grundlage: 'vorsorge' } }));
    assert.deepEqual(rp.relationship.map((r) => r.coding[0].code), ['CHILD'], 'genau die Lücke: nur die Verwandtschaft');
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.rmSync(tmp, { force: true });
  }
});
