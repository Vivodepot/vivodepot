'use strict';
/* ════════════════════════════════════════════════════════════════════════
   KI-Verfügung „Verfügung zur digitalen Nachbildung" — zweite Instanz des geteilten
   Dokument-Generators (U2-ADR-069). Spezifikations-Test (KI ist neu — kein
   Golden-Vorbild wie bei der PV-Extraktion): prüft, dass der Generator die
   verbatim-Bausteine aus KI_KORPUS korrekt zur Testament-Anlage zusammensetzt,
   das Eingangs-Gate (Untersagung → Felder 2–5 entfallen) greift, und die
   Platzhalter ((Namen)/(Name)/(Jahre)/(Zeitpunkt)) gefüllt werden.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function mitKi(vorsorgeKi, extra) {
  extra = extra || {};
  // kiwiz-Umzug Schritt B (25.07.): die KI-Daten wohnen an der provisionInstruments-Zeile
  // (typ='ki-verfuegung') — genau dort liest _kiSektorDaten jetzt. Vorher speiste dieser Helfer
  // bewusst die alte flache verwaltung-Stelle und prüfte damit NICHT den echten Nutzer-Weg.
  const kiZeile = Object.assign({ id: 'ki-test-zeile', instrument: 'ki-verfuegung' }, vorsorgeKi || {});
  return {
    schemaVersion: 31,
    sektoren: {
      advanceCare: { provisionInstruments: [kiZeile] },
      administration: {},                               // bewusst LEER — beweist: gelesen wird das Instrument
      identity: extra.identity || {},
    },
    menschen: extra.menschen || [],
  };
}
function titel(ab) { return ab.map(a => a.titel || '(Eingangsformel)'); }
function alleZeilen(ab) { return ab.flatMap(a => a.zeilen).join('\n'); }

test('KI-Instanz ist registriert (KORPUS, MODUL, kiwiz-Wizard, dokument-Hook)', () => {
  const { V } = ladeKern();
  assert.ok(V.KI_KORPUS && V.KI_KORPUS.steps.length >= 12, 'KI_KORPUS mit Schritten');
  assert.ok(V.KI_MODUL, 'KI_MODUL exportiert');
  const kiwiz = V.WIZARDS.find(w => w.id === 'kiwiz');
  assert.ok(kiwiz, 'kiwiz im WIZARDS-Register');
  // U2-ADR-096 Block E: kiwiz zielt auf die KI-ZEILE der Instrument-Liste, nicht mehr flach auf
  // verwaltung. Geprueft wird das ganze Ziel, nicht nur der Sektor — ein halb umgestelltes Ziel
  // (richtiger Sektor, fehlende Liste) schriebe wieder flach und saehe hier trotzdem richtig aus.
  assert.equal(JSON.stringify(kiwiz.ziel),
    JSON.stringify({ sektor: 'advanceCare', liste: 'provisionInstruments', instrument: 'ki-verfuegung' }),
    'kiwiz zielt auf die KI-Zeile der Vorsorge-Instrument-Liste');
  // K8 (Auftrag K8/S9, 09.08.2026): trägt jetzt die volle Modul-id statt des Kürzels 'ki' —
  // wizardAbschluss() schlägt darüber in VORSORGE_MODUL_BY_ID nach (registry-geführt).
  assert.equal(kiwiz.abschluss.dokument, 'ki-verfuegung', 'Abschluss löst das KI-Dokument aus');
  // Der Wizard speist sich aus KI_KORPUS.steps (eine Quelle für Wizard UND Generator).
  assert.equal(kiwiz.schritte.length, V.KI_KORPUS.steps.length, 'kiwiz-Schritte == KORPUS-Schritte');
});

test('Untersagung ist der Eingang: nur Eingangsformel + Grundentscheidung + Schlussformel', () => {
  const { V } = ladeKern();
  V.setData(mitKi({ basicDecision: 'untersagung' }, { identity: { givenName: 'Maria', familyName: 'Muster' } }));
  const ab = V.kiDokumentAbschnitte();
  assert.equal(titel(ab).join(' | '), '(Eingangsformel) | Grundentscheidung und Zweckbindung | Schlussformel');
  const txt = alleZeilen(ab);
  assert.match(txt, /Ich untersage jede KI-gestützte Nachbildung meiner Person/);
  // KEINE Bedingungs-Bausteine der Felder 2–5:
  assert.doesNotMatch(txt, /Zugang haben/, 'kein Personenkreis-Baustein bei Untersagung');
  assert.doesNotMatch(txt, /Ausgeschlossen sind in jedem Fall/, 'kein Ausschluss-Baustein (Zweck-Pfad)');
  assert.doesNotMatch(txt, /vollständig zu löschen/, 'keine Befristung bei Untersagung');
});

test('Erlaubnis-voll: alle sieben Abschnitte, feste Bausteine, Platzhalter gefüllt', () => {
  const { V } = ladeKern();
  V.setData(mitKi({
    basicDecision: 'erlaubnis', purpose: ['trauer', 'erinnerung'],
    authorizedParties: 'benannte', namedIndividuals: [{ override: 'Anna Muster' }, { override: 'Ben Muster' }],
    scope: 'privat', permittedDataTypes: ['schriftverkehr', 'sprache'],
    timeLimit: 'jahre', numberOfYears: 'zehn',
    behaviouralLimit: 'belegt',
    digitalEstateAdministration: 'benannt', digitalEstateAdministration2: [{ override: 'Dr. Vera Verwalter' }],
  }, { identity: { givenName: 'Maria', familyName: 'Muster', birthDate: '1950-03-07' } }));
  const ab = V.kiDokumentAbschnitte();
  assert.equal(titel(ab).join(' | '), [
    '(Eingangsformel)', 'Grundentscheidung und Zweckbindung', 'Personenkreis und Zugang',
    'Datenumfang, Quellen und Befristung', 'Kennzeichnung und Verhaltensgrenzen',
    'Widerruf, Abschaltung und Verwaltung', 'Schlussformel',
  ].join(' | '));
  const txt = alleZeilen(ab);
  // Zweck-Einleitung + Bulletpunkte
  assert.match(txt, /Die Nachbildung darf ausschließlich genutzt werden/);
  assert.match(txt, /– zur persönlichen Trauerbegleitung im engsten Kreis,/);
  // immer-Bausteine
  assert.match(txt, /Ausgeschlossen sind in jedem Fall: Werbung/);
  assert.match(txt, /Der Zugang ist auf volljährige Personen beschränkt\./);
  assert.match(txt, /Die Nachbildung ist bei jeder Nutzung deutlich und dauerhaft als KI-Nachbildung/);
  assert.match(txt, /Untersagt ist jede Nutzung, die den Eindruck erweckt/);
  // Platzhalter gefüllt, keine Platzhalter-Reste
  assert.match(txt, /namentlich benannten Personen: Anna Muster, Ben Muster\./);
  assert.match(txt, /Nachlassverwalter: Dr\. Vera Verwalter\. Diese Person ist bevollmächtigt/);
  assert.match(txt, /spätestens zehn Jahre nach meinem Tod/);
  assert.doesNotMatch(txt, /\(Namen\)|\(Name\)|\(Jahre\)|\(Zeitpunkt\)/, 'keine ungefüllten Platzhalter');
  // Eingangsformel-Prefill
  assert.match(ab[0].zeilen[0], /Ich Maria Muster, geboren am 07\.03\.1950/);
});

test('Befristung-Varianten: letzte_person ohne Platzhalter, zeitpunkt gefüllt', () => {
  const { V } = ladeKern();
  V.setData(mitKi({ basicDecision: 'erlaubnis', timeLimit: 'letzte_person' }));
  let txt = alleZeilen(V.kiDokumentAbschnitte());
  assert.match(txt, /mit dem Tod der letzten zugangsberechtigten Person vollständig zu löschen\./);
  assert.doesNotMatch(txt, /\(Jahre\)|\(Zeitpunkt\)/);

  V.setData(mitKi({ basicDecision: 'erlaubnis', timeLimit: 'zeitpunkt', date: '31.12.2040' }));
  txt = alleZeilen(V.kiDokumentAbschnitte());
  assert.match(txt, /zu folgendem Zeitpunkt vollständig zu löschen: 31\.12\.2040\./);
});

test('Angehörigen-Pfad (keine benannten Personen): Bausteine ohne Namensplatzhalter', () => {
  const { V } = ladeKern();
  V.setData(mitKi({
    basicDecision: 'erlaubnis', authorizedParties: 'angehoerige',
    digitalEstateAdministration: 'angehoerige',
  }));
  const txt = alleZeilen(V.kiDokumentAbschnitte());
  assert.match(txt, /Zugang haben meine engsten Angehörigen\./);
  assert.match(txt, /Die Verwaltung obliegt gemeinsam meinen benannten Angehörigen\./);
  assert.doesNotMatch(txt, /namentlich benannten Personen/, 'kein benannte-Personen-Baustein im Angehörigen-Pfad');
});

test('Testament-Anlage: HTML trägt Kopf, Herkunftsanzeige und § 2247-Formhinweis', () => {
  /* Auftrag „Paragraphen raus" (22.09.2026, Nr. 57/60/58, bestätigt) — der Titel
     bleibt wörtlich stehen, weil docs/adr/vivodepot-U2-ADR-NNN-korpus-zuordnung-rechtsraum-und-
     template-2026-09-17.md ihn als `pruefung:`-Anker führt (Konformitäts-Wächter); die Prüfung
     selbst zieht nach unten: § 2247 BGB wird nicht mehr zitiert, der Formhinweis bleibt inhaltlich
     (Entwurf-Charakter), nur ohne Paragraph. */
  const { V } = ladeKern();
  V.setData(mitKi({ basicDecision: 'erlaubnis' }));
  const html = V.kiDokumentHTML();
  assert.match(html, /<h1>Anlage zu meinem Testament — Verfügung über die KI-gestützte Nachbildung meiner Person<\/h1>/);
  assert.match(html, /Forschungssynthese \(Edilife\/Cambridge\/Zürich\), keine amtliche Vorlage/);
  assert.match(html, /nie eine wirksame Verfügung/, 'der neue Formhinweis: Entwurf-Charakter bleibt genannt, ohne Paragraph');
  assert.match(html, /forschungsgestützte Formulierungshilfen, kein amtlicher Standard/);
  assert.doesNotMatch(html, /2247/, 'der Paragraph ist bewusst raus, an allen drei Stellen (Herkunft, Formhinweis, Fußtext)');
});

