'use strict';
/* Rot-Beweis: je Richtung im Helfer (gleichlaufProben, Test „·Rot-Beweis“) an einem verfälschten Schema. */
/* Gleichlauf docs/lokales-modell-modul/lokales-modell-modul-schema.json ↔ lokalesModellModulPruefen (KI-Andockpunkt).
   Regeln und Begründung: tests/mit-modul/helfer/modul-schema-gleichlauf.js. */
const { gleichlaufProben } = require('./helfer/modul-schema-gleichlauf.js');

const HASH = 'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const basis = { modulTyp: 'lokalesModell', moduleVersion: 1, id: 'zz-probe', label: 'Probe-Modell', sprache: 'de', modellHash: HASH, herkunft: 'probe' };
const mit = (x) => ({ ...basis, ...x });
const ohne = (k) => { const m = { ...basis }; delete m[k]; return m; };

gleichlaufProben({
  typ: 'lokalesModell',
  positiv: [
    ['ein Verweis', basis],
    ['ohne herkunft und modulTyp', ohne('herkunft')],
    ['Sprache mit Region', mit({ sprache: 'en-GB' })],
    ['mit Einlass-Marken', mit({ appVersion: 'v1', ungeprueft: false, eingelassenAm: '2026-10-29', anbieterId: 'a', anbieterIdGeprueft: true, pruefstufe: 'intern' })],
  ],
  negativ: [
    ['kein Objekt', null, 'kein-objekt'],
    ['mit Adresse', mit({ downloadUrl: 'https://example.org/m.gguf' }), 'unbekannter-schluessel'],
    ['mit Modelldaten', mit({ bytes: 'AAAA' }), 'unbekannter-schluessel'],
    ['ohne moduleVersion', ohne('moduleVersion'), 'moduleVersion'],
    ['moduleVersion 0', mit({ moduleVersion: 0 }), 'moduleVersion'],
    ['ohne id', ohne('id'), 'id'],
    ['id mit Großbuchstaben', mit({ id: 'ZZ' }), 'id'],
    ['ohne label', ohne('label'), 'label'],
    ['label nur Leerzeichen', mit({ label: '   ' }), 'label'],
    ['label zu lang', mit({ label: 'x'.repeat(121) }), 'label'],
    ['ohne Prüfsumme', ohne('modellHash'), 'modellHash'],
    ['Prüfsumme in Großbuchstaben', mit({ modellHash: HASH.toUpperCase() }), 'modellHash'],
    ['Prüfsumme ohne Kennung', mit({ modellHash: HASH.slice(7) }), 'modellHash'],
    ['Prüfsumme mit anderer Kennung', mit({ modellHash: 'sha384:' + HASH.slice(7) }), 'modellHash'],
    ['Prüfsumme in SRI-Form', mit({ modellHash: 'sha256-ASNFZ4mrze8BI0VniavN7wEjRWeJq83vASNFZ4mrze8=' }), 'modellHash'],
    ['ohne Sprache', ohne('sprache'), 'sprache'],
    ['Sprache in falscher Form', mit({ sprache: 'Deutsch' }), 'sprache-form'],
  ],
});
