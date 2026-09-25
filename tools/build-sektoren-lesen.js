#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   build-sektoren-lesen.js — SEKTOREN des Kerns in die Lese-App, ERZEUGT
   statt getippt (Auftrag Teil 3, 17.09.2026, Golden-Master-Fund)
   ────────────────────────────────────────────────────────────────────────
   GEMESSEN, NICHT VERMUTET: tests/lese-app-golden-master-vier-produkte.test.js
   (17.09.2026) hat zwei getrennte Funde erhoben. pro-de/pro-en: sechs
   Themen-Cluster des Bereichsersatzes (U2-ADR-348) sind der handgetippten
   SEKTOREN-Liste unbekannt. privat-de/privat-en: EIN Feld in „people"
   (`guidedBirthEntryChildsNameNot` im Kern, die Handkopie führt noch
   `menschen`/`erwachsene_kinder`) — die Handkopie driftet also auch dort
   still, wo der Bereich selbst bekannt ist. Zweiter, wichtigerer Fund.

   WAS DIESES WERKZEUG IST, UND WAS NICHT: eine ERZEUGTE KOPIE MIT PRÜFUNG,
   wörtlich dasselbe Muster, das früher für die Situationen galt (sie kommen seit
   SIT2a aus der Datei; U2-ADR-347 ist insoweit abgelöst). Die Lese-App hat KEIN
   `ladeKern()` zur Laufzeit — sie bleibt eine einzelne, lesende HTML-Datei.
   Was sich ändert: SEKTOREN wird nicht mehr von Hand getippt, sondern aus
   dem Kern ERZEUGT, und `--check` verbietet ein stilles Auseinanderlaufen.

   WARUM `V.bereicheAlle()` SCHON DIE RICHTIGEN TEXTE TRÄGT (gemessen,
   17.09.2026): der Kern wendet seinen Textsatz beim Booten an
   (`_textsatzAufSektorenAnwenden`), bevor irgendein Aufrufer `V` sieht —
   `label`/`hint`/`beispiel` an jedem Feld und jeder Options-Zeile stehen in
   `bereicheAlle()`s Rückgabe bereits vollständig aufgelöst, wortgleich mit
   dem heutigen Handbestand (stichprobenartig verglichen: `secondLastName`,
   `gender`-Optionen). Eine zweite, eigene Textsatz-Anwendung wäre der zweite
   Mechanismus für dieselbe Sache — dieses Werkzeug liest darum NUR
   `ladeKern()` und sonst nichts.

   DIE ERLAUBTEN SCHLÜSSEL SIND EIN ALLOWLIST, KEIN PASSTHROUGH (wörtlich
   dieselbe Haltung wie ERLAUBTE_SITUATION_SCHLUESSEL): `bereicheAlle()`
   trägt weit mehr, als die Lese-App je führte — Editier-Hilfen
   (`vorschlaege`, `inputmode`, `gueltigkeitVorschlag`, `ausFeld`, `regel`,
   `dauer`, `fristRegel`), Prüftermine (`standardDokumente`), interne Flags
   (`merkmale`, `angedockt`, `navUnterzeile`) und die volle `rollen`-Form
   (`emailFeld`, `telefonFeld`, `adresseFelder`, `familienstandFeld`, …) —
   alles Dinge, die eine SCHREIBENDE oder aktiv geführte Anwendung braucht,
   keine reine Lese-Sicht. Ein Passthrough hätte sie stumm mitgeschleppt;
   die Allowlist unten ist genau die Menge, die der heutige Handbestand
   bereits nutzt (gemessen per grep über den ganzen SEKTOREN-Block, nicht
   geschätzt) — wächst ein Bedürfnis, wächst die Liste HIER, benannt.

   Aufruf:
     node tools/build-sektoren-lesen.js            → schreibt die Region
     node tools/build-sektoren-lesen.js --check    → schreibt nichts, meldet Drift (Exit 1)
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');
const LESEN = path.join(REPO, 'vivodepot-lesen.html');
const BEGIN = '/* SEKTOREN:BEGIN — generierter Bereich (tools/build-sektoren-lesen.js); Quelle: vivodepot.html V.bereicheAlle() (ladeKern) */';
const ENDE = '/* SEKTOREN:END */';

