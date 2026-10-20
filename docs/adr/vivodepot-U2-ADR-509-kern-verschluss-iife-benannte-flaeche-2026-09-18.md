# U2-ADR-509: Kern-Verschluss — Script 2 als IIFE, nur eine benannte Fläche

**Status:** Angenommen (18.09.2026; ADR nachgetragen 17.10.2026)
**Datum:** 18.09.2026
**Kategorie:** SICHERHEIT, TESTS
**Linie:** U2
**Bezug:** Commit `3cacad836` (Kern-Verschluss, als normale Historie gelandet am 19.09.2026, Inhalt vom 18.09.2026) ·
Nachträge `cf1cab9c6` (zwei übersehene Aufrufstellen) und `8757bb87e` (E2E-Specs signieren ohne Kern-Internas) ·
U2-ADR-494 (die Fläche ist im ausgelieferten Produkt verschlossen; baut auf dieser ADR auf)
**Status heute:** gilt — Belege im `konformitaet`-Block unten. Proben- und Werkzeug-Kommentare, die den Verschluss früher
als „U2-ADR-NNN (18.09.2026, Kern-Verschluss)“ zitierten, nennen jetzt diese ADR.

## Frage

Script 2 ist der Kern der Anwendung (Speicherformat, Datenmodell, Modus, Design-Schicht, Hülle, Andock-Vertrag). Es ist ein
klassisches `<script>`. Damit lag jeder Top-Level-Name offen, auf zwei unabhängigen Kanälen:

- **`window.<Name>`:** jede Top-Level-`function`-Deklaration eines klassischen Skripts wird zur Eigenschaft von `window`;
  `"use strict"` ändert daran nichts.
- **bare** (`page.evaluate`, Devtools-Konsole): jede Top-Level-Bindung, auch `let`/`const`, gehört zur globalen lexikalischen
  Umgebung des Realms, unabhängig von `window`. So war `data`, der vollständige, les- und schreibbare Zustand des geöffneten
  Depots, nie über `window` erreichbar und trotzdem voll erreichbar.

Entschieden hatte das niemand; es folgte aus der Skriptform. Wie schließt man den Kern, ohne den Proben und Werkzeugen, die ihn
von außen bedienen, den Zugang zu nehmen?

## Entscheidung

1. **Script 2 läuft in einer IIFE.** Es beginnt mit `"use strict";` und `(function() {` und endet mit `})();` direkt vor
   `</script>`. Kein Top-Level-Name von Script 2 liegt danach auf `window` oder in der globalen lexikalischen Umgebung.
2. **Genau eine benannte Fläche verlässt den Verschluss:** die Zuweisung `window.__vdOeffentlich = { … };` am Ende von Script 2.
   Ein Objekt als Namensraum statt einzelner Globaler. Aufrufer von außen schreiben `window.__vdOeffentlich.<Name>`, nicht
   `window.<Name>`.
3. **Jede Zeile der Fläche trägt ihren Grund**, in der Regel den Aufrufer (E2E-Spec, Konformitätsprobe, Werkzeug), damit die Fläche
   schrumpfen kann statt nur zu wachsen. Funktionen stehen in Kurzschreibweise; Zustandsvariablen, die ein Aufrufer lesen oder setzen
   muss, stehen als Zugriffspaar `get N() { return N; }` / `set N(v) { N = v; }`.
4. **Die Fläche ist nicht eingefroren** (`Object.freeze` bewusst nicht). Ein Rot-Beweis, der die Fläche selbst misst, braucht ein
   beschreibbares Objekt; ein eingefrorenes ließe die Zuweisung im Browser still verpuffen.
5. **Krypto-Primitive und Zustands-Innenschau stehen nicht auf der Fläche**, auch wo eine Probe sie bisher bare gebraucht hat.
   Ausdrücklich nicht aufgenommen: `_AAD_DEPOT_V2`, `_jwsImportSignKey`, `_signJWS`, `anfrageSignaturPruefen`, `data`, `decryptData`,
   `deriveDepotKeyV2`, `deriveKey`, `sessionHkdfKey`, `sessionSubKeys`, `vollExportJSON`. Betroffene Proben werden auf den Node-Weg
   (`ladeKern()`) oder eine Prüfung über die Oberfläche umgebaut, nicht auf die Fläche verlegt. E2E-Specs, die ein signiertes
   Test-Bündel brauchen, signieren mit eigener Browser-WebCrypto (`browserEd25519SchluesselpaarErzeugen`, `browserJwsSignieren` in
   `tests/e2e/helpers.js`), so wie ein externer Aussteller es täte.
