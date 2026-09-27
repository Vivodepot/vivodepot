# U2-ADR-315: `hooks/pre-push` prüft Stand-Zahlen und Faktenbasis eigenständig, nicht nur über pre-commit

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Kategorie:** WERKZEUG, PRÜFSTAND
**Drei-Anker:**
- **Code-Stelle:** `hooks/pre-push` (neuer Block zwischen SCHALEN_STAND-Bereichsprüfung und
  Kampagne-Gate); geprüft `npm run standzahlen:check` (`tools/build-standzahlen.js --check`) und
  `node tools/faktenbasis-erzeugen.js --check`.
- **ADR-Bezug:** U2-ADR-273 (`hooks/pre-push` beendet die Prozessgruppe, nicht nur den
  Wartenden — dieselbe Erkenntnisklasse: ein Gate, das etwas meldet, aber nicht selbst
  durchsetzt, schützt nicht); A377/U2-ADR-099 (Stand-Zahlen und Faktenbasis als erzeugte,
  nicht handgepflegte Dokumente).
- **Status heute:** gilt — Beleg `tests/pre-push-standzahlen-faktenbasis-check.test.js`, fünf
  Proben, darunter zwei Rot-Beweise gegen eine truncierte, wortgleiche Kopie des echten Hooks.

---

## Der Befund

