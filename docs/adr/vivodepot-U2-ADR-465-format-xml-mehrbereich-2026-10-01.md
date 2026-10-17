# U2-ADR-465 · Format-Module: Felder aus mehreren Bereichen, feste Werte, Namensraum aus dem Modul

**Status:** Akzeptiert, gebaut.
**Datum:** 01.10.2026 (Entwurf), ergänzt 05.10.2026 (`werte`, `teil`, `hinweis`; Nachtrag Anhänge), 16.10.2026 (Nachtrag JSON: Ziel als Liste, `schemaUri`)
**Kategorie:** ARCHITEKTUR, STANDARDS
**Status heute:** gilt
**Betrifft:** `vivodepot.html` (`FORMAT_MODUL_SCHLUESSEL`, `_xmlKanalGrund`, `FORMAT_ZUORDNUNG_SCHLUESSEL`, `formatNamensraumFremd`, `formatModulPruefen`, `formatModulZuExportKanal`, `_FORMAT_HINWEIS_FORM`, `FORMAT_ANHANG_ROLLEN`, `FORMAT_VERTRETER_FELDER`, `formatAnhaengeAufloesen`, `formatVertreterAufloesen`, `formatAnhangKandidaten`, `_formatAnhangWahl`, `_formatPfadTeile`, `formatSchemaUriFremd`, `_FORMAT_SCHEMA_URI_FORM`), `docs/format-modul/format-modul-schema.json`, `tools/standardnamen-pruefen.js`, `tools/fim-modul-erzeugen.mjs`, `tests/konformitaet/adapter/ajv-json-schema.mjs`.
**Bezug:** U2-ADR-257 (Schreiber `xml@1`), U2-ADR-145 (ein Einlassweg), U2-ADR-456 (FIM-Bezüge: Kennung, Fassung, Status), U2-ADR-030 (Selbstauskunft im Export), U2-ADR-013 („Meine Dokumente“), U2-ADR-468 (Urschrift der Vollmacht), U2-ADR-467 (getrennte Namen und Anschrift).

## Frage

Ein Eingang eines Zielsystems verlangt oft ein XML nach fremdem Schema, das Angaben aus mehreren Bereichen des Depots zusammenführt, feste Werte trägt und einen Namensraum hat. Erster Fall ist ein Antrag nach einem FIM-Stammdatenschema: antragstellende Person, bevollmächtigte Person und Gesundheitsangaben in einem Dokument, Namensraum nach dem XSD des Schemas. Trägt die Modulart `format` das, ohne dass der Kern das fremde Schema kennen muss?

## Entscheidung

