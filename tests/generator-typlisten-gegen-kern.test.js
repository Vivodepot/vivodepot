'use strict';
/* Der Template-Generator trägt zwei Listen von Typ-Codes, die der Kern ebenfalls führt:
     RECHTSRAUM_TYPEN_BEKANNT   (Generator)  ↔  _RECHTSRAUM_TYP_SCHLUESSEL   (Kern)
     KERN_TORWAECHTER.ENTITAET_BEKANNT (Generator, erzeugt)  ↔  _TEMPLATE_ENTITAET_BEKANNT (Kern)
   Beide Seiten sind Handkopien beziehungsweise Zeilen im Erzeuger; ein neuer oder umbenannter Typ im Kern
   fehlte im Generator still. Der Wächter prüft beide Richtungen: kein Typ im Kern ohne Zeile im Generator,
   keine Zeile im Generator ohne Typ im Kern. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeGenerator } = require('./load-generator.js');

function abweichung(kern, generator) {
  const k = new Set(kern), g = new Set(generator);
  return {
    nurImKern: [...k].filter((x) => !g.has(x)).sort(),
    nurImGenerator: [...g].filter((x) => !k.has(x)).sort(),
  };
}
const gleich = { nurImKern: [], nurImGenerator: [] };

test('[Generator·Typlisten] Rechtsraum-Typen des Generators == Typen, auf die der Kern verzweigt', () => {
  const { V } = ladeKern();
  const G = ladeGenerator().V;
  assert.ok(Array.isArray(V._RECHTSRAUM_TYP_SCHLUESSEL) && V._RECHTSRAUM_TYP_SCHLUESSEL.length > 0, 'Kern-Liste lesbar');
  assert.ok(Array.isArray(G.RECHTSRAUM_TYPEN_BEKANNT) && G.RECHTSRAUM_TYPEN_BEKANNT.length > 0, 'Generator-Liste lesbar');
  assert.deepEqual(abweichung(V._RECHTSRAUM_TYP_SCHLUESSEL, G.RECHTSRAUM_TYPEN_BEKANNT), gleich);
});

test('[Generator·Typlisten] Entitäten des Generators == Entitäten, die der Kern im Template zulässt', () => {
  const { V } = ladeKern();
  const G = ladeGenerator().V;
  const gen = G.KERN_TORWAECHTER && G.KERN_TORWAECHTER.ENTITAET_BEKANNT;
  assert.ok(Array.isArray(V._TEMPLATE_ENTITAET_BEKANNT) && V._TEMPLATE_ENTITAET_BEKANNT.length > 0, 'Kern-Liste lesbar');
  assert.ok(Array.isArray(gen) && gen.length > 0, 'Generator-Liste lesbar');
  assert.deepEqual(abweichung(V._TEMPLATE_ENTITAET_BEKANNT, gen), gleich);
});

test('[Generator·Typlisten·Rot-Beweis] ein Typ nur im Kern und ein Typ nur im Generator werden beide gefunden', () => {
  assert.deepEqual(abweichung(['a', 'b', 'c'], ['a', 'b']), { nurImKern: ['c'], nurImGenerator: [] });
  assert.deepEqual(abweichung(['a', 'b'], ['a', 'b', 'x']), { nurImKern: [], nurImGenerator: ['x'] });
  assert.deepEqual(abweichung(['a', 'b'], ['a', 'b']), gleich);
});
