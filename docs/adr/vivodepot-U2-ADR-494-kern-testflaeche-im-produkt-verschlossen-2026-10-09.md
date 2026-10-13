# U2-ADR-494: Die Test-Fläche window.__vdOeffentlich ist im ausgelieferten Produkt verschlossen

**Status:** Angenommen (09.10.2026) — gebaut in zwei Commits: Code-Listen im Verschluss, dann Region, Schnitt und Proben
**Datum:** 09.10.2026
**Kategorie:** SICHERHEIT, AUSLIEFERUNG, TESTS
**Linie:** U2
**Bezug:** Kern-Verschluss vom 18.09.2026 (bisher ohne eigene ADR; der Kern-Kommentar nannte irrtümlich U2-ADR-425, das „Hilfe
in der Datei“ ist) · U2-ADR-182 (Vor-Depot-Konfiguration, Weg B) · Befunde VDOEFFENTLICH-IM-PRODUKT, VORABKONFIGURATION-RUECKFALL
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Frage

Seit dem Kern-Verschluss (18.09.2026) schließt Script 2 mit einer IIFE. Nur eine benannte Fläche verlässt sie:
`window.__vdOeffentlich`, gebraucht von E2E-Proben, browsergesteuerten Werkzeugen und den Code-Listen-Anhängen am Dateiende.
Die Fläche stand bisher auch im ausgelieferten Produkt. Sie gibt den ganzen Zustand frei (`ankerDaten`, `depotSerialisieren`,
`depotLaden`), auch was gerade nicht angezeigt wird. Ein eingeschleustes Skript braucht dafür zwar eine XSS. Die CSP sperrt aber
das Abfließen per Navigation der obersten Ebene nicht (`navigate-to` wurde nie Standard). Eine externe Sicherheitsprüfung
hat das am Produkt v922 gefunden (MITTEL). Wie kommt das Produkt ohne die Fläche aus, ohne dass die Proben ein anderes Produkt
prüfen als das ausgelieferte?

## Entscheidung

1. **Eine markierte Region, nur die Zuweisung.** `window.__vdOeffentlich = { … };` steht im Kern zwischen genau einer Marke
   `KERN_TESTFLAECHE:BEGIN` und genau einer Marke `KERN_TESTFLAECHE:END`. Jede Zeile darin hat eine von zwei Formen: Kurzschreibweise
   `Name,` oder reine Weiterleitung `get N() { return N; }` / `set N(v) { N = v; }` mit demselben Namen. Keine Logik, keine Seiteneffekte,
   keine Funktion, die das Produkt sonst braucht.
2. **Geschnitten wird im einen Backschritt, per Marken.** `produktTextErzeugen` entfernt die Region, außer bei der benannten
   Test-Option `mitTestflaeche: true` (getrennt von `mitEntwicklerleiste`). Fehlt eine Marke oder ist eine doppelt, wirft der Bau. Weg B
   (gehostete Modul-Apps) schneidet mit derselben Funktion, ebenso die Entwicklerleiste.
3. **Kein Kern-Code ruft über die Fläche.** Die Code-Listen und Terminologie-Literale (Region `CODE-LISTEN`) stehen in Test- und
   Auslieferungsfassung innerhalb des Verschlusses, vor `@vd-kern-verschluss-ende`, und rufen `codeListeAnmelden` /
   `ipsBegriffeAnmelden` bare. Außerhalb von Kommentaren nennt der Kern die Fläche nur in ihrer Zuweisung.
4. **Gleichwertigkeit als Probe.** Für jedes Produkt und für Weg B ist die Testfassung ohne die Region byte-gleich mit dem Erzeugnis des
   echten Auslieferungswegs.
5. **Wächter über jeden Auslieferungsweg.** Kein Erzeugnis eines Wegs aus dem Register der Auslieferungsorte und der vier Produkte trägt
   die Region oder `__vdOeffentlich`. Rot-Beweis je Weg.
