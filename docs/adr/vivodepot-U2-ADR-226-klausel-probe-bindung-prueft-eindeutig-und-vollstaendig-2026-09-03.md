# U2-ADR-226: die Klausel→Probe-Bindung prüft eindeutig UND vollständig, nicht nur die erste Zeile

**Status:** Angenommen
**Datum:** 03.09.2026
**Kategorie:** WÄCHTER, PRÜFSTAND, FEHLERBEHEBUNG
**Linie:** U2
**U2-Bezug:** U2-ADR-099 (Prüfstand der Bindungen) · U2-ADR-098 (Klausel-Format) · U2-ADR-215
(derselbe Auftrag, andere Stelle — dort prüfte der Schalen-Wächter zwei von vier ausgelieferten
Dateien, hier prüfte der ADR-Konformitäts-Wächter nur die erste von mehreren `pruefung:`-Zeilen).
**Anker:** eigener Befund, im Anschluss an eine Kollisions-Erhebung dreier verwaister
Arbeitsbäume (03.09.2026): eine Probe (`PS11-1`) trug in einem verwaisten Entwurf denselben
Kürzel-Namen wie eine bereits gelandete (U2-ADR-222), für etwas völlig anderes. Beim Nachmessen,
ob das der einzige Fall war, fand sich ein zweiter, bereits EINGETRETENER Fehler an derselben
Codestelle — kein hypothetischer mehr.
**Status heute:** gilt — Beleg `tests/adr-konformitaet-pruefen.test.js`,
`tests/klausel-proben-schaerfe-pruefer.test.js`, `tests/pruefstand-bindung.test.js`.

---

## Kontext

Zwei getrennt gebaute, aber verwandte Prüfer lösen `pruefung:`-Zeilen aus ADR-Konformitäts-
Blöcken auf einen echten Testtitel auf — `tools/adr-konformitaet-pruefen.js` (das Gate, das über
`zustand: geprüft/prüfbar` entscheidet) und `tests/pruefstand-bindung.js` (die Quelle der
STAND-Zahlen in `pruefstand-bindung.test.js`). Beide importierten dieselbe `testTitelVon()` —
liefen aber an zwei unabhängigen Stellen auseinander.

**Fehlerklasse A, an beiden Stellen:** die Auflösung prüfte `testTitelVon(quelle).some(t =>
t.includes(name))` — „passt MINDESTENS EIN Titel". Passten ZWEI oder mehr, blieb das
stillschweigend grün. Gemessen, nicht vermutet: zwei bereits gelandete Klauseln
(U2-ADR-102, U2-ADR-131) trugen genau diesen Fehler — `U2-102` band mehrdeutig auf elf
Testtitel, `K8·Byte-Gleichheit` auf vier, beide seit ihrer jeweiligen Landung nie tatsächlich
verifiziert.

**Fehlerklasse B, nur in `tools/adr-konformitaet-pruefen.js`:** `zeilenwert()` las pro Block per
nicht-globalem Regex nur die ERSTE `pruefung:`-Zeile. Mehrfache `pruefung:`-Zeilen je Block sind
der etablierte Normalfall (36 von 195 Blöcken im Bestand vom 03.09.2026 — z. B. Rot-Beweis PLUS
Rundlauf für dieselbe Aussage, U2-ADR-212). Jede Zeile ab der zweiten blieb unbetrachtet.
Gemessen: **48 von 248 `pruefung:`-Zeilen im gesamten damaligen Bestand** — rund 25 ADR-Dateien —
waren dem Gate nie sichtbar, darunter ein Block in U2-ADR-222 selbst. `tests/pruefstand-
bindung.js` hatte diese Klasse bereits richtig gebaut (`konformitaetZeilen()` sammelt jede Zeile
einzeln) — nur das eigentliche Gate nicht.

