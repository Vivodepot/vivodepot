# U2-ADR-189: Ein vor dem Depot angedocktes Sprachmodul wird vererbt

**Status:** Angenommen
**Datum:** 01.09.2026
**Kategorie:** KORREKTHEIT, UX
**Linie:** U2
**U2-Bezug:** U2-ADR-141 (Vor-Depot-Konfiguration anwenden — `vorDepotKonfigurationAnwenden()`,
`_vorDepotSpracheAktiv`, dort gebaut). U2-ADR-188 (Registry folgt data — bewusst GETRENNT
gehalten: andere Ursache, siehe unten, nicht dieselbe ADR).
**Anker:** Bauauftrag, 01.09.2026. Wörtliches Zitat: „Die Datei muss
doch die Eigenschaften des Moduls erben, mit dem sie erstellt ist. Wenn zb das Modul der
ungarischen Hebammen im dt. Bürgerdepot geöffnet wird, macht es sonst überhaupt keinen Sinn."
Teil 2 (die depotLaden-Bedingung) Fund eines parallelen Strangs, herausgearbeitet.
**Status heute:** gilt — Beleg `tests/vor-depot-modul-vererbung.test.js`,
`tests/depotladen-sprachwechsel-ohne-eigenes-modul.test.js`.

---

## Kontext

Ein VOR dem Depot angedocktes Textsatz-Modul (Weg B, `vorDepotKonfigurationAnwenden()`,
U2-ADR-141) wirkt sofort — Registry gefüllt, `_vorDepotSpracheAktiv` gesetzt, SEKTOREN neu
gefüllt. Es stand aber nie in `data.textsatzModule`: `depotAnlegen()` startet mit `leeresDepot()`,
und nichts trug das Vor-Depot-Modul dort hinein. Beim nächsten `depotLaden()` baut
`_textsatzModuleAusDepotAnmelden` die Registry KOMPLETT NEU aus `data.textsatzModule` auf (eine
Zuweisung, keine Ergänzung, `vivodepot.html:10029`) — ein Depot, das mit einem ungarischen
Hebammen-Modul erstellt wurde, öffnete beim zweiten Mal wieder auf Deutsch. Genau der Fall aus
dem oben zitierten Wortlaut.

**Eine zweite, unabhängige Ursache kam während desselben Auftrags dazu (Fund eines parallelen Strangs):**
`depotLaden()` ruft die SEKTOREN-Fill-Runde (`textsatzNeuAnwenden()`) nur, wenn DAS GERADE
GELADENE Depot selbst Textsatz-Module mitbringt (`_textsatzModuleAusDepotAnmelden(data) > 0`,
`vivodepot.html:16680`, Stand vor diesem Fix). Falsch: massgeblich ist nicht, ob DIESES Depot
Module mitbringt, sondern ob sich die AKTIVE SPRACHE seit dem letzten Fill geändert haben könnte
— eine Bedingung, die dieser Aufruf nicht im Voraus kennt. Beleg, dass ein Zähler-Gate hier nie
nötig war: die zwei Zeilen direkt darunter, `textsatzSchreibrichtungAnwenden()` und
`textsatzSprachkennungAnwenden()`, liefen an derselben Stelle schon immer unbedingt.

**Bewusst als ZWEITE, getrennte Ursache behandelt, nicht in einem Aufwasch mit U2-ADR-188:**
beide Fehler sitzen zwar in Nachbar-Funktionen (`vorDepotKonfigurationAnwenden`/`depotAnlegen`
hier, `subKontextBetreten`/`-Verlassen`/Reset dort) und beide äussern sich als „falsche Sprache
nach einem Wechsel" — aber U2-ADR-188 ist ein Registry-Nachzug-Problem (eine Stelle vergass,
`_XAusDepotAnmelden` überhaupt aufzurufen), dieser hier ein zu eng gedachtes Gate (die Stelle
ruft die Fill-Runde auf, aber unter der falschen Bedingung). Ein gebündelter Fix hätte diese
Unterscheidung verwischt — und beim nächsten Rückbau risse jemand das Falsche mit heraus.