6. **Node-Proben laufen innerhalb des Verschlusses.** `tests/load-kern.js` lädt den Kern in einen `new Function()`-Lokalscope und
   fügt seinen Export-Haken vor der Marke `@vd-kern-verschluss-ende` ein, also vor der schließenden Klammer der IIFE. Fehlt die Marke
   im Standardpfad, wirft der Lader; nur ein ausdrücklich gesetzter älterer Kern (`KERN_HTML_PATH`) darf sie nicht tragen.
7. **Ein Wächter hält beide Richtungen** gegen die echte `vivodepot.html` im Browser: kein Name aus Script 2 liegt zusätzlich direkt
   auf `window`, und jeder im Export-Block geführte Name löst unter `window.__vdOeffentlich` auf. Der Export-Block steht genau einmal
   in der Datei. Die Textanalyse dazu (`tools/lib/fenster-flaeche-diff.js`) hat eigene Proben ohne Browser.

## Folgen

- Aufrufstellen in Proben, die Kern-Namen bare riefen, wurden mit dem Verschluss auf `window.__vdOeffentlich.<Name>` umgestellt.
  Zwei übersehene Stellen in Konformitätsproben folgten am 19.09.2026 (`cf1cab9c6`); `_jwsImportVerifyKey` und
  `notfallKontakteVcard` kamen dabei auf die Fläche.
- **Eine Funktion auf der Fläche ist eine Kopie der Referenz.** Der interne Aufruf bindet lexikalisch und sieht eine Zuweisung an
  `window.__vdOeffentlich.<Name>` nicht. Nur Zugriffspaare wirken beim Zuweisen. Ein Rot-Beweis, der einen internen Aufrufer treffen
  will, mutiert darum den Quelltext einer Kopie des gebackenen Produkts. Ein Wächter findet Zuweisungen an Kurzform-Einträge in
  `tests/e2e/` und `tools/`; die Marke `nur-oeffentliche-flaeche` nimmt eine Zuweisung aus, deren Messung die Fläche selbst ruft.
- Seit U2-ADR-494 (09.10.2026) steht die Zuweisung zwischen den Marken `KERN_TESTFLAECHE:BEGIN`/`END` und wird aus jedem
  ausgelieferten Erzeugnis geschnitten; die Code-Listen (Region `CODE-LISTEN`) stehen seither innerhalb des Verschlusses vor
  `@vd-kern-verschluss-ende`. Im ausgelieferten Produkt verlässt damit kein Name von Script 2 den Verschluss.

## Grenzen

- Die Entscheidung betrifft Script 2. Der Wächter misst die Top-Level-Namen von Script 2; der Krypto-Block (Script 1) und die
  Bibliotheks-Blöcke danach sind nicht Gegenstand dieser ADR. Die Primitive von Script 1 liegen nach dem Grundsatz vom 18.09.2026 global. Die
  Hülle VdCrypto: Befund VDCRYPTO-HUELLE-GLOBAL-ERREICHBAR.
