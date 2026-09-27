# U2-ADR-215: Der Schalen-Lockstep-Wächter prüft den ausgelieferten Dateisatz, nicht nur zwei von vier Dateien

**Status:** Angenommen
**Datum:** 03.09.2026
**Kategorie:** FEHLERBEHEBUNG, WÄCHTER, BOOT-KETTE
**Linie:** U2
**U2-Bezug:** U2-ADR-217 (Format-Tags Lese-App nachgezogen — der Nebenfund, der diesen Posten
benannt, aber nicht behoben hat) · der Schalen-Lockstep-Grenze-Auftrag vom 04.08.2026 (derselbe
Fehler-Familie: eine Kontrolle, die an der falschen Grenze bzw. mit dem falschen Umfang ansetzt).
**Anker:** Auftrag vom 02.09.2026, im Anschluss an eine Messung, die zeigte: der
Lockstep-Wächter (`scripts/schalen-lockstep-kern.js`) prüfte nur `vivodepot.html` und
`manifest.webmanifest` auf Änderung — `vivodepot-lesen.html` und `sw.js` selbst, beide Teil des
tatsächlich ausgelieferten Dateisatzes (`tools/testfassung-legen.js`), lösten allein geändert
keinen Alarm aus.
**Status heute:** gilt — gebaut, Beleg `tests/schalen-lockstep-anlass.test.js`.

---

## Kontext

`scripts/schalen-lockstep-kern.js` führte seine eigene, hartkodierte Liste der zu überwachenden
Dateien (`DATEIEN = ['vivodepot.html', 'manifest.webmanifest']`), getrennt von der Liste, die
`tools/testfassung-legen.js` tatsächlich auf jede Auslieferung kopiert (`DATEISATZ`, vier
Dateien: zusätzlich `vivodepot-lesen.html` und `sw.js`). Beide Listen wurden an keiner Stelle
gegeneinander geprüft.

Für zwei der vier ausgelieferten Dateien bedeutete das: eine Änderung, die NUR sie betrifft, blieb
für den Wächter unsichtbar. Trifft das zu, während `SCHALEN_STAND` unbewegt bleibt, liefert ein
bereits installierter Service Worker die alte Fassung unbegrenzt weiter aus dem Zwischenspeicher
— unabhängig davon, dass der Commit alle Wächter grün durchlaufen hat. Belegt für
`vivodepot-lesen.html` durch U2-ADR-217 selbst (dessen eigener Commit genau diesen blinden Fleck
durchlief); für `sw.js` durch eine anschließende, eigene Messung (dieselbe Lückenklasse: `sw.js`s
eigene Auslieferungslogik, außerhalb seiner `CACHE`-Zeile, war ebenfalls kein Trigger).

## Entscheidung

**`DATEIEN` wird aus `DATEISATZ` abgeleitet, nicht mehr getrennt geführt.** Ein neues,
abhängigkeitsloses Modul `scripts/ausgeliefertes-dateiset.js` trägt die eine, kanonische Liste;
`tools/testfassung-legen.js` und `scripts/schalen-lockstep-kern.js` requiren beide von dort
(`const DATEIEN = DATEISATZ;`). Ein künftiges Auseinanderlaufen ist damit durch Bauweise
ausgeschlossen, nicht nur durch Disziplin verboten.

**`sw.js` bekommt dieselbe Stempelzeilen-Ausnahme, die `vivodepot.html` bereits hatte.** Die
`CACHE`-Zeile in `sw.js` zählt, wie die `SCHALEN_STAND`-Zeile in `vivodepot.html`, nicht selbst
als inhaltliche Änderung — sonst verlangte jeder Bump seinen eigenen nächsten (Zirkelschluss).
`ohneStempelzeile(datei, text)` trägt seit diesem ADR ein Dateiname-Argument und schlägt in einer
Map (`STEMPEL_ZEILEN`) nach; `vivodepot-lesen.html` und `manifest.webmanifest` bleiben, wie vorher,
ohne Ausnahme voll verglichen — sie tragen keine eigene Versionszeile.