## Entscheidung

**1 — Ein Vor-Depot-Modul wird beim Anlegen UND beim Sichern in `data.textsatzModule`
übernommen.** Neuer Halter `_vorDepotTextsatzModule` (analog `_vorDepotSpracheAktiv`, dieselbe
early-declaration-Begründung: TDZ-sicher vor `data`s eigener Deklaration). Neue Funktion
`_vorDepotModulInsDepotUebernehmen()`: mischt `_vorDepotTextsatzModule` über die BESTEHENDE
Fassungs-/De-Dup-Logik (`textsatzModulEinbetten()`, dieselbe Funktion, die zwei Speicherungen
hintereinander bereits vor Duplikaten schützt) in `data.textsatzModule`, und setzt
`data.textsprache`, aber NUR wenn es noch unbesetzt ist — eine spätere, bewusste In-Depot-
Sprachwahl der Bürgerin überschreibt diese Vererbung nicht rückwirkend. Aufgerufen aus
`depotAnlegen()` (direkt nach `data = leeresDepot()`) und aus `depotSerialisieren()` (direkt vor
der eigentlichen Serialisierung — idempotent, eine zweite Sicherung dockt das Modul nicht
zweimal an).

**2 — `vorDepotKonfigurationAnwenden()` wendet Schreibrichtung und Sprachkennung jetzt auch VOR
dem Depot an.** Zwei ergänzte Aufrufe (`textsatzSchreibrichtungAnwenden()`,
`textsatzSprachkennungAnwenden()`), direkt nach `textsatzNeuAnwenden()` — derselbe Wortlaut wie
in `depotLaden()`, hier auf den Vor-Depot-Schirm ausgedehnt. Ein Depot, das im Wurzel-Attribut
`lang`/`dir` schon vor der ersten Anmeldung korrekt trägt, statt erst nach dem ersten Öffnen.
**Signatur-Frage geprüft, nicht angenommen:** `regeln.sprachkennung`/`regeln.schreibrichtung`
kommen ausschliesslich aus dem VOM ANBIETER SIGNIERTEN `regeln`-Block eines Moduls (kein
Fallback aus `sprache` existiert im Kern, erschöpfend gegengrepped) — ein bestehendes Modul ohne
diesen Block wirkt darum weiterhin nicht auf `lang`/`dir`, nur ein NEU signiertes würde es. Die
zwei Aufrufe selbst sind reiner Code, keine Signatur betroffen; der `regeln`-Block im Generator
(`tools/textsatz-en-modul-erzeugen.js`) und die Founder-Signierkette sind ein separater,
nachgelagerter Schritt (Bericht).

**3 — `depotLaden()`s Zähler-Gate entfällt.** `textsatzNeuAnwenden()` läuft jetzt unbedingt, wie
seine zwei Nachbarn. Kein neuer Aufruf, nur der Wegfall der Bedingung — die Fill-Runde selbst
ist bereits idempotent (baut SEKTOREN vollständig aus dem aktuellen Registry-Stand neu auf, kein
inkrementelles Mitführen), ein unbedingter Aufruf ist darum kein neues Risiko, nur ein häufigerer
bereits sicherer Aufruf.

## Verworfene Alternative

**Die depotLaden-Bedingung durch einen expliziten Sprachvergleich ersetzen** (Sprache vor dem
Laden merken, mit der Sprache nach dem Laden vergleichen, nur bei Unterschied füllen) statt sie
ersatzlos zu streichen. Verworfen: die Fill-Runde ist bereits billig und idempotent (kein
messbarer Grund, sie zu sparen), und ein Vergleich hätte einen zweiten Zustand (die vorherige
Sprache) eingeführt, der selbst wieder korrekt gepflegt werden müsste — genau die Sorte
zusätzlicher Buchführung, die diese Fehlerklasse erst hervorgebracht hat. Der unbedingte Aufruf,
identisch zu seinen zwei Nachbarn, ist die schmalere Änderung.