Ein bereits existierender dritter Prüfer, `tools/klausel-proben-schaerfe-pruefer.js`, hatte
Fehlerklasse B für sich selbst schon am 05.08.2026 gefunden und behoben (eigene
`alleePruefungsZeilen()`-Kopie, mit dem Fund „sonst blieben vier von fünf Proben in
`testament-verzicht-klausel` unsichtbar") — nur eben nicht an der eigentlich zuständigen Stelle.

## Entscheidung

**1 — `alleePruefungsZeilen(blockText)` wird kanonisch.** Verschoben von
`tools/klausel-proben-schaerfe-pruefer.js` nach `tools/adr-konformitaet-pruefen.js` (die
foundationalere der beiden Stellen); jener Prüfer importiert sie jetzt von dort, statt eine
zweite Kopie derselben Regex zu pflegen (§7.5).

**2 — `pruefeKlausel()` prüft JEDE `pruefung:`-Zeile eines Blocks, einzeln.** Ein Block ist rot,
wenn EINE KONKRETE Zeile fehlschlägt — nicht schon dadurch, dass es mehrere sind. Der neue Fund
`fund.pruefungen` trägt jede Zeile mit ihrem eigenen Ergebnis; `fund.pruefung` bleibt zusätzlich
die erste als kompakter String, für alles, das nur den Ein-Zeile-Fall kennt.

**3 — Genau EIN Treffer, nicht „mindestens einer".** `testTitelVon(quelle).filter(t =>
t.includes(name))` statt `.some(...)` — an BEIDEN Stellen (`adr-konformitaet-pruefen.js` UND
`tests/pruefstand-bindung.js`s `klassifiziere()`). Null Treffer bleibt der alte Fehlschlag;
mehr als ein Treffer ist der neue — „mehrdeutig", mit allen kollidierenden Titeln in der Meldung.

**Ausdrücklich, damit es nicht wie Punkt 1 klingt:** anders als `alleePruefungsZeilen()` wird
dieser Fix NICHT geteilt — `tests/pruefstand-bindung.js` importiert nichts aus
`tools/adr-konformitaet-pruefen.js`. Es sind zwei getrennte, von Hand nachgezogene, textlich
fast gleiche Implementierungen derselben Zeile. Das ist die Kopie-Form, gegen die dieses ADR an
anderer Stelle antritt — hier bewusst stehen gelassen (s. Konsequenzen, offener Posten), nicht
übersehen.

**4 — Zwei real gefundene, bereits gelandete Fehlbindungen korrigiert**, nicht nur der Mechanismus:
U2-ADR-102s `pruefung:` löst jetzt auf die drei Testtitel auf, die die drei Teilaussagen der
Klausel tatsächlich tragen; U2-ADR-131s auf die vier in der Aussage selbst genannten
Dokument-Ausgaben. Keine Bewertung, ob das die einzig denkbare Auflösung ist — nur die, die aus
dem jeweiligen `aussage:`-Text selbst folgt, nachvollziehbar für jede künftige Leserin.

**5 — Sechs (tatsächlich sieben) Kommentare umgeschrieben.** „…kein Titel doppelt referenziert"
in `tests/pruefstand-bindung.test.js` behauptete bislang eine einmalig von Hand geprüfte
Eigenschaft — jetzt ist es eine bei jedem Lauf durch Fehlerklasse A geprüfte. Ein Kommentar, der
eine geprüfte Sache behauptet, ist etwas anderes als einer, der eine ungeprüfte behauptet.

## Verworfen

**Volltitel-Deduplizierung als eigener, separater Wächter.** Erwogen: ein Wächter, der über den
gesamten `tests/`-Bestand nach identischen oder präfix-kollidierenden Testtiteln sucht,
unabhängig von ADR-Bindungen. Nicht Teil dieses ADRs — der hier behobene Fehler sitzt in der
BINDUNG (welcher Titel wird für eine `pruefung:`-Zeile akzeptiert), nicht in der bloßen Existenz
ähnlicher Namen im Bestand. Ob ein solcher, weiterer Wächter zusätzlich gebraucht wird, ist eine
eigene Abwägung, keine Feststellung dieses ADRs.

## Konsequenzen

`klauselnRot` (bzw. `unlesbar`/`gueltig` in `pruefstand-bindung.js`) zählt ab jetzt tatsächlich
JEDE `pruefung:`-Zeile, nicht nur eine je Block. Der gemessene Effekt auf den Bestand vom
03.09.2026: von 48 zuvor unbetrachteten Zeilen lösten alle 48 einzeln korrekt auf (Fehlerklasse B
allein fand nichts Neues) — die beiden real gefundenen Defekte kamen beide aus Fehlerklasse A, an
Zeilen, die bereits (fälschlich) gelesen wurden. `gueltig` steigt netto um 5 (drei U2-102-Zeilen
statt einer mehrdeutigen, vier K8-Zeilen statt einer mehrdeutigen), `ausserReichweite` um 1 (genau
eine der fünf ruft keine dateieigene Diskriminante).

**Ausdrücklich nicht behandelt:**
- ob weitere, noch nicht gemessene Kürzel-Kollisionen zwischen dem Kanon und den drei verwaisten
  Bäumen (`hinweis-fix`, `plattform-hinweis`, `auslieferung-gruen`) existieren — das war
  Gegenstand der vorangegangenen Erhebung, nicht dieses Baus.
- **die Zusammenführung der Fehlerklasse-A-Prüfung selbst.** `tools/adr-konformitaet-pruefen.js`
  und `tests/pruefstand-bindung.js`s `klassifiziere()` tragen nach diesem ADR zwei unabhängige,
  von Hand synchron gehaltene Fassungen derselben `.filter(...).length`-Prüfung — dieselbe
  Kopie-Form, die dieses ADR bei `alleePruefungsZeilen()` (Punkt 1) beseitigt hat, hier nicht.
  Ein künftiger Umbau am Prüfstand (nicht am Gate) könnte das zusammenführen; das ist ein eigener
  Posten, kein Teil dieses Baus.

## Konformität

```konformitaet
aussage:  Ein Anker, der auf MEHR ALS EINEN Testtitel derselben Datei passt, macht die Klausel
          ROT — nicht stillschweigend gültig, wie vor diesem ADR.