// Gemessen (grep über den heutigen SEKTOREN-Block, 17.09.2026) — s. Kopf-Kommentar.
const BEREICH_SCHLUESSEL = Object.freeze([
  'id', 'label', 'format', 'icon', 'einfuehrungstext', 'exporte', 'wizards', 'wizardId', 'deckblatt', 'rollen', 'sektionen',
]);
const ROLLEN_SCHLUESSEL = Object.freeze(['ankerNameFelder']);
const SEKTION_SCHLUESSEL = Object.freeze(['id', 'label', 'felder']);
const FELD_SCHLUESSEL = Object.freeze([
  'id', 'label', 'typ', 'beispiel', 'hint', 'sensibel', 'optionen', 'sichtbarWenn', 'verborgenWenn',
  'ebene', 'entitaet', 'marken', 'eingabeTyp', 'pflicht', 'minAnzahl', 'keineZukunft',
  'verweisZweck', 'verweisKontextFeld', 'codeListe', 'art', 'feld', 'unterFelder',
]);
const OPTION_SCHLUESSEL = Object.freeze(['wert', 'label']);

function nurErlaubt(o, schluessel) {
  const raus = {};
  for (const k of schluessel) if (o[k] !== undefined) raus[k] = o[k];
  return raus;
}

function feldFiltern(f) {
  const raus = nurErlaubt(f, FELD_SCHLUESSEL);
  if (Array.isArray(raus.optionen)) raus.optionen = raus.optionen.map((o) => nurErlaubt(o, OPTION_SCHLUESSEL));
  if (Array.isArray(raus.unterFelder)) raus.unterFelder = raus.unterFelder.map(feldFiltern);
  return raus;
}

function sektionFiltern(s) {
  const raus = nurErlaubt(s, SEKTION_SCHLUESSEL);
  raus.felder = Array.isArray(s.felder) ? s.felder.map(feldFiltern) : [];
  return raus;
}

/* ── Sonderfall „people", zwei Stück, beide GEMESSEN beim ersten Lauf dieses Werkzeugs
   (17.09.2026), nicht geraten — Vorbild: die frühere Angehörigen-Blätter-Ausnahme im
   Situationen-Erzeuger (entfallen). Ein blinder Passthrough hätte hier zweierlei falsch
   gemacht: drei nie befüllte Zwischenspeicherfelder eingeführt und das zentrale
   Personen-Register aus der Lese-App entfernt. Beides ist HIER benannt, nicht in einer
   späteren Handkorrektur an der generierten Region — die ginge beim nächsten Lauf wieder
   verloren. */

// 1 · Reine Zwischenspeicher-Felder des Geburts-Assistenten (gebwiz) — zwischen Assistent-
// Schritt und wizardAbschluss()-Übernahme befüllt, danach sofort auf '' geleert. Beim ÖFFNEN
// einer Datei tragen sie NIE echten Inhalt; ein Nachziehen legte nur ein dauerhaft leeres,
// beschriftetes Feld ohne institutionellen Nutzen an („Gebwiz Kind und
// Sub-Depot", 11.08.2026, s. tests/paritaet-kern-lese.test.js: FEHLT_IN_LESE_APP).
const PEOPLE_ZWISCHENSPEICHER_AUSGESCHLOSSEN = Object.freeze([
  'guidedBirthEntryChildsNameNot', 'guidedBirthEntryDateOfBirthNot', 'guidedBirthEntryRelationship',
]);

