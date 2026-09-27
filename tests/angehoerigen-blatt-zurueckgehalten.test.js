'use strict';
/* Ein Angehörigen-Blatt mit einem zurückgehaltenen Feld sagt „Hinterlegt, nur mit Freigabe sichtbar" —
   nie „nicht hinterlegt", nie den Wert. Kern-Ansicht und Lese-App-Renderer nehmen DENSELBEN Satz aus
   derselben Quelle (STRINGS.zurueckgehaltenVorhanden, Textsatz-Kennung strings:zurueckgehaltenVorhanden.text).
   Ein leeres sensibles Feld bleibt still — dann gibt es nichts, was zurückzuhalten wäre. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const WERT_SIT = 'GEHEIMKONTO4711';
const WERT_SEKTOR = 'GEHEIMPOLICE0815';
const eintrag = (quelle, feld) => ({ quelle, feld });
const VORLAGE = {
  modulTyp: 'angehoerigenVorlage', moduleVersion: 1, herkunft: 'test-zurueck', sprache: 'de', rechtsraum: 'DE', rechtsraumName: 'Deutschland',
  situationen: {
    'z-blatt': { titel: 'Zurückgehalten-Blatt', icon: 'users', bloecke: [{ id: 'b1', titel: 'Block', eintraege: [
      eintrag('sit:erbfall', 'erb_wohnung'),      // sichtbar
      eintrag('sit:erbfall', 'erb_konten'),       // sensibel, gefüllt → zurückgehalten
      eintrag('sit:erbfall', 'erb_geldanlagen'),  // sensibel, leer → still
    ] }] },
    'z-sektor': { titel: 'Sektor-Blatt', icon: 'users', bloecke: [{ id: 'b1', titel: 'Block', eintraege: [eintrag('mobility', 'policyNumber')] }] },
    'z-nur': { titel: 'Nur-Zurückgehalten', icon: 'users', bloecke: [{ id: 'b1', titel: 'Block', eintraege: [eintrag('sit:erbfall', 'erb_konten')] }] },
  },
};

async function kernBlatt(id) {
  const K = ladeKern();
  const { V } = K;
  await V.depotAnlegen('pw-zurueck-blatt');
  V.akteurSelbstErklaeren('Z');
  V.situationFeldSetzen('erbfall', 'erb_wohnung', 'gekündigt zum 30.09.');
  V.situationFeldSetzen('erbfall', 'erb_konten', WERT_SIT);
  V.ankerDaten().angehoerigenVorlagenModule.push(Object.assign({ ungeprueft: false }, VORLAGE));
  V._angehoerigenVorlagenAusDepotAnmelden(V.ankerDaten());
  V.betreteApp();
  assert.equal(V.oeffneAngehoerigenBlatt(id), true, 'Blatt ' + id + ' öffnet');
  return { V, html: K.document.getElementById('content').innerHTML };
}
function lese(sitDaten) {
  const { V } = ladeLesen();
  const obj = { schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {}, sektoren: {},
    situationen: { erbfall: sitDaten }, angehoerigenVorlagenModule: [VORLAGE] };
  V._foldVollmachtenLesen(obj);
  V.setData(obj);
  return V;
}
const ZEILEN = /<div class="feld-zeile">(.*?)<\/div><\/div>/gs;
const zeileMit = (html, label) => [...html.matchAll(ZEILEN)].map((m) => m[0]).find((z) => z.includes(label));

test('[Kern] das zurückgehaltene Feld steht mit Namen und dem eigenen Satz da, ohne Wert, ohne „nicht hinterlegt"', async () => {
  const { V, html } = await kernBlatt('z-blatt');
  const z = zeileMit(html, 'zurueckgehalten-marke');
  assert.ok(z, 'eine Zeile mit der Rückhalte-Marke');
  assert.ok(z.includes(V.STRINGS.zurueckgehaltenVorhanden), 'der eigene Satz');
  assert.ok(!z.includes(V.STRINGS.leerZustand), 'nie „nicht hinterlegt"');
  assert.ok(!html.includes(WERT_SIT), 'der Wert steht nicht da');
  assert.equal((html.match(/zurueckgehalten-marke/g) || []).length, 1, 'das leere sensible Feld bleibt still');
  assert.ok(html.includes('gekündigt zum 30.09.'), 'das sichtbare Feld steht wie zuvor da');
});

test('[Kern] ein Blatt nur aus zurückgehaltenem Feld ist nicht „leer"', async () => {
  const { V, html } = await kernBlatt('z-nur');
  assert.ok(html.includes(V.STRINGS.zurueckgehaltenVorhanden));
  assert.ok(!html.includes(V.STRINGS.leerZustand));
});

test('[Lese-App] dasselbe Blatt: eigener Satz, kein Wert, kein „nicht hinterlegt"; leeres sensibles Feld still', () => {
  const V = lese({ erb_wohnung: 'gekündigt zum 30.09.', erb_konten: WERT_SIT });
  const html = V.angehoerigenBlattHTML('z-blatt');
  const z = zeileMit(html, 'zurueckgehalten-marke');
  assert.ok(z, 'eine Zeile mit der Rückhalte-Marke');
  assert.ok(z.includes(V.STRINGS.zurueckgehaltenVorhanden));
  assert.ok(!z.includes(V.STRINGS.leerZustand));
  assert.ok(!html.includes(WERT_SIT));
  assert.equal((html.match(/zurueckgehalten-marke/g) || []).length, 1);
  assert.ok(html.includes('gekündigt zum 30.09.'));
});

test('[Lese-App] ein Blatt nur aus zurückgehaltenem Feld trägt nicht „nicht hinterlegt"', () => {
  const html = lese({ erb_konten: WERT_SIT }).angehoerigenBlattHTML('z-nur');
  assert.ok(html.includes(ladeLesen().V.STRINGS.zurueckgehaltenVorhanden));
  assert.ok(!html.includes('leer-bereich'), 'kein Leer-Absatz');
  assert.ok(!html.includes(WERT_SIT));
});

test('[Lese-App] ein schema-sensibles Sektorfeld auf dem Blatt: eigener Satz statt Weglassen und statt „nicht hinterlegt"', () => {
  const { V } = ladeLesen();
  const obj = { schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {},
    sektoren: { mobility: { policyNumber: WERT_SEKTOR } }, angehoerigenVorlagenModule: [VORLAGE] };
  V._foldVollmachtenLesen(obj);
  V.setData(obj);
  const html = V.angehoerigenBlattHTML('z-sektor');
  assert.ok(html.includes(V.STRINGS.zurueckgehaltenVorhanden));
  assert.ok(!html.includes(WERT_SEKTOR) && !html.includes('leer-bereich'));
});

test('[Lese-App · Gegenprobe] ohne Inhalt bleibt das Feld still — der Satz behauptet nichts, was nicht da ist', () => {
  const html = lese({}).angehoerigenBlattHTML('z-nur');
  assert.ok(!html.includes('zurueckgehalten-marke'));
});

test('[Eine Quelle] Kern und Lese-App führen denselben Satz, und er ist der des Textsatzes', () => {
  const { V: K } = ladeKern();
  const { V: L } = ladeLesen();
  assert.equal(K.STRINGS.zurueckgehaltenVorhanden, L.STRINGS.zurueckgehaltenVorhanden);
  const de = require('../tools/textsatz-de-modul.json');
  assert.ok(JSON.stringify(de).includes('"strings:zurueckgehaltenVorhanden.text":' + JSON.stringify(K.STRINGS.zurueckgehaltenVorhanden)), 'derselbe Satz steht im Textsatz');
  assert.notEqual(K.STRINGS.zurueckgehaltenVorhanden, K.STRINGS.leerZustand);
});
