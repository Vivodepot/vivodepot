'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   textsatz-en-begriffe-pruefen.js — misst RICHTIGKEIT des englischen Bürgersatzes,
   nicht nur Abdeckung
   ────────────────────────────────────────────────────────────────────────────
   Anlass (01.09.2026): die Produktentscheidung fand `people.guidedBirthEntryChildsNameNot.label`
   auf Englisch sinnentstellt („Birth assistant" für den WIZARD „Geburts-Assistent"
   — englisch heißt „birth assistant/attendant" eine Hebamme) und in derselben
   Karte zwei verschiedene englische Wörter für denselben deutschen Begriff
   (`feldgruppe.fg-menschen-geburtsassistent.label`: „attendant" vs. „assistant").

   Bestehende Werkzeuge (`textsatz-en-beleg-messen.js` u. a.) prüfen ABDECKUNG:
   alle Kennungen aus `AB_WERK_TEXTSATZ_DE.texte` gegen die drei EN-Quelldateien
   gehalten. Eine falsche Übersetzung ist zu 100% abgedeckt — Abdeckung sagt
   nichts über Richtigkeit. Dieses Werkzeug prüft drei andere, mechanisch
   messbare Eigenschaften:

   1. UNEINHEITLICHKEIT — derselbe deutsche WERT (exakt, wortgleich) an
      mehreren Kennungen, mit MEHR als einer englischen Entsprechung. Die
      mechanisch stärkste der drei Proben: braucht kein Wörterbuch, nur
      Gruppierung.
   2. GESCHWISTER-KANDIDATEN — jede Kennung, deren deutscher WERT eines der
      tragenden Fachwörter (unten, GLOSSAR_WOERTER) ENTHÄLT (auch als
      Kompositum, z. B. „Vorsorgevollmacht" für „Vollmacht" — deutsche
      Komposita haben keine Wortgrenze an der Fuge, ein \b-Regex fände sie
      nicht). Liefert Rohmaterial für zwei Lesarten: „ergibt der englische
      Text für sich allein Sinn" (blind lesen, OHNE das Deutsche daneben —
      das kann dieses Werkzeug nicht automatisieren, nur die Kandidaten
      liefern) UND „ist die englische Entsprechung INNERHALB der Gruppe
      einheitlich" (das sieht man am gruppierten Ausdruck oft auf einen
      Blick, wie beim Assistent/Attendant-Fund).
   3. DEUTSCHE RESTE im EN-Modul — Umlaute/ß oder häufige deutsche
      Funktionswörter in einem als Englisch ausgelieferten Wert. Heuristik,
      keine Grammatikprüfung — Fehlalarme möglich (ein Eigenname, ein
      bewusst deutsch belassener §-Verweis), darum liefert es Fundstellen,
      keine Urteile.
   4. GLOSSARTREUE (seit 01.09.2026, U2-ADR-195) — für die wenigen Begriffe,
      bei denen die Erhebung EINE feststehende Antwort ohne legitime
      Gegenbeispiele fand (s. GLOSSAR unten), hält jede Geschwister-
      Fundstelle gegen die festgelegte Fassung. Bewusst klein: ein zu
      breites Glossar meldet Fehlalarme dort, wo ein Begriff je nach
      Zusammenhang zu Recht verschieden übersetzt ist (Träger, Fach mit
      Handschuhfach), und verliert damit sein Vertrauen.

   WAS DIESES WERKZEUG NICHT KANN, AUSDRÜCKLICH: ob ein englischer Satz für
   eine Muttersprachlerin NATÜRLICH klingt, kann KEINE der vier Proben
   prüfen — nur Einheitlichkeit und Glossartreue. Klasse 1 (Geschwister-
   Kandidaten) liefert weiterhin Rohmaterial für eine Lesarten-Prüfung durch
   einen Menschen oder ein Sprachmodell, für Begriffe, die (noch) kein
   GLOSSAR-Eintrag tragen — das Werkzeug selbst urteilt dort nicht.

   Quellen: `AB_WERK_TEXTSATZ_DE.texte` (vivodepot.html, über tests/load-kern.js) als
   Deutsch; `textsatz-en-daten.js` + `textsatz-en-optionswerte-daten.js` +
   `textsatz-en-vollabdeckung-daten.js` zusammengeführt (derselbe Weg wie
   `textsatz-en-modul-erzeugen.js`) als Englisch.

   Aufruf:
     node tools/textsatz-en-begriffe-pruefen.js [--json] [--wort=<Begriff>]
   `--wort` filtert die Geschwister-Ausgabe auf einen einzelnen Begriff (für
   gezielte Nachprüfung, z. B. `--wort=Assistent`).
   ════════════════════════════════════════════════════════════════════════════ */
