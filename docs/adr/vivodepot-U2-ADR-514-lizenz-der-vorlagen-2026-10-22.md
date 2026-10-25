# U2-ADR-514: Lizenz der Vorlagen — kurzer eigener Hinweis, geschlossene Lizenzliste für fremde

**Status:** Angenommen (22.10.2026)
**Datum:** 22.10.2026
**Kategorie:** RECHT, VORLAGEN
**Linie:** U2
**Bezug:** Entscheidung vom 22.10.2026 · B16-ADR-004 (EUPL-1.2 als Lizenz des App-Kerns; gilt für das Programm
unverändert) · U2-ADR-270 (überholt; „durchgehend EUPL-1.2“ endet für Vorlagen ab der Umstellungsfassung) · U2-ADR-258
(Register, kein Tor) · U2-ADR-039 (verworfen wird nur das Template, nie der Import)
**Status heute:** gilt für Teil 1 (Lizenzliste, Feld im Einreich-Schema, Lesen und Anzeigen im Kern). Teil 2 (Dateikopf, Hinweis in
der Datei, Herkunftsort), Teil 3 (Eingabe im Studio, dann Pflichtfeld) und Teil 4 (öffentliche Texte in der Umstellungsfassung)
folgen; ihre Belege kommen mit ihnen in den `konformitaet`-Block.

## Frage

Bis heute steht Vivodepot durchgehend unter EUPL-1.2, die Vorlagen eingeschlossen. Seit dem 22.10.2026 gilt: Die Vorlagen und ihre
Texte sind nicht Open Source. Personen sollen sie für ihre eigenen Unterlagen frei nutzen dürfen, Mitbewerber sie nicht als eigenes
Angebot übernehmen. Vorlagen von Dritten (Kammern, Vereine, Behörden) brauchen eine Lizenz, die Vivodepot das Weitergeben und den
Personen die Nutzung erlaubt. Wie wird das in der Datei, im Einreich-Schema und im Leser abgebildet, ohne einen langen Lizenzvertrag
zu schreiben und ohne ältere Vorlagen auszusperren?

## Entscheidung

1. **Das Programm bleibt EUPL-1.2** (Kern, Lese-App, Studio, Werkzeuge, der Textsatz der Oberfläche). Die Zusage, dass es nie
   restriktiver wird, gilt für das Programm.
2. **Vivodepots eigene Vorlagen** stehen ab der Umstellungsfassung unter einem kurzen Hinweis mit der SPDX-Kennung
   `LicenseRef-Vivodepot-Vorlagen`, sinngemäß: urheberrechtlich geschützt, jede Person darf sie für ihre eigenen Unterlagen nutzen,
   ausfüllen, drucken und weitergeben, kostenlos und unbefristet; alles andere nur mit Zustimmung. „Vorlagen“ umfasst Vorlagen,
   Bereiche samt ihren Feldhinweisen und Erklärungen, Dokument-, Logik-, Bürger- und Berufsmodule und Angehörigen-Vorlagen. Was bis
   zur Umstellungsfassung unter EUPL-1.2 hinausging, bleibt EUPL-1.2.
3. **Eine geschlossene Liste.** Eine Vorlage darf nur unter `LicenseRef-Vivodepot-Vorlagen`, Creative Commons BY 4.0, BY-ND 4.0 oder
   Zero 1.0 oder `EUPL-1.2` stehen. Die Liste steht an einer Stelle, `tools/vorlagen-lizenzen.json`; Kern (`VORLAGEN_LIZENZEN`), Einreich-Schema
   und Studio spiegeln sie. Es gibt eine Kennung für den kurzen Hinweis, ohne Fassungsnummer; `rechteinhaber` sagt, wessen Hinweis es
   ist (Vivodepot GmbH oder die Herausgeberin). Freie Lizenztexte gibt es nicht.
4. **Das Feld.** `templates[].lizenz = { spdx, rechteinhaber }` im Einreich-Schema, im `templateJws` mitsigniert. Amtlicher Wortlaut
   bleibt über `wortlautQuelle` (§ 5 UrhG). Pflicht wird das Feld, wenn das Studio es abfragt (Teil 3); bis dahin ist es definiert und
   optional, damit heutige Einreichungen gültig bleiben. Module, die Dritte einreichen können, bekommen dasselbe Feld in einem eigenen
   Schritt.
