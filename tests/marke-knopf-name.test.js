'use strict';
/* Name des Marken-Knopfs (WCAG 2.5.3 Label in Name, UX-Durchsicht 03.10.2026, umgesetzt 18.10.2026): das Logo zeigte
   „VIVODEPOT“ und hieß für Bildschirmleser nur „Depot verlassen“; wer per Sprachsteuerung sagt, was er sieht, traf den Knopf
   nicht. Der Name beginnt jetzt mit dem sichtbaren Text der Marke, danach die Aufgabe — bei jeder Marke. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const beginntMitSichtbarem = (name, sichtbar) => String(name).replace(/\s+/g, '').toLowerCase().startsWith(String(sichtbar).replace(/\s+/g, '').toLowerCase());

test('[2.5.3·Marke] sichtbarer Text vorn, danach was der Knopf tut; ohne Text nur die Aufgabe', () => {
  const { V } = ladeKern();
  const verlassen = V.STRINGS.navDepotVerlassen;
  const eingebaut = V._markeKnopfName({ textContent: ' VIVO DEPOT ' });
  assert.ok(eingebaut.endsWith(' – ' + verlassen), eingebaut);
  assert.ok(beginntMitSichtbarem(eingebaut, 'VIVODEPOT'), 'beginnt mit dem sichtbaren Wort: ' + eingebaut);
  assert.equal(V._markeKnopfName({ textContent: 'Stadtwerke Beispielstadt' }), 'Stadtwerke Beispielstadt – ' + verlassen,
    'eine fremde Marke: ihr sichtbarer Text, nicht „Vivodepot“');
  assert.equal(V._markeKnopfName({ textContent: '' }), verlassen);
  assert.equal(V._markeKnopfName(null), verlassen);
});

test('[2.5.3·Kopfzeile] renderTopbar setzt Name und Titel des Logos über _markeKnopfName', () => {
  const stelle = KERN.indexOf("const marke = document.getElementById('tb-marke');");
  assert.ok(stelle > 0);
  const umgebung = KERN.slice(stelle, stelle + 1200);
  assert.match(umgebung, /marke\.setAttribute\('aria-label', _markeKnopfName\(marke\)\)/);
  assert.match(umgebung, /marke\.title = marke\.getAttribute\('aria-label'\)/);
  assert.doesNotMatch(umgebung, /marke\.setAttribute\('aria-label', STRINGS\.navDepotVerlassen\)/);
});

test('[2.5.3·Rot-Beweis] der frühere Name (nur die Aufgabe) enthielt den sichtbaren Text nicht', () => {
  const { V } = ladeKern();
  const frueher = V.STRINGS.navDepotVerlassen;
  assert.equal(beginntMitSichtbarem(frueher, 'VIVODEPOT'), false, 'die alte Fassung fällt an derselben Prüfung');
  assert.equal(beginntMitSichtbarem(V._markeKnopfName({ textContent: 'VIVODEPOT' }), 'VIVODEPOT'), true);
});
