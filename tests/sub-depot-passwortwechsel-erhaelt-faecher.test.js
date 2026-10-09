'use strict';
/* Befund SUB-PASSWORTWECHSEL-VERLIERT-FAECHER (07.10.2026, gefunden beim Abbau von SUB-SONDERLOCKEN S6): der eigene
   Passwortwechsel der Sub-Inhaberin (`subDepotEigenerPasswortWechsel`) schrieb am gemeinsamen Speicherweg vorbei — mit
   `faecher: []` und `ortHinweis: null`. Die Fächer der Empfängerkreise und der Ortshinweis gingen dabei still verloren;
   dieselbe Klasse, die am 23.09.2026 in `subDepotEntsiegeln` behoben wurde (tests/sub-depot-v4-neuversiegeln.test.js).
   Eine eigene Sicherheitsfrage daneben: wer das Sub über das Passwort eines Empfängerkreises öffnet, hält nur einen
   Ausschnitt — der darf nie unter derselben depotUUID als ganzes Depot mit einem Passwort seiner Wahl entstehen.
   Gemessen wird am NEUEN Umschlag, geöffnet in einem frischen Kern ohne Anker-Sitzung.
   ROT-BEWEIS: gegen den Kern vor diesem Fix (v920) sind die Proben Fächer, Ortshinweis und Fach-Passwort rot. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW_ALT = 'mutter-wechsel-alt-pw';
const PW_NEU = 'mutter-wechsel-neu-pw';
const PW_TANTE = 'tante-renate-wechsel-pw';
const ORT = 'Umschlag in der Schublade im Flur';

// Die Depot-Datei der Mutter, so wie sie die Selbstbedienung aus der Hand bekommt: mit einem Fach und einem Ortshinweis.
async function mutterDatei() {
  const q = ladeKern().V;
  await q.depotAnlegen(PW_ALT);
  q.akteurSelbstErklaeren('Hedwig Brandt');
  q.sektorFeldSetzen('health', 'ongoingTreatmentNext', 'Kontrolle im Oktober');
  q.getData().angehoerigen_passwort_ort = ORT;
  await q.empfaengerkreisSetzen({ name: 'Tante Renate', bausteine: ['notfall'] });
  await q.empfaengerkreisFachEinrichten(q.empfaengerkreiseListe()[0], PW_TANTE);
  const u = q.blackboxDateiAusUmschlag(await q.depotSerialisieren()).umschlag;
  assert.ok(u.umschlagTabelle.length >= 2, 'Vorbedingung: die Datei trägt ein Fach');
  assert.equal(u.angehoerigenOrt, ORT, 'Vorbedingung: die Datei trägt den Ortshinweis');
  return JSON.parse(JSON.stringify(u));
}

test('[Sub-Passwortwechsel·Fächer] das Fach der Tante öffnet nach dem Wechsel der Inhaberin weiterhin', async () => {
  const alt = await mutterDatei();
  const { V } = ladeKern();
  const neu = await V.subDepotEigenerPasswortWechsel(alt, PW_ALT, PW_NEU);
  const eigen = await V.subDepotEntsiegeln(neu, PW_NEU);
  assert.equal(eigen.inhalt.sektoren.health.ongoingTreatmentNext, 'Kontrolle im Oktober', 'die Inhaberin öffnet mit dem neuen Passwort');
  const tante = await V.subDepotEntsiegeln(neu, PW_TANTE);   // wirft, wenn das Fach beim Wechsel verloren ging
  assert.equal(tante.platz, 1, 'das Passwort der Tante öffnet weiterhin IHR Fach');
});

test('[Sub-Passwortwechsel·Ortshinweis] der Ortshinweis der Inhaberin überlebt den Wechsel', async () => {
  const alt = await mutterDatei();
  const { V } = ladeKern();
  const neu = await V.subDepotEigenerPasswortWechsel(alt, PW_ALT, PW_NEU);
  assert.equal(neu.angehoerigenOrt, ORT, 'der neue Umschlag trägt den Ortshinweis wie jede Depot-Datei');
});

test('[Sub-Passwortwechsel·Fach-Passwort] mit dem Passwort eines Empfängerkreises: abgewiesen, kein neuer Umschlag', async () => {
  const alt = await mutterDatei();
  const vorher = JSON.stringify(alt);
  const { V } = ladeKern();
  let neu;
  await assert.rejects(async () => { neu = await V.subDepotEigenerPasswortWechsel(alt, PW_TANTE, PW_NEU); },
    (e) => e && e.code === 'fach-ausschnitt', 'ein Ausschnitt darf nie unter derselben depotUUID als ganzes Depot entstehen');
  assert.equal(neu, undefined, 'es ist kein neuer Umschlag entstanden');
  assert.equal(JSON.stringify(alt), vorher, 'der übergebene Umschlag ist unverändert');
});

/* Live-Folge (v920 ist ausgeliefert): wer schon gewechselt hat, hält einen Umschlag ohne Fach und ohne Ortshinweis. Das
   Fach-Material (`empfaengerkreise[].fachKeyRoh`, `fachSchluessel`) und der Ortshinweis liegen aber im verschlüsselten
   INHALT, nicht nur in der Hülle — der fehlerhafte Weg hat sie nur nicht in die Hülle geschrieben. Ein Umschlag in genau
   dieser Form (Fach-Einträge und Ortshinweis entfernt) bekommt beides mit dem nächsten vollständigen Sichern zurück. */
