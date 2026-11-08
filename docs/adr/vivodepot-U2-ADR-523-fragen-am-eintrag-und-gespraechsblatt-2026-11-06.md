# U2-ADR-523 — Fragen am Eintrag und das Blatt für ein Gespräch

**Status:** Angenommen (06.11.2026)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.
**Datum:** 2026-11-06
**Kategorie:** DATENMODELL, BEDIENUNG
**Linie:** U2
**Bezug:** U2-ADR-008 (zentrale Register) · U2-ADR-010 (Feldarchitektur) · U2-ADR-142 (andockbare Arten einer Stelle) ·
U2-ADR-156 (Ausschnitt je Empfänger) · U2-ADR-463 (feste Kennung je Listen-Eintrag)

---

## Anlass

Vivodepot ist das persönliche Depot für alles Wichtige. Wer weiß, was er hat, kann ein Gespräch vorbereiten: bei der Bank zu
einem Konto, in der Apotheke zu einem Mittel, bei einer Behörde zu einem Bescheid. Souveränität heißt hier, das Gespräch auf
Augenhöhe zu führen, mit den eigenen Fragen auf dem Tisch und der Antwort danach im eigenen Depot, mit Quelle und Datum.

Bis jetzt hatte der Kern dafür keinen Ort. Eine Anmerkung gab es nur am Kontakt, ohne Bezug zum Eintrag, ohne Datum und ohne
Quelle. Ein Blatt für ein Gespräch gab es nicht.

Weg zum Nachsehen: `grep -n "FRAGEN AM EINTRAG" vivodepot.html`.

## Entscheidung

1. **Ein Register `data.fragen[]`.** Fragen stehen in einem eigenen Register wie Menschen und Stellen (U2-ADR-008), nicht als
   Liste im Eintrag. Je Frage: `id`, `ziel` `{ bereich, feld, eintragId? }`, `frage`, `an`, `gestellt`, und nach der Antwort
   `antwort`, `antwortVon`, `antwortAm`. Der Kern kennt keine Liste in einer Liste; ein Register braucht keine.
2. **Adressat und Quelle sind Verweise.** `an` und `antwortVon` zeigen auf einen Menschen (`data.menschen`) oder eine Stelle
   (`data.institutionen`), als `{ ref }`. Freitext nimmt der Kern dort nicht an.
3. **Ziele.** Ziel darf nur ein Feld aus `FRAGEN_ZIELFELDER` sein. Bei einer Liste nennt `eintragId` den Eintrag (U2-ADR-463);
   sonst gilt die Frage dem ganzen Feld. Gleichrangig zuerst: Konten (`finance.accounts`, mit Eintrag) und laufende Medikation
   (`health.medicationOngoing`, auf Feldebene). Jedes weitere Ziel ist eine Zeile in dieser Liste und bekommt einen Fall in
   der Probe. Die Fähigkeit hängt an keinem Bereich.
4. **Offen und beantwortet.** Eine Frage ohne Antwort ist offen. Eine Antwort ohne Quelle oder ohne Datum weist der Kern ab.
5. **Kein stilles Verschwinden.** Wird ein Eintrag entfernt, fragt die Oberfläche vorher, ob seine Fragen mitgehen
   (`fragenZuEintrag`). Was trotzdem ohne Eintrag dasteht, etwa nach dem Zusammenführen zweier Fassungen, zeigt die Fragenliste
   als verwaist (`fragenVerwaist`), bis die Person es entfernt.
6. **Ausschnitt.** Eine Datei für einen Empfänger (U2-ADR-156) trägt nur Fragen, deren Feld und Eintrag im Ausschnitt stehen.
7. **Das Blatt je Adressat.** „Für das Gespräch mit …“ trägt die offenen Fragen an genau diesen Menschen oder diese Stelle, je
   Frage, worum sie geht, und Platz für die Antwort. Eine Frage an einen anderen Adressaten steht nicht darauf. Der Kern
   verschickt nichts; die Person nimmt das Blatt mit und trägt die Antwort selbst ein.
8. **Die Apotheke ist eine Stelle.** `apotheke` wird eine eingebaute Art einer Stelle, neben Bank, Behörde und den übrigen.
9. **Schemastufe 95.** Ein älterer Kern kennt `data.fragen` nicht und verlöre die Fragen beim Speichern. Darum hebt
   das Register die Stufe auf 95; ein älterer Kern öffnet ein solches Depot nur lesend (Versionstor wie Stufe 93). Die Stufe legt
   das leere Register an und ändert keinen Wert.
10. **Die Oberfläche.** Am Zielfeld steht ein Knopf „Fragen“, mit der Zahl der offenen. Er öffnet die Fragen des Felds mit
   Etiketten (offen, beantwortet, Eintrag entfernt), „Antwort eintragen“ zum Aufklappen und je Adressat den Weg zum Blatt.
   Der Druck des Blatts ist eine Weitergabe an eine Stelle; danach fragt der Kern wie auf jedem Weitergabe-Weg nach.

