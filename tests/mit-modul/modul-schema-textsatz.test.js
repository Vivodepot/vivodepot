'use strict';
/* Rot-Beweis: je Richtung im Helfer (gleichlaufProben, Test „·Rot-Beweis“) an einem verfälschten Schema. */
/* Gleichlauf docs/textsatz-modul/textsatz-modul-schema.json ↔ textsatzModulPruefen.
   Regeln und Begründung: tests/mit-modul/helfer/modul-schema-gleichlauf.js. */
const { gleichlaufProben } = require('./helfer/modul-schema-gleichlauf.js');

const basis = { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'it', texte: { 'mobility.label': 'Mobilità e viaggi' } };
const mit = (x) => ({ ...basis, ...x });
const ohne = (k) => { const m = { ...basis }; delete m[k]; return m; };

gleichlaufProben({
  typ: 'textsatz',
  positiv: [
    ['mit bekannter Kennung', basis],
    ['mit vollem Regeln-Kopf', mit({ regeln: { schreibrichtung: 'rtl', datumsformat: 'JJJJ-MM-TT', dezimaltrenner: '.',
      tausendertrenner: ',', waehrung: 'CHF', sprachkennung: 'it-CH' } })],
    ['mit Rechtsraum und Einlass-Marken', mit({ rechtsraum: 'CH', appVersion: 'v1', ungeprueft: true,
      eingelassenAm: '2026-09-26T00:00:00Z', anbieterId: 'a', anbieterIdGeprueft: false })],
    ['Rechtsraum null', mit({ rechtsraum: null })],
  ],
  negativ: [
    ['kein Objekt', null, 'kein-objekt'],
    ['ohne sprache', ohne('sprache'), 'sprache'],
    ['sprache leer', mit({ sprache: '  ' }), 'sprache'],
    ['sprache de', mit({ sprache: 'de' }), 'reserviert'],
    ['sprache " DE" (normalisiert reserviert)', mit({ sprache: ' DE' }), 'reserviert'],
    ['ohne moduleVersion', ohne('moduleVersion'), 'moduleVersion'],
    ['moduleVersion 0', mit({ moduleVersion: 0 }), 'moduleVersion'],
    ['moduleVersion 1.5', mit({ moduleVersion: 1.5 }), 'moduleVersion'],
    ['ohne texte', ohne('texte'), 'texte'],
    ['texte ist Text', mit({ texte: 'x' }), 'texte'],
  ],
  nurKern: {
    leer: 'Ob eine Kennung dem Kern bekannt ist, hängt am laufenden Textbestand (Sprachbasis, Modulfelder, Bereiche) — das Schema kennt ihn nicht. Bleibt von den Texten nichts übrig, lehnt der Kern ab.',
  },
  nurKernFaelle: [
    ['nur unbekannte Kennungen', mit({ texte: { 'gibt.es.nicht': 'x' } }), 'leer'],
  ],
});
