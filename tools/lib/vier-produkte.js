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
const fs = require('node:fs');
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
/* Das Erscheinungsbild (U2-ADR-473 Nachtrag, v894, 02.10.2026): das Gerüst trägt keine Erscheinungswerte, jedes Produkt bekommt
   sie als Zutat `erscheinungsbildModul`. Heute tragen alle vier Produkte dasselbe Modul „heute" — gebaut aus
   tools/erscheinung/heute.css (node tools/erscheinungsbild-modul.js). Profile (v898, v899) kommen als weitere Module dieser Form. */
const ERSCHEINUNGSBILD_HEUTE_PFAD = path.join(REPO, 'tools', 'erscheinung', 'erscheinungsbild-heute-modul.json');
/* Ab Werk (U2-ADR-473 W5a, 06.10.2026): das Profil „Salbei mit Glas“ (Produktentscheidung 06.10.2026). „heute“ bleibt ein tauschbares Profil.
   Ein anderes Ab-Werk-Bild ist genau diese eine Zeile: das Gerüst kennt keinen Profilnamen. */
const ERSCHEINUNGSBILD_AB_WERK_PFAD = path.join(REPO, 'tools', 'erscheinung', 'erscheinungsbild-salbei-glas-modul.json');
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
// Schema 87 (21.09.2026): der Erbschein-Vorbereitungsauszug ist wie der Zugang-Auszug ein Template im Rezept, kein Kern-Auszug mehr.
// Seit 04.10.2026 (Entscheidung der Geschäftsführung) tragen auch die Pro-Produkte beide ab Werk; Probe tests/pro-traegt-erbschein-zugang-ab-werk.test.js.
const ERBSCHEIN_TEMPLATE_PFAD = path.join(AB_WERK_FIXTURE_VERZEICHNIS, 'erbschein-vorbereitung-logikmodul.json');
// IPS-Begleittext (U2-ADR-458): die festen Sätze des FHIR-IPS-Exports je Exportsprache — jedes Produkt trägt dasselbe Modul,
// die Exportsprache wählt die Bürgerin beim Export, unabhängig von der Produktsprache. In `modulPfade`, damit das Rezept
// (tools/kern-ausliefern.js, _rezeptBauen) es führt und Mess- und Auslieferweg dasselbe Produkt bauen.
const IPS_BEGLEITTEXT_PFAD = path.join(REPO, 'tools', 'ips-begleittext-modul.json');
// Amtliche Vorlagen ohne Hinweis auf aktive Inhalte (16.10.2026): in jedes Produkt, das Gerüst trägt keine.
const AMTLICHE_VORLAGEN_PFAD = path.join(REPO, 'tools', 'amtliche-vorlagen.json');
/* Pro trägt eigene Situationen (U2-ADR-243 Teil 2, entschieden 02.10.2026): Vertretung, Übergabe, Einarbeitung, Nachfolge,
   je Sprache eine Datei. Die zehn privaten Situationen (AB_WERK_FIXTURE_PFADE_4[0]) stehen in Pro nicht mehr im Angebot; Einträge
   einer älteren Pro-Datei darin gehen nicht verloren (tests/pro-situationen.test.js). */
const PRO_SITUATIONEN_PFAD_DE = path.join(REPO, 'tools', 'templates', 'vivodepot-pro-situationen-de.json');
const PRO_SITUATIONEN_PFAD_EN = path.join(REPO, 'tools', 'templates', 'vivodepot-pro-situationen-en.json');
/* Kachel-Schnitt (02.10.2026): Pro trägt weder den Lebenslagen-Katalog (und damit die Anlass-Kacheln ohne eigene Situation, die
   darin stehen) noch die fünf privaten Assistenten (gebwiz, anamwiz, pflwiz, heirwiz, umzwiz); pvwiz/kiwiz kommen aus dem
   Dokumentmodul und bleiben. Werte, die eine ältere Pro-Datei darüber schon trägt, liegen in Bereichen und Situationen und bleiben
   über die ruhenden Bereiche und Situationen lesbar (tests/anlass-kacheln-rezept.test.js). */
