'use strict';
/* SUB-SONDERLOCKEN S11 (07.10.2026, Entscheidung mit Wort der Gegenlesung): Bis Stufe 67 (20.08.2026) stand die
   Vertretungsgrundlage eines Sub-Depots im Klartext-Eintrag des Ankers. Die Stufe merkte sie zum Umzug vor, und
   `subDepotVertrauenOeffnen` zog sie händisch hinter das Sub-Passwort — ein Weg, den nur Sub-Depots gingen. Vor dem
   20.08.2026 wurde keine Fassung ausgeliefert; solche Einträge gibt es nur aus internen Testfassungen. Darum jetzt:
   kein Umzug, sondern ein definierter Fehler `sub-vor-stufe-67`, und der Eintrag bleibt byte-gleich — beim Öffnen und
   über jedes weitere Sichern des Ankers. Der Satz dazu kommt aus dem Textsatz, nicht aus dem Gerüst.
   ROT-BEWEIS: gegen den Kern vor diesem Bau zog das Öffnen um — der Eintrag verlor den Schlüssel, die Probe fällt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const ANKER = 'anker-vor-stufe-67-pw';
const SUB = 'sub-vor-stufe-67-pw';
const KERN_TEXT = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

// Ein Anker mit einem Sub-Depot, dessen Eintrag die Grundlage noch im Klartext trägt (Zustand einer Testfassung vor
// dem 20.08.2026) — gesichert als Datei, so wie sie auf der Platte liegt.
async function ankerDateiMitAltEintrag() {
  const q = ladeKern().V;
  await q.depotAnlegen(ANKER);
  q.akteurSelbstErklaeren('Verwalterin');
  const e = await q.subDepotAnlegen({ vorname: 'Bestand' }, SUB);
  e.vertretungsGrundlage = 'elterliche_sorge';
  return { datei: JSON.parse(JSON.stringify(await q.depotSerialisieren())), depotUUID: e.depotUUID };
}
async function geladen(datei) {
  const { V } = ladeKern();
  await V.depotLaden(JSON.parse(JSON.stringify(datei)), ANKER);
  V.akteurSelbstErklaeren('Verwalterin');
  return V;
}
const eintrag = (V, uuid) => V.getData().verwalteteDepots.find((x) => x.depotUUID === uuid);

test('[S11·Fehler] ein Eintrag aus einer Testfassung vor Stufe 67 wird nicht geöffnet: definierter Fehler, Eintrag byte-gleich', async () => {
  const { datei, depotUUID } = await ankerDateiMitAltEintrag();
  const V = await geladen(datei);
  const vorher = JSON.stringify(eintrag(V, depotUUID));
  assert.ok(vorher.includes('"vertretungsGrundlage":"elterliche_sorge"'), 'Vorbedingung: die Grundlage steht im Klartext-Eintrag');
  const f = await V.subDepotVertrauenOeffnen(depotUUID, SUB).then(() => null, (x) => x);
  assert.ok(f && f.code === 'sub-vor-stufe-67' && f.vorStufe67 === true, 'der definierte Fehler, markiert für den Dialog');
  assert.equal(JSON.stringify(eintrag(V, depotUUID)), vorher, 'der Eintrag ist unverändert');
});

test('[S11·Fehler] der Fehler kommt vor jeder Ableitung — auch mit falschem Passwort derselbe Fehler, kein Passwortfehler', async () => {
  const { datei, depotUUID } = await ankerDateiMitAltEintrag();
  const V = await geladen(datei);
  await assert.rejects(() => V.subDepotVertrauenOeffnen(depotUUID, 'ganz-falsches-passwort'), (x) => x && x.code === 'sub-vor-stufe-67');
});

test('[S11·Sichern] öffnen, eine andere Stelle ändern, sichern: der alte Anker-Eintrag steht unverändert in der Datei', async () => {
  const { datei, depotUUID } = await ankerDateiMitAltEintrag();
  const vorher = JSON.stringify((await geladen(datei)).getData().verwalteteDepots.find((x) => x.depotUUID === depotUUID));
  const V = await geladen(datei);
  await V.subDepotVertrauenOeffnen(depotUUID, SUB).catch(() => {});
  V.sektorFeldSetzen('health', 'ongoingTreatmentNext', 'eine andere Stelle');
  const nachher = await V.depotSerialisieren();
  const W = await geladen(nachher);
  assert.equal(W.getData().sektoren.health.ongoingTreatmentNext, 'eine andere Stelle', 'Vorbedingung: die Änderung ist gesichert');
  assert.equal(JSON.stringify(eintrag(W, depotUUID)), vorher, 'der Eintrag ist nicht weggefallen und nicht umgeschrieben');
});

test('[S11·Stufe] die Stufe 67 lässt einen Eintrag mit Klartext-Grundlage unverändert — sie merkt nichts vor', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(ANKER);
  V.akteurSelbstErklaeren('Verwalterin');
  const e = await V.subDepotAnlegen({ vorname: 'Bestand' }, SUB);
  e.vertretungsGrundlage = 'elterliche_sorge';
  const vorher = JSON.stringify(e);
  const d = V.getData();
  d.schemaVersion = 66;
  V.depotNormalisieren(d);
  assert.ok(d.schemaVersion >= 67, 'die Stufe ist gefahren');
  assert.equal(JSON.stringify(e), vorher, 'der Eintrag ist byte-gleich');
});

test('[S11·Restlos] die Umzugsmarke und der Umzugscode stehen nirgends mehr im Kern', () => {
  assert.equal(KERN_TEXT.split('vertretungsGrundlage' + 'UmzugOffen').length - 1, 0);
});

test('[S11·Satz] der Dialog zeigt den Satz aus dem Textsatz (DE/EN), kein fester Text im Gerüst', () => {
  const SCHLUESSEL = 'strings:subVorStufe67.text';
  for (const sprache of ['de', 'en']) {
    const modul = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-' + sprache + '-modul.json'), 'utf8'));
    const satz = JSON.stringify(modul).match(new RegExp('"' + SCHLUESSEL.replace(/[.:]/g, '\\$&') + '":"([^"]+)"'));
    assert.ok(satz && satz[1].length > 20, sprache + ': der Satz steht im Textsatz');
    assert.ok(!KERN_TEXT.includes(satz[1]), sprache + ': der Satz steht nicht fest im Gerüst');
  }
  assert.ok(/\(e && e\.vorStufe67\) \? STRINGS\.subVorStufe67 : STRINGS\.subFalsch/.test(KERN_TEXT),
    'der Öffnen-Dialog bildet die Markierung auf den Satz ab, sonst stünde dort „Passwort falsch“');
});
