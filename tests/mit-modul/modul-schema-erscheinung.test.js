'use strict';
/* Rot-Beweis: je Richtung im Helfer (gleichlaufProben, Test „·Rot-Beweis“) an einem verfälschten Schema. */
/* Gleichlauf docs/erscheinung-modul/erscheinung-modul-schema.json ↔ erscheinungModulPruefen.
   Regeln und Begründung: tests/mit-modul/helfer/modul-schema-gleichlauf.js. */
const { gleichlaufProben } = require('./helfer/modul-schema-gleichlauf.js');

const basis = { modulTyp: 'erscheinung', moduleVersion: 1, herkunft: 'probe', label: '16px' };
const mit = (x) => ({ ...basis, ...x });
const ohne = (k) => { const m = { ...basis }; delete m[k]; return m; };

gleichlaufProben({
  typ: 'erscheinung',
  positiv: [
    ['eine Rolle', basis],
    ['alle fünf Rollen, alle Einheiten', mit({ wert: '1.125rem', gruppe: '0.9em', abschnitt: '18px', titel: '2.5rem' })],
    ['andere Rolle gesetzt, label null', { moduleVersion: 3, titel: '24px', label: null }],
    ['mit Einlass-Marken', mit({ appVersion: 'v1', ungeprueft: true, eingelassenAm: '2026-09-26T00:00:00Z',
      anbieterId: 'a', anbieterIdGeprueft: false })],
  ],
  negativ: [
    ['kein Objekt', null, 'kein-objekt'],
    ['ohne moduleVersion', ohne('moduleVersion'), 'moduleVersion'],
    ['moduleVersion 0', mit({ moduleVersion: 0 }), 'moduleVersion'],
    ['moduleVersion 1.5', mit({ moduleVersion: 1.5 }), 'moduleVersion'],
    ['moduleVersion als Text', mit({ moduleVersion: '1' }), 'moduleVersion'],
    ['keine Rolle gesetzt', ohne('label'), 'nichts-gueltiges-gesetzt'],
    ['alle Rollen null', mit({ label: null, titel: null }), 'nichts-gueltiges-gesetzt'],
    ['einzige Rolle mit ungültigem Maß', mit({ label: 'calc(1px + 1px)' }), 'nichts-gueltiges-gesetzt'],
    ['einzige Rolle ohne Einheit', mit({ label: '16' }), 'nichts-gueltiges-gesetzt'],
  ],
});
