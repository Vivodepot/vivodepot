'use strict';
/* Rot-Beweis: je Richtung im Helfer (gleichlaufProben, Test „·Rot-Beweis“) an einem verfälschten Schema. */
/* Gleichlauf docs/logik-modul/logik-modul-schema.json ↔ logikModulPruefen.
   Regeln und Begründung: tests/mit-modul/helfer/modul-schema-gleichlauf.js. */
const fs = require('node:fs');
const path = require('node:path');
const { gleichlaufProben } = require('./helfer/modul-schema-gleichlauf.js');

const lies = (p) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8'));

const basis = { modulTyp: 'logikModul', moduleVersion: 1, id: 'zz-probe', titel: 'Probe', sektor: 'finance', herkunft: 'probe',
  datenSchema: {}, abschnitte: [{ titel: 'x', bloecke: [{ typ: 'immer', texte: ['Text'] }] }], dokAusgabe: { h1: 'Titel' } };
const mit = (x) => ({ ...basis, ...x });
const ohne = (k) => { const m = { ...basis }; delete m[k]; return m; };
const block = (b) => mit({ abschnitte: [{ bloecke: [b] }] });
const eintrag = (e) => mit({ datenSchema: { a: e } });
const da = (x) => mit({ dokAusgabe: { h1: 'Titel', ...x } });
/* Bedingung in Tiefe n (0 = Blatt oben): n-mal `nicht` um ein Blatt. */
const tief = (n) => { let b = { typ: 'feldGleich', feld: 'x', wert: 'y' }; for (let i = 0; i < n; i++) b = { typ: 'nicht', bedingung: b }; return b; };

