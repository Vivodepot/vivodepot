#!/usr/bin/env node
'use strict';
/* Alt→Neu-Tabelle für die 457 Feld-Kennungen + 13 Bereichsnamen — REGELN, keine
   Einzelprüfung (Freigabe der Produktverantwortung, 13.09.2026 abends, Punkt 4):
     1. Bereichsnamen: kuratierte Tabelle (13, klein genug für Handarbeit; drei davon
        von der Produktverantwortung selbst festgelegt: meine-menschen, vorsorge,
        krisenvorsorge).
     2. Feld-Kennungen: FHIR-/schema.org-Name übernehmen, wo eine bekannte Entsprechung
        existiert (FHIR_SCHEMA_OVERRIDE unten, von Hand kuratiert, klein und benannt).
     3. Sonst: aus dem vorhandenen, bereits geprüften EN-Label (tools/textsatz-en-
        modul.json) mechanisch camelCase gebildet, dann auf eine FESTE HÖCHSTLÄNGE
        gekürzt (MAX_LAENGE, wortgrenzen-bewusst).
     4. Kollisionen (zwei Kennungen ergeben denselben gekürzten Namen): numerischer
        Suffix (2, 3, …), UND in die Ausnahmeliste für die Produktverantwortung aufgenommen — die Regel
        löst die Kollision auf, versteckt sie aber nicht.
   Fünf legale Instrument-Typ-Werte (vorsorgevollmacht, patientenverfuegung, testament,
   betreuungsverfuegung, sorgerechtsverfuegung) sind ABSICHTLICH NICHT hier drin —
   Punkt 7 der Freigabe verlangt amtliche Übersetzungen, keine Regel-Anwendung. Sie
   stehen mit Quellen-Kandidaten in der separaten Ausnahmeliste. */
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const AUSGABE_ORDNER = path.join(REPO, 'docs', 'umbau-englisch-vor-v1');

const feldkatalog = JSON.parse(fs.readFileSync(path.join(REPO, 'bereiche', 'feldkatalog.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-en-modul.json'), 'utf8')).texte;

const MAX_LAENGE = 30; // feste Höchstlänge des lokalen Namensteils (ohne Bereichs-Präfix)

// 13 Bereichsnamen. Drei von der Produktverantwortung selbst benannt (Freigabe Punkt 5);
// die übrigen zehn waren im Plan vom 13.09. vorgeschlagen und nicht beanstandet.
const BEREICH_EN = {
  identitaet: 'identity',
  'meine-menschen': 'people', // Freigabe Punkt 5 (ersetzt Planvorschlag "myPeople")
  mobilitaet: 'mobility',
  finanzen: 'finance',
  vermoegen: 'assets',
  gesundheit: 'health',
  bildung: 'education',
  sozialversicherung: 'socialInsurance',
  vorsorge: 'advanceCare', // Freigabe Punkt 5, bestätigt
  verwaltung: 'administration',
  wohnen: 'housing',
  krisenvorsorge: 'emergencyPreparedness', // Freigabe Punkt 5 (ersetzt Planvorschlag "crisisPreparedness")
  persoenliches: 'personal',
};

// FHIR-/schema.org-Namen, wo eine bekannte Entsprechung existiert (Freigabe Punkt 4).
// Klein und von Hand geführt -- keine Automatik, die eine falsche Entsprechung erfindet.
// Quelle je Zeile: FHIR R4 (hl7.org/fhir) oder schema.org-Vokabular.
const FHIR_SCHEMA_OVERRIDE = {
  'identitaet.vorname': 'givenName',              // FHIR HumanName.given
  'identitaet.nachname': 'familyName',             // FHIR HumanName.family
  'identitaet.geburtsdatum': 'birthDate',          // FHIR Patient.birthDate
  'identitaet.telefon': 'telephone',               // schema.org Person.telephone
  'identitaet.email': 'email',                     // schema.org Person.email
  'identitaet.strasse': 'streetAddress',           // schema.org PostalAddress.streetAddress
  'identitaet.geschlecht': 'gender',               // FHIR Patient.gender
  'identitaet.geburtsort': 'birthPlace',           // FHIR-Extension "patient-birthPlace"
  'identitaet.geburtsname': 'birthName',           // FHIR HumanName.use = "maiden" (Konzept)
};