zustand:  geprüft
herkunft: fund
pruefung: tests/adr-konformitaet-pruefen.test.js#[Konformitäts-Wächter·226 Klasse A] ein Anker, der auf ZWEI Testtitel passt, ist ROT — mehrdeutig, nicht nur „nicht gefunden" (kurzzeitig zwei kollidierende Titel im Repo angelegt, danach entfernt)
```

```konformitaet
aussage:  Die ZWEITE (oder weitere) `pruefung:`-Zeile eines Blocks wird tatsächlich geprüft — vor
          diesem ADR blieb sie unbetrachtet, auch wenn sie auf nichts Reales zeigte.
zustand:  geprüft
herkunft: fund
pruefung: tests/adr-konformitaet-pruefen.test.js#[Konformitäts-Wächter·226 Klasse B] ZWEITE pruefung-Zeile eines Blocks, die auf nichts passt, ist ROT — vor U2-ADR-226 unsichtbar
```

```konformitaet
aussage:  Mehrere `pruefung:`-Zeilen je Block, die alle einzeln korrekt auflösen, bleiben GRÜN —
          Mehrfachbindung ist der etablierte Normalfall, keine eigene Fehlerform.
zustand:  geprüft
herkunft: invariante
pruefung: tests/adr-konformitaet-pruefen.test.js#[Konformitäts-Wächter·226 Gegenprobe] MEHRERE pruefung-Zeilen, die alle einzeln korrekt auflösen, bleiben GRÜN — Mehrfachbindung ist der Normalfall, kein Fund
```

```konformitaet
aussage:  Gegen den echten, gelandeten ADR-Bestand: keine Klausel trägt nach der Korrektur noch
          eine widersprüchliche oder mehrdeutige `pruefung:`-Bindung.
zustand:  geprüft
herkunft: invariante
pruefung: tests/adr-konformitaet-pruefen.test.js#[Konformitäts-Wächter] gegen den echten Bestand: die vier Zahlen sind plausibel
```

---

*Vivodepot GmbH · Berlin · 03.09.2026*
