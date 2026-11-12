'use strict';
/* Vorschau v998 (31.10.2026), was über M08–M10 hinaus aus derselben Vorschau kam (M08–M10 selbst: eigene Proben
   leere-auffang-karte-verborgen-m08, menschen-leer-hauptknopf-m09, vorschau-ohne-pausen-zeile-m10):
   M15  Die Pille der Kopfzeile sagt in der Umschau „Beispielansicht“ ohne grünen Punkt (renderTopbar); im Depot und in der
        Vorführung bleibt „Mein Depot“.
   Fund 8 (Dialog „Neue Person anlegen“ aus einem Personenfeld): nur Name und Telefon, kein Weg zu Anschrift oder Anmerkung.
        Jetzt klappt „Weitere Angaben“ an Ort und Stelle E-Mail, Anschrift und Anmerkung auf (dieselben Unterfelder wie das Register),
        und was dort steht, wird mit der Person gespeichert. Den ganzen Eintrag öffnet danach „Ansehen/Ändern“ am Feld (bestand schon).
   Rot-Beweis Fund 8: auf dem Kanon 4913e3bc4 (02.11.2026) ohne diesen Wagen rot, mit ihm grün. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[M15] die Pille sagt in der Umschau „Beispielansicht“ ohne grünen Punkt, im Depot „Mein Depot“', async () => {
  const k = ladeKern();
  k.V.vorschauDepotErzeugen();
  k.V.renderTopbar();
  assert.equal(k.document.getElementById('tb-depot-name').textContent, k.V.STRINGS.depotPilleBeispiel);
  assert.ok(k.V.STRINGS.depotPilleBeispiel && k.V.STRINGS.depotPilleBeispiel !== k.V.STRINGS.depotPilleEigen);
  const d = ladeKern();
  await d.V.depotAnlegen('pw'); d.V.akteurSelbstErklaeren('Tester');
  d.V.renderTopbar();
  assert.equal(d.document.getElementById('tb-depot-name').textContent, d.V.STRINGS.depotPilleEigen);
});

test('[Fund 8] „Neue Person anlegen“ klappt Weitere Angaben auf und speichert sie mit der Person', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw'); V.akteurSelbstErklaeren('Tester');
  let neuId = null;
  V.flowPersonNeuAnlegen('', (id) => { neuId = id; });
  const inhalt = document.getElementById('modal-inhalt');
  const html = inhalt.innerHTML;
  assert.match(html, new RegExp('<details class="mehr-block"><summary>' + V.STRINGS.refNeuePersonWeitereAngaben + '</summary>'));
  for (const id of ['email', 'street', 'houseNumber', 'postalCode', 'city', 'anmerkung']) {
    assert.match(html, new RegExp('<details class="mehr-block">[\\s\\S]*data-sub-zeile="' + id + '"[\\s\\S]*</details>'), id + ' fehlt in „Weitere Angaben“');
  }
  document.getElementById('ref-neu-name').value = 'Sabine Wagner';
  // Der Test-DOM hält Werte nur an Elementen mit id; die Eingaben der Weiteren Angaben liest liesEintragAusDOM über data-edit.
  // Darum liefert die Probe genau diese zwei Eingaben selbst, alle übrigen Abfragen bleiben beim Test-DOM.
  const getippt = { '[data-edit="city"]': { value: 'Kiel' }, '[data-edit="anmerkung"]': { value: 'kommt dienstags' } };
  const qs = inhalt.querySelector.bind(inhalt);
  inhalt.querySelector = (sel) => getippt[sel] || (/^\[data-(edit|sub-zeile)="/.test(sel) ? null : qs(sel));
  await document.getElementById('m-ok').onclick();
  const m = V.getData().menschen.find((x) => x.id === neuId);
  assert.ok(m, 'die Person ist angelegt');
  assert.equal(m.city, 'Kiel');
  assert.equal(m.anmerkung, 'kommt dienstags');
});