const { deTexte } = require('./lib/textsatz-de-quelle.js');
const path = require('node:path');

// Die genannten Geschwister-Begriffe (01.09.2026) — plus „Assistent"
// selbst, der Anlassfall: nicht Teil ihrer Liste (der galt als bereits gefunden), aber
// seine Aufnahme hier ist die Positivkontrolle des Werkzeugs — findet es den bekannten
// Fund nicht mit, hat die Extraktion selbst einen Fehler.
const GLOSSAR_WOERTER = Object.freeze([
  'Assistent', 'Betreuer', 'Vollmacht', 'Träger', 'Mandant', 'Anker', 'Depot', 'Bereich',
  'Mappe', 'Umschlag', 'Blatt', 'Karte', 'Sitzung', 'Schlüssel', 'Fach',
  // 01.09.2026 (U2-ADR-195, Zufallsstichprobe): „Patientenverfügung" kam nicht über die
  // ursprüngliche Geschwister-Liste, sondern über einen wortidentischen Uneinheitlichkeits-Fund
  // (Klasse 2) dazu — trägt seither auch eine Glossar-Festlegung (Klasse 4).
  'Patientenverfügung',
  // 01.09.2026 (derselbe Tag): „Steuerklasse" stand in GLOSSAR (Klasse 4,
  // Festlegung „tax class"), fehlte aber HIER — geschwisterKandidaten() filtert seine
  // Kandidaten-Suche gegen GENAU DIESES Array; ohne Eintrag hier lieferte sie für „Steuerklasse"
  // immer eine leere Liste, glossartreuePruefen fand darum nie einen Kandidaten zum Prüfen, und
  // der Wächter blieb grün trotz fünf „Tax bracket"-Stellen im Bestand. ZWEI Register, nicht
  // eines — ein Begriff braucht beide, um bewacht zu sein.
  'Steuerklasse',
]);

/* AUSNAHMEN — abgeleitete Wörter, die den Glossar-Begriff als Buchstabenfolge enthalten, aber
   ETYMOLOGISCH VERWANDT UND SEMANTISCH ANDERS sind: nicht die Fachbedeutung des Substantivs,
   sondern ein Adjektiv/Verb aus derselben Wurzel. Substring-Suche (mit Kleinschreibung, s.
   geschwisterKandidaten) findet sie mit — case-insensitives Kompositum-Finden UND
   False-Positive-Anfälligkeit sind dieselbe Ursache, nicht zwei getrennte Probleme. Gefunden
   NICHT vermutet: fragte am 01.09.2026 gezielt nach der Gegenrichtung, „Fach" (16 neue
   Treffer) erwies sich zur Hälfte als „einfach"/„mehrfach"/„vielfach"/„fachlich"/„fachgerecht" —
   und beim Nachsehen war „Schlüssel" schlimmer: von 23 neuen Treffern waren ~20
   „verschlüsselt"/„entschlüsselt"/„Verschlüsselung" (das VERB verschlüsseln, nicht das Substantiv
   der Schlüssel). Liste ist kuratiert, nicht vollständig herleitbar — wächst bei weiteren Funden,
   wie die Stopwort-Kollision in Klasse 3. */
const GESCHWISTER_AUSNAHMEN = Object.freeze({
  Fach: [/einfach/i, /mehrfach/i, /vielfach/i, /fachlich/i, /fachgerecht/i, /fachkundig/i, /fachmännisch/i],
  Schlüssel: [/verschlüssel/i, /entschlüssel/i],
  // Die MARKE „Vivodepot" enthält „depot" als Buchstabenfolge, ist aber kein Übersetzungsfall
  // (Eigennamen werden nicht übersetzt) — gefunden über die Glossartreue-Probe, die sonst jede
  // reine Markennennung als Verstoß gegen „Depot → vault" gemeldet hätte (71 von 72 Delta-
  // Fundstellen einer früheren Nachprüfung waren genau das, s. Bericht „Englischer Bürgersatz").
  // Ein „Sub-Depot" bleibt ein echter Treffer — „vivodepot" ist darin nicht enthalten.
  Depot: [/vivodepot/i],
  // „Aufgabenbereich(e)" (Zuständigkeits-Bereich einer rechtlichen Betreuung, §1815 BGB) und
  // „Referenzbereich" (medizinischer Laborwert-Referenzbereich = „reference range") sind
  // ANDERE Bedeutungen von „Bereich" als die 13 obersten Lebensbereiche der App-Navigation, um
  // die es beim Glossar-Begriff „Bereich → area" geht — beide bereits korrekt („areas of
  // responsibility"/„reference range") und gehören nicht in die area/section-Frage.
  Bereich: [/aufgabenbereich/i, /referenzbereich/i],
});

