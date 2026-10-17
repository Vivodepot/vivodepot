'use strict';
/* Ein QR-Code mit Webadresse zeigt die Adresse lesbar daneben (Klasse QR-ADRESSE-NICHT-LESBAR): jede `qrcode(`-Stelle aller
   Oberflächen steht mit Sorte in der Liste des Werkzeugs; trägt der Code eine Webadresse, schreibt die Anzeige sie als Text
   an ein Element mit `data-qr-adresse`. Werkzeug: tools/qr-adresse-pruefen.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const W = require('../tools/qr-adresse-pruefen.js');

const REPO = path.join(__dirname, '..');
const lesen = (d) => fs.readFileSync(path.join(REPO, d), 'utf8');

test('[QR-Adresse] alle Oberflächen: jede QR-Stelle ist eingetragen, jede mit Webadresse zeigt sie lesbar', () => {
  assert.deepEqual(W.pruefen(), []);
  const mitAdresse = W.STELLEN.filter((s) => s.sorte === 'adresse');
  assert.ok(mitAdresse.some((s) => s.host === 'marke') && mitAdresse.some((s) => s.host === 'stelle'), 'Testvoraussetzung: beide Host-Regeln kommen vor');
  for (const s of W.STELLEN) assert.ok(['adresse', 'keine-adresse'].includes(s.sorte) && s.inhalt, s.funktion + ': Sorte und Inhalt benannt');
});

test('[QR-Adresse·Rot-Beweis] der Stand vor dem Fix — Code mit Webadresse ohne Text daneben — wäre rot', () => {
  const mitAdresse = W.STELLEN.filter((x) => x.sorte === 'adresse');
  for (const datei of new Set(mitAdresse.map((s) => s.datei))) {
    const ohne = lesen(datei).split(W.MARKE).join('data-entfernt');
    assert.notEqual(ohne, lesen(datei), 'Testvoraussetzung: die Pflanzung greift in ' + datei);
    const b = W.pruefeText(datei, ohne);
    assert.deepEqual(b.map((x) => x.funktion).sort(), mitAdresse.filter((s) => s.datei === datei).map((s) => s.funktion).sort(), datei + ': ' + JSON.stringify(b));
    for (const x of b) assert.match(x.grund, /ohne lesbare Adresse daneben/);
  }
});

test('[QR-Adresse·Rot-Beweis] eine neue QR-Stelle ohne Eintrag ist ein Befund', () => {
  const text = lesen('vivodepot.html').replace('</body>', '<script>\nfunction neueQrStelle() { const q = window.qrcode(0, \'M\'); q.addData(\'https://example.org/\'); }\n</script></body>');
  const b = W.pruefeText('vivodepot.html', text);
  assert.equal(b.length, 1, JSON.stringify(b));
  assert.equal(b[0].funktion, 'neueQrStelle');
  assert.match(b[0].grund, /ohne Eintrag/);
});

test('[QR-Adresse·Rot-Beweis] ein Eintrag ohne QR-Stelle ist ein Befund', () => {
  const stellen = W.STELLEN.concat([{ datei: 'vivodepot.html', funktion: 'gibtEsNicht', sorte: 'keine-adresse', inhalt: 'x' }]);
  const b = W.pruefeText('vivodepot.html', lesen('vivodepot.html'), stellen);
  assert.deepEqual(b.map((x) => x.funktion), ['gibtEsNicht']);
});

test('[QR-Adresse·Rot-Beweis] Studio: ein Aushang-Bild ohne Text, oder eines, das niemand anbietet, wäre rot', () => {
  const studio = lesen('vivodepot-studio.html');
  const ohneText = studio.replace('zeilen.forEach((z, i) => g.fillText(', 'zeilen.forEach((z, i) => g.strokeRect(');
  assert.notEqual(ohneText, studio, 'Testvoraussetzung: die Pflanzung greift');
  assert.ok(W.pruefeText('vivodepot-studio.html', ohneText).every((b) => /zeichnet keinen Text/.test(b.grund)));
  assert.equal(W.pruefeText('vivodepot-studio.html', ohneText).length, 2, 'beide Studio-Stellen hängen am Bild');
  const ohneAngebot = studio.replace('const aushang = kurzlinkAushangBild(feld.value);', 'const aushang = null;');
  assert.notEqual(ohneAngebot, studio, 'Testvoraussetzung: die Pflanzung greift');
  assert.ok(W.pruefeText('vivodepot-studio.html', ohneAngebot).some((b) => /bietet das Bild mit Adresse nicht an/.test(b.grund)));
});

test('[QR-Adresse] Studio: die Adresse im Aushang-Bild steht ganz da, Hostname ungeteilt, Umbruch nur nach »/« oder vor »?«', () => {
  const k = W.koerper(lesen('vivodepot-studio.html'), 'kurzlinkAushangZeilen');
  const zeilen = require('node:vm').runInNewContext(k + '; kurzlinkAushangZeilen');
  for (const adresse of [
    'https://share.vivodepot.de/a/Zz9xY8wV7uT6',
    'https://www.beispiel-einrichtung.example/anfragen/vorsorge/2026/kurz/Zz9xY8wV7uT6aB3cD4eF5',
    'https://kurz.example/x?anfrage=Zz9xY8wV7uT6&sprache=de',
    'https://ein-sehr-langer-hostname-einer-einrichtung.beispiel.example/a',
    'https://kurz.example',
  ]) {
    const z = zeilen(adresse, 20);
    assert.equal(z.join(''), adresse, 'nichts geht verloren, auch nicht https://');
    const host = /^https:\/\/[^\/?#]+/.exec(adresse)[0];
    assert.ok(z[0].startsWith(host), 'der Hostname steht ungeteilt in der ersten Zeile: ' + z[0]);
    for (let i = 0; i < z.length - 1; i++) assert.ok(z[i].endsWith('/') || z[i + 1].startsWith('?'), 'Umbruch nur nach »/« oder vor »?«: ' + JSON.stringify(z));
  }
});

test('[QR-Adresse] der Kern zeigt Host und Pfad, nicht das Fragment mit dem Inhalt', () => {
  const k = W.koerper(lesen('vivodepot.html'), '_empfaengerQrErgebnisModal');
  assert.match(k, /adresse = u\.host \+ u\.pathname/);
  assert.match(k, /data-qr-adresse="1">' \+ escapeHTML\(adresse\)/);
});