// 2 · Das zentrale Personen-Register (A527, 27.08.2026): existiert im Kern NICHT als
// Sektorfeld — `data.menschen[]` lebt außerhalb der Sektoren, ein reiner Register-Pull
// (U2-ADR-022). Diese Sektion ist ein KATALOG (Label/Reihenfolge der Unterfelder für
// sektorHTML), keine Struktur, die V.bereicheAlle() je liefern könnte — „gleicher Name,
// andere Mechanik", s. tests/paritaet-kern-lese.test.js: ANDERE_MECHANIK. Wörtlich der
// Handbestand vor diesem Werkzeug, hier als einzige feste Ausnahme fortgeführt.
const MENSCHEN_REGISTER_SEKTION = Object.freeze({
  id: 'menschen-liste', label: 'Menschen',
  hint: 'Menschen, die Ihnen wichtig sind. Manche kennt jeder, manche kennt sonst niemand — alle '
    + 'gehören hierher: auch nicht-verheiratete Partnerinnen und Partner, beste Freundinnen und '
    + 'Freunde, wichtige Bezugspersonen. Einmal erfasst, überall im Depot referenzierbar.',
  felder: [
    { id: 'menschen', label: 'Menschen, die mir wichtig sind', typ: 'liste',
      unterFelder: [
        { id: 'name', label: 'Name', typ: 'text', beispiel: 'Anna Schmidt' },
        { id: 'beziehung', label: 'Beziehung', typ: 'text', beispiel: 'Schwester · Freundin · Patin' },
        { id: 'birthDate', label: 'Geburtsdatum', typ: 'datum' },
        { id: 'yearOfBirthIfTheExactDayIs', label: 'Geburtsjahr', typ: 'text', beispiel: '1985' },
        { id: 'birthPlace', label: 'Geburtsort', typ: 'text', beispiel: 'München' },
        { id: 'tel', label: 'Telefon', typ: 'text', beispiel: '0151 12345678' },
        { id: 'email', label: 'E-Mail', typ: 'text', beispiel: 'anna.schmidt@example.de' },
        { id: 'adresse', label: 'Adresse', typ: 'text', beispiel: 'Kastanienweg 5, 80331 München' },
        { id: 'aufgabe', label: 'Aufgabe / Hinweis', typ: 'text', beispiel: 'soll im Notfall informiert werden' },
        { id: 'institution', label: 'Institution', typ: 'ref', entitaet: 'institution' },
        { id: 'anmerkung', label: 'Anmerkung', typ: 'text', beispiel: 'kennt meine Tochter seit der Kindheit' },
      ] },
  ],
});

function peopleSonderfallAnwenden(b) {
  if (b.id !== 'people') return b;
  const sektionen = b.sektionen.map((s) => ({
    ...s,
    felder: s.felder.filter((f) => !PEOPLE_ZWISCHENSPEICHER_AUSGESCHLOSSEN.includes(f.id)),
  }));
  return { ...b, sektionen: [MENSCHEN_REGISTER_SEKTION, ...sektionen] };
}

// 3 · U2-ADR-102 „Was untersagt ist, erscheint auf keinem Anzeige- oder Ausgabepfad als
// Bedingung" (tests/untersagtes-nirgends-bedingung.test.js). Der Kern braucht dieses Gate NICHT
// im Feldkatalog: er zeigt der EIGENTUEMERIN ihre eigenen Angaben, nicht einer Vertrauensperson,
// und legt `verborgenWenn: { feld: 'basicDecision', wert: 'untersagung' }` nur den WIZARD-
// SCHRITTEN bei der Dateneingabe an (_kiKorpusSchrittZuWizardSchritt, vivodepot.html) — nicht dem
// Feldkatalog, den V.bereicheAlle() liefert. Die Lese-App zeigt dagegen EINEM DRITTEN, was die
// Eigentümerin hinterlegt hat, und braucht das Gate darum an der ANZEIGE selbst: ohne dieses
// Feld-Merkmal erschiene die untersagte Bedingung trotzdem lesbar. Kein Kern-Fund, keine
// Lücke, die der Generator schließen könnte — eine EIGENE Anzeige-Regel der Lese-App, die im
// Kern-Feldkatalog keine Entsprechung hat und darum hier benannt nachgetragen wird (wörtlich der
// Handbestand vor diesem Werkzeug).
const KI_VERFUEGUNG_VERBORGEN_WENN_UNTERSAGUNG = Object.freeze([
  'purpose', 'authorizedParties', 'namedIndividuals', 'scope', 'permittedDataTypes',
  'timeLimit', 'numberOfYears', 'date', 'behaviouralLimit',
  'digitalEstateAdministration', 'digitalEstateAdministration2',
]);
const VERBORGEN_WENN_UNTERSAGUNG = Object.freeze({ feld: 'basicDecision', wert: 'untersagung' });

