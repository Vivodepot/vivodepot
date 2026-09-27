# U2-ADR-225: Feste Temp-Dateinamen ersetzt — Eindeutigkeit schließt den Prozess ein

**Status:** Angenommen
**Datum:** 02./03.09.2026
**Kategorie:** FEHLERBEHEBUNG, WÄCHTER, TEST-INFRASTRUKTUR
**Linie:** U2
**U2-Bezug:** keiner unter dieser Nummer bisher — erster Wächter seiner Art in diesem Repo.
**Anker:** Auftrag, Befund ursprünglich erhoben von einer parallelen Sitzung, geborgen und
nachgemessen in der Nacht zum 03.09.2026 gegen den Kanon-Stand `7172d82`. Beobachtetes Fehlerbild:
`ENOENT: no such file or directory, unlink '…'` in mehreren unabhängigen Läufen — mehrere
Arbeitsbäume greifen nebenläufig auf denselben festen `os.tmpdir()`-Pfad zu und löschen einander die
Datei weg. **Der Fehler schlug während der Umsetzung dieser ADR selbst noch einmal zu:** der erste
Commit-Versuch dieses Auftrags scheiterte an genau diesem `ENOENT`, auf `a253-kern-probe2.html` —
einer der zwölf hier behobenen Stellen.
**Status heute:** gilt — Belege `tests/tmp-eindeutigkeit-waechter.test.js`,
`tools/waechter-register.js#W-tmp-eindeutigkeit`.

---

## Kontext

Zwölf Stellen im Test-/Werkzeug-Bestand bildeten Temp-Dateinamen als **wörtlich feste
Zeichenketten** in `os.tmpdir()`, ohne jede Prozess- oder Zeitkennung — z. B.
`path.join(os.tmpdir(), 'kern-a68-streufehler.html')`. Bei mehreren gleichzeitig laufenden
Arbeitsbäumen (dieses Repo wird routinemäßig in einem Dutzend paralleler Worktrees bearbeitet)
kollidieren zwei unabhängige Testläufe auf demselben Pfad — der zuerst fertige räumt auf, der zweite
trifft ins Leere. 156 Stellen im selben Bestand bildeten ihre Namen bereits korrekt (überwiegend
`fs.mkdtempSync`, seltener ein `process.pid`-Suffix); sieben weitere Stellen tragen nur `Date.now()`
oder `testInfo.workerIndex` — kollisionsanfällig bei echter Prozess-Nebenläufigkeit, aber bewusst
zurückgestellt, nicht Gegenstand dieser Entscheidung.

Kein Mechanismus verhinderte bisher, dass eine neue Stelle denselben Fehler wiederholt.

## Entscheidung

**Elf Fundstellen** (zehn Test-/Werkzeugdateien, eine davon mit zwei Vorkommen) bekamen ein
`fs.mkdtempSync(path.join(os.tmpdir(), '<präfix>-'))` vorangestellt; der bisherige, lesbare
Dateiname wandert unverändert in einen `path.join(...)` innerhalb dieses frischen Verzeichnisses.
Aufräumen geschieht über `fs.rmSync(<verzeichnis>, { recursive: true, force: true })` statt eines
Einzeldatei-`unlink`/`rmSync({force:true})`.

**Ein Sonderfall** (`tests/mit-modul/css-spezifitaet-und-mobile-schrift.test.js:64`): dieselbe
Ersetzung, die bisherige Parametrisierung (`${breite}-${html.length}`) bleibt im Dateinamen
innerhalb des frischen Verzeichnisses erhalten — trägt danach nichts mehr zur Eindeutigkeit bei
(das übernimmt `mkdtempSync`), nur noch zur Lesbarkeit beim Nachsehen in `os.tmpdir()`.

**Ein zweiter Sonderfall** (`tests/load-kern.js:38`, `ABDECKUNG_PFAD`): bekommt stattdessen einen
`process.pid`-Suffix am bestehenden Namen — kein `mkdtempSync`, weil die Konstante prozessweit
wiederverwendet wird (`ladeKern()` kann in einer Testdatei viele Male laufen) und
`tools/abdeckung-auswerten.js` sie über einen Teilstring-Vergleich
(`entry.url.includes('vivodepot-kern-abdeckung')`) wiedererkennt, den ein Suffix nicht bricht.

**Neuer Wächter** (`scripts/tmp-eindeutigkeit-kern.js` + `tests/tmp-eindeutigkeit-waechter.test.js`,
Register-Eintrag `W-tmp-eindeutigkeit`): scannt jede über `git ls-files` verfolgte `.js`/`.mjs`-Datei
auf Zeilen der Form `tmpdir()` gefolgt von einem Anführungszeichen/Backtick ohne eines von
`mkdtempSync`/`process.pid`/`workerIndex`/`Date.now()`/`Math.random()` auf derselben Zeile — mit
einer wörtlich benannten, ortsgebundenen Ausnahme für `tests/hooks-laufen-wirklich.test.js:133`
(reicht den Pfad nur als Argument durch, schreibt nie). Läuft als Teil der regulären Suite
(`pre-commit`); kein `pre-push`-Bereichs-Gate, da die geprüfte Eigenschaft zustandsbezogen ist,
nicht anlassbezogen — anders als der Schalen-Lockstep gibt es hier keine ältere, verwandte Prüfung.

Grundlage ist bewusst `git ls-files`, kein Verzeichnis-Scan: gitignorierte Dateien
(`tests/offen-bei-leser.test.js`, `tests/arbeitsliste-standform.test.js`) erscheinen darin nicht und
brauchen deshalb keine eigene Ausnahmezeile im Wächter-Code.

## Konsequenzen

Nebenläufige Testläufe in verschiedenen Arbeitsbäumen können sich über diese zwölf Stellen nicht
mehr gegenseitig die Temp-Dateien wegräumen. Eine künftig neu geschriebene Stelle, die denselben
Fehler wiederholt, wird vom neuen Wächter erfasst, sofern sie dieselbe
`path.join(os.tmpdir(), '…')`-Form nutzt (die einzige, die im Bestand real vorkommt).

**Ausdrücklich nicht behandelt:** die sieben zurückgestellten Stellen (`Date.now()`/`workerIndex`
ohne Prozesskennung) — bleiben unverändert, der Wächter macht sie nicht rot. Auch nicht behandelt:
das fehlende `try`/`finally` in `tools/schicht2-additiv-oder-stufe-messen.js` (vorbestehend,
unabhängig von diesem Fund).

## Konformität

```konformitaet
aussage:  Keine über git ls-files verfolgte .js/.mjs-Datei bildet einen os.tmpdir()-Pfad aus
          einer festen Zeichenkette ohne mkdtempSync/process.pid/workerIndex/Date.now()/
          Math.random() auf derselben Zeile — außer den wörtlich benannten Ausnahmen.
zustand:  geprüft
pruefung: tests/tmp-eindeutigkeit-waechter.test.js#[Tmp-Eindeutigkeit·Positivkontrolle] feste Zeichenkette in os.tmpdir() wird gefunden
```

```konformitaet
aussage:  Die sieben mit Date.now()/workerIndex gebildeten Stellen und die benannte
          Durchreich-Ausnahme (hooks-laufen-wirklich.test.js:133) lösen den Wächter NICHT aus.
zustand:  geprüft
pruefung: tests/tmp-eindeutigkeit-waechter.test.js#[Tmp-Eindeutigkeit·Negativkontrolle] zurückgestellte Formen und benannte Ausnahme bleiben grün
```

---

*Vivodepot GmbH · Berlin · 02./03.09.2026*