`hooks/pre-commit` prüft `standzahlen:check` bereits direkt (Zeile „Stand-Zahlen in
Aussen-Dokumenten"), und `faktenbasis --check` indirekt über `npm test`
(`tests/faktenbasis-aktualitaet.test.js` läuft als Teil der Suite, die pre-commit fährt).

`hooks/pre-push` fährt **kein** `npm test` — das war nie sein Zweck, er trägt die teuren
Netz-/Browser-Gates (Kampagne, Konformität, OSV), die pre-commit bewusst nicht trägt. Er rief
bis zu diesem Commit aber auch **keine** der beiden obigen Prüfungen eigenständig auf. Damit
verließ sich der Push-Zeitpunkt vollständig darauf, dass **jeder** Commit im zu pushenden
Bereich unter einem intakten pre-commit entstand.

Das ist keine Ersatzgarantie, aus drei konkreten, im Bestand bereits belegten Gründen:

1. `core.hooksPath` ist worktree-lokal und kann für einen einzelnen Commit falsch stehen —
   genau der Fund aus `tests/hooks-laufen-wirklich.test.js` (U2-ADR-273, Nachtrag): ein frisch
   angelegter Arbeitsbaum trägt zunächst den `hooksPath` eines fremden Baums, ein Commit darin
   liefe ohne den eigenen pre-commit.
2. Ein Commit kann mit `--no-verify` entstanden sein.
3. Ein Commit kann aus einer Umgebung stammen, die pre-commit gar nicht kennt (z. B. ein
   direkter `git commit-tree`, ein Cherry-Pick aus einem Baum ohne gesetzten `hooksPath`).

In keinem der drei Fälle merkt der PUSH etwas — er ist die letzte Stelle vor der Auslieferung,
und dort reicht „ist vermutlich vorher gelaufen" nicht.

## Die Entscheidung

**Beide Prüfungen laufen in `hooks/pre-push` jetzt eigenständig**, unmittelbar nach der
SCHALEN_STAND-Bereichsprüfung und vor dem Kampagne-Gate:

```sh
echo "[pre-push] Stand-Zahlen in Aussen-Dokumenten (unabhängig von pre-commit) …"
if ! npm run --silent standzahlen:check; then
  echo "[pre-push] ABBRUCH: eine erzeugte Stand-Zahl weicht vom Kern ab." >&2
  echo "              Beheben mit: npm run standzahlen:build" >&2
  exit 1
fi

echo "[pre-push] Faktenbasis gegen den lebenden Kern (unabhängig von pre-commit) …"
if ! node tools/faktenbasis-erzeugen.js --check; then
  echo "[pre-push] ABBRUCH: docs/faktenbasis.md weicht vom Kern ab." >&2
  echo "              Beheben mit: node tools/faktenbasis-erzeugen.js" >&2
  exit 1
fi
```

**Platzierung vor den teuren Gates, nicht danach.** Beide Aufrufe sind schnell und brauchen kein
Netz (gemessen: `standzahlen:check` rund 3 s, `faktenbasis --check` unter 1 s) — ein Push, der an
einer Stand-Zahl scheitert, soll nicht erst 15–20 Sekunden Kampagne und Konformität abwarten,
um dann doch abzubrechen.

**Redundanz ist hier ausdrücklich gewollt, keine Verdopplung ohne Grund.** Beide Prüfungen
bleiben AUCH in pre-commit — dort greifen sie früher (beim Commit, nicht erst beim Push) und
mit besserer Fehlerzuordnung (welcher Commit hat gedriftet). pre-push prüft dieselbe Sache am
GESAMTEN zu pushenden Bereich, unabhängig davon, ob pre-commit für jeden einzelnen Commit darin
tatsächlich lief — dieselbe Beweislast-Logik wie bei den bereits bestehenden BUILD_DATUM- und
SCHALEN_STAND-Bereichsprüfungen im selben Hook.

**Keine Zeitgrenze (`tools/mit-zeitgrenze.pl`).** Anders als die Kampagne- und
Konformitäts-Gates (U2-ADR-273) sind beide Aufrufe reine, synchrone Node-Prozesse ohne
Netzzugriff oder Kindprozess-Fächerung — kein Hängen zu erwarten, das eine eigene Wecker-Logik
rechtfertigen würde.

## Der Rot-Beweis

`tests/pre-push-standzahlen-faktenbasis-check.test.js` prüft **die Verdrahtung im Hook**, nicht
erneut, ob `standzahlen:check`/`faktenbasis --check` Drift erkennen — das ist bereits belegt
(`tests/faktenbasis-aktualitaet.test.js`, die Positivkontrolle von `build-standzahlen.js`). Fünf
Proben gegen eine truncierte, wortgleiche Kopie des echten Hook-Textes (nur bis zum
faktenbasis-Gate — die Netz-/Browser-Gates danach werden nicht gebraucht):

1. **Anker-Probe** — der Hook enthält beide Aufrufe wirklich (nicht im Test nacherzählt).
2. **Positivkontrolle** — der echte Ausschnitt läuft gegen den sauberen Bestand grün durch.
3. **Rot-Beweis** — `standzahlen:check` durch einen kontrollierten Fehlschlag ersetzt: der Hook
   bricht mit der erwarteten Meldung ab und erreicht das Ende NICHT.
4. **Rot-Beweis** — dasselbe für `faktenbasis --check`.
5. **Gegenkontrolle** — ein Hook-Text ohne die beiden Zeilen (der Stand vor diesem Commit)
   besteht die Anker-Probe nicht — sie prüft wirklich etwas.

Der Rot-Beweis ersetzt den echten Aufruf durch `sh -c 'exit 1'` statt eine echte Datei zu
verfälschen: `docs/faktenbasis.md` wird von mehreren Testdateien im selben Suite-Lauf parallel
gelesen (`node --test` startet Dateien parallel), eine testweise Mutation der echten Datei liefe
in denselben Schreib-Wettlauf, den `tests/faktenbasis-aktualitaet.test.js` bereits als Grund für
sein eigenes `--ausgabe`-Muster nennt.

## Was ausdrücklich nicht hierher gehört

`tools/build-standzahlen.js --check` selbst trägt bislang keinen eigenen, isolierten
Kindprozess-Rot-Beweis (anders als `faktenbasis-erzeugen.js`, das
`tests/faktenbasis-aktualitaet.test.js` hat) — dieser ADR baut die **Verdrahtung** im Hook, nicht
den fehlenden Rot-Beweis des Werkzeugs selbst. Das ist ein eigener, kleinerer Posten.

*Vivodepot GmbH · Berlin · 06.09.2026*
