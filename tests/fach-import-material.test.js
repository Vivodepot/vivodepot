'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Das Fach-Material bleibt in der Datei, in der es entstand (Befund FACH-IMPORT-MATERIAL-UEBERNOMMEN, 05.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Ein Fach besteht aus dem Fach-Schlüssel K (`fachKeyRoh`, im verschlüsselten Depot) und der Tür, die K für die Empfängerin
   verschließt (`fachSchluessel`, AAD an die Depot-UUID gebunden). Der Vollimport trug beides in ein anderes Depot. Gemessen
   (05.10.2026): das umgezogene Fach öffnete dort nie, und das Zieldepot schrieb die Einheiten des Fachs weiter unter dem
   mitgebrachten K. Eine Importdatei mit einem K, das jemand kennt, legte so einen Schlüssel ins Depot, unter dem dieses Depot
   danach still Angaben verschloss.

   Jetzt entfernt der Import das Material aus jedem Kreis, der Kreis bleibt, und die Meldung sagt, dass das Fach neu
   einzurichten ist. Beim Einrichten hält `fachDepotUUID` die UUID fest, die die AAD der Tür bindet; ein Fach mit einer anderen
   UUID ist verwaist: es wird nicht geschrieben und in der Zeile des Kreises so benannt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN_QUELLE = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const FACH_PW = 'fach-pw-anja-123';

