'use strict';
/* Schutz-Wagen S4 — die Währung kommt nur aus der Saat.

   DER BEFUND (gemessen an aa94e2f7b, privat-en): sobald ein mitgereistes Textsatz-Modul wirkt, setzt seine
   Regel `waehrung: 'USD'` die Währung der ganzen Anwendung — ohne Signatur, ohne Herkunft, aus einer Datei, die jemand
   gegeben hat. Haftung und Rechtsraum-Vorschlag hielten schon, die Währung nicht.
   DIE REGEL: `regeln.waehrung` wirkt nur von einem Modul, das ab Werk, mit der eigenen Auslieferung (Vor-Depot) oder
   nachgeprüft über die eigene Treuhand ('intern') kam (`_waehrungAusModulZulaessig`). Texte und übrige Regeln des Moduls
   bleiben; nur diese eine Regel fällt, benannt (`waehrung-nur-ab-werk`).

   Der Schalter der Selbst-Einlass-Sperre wird hier abgeschaltet: geprüft wird der Fall, dass ein fremdes Modul WIRKT
   (heute: Schalter aus; mit der Wahl aus S5: gewählt). Gerade dann darf es keine Währung setzen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { vorDepotAusliefern } = require('./helfer/vor-depot-ausliefern.js');

// Im Kanon alle vier; im öffentlichen Zuschnitt nur die baubaren (tools/lib/vier-produkte.js, PRODUKTE).
const PRODUKTE = require('../tools/lib/vier-produkte.js').PRODUKTE.map((p) => p.slug);
const PW = 'waehrung-nur-aus-saat-pw-2026';
const sprachTag = (produkt) => (produkt.endsWith('-en') ? 'en' : 'fr');
/* Was „keine Währung aus dem Modul“ heißt: die Währung ist danach dieselbe wie vor dem Öffnen im selben Produkt. Gemessen wird an
   der einen Lesestelle, wo es sie gibt (`textsatzWaehrung`, Währung aus dem Template), sonst an `textsatzRegeln()`; dazu steht
   die Regel auf dem eingebauten Wert, wie ohne Modul. */
const waehrungLesen = (V) => (typeof V.textsatzWaehrung === 'function' ? V.textsatzWaehrung() : V.textsatzRegeln().waehrung);
function keineModulWaehrung(V, basis, wofuer) {
  assert.ok(basis && basis !== 'USD', 'Vorbedingung: das Produkt rechnet ohne Modul nicht in USD (' + basis + ')');
  assert.equal(waehrungLesen(V), basis, wofuer);
  assert.equal(V.textsatzRegeln().waehrung, V.TEXTSATZ_REGELN_EINGEBAUT.waehrung, wofuer + ' (Regel)');
}
const usdModul = (produkt, extra) => Object.assign({
  modulTyp: 'textsatz', moduleVersion: 1, sprache: sprachTag(produkt),
  texte: { 'strings:fussQuellcode.text': 'FREMD' },
  regeln: { waehrung: 'USD', datumsformat: 'MM/TT/JJJJ' },
}, extra || {});

/* Wie eine Bürgerin eine Datei öffnet, die ihr jemand gegeben hat: angelegt, bestückt, verpackt, in einem frischen Kern
   desselben Produkts geöffnet. */
async function fremdesDepotOeffnen(produkt, module) {
  const Q = ladeKern({ produkt }).V;
  await Q.depotAnlegen(PW);
  Q.akteurSelbstErklaeren('Fremd');
  const d = JSON.parse(JSON.stringify(Q.getData()));
  d.textsatzModule = (d.textsatzModule || []).concat(module);
  d.textsprache = sprachTag(produkt);
  Q.setData(d);
  const umschlag = await Q.depotSerialisieren();
  const V = ladeKern({ produkt }).V;
  const basis = waehrungLesen(V);
  await V.depotLaden(JSON.parse(JSON.stringify(umschlag)), PW);
  V.depotModuleWaehlen(V.nichtGewaehlteDepotModule().map((g) => g.modul));
  return { V, basis };
}

