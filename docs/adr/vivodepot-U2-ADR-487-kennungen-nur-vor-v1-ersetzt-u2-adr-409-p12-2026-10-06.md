# U2-ADR-487: Kennungen ändern sich nur vor v1, mit Migration und Abbildungstabelle — ersetzt U2-ADR-409 Punkt 12

**Status:** Angenommen (06.10.2026) — nachgetragen; die Entscheidung selbst fiel am 13.09.2026
**Datum:** 06.10.2026
**Kategorie:** DATENMODELL, KENNUNGEN
**Linie:** U2
**Bezug:** U2-ADR-409 (Feldregister; ersetzt wird Punkt 12, eingeschränkt der Satz in Punkt 1 „Eine Kennung bedeutet für immer
dasselbe“ für die Zeit vor v1) · die Depot-Migration Schema 80 → 81 in `vivodepot.html` (`KENNUNG_MAPPING`, Schritt in
`depotNormalisieren`).
**Grundlage:** die Entscheidung vom 13.09.2026 zum Umbau „Englisch vor v1“.
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Frage

U2-ADR-409 Punkt 12 legte am 13.09.2026 fest: die Kennung ist undurchsichtig, sie wird nicht übersetzt, ihre deutsche Herkunft
bleibt sichtbar, „da eine Kennung sich ohnehin nie ändert“. Noch am selben Tag wurde der Umbau auf
englische Kennungen freigegeben, und er wurde gebaut: die Feld-Kennungen, Bereichsnamen und Format-Schlüssel tragen heute englische
Namen, alte Depots werden beim Öffnen umgeschrieben. Das zugesagte Nachfolge-ADR fehlte. U2-ADR-409 sagte weiter „eine Kennung
ändert sich nie“, und der Kern verwies an zwei Stellen auf eine Platzhalter-Nummer.

## Entscheidung

1. **Vor v1 darf sich eine Kennung ändern — aber nur so:**
   - mit einer **Migration** im Kern, die alte Depots beim Öffnen umschreibt, idempotent, mit Sicherungskopie im alten Format;
   - mit einer **Abbildungstabelle alt → neu** als einer maschinenlesbaren Quelle, aus der Migration und Werkzeuge lesen
     (im Kern die eingebackene Region `KENNUNG_MAPPING`);
   - mit einer **Altdatei-Probe**: eine Datei von vor der Umbenennung öffnet und hinterlässt keinen Schlüssel und keinen
     Verweis, den das heutige Modell nicht kennt.
2. **Ab v1 gilt U2-ADR-409 Punkt 1 ohne Einschränkung:** eine Kennung bedeutet für immer dasselbe und ändert sich nicht. Was
   sich dann ändern muss, geht über den Status je Kennung (`deprecated`, `obsoleted` mit Nachfolger; U2-ADR-409 Punkt 10).
3. **Punkt 12 von U2-ADR-409 ist ersetzt.** Gilt weiter: die Bedeutung steht in Beschriftungen je Sprache, neue Kennungen sind
   ASCII in der Form `<bereich>.<feld>` bzw. `<bereich>.<listenfeld>/<unterfeld>`. Ersetzt: „die Kennung wird nicht übersetzt“
   und „da eine Kennung sich ohnehin nie ändert“ — vor v1 wurde sie übersetzt, nach den Regeln oben.
4. **Keine Platzhalter-Nummer im Produkt.** Ein Verweis auf eine Entscheidung trägt ihre Nummer; der Kern und die übrigen
   Dateien im obersten Ordner tragen kein `U2-ADR-XXX` und kein `U2-ADR-NNN`.

## Konsequenzen

- Die Kommentare an der Migration 80 → 81 im Kern verweisen auf diese ADR.
- U2-ADR-409 trägt einen Nachtrag: Punkt 12 ersetzt durch U2-ADR-487.
- Eine Kennungsänderung nach v1 ist durch diese ADR nicht gedeckt; sie bräuchte eine eigene Entscheidung.

```yaml
konformitaet:
  - aussage: >-
      Eine Datei von vor dem Kennungs-Umbau öffnet und hinterlässt keinen Schlüssel, den das heutige Modell nicht kennt.
    zustand: erfuellt
    herkunft: U2-ADR-487 (06.10.2026)
    pruefung:
      - tests/altdatei-kennungen-als-wert.test.js "[Kennung als Wert] jedes Alt-Fixture im Repo: nach dem Öffnen kein Verweis auf eine alte Kennung"
  - aussage: >-
      Kein Platzhalter U2-ADR-XXX in den Dateien des obersten Ordners.
    zustand: erfuellt
    herkunft: U2-ADR-487 (06.10.2026)
    pruefung:
      - tests/adr-platzhalter-wurzel.test.js "[ADR-Platzhalter·Wurzel] keine Datei im obersten Ordner trägt U2-ADR-XXX"
  - aussage: >-
      Kein Platzhalter U2-ADR-NNN (auch mit angehängter Ziffer) in den Dateien des obersten Ordners.
    zustand: offen
    herkunft: U2-ADR-487 (06.10.2026), gemessen 17.10.2026
    frist: 2026-10-31
    bedingung: Der Kern trägt NNN und NNN2 noch an neun Stellen (Befund ADR-PLATZHALTER-IM-KERN); geschlossen, wenn sie echte Nummern tragen und die Probe NNN\d* im Muster führt
```

---

*Vivodepot GmbH · Berlin · 06.10.2026*