- Die Probe gegen Zuweisungen an die Fläche liest nur tests/e2e/*.js und tools/*.js, ohne Unterordner und ohne .mjs.
- Der Browser-Wächter fragt je Name `window[Name]` ab. Eine Bindung, die nur in der globalen lexikalischen Umgebung läge,
  sähe er nicht; dass Script 2 keine solche trägt, folgt aus der IIFE-Form, nicht aus dieser Probe.
- Der Wächter hält die Laufzeit gegen den Export-Block, nicht gegen die Ausschlussliste in Punkt 5. Ein neuer Eintrag eines dort
  ausgeschlossenen Namens im Export-Block fiele ihm nicht auf.
- Der Überschreib-Wächter kennt nur die Schreibform `window.__vdOeffentlich.<Name> = …`; `Object.assign`/`defineProperty` erfasst
  er nicht.

```yaml
konformitaet:
  - aussage: >-
      Kein Top-Level-Name von Script 2 liegt zusätzlich direkt auf window; jeder im Export-Block geführte Name löst unter
      window.__vdOeffentlich auf; der Export-Block steht genau einmal in vivodepot.html.
    zustand: erfuellt
    herkunft: U2-ADR-509 (18.09.2026)
    pruefung:
      - tests/e2e/fenster-flaeche-guard.spec.js "[Vorbedingung] der Suchraum ist besetzt — sonst prüft diese Datei nichts"
      - tests/e2e/fenster-flaeche-guard.spec.js "[Anker] kein Kern-Name landet zusätzlich direkt auf window"
      - tests/e2e/fenster-flaeche-guard.spec.js "[Anker] jeder im Export-Block geführte Name löst unter window.__vdOeffentlich auf"
      - tests/e2e/fenster-flaeche-guard.spec.js "[Rot-Beweis] ein NICHT gelisteter Name, der bare auf window gelegt wird, wird gefunden"
      - tests/e2e/fenster-flaeche-guard.spec.js "[Rot-Beweis] ein gelisteter Name, der zur Laufzeit fehlt, wird gefunden"
      - tests/e2e/fenster-flaeche-guard.spec.js "[Gegenprobe] eine unbeteiligte Änderung bricht den Wächter nicht"
      - tests/e2e/fenster-flaeche-guard.spec.js "[Klausel] der Export-Block-Anker kommt in vivodepot.html genau einmal vor"
  - aussage: >-
      Die Textanalyse des Wächters sammelt die Top-Level-Namen beider Kanäle (function und async function sowie let/const/var),
      liest aus dem Export-Block die einfachen Namen ohne die Zugriffspaare und wirft bei fehlendem Anker oder leerem Block,
      statt still eine leere Liste zu liefern.
    zustand: erfuellt
    herkunft: U2-ADR-509 (18.09.2026)
    pruefung:
      - tests/fenster-flaeche-diff.test.js "[Funktionsnamen] findet function UND async function auf Top-Level"
      - tests/fenster-flaeche-diff.test.js "[Bindungsnamen] ergänzt let/const/var um die Funktionsnamen, ohne Duplikate"
      - tests/fenster-flaeche-diff.test.js "[Bindungsnamen·Rot-Beweis] ein Kanal allein (nur function) sieht bare let/const nicht"
      - tests/fenster-flaeche-diff.test.js "[Export-Block] liest Bezeichner vor dem Komma, ignoriert Kommentare und Leerzeilen"
      - tests/fenster-flaeche-diff.test.js "[Export-Block·Rot-Beweis] fehlt der Anker, wirft die Funktion statt still [] zu liefern"
      - tests/fenster-flaeche-diff.test.js "[Export-Block·Rot-Beweis] ein leerer Block (0 Namen) wirft — eine stumme leere Liste wäre schlimmer"
      - tests/fenster-flaeche-diff.test.js "[Export-Block] Getter/Setter-Zeilen (Zustands-Namen) zählen nicht als einfacher Bezeichner"
      - tests/fenster-flaeche-diff.test.js "[Unerlaubt reichbar] findet genau die Namen, die NICHT erlaubt sind, aber reichbar melden"
      - tests/fenster-flaeche-diff.test.js "[Fehlende Erlaubte] findet genau die erlaubten Namen, die NICHT reichbar sind"
  - aussage: >-
      Keine E2E-Spec unter tests/e2e/ und kein Werkzeug unter tools/ (je ohne Unterordner, nur .js) weist einem Kurzform-Eintrag
      der Fläche ohne Marke etwas zu; die Fläche trägt Funktionen und Zugriffspaare.
    zustand: erfuellt
    herkunft: U2-ADR-509 (18.09.2026)
    pruefung:
      - tests/e2e-ueberschreiben-flaeche-wirkt.test.js "Positivkontrolle: die Fläche trägt Funktionen UND Zustands-Zugriffspaare"
      - tests/e2e-ueberschreiben-flaeche-wirkt.test.js "[Rot-Beweis] die Form des Befunds wird gefunden; Marke und Zugriffspaar nehmen sie aus"
      - tests/e2e-ueberschreiben-flaeche-wirkt.test.js "kein E2E-Spec überschreibt eine Kopie ohne Marke"
      - tests/e2e-ueberschreiben-flaeche-wirkt.test.js "[Rot-Beweis] die Form aus der alten Belegstrecke wird gefunden"
      - tests/e2e-ueberschreiben-flaeche-wirkt.test.js "kein Werkzeug in tools/ überschreibt eine Kopie ohne Marke"
```