1. **`bereich` je Zuordnung.** Ein Eintrag darf ein Feld aus einem anderen Bereich als `sektor` lesen. Das Feld muss in diesem Bereich existieren; ein Modul erfindet kein Feld. Nur in der Ausgabe: ein Import-Kanal schreibt in genau einen Bereich.
2. **`fest` je Zuordnung.** Ein Eintrag darf statt eines Felds einen festen Wert (Text, Zahl, Wahrheitswert) an ein Ziel schreiben. Nur in der Ausgabe. `feld` und `fest` zugleich sind ein Widerspruch und werden verworfen; ein Modul mit nur festen Werten gibt nichts aus dem Depot heraus und wird abgewiesen.
3. **Die Folge der Zuordnung ist die Elementfolge.** Ein XSD verlangt seine Folge; der Schreiber hält sie ein, indem er die Einträge der Reihe nach schreibt.
4. **Ein Filter, kein zweiter Weg.** Jedes Feld läuft einzeln durch `baueAusMapping` — sensibel nur mit Zustimmung, verifiziert-stämmige Werte nicht als Selbstauskunft. Die Erweiterung öffnet keinen Weg an diesem Filter vorbei.
5. **`namensraum` am Modul.** Ein Ausgabe-Modul mit dem Schreiber `xml@1` darf einen Namensraum nennen; der Kern schreibt ihn als Standard-Namensraum an die Wurzel. Das ist eine Aussage des Moduls über sein Ziel, nicht des Kerns (U2-ADR-257 bleibt: der Kern setzt von sich aus keinen).
6. **`wurzel` am Modul.** Ein XML-Ausgabe-Modul darf den Namen des Wurzelelements unmittelbar nennen statt als Pfad in `quelle`. Ein XML-Name darf Punkte tragen (das XSD eines FIM-Schemas nennt etwa `fim.S…`), ein Pfad nicht. `quelle` und `wurzel` zugleich sind ein Widerspruch.
7. **Ein fremder Namensraum nur mit verifizierter Signatur.** Jeder Namensraum außer dem eigenen (`urn:vivodepot:`, `https://vivodepot.de/`) behauptet einen fremden Standard — XÖV, FIM, XJustiz. Der Kern gibt einem solchen Modul nur dann einen Kanal, wenn der Einlassweg seine Signatur verifiziert hat (`ungeprueft === false`, gesetzt allein von `modulEinlassenGeprueft`). Ein selbst angedocktes oder unsigniertes Modul mit fremdem Namensraum bekommt keinen Kanal. Im Repo ist jedes Modul unsigniert; `tools/standardnamen-pruefen.js` meldet dort jeden fremden Namensraum als Mangel.
8. **`werte` und `teil` je Zuordnung.** `werte` bildet den Rohwert eines Felds auf einen Wert der Codeliste des Ziels ab, `teil` nimmt Tag, Monat oder Jahr eines Datums. Beides nur in der Ausgabe, nicht beides zugleich. Ein vorhandener Rohwert ohne Eintrag in `werte` wird nicht geraten: er fehlt in der Datei und steht in `optionen._unabgebildet`, damit der Aufrufer ihn benennt.
9. **`hinweis` am Modul.** Ein XML-Ausgabe-Modul darf einen Hinweis tragen; der Kern schreibt ihn als Kommentar zwischen XML-Deklaration und Wurzel. So sagt die Datei selbst, was sie nicht ist — etwa „nicht einreichbar ohne Anhang“ —, ohne das Schema des Ziels zu berühren. Ein Hinweis mit `--`, mit `<`/`>` oder auf `-` endend wird abgewiesen, nicht umgeschrieben.

## Anwendungsfall FIM und die Lizenzauflage

Das erste Modul dieser Art bildet ein FIM-Stammdatenschema ab. Seine Struktur und seine Feldnamen sind Inhalt (Entscheid vom 01.10.2026). Sie stehen nur im Modul, nicht im Kern und nicht im öffentlichen Zuschnitt (ein Prüfer im Repo hält das: er sucht Schema-Markup und Verschachtelung im Kern und in jeder hinausgehenden Datei). Das Modul wird signiert eingelassen, nicht ab Werk ausgeliefert. **Bis die FITKO der Nutzung der Inhalte zugestimmt hat, wird es nur auf dem Gerät der Inhaberin vorgeführt und an niemanden herausgegeben** — nicht an Teilnehmende, nicht an Partner, nicht als Download. Die Signatur ändert an dieser Lizenzfrage nichts.

**Erste Stufe ohne Anhang (05.10.2026).** Ein Antrag verlangt Nachweise als Anhang (etwa den Nachweis der Vollmacht). Die erste Stufe schreibt keinen Anhang. Das FIM-Modul trägt darum den `hinweis` „nicht einreichbar ohne Anhang“, und sein `label` sagt dasselbe; die Datei gibt sich nirgends als einreichbar aus. Der Anhang folgt im Nachtrag unten.

## Nachtrag 05.10.2026 · Anhänge, eingebettet

**Frage.** Ein FIM-Datenfeld vom Datentyp `file` (XDatenfelder) wird im XSD des Umwandlers zu einem Element vom Typ `xs:anyType`. Wie kommt ein Nachweis, ein Bescheid oder ein Lichtbild aus „Meine Dokumente“ in die Datei, ohne dass das Modul eine Datei nennt und ohne dass ein Entwurf als Nachweis hinausgeht?

