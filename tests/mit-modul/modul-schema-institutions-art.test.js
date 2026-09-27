'use strict';
/* Rot-Beweis: je Richtung im Helfer (gleichlaufProben, Test „·Rot-Beweis“) an einem verfälschten Schema. */
/* Gleichlauf docs/institutions-art-modul/institutions-art-modul-schema.json ↔ institutionsArtModulPruefen.
   Regeln und Begründung: tests/mit-modul/helfer/modul-schema-gleichlauf.js. */
const { gleichlaufProben } = require('./helfer/modul-schema-gleichlauf.js');

const basis = { modulTyp: 'institutionsArt', moduleVersion: 1, sprache: 'fr', arten: { notaire: 'Notariat' } };
const mit = (x) => ({ ...basis, ...x });
const ohne = (k) => { const m = { ...basis }; delete m[k]; return m; };

gleichlaufProben({
  typ: 'institutionsArt',
  positiv: [
    ['eine Art mit Sprache', basis],
    ['mehrere Arten, Sprache mit Region und Rand', mit({ sprache: ' de-AT ', arten: { notaire: 'Notariat', kammer: 'Kammer' } })],
    ['leere Arten ohne Sprache', (() => { const m = mit({ arten: {} }); delete m.sprache; return m; })()],
    ['mit Herkunft und Einlass-Marken', mit({ herkunft: 'kammer-x', moduleVersion: 2, appVersion: 'v1', ungeprueft: true,
      eingelassenAm: '2026-09-26', anbieterId: 'a', anbieterIdGeprueft: false })],
  ],
  negativ: [
    ['kein Objekt', null, 'kein-objekt'],
    ['Zahl statt Objekt', 5, 'kein-objekt'],
    ['ohne moduleVersion', ohne('moduleVersion'), 'moduleVersion'],
    ['moduleVersion 0', mit({ moduleVersion: 0 }), 'moduleVersion'],
    ['moduleVersion 1.5', mit({ moduleVersion: 1.5 }), 'moduleVersion'],
    ['ohne arten', ohne('arten'), 'arten'],
    ['arten ist Text', mit({ arten: 'x' }), 'arten'],
    ['arten null', mit({ arten: null }), 'arten'],
    ['Beschriftung ohne Sprache', ohne('sprache'), 'sprache'],
    ['Sprache leer', mit({ sprache: '  ' }), 'sprache'],
    ['Sprache in falscher Form', mit({ sprache: 'FR' }), 'sprache-form'],
  ],
});