/* Notar in Pro RUHT (Nachtrag U2-ADR-427, Entscheidung der Geschäftsführung 07.10.2026): das Notariatsmodul (Kanzleivertretung)
   kommt für den Erstverkauf nicht ab Werk in pro-de/pro-en; es kehrt mit der Berufsmodul-Wahl beim Kauf zurück (ADR 489). Die
   Moduldateien bleiben im Bestand (PRO_NOTAR_TEMPLATE_PFAD_DE/EN oben). Das Verbot steht im DoD-Werkzeug (TEMPLATES_VERBOTEN_JE_SLUG). */
const PRODUKTE = Object.freeze([
  Object.freeze({ slug: 'privat-de', sprache: 'de', sprachModulPfad: DE_MODUL_PFAD, erscheinungsbildModulPfad: ERSCHEINUNGSBILD_AB_WERK_PFAD, proModulPfad: null, bereichsErsatzPfad: null, vorlagenPfad: null, bereicheBekanntPfad: BEREICHE_BEKANNT_PFAD, modulPfade: BEREICH_TEMPLATE_PFADE_PRIVAT_13.concat(DOKUMENT_MODUL_PFADE_4, [DOKUMENTE_DE_PFAD, RECHTSRAUM_DE_PFAD], STANDARD_VORLAGEN_PFADE_4, [BEREICHE_NATIV_KATALOG_PFAD, LEBENSLAGEN_KATALOG_PFAD], AB_WERK_FIXTURE_PFADE_4, [IPS_BEGLEITTEXT_PFAD], [AMTLICHE_VORLAGEN_PFAD], [ANGEHOERIGEN_VORLAGE_PFAD_DE], [SPRACHANGEBOT_EN_PFAD]), templatePfade: Object.freeze([ZUGANG_RECHT_TEMPLATE_PFAD, ERBSCHEIN_TEMPLATE_PFAD]) }),
  Object.freeze({ slug: 'privat-en', sprache: 'en', sprachModulPfad: EN_MODUL_PFAD, erscheinungsbildModulPfad: ERSCHEINUNGSBILD_AB_WERK_PFAD, proModulPfad: null, bereichsErsatzPfad: null, vorlagenPfad: null, bereicheBekanntPfad: BEREICHE_BEKANNT_PFAD, modulPfade: BEREICH_TEMPLATE_PFADE_PRIVAT_13.concat(DOKUMENT_MODUL_PFADE_4, [DOKUMENTE_DE_PFAD, RECHTSRAUM_DE_PFAD], STANDARD_VORLAGEN_PFADE_4, [BEREICHE_NATIV_KATALOG_PFAD, LEBENSLAGEN_KATALOG_PFAD], AB_WERK_FIXTURE_PFADE_4, [IPS_BEGLEITTEXT_PFAD], [AMTLICHE_VORLAGEN_PFAD], [ANGEHOERIGEN_VORLAGE_PFAD_EN]), templatePfade: Object.freeze([ZUGANG_RECHT_TEMPLATE_PFAD, ERBSCHEIN_TEMPLATE_PFAD]) }),
  Object.freeze({ slug: 'pro-de', sprache: 'de', sprachModulPfad: DE_MODUL_PFAD, erscheinungsbildModulPfad: ERSCHEINUNGSBILD_AB_WERK_PFAD, proModulPfad: PRO_MODUL_PFAD, bereichsErsatzPfad: null, vorlagenPfad: null, bereicheBekanntPfad: BEREICHE_BEKANNT_PFAD, modulPfade: BEREICH_TEMPLATE_PFADE_PRO_6.concat([BEREICH_TEMPLATE_PFAD_IDENTITY], DOKUMENT_MODUL_PFADE_4, [DOKUMENTE_DE_PFAD, RECHTSRAUM_DE_PFAD], STANDARD_VORLAGEN_PFADE_4, [BEREICHE_NATIV_KATALOG_PFAD], [PRO_SITUATIONEN_PFAD_DE], [IPS_BEGLEITTEXT_PFAD], [AMTLICHE_VORLAGEN_PFAD], [ANGEHOERIGEN_VORLAGE_PFAD_DE], [SPRACHANGEBOT_EN_PFAD]), templatePfade: Object.freeze([ZUGANG_RECHT_TEMPLATE_PFAD, ERBSCHEIN_TEMPLATE_PFAD]) }),
  Object.freeze({ slug: 'pro-en', sprache: 'en', sprachModulPfad: EN_MODUL_PFAD, erscheinungsbildModulPfad: ERSCHEINUNGSBILD_AB_WERK_PFAD, proModulPfad: PRO_MODUL_PFAD_EN, bereichsErsatzPfad: null, vorlagenPfad: null, bereicheBekanntPfad: BEREICHE_BEKANNT_PFAD, modulPfade: BEREICH_TEMPLATE_PFADE_PRO_6.concat([BEREICH_TEMPLATE_PFAD_IDENTITY], DOKUMENT_MODUL_PFADE_4, [DOKUMENTE_DE_PFAD, RECHTSRAUM_DE_PFAD], STANDARD_VORLAGEN_PFADE_4, [BEREICHE_NATIV_KATALOG_PFAD], [PRO_SITUATIONEN_PFAD_EN], [IPS_BEGLEITTEXT_PFAD], [AMTLICHE_VORLAGEN_PFAD], [ANGEHOERIGEN_VORLAGE_PFAD_EN]), templatePfade: Object.freeze([ZUGANG_RECHT_TEMPLATE_PFAD, ERBSCHEIN_TEMPLATE_PFAD]) }),
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
  const basis = [p.sprachModulPfad, p.erscheinungsbildModulPfad, p.bereichsErsatzPfad, p.vorlagenPfad, p.proModulPfad, p.bereicheBekanntPfad, ...(p.modulPfade || []), ...(p.templatePfade || [])].filter(Boolean);
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

/* PRODUKT-ZUSCHNITTE: Pro mit einem Berufsmodul ab Werk (U2-ADR-489, Pro-Konzept C2 vom 06.10.2026, gebaut 12.10.2026)
   Die Kundin wählt ihr Berufsmodul beim Kauf; geliefert wird ein Pro, das dieses Modul im Rezept trägt. Ein Zuschnitt ist
   KEIN fünftes Grundprodukt: `PRODUKTE` bleibt bei vier, und alles, was über `PRODUKTE` läuft, bleibt, wie es ist. Ein
   Zuschnitt ist ein Pro-Grundprodukt plus die zwei Dateien eines Berufsmoduls (Bereich und Auszug) in seiner Modulliste.
   KENNUNG: <produkt>-<sprache>-<zuschnitt>, z. B. pro-de-kanzlei. Der Zuschnitt nennt den Beruf, nie ein Land (den
   Rechtsraum trägt das Modul selbst). Form wie ein DNS-Name: a–z, 0–9, Bindestrich, höchstens 63 Zeichen, kein Bindestrich
   am Rand (mit dem Download-Dienst abgestimmt).
   WELCHE BERUFE ES GIBT, steht nicht hier, sondern im Verzeichnis tools/berufsmodule/: jedes Berufsmodul, das dort mit beiden
   Teilen in einer Sprache liegt, ergibt den Zuschnitt dieser Sprache. Ein neues Berufsmodul braucht hier keine Zeile.
   NICHT IN DER GEMEINSAMEN ABDRUCK-LISTE: die Abdrücke der Berufsmodule stehen NICHT in REZEPT_FINGERABDRUECKE_KERN
   (tools/rezept-fingerabdruecke-erheben.js liest allein PRODUKTE). Diese Liste gilt im Kern für jedes Produkt; stünde ein
   Berufsmodul darin, gälte es als Datei in einem gewöhnlichen Pro oder Privat als ab Werk, und die Selbst-Einlass-Sperre
   ließe das gekaufte Modul ohne Kauf durch (gemessen 12.10.2026: tests/pro-berufsmodule.test.js wurde rot). Ein Zuschnitt
   erkennt sein Modul über die eigene Saat des Produkts. */
const BERUFSMODUL_VERZEICHNIS = path.join(REPO, 'tools', 'berufsmodule');
const BERUFSMODUL_TEILE = Object.freeze(['bereich', 'logikmodul']);
const ZUSCHNITT_KENNUNG = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const berufsmodulPfad = (beruf, teil, sprache, verzeichnis = BERUFSMODUL_VERZEICHNIS) => path.join(verzeichnis, 'vivodepot-pro-' + beruf + '-' + teil + '-' + sprache + '.json');
function berufsmoduleImBestand(verzeichnis = BERUFSMODUL_VERZEICHNIS) {
  const berufe = new Set();
  // Eine Teilkopie des Repos ohne dieses Verzeichnis (manche Proben bauen eine) hat schlicht keine Zuschnitte.
  if (!fs.existsSync(verzeichnis)) return [];
  for (const n of fs.readdirSync(verzeichnis).sort()) {
    const m = /^vivodepot-pro-([a-z0-9]+(?:-[a-z0-9]+)*)-(?:bereich|logikmodul)-[a-z]{2}\.json$/.exec(n);
    if (m) berufe.add(m[1]);
  }
  return [...berufe].sort();
}
function zuschnitteAus(verzeichnis = BERUFSMODUL_VERZEICHNIS) {
  return berufsmoduleImBestand(verzeichnis).flatMap((beruf) => PRODUKTE.filter((p) => p.proModulPfad).map((basis) => {
    const teile = BERUFSMODUL_TEILE.map((teil) => berufsmodulPfad(beruf, teil, basis.sprache, verzeichnis));
    if (!teile.every((t) => fs.existsSync(t))) return null;   // das Berufsmodul gibt es in dieser Sprache nicht ganz: kein Zuschnitt
    const slug = basis.slug + '-' + beruf;
    if (!ZUSCHNITT_KENNUNG.test(slug)) throw new Error('Zuschnitt „' + slug + '“: die Kennung hat nicht die Form eines DNS-Namens (a–z, 0–9, Bindestrich, höchstens 63 Zeichen).');
    return Object.freeze(Object.assign({}, basis, { slug, basis: basis.slug, zuschnitt: beruf,
      berufsmodulPfade: Object.freeze(teile), modulPfade: Object.freeze([...(basis.modulPfade || []), ...teile]) }));
  })).filter(Boolean);
}
const PRODUKT_ZUSCHNITTE = Object.freeze(zuschnitteAus());
/* Der Rezeptkopf eines Zuschnitts: Zugangsart wie das Grundprodukt. Die Odoo-Produktvorlage ist je Berufsmodul ein EIGENER
   Artikel (im Klon gemessen, 12.10.2026: Artikel tragen, Varianten nicht). Die Nummer vergibt Odoo; sie wird hier
   eingetragen, sobald der Artikel angelegt ist. Ohne Eintrag gibt es für einen Zuschnitt KEINEN Rezeptkopf, und die Auslieferung
   kann ihn nicht als verkäuflich aufs Regal legen: lieber kein Rezept als eines mit der Nummer eines anderen Artikels. */
/* Eingetragen 12.10.2026: die vier Artikel stehen in der Shop-Instanz, unveröffentlicht (gemeldet vom Shop-Strang, dort
   am Artikelstamm gelesen; Artikelreferenz vd-<kennung>). Die Nummer sagt, zu welchem Artikel ein Rezept gehört. Der
   Download-Dienst entscheidet heute an der Kennung in der Kauf-Adresse, die am Artikel steht, nicht an dieser Nummer; sein
   älterer Weg über die Zahlungsprüfung liest sie. Eine vertauschte Zeile ist darum in beiden Fällen ein Fehler. Dieselbe Zuordnung steht ein zweites Mal in tools/zuschnitt-artikel-beleg.json; wer hier eine
   Zeile ändert, ändert sie dort, und die Probe [Pro·Zuschnitt·Artikel-Beleg] hält beide gegeneinander. */
const ZUSCHNITT_ODOO_PRODUKT_VORLAGE = Object.freeze({
  'pro-de-steuerberatung': 47,
  'pro-de-kanzlei': 48,
  'pro-en-steuerberatung': 49,
  'pro-en-kanzlei': 50,
});
/* Der Beleg zur Tabelle oben: dieselbe Zuordnung ein zweites Mal, mit der Artikelreferenz des Shops (vd-<kennung>), in
   tools/zuschnitt-artikel-beleg.json. Eine vertauschte oder nur an einer Stelle geänderte Zeile fällt damit auf. Liefert die
   Abweichungen als Sätze; leer heißt: Tabelle und Beleg sagen dasselbe. Ob der Beleg selbst gegen den Shop gehalten wurde,
   sagt sein Feld `abgleich`. */
const ZUSCHNITT_ARTIKEL_BELEG_PFAD = path.join(__dirname, '..', 'zuschnitt-artikel-beleg.json');
function zuschnittArtikelBelegLesen(pfad = ZUSCHNITT_ARTIKEL_BELEG_PFAD) { return JSON.parse(fs.readFileSync(pfad, 'utf8')); }
function zuschnittArtikelAbweichungen(tabelle = ZUSCHNITT_ODOO_PRODUKT_VORLAGE, beleg = zuschnittArtikelBelegLesen()) {
  const funde = [];
  const zeilen = Array.isArray(beleg && beleg.artikel) ? beleg.artikel : [];
  const jeKennung = new Map();
  for (const z of zeilen) {
    if (!z || typeof z.kennung !== 'string') { funde.push('Beleg: eine Zeile ohne Kennung'); continue; }
    if (jeKennung.has(z.kennung)) funde.push('Beleg: ' + z.kennung + ' steht zweimal');
    jeKennung.set(z.kennung, z);
    if (z.artikelreferenz !== 'vd-' + z.kennung) funde.push('Beleg: ' + z.kennung + ' trägt die Artikelreferenz „' + z.artikelreferenz + '“, erwartet vd-' + z.kennung);
    if (!Number.isInteger(z.odooProduktVorlageId)) funde.push('Beleg: ' + z.kennung + ' ohne ganze Artikelnummer');
  }
  const nummern = zeilen.map((z) => z && z.odooProduktVorlageId);
  if (new Set(nummern).size !== nummern.length) funde.push('Beleg: eine Artikelnummer steht bei zwei Kennungen');
  for (const [kennung, nummer] of Object.entries(tabelle)) {
    const z = jeKennung.get(kennung);
    if (!z) { funde.push(kennung + ': in der Tabelle, nicht im Beleg'); continue; }
    if (z.odooProduktVorlageId !== nummer) funde.push(kennung + ': Tabelle sagt ' + nummer + ', Beleg sagt ' + z.odooProduktVorlageId);
  }
  for (const kennung of jeKennung.keys()) if (!(kennung in tabelle)) funde.push(kennung + ': im Beleg, nicht in der Tabelle');
  return funde;
}
const ZUSCHNITT_ANZEIGENAME = Object.freeze({
  kanzlei: Object.freeze({ de: 'Kanzlei', en: 'Law firm' }),
  steuerberatung: Object.freeze({ de: 'Steuerberatung', en: 'Tax advisory' }),
});
function zuschnittRezeptKopf(z, odooVorlagen = ZUSCHNITT_ODOO_PRODUKT_VORLAGE) {
  const basis = REZEPT_KOEPFE[z.basis];
  const odoo = odooVorlagen[z.slug];
  if (!basis || !Number.isInteger(odoo)) return null;
  const name = ZUSCHNITT_ANZEIGENAME[z.zuschnitt] || { de: z.zuschnitt, en: z.zuschnitt };
  return Object.freeze({ zugangsart: basis.zugangsart, odooProduktVorlageId: odoo,
    anzeigename: Object.freeze({ de: basis.anzeigename.de + ' · ' + name.de, en: basis.anzeigename.en + ' · ' + name.en }) });
}

/* Was die Auslieferung aufs Regal legt: die vier Grundprodukte und jeder Zuschnitt, der einen Rezeptkopf HAT (also seine
   eigene Artikelnummer). Ohne eingetragene Nummern sind das genau die vier Grundprodukte; die Nummern nachzutragen ist eine
   reine Datenzeile in ZUSCHNITT_ODOO_PRODUKT_VORLAGE. Kern-Ausliefern, Rezepte-Signieren und Ablage-Prüfen lesen von hier.
   Dazu kommt die Zurückhaltung unten: ohne abgeglichenen Beleg bleiben es die vier Grundprodukte. */
/* Ein Zuschnitt geht erst hinaus, wenn seine Artikelnummer gegen den Shop gehalten wurde (12.10.2026). Bis dahin ist der
   Beleg eine Abschrift derselben Hand, die die Tabelle geschrieben hat. Liefert den Grund als Satz, oder null, wenn nichts
   zurückgehalten wird. Ein nicht lesbarer Beleg hält zurück. */
const BELEG_TAG = /^\d{4}-\d{2}-\d{2}$/;
function zuschnittZurueckhaltung(odooVorlagen = ZUSCHNITT_ODOO_PRODUKT_VORLAGE, beleg) {
  if (!PRODUKT_ZUSCHNITTE.some((z) => zuschnittRezeptKopf(z, odooVorlagen))) return null;   // kein Zuschnitt mit Artikelnummer: nichts zurückzuhalten
  let b = beleg;
  if (b === undefined) { try { b = zuschnittArtikelBelegLesen(); } catch (e) { return 'Die Zuschnitte gehen nicht hinaus: der Beleg der Artikelnummern ist nicht lesbar.'; } }
  const tag = b && b.abgleich;
  const zeit = (typeof tag === 'string' && BELEG_TAG.test(tag)) ? Date.parse(tag + 'T00:00:00Z') : NaN;
  if (Number.isNaN(zeit) || new Date(zeit).toISOString().slice(0, 10) !== tag) {   // auch der 30. Februar ist kein Datum
    return 'Die Zuschnitte gehen nicht hinaus: ihre Artikelnummern sind noch nicht gegen den Shop abgeglichen (Feld „abgleich“ im Beleg trägt kein Datum).';
  }
  const abweichungen = zuschnittArtikelAbweichungen(odooVorlagen, b);
  if (abweichungen.length) return 'Die Zuschnitte gehen nicht hinaus: Tabelle und Beleg der Artikelnummern weichen ab (' + abweichungen.join('; ') + ').';
  return null;
}
function auslieferbareProdukte(odooVorlagen = ZUSCHNITT_ODOO_PRODUKT_VORLAGE, beleg) {
  if (zuschnittZurueckhaltung(odooVorlagen, beleg)) return [...PRODUKTE];
  return [...PRODUKTE, ...PRODUKT_ZUSCHNITTE.filter((z) => zuschnittRezeptKopf(z, odooVorlagen))];
}
function rezeptKoepfeAlle(odooVorlagen = ZUSCHNITT_ODOO_PRODUKT_VORLAGE, beleg) {
  const koepfe = Object.assign({}, REZEPT_KOEPFE);
  if (zuschnittZurueckhaltung(odooVorlagen, beleg)) return Object.freeze(koepfe);
  for (const z of PRODUKT_ZUSCHNITTE) { const kopf = zuschnittRezeptKopf(z, odooVorlagen); if (kopf) koepfe[z.slug] = kopf; }
  return Object.freeze(koepfe);
}
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
  /* Selbst-Einlass-Sperre (04.10.2026): das englische Modul ist Vivodepots eigenes, im englischen Produkt AB WERK gebacken.
     Als Depot-Modul angemeldet, fielen die Texte der Schutzliste heraus und erschienen hier fälschlich als „kein Deutsch“ —
     darum dieselbe Stufe wie ab Werk für dieses Fach. */
  if (typeof V.textsatzModulPruefen === 'function' && V._TEXTSATZ_MODUL_REGISTRY) {
    const g = V.textsatzModulPruefen(enModul, { vertrauenswuerdig: true });
    if (g && g.gueltig) {
      const reg = V._TEXTSATZ_MODUL_REGISTRY;
      if (!reg.en) reg.en = Object.create(null);
      reg.en[''] = Object.assign(Object.create(null), reg.en[''] || {}, g.texte);
    }
  }
  daten.textsprache = 'en';
  for (const [kennung, deWert] of Object.entries(deTexte)) {
    const gelesen = V.textLesen(kennung);
    if (gelesen === deWert) leck.push(kennung);
  }
  return { anzahl: leck.length, kennungen: leck, gesamt: Object.keys(deTexte).length };
}

module.exports = {
  REPO, EN_MODUL_PFAD, DE_MODUL_PFAD, SPRACHANGEBOT_EN_PFAD, PRO_MODUL_PFAD, PRO_MODUL_PFAD_EN,
  PRO_BEREICHS_ERSATZ_PFAD, PRO_VORLAGE_DE_PFAD, PRO_VORLAGE_EN_PFAD, PRO_SITUATIONEN_PFAD_DE, PRO_SITUATIONEN_PFAD_EN, PRO_NOTAR_TEMPLATE_PFAD_DE, PRO_NOTAR_TEMPLATE_PFAD_EN, PRODUKTE, REZEPT_KOEPFE,
  BEREICHE_BEKANNT_PFAD, ERSCHEINUNGSBILD_HEUTE_PFAD, ERSCHEINUNGSBILD_AB_WERK_PFAD, modulDateienFuer,
  BEREICH_TEMPLATE_VERZEICHNIS, BEREICH_TEMPLATE_PFADE_PRIVAT_13, BEREICH_TEMPLATE_PFADE_PRO_6,
  DOKUMENT_MODUL_VERZEICHNIS, DOKUMENT_MODUL_PFADE_4, DOKUMENTE_DE_PFAD, RECHTSRAUM_DE_PFAD, STANDARD_VORLAGEN_PFADE_4, BEREICHE_NATIV_KATALOG_PFAD, LEBENSLAGEN_KATALOG_PFAD, AB_WERK_FIXTURE_VERZEICHNIS, AB_WERK_FIXTURE_PFADE_4,
  deutscheZeilenImEnglischenProdukt,
  PRODUKT_ZUSCHNITTE, ZUSCHNITT_KENNUNG, ZUSCHNITT_ODOO_PRODUKT_VORLAGE, BERUFSMODUL_VERZEICHNIS, berufsmoduleImBestand, zuschnitteAus, zuschnittRezeptKopf, auslieferbareProdukte, rezeptKoepfeAlle,
  ZUSCHNITT_ARTIKEL_BELEG_PFAD, zuschnittArtikelBelegLesen, zuschnittArtikelAbweichungen, zuschnittZurueckhaltung,
};