for (const produkt of PRODUKTE) {
  test('[Währung·Rot-Beweis] ' + produkt + ': ein mitgereistes Modul mit waehrung USD wirkt, setzt aber keine Währung', async () => {
    const { V, basis } = await fremdesDepotOeffnen(produkt, [usdModul(produkt)]);
    assert.equal(V.textLesen('strings:fussQuellcode.text'), 'FREMD', 'Vorbedingung: das Modul wirkt (sonst misst die Probe nichts)');
    assert.equal(V.textsatzRegeln().datumsformat, 'MM/TT/JJJJ', 'seine übrigen Regeln gelten');
    keineModulWaehrung(V, basis, 'die Währung bleibt die mitgelieferte');
  });

  test('[Währung·Selbstauskunft] ' + produkt + ': „ab Werk“, „geprüft“, „intern“ aus dem Modul selbst setzen keine Währung', async () => {
    const { V, basis } = await fremdesDepotOeffnen(produkt, [usdModul(produkt, {
      abWerk: true, ungeprueft: false, pruefstufe: 'intern', anbieterId: 'vivodepot', anbieterIdGeprueft: 'vivodepot', herkunft: 'vivodepot',
    })]);
    assert.equal(V.textLesen('strings:fussQuellcode.text'), 'FREMD', 'Vorbedingung: das Modul wirkt');
    keineModulWaehrung(V, basis, 'Selbstauskunft zählt nicht');
  });
}

/* Der Filter entscheidet nur, er sät nichts: nach dem Öffnen gilt das fremde Modul weiter nicht als ab Werk — weder in der
   Ab-Werk-Prüfung noch in der Herkunft, die die Bürgerin sieht. Ein Filter, der beim Entscheiden ein Modul als „ab Werk“
   vermerkte, machte genau diese Probe rot. */
test('[Währung·sät nichts] nach dem Filter ist das fremde Modul weder ab Werk noch in der Herkunft als eingebaut geführt', async () => {
  const { V } = await fremdesDepotOeffnen('privat-de', [usdModul('privat-de')]);
  const m = V.getData().textsatzModule.find((x) => x && x.texte && x.texte['strings:fussQuellcode.text'] === 'FREMD');
  assert.ok(m, 'Vorbedingung: das fremde Modul liegt im Depot');
  assert.equal(V.textsatzRegeln().datumsformat, 'MM/TT/JJJJ', 'Vorbedingung: der Filter lief über dieses Modul');
  assert.equal(V._abWerkGleich(m), false, 'die Ab-Werk-Prüfung kennt es nicht');
  const eintrag = V.eingelasseneModule().find((e) => e.typ === 'textsatz');
  assert.ok(eintrag, 'es steht in der Liste der eingelassenen Module');
  assert.notEqual(eintrag.abWerk, true, 'die Herkunft führt es nicht als eingebaut');
});

/* Der legitime Weg: eine Institution liefert die Anwendung mit ihrem Modul aus (Vor-Depot, gegen den Anker geprüft).
   Was inhaltsgleich mit diesem Modul ist, setzt seine Währung. */
test('[Währung·Positiv] ein mit der Anwendung ausgeliefertes Modul (Vor-Depot) setzt seine Währung', async () => {
  const { V } = ladeKern();
  const modul = usdModul('privat-de');
  const ziel = await vorDepotAusliefern(V, modul);
  assert.equal(ziel.textsatzModule.length, 1, 'Vorbedingung: die Auslieferung wurde angenommen');
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Prüfung');
  const d = V.getData();
  d.textsprache = 'fr';
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  assert.equal(waehrungLesen(V), 'USD');
});

test('[Währung·Gegenprobe] dasselbe Modul, roh ins Depot gelegt statt ausgeliefert, setzt keine Währung', async () => {
  const { V } = ladeKern();
  const basis = waehrungLesen(V);
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Prüfung');
  const d = V.getData();
  d.textsatzModule = [usdModul('privat-de')];
  d.textsprache = 'fr';
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  assert.equal(V.textLesen('strings:fussQuellcode.text'), 'FREMD', 'Vorbedingung: das Modul wirkt');
  keineModulWaehrung(V, basis, 'roh eingelegt');
});
