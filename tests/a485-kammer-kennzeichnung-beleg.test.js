'use strict';
/* ════════════════════════════════════════════════════════════════════════
   A485 (Laufzettel Nacht 22./23.08.2026, Posten 19, letzter der Strecke) —
   der Beleg, den die Entscheidung vom 22.08.2026 zur A485-Zeile
   verlangt:

     "entschieden ist die KENNZEICHNUNG, dass eine Angabe aus einem Modul
     stammt und nicht geprüft ist. Der Fachinhalt jedes Landes nicht."

   `tests/persona-p14-p18.test.js` misst P18 (Kammer liefert ein Bereichs-
   modul, zieht es zurück, `bereicheVerwaist` trägt) als ganzen Weg — aber
   NICHT, ob die Bürgerin währenddessen sieht, dass die vier Werte aus
   einem ungeprüften Modul stammen. Diese Datei misst genau das.

   Befund vorweg (kein Bau nötig): die Kennzeichnung existiert bereits, und
   zwar generisch für ALLE fünf Einlass-Register — `eingelasseneModule()`
   (gebaut mit Glied 5, A271) liest `ungeprueft === true` über jedes
   Register hinweg, und `einstellungenHTML()` rendert daraus einen
   sichtbaren Hinweis ("Eingelassene Erweiterungen … Niemand hat sie
   geprüft"). Ein Kammer-Bereichsmodul geht über exakt denselben
   `modulEinlassen`-Weg ein wie jedes andere Modul (s.
   `tests/fixtures/persona-p18.js:70`) — es bekommt dieselbe Kennzeichnung,
   ohne dass diese Datei je den Fall "bereich" geprüft hätte. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function frisch() {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  return V;
}

test('[A485·Beleg] ein Kammer-Bereichsmodul erscheint in der sichtbaren Kennzeichnung — Datenweg', () => {
  const V = frisch();
  const d = V.getData();
  const modul = {
    modulTyp: 'bereich', herkunft: 'kammer-p18-beleg', sprache: 'de', moduleVersion: 1,
    bereiche: { 'zz-kammerbereich': { label: 'Kammer-Testbereich', felder: {} } },
  };
  const ergebnis = V.modulEinlassen(JSON.stringify(modul), d);
  assert.equal(ergebnis.angenommen, true, 'Kammer-Modul wird angenommen: ' + ergebnis.grund);
  V.setData(d);
  V._bereichsModuleAusDepotAnmelden(V.getData());

  const offen = V.eingelasseneModule();
  assert.ok(offen.some(m => m.typ === 'bereich' && m.kennung === 'kammer-p18-beleg'),
    'das Kammer-Bereichsmodul muss in der Liste der ungeprüften Module erscheinen');
});

test('[A485·Beleg] … und im tatsächlich gerenderten Einstellungen-HTML, nicht nur im Datenweg', () => {
  const V = frisch();
  const d = V.getData();
  const modul = {
    modulTyp: 'bereich', herkunft: 'kammer-p18-beleg', sprache: 'de', moduleVersion: 1,
    bereiche: { 'zz-kammerbereich': { label: 'Kammer-Testbereich', felder: {} } },
  };
  V.modulEinlassen(JSON.stringify(modul), d);
  V.setData(d);
  V._bereichsModuleAusDepotAnmelden(V.getData());

  const html = V.einstellungenHTML();
  assert.ok(html.includes('kammer-p18-beleg'),
    'die Kennung des Kammer-Moduls muss im gerenderten Einstellungen-Text stehen');
  assert.ok(html.includes(V.STRINGS.moduleUngeprueftHinweis),
    'der "niemand hat es geprüft"-Hinweis muss neben dem Kammer-Modul stehen');
});

test('[A485·Rot-Beweis] ohne ein eingelassenes Modul entfällt der ganze Abschnitt — der Hinweis ist also an den Zustand gebunden', () => {
  const V = frisch();
  const html = V.einstellungenHTML();
  assert.ok(!html.includes('einst-modulliste'),
    'ohne eingelassenes Modul gibt es keine Modul-Liste zu zeigen');
});