const DE_STOPWORT_REGEX = new RegExp(
  '\\b(und|oder|nicht|kein|keine|keinen|ist|sind|war|waren|der|die|das|des|dem|den|' +
  'mit|für|noch|schon|über|unter|wenn|dann|sowie|bitte|bzw|ggf|sowohl|wird|werden|' +
  'sich|Ihre[nrm]?|Ihr[e]?)\\b',
);

function ladeDeutsch() {
  return deTexte();
}

function ladeEnglisch() {
  const { TEXTSATZ_EN_TEXTE } = require(path.join(__dirname, 'textsatz-en-daten.js'));
  const { TEXTSATZ_EN_OPTIONSWERTE } = require(path.join(__dirname, 'textsatz-en-optionswerte-daten.js'));
  const { TEXTSATZ_EN_VOLLABDECKUNG } = require(path.join(__dirname, 'textsatz-en-vollabdeckung-daten.js'));
  return Object.assign({}, TEXTSATZ_EN_TEXTE, TEXTSATZ_EN_OPTIONSWERTE, TEXTSATZ_EN_VOLLABDECKUNG);
}

// Klasse 2 — Uneinheitlichkeit: gleicher deutscher WERT (exakt), mehrere englische Werte.
function uneinheitlichkeitMessen(de, en) {
  const wertZuEn = new Map();
  const wertZuSchluessel = new Map();
  for (const k of Object.keys(de)) {
    if (!Object.prototype.hasOwnProperty.call(en, k)) continue;
    const deWert = de[k]; const enWert = en[k];
    if (typeof deWert !== 'string' || typeof enWert !== 'string') continue;
    if (!deWert.trim()) continue;
    if (!wertZuEn.has(deWert)) { wertZuEn.set(deWert, new Set()); wertZuSchluessel.set(deWert, []); }
    wertZuEn.get(deWert).add(enWert);
    wertZuSchluessel.get(deWert).push(k);
  }
  const treffer = [];
  for (const [deWert, enSet] of wertZuEn) {
    if (enSet.size > 1) {
      treffer.push({ deutsch: deWert, englischeVarianten: [...enSet], kennungen: wertZuSchluessel.get(deWert) });
    }
  }
  treffer.sort((a, b) => b.englischeVarianten.length - a.englischeVarianten.length);
  return treffer;
}

// Klasse 1 — Geschwister-Kandidaten: DE-Wert enthält eines der Glossar-Wörter (Substring,
// KEIN \b-Regex — deutsche Komposita haben an der Fuge keine Wortgrenze). GROSS-/KLEINSCHREIBUNG
// IGNORIERT, bewusst: als zweites Kompositum-Glied steht das Wort klein („Vorsorgevollmacht"
// enthält „vollmacht", nicht „Vollmacht") — ein case-sensitiver Vergleich fände die Mehrheit der
// Komposita gar nicht (gefunden über einen fehlschlagenden Fixture-Test, nicht vermutet).
function geschwisterKandidaten(de, en, nurWort) {
  const woerter = nurWort ? GLOSSAR_WOERTER.filter((w) => w === nurWort) : GLOSSAR_WOERTER;
  const out = {};
  for (const wort of woerter) {
    const wortKlein = wort.toLowerCase();
    const ausnahmen = GESCHWISTER_AUSNAHMEN[wort] || [];
    const treffer = [];
    for (const k of Object.keys(de)) {
      const deWert = de[k];
      if (typeof deWert !== 'string') continue;
      // Ausnahmen ZUERST herausschneiden, dann prüfen, ob noch ein echtes Vorkommen übrig bleibt
      // — ein Satz kann beides enthalten ("verschlüsselter Schlüssel"), einfaches Ausschließen
      // bei Ausnahme-Treffer würde den echten Treffer mit wegwerfen.
      let bereinigt = deWert;
      for (const re of ausnahmen) bereinigt = bereinigt.replace(re, '');
      if (!bereinigt.toLowerCase().includes(wortKlein)) continue;
      if (!Object.prototype.hasOwnProperty.call(en, k)) continue; // ungedeckt = anderes Thema (Abdeckung)
      treffer.push({ kennung: k, deutsch: deWert, englisch: en[k] });
    }
    if (treffer.length) out[wort] = treffer;
  }
  return out;
}

