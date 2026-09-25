'use strict';
/* ANG1 — ein Angehörigen-Blatt aus einer geladenen Vorlage ist eine GEWÖHNLICHE Ansicht des
   Kerns (aktiveAnsicht 'angehoerigen-blatt'), kein Modus. Lesend, mit Zurück-Weg, und über die
   globale Suche erreichbar. Die Blätter selbst kommen aus der Vorlage des Produkts. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw-ang-blatt';

async function depotMitWerten() {
  const K = ladeKern();
  const { V } = K;
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  V.sektorFeldSetzen('personal', 'letterForTheHospitalScenario', 'Liebe Helferin …');
  V.situationFeldSetzen('erbfall', 'erb_wohnung', 'gekündigt zum 30.09.');
  V.situationFeldSetzen('erbfall', 'erb_konten', 'Girokonto Sparkasse 4711');
  V.betreteApp();
  return K;
}

test('[Ansicht] das Blatt rendert lesend: Titel, Block, gezogene Werte, Zurück-Knopf, keine Eingabe', async () => {
  const { V, document } = await depotMitWerten();
  assert.equal(V.oeffneAngehoerigenBlatt('krankenhausakut'), true);
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Krankenhaus'), 'Titel');
  assert.ok(html.includes('Blutgruppe'), 'Gesundheits-Feld als Lese-Zeile');
  assert.ok(html.includes('Liebe Helferin'), 'hinterlegter Brief gezogen');
  assert.ok(html.includes('id="ang-zurueck"'), 'Zurück-Knopf');
  assert.ok(!html.includes('id="b-bearb"'), 'kein Bearbeiten');
  assert.ok(!html.includes('data-klick-sektor'), 'kein Click-Through');
  assert.equal(V.getViewState().aktiveAnsicht, 'angehoerigen-blatt');
  assert.equal(V.aktiverAngBlattId, 'krankenhausakut');
});

test('[Ansicht] Blatt aus Situations-Ablage: sensibles Feld fehlt, nicht-sensibles steht (Sensibel-Architektur unberührt)', async () => {
  const { V, document } = await depotMitWerten();
  V.oeffneAngehoerigenBlatt('behoerden_nachlass');
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('gekündigt zum 30.09.'), 'erb_wohnung gezogen');
  assert.ok(!html.includes('Girokonto Sparkasse 4711'), 'sensibles erb_konten fehlt');
});

test('[Ansicht] Zurück führt in die gewöhnliche Sektor-Ansicht, ohne Modus', async () => {
  const { V } = await depotMitWerten();
  V.oeffneAngehoerigenBlatt('pflegeheimakut');
  V.angehoerigenBlattZurueck();
  assert.equal(V.getViewState().aktiveAnsicht, 'sektor');
  assert.equal(V.aktiverAngBlattId, null);
  assert.equal(V.Modus.aktuell(), 'anker', 'die Ansicht setzt nie einen Modus');
});

test('[Ansicht] eine unbekannte Blatt-ID öffnet nichts und lässt die Ansicht stehen', async () => {
  const { V } = await depotMitWerten();
  const vorher = V.getViewState().aktiveAnsicht;
  assert.equal(V.oeffneAngehoerigenBlatt('gibt-es-nicht'), false);
  assert.equal(V.getViewState().aktiveAnsicht, vorher);
});

test('[Ansicht] die Herkunft der Vorlage steht in Bürgersprache unter dem Titel', async () => {
  const { V, document } = await depotMitWerten();
  V.oeffneAngehoerigenBlatt('beerdigung');
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /ang-herkunft">Gilt für: Deutschland</);
});

test('[Suche] jedes Blatt der geladenen Vorlage ist über die Suche erreichbar, mit eigener Quelle', async () => {
  const { V } = await depotMitWerten();
  const katalog = V._sucheKatalogAufbauen().filter((e) => e.quelle === 'angehoerigenBlatt');
  assert.deepEqual(katalog.map((e) => e.label).sort(),
    ['Behörden und Nachlass', 'Beerdigung und Nachlass', 'Krankenhaus', 'Meine Menschen', 'Pflegeheim-Aufnahme'].sort());
  const treffer = V._sucheTreffer('Beerdigung').filter((e) => e.quelle === 'angehoerigenBlatt');
  assert.equal(treffer.length, 1);
  treffer[0].ziel();
  assert.equal(V.aktiverAngBlattId, 'beerdigung');
});

test('[Suche · Gegenprobe] ohne Vorlage kein Blatt in der Suche und nichts zu öffnen', () => {
  const { V } = ladeKern({ blank: true });
  assert.deepEqual(V._sucheKatalogAufbauen().filter((e) => e.quelle === 'angehoerigenBlatt'), []);
  assert.equal(V.oeffneAngehoerigenBlatt('krankenhausakut'), false);
});
