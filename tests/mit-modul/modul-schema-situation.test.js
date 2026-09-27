'use strict';
/* Rot-Beweis: je Richtung im Helfer (gleichlaufProben, Test „·Rot-Beweis“) an einem verfälschten Schema. */
/* Gleichlauf docs/situation-modul/situation-modul-schema.json ↔ situationsModulPruefen.
   Regeln und Begründung: tests/mit-modul/helfer/modul-schema-gleichlauf.js. */
const { gleichlaufProben } = require('./helfer/modul-schema-gleichlauf.js');

const basis = { modulTyp: 'situation', moduleVersion: 1, herkunft: 'probe', sprache: 'de',
  situationen: { 'zz-probe': { titel: 'Probe' } } };
const mit = (x) => ({ ...basis, ...x });
const ohne = (k) => { const m = { ...basis }; delete m[k]; return m; };
const sit = (s) => mit({ situationen: { 'zz-probe': s } });

gleichlaufProben({
  typ: 'situation',
  positiv: [
    ['nur Titel', basis],
    ['mit Symbol und Blöcken', sit({ titel: 'Probe', icon: 'star',
      bloecke: [{ id: 'b1', titel: 'Block', eintraege: [{ quelle: 'identity', feld: 'givenName' }] }, { eintraege: [] }] })],
    ['Blöcke leer', sit({ titel: 'Probe', bloecke: [] })],
    ['mehrere Situationen, Sprache mit Region und Leerraum', mit({ sprache: ' en-GB ',
      situationen: { 'zz-a': { titel: 'A' }, 'zz-b-2': { titel: 'B', icon: '  ' } } })],
    ['ohne modulTyp, mit Einlass-Marken', { ...ohne('modulTyp'), appVersion: 'v1', ungeprueft: true,
      eingelassenAm: '2026-09-26T00:00:00Z', anbieterId: 'a', anbieterIdGeprueft: false }],
  ],
  negativ: [
    ['kein Objekt', null, 'kein-objekt'],
    ['ohne moduleVersion', ohne('moduleVersion'), 'moduleVersion'],
    ['moduleVersion 0', mit({ moduleVersion: 0 }), 'moduleVersion'],
    ['moduleVersion 1.5', mit({ moduleVersion: 1.5 }), 'moduleVersion'],
    ['ohne herkunft', ohne('herkunft'), 'herkunft'],
    ['herkunft leer', mit({ herkunft: ' ' }), 'herkunft'],
    ['ohne situationen', ohne('situationen'), 'situationen'],
    ['situationen ist Liste', mit({ situationen: [{ titel: 'x' }] }), 'situationen'],
    ['ohne sprache', ohne('sprache'), 'sprache'],
    ['sprache leer', mit({ sprache: ' ' }), 'sprache'],
    ['sprache Großbuchstaben', mit({ sprache: 'DE' }), 'sprache-form'],
    ['situationen leer', mit({ situationen: {} }), 'leer'],
    ['Kennung mit Großbuchstaben', mit({ situationen: { 'ZZ-probe': { titel: 'x' } } }), 'leer'],
    ['Kennung einbuchstabig', mit({ situationen: { z: { titel: 'x' } } }), 'leer'],
    ['Situation mit leerem Titel', mit({ sprache: 'de', situationen: { 'zz-probe': { titel: '' } } }), 'leer'],
    ['Situation kein Objekt', mit({ situationen: { 'zz-probe': 'x' } }), 'leer'],
    ['bloecke kein Array', sit({ titel: 'x', bloecke: {} }), 'leer'],
    ['Block ohne eintraege', sit({ titel: 'x', bloecke: [{ id: 'b' }] }), 'leer'],
    ['Eintrag mit Feld-Objekt', sit({ titel: 'x', bloecke: [{ eintraege: [{ quelle: 'identity', feld: { id: 'y' } }] }] }), 'leer'],
  ],
  nurKern: {
    leer: 'Ob eine Kennung schon von einer eingebauten Situation belegt ist, hängt am laufenden Situationsbestand des Kerns — das Schema kennt ihn nicht. Belegte Kennungen verwirft der Kern; bleibt nichts übrig, lehnt er ab.',
  },
  nurKernFaelle: [
    ['nur eingebaute Kennung', mit({ situationen: { geburt: { titel: 'Geburt' } } }), 'leer'],
  ],
});