/* GLOSSAR — Begriffe mit EINER festgelegten englischen Entsprechung (01.09.2026, U2-ADR-195).
   Bewusst KLEIN gehalten: nur Begriffe, bei denen die Erhebung eine einzige richtige Antwort
   ohne legitime Gegenbeispiele fand — Fach (compartment mit Handschuhfach/Glovebox als
   legitimer Ausnahme) blieb ausdrücklich draußen, weil dort echte, verschiedene Bedeutungen
   hinter demselben Wort stehen. Ein zu breites Glossar meldet Fehlalarme und verliert
   Vertrauen — lieber klein und verlässlich, wächst mit jedem geprüften Fund.
   KORREKTUR (01.09.2026): dieser Absatz nannte „Bereich" und „Betreuer" fälschlich
   als draußen gelassen, obwohl beide längst im Array unten stehen (Kopieren-Vergessen bei einer
   früheren Überarbeitung) — UND „Steuerklasse" fehlte hier komplett, obwohl der Begriff schon
   im Bestand korrigiert war. Genau diese Lücke ließ „Tax bracket" an fünf Stellen unbewacht
   stehen (Bestandsmessung nach der ersten Behebung — s. Eintrag unten). Ein Begriff, der
   nur im Bestand korrigiert, aber nie ins Glossar aufgenommen wird, hat keinen Wächter, egal wie
   gründlich der einzelne Fix war.

   `kanonisch`: Array akzeptierter englischer Fassungen (mind. eine muss als Substring
   vorkommen) — KEIN einzelner String, weil natürliche Pluralbildung („power OF attorney" wird
   im Plural „powerS of attorney"/„power(s) of attorney") sonst als Verstoß erschiene, obwohl
   sie korrektes Englisch ist (gefunden über einen ersten, zu strengen Lauf dieser Probe, nicht
   vermutet — vier von fünf ursprünglichen „Vollmacht"-Funden waren genau das).
   `ausnahmeKennungen`: Kennungen, an denen dasselbe deutsche Wort etwas ANDERES meint (echtes
   Bankdepot statt des Produkts, oder „Vollmacht" im Sinn von „Befugnis" statt des Rechts-
   instruments) — kein Widerspruch zum Glossar, sondern dessen Grenze. */
