# U2-ADR-529 — Posteingang für eingelesene Dateien

**Status:** Angenommen (17.11.2026)
**Status heute:** gilt, mit Nachtrag 23.11.2026 (Wörter des Zuordnens) — Belege im `konformitaet`-Block unten.
**Datum:** 2026-11-17
**Kategorie:** DATENMODELL, BEDIENUNG
**Linie:** U2
**Bezug:** U2-ADR-008 (zentrale Register) · U2-ADR-013 (Dokumenten-Mappe) · U2-ADR-075 (Migrationskette) ·
U2-ADR-156 (Ausschnitt je Empfänger)

---

## Anlass

Die Seite „Einlesen“ ist eine Tür für alles: Dateien von Praxen, Ämtern und Arbeitgebern, Fotos von Papieren. Was der Kern am
Inhalt erkennt, geht in die Vorschau und von dort in den Bereich. Ein Foto eines Schreibens oder eine Datei ohne lesbare Angaben
erkannte er nicht; sie ging mit einer Meldung verloren. Kamen mehrere Dateien auf einmal, nahm er nur die erste.

Die Person soll eine Datei nicht noch einmal suchen müssen, weil der Kern sie nicht einordnen konnte. Sie liegt im Depot, bis die
Person sagt, wohin sie gehört.

Weg zum Nachsehen: `grep -n "Posteingang (U-3b" vivodepot.html`.

## Entscheidung

1. **Ein Register `data.posteingang[]`.** Je Eintrag: `id`, `dateiname`, `mime`, `groesse`, `inhalt` (Data-URL, inline wie in der
   Mappe und mit dem Depot verschlüsselt), `eingelesenAm` (Zeitpunkt), `quelle` (heute `einlesen`). Größengrenzen wie die Mappe:
   je Datei und für das ganze Depot.
2. **Was hineingeht.** Eine einzelne Datei geht wie bisher in die Inhaltserkennung; erkennt der Kern sie nicht, bleibt sie im
   Posteingang. Mehrere Dateien auf einmal gehen alle in den Posteingang, statt die Person durch eine Vorschau je Datei zu führen.
3. **Zuordnen.** Ein PDF oder ein Bild wird mit „Als Unterlage übernehmen“ ein Eintrag der Mappe mit Bereich (U2-ADR-013);
   jede andere Datei geht mit „Übernehmen“ in die Inhaltserkennung und Vorschau. Erst wenn die Übernahme geschehen ist, verlässt
   die Datei den Posteingang. „Entfernen“ fragt vorher.
4. **Sichtbar, wo man hinsieht.** Die Seite „Einlesen“ zeigt die wartenden Dateien unter „Erkannt“ mit der Marke „N zuzuordnen“.
   Die Übersicht zeigt in „Wartet auf Sie“ eine Zeile mit der Zahl, den Namen und „Zuordnen“ (zur Seite Einlesen).
5. **Ausgaben.** Der Posteingang wird zurückgehalten wie die Mappe: er geht beim Umzug mit (Vollimport), nicht in eine beiläufige
   Ausgabe und nie in den Ausschnitt eines Empfängers (U2-ADR-156).
6. **Schema 103.** Die Stufe 102 → 103 legt nur das leere Register an und ändert keinen Wert. Ein älterer Kern öffnet ein Depot der
   Stufe 103 nur lesend.

## Nachtrag 23.11.2026 — Wörter des Zuordnens (zu Nr. 3 und 4)

Eine Probe mit einer Person, die den Entwurf nicht kannte, fand für denselben Schritt drei Wörter („Als Unterlage übernehmen“,
„Als Dokument ablegen“, „Übernehmen“) und eine Überschrift „Erkannt“ über Dateien, die nicht erkannt wurden. Eine Textdatei
endete mit „Übernehmen“ in der Meldung, dass der Kern sie nicht lesen kann. Seit 23.11.2026 gilt, abweichend vom
Wortlaut des Entwurfs:

- **Eine Datei in einen Bereich legen** heißt überall „Als Dokument ablegen“, wie in der übrigen Ablage („Dokument hinzufügen“,
  „Dokumente in diesem Bereich“). Jede wartende Datei hat diesen Weg, auch eine, deren Inhalt der Kern nicht liest. Nach
  „Ablegen“ zeigt die App die Mappe, für jede Dateiart gleich.
