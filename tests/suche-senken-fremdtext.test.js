'use strict';
/* Die drei HTML-Senken der Suche mit fremdem Text gefahren (16.11.2026, Deckel html-senken-ohne-probe).
   - _sucheVerdrahten, Trefferliste (liste.innerHTML = html): Label und Pfad eines Treffers kommen aus Angaben der Person
     oder eingelesener Dokumente und gehen maskiert in die Liste.
   - _sucheVerdrahten, Leer-Zustand (liste.innerHTML = leer): das Suchwort steht im Satz „keine Treffer für …“ und geht maskiert hinein.
   - renderSuchtreffer (c.innerHTML = html): die Trefferseite nennt Suchwort, Label und Herkunft, jeweils maskiert.
   Fremder Text mit Markup erscheint als Text, nie als Element. Rot-Beweis: die Prüffunktion findet ein rohes Element. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const FREMD = '<img src=x onerror=alert(1)>';
const roh = (html) => /<img\b/i.test(String(html));
const maskiert = (html) => String(html).includes('&lt;img');

async function mitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen('suche-senken-pw');
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

test('[Senke·Suche·Liste] ein Treffer mit Markup im Wert steht als Text in der Trefferliste', async () => {
  const k = await mitDepot();
  k.V.sektorFeldSetzen('health', 'ongoingTreatmentNext', FREMD + 'Zwinkerhausen');
  k.V._sucheVerdrahten();
  const ein = k.document.getElementById('suche-eingabe');
  ein.value = 'Zwinkerhausen';
  ein.oninput();
  const html = k.document.getElementById('suche-vorschlaege').innerHTML;
  assert.ok(html.includes('Zwinkerhausen'), 'der Treffer steht in der Liste');
  assert.equal(roh(html), false);
  assert.equal(maskiert(html), true);
});

test('[Senke·Suche·Leer] ein Suchwort mit Markup steht als Text im Leer-Zustand', async () => {
  const k = await mitDepot();
  k.V._sucheVerdrahten();
  const ein = k.document.getElementById('suche-eingabe');
  ein.value = FREMD + 'Quxquxqux';
  ein.oninput();
  const html = k.document.getElementById('suche-vorschlaege').innerHTML;
  assert.ok(html.includes('suche-leer'), 'der Leer-Zustand erscheint');
  assert.equal(roh(html), false);
  assert.equal(maskiert(html), true);
});

test('[Senke·Suchtreffer] Suchwort und Treffer mit Markup stehen als Text auf der Trefferseite', async () => {
  const k = await mitDepot();
  k.V.sektorFeldSetzen('health', 'ongoingTreatmentNext', FREMD + 'Zwinkerhausen');
  k.V.oeffneSuchtreffer(FREMD + 'Zwinkerhausen');
  const html = k.document.getElementById('content').innerHTML;
  assert.ok(html.includes('suchtreffer'), 'die Trefferseite steht');
  assert.equal(roh(html), false);
  assert.equal(maskiert(html), true);
});

test('[Senke·Suche·Rot-Beweis] ein rohes Element fällt auf, maskierter Text nicht', () => {
  assert.equal(roh('<li>' + FREMD + '</li>'), true);
  assert.equal(roh('<li>&lt;img src=x&gt;</li>'), false);
  assert.equal(maskiert('<li>&lt;img src=x&gt;</li>'), true);
});
