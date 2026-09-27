# U2-ADR-228: die Suite-Zahl in erzeugten Dokumenten kommt aus den von Git getrackten Testdateien, nicht aus Nodes eigener Dateisuche

**Status:** Angenommen
**Datum:** 03.09.2026
**Kategorie:** WÄCHTER, BUILD-WERKZEUGE
**Linie:** U2
**U2-Bezug:** U2-ADR-215 (derselbe Fehlertyp — ein Mechanismus deckt eine andere Menge ab, als
sein Name verspricht — dort der ausgelieferte Dateisatz im Schalen-Lockstep-Wächter, hier die
Testsuite in zwei Erzeugern).
**Anker:** Auftrag vom 03.09.2026. Anlass: `docs/faktenbasis.md` trug in `a1256d46` die
Zahl 6646, aus einem echten `node --test`-Lauf gemessen und zweifach reproduziert — und war
trotzdem falsch. Sitzung „-47" maß auf demselben Commit dreifach 6574. Beide Messungen waren
korrekt durchgeführt; nur eine der beiden Umgebungen war es.
**Status heute:** gilt — Beleg `tests/suite-dateien-kern.test.js`.

---

## Kontext

`tools/faktenbasis-erzeugen.js` (immer) und `tools/build-standzahlen.js --mit-suite` (auf
Anfrage) ließen bislang ein nacktes `node --test` bzw. `npm test` ohne Dateiliste laufen und
parsten dessen TAP-Summenzeile. Nodes eigene Testdatei-Suche sammelt dabei nach
Dateisystem-Muster (`**/*.test.{js,cjs,mjs}` unterhalb des Arbeitsverzeichnisses) — sie kennt
`.gitignore` nicht und unterscheidet nicht zwischen einer committeten Datei und einer, die nur
lokal auf der Platte liegt.

Acht Testdateien der ARBEITSLISTE-Werkzeugfamilie (`tests/arbeitsliste-kennungen.test.js` u. a.)
liegen absichtlich gitignoriert im Arbeitsbaum vieler Sitzungen — dokumentierte, gewollte lokale
Werkzeuge, nie committet. `node --test` zählt sie trotzdem mit, sobald sie physisch in `tests/`
liegen. `git status` zeigt das nicht an (die Dateien sind bewusst ignoriert, kein Zufallsfund),
und ein Ergebnis von 0 Fehlschlägen bot keinen Anlass, misstrauisch zu werden.

