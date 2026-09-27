'use strict';
/* Rot-Beweis: je Richtung im Helfer (gleichlaufProben, Test „·Rot-Beweis“) an einem verfälschten Schema. */
/* Gleichlauf docs/angehoerigen-vorlage-modul/angehoerigen-vorlage-modul-schema.json ↔ angehoerigenVorlagePruefen.
   Regeln und Begründung: tests/mit-modul/helfer/modul-schema-gleichlauf.js. */
const { gleichlaufProben } = require('./helfer/modul-schema-gleichlauf.js');

const blatt = { titel: 'Probe', bloecke: [{ id: 'b1', titel: 'Block', eintraege: [{ quelle: 'identity', feld: 'givenName' }] }] };
const basis = { modulTyp: 'angehoerigenVorlage', moduleVersion: 1, herkunft: 'probe', sprache: 'de',
  situationen: { 'sit-probe': blatt } };
const mit = (x) => ({ ...basis, ...x });
const ohne = (k) => { const m = { ...basis }; delete m[k]; return m; };
const b = (x) => mit({ situationen: { 'sit-probe': { ...blatt, ...x } } });

gleichlaufProben({
  typ: 'angehoerigenVorlage',
  positiv: [
    ['nur Titel', mit({ situationen: { meine_menschen: { titel: 'Meine Menschen' } } })],
    ['voller Kopf', mit({ rechtsraum: 'DE', rechtsraumName: 'Deutschland', berufsstand: 'hebamme',
      berufsstandName: 'Hebammen', bereich: 'gesundheit' })],
    ['Blatt mit allem', b({ icon: 'users', einfuehrung: 'Für dich, falls es soweit ist. Can\'t wait.',
      baustein: { id: 'familie', label: 'Familie', hint: 'Engster Kreis', weit: true },
      dokumenttypen: ['testament', 'patienten_verfuegung'], dokumenttypenVorschlag: true })],
    ['Baustein knapp, Dokumenttypen leer', b({ baustein: { id: 'ab', label: 'x' }, dokumenttypen: [] })],
    ['ohne modulTyp, mit Einlass-Marken', { ...ohne('modulTyp'), appVersion: 'v1', ungeprueft: false,
      eingelassenAm: '2026-09-26T00:00:00Z', anbieterId: 'a', anbieterIdGeprueft: true, pruefstufe: 'intern', beleg: null }],
  ],
  negativ: [
    ['kein Objekt', null, 'kein-objekt'],
    ['falscher modulTyp', mit({ modulTyp: 'situation' }), 'modulTyp'],
    ['ohne moduleVersion', ohne('moduleVersion'), 'moduleVersion'],
    ['moduleVersion 0', mit({ moduleVersion: 0 }), 'moduleVersion'],
    ['ohne herkunft', ohne('herkunft'), 'herkunft'],
    ['herkunft leer', mit({ herkunft: '  ' }), 'herkunft'],
    ['ohne sprache', ohne('sprache'), 'sprache'],
    ['sprache leer', mit({ sprache: '' }), 'sprache'],
    ['rechtsraum leer', mit({ rechtsraum: ' ' }), 'rechtsraum'],
    ['rechtsraum null', mit({ rechtsraum: null }), 'rechtsraum'],
    ['rechtsraumName Zahl', mit({ rechtsraumName: 1 }), 'rechtsraumName'],
    ['berufsstand leer', mit({ berufsstand: '' }), 'berufsstand'],
    ['berufsstandName leer', mit({ berufsstandName: '' }), 'berufsstandName'],
    ['bereich leer', mit({ bereich: '' }), 'bereich'],
    ['ohne situationen', ohne('situationen'), 'situationen'],
    ['situationen ist Liste', mit({ situationen: [blatt] }), 'situationen'],
    ['Tag im Titel', b({ titel: '<b>Probe</b>' }), 'kein-reiner-text'],
    ['Zeichenreferenz tief im Block', b({ bloecke: [{ eintraege: [{ quelle: 'identity', feld: 'a&amp;b' }] }] }), 'kein-reiner-text'],
    ['Anführungszeichen in Dokumenttyp', b({ dokumenttypen: ['a"b'] }), 'kein-reiner-text'],
    ['situationen leer', mit({ situationen: {} }), 'leer'],
    ['Kennung mit Großbuchstaben', mit({ situationen: { Probe: blatt } }), 'leer'],
    ['Blatt kein Objekt', mit({ situationen: { 'sit-probe': 'x' } }), 'leer'],
    ['Blatt ohne Titel', b({ titel: ' ' }), 'leer'],
    ['bloecke kein Array', b({ bloecke: {} }), 'leer'],
    ['Eintrag mit Feld-Objekt', b({ bloecke: [{ eintraege: [{ quelle: 'identity', feld: { id: 'x' } }] }] }), 'leer'],
    ['Baustein ohne label', b({ baustein: { id: 'familie' } }), 'leer'],
    ['Baustein-Kennung mit Unterstrich', b({ baustein: { id: 'fa_milie', label: 'x' } }), 'leer'],
    ['Baustein weit als Text', b({ baustein: { id: 'familie', label: 'x', weit: 'ja' } }), 'leer'],
    ['Dokumenttyp ungültig', b({ dokumenttypen: ['Testament'] }), 'leer'],
    ['mehr als 40 Dokumenttypen', b({ dokumenttypen: Array.from({ length: 41 }, (_, i) => 'dt' + i) }), 'leer'],
    ['Vorschlag als Text', b({ dokumenttypen: ['testament'], dokumenttypenVorschlag: 'ja' }), 'leer'],
  ],
});