async function quelleMitFach(V) {
  await V.depotAnlegen('anker-pw-quelle-1');
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  await V.empfaengerkreisSetzen({ name: 'Anja', bausteine: ['notfall'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], FACH_PW, null);
  return V.getData().empfaengerkreise[0];
}
async function ziel(K) {
  const { V: Z } = K ? { V: K } : ladeKern();
  await Z.depotAnlegen('anker-pw-ziel-1');
  Z.akteurSelbstErklaeren('Maria');
  return Z;
}
function kernMit(ersetzungen) {
  let html = KERN_QUELLE;
  for (const [alt, neu] of ersetzungen) {
    assert.equal(html.split(alt).length - 1, 1, 'Vorbedingung: die Stelle steht genau einmal im Kern: ' + alt.trim().slice(0, 80));
    html = html.replace(alt, neu);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fach-import-'));
  const datei = path.join(dir, 'kern.html');
  fs.writeFileSync(datei, html);
  try { return ladeKern({ htmlPfad: datei, backen: true }).V; }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('[Fach-Import·Rot] eine Importdatei mit bekanntem K: danach steht K nirgends im Depot, und keine Einheit wird unter K geschrieben', async () => {
  const { V } = ladeKern();
  const k = await quelleMitFach(V);
  const bekanntesK = k.fachKeyRoh;
  const ex = JSON.stringify(V.vollExportJSON({ sensibel: true }));
  assert.ok(ex.includes(bekanntesK), 'Voraussetzung: die Importdatei trägt K');
  const Z = await ziel();
  const erg = Z.importAnwenden(Z.importPlan('json', ex), {});
  const kz = Z.getData().empfaengerkreise[0];
  assert.ok(kz && kz.name === 'Anja', 'der Kreis kommt mit');
  for (const f of Z._FACH_MATERIAL_FELDER) assert.equal(f in kz, false, 'kein ' + f + ' im Kreis');
  assert.equal(JSON.stringify(Z.getData()).includes(bekanntesK), false, 'K steht nirgends im Depot');
  const u = await Z.depotSerialisieren();
  assert.equal(u.umschlagTabelle.length, 1, 'nur der Anker in der Tabelle: keine Einheit unter dem fremden K');
  assert.deepEqual(erg.faecherNeuEinrichten, ['Anja'], 'die Meldung nennt den Kreis');
});

test('[Fach-Import·Rot am Code] ohne das Entfernen bleibt K im Depot und das Zieldepot schreibt unter ihm', async () => {
  const Ohne = kernMit([["      for (const k of data.empfaengerkreise) if (_kreisFachMaterialEntfernen(k))", "      for (const k of []) if (_kreisFachMaterialEntfernen(k))"]]);
  const { V } = ladeKern();
  const k = await quelleMitFach(V);
  const ex = JSON.stringify(V.vollExportJSON({ sensibel: true }));
  const Z = await ziel(Ohne);
  Z.importAnwenden(Z.importPlan('json', ex), {});
  assert.ok(JSON.stringify(Z.getData()).includes(k.fachKeyRoh), 'K steht im Depot: die Probe oben kann rot werden');
  // Die Marke trägt die UUID der Quelle: auch ohne das Entfernen schreibt der Kern das Fach nicht mehr (Tiefenverteidigung).
  assert.equal((await Z.depotSerialisieren()).umschlagTabelle.length, 1, 'die Marke allein hält den Schreibweg');
});

test('[Fach-Import·Tiefenverteidigung·Rot am Code] ohne Entfernen und ohne Marke schreibt das Zieldepot unter dem fremden K', async () => {
  const Ohne = kernMit([
    ["      for (const k of data.empfaengerkreise) if (_kreisFachMaterialEntfernen(k))", "      for (const k of []) if (_kreisFachMaterialEntfernen(k))"],
    ['  k.fachDepotUUID = aktuelleDepotUUID;', '  void 0;'],
  ]);
  await quelleMitFach(Ohne);
  const ex = JSON.stringify(Ohne.vollExportJSON({ sensibel: true }));
  const Z = await ziel(kernMit([["      for (const k of data.empfaengerkreise) if (_kreisFachMaterialEntfernen(k))", "      for (const k of []) if (_kreisFachMaterialEntfernen(k))"]]));
  Z.importAnwenden(Z.importPlan('json', ex), {});
  assert.equal((await Z.depotSerialisieren()).umschlagTabelle.length, 2, 'der Stand vor dem Fix: ein Eintrag unter dem fremden K');
});

test('[Fach-Import] eigener Umzug mit gesundem Fach: das Fach ist entfernt, die Meldung sagt „neu einrichten“, neu eingerichtet öffnet es', async () => {
  const { V } = ladeKern();
  await quelleMitFach(V);
  const ex = JSON.stringify(V.vollExportJSON({ sensibel: true }));
  const Z = await ziel();
  const erg = Z.importAnwenden(Z.importPlan('json', ex), {});
  assert.deepEqual(erg.faecherNeuEinrichten, ['Anja']);
  const text = String(Z.STRINGS.importFaecherNeuEinrichten).replace('{namen}', erg.faecherNeuEinrichten.join(', '));
  assert.ok(text.includes('Anja') && /neu ein/.test(text), 'die Meldung: ' + text);
  const kz = Z.getData().empfaengerkreise[0];
  assert.equal(Z.empfaengerkreisHatFach(kz), false, 'kein Fach nach dem Umzug');
  await Z.empfaengerkreisFachEinrichten(kz, FACH_PW, null);
  const u = await Z.depotSerialisieren();
  const E = ladeKern().V;
  await E.depotLaden(JSON.parse(JSON.stringify(u)), FACH_PW);
  assert.equal(E.getData().sektoren.health.bloodType, 'A+', 'das neu eingerichtete Fach öffnet im Zieldepot');
});

test('[Fach-Import] ein Import ohne Fach meldet nichts', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('anker-pw-quelle-1');
  V.akteurSelbstErklaeren('Maria');
  await V.empfaengerkreisSetzen({ name: 'Bert', bausteine: ['notfall'] });
  const Z = await ziel();
  const erg = Z.importAnwenden(Z.importPlan('json', JSON.stringify(V.vollExportJSON({ sensibel: true }))), {});
  assert.deepEqual(erg.faecherNeuEinrichten, []);
});

test('[Fach·Marke] Einrichten setzt fachDepotUUID auf die UUID der Tür, Entfernen räumt sie mit dem übrigen Material', async () => {
  const { V } = ladeKern();
  const k = await quelleMitFach(V);
  const u = await V.depotSerialisieren();
  assert.equal(k.fachDepotUUID, u.depotUUID);
  await V.empfaengerkreisFachEntfernen(k.id);
  for (const f of V._FACH_MATERIAL_FELDER) assert.equal(f in k, false, 'nach dem Entfernen kein ' + f);
});

test('[Fach·verwaist·Rot] ein Fach mit fremder Marke wird nicht geschrieben und in der Zeile des Kreises benannt', async () => {
  const { V } = ladeKern();
  const k = await quelleMitFach(V);
  assert.equal((await V.depotSerialisieren()).umschlagTabelle.length, 2, 'Voraussetzung: das gesunde Fach wird geschrieben');
  k.fachDepotUUID = V.uuidV4();                            // ein Altdepot mit totem Fach
  assert.equal(V.empfaengerkreisFachVerwaist(k), true);
  assert.equal(V.empfaengerkreisHatFach(k), false);
  assert.equal((await V.depotSerialisieren()).umschlagTabelle.length, 1, 'das verwaiste Fach wird nicht geschrieben');
  const zeile = V._kreisZeileHTML(k);
  assert.ok(zeile.includes(V.escapeHTML(String(V.STRINGS.kreiseFachVerwaist))), 'die Zeile benennt es');
  assert.ok(zeile.includes('data-kreis-fach="'), 'und bietet an, es neu einzurichten');
  await V.empfaengerkreisFachEinrichten(k, FACH_PW, null);
  assert.equal(V.empfaengerkreisFachVerwaist(k), false, 'neu eingerichtet ist es nicht mehr verwaist');
  assert.equal((await V.depotSerialisieren()).umschlagTabelle.length, 2);
});

test('[Fach·ohne Marke] ein Fach aus der Zeit vor der Marke gilt weiter und öffnet', async () => {
  const { V } = ladeKern();
  const k = await quelleMitFach(V);
  delete k.fachDepotUUID;
  assert.equal(V.empfaengerkreisHatFach(k), true);
  const u = await V.depotSerialisieren();
  assert.equal(u.umschlagTabelle.length, 2);
  const E = ladeKern().V;
  await E.depotLaden(JSON.parse(JSON.stringify(u)), FACH_PW);
  assert.equal(E.getData().sektoren.health.bloodType, 'A+');
});

test('[Fach-Import] die Meldung steht deutsch und englisch, mit Platzhalter', () => {
  const de = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-de-modul.json'), 'utf8')).texte;
  const en = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8')).texte;
  for (const k of ['strings:importFaecherNeuEinrichten.text', 'strings:kreiseFachVerwaist.text']) {
    assert.ok(de[k], 'DE: ' + k);
    assert.ok(en[k], 'EN: ' + k);
  }
  assert.ok(de['strings:importFaecherNeuEinrichten.text'].includes('{namen}') && en['strings:importFaecherNeuEinrichten.text'].includes('{namen}'));
});

/* Der Wächter gegen die Klasse: jedes Feld, das das Einrichten eines Fachs am Kreis setzt, ist Fach-Material (wird beim Import
   entfernt) oder steht ausdrücklich als Angabe des Kreises da, die mitreisen darf. Ein neues Feld an der Tür kann so nicht still
   mit dem Import in ein fremdes Depot wandern. */
const KREIS_ANGABEN_DIE_REISEN = Object.freeze(['kennung', 'giltBis', 'vertretung']);
function gesetzteKreisFelder(quelle) {
  const start = quelle.indexOf('async function empfaengerkreisFachEinrichten(');
  const ende = quelle.indexOf('\n}\n', start);
  assert.ok(start > 0 && ende > start, 'Vorbedingung: die Funktion steht im Kern');
  return [...new Set([...quelle.slice(start, ende).matchAll(/\bk\.([A-Za-z_]+)\s*=(?!=)/g)].map((m) => m[1]))].sort();
}
test('[Fach-Import·Wächter] jedes Feld, das das Einrichten am Kreis setzt, ist Fach-Material oder ausdrücklich eine Angabe, die reisen darf', () => {
  const { V } = ladeKern();
  const gesetzt = gesetzteKreisFelder(KERN_QUELLE);
  assert.ok(gesetzt.includes('fachKeyRoh') && gesetzt.includes('fachDepotUUID'), 'Vorbedingung: der Leser findet die Zuweisungen: ' + gesetzt.join(', '));
  for (const f of gesetzt) {
    assert.ok(V._FACH_MATERIAL_FELDER.includes(f) || KREIS_ANGABEN_DIE_REISEN.includes(f),
      '`k.' + f + '` wird beim Einrichten gesetzt, steht aber weder in _FACH_MATERIAL_FELDER noch in der Liste der Angaben, die reisen dürfen');
  }
});
test('[Fach-Import·Wächter·Rot-Beweis] ein neues Feld an der Tür, das nicht in der Liste steht, macht den Wächter rot', () => {
  const quelle = KERN_QUELLE.replace('  k.fachSeit = new Date().toISOString();\n', '  k.fachSeit = new Date().toISOString();\n  k.tuerZusatz = 1;\n');
  assert.notEqual(quelle, KERN_QUELLE, 'Vorbedingung: der Eingriff findet seine Stelle');
  const { V } = ladeKern();
  const fremd = gesetzteKreisFelder(quelle).filter((f) => !V._FACH_MATERIAL_FELDER.includes(f) && !KREIS_ANGABEN_DIE_REISEN.includes(f));
  assert.deepEqual(fremd, ['tuerZusatz']);
});