5. **Der Leser sperrt nicht.** `vorlageLizenzAngabe` liest die Angabe; `validateTemplate` weist wegen der Lizenz nie ab. Fehlt die
   Angabe oder ist sie unbekannt, lädt die Vorlage und die Import-Vorschau sagt sichtbar „Lizenz der Vorlage nicht erkannt“. Eine
   erkannte Angabe nennt Kennung und Rechteinhaber. Abweisen ist Sache der Signierstelle: Sie nimmt keine unbekannte Kennung an.
6. **Dateikopf** (Teil 2): Quelle und alle Produkte tragen denselben Kopf, `EUPL-1.2 AND LicenseRef-Vivodepot-Vorlagen`, mit einer
   Zeile, die abgrenzt, welche Regionen dem Hinweis folgen; im öffentlichen Stand sind diese Regionen leer. Der Wortlaut des Hinweises
   steht in der Datei, die nichts nachlädt.

## Folgen

- Eine ältere Anwendung, die eine Vorlage mit `lizenz` liest, ignoriert das Feld; eine neue liest eine ältere Vorlage ohne Feld und
  sagt „nicht erkannt“. Keine Vorlage geht verloren.
- Der Wächter der öffentlichen Lizenzaussagen beschreibt bis Teil 2 noch den Grundsatz „alles von uns steht unter
  EUPL-1.2“; Teil 2 zieht ihn nach.

## Grenzen

- Ob die Texte, die Sammlung oder die Datenbank urheberrechtlich geschützt sind, entscheidet diese ADR nicht; sie regelt, was
  Vivodepot erklärt und was der Leser zeigt.
- Teil 1 zeigt die Lizenz in der Import-Vorschau. Die Anzeige „von <Herausgeber> · <Lizenz>“ an der Vorlage selbst und in der
  Lese-App kommt mit Teil 2 und 3.

```yaml
konformitaet:
  - aussage: >-
      Die Liste der zulässigen Vorlagen-Lizenzen steht in tools/vorlagen-lizenzen.json; Kern und Einreich-Schema führen dieselbe
      Liste in derselben Reihenfolge.
    zustand: erfuellt
    herkunft: U2-ADR-514 (22.10.2026)
    pruefung:
      - tests/vorlagen-lizenz.test.js "[Vorlagen-Lizenz·eine Liste] Kern und Einreich-Schema führen dieselbe Liste wie tools/vorlagen-lizenzen.json"
      - tests/vorlagen-lizenz.test.js "[Vorlagen-Lizenz·eine Liste·Rot-Beweis] eine Kennung mehr im Schema als in der Liste fällt auf"
  - aussage: >-
      Der Kern erkennt eine Kennung aus der Liste mit Rechteinhaber; fehlend, unbekannt, ohne Rechteinhaber oder falsch geformt ist
      nicht erkannt. validateTemplate weist wegen der Lizenz keine Vorlage ab.
    zustand: erfuellt
    herkunft: U2-ADR-514 (22.10.2026)
    pruefung:
      - tests/vorlagen-lizenz.test.js "[Vorlagen-Lizenz·Angabe] eine Kennung aus der Liste mit Rechteinhaber ist erkannt"
      - tests/vorlagen-lizenz.test.js "[Vorlagen-Lizenz·Angabe·Rot-Beweis] fehlend, unbekannt, ohne Rechteinhaber oder falsch geformt ist nicht erkannt"
      - tests/vorlagen-lizenz.test.js "[Vorlagen-Lizenz·kein Tor] validateTemplate weist wegen der Lizenz keine Vorlage ab"
  - aussage: >-
      Die Import-Vorschau nennt bei erkannter Lizenz Kennung und Rechteinhaber und sagt sonst sichtbar „nicht erkannt“; beide Sätze
      stehen deutsch und englisch im Textsatz.
    zustand: erfuellt
    herkunft: U2-ADR-514 (22.10.2026)
    pruefung:
      - tests/vorlagen-lizenz.test.js "[Vorlagen-Lizenz·Vorschau] erkannt nennt Kennung und Rechteinhaber, nicht erkannt sagt es sichtbar"
      - tests/vorlagen-lizenz.test.js "[Vorlagen-Lizenz·Vorschau·Rot-Beweis] ohne Angabe im Plan steht keine Lizenzzeile da"
      - tests/vorlagen-lizenz.test.js "[Vorlagen-Lizenz·Textsatz] beide Sätze stehen deutsch und englisch, der erkannte mit beiden Platzhaltern"
```
