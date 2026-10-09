# U2-ADR-456 · FIM-Bezüge: Kennung, Fassung und Status je Depot-Feld

**Status:** Akzeptiert, gebaut (Bezüge-Tabelle, Prüfwerkzeug, Kern-Region, Feldanzeige, fim-json).
**Datum:** 30.09.2026
**Kategorie:** STANDARDS, ARCHITEKTUR
**Status heute:** gilt
**Betrifft:** `bereiche/bezuege.json`, `bereiche/bezuege-quellen.json`, `tools/bezuege-erheben.js`, `tools/fim-bezuege-region.js`, `tools/fim-export-pruefen.js`, `vivodepot.html` (Region `FIM-BEZUEGE`, `_fimFelderMitBezug`, `fimVerwaltung`), `tools/standards-register/xml-xsd.json`.
**Bezug:** U2-ADR-409 (Abbilden, nicht umbenennen), U2-ADR-442 (FIM: Depot-Kennungen auf Baukasten-Datenfelder, Schema je Leistung), U2-ADR-030 (Selbstauskunft im Export).

## Frage

Wie zeigt das Produkt, welche Depot-Angabe welchem Datenfeld des FIM-Baukastens entspricht, solange für die Inhalte der Bausteine keine Nutzung zugesagt ist?

## Entscheidung

1. **Nur Fakten, keine Inhalte.** Je Depot-Feld steht der Bezug auf einen Baustein mit **Kennung** (z. B. `F60000227`), **Fassung** und **Freigabestatus**, dazu der Grad (SKOS). Feldnamen, Beschreibungen, Wertelisten und Schemata der Bausteine stehen weder im Repo noch im Produkt. Sie kommen erst dazu, wenn die Zustimmung der FITKO belegt ist; dafür trägt jede Zeile ein Feld `name`, das bis dahin leer bleibt, und die Tabelle ein Feld `fimNamenFreigabe`. Ein Name ohne belegte Freigabe ist ein Befund (Werkzeug, Region und Export).
2. **Eine Quelle.** Die Zeilen stehen in der vorhandenen Bezüge-Tabelle `bereiche/bezuege.json` (Datensatz `fim-baukasten`). Die Fassungen sind in `bereiche/bezuege-quellen.json` je XDF-Datei mit SHA-256 gepinnt; die Dateien selbst liegen außerhalb des Repos (`_quellen-bezuege/fim`).
3. **Status aus dem Portal, Kennung und Fassung aus der Datei.** Die XDF-Dateien tragen den Freigabestatus nicht einheitlich: ältere nur `status` und ein Freigabedatum, eine Gruppe sogar ein Freigabedatum, obwohl das Portal sie als „in Bearbeitung“ führt. Maßgeblich ist darum der Portal-Stand beim Abruf, gepinnt je Datei in der Lock-Datei. Kennung und Fassung prüft das Werkzeug an der Datei selbst.
4. **Nicht feste Fassungen werden gepinnt und als nicht fest gezeigt.** Nur eine gepinnte Fassung ist nachprüfbar. Führt das Portal eine Fassung als in Bearbeitung, steht sie in Anzeige und Export mit `fest: false` bzw. „Fassung nicht fest (in Bearbeitung)“ und darf höchstens `naeherung` sein.
5. **Im Kern eine erzeugte Region, ohne Sätze.** `FIM-BEZUEGE:BEGIN/END` trägt dieselben Zeilen, den Freigabestatus als Code der amtlichen FIM-Codeliste `urn:xoev-de:fim:codeliste:xdatenfelder.freigabestatus` (2 in Bearbeitung, 5 fachlich freigegeben silber, 6 gold; so tragen ihn auch die XDatenfelder-3-Dateien) und den Stand als Datum, geschrieben nur von `tools/fim-bezuege-region.js`; eine Probe hält Region und Tabelle gleich. Die Region ist öffentlich wie der übrige Kern (Entscheidung der Inhaberin vom 29.09.2026: Kennung, Fassung und Status auch im öffentlichen Zuschnitt).
6. **Sichtbar im Produkt.** Unter einem Feld mit Bezug steht dezent eine Zeile mit Kennung, Fassung und fest/nicht fest. Der Export `fim-json` trägt `bezugsdatensatz: fim-baukasten`, den Stand, die Codeliste (`freigabestatusListe`) und je Wert `fimFeld { id, fassung, freigabestatus, fest }`, mit denselben Filtern wie jeder Export (sensibel nur mit Zustimmung, verifiziert stämmige Werte nicht als Selbstauskunft). Die früher erfundene Kennung `fim-stammdaten-0001` entfällt. Der Verwaltungsblock `stammdaten` bleibt für den Rückweg.
7. **Geprüft, nicht behauptet.** `tools/bezuege-erheben.js --quelle` hält jede Zeile gegen die gepinnte Datei (Kennung, Fassung, Prüfsumme) und den gepinnten Status; `tools/fim-export-pruefen.js` hält jeden Export gegen die Zeilen.

