# U2-ADR-497 · Die Beschriftung eines Felds in Ausgaben ist getrennt von seiner Beschriftung in der Eingabe

**Status:** Akzeptiert, gebaut (v923)
**Datum:** 09.10.2026 (Commits 2bedde144 und 0a628def5)
**Kategorie:** DATENMODELL, TEXTE
**Linie:** U2
**Status heute:** gilt
**Betrifft:** `vivodepot.html` (`feldAusgabeBeschriftung`, `listenEintragZusammenfassung`, `_verweisListenEintragZusammenfassung`, `prueftermineZeilen`, Übernahme-Notiz in `depotNormalisieren`), `vivodepot-lesen.html` (Listenzusammenfassung), `tools/build-textsatz-eingebaut-lesen.js`, `tools/textsatz-de-modul.json`, `tools/textsatz-en-modul.json`.
**Bezug:** U2-ADR-467 (getrennte Namens- und Anschriftsfelder; „Name“ bleibt Anker und Anzeige) · U2-ADR-440 (`nurMitWert`, `nurAnzeige`) · U2-ADR-100 §6 (Parität heißt gleiche Information, nicht gleiche Mechanik)

## Frage

Ein Feld hat in der Eingabe eine Beschriftung, die dem Menschen vor dem Formular hilft. Dieselbe Beschriftung steht heute auch dort, wo das Feld ausgegeben wird: im Notfallblatt, im PDF, in der Lese-App, in der Zusammenfassung einer Liste und in den Prüfterminen. Ist sie dort noch richtig?

Der Fall, an dem es sichtbar wurde: Im Menschen-Register heißt das Feld „Name im Depot“ (Eingabe-Beschriftung mit Hinweis „So erscheint die Person überall im Depot. Familienname und Vornamen darunter brauchen Formulare und Ämter.“, `tools/textsatz-de-modul.json:1521-1523`; Beschluss vom 08.10.2026 für das Formular, mit dem Hinweis auf den Grund). In einem Dokument ist das ein Hinweis zur Eingabe, kein Feldname. Beschriftet die Ausgabe jedes Unterfeld, stünde dort „Name im Depot: Julia Reindl“ (Commit 2bedde144).

Zweiter Anlass: Die Zusammenfassung eines Listeneintrags zeigte in Notfallblatt, PDF und Lese-App den nackten Wert („Vorsorgevollmacht · beim Notar · Rennweg · 35 · …“). Nur ja/nein-Auswahl und Datum trugen eine Beschriftung. Wer das Blatt las, sah nicht, was Institut und was Vollmacht-Inhaber ist. Befund LESE-APP-UNTERFELD-OHNE-BESCHRIFTUNG (02.10.2026, MITTEL), im selben Zug LESE-APP-UNTERFELD-EN-DEUTSCH (englisches Produkt mit deutscher Beschriftung), beide geschlossen am 09.10.2026 (Commit 0a628def5).

## Entscheidung