## Konsequenzen

Ein vor dem Depot angedocktes Sprachmodul überlebt jetzt Anlegen, Sichern UND Wiederladen — das
oben zitierte Anspruch ist eingelöst. Die SEKTOREN-Fill-Runde läuft bei jedem `depotLaden()`
unbedingt, unabhängig davon, welches Depot zuletzt geladen war oder ob eine vorherige Vor-Depot-
Konfiguration eine andere Sprache aktiv hinterlassen hat.

**Ausdrücklich nicht Teil dieses Auftrags:**

- Der `regeln`-Block im Generator (`tools/textsatz-en-modul-erzeugen.js`) und die Founder-
  Signierkette für ein reales EN-Modul mit Schreibrichtung/Sprachkennung — Signatur-Frage,
  eigener Schritt, im Bericht mit vorgeschlagenem Wortlaut.
- `manifest.webmanifest` (`lang: "de"`, statisch): eine PWA-Manifest-Datei wird vom Browser
  unabhängig von jeder Kern-JS-Ausführung gelesen — kein Textsatz-Mechanismus kann sie zur
  Laufzeit umschalten. Für die deutsche Standard-Auslieferung korrekt; ein eigens gepacktes
  englisches Betriebssatz-Paket bräuchte sein EIGENES, zur Packzeit erzeugtes Manifest — Sache
  des Pack-Werkzeugs, nicht dieses Auftrags.
- Der cross-app-IndexedDB-Fund (paralleler Strang): unabhängig von dieser Vererbung reproduzierbar (geteilter
  `vivodepot`-Store zwischen Sprachpaketen bietet das zuletzt genutzte Depot app-übergreifend an)
  — eine Speicher-Scoping-/Produktentscheidung, kein Vererbungsfehler, ausdrücklich
  als offene Entscheidung belassen.

## Konformität

```konformitaet
aussage:  Ein vor dem Depot signiert angedocktes Textsatz-Modul steht nach depotAnlegen() in
          data.textsatzModule — ohne den Fix stünde dort ein leeres Array.
zustand:  geprüft
herkunft: invariante
pruefung: tests/vor-depot-modul-vererbung.test.js#Rot-Beweis-Vorbedingung
```

```konformitaet
aussage:  Die ganze Naht: vor dem Depot andocken → anlegen → sichern → in einer FRISCHEN
          Kern-Instanz laden → weiterhin fremdsprachig, sowohl die aktive Sprache als auch die
          Registry und SEKTOREN.
zustand:  geprüft
herkunft: invariante
pruefung: tests/vor-depot-modul-vererbung.test.js#die ganze Naht
```

```konformitaet
aussage:  Zwei Speicherungen hintereinander tragen das vererbte Modul nicht zweimal ein —
          textsatzModulEinbetten()s bestehende Fassungs-Entscheidung greift auch hier.
zustand:  geprüft
herkunft: invariante
pruefung: tests/vor-depot-modul-vererbung.test.js#duplizieren das Modul nicht
```

```konformitaet
aussage:  Eine spätere, bewusste In-Depot-Sprachwahl der Bürgerin wird von der Vererbung nicht
          rückwirkend überschrieben.
zustand:  geprüft
herkunft: invariante
pruefung: tests/vor-depot-modul-vererbung.test.js#wird von der Vererbung nicht überschrieben
```

```konformitaet
aussage:  Ein zweites, sprachlich unbeteiligtes Depot setzt die SEKTOREN-Beschriftungen korrekt
          zurück, statt die Sprache eines zuvor in derselben Sitzung geladenen Depots stehen zu
          lassen — depotLaden() läuft nicht mehr am Zähler-Gate vorbei.
zustand:  geprüft
herkunft: invariante
pruefung: tests/depotladen-sprachwechsel-ohne-eigenes-modul.test.js#setzt SEKTOREN zurück
```

---

*Vivodepot GmbH · Berlin · 01.09.2026*
