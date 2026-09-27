'use strict';
/* Rot-Beweis: je Richtung im Helfer (gleichlaufProben, Test „·Rot-Beweis“) an einem verfälschten Schema. */
/* Gleichlauf docs/design-modul/design-modul-schema.json ↔ designModulPruefen.
   Design hat keinen EINLASS_REGISTER-Eintrag — darum kein Register-Beispiel, die Positivfälle
   stehen hier. Regeln und Begründung: tests/mit-modul/helfer/modul-schema-gleichlauf.js. */
const { gleichlaufProben } = require('./helfer/modul-schema-gleichlauf.js');

gleichlaufProben({
  typ: 'design',
  positiv: [
    ['eine Farbe', { tokens: { '--gold': '#0a0b0c' } }],
    ['je Kategorie ein Token', { tokens: { '--teal': '#1F6B5E', '--fs-xl': '1.4rem', '--space-1': '-4px',
      '--font-inter': ' "Source Sans Pro", sans-serif ', '--shadow-soft': '0 1px 2px rgba(0, 0, 0, .08)' } }],
    ['Schatten mit drei Längen und rgb', { tokens: { '--shadow-strong': '2px 4px 12.5px rgb(10,20,30)' } }],
    ['Schrift an der Längengrenze', { tokens: { '--font-narrativ': 'x'.repeat(100) } }],
  ],
  negativ: [
    ['kein Objekt', null, 'kein-objekt'],
    ['ohne tokens', {}, 'keine-tokens'],
    ['tokens null', { tokens: null }, 'keine-tokens'],
    ['tokens als Liste', { tokens: ['--gold'] }, 'tokens-kein-objekt'],
    ['tokens als Text', { tokens: '--gold' }, 'tokens-kein-objekt'],
    ['tokens leer', { tokens: {} }, 'nichts-gueltiges-gesetzt'],
    ['nur reservierter Token', { tokens: { '--akzent': '#112233' } }, 'nichts-gueltiges-gesetzt'],
    ['nur unbekannter Token', { tokens: { '--frei-erfunden': '#112233' } }, 'nichts-gueltiges-gesetzt'],
    ['kein Token-Name', { tokens: { gold: '#112233' } }, 'nichts-gueltiges-gesetzt'],
    ['Farbe als Schlüsselwort', { tokens: { '--gold': 'gold' } }, 'nichts-gueltiges-gesetzt'],
    ['Länge ohne Einheit', { tokens: { '--fs-xl': '14' } }, 'nichts-gueltiges-gesetzt'],
    ['Schatten mit calc', { tokens: { '--shadow-soft': 'calc(1px) 0 rgba(0,0,0,.1)' } }, 'nichts-gueltiges-gesetzt'],
    ['Schrift zu lang', { tokens: { '--font-inter': 'x'.repeat(101) } }, 'nichts-gueltiges-gesetzt'],
  ],
});