1. **Eine eigene Textart `ausgabeLabel`.** Sie wird wie `label` auf den Knoten gefüllt und trägt die Beschriftung des Felds in Ausgaben. Sie ist optional. Beispiel: `menschenRegister/name.ausgabeLabel` = „Name“ (DE und EN).
2. **Eine Leseregel.** `feldAusgabeBeschriftung(uf)` liefert die Ausgabe-Beschriftung, wenn sie gesetzt und nicht leer ist, sonst die Eingabe-Beschriftung (`vivodepot.html:56560-56567`). Die Ausgabewege lesen die Beschriftung eines Unterfelds nur dort: `listenEintragZusammenfassung`, `_verweisListenEintragZusammenfassung` (Dokumentsatz), `prueftermineZeilen` und die Übernahme-Notiz in `depotNormalisieren`, die im Depot-Inhalt steht. Die Lese-App nimmt in der Erzeugung ihres eingebauten Textsatzes dieselbe Reihenfolge (`tools/build-textsatz-eingebaut-lesen.js:118`).
3. **Die Eingabe behält ihre Beschriftung.** Stellen, die die Beschriftung eines Unterfelds direkt lesen, sind Eingabe und nennen das Feld, wie es im Formular steht: die Eingabemaske, die Prüfziffer-Meldung, der Hinweis vor dem Herausgeben, „Wird verwendet in“ (zweimal), der Hinweis zu nicht erscheinenden Feldern (zwei Funktionen) und der Vorlagen-Einlass. Jede solche Stelle steht mit Grund als Eingabe in der Probe.
4. **Jedes gefüllte, nicht sensible Unterfeld einer Eintragszeile trägt seine Beschriftung: „Beschriftung: Wert“.** Gilt im Kern, in der Lese-App, im PDF, im Notfallblatt und in der Zusammenfassung. Die Beschriftung kommt aus dem Textsatz (DE und EN), nicht aus einem Literal im Kern. Ohne Beschriftung in Textsatz und Definition steht der Wert allein. Ein Häkchen trägt nur seine Beschriftung (`true` stünde roh da).
5. **Ausnahmen, benannt.**
   - Das Steuer-Unterfeld `instrument` nennt die Zeile selbst („Testament“) und bekommt keine Beschriftung (Kern `vivodepot.html:56593`, Lese-App `vivodepot-lesen.html:13352`).
   - Eine kuratierte Zeile des Kerns (`zusammenfassungFelder`, die sprechende Zeile der Vorsorge-Instrumente) bleibt, wie sie ist: nur Datum und Häkchen tragen dort ihre Beschriftung, die übrigen Werte stehen allein („ja · Datum: 09.10.2026 · Bank“), denn daneben steht die Detailansicht und „Bankvollmacht · Commerzbank“ ist gewollt (`vivodepot.html:56583-56591`, `:56608-56620`). Die Lese-App hat keine Detailansicht und beschriftet auch dort; der Unterschied folgt aus U2-ADR-100 §6: Der Kern kürzt Listen-Zusammenfassungen über `zusammenfassungFelder`, weil daneben eine Detailansicht steht, in der Lese-App ist die Zusammenfassung die einzige Sicht. Diese Abweichung steht als benannte Ausnahme in der Paritätsprobe der Lese-App.
   - Sensible Unterfelder erscheinen weiter nicht (Gegenprobe in der Lese-App).

## Begründung

- Die Eingabe-Beschriftung spricht zur Person vor dem Formular, die Ausgabe-Beschriftung zu der Person, die das Blatt liest. Beides in einem Feld zu halten zwingt zu einem Kompromiss, der an einer Stelle falsch ist („Name im Depot: Julia Reindl“ im Dokument oder ein nacktes „Name“ im Formular).
- Eine zweite Textart statt einer Sonderbehandlung im Kern: Der Wortlaut bleibt im Textsatz und damit austauschbar (Gerüst ohne feste Texte). Ohne gesetzten `ausgabeLabel` ändert sich nichts; heute ändert sich die Ausgabe durch die Textart allein nicht (Commit 2bedde144).
- Kern und Lese-App zeigen dieselben Angaben, aber nicht mit demselben Verfahren (U2-ADR-100 §6, `docs/adr/vivodepot-U2-ADR-100-vorsorge-umbau-2026-07-24.md:112-126`). Darum darf die kuratierte Kurzzeile im Kern kürzer bleiben als die Zeile der Lese-App.
- Eine Wertzeile ohne Beschriftung ist in einem Dokument, das ein Dritter liest, mehrdeutig („Beispielbank · Frau Muster“ sagt nicht, was Institut und was Vollmacht-Inhaber ist).

## Was diese Entscheidung nicht leistet

- Sie legt für kein weiteres Feld eine Ausgabe-Beschriftung an. Bisher gibt es genau eine: `menschenRegister/name`.
- Sie ändert nichts an kuratierten Kern-Zeilen (Punkt 5). Ob sie dort künftig beschriften sollen, ist nicht entschieden.
- Sie regelt nicht die Beschriftung ganzer Felder (Kopfzeilen von Abschnitten), nur Unterfelder von Eintragszeilen und die Personenverweise in Dokumenten.

