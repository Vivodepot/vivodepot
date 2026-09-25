'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Auftragskette 14.08.2026, Glied 3, Zug 5 — der Familienstand löst aus.
   ────────────────────────────────────────────────────────────────────────
   Bis heute waren getrennt/geschieden/verwitwet reine Anzeigewerte. Nach
   diesem Zug lösen sie einen sichtbaren Weg zur passenden Lebenslage aus —
   „Rot sehen: Familienstand ändern und belegen, dass der Weg zur Lage
   entsteht — und dass er nicht entsteht, wenn der Wert unverändert bleibt."
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

test('familienstandLageVorschlag: getrennt/geschieden → trennung-scheidung, verwitwet → verwitwung, sonst null', () => {
  const { V } = ladeKern();
  assert.equal(V.familienstandLageVorschlag('getrennt'), 'trennung-scheidung');
  assert.equal(V.familienstandLageVorschlag('geschieden'), 'trennung-scheidung');
  assert.equal(V.familienstandLageVorschlag('verwitwet'), 'verwitwung');
  assert.equal(V.familienstandLageVorschlag('ledig'), null);
  assert.equal(V.familienstandLageVorschlag('verh'), null);
  assert.equal(V.familienstandLageVorschlag(''), null);
  assert.equal(V.familienstandLageVorschlag(undefined), null);
});

test('[Rot-Beweis] ein echter Wechsel zu "verwitwet" setzt den Vorschlag', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('identity', 'maritalStatus', 'verh');   // Erstbefüllung — kein Wechsel
  assert.equal(V.getData().vorgeschlageneLage, undefined, 'Erstbefüllung darf keinen Vorschlag auslösen');
  V.sektorFeldSetzen('identity', 'maritalStatus', 'verwitwet');   // echter Wechsel
  const vorschlag = V.getData().vorgeschlageneLage;
  assert.ok(vorschlag, 'ein echter Wechsel zu verwitwet muss den Vorschlag setzen');
  assert.equal(vorschlag.lageId, 'verwitwung');
  assert.ok(vorschlag.seit, 'trägt einen Zeitstempel');
});

test('ein Wechsel zu einem NICHT ausloesenden Wert (z. B. "ledig") setzt keinen Vorschlag', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('identity', 'maritalStatus', 'verh');
  V.sektorFeldSetzen('identity', 'maritalStatus', 'ledig');
  assert.equal(V.getData().vorgeschlageneLage, undefined);
});

test('[Zurückgenommen] derselbe Wert erneut gesetzt (kein Wechsel) ändert den Vorschlag nicht erneut', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('identity', 'maritalStatus', 'verh');
  V.sektorFeldSetzen('identity', 'maritalStatus', 'getrennt');
  const erster = V.getData().vorgeschlageneLage.seit;
  V.sektorFeldSetzen('identity', 'maritalStatus', 'getrennt');   // kein Wechsel — derselbe Wert
  assert.equal(V.getData().vorgeschlageneLage.seit, erster, 'ohne echten Wechsel bleibt der Vorschlag unverändert');
});

test('vorgeschlageneLageSchliessen: nimmt den Vorschlag weg, wirft nicht ohne einen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('identity', 'maritalStatus', 'verh');
  V.sektorFeldSetzen('identity', 'maritalStatus', 'geschieden');
  assert.ok(V.getData().vorgeschlageneLage);
  V.vorgeschlageneLageSchliessen();
  assert.equal(V.getData().vorgeschlageneLage, undefined);
  assert.doesNotThrow(() => V.vorgeschlageneLageSchliessen());
});

test('[DOM] renderPrueftermine zeigt einen Weg zur Lage, solange der Vorschlag steht', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.renderPrueftermine();
  let html = document.getElementById('content').innerHTML;
  assert.ok(!html.includes('data-vorschlag-lage'), 'ohne Vorschlag kein Banner');

  V.sektorFeldSetzen('identity', 'maritalStatus', 'verh');
  V.sektorFeldSetzen('identity', 'maritalStatus', 'verwitwet');
  V.renderPrueftermine();
  html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('data-vorschlag-lage="verwitwung"'), 'Banner verlinkt die vorgeschlagene Lage');

  // DOM-Stub: querySelectorAll ist ein Phantom (liefert immer []) — am gerenderten HTML-String
  // prüfen, nicht am Element-Objekt (dieselbe Lehre wie an anderer Stelle im Projekt).
  const treffer = html.match(/data-vorschlag-schliessen/g) || [];
  assert.equal(treffer.length, 1, 'ein Schließen-Knopf, „Bleibt, wie es ist"');
  assert.ok(html.includes(V.STRINGS.ereignisAnlassSchliessenKnopf), 'trägt denselben Wortlaut wie die Ereignis-Achse');
});
