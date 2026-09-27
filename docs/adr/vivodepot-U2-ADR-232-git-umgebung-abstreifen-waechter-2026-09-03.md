# U2-ADR-232: Jeder git-Unterprozessaufruf gegen ein fremdes Arbeitsverzeichnis streift GIT_* ab

**Status:** Angenommen
**Datum:** 03.09.2026
**Kategorie:** WÄCHTER, TESTINFRASTRUKTUR
**Linie:** U2
**U2-Bezug:** kein Vorgänger — sechs unabhängige, alle korrekte Kopien derselben Absicherung
lagen im Bestand (`scripts/build-datum-kern.js` → `ohneGitUmgebung()`,
`scripts/tmp-eindeutigkeit-kern.js` → `ohneGitUmgebung()`, `tools/testfassung-legen.js` →
`ohneGitEnv()`, sowie anonyme Inline-Fassungen in `tests/ist-eigenes-repo.js`,
`tests/build-datum-lockstep.test.js`, `tests/schalen-lockstep-anlass.test.js`,
`tools/waechter-register.js` ×2, `scripts/schalen-lockstep-kern.js`), aber keine benannte die
Regel selbst. **Verwandtes Muster:** dieselbe Verwandlung „Handdisziplin → mechanische Garantie"
wie U2-ADR-227 (Signierfunktion) und U2-ADR-229 (Dateiprüfsumme).
**Anker:** Auftrag vom 03.09.2026, im Anschluss an zwei Vorfälle desselben Tages —
`scripts/build-datum-kern.js` (dort teilweise behoben) und `tests/suite-dateien-kern.test.js`
(von der bauenden Sitzung selbst gefunden und vor der Landung behoben). Zug-0-Messung: 63
git-Unterprozessaufrufstellen in `tests/`, `tools/`, `scripts/`, davon 10 in einer Risikozone
ohne Absicherung.
**Status heute:** gilt — Beleg `tests/git-umgebung-pflicht.test.js`, `tools/git-umgebung-pruefen.js`.

---

## Warum ein eigenes ADR, nicht nur eine Werkzeug-Änderung

Meine eigene Einschätzung, vor dem Schreiben gebildet: **ja, ein
eigenes ADR.**

Der tragende Grund ist nicht die einzelne ungeschützte Stelle — die ist ein gewöhnlicher Fix.
Der tragende Grund ist der Satz, der sich erst aus dem Zug-0-Befund ergibt: **`scripts/schalen-
lockstep-kern.js`, von `scripts/build-datum-kern.js` abgeleitet, fand genau diesen Fehler heute
schon und behob ihn — direkt im geteilten Helfer, mit einer eigenen Kommentarzeile, die
ausdrücklich sagt, warum (`jeder Aufruf gegen ein fabriziertes Wegwerf-Repo ist betroffen, nicht
nur ein einzelner`). Der Fund wurde gemacht. Er ging trotzdem nicht auf die Ursprungsdatei
zurück, aus der abgeleitet wurde.** Eine Absicherung, die man von Datei zu Datei kopiert, wird
irgendwo vergessen — das ist keine Nachlässigkeit einer Sitzung, das ist Statistik über sechs
Kopien unter drei Namen. Dieselbe Statistik traf am selben Tag bereits `_signJWS` (vier
ungewachte Kopien, U2-ADR-227). Zweimal am selben Tag ist ein Muster, kein Zufall, und ein
Muster gehört als Entscheidung aufgezeichnet, nicht nur als Diff repariert.