```yaml
konformitaet:
  - aussage: >-
      Die Ausgabewege lesen die Beschriftung eines Unterfelds nur über feldAusgabeBeschriftung(); wer sie direkt liest, ist
      benannte Eingabe, und eine neue Ausgabefunktion mit direktem Zugriff fällt auf.
    zustand: erfuellt
    herkunft: U2-ADR-497 (09.10.2026)
    pruefung:
      - tests/ausgabe-beschriftung-statt-eingabehinweis.test.js "[Ausgabe-Beschriftung] die Ausgabewege lesen die Beschriftung eines Unterfelds nur über feldAusgabeBeschriftung()"
      - tests/ausgabe-beschriftung-statt-eingabehinweis.test.js "[Ausgabe-Beschriftung·Klasse] wer die Beschriftung eines Unterfelds direkt liest, ist benannte Eingabe; jede Ausgabe geht über feldAusgabeBeschriftung()"
      - tests/ausgabe-beschriftung-statt-eingabehinweis.test.js "[Ausgabe-Beschriftung·Klasse·Rot-Beweis] eine neue Funktion, die die Beschriftung direkt in eine Ausgabe setzt, fällt auf"
      - tests/ausgabe-beschriftung-statt-eingabehinweis.test.js "[Ausgabe-Beschriftung·Rot-Beweis] ein Ausgabeweg, der uf.label direkt setzt, fällt auf"
  - aussage: >-
      Die Person heißt im Dokument „Name“, nicht „Name im Depot“; die Eingabe behält ihren Hinweis.
    zustand: erfuellt
    herkunft: U2-ADR-497 (09.10.2026)
    pruefung:
      - tests/ausgabe-beschriftung-statt-eingabehinweis.test.js "[Ausgabe-Beschriftung] die Person im Dokument heißt „Name“, nicht „Name im Depot“; die Eingabe behält ihren Hinweis"
  - aussage: >-
      Eine Ausgabe-Beschriftung geht der Eingabe-Beschriftung vor, fehlt sie, gilt die Eingabe-Beschriftung; DE und EN tragen
      sie aus dem Textsatz.
    zustand: erfuellt
    herkunft: U2-ADR-497 (09.10.2026)
    pruefung:
      - tests/ausgabe-beschriftung-statt-eingabehinweis.test.js "[Ausgabe-Beschriftung] eine Ausgabe-Beschriftung geht der Eingabe-Beschriftung vor, fehlt sie, gilt die Eingabe-Beschriftung"
      - tests/ausgabe-beschriftung-statt-eingabehinweis.test.js "[Ausgabe-Beschriftung] DE und EN tragen die Ausgabe-Beschriftung aus dem Textsatz"
  - aussage: >-
      In der Lese-App trägt eine Eintragszeile je gefülltem Unterfeld „Beschriftung: Wert“ (Fall des Befunds: pro-de,
      Bankverbindung).
    zustand: erfuellt
    herkunft: U2-ADR-497 (09.10.2026), Entscheidung 4, Lese-App-Hälfte
    pruefung:
      - tests/lese-app-unterfeld-beschriftung.test.js "[LESE-APP-UNTERFELD-OHNE-BESCHRIFTUNG] der Fall aus dem Befund wörtlich: pro-de, Bankverbindung"
  - aussage: >-
      In der Lese-App erscheint ein sensibles Unterfeld weiter nicht, und der Fall des Befunds (Bankverbindung, pro-de) trägt
      seine Beschriftungen.
    zustand: erfuellt
    herkunft: U2-ADR-497 (09.10.2026), Befund LESE-APP-UNTERFELD-OHNE-BESCHRIFTUNG
    pruefung:
      - tests/lese-app-unterfeld-beschriftung.test.js "[LESE-APP-UNTERFELD-OHNE-BESCHRIFTUNG] der Fall aus dem Befund wörtlich: pro-de, Bankverbindung"
      - tests/lese-app-unterfeld-beschriftung.test.js "[LESE-APP-UNTERFELD-OHNE-BESCHRIFTUNG] Gegenprobe: ein sensibles Unterfeld erscheint weiter nicht"
  - aussage: >-
      Im PDF mit dem längsten Listenwert wird keine Listenzeile abgeschnitten, auch nicht mit der vorangestellten Beschriftung.
    zustand: erfuellt
    herkunft: U2-ADR-497 (09.10.2026)
    pruefung:
      - tests/listen-zusammenfassung-ausgabewege.test.js "[Listen·Ausgabe] Gesamt-PDF mit dem längsten Listenwert: jede Listenzeile vollständig, keine unter dem Blattrand"
```
