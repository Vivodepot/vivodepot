'use strict';
/* Formprüfung beim Erbschein-Auszug in Pro (27.10.2026, Befund TESTAMENTSFORM-PRUEFUNG-OHNE-KATALOG).
   Der Erbschein-Auszug gibt eine Testamentsform nur weiter, wenn die Zeile sie anbietet (`_wertInZeileVorgesehen`). Den Bereich
   der Liste provisionInstruments suchte `_sektorIdDerListe` im Anzeige-Index SEKTOR_BY_ID. In Pro ist advanceCare ein ruhender
   Bereich und fehlt dort: die Suche fand nichts, die Prüfung hielt jede Form für vorgesehen, und eine Altangabe wie „privat“
   ging als Tatsache in den Auszug. Fix: die Suche fragt den Katalog (wie `_sektorAusKatalog`). Die Klasse hält
   tests/anzeige-index-leser.test.js: jede neue Stelle, die SEKTOR_BY_ID liest, ist rot, bis sie eingeordnet ist.
   Rot-Beweis: auf 45278786d (vor dem Fix) sind die zwei Proben mit „privat“ rot, die dritte grün. */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const { produktHtml, kernAus } = require('./produkt-html-erzeugen.js');

const PW = 'probe-passwort-testamentsform-pro-2026-10-27';
const ALT_TESTAMENT = () => ({ id: 't-alt', instrument: 'will', form: 'privat' });

for (const slug of ['pro-de', 'pro-en']) {
  test('[Testamentsform·Pro] ' + slug + ': eine Form, die die Zeile nicht anbietet, geht nicht in den Erbschein-Auszug', async () => {
    const k = kernAus(produktHtml(slug));
    await k.V.depotAnlegen(PW);
    const d = k.V.getData();
    d.sektoren.advanceCare = Object.assign({}, d.sektoren.advanceCare, { provisionInstruments: [ALT_TESTAMENT()] });
    k.V.setData(d);
    const daten = k.V._erbscheinSektorDaten();
    assert.equal(daten.testament_form, undefined, 'die Altangabe „privat“ steht nicht als Form im Auszug');
    assert.equal(daten.testament_form_pruefen, true, 'der Auszug zeigt, dass ein Testament eingetragen ist und geprüft werden muss');
    assert.equal(k.V.getData().sektoren.advanceCare.provisionInstruments[0].form, 'privat', 'keine Migration: der Wert bleibt in der Datei');
  });
}

test('[Testamentsform·Pro] pro-de: eine vorgesehene Form geht weiter in den Auszug', async () => {
  const k = kernAus(produktHtml('pro-de'));
  await k.V.depotAnlegen(PW);
  const d = k.V.getData();
  d.sektoren.advanceCare = Object.assign({}, d.sektoren.advanceCare, { provisionInstruments: [{ id: 't-neu', instrument: 'will', form: 'eigenhaendig' }] });
  k.V.setData(d);
  assert.equal(k.V._erbscheinSektorDaten().testament_form, 'eigenhaendig');
});