6. **Der Nachlade-Zweig der Vor-Depot-Konfiguration fällt nur im Backschritt der vier Produkte.** Sie tragen die Konfiguration immer
   eingebacken, als Array-Zuweisung. Der Zweig, der die Begleitdatei der Vor-Depot-Konfiguration nachlädt, steht im Kern
   zwischen Marken und wird dort geschnitten; ein Produkt ohne eingebackene Array-Zuweisung ist ein Baufehler. Weg B behält den Zweig,
   denn er trägt sein Produkt zur Laufzeit in dieser Begleitdatei (U2-ADR-182).
7. **Die Zahl der Produkt-Specs, die die Fläche brauchen, kann nur sinken** (Ratsche). Specs, die eine Oberfläche prüfen, sollen sie
   über die Oberfläche prüfen.

## Abgrenzung

- Die Fläche im ungebackenen Kern und in der Testfassung bleibt; Node-Proben laufen weiter über den Kern-Lader der Proben, der die Namen
  im Lokalscope sieht und die Fläche nicht braucht.
- Krypto-Primitive und `data` stehen weiterhin nicht auf der Fläche (Entscheidung 18.09.2026).

```yaml
konformitaet:
  - aussage: >-
      Die Region CODE-LISTEN steht innerhalb des Kern-Verschlusses vor @vd-kern-verschluss-ende, ihre Aufrufe gehen nicht über
      window, und außerhalb von Kommentaren nennt der Kern __vdOeffentlich nur in ihrer Zuweisung.
    zustand: erfuellt
    herkunft: U2-ADR-494 (09.10.2026)
    pruefung:
      - tests/kern-testflaeche.test.js "[Kern-Testfläche·Code-Listen] die Region CODE-LISTEN steht im Kern-Verschluss und kein Kern-Code ruft über window.__vdOeffentlich"
      - tests/kern-testflaeche.test.js "[Kern-Testfläche·Code-Listen·Rot-Beweis] ein Aufruf über die Fläche, eine Region hinter dem Verschluss und ein Aufruf außerhalb werden gefunden"
  - aussage: >-
      Die Fläche steht in genau einer markierten Region, die nur ihre Zuweisung in zwei Zeilenformen trägt; der Backschritt schneidet
      sie per Marken; kein Erzeugnis eines Auslieferungswegs trägt sie; die Testfassung ohne Region ist byte-gleich mit dem
      ausgelieferten Produkt.
    zustand: erfuellt
    herkunft: U2-ADR-494 (09.10.2026)
    pruefung:
      - tests/kern-testflaeche.test.js "[Kern-Testfläche·Region] genau eine Region, sie trägt nur die Zuweisung in zwei Zeilenformen"
      - tests/kern-testflaeche.test.js "[Kern-Testfläche·Region·Rot-Beweis] eine Codezeile in der Region, eine zweite Region und eine Marke ohne Gegenstück werden gefunden"
      - tests/kern-testflaeche.test.js "[Kern-Testfläche·Byte·Rot-Beweis] ein Byte außerhalb der Region unterscheidet Testfassung und Auslieferung"
      - tests/kern-testflaeche.test.js "[Kern-Testfläche·Wege] kein Erzeugnis eines Auslieferungswegs trägt die Fläche oder die Entwicklerleiste"
      - tests/kern-testflaeche.test.js "[Kern-Testfläche·Wege·Rot-Beweis] je Weg: ein Erzeugnis, das die Fläche trägt, wird gefunden"
  - aussage: >-
      Die vier Produkte tragen den Nachlade-Zweig der Vor-Depot-Konfiguration nicht und tragen die Konfiguration eingebacken;
      Weg B lädt nach.
    zustand: erfuellt
    herkunft: U2-ADR-494 (09.10.2026)
    pruefung:
      - tests/kern-testflaeche.test.js "[Vor-Depot·Nachladen] die vier Produkte tragen die Konfiguration eingebacken und den Nachlade-Zweig nicht; Weg B trägt ihn und lädt nach"
      - tests/kern-testflaeche.test.js "[Vor-Depot·Nachladen·Rot-Beweis] ein Produkt ohne eingebackene Konfiguration wird nicht gebaut; ein Erzeugnis mit Zweig fällt auf"
```
