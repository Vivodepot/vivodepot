'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Zusicherung, kein Unfall (Auflage 3, Schnitt 17.09.2026): das
   nackte Gerüst (ladeKern({ blank: true }), kein modulPfade-Bake) trägt
   NULL Bereiche. AB_WERK_BEREICH_QUELLEN ist im nativen Gerüst leer — ein
   konfektioniertes Produkt füllt sie, das Gerüst selbst nie. Ohne diesen
   Wächter könnte sich Inhalt unbemerkt zurück ins Gerüst schleichen (genau
   der Zustand vor dem Schnitt: BUERGERMODUL_BUENDEL trug die dreizehn
   nativen Bereiche fest eingebettet). `ladeKern()` OHNE `blank` liefert seit
   demselben Schnitt das Standard-Produkt (privat-de) — das ist der
   Gegenstand von tests/load-kern.js selbst, hier bewusst NICHT wiederholt,
   sondern nur die Gegenprobe: das nackte Gerüst bleibt nackt. ════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Rot-Beweis] das nackte Gerüst (blank:true) trägt null Bereiche', () => {
  const { V } = ladeKern({ blank: true });
  assert.equal(V.bereicheAlle().length, 0,
    'AB_WERK_BEREICH_QUELLEN muss im nativen Gerüst leer bleiben — Inhalt gehört ins Produkt, nicht ins Gerüst');
});

test('[Gegenprobe] ladeKern() OHNE blank liefert das befüllte Standard-Produkt, nicht das nackte Gerüst', () => {
  const { V } = ladeKern();
  assert.equal(V.bereicheAlle().length, 13,
    'ohne blank:true muss privat-de (dreizehn native Templates) gebacken sein — sonst prüft die restliche Suite wieder unbemerkt das nackte Gerüst');
});
