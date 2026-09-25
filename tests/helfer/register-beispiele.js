'use strict';
/* Ein Beispielmodul je EINLASS_REGISTER-Typ — die EINE Liste für tests/u2-adr-252-vordepot-modul-ueberleben.test.js und
   tests/vor-depot-konfiguration-alle-register.test.js (bisher zwei Kopien, die bei jedem neuen Register beide nachgezogen
   werden mussten; ANG1 zog nur eine — 19.09.2026 waren beide rot). Ein neues Register braucht hier EIN Beispiel; beide Tests
   fordern es (Vorbedingung „alle EINLASS_REGISTER-Typen sind in der Beispiel-Liste vertreten"). */
const ALLE_REGISTER_BEISPIELE = [
  { typ: 'textsatz', slot: 'textsatzModule',
    modul: { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'it', texte: {} } },
  { typ: 'rechtsraum', slot: 'rechtsraumModule',
    modul: { modulTyp: 'rechtsraum', moduleVersion: 1, herkunft: 'probe', sprache: 'de', rechtsraum: 'zz-probe',
      typen: { tpl_probe: { katalogVersion: 1, wortlaut: 'x' } } } },
  { typ: 'institutionsArt', slot: 'institutionsArten',
    modul: { modulTyp: 'institutionsArt', moduleVersion: 1, herkunft: 'probe', sprache: 'de', arten: { 'zz-probe': 'Probe' } } },
  // Auftrag „blattformat" (07.09.2026) — elftes Register.
  { typ: 'blattformat', slot: 'blattformatModule',
    modul: { modulTyp: 'blattformat', moduleVersion: 1, herkunft: 'probe', format: 'letter' } },
  // MyTerms v1-Schnitt, Teil B (16.09.2026): Bedingungskatalog, Spiegel von blattformat.
  { typ: 'bedingungskatalog', slot: 'bedingungskatalogModule',
    modul: { modulTyp: 'bedingungskatalog', moduleVersion: 1, herkunft: 'probe', eintraege: [{ kennung: 'ZZ-PROBE', quelle: 'https://example.org/probe' }] } },
  { typ: 'format', slot: 'formatModule',
    modul: { modulTyp: 'format', moduleVersion: 1, format: 'zz-probe', richtung: 'export', sektor: 'finance', label: 'Probe', sprache: 'de', zuordnung: [{ feld: 'accounts', ziel: 'x' }] } },
  { typ: 'bereich', slot: 'bereichsModule',
    modul: { modulTyp: 'bereich', moduleVersion: 1, herkunft: 'probe', sprache: 'de', bereiche: { zzprobe: { label: 'Probe' } } } },
  { typ: 'branding', slot: 'brandingModule',
    modul: { modulTyp: 'branding', moduleVersion: 1, herkunft: 'probe', sprache: 'de', farbePrimaer: '#112233' } },
  { typ: 'logikModul', slot: 'logikModule',
    modul: { modulTyp: 'logikModul', moduleVersion: 1, id: 'zz-probe', titel: 'Probe', sektor: 'finance', herkunft: 'probe', sprache: 'de',
      datenSchema: {}, abschnitte: [{ titel: 'x', bloecke: [{ typ: 'immer', texte: ['Text'] }] }], dokAusgabe: { h1: 'Titel' } } },
  { typ: 'situation', slot: 'situationsModule',
    modul: { modulTyp: 'situation', moduleVersion: 1, herkunft: 'probe', sprache: 'de', situationen: { 'zz-probe': { titel: 'Probe' } } } },
  { typ: 'wizard', slot: 'wizardsModule',
    modul: { modulTyp: 'wizard', moduleVersion: 1, herkunft: 'probe', sprache: 'de',
      wizards: { 'zz-probe': { titel: 'Probe', ziel: { sektor: 'finance' },
        schritte: [{ feld: { id: 'zz_probe_feld', typ: 'text' }, frage: 'Frage?' }] } } } },
  { typ: 'ereignisAchse', slot: 'ereignisAchseModule',
    modul: { modulTyp: 'ereignisAchse', moduleVersion: 1, herkunft: 'probe',
      eintraege: [{ sektorId: 'finance', feldId: 'zz_probe_feld', ereignisse: ['tod'] }] } },
  // U2-ADR-284: Rechtsraum statt Sprache als Kennung/Gleichheitsmerkmal — 'identitaet.
  // trennungsdatum' ist eine echte, native Feld-Kennung (Label existiert in AB_WERK_TEXTSATZ_DE).
  { typ: 'stellensatz', slot: 'stellensatzModule',
    modul: { modulTyp: 'stellensatz', moduleVersion: 1, rechtsraum: 'zz-probe',
      stellen: { 'identity.dateOfSeparation': 'Probe-Stelle' } } },
  // U2-ADR-351 Zug 2: OHNE nurGeprueft, aber derselbe Admissionsweg wie jedes andere Register
  // — geht hier trotzdem über den SIGNIERTEN Vor-Depot-Bündelweg (Konvention gilt auch für
  // nurGeprueft:false-Register unverändert, s. Kommentar an VOR_DEPOT_KONFIGURATION_PFAD).
  { typ: 'erscheinung', slot: 'erscheinungsModule',
    modul: { modulTyp: 'erscheinung', moduleVersion: 1, herkunft: 'probe', label: '16px' } },
  // ANG1 (19.09.2026): das fünfzehnte Register — Angehörigen-Vorlage (ein Blatt je Situation, Zeiger auf Felder).
  { typ: 'angehoerigenVorlage', slot: 'angehoerigenVorlagenModule',
    modul: { modulTyp: 'angehoerigenVorlage', moduleVersion: 1, herkunft: 'probe', sprache: 'de',
      situationen: { 'sit-probe': { titel: 'Probe', bloecke: [{ id: 'b1', titel: 'Block', eintraege: [{ quelle: 'identity', feld: 'givenName' }] }] } } } },
];

module.exports = { ALLE_REGISTER_BEISPIELE };
