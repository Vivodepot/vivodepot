'use strict';
// tools/hinweistexte-bestand.js: Auswahl, Muster-Vorschlag und Pro-Abweichung gegen erfundene Fixtures.
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const H = require('../tools/hinweistexte-bestand.js');

const F = path.join(__dirname, 'fixtures', 'hinweistexte-bestand');
const laden = (n) => ({ name: n, texte: JSON.parse(fs.readFileSync(path.join(F, n + '.json'), 'utf8')).texte });
const reihen = H.bestandErheben({
  module: [laden('textsatz-privat'), laden('textsatz-pro')],
  kern: fs.readFileSync(path.join(F, 'kern.html'), 'utf8'),
});
const je = (schluessel, modul = 'textsatz-privat') => reihen.find((r) => r.schluessel === schluessel && r.modul === modul);

test('Auswahl: Hinweis-, Erklär- und Leerzustandstexte, keine Labels, Knöpfe, Platzhalter oder „Leeren“', () => {
  assert.equal(je('garten.label'), undefined);
  assert.equal(je('strings:speichernKnopf.text'), undefined);
  assert.equal(je('strings:werteLeerenKnopf.text'), undefined);
  assert.equal(je('garten.platzhalter.luecke'), undefined);
  assert.equal(je('garten.giesskanne.hint').art, 'Feldhinweis');
  assert.equal(je('garten.einfuehrungstext').art, 'Einführung');
  assert.equal(je('garten.navUnterzeile').art, 'Unterzeile');
  assert.equal(je('strings:beeteLeer.text').art, 'Leerzustand');
  assert.equal(je('strings:erinnerungText.text').art, 'Erklärtext');
});

test('Muster-Vorschlag je Regel', () => {
  assert.equal(je('garten.giesskanne.hint').muster, 'Symbol mit Tooltip');
  assert.equal(je('garten.sorte.hint').muster, 'Platzhalter im Feld');
  assert.equal(je('garten.alteNotiz.hint').muster, 'Marke „übernommen“ mit Tooltip');
  assert.equal(je('garten.pacht.hint').muster, 'bleibt: Folge oder Recht');
  assert.equal(je('garten.nachbar.hint').muster, 'Link oder Chip mit ›');
  assert.equal(je('garten.einfuehrungstext').muster, 'Aufklapper mit Pfeil');
  assert.equal(je('strings:beeteLeer.text').muster, 'Leerzustand mit Knopf');
  assert.equal(je('strings:pinLeer.text').muster, 'bleibt: Eingabeprüfung');
  assert.equal(je('strings:erinnerungText.text').muster, 'Schalter');
  assert.equal(je('garten.navUnterzeile').muster, 'kurzer Satz bleibt');
  assert.equal(je('strings:schuppenGeschuetztHinweis.text').muster, 'bleibt: ist schon Marke');
  assert.equal(je('wizard:gartwiz.wunsch.hilfetext').muster, 'bleibt: Satzanfang im Formular');
  assert.equal(je('dok:gartenverfuegung#1/wunsch.einleitung').muster, 'bleibt: Wortlaut der Verfügung');
  assert.equal(je('garten.parzellen.hint').muster, 'Symbol mit Tooltip', 'ein Beispiel mitten im Satz macht keinen Platzhalter');
});

test('Knöpfe eines Hinweis-Dialogs sind keine Hinweistexte', () => {
  assert.equal(je('strings:umzugHinweisSpaeter.text'), undefined);
});

test('Ort im Kern und Pro-Abweichung', () => {
  assert.equal(je('strings:beeteLeer.text').kernZeile, '3');
  assert.equal(je('garten.giesskanne.hint').kernZeile, '—');
  assert.equal(je('garten.giesskanne.hint', 'textsatz-pro'), undefined, 'gleicher Text in Pro wird nicht doppelt gelistet');
  assert.ok(je('strings:giessplanHinweis.text', 'textsatz-pro'), 'abweichender Pro-Text wird gelistet');
  assert.equal(je('pro-gelaende.navUnterzeile', 'textsatz-pro').produkt, 'Pro');
});

test('Aufruf ohne Argument läuft gegen die Fixtures und schreibt TSV', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'tools', 'hinweistexte-bestand.js')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout.split('\n')[0], /^modul\tschluessel\tbereich\tprodukt\tkernZeile\tart\tzeichen\twoerter\tmuster\ttext$/);
  assert.equal(JSON.parse(r.stderr).texte, reihen.length);
  const falsch = spawnSync(process.execPath, [path.join(__dirname, '..', 'tools', 'hinweistexte-bestand.js'), '--unbekannt'], { encoding: 'utf8' });
  assert.equal(falsch.status, 2);
});

test('[Hinweistexte·Gegenprobe] derselbe Schlüssel ohne Knopf-Endung zählt, mit Knopf-Endung nicht', () => {
  assert.equal(H.artBestimmen('strings:umzugHinweis.text'), 'Hinweis');
  assert.equal(H.artBestimmen('strings:umzugHinweisSpaeter.text'), null);
  assert.equal(H.musterVorschlagen('Feldhinweis', 'x.hint', 'Wer kündigt, verliert die Parzelle endgültig.'), 'bleibt: Folge oder Recht');
  assert.equal(H.musterVorschlagen('Feldhinweis', 'x.hint', 'Wer kündigt, verliert die Parzelle.'), 'Symbol mit Tooltip');
});