Die Bedingung, an der der Wächter jetzt anspringt: **eine Datei aus dem ausgelieferten
Dateisatz hat sich geändert — außerhalb ihrer eigenen Versions-Stempelzeile, falls sie eine trägt
— ohne dass `SCHALEN_STAND` gegenüber dem Vorgänger gestiegen ist.** `leseStand()` bleibt die
einzige Stand-Quelle und liest weiterhin ausschließlich `vivodepot.html`.

`index.html` bleibt außerhalb des Wächters — es wird zur Auslieferungszeit aus `vivodepot.html`
generiert, nicht versioniert verglichen, und kann nicht unabhängig von ihm auseinanderlaufen.

**`tests/schalen-stand-sw-lockstep.test.js` bleibt unverändert bestehen.** Er prüft eine andere
Invariante (Wert-Gleichheit der beiden Versionszahlen) als der Anlass-Mechanismus (Änderung ohne
Stand-Anstieg) — auch nach dieser Erweiterung deckt keiner der beiden Tests den Fall des anderen
vollständig ab: ein Tippfehler, der `CACHE` auf eine falsche, zu `SCHALEN_STAND` nicht passende
Zahl setzt, bliebe für den Anlass-Test unsichtbar (er liest die `CACHE`-Zahl nie) — der
Gleichstand-Test fängt genau das.

## Konsequenzen

Eine Änderung, die ausschließlich `vivodepot-lesen.html` oder ausschließlich `sw.js` (außerhalb
seiner Stempelzeile) betrifft, macht den Lockstep-Wächter jetzt rot, wenn `SCHALEN_STAND` dabei
nicht mitzieht — an derselben Stelle (`pre-push`, `tests/schalen-lockstep-anlass.test.js`), an der
er das für `vivodepot.html` bereits vorher tat. Der Alltagsfall (nur `vivodepot.html` ändert sich,
`SCHALEN_STAND` steigt mit) bleibt unverändert grün — sechs Proben in
`tests/schalen-lockstep-anlass.test.js` belegen das je einzeln, darunter die Zirkel-Gegenprobe
(ein reiner Stempelzeilen-Bump ohne sonstige Änderung bleibt grün).

**Ausdrücklich nicht behandelt:** `index.html` als eigenständiges Wächter-Ziel (s. o., bewusst
ausgeschlossen, kein offener Punkt).

## Konformität

```konformitaet
aussage:  Ändert ein Commit ausschließlich vivodepot-lesen.html oder ausschließlich sw.js
          (außerhalb seiner CACHE-Zeile), ohne SCHALEN_STAND gegenüber dem Vorgänger zu heben,
          meldet der Schalen-Lockstep-Wächter (tests/schalen-lockstep-anlass.test.js bzw.
          hooks/pre-push) einen Befund.
zustand:  geprüft
herkunft: fund
pruefung: tests/schalen-lockstep-anlass.test.js#[Schale·Positivkontrolle] nur vivodepot-lesen.html geändert, SCHALEN_STAND unbewegt → ROT
pruefung: tests/schalen-lockstep-anlass.test.js#[Schale·Positivkontrolle] nur sw.js außerhalb der CACHE-Zeile geändert, SCHALEN_STAND unbewegt → ROT
```

```konformitaet
aussage:  Ein Commit, der ausschließlich SCHALEN_STAND und CACHE (je nur die eigene
          Stempelzeile) hebt, ohne sonstige Änderung an vivodepot.html, sw.js,
          vivodepot-lesen.html oder manifest.webmanifest, bleibt grün (keine Zirkel-Meldung).
zustand:  geprüft
herkunft: invariante
pruefung: tests/schalen-lockstep-anlass.test.js#[Schale·Negativkontrolle] die Zirkel-Probe — NUR beide Stempelzeilen gehoben, sonst nichts geändert
```

---

*Vivodepot GmbH · Berlin · 03.09.2026*