**Entscheidung.**

10. **`anhang` je Zuordnung: eine Rolle, nie eine Datei.** Ein Eintrag nennt die Rolle eines Anhangs aus der Kern-Liste `FORMAT_ANHANG_ROLLEN` (`bescheid`, `vollmacht-nachweis`, `lichtbild`) und wahlweise `pflicht`. Er steht allein, ohne `feld`, `fest`, `bereich`, `werte`, `teil`; jede Rolle höchstens einmal je Modul. Nur in der Ausgabe.
11. **Die Datei wählt und bestätigt die Person beim Export.** Der Export fragt je Rolle nach einer Datei aus „Meine Dokumente“; der Knopf ist die Bestätigung, dass es die Nachweise sind (wie `urschriftBestaetigt` bei ISiK, U2-ADR-468). Zur Wahl stehen nur Dateien, die Vivodepot nicht erzeugt hat; für den Nachweis der Vollmacht nur die Urschrift, auf die das Dokument der Vorsorgevollmacht zeigt; für das Lichtbild nur JPEG oder PNG. Programmatisch: `optionen.anhaenge = { rolle: Mappe-Kennung }`.
12. **Eingebettet als Base64.** Der Inhalt steht als `xs:base64Binary` im Element, ohne Leerraum. Mime-Typ und Dateiname gehen dabei verloren: `xs:anyType` gibt ihnen keinen Platz, und erfundene Attribute wären eine Behauptung über ein fremdes Schema.
13. **Keine Datei statt eines Platzhalters.** Ist ein Pflicht-Anhang nicht gewählt, ist die gewählte Datei ein Vivodepot-Entwurf, nicht die Urschrift der Vollmacht, von falscher Art oder ihr Inhalt kein Base64, entsteht keine Datei. Der Grund wird der Person gesagt (`anhang-unbestaetigt`, `anhang-ist-entwurf`, `anhang-keine-vollmacht`, `anhang-art-passt-nicht`, `anhang-datei-fehlt`, `anhang-inhalt-ungueltig`). Ein freiwilliger Anhang ohne Wahl fehlt einfach.
14. **`vertreter` je Zuordnung: die bevollmächtigte Person nur mit Nachweis.** Ein Eintrag darf ein Feld der bevollmächtigten Person nennen (`FORMAT_VERTRETER_FELDER`: getrennte Namen und Anschrift nach U2-ADR-467, nie aus `name` zerlegt). Ein Modul mit `vertreter` muss die Rolle `vollmacht-nachweis` tragen. Geschrieben werden diese Felder nur, wenn der Nachweis bestätigt beiliegt; ohne ihn fehlt die ganze Gruppe, es gibt keinen Antrag in Vertretung ohne Nachweis. Nennt die Vollmacht keine, mehrere oder eine als „Privat“ markierte Person, entsteht keine Datei (`vertreter-fehlt`, `vertreter-mehrere`, `vertreter-privat`).
15. **Der Erzeuger.** `tools/fim-modul-erzeugen.mjs` ordnet ein `xs:anyType`-Element nur über eine Rolle zu und übernimmt `pflicht` aus dem XSD. In einer Gruppe, die fehlen darf, ist ein Anhang nicht Pflicht. Ein `hinweis` ist nur noch verlangt, solange ein Pflicht-Anhang ohne Zuordnung bleibt.

**Wie ein Anhang in der Fachdaten-Instanz steht, ist amtlich offen.** Gesucht am 05.10.2026 und unabhängig gegengelesen, keine Regel gefunden in:

