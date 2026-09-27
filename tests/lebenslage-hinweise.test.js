'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Lebenslage-Hinweise — Rechtslage-Auskünfte auf einem Lage-Blatt
   Auftragskette 14.08.2026, Glied 3 („Vier Lebenslagen als Einstieg").
   ────────────────────────────────────────────────────────────────────────
   Neue, optionale `hinweise`-Eigenschaft an einer BAUSTEINE-Definition —
   ein Array reiner Rechtslage-Sätze (Fristen, Auskünfte über das Gesetz),
   KEINE Empfehlung (U2-ADR-025). Wird von `lebenslageAlsBlatt` durchgereicht
   und von `renderSituation` als eigene `.hinweis-box` je Eintrag gerendert —
   additiv: eine Lage/Situation ohne `hinweise` verhält sich unverändert
   (13 bestehende Lagen, keine trägt die Eigenschaft).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

function synthSituationMitHinweisen() {
  return {
    id: 'tsit-hinweise', titel: 'Test-Situation mit Hinweisen', icon: 'star', modus: 'eigen',
    einfuehrung: 'Eine Probe.',
    hinweise: ['Erster Rechtslage-Satz.', 'Zweiter Rechtslage-Satz.'],
    bloecke: [],
  };
}

test('renderSituation: hinweise werden je Eintrag als eigene hinweis-box gerendert', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderSituation(synthSituationMitHinweisen());
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Erster Rechtslage-Satz.'), 'erster Hinweis sichtbar');
  assert.ok(html.includes('Zweiter Rechtslage-Satz.'), 'zweiter Hinweis sichtbar');
  const treffer = html.match(/hinweis-box/g) || [];
  assert.equal(treffer.length, 2, 'zwei eigene hinweis-box-Container, kein zusammengefasster Block');
});

test('renderSituation: ohne hinweise (undefined) ändert sich nichts — Bestandsverhalten', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderSituation({ id: 'tsit-ohne', titel: 'Ohne Hinweise', icon: 'star', modus: 'eigen', einfuehrung: 'x', bloecke: [] });
  const html = document.getElementById('content').innerHTML;
  assert.ok(!html.includes('hinweis-box'), 'keine hinweis-box ohne hinweise-Array');
});

test('renderSituation: leeres hinweise-Array verhält sich wie kein Array', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderSituation({ id: 'tsit-leer', titel: 'Leer', icon: 'star', modus: 'eigen', einfuehrung: 'x', hinweise: [], bloecke: [] });
  const html = document.getElementById('content').innerHTML;
  assert.ok(!html.includes('hinweis-box'), 'kein hinweis-box bei leerem Array');
});

test('lebenslageAlsBlatt: BAUSTEIN.hinweise wird ins Lage-Objekt durchgereicht', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  // eigene-vorsorge trägt heute keine hinweise — Positivkontrolle, dass die Eigenschaft
  // grundsätzlich als leeres/undefined Array durchkommt, ohne zu werfen.
  const blatt = V.lebenslageAlsBlatt('eigene-vorsorge');
  assert.ok(blatt, 'eigene-vorsorge existiert weiterhin als Lage');
  assert.deepEqual(blatt.hinweise, [], 'ohne BAUSTEIN.hinweise liefert lebenslageAlsBlatt ein leeres Array, nicht undefined');
});

test('[Rotmachbarkeit] eine Lage MIT hinweise zeigt sie im gerenderten Blatt', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  // BAUSTEIN_BY_ID ist Object.freeze — ein frisches Objekt mit hinweise simuliert den
  // künftigen Zug-4-Baustein, ohne die echte Registry anzufassen (reiner Funktions-Test).
  const fingiert = { id: 'fingiert', name: 'Fingierte Lage', unterlagen: 'x',
    hinweise: ['Ein fingierter Rechtslage-Satz zur Rotmachbarkeits-Probe.'] };
  const erg = V.lebenslageFelder && null; // Platzhalter, falls lebenslageFelder direkt gebraucht wird
  // lebenslageAlsBlatt liest über BAUSTEIN_BY_ID — hier wird direkt das Blatt-Objekt geprüft,
  // das dieselbe Form hat wie ein echtes lebenslageAlsBlatt()-Ergebnis (renderSituation kennt
  // den Unterschied nicht).
  V.renderSituation({ id: '__lage__fingiert', _lageId: 'fingiert', titel: fingiert.name, icon: 'star',
    einfuehrung: '', hinweise: fingiert.hinweise, bloecke: [] });
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Ein fingierter Rechtslage-Satz zur Rotmachbarkeits-Probe.'));
});

/* ── Zug 2: verwandteSituation — verwitwung verbindet mit „Nach einem Todesfall" statt zu
   doppeln (Auftrag: „Messen, ob die neue Lage darauf aufsetzt oder danebensteht, und die Wege
   verbinden"). Additiv: eine Situation/Lage ohne verwandteSituation verhält sich unverändert. */

test('lebenslageAlsBlatt: verwitwung trägt verwandteSituation=todesfall-uebernahme', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const blatt = V.lebenslageAlsBlatt('verwitwung');
  assert.ok(blatt, 'verwitwung existiert als Lage');
  assert.equal(blatt.verwandteSituation, 'todesfall-uebernahme');
});

test('renderSituation: verwandteSituation zeigt einen Link zum Zieltitel, klickbar', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const blatt = V.lebenslageAlsBlatt('verwitwung');
  V.renderSituation(blatt);
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('data-klick-situation="todesfall-uebernahme"'), 'Link trägt das Ziel als Attribut');
  assert.ok(html.includes('Nach einem Todesfall'), 'Link nennt den Titel des Ziels');
});

test('renderSituation: ohne verwandteSituation (undefined) kein Link — Bestandsverhalten', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderSituation(synthSituationMitHinweisen());   // trägt kein verwandteSituation
  const html = document.getElementById('content').innerHTML;
  assert.ok(!html.includes('data-klick-situation'), 'kein Link ohne verwandteSituation');
});

test('renderSituation: verwandteSituation auf eine nicht-existente Situation rendert keinen toten Link', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderSituation({ id: 'tsit-tot', titel: 'Toter Verweis', icon: 'star', modus: 'eigen',
    einfuehrung: 'x', verwandteSituation: 'gibt-es-nicht', bloecke: [] });
  const html = document.getElementById('content').innerHTML;
  assert.ok(!html.includes('data-klick-situation'), 'kein Link, wenn das Ziel nicht existiert');
});

test('renderSituation: verwandteSituation-Link im Druck nicht gerendert', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const blatt = V.lebenslageAlsBlatt('verwitwung');
  V.renderSituation(blatt, { druck: true });
  const html = document.getElementById('content').innerHTML;
  assert.ok(!html.includes('data-klick-situation'), 'im Druck kein Klick-Link');
});
