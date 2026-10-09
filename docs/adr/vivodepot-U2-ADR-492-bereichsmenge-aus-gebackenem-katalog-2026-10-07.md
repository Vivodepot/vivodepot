# U2-ADR-492: Die Menge der eingebauten Bereiche kommt aus dem gebackenen Katalog des Produkts

**Status:** Angenommen (07.10.2026) — Wächter gebaut, Umbau folgt in eigenen Commits
**Datum:** 07.10.2026
**Kategorie:** GERÜST, MODULE, VERTRAUEN
**Linie:** U2
**Bezug:** Nachfolge von U2-ADR-253 §2 (die fest eingetragene Liste `BEREICH_IDS_EINGEBAUT`) · U2-ADR-379 · U2-ADR-187
(verwaiste Bereiche) · Grundsatz „im fertigen Gerüst ist nichts fest verdrahtet“ (05.10.2026)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Frage

U2-ADR-253 §2 hat `BEREICH_IDS_EINGEBAUT` als feste Liste der dreizehn privaten Bereiche in den Kern geschrieben, damit sie
nicht mehr aus `SEKTOREN` folgt, das Commit B leerte. Seit dem Schnitt S7 (21.09.2026) bekommt jedes Produkt seinen
Bereichskatalog gebacken (`BEREICHE_NATIV_KATALOG`, `AB_WERK_BEREICH_QUELLEN`, gedeckt durch die Kern-Prüfsumme der
Auslieferung). Die feste Liste nimmt damit an, jedes Produkt sei ein privates mit genau diesen dreizehn Bereichen. Das
trifft für Pro schon heute nicht zu: Pro bäckt `identity` und sechs eigene Bereiche, die übrigen zwölf nativen kommen dort
als geweckte Bereiche aus dem Katalog. Woher soll der Kern künftig wissen, welche Bereiche eingebaut sind?

## Entscheidung

1. **Das nackte Gerüst reserviert keine Bereichskennung.** Eingebaut ist, was das Rezept des Produkts bäckt: die Bereiche
   aus der gebackenen Region des Produkts und die nativen Bereiche des gebackenen Katalogs. Die Liste wird daraus
   abgeleitet, nicht mehr im Kern geschrieben.
2. **Herkunft und Vertrauen nur aus gebackenen Quellen.** Die Menge „eingebaut“ und die Einstufung „ab Werk“ kommen
   allein aus Regionen, die die Kern-Prüfsumme der Auslieferung deckt, oder aus dem geprüften Ab-Werk-Weg, nie aus einem
   zur Laufzeit geladenen Modul. Ein Fremdmodul, das eine gebackene Kennung belegen will, wird mit `'reserviert'`
   abgewiesen und trägt `marke-fremd`. Eine nicht gebackene Kennung darf es belegen; sie bleibt `marke-fremd`.
3. **Beide Wege bleiben.** Geweckte native Bereiche (Pro) und Bereiche ab Werk aus der Region des Produkts gelten beide
   als eingebaut. Die Prüfung nach der Quelle (die Region des Produkts) kommt hinzu, sie ersetzt die nach dem Katalog nicht.
4. **Altdateien (Zusicherung 9).** Werte in einem Bereich, den ein Rezept nicht mehr nennt, gehen nicht verloren: ein
   nativer Bereich wird geweckt, ein unbekannter nach `data.bereicheVerwaist` gerettet (U2-ADR-187); beide bleiben in der
   Lese-App sichtbar und im Vollexport enthalten.
5. **Bereichskennungen als Literal im Kern haben einen Deckel, der nur sinkt.** `tools/bereichs-literale-pruefen.js` zählt
   sie außerhalb der benannten Gerüst-Regionen, gruppiert je Funktion oder Konstante; die Kennungen kommen aus den
   Bereichs-Templates, nicht aus einer Liste im Wächter. Ziel ist 0 außer den benannten Ausnahmen: die Migrations-Register
   (alte Dateien müssen lesbar bleiben) und die eingefrorenen Krypto-Listen, je mit Grund, Wort der Gegenlesung und
   eigenem exaktem Deckel.

## Abgrenzung

- Diese ADR baut die Ableitung nicht selbst; sie folgt in eigenen Commits nach dem Wächter. Bis dahin gilt die Liste aus
  U2-ADR-253 §2 weiter, und der Wächter hält ihren Stand fest.
- Die Bindung an Austauschformate trägt das Formatmodul, nicht das Bereichs-Template (Entscheidung 07.10.2026).

```yaml
konformitaet:
  - aussage: >-
      Bereichskennungen als Literal im Kern und in der Lese-App außerhalb benannter Gerüst-Regionen haben je Gruppe einen
      exakten Deckel, der nur sinkt; ein neues Literal außerhalb einer Region ist rot; eine Ausnahme ohne Wort ist rot,
      und auch eine Ausnahme nimmt nichts Neues auf.
    zustand: erfuellt
    herkunft: U2-ADR-492 (07.10.2026)
    pruefung:
      - tests/bereichs-literale-pruefen.test.js "[Bereichs-Literale·Rot-Beweis] ein neues Literal außerhalb einer Region ist rot, in einer Region nicht"
      - tests/bereichs-literale-pruefen.test.js "[Bereichs-Literale·Ausnahme·Rot-Beweis] auch eine Ausnahme nimmt nichts Neues auf: Migrationsliste und Krypto-Liste haben je einen exakten Deckel"
  - aussage: >-
      Die Menge der eingebauten Bereiche wird aus dem gebackenen Katalog und der gebackenen Region des Produkts abgeleitet;
      ein Fremdmodul mit einer gebackenen Kennung wird als reserviert abgewiesen.
    zustand: offen
    frist: 2026-10-31
    herkunft: U2-ADR-492 (07.10.2026), Bau in einem Folgecommit
```