- XDatenfelder 2.0 (IT-Planungsrat, Beschluss 2019/15): `file` steht nur als Codelistenwert „Anlage (Datei)“. Weg: Spezifikation als Text, Suche nach „file“ und „Anlage“, Abschnitt zu den Datentypen lesen.
- XDatenfelder 3.0.0, Spezifikation (XRepository, `urn:xoev-de:fim:standard:xdatenfelder_3.0.0`): `maxSize` und `mediaType` nur bei Datenfeldern vom Typ `file`, nichts zur Darstellung in den Antragsdaten. Weg: Abschnitte zu Datentyp, `maxSize` und `mediaType`.
- FIT-Connect, Metadatenschema 1.4.0 (schema.fitko.de/fit-connect/metadata/1.4.0): Anlagen reisen getrennt von den Fachdaten (`contentStructure.attachments`, je Anlage `attachmentId`, `hash`, `mimeType`, `filename`, `purpose`); `contentStructure.data` nennt Hash, Signatur und Fachdatenschema, keinen Verweis auf eine Anlage (`fragments` an einer Anlage sind ihre Teilstücke). Weg: `contentStructure` im Schema.
- XFall-Container 3.0 (XRepository): ein Dokument trägt `content` als `xs:base64Binary` oder einen externen Verweis — das ist die Hülle, nicht der Fachdatensatz. Weg: Typ des Dokuments im XSD des Containers.
- XFall 4, Steckbrief-Anlage: Anlagen im Container, keine Vorgabe für die Fachdaten. Weg: Abschnitt zu Anlagen.
- Umwandler des FIM-Portals (`/tools/xdf2-xsd-converter`, s. `tools/fim-schema-beschaffen.mjs`): er schreibt ein `file`-Feld als Element vom Typ `xs:anyType`, ohne Vorgabe für den Inhalt. Weg: die Elemente mit `type="xs:anyType"` im erzeugten XSD.

Die Wahl „eingebettet“ folgt der Form von `content` im XFall-Container. Eine getrennte Übertragung mit FIT-Connect-Metadaten ist ein eigener Schritt beim Einreichweg. Die Frage an die FITKO, ob eingebettet oder als Verweis auf eine getrennte Anlage, steht.

**Was KoSIT hier belegt.** `xs:anyType` nimmt jeden Inhalt an. Ein KoSIT-Grün belegt für die Datei mit Anhängen das Schema der übrigen Elemente und dass ein Pflicht-Anhang da ist — nicht die Form des Anhangs. Die Form halten zwei eigene Proben: der byte-gleiche Rundlauf und eine Base64-Regel, die nicht aus KoSIT und nicht aus dem Kern kommt.

## Nachtrag 16.10.2026 · FIM als JSON: Ziel als Liste von Pfadstufen, `schemaUri`

**Frage.** Das FIM-Portal liefert je Leistung auch ein JSON-Schema (draft 2020-12). Seine Schlüssel sind Kennung und Fassung
(`G99000002V1.0`), Gruppen verschachtelt über `$defs`. Der Schreiber baut die Ausgabe aus Zielpfaden, die er an Punkten
trennt; ein Zielpfad `G99000002V1.0.F99000003V1.0` ist mehrdeutig. Dieselbe Hürde löste Nr. 6 für den XML-Wurzelnamen; für
JSON trifft sie jede Stufe. Weg zum Nachsehen der Form: die Schlüssel unter `properties` und `$defs` eines Schemas von
schema.fim.fitko.net; im Repo die erfundene Form `tests/fixtures/fim-schema/S99000001_V1.0.schema.json`.

**Entscheidung.**

16. **`ziel` darf eine Liste von Pfadstufen sein**, additiv neben dem Punkt-Pfad (`["G99000002V1.0", "F99000003V1.0"]`). Jede
    Stufe ist fremde Eingabe und wird geprüft wie ein Teilstück des Strings: Text, nicht leer und nicht nur Leerraum, keine
    davon `__proto__`, `constructor` oder `prototype`, höchstens 64 Stufen (`_formatPfadTeile`). Eine Stufe mit Punkt gibt es
    nur in der Listenform; der Punkt-String trennt weiter an jedem Punkt. Das gilt für `json@1` und `xml@1` gleich, für XML
    bleibt der Test auf XML-Namen je Stufe. Geschrieben wird mit derselben Funktion wie bisher (`_formatPfadSchreiben`: nur
    eigene Eigenschaften, nie entlang der Prototypenkette). Beim Einlesen ist die flache Zwischenebene nach der Stelle der
    Zuordnung geschlüsselt, damit zwei Listen nie auf denselben Schlüssel fallen.
