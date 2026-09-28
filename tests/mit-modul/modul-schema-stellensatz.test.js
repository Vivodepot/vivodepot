'use strict';
/* Rot-Beweis: je Richtung im Helfer (gleichlaufProben, Test „·Rot-Beweis“) an einem verfälschten Schema. */
/* Gleichlauf docs/stellensatz-modul/stellensatz-modul-schema.json ↔ stellensatzModulPruefen.
   Regeln und Begründung: tests/mit-modul/helfer/modul-schema-gleichlauf.js. */
const { gleichlaufProben } = require('./helfer/modul-schema-gleichlauf.js');

const basis = { modulTyp: 'stellensatz', moduleVersion: 1, rechtsraum: 'AT', stellen: { 'identity.dateOfSeparation': 'Bezirksgericht' } };
const mit = (x) => ({ ...basis, ...x });
const ohne = (k) => { const m = { ...basis }; delete m[k]; return m; };

gleichlaufProben({
  typ: 'stellensatz',
  positiv: [
    ['mit bekannter Kennung', basis],
    ['ohne modulTyp, höhere Fassung', (() => { const m = mit({ moduleVersion: 3 }); delete m.modulTyp; return m; })()],
    ['leere Stellen', mit({ stellen: {} })],
    ['Rechtsraum klein geschrieben', mit({ rechtsraum: 'at' })],
    ['mit Einlass-Marken', mit({ appVersion: 'v1', ungeprueft: true, eingelassenAm: '2026-09-26', anbieterId: 'a', anbieterIdGeprueft: false })],
  ],
  negativ: [
    ['kein Objekt', null, 'kein-objekt'],
    ['Text statt Objekt', 'x', 'kein-objekt'],
    ['ohne rechtsraum', ohne('rechtsraum'), 'rechtsraum'],
    ['rechtsraum leer', mit({ rechtsraum: '  ' }), 'rechtsraum'],
    ['rechtsraum Zahl', mit({ rechtsraum: 5 }), 'rechtsraum'],
    ['rechtsraum DE', mit({ rechtsraum: 'DE' }), 'reserviert'],
    ['rechtsraum de (normalisiert reserviert)', mit({ rechtsraum: 'de' }), 'reserviert'],
    ['rechtsraum " DE " (normalisiert reserviert)', mit({ rechtsraum: ' DE ' }), 'reserviert'],
    ['ohne moduleVersion', ohne('moduleVersion'), 'moduleVersion'],
    ['moduleVersion 0', mit({ moduleVersion: 0 }), 'moduleVersion'],
    ['moduleVersion 1.5', mit({ moduleVersion: 1.5 }), 'moduleVersion'],
    ['moduleVersion als Text', mit({ moduleVersion: '1' }), 'moduleVersion'],
    ['ohne stellen', ohne('stellen'), 'stellen'],
    ['stellen ist Text', mit({ stellen: 'x' }), 'stellen'],
    ['stellen null', mit({ stellen: null }), 'stellen'],
  ],
});