const GLOSSAR = Object.freeze([
  {
    wort: 'Assistent', kanonisch: ['Guided birth entry', 'guided birth entry'],
    // ANLASSFALL DER GANZEN KAMPAGNE (01.09.2026): „Birth assistant"/„Birth attendant" (Hebamme/
    // Geburtshelferin-Lesart) statt des gemeinten Programm-Assistenten (`gebwiz`). „wizard" war
    // der erste Versuch, verworfen (Tech-Jargon, Sprachlinie vivodepot.
    // html:4579) — „Guided birth entry" ist die geltende Fassung.
    // NACHTRAG (01.09.2026, nach dem Steuerklasse-Fund): dieser Eintrag fehlte in
    // GLOSSAR (nur in GLOSSAR_WOERTER registriert) — glossartreuePruefen prüfte den Anlassfall
    // selbst nie automatisch, nur der ursprüngliche einmalige Handfund/-fix. Nachgetragen, damit
    // ausgerechnet der Begriff, der die Kampagne auslöste, nicht als einziger unbewacht bleibt.
    // Beim ersten Lauf gegen den echten Bestand EIN Treffer, aber die bereits bekannte
    // Positivkontrolle (s. Kopf-Kommentar dieser Datei, Zeile 6 ff.): `strings:
    // schnellstartSchritt1.text` — „Ein Assistent führt Sie durch den Start" meint den
    // ALLGEMEINEN, mehrschrittigen App-Einstieg, nicht den gebwiz-Programm-Assistenten der
    // Kampagne. „A wizard guides you through the start" ist hier korrektes, nicht-jargonhaftes
    // Englisch für ein generisches Einstiegs-Wizard-Konzept — kein Verstoß, kein zweiter
    // Anlassfall, sondern die Grenze der Festlegung selbst.
    ausnahmeKennungen: ['strings:schnellstartSchritt1.text'],
  },
  {
    wort: 'Vollmacht', kanonisch: ['power of attorney', 'powers of attorney', 'power(s) of attorney'],
    // wizard:kiwiz.ki_nachlassverwaltung.frage: „Vollmacht zum Pausieren oder Löschen" einer
    // KI-Nachbildung ist umgangssprachliche Befugnis, kein Verweis auf das Rechtsinstrument
    // Vollmacht — „authority" trifft den Sinn hier eher als das förmliche „power of attorney".
    //
    // U2-ADR-343 (06.09.2026): die drei Kennungen unten sind ZITAT, keine
    // Übersetzung — wörtlich aus dem amtlichen zweisprachigen BMJ-Formular übernommen (Stand
    // 15.01.2023, mechanisch belegt gegen tests/fixtures/bmj/*.pdf). „LPA" ist die Abkürzung
    // des HERAUSGEBERS für „Lasting Power of Attorney", nicht Vivodepots eigene Wortwahl — das
    // Glossar gilt für Vivodepots EIGENE Beschriftungen, nicht für zitierten fremden Wortlaut.
    // Diese Grenze gilt für ALLE drei Glossar-Einträge unten (Vollmacht/Patientenverfügung/
    // Betreuer) gleichermaßen, nicht nur hier.
    ausnahmeKennungen: [
      'wizard:kiwiz.digitalEstateAdministration.frage',
      'dok:vorsorgevollmacht#5/mailAndTelecommunications.text',
      'dok:vorsorgevollmacht#8/alsoProposeTheAuthorizedPerson.text',
      'dok:vorsorgevollmacht#9/appliesBeyondDeath.text',
    ],
  },
  {
    wort: 'Patientenverfügung', kanonisch: ['advance directive'],
    // U2-ADR-343 (06.09.2026): Zitat aus dem amtlichen BMJ-Formular, s. Kommentar an
    // 'Vollmacht' oben — „advance healthcare directive" ist die Formulierung des Herausgebers,
    // nicht Vivodepots eigene.
    ausnahmeKennungen: ['dok:vorsorgevollmacht#1/healthCareGeneralDecision.text'],
  },
  {
    wort: 'Depot', kanonisch: ['depot', 'vivodepot'],
    // PRODUKTENTSCHEIDUNG (01.09.2026), kehrt einen ersten Lauf dieser ADR um: „depot",
    // nicht „vault" — Grundsatz, kein Einzelwort: „der Kernbegriff des Produkts bleibt der
    // eigene, wo die Sprache ihn trägt." Englisch trägt ihn („depot" ist ein echtes englisches
    // Wort für einen Verwahrort) UND er ist der Produktname — ein Ding, das im Text „vault"
    // heißt, während das Produkt „Vivodepot" heißt, benennt sich selbst nicht mehr. „vivodepot"
    // bleibt zusätzlich akzeptiert, wenn ein Satz ohnehin den Produktnamen nennt.
    // 122 Stellen wurden dafür geprüft (nicht blind ersetzt — Positivkontrolle: 0 echte
    // Tresor-/Schließfach-Bedeutungen gefunden) und umgestellt, dazu drei Kernstellen
    // (`PRE_DEPOT_EN.appTagline`/`.anlegenFehler`/`.dateiLabel`, vivodepot.html — die dritte
    // entging einer ersten, zu engen Suche nach „digital vault" statt „vault"; eine vierte
    // Kern-Fundstelle, `.wipeSperrschirmHinweis`, trug sogar noch die VOR U2-ADR-196 falsche
    // Fassung, unbemerkt seit deren Fix — s. `preDepotSyncPruefen`, Klasse 5), die laut eigenem
    // Kommentar wortgleich zum Modul bleiben müssen. Vier Stellen meinen ein echtes Bank-/
    // Wertpapierdepot, nicht das Produkt — korrekt NICHT „depot" (Bankdepot-Abgrenzung bestanden).
    // Fünfte Stelle nachgezogen (U2-ADR-369, 08.09.2026): `vollmacht:vm_vermoegen_konten.label`
    // ist die Kurzform derselben Vollmachts-Befugnis wie die längere, bereits ausgenommene
    // `advanceCare.provisionInstruments/accountsCustodyAccountsSafes.label` — dasselbe Bank-/Wertpapierdepot,
    // dieselbe Ausnahme, dieselbe Wortwahl „custody accounts".
    ausnahmeKennungen: [
      'advanceCare.provisionInstruments/accountsCustodyAccountsSafes.label',
      'vollmacht:accountsCustodyAccountsSafes.label',
      'situation:notar.bank_anliegen.beispiel',
      'situation:erbfall.erb_konten.label',
      'situation:erbfall.erb_konten.beispiel',
      // U2-ADR-399 (06.09.2026): die Kontoarten-Vorschlagsliste (finanzen/konten/art) nennt
      // „Depot" als Wertpapier-/Bankdepot — dieselbe Bankdepot-Abgrenzung wie oben, jetzt an
      // einer neuen, traegerqualifizierten Kennung statt der bis dahin unauflösbaren
      // `feld.art.vorschlaege`.
      'feld.accountType.vorschlaege',
    ],
  },
  {
    wort: 'Betreuer', kanonisch: ['court-appointed representative'],
    // PRODUKTENTSCHEIDUNG (01.09.2026): weder „carer" (klingt nach Pflegekraft) noch
    // „custodian" (klingt nach Kindschaftsrecht/Verwahrung) trifft den Fachsinn der rechtlichen
    // Betreuung (§1814 ff. BGB) — bestätigt „court-appointed representative", der gerichtlich
    // bestellte Betreuer als technischer Terminus. `art/betreuung.label` und
    // `art_betreuung_hinweis.hint` betreffen die ABGELEHNTE „Betreuungsvollmacht" (im Produkt
    // selbst als „kein Rechtsbegriff, nicht mehr angeboten" markiert) — ein anderer Gegenstand,
    // bewusst nicht Teil dieser Festlegung.
    //
    // U2-ADR-343 (06.09.2026): die sechs Kennungen unten sind Zitat aus dem amtlichen BMJ-
    // Formular (Vorsorgevollmacht/Betreuungsverfügung), s. Kommentar an 'Vollmacht' oben —
    // „guardian" ist die Wortwahl des Herausgebers für die englische Fassung, nicht Vivodepots
    // eigene. Betrifft NUR den zitierten Wortlaut dieser beiden Dokumente, nicht die sonstige
    // Betreuer-Terminologie im Produkt.
    ausnahmeKennungen: [
      'advanceCare.provisionInstruments/note.hint',
      'advanceCare.provisionInstruments/typeOfPowerOfAttorney/betreuung.label',
      'dok:vorsorgevollmacht#8/alsoProposeTheAuthorizedPerson.text',
      'dok:betreuungsverfuegung#1.titel',
      'dok:betreuungsverfuegung#1/proposedPerson.satz',
      'dok:betreuungsverfuegung#2/alternatePerson.satz',
      'dok:betreuungsverfuegung#3/whoShouldNotBeAppointed.satz',
      'dok:betreuungsverfuegung#4/whatTheCareArrangementShould.satz',
    ],
  },
  {
    wort: 'Bereich', kanonisch: ['area'],
    // PRODUKTENTSCHEIDUNG (01.09.2026), Struktur-Vorschlag von bestätigt: die 13
    // obersten Lebensbereiche der App-Navigation sind „area"; angedockte `gruppe`-Abschnitte
    // INNERHALB eines Bereichs wären „section" — keine Geschmacksfrage, die Struktur selbst.
    // GEMESSEN, nicht angenommen — und nicht bloß nicht gesucht: unter allen 59 gefundenen
    // „Bereich"-Fundstellen war KEINE einzige tatsächlich eine gruppe-Untergliederung, jede
    // meinte einen der 13 obersten Bereiche selbst. „area" allein reicht darum für den
    // HEUTIGEN Bestand. Das ändert sich absehbar: das Krisenvorsorge-Template (in Arbeit,
    // Woche ab 01.09.2026) dockt seine Abschnitte (Strom, Schutzorte, Brandschutz, …) als
    // `gruppe` an — die ersten echten section-Fälle. Der zweite kanonische Wert kommt dann
    // dazu, nicht heute schon vorweggenommen. 19 Ausreißer („section"/„sector")
    // auf „area" vereinheitlicht. Zwei Bedeutungen, die NICHT die App-Navigation meinen
    // (Aufgabenbereich, Referenzbereich), sind Ausnahmen der Geschwister-Suche selbst, s.
    // GESCHWISTER_AUSNAHMEN — sie erreichen dieses Glossar gar nicht erst.
    // Fünf weitere Stellen sind KORREKT, tragen aber das Wort „area" gar nicht — sie
    // umschreiben natürlich („recorded under Identity", „in Crisis preparedness", „top of the
    // cabinet") statt es zu nennen. Keine Verstöße, nur kein Substring-Treffer möglich.
    ausnahmeKennungen: [
      'education.trainingCertificateStorage.beispiel',
      'situation:hauskauf.heirat_ehevertrag_frueher.hint',
      'situation:todesfall-uebernahme#digitale-nachbildung-ki-verfuegung.hint',
      'wizard:umzwiz.changingUtilityProviders.hilfetext',
      'strings:vorschlagLageBereiche.text',
    ],
  },
  {
    wort: 'Steuerklasse', kanonisch: ['tax class', 'tax-class'],
    // PRODUKTENTSCHEIDUNG (01.09.2026): das deutsche Lohnsteuerklassen-System I–VI ist
    // kein „tax bracket" — das meint die progressive Steuerstufe (wie viel man verdient), nicht
    // die deutsche Veranlagungsklasse (wie man veranlagt wird). Derselbe Fehlerklasse-Typ wie
    // Assistent/Betreuer: ein deutscher Fachbegriff in seiner englischen Alltagsbedeutung.
    // „tax-class" (Bindestrich) bleibt als zweite kanonische Form zugelassen — attributiv vor
    // einem Substantiv ist die Bindestrich-Schreibung korrektes Englisch („a tax-class
    // combination"), keine Abweichung.
    // NACHTRAG (01.09.2026): der erste Fix traf nur EINE Stelle
    // (`heirwiz.steuerklasse.hilfetext`) — der Begriff fehlte dabei in DIESEM Array (`GLOSSAR`)
    // UND, wie sich beim Nachbau zeigte, zusätzlich in `GLOSSAR_WOERTER` (s. dort) — ohne beide
    // Einträge lieferte `geschwisterKandidaten()` für „Steuerklasse" immer eine leere Liste,
    // `glossartreuePruefen` prüfte den Begriff nie, der Wächter blieb grün trotz stehender
    // Verstöße. fand von Hand fünf Stellen mit „Tax bracket"; der jetzt reparierte
    // Wächter fand acht Kennungen insgesamt (sieben mit „Tax bracket", eine bereits korrekt als
    // „tax-class") — zwei mehr als die Handmessung (`identity.taxClassEarlierEntry.label`,
    // `wizard:heirwiz.einleitung`). Dieselbe Lehre wie zuvor: eine Suche, die enger ist als die
    // Frage, liefert eine Zahl, die keine ist — auch eine gezielte, sonst sorgfältige
    // Handmessung ist keine Ausnahme davon.
    ausnahmeKennungen: [],
  },
]);

