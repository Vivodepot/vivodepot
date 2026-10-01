'use strict';
/* Die Klasse hinter den drei Fundstellen von v842: jede Stelle, an der Code HTML aus einem Wert in die Seite setzt,
   steht mit Grund in tools/html-senken-grundlinie.json. Eine neue oder geänderte Senke ist rot, bis ihr Grund
   geprüft und mit Grund eingetragen ist. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { senken, senkenIn, grundlinieLesen, abgleichen, OFFEN } = require('../tools/lib/html-senken.js');
const G = { abgleichen, OFFEN, lesen: grundlinieLesen };

const REPO = path.join(__dirname, '..');

test('[HTML-Senken] jede Senke der Anwendungen steht mit Grund in der Grundlinie', () => {
  const ist = senken(REPO);
  assert.ok(ist.length >= 80, 'Positivkontrolle: die Senken werden gefunden (' + ist.length + ')');
  const { neu, weg, ohneGrund } = G.abgleichen(ist, G.lesen(REPO));
  assert.deepEqual(neu.map((s) => `${s.datei}:${s.zeile} (${s.funktion}) ${s.code}`), [], 'neue oder geänderte Senke — Grund prüfen und eintragen');
  assert.deepEqual(weg.map((e) => `${e.datei} (${e.funktion})`), [], 'Senke verschwunden — Liste neu schreiben');
  assert.deepEqual(ohneGrund.map((e) => `${e.datei}:${e.zeile}`), [], 'Senke ohne Grund');
});

test('[HTML-Senken·Rot-Beweis] eine neue Senke mit einem Wert wird gefunden, fester Text und Kommentare nicht', () => {
  const text = [
    'function zeigen(d) {',
    '  el.innerHTML = d.name;',
    '  el.innerHTML = \'<p>fest</p>\';',
    '  // el.innerHTML = d.kommentar;',
    '  el.insertAdjacentHTML(\'beforeend\', d.mehr);',
    '  el.innerHTML = \'<b>\' +',
    '    d.fortsetzung;',
    '}',
  ].join('\n');
  const s = senkenIn(text, 'probe.js');
  assert.deepEqual(s.map((x) => x.zeile), [2, 5, 6]);
  assert.ok(s.every((x) => x.funktion === 'zeigen'));
  const gl = { eintraege: s.slice(0, 2).map((x) => ({ datei: x.datei, abdruck: x.abdruck, anzahl: 1, grund: 'g' })) };
  assert.equal(G.abgleichen(s, gl).neu.length, 1, 'die dritte ist neu');
  assert.equal(G.abgleichen(s, { eintraege: [...gl.eintraege, { datei: 'probe.js', abdruck: 'x', anzahl: 1, grund: G.OFFEN }] }).ohneGrund.length, 1);
});