Zweitens: die Bedingung selbst ist eine Einbahnstraße im engen Sinn des stehenden Filters
(„bewacht der Prüfer eine Einbahnstraße, oder nur Ordnung?"). Ein `pre-commit`-Lauf, der wegen
dieser Falle im echten Repository statt in seiner Fixture arbeitet, staged echte Dateien im
echten Index — das ist kein Ordnungsmangel, das ist ein Zustand, der nach dem Lauf nicht mehr
kommentarlos rückgängig zu machen ist.

## Kontext

Während eines `pre-commit`-Laufs setzt git seinen Hooks `GIT_DIR`, `GIT_INDEX_FILE` und
`GIT_WORK_TREE` — damit die Hooks selbst dasselbe Repo und denselben Index treffen wie der
Commit, der sie ausgelöst hat. Ruft Test- oder Werkzeugcode `git` als Unterprozess auf und gibt
ihm über `cwd` (oder `-C`) ein ANDERES Verzeichnis — ein Wegwerf-Repo, eine fabrizierte Fixture,
ein fremdes Zielrepo —, gewinnt `GIT_DIR` gegen `cwd`: der Aufruf arbeitet dann im ECHTEN
Repository, nicht in seiner Fixture. Am Terminal fällt das nie auf, dort ist `GIT_DIR` leer —
derselbe Code läuft isoliert grün und im Hook rot oder, schlimmer, unbemerkt falsch.

**Zug-0-Messung (vollständig, `tests/`+`tools/`+`scripts/`, 03.09.2026):** 63 git-
Unterprozessaufrufstellen. 30 sind unabhängig vom `GIT_*`-Zustand sicher (kein `cwd`/`-C`, oder
`cwd` ist das eigene Repo — dieselbe `GIT_DIR` beantwortet dieselbe Frage richtig, ob gesetzt
oder nicht). 23 liegen in der Risikozone (veränderliches `cwd`/`-C`) UND sind bereits
abgesichert — die sechs Kopien oben. **10 lagen in der Risikozone OHNE Absicherung, verteilt auf
vier Dateien:**

1. **`scripts/build-datum-kern.js`, `gitRohInRepo(wo, …)`/`gitInRepo(wo, …)`** — bestätigt
   erreichbar unter Hook-Bedingungen. `tools/waechter-register.js` speist über
   `bereichsBefund(von, bis, wo)` ein fabriziertes Wegwerf-Repo ein (Selbsttest des
   BUILD_DATUM-Wächters, läuft bei jedem `npm test`/`pre-commit`). Nachgestellt (simuliertes
   `GIT_DIR` auf dieses Repo, Fixture-Commits mit eigenen Hashes): vor der Reparatur wirft
   `bereichsBefund` `fatal: Invalid revision range` — `git log` sucht die Fixture-Hashes im
   echten Repo, wo sie nicht existieren. **Mit der Reparatur behoben** (Teil dieses ADR).
2. **`tools/modul-app-packen.js`** — `git add`/`commit`/`push` in einem fremden Zielrepo,
   ausdrücklich „nach dem Muster von `tools/testfassung-legen.js`" gebaut, dessen
   `ohneGitEnv()`-Absicherung hier aber fehlt. Schreibend — das schärfste Risiko der vier. Aktuell
   latent: `tests/modul-app-packen.test.js` prüft laut eigenem Dateikopf bewusst nur die reinen
   Helfer, nicht die schreibenden Funktionen selbst.
3. **`tools/krypto-block-propagation-pruefen.js`, `dateienListen(repo)`** — lesend, über
   `--repo <pfad>` einspeisbar. Fixtures für dieses Werkzeug sind bewusst keine Git-Bäume und
   fallen normal in einen Datei-Walk-Zweig; mit geleaktem `GIT_DIR` würde `rev-parse
   --is-inside-work-tree` aber fälschlich „ja" antworten und den Walk-Zweig umgehen. Nicht voll
   verifiziert, ob ein bestehender Testlauf das exercised.
4. **`tests/gitignoriert-pruefen.js` (`checkIgnoreAufruf`) + die eigene Vorbedingungsprüfung in
   `tests/gitignoriert-pruefen.test.js`** — ein Grenzfall: der einzige Aufrufer, der hier einen
   Nicht-Repo-Pfad übergibt, streift `GIT_DIR`/`GIT_WORK_TREE`/`GIT_INDEX_FILE`/
   `GIT_COMMON_DIR`/`GIT_CEILING_DIRECTORIES` bereits selbst direkt aus `process.env`, bevor er
   ruft (01.09.2026, eigener Auftrag) — eine andere, aber gleichwertige Absicherung, nur
   nicht über eine `env:`-Option am Aufruf selbst.

## Entscheidung

**1 — Die Regel, benannt statt nur gelebt:** Jeder `git`-Unterprozessaufruf in `tests/`,
`tools/`, `scripts/`, dessen Arbeitsverzeichnis (`cwd`/`-C`) NICHT das eigene Repo ist, trägt
eine `env`-Option, die die `GIT_*`-Variablen aus der geerbten Umgebung entfernt.

**2 — `tools/git-umgebung-pruefen.js`**, nach dem Muster von `tools/rot-beweis-pflicht-
pruefen.js`: geprüft wird die ANWESENHEIT der `env`-Option an einer Risikozonen-Aufrufstelle,
nicht ihre Güte — dieselbe Grenzziehung, aus demselben Grund. Sechs verschieden benannte, aber
alle korrekte Fassungen im heutigen Bestand zeigen: die VERGESSENE Absicherung ist der Fall, der
gefangen werden muss, nicht die vorgetäuschte. Erkannt wird eine Aufrufstelle als „Risikozone",
wenn ihr `cwd`/`-C` weder fehlt noch die Konstante `REPO` (oder das gleichwertige, im Bestand
zweithäufigste `path.join(__dirname, '..')`) ist.

**3 — Eine Ratsche, `tools/git-umgebung-grundlinie.json`**, keine Forderung an den Bestand:
Fundstellen 2–4 aus dem Kontext bleiben namentlich in der Grundlinie stehen, mit Grund und
Datum. Sie zu fordern hieße, das Gate am ersten Tag rot zu haben. Die Grundlinie darf nur
SCHRUMPFEN — wer eine Fundstelle behebt oder vereinheitlicht, nimmt sie heraus.

**4 — Fundstelle 1 (`scripts/build-datum-kern.js`) direkt behoben**, ohne Umbau: `gitRohInRepo`
bekommt dieselbe `env: ohneGitUmgebung()`, die die Nachbarfunktion `istFlacherKlon()` in
derselben Datei bereits trägt. Keine bestehende Aufrufstelle ändert sich. Rot-Beweis geführt
gegen den echten Fehler, nicht nur gegen die neue Probe — als DAUERHAFTE Regressionsprobe in
`tests/build-datum-lockstep.test.js` (nicht als einmaliger Handlauf): mit simuliertem `GIT_DIR`
(genau die drei Variablen, die git seinen Hooks setzt) warf `bereichsBefund` vor der Reparatur
`fatal: Invalid revision range` — die Fixture-Commit-Hashes existieren im echten Repo nicht;
danach liefert es den korrekten, fixture-eigenen Befund. Rückprobe geführt: mit der Reparatur
temporär zurückgenommen schlägt genau diese Probe wieder fehl.

**5 — Rot-Beweis für den Wächter selbst**, in der geforderten Form „schlägt an, wenn die
bewachte Bedingung verletzt wird": `tests/git-umgebung-pflicht.test.js` legt eine Fixture-Datei
mit einer verletzenden Aufrufstelle an, zeigt den Fund, entfernt sie wieder — plus Gegenproben
für `env:` explizit, `env` als ES6-Shorthand, `cwd: REPO`, kein `cwd`, kein `git`-Aufruf,
Grundlinien-Bestand und die Ratsche in beide Richtungen.

**6 — Die Duplikation namentlich festgehalten, nicht aufgelöst.** Sechs Kopien unter drei Namen
(`ohneGitUmgebung`, `ohneGitEnv`, drei anonyme Inline-Fassungen) sind der Befund, der ausdrücklich
benannt werden sollte — ob sie auf eine gemeinsame Quelle zusammengeführt werden,
entscheidet dieses ADR NICHT. Unbenannt bliebe der Zustand unsichtbar, und der siebte Vergesser
wäre nur eine Frage der Zeit.

## Ausdrücklich nicht behandelt

**Fundstellen 2–4 werden gemeldet, nicht mitrepariert.** Unverwandter Beifang in einem
Wächter-Commit ist später nicht mehr erklärbar (Vorgabe). Sie stehen einzeln begründet in
der Grundlinie und im Kontext-Abschnitt oben.

**Keine Vereinheitlichung der sechs Absicherungs-Kopien auf eine gemeinsame Quelle.** Siehe
Entscheidung 6 — benannt, nicht entschieden.

**Keine Prüfung, OB eine `env`-Option tatsächlich `GIT_*` abstreift**, nur ob sie existiert.
Dieselbe Grenze wie bei `tools/rot-beweis-pflicht-pruefen.js` — die Güte einer Absicherung zu
prüfen bräuchte, sie selbst gegen ein präpariertes `GIT_DIR` laufen zu lassen, ein anderer,
größerer Wächter als dieser.

## Konsequenzen

Eine neue Risikozonen-Aufrufstelle ohne `env`-Option macht die Suite ab sofort rot, statt am
Terminal grün und im Hook still falsch zu bleiben. Die vier heute bekannten Fundstellen sind
benannt, eingegrenzt nach Reichweite und in einer schrumpfenden Grundlinie geführt — keine
verschwindet stillschweigend im Rauschen der 1195 gescannten Dateien. `scripts/build-datum-
kern.js`s Selbsttest über `tools/waechter-register.js` liefert jetzt unter Hook-Bedingungen
denselben Befund wie am Terminal.

## Konformität

```konformitaet
aussage:  Jede git-Unterprozessaufrufstelle in tests/, tools/, scripts/ mit veränderlichem
          cwd/-C trägt eine env-Option, die GIT_* abstreift — mit Ausnahme der vier namentlich
          in tools/git-umgebung-grundlinie.json geführten und einzeln begründeten Fundstellen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/git-umgebung-pflicht.test.js#[U2-ADR-232] der echte Bestand ist gruen — jede Risiko-Aufrufstelle ausserhalb der Grundlinie streift GIT_* ab
```

```konformitaet
aussage:  Eine neue Datei mit einer ungeschützten Risikozonen-Aufrufstelle lässt den Wächter rot
          werden — Rotmachbarkeit belegt, nicht nur behauptet, über eine selbst angelegte und
          wieder entfernte Fixture.
zustand:  geprüft
herkunft: invariante
pruefung: tests/git-umgebung-pflicht.test.js#[U2-ADR-232·Rot-Beweis] ein git-Aufruf mit veraenderlichem cwd und OHNE env-Option wird gefunden
```

```konformitaet
aussage:  scripts/build-datum-kern.js#bereichsBefund liefert unter simuliertem pre-commit-
          GIT_DIR denselben korrekten Befund wie am Terminal — vor der Reparatur warf derselbe
          Aufruf `fatal: Invalid revision range`.
zustand:  geprüft
herkunft: fund
pruefung: tests/build-datum-lockstep.test.js#[Lockstep·U2-ADR-232] bereichsBefund(wo) bleibt unter simuliertem GIT_DIR bei der Fixture, nicht beim echten Repo
```

---

*Vivodepot GmbH · Berlin · 03.09.2026*
