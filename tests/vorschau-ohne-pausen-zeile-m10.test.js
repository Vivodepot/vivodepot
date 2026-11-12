'use strict';
/* Befund M10 (HOCH, Vorschau v998, Widerspruch): am Fuß jeder Bereichsseite stand in der Vorschau „Sie können jederzeit aufhören: Was Sie
   eintragen, speichert sich auf diesem Gerät von selbst.“ Darüber steht „Sie sehen sich gerade um … Erst umsehen, ohne zu speichern“.
   Jetzt gilt: in der Vorschau trägt keine Bereichsseite und keine Situation die Zeile; im echten Depot steht sie weiter.
   Die Probe geht über ALLE Bereiche und Situationen (die Klasse), nicht über einen. Rot-Beweis: die Zeile ohne Vorschau-Tor fällt durch. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'Pruefpasswort-M10-lang-genug!';

function zeilenJeSeite(V, document) {
  const mit = [];
  for (const s of V.SEKTOREN) {
    V.renderSektor(s.id);
    if (document.getElementById('content').innerHTML.includes('class="pause-erlaubnis"')) mit.push('sektor:' + s.id);
  }
  for (const sit of V.SITUATIONEN) {
    V.renderSituation(sit.id);
    if (document.getElementById('content').innerHTML.includes('class="pause-erlaubnis"')) mit.push('situation:' + sit.id);
  }
  return mit;
}

test('[M10] Vorschau: keine Bereichsseite und keine Situation sagt „speichert sich von selbst“', () => {
  const { V, document } = ladeKern();
  V.vorschauDepotErzeugen();
  assert.equal(V.imVorschau(), true, 'Vorbedingung: Vorschau');
  assert.ok(V.SEKTOREN.length > 5, 'Vorbedingung: Bereiche gefunden');
  assert.deepEqual(zeilenJeSeite(V, document), []);
});

// Seit dem Zielbild 05 (keine Fußzeile, tests/feldgruppen-ruhezustand.test.js) steht die Zeile unter keiner Bereichsseite mehr, nur noch
// unter einem Situationsblatt; im echten Depot liefert der Helfer sie weiter.
test('[M10] echtes Depot: der Helfer liefert die Zeile, keine Bereichsseite trägt sie', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  assert.equal(V.pausenZeileHTML(), '<p class="pause-erlaubnis">' + V.escapeHTML(V.speicherSatz('bereichsende')) + '</p>');
  const mit = [];
  for (const s of V.SEKTOREN) {
    V.renderSektor(s.id);
    if (document.getElementById('content').innerHTML.includes('class="pause-erlaubnis"')) mit.push(s.id);
  }
  assert.deepEqual(mit, []);
});

test('[M10·Rot-Beweis] die Zeile ohne Vorschau-Tor fällt in der Vorschau durch', () => {
  const { V } = ladeKern();
  V.vorschauDepotErzeugen();
  const alt = '<p class="pause-erlaubnis">' + V.escapeHTML(V.speicherSatz('bereichsende')) + '</p>';   // der Stand davor, ohne imVorschau()
  assert.ok(alt.includes('pause-erlaubnis') && V.pausenZeileHTML() === '', 'die alte Zeile wäre da, die neue ist leer');
});
