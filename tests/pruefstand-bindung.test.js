'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Prüfstand der Bindungen — U2-ADR-099 Teil B-2 · der Meta-Test
   ────────────────────────────────────────────────────────────────────────
   Was hier NICHT geprüft wird, damit die Klausel nicht mehr behauptet als der Lauf:
   Erzwungen ist „Kopplung vorhanden UND benutzt". NICHT erzwungen ist, dass die
   Einspeisepunkte den Geltungsbereich eines Wächters decken — das bleibt ein
   gemessener Zustand, keine erzwungene Eigenschaft.

   Vier Prüfungen und drei Meta-Beweise. Die Meta-Beweise laufen ausschließlich
   gegen Quelltext IM SPEICHER; keine ADR und keine Testdatei wird je geschrieben.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const P = require('./pruefstand-bindung.js');
const { bindungPruefen } = require('./bindung-pruefen.js');

const ADR = 'U2-ADR-099';
const HERKUNFT = 'invariante';
const PRUEFUNGEN = [
  'pruefstand-jede-klausel-zeile-ist-lesbar',
  'pruefstand-jeder-waechter-hat-eine-probe',
  'pruefstand-jede-probe-wird-vom-waechter-benutzt',
  'pruefstand-klassen-werden-bei-jedem-lauf-gerechnet',
];

/* ── Ausnahmen: benannt UND gezählt, nie stillschweigend ──────────────────
   Beide Listen sind gepinnt (Länge mit-assertiert) und werden auf GLEICHHEIT
   geprüft, nicht auf Teilmenge: sie können nur durch eine bewusste Änderung
   wachsen ODER schrumpfen. Eine still verschwundene Lücke fiele genauso auf
   wie eine neu hinzugekommene. */

// Klausel-Zeilen, die absichtlich nicht auflösen.
const UNLESBAR_ERLAUBT = [
  // Das Format-BEISPIEL der Format-ADR selbst: „<Datei oder Prüfungsname>" ist die
  // Schablone, nicht eine Klausel. Genau der Fall, den ein Filter „gültiger Pfad"
  // als echten Wächter mitgezählt hätte.
  { adr: 'vivodepot-U2-ADR-098-format-konformitaetsklausel-2026-07-23.md', nr: 37 },
  // Zeile verschoben (35→37) durch die Status-heute-Zeile aus dem
  // ADR-Veröffentlichung-Auftrag (13.08.2026).
  // Die vier U2-ADR-100-Klauseln standen hier bis B-3 (Alt-Format, Pfad ohne #Name).
  // Sie sind aufs Nachtrag-Format gehoben und damit aus dieser Liste heraus — der Pin
  // sank von 5 auf 1. Sichtbare Folge: 12 Waechter mehr in der Grundmenge, die vorher
  // durch das Schlupfloch fielen (19 -> 31 in OHNE_PROBEN_DEKLARATION).
];

// Wächter, die (noch) keine PROBEN-Deklaration tragen. Viele haben eine Negativprobe —
// nur nicht in der maschinenlesbaren Form von B-1. Die Liste ist der gemessene Rest der
// Nachrüstung; sie hält den Stand fest, damit ein NEUER Wächter ohne Probe auffällt.
const OHNE_PROBEN_DEKLARATION = [
  /* U2-ADR-430 (22.09.2026, Wiederherstellungs-Hülle): zwei Titel des Prüfsteins zu Ziffer 5 (tests/umschlag-unbekanntes-geschwisterfeld.test.js).
     Sie messen ein Verhalten (die Datei öffnet), keine Verletzungsliste, und passen darum nicht in die PROBEN-Deklarationsform. Der
     Rot-Beweis steht im selben Testfile, ausgeführt und nicht nur behauptet ('[Prüfstein·Rot-Beweis]': eine Lese-App, die unbekannte
     Umschlag-Felder abweist, macht die Probe rot). Der Rot-Beweis für die Kern-Seite ist jetzt gebaut (s. dritten Titel unten). ECHT
     gegen P.waechterOhneProbe() gemessen. */
  '[Prüfstein·Grenze] ein FALSCHES Passwort öffnet auch mit dem fremden Feld nicht',
  '[Prüfstein·Kern] der Kern öffnet eine Datei mit einem unbekannten Geschwisterfeld im Umschlag',
  /* Nachtrag (22.09.2026, Kern-Fix Umschlagfeld-Verlust): der dritte Titel desselben Prüfsteins, Ziffer 5 — die frühere `todo`-Probe
     ist jetzt ein gewöhnlicher Test (der Kern schreibt ein unbekanntes Umschlag-Feld beim Speichern nicht mehr still weg). Misst ein
     Verhalten (das Feld steht nach dem Speichern noch im Umschlag), keine Verletzungsliste, darum wie die zwei obigen ohne PROBEN-Form.
     ECHT gegen P.waechterOhneProbe() gemessen. */
  '[Prüfstein·Speichern] eine Datei mit einem unbekannten Umschlag-Feld trägt es nach dem Öffnen und Speichern noch',
  /* U2-ADR-NNN/NNN2, Korpus-Zuordnung + Ende Vorlagen-Format (17.09.2026): fünf Testtitel ohne
     PROBEN-Deklarationsform — zwei eigene neue (tests/rechtsraum-modul-schema-bauplan.test.js)
     und drei erstmals durch diese ADRs zitierte, bereits bestehende Titel (pv-ziffer-27.test.js,
     vollmacht-generator.test.js, ki-generator.test.js). ECHT gegen P.waechterOhneProbe() gemessen. */
  '[U2-ADR-NNN·Bauplan] typen.<typ> traegt bauplan NEBEN wortlaut, beide optional und unabhaengig',
  '[U2-ADR-NNN·Bauplan] ein Bauplan-Schritt traegt die Wurzel {feld,verborgenWenn?} plus die Korpus-Erweiterung',
  '[PV·2.7·Konsistenz] die festen Rahmensätze/Rollen-Labels sind — je Teilsatz, PDF-Zeilenumbruch-Artefakt getrennt geprüft — im signierten Wortlaut enthalten',
  '[Vollmacht·Konsistenz] JEDER auswahlPaar/mehrfachauswahl/freitextSatz-Text ist eine exakte Teilzeichenkette des signierten Wortlauts',
  'Testament-Anlage: HTML trägt Kopf, Herkunftsanzeige und § 2247-Formhinweis',
  /* Nachtrag (17.09.2026, dieselben ADRs, KORREKTUR): die zweite ADR (Ende Vorlagen-Format) war
     zunächst nicht in den Arbeitsbaum kopiert und darum hier nicht mitgezählt — vier weitere
     Namen ohne PROBEN-Deklarationsform, sobald sie gezählt wird. */
  'Basis: TA-signiertes Behörden-Cert + treuhand-signiertes templateJws → Kette gültig',
  '1b: exakter Inhalt → verifiziert',
  '[Vor-Umzug·a4·immer] der amtliche Wortlaut der STANDARD_VORLAGEN ist gegenüber dem Beleg (37038011) erhalten — jede Lücke ist eine BENANNTE, entschiedene Ausnahme',
  '[Vor-Umzug·a4·Rot-Beweis Ende-zu-Ende] eine echte Kern-Verfälschung bricht die immer-Prüfung',
  /* U2-ADR-NNN3, Migrationsbeleg additive Umschlag-Schlüssel (17.09.2026): vier Testtitel, auf die
     die pruefung:-Zeilen des neuen konformitaet-Blocks zeigen — Proben am Test-Werkzeug selbst
     (vergleicheEbene()), keine PROBEN-Deklarationsform. ECHT gegen P.waechterOhneProbe() gemessen. */
  '[Paket 0 · Migrationsbeleg] das Referenzdepot exportiert heute genau das eingefrorene Ergebnis',
  '[Rot-Beweis] ein neuer, NICHT gegengezeichneter Schlüssel im UMSCHLAG (ausserhalb depot) bricht weiterhin',
  '[Rot-Beweis] ein registrierter Umschlag-Schlüssel OHNE leererWert wird einmalig als neu akzeptiert',
  '[Rot-Beweis] ein bereits eingefrorener Umschlag-Schlüssel bricht bei Werteänderung weiterhin — Wachstum ist kein Freibrief für spätere Drift',
  /* U2-ADR-416, Sprachmodule mit jeder Version (16.09.2026): 21 Testtitel, auf die die pruefung:-Zeilen der
     sechs konformitaet-Blöcke zeigen. Proben an Werkzeug und Kern selbst, keine PROBEN-Deklarationsform.
     ECHT gegen P.waechterOhneProbe() gemessen. */
  '[Sprachdeckung·Rot-Beweis] fehlen fünf Texte, nennt die Deckung genau diese fünf',
  '[Sprachdeckung·--slug] die Vorbedingungen nennen ein veraltetes Bündel mit seinen Kennungen',
  '[Sprachdeckung·--alle] der Kern-Abgleich verweigert, wenn im Ziel ein veraltetes Bündel liegt — und nennt den Slug',
  '[Treuhand·intern] vivodepot/anbieter unter der eigenen Ausgabestelle ist intern',
  '[Treuhand·Grenze] ein fremdes Blatt unter der eigenen Ausgabestelle bleibt extern',
  '[Treuhand·Grenze] vivodepot/* unter einer Ausgabestelle außerhalb der Liste bleibt extern',
  '[Treuhand·Grenze] eine eigene Ausgabestelle mit fremder Rolle macht nichts intern',
  '[Rückfall·Vor-Depot] eine Datei mit altem Modul zeigt den Text aus dem Bündel der neu gepackten Modul-App',
  '[Rückfall·Mitschrift] eine Datei mit altem Modul und Mitschrift derselben Sprache zeigt den Text',
  '[Rückfall·Reihenfolge] ohne Quelle derselben Sprache: Deutsch (Englisch nur, wo ein englisches Modul liegt) — eine unbekannte Kennung bleibt die Kennung',
  '[Rückfall·vier Produkte] frisch angelegt gibt es in keinem Produkt einen Rückfall',
  '[EN·Gerüst] das Gerüst trägt keinen vollen englischen Satz — weder als Konstante noch als Region',
  '[EN·DE-Produkt] ohne Datei bleibt ein deutsches Produkt deutsch',
  '[Ausliefern·vorbereiten] moduleVersion steigt um eins gegenüber dem Bündel im Ziel',
  '[Ausliefern·vorbereiten·Rot-Beweis] fehlt eine Kennung, entsteht kein Plan',
  '[Ausliefern·signieren] eine Passphrase, alle Bündel vom Kern angenommen und intern',
  '[Ausliefern·signieren·Rot-Beweis] eine fremde Kette (Blatt nicht vivodepot/*) ist nicht intern und schreibt nichts',
  '[Ausliefern·Terminal] der Signierschritt verweigert sich in einer Sitzung und ohne Terminal',
  '[Alt-Kennung] jede alte Form kommt unter der heutigen Kennung an, der Text bleibt',
  '[Alt-Kennung·Gegenprobe] eine erfundene Kennung bleibt verworfen — auch unter einem alten Bereich',
  '[Alt-Kennung·signiert·Gegenprobe] ein nachträglich veränderter Text lässt die Signaturprüfung scheitern',
  /* U2-ADR-411, Bau je Version (16.09.2026): drei Testtitel, auf die die pruefung:-Zeilen des neuen
     konformitaet-Blocks zeigen. Proben am Werkzeug selbst (tools/kern-ausliefern.js), keine PROBEN-Deklarationsform.
     ECHT gegen P.waechterOhneProbe() gemessen. */
  '[_produktBauen] baut gegen den echten Kern genau das, was der Worker je Abruf gebaut hätte (dieselbe Funktion, dieselben Argumente)',
  '[_rezeptBauen·Bau je Version] mit Produktdatei trägt das Rezept lieferart, Pfad und Prüfsumme — ohne bleibt es unverändert',
  '[ausliefern·Bau je Version·Rot-Beweis] ein Produkt-Zielpfad existiert schon — abgebrochen, NICHTS hochgeladen',
  /* Nachtrag U2-ADR-289 (16.09.2026, Pro-Bereiche als benannte Feld-Ziele): drei Testtitel, auf die die drei
     pruefung:-Zeilen des neuen konformitaet-Blocks zeigen (was die frühere Invariante eigentlich schützte: kein
     freies Ziel). Keine PROBEN-Deklarationsform; der Drift-Schutz der Liste selbst ist tools/build-bereiche.js
     --check. ECHT gegen P.waechterOhneProbe() gemessen. */
  '[Generator·Pro-Bereiche·Rot-Beweis] ein Ziel AUSSERHALB der benannten Liste wird weiter abgewiesen — auch mit pro-Präfix',
  '[Generator·Pro-Bereiche·Rot-Beweis] ein FREIES Ziel wird weiter abgewiesen',
  '[Generator·Pro-Bereiche·Rot-Beweis] auch das Einreich-Schema nimmt nur die benannte Liste an',
  /* Vorführung (15.09.2026, U2-ADR-413): sechs Testtitel aus tests/vorfuehrung-showcase.test.js, auf
     die die sechs `pruefung:`-Zeilen der vier neuen konformitaet-Blöcke zeigen. Neue Testdatei, neue
     Bindung. Keine PROBEN-Deklarationsform; die Rot-Beweise stehen als eigene Tests in derselben Datei
     (Ab-Werk-Gegenprobe, Berührung verschiebt den Leerlauf). ECHT gegen `P.waechterOhneProbe()`
     gemessen, nicht angenommen. */
  '[Ab Werk] Block ist null, nichts ist gebacken, der Willkommensschirm bleibt der Einstieg',
  '[Ab Werk] Vorschau ohne Vorführung: Download führt weiter zum Passwort (unverändert)',
  '[Gebacken] Download: ansehen ja, herunterladen nein — kein Passwort-Dialog, der Inhalt wird gezeigt',
  '[Gebacken] Leerlauf: nach 90 s ohne Berührung zurück auf die gebackenen Daten, Schleife wieder an',
  '[Gebacken] Sperren: Passwort setzen, Übernehmen, Depot anlegen, Modul-Einlass',
  '[Gebacken·Rot-Beweis] eine Berührung verschiebt den Leerlauf',
  /* „Produkt als signiertes Rezept" (15.09.2026, U2-ADR-414): acht Testtitel, auf die die acht
     `pruefung:`-Zeilen der vier neuen konformitaet-Blöcke zeigen (tests/kern-ausliefern.test.js,
     tests/rezepte-signieren.test.js, tests/behoerden-zertifikat-ausstellen-werkzeug.test.js). Keine
     PROBEN-Deklarationsform. Zwei davon Kollektor-Form (`assert.deepEqual(jwsDateien(ordner), [])`
     — „nichts geschrieben"), s. kollektor unten. ECHT gegen `P.waechterOhneProbe()` gemessen. */
  '[_rezeptBauen] ein Pro-Rezept trägt Kopf, Stand, Prüfsummen und Zutaten in der Form des Workers',
  '[_rezeptBauen·Rot-Beweis] ein Produkt ohne Kopf oder mit nicht ausgeliefertem Modul wirft',
  '[ausliefern·Rot-Beweis] ein Produkt nennt ein Modul, das dieser Lauf nicht ausliefert — abgebrochen, bevor irgendetwas hochgeladen ist',
  '[rezepte-signieren·Positivkontrolle] Ordner: je Rezept eine Signatur, die die Kette des Workers trägt',
  '[rezepte-signieren·Rot-Beweis] eine andere Rolle, keine Ausgabestelle, fremder Anker, falscher Schlüssel: nichts geschrieben',
  '[rezepte-signieren·Rot-Beweis] ein Rezept mit fremdem Slug oder falsche Passphrase: für KEIN Rezept eine Signatur',
  '[rezepte-signieren·Übergang] Zertifikat ohne rolle: vor OHNE_ROLLE_BIS signiert (bis höchstens dahin), danach nicht',
  '[behoerden-zertifikat-ausstellen·rolle] --rolle rezept setzt credentialSubject.rolle; ohne --rolle kein Feld; eine ungültige Rolle bricht ab',
  /* „Bestell- und Auslieferungsweg registriert" (13.09.2026, U2-ADR-411): fünfzehn Testtitel,
     auf die die fünfzehn `pruefung:`-Zeilen der sieben neuen konformitaet-Blöcke zeigen. Die
     Testdateien selbst waren schon gelandet (tests/kern-ausliefern.test.js,
     tests/zutaten-pruefsumme-abgleich.test.js, tests/produkt-text-erzeugen-pruefsumme.test.js) —
     neu ist ihre Klausel-Bindung. Keine PROBEN-Deklarationsform. Dreizehn Konstruktions-Form
     (nennen eine konkrete Prüfsumme, einen Ordnernamen, einen Fehlertext), zwei Kollektor-Form
     (`assert.equal(aufrufe.length, 0)` — „KEIN Netzzugriff"), s. kollektor/ohneBeleg unten.
     Die neuen Feldregister-/Feldkatalog-Tests (U2-ADR-409) stehen hier NICHT: U2-ADR-409 trägt
     keinen konformitaet-Block, ihre Titel sind kein Klausel-Ziel. ECHT gegen
     `P.waechterOhneProbe()` gemessen, nicht angenommen. */
  '[Produkt-Text-Erzeugen·Prüfsumme] der kopierte Abschnitt hasht auf die gepinnte, im Schwesterrepo wortgleich hinterlegte Prüfsumme',
  '[Produkt-Text-Erzeugen·Prüfsumme·Rot-Beweis] eine geänderte Zeile im markierten Abschnitt ändert die Prüfsumme',
  // 19.09.2026 (Fund, Landestand landung-l1-fuer-fixes-2): drei Testtitel in
  // tests/zutaten-pruefsumme-abgleich.test.js umbenannt (arbeitsbaumunabhängige Lesart,
  // Stand-relativer Vergleich, dieselbe Sitzung) — die U2-ADR-411-Klausel zitierte noch die ALTEN
  // Titel und war darum UNLESBAR (s. Fix in docs/adr/vivodepot-U2-ADR-411-…: die drei
  // `pruefung:`-Zeilen zeigen jetzt auf die aktuellen Titel). Nach dieser Korrektur landen alle
  // drei neuen Titel wieder hier (unverändert ohne PROBEN-Deklarationsform, nur die Namen neu) —
  // ECHT gegen P.waechterOhneProbe() gemessen; ein erster Lauf zeigte nur zwei, weil die
  // Ausgabe nach zwei Zeilen abgeschnitten war, der zweite Lauf zeigte den dritten.
  '[Zutaten-Prüfsumme] PRODUKTE stimmt mit den Rezepten im Gateway überein — kein Fund',
  '[Zutaten-Prüfsumme·Rot-Beweis] eine Zutat MEHR ODER WENIGER (Anzahl geändert) wird gefunden',
  '[Zutaten-Prüfsumme·Rot-Beweis] eine verschobene Prüfsumme in EINEM bereichsmodule-Eintrag wird gefunden',
  '[_auslieferungZeileAnhaengen] ANGEHÄNGT, NIE ÜBERSCHRIEBEN — zwei Aufrufe, beide Zeilen bleiben',
  '[_remoteOrdner] vorlage geht nach templates, alles andere nach module',
  '[_zugangsdatenLesen·Rot-Beweis] fehlendes HIDRIVE_PASSWORT wirft mit dem NAMEN',
  '[_zugangsdatenLesen·Rot-Beweis] fehlendes HIDRIVE_USER wirft mit dem NAMEN, nie einem Wert',
  '[ausliefern] echter Lauf — lädt hoch, liest zurück, schreibt das Rezept auf die Ablage UND die Zeile ins Register',
  '[ausliefern·Rot-Beweis] Zielpfad existiert mit ANDEREM Inhalt — echter Konflikt, benannt',
  // 16.09.2026, U2-ADR-411 (WebDAV 409 beim Auslieferungslauf): der Lauf legt fehlende Ordner an und überspringt
  // byte-gleich Vorhandenes; ersetzt den Titel „Zielpfad existiert bereits (auch bei identischem Inhalt)“. Konstruktions-Form.
  '[ausliefern·Wiederanlauf] der Kern liegt aus dem abgebrochenen Lauf BYTE-GLEICH oben — übersprungen, der Rest geht hoch',
  '[ausliefern·WebDAV·Rot-Beweis] PUT ohne Elternordner ergibt 409 — darum legt der Lauf jeden Ordner Stufe für Stufe an, bevor die erste Datei hochgeht',
  '[ausliefern·WebDAV·Rot-Beweis] MKCOL mit anderer Antwort als 201/405 — abgebrochen, keine Datei hochgeladen',
  '[ausliefern·Rot-Beweis] Zurücklesen nach dem Hochladen ergibt eine ANDERE Prüfsumme — kein Rezept, keine Verlaufszeile',
  '[ausliefern·Rot-Beweis] fehlende Zugangsdaten — abgebrochen, KEIN Netzzugriff',
  '[ausliefern·Rot-Beweis] lokaler Kern weicht von origin ab — abgebrochen, KEIN Netzzugriff',
  /* „Stick-Mittelweg" (16.09.2026, U2-ADR-415): sechzehn Testtitel, auf die die sechzehn
     `pruefung:`-Zeilen der vier neuen konformitaet-Blöcke zeigen (tests/stick-browser-kopie-raeumen.test.js,
     tools/stick-ausgabe-backen.test.js, tests/browser-speicher-nur-verschluesselt.test.js,
     tests/e2e/stick-schliessen-raeumt-browser-kopie.spec.js). Keine PROBEN-Deklarationsform; die
     Rot-Beweise stehen als eigene Tests in denselben Dateien (Kern-Mutation je Weiche). Vierzehn
     Konstruktions-Form, zwei Kollektor-Form — die beiden Leck-Scanner des Browser-Speichers
     (`assert.deepEqual(gefunden, [])`, „kein Klartext gefunden"), deren Rot-Beweis ein Kern ist, der
     ein Feld an der Verschlüsselung vorbeischreibt. ECHT gegen `P.waechterOhneProbe()` und
     `P.klassifiziereWaechter()` gemessen, nicht angenommen. */
  '[Stick] ohne Stick-Merkmal wird nie geräumt — auch nicht nach bestätigtem Schreiben',
  '[Stick] Download: erst die Rückfrage, geräumt wird nur auf ein Ja',
  '[Stick] gescheitertes oder abgebrochenes Sichern räumt nie — die Kopie ist dann alles',
  '[Stick · Rot-Beweis] ohne die Weiche auf die Auslieferungsform räumt auch die eigene Datei',
  '[Stick · Rot-Beweis] ohne die Bestätigungs-Weiche räumt auch ein unbestätigter Download',
  '[Stick] depotInDateiSichern meldet den Weg — sonst hält der Schließen-Weg jedes Sichern für gescheitert',
  '[Stick] Schließen sichert auf den Stick und räumt danach die Browser-Kopie',
  '[Stick] geräumt wird genau dieses Depot — ein verwahrtes zweites bleibt stehen',
  '[Stick] geräumt wird über die Kennung, nicht über eine produktgefilterte Liste',
  '[Bäcker] der Kern im Repo trägt KEINE Auslieferungsform',
  '[Bäcker] fehlende Region: Abbruch, kein Schreiben',
  '[Bäcker] doppelte Region: Abbruch — welche wäre gemeint?',
  '[Bäcker · Rot-Beweis] eine Nutzlast, die kein Literal wäre, wird abgewiesen',
  '[Browser-Speicher] kein Marker aus irgendeinem Ablage-Typ steht im Klartext im Speicher',
  '[Browser-Speicher] der Umschlag trägt keine Klartext-Felder außerhalb der Liste',
  '[Browser-Speicher · Rot-Beweis] ein Kern, der an der Verschlüsselung vorbeischreibt, reißt die Probe',
  /* Nachtrag U2-ADR-415 (16.09.2026, Teilen-Blatt ist keine Bestätigung): zwei weitere Titel, beide
     Konstruktions-Form (nennen den erwarteten Grund `teilen-unbestaetigt` bzw. die mutierte Zeile).
     ECHT gegen `P.waechterOhneProbe()` gemessen. */
  '[Stick] Teilen-Blatt: die Übergabe an eine App ist keine Bestätigung — Rückfrage wie beim Download',
  '[Stick · Rot-Beweis] steht geteilt wieder unter den Bestätigungen, räumt es ohne Rückfrage',
  /* „ZVR-Abschrift" (13.09.2026, U2-ADR-410): ein neuer Testtitel, Konstruktions-Form — er
     nennt den konkreten erwarteten Feldtyp (`auswahl`/`datum`/`ref`, `entitaet: 'institution'`)
     statt eine Liste leer zu behaupten. Keine PROBEN-Deklarationsform. */
  '[ZVR-Abschrift] die drei Felder stehen im Bürgermodul, mit ihren Typen',
  /* „Die Palette folgt der Marke" (13.09.2026, U2-ADR-408): elf neue Testtitel, alle
     Konstruktions-Form — sie nennen den konkreten erwarteten Zustand (ein Hex-Wert, ein
     Kontrast-Verhältnis, ein gesetztes CSS-Custom-Property, die Zahl der Aufrufstellen)
     statt eine Liste leer zu behaupten. Keine PROBEN-Deklarationsform. Der neue ADR trägt
     zwölf `pruefung:`-Zeilen; diese elf Titel sind ihre Ziele. */
  '[Palette] --success löst sich vom Markenton — „geschafft" wird sonst rot',
  '[Palette] die eigene Farbe des Hauses wird durch die eigene Ableitung wieder sie selbst',
  '[Palette] der Reset räumt JEDES Token, das die Anwendung gesetzt hat',
  '[Palette] eine HELLE Marke wird nicht abgedunkelt — sie bekommt dunkle Schrift',
  '[Palette] eine lesbare Fremdmarke bleibt EXAKT erhalten, sie wird nicht verfälscht',
  '[Palette] eine helle Marke wird trotzdem nicht abgedunkelt — Abweisung trifft nur die mittleren Töne',
  '[Palette] jedes geprüfte Paar hält das AA-Maß — für die eigene Farbe wie für eine fremde',
  '[Palette·Gegenprobe] eine Farbe, die gegen BEIDE Kandidaten reißt, wird abgewiesen — die Palette bleibt beim Haus',
  '[Palette·Rot-Beweis] _brandingPaletteAnwenden hat GENAU EINEN Aufrufort im Kern',
  '[Palette·Rot-Beweis] ohne die Nachdunkel-Stufe reißt die eigene Farbe des Hauses an --ink3',
  '[Palette·Wächter] der semantische Grünton steht wortgleich als --ampel-gruen im CSS',
  '[Palette·Wächter] kein Token, das BEDEUTUNG trägt, steht in der Rollen-Tabelle',
  // „White Label bis ins PDF" (10.09.2026): elf neue Testtitel, alle
  // Konstruktions-Form (nennen den konkreten erwarteten Zustand — Markenname/Farbe im
  // PDF-Ausgabetext, ein DOM-Attribut, ein CSS-Custom-Property-Wert — statt eine Liste leer zu
  // behaupten), keine PROBEN-Deklarationsform. Neuer ADR U2-ADR-400 trägt 11 `pruefung:`-Zeilen
  // (s. STAND.gueltig/konstruktion unten), diese elf Titel sind ihre Ziele.
  '[Herkunftsort] der Impressumslink zeigt auf Vivodepots eigenen Bezugsort, NICHT auf AKTUALISIERUNGEN_LINK',
  '[Herkunftsort] die Einstellungen tragen ein data-herkunftsort-Element mit Name, Lizenzhinweis und Impressumslink',
  '[Herkunftsort·Reichweite] die heutige Menge ist genau die eingefrorene — jede Abweichung ein Fund, kein stilles Grün',
  '[Herkunftsort·Reichweite] genau fünf Fundstellen sind als "Herkunftsort" klassifiziert',
  '[Branding-Achse] das Branding-Achsen-Produkt trägt Name/Farben aus der Fixture, am erzeugten Produkt gemessen',
  '[PDF-Reichweite] zeichneSituationPdf zeigt denselben angedockten Markennamen',
  '[PDF-Reichweite] zeichneVollDepotPdf zeichnet mit den angedockten Marken-Farben, nicht den nativen GOLD/SALBEI-Konstanten',
  '[PDF-Reichweite] zeichneVollDepotPdf zeigt den angedockten Markennamen, NICHT „VIVODEPOT"',
  '[PDF-Reichweite·Rot-Beweis] OHNE angedocktes Branding zeichnet zeichneVollDepotPdf weiterhin die native Marke/Farbe',
  '[VDK-Integration·Rot-Beweis] ein UNSIGNIERTES Branding-Bündel wirkt NICHT als CSS (branding ist nurGeprueft)',
  '[VDK-Reset] _depotSpeicherZuruecksetzen() räumt zuvor gesetztes Branding-CSS weg',
  // „die Lese-App bekommt Branding" (10.09.2026): vier neue Testtitel aus
  // tests/lese-app-marke.test.js, keine PROBEN-Deklarationsform. Alle vier Konstruktions-
  // Form (String-Vorkommen im Topbar-HTML/document.title/Rückgabewert, statt eine Liste leer zu
  // behaupten). Neue konformitaet-Blöcke in U2-ADR-400 (Nachtrag-Abschnitt), keine neue ADR-Datei.
  '[Lese-App] die Quelle ist das GEÖFFNETE Fremd-Depot, keine eingebackene Konstante dieser Datei',
  '[Lese-App] ein weißgelabeltes Depot zeigt die Partnermarke — im Tab-Titel UND in der Topbar',
  '[Lese-App] ohne Branding-Modul bleibt der native Name „Vivodepot" (Rot-Beweis-Gegenprobe)',
  '[Lese-App·Rot-Beweis] entladen() setzt den Tab-Titel sofort zurück — keine Marke des vorigen Depots bleibt hängen',
  // „Dateinamen-Reichweite nachträglich automatisiert" (10.09.2026): vier
  // neue Testtitel aus tests/dateinamen-reichweite.test.js, keine PROBEN-Deklarationsform.
  // Alle vier Konstruktions-Form (assert.equal gegen konkrete Dateinamen-Strings).
  '[Dateinamen-Reichweite] depotDateiname() trägt die angedockte Marke, NICHT „Vivodepot"',
  '[Dateinamen-Reichweite] exportDateiname() trägt dieselbe Marke im Registry-Präfix',
  '[Dateinamen-Reichweite·Rot-Beweis] ohne Branding-Modul bleibt der native Name „Vivodepot" (Gegenprobe)',
  '[Dateinamen-Reichweite·Rot-Beweis] nach Depot-Reset trägt der Name wieder Vivodepot — kein Marken-Leck zum nächsten Depot',
  // C2/U2-ADR-354 (07.09.2026, „Templates bekommen ihren Ort"): fünf neue
  // Testtitel aus tests/c2-weitere-bereiche-template-verzeichnis.test.js, keine PROBEN-
  // Deklarationsform von B-1. Alle fünf: Konstruktions-Form (nennen den konkreten erwarteten
  // Zustand — String-Vorkommen im Sidebar-HTML bzw. Datenobjekt — statt eine Liste leer zu
  // behaupten). Einer davon (die Verdrahtungs-Probe) prüft am Quelltext selbst, keine
  // instrumentierbare dateieigene Kernfunktion, darum zusätzlich ausserReichweite.
  'kein Template angedockt → keine Gruppe, kein Platzhalter, kein Hinweis',
  'ab-Werk-Auszüge (Erbschein + Beratungshilfe) erscheinen nach depotAnlegen NICHT dort — sie gelten als eingebaut',
  'selbst eingelassene Templates → Gruppe erscheint mit beiden',
  'der Sidebar-Eintrag wird auf denselben Öffnungsweg verdrahtet wie die Regal-Karte (dokumentOeffnen, kein zweiter Weg)',
  'ein Feldwert, den ein Template liest, steht unverändert in SEINEM Bereich — keine Kopie im Verzeichnis',
  'Entfernen eines Templates aus data.logikModule[] löscht seinen Sidebar-Eintrag UND läßt den anderen unberührt UND läßt die Felddaten unangetastet',
  // ERZEUGT, nicht getippt — die NAMEN. Alle ZAHLEN dazu stehen in STAND unten und
  // werden bei jedem Lauf gerechnet. Hier steht bewusst keine einzige mehr: eine Zahl
  // in Prosa neben einer berechneten Zahl ist genau das eingefrorene Urteil, gegen das
  // dieser ganze Abschnitt gebaut wurde (der erste Kommentar hier trug „5 · 1 · 4",
  // war zwei Eingriffe später auf „2 · 1 · 3" und hätte niemanden gewarnt).
  //
  // Was die Liste NICHT sagt: sie ist kein Schuldenstand. Ein Teil dieser Wächter liegt
  // strukturell AUSSERHALB DER REICHWEITE des Mechanismus (STAND.ausserReichweite) —
  // Datei ist keine tests/*.test.js, oder der Wächter ruft keine instrumentierbare
  // dateieigene Funktion. Diese Zahl ist der Nenner, den „23" sonst verschweigt.
  'Z2-Storage-Grenze ausgefuehrt und gruen (Verweisziel Stufe 3a)',
  'NULL externe HTTP/S-Requests bei Laden + Nutzung',
  '[Konformität] Runtime: alle geheimen/privaten CryptoKeys sind extractable:false',
  'b16-113-kein-unregistrierter-klartext-ausgeber',
  'b16-021-kein-prozent-vollstaendigkeit-indikator',
  'b16-033-jeder-drop-hat-nicht-dnd-pfad',
  'bindung-098-nachtrag-gemeinsame-pruefung',
  'pruefstand-jede-klausel-zeile-ist-lesbar',
  'pruefstand-jeder-waechter-hat-eine-probe',
  'pruefstand-jede-probe-wird-vom-waechter-benutzt',
  'pruefstand-klassen-werden-bei-jedem-lauf-gerechnet',
  '[Verzicht] die Testament-Zeile ist deklariert und traegt ein befuellbares ort-Unterfeld',
  '[Verzicht] eine Testament-Zeile laesst sich anlegen und traegt den Ablageort',
  '[Verzicht] Ablageort ueberlebt Speichern und Oeffnen — echter Pfad, kein setData',
  '[Verzicht] die befuellte Zeile erscheint in der Lese-App',
  '[Verzicht] und der Verzicht selbst gilt weiter: kein Wizard, kein Generator',
  'Sektor 8 Vorsorge: vier Sektionen — Instrumente leben in der Liste (U2-ADR-096)',
  'Sektor 8 Vorsorge: Detailfelder haengen am `typ` der Instrument-Zeile (U2-ADR-096)',
  // U2-ADR-102-Klausel (Nachtrag 04.08.2026): der Waechter ist `tests/adr-102-import-
  // bereinigen.test.js`, ausserhalb der Reichweite des Instrumentierers (kein Kern-Aufrufer
  // eines dateieigenen Wächters, sondern elf direkte Proben gegen `importVerwaisteEintraege`/
  // `importZeileBereinigt`/`importAnwenden`). Die PROBEN-Deklarationsform von B-1 fehlt allen dreien.
  // U2-ADR-226 (03.09.2026): der bloße Anker „U2-102" band mehrdeutig auf alle elf Testtitel
  // dieser Datei (Grundmenge fälschlich nur +1, nie geprüft) — auf die drei Testtitel aufgelöst,
  // die die drei Teilaussagen der Klausel tatsächlich tragen (Grundmenge jetzt +3, s. `gueltig`).
  '[U2-102·1] eine inkonsistente Zeile wird erkannt, mit Schlüssel und Text',
  '[U2-102·3] importZeileBereinigt entfernt GENAU die angekündigten Felder, sonst nichts',
  '[U2-102·4] importAnwenden OHNE bereinigen-Auswahl lässt jede Zeile exakt, wie sie ankam',
  '[Sprung] keine Sektion ohne Inhalt — eine leere Ueberschrift ist ein Sprungziel ohne Ziel',
  '[ZusVoll] der KERN kuerzt weiterhin — dort ist es richtig',
  // U2-ADR-209 (02.09.2026, Auftrag, Vorrang — Produkt-Trennung im geteilten internen
  // Speicher; ursprünglich als 208 gebaut, umnummeriert — eine parallele Sitzung hatte 208
  // bereits vergeben): vier neue, plain node:test-Proben in tests/geteilter-speicher-
  // produkttrennung.test.js, keine PROBEN-Deklarationsform von B-1. Fünf `pruefung:`-Zeilen
  // binden auf diese vier Namen (das „volles Szenario"-Depot A/B wird von ZWEI Klauseln
  // referenziert, zählt hier als Name trotzdem nur einmal — dieselbe Zählweise wie bei
  // U2-ADR-184 oben).
  '[Produkttrennung·Rot-Beweis] Wurzel-Depot erscheint NICHT mehr als interner Stand der englischen Modul-App',
  '[Produkttrennung] Gegenprobe Altbestand: ein Record OHNE produkt-Feld bleibt für JEDES Produkt auffindbar',
  '[Produkttrennung] volles Szenario: Depot A (Wurzel) bleibt beim nächsten Wiedereinstieg der Wurzel, trotz später erstelltem Depot B (Englisch)',
  '[Produkttrennung] Betriebssatz-Modul-App ist ebenso von Wurzel UND Englisch isoliert',
  // U2-ADR-106 (26.07.2026): die zwei externen Validator-Pruefungen. Sie sind NICHT Schuld,
  // sondern AUSSERHALB DER REICHWEITE — der Instrumentierer greift `tests/*.test.js`, die
  // Konformitaets-Schritte sind `.mjs` unter tests/konformitaet/. Darum steigen hier
  // `ohneDeklaration` (20->22) und `ausserReichweite` (9->11) GEMEINSAM, waehrend die
  // gesicherte Schuld (`ohneBeleg`) auf 0 bleibt. Die Reichweite auf `.mjs` auszudehnen ist
  // ein eigener Zug am Pruefstand, kein Teil dieses Auftrags — als Posten benannt.
  '[Extern] jedes Erzeugnis des Generators traegt sein erwartetes Urteil',
  '[Extern·Negativprobe] ein absichtlich kaputtes Erzeugnis wird ABGELEHNT',
  /* Die beiden folgenden sind KEINE Schuld, sondern AUSSERHALB DER REICHWEITE: sie rufen keine
     instrumentierbare dateieigene Diskriminante, sondern pruefen direkt. `ohneDeklaration` (22->24)
     und `ausserReichweite` (11->13) steigen darum GEMEINSAM, waehrend die gesicherte Schuld
     (`ohneBeleg`) auf 0 bleibt — dieselbe Lage wie beim [Extern]-Paar oben. */
  /* U2-ADR-110 (26.07.): DIESER Waechter braucht keine Mutations-Probe — er IST seine eigene
     Negativkontrolle. `V._heuteTeile(new Date('2040-05-01')).y === 2040`: das Date entsteht im
     aeusseren Realm, die Pruefung laeuft IM KERN. Mit Entenprobe kommt 2040, mit `instanceof Date`
     das laufende Jahr. Die Realm-Grenze im Harness unterscheidet die beiden Implementierungen ohne
     jedes Geruest — ein Mutations-Aufbau daneben waere Zierrat, der nichts hinzufuegt. */
  'u2-110-der-kern-selbst-nimmt-ein-fremdes-date-an',
  /* U2-ADR-111 (26.07.): Quelltext-Zusicherung ueber den Dispatcher — sie haelt fest, dass
     `fhir-ips` am generischen Registry-Weg vorbei ins Gate geleitet wird. Konstruktions-Form:
     es gibt keine Diskriminante, die man instrumentieren koennte, nur zwei Muster im Quelltext. */
  'u2-111-kein-buergerinnen-weg-erreicht-den-builder-am-gate-vorbei',
  // U2-ADR-106-Nachtrag (02.08.2026, Posten 20/23/25 generalisiert): der vierte Ziel-Typ
  // „Entscheidung". Dieselbe Lage wie das [Extern]-Paar oben — die Diskriminante
  // (entscheidungsAktualitaetPruefen) lebt in tools/entscheidungen-kern.js, nicht als
  // dateieigene function/const-Arrow in tests/zusagen-in-kommentaren.test.js. Der Aufruf-
  // Nachweis instrumentiert nur dateieigene Deklarationen und griffe hier nicht — Konstruktions-
  // Form (nennt konkrete erwartete Werte je Befund, kann nicht über leerem Suchraum grün sein),
  // also AUSSERHALB DER REICHWEITE, nicht Schuld.
  'u2-106-entscheidungen-abgeloest-oder-vermerkt',
  // ADR-Konformitäts-Wächter, Tranche 1 (05.08.2026): 13 neue `pruefung:`-Bindungen (ADR-094,
  // 027, 040, 028, 039, 047, 062-Nachtrag ×2, 062-Vertrauensperson, 095, 123, 124) lösen alle
  // korrekt auf einen echten Testtitel auf (Grundmenge +13) — nur die PROBEN-Deklarationsform
  // von B-1 fehlt ihnen noch, dieselbe Lage wie beim U2-102-Fall oben.
  '1b Wächter: basistemplate-inhalte.json === STANDARD_VORLAGEN (kanonisch, pro id)',
  '3) Snapshot bleibt bei späterem Anker-/Namens-Wechsel STEHEN',
  'B-Negativ-5: die Stärke-Anzeige wird sichtbar in den DOM geschrieben (nicht still)',
  'Schritt 3: Cert mit eingebettetem Plain-Template OHNE templateJws → Template verworfen, Werte laufen weiter',
  // F5 Zug 2 (21.08.2026): der Vertrauens-Eintritt ist entfallen, die ADR-062-Bindung zeigt jetzt
  // auf den Fach-Weg. Gleiche Lage wie zuvor: die Bindung loest auf, die PROBEN-Deklarationsform fehlt.
  '[Z9·am Lauf] ein Fach-Empfänger sieht die Blutgruppe und NIE die Steuer-ID',
  '[Klasse-A][ADR-062-N] Ort-Hinweis liegt im Umschlag — neben ct, nicht darin',
  '[Klasse-A][ADR-062-N] zweites Passwort: „schwach" blockiert nicht mehr, Mindestlänge bleibt',
  '[Klasse-A][ADR-095] Roundtrip: die neue Datei öffnet mit dem neuen Passwort, Inhalt unverändert',
  '[Klasse-A][B2] Versions-Gate lehnt VOR der PBKDF2-Ableitung ab (Allowlist durchsetzend)',
  '[Sub-Selbst·1] der Wechsel läuft OHNE jede Anker-Session — kein depotAnlegen, kein data',
  '[U2-124·Zug2·2] die entpackte Datei öffnet über depotLaden — Inhalt byte-identisch zum Sub-Depot-Weg',
  '[U2-ADR-047] JWE round-trip: dir/A256GCM entschlüsselt VERBATIM zum importierten Original',
  // C-Negativ-6 (ADR-028) ist der einzige der 13, der NICHT bloß außerhalb der Reichweite liegt:
  // er ist erreichbar, Kollektor-Form (`assert.equal(plan.zeilen.length, 0, …)`) UND trägt weder
  // Schutz im Test noch einen `[Negativprobe]`-Titel in der Datei — ohneBeleg wächst darum
  // ECHT von 0 auf 1 (siehe STAND unten, mit Begründung statt stillem Nachziehen).
  'C-Negativ-6: synchroner importPlan verweigert signierte Formate (fail-closed)',
  // ADR-Konformitäts-Wächter, Tranche 2 (Nachtlauf 2, 05./06.08.2026): 5 neue Klauseln
  // (ADR-043, 061, 075, 079, 081) mit 10 `pruefung:`-Zeilen lösen alle korrekt auf einen
  // echten Testtitel auf (Grundmenge +10) — dieselbe Lage wie Tranche 1: die PROBEN-
  // Deklarationsform von B-1 fehlt ihnen noch. Alle zehn sind Konstruktions-Form (nennen
  // konkrete erwartete Werte/Zustände statt eine Liste leer zu behaupten). Vier davon
  // zusätzlich außerhalb der Reichweite (keine dateieigene Diskriminante, die der
  // Instrumentierer als Kern-Aufrufer erreicht): die beiden Schema-Guard-Titel (die
  // Diskriminante ist eine externe Fixtur-Migrationskette) und die beiden Teilen-Guard-Titel
  // (direkte `V._teilenBevorzugt()`-Assertion ohne Kern-Aufrufer-Indirektion).
  '1) Lückenlosigkeit — [19..aktuell] ist lückenlos; die EINZIGEN Löcher sind die dokumentierten Leerstellen 20/22',
  '3) Kette läuft durch (KERN) — Alt-Depot (Schema 19) migriert Stufe für Stufe VERLUSTFREI bis zur aktuellen',
  // U2-ADR-231 (03.09.2026): dieselbe Lage wie Test 3 direkt darüber — Kollektor-Form (nennt
  // konkrete erwartete Werte, keine leere Liste), außerhalb der Reichweite (dieselbe externe
  // Fixtur-Migrationskette als eigentliche Diskriminante).
  '4) Ganzkette mit vollem Feldbestand (KERN) — Schema-19-Referenzdepot (271 Felder) migriert verlustfrei bis zur aktuellen Version',
  'Desktop-WebKit (pointer: fine) → Download-Pfad — der DuckDuckGo/Safari-Regressions-Wächter',
  'Touch-Gerät (pointer: coarse) → Teilen-Blatt (teilen=true)',
  '1) Magic-Round-Trip (Bürger-App): Datei mit Magic schreiben, mit Strip lesen, entschlüsseln',
  '2) Legacy: Alt-Datei ohne Magic (bare JSON) lädt weiter (Bürger-App)',
  '[T079-3] Delegiert: Composition.author = RelatedPerson (Ehrlichkeit + Dokument-Integrität)',
  '[T079-4] Delegiert: konforme Provenance (target/recorded/agent.who/onBehalfOf)',
  '[T081-1] Selbst-Fall: Provenance agent.who = Patient, KEIN onBehalfOf, target = Composition, recorded',
  '[T081-2] Selbst-Fall: Provenance ist der letzte Eintrag, Composition bleibt erster',
  // 06.08.2026 (A110 Stufe 2, U2-ADR-040-Nachtrag 4b): eine neue Klausel bindet an
  // tests/fix-a110-codeherkunft.test.js. Kein Kollektor (Konstruktions-Form, s. STAND.konstruktion
  // oben) — nur die PROBEN-Deklarationsform von B-1 (diskriminante + Instrumentierbarkeit)
  // fehlt, wie bei den meisten Bindungen aus Tranche 1/2. Kein eigener Bau in diesem Auftrag.
  'A110-S2) codeListe mit erfundener uri fällt durch, Ursache benannt',
  // 09.08.2026 (N2 Zug 1/5, U2-ADR-105 Stück 2): eine neue Klausel bindet an
  // tests/n2-zug1-ips-nilknown-waechter.test.js. Konstruktions-Form (nennt den konkreten
  // erwarteten Zustand — alle fünf Sektionen tragen `notasked`, nie `nilknown` — statt eine
  // Liste leer zu behaupten). PROBEN-Deklarationsform von B-1 fehlt ihr, wie den meisten
  // Bindungen aus Tranche 1/2 — der eigene Regel-18-Beleg dieses Zugs läuft stattdessen über
  // einen Kindprozess-Mutanten (tools/_n2-zug1-nilknown-probe.js), nicht die PROBEN-Form.
  'alle fünf leeren IPS-Sektionen tragen',
  // 09.08.2026 (N4 Zug 4, U2-ADR-126): eine neue Klausel bindet an
  // tests/w3-schema-sensibel-pruefen.test.js. Konstruktions-Form (nennt den konkreten
  // erwarteten Zustand — Liste-1-Felder tragen `sensibel: true` — statt eine Liste leer zu
  // behaupten). PROBEN-Deklarationsform von B-1 fehlt ihr, wie den meisten Bindungen aus
  // Tranche 1/2 — der Regel-18-Beleg für den Sensibel-Mechanismus selbst läuft über den
  // bereits aus N1 bestehenden Registereintrag W-3-schema-sensibel (tools/waechter-
  // register.js, unverändert), nicht über die PROBEN-Form dieser Klausel.
  // 09.08.2026 („W-7 und W-12", Zug 3): Titel von „97 von 164" auf „98 von 165"
  // nachgezogen — pflegegrad_bescheid_vom kam als 165. Liste-1-Feld dazu, sensibel:true.
  // 09.08.2026 („Die Sensibel-Architektur", Zug 3): Titel von „98 von 165" auf
  // „173 von 173" nachgezogen — acht Grenzfälle kamen als 166–173 dazu, Zug 3 setzt ALLE
  // verbleibenden Liste-1-Felder auf sensibel:true (0 offen).
  // 09.08.2026 („F4 und F5", F5 Posten 1): Titel von „173 von 173" auf
  // „176 von 176" nachgezogen — drei neue Währungs-/Frequenz-Geschwisterfelder kamen dazu,
  // dieselbe Gruppe-C-Einordnung wie ihre Betrag-Geschwister (U2-ADR-126-Nachtrag).
  // 10.08.2026 (M1 Zug 1, Gruppe 2 „Karten und Zahlungsmittel"): Titel von „181 von 181" auf
  // „183 von 183" nachgezogen — krankenkassenkarte_gueltig + elefand_gueltig kamen dazu.
  // 12.08.2026 („Ausbildung und Betreuerbestellung", Zug 2): Titel von „201 von 201"
  // auf „204 von 204" nachgezogen — betreuerbestellung_aufgabenbereiche/_gericht/_aktenzeichen
  // kamen als neues vorsorge_instrumente-Unterfeld-Trio dazu.
  // 204 -> 203 am 14.08.2026 („Die Rentenversicherungsnummer wird aufgelöst",
  // U2-ADR-139): dt_rentenversicherungsnr entfiel, ein Sensibel-Feld weniger.
  // 204 -> 225 am 24.08.2026 („Krisenvorsorge-Checkliste, Ablageort-Sensibel-Regel",
  // Zug 2): 21 Ablageort-Felder als eigene Kategorie in die Sensibel-Grenzfälle-Liste
  // aufgenommen — physischer Aufenthaltsort, Einbruchsrisiko bei Weitergabe, gleiche
  // Begründung wie Fluchtweg/Sammelplatz.
  // 225 -> 229 am 30.08.2026 (Zugang-zum-Recht Zug 1): 4 neue vermoegen-Felder
  // (weitere_einkommensarten, wohnkosten_allein/_gesamt/_eigenanteil) als Gruppe B.
  'echter Kern: 229 von 229 tragen sensibel:true — Liste 1 vollständig gesetzt (Sensibel-Architektur Zug 3) plus F5 Posten 1 plus M1 Zug 1 (Ausweisdokumente, Karten und Zahlungsmittel) plus Nachlese F8/M1 Zug 1 (Freiheitsentzug-Aufteilung) plus Aufenthaltstitel plus F4 Zug 1+3 plus Frühere Namen (K3-Muster: die ganze Liste, nicht feldweise) plus Betreuerbestellung (Aufgabenbereiche/Betreuungsgericht/Aktenzeichen, 12.08.2026) plus testament_bedachte (C15, 15.08.2026) plus 21 neue Ablageort-Grenzfälle (Krisenvorsorge-Auftrag, 24.08.2026, Zug 2 — physischer Aufenthaltsort, Einbruchsrisiko bei Weitergabe, gleiche Begründung wie Fluchtweg/Sammelplatz) plus 4 neue Zugang-zum-Recht-Felder (30.08.2026, Zug 1 — Gruppe B, finanzielle Totalverlust-Gefahr bei Offenlegung)',
  // 09.08.2026 (N5 Zug 4, U2-ADR-127): eine neue Klausel bindet an
  // tests/muster-b-render-scroll-fokus.test.js. Konstruktions-Form (nennt den konkreten
  // erwarteten Zustand — renderContent() ohne Argument erhält den Scroll — statt eine Liste leer
  // zu behaupten). PROBEN-Deklarationsform von B-1 fehlt ihr, wie den meisten Bindungen aus
  // Tranche 1/2 — der Regel-18-Beleg für den Default-Dreh selbst läuft über den neuen
  // Registereintrag W-Scroll-Erhalt (tools/waechter-register.js), nicht über die PROBEN-Form
  // dieser Klausel.
  'renderContent() (ohne Argument) ERHÄLT den #content-Scroll — der neue Default',
  // 09.08.2026 („Die Sensibel-Architektur", Zug 1+3, U2-ADR-128): eine neue
  // Klausel bindet an tests/sensibel-listen-unterfeld.test.js. Konstruktions-Form (nennt
  // den konkreten erwarteten Zustand — vollExportJSON enthält die Notiz vor der Markierung,
  // nicht danach — statt eine Liste leer zu behaupten). PROBEN-Deklarationsform von B-1
  // fehlt ihr, wie den meisten Bindungen aus Tranche 1/2 — der Regel-18-Beleg läuft im
  // selben Testkörper real (vorher/nachher), nicht über die PROBEN-Form dieser Klausel.
  '[Sensibel-U1·Regel 18] echter Kern, End-zu-Ende: vollExportJSON enthält die Notiz vor der NUTZER-Markierung und nicht mehr danach',
  // 10.08.2026 (K8 Zug 3, U2-ADR-131): eine neue Klausel bindet an
  // tests/k8-byte-gleichheit.test.js. Konstruktions-Form (nennt den konkreten erwarteten
  // Zustand — die vier alten Dokument-Ausgaben sind byte-identisch zum neuen, geteilten
  // Weg — statt eine Liste leer zu behaupten). PROBEN-Deklarationsform von B-1 fehlt allen
  // vieren, wie den meisten Bindungen aus Tranche 1/2 — der Regel-18-Beleg läuft über die
  // vier eingefrorenen Golden-Fixtures (tests/fixtures/k8-vorher/*.html), nicht über die
  // PROBEN-Form dieser Klausel.
  // U2-ADR-226 (03.09.2026): der bloße Anker „K8·Byte-Gleichheit" band mehrdeutig auf alle
  // vier Testtitel dieser Datei (Grundmenge fälschlich nur +1, nie geprüft) — auf die vier
  // tatsächlich gemeinten, in der Aussage selbst genannten Ausgaben aufgelöst (Grundmenge
  // jetzt +4, s. `gueltig`).
  '[K8·Byte-Gleichheit] PV — dokumentHTML(\\\'patientenverfuegung\\\') == altes pvDokumentHTML() (Zug-0-Fixture)',
  '[K8·Byte-Gleichheit] KI — dokumentHTML(\\\'ki-verfuegung\\\') == altes kiDokumentHTML() (Zug-0-Fixture)',
  '[K8·Byte-Gleichheit] VM — dokumentHTML(\\\'vorsorgevollmacht\\\', id) == altes vollmachtDokumentHTML(id) (Zug-0-Fixture)',
  '[K8·Byte-Gleichheit] BV — dokumentHTML(\\\'betreuungsverfuegung\\\') == altes betreuungDokumentHTML() (Zug-0-Fixture)',
  // 30.08.2026 (U2-ADR-101, zweite Konformitätsklausel, Bedingung erfüllt): eine neue
  // `pruefung:`-Zeile bindet an tests/adr-101-blatt3-eingebaute-sicht.test.js. Konstruktions-
  // Form (nennt den konkreten erwarteten Zustand — genau sieben Feld-Zeilen im eingebauten
  // Teil der Sicht, byte-genau gegen die per Hand abgetippte ADR-Tabelle — statt eine Liste
  // leer zu behaupten). PROBEN-Deklarationsform von B-1 fehlt ihr, wie den meisten Bindungen
  // aus Tranche 1/2 — der eigene Rot-Beweis dieser Klausel läuft über zwei Gegenproben im
  // selben Testkörper (Entschärfungs-Kontrolle mit einem gefälschten achten Feld, Heben-
  // Trennung mit einem echten U2-ADR-157-Fremdfeld), nicht über die PROBEN-Form.
  '[ADR-101·Sicht] Blatt "Beerdigung und Nachlass"',
  '[ADR-101·Sicht·Heben-Trennung]',
  // 31.08.2026 (U2-ADR-184, Sub-Depot-Klick-Freeze): drei neue Bindungen. Konstruktions-Form
  // (nennen den konkreten erwarteten Zustand — data===null, #content==='', die 30:00-Grenze
  // zählt schon — statt eine Liste leer zu behaupten). PROBEN-Deklarationsform von B-1 fehlt
  // ihnen, wie den meisten Bindungen aus Tranche 1/2: die drei Kern-Funktionen
  // (_hintergrundBeginnen/_hintergrundBeenden/_hintergrundWipeVielleicht) werden im Testkörper
  // DIREKT über ihren echten Namen aufgerufen (V._hintergrundBeginnen() usw.) — der
  // Aufruf-Nachweis, den die PROBEN-Form über Instrumentierung erst herstellen müsste, liegt
  // hier schon offen im Testkörper selbst.
  'innerhalb der Frist zurück → kein Wipe',
  'nach Ablauf der Frist im Hintergrund → vollständiger Wipe',
  'genau an der 30-Minuten-Grenze zählt bereits als abgelaufen',
  // 01.09.2026 (U2-ADR-185, Sperrschirm statt Eingangsschirm nach Wipe): neun neue,
  // DISTINKTE Bindungen (tests/wiedereintritt-nach-wipe.test.js, sechs Klauseln, neun
  // `pruefung:`-Zeilen, kein Titel doppelt referenziert — seit U2-ADR-226 durch die Klasse-A-
  // Prüfung selbst gehalten, nicht mehr nur behauptet). Konstruktions-Form (nennen den
  // konkreten erwarteten Zustand — #co-pw sichtbar, der abgenommene Wortlaut steht/fehlt,
  // aktiverSektorId nach dem Wiedereintritt, der gehaltene Umschlag entschlüsselt/scheitert
  // — statt eine Liste leer zu behaupten). PROBEN-Deklarationsform von B-1 fehlt ihnen, wie
  // den drei ADR-184-Bindungen direkt darüber: die Testkörper rufen die echten Kern-Funktionen
  // (V._hintergrundWipeVielleicht(), V.cryptoOverlayOeffnen(), V._gehaltenerUmschlagHalter()
  // u. a.) direkt über ihren Namen auf — derselbe offen liegende Aufruf-Nachweis.
  'nach dem Wipe zeigt der Schirm das Passwortfeld',
  'der erklärende Satz steht NUR nach dem Wipe',
  'derselbe Sperrschirm beim REGULÄREN Öffnen',
  'NACH JEDEM Speichern nachgezogen',
  'die Navigations-Stelle wird gemerkt',
  'verschwundene Stelle',
  // Abweichend von den acht übrigen: dieser Testkörper ruft KEINE dateieigene Funktion beim
  // eigentlichen Verwerfen direkt beim Namen — er liest den echten Rückweg-Klick-Handler vom
  // DOM-Element (`document.getElementById('co-neu').onclick()`) und ruft IHN, nicht
  // `_wiedereintrittVerwerfen()` selbst. Derselbe strukturelle Grund wie an anderer Stelle in
  // dieser Liste (Konstruktions-Form, aber ausserhalb der Reichweite des Instrumentierers) —
  // s. STAND.ausserReichweite: 29 → 30.
  'Rückweg "Doch neu anfangen"',
  'falsches Passwort scheitert weiterhin',
  'der gehaltene Umschlag ist entschlüsselbar',
  // U2-ADR-188 (01.09.2026, Commit 1 von zwei): fünf neue `pruefung:`-Bindungen (vier zur
  // Registry-Zusage, eine — Sicherheit — zur sicherheitsrelevanten) lösen alle
  // korrekt auf einen echten Testtitel auf (Grundmenge +5) — dieselbe Lage wie die meisten
  // Bindungen aus Tranche 1/2 oben: die PROBEN-Deklarationsform von B-1 fehlt ihnen.
  // ERREICHBAR (nicht ausserReichweite): jeder Testkörper ruft einen dateieigenen Test-Helfer
  // (kern()/ankerMitSubAnlegen()/signiertesBuendel() …) — der Instrumentierer prüft den
  // Namen, nicht ob die eigentliche Diskriminante lokal oder im Kern liegt.
  'Hinrichtung',
  'Rückrichtung',
  'Textsatz',
  'Paar B',
  'Sicherheit',
  // U2-ADR-189 (01.09.2026, Commit 2 von zwei, derselbe Auftrag): fünf weitere neue
  // `pruefung:`-Bindungen, dieselbe strukturelle Lage — Test-Helfer statt dateieigener
  // Kern-Diskriminante, PROBEN-Form fehlt, alle erreichbar.
  'Rot-Beweis-Vorbedingung',
  'die ganze Naht',
  'duplizieren das Modul nicht',
  'wird von der Vererbung nicht überschrieben',
  'setzt SEKTOREN zurück',
  // U2-ADR-207 (02.09.2026, dieselbe Naht, ein Zug weiter — fremdes statt eigenes Depot):
  // eine neue `pruefung:`-Bindung, dieselbe strukturelle Lage wie die ADR-189-Gruppe
  // darüber — der Testkörper (tests/vor-depot-modul-ueberlebt-fremdes-depot.test.js) ruft
  // Test-Helfer (kern()/signiertesBuendel()), keine dateieigene Kern-Diskriminante,
  // PROBEN-Form fehlt, erreichbar.
  'Rot-Beweis',
  // 01.09.2026 (U2-ADR-186, Einlass-Register melden Ausfall): zwei neue `pruefung:`-Zeilen
  // lösen beide korrekt auf tests/ladeweg-fragt-kein-zertifikat.test.js auf. Konstruktions-Form
  // (nennen den konkreten erwarteten Zustand — kein Zertifikats-Bezeichner im Funktionsrumpf,
  // kein async/await — statt eine Liste leer zu behaupten). PROBEN-Deklarationsform von B-1
  // fehlt ihnen, wie den meisten Bindungen aus Tranche 1/2.
  'ladeweg-fragt-kein-zertifikat',
  '[U2-ADR-186 · Positivkontrolle] derselbe Extraktor findet die Zertifikatsprüfung dort, wo sie wirklich steht',
  // U2-ADR-194 (01.09.2026, Auftrag): acht neue `pruefung:`-Bindungen, alle lösen korrekt
  // auf einen echten Testtitel auf (Grundmenge +8) — keine trägt eine PROBEN-Deklaration. NICHT
  // alle acht sind AUSSERHALB DER REICHWEITE (gemessen, nicht angenommen — ein erster Versuch
  // nahm das an und wurde vom Lauf selbst widerlegt, STAND.ausserReichweite fiel von der
  // angenommenen 38 auf die tatsächliche 34): die vier `tests/index-weiterleitung-erzeugen.test.js`-
  // Titel rufen alle den dateieigenen Fixture-Helfer `mitFixture(...)` — der Instrumentierer sieht
  // DIESEN Aufruf und zählt sie als erreichbar, obwohl ihre eigentliche Diskriminante
  // (`indexWeiterleitungInhalt`) weiterhin in tools/index-weiterleitung-erzeugen.js liegt. Die
  // vier `testfassung-legen.test.js`/`modul-app-packen.test.js`-Titel rufen keine dateieigene
  // Funktion (nur `dateisatzUndIndexAblegen` aus tools/ + Node-Bordmittel) — für sie stimmt
  // AUSSERHALB DER REICHWEITE tatsächlich.
  'leitet sofort auf ./vivodepot.html weiter',
  'übernimmt die Sprache aus der Zieldatei — Deutsch',
  'übernimmt die Sprache aus der Zieldatei — Englisch',
  'fehlt <html lang>, wird geworfen statt geraten',
  'dateisatzUndIndexAblegen legt DATEISATZ plus eine index.html mit Weiterleitung ab',
  'index.html gehört NICHT zu DATEISATZ — dessen Vier-Dateien-Vertrag bleibt unverändert',
  'dateisatzUndIndexAblegen legt DATEISATZ plus eine EIGENE index.html je Ordner ab',
  'packeEinzeln UND packeAlle nutzen beide dateisatzUndIndexAblegen, keine eigene Kopier-Schleife mehr',
  // U2-ADR-187 (01.09.2026, tests/bereich-identitaet-verwaist.test.js): alle vier Proben rufen
  // Kern-Funktionen (V.bereicheAlle, V._sektorIndexHalter, V.bereicheVerwaisteAlle) direkt in
  // der Assertion auf, keine eigene, dateilokale `function <name>`-Diskriminante wird als
  // Kopplungspunkt DEKLARIERT (PROBEN-Block fehlt). Drei der vier rufen im Testkörper aber die
  // lokalen Testaufbau-Helfer `depotMitAngedocktemBereich`/`bereichVerwaisenLassen` — der
  // Instrumentierer findet die darum als „erreichbar" (s. `ausserReichweite` unten: nur die
  // vierte Probe, ohne Aufruf eines lokalen Helfers, zählt dort). Alle vier: Konstruktions-Form.
  '[Guard·DIE WICHTIGERE PROBE] ein verwaister Bereich taucht in bereicheAlle() NICHT auf',
  '[Teil2·Rot] verwaist ein Bereich, wandert die Identität mit — eigener Namensraum',
  '[Teil3·DIE ANTWORT] ein verwaister Bereich ist über die neue Funktion lesbar, mit Namen',
  '[Teil3·Rückwirkender Fall] ohne Identitäts-Schnappschuss: Notlösung, ausdrücklich markiert',
  // U2-ADR-196 (01.09.2026, tests/textsatz-verweise-pruefen.test.js): drei neue Proben rufen
  // `messen()` aus tools/textsatz-verweise-pruefen.js direkt in der Assertion auf, keine
  // eigene, dateilokale `function <name>`-Diskriminante wird als Kopplungspunkt DEKLARIERT
  // (PROBEN-Block fehlt) — alle drei: Konstruktions-Form.
  '[Anlassfall·behoben] "Withhold"/"Zurückhalten": kein kaputter Verweis mehr, in BEIDEN Sprachen',
  '[Anlassfall·behoben] "Identity & person"/"Identität & Person": kein kaputter Verweis mehr, in BEIDEN Sprachen',
  '[Anlassfall·bewusst NICHT hier behoben] "power of attorney for care" bleibt ein bekannter Übersetzungsfehler (gehört zu U2-ADR-195, nicht 196)',
  // U2-ADR-195 (01.09.2026, tests/textsatz-en-begriffe-pruefen.test.js + tests/pre-depot-en-sync.test.js):
  // vier neue Proben rufen `messen()`/`glossartreuePruefen()`/`preDepotSyncPruefen()` — alle
  // drei Funktionen leben in derselben Datei tools/textsatz-en-begriffe-pruefen.js, kein
  // zweites Tool-File dafür — direkt in der
  // Assertion auf, keine eigene, dateilokale `function <name>`-Diskriminante wird als
  // Kopplungspunkt DEKLARIERT (PROBEN-Block fehlt) — alle vier: s. Kommentar an `kollektor`
  // unten für die Aufteilung Kollektor-/Konstruktions-Form.
  // U2-ADR-363 (Zug 2, 07.09.2026): PRE_DEPOT_EN entfernt, ersetzt durch AB_WERK_TEXTSATZ_EN_
  // VORDEPOT (ein echtes Sprachmodul statt eines nativen Literals) — Testtitel UND die
  // `pruefung:`-Zeile in derselben ADR-Datei (Zeile 205/258) gemeinsam nachgezogen.
  '[Anlassfall] der echte Bestand: 0 Abweichungen zwischen dem Vor-Depot-Sprachangebot und dem EN-Modul',
  '[Anlassfall·behoben] Assistent-Gruppe: "Guided birth entry" durchgängig, "wizard" bleibt in der Positivkontrolle daneben stehen',
  '[Anlassfall·behoben] Depot: "vault" wurde zu "depot" umgekehrt — 0 verbliebene "vault"-Stellen im EN-Modul',
  '[Anlassfall·behoben] alle fünf Glossar-Begriffe (Vollmacht/Patientenverfügung/Depot/Betreuer/Bereich): 0 Verstöße gegen den echten Bestand',
  // 01.09.2026 (U2-ADR-190, bedingtes skipWaiting): fünf neue, DISTINKTE Namen
  // (tests/sw-aktivierung-bedingtes-skipwaiting.test.js vier, tests/sw-update-
  // zustellung.test.js#Stufe 3 eine). PROBEN-Deklarationsform von B-1 fehlt allen fünf,
  // wie den meisten Bindungen aus Tranche 1/2 — der eigene Rot-Beweis läuft über die
  // automatisierte `[Negativprobe]`-Mutation im selben Testkörper (s. STAND.nurSchwach).
  // Drei sind Konstruktions-Form (nennen den konkreten erwarteten Zustand: gesendete
  // Nachricht type===SKIP_WAITING, skipWaitingCalls.length===1) — die beiden „bei
  // Zähler 0"/„message SKIP_WAITING ruft..."-Titel. ZWEI sind Kollektor-Form
  // (behaupten eine leere Liste: „bei Zähler > 0" Nachrichtenliste, „eine andere/
  // fehlende Nachricht" Aufrufliste) — s. STAND.kollektor: 10 → 12. Die fünfte
  // („Stufe 3") ist zusätzlich AUSSERHALB DER REICHWEITE (prüft direkt gegen den
  // SW-/HTML-Quelltext, ruft keine instrumentierbare dateieigene Funktion) —
  // s. STAND.ausserReichweite: 30 → 31.
  'U2-ADR-190: bei Zähler 0 wird die Aktivierung angestossen (SKIP_WAITING gesendet)',
  'U2-ADR-190: bei Zähler > 0 wird NICHT umgeschaltet (die Probe, die den Schutz trägt)',
  'Stufe 3: skipWaiting bleibt AUS außer auf ausdrückliche Anweisung — nie automatisch (U2-ADR-190)',
  'U2-ADR-190: message SKIP_WAITING ruft self.skipWaiting() auf',
  'U2-ADR-190: eine andere/fehlende Nachricht ruft KEIN skipWaiting() auf',
  // 01.09.2026 (U2-ADR-190, Nachschärfung — automatisch statt Hinweis): die
  // Rückbau-Klausel bindet an einen weiteren Testtitel derselben Datei. Konstruktions-Form,
  // zusätzlich außerhalb der Reichweite (prüft direkt gegen den HTML-Quelltext) — derselbe
  // strukturelle Grund wie „Stufe 3" direkt darüber, s. STAND.ausserReichweite/konstruktion.
  '[Negativprobe] U2-ADR-190: Stufe 2 (ungefragter Versions-/Neuladen-Hinweis) bleibt zurückgebaut',
  // 01.09.2026 (U2-ADR-197, Aussage-Pruefung-Abgleich): sechs neue, DISTINKTE Namen aus
  // tests/aussage-pruefung-abgleich-messen.test.js. PROBEN-Deklarationsform von B-1 fehlt allen
  // sechs. GEMESSEN, nicht angenommen (node -e gegen klassifiziereWaechter()/ausserhalbReichweite()
  // je Name einzeln gefahren):
  //   `[erhebe] ... löst NICHT ... auf` UND `[fehlendeBegriffe·Gegenprobe] ...`: Kollektor-Form
  //   (behaupten eine leere Liste — pruefungFehlt bzw. fehlendeBegriffe leer), BEIDE zusätzlich
  //   außerhalb der Reichweite (prüfen direkt gegen erhebe()/den echten ADR-Bestand, keine
  //   dateieigene Diskriminante) — zählen darum NICHT zu mitSchutz/nurSchwach/ohneBeleg (die
  //   filtern auf `erreichbar`).
  //   `[fehlendeBegriffe] ...` UND `[benannteBegriffe·BEFUND, jetzt gefiltert] ...`:
  //   Konstruktions-Form, ebenfalls außerhalb der Reichweite (derselbe Grund).
  //   `[hatRotBelegProxy] ...` UND `[hatRotBelegProxy·Gegenprobe] ...`: Konstruktions-Form
  //   UND erreichbar (rufen die dateieigene `mitFixtureDatei()` auf) — einzige zwei der sechs,
  //   die theoretisch instrumentierbar wären.
  // Summe: 2 Kollektor + 4 Konstruktion = 6; 4 außerhalb der Reichweite (s. STAND.ausserReichweite).
  '[erhebe] die U2-ADR-099-Selbstbeschreibung „`pruefung:`-Zeile" löst NICHT als eigene, kaputte Pruefung-Zeile auf',
  '[fehlendeBegriffe] ein Begriff, der im Testkörper fehlt, wird gemeldet — der reale U2-ADR-002-Fund nachgebaut',
  '[fehlendeBegriffe·Gegenprobe] ein tatsächlich genannter Begriff wird NICHT gemeldet',
  '[benannteBegriffe·BEFUND, jetzt gefiltert] die eigene ADR-Nummer der Aussage zählt NICHT als Begriff',
  '[hatRotBelegProxy] eine Datei mit „[Negativprobe]"-Titel gilt als belegt',
  '[hatRotBelegProxy·Gegenprobe] eine Datei ganz ohne Rot-Beweis-Spur gilt als NICHT belegt',
  // 01.09.2026 (U2-ADR-190-Nachtrag, clients.claim() — gemessen statt vermutet): eine neue
  // `pruefung:`-Zeile bindet an tests/e2e/sw-uebernahme-keine-same-origin-anfrage.spec.js —
  // die ERSTE `@playwright/test`-gebundene Klausel im ganzen Bestand (bisher ausschließlich
  // `node:test` + `node:assert`). Zwei Folgen, beide GEMESSEN (node -e gegen
  // klassifiziereWaechter()/ausserhalbReichweite() direkt gefahren, nicht angenommen):
  //   AUSSERHALB DER REICHWEITE (Datei ist keine tests/*.test.js — probenDeklarationen()
  //   und der Aufruf-Nachweis-Instrumentierer greifen beide nur dort) — s.
  //   STAND.ausserReichweite: 36 → 37.
  //   Kollektor-Form (`expect(nachLaden, meldung).toEqual([])` — sammelt same-origin-
  //   Anfragen nach der Ladegrenze und behauptet ihre Leere, kann über leerem Suchraum grün
  //   sein) — s. STAND.kollektor: 14 → 15. Zusätzlich außerhalb der Reichweite, zählt darum
  //   NICHT zu mitSchutz/nurSchwach/ohneBeleg (die filtern auf `erreichbar`) — der eigene
  //   Rot-Beweis läuft über eine automatisierte `[Negativprobe]` in derselben Datei
  //   (`<img>`-Ladeversuch, nicht `fetch()` — die Seiten-CSP `connect-src 'none'` blockt
  //   `fetch()`/XHR vollständig, s. Kommentar dort), nicht über die PROBEN-Form.
  // `pruefstand-bindung.js` selbst musste dafür zweimal erweitert werden — nicht aufgeweicht,
  // sondern um eine bisher nie gebrauchte, echte Testform ergänzt: der „lesbarer Rumpf"-Gate
  // erkennt jetzt auch `expect(` neben `assert.` (sonst wäre der eigene, echte Testkörper
  // fälschlich als `ohneRumpf` gemeldet worden), und KOLLEKTOR_FORMEN erkennt zusätzlich
  // Playwrights `.toEqual([])`-Schwanz (die Meldung steht bei `expect(wert, meldung)` VOR
  // der Zusicherung, oft weit über 140 Zeichen — der bestehende `[\s\S]{0,140}?`-Radius der
  // `deepEqual(...)`-Form hätte sie verfehlt).
  'ein bereits geladener Tab stellt nach dem Laden keine same-origin-Anfrage mehr — über eine breite Sitzung (PDF, Export, Sub-Depot)',
  // 02.09.2026 (U2-ADR-206, Auftrag — Signier-Werkzeug merkt sich stehende Pfade):
  // vier neue, DISTINKTE Bindungen (tests/modul-app-signieren-und-packen.test.js), kein Titel
  // doppelt referenziert (seit U2-ADR-226 durch die Klasse-A-Prüfung selbst gehalten, nicht mehr
  // nur behauptet). Konstruktions-Form (nennen den konkreten erwarteten Zustand — keine
  // Passphrase in der Datei, gitignored, Override gewinnt immer, verschwundener Pfad wird
  // erfragt — statt eine Liste leer zu behaupten). Zwei rufen NUR geteilte Modul-Funktionen
  // (`execFileSync`/`pfadEntscheidung`) ohne eigene dateilokale Diskriminante — außerhalb der
  // Reichweite; die anderen zwei rufen zusätzlich den dateieigenen Fixture-Helfer
  // `wegwerfMerkdatei()` — erreichbar. Programmatisch verifiziert (P.klassifiziereWaechter).
  'merkeSchreiben lässt eine mitgegebene Passphrase NIEMALS in die Datei — feste Allowlist, kein Durchreichen',
  'die echte MERKDATEI ist gitignored',
  'beide Pfade EXPLIZIT übergeben — KEINE Frage wird gestellt, unabhängig vom Gedächtnis',
  'ein gemerkter Pfad, der nicht mehr existiert, wird NICHT stillschweigend benutzt',
  // 01.09.2026 (U2-ADR-202, kinder-Liste — verborgenWenn-Live-Verdrahtung): eine neue
  // `pruefung:`-Zeile löst korrekt auf tests/e2e/fix-kinder-verborgenwenn-live-verdrahtung.spec.js
  // auf. Konstruktions-Form (nennt den konkreten erwarteten Zustand — der geleakte Wert bleibt
  // nach dem Fix undefined — statt eine Liste leer zu behaupten). PROBEN-Deklarationsform von
  // B-1 fehlt ihr, wie den meisten Bindungen aus Tranche 1/2.
  '[U2-ADR-202 · Rot-Beweis] ein Wert, der bei der Speicherung unsichtbar ist, landet NICHT im Depot',
  // 02.09.2026 (Rebase auf 8857393, U2-ADR-193 + U2-ADR-199): drei neue `pruefung:`-Zeilen
  // lösen alle korrekt auf einen echten Testtitel auf (zwei aus tests/bbk-quelle-konsistenz.
  // test.js, eine aus tests/paritaet-kern-lese.test.js) — PROBEN-Deklarationsform von B-1
  // fehlt allen dreien, wie den meisten Bindungen aus Tranche 1/2. Alle drei: Konstruktions-
  // Form (nennen den konkreten erwarteten Zustand — dasselbe Datum in Zitat und Kommentar,
  // keine „7. Auflage/2019"-Nennung mehr, dasselbe Unterfeld in Kern UND Lese-App — statt eine
  // Liste leer zu behaupten). Erreichbarkeit/Reichweite je Titel GEMESSEN unten, nicht
  // angenommen.
  'Zitat und Kommentar nennen denselben Stand',
  'krisenvorsorgeBedarfQuelle nennt keine überholte Auflage',
  'gemeinsame Listen haben dieselben Unterfelder',
  // 02.09.2026 (U2-ADR-208, Sprachkennung fällt auf aktive Sprache zurück): vier neue
  // `pruefung:`-Zeilen lösen alle korrekt auf, je einen eigenen Testtitel, keine Mehrfachnennung.
  // Konstruktions-Form (jede nennt den konkreten erwarteten Wert — 'en'/'de-DE'/'ar-EG' — statt
  // eine Liste leer zu behaupten). PROBEN-Deklarationsform von B-1 fehlt allen vieren, wie den
  // meisten Bindungen aus Tranche 1/2. ALLE VIER AUSSERHALB DER REICHWEITE — erste Annahme war
  // falsch (alle vier riefen nur V.textsatzRegeln()/V.textsatzSprachkennungAnwenden()/
  // V.vorDepotSpracheUmschalten(), keine dateieigene Funktion), direkt gegen
  // ausserhalbReichweite()/waechterRumpf() gemessen statt angenommen: die Reichweite fragt nach
  // einer im TESTFILE selbst deklarierten Diskriminante, nicht danach, ob die geprüfte Logik im
  // Kern oder in tools/ liegt — ein Aufruf über das importierte `V`-Objekt zählt so wenig wie ein
  // Aufruf in ein geteiltes tools/-Modul. S. STAND.ausserReichweite: 52 → 56.
  '[Textsatz·U2-ADR-208] ein Modul OHNE eigene Sprachkennung bekommt die AKTIVE Sprache, nicht den deutschen Rückfall',
  '[Textsatz·U2-ADR-208] eine eigene Modul-Sprachkennung überschreibt weiterhin den neuen Rückfall',
  '[Textsatz·U2-ADR-208·Rot] ohne den Fallback bleibt die Sprachkennung am deutschen Wert hängen',
  '[Vor-Depot-Schalter·U2-ADR-208] document.documentElement.lang folgt dem Umschalter',
  // Rebase auf 657f6d6 (02.09.2026, U2-ADR-211, Sicherungsstand bekannt): sechs neue
  // `pruefung:`-Zeilen lösen alle korrekt auf echte Testtitel in
  // tests/sicherungsstand-bekannt.test.js auf — PROBEN-Deklarationsform von B-1 fehlt allen
  // sechs, wie den meisten Bindungen aus Tranche 1/2. Alle sechs: Konstruktions-Form (nennen
  // den konkreten erwarteten Zustand — ein Feld übersteht einen echten Serialisieren→Laden-
  // Rundlauf, ein fehlendes Feld liefert null/undefined statt zu werfen, ein Platzhalter ist
  // ersetzt — statt eine Liste leer zu behaupten). Drei der sechs rufen `frisch()` (dateilokale
  // Diskriminante) auf — erreichbar; die anderen drei rufen `ladeKern({...})` direkt mit eigenen
  // Optionen — ausserhalb der Reichweite (s. STAND.ausserReichweite unten).
  'Sicherungsstand übersteht Serialisieren→Laden',
  'exportErinnerungModell() ohne sicherungsStand',
  'markiereUngespeichert() ohne sicherungsStand',
  'Depot-Liste: Dateiname bekannt, sicherungsStand fehlt',
  'ersetzt der Zustands-Wortlaut BEIDE Platzhalter',
  'exportErinnerungVielleichtZeigen() ohne sicherungsStand',
  // 02.09.2026 (U2-ADR-201, Zug 1 Betreuung, Rebase auf 39683c7/v500): zwei neue `pruefung:`-Zeilen
  // lösen korrekt auf tests/e2e/persona-betreuung-echte-vertretungswege.spec.js auf.
  // Konstruktions-Form (Betreuerbestellung bzw. betreuter Erwachsener — beide nennen den
  // konkreten erwarteten Zustand mit echtem UI-Wert, keine Kollektor-Leerprobe). PROBEN-
  // Deklarationsform von B-1 fehlt beiden, wie den meisten Bindungen aus Tranche 1/2.
  '[Betreuung·A] Betreuerbestellung — die Inhaberin steht selbst unter Betreuung, mit echtem Wert',
  '[Betreuung·B] betreuter Erwachsener — die Inhaberin betreut jemand anderen, mit echtem Wert',
  // 02.09.2026 (U2-ADR-201, Zug 1 Kinder, Commit 2 von zwei): zwei neue `pruefung:`-Zeilen lösen
  // korrekt auf tests/e2e/persona-kinder-sorgerecht-subdepot.spec.js auf. Konstruktions-Form
  // (Pflegekind mit echtem Geburtsdatum+sorgerecht_kind bzw. Sub-Depot bis zum echten Abschluss
  // — beide nennen den konkreten erwarteten Zustand, keine Kollektor-Leerprobe). PROBEN-
  // Deklarationsform von B-1 fehlt beiden, wie den meisten Bindungen aus Tranche 1/2.
  '[Kinder·A] Pflegekind mit echtem, vergangenem Geburtsdatum — sorgerecht_kind wirklich gesetzt, nicht nur gerendert',
  '[Kinder·B] Sub-Depot für ein Kind wirklich bis zum Abschluss angelegt — echtes Passwort, echter Umschlag',
  // U2-ADR-212 (02.09.2026, dieser Zweig, VOR dem Rebase auf f1cdb0e, Auftrag — Sichern-Knopf folgt
  // Speicher-Modus): sieben neue `pruefung:`-Zeilen aus fünf `konformitaet`-Blöcken lösen alle
  // korrekt auf sieben VERSCHIEDENE Testtitel auf, keine PROBEN-Deklarationsform von B-1. Fünf
  // Konstruktions-Form-Proben gegen die reine, DOM-freie Entscheidung saveKnopfDateiWeg(m) —
  // erreichbar laut Mechanismus, aber nur wegen eines Mess-Artefakts (s. NACHTRAG an
  // STAND.ausserReichweite oben, dort ausführlich begründet, nicht hier wiederholt). Zwei
  // Konstruktions-Form-Proben im echten Browser (tests/e2e/u2-adr-212-sichern-intern.spec.js) —
  // strukturell ausserhalb der Reichweite (kein `tests/*.test.js`).
  // Speicher-Modell (03.09.2026, Stück 3) entfernt PS10-2/3/4/7 als eigene Titel — die
  // Fallunterscheidung, die sie einzeln belegten, ist zurückgebaut (saveKnopfDateiWeg() jetzt
  // konstant true). PS10-1 bleibt (Titel unverändert), jetzt als der eine verbleibende Fall. Der
  // alte Browser-Rot-Beweis (tests/e2e/u2-adr-212-sichern-intern.spec.js) behauptete das
  // Gegenteil der jetzt gewollten Funktion — Titel geändert, nicht nur der Testkörper, sonst
  // stünde eine Lüge im eigenen Testnamen einer grünen Probe.
  // U2-ADR-237 (03.09.2026, dieser Zweig): PS10-1 umbenannt (Titel trug bis
  // heute vormittag die jetzt zurückgenommene Stück-3-Prämisse „IMMER über die Datei" — ein
  // Titel, der seine eigene Aussage nicht mehr behauptet, wäre eine Lüge im Testnamen). Zwei neue
  // Titel aus tests/adr-237-speicherschleife-ohne-datei.test.js dazu — beide Konstruktions-Form
  // (konkrete Werte per assert.equal/assert.ok), keine PROBEN-Deklaration in eigenem Recht.
  'PS10-1 (U2-ADR-237): der Klick geht über den internen Weg, wenn intern möglich — Datei nur, wo IndexedDB fehlt',
  'anlegen, befüllen (ohne Datei-Sicherung), schließen, öffnen — Daten da',
  'ein Hintergrund-Konflikt bei stillem Save unterbricht NICHT interaktiv, sondern markiert fehlgeschlagen',
  'U2-ADR-212 Rundlauf: exportieren → frisches Profil ohne internen Stand → importieren → derselbe Inhalt',
  // Fast-Forward auf 39683c7 (02.09.2026, dieser Zweig, sw-aenderung-beabsichtigt, U2-ADR-214):
  // zehn neue Bindungen in tests/testfassung-legen.test.js — PROBEN-Deklarationsform von B-1
  // fehlt allen zehn. Alle zehn: Konstruktions-Form (jede nennt den konkreten erwarteten
  // Zustand — `blockiert`/`ok`/`grund`/ein sauberer Zielbaum nach Rücknahme — statt eine Liste
  // leer zu behaupten). Neun der zehn rufen ausschließlich `adrBezeichnetSwAenderung`/
  // `swAenderungEntscheidung` — importierte Funktionen aus dem geteilten
  // `tools/testfassung-legen.js`, keine dateieigene Diskriminante — außerhalb der Reichweite
  // (s. STAND.ausserReichweite unten). Die zehnte ('ablegungZuruecknehmen nimmt ALLE fünf
  // abgelegten Dateien zurück, nicht nur sw.js') ruft zusätzlich die dateilokale Hilfsfunktion
  // `wegwerfZielMitFuenfBasisDateien()` auf — erreichbar, direkt gegen `ausserhalbReichweite()`
  // gemessen, nicht angenommen.
  'adrBezeichnetSwAenderung: U2-ADR-190 existiert und nennt sw.js — gültig',
  'adrBezeichnetSwAenderung: eine nicht existierende ADR-Nummer bricht ab',
  'adrBezeichnetSwAenderung: eine ungültig geformte Kennung bricht ab',
  'adrBezeichnetSwAenderung: eine existierende ADR OHNE Erwähnung von sw.js bricht ab',
  'swAenderungEntscheidung: reine CACHE-Zeilen-Abweichung blockiert nie, unabhängig vom Schalter',
  '[Testfassung-legen·Rot-Beweis] swAenderungEntscheidung: OHNE Schalter bricht eine echte sw.js-Abweichung weiterhin ab',
  '[Testfassung-legen·Rot-Beweis] Gegenprobe: MIT Schalter, aber erfundener ADR, bricht es AUCH ab',
  'swAenderungEntscheidung: MIT Schalter und einer echten, sw.js nennenden ADR lässt es durch',
  '[Testfassung-legen·Rot-Beweis] ablegungZuruecknehmen nimmt ALLE fünf abgelegten Dateien zurück, nicht nur sw.js',
  'main() verdrahtet --sw-aenderung-beabsichtigt und ruft ablegungZuruecknehmen im Abbruchpfad',
  // 02.09.2026 (U2-ADR-213, PBKDF2 statt Argon2id, Rebase auf 8f5bb24/v501-Wurzelauslieferung):
  // zwei neue `pruefung:`-Zeilen lösen korrekt auf echte Testtitel in
  // tests/pbkdf2-statt-argon2id.test.js auf — PROBEN-Deklarationsform von B-1 fehlt beiden.
  // Konstruktions-Form (nennen den konkreten erwarteten Zustand — kein „argon2" im Kern, die
  // Allowlist trägt mindestens zwei Einträge — statt eine Liste leer zu behaupten). Beide
  // außerhalb der Reichweite: sie rufen nur `ladeKern()` und die importierte
  // `ohneKommentareUndStrings()` auf, keine dateilokale Diskriminante. Programmatisch verifiziert
  // (`P.klassifiziereWaechter` gegen genau diese zwei Namen gefahren).
  'keine mitgelieferte Argon2/Argon2id-Fremdimplementierung im Kern',
  'KRYPTO_VERSION_ALLOWLIST trägt schon heute mehr als eine Generation',
  // U2-ADR-221 (02.09.2026, dieser Zweig, modal-eingabefelder-gestaltung): erste Klausel-Bindung
  // auf den bestehenden axe-core-Testtitel `[Konformität] axe-core WCAG 2.2 AA über alle
  // V1-Sichten` (tests/konformitaet/wcag-axe.mjs) — der Test selbst ist nicht neu, nur die erste
  // `pruefung:`-Zeile, die ihn nennt. Konstruktions- vs. Kollektor-Frage: der Test behauptet
  // `assert.equal(mitViol.length, 0, ...)` — Kollektor-Form (leere Liste), keine Konstruktion. Kein
  // dateieigener Aufrufer im Testkörper (top-level `async (t) => {...}` in einer .mjs-Datei, keine
  // benannte Diskriminante) — außerhalb der Reichweite, wie die übrigen `.mjs`-Bindungen dieser
  // Datei.
  '[Konformität] axe-core WCAG 2.2 AA über alle V1-Sichten',
  // 02.09.2026 (U2-ADR-223, Datei ist das Depot, Rebase auf origin/u2-kanon/251d04d): EINE neue
  // `pruefung:`-Zeile bindet auf einen BEREITS BESTEHENDEN Testtitel (PS10-6 in
  // tests/persistenz-status.test.js, seit U2-ADR-212), der bislang von KEINEM ADR referenziert
  // war — erst die Bindung macht ihn zu `gueltig`, und erst dadurch wird er hier überhaupt
  // geprüft (er trug nie eine PROBEN-Deklarationsform). Konstruktions-Form (nennt den konkreten
  // erwarteten Wert 'Jetzt sichern', keine Kollektor-Leerprobe).
  'PS10-6: die neue interne Beschriftung behauptet KEINE Datei — anders als saveStatusJetztSichern',
  // U2-ADR-217/218 (02.09.2026, landung-218): vier neue Wächter ohne PROBEN-
  // Deklaration, gegen `node --test tests/pruefstand-bindung.test.js` gemessen, nicht angenommen.
  'gemeinsame Bereiche haben dasselbe format-Tag',
  'W-Hüllenschicht: das echte Repo ist vollständig propagiert',
  'W-Hüllenschicht: eine Kopie weicht vom anderen Träger ab',
  'W-Hüllenschicht Gegenkontrolle: ein Stück mit nur einem Träger ist kein Fehlalarm',
  // U2-ADR-222 (02.09.2026, leeres Depot ist keine Sicherung, Cherry-Pick auf landung-218): drei
  // neue plain node:test-Proben in tests/persistenz-status.test.js (PS11-Serie), keine PROBEN-
  // Deklarationsform von B-1. Gegen `node --test tests/pruefstand-bindung.test.js` NACH dem
  // Cherry-Pick gemessen, nicht angenommen.
  'PS11-1: Anlege-Schreibversuch (istAnlegen) setzt sicherungsStand NICHT — Chromium/FSA',
  'PS11-2: Anlege-Schreibversuch setzt weiterhin KEINEN sicherungsStand — Firefox-Pfad unverändert',
  'PS11-3: ein regulärer Datei-Save (kein istAnlegen) setzt sicherungsStand unverändert',
  // U2-ADR-224 (03.09.2026, Boot-Wettlauf behoben, Cherry-Pick bb0ba23 auf u2-adr-222-auf-222/
  // aabb3d4): eine neue plain node:test-Probe in tests/e2e/u2-adr-224-boot-read-absicherung.spec.js,
  // keine PROBEN-Deklarationsform von B-1. Gegen den Testlauf NACH dem Cherry-Pick gemessen.
  'U2-ADR-224: Depot nach echtem Prozess-Neustart auffindbar (Boot-Wettlauf gegen vorDepot-Konfig-404)',
  // U2-ADR-215 (03.09.2026, Schalen-Lockstep-Wächter auf den ausgelieferten Dateisatz erweitert,
  // Rebase auf b824ec9e/U2-ADR-224): drei neue `pruefung:`-Zeilen aus den zwei `konformitaet`-
  // Blöcken des ADR lösen alle korrekt auf echte Testtitel in
  // tests/schalen-lockstep-anlass.test.js auf (zwei im ersten Block, eine im zweiten). Gegen den
  // echten Lauf NACH dem vollständigen Rebase gemessen.
  '[Schale·Positivkontrolle] nur vivodepot-lesen.html geändert, SCHALEN_STAND unbewegt → ROT',
  '[Schale·Positivkontrolle] nur sw.js außerhalb der CACHE-Zeile geändert, SCHALEN_STAND unbewegt → ROT',
  '[Schale·Negativkontrolle] die Zirkel-Probe — NUR beide Stempelzeilen gehoben, sonst nichts geändert',
  // U2-ADR-225 (03.09.2026): zwei neue, von der ADR selbst referenzierte Klausel-Bindungen,
  // keine PROBEN-Deklarationsform von B-1. Gegen den Testlauf NACH dem Bau gemessen.
  '[Tmp-Eindeutigkeit·Positivkontrolle] feste Zeichenkette in os.tmpdir() wird gefunden',
  '[Tmp-Eindeutigkeit·Negativkontrolle] zurückgestellte Formen und benannte Ausnahme bleiben grün',
  // U2-ADR-226 (03.09.2026, dieser Zweig): vier neue, von der eigenen ADR referenzierte
  // Klausel-Bindungen — drei neue Proben (Klasse A/B/Gegenprobe) plus der bereits bestehende
  // „gegen den echten Bestand"-Test, jetzt erstmals von einer `pruefung:`-Zeile referenziert.
  // Keine PROBEN-Deklarationsform von B-1. Gegen den Testlauf NACH dem Bau gemessen.
  '[Konformitäts-Wächter·226 Klasse A] ein Anker, der auf ZWEI Testtitel passt, ist ROT — mehrdeutig, nicht nur „nicht gefunden" (kurzzeitig zwei kollidierende Titel im Repo angelegt, danach entfernt)',
  '[Konformitäts-Wächter·226 Klasse B] ZWEITE pruefung-Zeile eines Blocks, die auf nichts passt, ist ROT — vor U2-ADR-226 unsichtbar',
  '[Konformitäts-Wächter·226 Gegenprobe] MEHRERE pruefung-Zeilen, die alle einzeln korrekt auflösen, bleiben GRÜN — Mehrfachbindung ist der Normalfall, kein Fund',
  '[Konformitäts-Wächter] gegen den echten Bestand: die vier Zahlen sind plausibel',
  // U2-ADR-220 (03.09.2026, dieser Zweig): drei neue plain node:test-Proben in
  // tests/persistenz-status.test.js (PS12-Serie — umnummeriert von PS11 beim Aufgreifen, PS11 war
  // durch U2-ADR-222 bereits vergeben), keine PROBEN-Deklarationsform von B-1. Gegen den Testlauf
  // NACH dem Rebase auf origin/u2-kanon/1d05f70e gemessen.
  'PS12-1: dateiNameHinweis trägt den neuen, ehrlichen Wortlaut',
  'PS12-2: dateiNameHinweis verspricht NICHT mehr, dieselbe Datei zu ersetzen',
  'PS12-3: _dateiNameErfragen() ist weiterhin ausschließlich über den Nicht-FSA-Zweig erreichbar — keine verdeckte zweite Route',
  // U2-ADR-219 (03.09.2026, Nachbau dieser Zweig): drei `pruefung:`-Zeilen binden erstmals auf
  // drei BEREITS BESTEHENDE Proben (kein neuer Testcode) — PS4-4/PS4-6 in
  // tests/persistenz-status.test.js, [Block5] in tests/wahrhaftigkeit-fristen.test.js. Keine
  // PROBEN-Deklarationsform von B-1. Gegen den Testlauf NACH dem eigenen Bau gemessen.
  'PS4-4: iOS nicht installiert + Risiko → Install-Hinweis fällig, dann einmal pro Sitzung',
  'PS4-6: installierte Home-Bildschirm-App → kein Risiko, kein Install-Hinweis',
  '[Block5] das echte Produkt trägt keine unklassifizierte Aussage (Grundlinie aktuell)',
  // U2-ADR-227 (03.09.2026, Signierungs-Automatisierung Zug 1, u2-kanon-Seite): zwei
  // `pruefung:`-Zeilen. Die erste bindet auf eine BEREITS BESTEHENDE Probe (U2-ADR-218 band sie
  // schon, aber mit dem alten, präfixlosen Anker-Text — dieser Wächter zählt Anker-Strings, nicht
  // aufgelöste Titel, darum ist der volle `[Klasse-A]`-Titel hier ein NEUER Name für denselben
  // Test, kein neuer Test). Die zweite bindet auf eine wirklich neue Probe (Rot-Beweis für
  // _signJWS-Drift). Keine PROBEN-Deklarationsform von B-1.
  '[Klasse-A] W-Hüllenschicht: das echte Repo ist vollständig propagiert',
  '[Negativprobe][Klasse-A] W-Hüllenschicht: _signJWS-Drift zwischen zwei Trägern wird erkannt',
  // U2-ADR-228 (03.09.2026, dieser Zweig, VOR dem Rebase auf U2-ADR-227 gemessen): sechs neue
  // plain node:test-Proben in tests/suite-dateien-kern.test.js — NEUER Testcode, aber ebenso
  // keine PROBEN-Deklarationsform von B-1.
  '[Suite-Dateien] eine committete .test.js-Datei wird gefunden',
  '[Suite-Dateien] eine NUR gestagte (nicht committete) .test.js-Datei wird ebenfalls gefunden — `git ls-files` sieht den Index, nicht erst HEAD',
  '[Suite-Dateien] eine ungetrackte .test.js-Datei bleibt draußen — der Rot-Beweis für U2-ADR-228',
  '[Suite-Dateien] eine committete Datei ohne .test.-Suffix wird NICHT mitgezählt (z. B. Hilfsmodule wie tests/load-kern.js)',
  '[Suite-Dateien] .test.cjs und .test.mjs werden ebenfalls erfasst, .test.txt nicht',
  '[Positivkontrolle] gegen den echten Bestand: alle 8 bekannten ARBEITSLISTE-Testdateien bleiben draußen, mindestens 700 echte Testdateien bleiben drin',
  // REBASE-MERGE auf 7bf135d1 (03.09.2026): beide Listen oben additiv vereinigt — disjunkte
  // Namen, kein Namenskonflikt zwischen den beiden Zweigen.
  // U2-ADR-229 (03.09.2026, v1-Dokumente-Audit, u2-kanon-Seite): zwei `pruefung:`-Zeilen, beide
  // binden auf wirklich neue Proben (Positivkontrolle des Ist-Zustands + Rotmachbarkeit). Keine
  // PROBEN-Deklarationsform von B-1.
  '[Dateiprüfsumme] echte vivodepot.html + echte vivodepot.html.sha256: keine Drift (Positivkontrolle des Ist-Zustands)',
  '[Dateiprüfsumme] Rotmachbarkeit — ein geändertes Byte in der Kopie lässt --check mit Exit 1 abbrechen',
  // U2-ADR-235 (03.09.2026, u2-kanon-Seite): zwei `pruefung:`-Zeilen, beide
  // binden auf einen konkreten Testtitel per Pfad#Name (Konstruktions-Form, s. STAND unten).
  // Keine eigene PROBEN-Deklarationsform von B-1 — dieselbe, bereits akzeptierte Lage wie bei
  // U2-ADR-229 oben.
  'eigenständige Depot-Datei lässt sich einhängen',
  'schreibt beim Re-Encrypt wieder V4 zurueck',
  // U2-ADR-230 (03.09.2026, dieser Zweig): zwei neue Proben (PBKDF2_ITERATIONS-Pin, Empfängerkreise-
  // Fächer-Konsistenz) — keine PROBEN-Deklarationsform von B-1. Dazu EIN vorbestehender Wächter
  // (`tests/krypto-block-propagation.test.js`), zum ersten Mal von einer ADR-Klausel referenziert
  // (U2-ADR-230s dritter Konformitäts-Block) — dadurch zum ersten Mal in der Grundmenge `gueltig`,
  // trug aber auch vorher schon keine PROBEN-Deklarationsform.
  '[Fach·Wächter] kdf.iterationen ist unter v3 in jedem Eintrag die eingefrorene Konstante',
  '[PBKDF2·Wächter] PBKDF2_ITERATIONS bleibt der eingefrorene v3-Wert',
  '[Klasse-A] W-krypto-propagation: das echte Repo ist vollständig propagiert',
  // REBASE-MERGE auf 9a9926d1 (03.09.2026): beide Listen oben additiv vereinigt — disjunkte
  // Namen, kein Namenskonflikt zwischen den beiden Zweigen.
  // U2-ADR-241 (03.09.2026, „Verlustwege", dieser Zweig, Rebase auf 283727e1): drei
  // `pruefung:`-Zeilen, alle binden auf einen konkreten Testtitel per Pfad#Name (Konstruktions-
  // Form, s. STAND unten). Keine eigene PROBEN-Deklarationsform von B-1 — dieselbe, bereits
  // akzeptierte Lage wie bei U2-ADR-229/-230/-235 oben.
  '[Verlustwege·Zug2] fim-json und xoev-verwaltung tragen dieselbe Topf-B-Menge (eine Mapping-Tabelle, eine Lücke)',
  '[Verlustwege·Zug2·Rot-Beweis] fim-json: „Das wird herausgegeben" zeigt ein Topf-B-Feld jetzt als nicht abbildbar',
  '[Verlustwege·Zug2] der Export selbst ist unverändert — krypto war vorher schon nicht dabei, ist es weiterhin nicht',
  // U2-ADR-232 (03.09.2026, eines verwaisten Commits, Cherry-Pick auf
  // origin/u2-kanon): drei `pruefung:`-Zeilen (zwei in tests/git-umgebung-pflicht.test.js,
  // eine in tests/build-datum-lockstep.test.js) — Konstruktions-/Kollektor-Form, aber keine
  // eigene PROBEN-Deklarationsform von B-1.
  '[U2-ADR-232] der echte Bestand ist gruen — jede Risiko-Aufrufstelle ausserhalb der Grundlinie streift GIT_* ab',
  '[U2-ADR-232·Rot-Beweis] ein git-Aufruf mit veraenderlichem cwd und OHNE env-Option wird gefunden',
  '[Lockstep·U2-ADR-232] bereichsBefund(wo) bleibt unter simuliertem GIT_DIR bei der Fixture, nicht beim echten Repo',
  // U2-ADR-245 (04.09.2026): drei `pruefung:`-Zeilen — zwei binden auf
  // brandneue Proben in tests/siebtes-register-logikmodul.test.js (die Sensibel-Schranke),
  // die dritte auf eine bereits bestehende Probe in tests/vorlagen-sprache-interpreter.test.js,
  // die vorher keine ADR-Bindung trug. Keine PROBEN-Deklarationsform von B-1.
  '[logikModulPruefen·Rot-Beweis] ein sensibles Feld OHNE sensibelErlaubt wird abgewiesen',
  '[logikModulPruefen·Rot-Beweis] dieselbe Erbschein-Fixture OHNE das Flag waere abgewiesen (belegt, dass das Flag traegt, nicht nur mitlaeuft)',
  '[Daten] das volle Erbschein-Schema, gegen dasselbe Depot wie der bestehende Bestandstest, liefert dieselben Werte wie _erbscheinSektorDaten()',
  // U2-ADR-244 (04.09.2026, REBASE-MERGE auf 9b6d5347, dieser Zweig): drei neue `pruefung:`-Zeilen in
  // der eigenen ADR-Datei — alle drei Konstruktions-Form (konkrete Werte per
  // assert.equal/assert.notEqual), keine PROBEN-Deklaration in eigenem Recht.
  // Nachtrag (Fund, 12.09.2026): die Gegenprobe umgebaut (echte gescheiterte Funktionsprobe
  // statt file://-Herkunft als Ursache, s. ADR-Datei) — Titel entsprechend geändert, dieselbe
  // Konstruktions-Form. Ein vierter `pruefung:`-Verweis kam dazu (der neue Rot-Beweis, „die Zeile,
  // die es nie gab") — gleiche Form, gleiche Begründung.
  '[U2-ADR-244·Gegenprobe] Fallback-Fall (kein interner Speicher möglich, ECHT geprüft) fragt weiterhin ein Dateiziel',
  '[U2-ADR-244·Rot-Beweis, neu] file:// MIT bestandener Funktionsprobe liefert internerSpeicherModus()===true — die Zeile, die es vor diesem Auftrag nie gab',
  'anlegen OHNE Speicherort, befüllen, schließen, öffnen — Daten da',
  'anlegenSpeicherHinweis(): Risiko-Fassung, wenn erhoehtesVerlustRisiko() true ist',
  // U2-ADR-248 (04.09.2026, eigener Zweig ab a84e8319): drei `pruefung:`-Zeilen
  // — eine bindet auf eine bereits bestehende Probe in tests/erbschein-modul-mechanik.test.js
  // (vorher keine ADR-Bindung), eine auf die bereits gelistete Äquivalenzprobe oben (U2-ADR-245),
  // die dritte auf eine bereits bestehende Probe in tests/e2e/erbschein-vorbereitungsauszug-
  // abnahme.spec.js (vorher keine ADR-Bindung). Beide Konstruktions-Form (konkrete Werte per
  // assert.deepEqual/toContainText), keine PROBEN-Deklarationsform von B-1.
  '[Erbschein-Daten] volles Depot: jedes Feld liest den echten Depot-Wert',
  'volles Depot: Testament, Familienstand und Kind erscheinen im Auszug in Klartext',
  // U2-ADR-249 (04.09.2026, „Sperrposten 1 — .vdkey-Allowlist"): vier `pruefung:`-
  // Zeilen binden auf vier neue Testtitel (drei in tests/vc-issuer-schluessel-schutz.test.js, einer
  // in tests/krypto-block-propagation.test.js); eine fünfte bindet erstmals auf einen bereits
  // bestehenden Titel in tests/schluessel-teilen-werkzeug.test.js, der zuvor von keiner ADR
  // referenziert war. Keine eigene PROBEN-Deklarationsform von B-1 — dieselbe, bereits akzeptierte
  // Lage wie bei U2-ADR-229/-230/-235/-241 oben.
  '[U2-ADR-249] eine unbekannte Fassung ist keine erkannte geschützte Datei — unbekannt heißt abweisen, nicht durchwinken',
  '[U2-ADR-249 · Rot-Beweis] eine Hülle mit unbekannter Fassung wird mit einer Meldung abgewiesen, die die Fassung nennt',
  '[U2-ADR-249 · Gegenprobe] Fassung 1 bleibt unverändert entsperrbar (die Allowlist verengt nichts, was heute gilt)',
  '[Negativprobe][Klasse-A] W-Hüllenschicht: istGeschuetzteSchluesseldatei-Drift zwischen zwei Trägern wird erkannt',
  '[Eingang] jede Ablehnung sagt, WAS falsch ist — und die geschützte Datei bekommt einen Weg',
  // 04.09.2026, U2-ADR-266: der ADR-Beleg bindet auf den vollen, exakten Testtitel (erste-Runde-
  // Match greift), trägt aber keine eigene PROBEN-Deklarationsform von B-1 — dieselbe, bereits
  // akzeptierte Lage wie bei U2-ADR-249 oben.
  'WE-B9: der Verschlüsselungs-Hinweis ist in dasselbe Modal verdrahtet wie der Rückweg-Hinweis (ein Aufruf, zwei Absätze)',
  // U2-ADR-262 (04.09.2026, „Handkopien von Kern-Konstanten bekommen einen
  // Wächter", eigener Zweig ab 8292b457, REBASE auf 39372460): dreizehn neue `pruefung:`-Zeilen
  // binden auf dreizehn neue Testtitel in tests/handkopien-gegen-original.test.js — keine eigene
  // PROBEN-Deklarationsform von B-1, dieselbe Lage wie bei U2-ADR-229/-230/-235/-241/-249/-266
  // oben.
  '[U2-ADR-262] jede geführte Handkopie stimmt mit ihrem Original überein',
  '[U2-ADR-262 · Gegenprobe] `schreiber` ist eine benannte, keine stille Ausnahme',
  '[Negativprobe] art: liste — ein fehlender Schlüssel in der Kopie wird benannt gefunden',
  '[Negativprobe] art: liste — ein zusätzlicher Schlüssel NUR in der Kopie wird benannt gefunden',
  '[Negativprobe] art: liste — eine benannte Ausnahme feuert nicht rot',
  '[Negativprobe] art: wert — ein abweichender Primitivwert wird benannt gefunden',
  '[Negativprobe] art: objekt — ein abweichender Schlüsselwert wird benannt gefunden',
  '[Negativprobe] art: objekt — ein fehlender Schlüssel in der Kopie wird benannt gefunden',
  '[Negativprobe] art: objekt — RegExp-Werte werden über ihre Textform verglichen',
  '[Negativprobe] art: liste-von-objekten — fehlende Einträge werden benannt gefunden',
  '[Negativprobe] art: werte-aus-objekt — ein fehlender Wert wird benannt gefunden',
  '[Negativprobe] eine nicht von git geführte Datei wird benannt übersprungen, nicht stumm ignoriert',
  '[Negativprobe] ein fehlendes Original wird benannt gefunden, nicht als leere Kopie gedeutet',
  // U2-ADR-275 (05.09.2026, dieser Zweig): EIN echt neuer Name, kein Sichtbarwerden. Die vier
  // Sektor-Geschwistertests in derselben Datei (BEREICH_IDS_EINGEBAUT/SITUATION_IDS_EINGEBAUT/
  // WIZARD_IDS_EINGEBAUT/EREIGNIS_ACHSE_TRIPEL_EINGEBAUT) sind weiterhin von KEINER ADR
  // referenziert und tauchen darum weiterhin NICHT in der Grundmenge auf — geprüft, nicht
  // angenommen (gemessen: genau dieser eine Name ist neu, keine fünf). Für DIESEN einen Namen
  // wurde eine echte PROBEN-Deklaration erwogen und verworfen: die Klausel vergleicht
  // `V.INSTITUTION_ART_EINGEBAUT` direkt gegen ein eingefrorenes Array-Literal und gegen
  // `Object.values(V.INSTITUTION_ART)` — es gibt keine separate, dateieigene Entscheidungs-
  // funktion, die als `diskriminante` benennbar wäre (kein Aufruf, nur ein Wertevergleich).
  // Dieselbe Bauart wie die vier oben genannten Geschwister, die aus demselben Grund nie eine
  // PROBEN-Deklaration hätten tragen können.
  '[Entkopplung·U2-ADR-275] INSTITUTION_ART_EINGEBAUT trägt exakt die zwölf nativen Institutions-Kennungen, in Datei-Reihenfolge',
  // U2-ADR-274 (05.09.2026, dieser Zweig, Commit 2): erste `pruefung:`-Zeile auf
  // tests/paket5-institutionsart-teilauszug-beweis.test.js. Referenziert zwar eine dateieigene
  // Funktion (`artOptionen`), aber ein trivialer Ein-Zeilen-Zugriff, keine Entscheidungslogik —
  // die eigentlich geprüfte Logik (Registrierungspfad, `_institutionsArtenAusDepotAnmelden`)
  // liegt in vivodepot.html, nicht dateieigen. `diskriminante: artOptionen` wäre technisch
  // möglich, aber irreführend: ihre Mutation prüfte nur den Zugriff, nicht den
  // Registrierungspfad, den der Test tatsächlich beweisen soll. Erwogen und verworfen.
  '[Paket5·institutionsArt·Beweis] Dropdown-Optionsliste ist byte-identisch, ob nativ oder vollständig moduliert',
  // U2-ADR-263 (05.09.2026, REBASE-MERGE auf 39372460, PDF-Schriftdeckung): drei `pruefung:`-
  // Zeilen binden auf drei neue Testtitel (zwei in tests/adr-263-pdf-schriftdeckung.test.js, einer
  // in tests/e2e/u2-adr-263-pdf-schriftdeckung.spec.js) — alle drei Konstruktions-Form (konkrete
  // Werte per assert.deepEqual/toHaveText/toContainText), keine PROBEN-Deklarationsform von B-1.
  // REBASE-MERGE auf e097a5da (05.09.2026): U2-ADR-262 (Kanon-Seite, dreizehn Zeilen) und dieser
  // Zweig (U2-ADR-263, drei Zeilen) fügen disjunkte, unabhängige Testtitel an dieselbe Liste an —
  // keine Zahlenrechnung nötig, nur Vereinigung beider Ergänzungen. REBASE-MERGE auf a93df2a1
  // (05.09.2026): dieselbe Lage — U2-ADR-275 (Kanon-Seite, ein Name) und dieser Zweig (U2-ADR-263,
  // drei Namen) fügen wieder nur disjunkte Testtitel an, keine Zahlenrechnung nötig. REBASE-MERGE
  // auf 5e374af4 (05.09.2026, ueber 1cfd9425): dieselbe Lage nochmal — U2-ADR-274 (Kanon-Seite,
  // ein Name) und dieser Zweig (drei Namen) fügen weiterhin nur disjunkte Testtitel an.
  // 13.09.2026 (U2-ADR-263-Nachtrag, PDF-CI): der Rot-Beweis-Titel ist gealtert (Inter
  // eingebettet, der Polnisch-Befund ist geschlossen) und wurde umbenannt+umgedreht — 1:1-Tausch,
  // kein Zuwachs (s. STAND.ohneDeklaration/fundstellen daneben).
  '[U2-ADR-263·Nachtrag] Polnisch — żółć wird jetzt vollständig getragen (Befund wörtlich: żółć → |óB, war bis 13.09.2026 offen)',
  '[U2-ADR-263] Regression: das vollständige cp1252-Typografie-Sonderzeichen-Set wird getragen (nicht nur die Latein-Erweiterung)',
  '[U2-ADR-263·Ende-zu-Ende] chinesischer Text im Namen: Gesamt-PDF wird NICHT erzeugt, Warnung erscheint',
  // 05.09.2026, U2-ADR-289 (dieser Zweig): elf neue, disjunkte Testtitel — keiner trägt eine
  // B-1-PROBEN-Deklaration.
  '[Pro-Modul-Vorlage] das reale deutsche Anbieter-Formular besteht die Stammdaten-Prüfung bis auf die bewusst offenen Kontakt-Platzhalter',
  '[Pro-Modul-Vorlage] das reale englische Anbieter-Formular besteht die Stammdaten-Prüfung bis auf die bewusst offenen Kontakt-Platzhalter',
  '[Pro-Modul-Vorlage·Gegenprobe] Pros EIGENER Bereichs-Bezeichner besteht die Anbieter-Stammdaten-Prüfung NICHT — genau der historische Fehler, namentlich festgehalten',
  // 16.09.2026, Nachtrag U2-ADR-289: die Gegenprobe ist zum positiven Beweis umgedreht (1:1-Tausch).
  '[Pro-Modul-Vorlage] tools/vorlage-erzeugen.js trägt Pros echte 54 Felder — Pro-Bereiche sind benannte Feld-Ziele (U2-ADR-289, Entscheidung 2)',
  '[Vorlage-Vivodepot-Erzeugen] die echten 54 deutschen Pro-Felder ergeben ein gültiges, signiertes Vorlage-Bündel',
  '[Vorlage-Vivodepot-Erzeugen] die echten 54 englischen Pro-Felder ergeben ein gültiges, signiertes Vorlage-Bündel',
  '[Vorlage-Vivodepot-Erzeugen·CLI·Rot-Beweis] die echte Kommandozeile nimmt BEIDE Passphrasen von gepipetem stdin an',
  '[Vorlage-Vivodepot-Erzeugen·Gegenprobe] eine verfälschte Vorlagen-Signatur verifiziert NICHT mehr gegen den genannten Public-Key',
  '[Vorlage-Vivodepot-Erzeugen·Rot-Beweis] eine leere Feldliste bricht ab, ohne etwas zu schreiben',
  '[Vorlage-Vivodepot-Erzeugen·Rot-Beweis] fehlende Pflichtparameter brechen mit klarer Meldung ab, ohne etwas zu schreiben',
  '[Vorlage-Vivodepot-Erzeugen·Wiederverwendung] ein zweiter Lauf mit demselben Herausgeber-Schlüssel stellt KEIN neues Kundenzertifikat aus',
  // 05.09.2026, U2-ADR-296 (anderer Worktree/Auftrag als ADR-289): acht neue, disjunkte
  // Testtitel — keiner trägt eine B-1-PROBEN-Deklaration.
  '[U2-ADR-296] VIVODEPOT_BRANDING besteht die echte brandingModulPruefen-Prüfung, ohne Verwurf',
  '[U2-ADR-296] _bereichFremdeMarkeHerkunft liefert die herkunft für einen angedockten, null für einen eingebauten Sektor',
  '[U2-ADR-296] die Fremdmarke-Fixture besteht dieselbe Prüfung ebenso',
  '[U2-ADR-296] ein Sektor aus einem fremden Marken-Modul trägt die Klasse marke-fremd',
  '[U2-ADR-296·Gegenkontrolle] brandingAnwenden setzt für beide Marken sichtbar unterschiedliche CSS-Werte, nie dieselben',
  '[U2-ADR-296·Gegenprobe] beide Marken unterscheiden sich in JEDEM Feld — kein Feld bleibt zufällig gleich',
  '[U2-ADR-296·Gegenprobe] ein eingebauter Sektor (identitaet) trägt marke-fremd NIE',
  'ein Branding-Modul ändert die sichtbare Basis-Schriftart (body, getComputedStyle)',
  // 05.09.2026, U2-ADR-297 (frisch auf bacfc94e/v569 verzweigt): elf neue, disjunkte
  // Testtitel — keiner trägt eine B-1-PROBEN-Deklaration.
  '[U2-ADR-297·Rot-Beweis] _brandingProduktTopbarAnwenden hat GENAU EINEN Aufrufort im Kern (die Vor-Depot-Konfiguration) — der In-Depot-Andockpfad ruft sie nie',
  '[U2-ADR-297] _brandingTopbarKontrastText wählt Weiß für ein dunkles Institutions-Rot (Fixture, kein echtes Institutions-Logo)',
  '[U2-ADR-297] _brandingTopbarKontrastText wählt Dunkel für ein helles Institutions-Grau',
  '[U2-ADR-297·Gegenprobe] _brandingTopbarKontrastText weist ein Mittelgrau zurück, das gegen BEIDE Kandidaten unter 4.5:1 bleibt',
  '[U2-ADR-297·Gegenprobe] eine Institutionsfarbe, die das Kontrast-Gate reißt, wird abgewiesen — die Kopfzeile bleibt beim Fallback, nicht bei einer unlesbaren Farbe',
  '[U2-ADR-297·VDK-Integration] ein Vor-Depot-Bündel mit kontrastschwacher Farbe lässt die Kopfzeile beim Fallback, obwohl Schrift/Name trotzdem wirken',
  '[U2-ADR-297·Gegenkontrolle] das bestehende, geteilte brandingAnwenden (Fall 1, In-Depot-Pfad) setzt NIE die Topbar-Variablen — zwei getrennte Bedeutungsträger',
  '[U2-ADR-297·VDK-Integration] ein eingelassenes Vor-Depot-Branding-Bündel füllt nach vorDepotKonfigurationAnwenden auch die Kopfzeile',
  '[U2-ADR-297·VDK-Integration·Rot-Beweis] ein UNSIGNIERTES Branding-Bündel füllt auch die Kopfzeile NICHT (branding ist nurGeprueft)',
  'ein Vor-Depot-Branding-Modul füllt die Kopfzeile sichtbar mit der Institutionsfarbe (rgb, nicht der Salbei-Fallback)',
  'eine kontrastschwache Institutionsfarbe füllt die Kopfzeile NICHT — der Salbei-Fallback bleibt sichtbar bestehen',
  // 05.09.2026, U2-ADR-308 (frisch auf origin/u2-kanon 2b142910/v572 verzweigt): fünfzehn neue,
  // disjunkte Testtitel — keiner trägt eine B-1-PROBEN-Deklaration.
  '[ADR-308] buergermodulSituationErsetzen ist exportiert',
  '[ADR-308] "als waere nichts gewesen" — renderSituation(„geburt") ist byte-identisch, nachdem der native Bestand durch denselben Bestand via Ladeweg ersetzt wurde',
  '[ADR-308·ROT-BEWEIS] ein vom Modul weggelassenes eigenes Feld fehlt wirklich im gerenderten HTML — und nur dieses',
  '[ADR-308·Identität·ROT] eine Alt-Eigenschaft ohne Modul-Entsprechung verschwindet — Überschreiben allein reicht nicht',
  '[ADR-308·Identität] das Feld-Objekt selbst bleibt dieselbe Referenz — kein Neubau',
  '[ADR-308·Identität] ein Options-Objekt bleibt dieselbe Referenz — auch über eine gefilterte Kopie des Arrays hinweg',
  '[ADR-308·Sicherheit] ein Modul, das ein FREMDES natives Feld behauptet, bekommt es nicht — die Erlaubnis kommt aus dem Geruest, nie aus dem Modul',
  '[ADR-308·Sicherheit·Gegenkontrolle] eine reservierte Situations-ID wird ueber den SIGNIERTEN Weg weiterhin mit reserviert abgewiesen — die Erste-Partei-Zone oeffnet den Einlassweg nicht',
  '[ADR-308] unbekannte Situation wird benannt, nicht stillschweigend uebergangen',
  '[ADR-308] _erstePartieErlaubteIdsFuerSituation deckt nur eigene Felder, nicht Verweis-Eintraege — exakt den nativen Bestand',
  '[ADR-308·Grenze·ROT-BEWEIS] todesfall-uebernahme: der Ladeweg wirft nicht, verliert aber den bedingten KI-Block — benannt, nicht geloest',
  '[ADR-308·E2] alle neun regulaeren nativen Situationen: byte-identisches Rendering, null Verwerfungen',
  '[ADR-308·E2·ROT-BEWEIS] die Sonde selbst findet einen echten Unterschied — sonst prueft die Sammelprobe nichts',
  '[ADR-308·Verdrahtung] buergermodulBuendelAnwenden wendet ein Buendel mit situationen-Schluessel an, unabhaengig von bereiche',
  '[ADR-308·Verdrahtung·Rot-Beweis] eine unbekannte Situation im Buendel wird uebersprungen, nicht als Fehler behandelt',
  '[Zone·RATSCHE·Situation] erstePartieBloeckeEintraegePruefen wird ausschliesslich von buergermodulSituationErsetzen gerufen',
  '[Zone·RATSCHE·Situation·Ladeweg] buergermodulSituationErsetzen hat GENAU ZWEI Aufrufer im Kern — beide benannt',
  // 06.09.2026, U2-ADR-306: zwölf neue, disjunkte Testtitel — keiner trägt eine
  // B-1-PROBEN-Deklaration. Zwölf der vierzehn `pruefung:`-Zeilen dieser Landung zeigen auf
  // diese zwölf Titel; die übrigen zwei Zeilen sind die B-1-Sanity-Probe (nicht per `pruefung:`
  // zitiert) und die absichtlich unlesbare Grundlinien-Zeile (s. UNLESBAR_ERLAUBT). ECHT gegen
  // P.waechterOhneProbe() nachgemessen, nicht angenommen.
  '[U2-ADR-306] wizardsSchritteSammeln verliert KEINE Schritt-Eigenschaft — geprüft gegen den ECHTEN Schritt, nicht gegen eine Namensliste',
  '[U2-ADR-306] "als waere nichts gewesen" — gebwiz: jeder sichtbare Schritt ist byte-identisch, nachdem der native Bestand durch denselben Bestand via Ladeweg ersetzt wurde',
  '[U2-ADR-306·E2] alle sieben nativen Wizards: byte-identischer erster Schritt, null Verwerfungen',
  '[U2-ADR-306·E2·ROT-BEWEIS] die Sonde selbst findet einen echten Unterschied — sonst prueft die Sammelprobe nichts',
  '[U2-ADR-306·Identität·ROT] sensibel:true verschwindet, wenn das Modul es nicht mehr trägt — Überschreiben allein reicht nicht',
  '[U2-ADR-306·Identität·ROT] codeListe verschwindet, wenn das Modul es nicht mehr trägt (anamwiz.krankheiten, echtes Beispiel)',
  '[U2-ADR-306·Identität] das Feld-Objekt selbst bleibt dieselbe Referenz — kein Neubau',
  '[U2-ADR-306·Identität] ein Options-Objekt bleibt dieselbe Referenz — auch über eine gefilterte Kopie des Arrays hinweg',
  '[U2-ADR-306·Sicherheit] ein Modul, das ein FREMDES natives Feld (aus einem ANDEREN Wizard) behauptet, bekommt es nicht — die Erlaubnis kommt aus dem Geruest, nie aus dem Modul',
  '[U2-ADR-306·Sicherheit] ein Schritt ohne frage wird strukturell abgelehnt — ein Schritt ohne Frage ist fuer den Assistenten kein Schritt',
  '[U2-ADR-306·Sicherheit·Gegenkontrolle] eine reservierte Wizard-ID wird ueber den SIGNIERTEN Weg weiterhin mit reserviert abgewiesen — die Erste-Partei-Zone oeffnet den Einlassweg nicht',
  '[U2-ADR-306] _erstePartieErlaubteIdsFuerWizard deckt exakt den nativen Bestand dieses EINEN Wizards',
  // 07.09.2026 (U2-ADR-346 §12, dieser Zweig): drei neue `pruefung:`-Zeilen im ADR-Konformitäts-
  // block, alle Konstruktions-Form — jede prüft einen `assert.throws`/`assert.doesNotThrow` auf
  // `buergermodulBuendelAnwenden` direkt (den konkreten Wurf bzw. dessen Ausbleiben), kein
  // Kollektor dahinter, an den eine Diskriminante binden könnte. Der NAME hier ist die
  // `#Name`-Hälfte der `pruefung:`-Zeile (klassifiziere() nimmt `m[2].trim()`), NICHT der volle
  // `test('[…] …')`-Titel — beide unterscheiden sich hier durch das führende „[U2-ADR-346 · …] ".
  '`wizards.pvwiz` im Bündel wirft wirklich, statt nur eine Zusicherung zu behaupten',
  '`wizards.kiwiz` im Bündel wirft wirklich, statt nur eine Zusicherung zu behaupten',
  'eine ERLAUBTE Wizard-Id im selben Bündel-Zweig wirft NICHT — der Riegel trifft gezielt, nicht pauschal',
  // 07.09.2026, U2-ADR-344 §10 (/`0a`-Nachtrag): zwei der drei neuen `pruefung:`-Zeilen
  // — die Diskriminante `nativesSkelettErheben` lässt sich nicht sinnvoll an beide binden: der
  // Aufruf-Nachweis ersetzt ihren Rumpf durch eine erzwungene Rückgabe, aber ein Rot-Beweis
  // ERWARTET ohnehin einen Fehlschlag (assert.throws) — die erzwungene Verletzung sähe wie der
  // beabsichtigte Fund aus und bliebe grün, ohne etwas zu belegen. Die dritte Zeile (Hauptwächter)
  // trägt die PROBEN-Deklaration regulär.
  'Natives-Skelett·Rot-Beweis Struktur',
  'Natives-Skelett·Rot-Beweis Wert',
  // 16.09.2026, U2-ADR-400-Nachtrag (Yellow-Button-Zeichen an der Funktion): sieben neue
  // `pruefung:`-Zeilen auf sieben neue Testtitel in tests/yb-zeichen-an-der-funktion.test.js.
  // Keiner trägt die PROBEN-Deklarationsform von B-1 — sie prüfen erzeugtes Modal-HTML gegen
  // konkrete data-yb-zeichen-Werte (Konstruktions-Form), die Rot-Beweise liegen als eigene Titel daneben.
  '[YB-Zeichen] Herunterladen und Teilen eines autoritativen Originals tragen das Zeichen',
  '[YB-Zeichen] bei White Label (angedocktes Branding-Modul) bleibt das Zeichen stehen',
  '[YB-Zeichen] der Hochladen-Dialog für Labor-/Entlassbefund zeigt das Zeichen',
  '[YB-Zeichen] der Teilen-Dialog selbst zeigt das Zeichen',
  '[YB-Zeichen] drei eingebettete Zeichen sind echte PNG-Dateien, je Funktion eines',
  '[YB-Zeichen·Rot-Beweis] ein Import außerhalb des Yellow-Button-Standards trägt KEIN Zeichen',
  '[YB-Zeichen·Rot-Beweis] ein eigenes (nicht autoritatives) Dokument trägt beim Herunterladen KEIN Zeichen',
  /* U2-ADR-NNN Generator-Schlüssel im Speicher (19.09.2026) und MIG3 (bereits bestehende Titel, hier erstmals
     durch eine ADR-Klausel zitiert): 28 Wächter-Titel ohne PROBEN-Deklarationsform. Jeder hat im selben Testfile einen
     eigenen `·Rot-Beweis`-Test (Signierwege, Schlüssel-Tresor a/b/c, Empfangs-Schlüssel, MIG3) — die Kopplung ist da, nur nicht
     in der deklarierten Form (Diskriminante als Funktion, die der Aufruf-Nachweis instrumentieren kann; die Testrümpfe sind
     async und sandbox-getrieben). Als Schuld benannt, kein Fix in diesem Zug. ECHT gegen P.waechterOhneProbe() gemessen. */
  '(b) ein von einem Skript erzeugter Klick signiert nicht, der echte danach schon',
  '(b) nichts an window, STATE oder den Namen der obersten Ebene trägt den Schlüssel',
  '(c) verworfen nach dem Signieren und beim Verlassen; danach verlangt die Seite die Schlüsseldatei',
  'GEN2: das Empfangs-Schlüsselpaar der Anfrage liegt nicht als Klartext-JWK an STATE oder window und wird bei Bestätigung verworfen',
  'GEN2b: eine Modul-Ausgabeart signiert mit dem Tresor-Schlüssel, nur auf einen echten Klick, einmal',
  '[Empfangs-Schlüssel] die echte Fassung hält: kein privates JWK in STATE, in keiner Datei, nur zwei Erzeuger, Hülle verwirft',
  '[Empfangs-Schlüssel·Klasse] der Bestand der Erzeuger: genau zwei Stellen holen einen privaten Schlüssel heraus',
  '[Empfangs-Schlüssel·Rot-Beweis] ein Klartext-JWK in STATE, eine Datei mit d und ein dritter Exporteur werden gemeldet',
  '[Empfangs-Schlüssel·Rot-Beweis] ohne Verwerfen bei Bestätigung, beim Verlassen, nach dem Zeitlimit und beim neuen Paar wird es gemeldet',
  '[MIG3] bereicheVerwaist: Lese-App = Kern — dieselbe Rettung nach sektoren, in JEDEM Bereich',
  '[MIG3·Drift] die generierte BEREICHE-VERWAISTE-RETTEN-LESEN-Region ist aus dem Kern erzeugt — kein Drift',
  '[Schlüssel-Tresor] die echte Fassung hält (a), (b) und (c)',
  '[Schlüssel-Tresor] ein mit dem gehaltenen Schlüssel signiertes Paket verifiziert gegen den Public-Key (der Weg trägt)',
  '[Schlüssel-Tresor·a] der gehaltene Schlüssel ist nicht herausholbar, das Material nur bis „weiter“',
  '[Schlüssel-Tresor·a] ein Schlüssel aus einer Datei wird sofort als nicht herausholbarer importiert',
  '[Schlüssel-Tresor·a·Rot-Beweis] ein herausholbarer Schlüssel und ein Material, das nach „weiter“ bleibt, werden gemeldet',
  '[Schlüssel-Tresor·b] die Hülle signiert nur auf einen echten frischen Klick am Knopf „Paket erzeugen“',
  '[Schlüssel-Tresor·b] nichts außerhalb der Hülle trägt den Schlüssel oder sein Material',
  '[Schlüssel-Tresor·b·Rot-Beweis] ein Griff in STATE, eine herausgegebene Fläche und ein unechter Klick werden gemeldet',
  '[Schlüssel-Tresor·c] beim Verlassen der Seite (pagehide) wird der Schlüssel verworfen',
  '[Schlüssel-Tresor·c] der Schlüssel ist nach dem Signieren fort, gleich wie es ausgeht',
  '[Schlüssel-Tresor·c] nach dem Zeitlimit wird der Schlüssel verworfen und gemeldet',
  '[Schlüssel-Tresor·c·Rot-Beweis] ohne Verwerfen nach dem Signieren, ohne pagehide, ohne Zeitlimit wird es gemeldet',
  '[Signierwege] die Bündel-Bauer signieren mit dem Tresor-Schlüssel, und die Signatur verifiziert',
  '[Signierwege] ein unechter Klick fällt bei vorhandenem Schlüssel NICHT auf „unsigniert“ zurück; ohne Schlüssel gilt der unsignierte Weg',
  '[Signierwege] jede Modul-Ausgabeart signiert mit dem Tresor-Schlüssel — auf ihren Knopf, auf keinen anderen',
  '[Signierwege] kein Signierweg der Oberfläche liest am Tresor vorbei',
  '[Signierwege·Rot-Beweis] ein gelesenes Schlüsselfeld, ein Signierer am Tresor vorbei, ein neuer Import und ein Handler ohne Tresor werden gemeldet',
  /* Gerüst-Schnitt S3 (21.09.2026): vier Klausel-Bindungen der Nachfolge-ADR zu U2-ADR-285 (tests/achse-rechtsraum-produkt.test.js).
     Konstruktions-Form (bauen ein Produkt oder einen Kern und prüfen sein Verhalten), kein Kollektor; Schuld benannt. */
  '[Rechtsraum-Achse·Erhalt] das UK-Produkt trägt nach dem Gerüst-Schnitt weiterhin DE und GB — der Schnitt hat kein Fach gekostet',
  '[Sicherheits-Rot-Beweis·belegt] ist das Gerüst-Fach DE belegt, bleibt ein DE-Modul aus der Produkt-Region wirkungslos',
  '[Sicherheits-Rot-Beweis·leer] auch bei leerem Fach wird ein fehlgeformtes DE-Produkt-Modul abgelehnt — kein Freibrief für eingebackene Regionen',
  '[Sicherheits-Rot-Beweis·leer] ist das Gerüst-Fach leer, greift ein DE-Modul über die normale Prüfung',
];

/* ── STAND: gepinnte Zahlen MIT RICHTUNG ─────────────────────────────────────
   Ein Pin trägt nur, wenn sein Nachziehen einen genannten Grund verlangt. Am 26.07.
   lief „Zahl nachziehen" dreimal als reine Handbewegung (Proben 14→15→16, dann
   16→25) — und genau so stirbt eine Prüfung: nicht durch Abschaffen, sondern
   dadurch, dass niemand mehr fragt, WARUM die Zahl sich bewegt hat.

   Darum trägt jede Zahl eine Richtung, und die Meldung sagt, welcher Art die
   Bewegung ist:
     'sinkt'  — Schuld. Steigt sie, ist das ein BEFUND und kein Nachziehen.
     'steigt' — Arbeit. Fällt sie, ist etwas verlorengegangen.
     'fest'   — Struktur. Jede Bewegung braucht eine Begründung.  */
const STAND = {
  // 94 → 107 am 05.08.2026 (ADR-Konformitäts-Wächter, Tranche 1): 13 neue `pruefung:`-Zeilen
  // lösen alle korrekt auf. (Von 15 neuen Klauseln sind 2 ohne `pruefung:` — ADR-093
  // nicht_pruefbar, ADR-077-Nachtrag abgeloest — die zählen hier nicht mit.)
  // 107 → 117 (Nachtlauf 2, Tranche 2, 05./06.08.2026): 10 neue `pruefung:`-Zeilen aus fünf
  // neuen Klauseln (ADR-043, 061, 075, 079, 081), alle lösen korrekt auf.
  // 117 → 118 (06.08.2026, A110 Stufe 2): eine neue gültige Bindung dazu.
  // 118 → 119 (09.08.2026, N2 Zug 1/5, U2-ADR-105 Stück 2): eine neue gültige Bindung
  // (tests/n2-zug1-ips-nilknown-waechter.test.js) dazu.
  // 119 → 120 (09.08.2026, N4 Zug 4, U2-ADR-126): eine neue gültige Bindung
  // (tests/w3-schema-sensibel-pruefen.test.js) dazu.
  // 120 → 121 (09.08.2026, N5 Zug 4, U2-ADR-127): eine neue gültige Bindung
  // (tests/muster-b-render-scroll-fokus.test.js) dazu.
  // 121 → 122 (09.08.2026, Sensibel-Architektur Zug 1+3, U2-ADR-128): eine neue gültige
  // Bindung (tests/sensibel-listen-unterfeld.test.js) dazu.
  // 122 → 123 (10.08.2026, F6 Zug 4, U2-ADR-130): eine neue gültige Bindung
  // (tests/migration-stufen.test.js#u2-108-jede-stufe-loest-ihre-zusage-ein) dazu.
  // 123 → 124 (10.08.2026, K8 Zug 3, U2-ADR-131): eine neue gültige Bindung
  // (tests/k8-byte-gleichheit.test.js#K8·Byte-Gleichheit) dazu.
  // 124 → 126 (30.08.2026, U2-ADR-101, zweite Klausel): zwei neue `pruefung:`-Zeilen lösen
  // beide korrekt auf (tests/adr-101-blatt3-eingebaute-sicht.test.js).
  // 126 → 130 (31.08.2026, U2-ADR-184, Sub-Depot-Klick-Freeze): vier neue `pruefung:`-Zeilen
  // lösen alle korrekt auf — drei an tests/hintergrund-wipe-frist.test.js (zwei Klauseln
  // binden an denselben Test „nach Ablauf der Frist im Hintergrund → vollständiger Wipe",
  // zählen hier als zwei ZEILEN, s. pruefstand-klassen-werden-bei-jedem-lauf-gerechnet für
  // die abweichende Zählweise nach distinkten Tests).
  // 130 → 139 (01.09.2026, U2-ADR-185): neun neue `pruefung:`-Zeilen lösen alle korrekt auf
  // einen echten Testtitel in tests/wiedereintritt-nach-wipe.test.js auf.
  // REBASE 01.09.2026 (sw-bedingtes-skipwaiting auf u2-kanon v491): dreizehn weitere
  // `pruefung:`-Zeilen aus der ursprünglich eigenständigen U2-ADR-190/197-Zählung dieses
  // Zweigs (sechs zum skipWaiting-Mechanismus, sechs zu U2-ADR-197/Aussage-Pruefung-Abgleich,
  // eine zum U2-ADR-190-Nachtrag clients.claim() — die ERSTE `@playwright/test`-gebundene
  // Klausel im Bestand, s. Begründung an der Fundstelle in OHNE_PROBEN_DEKLARATION oben) kommen
  // oben drauf. Wert NACH dem vollen Rebase real gegen den Instrumentierer-Lauf gemessen, nicht
  // hier addiert (nach dem a423-Fund: messen, nicht rechnen).
  // MESSUNG 01.09.2026 (nach Rebase auf u2-kanon v491, echter Landepunkt — Basis 80d1563 +
  // U2-ADR-187/195/196 + Fremdquellen-Register + dieser Zweig U2-ADR-190/197): 170 → 183.
  // 183 → 187 (02.09.2026, U2-ADR-206): vier neue `pruefung:`-Zeilen lösen alle korrekt auf.
  // 187 → 188 (02.09.2026, U2-ADR-202, Rebase auf u2-kanon 60328d3): eine neue `pruefung:`-Zeile
  // löst korrekt auf.
  // 188 → 191 (02.09.2026, U2-ADR-207, Rebase auf b7cdac6): drei neue `pruefung:`-Zeilen lösen
  // alle korrekt auf. Wert unten gegen den echten Lauf gemessen, nicht addiert.
  // 191 → 194 (02.09.2026, Rebase auf 8857393, U2-ADR-193 + U2-ADR-199): drei neue
  // `pruefung:`-Zeilen (zwei aus U2-ADR-193, eine aus U2-ADR-199) lösen alle korrekt auf.
  // Gegen den echten Lauf gemessen, nicht addiert.
  // 194 → 199 (02.09.2026, u2-kanon-Seite, U2-ADR-209, Auftrag, Vorrang): fünf neue
  // `pruefung:`-Zeilen lösen alle korrekt auf (drei im ersten Konformität-Block, je eine in den
  // beiden weiteren). Ursprünglich als 208 gebaut, umnummeriert.
  // 194 → 198 (02.09.2026, dieser Zweig, VOR dem zweiten Rebase, U2-ADR-208): vier neue
  // `pruefung:`-Zeilen lösen alle korrekt auf, je einen eigenen Testtitel.
  // 199/198 → 203 (02.09.2026, zweiter Rebase auf f7f6417/v498): beide Zahlen zählten denselben
  // Ausgangswert (194) plus je EIN unterschiedliches neues ADR — kein Zusammenzählen zweier
  // Endstände, sondern 194 + 5 (U2-ADR-209) + 4 (U2-ADR-208). Wert nach dem Rebase neu gegen
  // den echten Lauf gemessen, nicht aus 194+5+4 angenommen.
  // 203 → 209 (02.09.2026, Rebase auf 657f6d6, U2-ADR-211, Sicherungsstand bekannt): sechs neue
  // `pruefung:`-Zeilen lösen alle korrekt auf echte Testtitel in
  // tests/sicherungsstand-bekannt.test.js auf (je eine im ersten und zweiten Block, je zwei im
  // dritten und vierten) — auf die bereits gemergte 203er-Basis (208+209). Gegen den echten Lauf
  // NACH dem vollständigen Rebase gemessen, nicht aus 203+6 angenommen.
  // 209 → 211 (02.09.2026, U2-ADR-201, Zug 1 Betreuung, Rebase auf 39683c7/v500): zwei neue
  // `pruefung:`-Zeilen (Betreuerbestellung, betreuter Erwachsener) lösen korrekt auf
  // tests/e2e/persona-betreuung-echte-vertretungswege.spec.js auf.
  // 211 → 213 (02.09.2026, U2-ADR-201, Zug 1 Kinder, Commit 2 von zwei, Rebase auf 39683c7/v500):
  // zwei neue `pruefung:`-Zeilen (Pflegekind, Sub-Depot-Abschluss) lösen korrekt auf
  // tests/e2e/persona-kinder-sorgerecht-subdepot.spec.js auf.
  // 209 → 216 (02.09.2026, dieser Zweig, VOR dem Rebase auf f1cdb0e, U2-ADR-212, Sichern-Knopf
  // folgt Speicher-Modus): sieben neue `pruefung:`-Zeilen aus den fünf `konformitaet`-Blöcken des
  // ADR lösen alle korrekt auf echte Testtitel auf (fünf in
  // tests/persistenz-status.test.js#PS10-*, zwei in tests/e2e/u2-adr-212-sichern-intern.spec.js)
  // — auf denselben v500-Bestand (209, frisch gemessen VOR dem eigenen Bau).
  // REBASE auf f1cdb0e (02.09.2026, hat U2-ADR-201 vor diesem Zweig gelandet): 209 + 4
  // (U2-ADR-201) + 7 (U2-ADR-212), zwei disjunkte Mengen — kein Zusammenzählen zweier Endstände.
  // Zahl NACH dem vollständigen Rebase real gemessen, nicht aus 213+7 angenommen.
  // 209 → 219 (02.09.2026, Fast-Forward auf 39683c7, dieser Zweig, U2-ADR-214): zehn neue
  // `pruefung:`-Zeilen aus U2-ADR-214 selbst (der sw.js-Wächter-ADR, drei Konformitäts-Blöcke zu
  // sechs/zwei/zwei Zeilen) lösen alle korrekt auf — eine 1:1-Bindung auf die zehn neuen
  // Testtitel in tests/testfassung-legen.test.js, s. `ohneDeklaration`/`fundstellen` unten. Gegen
  // den echten Lauf gemessen (`node -e` gegen `pruefstand-bindung.js` direkt, nicht aus 10
  // `pruefung:`-Zeilen angenommen) — s. auch `unlesbar` (unverändert bei 1).
  // REBASE-MERGE auf 767fe70/v501 (02.09.2026): 219 (dieser Zweig, U2-ADR-214) und 220 (u2-kanon-
  // Seite, U2-ADR-201 + U2-ADR-212) zählten beide denselben 209er-Ausgangswert plus je eigene neue
  // Zeilen — kein Zusammenzählen zweier Endstände. 209 + 10 (U2-ADR-214) + 11 (U2-ADR-201: vier,
  // U2-ADR-212: sieben) = 230. Nach dem vollständigen Rebase real gegen `pruefstand-bindung.js`
  // gemessen, nicht aus 219+11 oder 220+10 angenommen.
  // 230 → 232 (02.09.2026, U2-ADR-213, PBKDF2 statt Argon2id, Rebase auf 8f5bb24/v501-
  // Wurzelauslieferung): zwei neue `pruefung:`-Zeilen lösen korrekt auf echte Testtitel in
  // tests/pbkdf2-statt-argon2id.test.js auf — auf die bereits gemergte 230er-Basis.
  // 230 → 231 (02.09.2026, dieser Zweig, modal-eingabefelder-gestaltung, U2-ADR-221): eine neue
  // `pruefung:`-Zeile bindet erstmals auf den bestehenden Testtitel `[Konformität] axe-core WCAG
  // 2.2 AA über alle V1-Sichten` — der Test ist nicht neu, nur die erste Klausel-Bindung darauf.
  // Gegen `pruefstand-bindung.js` gemessen, nicht angenommen.
  // REBASE-MERGE auf 1a4174f (02.09.2026): 232 (u2-kanon-Seite, U2-ADR-213) und 231 (dieser
  // Zweig, U2-ADR-221) zählten beide denselben 230er-Ausgangswert plus je eigene neue Zeilen —
  // 230 + 2 (U2-ADR-213) + 1 (U2-ADR-221) = 233. Gegen `pruefstand-bindung.js` NACH dem
  // vollständigen Rebase gemessen, nicht aus 232+1 oder 231+2 angenommen.
  // 233 → 234 (02.09.2026, U2-ADR-223, Rebase auf origin/u2-kanon/251d04d): EINE neue
  // `pruefung:`-Zeile bindet auf PS10-6 (bereits bestehender Testtitel seit U2-ADR-212, bislang
  // von keinem ADR referenziert) — auf die bereits gemergte 233er-Basis (213+221).
  // 238 → 241 (02.09.2026, U2-ADR-222, leeres Depot ist keine Sicherung, Cherry-Pick auf
  // landung-218): drei neue `pruefung:`-Zeilen binden auf PS11-1/PS11-2/PS11-3 (neue Testtitel
  // in tests/persistenz-status.test.js) — auf die bereits gemergte 238er-Basis. Gegen
  // `pruefstand-bindung.js` NACH dem Cherry-Pick gemessen, nicht aus 238+3 angenommen.
  // 241 → 242 (03.09.2026, U2-ADR-224, Boot-Wettlauf behoben, Cherry-Pick von bb0ba23 auf
  // u2-adr-222-auf-222/aabb3d4): EINE neue `pruefung:`-Zeile bindet auf U2-ADR-224. Gemessen
  // NACH dem Cherry-Pick, nicht aus 241+1 angenommen.
  // REBASE-MERGE auf b824ec9e (03.09.2026): 242 (u2-kanon-Seite, U2-ADR-224, eine Zeile) und 244
  // (dieser Zweig, U2-ADR-215, drei Zeilen) zählten beide denselben 241er-Ausgangswert — 241 + 1
  // (U2-ADR-224) + 3 (U2-ADR-215) = 245, zwei disjunkte neue Bindungen. Gegen
  // `pruefstand-bindung.js` NACH dem vollständigen Rebase gemessen, nicht aus 242+3 oder 244+1
  // angenommen.
  // 245 → 247 (03.09.2026, U2-ADR-225): zwei neue Klausel-Bindungen (Positiv-/Negativkontrolle
  // des neuen Wächters), von der ADR selbst referenziert.
  // 247 → 252 (03.09.2026, U2-ADR-226, dieser Zweig): zwei bereits gelandete Klauseln
  // (U2-ADR-102, U2-ADR-131) trugen bloße Kürzel-Anker, die mehrdeutig auf mehrere Testtitel
  // passten (elf bzw. vier) — der ADR-Konformitäts-Wächter prüfte bislang nur die erste
  // `pruefung:`-Zeile je Block und konnte das nicht sehen. Auf die tatsächlich gemeinten
  // Testtitel aufgelöst: U2-102 auf drei (+2 gegenüber der alten EINEN mehrdeutigen Bindung),
  // K8·Byte-Gleichheit auf vier (+3) — macht +5, disjunkt von U2-ADR-225 oben. Gegen
  // `pruefstand-bindung.js` NACH der eigenen Korrektur gemessen, nicht aus 247+5 angenommen.
  // 252 → 256 (03.09.2026, U2-ADR-226, dieser Zweig): vier neue `pruefung:`-Zeilen in der
  // eigenen ADR-Datei — auf die bereits gemessene 252er-Basis. Gegen `pruefstand-bindung.js`
  // NACH dem eigenen Bau gemessen, nicht aus 252+4 angenommen.
  // 256 → 252 (03.09.2026, Speicher-Modell Stück 3, dieser Zweig): U2-ADR-212 Block 2 (PS10-2 +
  // PS10-7·Rot, zwei Zeilen) und Block 4 (der alte Browser-Rot-Beweis, eine Zeile) sind
  // `abgeloest` — keine `pruefung:`-Zeile mehr, die Fallunterscheidung, die sie belegten, ist
  // zurückgebaut. Block 3 (PS10-3 + PS10-4, zwei Zeilen) zeigt jetzt auf PS10-1 (eine Zeile,
  // konsolidiert). Macht 5 weg, 1 neu hinzu = −4. Gegen `pruefstand-bindung.js` nach dem eigenen
  // Bau gemessen, nicht aus 256−4 angenommen.
  // 252 → 255 (03.09.2026, U2-ADR-220, dieser Zweig): drei neue `pruefung:`-Zeilen in der eigenen
  // ADR-Datei (zwei im ersten, eine im zweiten `konformitaet`-Block) — auf die bereits gemergte
  // 252er-Basis. Gegen `pruefstand-bindung.js` nach dem eigenen Bau gemessen, nicht aus 252+3
  // angenommen.
  // 255 → 259 (03.09.2026, U2-ADR-219, Nachbau dieser Zweig): vier neue `pruefung:`-Zeilen in der
  // eigenen ADR-Datei (eine im ersten Block, zwei im zweiten, eine im dritten). Gegen
  // `pruefstand-bindung.js` NACH dem eigenen Bau gemessen, nicht aus 255+3 angenommen.
  // 259 → 261 (03.09.2026, U2-ADR-227, Signierungs-Automatisierung Zug 1, u2-kanon-Seite): zwei
  // neue `pruefung:`-Zeilen in der eigenen ADR-Datei (je eine in zwei `konformitaet`-Blöcken).
  // 259 → 265 (03.09.2026, U2-ADR-228, dieser Zweig, VOR dem Rebase auf U2-ADR-227 gemessen):
  // sechs neue `pruefung:`-Zeilen in der eigenen ADR-Datei (drei im ersten Block, zwei im
  // zweiten, eine im dritten) — alle sechs auf brandneue Proben in
  // `tests/suite-dateien-kern.test.js`. Auf derselben 259er-Basis, unabhängig von der Zeile
  // darüber gezählt.
  // REBASE-MERGE auf 7bf135d1 (03.09.2026): 261 (u2-kanon-Seite, +2) und 265 (dieser Zweig, +6)
  // zählten beide denselben 259er-Ausgangswert — 259 + 2 + 6 = 267, zwei disjunkte
  // Bindungsgruppen. Gegen `pruefstand-bindung.js` NACH dem vollständigen Rebase gemessen, nicht
  // aus 261+6 oder 265+2 angenommen.
  // 267 → 269 (03.09.2026, U2-ADR-229, v1-Dokumente-Audit, u2-kanon-Seite): zwei neue
  // `pruefung:`-Zeilen in der eigenen ADR-Datei (je eine in zwei `konformitaet`-Blöcken). Gegen
  // `pruefstand-bindung.js` NACH dem eigenen Bau gemessen, nicht aus 267+2 angenommen.
  // 269 → 270 (03.09.2026, U2-ADR-231, u2-kanon-Seite): eine neue, gültige `pruefung:`-Zeile.
  // 270 → 272 (03.09.2026, U2-ADR-235, u2-kanon-Seite): zwei neue, gültige `pruefung:`-Zeilen im
  // eigenen `konformitaet`-Block.
  // 272 → 274 (03.09.2026, U2-ADR-237, u2-kanon-Seite): drei neue, gültige `pruefung:`-Zeilen im
  // eigenen `konformitaet`-Block, minus eine — U2-ADR-212s Klausel 3 wechselt auf `abgeloest`
  // (ihre Aussage ist die exakte Prämisse, die U2-ADR-237 zurücknimmt) und verliert damit ihre
  // `pruefung:`-Zeile: 272 + 3 - 1 = 274.
  // Vier disjunkte Zuwächse seit dem gemeinsamen 269er-Stand nach U2-ADR-229, alle auf
  // u2-kanon-Seite: 231(+1), 235(+2), 237(+2 netto) = +5, macht 274 auf dieser Seite, OHNE
  // U2-ADR-230.
  // 267 → 270 (03.09.2026, U2-ADR-230, dieser Zweig): drei neue `pruefung:`-Zeilen (PBKDF2-Pin,
  // Empfängerkreise-Fächer-Konsistenz, Block-Propagation), auf derselben 267er-Basis wie
  // U2-ADR-229.
  // REBASE-MERGE auf 4c448412 (03.09.2026, SECHSTES Mal derselbe Zufall-der-Arithmetik-Fall):
  // dieser Zweig zählte zuletzt 275 (269 + 230:+3, 231:+1, 235:+2), u2-kanon zählt nativ 274
  // (269 + 231:+1, 235:+2, 237:+2). Gemeinsam: 231(+1), 235(+2) — drei Punkte, bereits auf beiden
  // Seiten enthalten. Disjunkt: 230(+3, nur dieser Zweig), 237(+2, nur u2-kanon, neu seit dem
  // letzten Rebase). Macht 269 + 3(gemeinsam) + 3(230) + 2(237) = 277, nicht 274 und nicht 275.
  // Gegen `pruefungsZeilen()` NACH dem vollständigen Rebase gemessen, nicht aus 274 oder 275
  // angenommen.
  // 277 → 280 (03.09.2026, U2-ADR-241, „Verlustwege", dieser Zweig, Rebase auf
  // 283727e1): drei neue, gültige `pruefung:`-Zeilen im eigenen `konformitaet`-Block, auf der
  // bereits gemergten 277er-Basis oben drauf. Gegen `pruefstand-bindung.js` NACH dem
  // vollständigen Rebase gemessen, nicht aus 277+3 angenommen.
  // 280 → 283 (03.09.2026, U2-ADR-232, eines verwaisten Commits, Cherry-Pick auf
  // origin/u2-kanon): drei neue, gültige `pruefung:`-Zeilen im eigenen `konformitaet`-Block.
  // Gegen `pruefstand-bindung.js` NACH dem eigenen Cherry-Pick gemessen, nicht aus 280+3
  // angenommen.
  // 283 → 286 (04.09.2026, U2-ADR-245): drei neue `pruefung:`-Zeilen in der
  // eigenen ADR-Datei, je eine in drei `konformitaet`-Blöcken. Gegen `pruefstand-bindung.js`
  // NACH dem eigenen Bau gemessen, nicht aus 283+3 angenommen.
  // 286 → 289 (04.09.2026, REBASE-MERGE auf 9b6d5347, U2-ADR-244, dieser Zweig): drei weitere,
  // disjunkte gültige Klausel-Bindungen in der neuen ADR-244-Datei (Speicherort entfällt beim
  // Anlegen) — beide (245, 244) zweigten vom selben 283er-Stand ab. Gegen
  // `pruefstand-bindung.js` NACH dem vollständigen Rebase gemessen, nicht aus 286+3 angenommen.
  // 289 → 292 (04.09.2026, U2-ADR-248, eigener Zweig ab a84e8319): drei neue
  // `pruefung:`-Zeilen in der eigenen ADR-Datei, je eine in drei `konformitaet`-Blöcken. Gegen
  // `pruefstand-bindung.js` NACH dem eigenen Bau gemessen, nicht aus 289+3 angenommen.
  // 292 → 298 (04.09.2026, REBASE-MERGE auf c2261621, U2-ADR-249, „Sperrposten 1 —
  // .vdkey-Allowlist", dieser Zweig): sechs weitere, disjunkte gültige `pruefung:`-Zeilen über
  // vier `konformitaet`-Blöcke in der eigenen ADR-249-Datei, auf der bereits gemergten 292er-Basis
  // oben drauf. Gegen `pruefstand-bindung.js` NACH dem vollständigen Rebase gemessen, nicht aus
  // 292+6 angenommen.
  // 298 → 299 (04.09.2026, U2-ADR-266): eine neue, gültige `pruefung:`-Zeile im eigenen
  // `konformitaet`-Block. Gegen `pruefstand-bindung.js` gemessen, nicht aus 298+1 angenommen.
  // 299 → 312 (04.09.2026, REBASE auf 39372460, U2-ADR-262, „Handkopien von
  // Kern-Konstanten bekommen einen Wächter", eigener Zweig ab 8292b457): dreizehn neue, disjunkte
  // gültige `pruefung:`-Zeilen über vier `konformitaet`-Blöcke in der eigenen ADR-262-Datei, auf
  // der bereits gemergten 299er-Basis oben drauf. Gegen `pruefstand-bindung.js` NACH dem
  // vollständigen Rebase gemessen, nicht aus 299+13 angenommen.
  // 312 → 313 (05.09.2026, Fast-Forward auf e097a5da, U2-ADR-270, eigener Zweig): eine neue,
  // gültige `pruefung:`-Zeile im eigenen `konformitaet`-Block. Gegen den echten Lauf NACH dem
  // vollständigen Fast-Forward gemessen, nicht aus 312+1 angenommen.
  // 313 → 314 (05.09.2026, REBASE auf 622774d7, U2-ADR-195 Nachtrag [A553, Bucket B
  // NUR_UNSCHOEN], dieser Zweig ab 39372460): eine neue, gültige `pruefung:`-Zeile im eigenen
  // `konformitaet`-Block, auf der bereits gelandeten 313er-Basis oben drauf — disjunkt von
  // U2-ADR-262/-270, keine Mehrfachbindung. Gegen `pruefstand-bindung.js` in einem
  // eigenen Worktree auf origin/u2-kanon (622774d7) NACH dem vollständigen Rebase gemessen
  // (313 echt bestätigt, identisch zum vorherigen Zwischenstand 1f06067b — der dazwischen
  // gelandete Commit änderte diesen Zähler nicht), nicht aus 313+1 angenommen.
  // 314 → 315 (05.09.2026, U2-ADR-275, Rebase auf f7e5b052): eine neue, gültige `pruefung:`-Zeile
  // im eigenen `konformitaet`-Block, auf der bereits gelandeten 314er-Basis (a2s U2-ADR-195-
  // Nachtrag, s. o.) oben drauf. Gegen `pruefstand-bindung.js` NACH dem Rebase gemessen, nicht
  // aus 314+1 angenommen.
  // 315 → 316 (05.09.2026, U2-ADR-274, dieser Zweig, Commit 2): eine neue, gültige
  // `pruefung:`-Zeile im eigenen `konformitaet`-Block. Gegen `pruefstand-bindung.js` gemessen,
  // nicht aus 315+1 angenommen.
  // 299 → 302 (05.09.2026, REBASE-MERGE auf 39372460, U2-ADR-263, PDF-Schriftdeckung): drei
  // weitere, disjunkte gültige Klausel-Bindungen in der neuen ADR-263-Datei — beide (266, 263)
  // zweigten vom selben 298er-Stand ab. Gegen `pruefstand-bindung.js` NACH dem vollständigen
  // Rebase gemessen, nicht aus 299+3 angenommen.
  // 312/302 → 315 (05.09.2026, REBASE-MERGE auf e097a5da): U2-ADR-262 (Kanon-Seite, +13 ab 299)
  // und U2-ADR-263 (dieser Zweig, +3 ab 299) sind disjunkte, unabhängig neue Klausel-Dateien —
  // beide Zuwächse zusammen, nicht der höhere allein: 299+13+3=315, nicht 312 und nicht 302.
  // ECHT gegen `pruefstand-bindung.js` NACH dem vollständigen Rebase nachgemessen.
  // REBASE-MERGE auf a93df2a1 (05.09.2026): Korrektur — der erste Messversuch verglich nur, dass
  // beide Kommentar-Ketten zufaellig denselben Wert (315) behaupten, statt frisch zu rechnen.
  // ECHT nachgemessen: 318, nicht 315.
  // REBASE-MERGE auf 5e374af4 (05.09.2026, ueber 1cfd9425): ECHT gegen `pruefstand-bindung.js`
  // NACH diesem Rebase nachgemessen (nicht aus 316/318 addiert oder angenommen):
  // 319 → 330 (05.09.2026, U2-ADR-289, dieser Zweig): elf neue, gültige `pruefung:`-Zeilen im
  // eigenen `konformitaet`-Block (4 Blöcke, tests/pro-modul-vorlage-echtdaten.test.js +
  // tests/vorlage-vivodepot-erzeugen.test.js). ECHT gegen `pruefstand-bindung.js` gemessen,
  // nicht aus 319+11 angenommen.
  // 330 → 338 (05.09.2026, U2-ADR-296, anderer Worktree als ADR-289, dieselbe Basis e0da39ff):
  // acht neue, gültige `pruefung:`-Zeilen im eigenen `konformitaet`-Block. ECHT gegen
  // `pruefstand-bindung.js` gemessen, nicht aus 330+8 angenommen.
  // 338 → 349 (05.09.2026, U2-ADR-297, frisch auf bacfc94e/v569 verzweigt): elf neue, gültige
  // `pruefung:`-Zeilen in sechs eigenen `konformitaet`-Blöcken. ECHT gegen
  // `P.pruefungsZeilen()` gemessen, nicht aus 338+11 angenommen.
  // 349 → 364 (05.09.2026, U2-ADR-308, frisch auf origin/u2-kanon 2b142910/v572 verzweigt):
  // fünfzehn neue, gültige `pruefung:`-Zeilen in acht eigenen `konformitaet`-Blöcken. ECHT
  // gegen `P.pruefungsZeilen()` gemessen, nicht aus 349+15 angenommen.
  // 364 → 366 (05.09.2026, U2-ADR-308, Nachtrag vor dem Landen — Identitätswahrung statt Klon
  // übernommen, s. ADR-Text): zwei neue, gültige `pruefung:`-Zeilen (ein neuer Konformitäts-
  // Block „Identität"). ECHT gegen `P.pruefungsZeilen()` gemessen, nicht aus 364+2 angenommen.
  // 366 → 378 (06.09.2026, U2-ADR-306): zwölf neue, gültige `pruefung:`-Zeilen in fünf eigenen
  // `konformitaet`-Blöcken (ein sechster Block, „bewusst offen", trägt bewusst keine
  // `pruefung:`-Zeile — zustand:offen erwartet keine). ECHT gegen `P.pruefungsZeilen()`
  // gemessen, nicht aus 366+12 angenommen.
  // 378 → 381 (07.09.2026, U2-ADR-346 §12, dieser Zweig): drei neue, gültige `pruefung:`-Zeilen
  // im eigenen `konformitaet`-Block (der Riegel-Rot-Beweis + die Gegenprobe für
  // WIZARD_BUENDEL_VERBOTENE_IDS). ECHT gegen `P.pruefungsZeilen()` gemessen, nicht aus 378+3
  // angenommen.
  // 378 → 381 (07.09.2026, U2-ADR-344 §10, /`0a`-Nachtrag): drei neue, gültige
  // `pruefung:`-Zeilen im ERSTEN `konformitaet`-Block dieser ADR (das native BMJ-Skelett).
  // ECHT gegen `P.pruefungsZeilen()` gemessen, nicht aus 378+3 angenommen.
  // 384 → 387 (07.09.2026, U2-ADR-350, dieser Zweig): drei neue, gültige `pruefung:`-Zeilen im
  // eigenen `konformitaet`-Block (der Darkmode-Selektor-Wächter). ECHT gegen
  // `P.pruefungsZeilen()` gemessen, nicht aus 384+3 angenommen.
  // 462 → 478 (16.09.2026, U2-ADR-415, Stick-Mittelweg): sechzehn neue, gültige `pruefung:`-Zeilen
  // aus den vier neuen konformitaet-Blöcken. ECHT gegen `P.pruefungsZeilen()` gemessen, nicht aus 462+16 angenommen.
  // 478 → 480 (16.09.2026, Nachtrag U2-ADR-415, Teilen-Blatt): zwei neue `pruefung:`-Zeilen. ECHT gemessen.
  // 480 → 492 (16.09.2026, U2-ADR-400-Nachtrag Dokument-Fuß/App-Fuß-Kontakt/White Label greift): zwölf `pruefung:`-Zeilen, alle mit PROBEN-Deklaration (s. proben).
  // 492 → 496 (16.09.2026, U2-ADR-400-Nachtrag, Aktualisierungs-Link): vier Zeilen, alle mit PROBEN-Deklaration.
  gueltig:          { wert: 575, richtung: 'steigt', was: 'gültige Klausel-Bindungen (Grundmenge)' },  // 574 → 575 (22.09.2026, Kern-Fix Umschlagfeld-Verlust: die U2-ADR-430-Klausel „Speichern" (Ziffer 5) geht von offen auf prüfbar, eine neue pruefung:-Zeile auf tests/umschlag-unbekanntes-geschwisterfeld.test.js#[Prüfstein·Speichern] eine Datei mit einem unbekannten Umschlag-Feld trägt es nach dem Öffnen und Speichern noch. ECHT gemessen (P.pruefungsZeilen().gueltig.length), nicht angenommen.  // 571 → 574 (22.09.2026, U2-ADR-430 Wiederherstellungs-Hülle: drei Klausel-Bindungen: der Prüfstein zu Ziffer 5 (Kern, Grenze) und die Bindung an die PBKDF2-Iterationen); davor: 567 → 571 (21.09.2026, Gerüst-Schnitt S3: vier Klausel-Bindungen der Nachfolge-ADR zu U2-ADR-285); davor: 567 unverändert (20.09.2026, S1 / U2-ADR-426: der Klausel-Block der abgelösten Entscheidung 5 wandert von U2-ADR-416 nach U2-ADR-426, zwei Zeilen gegen zwei).  // 568 → 567 (19.09.2026, Lizenz-Entscheidung: U2-ADR-270 ist überholt, die BUSL-Schicht entfällt ersatzlos — Klausel und Probe [U2-ADR-270] LICENSE Schicht 2 fallen mit ihr weg; erwarteter Abgang)  // 539 → 568 (19.09.2026, Generator-Schlüssel-ADR + MIG3: 28 Wächter-Titel ohne PROBEN-Form, s. OHNE_PROBEN_DEKLARATION; Schuld benannt, kein Fix in diesem Zug)  // 535 → 539 (17.09.2026, U2-ADR-NNN3, Migrationsbeleg additive Umschlag-Schlüssel): vier neue, gültige `pruefung:`-Zeilen im eigenen `konformitaet`-Block, alle vier lösen auf echte Testtitel in tests/paket0-migrationsbeleg-referenzdepot.test.js auf. ECHT gemessen (P.pruefungsZeilen().gueltig.length), nicht angenommen.  // 531 → 535 (17.09.2026, KORREKTUR desselben Zugs): der Eintrag darunter behauptete, die zweite ADR (Ende Vorlagen-Format) sei bereits vollständig gezählt — sie war zu diesem Zeitpunkt aber noch gar nicht im Arbeitsbaum kopiert, ihre vier `pruefung:`-Zeilen (trust-basistemplate-signatur.test.js×2, vor-umzug-a4-standard-vorlagen.test.js×2, eine davon neu durch die Nachtrags-Fassung der ADR) zählten darum noch gar nicht mit. ECHT gemessen (P.pruefungsZeilen().gueltig.length), nicht angenommen.  // 526 → 531 (17.09.2026, U2-ADR-NNN/NNN2, Korpus-Zuordnung + Ende Vorlagen-Format): fünf `pruefung:`-Zeilen lösen auf echte Testtitel auf (zwei neue eigene in tests/rechtsraum-modul-schema-bauplan.test.js, drei erstmals zitierte, bereits bestehende Titel in pv-ziffer-27.test.js/vollmacht-generator.test.js/ki-generator.test.js). ECHT gemessen (P.pruefungsZeilen().gueltig.length), nicht angenommen.  // 525 → 526 (17.09.2026, U2-ADR-354 im Text: nur selbst eingelassene Templates in „Weitere Bereiche“): eine pruefung:-Zeile umbenannt, eine neue auf die Ab-Werk-Gegenprobe.  // 502 → 504 (16.09.2026, U2-ADR-411 WebDAV-Ordner und Wiederanlauf, gemessen): eine pruefung:-Zeile ersetzt, drei neue.  // 499 → 502 (16.09.2026, U2-ADR-411 Bau je Version, auf v716 gemessen): drei pruefung:-Zeilen des neuen konformitaet-Blocks auf die Proben in tests/kern-ausliefern.test.js.  // 496 → 499 (16.09.2026, U2-ADR-289 Entscheidung 2, nach Rebase auf 03c553bb neu gemessen): drei pruefung:-Zeilen auf die Rot-Beweise in tests/generator-pro-bereiche.test.js.  // 455 → 462 (16.09.2026, U2-ADR-400-Nachtrag, Yellow-Button-Zeichen): sieben `pruefung:`-Zeilen aus den drei neuen konformitaet-Blöcken lösen auf die sieben neuen Testtitel in tests/yb-zeichen-an-der-funktion.test.js auf, ECHT gemessen (Suitelauf), nicht angenommen. 447 → 455 (15.09.2026, U2-ADR-414, Produkt als signiertes Rezept): acht `pruefung:`-Zeilen aus vier neuen konformitaet-Blöcken, nach U2-ADR-413. 441 → 447 (15.09.2026, U2-ADR-413 Vorführung): sechs `pruefung:`-Zeilen aus den vier neuen konformitaet-Blöcken lösen auf sechs neue Testtitel in tests/vorfuehrung-showcase.test.js auf. ECHT gemessen, nicht angenommen. 426 → 441 (13.09.2026, U2-ADR-409/411): fünfzehn `pruefung:`-Zeilen aus den sieben neuen konformitaet-Blöcken von U2-ADR-411 (Bestell- und Auslieferungsweg) lösen auf fünfzehn bereits gelandete Testtitel auf (tests/kern-ausliefern.test.js, tests/zutaten-pruefsumme-abgleich.test.js, tests/produkt-text-erzeugen-pruefsumme.test.js); U2-ADR-409 trägt keinen Block und keinen Zuwachs, ECHT gemessen (P.pruefungsZeilen().gueltig.length), nicht angenommen. 424 → 426 (13.09.2026, U2-ADR-410, ZVR-Abschrift): zwei `pruefung:`-Zeilen aus dem neuen konformitaet-Block lösen auf zwei echte Testtitel auf, ECHT gemessen (P.pruefungsZeilen().gueltig.length), nicht angenommen. Nachtrag desselben Tages (+1, jetzt 12): der Markenton wird bei fehlendem Kontrast ABGEWIESEN statt abgedunkelt — die Abweisung lief sonst über `--salbei-dunkel` ins Leere (E2E-Fund `marke-e2e-abnahme`); die helle Marke bekam dafür eine eigene, benannte Probe. 412 → 423 (13.09.2026, U2-ADR-408 „Die Palette folgt der Marke“): elf `pruefung:`-Zeilen aus den sechs neuen konformitaet-Blöcken lösen auf die elf neuen Testtitel auf, ECHT gemessen (P.pruefungsZeilen().gueltig.length), nicht angenommen. 411 → 412 (12.09.2026, „die pauschale file://-Flagge weicht der Probe"): ein neuer `pruefung:`-Verweis im ADR-244-Nachtrag (der Rot-Beweis, den es vorher nie gab) löst auf einen echten neuen Testtitel auf, ECHT gemessen (P.pruefungsZeilen().gueltig.length), nicht angenommen. Die umbenannte Gegenprobe zählt weiterhin als EIN Bindung, kein Zuwachs. 407 → 411 (10.09.2026, „Dateinamen-Reichweite nachträglich automatisiert"): vier `pruefung:`-Zeilen aus dem neuen konformitaet-Block im ADR-400-Nachtrag lösen auf die vier neuen Testtitel auf, ECHT gemessen (P.pruefungsZeilen().gueltig.length), nicht angenommen. 403 → 407 (10.09.2026, „die Lese-App bekommt Branding"): vier `pruefung:`-Zeilen aus den drei neuen konformitaet-Blöcken im ADR-400-Nachtrag lösen auf die vier neuen Testtitel auf, ECHT gemessen (P.pruefungsZeilen().gueltig.length), nicht angenommen. 392 → 403 (10.09.2026, „White Label bis ins PDF"): elf `pruefung:`-Zeilen aus den fünf neuen konformitaet-Blöcken in U2-ADR-400 lösen auf die elf neuen Testtitel auf, ECHT gemessen (P.pruefungsZeilen().gueltig.length), nicht angenommen. 387 → 392 (07.09.2026, C2/U2-ADR-354): fünf `pruefung:`-Zeilen aus den vier neuen konformitaet-Blöcken lösen auf die fünf neuen Testtitel auf, ECHT gemessen (P.pruefungsZeilen().gueltig.length), nicht angenommen  // 504 → 525 (16.09.2026, U2-ADR-416 Sprachmodule mit jeder Version, nach Rebase auf 291cfe01): 21 neue pruefung:-Zeilen aus sechs Klauseln, alle lösen auf.
  unlesbar:         { wert:      1, richtung: 'sinkt',  was: 'Klausel-Zeilen, die nicht auflösen' },
  // 66 → 70 am 31.07.2026 (A46): vier PROBEN in `tests/anlass-routing-ziel.test.js`
  // nachgezogen — bewusst nicht klausel-gebunden (U2-ADR-115), zaehlt hier trotzdem,
  // weil probenDeklarationen() jede tests/*.test.js liest, nicht nur die gueltige Menge.
  // 70 → 71 (05.09.2026, Fast-Forward auf e097a5da, U2-ADR-270, eigener Zweig): eine neue PROBEN-
  // Deklaration in tests/zusagen-in-kommentaren.test.js (licenseSchicht2UmfangLesen, B-1-Form für
  // den U2-ADR-270-Wächter) — nimmt den Wächter vollständig aus ohneDeklaration/kollektor/etc.
  // heraus (s. dortiger Kommentar), zaehlt hier trotzdem, weil probenDeklarationen() jede
  // tests/*.test.js liest, unabhaengig von Klausel-Bindung.
  // 71 → 72 (07.09.2026, U2-ADR-344 §10, /`0a`-Nachtrag): eine neue PROBEN-Deklaration in
  // tests/u2-adr-344-bmj-dokumente-materialisieren.test.js (nativesSkelettErheben, B-1-Form für
  // den Natives-Skelett-Wächter). ECHT gegen `P.probenDeklarationen()` gemessen, nicht aus
  // 71+1 angenommen.
  // 72 → 75 (07.09.2026, U2-ADR-350, dieser Zweig): drei neue PROBEN-Deklarationen in
  // tests/darkmode-selektor-waechter.test.js (lokaler Durchreicher `luecken`, B-1-Form für den
  // Darkmode-Selektor-Wächter — alle drei `pruefung:`-Zeilen an dieselbe Diskriminante
  // gebunden, s. Kommentar dort). ECHT gegen `P.probenDeklarationen()` gemessen, nicht aus
  // 72+3 angenommen.
  proben:           { wert: 96, richtung: 'steigt', was: 'PROBEN-Deklarationen' },  // 97 → 96 (19.09.2026, Lizenz-Entscheidung: U2-ADR-270 ist überholt, die BUSL-Schicht entfällt ersatzlos — Klausel und Probe [U2-ADR-270] LICENSE Schicht 2 fallen mit ihr weg; erwarteter Abgang)  // 95 → 97 (17.09.2026, Pro mit der Struktur von Privat): zwei Diskriminanten in tests/pro-struktur-wie-privat.test.js.  // 93 → 95 (16.09.2026, Pro-Bereiche in Privat): zwei Diskriminanten in tests/pro-bereiche-in-privat.test.js. // 92 → 93 (16.09.2026, M5): eine Diskriminante in tests/pro-name-weckt-ersetzten-bereich-nicht.test.js. // 91 → 92 (16.09.2026, B3): eine Diskriminante in tests/angedockte-feldtexte-folgen-der-sprache.test.js.  // 87 → 91 (16.09.2026, Aktualisierungs-Link, vier Diskriminanten). // 75 → 87 (16.09.2026, U2-ADR-400-Nachtrag): je eine Diskriminante für die zwölf neuen Wächter, Aufruf-Nachweis grün.
  // 26 → 39 am 05.08.2026 (Tranche 1): dieselben 13 neuen Bindungen tragen noch keine
  // PROBEN-Deklarationsform von B-1 — derselbe Fall wie U2-102. fundstellen steigt GEMEINSAM
  // um 13 (29 → 42, jede der 13 wird von genau einer ADR referenziert, keine Mehrfachnennung).
  // 39 → 49 / 42 → 52 (Nachtlauf 2, Tranche 2): dieselbe Lage, 10 weitere Bindungen ohne
  // PROBEN-Deklarationsform, je genau einmal referenziert (Namen und Fundstellen steigen
  // GEMEINSAM um 10).
  // 49 → 50 (06.08.2026, A110 Stufe 2): eine neue Bindung ohne PROBEN-Deklaration, s. Kommentar
  // an der Fundstelle in OHNE_PROBEN_DEKLARATION.
  // 50 → 51 (09.08.2026, N2 Zug 1/5): eine neue Bindung ohne PROBEN-Deklaration, s. Kommentar
  // an der Fundstelle in OHNE_PROBEN_DEKLARATION.
  // 51 → 52 (09.08.2026, N4 Zug 4, U2-ADR-126): eine neue Bindung ohne PROBEN-Deklaration,
  // s. Kommentar an der Fundstelle in OHNE_PROBEN_DEKLARATION.
  // 52 → 53 (09.08.2026, N5 Zug 4, U2-ADR-127): eine neue Bindung ohne PROBEN-Deklaration,
  // s. Kommentar an der Fundstelle in OHNE_PROBEN_DEKLARATION.
  // 53 → 54 (09.08.2026, Sensibel-Architektur Zug 1+3, U2-ADR-128): eine neue Bindung ohne
  // PROBEN-Deklaration, s. Kommentar an der Fundstelle in OHNE_PROBEN_DEKLARATION.
  // 54 → 55 (10.08.2026, K8 Zug 3, U2-ADR-131): eine neue Bindung ohne PROBEN-Deklaration,
  // s. Kommentar an der Fundstelle in OHNE_PROBEN_DEKLARATION.
  // 55 → 57 (30.08.2026, U2-ADR-101, zweite Klausel): zwei neue Bindungen ohne PROBEN-
  // Deklaration, s. Kommentar an der Fundstelle in OHNE_PROBEN_DEKLARATION.
  // 57 → 60 (31.08.2026, U2-ADR-184, Sub-Depot-Klick-Freeze): drei neue Bindungen ohne
  // PROBEN-Deklaration, s. Kommentar an der Fundstelle in OHNE_PROBEN_DEKLARATION.
  // 60 → 69 (01.09.2026, U2-ADR-185): neun neue Namen, s. Begründung an der Stelle in
  // OHNE_PROBEN_DEKLARATION oben — BEFUND, nicht stillschweigend nachgezogen.
  // REBASE 01.09.2026: dreizehn weitere Namen ohne PROBEN-Deklaration aus der ursprünglich
  // eigenständigen U2-ADR-190/197-Zählung dieses Zweigs (sechs skipWaiting, sechs
  // U2-ADR-197/Aussage-Pruefung-Abgleich, ein weiterer zum U2-ADR-190-Nachtrag clients.claim() —
  // probenDeklarationen() liest nur tests/*.test.js, die neue Bindung lebt in tests/e2e/). Wert
  // NACH dem vollen Rebase real gemessen, nicht hier addiert.
  // MESSUNG 01.09.2026 (echter Landepunkt, s. gueltig oben): 100 → 113.
  // 113 → 117 (02.09.2026, U2-ADR-206): vier neue Namen, s. Begründung in OHNE_PROBEN_DEKLARATION.
  // 117 → 118 (02.09.2026, U2-ADR-202, Rebase auf 60328d3): ein neuer Name — probenDeklarationen()
  // liest nur tests/*.test.js, die Bindung lebt in tests/e2e/.
  // 118 → 119 (02.09.2026, U2-ADR-207, Rebase auf b7cdac6): ein neuer Name ('Rot-Beweis') — die
  // anderen beiden Bindungen dieser ADR ('Rückrichtung', 'die ganze Naht') sind bereits benannte
  // Wächter aus U2-ADR-188/189, s. Begründung in OHNE_PROBEN_DEKLARATION. Wert unten gegen den
  // echten Lauf gemessen.
  // 119 → 122 (02.09.2026, Rebase auf 8857393, U2-ADR-193 + U2-ADR-199): drei neue, DISTINKTE
  // Namen (keiner kollidiert mit einem bestehenden Wächternamen). Gegen `waechterOhneProbe()`
  // gemessen.
  // 122 → 126 (02.09.2026, u2-kanon-Seite, U2-ADR-209): vier neue Namen.
  // 122 → 126 (02.09.2026, dieser Zweig, VOR dem zweiten Rebase, U2-ADR-208): vier ANDERE neue
  // Namen, s. Begründung in OHNE_PROBEN_DEKLARATION. Dieselbe Zahl auf beiden Seiten ist Zufall
  // (beide Male +4), keine Bestätigung.
  // 126 → 130 (02.09.2026, zweiter Rebase auf f7f6417/v498): 122 + 4 (U2-ADR-209) + 4
  // (U2-ADR-208) — zwei disjunkte Namenslisten. Gegen den echten Lauf gemessen, nicht aus
  // 126+4 angenommen.
  // 130 → 136 (02.09.2026, Rebase auf 657f6d6, U2-ADR-211, Sicherungsstand bekannt): sechs neue
  // Bindungen in tests/sicherungsstand-bekannt.test.js, keine trägt die PROBEN-Deklarationsform
  // von B-1 — auf die bereits gemergte 130er-Basis (208+209). Gegen den echten Lauf NACH dem
  // vollständigen Rebase gemessen, nicht aus 130+6 angenommen.
  // 136 → 138 (02.09.2026, U2-ADR-201, Zug 1 Betreuung, Rebase auf 39683c7/v500): zwei neue Namen
  // ('[Betreuung·A]', '[Betreuung·B]') — probenDeklarationen() liest nur tests/*.test.js, die
  // neue Bindung lebt in tests/e2e/, wie schon bei U2-ADR-202/207/190/197.
  // 138 → 140 (02.09.2026, U2-ADR-201, Zug 1 Kinder, Commit 2 von zwei, Rebase auf 39683c7/v500):
  // zwei neue Namen ('[Kinder·A]', '[Kinder·B]') — dieselbe Format-Grenze, die neue Bindung lebt
  // in tests/e2e/.
  // 136 → 143 (02.09.2026, dieser Zweig, VOR dem Rebase auf f1cdb0e, U2-ADR-212): sieben neue
  // Namen (fünf PS10-* in tests/persistenz-status.test.js, zwei in
  // tests/e2e/u2-adr-212-sichern-intern.spec.js), keiner trägt die PROBEN-Deklarationsform von
  // B-1 — auf denselben v500-Bestand (136).
  // REBASE auf f1cdb0e (02.09.2026, hat U2-ADR-201 vor diesem Zweig gelandet): 136 + 4
  // (U2-ADR-201) + 7 (U2-ADR-212), zwei disjunkte Namenslisten. Gegen den echten Lauf gemessen,
  // nicht aus 140+7 angenommen.
  // 136 → 146 (02.09.2026, Fast-Forward auf 39683c7, dieser Zweig, U2-ADR-214): zehn neue Namen
  // in tests/testfassung-legen.test.js, s. Begründung an der Fundstelle in
  // OHNE_PROBEN_DEKLARATION oben. Gegen den echten Lauf gemessen, nicht aus 136+10 angenommen.
  // REBASE-MERGE auf 767fe70/v501 (02.09.2026): 147 (u2-kanon-Seite, U2-ADR-201+212, elf Namen)
  // und 146 (dieser Zweig, U2-ADR-214, zehn Namen) zählten beide denselben 136er-Ausgangswert —
  // 136 + 11 + 10 = 157, zwei disjunkte Namenslisten. Nach dem vollständigen Rebase real gegen
  // `pruefstand-bindung.js` gemessen, nicht aus 147+10 oder 146+11 angenommen.
  // 157 → 159 (02.09.2026, U2-ADR-213, PBKDF2 statt Argon2id, Rebase auf 8f5bb24/v501-
  // Wurzelauslieferung): zwei neue Bindungen in tests/pbkdf2-statt-argon2id.test.js, keine trägt
  // die PROBEN-Deklarationsform von B-1 — auf die bereits gemergte 157er-Basis.
  // 157 → 158 (02.09.2026, U2-ADR-221): ein neuer Name — derselbe axe-core-Testtitel, s.
  // Begründung in OHNE_PROBEN_DEKLARATION oben und bei `gueltig`.
  // REBASE-MERGE auf 1a4174f (02.09.2026): 159 (u2-kanon-Seite, U2-ADR-213, zwei Namen) und 158
  // (dieser Zweig, U2-ADR-221, ein Name) zählten beide denselben 157er-Ausgangswert — 157 + 2 +
  // 1 = 160, disjunkte Namenslisten. Gegen den echten Lauf gemessen, nicht aus 159+1 oder 158+2
  // angenommen.
  // 160 → 161 (02.09.2026, U2-ADR-223, Rebase auf origin/u2-kanon/251d04d): PS10-6 trägt jetzt
  // eine gültige Bindung, aber keine PROBEN-Deklarationsform — genau darum erscheint er hier NEU,
  // nicht trotzdem gedeckt (s. Kommentar an der neuen Zeile in OHNE_PROBEN_DEKLARATION oben), auf
  // die bereits gemergte 160er-Basis.
  // 165 → 168 (02.09.2026, U2-ADR-222, leeres Depot ist keine Sicherung, Cherry-Pick auf
  // landung-218): PS11-1/PS11-2/PS11-3 tragen gültige Bindungen, aber keine PROBEN-
  // Deklarationsform — s. Kommentar an den drei neuen Zeilen in OHNE_PROBEN_DEKLARATION oben, auf
  // die bereits gemergte 165er-Basis.
  // 168 → 169 (03.09.2026, U2-ADR-224, Cherry-Pick auf u2-adr-222-auf-222/aabb3d4): EINE neue
  // Namens-Bindung (U2-ADR-224). Gemessen NACH dem Cherry-Pick, nicht aus 168+1 angenommen.
  // REBASE-MERGE auf b824ec9e (03.09.2026): 169 (u2-kanon-Seite, U2-ADR-224, ein Name) und 171
  // (dieser Zweig, U2-ADR-215, drei Namen) zählten beide denselben 168er-Ausgangswert — 168 + 1
  // (U2-ADR-224) + 3 (U2-ADR-215) = 172, zwei disjunkte Namenslisten. Gegen `pruefstand-bindung.js`
  // NACH dem vollständigen Rebase gemessen, nicht aus 169+3 oder 171+1 angenommen.
  // 172 → 174 (03.09.2026, U2-ADR-225): zwei neue Namens-Bindungen.
  // 174 → 179 (03.09.2026, U2-ADR-226, dieser Zweig): U2-102 und K8·Byte-Gleichheit trugen
  // bislang je EINEN mehrdeutigen Kürzel-Namen (fälschlich nie als solcher erkannt) — auf die
  // tatsächlich gemeinten Testtitel aufgelöst, drei bzw. vier — macht -2+7=+5 gegenüber der
  // alten 174er-Basis (s. Kommentar an den neuen Zeilen in OHNE_PROBEN_DEKLARATION oben).
  // 179 → 183 (03.09.2026, U2-ADR-226, dieser Zweig): dieselben vier neuen Namen aus
  // OHNE_PROBEN_DEKLARATION oben.
  // 183 → 178 (03.09.2026, Speicher-Modell Stück 3, dieser Zweig): fünf Namen aus
  // OHNE_PROBEN_DEKLARATION geräumt (PS10-2/3/4/7 + der alte Browser-Rot-Beweis-Titel), einer
  // (PS10-1) blieb, keiner neu — Arbeit erledigt, nicht nur verschoben (s. Kommentar oben an der
  // Liste). Gegen `pruefstand-bindung.js` nach dem eigenen Bau gemessen, nicht aus 183-5 angenommen.
  // 178 → 181 (03.09.2026, U2-ADR-220, dieser Zweig): drei neue Namen (PS12-1/2/3, s. Kommentar
  // oben an der Liste). Gegen den Testlauf nach dem Rebase gemessen, nicht aus 178+3 angenommen.
  // 181 → 184 (03.09.2026, U2-ADR-219, Nachbau dieser Zweig): drei neue Namen (PS4-4/PS4-6/
  // [Block5], s. Kommentar oben an der Liste) — erstmals klausel-gebunden, tragen aber (wie die
  // meisten) keine PROBEN-Deklarationsform von B-1. Gegen den Testlauf nach dem eigenen Bau
  // gemessen, nicht aus 181+3 angenommen.
  // 184 → 186 (03.09.2026, U2-ADR-227, Signierungs-Automatisierung Zug 1, u2-kanon-Seite): zwei
  // neue Namen (s. Kommentar oben an der Liste) — einer davon ein neuer, präfixierter Anker-
  // String für einen bereits bestehenden Test, keine neue Probe.
  // 184 → 190 (03.09.2026, U2-ADR-228, dieser Zweig, VOR dem Rebase auf U2-ADR-227 gemessen):
  // sechs neue Namen (die Suite-Dateien-Serie, s. Kommentar oben an der Liste) — neuer Testcode,
  // trägt aber ebenfalls keine PROBEN-Deklarationsform von B-1. Auf derselben 184er-Basis,
  // unabhängig von der Zeile darüber gezählt.
  // REBASE-MERGE auf 7bf135d1 (03.09.2026): 186 (u2-kanon-Seite, +2) und 190 (dieser Zweig, +6)
  // zählten beide denselben 184er-Ausgangswert — 184 + 2 + 6 = 192, zwei disjunkte Namenslisten.
  // Gegen den Testlauf NACH dem vollständigen Rebase gemessen, nicht aus 186+6 oder 190+2
  // angenommen.
  // 192 → 194 (03.09.2026, U2-ADR-229, v1-Dokumente-Audit, u2-kanon-Seite): zwei neue Namen
  // (die Dateiprüfsumme-Proben, s. Kommentar oben an der Liste) — neuer Testcode, trägt aber
  // ebenfalls keine PROBEN-Deklarationsform von B-1.
  // 194 → 195 (03.09.2026, U2-ADR-231, u2-kanon-Seite): ein neuer Name (Test 4, Ganzkette mit
  // vollem Feldbestand — dieselbe Lage wie Test 3, Kollektor-Form, außerhalb der Reichweite).
  // 195 → 197 (03.09.2026, U2-ADR-235, u2-kanon-Seite): zwei neue Namen (die beiden neuen
  // `pruefung:`-Zeilen aus dem eigenen `konformitaet`-Block) — Konstruktions-Form, aber keine
  // eigene PROBEN-Deklarationsform von B-1.
  // 197 → 199 (03.09.2026, U2-ADR-237, u2-kanon-Seite): drei neue Namen (die drei neuen
  // `pruefung:`-Zeilen aus dem eigenen `konformitaet`-Block — PS10-1 umbenannt zählt hier als
  // NEUER Name, weil der Titel selbst die geprüfte Aussage trägt und sich geändert hat), minus
  // eine — der alte PS10-1-Titel fällt aus der Liste (U2-ADR-212 Klausel 3 wechselt auf
  // `abgeloest`): 197 + 3 - 1 = 199.
  // Vier disjunkte Namenslisten seit dem gemeinsamen 194er-Stand, alle auf u2-kanon-Seite:
  // 231(+1), 235(+2), 237(+2 netto) = +5, macht 199 auf dieser Seite, OHNE U2-ADR-230.
  // 192 → 195 (03.09.2026, U2-ADR-230, dieser Zweig): drei neue Namen in OHNE_PROBEN_DEKLARATION —
  // keine PROBEN-Deklarationsform von B-1, auf derselben 192er-Basis wie U2-ADR-229.
  // REBASE-MERGE auf 4c448412 (03.09.2026, SECHSTES Mal derselbe Fall): dieser Zweig zählte
  // zuletzt 200 (194 + 230:+3, 231:+1, 235:+2), u2-kanon zählt nativ 199 (194 + 231:+1, 235:+2,
  // 237:+2). Gemeinsam: 231(+1), 235(+2). Disjunkt: 230(+3, nur dieser Zweig), 237(+2, nur
  // u2-kanon, neu seit dem letzten Rebase). Macht 194 + 3(gemeinsam) + 3(230) + 2(237) = 202,
  // nicht 199 und nicht 200. Gegen den Testlauf NACH dem vollständigen Rebase gemessen, nicht aus
  // 199 oder 200 angenommen.
  // 202 → 205 (03.09.2026, U2-ADR-241, „Verlustwege", dieser Zweig, Rebase auf
  // 283727e1): drei neue Namen (die drei neuen `pruefung:`-Zeilen aus dem eigenen
  // `konformitaet`-Block), auf der bereits gemergten 202er-Basis oben drauf — Konstruktions-
  // Form, aber keine eigene PROBEN-Deklarationsform von B-1.
  // 205 → 208 (03.09.2026, U2-ADR-232, eines verwaisten Commits, Cherry-Pick auf
  // origin/u2-kanon): drei neue Namen (die drei neuen `pruefung:`-Zeilen aus dem eigenen
  // `konformitaet`-Block, s. Kommentar oben an der Liste) — Konstruktions-/Kollektor-Form,
  // aber keine eigene PROBEN-Deklarationsform von B-1.
  // 208 → 211 (04.09.2026, U2-ADR-245): drei neue Namen (s. Kommentar oben an
  // der Liste) — zwei neuer Testcode, einer eine bereits bestehende Probe, die vorher keine
  // ADR-Bindung trug. Keiner trägt eine PROBEN-Deklarationsform von B-1.
  // 211 → 214 (04.09.2026, REBASE-MERGE auf 9b6d5347, U2-ADR-244, dieser Zweig): drei weitere,
  // disjunkte neue Namen aus tests/adr-244-anlegen-ohne-speicherort.test.js in
  // OHNE_PROBEN_DEKLARATION oben — beide (245, 244) zweigten vom selben 208er-Stand ab.
  // Konstruktions-Form, keine eigene PROBEN-Deklarationsform von B-1.
  // 214 → 216 (04.09.2026, U2-ADR-248, eigener Zweig ab a84e8319): zwei neue
  // Namen in OHNE_PROBEN_DEKLARATION oben — beide bereits bestehender Testcode
  // (tests/erbschein-modul-mechanik.test.js, tests/e2e/erbschein-vorbereitungsauszug-abnahme.
  // spec.js), der vorher keine ADR-Bindung trug und darum ausserhalb der analysierten Menge
  // lag. Keiner trägt eine PROBEN-Deklarationsform von B-1.
  // 216 → 221 (04.09.2026, REBASE-MERGE auf c2261621, U2-ADR-249, „Sperrposten 1 —
  // .vdkey-Allowlist", dieser Zweig): fünf weitere, disjunkte neue Namen in OHNE_PROBEN_DEKLARATION
  // oben (vier neue Testtitel, einer erstmals referenziert), auf der bereits gemergten 216er-Basis
  // oben drauf. Keiner trägt eine PROBEN-Deklarationsform von B-1, dieselbe Lage wie
  // U2-ADR-229/-230/-235/-241.
  // 221 → 222 (04.09.2026, U2-ADR-266): ein neuer Name (WE-B9) in OHNE_PROBEN_DEKLARATION oben —
  // bestehender Testtitel in tests/wiedereinstieg-app-first.test.js, keine eigene
  // PROBEN-Deklarationsform von B-1.
  // 222 → 235 (04.09.2026, REBASE auf 39372460, U2-ADR-262, „Handkopien von
  // Kern-Konstanten bekommen einen Wächter", eigener Zweig ab 8292b457): dreizehn neue Namen in
  // OHNE_PROBEN_DEKLARATION oben (alle dreizehn neue Testtitel in tests/handkopien-gegen-
  // original.test.js) — keiner trägt eine PROBEN-Deklarationsform von B-1, dieselbe Lage wie
  // U2-ADR-229/-230/-235/-241/-249/-266.
  // 235 → 236 (05.09.2026, U2-ADR-275, Rebase auf f7e5b052): ein neuer Name in
  // OHNE_PROBEN_DEKLARATION oben — erste `pruefung:`-Zeile, die überhaupt auf
  // tests/paket3-commitA-entkopplung.test.js bindet, kann strukturell keine PROBEN-Deklaration
  // tragen (s. Begründung an der Fundstelle oben). a2s zwischenzeitliche Landung trägt keinen
  // neuen Namen (s. fundstellen oben — ihre neue Fundstelle bindet auf eine bereits
  // referenzierte Probe), berührt diese Zahl darum nicht — gegengeprüft, weiterhin 236.
  // 236 → 237 (05.09.2026, U2-ADR-274, dieser Zweig, Commit 2): ein neuer Name in
  // OHNE_PROBEN_DEKLARATION oben — tests/paket5-institutionsart-teilauszug-beweis.test.js
  // referenziert zwar eine dateieigene Funktion (`artOptionen`), die aber ein trivialer
  // Ein-Zeilen-Zugriff ist, keine Entscheidungslogik — die eigentlich geprüfte Logik
  // (Registrierungspfad, `_institutionsArtenAusDepotAnmelden`) liegt in vivodepot.html, nicht
  // dateieigen. Eine `diskriminante: artOptionen` wäre technisch möglich, aber irreführend:
  // ihre Mutation prüfte nur den Zugriff, nicht den Registrierungspfad, den der Test tatsächlich
  // beweisen soll. Erwogen und verworfen, nicht übersehen.
  // 222 → 225 (05.09.2026, REBASE-MERGE auf 39372460, U2-ADR-263, PDF-Schriftdeckung): drei
  // weitere, disjunkte neue Namen in OHNE_PROBEN_DEKLARATION oben — beide (266, 263) zweigten vom
  // selben 221er-Stand ab. Konstruktions-Form, keine eigene PROBEN-Deklarationsform von B-1.
  // 235/225 → 238 (05.09.2026, REBASE-MERGE auf e097a5da): U2-ADR-262 (+13 ab 222) und U2-ADR-263
  // (+3 ab 222) sind disjunkte neue Namen — beide Zuwächse zusammen: 222+13+3=238, nicht 235 und
  // nicht 225. ECHT gegen `pruefstand-bindung.js` NACH dem vollständigen Rebase nachgemessen.
  // REBASE-MERGE auf a93df2a1 (05.09.2026): ECHT gegen `pruefstand-bindung.js` am vollstaendig
  // gemergten Bestand NACH diesem Rebase nachgemessen (nicht aus 236/238 addiert oder angenommen): 239.
  // REBASE-MERGE auf 5e374af4 (05.09.2026, ueber 1cfd9425): ECHT erneut nachgemessen
  // (nicht aus 237/239 addiert oder angenommen):
  // 240 → 251 (05.09.2026, U2-ADR-289, dieser Zweig): elf neue `pruefung:`-gebundene Testtitel
  // (s. `gueltig` oben) — keiner trägt eine B-1-PROBEN-Deklaration, also alle elf neu in dieser
  // Liste. BEFUND, kein Rückbau: dieselbe Nachrüstungslücke wie beim übrigen Bestand (240 von
  // 319 waren zuvor schon unretrofittet), nicht eigens für diesen Bau geschlossen.
  // 251 → 259 (05.09.2026, U2-ADR-296): acht neue `pruefung:`-gebundene Testtitel — keiner
  // trägt eine B-1-PROBEN-Deklaration. BEFUND, kein Rückbau, dieselbe Nachrüstungslücke wie
  // beim übrigen Bestand.
  // 259 → 270 (05.09.2026, U2-ADR-297): elf neue `pruefung:`-gebundene Testtitel — keiner
  // trägt eine B-1-PROBEN-Deklaration. BEFUND, kein Rückbau, dieselbe Nachrüstungslücke.
  // 270 → 285 (05.09.2026, U2-ADR-308): fünfzehn neue `pruefung:`-gebundene Testtitel — keiner
  // trägt eine B-1-PROBEN-Deklaration. BEFUND, kein Rückbau, dieselbe Nachrüstungslücke.
  // 285 → 287 (05.09.2026, U2-ADR-308-Nachtrag): zwei neue `pruefung:`-gebundene Testtitel —
  // keiner trägt eine B-1-PROBEN-Deklaration. BEFUND, kein Rückbau.
  // 287 → 299 (06.09.2026, U2-ADR-306): zwölf neue `pruefung:`-gebundene Testtitel — keiner
  // trägt eine B-1-PROBEN-Deklaration. BEFUND, kein Rückbau, dieselbe Nachrüstungslücke.
  // 299 → 302 (07.09.2026, U2-ADR-346 §12, dieser Zweig): drei neue Namen in
  // OHNE_PROBEN_DEKLARATION oben — der Riegel-Rot-Beweis für WIZARD_BUENDEL_VERBOTENE_IDS
  // (pvwiz/kiwiz) plus die Gegenprobe, alle drei Konstruktions-Form (direkter
  // `assert.throws`/`assert.doesNotThrow`, kein Kollektor). ECHT gegen `P.waechterOhneProbe()`
  // gemessen, nicht aus 299+3 angenommen.
  // 299 → 301 (07.09.2026, U2-ADR-344 §10, /`0a`-Nachtrag): zwei neue `pruefung:`-gebundene
  // Testtitel (die beiden Rot-Beweise des Natives-Skelett-Wächters) — strukturell nicht an eine
  // Diskriminante bindbar, s. Kommentar bei den Einträgen selbst. Die dritte neue Zeile (Haupt-
  // wächter) trägt die PROBEN-Deklaration und zählt hier NICHT mit.
  // 378 → 394 (16.09.2026, U2-ADR-415, Stick-Mittelweg): die sechzehn neu gebundenen Titel oben in
  // OHNE_PROBEN_DEKLARATION. ECHT gegen `P.waechterOhneProbe()` gemessen.
  // 394 → 396 (16.09.2026, Nachtrag U2-ADR-415): die zwei neuen Titel in OHNE_PROBEN_DEKLARATION.
  ohneDeklaration:  { wert: 474, richtung: 'sinkt',  was: 'Wächter ohne deklarierte Probe (Namen)' },  // 473 → 474 (22.09.2026, Kern-Fix Umschlagfeld-Verlust: der dritte OHNE_PROBEN_DEKLARATION-Titel, [Prüfstein·Speichern], s. gueltig/konstruktion). ECHT gegen P.waechterOhneProbe() gemessen.  // 471 → 473 (22.09.2026, U2-ADR-430 Wiederherstellungs-Hülle: die zwei Prüfstein-Titel, Schuld benannt); davor: 467 → 471 (21.09.2026, Gerüst-Schnitt S3: die vier Titel dieser Bindungen, Konstruktions-Form, Schuld benannt); davor: 439 → 467 (19.09.2026, Generator-Schlüssel-ADR + MIG3: 28 Wächter-Titel ohne PROBEN-Form, s. OHNE_PROBEN_DEKLARATION; Schuld benannt, kein Fix in diesem Zug)  // 435 → 439 (17.09.2026, U2-ADR-NNN3, ↑ BEFUND benannt statt nachgezogen): vier neue Namen ohne PROBEN-Deklarationsform aus dem neuen konformitaet-Block (Migrationsbeleg additive Umschlag-Schlüssel), s. OHNE_PROBEN_DEKLARATION oben. ECHT gemessen (P.waechterOhneProbe()), nicht angenommen.  // 431 → 435 (17.09.2026, ↑ BEFUND benannt statt nachgezogen, dieselbe Korrektur wie bei gueltig): vier neue Namen ohne PROBEN-Deklarationsform aus der zweiten ADR (Ende Vorlagen-Format) — trust-basistemplate-signatur.test.js#Basis:…/#1b: exakter Inhalt → verifiziert, vor-umzug-a4-standard-vorlagen.test.js#[…immer…]/#[…Rot-Beweis Ende-zu-Ende…]. ECHT gemessen (P.waechterOhneProbe()), nicht angenommen.  // 426 → 431 (17.09.2026, U2-ADR-NNN/NNN2, ↑ BEFUND benannt statt nachgezogen): fünf neue Namen ohne PROBEN-Deklarationsform — zwei eigene neue Titel (tests/rechtsraum-modul-schema-bauplan.test.js) und drei erstmals zitierte Bestandstitel (pv-ziffer-27.test.js, vollmacht-generator.test.js, ki-generator.test.js), keiner trägt eine PROBEN-Deklaration. ECHT gemessen (P.waechterOhneProbe()), nicht angenommen.  // 425 → 426 (17.09.2026, U2-ADR-354 im Text): die Ab-Werk-Gegenprobe in tests/c2-weitere-bereiche-template-verzeichnis.test.js ist ein neuer Testtitel mit konkretem erwartetem Zustand, wie die übrigen C2-Titel ohne PROBEN-Deklaration.  // 402 → 404 (16.09.2026, U2-ADR-411 WebDAV-Ordner und Wiederanlauf, gemessen): ↑ BEFUND benannt: ein Titel weg, drei neue ohne PROBEN-Deklaration, s. OHNE_PROBEN_DEKLARATION.  // 399 → 402 (16.09.2026, U2-ADR-411 Bau je Version, auf v716 gemessen): ↑ BEFUND benannt: drei Proben ohne PROBEN-Deklaration; Grund in OHNE_PROBEN_DEKLARATION.  // 396 → 399 (16.09.2026, U2-ADR-289 Entscheidung 2, nach Rebase auf v714 neu gemessen): ↑ BEFUND benannt: dieselben drei Rot-Beweise ohne PROBEN-Deklaration; Grund in OHNE_PROBEN_DEKLARATION.  // 371 → 378 (16.09.2026, U2-ADR-400-Nachtrag, Yellow-Button-Zeichen): ↑ BEFUND benannt statt nachgezogen: dieselben sieben neuen Testtitel, keiner trägt die PROBEN-Deklarationsform von B-1 — s. OHNE_PROBEN_DEKLARATION oben. 363 → 371 (15.09.2026, U2-ADR-414, ↑ BEFUND benannt statt nachgezogen): acht neu gebundene Testtitel ohne PROBEN-Deklarationsform, namentlich in OHNE_PROBEN_DEKLARATION. 357 → 363 (15.09.2026, U2-ADR-413 Vorführung): ↑ BEFUND benannt statt nachgezogen: die sechs neuen Testtitel aus tests/vorfuehrung-showcase.test.js, keiner trägt die PROBEN-Deklarationsform von B-1 — s. OHNE_PROBEN_DEKLARATION oben. ECHT gemessen, nicht angenommen. 342 → 357 (13.09.2026, U2-ADR-409/411, ↑ BEFUND benannt statt nachgezogen): fünfzehn neue Namen aus den fünfzehn `pruefung:`-Zeilen von U2-ADR-411, alle distinkt, keiner trägt eine PROBEN-Deklarationsform (s. OHNE_PROBEN_DEKLARATION oben); U2-ADR-409 bindet nichts. ECHT gemessen (P.waechterOhneProbe()), nicht angenommen. 341 → 342 (13.09.2026, U2-ADR-410, ↑ BEFUND benannt statt nachgezogen): EIN neuer Testtitel (s. OHNE_PROBEN_DEKLARATION oben) — der zweite `pruefung:`-Verweis der Klausel bindet auf einen bereits bekannten Namen (tests/paritaet-kern-lese.test.js), zählt hier darum nicht doppelt, s. `fundstellen` daneben. ECHT gemessen, nicht angenommen. Nachtrag desselben Tages (+1, jetzt 12): der Markenton wird bei fehlendem Kontrast ABGEWIESEN statt abgedunkelt — die Abweisung lief sonst über `--salbei-dunkel` ins Leere (E2E-Fund `marke-e2e-abnahme`); die helle Marke bekam dafür eine eigene, benannte Probe. 329 → 340 (13.09.2026, U2-ADR-408, ↑ BEFUND benannt statt nachgezogen): dieselben elf neuen Testtitel wie bei `gueltig`, keiner trägt die PROBEN-Deklarationsform von B-1 — s. OHNE_PROBEN_DEKLARATION oben. ECHT gemessen, nicht angenommen. 328 → 329 (12.09.2026, „die pauschale file://-Flagge weicht der Probe", ↑ BEFUND benannt statt nachgezogen): der neue Testtitel aus dem ADR-244-Nachtrag trägt keine PROBEN-Deklarationsform von B-1 — s. OHNE_PROBEN_DEKLARATION oben. ECHT gemessen, nicht angenommen. 324 → 328 (10.09.2026, „Dateinamen-Reichweite nachträglich automatisiert", ↑ BEFUND benannt statt nachgezogen): dieselben vier neuen Testtitel wie bei `gueltig`, keine trägt die PROBEN-Deklarationsform von B-1 — s. OHNE_PROBEN_DEKLARATION oben. ECHT gemessen, nicht angenommen. 320 → 324 (10.09.2026, „die Lese-App bekommt Branding", ↑ BEFUND benannt statt nachgezogen): dieselben vier neuen Testtitel wie bei `gueltig`, keine trägt die PROBEN-Deklarationsform von B-1 — s. OHNE_PROBEN_DEKLARATION oben. ECHT gemessen, nicht angenommen. 309 → 320 (10.09.2026, „White Label bis ins PDF", ↑ BEFUND benannt statt nachgezogen): dieselben elf neuen Testtitel wie bei `gueltig`, keine trägt die PROBEN-Deklarationsform von B-1 — s. OHNE_PROBEN_DEKLARATION oben. ECHT gemessen, nicht angenommen. 304 → 309 (07.09.2026, C2/U2-ADR-354, ↑ BEFUND benannt statt nachgezogen): dieselben fünf neuen Testtitel wie bei `gueltig`, keine trägt die PROBEN-Deklarationsform von B-1 — s. OHNE_PROBEN_DEKLARATION oben. ECHT gemessen, nicht angenommen  // 404 → 425 (16.09.2026, U2-ADR-416 Sprachmodule mit jeder Version, nach Rebase auf 291cfe01): ↑ BEFUND benannt: 21 Proben an Werkzeug und Kern ohne PROBEN-Deklarationsform, s. Liste oben.
  // 52 → 53 (06.08.2026, A110 Stufe 2): eine neue `pruefung:`-Zeile (U2-ADR-040-Nachtrag 4b).
  // 53 → 54 (09.08.2026, N2 Zug 1/5): eine neue `pruefung:`-Zeile (U2-ADR-105 Stück 2).
  // 54 → 55 (09.08.2026, N4 Zug 4): eine neue `pruefung:`-Zeile (U2-ADR-126).
  // 55 → 56 (09.08.2026, N5 Zug 4): eine neue `pruefung:`-Zeile (U2-ADR-127).
  // 56 → 57 (09.08.2026, Sensibel-Architektur Zug 1+3): eine neue `pruefung:`-Zeile (U2-ADR-128).
  // 57 → 58 (10.08.2026, K8 Zug 3): eine neue `pruefung:`-Zeile (U2-ADR-131).
  // 58 → 60 (30.08.2026, U2-ADR-101, zweite Klausel): zwei neue `pruefung:`-Zeilen.
  // 60 → 64 (31.08.2026, U2-ADR-184, Sub-Depot-Klick-Freeze): vier neue `pruefung:`-Zeilen
  // (die dritte Klausel bindet erneut an denselben Test wie die zweite — zählt als Zeile
  // trotzdem eigenständig, s. Kommentar an `gueltig` oben).
  // 64 → 73 (01.09.2026, U2-ADR-185): neun neue Fundstellen, keiner der neun Titel doppelt
  // referenziert (kein Unterschied zu den Namen diesmal) — seit U2-ADR-226 durch die Klasse-A-
  // Prüfung selbst gehalten, nicht mehr nur behauptet.
  // REBASE 01.09.2026: dreizehn weitere Fundstellen aus der ursprünglich eigenständigen
  // U2-ADR-190/197-Zählung dieses Zweigs (inkl. einer für den U2-ADR-190-Nachtrag
  // clients.claim()). Wert NACH dem vollen Rebase real gemessen.
  // MESSUNG 01.09.2026 (echter Landepunkt, s. gueltig oben): 104 → 117.
  // 117 → 121 (02.09.2026, U2-ADR-206): vier neue Fundstellen, kein Titel doppelt referenziert (seit U2-ADR-226 durch die Klasse-A-Prüfung selbst gehalten, nicht mehr nur behauptet).
  // 121 → 122 (02.09.2026, U2-ADR-202, Rebase auf 60328d3): eine neue Fundstelle.
  // 122 → 125 (02.09.2026, U2-ADR-207, Rebase auf b7cdac6): drei neue Fundstellen (alle drei
  // Konformität-Blöcke dieser ADR tragen keine PROBEN-Deklarationsform) — auch die zwei, deren
  // NAME schon anderswo (U2-ADR-188/189) genannt ist, zählen hier je einmal zusätzlich. Wert
  // unten gegen den echten Lauf gemessen.
  // 125 → 128 (02.09.2026, Rebase auf 8857393, U2-ADR-193 + U2-ADR-199): drei neue
  // Fundstellen, keine davon ein bereits woanders genannter Name — Namen und Fundstellen
  // steigen darum GEMEINSAM um 3 (s. ohneDeklaration oben).
  // 128 → 133 (02.09.2026, u2-kanon-Seite, U2-ADR-209): fünf neue Fundstellen — alle fünf
  // `pruefung:`-Zeilen tragen keine PROBEN-Deklarationsform, auch die zweite Zeile auf „volles
  // Szenario" (bereits im ersten Block genannt) zählt hier zusätzlich.
  // 128 → 132 (02.09.2026, dieser Zweig, VOR dem zweiten Rebase, U2-ADR-208): vier neue
  // Fundstellen, kein Titel doppelt referenziert (seit U2-ADR-226 durch die Klasse-A-Prüfung selbst gehalten, nicht mehr nur behauptet).
  // 133/132 → 137 (02.09.2026, zweiter Rebase auf f7f6417/v498): 128 + 5 (U2-ADR-209) + 4
  // (U2-ADR-208), zwei disjunkte Mengen. Gegen den echten Lauf gemessen, nicht aus 133+4
  // angenommen.
  // 137 → 143 (02.09.2026, Rebase auf 657f6d6, U2-ADR-211, Sicherungsstand bekannt): sechs neue
  // Fundstellen — alle sechs `pruefung:`-Zeilen binden auf sechs VERSCHIEDENE, neue Namen (keine
  // Wiederverwendung eines bereits genannten Titels), auf die bereits gemergte 137er-Basis
  // (208+209). Gegen den echten Lauf NACH dem vollständigen Rebase gemessen, nicht aus 137+6
  // angenommen.
  // 143 → 145 (02.09.2026, U2-ADR-201, Zug 1 Betreuung, Rebase auf 39683c7/v500): zwei neue
  // Fundstellen (Betreuerbestellung, betreuter Erwachsener), kein Titel doppelt referenziert (seit U2-ADR-226 durch die Klasse-A-Prüfung selbst gehalten, nicht mehr nur behauptet).
  // 145 → 147 (02.09.2026, U2-ADR-201, Zug 1 Kinder, Commit 2 von zwei, Rebase auf 39683c7/v500):
  // zwei neue Fundstellen (Pflegekind, Sub-Depot-Abschluss), kein Titel doppelt referenziert (seit U2-ADR-226 durch die Klasse-A-Prüfung selbst gehalten, nicht mehr nur behauptet).
  // 143 → 150 (02.09.2026, dieser Zweig, VOR dem Rebase auf f1cdb0e, U2-ADR-212): sieben neue
  // Fundstellen — alle sieben `pruefung:`-Zeilen binden auf sieben VERSCHIEDENE, neue Namen
  // (keine Wiederverwendung), auf denselben v500-Bestand (143).
  // REBASE auf f1cdb0e (02.09.2026, hat U2-ADR-201 vor diesem Zweig gelandet): 143 + 4
  // (U2-ADR-201) + 7 (U2-ADR-212), zwei disjunkte Mengen. Gegen den echten Lauf gemessen, nicht
  // aus 147+7 angenommen.
  // 143 → 153 (02.09.2026, Fast-Forward auf 39683c7, dieser Zweig, U2-ADR-214): zehn neue
  // Fundstellen — alle zehn `pruefung:`-Zeilen binden auf zehn VERSCHIEDENE, neue Namen (keine
  // Wiederverwendung eines bereits genannten Titels). Gegen den echten Lauf gemessen, nicht aus
  // 143+10 angenommen.
  // REBASE-MERGE auf 767fe70/v501 (02.09.2026): 154 (u2-kanon-Seite) und 153 (dieser Zweig)
  // zählten beide denselben 143er-Ausgangswert — 143 + 11 (U2-ADR-201+212) + 10 (U2-ADR-214) =
  // 164, zwei disjunkte Mengen. Nach dem vollständigen Rebase real gemessen, nicht aus 154+10
  // oder 153+11 angenommen.
  // 164 → 166 (02.09.2026, U2-ADR-213, PBKDF2 statt Argon2id, Rebase auf 8f5bb24/v501-
  // Wurzelauslieferung): zwei neue Fundstellen, zwei verschiedene, neue Namen — Namen und
  // Fundstellen steigen darum GEMEINSAM um 2, auf die bereits gemergte 164er-Basis.
  // 164 → 165 (02.09.2026, U2-ADR-221): eine neue Fundstelle, derselbe neue Name, keine
  // Wiederverwendung eines bereits genannten Titels.
  // REBASE-MERGE auf 1a4174f (02.09.2026): 166 (u2-kanon-Seite, U2-ADR-213) und 165 (dieser
  // Zweig, U2-ADR-221) zählten beide denselben 164er-Ausgangswert — 164 + 2 + 1 = 167, disjunkte
  // Fundstellen. Gegen den echten Lauf gemessen, nicht aus 166+1 oder 165+2 angenommen.
  // 167 → 168 (02.09.2026, U2-ADR-223, Rebase auf origin/u2-kanon/251d04d): eine neue
  // Fundstelle, ein neuer Name — beide steigen GEMEINSAM um 1, auf die bereits gemergte
  // 167er-Basis.
  // 172 → 175 (02.09.2026, U2-ADR-222, leeres Depot ist keine Sicherung, Cherry-Pick auf
  // landung-218): drei neue Fundstellen, drei neue Namen (PS11-1/PS11-2/PS11-3, je genau einmal
  // referenziert) — Namen und Fundstellen steigen darum GEMEINSAM um 3, auf die bereits gemergte
  // 172er-Basis.
  // 175 → 176 (03.09.2026, U2-ADR-224, Cherry-Pick auf u2-adr-222-auf-222/aabb3d4): EINE neue
  // Fundstelle (U2-ADR-224). Gemessen NACH dem Cherry-Pick.
  // REBASE-MERGE auf b824ec9e (03.09.2026): 176 (u2-kanon-Seite, U2-ADR-224, eine Fundstelle) und
  // 178 (dieser Zweig, U2-ADR-215, drei Fundstellen) zählten beide denselben 175er-Ausgangswert —
  // 175 + 1 (U2-ADR-224) + 3 (U2-ADR-215) = 179, disjunkte Fundstellen. Gegen
  // `pruefstand-bindung.js` NACH dem vollständigen Rebase gemessen, nicht aus 176+3 oder 178+1
  // angenommen.
  // 179 → 181 (03.09.2026, U2-ADR-225): zwei neue Fundstellen.
  // 181 → 186 (03.09.2026, U2-ADR-226, dieser Zweig): dieselben fünf neuen Namen aus
  // `ohneDeklaration` oben, je genau einmal referenziert — Namen und Fundstellen steigen
  // GEMEINSAM um 5.
  // 186 → 190 (03.09.2026, U2-ADR-226, dieser Zweig): dieselben vier neuen Namen, je genau
  // einmal referenziert — Namen und Fundstellen steigen GEMEINSAM um 4.
  // 190 → 186 (03.09.2026, Speicher-Modell Stück 3, dieser Zweig): fünf Namen weg (s.
  // ohneDeklaration oben), aber nur vier Fundstellen weniger — Block 3 der U2-ADR-212-Klauseln
  // zeigte vorher auf ZWEI eigene Namen (PS10-3, PS10-4), zeigt jetzt auf EINEN bereits
  // bestehenden (PS10-1, der schon eine eigene Fundstelle in Block 1 hatte) — Namen und
  // Fundstellen steigen/sinken hier NICHT im Gleichlauf, wie der Kommentar oben an dieser Zeile
  // selbst warnt. Gegen `pruefstand-bindung.js` nach dem eigenen Bau gemessen, nicht aus 190-5
  // angenommen.
  // 186 → 189 (03.09.2026, U2-ADR-220, dieser Zweig): dieselben drei neuen Namen aus
  // ohneDeklaration oben, je genau einmal referenziert — Namen und Fundstellen steigen GEMEINSAM
  // um 3.
  // 189 → 192 (03.09.2026, U2-ADR-219, Nachbau dieser Zweig): dieselben drei neuen Namen aus
  // ohneDeklaration oben (PS4-4/PS4-6/[Block5]), je genau einmal referenziert — Namen und
  // Fundstellen steigen GEMEINSAM um 3.
  // 192 → 194 (03.09.2026, U2-ADR-227, Signierungs-Automatisierung Zug 1, u2-kanon-Seite):
  // dieselben zwei neuen Namen aus ohneDeklaration oben, je genau einmal referenziert.
  // 192 → 198 (03.09.2026, U2-ADR-228, dieser Zweig, VOR dem Rebase auf U2-ADR-227 gemessen):
  // dieselben sechs neuen Namen aus ohneDeklaration oben (Suite-Dateien-Serie), je genau einmal
  // referenziert. Auf derselben 192er-Basis, unabhängig von der Zeile darüber gezählt.
  // REBASE-MERGE auf 7bf135d1 (03.09.2026): Namen und Fundstellen steigen GEMEINSAM, wie beide
  // Seiten schon einzeln festhalten — 192 + 2 + 6 = 200, kongruent mit ohneDeklaration oben
  // (184 + 2 + 6 = 192, macht 8 neue Namen à 1 Fundstelle = 192 + 8 = 200). Gegen den Testlauf
  // NACH dem vollständigen Rebase gemessen, nicht aus 194+6 oder 198+2 angenommen.
  // 200 → 202 (03.09.2026, U2-ADR-229, v1-Dokumente-Audit, u2-kanon-Seite): dieselben zwei neuen
  // Namen aus ohneDeklaration oben, je genau einmal referenziert — Namen und Fundstellen steigen
  // GEMEINSAM um 2.
  // 202 → 203 (03.09.2026, U2-ADR-231, u2-kanon-Seite): eine neue Fundstelle (Test 4).
  // 203 → 205 (03.09.2026, U2-ADR-235, u2-kanon-Seite): dieselben zwei neuen Namen aus
  // ohneDeklaration oben — Namen und Fundstellen steigen GEMEINSAM um 2.
  // 205 → 207 (03.09.2026, U2-ADR-237, u2-kanon-Seite): dieselben drei neuen, minus eine alte
  // Namen aus ohneDeklaration oben — Namen und Fundstellen steigen GEMEINSAM um 2 (3 - 1 = 2).
  // Vier disjunkte Fundstellen seit dem gemeinsamen 202er-Stand, alle auf u2-kanon-Seite:
  // 231(+1), 235(+2), 237(+2 netto) = +5, macht 207 auf dieser Seite, OHNE U2-ADR-230.
  // 200 → 203 (03.09.2026, U2-ADR-230, dieser Zweig): dieselben drei neuen Namen aus
  // ohneDeklaration oben — Namen und Fundstellen steigen GEMEINSAM um 3, auf derselben
  // 200er-Basis wie U2-ADR-229.
  // REBASE-MERGE auf 4c448412 (03.09.2026, SECHSTES Mal derselbe Fall): dieser Zweig zählte
  // zuletzt 208 (202 + 230:+3, 231:+1, 235:+2), u2-kanon zählt nativ 207 (202 + 231:+1, 235:+2,
  // 237:+2). Gemeinsam: 231(+1), 235(+2). Disjunkt: 230(+3, nur dieser Zweig), 237(+2, nur
  // u2-kanon). Macht 202 + 3(gemeinsam) + 3(230) + 2(237) = 210, nicht 207 und nicht 208 —
  // kongruent mit ohneDeklaration oben (202 + 8 = 210). Gegen den Testlauf NACH dem
  // vollständigen Rebase gemessen, nicht aus 207 oder 208 angenommen.
  // 210 → 213 (03.09.2026, U2-ADR-241, „Verlustwege", dieser Zweig, Rebase auf
  // 283727e1): dieselben drei neuen Namen aus ohneDeklaration oben, je genau einmal
  // referenziert, auf der bereits gemergten 210er-Basis oben drauf — Namen und Fundstellen
  // steigen GEMEINSAM um 3.
  // 213 → 216 (03.09.2026, U2-ADR-232, eines verwaisten Commits, Cherry-Pick auf
  // origin/u2-kanon): dieselben drei neuen Namen aus ohneDeklaration oben, je genau einmal
  // referenziert — Namen und Fundstellen steigen GEMEINSAM um 3.
  // 216 → 219 (04.09.2026, U2-ADR-245): drei neue, disjunkte Fundstellen (s.
  // gueltig oben) — keine trifft einen bereits gelisteten Namen doppelt.
  // 219 → 222 (04.09.2026, REBASE-MERGE auf 9b6d5347, U2-ADR-244, dieser Zweig): drei weitere,
  // disjunkte Fundstellen (dieselben drei neuen Namen aus gueltig oben) — beide (245, 244)
  // zweigten vom selben 216er-Stand ab.
  // 222 → 225 (04.09.2026, U2-ADR-248, eigener Zweig ab a84e8319): drei neue
  // Fundstellen (alle drei neuen `pruefung:`-Zeilen aus gueltig oben) — auch die, die auf die
  // bereits gezählte Äquivalenzprobe bindet, zählt hier als EIGENE Fundstelle (Namen ≠
  // Fundstellen, s. Kommentar oben an der Liste).
  // 225 → 231 (04.09.2026, REBASE-MERGE auf c2261621, U2-ADR-249, „Sperrposten 1 —
  // .vdkey-Allowlist", dieser Zweig): sechs weitere `pruefung:`-Fundstellen, aber nur fünf neue
  // NAMEN (s. ohneDeklaration oben) — eine der sechs (`[Klasse-A] W-Hüllenschicht: das echte Repo
  // ist vollständig propagiert`) war bereits vorher referenziert (U2-ADR-218) und trägt darum
  // keinen neuen Namen, wohl aber eine weitere Fundstelle. Namen (+5) und Fundstellen (+6) steigen
  // darum NICHT mehr gemeinsam, zum ersten Mal in dieser Kette — Mehrfachbindung ist der Normalfall
  // (s. U2-ADR-226-Gegenprobe), kein Fund.
  // 231 → 232 (04.09.2026, U2-ADR-266): dieselbe eine neue Fundstelle wie in ohneDeklaration oben,
  // genau einmal referenziert — Namen und Fundstellen steigen hier gemeinsam um 1.
  // 232 → 245 (04.09.2026, REBASE auf 39372460, U2-ADR-262, „Handkopien von
  // Kern-Konstanten bekommen einen Wächter", eigener Zweig ab 8292b457): dreizehn weitere
  // `pruefung:`-Fundstellen, alle dreizehn zugleich neue NAMEN (s. ohneDeklaration oben) — Namen
  // und Fundstellen steigen hier wieder GEMEINSAM um 13, keine Mehrfachbindung in dieser Charge.
  // 245 → 246 (05.09.2026, REBASE auf 622774d7, U2-ADR-195 Nachtrag [A553], dieser Zweig ab
  // 39372460): eine neue Fundstelle, bindet aber auf eine bereits referenzierte Probe
  // (`tests/pre-depot-en-sync.test.js#[Anlassfall] der echte Bestand: 0 Abweichungen zwischen
  // PRE_DEPOT_EN und dem EN-Modul`, s. Zeile 205 derselben ADR-Datei) — trägt darum keinen neuen
  // Namen (ohneDeklaration bleibt bei 235, echt gemessen gegen 622774d7, unverändert), wohl aber
  // eine weitere Fundstelle. Mehrfachbindung ist der Normalfall (s. 225 → 231 oben), kein Fund.
  // Gegen `pruefstand-bindung.js` in einem eigenen Worktree auf origin/u2-kanon
  // (622774d7) NACH dem vollständigen Rebase gemessen (245 echt bestätigt, identisch zum
  // vorherigen Zwischenstand 1f06067b), nicht aus 245+1 angenommen.
  // 246 → 247 (05.09.2026, U2-ADR-275, Rebase auf f7e5b052): dieselbe eine neue Fundstelle wie
  // in gueltig oben, genau einmal referenziert, auf der bereits gelandeten 246er-Basis (a2s
  // U2-ADR-195-Nachtrag) oben drauf.
  // 247 → 248 (05.09.2026, U2-ADR-274, dieser Zweig, Commit 2): dieselbe eine neue Fundstelle
  // wie in gueltig oben, genau einmal referenziert.
  // 232 → 235 (05.09.2026, REBASE-MERGE auf 39372460, U2-ADR-263, PDF-Schriftdeckung): dieselben
  // drei neuen Namen, als Fundstellen — beide (266, 263) zweigten vom selben 231er-Stand ab.
  // 245/235 → 248 (05.09.2026, REBASE-MERGE auf e097a5da): U2-ADR-262 (+13 ab 232) und U2-ADR-263
  // (+3 ab 232) disjunkt: 232+13+3=248, nicht 245 und nicht 235. ECHT gegen `pruefstand-bindung.js`
  // NACH dem vollständigen Rebase nachgemessen.
  // REBASE-MERGE auf a93df2a1 (05.09.2026): ECHT gegen `pruefstand-bindung.js` am vollstaendig
  // gemergten Bestand NACH diesem Rebase nachgemessen (nicht aus 247/248 addiert oder angenommen): 250.
  // REBASE-MERGE auf 5e374af4 (05.09.2026, ueber 1cfd9425): ECHT erneut nachgemessen:
  // 251 → 262 (05.09.2026, U2-ADR-289, dieser Zweig): elf neue Fundstellen, je einmal genannt
  // (keiner der elf neuen Testtitel wird von mehr als einer `pruefung:`-Zeile zitiert).
  // 262 → 270 (05.09.2026, U2-ADR-296): acht neue Fundstellen, je einmal genannt.
  // 270 → 281 (05.09.2026, U2-ADR-297): elf neue Fundstellen, je einmal genannt (keiner der elf
  // neuen Testtitel wird von mehr als einer `pruefung:`-Zeile zitiert).
  // 281 → 296 (05.09.2026, U2-ADR-308): fünfzehn neue Fundstellen, je einmal genannt (keiner
  // der fünfzehn neuen Testtitel wird von mehr als einer `pruefung:`-Zeile zitiert).
  // 296 → 298 (05.09.2026, U2-ADR-308-Nachtrag): zwei neue Fundstellen, je einmal genannt.
  // 298 → 310 (06.09.2026, U2-ADR-306): zwölf neue Fundstellen, je einmal genannt (zwei der
  // vierzehn neuen [U2-ADR-306]-Testtitel tragen bereits eine Deklaration und zählen nicht mit).
  // 310 → 313 (07.09.2026, U2-ADR-346 §12, dieser Zweig): dieselben drei neuen Namen, je einmal
  // referenziert (keine Mehrfachnennung über ADRs hinweg). ECHT gegen `P.waechterOhneProbe()`
  // gemessen, nicht aus 310+3 angenommen.
  // 310 → 312 (07.09.2026, U2-ADR-344 §10, /`0a`-Nachtrag): zwei neue Fundstellen (die
  // beiden Rot-Beweise), je einmal genannt — die dritte neue Zeile trägt bereits eine PROBEN-
  // Deklaration und zählt hier nicht mit.
  // 390 → 406 (16.09.2026, U2-ADR-415): dieselben sechzehn neuen Titel als Klausel-Fundstellen, je eine.
  // 406 → 408 (16.09.2026, Nachtrag U2-ADR-415): dieselben zwei als Fundstellen.
  fundstellen:      { wert: 488, richtung: 'sinkt',  was: 'dieselben, als Klausel-Fundstellen' },  // 487 → 488 (22.09.2026, Kern-Fix Umschlagfeld-Verlust: die eine neue pruefung:-Zeile auf [Prüfstein·Speichern], dieselbe Fundstelle wie bei gueltig/ohneDeklaration). ECHT gemessen.  // 484 → 487 (22.09.2026, U2-ADR-430: die Klausel-Fundstellen der zwei Prüfstein-Titel, Schuld benannt); davor: 480 → 484 (21.09.2026, Gerüst-Schnitt S3: dieselben vier, je eine Fundstelle); davor: 451 → 480 (19.09.2026, Generator-Schlüssel-ADR + MIG3: 28 Wächter-Titel ohne PROBEN-Form, s. OHNE_PROBEN_DEKLARATION; Schuld benannt, kein Fix in diesem Zug)  // 447 → 451 (17.09.2026, U2-ADR-NNN3): dieselben vier neuen Namen, je genau eine `pruefung:`-Zeile — 1:1, kein Mehrfachtreffer.  // 443 → 447 (17.09.2026, dieselbe Korrektur wie bei gueltig): die vier Fundstellen der zweiten ADR (Ende Vorlagen-Format), erstmals gezählt, sobald die ADR im Arbeitsbaum lag.  // 438 → 443 (17.09.2026, U2-ADR-NNN/NNN2): dieselben fünf neuen Namen, je genau eine `pruefung:`-Zeile — 1:1, kein Mehrfachtreffer.  // 437 → 438 (17.09.2026, U2-ADR-354 im Text): die neue pruefung:-Zeile auf die Ab-Werk-Gegenprobe.  // 414 → 416 (16.09.2026, U2-ADR-411 WebDAV-Ordner und Wiederanlauf, gemessen): dieselben Proben wie bei ohneDeklaration, je einmal genannt.  // 411 → 414 (16.09.2026, U2-ADR-411 Bau je Version, auf v716 gemessen): dieselben drei Proben, als Klausel-Fundstellen.  // 408 → 411 (16.09.2026, U2-ADR-289 Entscheidung 2, nach Rebase auf v714 neu gemessen): dieselben drei Rot-Beweise, als Klausel-Fundstellen.  // 383 → 390 (16.09.2026, U2-ADR-400-Nachtrag, Yellow-Button-Zeichen): sieben neue `pruefung:`-Zeilen, jede bindet auf genau einen der sieben neuen Testtitel — 1:1. 375 → 383 (15.09.2026, U2-ADR-414): dieselben acht Titel als Klausel-Fundstellen. 369 → 375 (15.09.2026, U2-ADR-413 Vorführung): sechs neue `pruefung:`-Zeilen, jede bindet auf genau einen der sechs neuen Testtitel — 1:1, kein Mehrfachtreffer. ECHT gemessen, nicht angenommen. 354 → 369 (13.09.2026, U2-ADR-409/411): fünfzehn neue Fundstellen, je genau eine `pruefung:`-Zeile aus U2-ADR-411 auf je einen der fünfzehn neuen Namen — keine Mehrfachnennung, darum steigen Namen und Fundstellen GEMEINSAM um 15. ECHT gemessen (P.waechterOhneProbe().length), nicht angenommen. 352 → 354 (13.09.2026, U2-ADR-410, ZVR-Abschrift): eine neue Klausel mit zwei `pruefung:`-Zeilen — eine bindet auf einen BRANDNEUEN Testtitel (tests/zvr-abschrift-felder.test.js#[ZVR-Abschrift] die drei Felder stehen im Bürgermodul, mit ihren Typen), die andere auf einen bereits ohne-Probe geführten, bestehenden Testtitel (tests/paritaet-kern-lese.test.js#gemeinsame Listen haben dieselben Unterfelder) — Fundstellen zählt beide (dieselbe Regel wie „Z2-Storage-Grenze 2×" oben), Namen (ohneDeklaration) nur den ersten. ECHT gemessen, nicht angenommen. Nachtrag desselben Tages (+1, jetzt 12): eine zwölfte `pruefung:`-Zeile für die eigene Probe der hellen Marke, 1:1 gebunden. 340 → 351 (13.09.2026, U2-ADR-408): elf neue `pruefung:`-Zeilen, jede bindet auf genau einen der elf neuen Testtitel — 1:1, kein Mehrfachtreffer. ECHT gemessen, nicht angenommen. 339 → 340 (12.09.2026, „die pauschale file://-Flagge weicht der Probe"): eine neue `pruefung:`-Zeile bindet auf genau den einen neuen Testtitel — 1:1, kein Mehrfachtreffer. ECHT gemessen, nicht angenommen. 335 → 339 (10.09.2026, „Dateinamen-Reichweite nachträglich automatisiert", ↑ BEFUND benannt statt nachgezogen): vier neue `pruefung:`-Zeilen, jede bindet auf genau einen der vier neuen Testtitel — 1:1, kein Mehrfachtreffer. ECHT gemessen, nicht angenommen. 331 → 335 (10.09.2026, „die Lese-App bekommt Branding", ↑ BEFUND benannt statt nachgezogen): vier neue `pruefung:`-Zeilen, jede bindet auf genau einen der vier neuen Testtitel — 1:1, kein Mehrfachtreffer. ECHT gemessen, nicht angenommen. 320 → 331 (10.09.2026, „White Label bis ins PDF", ↑ BEFUND benannt statt nachgezogen): elf neue `pruefung:`-Zeilen, jede bindet auf genau einen der elf neuen Testtitel — 1:1, kein Mehrfachtreffer. ECHT gemessen, nicht angenommen. 315 → 320 (07.09.2026, C2/U2-ADR-354, ↑ BEFUND benannt statt nachgezogen): fünf neue `pruefung:`-Zeilen, jede bindet auf genau einen der fünf neuen Testtitel — 1:1, kein Mehrfachtreffer. ECHT gemessen, nicht angenommen  // 416 → 437 (16.09.2026, U2-ADR-416 Sprachmodule mit jeder Version, nach Rebase auf 291cfe01): dieselben 21 Proben als Fundstellen.
  // 14 → 19 am 05.08.2026 (Tranche 1): 5 der 13 neuen sind Konstruktions-Form UND
  // außerhalb der Reichweite (ADR-094, 040, 027, 062-N-Passwort, 062-N-Ort — je eine
  // dateieigene Diskriminante, die der Instrumentierer nicht als Kern-Aufrufer erreicht).
  // 19 → 23 (Nachtlauf 2, Tranche 2): 4 der 10 neuen sind ebenfalls außerhalb der Reichweite
  // — die beiden Schema-Guard-Titel (Diskriminante ist eine externe Fixtur-Migrationskette,
  // kein Kern-Aufrufer) und die beiden Teilen-Guard-Titel (direkte `_teilenBevorzugt()`-
  // Assertion ohne Kern-Aufrufer-Indirektion).
  // 23 → 24 (09.08.2026, N2 Zug 1/5): tests/n2-zug1-ips-nilknown-waechter.test.js prüft direkt
  // inline (`ladeKern()` + `V.fhirIpsBundle(...)` im Testkörper), ohne eine eigene, dateilokale
  // `function <name>`-Diskriminante — derselbe strukturelle Grund wie die vier bereits gelisteten
  // Schema-/Teilen-Guard-Titel oben (der Instrumentierer instrumentiert `function <name>` in der
  // Testdatei; ohne eine solche Funktion greift er nicht). Der eigene Regel-18-Beleg dieses Zugs
  // läuft stattdessen über einen echten Kindprozess-Mutanten
  // (tools/_n2-zug1-nilknown-probe.js, rot⇄grün real gefahren) — außerhalb dieses Mechanismus,
  // nicht ungeprüft.
  // 24 → 25 (09.08.2026, N4 Zug 4, U2-ADR-126): tests/w3-schema-sensibel-pruefen.test.js prüft
  // direkt inline (`ladeKern()` + `auswertung(V)` im Testkörper), ohne eine eigene, dateilokale
  // `function <name>`-Diskriminante — derselbe strukturelle Grund wie die bereits gelisteten
  // Fälle oben. Der eigene Regel-18-Beleg dieses Zugs läuft über den bestehenden
  // W-3-schema-sensibel-Registereintrag (tools/waechter-register.js, aus N1, unverändert),
  // außerhalb dieses Mechanismus, nicht ungeprüft.
  // 25 → 26 (09.08.2026, N5 Zug 4, U2-ADR-127): tests/muster-b-render-scroll-fokus.test.js prüft
  // direkt inline (`ladeKern()` + `V.renderContent()` im Testkörper), ohne eine eigene, dateilokale
  // `function <name>`-Diskriminante — derselbe strukturelle Grund. Der eigene Regel-18-Beleg
  // dieses Zugs läuft über den neuen W-Scroll-Erhalt-Registereintrag
  // (tools/waechter-register.js), außerhalb dieses Mechanismus, nicht ungeprüft.
  // 26 → 27 (09.08.2026, Sensibel-Architektur Zug 1+3, U2-ADR-128): tests/sensibel-listen-
  // unterfeld.test.js prüft direkt inline (ladeKern() + V.vollExportJSON() im Testkörper),
  // ohne eine eigene, dateilokale `function <name>`-Diskriminante — derselbe strukturelle
  // Grund wie U2-ADR-127. Der eigene Regel-18-Beleg läuft im selben Testkörper real
  // (vorher enthalten, nachher nicht), außerhalb dieses Mechanismus, nicht ungeprüft.
  // 27 → 29 (30.08.2026, U2-ADR-101, zweite Klausel): tests/adr-101-blatt3-eingebaute-
  // sicht.test.js prüft direkt inline (`ladeKern()` + `V.renderAkutSituation(...)` im
  // Testkörper), ohne eine eigene, dateilokale `function <name>`-Diskriminante — derselbe
  // strukturelle Grund wie die bereits gelisteten Fälle oben. Beide neuen Bindungen (Haupt-
  // probe + Heben-Trennung) sind betroffen.
  // 29 → 30 (01.09.2026, U2-ADR-185): 'Rückweg "Doch neu anfangen"' ruft den echten Klick-
  // Handler über das DOM-Element (`onclick()`), nicht `_wiedereintrittVerwerfen()` selbst beim
  // Namen — derselbe strukturelle Grund wie die übrigen Einträge dieser Kategorie.
  // REBASE 01.09.2026: weitere ausserhalb-der-Reichweite-Fälle aus der ursprünglich
  // eigenständigen U2-ADR-190/197-Zählung dieses Zweigs (Stufe 3, Rückbau-Klausel, zwei der
  // sechs neuen U2-ADR-197-Namen, die direkt inline gegen erhebe()/Fixture-Argumente prüfen —
  // plus die neue U2-ADR-190-Nachtrag-Bindung clients.claim(), die in tests/e2e/ lebt, kein
  // tests/*.test.js: außerhalb der Reichweite beider Mechanismen, probenDeklarationen() UND
  // der Aufruf-Nachweis-Instrumentierer, s. Begründung an der Fundstelle in
  // OHNE_PROBEN_DEKLARATION oben). Wert NACH dem vollen Rebase real gemessen.
  // MESSUNG 01.09.2026 (echter Landepunkt, s. gueltig oben): 42 → 49.
  // 49 → 51 (02.09.2026, U2-ADR-206): zwei der vier neuen Bindungen rufen nur geteilte
  // Modul-Funktionen (execFileSync/pfadEntscheidung), keine dateieigene Diskriminante.
  // 51 → 52 (02.09.2026, U2-ADR-202, Rebase auf 60328d3): die neue Bindung zeigt auf eine
  // zweite, eigenständige tests/e2e/*.spec.js-Datei (Playwright, `expect(`) — dasselbe
  // strukturelle Kriterium wie die clients.claim()-Bindung oben, unabhängig davon erreicht.
  // Derselbe Klassifikator-Fund unabhängig zweimal gemacht (s. Nachtrag in
  // tests/pruefstand-bindung.js — die bereits gelandete Fassung übernommen (via frühere Landung,
  // 60328d3), meine ersatzlos gestrichen).
  // 52 → 53 (02.09.2026, U2-ADR-193): NUR EINE der drei neuen Bindungen ist ausserhalb der
  // Reichweite — 'krisenvorsorgeBedarfQuelle nennt keine überholte Auflage' prüft direkt gegen
  // den geladenen HTML-Text, ohne eine dateieigene Diskriminante aufzurufen. Die anderen beiden
  // ('Zitat und Kommentar nennen denselben Stand', 'gemeinsame Listen haben dieselben
  // Unterfelder') rufen je eine dateieigene/kernnahe Funktion auf — erreichbar. Programmatisch
  // verifiziert (`P.klassifiziereWaechter` gegen genau diese drei Namen einzeln gefahren), nicht
  // angenommen.
  // 53 → 57 (02.09.2026, Rebase auf 77f696b, U2-ADR-208): vier neue Bindungen, alle vier
  // ausserhalb — s. Begründung in OHNE_PROBEN_DEKLARATION (erste Annahme war falsch, direkt
  // gegen ausserhalbReichweite() gemessen statt angenommen). Gegen den echten Lauf nach dem
  // vollen Rebase gemessen, nicht aus 53+4 angenommen — zwei Zweige mit unterschiedlicher
  // Trefferquote (1 von 3 hier, 4 von 4 dort) addieren sich nicht automatisch richtig.
  // 57 → 60 (02.09.2026, Rebase auf 657f6d6, U2-ADR-211): DREI der sechs neuen Bindungen sind
  // ausserhalb der Reichweite — sie rufen `ladeKern({...})` direkt mit eigenen Optionen im
  // Testkörper auf, statt über die dateilokale Diskriminante `frisch()` (der gemeinsame
  // Setup-Helfer in tests/sicherungsstand-bekannt.test.js): 'Depot-Liste: Dateiname bekannt,
  // sicherungsStand fehlt' (braucht showSaveFilePicker), 'ersetzt der Zustands-Wortlaut BEIDE
  // Platzhalter' und 'exportErinnerungVielleichtZeigen() ohne sicherungsStand' (beide brauchen
  // indexedDB:{} für internerSpeicherModus()). Die anderen drei ('Sicherungsstand übersteht
  // Serialisieren→Laden', 'exportErinnerungModell() ohne sicherungsStand', 'markiereUngespeichert()
  // ohne sicherungsStand') rufen `frisch()` im Testkörper auf — erreichbar. Programmatisch
  // verifiziert (`P.klassifiziereWaechter` gegen genau diese sechs Namen gefahren), nicht
  // angenommen. Auf die bereits gemergte 57er-Basis (208+209), nicht aus 56+... übernommen.
  // 60 → 62 (02.09.2026, U2-ADR-201, Zug 1 Betreuung, Rebase auf 39683c7/v500): beide neuen
  // Bindungen zeigen auf dieselbe tests/e2e/persona-betreuung-echte-vertretungswege.spec.js-
  // Datei (Playwright, `expect(`) — dasselbe strukturelle Kriterium wie U2-ADR-202 oben.
  // 62 → 64 (02.09.2026, U2-ADR-201, Zug 1 Kinder, Commit 2 von zwei, Rebase auf 39683c7/v500):
  // beide neuen Bindungen zeigen auf dieselbe tests/e2e/persona-kinder-sorgerecht-subdepot.spec.js-
  // Datei (Playwright, `expect(`) — dasselbe strukturelle Kriterium.
  // 60 → 62 (02.09.2026, dieser Zweig, VOR dem Rebase auf f1cdb0e, U2-ADR-212): NUR ZWEI der sieben neuen
  // Bindungen sind ausserhalb der Reichweite — die beiden in
  // tests/e2e/u2-adr-212-sichern-intern.spec.js ('U2-ADR-212 Rot-Beweis...'/'U2-ADR-212
  // Rundlauf...'), weil ausserhalbReichweite() nur gegen `tests/*.test.js` prüft (erster
  // struktureller Grund, s. Kommentar an der Funktion oben) — ein `.spec.js`-Playwright-Test ist
  // strukturell IMMER ausserhalb, unabhaengig vom Inhalt.
  // NACHTRAG, GEMESSEN statt angenommen: die fünf PS10-*-Bindungen in
  // tests/persistenz-status.test.js gelten dem Mechanismus HEUTE als erreichbar (null) — aber aus
  // einem Grund, der nichts mit einem echten Aufruf zu tun hat. PS10-7·Rot (Mutationsprobe, wie
  // U2-ADR-208) enthält als STRING-LITERAL den Text `function saveKnopfDateiWeg(m) {` (die zu
  // mutierende Quellzeile). `ausserhalbReichweite()`s eigener Scanner (dieselbe einfache
  // Regex-Suche wie `instrumentiere`, s. Kommentar an der Funktion) unterscheidet Quelltext nicht
  // von Zeichenketten — er liest diese Zeile als „hier wird `saveKnopfDateiWeg` dateieigen
  // deklariert" und zählt jeden `V.saveKnopfDateiWeg(...)`-Aufruf IM GANZEN Testfile fortan als
  // Treffer. Strukturell ist `saveKnopfDateiWeg` weiterhin NUR im Kern deklariert, nur über das
  // importierte `V`-Objekt erreichbar — genau der U2-ADR-208-Fall. Direkt geprüft (`node -e` gegen
  // `P.waechterRumpf()`/`P.ausserhalbReichweite()` für jeden der sieben Namen einzeln, `eigene`
  // enthält `saveKnopfDateiWeg` zweimal aus genau dieser Zeile). Nicht selbst „korrigiert" — der
  // Scanner bleibt unverändert (geteilte Infrastruktur, kein Teil dieses Baus), die Zahl unten
  // trägt das gemessene Ergebnis. Wer PS10-7 künftig umschreibt oder entfernt, sollte diese Zahl
  // neu messen, nicht fortschreiben — sie kippt dann vermutlich auf 67 (alle sieben ausserhalb).
  // REBASE auf f1cdb0e (02.09.2026, hat U2-ADR-201 vor diesem Zweig gelandet): 60 + 4
  // (U2-ADR-201, beide Persona-Dateien) + 2 (U2-ADR-212, nur die beiden .spec.js-Bindungen).
  // Gegen den echten Lauf gemessen, nicht aus 64+2 angenommen.
  // 60 → 69 (02.09.2026, Fast-Forward auf 39683c7, dieser Zweig, U2-ADR-214): NEUN der zehn
  // neuen Namen aus tests/testfassung-legen.test.js sind außerhalb der Reichweite — sie rufen
  // ausschließlich `adrBezeichnetSwAenderung`/`swAenderungEntscheidung`, importierte Funktionen
  // aus dem geteilten `tools/testfassung-legen.js`, keine dateieigene Diskriminante. Die zehnte
  // ('ablegungZuruecknehmen nimmt ALLE fünf abgelegten Dateien zurück, nicht nur sw.js') ruft
  // zusätzlich die dateilokale Hilfsfunktion `wegwerfZielMitFuenfBasisDateien()` — erreichbar.
  // Programmatisch verifiziert (`ausserhalbReichweite()` gegen genau diese zehn Namen gefahren),
  // nicht angenommen.
  // REBASE-MERGE auf 767fe70/v501 (02.09.2026): 66 (u2-kanon-Seite, sechs der elf neuen Namen
  // außerhalb) und 69 (dieser Zweig, neun der zehn neuen Namen außerhalb) zählten beide denselben
  // 60er-Ausgangswert — 60 + 6 + 9 = 75, zwei disjunkte Mengen. Nach dem vollständigen Rebase real
  // gegen `ausserhalbReichweite()` gemessen, nicht aus 66+9 oder 69+6 angenommen.
  // 75 → 77 (02.09.2026, U2-ADR-213, PBKDF2 statt Argon2id, Rebase auf 8f5bb24/v501-
  // Wurzelauslieferung): beide neuen Bindungen rufen nur `ladeKern()` und die importierte
  // `ohneKommentareUndStrings()` auf, keine dateilokale Diskriminante — außerhalb der Reichweite,
  // auf die bereits gemergte 75er-Basis. Programmatisch verifiziert, nicht angenommen.
  // 75 → 76 (02.09.2026, U2-ADR-221): die neue Bindung ruft keine dateieigene Diskriminante auf
  // (top-level Testkörper einer .mjs-Datei) — außerhalb der Reichweite, wie die übrigen
  // `.mjs`-Bindungen dieser Datei.
  // REBASE-MERGE auf 1a4174f (02.09.2026): 77 (u2-kanon-Seite, U2-ADR-213) und 76 (dieser Zweig,
  // U2-ADR-221) zählten beide denselben 75er-Ausgangswert — 75 + 2 + 1 = 78, disjunkte Mengen.
  // Gegen `ausserhalbReichweite()` gemessen, nicht aus 77+1 oder 76+2 angenommen.
  // 78 → 79 (02.09.2026, U2-ADR-223, Rebase auf origin/u2-kanon/251d04d): PS10-6 ruft nur
  // `ladeKern()` und liest `V.STRINGS` direkt, keine dateilokale Diskriminante — außerhalb der
  // Reichweite, dieselbe Begründung wie bei den U2-ADR-213-Bindungen, auf die bereits gemergte
  // 78er-Basis.
  // 81 → 84 (02.09.2026, U2-ADR-222, leeres Depot ist keine Sicherung, Cherry-Pick auf
  // landung-218): PS11-1/PS11-2/PS11-3 rufen jeweils nur `ladeKern()` und lesen
  // `V.getData().sicherungsStand`/`V.saveStatusModell()` direkt, keine dateilokale Diskriminante —
  // außerhalb der Reichweite, dieselbe Begründung wie bei PS10-6, auf die bereits gemergte
  // 81er-Basis.
  // 84 → 85 (03.09.2026, U2-ADR-224, Cherry-Pick auf u2-adr-222-auf-222/aabb3d4): EINE neue
  // Konstruktions-Bindung außerhalb der Reichweite. Gemessen NACH dem Cherry-Pick.
  // REBASE-MERGE auf b824ec9e (03.09.2026): 85 (u2-kanon-Seite, U2-ADR-224, eine Bindung) und 87
  // (dieser Zweig, U2-ADR-215, drei Bindungen — schalenBefund() direkt gegen konstruierte
  // Fixture-Objekte, keine dateilokale Diskriminante) zählten beide denselben 84er-Ausgangswert —
  // 84 + 1 (U2-ADR-224) + 3 (U2-ADR-215) = 88, disjunkte Bindungen. Kein neue echte Schuld:
  // `ohneBeleg` bleibt unverändert. Gegen `pruefstand-bindung.js` NACH dem vollständigen Rebase
  // gemessen, nicht aus 85+3 oder 87+1 angenommen.
  // 88 → 90 (03.09.2026, U2-ADR-225): zwei neue Konstruktions-Bindungen außerhalb der Reichweite.
  // 90 → 91 (03.09.2026, U2-ADR-226, dieser Zweig): von den fünf neuen Bindungen (s. `gueltig`)
  // ruft GENAU EINE keine dateieigene Diskriminante — „[U2-102·3] importZeileBereinigt entfernt
  // GENAU die angekündigten Felder, sonst nichts" ruft `importZeileBereinigt` direkt aus dem
  // geteilten Kern (dieselbe Lücke wie bei den übrigen U2-102-Proben, s. Kommentar an
  // OHNE_PROBEN_DEKLARATION oben). Einzeln gegen `ausserhalbReichweite()` geprüft, nicht
  // angenommen: die übrigen vier (U2-102·1, U2-102·4, alle vier K8-Proben) bleiben erreichbar.
  // 91 → 95 (03.09.2026, U2-ADR-226, dieser Zweig): alle vier neuen Bindungen rufen
  // `pruefeKlausel()`/`laufErgebnis()` — importiert aus `tools/adr-konformitaet-pruefen.js`,
  // keine dateieigene Diskriminante in `tests/adr-konformitaet-pruefen.test.js` selbst. Einzeln
  // gegen `ausserhalbReichweite()` geprüft (alle vier bestätigt „ruft keine instrumentierbare
  // dateieigene Funktion"), nicht angenommen.
  // 95 → 98 (03.09.2026, U2-ADR-220, dieser Zweig): PS12-1/PS12-2/PS12-3 rufen jeweils nur
  // `ladeKern()` und lesen `V.STRINGS.dateiNameHinweis`/das Roh-HTML direkt, keine dateilokale
  // Diskriminante — außerhalb der Reichweite, dieselbe Begründung wie bei PS11-1/2/3 oben. Einzeln
  // gegen `ausserhalbReichweite()` geprüft, nicht angenommen.
  // 98 → 101 (03.09.2026, U2-ADR-219, Nachbau dieser Zweig): PS4-4/PS4-6 rufen jeweils nur
  // `ladeKern()` und dann `V.iosInstallHinweisNoetig()`/`V.iosInstallHinweisVielleichtZeigen()`
  // direkt, keine dateilokale Diskriminante — dieselbe Begründung wie bei PS12-1/2/3 oben.
  // [Block5] ruft `tools/wahrhaftigkeit-fristen.js` per `cp.spawnSync()` als externen Unterprozess
  // auf — kein instrumentierbarer In-Prozess-Aufruf überhaupt. Einzeln gegen
  // `ausserhalbReichweite()` geprüft, nicht angenommen.
  // 101 → 102 (03.09.2026, U2-ADR-227, Signierungs-Automatisierung Zug 1, u2-kanon-Seite):
  // „[Klasse-A] W-Hüllenschicht: das echte Repo ist vollständig propagiert" ruft nur
  // `pruefeHuelle()` (importiert aus tools/krypto-block-propagation-pruefen.js), keine
  // dateilokale Diskriminante in tests/krypto-block-propagation.test.js selbst — außerhalb der
  // Reichweite. Die zweite neue Bindung (_signJWS-Drift-Negativprobe) ruft `fixture()`, eine
  // dateilokale Funktion — bleibt erreichbar, zählt hier NICHT mit.
  // 101 → 102 (03.09.2026, U2-ADR-228, dieser Zweig, VOR dem Rebase auf U2-ADR-227 gemessen): NUR
  // die Positivkontrolle „gegen den echten Bestand" — sie prüft mit `>=`/`.includes()` gegen den
  // echten, nicht vollständig im Test aufgezählten Dateibestand, keine einzelne, dateilokal
  // konkrete Diskriminante wie ein `assert.deepEqual` gegen ein festes Array. Die übrigen fünf
  // neuen Bindungen bleiben innerhalb der Reichweite. Auf derselben 101er-Basis, unabhängig von
  // der Zeile darüber gezählt.
  // REBASE-MERGE auf 7bf135d1 (03.09.2026): 101 + 1 (u2-kanon-Seite) + 1 (dieser Zweig) = 103,
  // zwei disjunkte außerhalb-der-Reichweite-Funde. Einzeln gegen `ausserhalbReichweite()` NACH
  // dem vollständigen Rebase geprüft, nicht aus 102+1 angenommen.
  // 103 → 104 (03.09.2026, U2-ADR-229, v1-Dokumente-Audit, u2-kanon-Seite): die Rotmachbarkeits-
  // Probe „[Dateiprüfsumme] Rotmachbarkeit — ein geändertes Byte in der Kopie lässt --check mit
  // Exit 1 abbrechen" ruft `execFileSync('node', [WERKZEUG, …])` — ein externer Unterprozess,
  // keine dateilokale Diskriminante, dieselbe Bauart wie das [Block5]-Beispiel oben. Die zweite
  // neue Bindung (Positivkontrolle des Ist-Zustands) ruft `aktuellerHash()`/`eingecheckterWert()`
  // direkt in-process — bleibt erreichbar, zählt hier NICHT mit. Einzeln gegen
  // `ausserhalbReichweite()` geprüft, nicht angenommen.
  // 103 → 105 (03.09.2026, U2-ADR-230, dieser Zweig, VOR dem Rebase auf U2-ADR-229 gemessen): gegen
  // `klassifiziereWaechter()` direkt gemessen, nicht angenommen. „[PBKDF2·Wächter]
  // PBKDF2_ITERATIONS bleibt der eingefrorene v3-Wert" fällt trotz dateilokaler `pruefeWert`-
  // Diskriminante unter `ausserReichweite` (real gemessen: true) — „[Klasse-A] W-krypto-
  // propagation: das echte Repo ist vollständig propagiert" (vorbestehend, zum ersten Mal von
  // einer ADR-Klausel referenziert) ruft nur `pruefe()`, importiert aus tools/krypto-block-
  // propagation-pruefen.js, keine dateilokale Diskriminante — dieselbe Begründung wie beim
  // Hüllenschicht-Gegenstück (s. 101→102 oben). Die dritte neue Bindung, „[Fach·Wächter]
  // kdf.iterationen…", bleibt erreichbar (`pruefeEintrag` wird direkt aufgerufen) — zählt hier
  // NICHT mit. Auf derselben 103er-Basis, unabhängig von der Zeile darüber gezählt.
  // REBASE-MERGE auf 9e733e7f (03.09.2026): 104 (u2-kanon-Seite, +1) und 105 (dieser Zweig, +2)
  // zählten beide denselben 103er-Ausgangswert — 103 + 1 + 2 = 106, drei disjunkte außerhalb-der-
  // Reichweite-Funde. Gegen `klassifiziereWaechter()` NACH dem vollständigen Rebase gemessen,
  // nicht aus 104+2 oder 105+1 angenommen.
  // 104 → 105 (03.09.2026, U2-ADR-231, u2-kanon-Seite, auf dem 104er-Stand NACH U2-ADR-229 WIE
  // dieser Zweig — aber OHNE U2-ADR-230): Test 4 liegt außerhalb der Reichweite, dieselbe
  // Begründung wie Test 3 (externe Fixtur-Migrationskette als eigentliche Diskriminante).
  // REBASE-MERGE auf 9f2bb152 (03.09.2026): dieser Zweig zählt 104 + 2 (bereits in den 106 oben
  // enthalten) — u2-kanon zählt 104 + 1 = 105. Zwei disjunkte außerhalb-der-Reichweite-Funde auf
  // demselben 104er-Stand, 104 + 2 + 1 = 107, nicht 105 und nicht 106. Gegen
  // `klassifiziereWaechter()` NACH dem vollständigen Rebase gemessen, nicht aus 105 oder 106
  // angenommen.
  // 107 → 109 (03.09.2026, U2-ADR-232, eines verwaisten Commits, Cherry-Pick auf
  // origin/u2-kanon): die beiden neuen Konstruktions-Form-Bindungen rufen `pruefe(...)` aus
  // dem geteilten Modul `tools/git-umgebung-pruefen.js` bzw. `lockstepBefund(...)` — keine
  // dateieigene `function` in der jeweiligen Testdatei selbst, dieselbe Diskriminante-liegt-im-
  // geteilten-Modul-Lage wie oben mehrfach. Gegen `klassifiziereWaechter()` NACH dem eigenen
  // Cherry-Pick gemessen, nicht aus 107+2 angenommen.
  // 109 → 110 (04.09.2026, U2-ADR-245): eine der drei neuen Bindungen ruft
  // keine dateieigene Funktion (die Diskriminante liegt im geteilten Kern, importiert über
  // `ladeKern()`, nicht dateilokal deklariert) — der Rot-Beweis gegen die echte Fixture ohne
  // Flag. Die andere neue Rot-Beweis-Bindung ruft die dateilokale `gueltigesBundle()` und
  // bleibt erreichbar; die dritte (bereits bestehend) ebenso.
  // 110 → 111 (04.09.2026, U2-ADR-248, eigener Zweig ab a84e8319): eine der
  // beiden neuen Bindungen ist ein Playwright-`.spec.js`-Test (tests/e2e/erbschein-
  // vorbereitungsauszug-abnahme.spec.js) — der Instrumentierer arbeitet gegen `tests/*.test.js`-
  // Quelltext, ein Browser-Kontext-Test hat keine dateieigene, node-seitig aufrufbare Funktion.
  // Dieselbe Reichweiten-Grenze wie bei den `.mjs`-Proben oben, hier zum ersten Mal an einem
  // `.spec.js`. Die andere neue Bindung (tests/erbschein-modul-mechanik.test.js) ruft die
  // dateilokale Testfunktion direkt und bleibt erreichbar.
  // 111 → 115 (04.09.2026, REBASE-MERGE auf c2261621, U2-ADR-249, „Sperrposten 1 —
  // .vdkey-Allowlist", dieser Zweig): vier der fünf neuen Namen rufen keine dateieigene Funktion —
  // drei binden auf den geladenen Harnisch (`V.entschluesseleSchluesselJwk`/
  // `V.istGeschuetzteSchluesseldatei`/`T.istGeschuetzteSchluesseldatei`), eine ist der bereits
  // bestehende Testkörper `[Eingang] jede Ablehnung sagt, WAS falsch ist…` (dieselbe Lage). Die
  // fünfte (`istGeschuetzteSchluesseldatei-Drift` in tests/krypto-block-propagation.test.js) ruft
  // die dateieigene `fixture(...)`-Hilfsfunktion und bleibt darum erreichbar — +4, nicht +5, auf
  // der bereits gemergten 111er-Basis oben drauf.
  // 115 → 117 (04.09.2026, REBASE auf 39372460, U2-ADR-262, „Handkopien von
  // Kern-Konstanten bekommen einen Wächter", eigener Zweig ab 8292b457): zwei der dreizehn neuen
  // Namen rufen keine dateieigene Funktion — `pruefeAlle(REPO)`/`pruefeEintrag(...)` sind aus
  // `tools/handkopien-gegen-original-pruefen.js` importiert, nicht dateilokal deklariert. Die
  // übrigen elf rufen dieselben importierten Funktionen zwar auch, aber mit einer dateilokalen
  // Fixture-Konstruktion drumherum (`fixtur(...)`/`aufraeumen(...)`), dieselbe Bauart wie das
  // [Block5]-Beispiel oben — bleiben erreichbar. U2-ADR-266s eigene neue Bindung ist Konstruktions-
  // Form UND erreichbar, verändert diese Zahl nicht (bereits in der 115er-Basis unverändert).
  // 117 → 118 (05.09.2026, U2-ADR-275, Rebase auf f7e5b052): die eine neue Bindung ruft keine
  // dateieigene Funktion — sie vergleicht `V.INSTITUTION_ART_EINGEBAUT` direkt gegen ein
  // eingefrorenes Array-Literal und gegen `V.INSTITUTION_ART`, beides Werte aus dem geladenen
  // Harnisch, kein Aufruf.
  // 115 → 116 (05.09.2026, U2-ADR-263, PDF-Schriftdeckung): NUR EINE der drei neuen Bindungen
  // bleibt außerhalb — die Ende-zu-Ende-Probe liegt in tests/e2e/u2-adr-263-pdf-schriftdeckung.
  // spec.js, keine tests/*.test.js-Datei, strukturell nie erreichbar (derselbe Grund wie bei den
  // `.mjs`-/`.spec.js`-Fällen oben). Die zwei node-test-Proben (Polnisch-Rot-Beweis, Regression)
  // riefen zunächst NICHT dateieigen ab — sie destrukturierten `pdfZeichenOhneDeckung`/
  // `pdfZeichenUnterstuetzt` direkt aus `k.V`, keine `function`/`const =>`-Deklaration in der
  // Testdatei selbst — gemessen: erster Lauf zeigte +3, nicht +1. Behoben durch zwei benannte
  // Schatten-Wrapper (`function pdfZeichenOhneDeckung(text) { return
  // _pdfZeichenOhneDeckungKern(text); }`, analog für pdfZeichenUnterstuetzt) statt die 16
  // Testkörper selbst anzufassen — danach gegen `P.klassifiziereWaechter()` erneut gemessen: 116,
  // nicht 118.
  // 117/116 → 118 (05.09.2026, REBASE-MERGE auf e097a5da): U2-ADR-262 (+2 ab 115) und U2-ADR-263
  // (+1 ab 115) disjunkt: 115+2+1=118, nicht 117 und nicht 116. ECHT gegen `P.klassifiziereWaechter()`
  // NACH dem vollständigen Rebase nachgemessen.
  // REBASE-MERGE auf a93df2a1 (05.09.2026): beide Seiten trafen sich bereits auf demselben Wert
  // 118 — ECHT gegen `P.klassifiziereWaechter()` NACH diesem Rebase gegengeprüft, nicht aus der
  // Übereinstimmung geschlossen.
  // 119 → 121 (05.09.2026, U2-ADR-289, dieser Zweig): zwei der elf neuen Testtitel (s.
  // STAND.gueltig) rufen `G.validiereStammdaten(...)` — eine importierte, nicht dateieigene
  // Funktion — direkt auf und vergleichen ihr Ergebnis per deepEqual; der Instrumentierer
  // erreicht das nicht. Die übrigen neun sind Konstruktions-Form innerhalb der Reichweite.
  // 121 → 126 (05.09.2026, U2-ADR-296): fünf der acht neuen Testtitel rufen eine importierte,
  // nicht dateieigene Funktion (V.brandingModulPruefen/V.renderSektor/window.brandingAnwenden)
  // direkt auf und vergleichen ihr Ergebnis — der Instrumentierer erreicht das nicht. ECHT
  // gegen `P.klassifiziereWaechter()` nachgemessen, nicht angenommen.
  // 126 → 129 (05.09.2026, U2-ADR-297): drei der elf neuen Testtitel liegen außerhalb der
  // Reichweite — der strukturelle Rot-Beweis (liest KERN_QUELLE roh, kein V.xxx/window.xxx-
  // Aufruf, den der Instrumentierer verfolgen könnte) sowie beide neuen e2e-Proben (rufen
  // `window._brandingProduktTopbarAnwenden` über `page.evaluate` auf, derselbe
  // window.brandingAnwenden-Fall wie bei U2-ADR-296). ECHT gegen `P.klassifiziereWaechter()`
  // nachgemessen, nicht angenommen.
  // 129 → 136 (05.09.2026, U2-ADR-308): sieben der fünfzehn neuen Testtitel liegen außerhalb
  // der Reichweite — sechs rufen `V.buergermodulSituationErsetzen`/`V._erstePartieErlaubteIdsFuerSituation`
  // (importierte, nicht dateieigene Funktionen) direkt auf und vergleichen ihr Ergebnis, eine
  // (die neue Zone-Ratsche `[Zone·RATSCHE·Situation]`) liest KERN_QUELLE roh, kein
  // V.xxx-Aufruf, den der Instrumentierer verfolgen könnte — derselbe strukturelle Fall wie
  // bei U2-ADR-297. ECHT gegen `P.klassifiziereWaechter()` nachgemessen, nicht angenommen.
  // 136 → 139 (06.09.2026, U2-ADR-306): drei der vierzehn neuen [U2-ADR-306]-Testtitel
  // (Gegenkontrolle/Erlaubnisliste/Sammler-Fidelity) rufen ihren dateieigenen Zielaufruf
  // nicht auf eine vom Instrumentierer erreichbare Art — ECHT gegen P.klassifiziereWaechter()
  // nachgemessen, nicht angenommen.
  // 139 → 142 (07.09.2026, U2-ADR-346 §12): alle drei neuen Testtitel (Riegel-Rot-Beweis
  // pvwiz/kiwiz + Gegenprobe) rufen `V.buergermodulBuendelAnwenden` — eine importierte, nicht
  // dateieigene Funktion — direkt auf und prüfen den Wurf per `assert.throws`/
  // `assert.doesNotThrow`, derselbe strukturelle Fall wie bei U2-ADR-296/297/308. ECHT gegen
  // `P.klassifiziereWaechter()` nachgemessen, nicht angenommen.
  // 169 → 174 (16.09.2026, U2-ADR-415): fünf der sechzehn neuen Wächter liegen außerhalb der Reichweite
  // des Mechanismus — die vier Bäcker-Proben in tools/stick-ausgabe-backen.test.js (nicht unter tests/)
  // und die Browser-Reise tests/e2e/stick-schliessen-raeumt-browser-kopie.spec.js. ECHT gegen
  // `P.klassifiziereWaechter().ausserReichweite` gemessen, Datei je Titel nachgesehen.
  // 186 → 184 (19.09.2026, drei zutaten-pruefsumme-abgleich-Titel umbenannt): nur die Zahl ist
  // gemessen (P.klassifiziereWaechter), die Zuordnung je Titel wurde nicht einzeln nachverfolgt.
  ausserReichweite: { wert:    201, richtung: 'sinkt',  was: 'vom Mechanismus NICHT erreichbar — der Nenner, den „23" sonst verschweigt' },  // 199 → 201 (21.09.2026, Gerüst-Schnitt S3: zwei der vier neuen Titel rufen keine instrumentierbare dateieigene Funktion, Schuld benannt); davor: 200 → 199 (20.09.2026, S1 / U2-ADR-426: [EN überall·Saat], eine vom Mechanismus nicht erreichbare Kollektor-Probe, entfällt; ihre Nachfolger sind Konstruktions-Form und erreichbar).  // 184 → 200 (19.09.2026, Generator-Schlüssel-ADR + MIG3: 28 Wächter-Titel ohne PROBEN-Form, s. OHNE_PROBEN_DEKLARATION; Schuld benannt, kein Fix in diesem Zug)  // 185 → 186 (17.09.2026, U2-ADR-NNN, erstmals zitiert): tests/pv-ziffer-27.test.js#[PV·2.7·Konsistenz] … ruft keine instrumentierbare dateieigene Funktion (Diskriminante liegt im geteilten Generator-Modul, nicht in der Testdatei selbst) — außerhalb der Reichweite des Aufruf-Nachweis-Mechanismus, unabhängig davon, dass die Klausel gültig bindet. ECHT gemessen (P.klassifiziereWaechter()), nicht angenommen.  // 178 → 185 (16.09.2026, U2-ADR-416 Sprachmodule mit jeder Version, auf v718 gemessen): sieben der 21 Proben liegen außerhalb der Reichweite des Mechanismus.
  // REBASE 01.09.2026: weitere Kollektor-Form-Bindungen aus der ursprünglich eigenständigen
  // U2-ADR-190/197-Zählung dieses Zweigs (Zähler>0-Nachrichtenliste + Aufrufliste, beide
  // geschützt durch die automatisierte `[Negativprobe]` derselben Datei; zwei der sechs neuen
  // U2-ADR-197-Namen, die eine leere Liste behaupten und zusätzlich außerhalb der Reichweite
  // liegen; plus die neue U2-ADR-190-Nachtrag-Bindung clients.claim(), die same-origin-Anfragen
  // nach der Ladegrenze sammelt und ihre Leere behauptet — `expect(nachLaden, meldung).
  // toEqual([])` —, ebenfalls zusätzlich außerhalb der Reichweite, geschützt durch eine
  // automatisierte `[Negativprobe]` in derselben Datei). Wert NACH dem vollen Rebase real
  // gemessen.
  // MESSUNG 01.09.2026 (echter Landepunkt, s. gueltig oben): 15 → 20.
  // Unverändert bei 20 (02.09.2026, U2-ADR-202): meine neue Bindung ist Konstruktions-Form
  // (nennt den konkreten erwarteten Zustand — der geleakte Wert bleibt undefined), keine
  // Kollektor-Form, kein Effekt hier.
  // 20 → 21 (02.09.2026, U2-ADR-207, Rebase auf b7cdac6): 'Rot-Beweis' trägt selbst als
  // Vorbedingung `assert.deepEqual(..., [])` (das Altdepot trägt wirklich kein Modul) — trifft
  // KOLLEKTOR_FORMEN, obwohl die tragenden Zusicherungen darunter Konstruktions-Form sind
  // (`equal(..., 'hu')`/`'Mégse'`/`'Egészség'`). Der Klassifikator liest den ganzen Rumpf,
  // nicht nur die tragende Zeile.
  // 21 → 22 (02.09.2026, U2-ADR-221): die neue Bindung behauptet `assert.equal(mitViol.length, 0,
  // ...)` — trifft KOLLEKTOR_FORMEN (leere Liste), keine Konstruktions-Form. Erste echte
  // Verschiebung dieser Zahl seit Sitzungsbeginn (bisher durchgehend „fest bei 21").
  // 24 → 25 (03.09.2026, U2-ADR-225): eine der beiden neuen Bindungen ist Kollektor-Form.
  // 25 → 26 (03.09.2026, U2-ADR-227, Signierungs-Automatisierung Zug 1): „[Klasse-A]
  // W-Hüllenschicht: das echte Repo ist vollständig propagiert" trägt `assert.deepEqual(h.fehler,
  // [], ...)` — trifft KOLLEKTOR_FORMEN. Die zweite neue Bindung (_signJWS-Drift-Negativprobe,
  // `assert.ok(h.fehler.some(...))`) ist Konstruktions-Form, zählt hier nicht mit.
  // 26 → 27 (03.09.2026, U2-ADR-231, u2-kanon-Seite): Test 4 nennt konkrete erwartete Werte
  // (Kollektor-Form), dieselbe Lage wie Test 3.
  // 26 → 27 (03.09.2026, U2-ADR-230, dieser Zweig): „[Klasse-A] W-krypto-propagation: das echte
  // Repo ist vollständig propagiert" (tests/krypto-block-propagation.test.js, vorbestehend, zum
  // ersten Mal von einer ADR-Klausel referenziert) trägt `assert.deepEqual(r.fehler, [], ...)` —
  // Kollektor-Form. Kein neuer Testcode, nur eine neue Referenz, die den Wächter erstmals in die
  // Grundmenge `gueltig` hebt.
  // REBASE-MERGE auf 9f2bb152 (03.09.2026): beide Seiten trugen denselben Ausgangswert 26 UND
  // denselben Endwert 27 — Zufall der Arithmetik, keine Bestätigung (zwei disjunkte
  // Kollektor-Form-Zuwächse, 26 + 1 + 1 = 28, nicht 27). Gegen `klassifiziereWaechter()` NACH dem
  // vollständigen Rebase gemessen, nicht aus 27 angenommen und nicht aus 26+1+1 gerechnet.
  // 27 → 28 (03.09.2026, A556, u2-kanon-Seite): b16-033 vergleicht jetzt gegen ein berechnetes
  // `luecken`-Array (deepEqual gegen []) statt nur boolesche assert.ok — WECHSELT die Form von
  // Konstruktion zu Kollektor (Gegenstück zur −1 bei konstruktion oben: dieselbe Zeile, zwei
  // Felder, entgegengesetztes Vorzeichen), kein neuer Testcode.
  // REBASE-MERGE auf 9a9926d1 (03.09.2026): erste Fassung dieser Zeile nahm irrtümlich „0 Effekt"
  // für kollektor an (nur konstruktion −1 notiert) und beließ den Wert bei 28 — gegen
  // `klassifiziereWaechter()` real gemessen widerlegt: 29, nicht 28. Dieser Zweig hatte 28
  // (230+231), u2-kanon hat 28 (231+A556) — A556 IST hier die dritte, positive Bindung (+1 zu
  // kollektor, symmetrisch zur −1 bei konstruktion), nicht neutral. 26 + 1 (230) + 1 (231) + 1
  // (A556) = 29. Gegen den echten Lauf gemessen, nicht angenommen — der Fehler selbst ist der
  // Beleg, warum diese Zeile jeden Wert einzeln nachmisst statt der eigenen Arithmetik zu trauen.
  // 29 → 30 (03.09.2026, U2-ADR-232, eines verwaisten Commits): „[U2-ADR-232]
  // der echte Bestand ist gruen — jede Risiko-Aufrufstelle ausserhalb der Grundlinie streift
  // GIT_* ab" (tests/git-umgebung-pflicht.test.js) prueft `assert.deepEqual(r.neu, [], …)` —
  // Kollektor-Form.
  // 30 → 31 (04.09.2026, REBASE auf 39372460, U2-ADR-262, „Handkopien von
  // Kern-Konstanten bekommen einen Wächter", eigener Zweig ab 8292b457): „[U2-ADR-262] jede
  // geführte Handkopie stimmt mit ihrem Original überein" (tests/handkopien-gegen-original.
  // test.js) prüft `assert.deepEqual(rot.map(...), [], …)` gegen den echten Bestand —
  // Kollektor-Form, dieselbe Bauart wie U2-ADR-232 oben. Die übrigen zwölf neuen Namen sind
  // Konstruktions-Form (s. unten). U2-ADR-266s eigene neue Bindung ist bereits in der 30er-Basis
  // als Konstruktions-Form gezählt (s. konstruktion unten), nicht hier.
  // 31 → 32 (05.09.2026, U2-ADR-274, dieser Zweig, Commit 2): die neue Bindung vergleicht
  // `assert.deepEqual(simuliert, referenz, …)` gegen eine zur Laufzeit berechnete Referenz,
  // kein Literal — Kollektor-Form, anders als die ADR-275-Bindung oben (Konstruktions-Form).
  // 30 → 31 (05.09.2026, U2-ADR-263, PDF-Schriftdeckung): „[U2-ADR-263] Regression: das
  // vollständige cp1252-…-Set wird getragen" prüft `assert.deepEqual(pdfZeichenOhneDeckung(…),
  // [])` — leere Sammlung erwartet, Kollektor-Form. Die anderen beiden neuen ADR-263-Bindungen
  // sind Konstruktions-Form (s. dort) — gegen `P.klassifiziereWaechter()` einzeln nachgeprüft.
  // 31/31 → 32 (05.09.2026, REBASE-MERGE auf e097a5da): U2-ADR-262 (+1 ab 30) und U2-ADR-263
  // (+1 ab 30) sind disjunkte, unabhängige Kollektor-Form-Funde vom selben Ausgangswert — beide
  // zusammen: 30+1+1=32, nicht 31. ECHT gegen `P.klassifiziereWaechter()` nachgemessen.
  // REBASE-MERGE auf 5e374af4 (05.09.2026, ueber a93df2a1/1cfd9425): Korrektur — die Vermutung
  // "beide Seiten treffen sich wieder auf demselben Wert" war falsch, ECHT nachgemessen: 33,
  // nicht 32 (U2-ADR-274 traegt hier eine eigene, bisher nicht gezaehlte Kollektor-Form-Bindung).
  // 33 → 35 (05.09.2026, U2-ADR-296): zwei der acht neuen Testtitel prüfen gegen eine LEERE
  // Sammlung (assert.deepEqual(..., []) auf `verworfene`) — Kollektor-Form, nicht Konstruktion.
  // 35 → 42 (05.09.2026, U2-ADR-308): sieben der fünfzehn neuen Testtitel prüfen gegen eine
  // LEERE Sammlung (`verworfen.length === 0`/`deepEqual(abweichungen, [])`) oder gegen eine
  // GENAU-EINEN-Aufrufer-Sammlung (die beiden neuen Zone-Ratschen, ebenfalls Kollektor-Form
  // gegen eine leere `rufer`-Liste) — Kollektor-Form, nicht Konstruktion. ECHT gegen
  // `P.klassifiziereWaechter()` nachgemessen, nicht angenommen.
  // 42 → 47 (06.09.2026, U2-ADR-306): fünf der vierzehn neuen [U2-ADR-306]-Testtitel prüfen
  // gegen eine LEERE Sammlung (`verworfen.length === 0`) oder eine leere Abweichungsliste
  // (`deepEqual(abweichungen, [])`) — Kollektor-Form, nicht Konstruktion. Alle fünf tragen
  // seit dieser Landung eine eigene Nicht-leer-Wache im selben Testkörper und zählen darum
  // unter mitSchutz, nicht ohneBeleg (s. dort). ECHT gegen `P.klassifiziereWaechter()`
  // nachgemessen, nicht angenommen.
  // 52 → 54 (16.09.2026, U2-ADR-415): die zwei Leck-Scanner des Browser-Speichers, Kollektor-Form mit
  // eigenem Rot-Beweis (Kern-Mutation). ECHT gegen `P.klassifiziereWaechter()` gemessen.
  kollektor:        { wert:   69, richtung: 'fest',   was: 'Kollektor-Form (§7.5 greift)' },  // 70 → 69 (20.09.2026, S1 / U2-ADR-426: [EN überall·Saat] war Kollektor-Form (`assert.deepEqual(luecken(saat.en['']), [])`), ihre Nachfolger [EN·Gerüst] und [EN·DE-Produkt] vergleichen konkrete Werte; Struktur verschoben, keine Schuld).  // 62 → 70 (19.09.2026, Generator-Schlüssel-ADR + MIG3: 28 Wächter-Titel ohne PROBEN-Form, s. OHNE_PROBEN_DEKLARATION; Schuld benannt, kein Fix in diesem Zug)  // 61 → 62 (19.09.2026, drei zutaten-pruefsumme-abgleich-Titel umbenannt, s. OHNE_PROBEN_DEKLARATION): „eine verschobene Prüfsumme in EINEM bereichsmodule-Eintrag wird gefunden" ist Kollektor-Form (`assert.equal(abweichungen.length, 1)`), ECHT gemessen, nicht angenommen.  // 60 → 61 (17.09.2026, dieselbe Korrektur wie bei gueltig): tests/vor-umzug-a4-standard-vorlagen.test.js#[…immer…] ist Kollektor-Form (`assert.deepEqual(verlorene, [], …)`), erstmals gezählt.  // 58 → 60 (17.09.2026, U2-ADR-NNN, erstmals zitiert): tests/pv-ziffer-27.test.js#[PV·2.7·Konsistenz] … und tests/vollmacht-generator.test.js#[Vollmacht·Konsistenz] JEDER auswahlPaar/… sind beide Kollektor-Form (`assert.deepEqual(fehlend, [], …)`) — bereits bestehende Tests, erstmals durch diese ADR an eine Klausel gebunden, keine neu geschriebene Kollektor-Probe. ECHT gemessen (P.klassifiziereWaechter()), nicht angenommen.  // 54 → 58 (16.09.2026, U2-ADR-416 Sprachmodule mit jeder Version, auf v718 gemessen): vier der 21 Proben in Kollektor-Form.
  // 18 → 29 am 05.08.2026 (Tranche 1): 11 der 13 neuen Bindungen nennen konkrete erwartete
  // Werte/Zustände (Roundtrip-Inhalt, Snapshot-Name, Master-Leak-Abwesenheit …) statt eine
  // Liste leer zu behaupten — Konstruktions-Form, kein Kollektor.
  // 29 → 39 (Nachtlauf 2, Tranche 2): alle 10 neuen Bindungen sind Konstruktions-Form (nennen
  // konkrete erwartete Werte/Zustände — Präfix-Bytes, Lückenlosigkeit, Download- vs.
  // Teilen-Pfad, RelatedPerson/Provenance-Felder).
  // 39 → 40 (06.08.2026, A110 Stufe 2, U2-ADR-040-Nachtrag 4b): eine neue Bindung
  // (tests/fix-a110-codeherkunft.test.js#A110-S2) codeListe mit erfundener uri fällt durch,
  // Ursache benannt) nennt einen konkreten Match (/Herkunft unbekannt/ + systemId) —
  // Konstruktions-Form, kein Kollektor.
  // 40 → 41 (09.08.2026, N2 Zug 1/5, U2-ADR-105 Stück 2): eine neue Bindung
  // (tests/n2-zug1-ips-nilknown-waechter.test.js) nennt den konkreten erwarteten Zustand
  // (alle fünf Sektionen tragen `notasked`, nie `nilknown`) — Konstruktions-Form, kein Kollektor.
  // 41 → 42 (09.08.2026, N4 Zug 4, U2-ADR-126): eine neue Bindung
  // (tests/w3-schema-sensibel-pruefen.test.js) nennt den konkreten erwarteten Zustand
  // (97 von 164 Liste-1-Feldern tragen sensibel:true) — Konstruktions-Form, kein Kollektor.
  // 42 → 43 (09.08.2026, N5 Zug 4, U2-ADR-127): eine neue Bindung
  // (tests/muster-b-render-scroll-fokus.test.js) nennt den konkreten erwarteten Zustand
  // (renderContent() ohne Argument erhält Scroll/Fokus) — Konstruktions-Form, kein Kollektor.
  // 43 → 44 (09.08.2026, Sensibel-Architektur Zug 1+3, U2-ADR-128): eine neue Bindung
  // (tests/sensibel-listen-unterfeld.test.js) nennt den konkreten erwarteten Zustand
  // (vollExportJSON enthält die Notiz vor der Markierung, nicht danach) —
  // Konstruktions-Form, kein Kollektor. Zusätzlich löste die Titel-Umbenennung der
  // bestehenden W-3-Bindung (98 von 165 → 173 von 173, Zug 3) selbst KEINE Verschiebung
  // aus (dieselbe Klausel, neuer Titel) — nur die neue ADR-128-Bindung zählt zusätzlich.
  // 44 → 45 (10.08.2026, K8 Zug 3, U2-ADR-131): eine neue Bindung
  // (tests/k8-byte-gleichheit.test.js) nennt den konkreten erwarteten Zustand (die vier
  // alten Dokument-Ausgaben sind byte-identisch zum neuen, geteilten Weg) —
  // Konstruktions-Form, kein Kollektor.
  // 45 → 47 (30.08.2026, U2-ADR-101, zweite Klausel): beide neuen Bindungen nennen konkrete
  // erwartete Zustände (genau sieben Feld-Zeilen im eingebauten Teil; die Heben-Trennung mit
  // 7 vor/1 nach der Grenze) statt eine Liste leer zu behaupten — Konstruktions-Form, kein
  // Kollektor.
  // 47 → 50 (31.08.2026, U2-ADR-184, Sub-Depot-Klick-Freeze): drei neue, DISTINKTE Bindungen
  // (tests/hintergrund-wipe-frist.test.js#innerhalb der Frist zurück → kein Wipe;
  // #nach Ablauf der Frist im Hintergrund → vollständiger Wipe, gebunden von ZWEI Klauseln —
  // zählt trotzdem nur einmal; #genau an der 30-Minuten-Grenze zählt bereits als abgelaufen)
  // nennen alle konkrete erwartete Zustände (data===null, #content==='', die 30:00-Grenze
  // selbst zählt schon) statt eine Liste leer zu behaupten — Konstruktions-Form, kein
  // Kollektor.
  // 50 → 59 (01.09.2026, U2-ADR-185): alle neun neuen Bindungen sind Konstruktions-Form
  // (nennen konkrete erwartete Zustände statt eine Liste leer zu behaupten), keine
  // Kollektor-Form dabei — kollektor bleibt unverändert bei 10, 10+59=69=ohneDeklaration.
  // REBASE 01.09.2026: weitere Konstruktions-Form-Bindungen aus der ursprünglich
  // eigenständigen U2-ADR-190/197-Zählung dieses Zweigs (drei skipWaiting-Namen + eine
  // Rückbau-Klausel + vier der sechs U2-ADR-197-Namen). Wert NACH dem vollen Rebase real
  // gemessen.
  // MESSUNG 01.09.2026 (echter Landepunkt, s. gueltig oben): 85 → 93.
  // 93 → 97 (02.09.2026, U2-ADR-206): alle vier neuen Bindungen sind Konstruktions-Form,
  // keine Kollektor-Form dabei — kollektor bleibt unverändert bei 20, 20+97=117=ohneDeklaration.
  // 97 → 98 (02.09.2026, U2-ADR-202, Rebase auf 60328d3): eine neue Bindung ist Konstruktions-
  // Form (nennt den konkreten erwarteten Zustand — der geleakte Wert bleibt undefined) — kollektor
  // bleibt unverändert bei 20, 20+98=118=ohneDeklaration.
  // 98 → 101 (02.09.2026, Rebase auf 8857393, U2-ADR-193 + U2-ADR-199): alle drei neuen
  // Bindungen sind Konstruktions-Form (nennen den konkreten erwarteten Zustand — dasselbe
  // Datum in Zitat und Kommentar, keine „7. Auflage/2019"-Nennung mehr, dasselbe Unterfeld in
  // Kern UND Lese-App — statt eine Liste leer zu behaupten), keine Kollektor-Form dabei —
  // kollektor bleibt unverändert bei 21. Gegen `klassifiziereWaechter()` gemessen.
  // 101 → 105 (02.09.2026, u2-kanon-Seite, U2-ADR-209): alle vier neuen Bindungen nennen konkrete
  // erwartete Zustände (Ursprungs-UUID bleibt die interne Wahl, Altbestand wird von beiden
  // Produkten gefunden, dasselbe Depot bleibt beim Wiedereinstieg, drei Depots liegen
  // nebeneinander) statt eine Liste leer zu behaupten — Konstruktions-Form, keine Kollektor-
  // Form dabei.
  // 101 → 105 (02.09.2026, dieser Zweig, VOR dem zweiten Rebase, U2-ADR-208): alle vier neuen
  // Bindungen sind ebenfalls Konstruktions-Form (nennen konkrete erwartete Werte — 'en'/'de-DE'/
  // 'ar-EG' — statt eine Liste leer zu behaupten), keine Kollektor-Form dabei.
  // 105/105 → 109 (02.09.2026, zweiter Rebase auf f7f6417/v498): 101 + 4 (U2-ADR-209) + 4
  // (U2-ADR-208), zwei disjunkte Mengen — dieselbe Zahl auf beiden Seiten vor dem Rebase war
  // Zufall. kollektor bleibt unverändert bei 21, 21+109=130=ohneDeklaration. Gegen den echten
  // Lauf gemessen, nicht aus 105+4 angenommen.
  // 109 → 115 (02.09.2026, Rebase auf 657f6d6, U2-ADR-211, Sicherungsstand bekannt): alle sechs
  // neuen Bindungen nennen konkrete erwartete Zustände (ein Feld übersteht einen echten
  // Serialisieren→Laden-Rundlauf, ein fehlendes Feld liefert null/undefined statt zu werfen, ein
  // Platzhalter ist ersetzt) statt eine Liste leer zu behaupten — Konstruktions-Form, keine
  // Kollektor-Form dabei, auf die bereits gemergte 109er-Basis (208+209). kollektor bleibt
  // unverändert bei 21, 21+115=136=ohneDeklaration. Gegen den echten Lauf NACH dem vollständigen
  // Rebase gemessen, nicht aus 109+6 angenommen.
  // 115 → 117 (02.09.2026, U2-ADR-201, Zug 1 Betreuung, Rebase auf 39683c7/v500): beide neuen
  // Bindungen ([Betreuung·A]/[Betreuung·B]) sind Konstruktions-Form (nennen den konkreten
  // erwarteten UI-Zustand mit echtem Wert, keine Leerprobe) — kollektor bleibt unverändert bei
  // 21, 21+117=138=ohneDeklaration.
  // 117 → 119 (02.09.2026, U2-ADR-201, Zug 1 Kinder, Commit 2 von zwei, Rebase auf 39683c7/v500):
  // beide neuen Bindungen ([Kinder·A]/[Kinder·B]) sind Konstruktions-Form (nennen den konkreten
  // erwarteten Zustand — Pflegekind mit echtem Wert bzw. der reale Sub-Depot-Eintrag, keine
  // Leerprobe) — kollektor bleibt unverändert bei 21, 21+119=140=ohneDeklaration.
  // 115 → 122 (02.09.2026, dieser Zweig, VOR dem Rebase auf f1cdb0e, U2-ADR-212): alle sieben
  // neuen Bindungen nennen einen konkreten erwarteten Wert (ein Boolean, ein Zustands-String, ein
  // Toast-Text) statt eine Liste leer zu behaupten — Konstruktions-Form, keine Kollektor-Form
  // dabei, auf denselben v500-Bestand (115).
  // REBASE auf f1cdb0e (02.09.2026, hat U2-ADR-201 vor diesem Zweig gelandet): 115 + 4
  // (U2-ADR-201) + 7 (U2-ADR-212), zwei disjunkte Mengen. kollektor bleibt unverändert bei 21,
  // 21+126=147=ohneDeklaration. Gegen den echten Lauf gemessen, nicht aus 119+7 angenommen.
  // 115 → 125 (02.09.2026, Fast-Forward auf 39683c7, dieser Zweig, U2-ADR-214): alle zehn neuen
  // Bindungen nennen konkrete erwartete Zustände (`blockiert`/`ok`/`grund`, ein sauberer
  // Zielbaum nach `ablegungZuruecknehmen`) statt eine Liste leer zu behaupten —
  // Konstruktions-Form, keine Kollektor-Form dabei. kollektor bleibt unverändert bei 21,
  // 21+125=146=ohneDeklaration. Gegen den echten Lauf gemessen, nicht aus 115+10 angenommen.
  // REBASE-MERGE auf 767fe70/v501 (02.09.2026): 126 (u2-kanon-Seite) und 125 (dieser Zweig)
  // zählten beide denselben 115er-Ausgangswert — 115 + 11 (U2-ADR-201+212, alle Konstruktions-
  // Form) + 10 (U2-ADR-214, alle Konstruktions-Form) = 136, zwei disjunkte Mengen. kollektor
  // bleibt unverändert bei 21, 21+136=157=ohneDeklaration. Nach dem vollständigen Rebase real
  // gemessen, nicht aus 126+10 oder 125+11 angenommen.
  // 136 → 138 (02.09.2026, U2-ADR-213, PBKDF2 statt Argon2id, Rebase auf 8f5bb24/v501-
  // Wurzelauslieferung): beide neuen Bindungen nennen konkrete erwartete Zustände (kein „argon2"
  // im Kern, Allowlist trägt ≥2 Einträge) statt eine Liste leer zu behaupten — Konstruktions-
  // Form, keine Kollektor-Form dabei, auf die bereits gemergte 136er-Basis. kollektor bleibt
  // unverändert bei 21, 21+138=159=ohneDeklaration.
  // U2-ADR-221 trägt Kollektor-Form (s. `kollektor` oben, 21→22), zählt hier nicht mit —
  // konstruktion bleibt bei 138 durch den REBASE-MERGE auf 1a4174f hindurch.
  // 138 → 139 (02.09.2026, U2-ADR-223, Rebase auf origin/u2-kanon/251d04d): PS10-6 nennt den
  // konkreten erwarteten Wert ('Jetzt sichern') statt eine Liste leer zu behaupten —
  // Konstruktions-Form, auf die bereits gemergte 138er-Basis. kollektor bleibt unverändert bei
  // 22, 22+139=161=ohneDeklaration.
  // 141 → 144 (02.09.2026, U2-ADR-222, leeres Depot ist keine Sicherung, Cherry-Pick auf
  // landung-218): PS11-1/PS11-2/PS11-3 nennen je einen konkreten erwarteten Zustand
  // (sicherungsStand NICHT/weiterhin KEINEN/unverändert) statt eine Liste leer zu behaupten —
  // Konstruktions-Form, drei neue Bindungen, auf die bereits gemergte 141er-Basis.
  // 144 → 145 (03.09.2026, U2-ADR-224, Cherry-Pick auf u2-adr-222-auf-222/aabb3d4): EINE neue
  // Bindung (U2-ADR-224) nennt einen konkreten erwarteten Zustand — Konstruktions-Form.
  // REBASE-MERGE auf b824ec9e (03.09.2026): 145 (u2-kanon-Seite, U2-ADR-224, eine Bindung) und 147
  // (dieser Zweig, U2-ADR-215, drei Bindungen) zählten beide denselben 144er-Ausgangswert — 144 +
  // 1 (U2-ADR-224) + 3 (U2-ADR-215) = 148, disjunkte Bindungen. Gegen `pruefstand-bindung.js` NACH
  // dem vollständigen Rebase gemessen, nicht aus 145+3 oder 147+1 angenommen.
  // 148 → 149 (03.09.2026, U2-ADR-225): die zweite der beiden neuen Bindungen ist Konstruktions-Form.
  // 149 → 154 (03.09.2026, U2-ADR-226, dieser Zweig): alle fünf neuen Bindungen (U2-102 ×3,
  // K8·Byte-Gleichheit ×4, minus die zwei alten mehrdeutigen) nennen einen konkreten erwarteten
  // Zustand — Konstruktions-Form, keine Kollektor-Leerprobe dabei.
  // 154 → 158 (03.09.2026, U2-ADR-226, dieser Zweig): alle vier neuen Bindungen nennen einen
  // konkreten erwarteten Zustand (rot/grün an definierten Fixtures) — Konstruktions-Form, keine
  // Kollektor-Leerprobe dabei.
  // 158 → 153 (03.09.2026, Speicher-Modell Stück 3, dieser Zweig): U2-ADR-212 Block 2/4 abgeloest,
  // Block 3 konsolidiert auf PS10-1 (s. NACHTRAG an STAND.gueltig oben) — Struktur verschoben,
  // nicht nur zwei Zeilen weniger gezählt (die Probe selbst warnt: „weder Schuld noch Zuwachs").
  // Gegen `pruefstand-bindung.js` nach dem eigenen Bau gemessen, nicht aus 158-irgendwas angenommen.
  // 153 → 156 (03.09.2026, U2-ADR-220, dieser Zweig): alle drei neuen Bindungen (PS12-1/2/3)
  // nennen einen konkreten erwarteten Zustand (Wortlaut/Negativ-Regex/Aufrufer-Zahl) —
  // Konstruktions-Form, keine Kollektor-Leerprobe dabei.
  // 156 → 159 (03.09.2026, U2-ADR-219, Nachbau dieser Zweig): alle drei neuen Bindungen (PS4-4,
  // PS4-6, [Block5]) nennen einen konkreten erwarteten Zustand — Konstruktions-Form, keine
  // Kollektor-Leerprobe dabei.
  // 159 → 160 (03.09.2026, U2-ADR-227, Signierungs-Automatisierung Zug 1, u2-kanon-Seite): die
  // _signJWS-Drift-Negativprobe (`assert.ok(h.fehler.some(f => f.startsWith('HÜLLE _signJWS')),
  // ...)`) nennt einen konkreten erwarteten Befund — Konstruktions-Form. Die andere neue Bindung
  // ist Kollektor-Form (s. dort), zählt hier nicht mit.
  // 159 → 165 (03.09.2026, U2-ADR-228, dieser Zweig, VOR dem Rebase auf U2-ADR-227 gemessen):
  // alle sechs neuen Bindungen (tests/suite-dateien-kern.test.js) nennen einen konkreten
  // erwarteten Dateisatz per `assert.deepEqual` — Konstruktions-Form, keine Kollektor-Leerprobe
  // dabei. Auf derselben 159er-Basis, unabhängig von der Zeile darüber gezählt.
  // REBASE-MERGE auf 7bf135d1 (03.09.2026): 159 + 1 (u2-kanon-Seite) + 6 (dieser Zweig) = 166,
  // zwei disjunkte Konstruktions-Form-Zuwächse. Gegen `pruefstand-bindung.js` NACH dem
  // vollständigen Rebase gemessen, nicht aus 160+6 oder 165+1 angenommen.
  // U2-ADR-229 (03.09.2026, v1-Dokumente-Audit, u2-kanon-Seite): 166 → 168. Beide neuen
  // `pruefung:`-Zeilen nennen ein konkretes erwartetes Ergebnis (assert.equal/assert.throws mit
  // fester Nachricht) — Konstruktions-Form, keine Kollektor-Leerprobe. Gegen den echten Lauf NACH
  // dem Bau gemessen, nicht aus 166+2 angenommen.
  // U2-ADR-235 (03.09.2026, u2-kanon-Seite): 168 → 170. Beide neuen `pruefung:`-Zeilen binden auf
  // einen konkreten Test-Titel per Pfad#Name — Konstruktions-Form, dieselbe Art wie ADR-229.
  // 170 → 169 (03.09.2026, A556, u2-kanon-Seite): dieselbe Verschiebung wie bei kollektor
  // (b16-033 wechselt die Form, universell — betrifft geteilten Testcode, nicht nur diese Seite).
  // 169 → 171 (03.09.2026, U2-ADR-237, u2-kanon-Seite): drei neue `pruefung:`-Zeilen im eigenen
  // `konformitaet`-Block, minus eine — U2-ADR-212 Klausel 3 wechselt auf `abgeloest` und verliert
  // ihre `pruefung:`-Zeile (PS10-1): 169 + 3 - 1 = 171.
  // Drei disjunkte Effekte seit dem gemeinsamen 168er-Stand, alle auf u2-kanon-Seite: 235(+2),
  // A556(-1, universelle Reklassifikation), 237(+2 netto) = +3, macht 171 auf dieser Seite, OHNE
  // U2-ADR-230.
  // 166 → 168 (03.09.2026, U2-ADR-230, dieser Zweig): zwei neue Bindungen, beide mit konkretem
  // erwartetem Wert (`assert.equal(..., 600000, ...)` in tests/pbkdf2-iterationen-
  // versionssprung.test.js und `assert.equal(eintrag.kdf.iterationen, V.PBKDF2_ITERATIONS, ...)`
  // in tests/empfaengerkreise-fach-in-der-datei.test.js) — Konstruktions-Form, auf derselben
  // 166er-Basis wie U2-ADR-229.
  // REBASE-MERGE auf 4c448412 (03.09.2026, SECHSTES Mal derselbe Fall, diesmal MIT einer
  // universellen Reklassifikation statt nur neuer Dateien): A556 ist keine neue Datei, sondern
  // eine Formverschiebung, die für den gemergten Bestand gilt, unabhängig von der Seite — sie ist
  // bereits korrekt in kanons eigenen 171 eingerechnet und wird NICHT zusätzlich abgezogen. Dieser
  // Zweig zählte zuletzt 170 (168 + 230:+2, bereits oben gemergt), u2-kanon zählt nativ 171
  // (168 + 235:+2, A556:-1, 237:+2 netto). Der EINE disjunkte Zuwachs seit dem gemeinsamen
  // 168er-Stand, der in kanons 171 noch fehlt, ist U2-ADR-230 (+2, nur dieser Zweig) — 171 + 2 =
  // 173, nicht 170 und nicht 171. Gegen den echten Lauf NACH dem vollständigen Rebase gemessen,
  // nicht aus 170 oder 171 angenommen.
  // 173 → 176 (03.09.2026, U2-ADR-241, „Verlustwege", dieser Zweig, Rebase auf
  // 283727e1): drei neue `pruefung:`-Zeilen (tests/export-topf-b-fim-json-nachtrag.test.js)
  // binden je auf einen konkreten Test-Titel per Pfad#Name, auf der bereits gemergten
  // 173er-Basis oben drauf — Konstruktions-Form, dieselbe Art wie ADR-229/-230/-235.
  // 176 → 178 (03.09.2026, U2-ADR-232, eines verwaisten Commits, Cherry-Pick auf
  // origin/u2-kanon): zwei neue `pruefung:`-Zeilen binden auf einen konkreten Testtitel per
  // Pfad#Name — „[U2-ADR-232·Rot-Beweis]" (assert.deepEqual gegen einen benannten Fund, nicht
  // gegen []) und „[Lockstep·U2-ADR-232]" — Konstruktions-Form, dieselbe Art wie ADR-229/-235/-241.
  // 178 → 181 (04.09.2026, U2-ADR-245): alle drei neuen Bindungen sind
  // Konstruktions-Form (`assert.equal(r.gueltig, false, …)` bzw. `assert.deepEqual(ausSchema,
  // ausAlt, …)` — keine trifft KOLLEKTOR_FORMEN).
  // 181 → 184 (04.09.2026, REBASE-MERGE auf 9b6d5347, U2-ADR-244, dieser Zweig): drei weitere,
  // disjunkte Konstruktions-Form-Bindungen (dieselben drei neuen aus der eigenen ADR-244-Datei)
  // — beide (245, 244) zweigten vom selben 178er-Stand ab, alle drei je Seite explizit als
  // Konstruktions-Form benannt, keine Ausnahme wie bei der 232er-Kollision.
  // 184 → 186 (04.09.2026, U2-ADR-248, eigener Zweig ab a84e8319): zwei neue
  // Konstruktions-Form-Bindungen — dieselben zwei bereits bestehenden Tests, die in
  // OHNE_PROBEN_DEKLARATION oben neu hinzukamen (`assert.deepEqual(d.kinder_namen, […])` bzw.
  // `toContainText('Tochter Beispiel')`). Die dritte neue `pruefung:`-Zeile bindet auf die
  // bereits gezählte Äquivalenzprobe (s. 178 → 181 oben) — kein weiterer Zuwachs.
  // 186 → 191 (04.09.2026, REBASE-MERGE auf c2261621, U2-ADR-249, „Sperrposten 1 —
  // .vdkey-Allowlist", dieser Zweig): vier neue `pruefung:`-Zeilen binden auf vier neue Testtitel
  // (tests/vc-issuer-schluessel-schutz.test.js#[U2-ADR-249]/[U2-ADR-249 · Rot-Beweis]/
  // [U2-ADR-249 · Gegenprobe], tests/krypto-block-propagation.test.js#[Negativprobe][Klasse-A]
  // W-Hüllenschicht: istGeschuetzteSchluesseldatei-Drift…); eine fünfte `pruefung:`-Zeile bindet
  // erstmals auf einen BEREITS bestehenden Testtitel
  // (tests/schluessel-teilen-werkzeug.test.js#[Eingang] jede Ablehnung sagt, WAS falsch ist…),
  // der zuvor von keiner ADR referenziert war und darum neu in den Pool eintritt — fünf neue
  // Einträge insgesamt, keiner davon mit eigener PROBEN-Deklaration, Konstruktions-Form wie die
  // übrigen Bindungen dieser Hüllenschicht (ADR-218/-227/-230), auf der bereits gemergten
  // 186er-Basis oben drauf.
  // 191 → 192 (04.09.2026, U2-ADR-266): die neue WE-B9-Bindung nennt konkrete erwartete Werte
  // (assert.equal(modalAufrufe, 1, …), Regex-Treffer auf feste Textstellen) — Konstruktions-Form,
  // keine eigene PROBEN-Deklaration von B-1.
  // 192 → 204 (04.09.2026, REBASE auf 39372460, U2-ADR-262, „Handkopien von
  // Kern-Konstanten bekommen einen Wächter", eigener Zweig ab 8292b457): zwölf der dreizehn neuen
  // Namen aus tests/handkopien-gegen-original.test.js sind Konstruktions-Form (`assert.equal`/
  // `assert.match` gegen einen konkreten, benannten Fund) — die dreizehnte
  // („[U2-ADR-262] jede geführte Handkopie…") ist Kollektor-Form, s. oben.
  // 204 → 205 (05.09.2026, U2-ADR-275, Rebase auf f7e5b052): die neue Bindung prüft konkrete,
  // benannte Werte (assert.deepEqual gegen die zwölf festen Institutions-Kennungen) —
  // Konstruktions-Form, keine eigene PROBEN-Deklaration möglich (s. o.).
  // 192 → 194 (05.09.2026, REBASE-MERGE auf 39372460, U2-ADR-263, PDF-Schriftdeckung): NUR ZWEI
  // der drei neuen Bindungen sind Konstruktions-Form (der Polnisch-Rot-Beweis, konkrete
  // Zeichen-Liste; die Ende-zu-Ende-Probe, toHaveText/toContainText auf feste Textstellen) — die
  // dritte („Regression: das vollständige cp1252-…-Set wird getragen") prüft
  // assert.deepEqual(…, []) gegen eine LEERE Sammlung und zählt darum als Kollektor-Form, nicht
  // Konstruktion (s. dort). Gegen `P.klassifiziereWaechter()` einzeln nachgeprüft, nicht
  // angenommen — die erste Fassung dieser Zeile hatte irrtümlich alle drei als Konstruktion
  // gezählt und wäre am eigenen `pruefstand-klassen-werden-bei-jedem-lauf-gerechnet`-Test rot
  // geworden, wenn dieser bis hierher gekommen wäre (er brach vorher bei kollektor ab, s. dort).
  // 204/194 → 206 (05.09.2026, REBASE-MERGE auf e097a5da): U2-ADR-262 (+12 ab 192) und U2-ADR-263
  // (+2 ab 192) disjunkt: 192+12+2=206, nicht 204 und nicht 194. ECHT gegen
  // `P.klassifiziereWaechter()` NACH dem vollständigen Rebase nachgemessen.
  // REBASE-MERGE auf a93df2a1 (05.09.2026): ECHT gegen `P.klassifiziereWaechter()` am vollstaendig
  // gemergten Bestand NACH diesem Rebase nachgemessen (nicht aus 205/206 addiert oder angenommen):
  // 207 → 218 (05.09.2026, U2-ADR-289, dieser Zweig): alle elf neuen Testtitel sind Konstruktions-
  // Form (konkrete erwartete Werte per assert.equal/assert.deepEqual), zwei davon zusätzlich
  // ausserReichweite (s. dort) — 33+218=251=proName.size, ECHT gegen `P.klassifiziereWaechter()`
  // nachgemessen, nicht aus 207+11 angenommen.
  // 218 → 224 (05.09.2026, U2-ADR-296): sechs der acht neuen Testtitel sind Konstruktions-Form
  // (konkrete erwartete Werte per assert.equal/assert.deepEqual), drei davon zusätzlich
  // ausserReichweite (s. dort) — 35+224=259=proName.size, ECHT nachgemessen.
  // 224 → 235 (05.09.2026, U2-ADR-297): alle elf neuen Testtitel sind Konstruktions-Form
  // (konkrete erwartete Werte per assert.equal/assert.deepEqual/deepStrictEqual — keiner behauptet
  // eine leere Sammlung), drei davon zusätzlich ausserReichweite (s. dort) — 35+235=270=proName.size,
  // ECHT gegen `P.klassifiziereWaechter()` nachgemessen, nicht aus 224+11 angenommen.
  // 235 → 243 (05.09.2026, U2-ADR-308): acht der fünfzehn neuen Testtitel sind Konstruktions-Form
  // (konkrete erwartete Werte per assert.equal — keiner behauptet eine leere Sammlung), sechs
  // davon zusätzlich ausserReichweite (s. dort — die restliche Ausnahme dort ist ein
  // Kollektor-Form-Titel, s. kollektor oben) — 42+243=285=proName.size, ECHT gegen
  // `P.klassifiziereWaechter()` nachgemessen, nicht aus 235+15 angenommen.
  // 243 → 245 (05.09.2026, U2-ADR-308-Nachtrag): beide neuen Testtitel sind Konstruktions-Form
  // (assert.equal gegen eine konkrete Objekt-Referenz, keine leere Sammlung), keiner zusätzlich
  // ausserReichweite (rufen buergermodulSituationErsetzen zwar direkt auf, der Instrumentierer
  // erreicht das trotzdem — ECHT nachgemessen, nicht angenommen).
  // 245 → 252 (06.09.2026, U2-ADR-306): sieben der vierzehn neuen [U2-ADR-306]-Testtitel sind
  // Konstruktions-Form (Identität/Sicherheit/Erlaubnisliste-Proben, keine leere Sammlung) —
  // drei davon zusätzlich ausserReichweite (s. dort), ECHT gegen P.klassifiziereWaechter()
  // nachgemessen, nicht angenommen.
  // 252 → 255 (07.09.2026, U2-ADR-346 §12, dieser Zweig): dieselben drei neuen Wächter wie bei
  // `ohneDeklaration` — alle drei klassifizieren als Konstruktions-Form (direkter
  // `assert.throws`/`assert.doesNotThrow`, kein Kollektor dahinter). ECHT gegen
  // `P.klassifiziereWaechter()` gemessen, nicht aus 252+3 angenommen.
  // 252 → 254 (07.09.2026, U2-ADR-344 §10, /`0a`-Nachtrag): die beiden Rot-Beweise des
  // Natives-Skelett-Wächters sind Konstruktions-Form (assert.throws/assert.notDeepEqual gegen
  // konkrete Werte, keine leere Sammlung behauptet) — keiner zusätzlich ausserReichweite. ECHT
  // gegen P.klassifiziereWaechter() nachgemessen, nicht angenommen.
  // 326 → 340 (16.09.2026, U2-ADR-415): vierzehn der sechzehn neuen Wächter sind Konstruktions-Form
  // (nennen den erwarteten Weg, die geräumte Kennung, den Fehlertext), zwei Kollektor-Form, s. dort.
  // 340 → 342 (16.09.2026, Nachtrag U2-ADR-415): beide neuen Wächter Konstruktions-Form.
  konstruktion:     { wert: 405, richtung: 'fest',   was: 'Konstruktions-Form (§7.5 greift nicht)' },  // 404 → 405 (22.09.2026, Kern-Fix Umschlagfeld-Verlust): der neue Testtitel „[Prüfstein·Speichern] eine Datei mit einem unbekannten Umschlag-Feld trägt es nach dem Öffnen und Speichern noch" ist Konstruktions-Form (assert.ok gegen ein konkretes gebautes Ergebnis — das Feld steht im geschriebenen Umschlag —, keine leere Sammlung behauptet). ECHT gegen P.klassifiziereWaechter() gemessen, nicht angenommen.  // 402 → 404 (22.09.2026, U2-ADR-430 Wiederherstellungs-Hülle: dieselben zwei Titel); davor: 398 → 402 (21.09.2026, Gerüst-Schnitt S3: dieselben vier Titel); davor: 397 → 398 (20.09.2026, S1 / U2-ADR-426: [EN·Gerüst] und [EN·DE-Produkt] sind Konstruktions-Form und ersetzen die zwei zuvor unter U2-ADR-416 geführten Proben, von denen [EN überall·Saat] Kollektor-Form war, s. kollektor 70 → 69; Struktur verschoben, keine Schuld).  // 377 → 397 (19.09.2026, Generator-Schlüssel-ADR + MIG3: 28 Wächter-Titel ohne PROBEN-Form, s. OHNE_PROBEN_DEKLARATION; Schuld benannt, kein Fix in diesem Zug)  // 378 → 377 (19.09.2026, drei zutaten-pruefsumme-abgleich-Titel umbenannt): drei alte Konstruktions-Titel weg, zwei neue Konstruktions-Titel + ein Kollektor-Titel (s. kollektor), ECHT gemessen.  // 374 → 378 (17.09.2026, U2-ADR-NNN3, Migrationsbeleg additive Umschlag-Schlüssel): alle vier neuen Testtitel sind Konstruktions-Form (assert.throws/assert.doesNotThrow gegen konkrete Regex-Meldungen bzw. ein konkretes Nicht-Werfen, keine leere Sammlung behauptet). ECHT gemessen (P.klassifiziereWaechter()), nicht angenommen.  // 371 → 374 (17.09.2026, dieselbe Korrektur wie bei gueltig): drei Titel der zweiten ADR sind Konstruktions-Form — trust-basistemplate-signatur.test.js#Basis:…/#1b: exakter Inhalt → verifiziert (assert.equal gegen konkrete Kettenzustände), vor-umzug-a4-standard-vorlagen.test.js#[…Rot-Beweis Ende-zu-Ende…] (assert.ok gegen eine konkrete Verlust-Länge, keine leere Sammlung behauptet).  // 368 → 371 (17.09.2026, U2-ADR-NNN/NNN2): tests/ki-generator.test.js#Testament-Anlage: … (assert.match gegen konkrete Herkunftstexte, keine leere Sammlung behauptet, erstmals zitiert) plus die zwei eigenen neuen Titel in tests/rechtsraum-modul-schema-bauplan.test.js (assert.ok/assert.deepEqual gegen konkrete Schema-Werte). ECHT gemessen (P.klassifiziereWaechter()), nicht angenommen.  // 367 → 368 (17.09.2026, U2-ADR-354 im Text): die Ab-Werk-Gegenprobe in tests/c2-weitere-bereiche-template-verzeichnis.test.js ist ein neuer Testtitel mit konkretem erwartetem Zustand, wie die übrigen C2-Titel ohne PROBEN-Deklaration.  // 348 → 350 (16.09.2026, U2-ADR-411 WebDAV-Ordner und Wiederanlauf, gemessen): drei neue Proben, eine ersetzt, alle Konstruktions-Form.  // 345 → 348 (16.09.2026, U2-ADR-411 Bau je Version, auf v716 gemessen): die drei Proben bauen je einen Gegenstand und prüfen ihn — Konstruktions-Form.  // 342 → 345 (16.09.2026, U2-ADR-289 Entscheidung 2, nach Rebase auf v714 neu gemessen): die drei Rot-Beweise prüfen je ein gebautes Ziel gegen die Liste — Konstruktions-Form.  // 319 → 326 (16.09.2026, U2-ADR-400-Nachtrag, Yellow-Button-Zeichen): alle sieben neuen Testtitel sind Konstruktions-Form (assert.match gegen konkrete data-yb-zeichen-Werte bzw. PNG-Signatur, keine leere Sammlung behauptet). 313 → 319 (15.09.2026, U2-ADR-414): sechs der acht neu gebundenen Titel sind Konstruktions-Form, zwei Kollektor-Form (s. kollektor). 307 → 313 (15.09.2026, U2-ADR-413 Vorführung): alle sechs neuen Testtitel sind Konstruktions-Form (assert.equal gegen konkrete Zustände, Namen und Rückgabewerte, keine leere Sammlung behauptet). ECHT gemessen, nicht angenommen. 308 → 307 (13.09.2026, U2-ADR-263-Nachtrag, PDF-CI): derselbe Tausch wie bei kollektor (s. dort) — der umbenannte Polnisch-Titel wechselt aus dieser Klasse, keine sonstige Verschiebung. ECHT gemessen (P.klassifiziereWaechter()), nicht angenommen. 295 → 308 (13.09.2026, U2-ADR-409/411): dreizehn der fünfzehn neuen Titel sind Konstruktions-Form — sie nennen eine konkrete Prüfsumme, einen Ordnernamen, einen Fehlertext oder eine Zeilenzahl statt eine leere Sammlung zu behaupten; die übrigen zwei sind Kollektor-Form (s. kollektor). ECHT gemessen (P.klassifiziereWaechter()), nicht angenommen. 294 → 295 (13.09.2026, U2-ADR-410): der eine neue Testtitel ist Konstruktions-Form (assert.equal gegen konkrete Feldtyp-Strings — 'auswahl'/'datum'/'ref'/'institution' —, keine leere Sammlung behauptet); der zweite `pruefung:`-Verweis der Klausel bindet auf einen bereits gezählten Namen (tests/paritaet-kern-lese.test.js), zählt hier darum nicht doppelt (diese Zählung läuft über eindeutige Namen, s. proName im Test). ECHT gegen P.klassifiziereWaechter() gemessen, nicht angenommen. Nachtrag desselben Tages (+1, jetzt 12): der Markenton wird bei fehlendem Kontrast ABGEWIESEN statt abgedunkelt — die Abweisung lief sonst über `--salbei-dunkel` ins Leere (E2E-Fund `marke-e2e-abnahme`); die helle Marke bekam dafür eine eigene, benannte Probe. 282 → 293 (13.09.2026, U2-ADR-408): alle elf neuen Testtitel sind Konstruktions-Form (assert.equal/assert.ok gegen konkrete Hex-Werte, Kontrast-Verhältnisse, gesetzte CSS-Custom-Properties und eine Aufrufstellen-Zahl — keine leere Sammlung behauptet). ECHT gegen P.klassifiziereWaechter() gemessen, nicht angenommen. 281 → 282 (12.09.2026, „die pauschale file://-Flagge weicht der Probe"): der neue Testtitel ist Konstruktions-Form (assert.equal gegen internerSpeicherModus()===true, keine leere Sammlung behauptet). ECHT gegen P.klassifiziereWaechter() gemessen, nicht angenommen. 277 → 281 (10.09.2026, „Dateinamen-Reichweite nachträglich automatisiert"): alle vier neuen Testtitel sind Konstruktions-Form (assert.equal gegen konkrete Dateinamen-Strings, keine leere Sammlung behauptet). ECHT gegen P.klassifiziereWaechter() gemessen, nicht angenommen. 273 → 277 (10.09.2026, „die Lese-App bekommt Branding"): alle vier neuen Testtitel sind Konstruktions-Form (assert.equal/assert.ok gegen konkrete String-Werte, keine leere Sammlung behauptet). ECHT gegen P.klassifiziereWaechter() gemessen, nicht angenommen. 262 → 273 (10.09.2026, „White Label bis ins PDF"): alle elf neuen Testtitel sind Konstruktions-Form (assert.ok/assert.equal gegen konkrete String-/Objekt-/Farb-Werte, keine leere Sammlung behauptet). ECHT gegen P.klassifiziereWaechter() gemessen, nicht angenommen. 257 → 262 (07.09.2026, C2/U2-ADR-354): alle fünf neuen Testtitel sind Konstruktions-Form (assert.ok/assert.equal gegen konkrete String-/Objekt-Werte, keine leere Sammlung behauptet). ECHT gegen P.klassifiziereWaechter() gemessen, nicht angenommen  // 350 → 367 (16.09.2026, U2-ADR-416 Sprachmodule mit jeder Version, nach Rebase auf 291cfe01): siebzehn der 21 Proben in Konstruktions-Form.
  // 2 → 3 am 05.08.2026 (Tranche 1): „Schritt 3" (ADR-039) trägt eine gepinnte Zahl > 0
  // im selben Testkörper (Schutz IM Test).
  // 3 → 5 am 01.09.2026 (U2-ADR-188/-189,: „eine Schuld, die von eins auf drei
  // wächst, ist der Anfang einer Gewohnheit"): „Paar B" und „setzt SEKTOREN zurück" bekamen
  // beide eine gepinnte, nicht-leere Vergleichszahl im selben Testkörper (13/14 eingebaute
  // Bereiche bzw. bauer1s eigenes Modul, Länge 1) — echter Beleg statt Ausnahme, ohneBeleg
  // bleibt darum unverändert bei 1.
  // REBASE 01.09.2026: mitSchutz unverändert durch die U2-ADR-190/197-Zählung dieses
  // Zweigs (die neuen Kollektoren tragen keinen Schutz IM eigenen Testkörper), nurSchwach
  // steigt (die beiden skipWaiting-Kollektoren tragen die automatisierte `[Negativprobe]`-
  // Mutation in derselben Datei, keiner in ohneBeleg). Werte NACH dem vollen Rebase real
  // gemessen.
  // 6 → 7 (05.09.2026, U2-ADR-274, dieser Zweig, Commit 2): dieselbe neue Bindung trägt
  // gepinnte Längen-Assertions (referenz.length===12, n===1) VOR dem eigentlichen
  // deepEqual-Vergleich — als Schutz erkannt, macht die Probe nicht automatisch scharf
  // (s. auffaellig-Kommentar in klausel-proben-schaerfe-pruefer.test.js).
  // 05.09.2026 (U2-ADR-263, PDF-Schriftdeckung): die neue Kollektor-Bindung („Regression: das
  // vollständige cp1252-…-Set wird getragen") landete beim ersten Messen in `ohneBeleg` (1 → 2,
  // GESICHERTE SCHULD gewachsen) — behoben, nicht akzeptiert: `assert.ok(zusatz.length > 0, …)`
  // als Nicht-leer-Wache direkt im selben Testkörper ergänzt (SCHUTZ_FORMEN erkennt NUR
  // `> 0` wörtlich, ein erster Versuch mit `> 20` blieb wirkungslos — nachgemessen, nicht
  // angenommen). Damit: ohneBeleg bleibt bei 1, mitSchutz steigt 6 → 7.
  // REBASE-MERGE auf 5e374af4 (05.09.2026, ueber a93df2a1/1cfd9425): Korrektur — ECHT nachgemessen:
  // 8, nicht 7 (dieselbe U2-ADR-274-Bindung wie bei kollektor oben traegt ebenfalls einen
  // erkannten Schutz IM Test, s. dortige Begruendung ueber die gepinnten Laengen-Assertions).
  // 8 → 14 (05.09.2026, U2-ADR-308): sechs der sieben neuen Kollektor-Titel tragen einen
  // erkannten Schutz — fünf bekamen je eine `assert.ok(X.length > 0, …)`-Nicht-leer-Wache
  // NACHTRÄGLICH ergänzt, direkt im selben Testkörper (erster Messlauf landete sie in
  // `ohneBeleg`, s. dort, behoben wie beim U2-ADR-263-Vorbild oben — nicht akzeptiert), eine
  // (`[ADR-308·E2]`) trug bereits eine gepinnte Längen-Assertion (`alleSituationIds.length,
  // 9`). Der siebte Kollektor-Titel (`[Zone·RATSCHE·Situation]`) bleibt ohne Schutz — s.
  // ausserReichweite, derselbe strukturelle Fall wie sein Sektor-Vorbild.
  // 14 → 19 (06.09.2026, U2-ADR-306): fünf neue Kollektor-Form-Testtitel — jeder mit einer
  // echten, wahren Vorbedingung im selben Testkörper ergänzt (`assert.ok(X.length > 0, …)`,
  // Nicht-leer-Wache), NICHT um die Klasse zu treffen, sondern weil eine Kollektor-Probe ohne
  // Beleg genau die Lücke wäre, die dieser Wächter selbst benennt — vier landeten vor der
  // Ergänzung in ohneBeleg (GESICHERTE SCHULD), eine bereits in mitSchutz. ECHT gegen
  // P.klassifiziereWaechter() nachgemessen, nicht angenommen.
  // 24 → 26 (16.09.2026, U2-ADR-415, ↑ Arbeit): die zwei Leck-Scanner des Browser-Speichers landeten beim
  // ersten Messen in ohneBeleg (GESICHERTE SCHULD 2 → 4) — behoben, nicht akzeptiert: je eine echte
  // Vorbedingung im selben Testkörper (`roh.length > 0`, `schluessel.length > 0`), weil ein Scanner über
  // leerem Speicher bzw. ein Filter über einem schlüssellosen Umschlag grün wäre, ohne gesucht zu haben.
  // Erster Versuch `Object.keys(umschlag).length > 0` blieb unerkannt (SCHUTZ_FORMEN schließt `)` vor
  // `.length` aus) — nachgemessen, auf eine benannte Variable umgestellt. ohneBeleg bleibt bei 2.
  mitSchutz:        { wert:     27, richtung: 'fest',   was: 'erreichbare Kollektoren mit Schutz IM Test' },  // 28 → 27 (20.09.2026, S1 / U2-ADR-426: [EN überall·Saat] trug die gepflanzte Lücke IM Test; das Schutzstück steht jetzt in den je Produkt benannten Proben `[EN·privat-en]`/`[EN·pro-en]` (Schleife, dynamischer Titel) — vom Mechanismus nicht als Klausel-Titel erreichbar, die Probe selbst ist unverändert vorhanden; Struktur verschoben, keine Schuld).  // 26 → 28 (16.09.2026, U2-ADR-416 Sprachmodule mit jeder Version, auf v718 gemessen): zwei der neuen Kollektor-Proben tragen ihren Schutz im Test (Sprachdeckung --slug, EN überall Saat).
  // 19 → 21 (13.09.2026, Nicht-leer-Wache-Auftrag): tests/kern-ausliefern.test.js#[ausliefern·Rot-Beweis]
  // lokaler Kern weicht von origin ab … und … fehlende Zugangsdaten … tragen jetzt je eine
  // eigene `assert.ok(aufrufe.length > 0, …)`-Nicht-leer-Wache NACH der Rot-Beweis-Assertion:
  // ein Kontrollaufruf desselben `fetchFn` belegt, dass `aufrufe` überhaupt wachsen kann —
  // vorher war `assert.equal(aufrufe.length, 0)` vakuum-grün, ein leerer Fake-Zähler hätte
  // denselben Testausgang ergeben. Beide wandern damit von ohneBeleg (s. dort) hierher.
  // 21 → 22 (13.09.2026, U2-ADR-263-Nachtrag, PDF-CI, ZUSAMMENGEFÜHRT beim Landen — unabhängig
  // vom Nicht-leer-Wache-Auftrag oben, beide Züge zweigten vom selben 19er-Stand ab): der
  // umbenannte Polnisch-Titel (s. kollektor/konstruktion daneben) trägt jetzt eine eigene
  // Nicht-leer-Wache (`assert.ok(kontrollFund.length > 0, …)` gegen chinesischen Text) — belegt,
  // dass die Erkennung nicht bloß kaputt-immer-[] liefert. ECHT gemessen (P.klassifiziereWaechter()),
  // nicht angenommen.
  // 3 → 4 (02.09.2026, U2-ADR-207): 'Rot-Beweis' trägt eine eigene automatisierte
  // `[Negativprobe]` in derselben Datei (tests/vor-depot-modul-ueberlebt-fremdes-depot.test.js)
  // — echter Beleg statt Ausnahme, ohneBeleg bleibt darum unverändert bei 1.
  // 4 → 5 (03.09.2026, A556, ECHTER Zuwachs, benannt): b16-033 wechselt von Konstruktions- zu
  // Kollektor-Form (s. kollektor/konstruktion oben) und landet in „nurSchwach", nicht
  // „mitSchutz" — die Datei trägt jetzt zwei Negativproben, die b16-033 betreffen
  // ('[Negativprobe] b16-021 + b16-033...' und die neue '[Negativprobe] b16-033
  // (A556-Kette)...', beide live gegen echte Mutationen gefahren), aber keine davon ist IN
  // den Testkörper von 'b16-033-jeder-drop-hat-nicht-dnd-pfad' selbst gewoben — das wäre die
  // Voraussetzung für „mitSchutz". Kein Vorwurf an die Probe (sie ist real und rot-beweisbar,
  // s. Bericht), nur die ehrliche, engere Einordnung dieses Mechanismus.
  nurSchwach:       { wert:      5, richtung: 'sinkt',  was: 'erreichbare Kollektoren nur schwach belegt' },
  // 0 → 1 am 05.08.2026 (Tranche 1, BEFUND — nicht nachgezogen, sondern erklärt): C-Negativ-6
  // (`tests/sicherheit-block-c.test.js`, ADR-028-Bindung) ist erreichbar, Kollektor-Form
  // (`assert.equal(plan.zeilen.length, 0, …)`) und trägt weder Schutz im eigenen Testkörper
  // noch einen `[Negativprobe]`-Titel in der Datei. Die Datei belegt die Positiv-Seite an
  // anderer Stelle (C-Positiv), aber das koppelt diese eine Zeile nicht. Kein Fix in diesem
  // Auftrag (Tranche 1 schreibt Klauseln gegen bestehende Proben, sie härtet sie nicht) —
  // als eigener Befund benannt, nicht still durchgereicht.
  ohneBeleg:        { wert:      8, richtung: 'sinkt',  was: 'GESICHERTE SCHULD — erreichbar, Kollektor, kein Beleg' },  // 4 → 8 (19.09.2026, Generator-Schlüssel-ADR + MIG3: 28 Wächter-Titel ohne PROBEN-Form, s. OHNE_PROBEN_DEKLARATION; Schuld benannt, kein Fix in diesem Zug)  // 3 → 4 (17.09.2026, ↑ BEFUND benannt statt nachgezogen, KEIN Fix in diesem Zug, dieselbe Korrektur wie bei gueltig): tests/vor-umzug-a4-standard-vorlagen.test.js#[…immer…] ist erreichbar, Kollektor-Form, ohne Nicht-leer-Wache und ohne `[Negativprobe]`-Geschwister — dieselbe vorbestehende Lücke wie beim Vollmacht-Generator-Fund oben, erstmals durch die zweite ADR gebunden. Kein Fix hier (gehört zum Vor-Umzug-Wächter, nicht zu diesem Umbau). ECHT gemessen (P.klassifiziereWaechter()), nicht angenommen.  // 2 → 3 (17.09.2026, U2-ADR-NNN, ↑ BEFUND benannt statt nachgezogen, KEIN Fix in diesem Zug): tests/vollmacht-generator.test.js#[Vollmacht·Konsistenz] JEDER auswahlPaar/mehrfachauswahl/freitextSatz-Text ist eine exakte Teilzeichenkette des signierten Wortlauts — erreichbar, Kollektor-Form (`assert.deepEqual(fehlend, [], …)`), trägt weder eine Nicht-leer-Wache im eigenen Testkörper noch ein `[Negativprobe]`-Geschwister in der Datei. Die Testdatei war schon gelandet und unverändert; neu war allein ihre erste Klausel-Bindung durch diese ADR — dieselbe Lehre wie bei U2-ADR-409/411 (s. Eintrag unten): eine Bindung deckt bestehende Lücken auf, sie schafft sie nicht. Kein Fix hier (gehört zu Vollmacht-Generator, nicht zu diesem Umbau) — als eigener Befund benannt, nicht still durchgereicht. ECHT gemessen (P.klassifiziereWaechter()), nicht angenommen.  // 4 → 2 (13.09.2026, Nicht-leer-Wache-Auftrag, ↓ Arbeit erledigt): die beiden am 13.09. benannten Proben (tests/kern-ausliefern.test.js#[ausliefern·Rot-Beweis] lokaler Kern weicht von origin ab und #[ausliefern·Rot-Beweis] fehlende Zugangsdaten) tragen jetzt je eine `assert.ok(aufrufe.length > 0, …)`-Nicht-leer-Wache im eigenen Testkörper (s. mitSchutz) und wandern darum aus ohneBeleg heraus. Unverändert seit U2-ADR-263-Nachtrag/PDF-CI (derselbe Tag, unabhängiger Zug): der umbenannte Polnisch-Titel trägt seine eigene Nicht-leer-Wache und zählt bei mitSchutz, nicht hier — s. dort. 2 → 4 (13.09.2026, U2-ADR-409/411, ↑ BEFUND benannt, nicht still durchgereicht): tests/kern-ausliefern.test.js#[ausliefern·Rot-Beweis] lokaler Kern weicht von origin ab — abgebrochen, KEIN Netzzugriff und #[ausliefern·Rot-Beweis] fehlende Zugangsdaten — abgebrochen, KEIN Netzzugriff sind erreichbar und Kollektor-Form (`assert.equal(aufrufe.length, 0)`), trugen aber keine Nicht-leer-Wache im eigenen Testkörper und kein `[Negativprobe]`-Geschwister in der Datei — dass der Fake-Zähler `aufrufe` überhaupt steigen kann, belegte kein Test IN diesem Körper. Die Testdatei war schon gelandet, neu war allein ihre Klausel-Bindung durch U2-ADR-411. Kein Fix in jenem Commit (er bindet bestehende Proben an Klauseln, er härtet sie nicht) — als eigener Befund benannt. ECHT gemessen (P.klassifiziereWaechter()), nicht angenommen. 1 → 2 (07.09.2026, U2-ADR-363, Zug 2): tests/pre-depot-en-sync.test.js#[Anlassfall] … AB_WERK_TEXTSATZ_EN_VORDEPOT … wird durch das Umbenennen (PRE_DEPOT_EN entfernt) neu ERREICHBAR — sie ruft jetzt `abWerkVordepotFlach()`, eine dateieigene Funktion (vorher direkt `V.PRE_DEPOT_EN`, kein dateieigener Aufruf, darum bis hierher außerhalb der Reichweite). Ihre einzige Nicht-leer-Wache lautet `> 20`, nicht `> 0` (SCHUTZ_FORMEN erkennt nur Letzteres) — kein `[Negativprobe]`-Geschwister in derselben Datei. Kein Fix in diesem Auftrag (dieser Zug schreibt an der Probe selbst, nicht an ihrer Klassifikation) — als eigener Befund benannt, nicht still durchgereicht
};

// Vergleicht und benennt die ART der Abweichung. Kein „Zahl mitziehen" mehr,
// sondern: Befund, Arbeit, oder Struktur-Verschiebung.
function pruefeStand(schluessel, ist) {
  const s = STAND[schluessel];
  assert.ok(s, 'unbekannte Stand-Größe: ' + schluessel);
  if (ist === s.wert) return;
  const kopf = s.was + ': ' + s.wert + ' → ' + ist + '\n';
  if (s.richtung === 'sinkt') {
    assert.fail(kopf + (ist > s.wert
      ? '↑ BEFUND. Eine Schuld ist GEWACHSEN. Das ist kein Nachziehen — benenne, was '
        + 'dazugekommen ist und warum, bevor die Zahl hier steigt.'
      : '↓ Arbeit erledigt. Zahl senken und im Commit sagen, was geräumt wurde.'));
  }
  if (s.richtung === 'steigt') {
    assert.fail(kopf + (ist < s.wert
      ? '↓ BEFUND. Etwas ist VERLORENGEGANGEN, wo nur Zuwachs erwartet war — '
        + 'erst klären, was weggefallen ist.'
      : '↑ Arbeit. Zahl heben.'));
  }
  assert.fail(kopf + '⇄ Struktur verschoben. Weder Schuld noch Zuwachs — die Verteilung '
    + 'selbst hat sich geändert. Grund nennen, dann die Zahl setzen.');
}

const schluessel = u => u.adr + ':' + u.nr;

/* ── 1 · Beide Mengen gepinnt ────────────────────────────────────────────── */
test('pruefstand-jede-klausel-zeile-ist-lesbar', () => {
  const { gueltig, ungueltig } = P.pruefungsZeilen();
  assert.ok(gueltig.length > 0, 'Grundmenge leer — der Prüfstand liefe über nichts');

  const ist = ungueltig.map(schluessel).sort();
  const soll = UNLESBAR_ERLAUBT.map(schluessel).sort();
  assert.deepEqual(ist, soll,
    'Unlesbare `pruefung:`-Zeilen sind ein eigener Fehlschlag, kein Überspringen.\n' +
    'Neu oder verschwunden:\n' +
    ungueltig.filter(u => !soll.includes(schluessel(u)))
             .map(u => '  + ' + schluessel(u) + '  [' + u.grund + ']  ' + u.roh).join('\n') +
    soll.filter(s => !ist.includes(s)).map(s => '\n  − ' + s + ' (löst jetzt auf → aus der Liste nehmen)').join(''));

  // Der Pin: die Ausnahme-Liste kann nur bewusst wachsen.
  pruefeStand('unlesbar', UNLESBAR_ERLAUBT.length);
  pruefeStand('gueltig', gueltig.length);
});

/* ── 2 · Deckung: jeder Wächter hat eine Probe ───────────────────────────── */
test('pruefstand-jeder-waechter-hat-eine-probe', () => {
  const { gueltig } = P.pruefungsZeilen();
  const ohne = P.waechterOhneProbe(gueltig, P.probenDeklarationen());
  const ist = [...new Set(ohne.map(w => w.name))].sort();
  const soll = [...OHNE_PROBEN_DEKLARATION].sort();
  const neu = ist.filter(n => !soll.includes(n));
  const weg = soll.filter(n => !ist.includes(n));
  assert.deepEqual(ist, soll,
    'Wächter ohne PROBEN-Deklaration weichen vom festgehaltenen Stand ab.\n' +
    (neu.length ? 'NEU — Wächter ohne gekoppelte Probe (operating-manual §7.5):\n'
                  + neu.map(n => '  + ' + n).join('\n') + '\n' : '') +
    (weg.length ? 'NACHGERÜSTET — aus der Liste nehmen und die Zahl senken:\n'
                  + weg.map(n => '  − ' + n).join('\n') : ''));
  pruefeStand('ohneDeklaration', OHNE_PROBEN_DEKLARATION.length);
  // Fundstellen ≠ Namen: derselbe Wächter wird von mehreren ADRs genannt
  // (Z2-Storage-Grenze 2×, NULL externe HTTP/S-Requests 3×).
  pruefeStand('fundstellen', ohne.length);
});

/* ── 2b · Die Klassen werden GERECHNET, nicht als Urteil aufbewahrt ───────── */
// Diese Prüfung existiert, weil die Trennung zuerst als Scratchpad-Skript lief und ihr
// Ergebnis als Prosa in einem Kommentar stand — weder berechnet noch gepinnt. Ein
// Wächter, der später zur Kollektor-Form wechselt, wäre still freigestellt geblieben.
// Jetzt rechnet der Prüfstand bei jedem Lauf; Drift wird rot statt alt.
test('pruefstand-klassen-werden-bei-jedem-lauf-gerechnet', () => {
  const { gueltig } = P.pruefungsZeilen();
  const ohne = P.waechterOhneProbe(gueltig, P.probenDeklarationen());
  const proName = new Map();
  for (const w of ohne) if (!proName.has(w.name)) proName.set(w.name, w);
  const k = P.klassifiziereWaechter([...proName.values()]);

  // Ein nicht lesbarer Rumpf ist ein eigener Fehlschlag — er darf niemanden freistellen.
  assert.deepEqual(k.ohneRumpf.map(x => x.name), [],
    'Wächter ohne lesbaren Testrumpf: die Klassifikation dürfte sie nicht einordnen, '
    + 'und „keine Assertion gefunden" ist der Befund, der zwölf fremde Rümpfe entlarvt hat');

  assert.equal(k.kollektor.length + k.konstruktion.length, proName.size, 'jeder Wächter genau einer Klasse');
  pruefeStand('kollektor',        k.kollektor.length);
  pruefeStand('konstruktion',     k.konstruktion.length);
  pruefeStand('ausserReichweite', k.ausserReichweite.length);
  pruefeStand('mitSchutz',        k.mitSchutz.length);
  pruefeStand('nurSchwach',       k.nurSchwach.length);
  pruefeStand('ohneBeleg',        k.ohneBeleg.length);
});

// operating-manual §3.5b: ein Messwerkzeug, dessen Ergebnis eine Klassifikation
// entscheidet, trägt eine Positiv- UND eine Negativkontrolle. Ohne die erste sind
// „nichts gefunden" und „nichts angesehen" dieselbe Ausgabe; ohne die zweite meldet
// ein Muster, das auf alles passt, genauso zuversichtlich null Lücken.
test('[Negativprobe] der Klassifikator unterscheidet — Positiv- und Negativkontrolle', () => {
  const kollektorFaelle = [
    "test('x', () => { assert.deepEqual(verstoesse, [], 'msg'); });",
    "test('x', () => { assert.equal(f.length, 0, 'msg'); });",
    "test('x', () => { assert.equal(tot.join('\\n'), '',\n    'die Meldung folgt als drittes Argument'); });",
    // Ausdruck als Argument — der sechste Zu-eng-Fall des Tages: eine Zeichenklasse
    // ohne `=`/`>` verfehlt `map(x => x.name)` und stellte den Waechter still frei.
    "test('x', () => { assert.deepEqual(k.ohneRumpf.map(x => x.name), [], 'msg'); });",
  ];
  for (const q of kollektorFaelle) {
    assert.equal(P.istKollektorForm(q), true, 'Positivkontrolle: muss als Kollektor erkannt werden — ' + q.slice(0, 60));
  }
  const konstruktionsFaelle = [
    "test('x', () => { assert.equal(z.ort, ORT, 'der Ablageort steht daran'); });",
    "test('x', () => { assert.ok(html.includes('Testament'), 'benannt'); });",
    "test('x', () => { assert.equal(aufrufe, 3, 'gepinnte Zahl'); });",
  ];
  for (const q of konstruktionsFaelle) {
    assert.equal(P.istKollektorForm(q), false, 'Negativkontrolle: darf NICHT als Kollektor gelten — ' + q.slice(0, 60));
  }
  // Und der Rumpf-Sucher trifft den test()-AUFRUF, nicht die erste Nennung des Namens.
  const r = P.waechterRumpf('tests/pruefstand-bindung.test.js', 'pruefstand-jeder-waechter-hat-eine-probe');
  assert.ok(r && /assert\./.test(r), 'Rumpf gefunden und nicht leer');
  assert.ok(!/const PRUEFUNGEN/.test(r), 'der Rumpf ist der TEST, nicht die PRUEFUNGEN-Liste darüber');
});

/* ── 2c · pruefeStand ist selbst ein Messwerkzeug — also mit Kontrollen ───── */
// §3.5b: ein Werkzeug, dessen Ausgabe etwas entscheidet, traegt Positiv- UND
// Negativkontrolle. Hier entscheidet die Ausgabe, ob ein Mensch „Befund" oder
// „Arbeit" liest — und genau diese Unterscheidung ist der ganze Zweck.
test('[Negativprobe] pruefeStand nennt die ART der Abweichung, nicht nur ihre Existenz', () => {
  const wortlaut = (schluessel, ist) => {
    try { pruefeStand(schluessel, ist); return null; }
    catch (e) { return e.message; }
  };
  // Negativkontrolle: Gleichstand darf NICHT anschlagen.
  assert.equal(wortlaut('ohneBeleg', STAND.ohneBeleg.wert), null, 'unveränderte Zahl darf nicht feuern');

  // Schuld waechst -> BEFUND, ausdruecklich kein Nachziehen.
  const gewachsen = wortlaut('ohneBeleg', STAND.ohneBeleg.wert + 1);
  assert.match(gewachsen, /BEFUND/, 'wachsende Schuld muss als Befund benannt werden');
  assert.match(gewachsen, /kein Nachziehen/, 'und ausdrücklich nicht als Handbewegung');

  // Schuld sinkt -> Arbeit, kein Befund.
  const gesunken = wortlaut('ohneBeleg', STAND.ohneBeleg.wert - 1);
  assert.match(gesunken, /Arbeit erledigt/, 'sinkende Schuld ist Arbeit');
  assert.doesNotMatch(gesunken, /BEFUND/, 'und darf NICHT als Befund gelesen werden');

  // Zuwachs faellt -> BEFUND in der anderen Richtung.
  assert.match(wortlaut('proben', STAND.proben.wert - 1), /BEFUND/, 'verlorene Arbeit ist ein Befund');
  assert.match(wortlaut('proben', STAND.proben.wert + 1), /Arbeit/, 'mehr Proben sind Arbeit');

  // Feste Groesse -> Struktur-Verschiebung, weder Schuld noch Zuwachs.
  assert.match(wortlaut('kollektor', STAND.kollektor.wert + 1), /Struktur verschoben/,
    'eine feste Größe, die sich bewegt, ist eine Struktur-Verschiebung');

  // Und jede Stand-Groesse traegt eine der drei Richtungen — keine stille vierte.
  for (const [n, s] of Object.entries(STAND)) {
    assert.ok(['sinkt', 'steigt', 'fest'].includes(s.richtung), n + ': unbekannte Richtung ' + s.richtung);
    assert.ok(s.was && s.was.length > 10, n + ': ohne lesbare Beschreibung wäre die Meldung wertlos');
  }
});

/* ── 3 · Aufruf-Nachweis: die Probe wird auch BENUTZT ────────────────────── */
test('pruefstand-jede-probe-wird-vom-waechter-benutzt', () => {
  const proben = P.probenDeklarationen();
  assert.ok(proben.length > 0, 'keine PROBEN-Deklaration gefunden — der Nachweis liefe über nichts');
  const fehler = [];
  for (const p of proben) {
    const r = P.aufrufNachweis(p);
    if (!r.gefunden) { fehler.push(p.fuer + ': Diskriminante „' + p.diskriminante + '" ist in ' + p.datei + ' nicht als `function` auffindbar'); continue; }
    if (!r.gerufen) { fehler.push(p.fuer + ': Wächter RUFT „' + p.diskriminante + '" nicht (Zähler 0)'); continue; }
    if (!r.waechterRot) fehler.push(p.fuer + ': Wächter ruft „' + p.diskriminante + '", benutzt ihr Ergebnis aber nicht (bleibt grün trotz erzwungener Verletzung)');
  }
  assert.deepEqual(fehler, [], 'Aufruf-Nachweis fehlgeschlagen:\n  ' + fehler.join('\n  '));
  pruefeStand('proben', proben.length);
// Benannte Ausnahme (L3, 19./20.09.2026): instrumentiert und ruft JEDE deklarierte
// Wächter-Funktion einzeln gegen eine mutierte Kopie ihres Quelltexts auf — echte Arbeit, kein
// Hänger. Gemessen 229195.58 ms auf origin/u2-kanon@fdfdbfcf (voller Suite-Lauf, Last <8); die
// Zeitgrenze liegt mit Marge darüber, damit normale Laufzeitschwankung nicht selbst zum Fehlschlag wird.
}, { timeout: 400000 });

/* ── 4 · Meta A: der Zähler hat seine EIGENE Rot-und-Grün-Probe ──────────── */
// Ohne diesen Nachweis wäre der Zähler selbst vakuum-grün: er könnte immer „gerufen"
// melden, und niemand sähe es. Zwei Messungen je Mutation, wie festgelegt.
test('[Negativprobe] Meta A: blinder Waechter -> Zaehler 0 -> Pruefstand rot (und zurueck gruen)', () => {
  const p = P.probenDeklarationen().find(x => x.fuer === 'u2-023-abgeleitetes-alter-nie-gespeichert');
  assert.ok(p, 'Anker-Probe nicht gefunden');
  const roh = fs.readFileSync(path.join(P.REPO, p.datei), 'utf8');

  const gruen = P.aufrufNachweisAusQuelle(roh, p);
  assert.ok(gruen.gerufen && gruen.waechterRot, 'Rückstellung: das Original muss den Nachweis bestehen');

  // Wächter so verändern, dass er die Diskriminante NICHT mehr ruft.
  const blind = roh.replace(new RegExp(p.diskriminante + '\\(', 'g'), '(() => [])(');
  assert.notEqual(blind, roh, 'Mutation griff nicht — die Probe misst sonst nichts');
  const rot = P.aufrufNachweisAusQuelle(blind, p);
  assert.equal(rot.gerufen, false, 'blinder Wächter: der Zähler darf sich NICHT melden');
  assert.equal(rot.waechterRot, false, 'blinder Wächter bleibt grün — genau das muss der Prüfstand fangen');
});

/* ── 5 · Meta B: entkoppelte Probe -> Prüfstand rot ──────────────────────── */
test('[Negativprobe] Meta B: Probe zeigt auf eine fremde Funktion -> Pruefstand rot', () => {
  const p = P.probenDeklarationen().find(x => x.fuer === 'u2-038-kein-aktives-widerrufsverfahren');
  assert.ok(p, 'Anker-Probe nicht gefunden');
  const roh = fs.readFileSync(path.join(P.REPO, p.datei), 'utf8');
  // Deklaration entkoppeln: eine ANDERE, in derselben Datei vorhandene Diskriminante.
  const fremd = { ...p, diskriminante: 'alterVerstoesse' };
  assert.notEqual(fremd.diskriminante, p.diskriminante, 'die Ersatz-Funktion muss eine andere sein');
  const r = P.aufrufNachweisAusQuelle(roh, fremd);
  assert.equal(r.gefunden, true, 'die fremde Funktion existiert — die Instrumentierung greift');
  assert.equal(r.waechterRot, false,
    'Ein Wächter, der eine FREMDE Diskriminante deklariert, darf den Nachweis nicht bestehen');
  // Rückstellung: mit der richtigen Deklaration ist er wieder grün.
  const zurueck = P.aufrufNachweisAusQuelle(roh, p);
  assert.ok(zurueck.gerufen && zurueck.waechterRot, 'Rückstellung fehlgeschlagen');
});

/* ── 6 · Meta C: verstümmelte pruefung:-Zeile -> rot statt still übersprungen */
test('[Negativprobe] Meta C: verstuemmelte pruefung:-Zeile landet in der Fehlschlag-Menge', () => {
  const echt = P.pruefungsZeilen().gueltig[0];
  assert.ok(echt, 'keine gültige Zeile zum Verstümmeln');
  const faelle = [
    { zeile: 'pruefung:  ' + echt.datei, erwartet: 'nicht als „Pfad#Name" parsbar' },
    { zeile: 'pruefung:  tests/gibt-es-nicht.test.js#' + echt.name, erwartet: 'Pfad existiert nicht' },
    { zeile: 'pruefung:  ' + echt.datei + '#es-gibt-diesen-test-nicht', erwartet: 'kein Test-Titel' },
  ];
  for (const f of faelle) {
    const { gueltig, ungueltig } = P.klassifiziere([{ adr: 'PROBE.md', nr: 1, zeile: f.zeile }]);
    assert.equal(gueltig.length, 0, 'verstümmelte Zeile darf NICHT als gültig durchgehen: ' + f.zeile);
    assert.equal(ungueltig.length, 1, 'verstümmelte Zeile muss in der Fehlschlag-Menge landen, nicht verschwinden: ' + f.zeile);
    assert.ok(ungueltig[0].grund.includes(f.erwartet),
      'Grund benennt den Fehler nicht: erwartet „' + f.erwartet + '", war „' + ungueltig[0].grund + '"');
  }
  // Rückstellung: die unveränderte Zeile ist weiterhin gültig.
  const zurueck = P.klassifiziere([{ adr: echt.adr, nr: echt.nr, zeile: echt.zeile }]);
  assert.equal(zurueck.gueltig.length, 1, 'Rückstellung: die echte Zeile muss gültig bleiben');
});

/* ── Selbstheilung (03.09.2026, Auftrag) ───────────────────────────
   Eigenes Fixture, nie das echte `tests/`-Verzeichnis: ein toter und ein lebender
   `_pruefstand-tmp-*`-Name, plus eine Datei außerhalb des Musters — die Räumung darf
   nur den toten treffen. Die tote PID kommt aus einem wirklich beendeten Kindprozess
   (nicht aus einer geratenen Zahl wie 999999 — die könnte zufällig ein echter, fremder
   Prozess sein und der Fund wäre nicht gemessen, sondern erhofft). */
test('pruefstand-tmp-leichen aus toten Prozessen werden geraeumt, lebende Dateien bleiben stehen', () => {
  const { spawnSync } = require('node:child_process');
  const os = require('node:os');
  const toterProzess = spawnSync(process.execPath, ['-e', '']);
  assert.equal(toterProzess.status, 0, 'Vorbedingung: der Wegwerf-Kindprozess muss sauber beendet sein');
  const toteDatei = '_pruefstand-tmp-' + toterProzess.pid + '-1.cjs';
  const lebendeDatei = '_pruefstand-tmp-' + process.pid + '-2.cjs';
  const fremdeDatei = 'sonstige-datei-ausserhalb-des-musters.txt';

  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'pruefstand-tmp-leichen-'));
  try {
    fs.writeFileSync(path.join(fixture, toteDatei), '// Leiche');
    fs.writeFileSync(path.join(fixture, lebendeDatei), '// lebt noch');
    fs.writeFileSync(path.join(fixture, fremdeDatei), '// kein Muster-Treffer');

    const geraeumt = P.pruefstandTmpLeichenRaeumen(fixture);

    assert.deepEqual(geraeumt, [toteDatei], 'geräumt werden darf NUR die tote Datei, benannt');
    assert.equal(fs.existsSync(path.join(fixture, toteDatei)), false, 'die tote Datei muss weg sein');
    assert.equal(fs.existsSync(path.join(fixture, lebendeDatei)), true,
      'die Datei des noch (angeblich) laufenden Prozesses darf NICHT angetastet werden');
    assert.equal(fs.existsSync(path.join(fixture, fremdeDatei)), true,
      'eine Datei außerhalb des `_pruefstand-tmp-<pid>-*.cjs`-Musters darf nicht mitgeräumt werden');
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }

  assert.ok(Array.isArray(P.pruefstandTmpLeichenRaeumen()),
    'Positivkontrolle: der Default-Aufruf ohne Argument (das echte TESTS-Verzeichnis) wirft nicht');
});

/* ── Bindung ─────────────────────────────────────────────────────────────── */
test('[Klausel] der Pruefstand ist an U2-ADR-099 gebunden', () => {
  bindungPruefen(ADR, HERKUNFT, PRUEFUNGEN, __filename);
});
