# U2-ADR-329: Die E2E-Suite kehrt in den pre-push zurück — vier Wochen ohne Netz

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Betrifft:** `hooks/pre-push`, `scripts/pruefe-e2e-bereich.js` (neu),
`tools/last-waehrend-lauf-messen.js` (neu), `tests/e2e-gate-im-pre-push.test.js` (neu)

- **Status heute:** gilt — die E2E-Suite fährt wieder vor jedem Push, der einen Anlass gibt.
  **Kein Produktcode geändert.**

---

## Warum das gebraucht wird

Die E2E-Deckung hing an GitHub Actions. **Die sind seit dem 07.08.2026 aus.**

```
gh run list   letzte Laeufe 07.08.2026, alle failure
              E2E-Cross · OSV-Scan · seitdem nichts
hooks/pre-push   kein e2e, kein playwright
```

**Vier Wochen lang fuhr die E2E-Suite vor keiner einzigen Landung.** Am 06.09. ging der Schnitt
(U2-ADR-320) durch sieben Gates und riss dabei eine E2E-Probe. Gefunden hat es nicht das Netz,
sondern ein freiwilliger Volllauf — und dann dauerte es einen halben Vormittag und drei Sitzungen,
bis geklärt war, ob es ein Kernschaden war (es war ein Probenfehler, U2-ADR-324).

**Ein Gate, das ausfällt, meldet seinen Ausfall nicht.** Das ist die eigentliche Lehre: dass die
Suite nicht mehr lief, stand nirgends — es fiel auf, weil jemand aus einem anderen Grund nachsah.

## Der Anlass wird abgeleitet, nicht gepflegt

Die teuerste Prüfung des Hauses darf nicht bei jedem Dokument-Zug mitfahren. Die Anlass-Prüfung
folgt darum dem `schalen-lockstep`-Muster — **und nimmt ihre Trägerdateien aus derselben einzigen
Quelle**, `scripts/ausgeliefertes-dateiset.js`:

```
Traegerdatei geaendert        -> faehrt     (DATEISATZ, vier Dateien)
tests/e2e/ geaendert          -> faehrt
neuer Zweig / kein Bereich    -> faehrt
sonst (docs, tools, tests)    -> faehrt nicht
```

**Eine zweite Liste hier wäre eine zweite Landkarte** — sie kennte die Träger von heute und keinen,
der morgen dazukommt. Dieselbe Entscheidung wie in U2-ADR-322.

**`tests/e2e/` ist eine Erweiterung gegenüber „nur Trägerdateien", und sie ist begründet:** wer eine
Probe ändert, muss sie fahren. Sonst landet eine kaputte Probe und meldet sich erst beim nächsten
fremden Zug — genau die Verzögerung, die diesen ADR nötig gemacht hat. Sie kostet nur dort, wo
ohnehin an E2E gearbeitet wird.

## Kein stilles Überspringen — an zwei Stellen

**Fehlt Playwright oder sein Browser, ist der Befund UNGEMESSEN, und ungemessen ist nicht grün**
(U2-ADR-106). Vor einem Push ist die Frage beantwortbar; wer sie nicht beantworten kann, hat nichts
belegt.

**Dasselbe gilt für die Last.** In der Nacht zum 06.09.2026 löste der Rechner unter gleichzeitigen
Testsuiten eine Kernel-Panik aus (`watchdogd` 91 Sekunden ohne Rechenzeit, Spitze davor 66,7); die
dokumentierte Abbruchgrenze liegt seither bei 25.

Gemessen mit `tools/last-waehrend-lauf-messen.js` — **im Repo, damit die Zahl wiederholbar ist statt
zitierbar:**

```
npm run test:e2e   15 Kerne
  Dauer      103 s
  Startlast   3,97      Grundrauschen der anderen Sitzungen
  Spitze      8,76
  Mittel      6,12
```

**Der Beitrag des Laufs allein ist rund 4,8** — Spitze minus die Last, die schon da war. „8,76"
allein wäre irreführend, weil es fremde Sitzungen mitzählte.