test('_kiHatDaten unterscheidet neue KI-Felder von verwaisten Alt-Schlüsseln', () => {
  const { V } = ladeKern();
  V.setData(mitKi({ ki_verhalten_grundsatz: 'ja' }));            // nur Alt-Feld
  assert.equal(V._kiHatDaten(), false, 'alte ki_verhalten_* zählen nicht');
  V.setData(mitKi({ basicDecision: 'untersagung' }));            // neues Feld
  assert.equal(V._kiHatDaten(), true, 'neues basicDecision zählt');
});

// kiwiz-Umzug Schritt B — der Beleg, dass der heute leere Pfad behoben ist: KI-Felder an der
// Instrument-Zeile, verwaltung LEER, und das erzeugte Dokument trägt trotzdem den Inhalt (vorher:
// leer, weil der Generator die leere verwaltung-Stelle las).
test('Umzug (Schritt B): KI-Felder an der Instrument-Zeile + verwaltung leer → Dokument NICHT leer', () => {
  const { V } = ladeKern();
  V.setData(mitKi({ basicDecision: 'untersagung' }, { identity: { givenName: 'Maria', familyName: 'Muster' } }));
  const d = V.getData();
  // Zieladresse belegt: keine KI-Felder flach unter administration (der heute tote Leseort), Daten am Instrument.
  const kiInVerwaltung = Object.keys(d.sektoren.administration || {}).filter(k => k.indexOf('ki_') === 0);
  assert.deepEqual(kiInVerwaltung, [], 'verwaltung trägt keine ki_*-Felder');
  const zeile = (d.sektoren.advanceCare.provisionInstruments || []).find(r => r && r.instrument === 'ki-verfuegung');
  assert.equal(zeile && zeile.basicDecision, 'untersagung', 'KI-Felder wohnen an der Instrument-Zeile');
  // Der eigentliche Bugfix: _kiHatDaten sieht die Daten und das erzeugte Dokument ist gefüllt.
  assert.equal(V._kiHatDaten(), true, '_kiHatDaten liest die Instrument-Zeile, nicht die leere verwaltung');
  assert.match(alleZeilen(V.kiDokumentAbschnitte()), /Ich untersage jede KI-gestützte Nachbildung/,
    'das erzeugte KI-Dokument trägt den Inhalt aus der Instrument-Zeile — nicht leer');
});