17. **`schemaUri` am Modul: nur die Angabe.** Ein Ausgabe-Modul (jeder Schreiber) darf die Kennung des Schemas nennen, das
    seine Ausgabe erfüllen soll. Feste Form: `https://`, Host in Kleinbuchstaben, ein Pfad ohne Anfrage, Fragment,
    Anmeldedaten und Leerraum (`_FORMAT_SCHEMA_URI_FORM`). Der Kern löst sie nie auf und ruft kein Netz; der Kanal trägt sie
    unverändert weiter (`kanal.schemaUri`), damit ein späterer Schritt sie nutzen kann. An einem Eingabe-Modul wird sie
    abgewiesen (`schemaUri-ohne-ausgabe`).
18. **Eine fremde `schemaUri` nur mit verifizierter Signatur**, wie ein fremder Namensraum (Nr. 7): jede Adresse außerhalb von
    `https://vivodepot.de/` behauptet einen fremden Standard. Ohne Beleg der Ladeprüfung (`modulBelegGeprueft`) und nicht
    nach Inhalt ab Werk gibt `formatModulZuExportKanal` keinen Kanal. Im Repo meldet `tools/standardnamen-pruefen.js` ein
    Modul mit fremder `schemaUri` als Mangel.
19. **Der Prüfer in der Suite ist Ajv** (8.20.0, exakt in `package.json` und `package-lock.json`; `ajv/dist/2020`, strict mode
    in der Standard-Einstellung, offline: kein Nachladen, Verweise nur innerhalb des Schemas). Adapter
    `tests/konformitaet/adapter/ajv-json-schema.mjs`, Registerzeile `fim-leistungsschema-json`. Die Probe prüft gegen das
    erfundene Schema S99000001 (per SHA-256 in der Probe gepinnt); echte Schemas laufen per `VD_FIM_JSON_SCHEMA` und
    `VD_FIM_JSON_MODUL` außerhalb des Repos, wie beim KoSIT-Lauf.
20. **Der Erzeuger kennt den JSON-Weg.** `tools/fim-modul-erzeugen.mjs --json-schema` liest Blätter, Pflicht und
    Aufzählungen aus dem Schema (Verweise nur `#/$defs/…`), schreibt Listen-Ziele und setzt `schemaUri` auf die `$id`.
    Anhänge und `vertreter` trägt nur der XSD-Weg; `teil` nur an einem Zahlfeld.

**Grenzen, benannt.** Echte FIM-Schemas tragen vereinzelt `format: date`; Ajv übersetzt das im strict mode nur mit
ajv-formats, das nicht eingebunden ist — der Lauf scheitert dann laut, er winkt nicht durch (Weg: `pruefer()` aus dem
Adapter auf das Schema der Leistung anwenden). Die Prüfung in der App vor dem Versand gegen das Schema im Modul ist ein
eigener Schritt; dieser Nachtrag prüft nur in der Suite. Die Lizenzauflage oben gilt für das JSON-Schema einer Leistung
unverändert.

## Was diese Entscheidung nicht leistet

Sie liest keine Datei nach fremdem Schema zurück (Import bleibt ein Bereich, ohne feste Werte). Sie prüft nicht, ob ein Modul das Schema seines Namensraums wirklich erfüllt — das tut ein Prüfer am erzeugten Dokument (für FIM: KoSIT gegen das XSD des Schemas). Sie setzt kein Präfix und keinen zweiten Namensraum.