**Ein Messvorbehalt, der die Zahl nach OBEN korrigiert:** `loadavg` ist ein gleitendes
Ein-Minuten-Mittel. Bei einem 103-Sekunden-Lauf ist es am Ende **noch am Steigen** — Endwert und
Spitze sind derselbe Wert. **Die echte Momentanlast lag höher.** Wie viel, sagt diese Methode nicht;
wer es genauer braucht, misst Prozesse statt Systemlast. Hier steht die Richtung, nicht eine
erfundene Genauigkeit.

**Die Schranke liegt bei 15**, nicht höher: sie lässt zwei gleichzeitige Läufe zu (3,97 + 2 × 4,8 =
13,6) und fängt den dritten ab, der rechnerisch bei 18,4 läge — real höher, siehe Vorbehalt. **Eine
Zahl, die nachweislich zu niedrig ist, darf keine großzügige Schwelle begründen.**

**Gemessen wird zweimal, mit Abstand, und abgebrochen nur, wenn beide Messungen darüber liegen.**
Eine einzelne Spitze — ein Erzeuger, der gerade fertig wird — ist kein Zustand, und eine Schranke,
die an einem Zucken auslöst, wird umgangen statt beachtet.

**Die Abbruchmeldung sagt drei Dinge:** was gemessen wurde und wogegen; dass der Befund UNGEMESSEN
ist und kein Fehler im Zug; und was zu tun ist. Eine Schranke ohne den dritten Punkt ist eine Wand.

## Der rote Beweis am Gate selbst — vorgeführt, nicht behauptet

Eine echte Regression an einer Trägerdatei (`data-wizard-start` umbenannt, im Arbeitsbaum,
nie committet), der Anlass über zwei echte Commits ausgelöst:

```
[e2e-bereich] Anlass: Traegerdatei geaendert: vivodepot.html
280 passed (2.4m)         zehn Fehlschlaege
[e2e-bereich] ABBRUCH: die E2E-Suite ist rot.
GATE-EXIT=1
```

**Der erste Messversuch war wertlos, und das gehört hierher:** `… | tail -12; echo "EXIT=$?"` maß
den Exit-Code von `tail`, nicht den des Gates — er meldete 0, während das Gate 1 lieferte.
**Dieselbe Klasse wie ein Anker, der ins Leere zeigt: ein Fehlschlag, der in ein Ergebnis verwandelt
wird.** Der zweite Lauf schrieb den Code in eine Datei statt durch eine Pipe.

Die Trägerdatei wurde danach `git checkout`-wiederhergestellt und **bitgleich gegen eine Kopie
geprüft**, die vor dem Eingriff gezogen wurde.

## Was die begleitende Probe prüft — und was nicht

`tests/e2e-gate-im-pre-push.test.js` prüft **nicht** die E2E-Suite (die fährt der Hook), sondern die
Entscheidungen davor, an denen ein Gate still werden kann:

- **Die Ausbeute zuerst:** zeigt `DATEISATZ` auf Dateien, die es gibt? Ein Anlass-Prüfer, dessen
  Träger-Liste ins Leere zeigt, meldete für jeden Zug „kein Anlass" — und wäre still grün.
- Der Anlass in allen vier Fällen.
- Dass die Last mehrfach gemessen wird und die Schranke Abstand zur Abbruchgrenze hält.
- **Dass der Hook-Aufruf in keiner Pipe hängt und keinen `|| true`-Zweig hat** — sonst sähe ein
  rotes Gate grün aus.
- Dass beide UNGEMESSEN-Ausstiege mit `return 1` enden, nicht mit `return 0`.

Die letzte Probe zählt dabei nur `console.error`-Zeilen, **nicht das Wort im Kopfkommentar** — ein
erster Entwurf tat das und prüfte damit die Prosa statt den Code.

## Folgen

- Ein Zug an einer Trägerdatei kann nicht mehr landen, ohne dass die E2E-Suite gefahren ist.
- Ein Zug an Dokumenten, Werkzeugen oder Node-Proben kostet nichts zusätzlich.
- Der Hook wird spürbar langsamer, wenn der Anlass gegeben ist: **rund 100 Sekunden.** Das ist der
  Preis, und er ist bekannt, statt bei der ersten Landung zu überraschen.
- **Nicht gelöst:** dass GitHub Actions aus sind. Dieses Gate ersetzt die Cross-Plattform-Läufe
  nicht — es deckt eine Maschine, nicht drei. Das bleibt offen und wird hier nicht behauptet.