function wieVomAltenWechsel(u) {
  const o = Object.assign({}, u, { umschlagTabelle: u.umschlagTabelle.slice(0, 1) });
  delete o.angehoerigenOrt;
  return o;
}

test('[Sub-Passwortwechsel·Wiederherstellung] ein schon gewechseltes Sub bekommt Fach und Ortshinweis beim nächsten Wechsel zurück', async () => {
  const beschaedigt = wieVomAltenWechsel(await mutterDatei());
  const { V } = ladeKern();
  await assert.rejects(() => V.subDepotEntsiegeln(beschaedigt, PW_TANTE), 'Vorbedingung: das Fach ist fort');
  const neu = await V.subDepotEigenerPasswortWechsel(beschaedigt, PW_ALT, PW_NEU);
  assert.equal((await V.subDepotEntsiegeln(neu, PW_TANTE)).platz, 1, 'das Fach ist wieder da');
  assert.equal(neu.angehoerigenOrt, ORT, 'der Ortshinweis ist wieder da');
});

test('[Sub-Passwortwechsel·Wiederherstellung] … und ebenso, wenn die Inhaberin die Datei als eigenes Depot öffnet und sichert', async () => {
  const beschaedigt = wieVomAltenWechsel(await mutterDatei());
  const { V } = ladeKern();
  await V.depotLaden(beschaedigt, PW_ALT);
  const gesichert = await V.depotSerialisieren();
  assert.equal((await V.subDepotEntsiegeln(V.umschlagAusDatei(gesichert), PW_TANTE)).platz, 1, 'das Fach ist wieder da');
  assert.equal(gesichert.angehoerigenOrt, ORT, 'der Ortshinweis ist wieder da');
});

/* Rot-Beweis der MESSUNG (nicht des Fixes): die Fächer-Probe oben stützt sich darauf, dass `subDepotEntsiegeln` mit dem
   Passwort der Tante WIRFT, sobald ihr Fach im Umschlag fehlt. Wäre das nicht so — öffnete das Tanten-Passwort etwa über
   einen Rückfall auch ohne Fach —, bliebe die Fächer-Probe auch bei einem verlorenen Fach grün, und sie bewiese nichts.
   Hier wird genau diese Voraussetzung an einem Umschlag geprüft, dem nur das Fach fehlt. */
test('[Sub-Passwortwechsel·Rot-Beweis der Messung] ohne Fach öffnet das Passwort der Tante nicht — die Fächer-Probe kann rot werden', async () => {
  const alt = await mutterDatei();
  const ohneFach = Object.assign({}, alt, { umschlagTabelle: alt.umschlagTabelle.slice(0, 1) });
  const { V } = ladeKern();
  await assert.rejects(() => V.subDepotEntsiegeln(ohneFach, PW_TANTE));
});

/* Die Abweisung bleibt nicht stumm: die Kennung bildet auf einen Satz aus dem Textsatz ab (DE/EN), wie `fach-abgelaufen`, und der
   Dialog des Passwortwechsels zeigt ihn statt „Passwort falsch“. Kein fester Text im Gerüst. */
const fs = require('node:fs');
const path = require('node:path');
const KERN_TEXT = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const SCHLUESSEL = 'strings:subSelbstFachAusschnitt.text';

test('[Sub-Passwortwechsel·Fach-Passwort·Satz] die Abweisung trägt eine Markierung, und der Dialog zeigt den Satz aus dem Textsatz', async () => {
  const alt = await mutterDatei();
  const { V } = ladeKern();
  const e = await V.subDepotEigenerPasswortWechsel(alt, PW_TANTE, PW_NEU).then(() => null, (f) => f);
  assert.ok(e && e.fachAusschnitt === true, 'die Abweisung ist als Fach-Ausschnitt markiert');
  for (const sprache of ['de', 'en']) {
    const modul = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-' + sprache + '-modul.json'), 'utf8'));
    const satz = JSON.stringify(modul).match(new RegExp('"' + SCHLUESSEL.replace(/[.:]/g, '\\$&') + '":"([^"]+)"'));
    assert.ok(satz && satz[1].length > 20, sprache + ': der Satz steht im Textsatz');
    assert.ok(!KERN_TEXT.includes(satz[1]), sprache + ': der Satz steht nicht fest im Gerüst');
  }
  assert.ok(/e && e\.fachAusschnitt\) \? STRINGS\.subSelbstFachAusschnitt : STRINGS\.subFalsch/.test(KERN_TEXT),
    'der Dialog des Passwortwechsels bildet die Markierung auf den Satz ab, sonst bliebe „Passwort falsch“');
});
