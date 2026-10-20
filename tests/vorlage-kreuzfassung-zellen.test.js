'use strict';
/* vorlage-kreuzfassung-zellen.test.js — die Zellen der Kreuzfassungs-Messung am Kern dieses Stands (12.10.2026)
   Der Kern dieses Stands liest `formatFassung` und `nutzlastTyp`. Er muss darum jede Zelle so beantworten, wie die
   Erwartung „mit Leser“ es sagt: Neueres wird erkannt und als Ganzes abgewiesen, Altes bleibt lesbar, und was ein Kern
   ohne Leser falsch läse (beide Feldquellen, falsches Typfeld), fällt hier.
   Die Zellen selbst stehen in tools/lib/vorlage-kreuzfassung.js; dieselben Zellen laufen an anderer Stelle gegen Kerne
   ohne Leser. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ZELLEN, kernMessen, NUTZLAST_TYP, FELDQUELLE_BRECHEND } = require('../tools/lib/vorlage-kreuzfassung.js');

test('[Vorlage·Kreuzfassung·Zellen] jede Zelle hat einen eigenen Namen, eine Vorlage und zwei Erwartungen; beide Sorten Kern unterscheiden sich', () => {
  const namen = ZELLEN.map((z) => z[0]);
  assert.equal(new Set(namen).size, namen.length);
  assert.ok(ZELLEN.length >= 12, 'Ausbeute: ' + ZELLEN.length);
  for (const [name, bauen, ohne, mit] of ZELLEN) {
    assert.equal(typeof bauen(), 'object', name);
    assert.notEqual(bauen(), bauen(), name + ': jede Messung bekommt ein eigenes Objekt');
    for (const e of [ohne, mit]) assert.ok(e === 'angenommen' || e === 'abgewiesen', name);
    // Ein Kern mit Leser nimmt nie an, was einer ohne Leser abweist: Lesen lernen macht nichts Altes ungültig, und nichts Abgewiesenes gültig.
    assert.ok(!(ohne === 'abgewiesen' && mit === 'angenommen'), name);
  }
  assert.ok(ZELLEN.some(([, , ohne, mit]) => ohne !== mit), 'mindestens eine Zelle trennt die beiden Sorten');
  assert.equal(NUTZLAST_TYP, 'vivodepot-vorlage');
  // Der Platzhalter für die Feldquelle einer brechenden Fassung ist nicht `felder` und beginnt nicht mit einem Namen, den eine Vorlage heute trägt.
  assert.ok(FELDQUELLE_BRECHEND !== 'felder' && !['wortlaut', 'codeListen', 'dokument'].includes(FELDQUELLE_BRECHEND));
});

test('[Vorlage·Kreuzfassung·Kern dieses Stands] der Kern beantwortet jede Zelle wie ein Kern mit Leser', () => {
  const { V } = ladeKern();
  const m = kernMessen(V, 'mitLeser');
  assert.deepEqual(m.filter((z) => !z.passt).map((z) => z.zelle + ': erwartet ' + z.erwartet + ', gemessen ' + z.urteil + ' (' + z.grund + ')'), []);
  // Eine höhere Fassung wird benannt: der Grund sagt, dass die Vorlage zu neu ist, nicht, dass sie fehlerhaft ist.
  const zuNeu = m.find((z) => z.zelle === 'höhere Fassung, die nicht bricht');
  assert.match(String(zuNeu.grund), /neu/i);
});

test('[Vorlage·Kreuzfassung·Rot-Beweis] ein Kern ohne Leser bestünde die Erwartung „mit Leser“ nicht, und umgekehrt', () => {
  // Nachbildung der Strukturprüfung vor dem Leser: nur die Feldliste zählt.
  const ohneLeser = { validateTemplate: (t) => (Array.isArray(t.felder) && t.felder.length && t.felder.every((f) => f.feldtyp === 'text') ? null : 'felder fehlt oder ist leer') };
  assert.deepEqual(kernMessen(ohneLeser, 'ohneLeser').filter((z) => !z.passt), []);
  const alsMitLeser = kernMessen(ohneLeser, 'mitLeser').filter((z) => !z.passt).map((z) => z.zelle);
  for (const name of ['höhere Fassung, die nicht bricht', 'beide Feldquellen zugleich', 'Typfeld mit anderem Wert']) assert.ok(alsMitLeser.includes(name), name);
  assert.throws(() => kernMessen(ohneLeser, 'irgendwie'), /Sorte/);
  assert.throws(() => kernMessen({}, 'mitLeser'), /keine Strukturprüfung/);
});