## Folgen

- Der Ausdruck eines Medikationsplans mit Code kommt mit dem Format-Modul für den Plan; er ist ein Ausgabeformat für das Blatt,
  kein Teil dieser Entscheidung. Medikation als Liste mit Einträgen kommt mit demselben Bau; dann kann eine Frage auch einem
  einzelnen Mittel gelten.
- Fragen gehen nicht in Austauschformate anderer Systeme; sie gehören der Person.

## Erwogen und verworfen

- **`fragen[]` als Liste im Eintrag:** Der Kern hätte Listen in Listen lernen müssen (Darstellung, Speicher, Zusammenführen,
  Export), und Felder ohne Einträge hätten keine Fragen tragen können.
- **Ein Schalter je Listenfeld:** Eine Liste der Ziele an einer Stelle ist leichter zu prüfen als ein Merkmal in jedem Modul.
- **Adressat als Freitext:** Dann fände das Blatt nicht zuverlässig alle Fragen an dieselbe Stelle.

```yaml
konformitaet:
  - aussage: >-
      Fragen stehen im Register data.fragen[]; Ziel ist nur ein Feld aus FRAGEN_ZIELFELDER, Konten und Medikation gleichrangig;
      ein unbekannter Eintrag, ein Adressat ohne Verweis und ein leerer Text werden abgewiesen.
    zustand: erfuellt
    herkunft: U2-ADR-523 Nr. 1 bis 3 (06.11.2026)
    pruefung:
      - tests/eintrag-fragen.test.js "[Fragen] Konten und Medikation sind gleichrangig erlaubte Ziele, sonst nichts Unbenanntes"
      - tests/eintrag-fragen.test.js "[Fragen] Ziel außerhalb der erlaubten Felder, unbekannter Eintrag, Adressat ohne Verweis: abgewiesen"
      - tests/eintrag-fragen.test.js "[Fragen·Rot-Beweis außerhalb der Gesundheit] Frage an einem Konto an die Bank, offen bis zur Antwort"
  - aussage: >-
      Eine Antwort ohne Quelle oder Datum wird abgewiesen und schließt die Frage nicht.
    zustand: erfuellt
    herkunft: U2-ADR-523 Nr. 4 (06.11.2026)
    pruefung:
      - tests/eintrag-fragen.test.js "[Fragen] Antwort ohne Quelle oder ohne Datum wird abgewiesen"
  - aussage: >-
      Ein entfernter Eintrag lässt seine Fragen nicht still verschwinden; der Empfänger-Ausschnitt trägt nur Fragen zu Feldern
      im Ausschnitt; das Blatt trägt nur offene Fragen an genau diesen Adressaten.
    zustand: erfuellt
    herkunft: U2-ADR-523 Nr. 5 bis 7 (06.11.2026)
    pruefung:
      - tests/eintrag-fragen.test.js "[Fragen·a] ein entfernter Eintrag lässt seine Frage nicht still verschwinden"
      - tests/eintrag-fragen.test.js "[Fragen·b] eine Frage zu einem Feld außerhalb des Ausschnitts geht nicht mit"
      - tests/eintrag-fragen.test.js "[Fragen·c] das Blatt für Adressat A trägt keine Frage an Adressat B"
  - aussage: >-
      Die Apotheke ist eine eingebaute Art einer Stelle.
    zustand: erfuellt
    herkunft: U2-ADR-523 Nr. 8 (06.11.2026)
    pruefung:
      - tests/eintrag-fragen.test.js "[Fragen] die Apotheke ist eine eingebaute Art einer Stelle"
  - aussage: >-
      Das Register hebt die Schemastufe auf 95; die Stufe legt nur das leere Register an.
    zustand: erfuellt
    herkunft: U2-ADR-523 Nr. 9 (06.11.2026)
    pruefung:
      - tests/eintrag-fragen.test.js "[Fragen·Schema] Stufe 95 legt das leere Register an und ändert keinen Wert"
  - aussage: >-
      Am Zielfeld steht der Knopf mit der Zahl der offenen Fragen, an keinem anderen Feld; der Druck des Blatts ist als
      Weitergabe eingeordnet.
    zustand: erfuellt
    herkunft: U2-ADR-523 Nr. 10 (06.11.2026)
    pruefung:
      - tests/eintrag-fragen.test.js "[Fragen·Oberfläche] der Knopf steht an Konten und Medikation, mit der Zahl der offenen, sonst nirgends"
      - tests/eintrag-fragen.test.js "[Fragen·Oberfläche] der Druck des Blatts ist eine Weitergabe mit Nachfrage"
```