// Klasse 4 — Glossartreue: für jeden GLOSSAR-Begriff, jede Geschwister-Fundstelle (minus
// Ausnahmen) gegen die festgelegte kanonische Fassung halten. Baut auf Klasse 1 auf (dieselbe
// Extraktion), prüft aber gegen eine FESTGELEGTE Antwort statt nur auf Uneinheitlichkeit
// untereinander — kann darum erst laufen, seit das Glossar steht (U2-ADR-195).
function glossartreuePruefen(de, en) {
  const treffer = [];
  for (const eintrag of GLOSSAR) {
    const kandidaten = geschwisterKandidaten(de, en, eintrag.wort)[eintrag.wort] || [];
    const kanonischKlein = eintrag.kanonisch.map((k) => k.toLowerCase());
    for (const k of kandidaten) {
      if (eintrag.ausnahmeKennungen.includes(k.kennung)) continue;
      const enKlein = typeof k.englisch === 'string' ? k.englisch.toLowerCase() : '';
      if (kanonischKlein.some((form) => enKlein.includes(form))) continue;
      treffer.push({ wort: eintrag.wort, kanonisch: eintrag.kanonisch.join(' / '), kennung: k.kennung, deutsch: k.deutsch, englisch: k.englisch });
    }
  }
  return treffer;
}