Die Rechnung, gemessen: acht Dateien, 7+7+16+9+5+16+6+6 = **72** `test()`-Aufrufe — exakt die
Differenz zwischen 6646 (kontaminierter Arbeitsbaum) und 6574 (frischer Wegwerf-Baum aus
demselben Commit, `node_modules` verlinkt statt kopiert, dreifach bei „-47" reproduziert). Der
Rot-Beweis zu diesem ADR (temporäre, ungetrackte `tests/_rotbeweis-suite-messfrage-tmp.test.js`
mit fünf `test()`-Aufrufen, wieder entfernt) bestätigte den Mechanismus direkt: der alte Weg zählte
6646+5=6651, der neue Weg — selbe Datei, selber Baum — weiterhin 6574.

**Warum das mehr als ein einzelner Zahlendreher ist:** Die Suite-Zahl landet in einer
**committeten** Datei (`docs/faktenbasis.md`, und optional `docs/konformitaet-quellen.md`). Eine
Zahl, die vom lokalen Zustand des messenden Arbeitsbaums abhängt, ist im Kanon nicht mehr von
einer falschen Zahl zu unterscheiden — beide sehen aus wie „gemessen, nicht geraten".

## Entscheidung

**1 — Eine neue, abhängigkeitslose Quelle für „welche Dateien sind die Suite":**
`scripts/suite-dateien-kern.js`, Bauart wie `scripts/ausgeliefertes-dateiset.js` (U2-ADR-215) —
trägt nur die Ermittlung. `suiteDateien(repo)` liefert `git ls-files tests`, gefiltert auf
`\.test\.(js|cjs|mjs)$`.

**2 — Beide betroffenen Erzeuger rufen `node --test` mit dieser expliziten Dateiliste, nicht
ohne Argumente.** `node --test <Datei> <Datei> …` führt mit expliziten Pfaden NUR diese Dateien
aus — Nodes eigene Muster-Suche greift dann nicht mehr, unabhängig davon, was sonst im
Arbeitsbaum liegt. Umgesetzt über `execFileSync('node', ['--test', ...dateien], …)` — ein
Argumente-Array, keine Shell-Zeichenkette, aus Gewohnheit dieses Repos bei allen `git`/`node`-
Unterprozessaufrufen (kein Escaping-Risiko bei ~800 Dateipfaden).

`tools/faktenbasis-erzeugen.js`: die zwei bereits bestehenden Ausnahmen (`--check` misst gar
nicht, Rekursionsschutz; `--ausgabe` misst gar nicht, betrifft nur die eigene Testsuite) bleiben
unverändert — sie haben einen eigenen, im Code stehenden Grund, der mit dieser Frage nichts zu
tun hat.

`tools/build-standzahlen.js`: `suiteMessen()` bleibt hinter `--mit-suite` genau wie vorher (die
Suite-Zahl ist „der teure Slot" — das ändert sich nicht), nur der Lauf selbst wechselt von
`npm test` ohne Argumente auf dieselbe explizite Dateiliste.

**3 — Beide Erzeuger lesen künftig dasselbe Feld aus der TAP-Summenzeile: `tests` (die
Gesamtzahl), nicht `pass`.** Vorher las `faktenbasis-erzeugen.js` `tests`, `build-standzahlen.js`
dagegen `pass` — bei einer grünen Suite sind beide Zahlen gleich, bei einer roten widersprechen
sich zwei Werte, die beide „die Suite" heißen. `pass` verschweigt einen Fehlschlag, indem es ihn
aus der Zahl herausrechnet, statt ihn zu zeigen; `tests` bleibt in beiden Fällen dieselbe Zahl.

**4 — Die acht ARBEITSLISTE-Testdateien bleiben, wo sie sind.** Der Fehler lag im Erzeuger, der
sie mitzählte, nicht in ihrer Existenz oder ihrem Ort.

## Konsequenzen

**Die Suite-Zahl in `docs/faktenbasis.md` (und, wenn `--mit-suite` genutzt wird, in
`docs/konformitaet-quellen.md`) ist ab jetzt umgebungsunabhängig** — jeder Arbeitsbaum auf
demselben Commit liefert dieselbe Zahl, unabhängig davon, welche lokalen, gitignorierten
Werkzeuge zusätzlich in `tests/` liegen. Geprüft nicht nur durch Konstruktion, sondern durch
Vergleich: derselbe Fix, im selben (weiterhin kontaminierten) Arbeitsbaum ausgeführt, lieferte
6574 — dieselbe Zahl wie ein frischer Wegwerf-Baum desselben Commits.

**Bindend für jeden künftigen Erzeuger, der einmal eine Suite-Zahl in eine committete Datei
schreiben will:** „die Suite" heißt „die von Git getrackten Testdateien", ermittelt über
`scripts/suite-dateien-kern.js`, nicht über eine eigene, erneut Dateisystem-basierte Suche.

**Nicht gelöst, bewusst außerhalb dieses ADR:** dass ein `node --test`-Lauf über 6500 Tests aus
einem einzelnen, sehr langen `vivodepot.html` heraus zwangsläufig teuer bleibt (~280 Sekunden).
Dieses ADR ändert, WAS gezählt wird, nicht WIE teuer das Zählen ist.

## Konformität

```konformitaet
aussage:  suiteDateien() liefert für einen echten Git-Arbeitsbaum genau die getrackten
          `*.test.{js,cjs,mjs}`-Dateien unter tests/ — committete und gestagte eingeschlossen,
          ungetrackte ausgeschlossen, unabhängig davon, ob eine ungetrackte Datei zusätzlich per
          .gitignore erfasst ist oder nur schlicht nie hinzugefügt wurde.
zustand:  geprüft
herkunft: invariante
pruefung: tests/suite-dateien-kern.test.js#[Suite-Dateien] eine committete .test.js-Datei wird gefunden
pruefung: tests/suite-dateien-kern.test.js#[Suite-Dateien] eine NUR gestagte (nicht committete) .test.js-Datei wird ebenfalls gefunden — `git ls-files` sieht den Index, nicht erst HEAD
pruefung: tests/suite-dateien-kern.test.js#[Suite-Dateien] eine ungetrackte .test.js-Datei bleibt draußen — der Rot-Beweis für U2-ADR-228
```

```konformitaet
aussage:  Eine committete Datei ohne .test.-Suffix (ein Hilfsmodul wie tests/load-kern.js) wird
          nicht mitgezählt; .test.cjs und .test.mjs werden erfasst, eine .test.txt-Datei nicht.
zustand:  geprüft
herkunft: invariante
pruefung: tests/suite-dateien-kern.test.js#[Suite-Dateien] eine committete Datei ohne .test.-Suffix wird NICHT mitgezählt (z. B. Hilfsmodule wie tests/load-kern.js)
pruefung: tests/suite-dateien-kern.test.js#[Suite-Dateien] .test.cjs und .test.mjs werden ebenfalls erfasst, .test.txt nicht
```

```konformitaet
aussage:  Gegen den echten Bestand: alle acht bekannten ARBEITSLISTE-Testdateien bleiben aus der
          Suite-Dateiliste draußen, und die Liste liest wirklich den vollen getrackten Bestand
          (nicht eine leere oder trivial kleine Menge).
zustand:  geprüft
herkunft: invariante
pruefung: tests/suite-dateien-kern.test.js#[Positivkontrolle] gegen den echten Bestand: alle 8 bekannten ARBEITSLISTE-Testdateien bleiben draußen, mindestens 700 echte Testdateien bleiben drin
```

---

*Vivodepot GmbH · Berlin · 03.09.2026*
