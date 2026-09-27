'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   textsatz-en-platzhalter-pruefen.test.js — Rot-Beweis für den Platzhalter-
   Treue-Wächter (27.08.2026, tools/textsatz-en-platzhalter-pruefen.js)
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { platzhalter, platzhalterVerstoesse } = require('../tools/textsatz-en-platzhalter-pruefen.js');

test('[Platzhalter-Treue] extrahiert {xxx}-Token, ignoriert Klammerhinweise wie (Datum)', () => {
  assert.deepEqual(platzhalter("Es gibt {n} Einträge am (Datum)."), ['{n}']);
  assert.deepEqual(platzhalter('kein Platzhalter hier'), []);
});

test('[Platzhalter-Treue] ein Text mit demselben Platzhalter zweimal braucht ihn auch zweimal in der Übersetzung', () => {
  const de = { k: '{n} von {n} erledigt' };
  const okay = { k: '{n} of {n} done' };
  const kaputt = { k: '{n} of 3 done' };
  assert.deepEqual(platzhalterVerstoesse(de, okay), []);
  assert.equal(platzhalterVerstoesse(de, kaputt).length, 1);
});

test('[Platzhalter-Treue·Rot] ein übersetzter, umformulierter oder fehlender Platzhalter wird gefunden', () => {
  const de = { a: 'Sie haben {n} neue Nachrichten.' };
  assert.equal(platzhalterVerstoesse(de, { a: 'You have {n} new messages.' }).length, 0, 'Gegenprobe: treu bleibt grün');
  assert.equal(platzhalterVerstoesse(de, { a: 'You have {count} new messages.' }).length, 1, 'anderer Name = Verstoß');
  assert.equal(platzhalterVerstoesse(de, { a: 'You have new messages.' }).length, 1, 'weggelassen = Verstoß');
});

test('[Platzhalter-Treue] eine Kennung, die in der Übersetzung fehlt, ist KEIN Platzhalter-Verstoß (eigene Prüfung)', () => {
  const de = { a: '{n} Stück', b: 'kein Platzhalter' };
  assert.deepEqual(platzhalterVerstoesse(de, { b: 'no placeholder' }), [],
    'Vollständigkeit ist eine andere Zusicherung als Platzhalter-Treue');
});