function kiVerfuegungSonderfallAnwenden(b) {
  if (b.id !== 'advanceCare') return b;
  const sektionen = b.sektionen.map((s) => ({
    ...s,
    felder: s.felder.map((f) => {
      if (f.id !== 'provisionInstruments' || !Array.isArray(f.unterFelder)) return f;
      return {
        ...f,
        unterFelder: f.unterFelder.map((u) => (
          KI_VERFUEGUNG_VERBORGEN_WENN_UNTERSAGUNG.includes(u.id)
            ? { ...u, verborgenWenn: VERBORGEN_WENN_UNTERSAGUNG }
            : u
        )),
      };
    }),
  }));
  return { ...b, sektionen };
}

// 4 · Kennungs-Umbau-Rückstand: ERLEDIGT bis auf zwei Waisen (B8 Teil 2, 19.09.2026). Der Kern migriert die
// alten Vorsorge-Flachfelder vollständig nach `provisionInstruments` (18 Migrationslücken geschlossen,
// tests/fixtures/migrations-stufen.js Stufe 52); die Lese-App führt keine alten Flachfeld-Namen mehr. Zwei Felder
// haben laut Entscheidung U2-ADR-089 kein Zielfeld im heutigen Modell und bleiben als Waisen-Deklaration stehen
// (Label für den Wert in alten Dateien): patientenverf_haltung und patientenverf_wunsch; dazu palliativ_wunsch (unten).
const ADVANCE_CARE_LEGACY_SEKTIONEN = Object.freeze({
  'verfuegungen-vollmachten-testament': {
    label: 'Verfügungen, Vollmachten, Testament',
    felder: [
      { id: 'patientenverf_haltung', label: 'Grundhaltung — Behandlung bei aussichtsloser Lage', typ: 'auswahl',
        optionen: [
          { wert: 'lebenserhalt', label: 'Lebenserhaltende Maßnahmen ausschöpfen, solange Aussicht auf Besserung besteht' },
          { wert: 'leiden_lindern', label: 'Keine lebensverlängernden Maßnahmen — im Vordergrund steht die Linderung von Leiden' },
          { wert: 'palliativ', label: 'Ausschließlich palliative Begleitung; ein Sterben in Würde zulassen' },
          { wert: 'arzt_vertrauen', label: 'Im Zweifel sollen meine Ärztinnen/Ärzte mit meiner Vertrauensperson entscheiden' },
        ],
        hint: 'Diese Grundhaltung orientiert sich an den Textbausteinen des Bundesministeriums der Justiz. Sie '
        + 'ersetzt keine ausformulierte Patientenverfügung, hilft aber, Ihren Willen klar festzuhalten. '
        + 'Ergänzen Sie im nächsten Schritt eigene Wünsche.' },
      { id: 'patientenverf_wunsch', label: 'Behandlungswünsche (Kurzform)', typ: 'textarea', ebene: 'modul',
        beispiel: 'Keine künstliche Ernährung in der Sterbephase; Palliativversorgung erwünscht' },
    ],
  },
});
const PFLEGEWUENSCHE_LEGACY_FELD = Object.freeze({
  id: 'palliativ_wunsch', label: 'Palliativversorgung & Sterbebegleitung', typ: 'textarea',
  beispiel: 'zuhause sterben; Palliativteam einbeziehen',
});

function advanceCareLegacySonderfallAnwenden(b) {
  if (b.id !== 'advanceCare') return b;
  const sektionen = b.sektionen.map((s) => (
    s.id === 'care-preferences' ? { ...s, felder: [...s.felder, PFLEGEWUENSCHE_LEGACY_FELD] } : s
  ));
  const legacySektionen = Object.entries(ADVANCE_CARE_LEGACY_SEKTIONEN)
    .map(([id, def]) => ({ id, label: def.label, felder: def.felder }));
  return { ...b, sektionen: [...sektionen, ...legacySektionen] };
}

function bereichFiltern(b) {
  const raus = nurErlaubt(b, BEREICH_SCHLUESSEL);
  if (raus.rollen) raus.rollen = nurErlaubt(b.rollen, ROLLEN_SCHLUESSEL);
  raus.sektionen = Array.isArray(b.sektionen) ? b.sektionen.map(sektionFiltern) : [];
  return advanceCareLegacySonderfallAnwenden(kiVerfuegungSonderfallAnwenden(peopleSonderfallAnwenden(raus)));
}

