# U2-ADR-465 · Format-Module: Felder aus mehreren Bereichen, feste Werte, Namensraum aus dem Modul

**Status:** Akzeptiert, gebaut.
**Datum:** 01.10.2026 (Entwurf), ergänzt 05.10.2026 (`werte`, `teil`, `hinweis`)
**Kategorie:** ARCHITEKTUR, STANDARDS
**Status heute:** gilt
**Betrifft:** `vivodepot.html` (`FORMAT_MODUL_SCHLUESSEL`, `_xmlKanalGrund`, `FORMAT_ZUORDNUNG_SCHLUESSEL`, `formatNamensraumFremd`, `formatModulPruefen`, `formatModulZuExportKanal`, `_FORMAT_HINWEIS_FORM`), `docs/format-modul/format-modul-schema.json`, `tools/standardnamen-pruefen.js`.
**Bezug:** U2-ADR-257 (Schreiber `xml@1`), U2-ADR-145 (ein Einlassweg), U2-ADR-456 (FIM-Bezüge: Kennung, Fassung, Status), U2-ADR-030 (Selbstauskunft im Export).

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

**Erste Stufe ohne Anhang (05.10.2026).** Ein Antrag verlangt Nachweise als Anhang (etwa den Nachweis der Vollmacht). Die erste Stufe schreibt keinen Anhang. Das FIM-Modul trägt darum den `hinweis` „nicht einreichbar ohne Anhang“, und sein `label` sagt dasselbe; die Datei gibt sich nirgends als einreichbar aus. Der Anhang folgt als eigener Schritt.

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
      Ein Modul ohne die neuen Schlüssel schreibt wie zuvor.
    zustand: erfuellt
    herkunft: U2-ADR-465 (01.10.2026)
    pruefung:
      - tests/u2-adr-465-format-bereiche-fest-namensraum.test.js
        "[U2-ADR-465] ein Modul ohne die neuen Schlüssel schreibt wie zuvor (ein Bereich, ohne Namensraum)"
```
