'use strict';
/* Probe zum BMJ-Abgleich der Beschriftungen (tools/feldregister-beschriftungen-abgleichen.js, 09.10.2026). Das Feldregister
   steht unter CC0; ein Wortlaut aus einem amtlichen Mustertext trägt den Quellenhinweis, keinen Lizenzvermerk. Gehalten wird:
   jeder Treffer liegt in einem Bereich, den der Quellenhinweis nennt, ist eine Gesetzesangabe oder ist einzeln eingeordnet. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const T = require('../tools/feldregister-beschriftungen-abgleichen.js');
const { QUELLENHINWEIS } = require('../tools/lib/feldregister-adressen.js');

const TEXT = [{ quelle: 'probe.txt', text: 'Künstliche Ernährung und Flüssigkeitszufuhr. Entbindung von der Schweigepflicht gegenüber meinem Arzt. '
  + 'Freiheitsentziehende Unterbringung nach § 1831 Absatz 1 BGB.' }];
const feld = (kennung, de) => ({ kennung, bereich: kennung.split('.')[0], label: { de } });

test('[BMJ-Abgleich] findet ganze Beschriftungen und Folgen von vier Wörtern, und markiert Gesetzesangaben', () => {
  const r = T.abgleichen({ texte: TEXT, felder: [
    feld('advanceCare.a', 'Künstliche Ernährung und Flüssigkeitszufuhr'),
    feld('advanceCare.b', 'Entbindung von der Schweigepflicht gegenüber folgenden Personen'),
    feld('health.c', 'Unterbringung nach § 1831 Absatz 1 BGB im Heim'),
    feld('health.d', 'Ernährung'),
    feld('health.e', 'Eigene Notiz zu Terminen'),
  ] });
  assert.deepEqual(r.treffer.map((t) => [t.kennung, t.art, t.gesetz]),
    [['advanceCare.a', 'ganz', false], ['advanceCare.b', 'folge', false], ['health.c', 'folge', true]]);
  assert.deepEqual(r.ausserhalbHinweis, [], 'die Gesetzesangabe zählt nicht als Übernahme');
});

test('[Negativprobe] Rot-Beweis: ein Wortlaut außerhalb der Bereiche des Quellenhinweises fällt auf', () => {
  const r = T.abgleichen({ texte: TEXT, felder: [feld('housing.x', 'Künstliche Ernährung und Flüssigkeitszufuhr')] });
  assert.deepEqual(r.ausserhalbHinweis.map((t) => t.kennung), ['housing.x']);
});

test('[BMJ-Abgleich] der Quellenhinweis nennt jeden Bereich, den das Werkzeug als gedeckt behandelt', () => {
  for (const b of T.BEREICHE_MIT_HINWEIS) assert.ok(QUELLENHINWEIS.includes(b), b);
});

test('[BMJ-Abgleich] die Texte unter tests/fixtures/ sind da, und das Feldregister von heute hat keinen ungedeckten Treffer', () => {
  const texte = T.bmjTexteIn();
  assert.ok(texte.length >= 4, 'BMJ-Texte: ' + texte.map((t) => t.quelle).join(', '));
  const W = require('../tools/feldregister-bauen.js');
  const felder = JSON.parse(W.bauen({ datum: '2026-10-09' }).json).felder;
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const r = T.abgleichen({ felder, texte: texte.concat([{ quelle: 'PV_BMJ', text: T.pvBmjAusKern(kern) }]) });
  assert.ok(r.treffer.length > 0, 'Positivkontrolle: die bekannten Überschriften der Formulare werden gefunden');
  assert.deepEqual(r.ausserhalbHinweis.map((t) => t.kennung + ' „' + t.label + '“'), []);
  // Ein eingeordneter Eintrag, der nicht mehr trifft, wird gestrichen statt mitgeschleppt.
  for (const k of Object.keys(T.BEKANNT_AUSSERHALB)) assert.ok(r.treffer.some((t) => t.kennung === k), 'veraltet: ' + k);
});