/* Die Liste aus dem laufenden Kern — kein Depot nötig (dieselbe Bauart wie
   tools/build-bereiche.js): die Struktur hängt nicht am Depot-Zustand, nur
   die Textsatz-Anwendung beim Booten, und die läuft immer. */
function sektorenAusKern() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  const bereiche = V.bereicheAlle();
  if (!Array.isArray(bereiche) || !bereiche.length) {
    throw new Error('V.bereicheAlle() im Kern leer oder keine Liste — Form geändert? Nicht raten, nachsehen.');
  }
  const gesehen = new Set();
  const raus = [];
  for (const b of bereiche) {
    if (!b || !b.id) throw new Error('bereicheAlle()-Eintrag ohne id im Kern-Bestand — Form geändert? Nicht raten, nachsehen.');
    if (gesehen.has(b.id)) throw new Error('Kollision: Bereich „' + b.id + '" kommt zweimal aus bereicheAlle()');
    gesehen.add(b.id);
    raus.push(bereichFiltern(b));
  }
  return raus;
}

function region(sektoren) {
  return [
    BEGIN,
    'const SEKTOR_FORMATE = Object.freeze({',
    "  FHIR_IPS: 'FHIR_IPS', SD_JWT_VC: 'SD_JWT_VC', W3C_VC: 'W3C_VC', EDCI: 'EDCI',",
    "  ISO_18013: 'ISO_18013', MDOC: 'MDOC', GENERISCH: 'GENERISCH', XOEV: 'XOEV',",
    '});',
    'const SEKTOREN = Object.freeze(' + JSON.stringify(sektoren, null, 2) + ');',
    ENDE,
  ].join('\n');
}

function regionErsetzen(quelle, neu, datei) {
  const a = quelle.indexOf(BEGIN), b = quelle.indexOf(ENDE);
  if (a < 0 || b < 0) throw new Error('SEKTOREN-Marker fehlen in ' + datei);
  return quelle.slice(0, a) + neu + quelle.slice(b + ENDE.length);
}

function main() {
  const check = process.argv.includes('--check');
  const sektoren = sektorenAusKern();
  console.log('build-sektoren-lesen: ' + sektoren.length + ' Bereiche aus dem Kern gelesen: '
    + sektoren.map((s) => s.id).join(', '));
  const neuRegion = region(sektoren);
  const q = fs.readFileSync(LESEN, 'utf8');
  const neu = regionErsetzen(q, neuRegion, path.basename(LESEN));
  if (neu === q) {
    console.log('build-sektoren-lesen: kein Drift — die Lese-App führt dieselben Sektoren wie der Kern.');
    return;
  }
  if (check) {
    console.error('build-sektoren-lesen: DRIFT — vivodepot-lesen.html (SEKTOREN-Region)');
    console.error('  Abhilfe: node tools/build-sektoren-lesen.js');
    process.exit(1);
  }
  fs.writeFileSync(LESEN, neu);
  console.log('build-sektoren-lesen: Region geschrieben.');
}

if (require.main === module) main();
module.exports = {
  sektorenAusKern, region, regionErsetzen, BEGIN, ENDE, KERN, LESEN,
  BEREICH_SCHLUESSEL, ROLLEN_SCHLUESSEL, SEKTION_SCHLUESSEL, FELD_SCHLUESSEL, OPTION_SCHLUESSEL,
  bereichFiltern, sektionFiltern, feldFiltern,
  PEOPLE_ZWISCHENSPEICHER_AUSGESCHLOSSEN, MENSCHEN_REGISTER_SEKTION, peopleSonderfallAnwenden,
  KI_VERFUEGUNG_VERBORGEN_WENN_UNTERSAGUNG, VERBORGEN_WENN_UNTERSAGUNG, kiVerfuegungSonderfallAnwenden,
  ADVANCE_CARE_LEGACY_SEKTIONEN, PFLEGEWUENSCHE_LEGACY_FELD, advanceCareLegacySonderfallAnwenden,
};
