'use strict';
/* Rot-Beweis: je Richtung im Helfer (gleichlaufProben, Test „·Rot-Beweis“) an einem verfälschten Schema. */
/* Gleichlauf docs/ereignis-achse-modul/ereignis-achse-modul-schema.json ↔ ereignisAchseModulPruefen.
   Regeln und Begründung: tests/mit-modul/helfer/modul-schema-gleichlauf.js. */
const { gleichlaufProben } = require('./helfer/modul-schema-gleichlauf.js');

const eintrag = { sektorId: 'finance', feldId: 'zz_probe_feld', ereignisse: ['tod'] };
const basis = { modulTyp: 'ereignisAchse', moduleVersion: 1, herkunft: 'probe', eintraege: [eintrag] };
const mit = (x) => ({ ...basis, ...x });
const ohne = (k) => { const m = { ...basis }; delete m[k]; return m; };
const nur = (e) => mit({ eintraege: [e] });

gleichlaufProben({
  typ: 'ereignisAchse',
  positiv: [
    ['ein Eintrag', basis],
    ['alle Ereignisse, mit Unterfeld', nur({ sektorId: 'health', feldId: 'zz_f', unterFeldId: 'zz_u',
      ereignisse: ['familienstand', 'tod', 'betreuung', 'geburt'] })],
    ['Unterfeld leer', nur({ ...eintrag, unterFeldId: '' })],
    ['ausgenommen', nur({ sektorId: 'finance', feldId: 'zz_g', ausgenommen: 'kein Ereignisbezug' })],
    ['Situation als Ziel', nur({ sektorId: 'geburt', feldId: 'zz_h', ereignisse: ['geburt'] })],
    ['mehrere Einträge', mit({ eintraege: [eintrag, { ...eintrag, unterFeldId: 'zz_u' }, { ...eintrag, feldId: 'zz_i' }] })],
    ['mit sprache und Einlass-Marken', mit({ sprache: 'de', appVersion: 'v1', ungeprueft: false,
      eingelassenAm: '2026-09-26T00:00:00Z', anbieterId: 'a', anbieterIdGeprueft: true })],
  ],
  negativ: [
    ['kein Objekt', null, 'kein-objekt'],
    ['Text', 'x', 'kein-objekt'],
    ['ohne moduleVersion', ohne('moduleVersion'), 'moduleVersion'],
    ['moduleVersion 0', mit({ moduleVersion: 0 }), 'moduleVersion'],
    ['moduleVersion 1.5', mit({ moduleVersion: 1.5 }), 'moduleVersion'],
    ['ohne herkunft', ohne('herkunft'), 'herkunft'],
    ['herkunft leer', mit({ herkunft: ' ' }), 'herkunft'],
    ['ohne eintraege', ohne('eintraege'), 'eintraege'],
    ['eintraege als Objekt', mit({ eintraege: { a: eintrag } }), 'eintraege'],
    ['eintraege leer', mit({ eintraege: [] }), 'leer'],
    ['Eintrag kein Objekt', mit({ eintraege: [null] }), 'leer'],
    ['ohne sektorId', nur({ feldId: 'zz_f', ereignisse: ['tod'] }), 'leer'],
    ['feldId leer', nur({ sektorId: 'finance', feldId: ' ', ereignisse: ['tod'] }), 'leer'],
    ['ohne Ereignisse und Ausnahme', nur({ sektorId: 'finance', feldId: 'zz_f' }), 'leer'],
    ['Ereignisse leer', nur({ ...eintrag, ereignisse: [] }), 'leer'],
    ['unbekanntes Ereignis', nur({ ...eintrag, ereignisse: ['umzug'] }), 'leer'],
    ['ausgenommen leer', nur({ sektorId: 'finance', feldId: 'zz_f', ausgenommen: '' }), 'leer'],
    ['ausgenommen null', nur({ sektorId: 'finance', feldId: 'zz_f', ausgenommen: null }), 'leer'],
  ],
  nurKern: {
    leer: 'Ob sektorId ein bekannter Bereich oder eine bekannte Situation ist und ob ein Tripel ab Werk belegt ist, hängt am laufenden Bestand — der Kern verwirft solche Einträge einzeln; bleibt keiner übrig, lehnt er ab.',
  },
  nurKernFaelle: [
    ['nur unbekannte Ziele', nur({ sektorId: 'gibtesnicht', feldId: 'zz_f', ereignisse: ['tod'] }), 'leer'],
    ['nur ab Werk belegte Tripel', nur({ sektorId: 'advanceCare', feldId: 'provisionInstruments',
      unterFeldId: 'authorizedPersons', ereignisse: ['tod'] }), 'leer'],
  ],
});
