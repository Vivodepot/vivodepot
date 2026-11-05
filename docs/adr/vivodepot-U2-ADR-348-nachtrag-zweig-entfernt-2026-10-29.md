# U2-ADR-348-Nachtrag — der Zweig für `bereichsErsatz` ist aus dem Kern entfernt

**Status:** Angenommen (29.10.2026, Wort der Gegenlesung vor dem Bau)
**Datum:** 2026-10-29
**Kategorie:** ARCHITEKTUR
**Linie:** U2
**Bezug:** U2-ADR-348 (Status heute: überholt, 19.09.2026) · U2-ADR-319 (Bereich entsteht aus dem Bündel) · U2-ADR-421

**Status heute:** gilt. Die Belege stehen im `konformitaet`-Block unten.

---

## Anlass

U2-ADR-348 ist seit dem 19.09.2026 überholt: Der Ladeweg `bereichsErsatz` am eingebetteten Bündel hat keinen Träger mehr, weil
`const BUERGERMODUL_BUENDEL = null;` im Kern steht. Der Zweig in `buergermodulBuendelAnwenden` stand trotzdem noch da. Er lief nur,
wenn das übergebene Bündel das eingebettete war, und das kann bei `null` nie zutreffen. Sein Epilog war zudem der einzige
Schreiber von `_BEREICH_IDS_AUS_ERSATZ`.

Weg zum Nachsehen: `grep -n "const BUERGERMODUL_BUENDEL" vivodepot.html`; `node tools/buendel-zweig-nutzer-erheben.js --baum .`.

## Entscheidung

1. **Vorher gemessen.** `tools/buendel-zweig-nutzer-erheben.js` misst, ob der Ladeweg über das eingebettete Bündel noch einen
   lebenden Nutzer hat: ein gefülltes Bündel im Kern oder eine Datei, die die Varianten-Fixture
   `tests/fixtures/buergermodul-buendel-varianten.js` einbindet. Ergebnis am 29.10.2026: keiner. Die Dateien, die die
   Fixture nennen, erwähnen sie nur.
2. **Entfernt** sind in `buergermodulBuendelAnwenden` die Prüfung des Blocks `bereichsErsatz`, die Vereinigung mit `bereiche`,
   das Wecken der Feld-Getter für `neu`-Sektoren und der Epilog. Ebenso entfällt die Prüffunktion `_bereichsErsatzPruefen`, die nur
   dieser Zweig aufrief. Die Schleife läuft über `bereiche`.
3. **Bleibt:**
   - das Identitäts-Gate für `bereiche`, `situationen`, `wizards` und `dokumente` (U2-ADR-319). Es ist bei `null` ebenso nie offen;
     sein Abbau ist ein eigener Schritt.
   - `_bereichAusBuendelErzeugen` und `_bereichsErsatzFelderLebendigMachen`, die Werkzeuge und der Zusammensetzungsweg weiter
     nutzen;
   - `_BEREICH_IDS_AUS_ERSATZ` mit seinen Lesern (bleibt leer);
   - das Feld `ersetzteBereiche` im Bericht (bleibt 0);
   - die leere Ab-Werk-Region `AB_WERK_BEREICHS_ERSATZ` (U2-ADR-421).
4. `_BEREICH_IDS_ERSETZT` setzt weiter die Zusammensetzung, wie seit dem 18.09.2026.

## Grenzen

- Nicht Teil: der Abbau des Slots `BUERGERMODUL_BUENDEL` selbst mit allen Lesestellen, des Identitäts-Gates und der
  Varianten-Fixture. Das bleibt ein eigener Schritt; die Erhebung oben zeigt vorher, ob er etwas Lebendes trifft.
- Nicht Teil: die Region `AB_WERK_BEREICHS_ERSATZ` und U2-ADR-421. Eine gefüllte Region würde bei `null` werfen; gefüllt wird sie
  heute von keinem Produkt.

```yaml
konformitaet:
  - aussage: >-
      Der Ladeweg über das eingebettete Bündel hat keinen lebenden Nutzer: das Bündel im Kern ist null, und keine Datei unter
      tests/ oder tools/ bindet die Varianten-Fixture ein.
    zustand: erfuellt
    herkunft: U2-ADR-348-Nachtrag Zweig entfernt (29.10.2026)
    pruefung:
      - tests/buendel-zweig-nutzer-erheben.test.js "[Bündel-Zweig] der Checkout: kein lebender Nutzer des Bündel-Ladewegs"
      - tests/buendel-zweig-nutzer-erheben.test.js "[Bündel-Zweig·Rot-Beweis] die Fixture „lebend“: ein require der Varianten-Fixture ist ein lebender Nutzer, Exit 1"
  - aussage: >-
      Der Kern trägt den Zweig für bereichsErsatz in buergermodulBuendelAnwenden und die Prüffunktion _bereichsErsatzPruefen nicht
      mehr.
    zustand: erfuellt
    herkunft: U2-ADR-348-Nachtrag Zweig entfernt (29.10.2026)
    pruefung:
      - tests/buendel-zweig-nutzer-erheben.test.js "[Bündel-Zweig] der Kern trägt den Zweig für bereichsErsatz nicht mehr"
```