gleichlaufProben({
  typ: 'logikModul',
  positiv: [
    ['Ab Werk: Erbschein-Vorbereitungsauszug', lies('tests/fixtures/erbschein-vorbereitung-logikmodul.json')],
    ['Ab Werk: Beratungshilfe-Vorbereitungsauszug', lies('tests/fixtures/zugang-zum-recht-beratungshilfe-logikmodul.json')],
    ['ohne moduleVersion (Kern verlangt sie nicht)', ohne('moduleVersion')],
    ['ohne modulTyp', ohne('modulTyp')],
    ['id genau 100 Zeichen', mit({ id: 'a'.repeat(100) })],
    ['mit Prüftermin, Sprache und Einlass-Marken', mit({ sprache: 'de', pruefIntervallMonate: 12, bezugsquelle: 'Leitlinie',
      appVersion: 'v1', ungeprueft: false, eingelassenAm: '2026-09-26T00:00:00Z', anbieterId: 'a', anbieterIdGeprueft: true,
      pruefstufe: 'intern', beleg: { providerCredentialJws: 'x', modulSignaturJws: 'y' } })],
    ['alle Datenlese-Typen', mit({ datenSchema: {
      f: { typ: 'feld', sektor: 'identity', feld: 'givenName' },
      v: { typ: 'verbinden', teile: [{ sektor: 'identity', feld: 'streetAddress' }, { sektor: 'identity', feld: 'postcodeCity' }], trenner: ', ' },
      l: { typ: 'listenfeld', sektor: 'advanceCare', feld: 'provisionInstruments', diskriminante: { feld: 'instrument', wert: 'will' }, unterfeld: 'form' },
      p: { typ: 'personenNamen', sektor: 'people', feld: 'childrenAndDependants', unterfeld: 'person' },
      lp: { typ: 'listenfeldPersonenNamen', sektor: 'advanceCare', feld: 'provisionInstruments', diskriminante: { feld: 'instrument', wert: 'will' }, unterfeld: 'personsNamedInTheWill' },
      la: { typ: 'listenfeldAlle', sektor: 'advanceCare', feld: 'provisionInstruments', unterfeld: 'form' },
      s: { typ: 'feld', sektor: 'identity', feld: 'nationality', sensibelErlaubt: true },
      leer: { typ: 'feld', sektor: 'identity', feld: '' },
    } })],
    ['Bedingungen aller Typen', block({ typ: 'immer', texte: ['x'], bedingung: { typ: 'und', bedingungen: [
      { typ: 'feldGleich', feld: 'a', wert: 'b' }, { typ: 'feldIn', feld: 'a', werte: [] },
      { typ: 'oder', bedingungen: [{ typ: 'listeEnthaeltTyp', feld: 'a', wertFeld: 'b' }] }, { typ: 'nicht', bedingung: { typ: 'feldGleich', feld: ' ' } },
    ] } })],
    ['Bedingung in der tiefsten erlaubten Ebene (6)', block({ typ: 'immer', bedingung: tief(6) })],
    ['Bedingung und Format null', block({ typ: 'immer', bedingung: null, format: null })],
    ['Format beider Typen', mit({ abschnitte: [{ bloecke: [{ typ: 'immer', format: { typ: 'liste' } },
      { typ: 'frageAntwortOderLuecke', format: { typ: 'codeListeLabel', sektor: 'identity', feld: 'maritalStatus' } }] }] })],
    ['Abschnitt mit Eingangsformel ohne Blöcke', mit({ abschnitte: [{ eingangsformel: { text: 'x' } }] })],
    ['Abschnitt mit leerer Blockliste', mit({ abschnitte: [{ bloecke: [] }] })],
    ['Unterschrift false mit Ersatz-Hinweis und Kärtchen', da({ unterschrift: false, unterschriftErsatzHinweis: 'Ersetzt nichts.',
      klasse: 'k', herkunftText: 'h', fussText: 'f', knopfAttr: 'zz-dokument', dateiBasis: 'd', toolbarHinweis: 't',
      karte: { klasse: 'zz-karte', hinweisKennung: 'zzHint', knopfKennung: 'zzKnopf', zusatzKnoepfe: [{ attr: 'zz-xml', kennung: 'zzXml', klasse: 'btn-sek' }] } })],
    ['Unterschrift true, Ersatz-Hinweis leer', da({ unterschrift: true, unterschriftErsatzHinweis: '' })],
  ],
  negativ: [
    ['kein Objekt', null, 'kein-objekt'],
    ['Liste statt Objekt', [], 'id'],
    ['ohne id', ohne('id'), 'id'],
    ['id leer', mit({ id: '  ' }), 'id'],
    ['id 101 Zeichen', mit({ id: 'a'.repeat(101) }), 'id'],
    ['ohne titel', ohne('titel'), 'titel'],
    ['titel leer', mit({ titel: ' ' }), 'titel'],
    ['ohne sektor', ohne('sektor'), 'sektor'],
    ['sektor keine Zeichenkette', mit({ sektor: 5 }), 'sektor'],
    ['sektor leer', mit({ sektor: '' }), 'sektor'],
    ['ohne herkunft', ohne('herkunft'), 'herkunft'],
    ['herkunft leer', mit({ herkunft: ' ' }), 'herkunft'],
    ['ohne datenSchema', ohne('datenSchema'), 'datenSchema'],
    ['datenSchema Liste', mit({ datenSchema: [] }), 'datenSchema'],
    ['ohne abschnitte', ohne('abschnitte'), 'abschnitte'],
    ['abschnitte leer', mit({ abschnitte: [] }), 'abschnitte'],
    ['Datenlese-Eintrag null', eintrag(null), 'blockstruktur'],
    ['Datenlese-Typ unbekannt', eintrag({ typ: 'code', sektor: 'identity', feld: 'x' }), 'blockstruktur'],
    ['feld ohne feld', eintrag({ typ: 'feld', sektor: 'identity' }), 'blockstruktur'],
    ['verbinden ohne Teile', eintrag({ typ: 'verbinden', teile: [] }), 'blockstruktur'],
    ['verbinden Teil feld Zahl', eintrag({ typ: 'verbinden', teile: [{ sektor: 'identity', feld: 5 }] }), 'blockstruktur'],
    ['listenfeld ohne diskriminante', eintrag({ typ: 'listenfeld', sektor: 'advanceCare', feld: 'provisionInstruments' }), 'blockstruktur'],
    ['diskriminante wert fehlt', eintrag({ typ: 'listenfeldPersonenNamen', sektor: 'advanceCare', feld: 'provisionInstruments', diskriminante: { feld: 'instrument' } }), 'blockstruktur'],
    ['Abschnitt ohne Blöcke', mit({ abschnitte: [{ titel: 'x' }] }), 'blockstruktur'],
    ['Eingangsformel 0 zählt nicht', mit({ abschnitte: [{ eingangsformel: 0 }] }), 'blockstruktur'],
    ['Abschnitt null', mit({ abschnitte: [null] }), 'blockstruktur'],
    ['Blocktyp unbekannt', block({ typ: 'skript' }), 'blockstruktur'],
    ['Block ohne typ', block({ texte: ['x'] }), 'blockstruktur'],
    ['Bedingungstyp unbekannt', block({ typ: 'immer', bedingung: { typ: 'eval' } }), 'blockstruktur'],
    ['Bedingung zu tief (7)', block({ typ: 'immer', bedingung: tief(7) }), 'blockstruktur'],
    ['und ohne Glieder', block({ typ: 'immer', bedingung: { typ: 'und', bedingungen: [] } }), 'blockstruktur'],
    ['nicht ohne Bedingung', block({ typ: 'immer', bedingung: { typ: 'nicht' } }), 'blockstruktur'],
    ['feldGleich feld leer', block({ typ: 'immer', bedingung: { typ: 'feldGleich', feld: '' } }), 'blockstruktur'],
    ['feldIn ohne werte', block({ typ: 'immer', bedingung: { typ: 'feldIn', feld: 'x' } }), 'blockstruktur'],
    ['listeEnthaeltTyp ohne wertFeld', block({ typ: 'immer', bedingung: { typ: 'listeEnthaeltTyp', feld: 'x' } }), 'blockstruktur'],
    ['Formattyp unbekannt', block({ typ: 'immer', format: { typ: 'html' } }), 'blockstruktur'],
    ['Format als Text', block({ typ: 'immer', format: 'liste' }), 'blockstruktur'],
    ['ohne dokAusgabe', ohne('dokAusgabe'), 'dokAusgabe'],
    ['dokAusgabe ohne h1', mit({ dokAusgabe: { klasse: 'x' } }), 'dokAusgabe'],
    ['h1 leer', da({ h1: ' ' }), 'dokAusgabe'],
    ['Unterschrift false ohne Ersatz-Hinweis', da({ unterschrift: false }), 'unterschriftErsatzHinweis'],
    ['Unterschrift false, Ersatz-Hinweis leer', da({ unterschrift: false, unterschriftErsatzHinweis: ' ' }), 'unterschriftErsatzHinweis'],
  ],
  nurKern: {
    sektor: 'Ob der Zielbereich existiert, hängt am laufenden Katalog des Produkts (Anzeige-Index, Sektorenliste, Bereichs-Registry, native Definitionen) — ein Pro-Bereich steht nur in Pro. Das Schema kennt den Katalog nicht.',
    blockstruktur: 'Der Sammelgrund trägt neben Formfehlern (die das Schema ablehnt, s. Negativfälle) zwei Bestandsfragen: ob ein im datenSchema genannter Bereich im Katalog steht und ob ein gelesenes Feld laut Feld-Definition sensibel ist. Beides kennt nur der laufende Kern.',
  },
  nurKernFaelle: [
    ['Zielbereich unbekannt', mit({ sektor: 'gibt-es-nicht' }), 'sektor'],
    ['Pro-Auszug im nativen Kern (Bereich nur in Pro)', lies('tools/templates/vivodepot-pro-notar-kanzleivertretung-logikmodul.json'), 'sektor'],
    ['datenSchema-Bereich unbekannt', eintrag({ typ: 'feld', sektor: 'gibt-es-nicht', feld: 'x' }), 'blockstruktur'],
    ['verbinden-Teil mit unbekanntem Bereich', eintrag({ typ: 'verbinden', teile: [{ sektor: 'gibt-es-nicht', feld: 'x' }] }), 'blockstruktur'],
    ['sensibles Feld ohne sensibelErlaubt', eintrag({ typ: 'feld', sektor: 'identity', feld: 'nationality' }), 'blockstruktur'],
  ],
});