// Klasse 3 — deutsche Reste im EN-Modul: Umlaute/ß oder häufige deutsche Funktionswörter.
function deutscheResteMessen(en) {
  const treffer = [];
  for (const k of Object.keys(en)) {
    const wert = en[k];
    if (typeof wert !== 'string') continue;
    const hatUmlaut = /[äöüÄÖÜß]/.test(wert);
    const stopwortTreffer = wert.match(DE_STOPWORT_REGEX);
    if (hatUmlaut || stopwortTreffer) {
      treffer.push({
        kennung: k, englisch: wert,
        grund: hatUmlaut && stopwortTreffer ? 'umlaut+stopwort' : (hatUmlaut ? 'umlaut' : 'stopwort'),
        stopwort: stopwortTreffer ? stopwortTreffer[0] : null,
      });
    }
  }
  return treffer;
}

// Klasse 5 — PRE_DEPOT_EN-Sync: der Kern trägt in `vivodepot.html` eine ZWEITE, feste englische
// Zeichenkette je Vor-Depot-Text (bevor ein Depot — und mit ihm das Sprachmodul — existiert).
// Deren eigener Kommentar behauptet Wortgleichheit mit dem `strings:<key>.text`-Gegenstück im
// EN-Modul — GEPRÜFT, nicht behauptet: KEIN bestehender Wächter verglich beide je (gefunden
// über eine direkte Nachfrage von, 01.09.2026, nicht selbst entdeckt). Reale Folge, live
// angetroffen: `wipeSperrschirmHinweis` trug hier noch die ALTE, bereits im Modul korrigierte
// Fassung (Depot/Vivodepot vertauscht, U2-ADR-196) — unbemerkt seit deren Fix, bis diese Probe
// gebaut wurde. `dateiLabel` trug zusätzlich noch „Vault file", eine dritte vault-Stelle im
// Kern, die eine erste, zu enge Suche („digital vault") übersehen hatte.
function preDepotSyncPruefen(preDepotEn, en) {
  const treffer = [];
  if (!preDepotEn || typeof preDepotEn !== 'object') return treffer;
  for (const k of Object.keys(preDepotEn)) {
    const modulKennung = 'strings:' + k + '.text';
    const modulWert = Object.prototype.hasOwnProperty.call(en, modulKennung) ? en[modulKennung] : undefined;
    if (modulWert === undefined) continue; // kein Modul-Gegenstück -- anderes Thema (Abdeckung)
    if (modulWert !== preDepotEn[k]) {
      treffer.push({ kennung: k, modulKennung, kern: preDepotEn[k], modul: modulWert });
    }
  }
  return treffer;
}

