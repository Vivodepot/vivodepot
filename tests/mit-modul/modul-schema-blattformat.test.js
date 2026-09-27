'use strict';
/* Rot-Beweis: je Richtung im Helfer (gleichlaufProben, Test „·Rot-Beweis“) an einem verfälschten Schema. */
/* Gleichlauf docs/blattformat-modul/blattformat-modul-schema.json ↔ blattformatModulPruefen.
   Regeln und Begründung: tests/mit-modul/helfer/modul-schema-gleichlauf.js. */
const { gleichlaufProben } = require('./helfer/modul-schema-gleichlauf.js');

const basis = { modulTyp: 'blattformat', moduleVersion: 1, herkunft: 'kanzlei-x', format: 'a4' };
const mit = (x) => ({ ...basis, ...x });
const ohne = (k) => { const m = { ...basis }; delete m[k]; return m; };

gleichlaufProben({
  typ: 'blattformat',
  positiv: [
    ['a4', basis],
    ['Letter groß geschrieben', mit({ format: 'Letter' })],
    ['government-letter mit Rand', mit({ format: ' GOVERNMENT-LETTER ' })],
    ['a3, a5, legal', mit({ format: 'legal' })],
    ['a5', mit({ format: 'A5' })],
    ['a3', mit({ format: 'a3' })],
    ['mit Rechtsraum', mit({ rechtsraum: 'US' })],
    ['Rechtsraum null', mit({ rechtsraum: null })],
    ['Rechtsraum leer', mit({ rechtsraum: '' })],
    ['mit Einlass-Marken', mit({ moduleVersion: 4, appVersion: 'v1', ungeprueft: true, eingelassenAm: '2026-09-26',
      anbieterId: 'a', anbieterIdGeprueft: false })],
  ],
  negativ: [
    ['kein Objekt', null, 'kein-objekt'],
    ['Text statt Objekt', 'a4', 'kein-objekt'],
    ['ohne moduleVersion', ohne('moduleVersion'), 'moduleVersion'],
    ['moduleVersion 0', mit({ moduleVersion: 0 }), 'moduleVersion'],
    ['moduleVersion 2.5', mit({ moduleVersion: 2.5 }), 'moduleVersion'],
    ['ohne herkunft', ohne('herkunft'), 'herkunft'],
    ['herkunft leer', mit({ herkunft: ' ' }), 'herkunft'],
    ['herkunft Zahl', mit({ herkunft: 5 }), 'herkunft'],
    ['ohne format', ohne('format'), 'format'],
    ['unbekanntes Format', mit({ format: 'b5' }), 'format'],
    ['Format mit Leerzeichen innen', mit({ format: 'a 4' }), 'format'],
    ['Format Zahl', mit({ format: 4 }), 'format'],
  ],
});
