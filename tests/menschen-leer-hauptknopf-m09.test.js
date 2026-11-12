'use strict';
/* Befund M09 (HOCH, Vorschau v998, kein Weg weiter): in „Meine Menschen“, Abschnitt „Menschen“, stand unter dem Erklärtext nur klein
   „nicht hinterlegt“. Es gab keinen Knopf, um eine Person anzulegen, obwohl das der Kern der Seite ist.
   Jetzt gilt: ein leeres Register zeigt statt des Leer-Worts den Hauptknopf „+ Person hinzufügen“ (Klasse `btn`, nicht `btn-sek`), auch in
   der Vorschau; dort trägt er den Bereich, damit der Weg nach dem Anlegen des Depots dorthin zurückführt. Ohne Schreibrecht außerhalb der
   Vorschau (Lese-Sicht) bleibt es beim Leer-Wort ohne Knopf. Rot-Beweis: das Register davor fällt durch. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function register(html) {
  const i = html.indexOf('data-menschen-register="1"');
  assert.ok(i >= 0, 'Vorbedingung: das Register steht in der Seite');
  return html.slice(i, html.indexOf('</div>', html.indexOf('</button>', i) >= 0 ? html.indexOf('</button>', i) : i) + 6);
}

function funde(reg, STRINGS) {
  const aus = [];
  if (!/<button type="button" class="btn" data-person-hinzufuegen="1"/.test(reg)) aus.push('kein Hauptknopf „' + STRINGS.refmPersonHinzufuegen + '“');
  if (reg.includes('<p class="leer">')) aus.push('das Leer-Wort steht noch da');
  return aus;
}

test('[M09] Vorschau: das leere Register zeigt den Hauptknopf „+ Person hinzufügen“ mit Bereich, kein Leer-Wort', () => {
  const { V, document } = ladeKern();
  V.vorschauDepotErzeugen();
  V.renderSektor('people');
  const reg = register(document.getElementById('content').innerHTML);
  assert.deepEqual(funde(reg, V.STRINGS), []);
  assert.match(reg, /data-sektor="people"/, 'der Knopf kennt den Bereich');
});

test('[M09] ohne Schreibrecht außerhalb der Vorschau bleibt das Leer-Wort, ohne Knopf', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Pruefpasswort-M09-lang-genug!');
  V.setData(Object.assign(V.getData(), { menschen: [] }));
  const reg = V.menschenRegisterHTML(false, 'people');
  assert.ok(reg.includes('<p class="leer">') && !reg.includes('data-person-hinzufuegen'), reg.slice(0, 200));
});

test('[M09·Rot-Beweis] das Register davor (Vorschau, ohne Schreibrecht) fällt durch', () => {
  const { V } = ladeKern();
  const alt = '<div class="feld-liste menschen-register" data-menschen-register="1"><p class="leer">' + V.STRINGS.leerZustand + '</p></div>';
  const fu = funde(alt, V.STRINGS);
  assert.equal(fu.length, 2, fu.join(' | '));
});
