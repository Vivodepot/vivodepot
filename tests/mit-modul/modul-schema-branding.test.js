'use strict';
/* Rot-Beweis: je Richtung im Helfer (gleichlaufProben, Test „·Rot-Beweis“) an einem verfälschten Schema. */
/* Gleichlauf docs/branding-modul/branding-modul-schema.json ↔ brandingModulPruefen.
   Regeln und Begründung: tests/mit-modul/helfer/modul-schema-gleichlauf.js. */
const { gleichlaufProben } = require('./helfer/modul-schema-gleichlauf.js');

const basis = { modulTyp: 'branding', moduleVersion: 1, herkunft: 'probe', farbePrimaer: '#4F6539' };
const mit = (x) => ({ ...basis, ...x });
const ohne = (k) => { const m = { ...basis }; delete m[k]; return m; };
const nur = (x) => ({ moduleVersion: 1, ...x });
const LOGO = 'data:image/png;base64,iVBORw0KGgo=';

gleichlaufProben({
  typ: 'branding',
  positiv: [
    ['nur Hauptfarbe', basis],
    ['alle Felder', mit({ farbeSekundaer: '#8a6d3a', schriftart: 'Source Sans Pro', logo: LOGO, name: 'Sparkasse Musterstadt',
      domain: 'example.org', kontakt: 'hilfe@example.org', aktualisierungen: 'https://example.org/module/' })],
    ['nur Zweitfarbe', nur({ farbeSekundaer: '#aabbcc' })],
    ['nur Schriftart mit Rand-Leerraum', nur({ schriftart: '  Inter  ' })],
    ['nur Logo JPEG', nur({ logo: 'data:image/jpeg;base64,/9j/4AAQ' })],
    ['nur Name', nur({ name: 'Müller & Söhne' })],
    ['nur Domain, Großschreibung', nur({ domain: 'Mein-Anbieter.EXAMPLE.org' })],
    ['nur Kontakt', nur({ kontakt: 'a.b+c@x-y.example' })],
    ['nur Aktualisierungen ohne Pfad', nur({ aktualisierungen: 'HTTPS://example.org' })],
    ['Ab-Werk-Form mit logo null', { modulTyp: 'branding', moduleVersion: 1, herkunft: 'vivodepot', name: 'Vivodepot',
      domain: 'vivodepot.de', farbePrimaer: '#4F6539', farbeSekundaer: '#8a6d3a', schriftart: 'Inter', logo: null }],
    ['Grenzwerte', nur({ schriftart: 'x'.repeat(100), name: 'n'.repeat(200), domain: 'a'.repeat(61) + '.' + 'b'.repeat(38),
      logo: 'data:image/png;base64,' + 'A'.repeat(273066 - 22) })],
    ['mit Einlass-Marken', mit({ appVersion: 'v1', ungeprueft: false, eingelassenAm: '2026-09-26T00:00:00Z',
      anbieterId: 'a', anbieterIdGeprueft: true })],
  ],
  negativ: [
    ['kein Objekt', null, 'kein-objekt'],
    ['ohne moduleVersion', ohne('moduleVersion'), 'moduleVersion'],
    ['moduleVersion 0', mit({ moduleVersion: 0 }), 'moduleVersion'],
    ['moduleVersion 2.5', mit({ moduleVersion: 2.5 }), 'moduleVersion'],
    ['nichts gesetzt', ohne('farbePrimaer'), 'nichts-gueltiges-gesetzt'],
    ['alles null', nur({ farbePrimaer: null, logo: null }), 'nichts-gueltiges-gesetzt'],
    ['Farbe dreistellig', nur({ farbePrimaer: '#abc' }), 'nichts-gueltiges-gesetzt'],
    ['Schriftart leer', nur({ schriftart: '   ' }), 'nichts-gueltiges-gesetzt'],
    ['Schriftart zu lang', nur({ schriftart: 'x'.repeat(101) }), 'nichts-gueltiges-gesetzt'],
    ['Logo SVG', nur({ logo: 'data:image/svg+xml;base64,PHN2Zz4=' }), 'nichts-gueltiges-gesetzt'],
    ['Logo zu groß', nur({ logo: 'data:image/png;base64,' + 'A'.repeat(273066 - 21) }), 'nichts-gueltiges-gesetzt'],
    ['Name mit Markup', nur({ name: '<b>X</b>' }), 'nichts-gueltiges-gesetzt'],
    ['Name mit Zeichenreferenz', nur({ name: 'A &amp; B' }), 'nichts-gueltiges-gesetzt'],
    ['Name zu lang', nur({ name: 'n'.repeat(201) }), 'nichts-gueltiges-gesetzt'],
    ['Domain ohne Punkt', nur({ domain: 'localhost' }), 'nichts-gueltiges-gesetzt'],
    ['Domain zu lang', nur({ domain: 'a'.repeat(61) + '.' + 'b'.repeat(39) }), 'nichts-gueltiges-gesetzt'],
    ['Kontakt ohne @', nur({ kontakt: 'hilfe.example.org' }), 'nichts-gueltiges-gesetzt'],
    ['Aktualisierungen http', nur({ aktualisierungen: 'http://example.org' }), 'nichts-gueltiges-gesetzt'],
  ],
});
