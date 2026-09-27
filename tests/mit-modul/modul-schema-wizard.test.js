'use strict';
/* Rot-Beweis: je Richtung im Helfer (gleichlaufProben, Test „·Rot-Beweis“) an einem verfälschten Schema. */
/* Gleichlauf docs/wizard-modul/wizard-modul-schema.json ↔ wizardsModulPruefen.
   Regeln und Begründung: tests/mit-modul/helfer/modul-schema-gleichlauf.js. */
const { gleichlaufProben } = require('./helfer/modul-schema-gleichlauf.js');

const schritt = { feld: { id: 'zz_probe_feld', typ: 'text' }, frage: 'Frage?' };
const wiz = { titel: 'Probe', ziel: { sektor: 'finance' }, schritte: [schritt] };
const basis = { modulTyp: 'wizard', moduleVersion: 1, herkunft: 'probe', sprache: 'de', wizards: { 'zz-probe': wiz } };
const mit = (x) => ({ ...basis, ...x });
const ohne = (k) => { const m = { ...basis }; delete m[k]; return m; };
const w = (x) => mit({ wizards: { 'zz-probe': { ...wiz, ...x } } });

gleichlaufProben({
  typ: 'wizard',
  positiv: [
    ['Ziel Bereich', basis],
    ['mit Symbol, Einleitung, Abschluss, mehreren Schritten', w({ icon: 'star', einleitung: 'Los geht es.',
      abschluss: { text: 'Fertig.' }, schritte: [schritt, { feld: { id: 'zz_zwei' }, frage: 'Noch eine?', hilfe: 'x' }] })],
    ['Ziel Situation mit einem Feld, das die Situation selbst führt', w({ ziel: { situation: 'geburt' },
      schritte: [{ feld: { id: 'geburt_datum', typ: 'date' }, frage: 'Wann?' }] })],
    ['Ziel mit leerer Situation und Bereich', w({ ziel: { situation: '', sektor: 'finance' } })],
    ['mehrere Assistenten, Sprache mit Region, Einlass-Marken, ohne modulTyp', { ...ohne('modulTyp'), sprache: 'en-GB',
      wizards: { 'zz-a': wiz, 'zz-b': { ...wiz, icon: '' } }, appVersion: 'v1', ungeprueft: false,
      eingelassenAm: '2026-09-26T00:00:00Z', anbieterId: 'a', anbieterIdGeprueft: true }],
  ],
  negativ: [
    ['kein Objekt', null, 'kein-objekt'],
    ['ohne moduleVersion', ohne('moduleVersion'), 'moduleVersion'],
    ['moduleVersion 0', mit({ moduleVersion: 0 }), 'moduleVersion'],
    ['moduleVersion Text', mit({ moduleVersion: '1' }), 'moduleVersion'],
    ['ohne herkunft', ohne('herkunft'), 'herkunft'],
    ['herkunft leer', mit({ herkunft: '' }), 'herkunft'],
    ['ohne wizards', ohne('wizards'), 'wizards'],
    ['wizards ist Liste', mit({ wizards: [wiz] }), 'wizards'],
    ['ohne sprache', ohne('sprache'), 'sprache'],
    ['sprache Unsinn', mit({ sprache: 'deutsch-' }), 'sprache-form'],
    ['wizards leer', mit({ wizards: {} }), 'leer'],
    ['Kennung mit Unterstrich', mit({ wizards: { zz_probe: wiz } }), 'leer'],
    ['ohne Titel', w({ titel: ' ' }), 'leer'],
    ['ohne Ziel', w({ ziel: undefined }), 'leer'],
    ['Ziel leer', w({ ziel: {} }), 'leer'],
    ['ohne Schritte', w({ schritte: [] }), 'leer'],
    ['Schritt ohne Frage', w({ schritte: [{ feld: { id: 'x' } }] }), 'leer'],
    ['Schritt ohne Feld', w({ schritte: [{ frage: 'F?' }] }), 'leer'],
    ['Assistent kein Objekt', mit({ wizards: { 'zz-probe': 1 } }), 'leer'],
  ],
  nurKern: {
    leer: 'Ob die Kennung von einem eingebauten Assistenten belegt ist, ob das Ziel als Bereich oder Situation existiert und ob ein Feld in eine fremde Situation geschrieben werden darf, hängt am laufenden Bestand — das Schema kennt ihn nicht. Solche Assistenten verwirft der Kern; bleibt nichts übrig, lehnt er ab.',
  },
  nurKernFaelle: [
    ['nur eingebaute Kennung', mit({ wizards: { gebwiz: wiz } }), 'leer'],
    ['Ziel-Bereich unbekannt', w({ ziel: { sektor: 'gibt-es-nicht' } }), 'leer'],
    ['fremdes Feld in eingebauter Situation', w({ ziel: { situation: 'geburt' },
      schritte: [{ feld: { id: 'zz_neu' }, frage: 'F?' }] }), 'leer'],
  ],
});
