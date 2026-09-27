'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   vier-produkte.js — die Zusammensetzung der vier Produkte + die Deutsch-Leck-
   Messung (07.09.2026, direkt aus der Ansage)
   ────────────────────────────────────────────────────────────────────────────
   ANDERS ALS tools/produkt-konfektionieren.js (das bewusst NICHTS über Privat/
   Pro/D/E weiß): HIER steht die Zusammensetzung, weil sie für diesen
   Zug ausdrücklich entschieden hat — "Was ich entscheide, damit du nicht
   rätst: Pro ist in diesem Zug das Geschäftsführerinnen-Notfallmappen-Modul."
   Das ist eine benannte, nachvollziehbare Entscheidung, keine Vermutung.

   DE TRÄGT KEIN DOCKBARES SPRACHMODUL — gemessen, nicht übersehen: `sprache:
   'de'` bleibt im gemeinsamen Einlassweg reserviert (U2-ADR-285/359, s.
   docs/adr/vivodepot-U2-ADR-361-…), auch über den unsignierten Weg
   (`_textsatzModuleAusDepotAnmelden` ruft `textsatzModulPruefen` erneut auf —
   ZWEITE Durchsetzungsstelle, nicht nur am ersten Einlass). Die DE-Produkte
   bleiben darum beim eingebauten Rückfall (der ohnehin Deutsch ist) — kein
   Zweitweg dafür gebaut, wie angeordnet.

   EN UND DAS PRO-MODUL SIND UNSIGNIERT, ABSICHTLICH — wörtlich der Weg, für
   den `tools/textsatz-en-modul-erzeugen.js` sein Modul baut ("UNSIGNIERT,
   BEWUSST … kein nurGeprueft"): Vivodepots eigene Module, kein Fremdmodul,
   kein Zertifikatsweg nötig. Ausgeliefert als Begleitdatei neben dem Gerüst
   (tools/produkt-konfektionieren.js, `unsignierteModulDateien`) — die
   Bürgerin/Produktentscheidung dockt sie über den bestehenden, funktionierenden Weg
   (Einstellungen → Module → Einlassen), kein Vor-Depot-Kanal, keine Signatur.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

const REPO = path.join(__dirname, '..', '..');

const EN_MODUL_PFAD = path.join(REPO, 'tools', 'textsatz-en-modul.json');
const DE_MODUL_PFAD = path.join(REPO, 'tools', 'textsatz-de-modul.json');
// Das Vor-Depot-Sprachangebot (U2-ADR-428): die Kennungen der Schirme vor dem Depot in der zweiten Sprache. Das deutsche Produkt trägt es (der „English“-Knopf); ein
// englisches Produkt hat Englisch als seine Sprache und braucht es nicht. modulTyp `sprachangebot`, Region AB_WERK_SPRACHANGEBOT_QUELLEN.
const SPRACHANGEBOT_EN_PFAD = path.join(REPO, 'tools', 'sprachangebot-en-vordepot-modul.json');
const PRO_MODUL_PFAD = path.join(REPO, 'tools', 'templates', 'vivodepot-pro-geschaeftsfuehrerin-notfallmappe-logikmodul.json');
// "Pro-Achse englisch" (08.09.2026): pro-en zeigte bislang die deutsche Prosa des
// Logikmoduls, weil derselbe PRO_MODUL_PFAD wie pro-de gedockt wurde — kein EN-Zwilling
// existierte. Behalten über die U2-ADR-421-Umstellung hinweg (.09.2026):
// die Rubriken-Labels der sechs pro-*-Sektoren laufen weiterhin über den additiven EN-Sprachweg
// (die sechs `<bereichId>.label`-Schlüssel in EN_MODUL_PFAD), nur ihre STRUKTUR kommt jetzt über
// bereichsErsatz statt über ein separates Bereichs-Modul (s. u.).
const PRO_MODUL_PFAD_EN = path.join(REPO, 'tools', 'templates', 'vivodepot-pro-geschaeftsfuehrerin-notfallmappe-logikmodul-en.json');
// U2-ADR-421-Nachtrag (08.09.2026, „Pro-Produkt ersetzt statt ergänzt") — LÖST AB,
// NICHT ERGÄNZT: ein früheres `PRO_BEREICH_MODUL_PFAD` (normales `bereich`-Modul, das die sechs
// pro-*-Sektoren NEBEN den 13 privaten einließ, s. git-Historie) ist entfallen. Der Befund, der
// dazu führte: die wollten von Anfang an ERSATZ, nicht Ergänzung — „VD Pro"
// zeigt sechs Firmen-Bereiche, keine neunzehn. `bereichsErsatz` (U2-ADR-348) trägt genau das. Ein
// Pro-Logikmodul referenziert weiterhin eigene Sektor-IDs (z. B. 'pro-vertretung-vollmachten') —
// die stehen jetzt über `PRO_BEREICHS_ERSATZ_PFAD` in SEKTOR_BY_ID, nicht mehr über ein
// separates Bereichs-Modul.
const PRO_BEREICHS_ERSATZ_PFAD = path.join(REPO, 'tools', 'templates', 'vivodepot-pro-geschaeftsfuehrerin-notfallmappe-bereichsersatz.json');
// U2-ADR-421-Nachtrag (08.09.2026) — die echten Feldinhalte (tools/betriebssatz-inhalte.js),
// über die achte Ab-Werk-Saat (AB_WERK_VORLAGEN_QUELLEN) eingebacken, je Sprache eine Datei.
const PRO_VORLAGE_DE_PFAD = path.join(REPO, 'tools', 'templates', 'vivodepot-pro-geschaeftsfuehrerin-notfallmappe-vorlage-de.json');
const PRO_VORLAGE_EN_PFAD = path.join(REPO, 'tools', 'templates', 'vivodepot-pro-geschaeftsfuehrerin-notfallmappe-vorlage-en.json');
// Das Template NOTAR im Pro-Modul (DoD: „das Pro-Modul in beiden Sprachen, dort das Template Notar“; U2-ADR-287, § 39–45 BNotO): ein
// `logikModul` (Listen-Typ, steht neben dem Geschäftsführerin-Logikmodul). Je Sprache eine Datei (pro-de: deutsch, pro-en: englisch).
// Ein TEMPLATE steht im Rezept in `templates`, nicht in `bereichsmodule` (U2-ADR-427): darum das eigene Feld `templatePfade` am Produkt,
// nicht `modulPfade`. Die Kennung `notar` steht im Dateinamen, so erkennt sie tools/dod-v1-rezepte-pruefen.js.
const PRO_NOTAR_TEMPLATE_PFAD_DE = path.join(REPO, 'tools', 'templates', 'vivodepot-pro-notar-kanzleivertretung-logikmodul.json');
const PRO_NOTAR_TEMPLATE_PFAD_EN = path.join(REPO, 'tools', 'templates', 'vivodepot-pro-notar-kanzleivertretung-logikmodul-en.json');
// Entscheidung 16.09.2026 (U2-ADR-398): die Bereiche aller Vivodepot-Produkte, in JEDES Produkt
// gebacken — erzeugt aus den Bereichsersätzen unten (tools/vivodepot-bereiche-bekannt-erzeugen.js).
const BEREICHE_BEKANNT_PFAD = path.join(REPO, 'tools', 'vivodepot-bereiche-bekannt.json');

// Schnitt-Vorbereitung (17.09.2026, DoD-Register-Umbau, U2-ADR-345-Familie): AB_WERK_BEREICH_QUELLEN
// wird beim Schnitt die einzige Quelle für `bereiche` — modulTyp:'bereich'-Dateien, über
// modulDateienFuer() wie jedes andere unsignierte Modul eingespeist (tools/lib/produkt-text-
// erzeugen.js klassifiziert nach dem eigenen `modulTyp` jeder Datei, listenTyp: mehrere Dateien
// bestehen nebeneinander). Privat bekommt die dreizehn nativen (bisher BUERGERMODUL_BUENDEL.
// bereiche + BEREICH_QUELLEN_EINGEBAUT/„wohnen"), Pro bekommt NUR die sechs Firmen-Bereiche
// (-96, gegengeprüft) — „VD Pro" zeigt sechs Bereiche, keine dreizehn (s. PRO_BEREICHS_ERSATZ_PFAD-
// Kommentar oben); `bereichsErsatzPfad` wird für Pro damit überflüssig (null unten).
const BEREICH_TEMPLATE_VERZEICHNIS = path.join(REPO, 'tools', 'bereich-templates');
const BEREICH_TEMPLATE_PFADE_PRIVAT_13 = Object.freeze([
  'vivodepot-administration.json', 'vivodepot-advanceCare.json', 'vivodepot-assets.json',
  'vivodepot-education.json', 'vivodepot-emergencyPreparedness.json', 'vivodepot-finance.json',
  'vivodepot-health.json', 'vivodepot-housing.json', 'vivodepot-identity.json',
  'vivodepot-mobility.json', 'vivodepot-people.json', 'vivodepot-personal.json',
  'vivodepot-socialInsurance.json',
].map((datei) => path.join(BEREICH_TEMPLATE_VERZEICHNIS, datei)));
const BEREICH_TEMPLATE_PFADE_PRO_6 = Object.freeze([
  'vivodepot-pro-aufbewahrung-ordnung.json', 'vivodepot-pro-betrieb-zugaenge.json',
  'vivodepot-pro-finanzen-verbindlichkeiten.json', 'vivodepot-pro-gesellschaft-nachfolge.json',
  'vivodepot-pro-kontakte-vertretungsplan.json', 'vivodepot-pro-vertretung-vollmachten.json',
].map((datei) => path.join(BEREICH_TEMPLATE_VERZEICHNIS, datei)));
// Nachtrag 17.09.2026 (Entscheidung: Pro nutzt den nativen `identity` statt eines eigenen
// `pro-identitaet` — der einzige Überschneidungspunkt zu den 13 privaten Bereichen, sonst
// keiner). Gemessen 18.09.2026: ohne diese Zeile fehlt `identity` in Pro vollständig — die
// alte `pro-identitaet`-Übernahme lief über PRO_BEREICHS_ERSATZ_PFAD, das seit dem Schnitt
// für Pro nie eingebunden wird (bereichsErsatzPfad: null unten). Nur DIESE eine der 13
// nativen Dateien, nicht die restlichen zwölf — Pro zeigt sieben Bereiche, keine neunzehn.
const BEREICH_TEMPLATE_PFAD_IDENTITY = path.join(BEREICH_TEMPLATE_VERZEICHNIS, 'vivodepot-identity.json');

// Schnitt-Vorbereitung (17.09.2026) — Gegenstück für `dokumentModule`: dieselben vier amtlichen
// Dokumentmodule (PV/KI/Vollmacht/Betreuung) in JEDEM Produkt, sprach-/produktunabhängig wie
// AB_WERK_BASISTEMPLATE_DE. Die vier `vivodepot-standardvorlage-*.json`-Dateien im selben
// Verzeichnis sind seit dem Gerüst-Schnitt S4 verdrahtet (STANDARD_VORLAGEN_PFADE_4 unten).
const DOKUMENT_MODUL_VERZEICHNIS = path.join(REPO, 'tools', 'dokument-module');
/* Gerüst-Schnitt S4 (21.09.2026): die vier amtlichen Standardvorlagen (AB_WERK_BASISTEMPLATE_DE ist im Gerüst leer) stehen als
   `standardVorlage`-Moduldateien im Rezept jedes Produkts. DIE REIHENFOLGE IST FEST und ist Inhalt, kein Zufall: die Vorlagen-Listung
   im Kern folgt der Reihenfolge, in der die Region gebacken wird (patientenverfuegung, betreuungsverfuegung, vorsorgevollmacht,
   organspende — wie sie vor dem Schnitt im Gerüst standen). Alphabetisch (wie readdirSync sie liefert) ergäbe eine andere Listung;
   gemessen: mit dieser Reihenfolge ist STANDARD_VORLAGEN deepStrictEqual zu dem Stand vor dem Schnitt. Wer sie sortiert, ändert, was
   die Bürgerin in welcher Reihenfolge sieht. */
const STANDARD_VORLAGEN_PFADE_4 = Object.freeze(['patientenverfuegung', 'betreuungsverfuegung', 'vorsorgevollmacht', 'organspende']
  .map((name) => path.join(REPO, 'tools', 'dokument-module', 'vivodepot-standardvorlage-' + name + '.json')));

const DOKUMENT_MODUL_PFADE_4 = Object.freeze([
  'vivodepot-dokumentmodul-patientenverfuegung.json', 'vivodepot-dokumentmodul-ki-verfuegung.json',
  'vivodepot-dokumentmodul-vorsorgevollmacht.json', 'vivodepot-dokumentmodul-betreuungsverfuegung.json',
].map((datei) => path.join(DOKUMENT_MODUL_VERZEICHNIS, datei)));

// Gerüst-Schnitt S2/S6 (20.09.2026): die drei Dokument-Wortlaute (PV_BMJ/KI_KORPUS/VOLLMACHT_BMJ), vormals
// AB_WERK_DOKUMENTE_DE im Kern, jetzt eine Moduldatei (modulTyp 'dokumente'), in jedem Produkt.
const DOKUMENTE_DE_PFAD = path.join(DOKUMENT_MODUL_VERZEICHNIS, 'vivodepot-dokumente-de.json');
// Gerüst-Schnitt S3 (20.09.2026): der deutsche Rechtsraum-Katalog ist eine Moduldatei, in jedem Produkt.
const RECHTSRAUM_DE_PFAD = path.join(REPO, 'tools', 'rechtsraum-de-modul.json');
// Gerüst-Schnitt S7: die dreizehn nativen Bereichs-Definitionen (Grundlage der ruhenden Bereiche, B12), erzeugt aus den 13 Bereichs-Templates
// (tools/bereiche-nativ-katalog-erzeugen.js). Produktunabhängig: dieselbe Datei in jedem der vier Produkte.
const BEREICHE_NATIV_KATALOG_PFAD = path.join(REPO, 'tools', 'bereiche-nativ-katalog-modul.json');
// S9 (22.09.2026): der Lebenslagen-Katalog (29 Lagen, seit T5 im Kern) — jetzt Region, dieselbe Bauart wie BEREICHE_NATIV_KATALOG_PFAD.
const LEBENSLAGEN_KATALOG_PFAD = path.join(REPO, 'tools', 'lebenslagen-katalog-modul.json');

// Schnitt-Nachtrag (17.09.2026, -40): dieselbe Atomaritätslücke wie oben, für situationen/
// wizards/logikModule — ohne diese vier Fixtures trägt WIZARD_BY_ID nur noch pvwiz/kiwiz (die
// beiden Ab-Werk-Sonderfälle), jeder Bereich mit Wizard-Bezug verliert seinen Startknopf.
// Alle vier an ALLEN VIER Produkten, empirisch verifiziert (-40, privat-de: 14 → 1 Abweichung).
const AB_WERK_FIXTURE_VERZEICHNIS = path.join(REPO, 'tests', 'fixtures');
const AB_WERK_FIXTURE_PFADE_4 = Object.freeze([
  'buergermodul-situationen-ab-werk.json', 'buergermodul-wizards-ab-werk.json',
].map((datei) => path.join(AB_WERK_FIXTURE_VERZEICHNIS, datei)));

// U2-ADR-NNN (19.09.2026, „Angehörigen-Blätter sind Template, kein Gerüst"): die fünf früher
// hartkodierten Angehörigen-Blätter (bis ANG1 die Konstante `_ANG_SITUATIONEN`) als Rechtsraum-DE-Vorlage —
// in ALLEN vier Produkten (Rechtsraum DE, nicht Produktstufe: Privat UND Pro tragen sie), deutsch in den
// deutschen, englisch in den englischen (ANGEHOERIGEN_VORLAGE_PFAD_EN). Von Hand gepflegt (kein Generator mehr): tools/angehoerigen-vorlagen/, Grundlinie tests/fixtures/angehoerigen-blaetter-vor-abriss-2026-09-19.json.
const ANGEHOERIGEN_VORLAGE_PFAD_DE = path.join(REPO, 'tools', 'angehoerigen-vorlagen', 'vivodepot-angehoerigen-de.json');
const ANGEHOERIGEN_VORLAGE_PFAD_EN = path.join(REPO, 'tools', 'angehoerigen-vorlagen', 'vivodepot-angehoerigen-en.json');

/* Pro ohne Vorlage (Entscheidung 17.09.2026, P1): der Bereichsersatz trägt die 54 Felder seit dem
   10.09.2026 selbst; die zusätzlich gebackene Vorlage verdoppelte die Sektionen, in pro-en unter
   anderen, englischen Kennungen. Die Vorlagen-Dateien bleiben Quelle der Erzeuger. */
/* Die vier Produkte. Seit S8 (U2-ADR-428) trägt auch jedes deutsche Produkt sein Sprachmodul (`sprachModulPfad: DE_MODUL_PFAD`) — das Gerüst trägt keinen
   Sprachsatz mehr, Deutsch ist ein Modul wie Englisch. */
const ZUGANG_RECHT_TEMPLATE_PFAD = path.join(AB_WERK_FIXTURE_VERZEICHNIS, 'zugang-zum-recht-beratungshilfe-logikmodul.json');
// Schema 87 (21.09.2026): der Erbschein-Vorbereitungsauszug ist wie der Zugang-Auszug ein Template im Rezept der Privat-Produkte, kein Kern-Auszug mehr.
// Pro trägt ihn nicht: seine Zielbereiche sind dort ersetzt, der Einlass hat ihn dort schon vorher abgelehnt (Code-Review 16.09.2026, B13).
const ERBSCHEIN_TEMPLATE_PFAD = path.join(AB_WERK_FIXTURE_VERZEICHNIS, 'erbschein-vorbereitung-logikmodul.json');
const PRODUKTE = Object.freeze([
  Object.freeze({ slug: 'privat-de', sprache: 'de', sprachModulPfad: DE_MODUL_PFAD, proModulPfad: null, bereichsErsatzPfad: null, vorlagenPfad: null, bereicheBekanntPfad: BEREICHE_BEKANNT_PFAD, modulPfade: BEREICH_TEMPLATE_PFADE_PRIVAT_13.concat(DOKUMENT_MODUL_PFADE_4, [DOKUMENTE_DE_PFAD, RECHTSRAUM_DE_PFAD], STANDARD_VORLAGEN_PFADE_4, [BEREICHE_NATIV_KATALOG_PFAD, LEBENSLAGEN_KATALOG_PFAD], AB_WERK_FIXTURE_PFADE_4, [ANGEHOERIGEN_VORLAGE_PFAD_DE], [SPRACHANGEBOT_EN_PFAD]), templatePfade: Object.freeze([ZUGANG_RECHT_TEMPLATE_PFAD, ERBSCHEIN_TEMPLATE_PFAD]) }),
  Object.freeze({ slug: 'privat-en', sprache: 'en', sprachModulPfad: EN_MODUL_PFAD, proModulPfad: null, bereichsErsatzPfad: null, vorlagenPfad: null, bereicheBekanntPfad: BEREICHE_BEKANNT_PFAD, modulPfade: BEREICH_TEMPLATE_PFADE_PRIVAT_13.concat(DOKUMENT_MODUL_PFADE_4, [DOKUMENTE_DE_PFAD, RECHTSRAUM_DE_PFAD], STANDARD_VORLAGEN_PFADE_4, [BEREICHE_NATIV_KATALOG_PFAD, LEBENSLAGEN_KATALOG_PFAD], AB_WERK_FIXTURE_PFADE_4, [ANGEHOERIGEN_VORLAGE_PFAD_EN]), templatePfade: Object.freeze([ZUGANG_RECHT_TEMPLATE_PFAD, ERBSCHEIN_TEMPLATE_PFAD]) }),
  Object.freeze({ slug: 'pro-de', sprache: 'de', sprachModulPfad: DE_MODUL_PFAD, proModulPfad: PRO_MODUL_PFAD, bereichsErsatzPfad: null, vorlagenPfad: null, bereicheBekanntPfad: BEREICHE_BEKANNT_PFAD, modulPfade: BEREICH_TEMPLATE_PFADE_PRO_6.concat([BEREICH_TEMPLATE_PFAD_IDENTITY], DOKUMENT_MODUL_PFADE_4, [DOKUMENTE_DE_PFAD, RECHTSRAUM_DE_PFAD], STANDARD_VORLAGEN_PFADE_4, [BEREICHE_NATIV_KATALOG_PFAD, LEBENSLAGEN_KATALOG_PFAD], AB_WERK_FIXTURE_PFADE_4, [ANGEHOERIGEN_VORLAGE_PFAD_DE], [SPRACHANGEBOT_EN_PFAD]), templatePfade: Object.freeze([PRO_NOTAR_TEMPLATE_PFAD_DE]) }),
  Object.freeze({ slug: 'pro-en', sprache: 'en', sprachModulPfad: EN_MODUL_PFAD, proModulPfad: PRO_MODUL_PFAD_EN, bereichsErsatzPfad: null, vorlagenPfad: null, bereicheBekanntPfad: BEREICHE_BEKANNT_PFAD, modulPfade: BEREICH_TEMPLATE_PFADE_PRO_6.concat([BEREICH_TEMPLATE_PFAD_IDENTITY], DOKUMENT_MODUL_PFADE_4, [DOKUMENTE_DE_PFAD, RECHTSRAUM_DE_PFAD], STANDARD_VORLAGEN_PFADE_4, [BEREICHE_NATIV_KATALOG_PFAD, LEBENSLAGEN_KATALOG_PFAD], AB_WERK_FIXTURE_PFADE_4, [ANGEHOERIGEN_VORLAGE_PFAD_EN]), templatePfade: Object.freeze([PRO_NOTAR_TEMPLATE_PFAD_EN]) }),
]);

/* Die unsignierten Moduldateien, die ein Produkt eingebacken bekommt — EINE Stelle statt einer
   Liste je Aufrufer. Die bekannten Vivodepot-Bereiche (`bereicheBekanntPfad`) trägt jedes Produkt.
   `modulPfade` (17.09.2026, Schnitt-Vorbereitung): mehrere modulTyp:'bereich'-Dateien nebeneinander,
   s. Kommentar an BEREICH_TEMPLATE_PFADE_PRIVAT_13 oben.

   `opts.bereichTemplateVerzeichnis` (18.09.2026) — EIN Parameter, EIN Vorgabewert: fehlt er, kommt
   genau der heutige Pfad heraus (Probe dafür: tests/vd-privat-struktur-bundle-erzeugen.test.js /
   tests/inline-texte-ratsche.test.js prüfen ihn indirekt über --gate; s. auch die eigene Probe
   unten). Gesetzt, biegt er NUR die Bereichs-Template-Pfade auf ein anderes Verzeichnis um (gleicher
   Dateiname, anderer Ordner) — Dokumentmodule, AB_WERK-Fixtures und Sprachmodul bleiben unberührt.
   Für Meßwerkzeuge, die eine Pflanzung gegen eine Wegwerf-Kopie der Bereichs-Templates fahren
   wollen, statt den Arbeitsbaum oder den Kern-Rohtext anzufassen — kein bestehender Aufrufer
   (feldregister-bauen.js, register-ausliefern.js, die echten Konfektionierer) übergibt `opts`.

   `opts.abWerkFixtureVerzeichnis` (18.09.2026) — dasselbe Muster ein zweites Mal angewandt, nicht
   neu erfunden: fünf der sieben nativen Wizards (`gebwiz`, `anamwiz`, `pflwiz`, `heirwiz`,
   `umzwiz`) kommen seit dem Schnitt über `AB_WERK_WIZARD_QUELLEN` aus
   `tests/fixtures/buergermodul-wizards-ab-werk.json`, nicht mehr aus einem Kern-Rohtext-Literal
   (gemessen: kein `"gebwiz":{` mehr in vivodepot.html). Biegt NUR die beiden AB_WERK-Fixture-Pfade
   um (`buergermodul-situationen-ab-werk.json`/`buergermodul-wizards-ab-werk.json`) — der Rest von
   `tests/fixtures/` (132 weitere, fachfremde Dateien) bleibt unberührt, weil `modulDateienFuer`
   nur Pfade umbiegt, die ohnehin schon in `basis` stehen.

   `opts.textsatzDeModulPfad` (S8, 21.09.2026) — dasselbe Muster ein drittes Mal: biegt NUR den Pfad des deutschen Sprachmoduls auf eine Kopie um. Seit S8
   steht der deutsche Satz nicht mehr im Kern, sondern in `tools/textsatz-de-modul.json`; wer eine Textänderung gegen eine Wegwerf-Kopie pflanzen will
   (tools/nativ-bestand-aenderungen-erheben.test.js), mutiert diese Kopie, nicht die geteilte Datei im Arbeitsbaum. */
function modulDateienFuer(p, opts) {
  const basis = [p.sprachModulPfad, p.bereichsErsatzPfad, p.vorlagenPfad, p.proModulPfad, p.bereicheBekanntPfad, ...(p.modulPfade || []), ...(p.templatePfade || [])].filter(Boolean);
  const bereichsUeberschreibung = opts && opts.bereichTemplateVerzeichnis;
  const fixtureUeberschreibung = opts && opts.abWerkFixtureVerzeichnis;
  const standardVorlagenUeberschreibung = opts && opts.standardVorlagenVerzeichnis;   // Gerüst-Schnitt S4: die Zeremonie misst ihre Wegwerf-Kopie
  const textsatzDeUeberschreibung = opts && opts.textsatzDeModulPfad;   // S8: der deutsche Satz ist ein Modul; die Positivkontrolle der Bestandserhebung mutiert eine Kopie
  if (!bereichsUeberschreibung && !fixtureUeberschreibung && !standardVorlagenUeberschreibung && !textsatzDeUeberschreibung) return basis;
  return basis.map((pfad) => {
    if (bereichsUeberschreibung && path.dirname(pfad) === BEREICH_TEMPLATE_VERZEICHNIS) {
      return path.join(bereichsUeberschreibung, path.basename(pfad));
    }
    if (fixtureUeberschreibung && AB_WERK_FIXTURE_PFADE_4.includes(pfad)) {   // nur die AB_WERK-Fixtures selbst, nicht jede Datei im Verzeichnis (das Zugangs-Template liegt dort auch)
      return path.join(fixtureUeberschreibung, path.basename(pfad));
    }
    if (standardVorlagenUeberschreibung && STANDARD_VORLAGEN_PFADE_4.includes(pfad)) {
      return path.join(standardVorlagenUeberschreibung, path.basename(pfad));
    }
    if (textsatzDeUeberschreibung && pfad === DE_MODUL_PFAD) return textsatzDeUeberschreibung;
    return pfad;
  });
}

/* Was ein Rezept über die Zusammensetzung hinaus trägt (15.09.2026, „Produkt als signiertes
   Rezept"): Zugangsart, Odoo-Produktvorlage, Anzeigename. Bis heute stand das nur im Worker-Code
   des Gateways; seit die Rezepte als `rezepte/<slug>.json` auf die Ablage gehen
   (tools/kern-ausliefern.js), steht es hier neben der Zusammensetzung. Werte wortgleich aus dem
   Gateway übernommen (dort `tests/fixtures/rezepte/`). Zugangsart und Odoo-ID sind
   sicherheitsrelevant: `frei` liefert ohne Nachweis, `verkauft` nur nach bezahlter Rechnung mit
   genau dieser Produktvorlage. */
const REZEPT_KOEPFE = Object.freeze({
  'privat-de': Object.freeze({ zugangsart: 'frei', odooProduktVorlageId: null, anzeigename: Object.freeze({ de: 'VD Privat — Deutsch', en: 'VD Privat — German' }) }),
  'privat-en': Object.freeze({ zugangsart: 'frei', odooProduktVorlageId: null, anzeigename: Object.freeze({ de: 'VD Privat — Englisch', en: 'VD Privat — English' }) }),
  'pro-de': Object.freeze({ zugangsart: 'verkauft', odooProduktVorlageId: 36, anzeigename: Object.freeze({ de: 'VD Pro — Deutsch', en: 'VD Pro — German' }) }),
  'pro-en': Object.freeze({ zugangsart: 'verkauft', odooProduktVorlageId: 37, anzeigename: Object.freeze({ de: 'VD Pro — Englisch', en: 'VD Pro — English' }) }),
});

/* DIE MESSUNG, DIE VERLANGT: "wie viele deutsche Zeilen stehen im
   englischen Produkt?" — über den ECHTEN Lesepfad (`textLesen`/`textsatzSpracheAktiv`,
   dieselbe Funktion, die STRINGS/Feld-Labels tatsächlich liest), nicht nachgebaut.
   Registriert das EN-Modul über den ECHTEN Weg (`_textsatzModuleAusDepotAnmelden`),
   liest dann JEDEN Schlüssel, den das DE-Modul kennt, über `textLesen` — fällt der
   Kern für einen Schlüssel auf den eingebauten (deutschen) Wert zurück UND ist
   dieser Wert wortgleich mit dem DE-Modul, ist das eine deutsche Zeile im
   englischen Produkt: das EN-Modul deckt diesen Schlüssel nicht ab. */
function deutscheZeilenImEnglischenProdukt(V, deTexte, enModul) {
  const leck = [];
  V.setData(V.leeresDepot());
  const daten = V.getData();
  daten.textsatzModule = [enModul];
  V._textsatzModuleAusDepotAnmelden(daten);
  daten.textsprache = 'en';
  for (const [kennung, deWert] of Object.entries(deTexte)) {
    const gelesen = V.textLesen(kennung);
    if (gelesen === deWert) leck.push(kennung);
  }
  return { anzahl: leck.length, kennungen: leck, gesamt: Object.keys(deTexte).length };
}

module.exports = {
  REPO, EN_MODUL_PFAD, DE_MODUL_PFAD, SPRACHANGEBOT_EN_PFAD, PRO_MODUL_PFAD, PRO_MODUL_PFAD_EN,
  PRO_BEREICHS_ERSATZ_PFAD, PRO_VORLAGE_DE_PFAD, PRO_VORLAGE_EN_PFAD, PRODUKTE, REZEPT_KOEPFE,
  BEREICHE_BEKANNT_PFAD, modulDateienFuer,
  BEREICH_TEMPLATE_VERZEICHNIS, BEREICH_TEMPLATE_PFADE_PRIVAT_13, BEREICH_TEMPLATE_PFADE_PRO_6,
  DOKUMENT_MODUL_VERZEICHNIS, DOKUMENT_MODUL_PFADE_4, DOKUMENTE_DE_PFAD, RECHTSRAUM_DE_PFAD, STANDARD_VORLAGEN_PFADE_4, BEREICHE_NATIV_KATALOG_PFAD, LEBENSLAGEN_KATALOG_PFAD, AB_WERK_FIXTURE_VERZEICHNIS, AB_WERK_FIXTURE_PFADE_4,
  deutscheZeilenImEnglischenProdukt,
};