function messen(opts) {
  opts = opts || {};
  const de = ladeDeutsch();
  const en = ladeEnglisch();
  const deKeys = Object.keys(de);
  const enKeys = Object.keys(en);
  const gemeinsam = deKeys.filter((k) => Object.prototype.hasOwnProperty.call(en, k));
  const geschwister = geschwisterKandidaten(de, en, opts.nurWort);
  const geschwisterAnzahl = Object.values(geschwister).reduce((n, arr) => n + arr.length, 0);
  return {
    deKeysGesamt: deKeys.length,
    enKeysGesamt: enKeys.length,
    gemeinsamGesamt: gemeinsam.length,
    uneinheitlichkeit: uneinheitlichkeitMessen(de, en),
    geschwister,
    geschwisterAnzahl,
    deutscheReste: deutscheResteMessen(en),
    glossarVerstoesse: glossartreuePruefen(de, en),
  };
}

function bericht(m) {
  const z = [];
  z.push('Deutsch (Sprachmodul de): ' + m.deKeysGesamt + ' Kennungen · Englisch (3 Quellen): '
    + m.enKeysGesamt + ' · gemeinsam geprüft: ' + m.gemeinsamGesamt);
  z.push('');
  z.push('── Klasse 2 · Uneinheitlichkeit (' + m.uneinheitlichkeit.length + ' Fälle) ──');
  for (const t of m.uneinheitlichkeit.slice(0, 40)) {
    z.push('  DE „' + t.deutsch + '" (' + t.kennungen.length + '× ) →');
    for (const ev of t.englischeVarianten) z.push('      EN „' + ev + '"');
  }
  if (m.uneinheitlichkeit.length > 40) z.push('  … ' + (m.uneinheitlichkeit.length - 40) + ' weitere, s. --json');
  z.push('');
  z.push('── Klasse 1 · Geschwister-Kandidaten (' + m.geschwisterAnzahl + ' Fundstellen über '
    + Object.keys(m.geschwister).length + ' Begriffe) ──');
  for (const wort of Object.keys(m.geschwister)) {
    z.push('  · ' + wort + ' (' + m.geschwister[wort].length + '×)');
  }
  z.push('');
  z.push('── Klasse 3 · Deutsche Reste im EN-Modul (' + m.deutscheReste.length + ' Fundstellen) ──');
  for (const t of m.deutscheReste.slice(0, 40)) {
    z.push('  [' + t.grund + '] ' + t.kennung + ': „' + t.englisch + '"');
  }
  if (m.deutscheReste.length > 40) z.push('  … ' + (m.deutscheReste.length - 40) + ' weitere, s. --json');
  z.push('');
  z.push('── Klasse 4 · Glossartreue (' + m.glossarVerstoesse.length + ' Verstöße gegen '
    + GLOSSAR.length + ' festgelegte Begriffe) ──');
  for (const v of m.glossarVerstoesse) {
    z.push('  [' + v.wort + ' → „' + v.kanonisch + '"] ' + v.kennung + ': „' + v.englisch + '"');
  }
  return z.join('\n');
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const wortArg = argv.find((a) => a.startsWith('--wort='));
  const opts = wortArg ? { nurWort: wortArg.slice('--wort='.length) } : {};
  const m = messen(opts);
  console.log(argv.includes('--json') ? JSON.stringify(m, null, 2) : bericht(m));
}

module.exports = {
  messen, bericht, GLOSSAR_WOERTER, GLOSSAR,
  uneinheitlichkeitMessen, geschwisterKandidaten, deutscheResteMessen, glossartreuePruefen,
  preDepotSyncPruefen, ladeDeutsch, ladeEnglisch,
};