```yaml
konformitaet:
  - aussage: >-
      Felder aus zwei Bereichen und feste Werte werden in der Folge der Zuordnung geschrieben.
    zustand: erfuellt
    herkunft: U2-ADR-465 (01.10.2026)
    pruefung:
      - tests/u2-adr-465-format-bereiche-fest-namensraum.test.js
        "[U2-ADR-465] Felder aus zwei Bereichen und ein fester Wert, in der Folge der Zuordnung"
  - aussage: >-
      Jedes Feld läuft durch denselben Filter; ein sensibles Feld fehlt ohne Zustimmung.
    zustand: erfuellt
    herkunft: U2-ADR-465 (01.10.2026)
    pruefung:
      - tests/u2-adr-465-format-bereiche-fest-namensraum.test.js
        "[U2-ADR-465] der eine Filter bleibt: ein sensibles Feld aus dem zweiten Bereich fehlt ohne Zustimmung"
  - aussage: >-
      Ein fremder Namensraum nur mit verifizierter Signatur; ein unsigniertes Modul mit urn:xoev-de bekommt keinen Kanal,
      und im Repo trägt kein Modul einen fremden Namensraum.
    zustand: erfuellt
    herkunft: U2-ADR-465 (01.10.2026)
    pruefung:
      - tests/u2-adr-465-format-bereiche-fest-namensraum.test.js
        "[U2-ADR-465·Rot-Beweis] ein unsigniertes Modul mit urn:xoev-de-Namensraum bekommt keinen Kanal"
      - tests/standardnamen-schutz.test.js
        "[Standardnamen·Namensraum·Rot-Beweis] ein unsigniertes Modul mit urn:xoev-de-Namensraum fällt, der eigene nicht"
  - aussage: >-
      Ein Wurzelname mit Punkten wird über `wurzel` geschrieben; `quelle` und `wurzel` zugleich werden abgewiesen.
    zustand: erfuellt
    herkunft: U2-ADR-465 (01.10.2026)
    pruefung:
      - tests/u2-adr-465-format-bereiche-fest-namensraum.test.js
        "[U2-ADR-465] `wurzel` nennt einen Wurzelnamen mit Punkten, wie ihn das XSD eines FIM-Schemas verlangt"
  - aussage: >-
      `werte` bildet den Rohwert ab, `teil` zerlegt ein Datum; ein Rohwert ohne Eintrag wird nicht geraten, sondern benannt.
    zustand: erfuellt
    herkunft: U2-ADR-465 (05.10.2026)
    pruefung:
      - tests/u2-adr-465-format-bereiche-fest-namensraum.test.js
        "[U2-ADR-465] werte bildet den Rohwert ab, teil zerlegt das Datum; gelesen wird der Rohwert, nicht die Beschriftung"
      - tests/u2-adr-465-format-bereiche-fest-namensraum.test.js
        "[U2-ADR-465·Rot-Beweis] ein Rohwert ohne Eintrag wird nicht geraten: er fehlt und steht in optionen._unabgebildet"
  - aussage: >-
      Der Hinweis des Moduls steht als Kommentar in der Datei selbst; ein Hinweis, der kein gültiger XML-Kommentar wäre,
      oder einer an einem anderen als dem XML-Schreiber wird abgewiesen.
    zustand: erfuellt
    herkunft: U2-ADR-465 (05.10.2026)
    pruefung:
      - tests/u2-adr-465-format-bereiche-fest-namensraum.test.js
        "[U2-ADR-465] `hinweis` steht in der Datei selbst, als Kommentar zwischen Deklaration und Wurzel"
      - tests/u2-adr-465-format-bereiche-fest-namensraum.test.js
        "[U2-ADR-465·Rot-Beweis] `hinweis`: kein „--“, nicht auf „-“ endend, nur am XML-Ausgabe-Modul"
  - aussage: >-
      Das Base64 eines Anhangs ergibt byte-gleich die Datei aus „Meine Dokumente“ und ist xs:base64Binary nach einer
      eigenen Regel, nicht nach dem Urteil des Validators.
    zustand: erfuellt
    herkunft: U2-ADR-465 Nachtrag (05.10.2026)
    pruefung:
      - tests/fim-anhang.test.js
        "[FIM-Anhang·Rundlauf] das Base64 im Element ergibt byte-gleich die Datei aus „Meine Dokumente“, je Rolle"
      - tests/fim-anhang.test.js "[FIM-Anhang·Base64·Rot-Beweis] die eigene Regel weist ab, was kein xs:base64Binary ist"
  - aussage: >-
      Ohne gewählten Pflicht-Anhang, mit einem Vivodepot-Entwurf oder mit einer anderen Datei als der Urschrift der
      Vorsorgevollmacht entsteht keine Datei, und der Grund wird gesagt.
    zustand: erfuellt
    herkunft: U2-ADR-465 Nachtrag (05.10.2026)
    pruefung:
      - tests/fim-anhang.test.js "[FIM-Anhang·Rot-Beweis] ohne gewählten Pflicht-Anhang keine Datei, der Grund ist benannt"
      - tests/fim-anhang.test.js
        "[FIM-Anhang·Rot-Beweis] ein Entwurf aus Vivodepot ist kein Nachweis — am Kennzeichen und am Merkmal in der Datei"
      - tests/fim-anhang.test.js
        "[FIM-Anhang·Rot-Beweis] als Nachweis der Vollmacht zählt nur die Urschrift der Vorsorgevollmacht"
      - tests/fim-anhang.test.js
        "[FIM-Anhang·Wahl] der Dialog gibt die gewählte Datei weiter; ohne Pflicht-Anhang entsteht keine Datei, die Gründe stehen da"
  - aussage: >-
      Die bevollmächtigte Person steht nur mit bestätigtem Nachweis der Vollmacht in der Datei.
    zustand: erfuellt
    herkunft: U2-ADR-465 Nachtrag (05.10.2026)
    pruefung:
      - tests/fim-anhang.test.js "[FIM-Anhang] ohne Nachweis der Vollmacht kein Antrag in Vertretung: die Gruppe fehlt ganz"
      - tests/fim-anhang.test.js
        "[FIM-Anhang·Rot-Beweis] eine private, mehrere oder keine bevollmächtigte Person: keine Datei, der Grund ist benannt"
  - aussage: >-
      Die Datei mit eingebetteten Anhängen erfüllt das XSD der Leistung; ohne den Pflicht-Anhang lehnt der Validator ab.
    zustand: erfuellt
    herkunft: U2-ADR-465 Nachtrag (05.10.2026)
    pruefung:
      - tests/kosit-validator-lauf.test.js
        "[KoSIT·Lauf] die Datei des Kerns mit eingebetteten Anhängen erfüllt das Schema der Leistung"
      - tests/kosit-validator-lauf.test.js "[KoSIT·Lauf·Rot-Beweis] ohne den Pflicht-Anhang lehnt KoSIT die Datei ab"
  - aussage: >-
      Der Erzeuger ordnet Anhänge nur über eine Rolle zu, übernimmt `pflicht` aus dem XSD und verlangt einen Hinweis nur
      bei einem Pflicht-Anhang ohne Zuordnung.
    zustand: erfuellt
    herkunft: U2-ADR-465 Nachtrag (05.10.2026)
    pruefung:
      - tests/fim-modul-erzeugen.test.js
        "[FIM-Modul·Rot-Beweis] Pflicht-Anhang ohne Zuordnung und ohne hinweis: kein Modul; mit hinweis eine benannte Lücke"
  - aussage: >-
      Ein Ziel als Liste von Pfadstufen trägt Schlüssel mit Punkt in json@1 und xml@1; der Punkt-String trennt weiter.
    zustand: erfuellt
    herkunft: U2-ADR-465 Nachtrag (16.10.2026)
    pruefung:
      - tests/fim-json-schema-weg.test.js "[U2-ADR-465·Liste] json@1: Stufen mit Punkt werden Schlüssel, nicht Trennstellen"
      - tests/fim-json-schema-weg.test.js
        "[U2-ADR-465·Liste] xml@1: dieselbe Listenform, jede Stufe ein XML-Name (Punkte erlaubt)"
      - tests/fim-json-schema-weg.test.js "[U2-ADR-465·Liste] Einlesen: eine Listen-Zuordnung liest denselben Schlüssel zurück"
  - aussage: >-
      Pfadstufen sind fremde Eingabe: verbotene, leere und fremde Stufen werden abgewiesen und nie in die Prototypenkette
      geschrieben.
    zustand: erfuellt
    herkunft: U2-ADR-465 Nachtrag (16.10.2026)
    pruefung:
      - tests/fim-json-schema-weg.test.js
        "[U2-ADR-465·Liste·Rot-Beweis] Auflage 1: verbotene, leere und fremde Stufen werden abgewiesen, nie geschrieben"
  - aussage: >-
      `schemaUri` ist nur Text in fester Form, nur an Ausgabe-Modulen, und Prüfen, Kanal und Ausgabe rufen kein Netz.
    zustand: erfuellt
    herkunft: U2-ADR-465 Nachtrag (16.10.2026)
    pruefung:
      - tests/fim-json-schema-weg.test.js "[U2-ADR-465·schemaUri] Form, nur Ausgabe, und der Kanal trägt sie unverändert"
      - tests/fim-json-schema-weg.test.js "[U2-ADR-465·schemaUri] Auflage 2: Prüfen, Kanal und Ausgabe rufen kein Netz"
  - aussage: >-
      Eine fremde `schemaUri` nur mit verifizierter Signatur; ein unsigniertes Modul bekommt keinen Kanal, und im Repo nennt
      kein Modul eine fremde.
    zustand: erfuellt
    herkunft: U2-ADR-465 Nachtrag (16.10.2026)
    pruefung:
      - tests/fim-json-schema-weg.test.js
        "[U2-ADR-465·schemaUri·Rot-Beweis] eine fremde schemaUri ohne verifizierte Signatur bekommt keinen Kanal"
      - tests/standardnamen-schutz.test.js
        "[Standardnamen·schemaUri·Rot-Beweis] ein unsigniertes Modul mit fremder schemaUri fällt, die eigene nicht (U2-ADR-465 Nachtrag)"
  - aussage: >-
      Die JSON-Ausgabe des Kerns erfüllt das JSON-Schema der Leistung (Ajv, gepinnt, offline); fehlt ein Pflichtfeld im
      Depot, lehnt Ajv ab.
    zustand: erfuellt
    herkunft: U2-ADR-465 Nachtrag (16.10.2026)
    pruefung:
      - tests/fim-json-schema-weg.test.js
        "[U2-ADR-465·JSON] die Ausgabe des Kerns erfüllt das JSON-Schema (Ajv 2020, strict, offline)"
      - tests/fim-json-schema-weg.test.js
        "[U2-ADR-465·JSON·Rot-Beweis] fehlt ein Pflichtfeld im Depot, lehnt Ajv ab — der Kern erfindet nichts"
      - tests/fim-json-schema-weg.test.js
        "[U2-ADR-465·JSON] Auflage 3: ajv exakt gepinnt (package.json, Lockfile, installiert) und das Schema-Fixture per SHA-256"
  - aussage: >-
      Der Erzeuger schreibt aus dem JSON-Schema ein json@1-Modul mit Listen-Zielen und `schemaUri`.
    zustand: erfuellt
    herkunft: U2-ADR-465 Nachtrag (16.10.2026)
    pruefung:
      - tests/fim-modul-erzeugen.test.js
        "[FIM-Modul·JSON] das erzeugte Modul ist genau das Modul, das der Ajv-Lauf prüft, und besteht die Prüfung des Kerns"
      - tests/fim-modul-erzeugen.test.js
        "[FIM-Modul·JSON·Rot-Beweis] unbekannter Pfad, Wert außerhalb der Aufzählung, teil an einem Textfeld, Anhang, fremder Verweis"
  - aussage: >-
      Ein Modul ohne die neuen Schlüssel schreibt wie zuvor.
    zustand: erfuellt
    herkunft: U2-ADR-465 (01.10.2026)
    pruefung:
      - tests/u2-adr-465-format-bereiche-fest-namensraum.test.js
        "[U2-ADR-465] ein Modul ohne die neuen Schlüssel schreibt wie zuvor (ein Bereich, ohne Namensraum)"
```
