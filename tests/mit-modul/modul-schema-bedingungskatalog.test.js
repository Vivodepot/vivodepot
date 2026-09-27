'use strict';
/* Rot-Beweis: je Richtung im Helfer (gleichlaufProben, Test „·Rot-Beweis“) an einem verfälschten Schema. */
/* Gleichlauf docs/bedingungskatalog-modul/bedingungskatalog-modul-schema.json ↔ bedingungskatalogModulPruefen.
   Regeln und Begründung: tests/mit-modul/helfer/modul-schema-gleichlauf.js. */
const { gleichlaufProben } = require('./helfer/modul-schema-gleichlauf.js');

const eintrag = { kennung: 'SD-BASE', quelle: 'https://example.org/bedingungen/sd-base' };
const basis = { modulTyp: 'bedingungskatalog', moduleVersion: 1, herkunft: 'kammer-x', eintraege: [eintrag] };
const mit = (x) => ({ ...basis, ...x });
const ohne = (k) => { const m = { ...basis }; delete m[k]; return m; };

gleichlaufProben({
  typ: 'bedingungskatalog',
  positiv: [
    ['ein Eintrag', basis],
    ['mehrere Einträge mit beispiel', mit({ eintraege: [
      { kennung: 'PDC-AI', quelle: 'https://example.org/a', beispiel: true },
      { kennung: 'x_1.v-2', quelle: 'HTTPS://Example.org:8443/p?q=1#f', beispiel: false },
      { kennung: ' Rand ', quelle: '  https://nutzer@example.org  ' },
      { kennung: 'IPV6', quelle: 'https://[::1]/pfad mit leerzeichen' },
    ] })],
    ['mit Einlass-Marken', mit({ moduleVersion: 2, appVersion: 'v1', ungeprueft: true, eingelassenAm: '2026-09-26',
      anbieterId: 'a', anbieterIdGeprueft: false })],
  ],
  negativ: [
    ['kein Objekt', null, 'kein-objekt'],
    ['Liste statt Objekt', [eintrag], 'kein-objekt'],
    ['ohne moduleVersion', ohne('moduleVersion'), 'moduleVersion'],
    ['moduleVersion 0', mit({ moduleVersion: 0 }), 'moduleVersion'],
    ['ohne herkunft', ohne('herkunft'), 'herkunft'],
    ['herkunft leer', mit({ herkunft: '' }), 'herkunft'],
    ['ohne eintraege', ohne('eintraege'), 'eintraege'],
    ['eintraege als Objekt', mit({ eintraege: { a: eintrag } }), 'eintraege'],
    ['eintraege leer', mit({ eintraege: [] }), 'eintraege'],
    ['nur http-Quelle', mit({ eintraege: [{ kennung: 'A', quelle: 'http://example.org' }] }), 'eintraege'],
    ['Quelle ohne Host', mit({ eintraege: [{ kennung: 'A', quelle: 'https://' }] }), 'eintraege'],
    ['Quelle mit Leerzeichen im Host', mit({ eintraege: [{ kennung: 'A', quelle: 'https://a b' }] }), 'eintraege'],
    ['Quelle mit Buchstaben-Port', mit({ eintraege: [{ kennung: 'A', quelle: 'https://a:xy' }] }), 'eintraege'],
    ['Kennung beginnt mit Strich', mit({ eintraege: [{ kennung: '-a', quelle: 'https://example.org' }] }), 'eintraege'],
    ['Kennung zu lang', mit({ eintraege: [{ kennung: 'x'.repeat(65), quelle: 'https://example.org' }] }), 'eintraege'],
    ['Eintrag kein Objekt', mit({ eintraege: ['SD-BASE'] }), 'eintraege'],
  ],
});