- **„Übernehmen“** heißt: Angaben aus der Datei in die Felder. Der Knopf steht nur, wo der Kern den Inhalt der Datei liest.
- **Die Überschrift** auf der Seite Einlesen heißt „Eingelesene Dateien“, mit der Marke „N zuzuordnen“. „Erkannt“ bleibt dem
  erkannten Inhalt vorbehalten. „Zuordnen“ in der Übersicht bleibt.

Weg zum Nachsehen: `grep -n "POSTEINGANG-WOERTER" vivodepot.html`.

## Folgen

- Eine nicht erkannte Datei geht nicht mehr verloren; sie wartet sichtbar.
- Die Migrationskette hat eine Stufe mehr; Vollimport, Vorschau-Übernahme und Empfänger-Sperre kennen den Schlüssel.

```yaml
konformitaet:
  - aussage: >-
      Das Register data.posteingang[] nimmt eine Datei mit Name, Art, Größe, Inhalt, Zeitpunkt und Quelle auf; über der
      Größengrenze wird nichts aufgenommen; Entfernen nimmt genau den Eintrag heraus.
    zustand: erfuellt
    herkunft: U2-ADR-529 Nr. 1 (17.11.2026)
    pruefung:
      - tests/u3b-posteingang.test.js "[U-3b·Register] aufnehmen, Grenze, entfernen"
  - aussage: >-
      Eine nicht erkannte Datei auf der Seite Einlesen bleibt im Posteingang; mehrere Dateien gehen alle hinein.
    zustand: erfuellt
    herkunft: U2-ADR-529 Nr. 2 (17.11.2026)
    pruefung:
      - tests/u3b-posteingang.test.js "[U-3b·Einlesen] nicht erkannte Datei wartet statt verloren zu gehen"
      - tests/u3b-posteingang.test.js "[U-3b·Einlesen] mehrere Dateien warten alle"
  - aussage: >-
      „Erkannt“ zeigt die Marke „N zuzuordnen“ und je Datei den passenden Knopf; die Übersicht zeigt in „Wartet auf Sie“ die
      Zeile mit Zahl, Namen und „Zuordnen“; ohne wartende Datei steht keine der beiden.
    zustand: erfuellt
    herkunft: U2-ADR-529 Nr. 3 und 4 (17.11.2026)
    pruefung:
      - tests/u3b-posteingang.test.js "[U-3b·D72] Erkannt mit Marke und Knöpfen"
      - tests/u3b-posteingang.test.js "[U-3b·D29] Zeile in Wartet auf Sie mit Zuordnen"
  - aussage: >-
      Der Posteingang steht in der Rückhalteliste der Ausgaben, geht beim Vollimport mit und ist für Empfänger gesperrt.
    zustand: erfuellt
    herkunft: U2-ADR-529 Nr. 5 (17.11.2026)
    pruefung:
      - tests/u3b-posteingang.test.js "[U-3b·Ausgaben] zurückgehalten, beim Umzug dabei, nie beim Empfänger"
  - aussage: >-
      Die Stufe 102 → 103 legt nur das leere Register an.
    zustand: erfuellt
    herkunft: U2-ADR-529 Nr. 6 (17.11.2026)
    pruefung:
      - tests/u3b-posteingang.test.js "[U-3b·Migration] Stufe 103 legt das leere Register an und ändert keinen Wert"
  - aussage: >-
      Jede wartende Datei trägt „Als Dokument ablegen“ (dasselbe Wort wie beim PDF und bei der Urkunde einer anderen Person);
      „Übernehmen“ steht nur bei lesbarem Inhalt; die Überschrift heißt „Eingelesene Dateien“; nach „Ablegen“ zeigt die App die Mappe.
    zustand: erfuellt
    herkunft: U2-ADR-529 Nachtrag 23.11.2026
    pruefung:
      - tests/u3b-posteingang.test.js "[U-3b·Wörter] ein Wort je Sache, de und en"
      - tests/u3b-posteingang.test.js "[U-3b·Sackgasse] eine Textdatei kann als Unterlage in die Mappe"
      - tests/u3b-posteingang.test.js "[U-3b·Rückmeldung] nach „Ablegen“ zeigt die App die Mappe"
```
