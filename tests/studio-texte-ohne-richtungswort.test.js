'use strict';
/* Studio: kein Text zeigt mit „links“, „rechts“, „oben“ oder „unten“ auf ein Bedienelement (16.10.2026)

   Befund am Bild der Einreichen-Karten (1280 px): „Frei, sobald die Sicherung rechts geprüft …“ — die Sicherung stand links.
   Wo etwas steht, hängt an der Breite (iPad hochkant stapelt die Karten), an der Sprache und an Wagen, die die Anordnung
   ändern. Ein Text nennt darum das Element bei seinem Namen („E-Mail vorbereiten“, „Felder“, „die Vorschau“), nie seine Lage.
   Die Klasse wurde mit dem Fund geräumt (neun Stellen in Studio-Texten).

   Gemessen: alle sichtbaren Texte (Textknoten, data-en, aria-label, title, placeholder) und alle L('…', '…') im Skript.
   Erlaubt sind nur Lagen, die keinen Bedienort meinen: das Verschieben eines Felds („Nach oben“, „Move up“) und die Lage im
   Dokument der Person („ganz oben in der Anfrage“, „above the form“). Jede Ausnahme steht unten mit Grund.
   ROT-BEWEIS: der Fund selbst, wieder eingesetzt, wird gemeldet. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');

const RICHTUNG = /\b(links|rechts|oben|unten)\b|\b(on|to) the (left|right)\b|\b(above|below)\b/i;
const AUSNAHMEN = [
  [/\b[Nn]ach (oben|unten)\b|\bMove (field )?(up|down)\b/, 'Verschieben eines Felds, keine Lage'],
  [/ganz oben in der Anfrage/, 'Lage im Dokument der Person, nicht auf dem Bildschirm des Studios'],
  [/your name above the form/, 'Lage im Dokument der Person (englische Fassung von „über dem Bogen“)'],
];

function texte(html) {
  const raus = [];
  const markup = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  for (const m of markup.matchAll(/>([^<>]+)</g)) raus.push(m[1]);
  for (const m of markup.matchAll(/(?:data-en|aria-label|data-en-aria|title|placeholder)="([^"]*)"/g)) raus.push(m[1]);
  for (const m of html.matchAll(/\bL\('((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'\)/g)) raus.push(m[1], m[2]);
  return raus.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
}
function richtungsworte(html) {
  return texte(html).filter((t) => RICHTUNG.test(t.replace(AUSNAHMEN[0][0], ''))
    && !AUSNAHMEN.slice(1).some(([re]) => re.test(t)));
}

test('[Studio·Texte] kein Text zeigt mit einem Richtungswort auf ein Bedienelement', () => {
  assert.deepEqual(richtungsworte(HTML), []);
});

test('[Studio·Texte] die Messung sieht Textknoten, data-en und L(…) überhaupt', () => {
  const t = texte(HTML);
  assert.ok(t.includes('Frei, sobald Ihre Schlüsselsicherung geprüft und bestätigt ist.'), 'Textknoten');
  assert.ok(t.includes('Available as soon as your key backup is checked and confirmed.'), 'data-en');
  assert.ok(t.includes('Sicherung geprüft, heruntergeladen'), 'L(…)');
  assert.ok(t.length > 500, 'genug Texte gesehen: ' + t.length);
});

test('[Studio·Texte·Rot-Beweis] der Fund vom 16.10.2026 und ein englisches „on the left“ werden gemeldet', () => {
  const faelle = [
    HTML.replace('>Frei, sobald Ihre Schlüsselsicherung geprüft und bestätigt ist.<', '>Frei, sobald die Sicherung rechts geprüft und bestätigt ist.<'),
    HTML.replace("'Choose a field under “Fields” with + or drag it here.", "'Choose a field on the left with + or drag it here."),
    HTML.replace("L('Diese Kennung steht schon in der Liste.',", "L('Diese Kennung steht schon in der Liste unten.',"),
  ];
  for (const schlecht of faelle) {
    assert.notEqual(schlecht, HTML, 'die Verschlechterung hat nichts geändert');
    assert.equal(richtungsworte(schlecht).length, 1, 'genau die eingesetzte Stelle wird gemeldet');
  }
});