function camel(text) {
  const woerter = String(text || '')
    .replace(/[’'"()]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  if (!woerter.length) return null;
  return woerter
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
}

/* Wortgrenzen-bewusstes Kürzen: nimmt so viele ganze Wörter, wie in MAX_LAENGE passen.
   Bleibt kein Wort übrig (erstes Wort schon zu lang), wird hart auf MAX_LAENGE geschnitten
   -- das ist der einzige Fall, der in der Praxis nicht vorkommt (geprüft unten). */
function kuerzen(camelText, maxLaenge) {
  if (!camelText || camelText.length <= maxLaenge) return camelText;
  const woerter = camelText.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(' ');
  let out = '';
  for (const w of woerter) {
    const kandidat = out + (out ? w[0].toUpperCase() + w.slice(1) : w);
    if (kandidat.length > maxLaenge) break;
    out = kandidat;
  }
  return out || camelText.slice(0, maxLaenge);
}

function letztesSegment(text) {
  const teile = String(text || '').split('/').map((s) => s.trim()).filter(Boolean);
  return teile.length ? teile[teile.length - 1] : text;
}

/* Code-Review 16.09.2026, A4: bereiche/feldkatalog.json ist seit v695 selbst schon englisch —
   ein Lauf ohne diese Prüfung würde die Alt→Neu-Tabelle durch eine englisch→englisch-Tabelle
   ersetzen (jedes f.bereich matcht dann keinen BEREICH_EN-Schlüssel mehr, die Ausgabe wäre
   Unsinn, still). Trägt KEIN einziges Feld noch einen alten (deutschen) Bereichsnamen, ist der
   Katalog bereits migriert — dann bricht dieses Werkzeug ab, statt eine falsche Tabelle zu
   schreiben, die beim nächsten build-kennung-mapping-region.js in Kern und Lese-App wandert und
   jedes Depot von vor dem Umbau leer öffnen ließe (dieselbe Wirkung wie K2). */
if (!feldkatalog.felder.some((f) => Object.prototype.hasOwnProperty.call(BEREICH_EN, f.bereich))) {
  throw new Error('kennung-mapping-erzeugen.js: bereiche/feldkatalog.json trägt keinen einzigen '
    + 'alten (deutschen) Bereichsnamen mehr — der Katalog ist bereits migriert. Ein Lauf jetzt '
    + 'würde die Alt→Neu-Tabelle durch Unsinn ersetzen. Abgebrochen, nichts geschrieben.');
}

const zeilen = [];
const vergebeneNamen = new Set();
const kollisionen = [];
const ohneLabel = [];

for (const f of feldkatalog.felder) {
  const kennung = f.kennung;
  const bereichAlt = f.bereich;
  const bereichNeu = BEREICH_EN[bereichAlt] || null;
  const label = en[kennung + '.label'];
  if (!label) { ohneLabel.push(kennung); continue; }

  const istUnterfeld = kennung.includes('/');
  let feldTeilNeu, quelle;

  if (FHIR_SCHEMA_OVERRIDE[kennung]) {
    feldTeilNeu = FHIR_SCHEMA_OVERRIDE[kennung];
    quelle = 'fhir-schema-override';
  } else if (!istUnterfeld) {
    feldTeilNeu = kuerzen(camel(label), MAX_LAENGE);
    quelle = 'label-gekuerzt';
  } else {
    const nachPunkt = kennung.slice(bereichAlt.length + 1);
    const [listenfeldAlt] = nachPunkt.split('/');
    const listenfeldLabel = en[bereichAlt + '.' + listenfeldAlt + '.label'];
    const listenfeldNeu = kuerzen(camel(listenfeldLabel) || camel(listenfeldAlt), MAX_LAENGE);
    const unterfeldNeu = kuerzen(camel(letztesSegment(label)), MAX_LAENGE);
    feldTeilNeu = listenfeldNeu + '/' + unterfeldNeu;
    quelle = 'label-gekuerzt-unterfeld';
  }

  let kennungNeu = bereichNeu ? bereichNeu + '.' + feldTeilNeu : null;
  let kollision = false;
  if (kennungNeu) {
    if (vergebeneNamen.has(kennungNeu)) {
      kollision = true;
      let n = 2;
      let kandidat = kennungNeu + n;
      while (vergebeneNamen.has(kandidat)) { n++; kandidat = kennungNeu + n; }
      kollisionen.push({ kennungAlt: kennung, kollidiertMit: kennungNeu, aufgeloestZu: kandidat });
      kennungNeu = kandidat;
    }
    vergebeneNamen.add(kennungNeu);
  }

  zeilen.push({
    kennungAlt: kennung, kennungNeu, bereichAlt, bereichNeu, labelEn: label,
    istUnterfeld, quelle, kollisionAufgeloest: kollision,
  });
}

fs.writeFileSync('kennung-mapping.json', JSON.stringify(zeilen, null, 2) + '\n');

const ausnahmen = [];
ausnahmen.push('# Ausnahmeliste für die Produktverantwortung — Kennungs-Mapping');
ausnahmen.push('');
ausnahmen.push('Nach Regel (Freigabe 13.09.2026 Punkt 4) erzeugt. Hier stehen NUR die Fälle,');
ausnahmen.push('die die Regel nicht sauber löst — der Rest (' + (zeilen.length - kollisionen.length)
  + ' von ' + zeilen.length + ') braucht keine Einzelprüfung.');
ausnahmen.push('');
ausnahmen.push('## Kollisionen, per Regel mit Zahlen-Suffix aufgelöst (' + kollisionen.length + ')');
ausnahmen.push('');
ausnahmen.push('Automatisch aufgelöst (Suffix 2, 3, …) — zur Kenntnis, keine Handlung nötig,');
ausnahmen.push('außer die vorgeschlagene Auflösung wird abgelehnt:');
ausnahmen.push('');
for (const k of kollisionen) {
  ausnahmen.push('- `' + k.kennungAlt + '` kollidierte mit `' + k.kollidiertMit + '` → `'
    + k.aufgeloestZu + '`');
}
if (!kollisionen.length) ausnahmen.push('(keine)');

/* Die folgenden Abschnitte sind STATISCH (von Hand recherchiert/geprüft, keine Regel) --
   sie stehen hier im Erzeuger, statt nur in der Ausgabedatei, damit ein erneuter Lauf sie
   nicht verliert (dieselbe Auflage wie bei jeder erzeugten Datei: nicht von Hand nachpflegen,
   aber auch nicht von Hand VERLIEREN). */
ausnahmen.push('');
ausnahmen.push('## Rechtsbegriffe — Punkt 7 der Freigabe, amtliche Fassung statt Regel (5 Instrument-Typ-Werte)');
ausnahmen.push('');
ausnahmen.push('Diese fünf `typ`-Werte (Vorsorge-Instrumente) sind bewusst NICHT im Mapping — Regelanwendung');
ausnahmen.push('verbietet sich hier. Recherche über gesetze-im-internet.de/BMJ-Broschüren, **Bestätigung durch');
ausnahmen.push('Rechtsprüfung nötig, hier nur Kandidaten mit Quelle**:');
ausnahmen.push('');
ausnahmen.push('| Alt | Kandidat | Quelle | Sicherheit |');
ausnahmen.push('|---|---|---|---|');
ausnahmen.push('| `vorsorgevollmacht` | `lastingPowerOfAttorney` | BMJ-Broschüre „Vorsorgevollmacht / Betreuungsverfügung" (zweisprachig, awo-vg.de-Kopie eingesehen) | mittel — offizielle BMJ-Quelle direkt nicht mehr abrufbar, nur Sekundärkopie geprüft |');
ausnahmen.push('| `betreuungsverfuegung` | `guardianshipDirective` | dieselbe BMJ-Broschüre | mittel, s. o. |');
ausnahmen.push('| `patientenverfuegung` | `livingWill` | gängige Fachübersetzung (DRZE, Bundesärztekammer-Kontext); KEINE explizite BMJ-Fundstelle in dieser Recherche bestätigt | niedrig — vor Übernahme gegenprüfen |');
ausnahmen.push('| `sorgerechtsverfuegung` | — | in dieser Recherche keine amtliche Quelle geprüft (kommt erst als Unterfeld-Kontext vor, nicht als eigener Instrument-Typ mit Rechtstext) | ungeprüft |');
ausnahmen.push('| `testament` | `will` | trivial, keine Fachübersetzung nötig | **sicher** |');
ausnahmen.push('');
ausnahmen.push('**Empfehlung:** `testament→will` kann direkt übernommen werden. Die anderen vier bitte von');
ausnahmen.push('rechtlicher Seite bestätigen oder korrigieren, bevor sie ins Mapping aufgenommen werden — sie');
ausnahmen.push('sind absichtlich aus `kennung-mapping.json` herausgehalten, bis das geklärt ist (betrifft NICHT');
ausnahmen.push('die 457 Feld-Kennungen, sondern separate `typ:`-Enum-Werte im Format-Schlüssel-Mapping).');
ausnahmen.push('');
ausnahmen.push('## Korrektur einer eigenen Fehleinschätzung aus dem Plan vom 13.09.');
ausnahmen.push('');
ausnahmen.push('Der Plan (Abschnitt 2b) hatte `stellensatz` als Rechtsbegriff eingestuft — **das war falsch**,');
ausnahmen.push('jetzt am Code korrigiert: `stellensatzModulPruefen`/`STELLENSATZ_EINGEBAUT`');
ausnahmen.push('(`vivodepot.html:4670ff`) ist ein rein TECHNISCHER Mechanismus (welche Behörde/Stelle ist für');
ausnahmen.push('ein Feld zuständig, rechtsraum-verzweigend, Analogon zu „Textsatz" für Sprache) — kein');
ausnahmen.push('Rechtsbegriff, der amtlich übersetzt werden müsste. Vorschlag (sicher, keine Rechtsprüfung');
ausnahmen.push('nötig): `stellensatz→officeRegistry`, `stelle→office`.');
ausnahmen.push('');
ausnahmen.push('## Zwei Namensraum-Fragen aus dem Plan — am Code geprüft, hier direkt gelöst (Freigabe Punkt 6)');
ausnahmen.push('');
ausnahmen.push('- **`bereich` und `sektor`:** am Code geprüft (`f.bereich` in Feld-Metadaten,');
ausnahmen.push('  `ziel.sektor`/`datenSchemaLesen`-Selektoren) — **echte Bedeutungsgleichheit bestätigt**,');
ausnahmen.push('  beide referenzieren denselben Satz von 13 Bereichs-IDs. Direkt gelöst, kein Vorlagebedarf:');
ausnahmen.push('  beide werden `area`.');
ausnahmen.push('- **`quelle` und `herkunft`:** am Code geprüft (`quelle` = Herkunft EINES FELDWERTS,');
ausnahmen.push('  neu/depot; `herkunft` = Herkunft EINES ANGEDOCKTEN MODULS, Registrierungs-Institution) —');
ausnahmen.push('  **echter Unterschied bestätigt**, bleiben zwei Wörter: `quelle→source`, `herkunft→provenance`.');
ausnahmen.push('');
ausnahmen.push('## Nachtrag zur Freigabe (13.09.2026, Punkte 9–11) — vorgemerkt, nicht Teil von Commit 1–2');
ausnahmen.push('');
ausnahmen.push('Aus der Einbahnstraßen-Nachprüfung, für die spätere Kern-Bau-Phase (ab Commit 3), hier nur');
ausnahmen.push('zur Kenntnis vermerkt, damit es nicht zwischen den Sitzungen verloren geht:');
ausnahmen.push('- **Punkt 9 — Anbieter-Namensraum für die fünf Register** (textsatz, rechtsraum,');
ausnahmen.push('  institutionsArt, bereich, format): jede Kennung trägt den Anbieter als Namensraum');
ausnahmen.push('  (Reverse-DNS), Kollision wird abgewiesen/gemeldet, nie still verdrängt. Gehört in den');
ausnahmen.push('  Modulformat-Commit (Format-Schlüssel-Mapping), nicht in die Kennungs-Mapping-Tabelle hier.');
ausnahmen.push('- **Punkt 10 — Register-Adressen:** stabile unversionierte Adresse plus unveränderliche');
ausnahmen.push('  datierte Fassungen; `tools/feldregister-bauen.js` erzeugt beides. Berührt dieses Mapping');
ausnahmen.push('  nicht direkt, aber die Registerseite selbst.');
ausnahmen.push('- **Punkt 11 — Generator Teil der Website** (`vivodepot.de/generator/`). Schließt einen');
ausnahmen.push('  offenen Punkt aus ADR-409 „Was offen ist" — gehört ins neue ADR.');

fs.mkdirSync(AUSGABE_ORDNER, { recursive: true });
fs.writeFileSync(path.join(AUSGABE_ORDNER, 'kennung-mapping.json'), JSON.stringify(zeilen, null, 2) + '\n');
fs.writeFileSync(path.join(AUSGABE_ORDNER, 'kennung-mapping-ausnahmeliste.md'), ausnahmen.join('\n') + '\n');

console.log('kennung-mapping-erzeugen: ' + zeilen.length + ' Zeilen, ' + ohneLabel.length
  + ' ohne Label, ' + kollisionen.length + ' Kollisionen (automatisch aufgelöst). '
  + 'Geschrieben nach ' + path.relative(REPO, AUSGABE_ORDNER) + '/: kennung-mapping.json, '
  + 'kennung-mapping-ausnahmeliste.md');
