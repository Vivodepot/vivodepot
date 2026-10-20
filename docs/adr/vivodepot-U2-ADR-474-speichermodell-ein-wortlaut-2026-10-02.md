# U2-ADR-474: Ein Speichermodell, eine Quelle für jede Aussage darüber

**Status:** Angenommen (02.10.2026)
**Datum:** 02.10.2026
**Kategorie:** BEDIENUNG, PERSISTENZ, TEXT
**Linie:** U2
**Bezug:** U2-ADR-237 (jede Änderung sichert still intern) · U2-ADR-212 (Sichern-Knopf folgt dem Speicher-Modus) ·
U2-ADR-244 (Speicherort entfällt beim Anlegen) · U2-ADR-031 (Persistenz-Status)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Frage

Eine heuristische Evaluation der Oberfläche vom 02.10.2026 fand vier Aussagen zum Speichern, die einander widersprechen. Schnellstart 4
sagt: „Es speichert sich von selbst … kein eigener Sichern-Schritt nötig.“ Schnellstart 5 sagt: „Sichern Sie die Datei.“ Das Bereichsende
sagt: „Gesichert sind sie erst, wenn Sie Ihr Depot gesichert haben.“ Die Hilfe beschreibt Speichern auf dem Gerät und eine
Sicherungskopie. Dazu hat „Sichern & Wiederherstellen“ in den Einstellungen keinen Knopf zum Sichern. Welche Aussage stimmt, und wie
bleiben die Stellen beieinander?

## Was stimmt (gemessen am Kern)

Das Modell ist seit U2-ADR-237 entschieden; nur die Texte sind nicht mitgezogen.

- **Interner Modus** (`internerSpeicherModus()`: die IndexedDB-Funktionsprobe ist bestanden). Jede Änderung schreibt still und
  verschlüsselt in die Ablage dieses Browsers auf diesem Gerät (`markiereUngespeichert()` → `_internAutoSpeichern()` →
  `depotInternSichern({ still: true })`). Die Anzeige steht auf „Auf diesem Gerät aktuell ✓“. Die Sicherungskopie als Datei ist ein
  eigener, seltener Vorgang, der das Depot vom Gerät unabhängig macht.
- **Datei-Modus** (die Probe scheitert). Nichts speichert sich selbst; die Datei ist das Depot.

Schnellstart 4 und die Hilfe stimmen also. Schnellstart 5 und das Bereichsende beschreiben den Stand vor U2-ADR-237. Dasselbe gilt
für den Pausen-Hinweis des Assistenten („bleibt erhalten, bis Sie das Fenster schließen“), den die Evaluation nicht nannte und die
Probe fand. Die Pille bei wiederholtem Fehlschlag verwies auf „‚Als Datei sichern'“; einen Knopf dieses Wortlauts gibt es nicht.

## Entscheidung

1. **Eine Tabelle im Kern.** `SPEICHERMODELL_SAETZE` nennt je Stelle und je Modus den Text, der dort gilt: Schnellstart 4 und 5,
   Bereichsende, Pausen-Hinweis des Assistenten, Anlege-Hinweis, die vier Absätze der Hilfe und die Pille bei wiederholtem
   Fehlschlag. `speicherSatz(stelle)` liest daraus im aktuellen Modus; keine dieser Stellen liest ihren Satz als `STRINGS.<schlüssel>`.
   Die Hilfe beschreibt beide Fälle in einem Text und trägt darum je Modus denselben Schlüssel.
2. **Ein Wortlaut je Modus.** Im internen Modus: Was Sie eintragen, speichert sich auf diesem Gerät von selbst; von Zeit zu Zeit eine
   Sicherungskopie über „Sicherungskopie erstellen“. Im Datei-Modus: Ihre Eingaben bleiben nur, solange das Fenster offen ist; die
   Datei ist Ihr Depot. Jedes zitierte Bedienwort steht als `{beschriftung:…}` und folgt damit der Beschriftung, die es zitiert.
3. **Ein Handgriff an zwei Zugängen.** „Sicherungskopie erstellen“ steht im Menü „Mein Depot“ (der schnelle Weg) und als Knopf unter
   Einstellungen → „Sichern & Wiederherstellen“ (dort, wo man sucht). Beide tragen dieselbe Beschriftung und rufen dieselbe Funktion
   `sicherungskopieErstellen()`. Abgestimmt mit der Gestaltung, die ein Wort je Sache verlangt.
4. **Eine Probe gegen die Tabelle.** `tools/speichermodell-pruefen.js` liest Tabelle, Aufrufstellen und beide Sprachmodule und prüft:
   (a) kein Satz widerspricht dem Modus, in dem er gezeigt wird, DE und EN; (b) keine Stelle liest ihren Satz selbst; (c) jedes zitierte
   Bedienwort ist eine Beschriftung, die es gibt; (d) kein Text außerhalb der Tabelle macht eine Speicher-Zusage. (d) ist der Wächter
   gegen die Klasse: Ein neuer Satz zum Speichern entsteht über das Modell oder fällt.

## Was diese Entscheidung nicht leistet

Sie ändert das Speichern selbst nicht, nur das, was darüber gesagt wird. Sie vereinheitlicht nicht die übrigen Begriffe der Oberfläche
(„Herausgeben“/„Weitergeben“ u. a., Befund B-05 derselben Evaluation). Die Muster des Wächters (d) erkennen Zusagen in den Formen, die
heute vorkommen; eine ganz neue Formulierung kann an ihnen vorbeigehen und wird dann beim nächsten Fund ergänzt.

```yaml
konformitaet:
  - aussage: >-
      Alle Stellen, die über das Speichern sprechen, lesen ihren Satz aus SPEICHERMODELL_SAETZE; kein Satz widerspricht dem Modus, in
      dem er gezeigt wird, DE und EN; zitierte Bedienwörter sind Beschriftungen, die es gibt; kein Text außerhalb der Tabelle macht eine
      Speicher-Zusage. Der Stand vor dieser Entscheidung fällt mit genau den Widersprüchen aus dem Befund.
    zustand: erfuellt
    herkunft: U2-ADR-474 (02.10.2026)
    pruefung:
      - tests/speichermodell-ein-wortlaut.test.js "dieser Baum: alle Stellen sagen dasselbe über das Speichern, DE und EN"
      - tests/speichermodell-ein-wortlaut.test.js "Rot-Beweis: der Stand vor dem Fix fällt mit genau den Widersprüchen aus dem Befund"
      - tests/speichermodell-ein-wortlaut.test.js "Rot-Beweis (d): ein neuer Satz mit einer Speicher-Zusage außerhalb des Modells fällt, DE und EN"
      - tests/speichermodell-ein-wortlaut.test.js "im Kern: die Stellen rendern den Satz des Modells, je nach Modus"
  - aussage: >-
      „Sicherungskopie erstellen“ ist im Menü „Mein Depot“ und unter Einstellungen → „Sichern & Wiederherstellen“ erreichbar, mit
      derselben Beschriftung und derselben Funktion.
    zustand: erfuellt
    herkunft: U2-ADR-474 (02.10.2026)
    pruefung:
      - tests/speichermodell-ein-wortlaut.test.js "ein Handgriff: Einstellungen-Knopf und Menüpunkt tragen dieselbe Beschriftung und rufen dieselbe Funktion"
```