## Nachtrag 07.10.2026 — kein Bezug unter dem Feld

Entscheidung vom 07.10.2026: keine technischen Markierungen in der Benutzersicht. Die Zeile unter dem Feld (Punkt 6, erster Satz) entfällt, mit ihr die Anzeigefunktion und ihre drei Texte. Der Bezug bleibt in der Kern-Region, im Export `fim-json` und in der öffentlichen Zuordnungsliste; Punkt 7 gilt unverändert.

## Was diese Entscheidung nicht leistet

Sie liefert kein Datenschema einer Verwaltungsleistung und keine Prüfung gegen dessen XSD (U2-ADR-442, eigener Schritt). Sie sagt nichts über die Werte-Entsprechung bei Feldern mit Wertelisten (Staatsangehörigkeit, Familienstand, Geschlecht); diese stehen darum als `naeherung`. Der Import liest die `felder` noch nicht zurück. Für Doktorgrad und Land gibt es kein Depot-Feld.

```yaml
konformitaet:
  - aussage: >-
      Jede FIM-Zeile trägt Fassung und Status wie gepinnt; eine nicht feste Fassung ist höchstens naeherung;
      ein Name ohne belegte Freigabe ist ein Befund.
    zustand: erfuellt
    herkunft: U2-ADR-456 (30.09.2026)
    pruefung:
      - tests/bezuege-erheben.test.js
        "[Bezüge·FIM·Rot-Beweis] falsche Fassung, falscher Status, nicht feste Fassung als exakt, Name ohne Freigabe — je ein Befund"
      - tests/bezuege-erheben.test.js
        "[Bezüge·FIM·echt] bereiche/bezuege.json: keine FIM-Zeile trägt einen Namen, solange fimNamenFreigabe leer ist; jede FIM-Zeile hat Fassung und Status"
  - aussage: >-
      Aus einer XDF-Datei liest das Werkzeug nur Kennung, Fassung und Art des ersten Bausteins.
    zustand: erfuellt
    herkunft: U2-ADR-456 (30.09.2026)
    pruefung:
      - tests/bezuege-erheben.test.js
        "[Bezüge·FIM] XDF-Leser: nur Kennung, Fassung und Art des ersten Bausteins — enthaltene Felder einer Gruppe nicht"
  - aussage: >-
      Die Kern-Region FIM-BEZUEGE ist genau die Tabelle, und sie trägt ohne belegte Freigabe keinen Namen.
    zustand: erfuellt
    herkunft: U2-ADR-456 (30.09.2026)
    pruefung:
      - tests/fim-bezuege.test.js "[FIM·Region] die Kern-Region ist genau die Tabelle (tools/fim-bezuege-region.js)"
      - tests/fim-bezuege.test.js "[FIM·Name] ohne belegte Freigabe steht in der Region kein Name — auch wenn die Tabelle einen trüge"
  - aussage: >-
      Unter einem Feld steht kein FIM-Bezug; der Bezug bleibt in Region und Export.
    zustand: erfuellt
    herkunft: U2-ADR-456, Nachtrag 07.10.2026
    pruefung:
      - tests/benutzersicht-ohne-technische-markierungen.test.js "[Benutzersicht] kein bekannter Weg zeigt eine technische Markierung (Deckel 0)"
  - aussage: >-
      fim-json trägt je Wert den gepinnten Bezug, keine erfundene Schema-Kennung, und jede Abweichung davon findet der Export-Prüfer.
    zustand: erfuellt
    herkunft: U2-ADR-456 (30.09.2026)
    pruefung:
      - tests/fim-bezuege.test.js "[FIM·Export] fim-json trägt Bezugsdatensatz, Stand und je Wert den gepinnten Bezug — und der Prüfer findet nichts"
      - tests/fim-bezuege.test.js "[FIM·Export·Rot-Beweis] falsche Fassung, falscher Status, fest statt nicht fest, erfundene Zeile, Name, fehlender Stand — je ein Befund"
```
