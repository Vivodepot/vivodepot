# U2-ADR-316: Ein Werkzeug für die Standzahl — es verkleinert das Fenster, es schließt es nicht

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Betrifft:** `tools/standzahl-frei-pruefen.js`, `tools/standzahl-frei-fixture.json`,
`tests/standzahl-frei-pruefen.test.js`

- **Status heute:** gilt — das Werkzeug läuft gegen `origin` in rund drei Sekunden und ohne Netz
  gegen eine Fixture im Repo. **Es ist eine Anzeige, kein Gate**, und sein Kopf sagt selbst,
  was es nicht kann.

---

## Der Anlass: drei Kollisionen in einer Nacht, jedes Mal nach korrektem Nachschlagen

In der Nacht auf den 06.09.2026 kollidierten drei Zweige auf derselben `SCHALEN_STAND`-Zahl.
**Jedes Mal war der Kanon vorher nachgeschlagen worden, und jedes Mal richtig.**

```
Zahl aus dem Kanon lesen      ✓
… Gate-Lauf, ~5 Minuten …     ← hier nimmt jemand anders dieselbe Zahl
Commit + Push                 beide grün, beide gepusht
```

**Git fängt das nicht.** Ein Push wird als non-fast-forward nur auf **demselben** Zweig
abgewiesen; wir pushen auf verschiedene. Zwei Zweige können dieselbe Zahl tragen, beide Gates
sind grün, es gibt nichts zu serialisieren. **„Schneller pushen" ist darum keine Lösung** — der
Vorschlag stand im Raum und wäre beim vierten Mal wieder danebengegangen.

**Die gefährliche Zahl liegt auf einem Zweig, der schon gepusht, aber noch nicht gelandet ist.**
Genau diese Zwischenlage sieht der Kanon nicht.

## Warum ein Werkzeug und kein Schnipsel

Die Prüfzeile existierte bereits — in einer Nachricht zwischen Sitzungen. **Ein Schnipsel dort ist noch
schlechter als ein Werkzeug außerhalb des Repos: beim nächsten Fenster ist er fort.**

Die stehende Regel des Hauses sagt es: ein Prüfwerkzeug entsteht **im Repo**, versioniert, mit
dem Gegenstand als Argument, und läuft ohne Argument gegen Fixtures — sonst hat es keine Suite,
keine Positivkontrolle, keinen Wächter und keine Historie.

```
node tools/standzahl-frei-pruefen.js              Anzeige, Exit immer 0
node tools/standzahl-frei-pruefen.js --zahl 581   Exit 0 = frei, 1 = belegt
node tools/standzahl-frei-pruefen.js --fixture    ohne Netz, ohne origin
```

## Was es NICHT kann — und das steht in seinem Kopf, nicht im Nachwort

> **Es schließt das Fenster nicht. Zwischen seinem Lauf und dem Push liegt weiter das Gate. Es
> macht die Kollision seltener, nicht unmöglich.**

**Ein Werkzeug, das mehr verspricht, als es hält, ist selbst eine Deckungs-Suggestion** — dieselbe
Klasse, gegen die die Regel geschrieben wurde, nur eine Ebene höher.

**Der einzige echte Serialisierungspunkt ist die Landung.** Wer beim Vorspulen zweiter ist, sieht
die Zahl im Kanon und zieht neu. Entschieden: **eine Kollision ist kein Fehler, sondern der Preis
dafür, dass jeder Zweig trägt, was er behauptet.** Die Alternative — die Zahl wird beim Landen
nachträglich gesetzt — wurde verworfen: dann liefe die Suite gegen einen anderen Stand als den
gelandeten.

## Die zweite Prüfung: stimmen die vier Träger untereinander?

```
sw.js · vivodepot.html · STANDARDS.md · docs/faktenbasis.md
```

**Zweimal in derselben Nacht hingen `STANDARDS.md` und `docs/faktenbasis.md` eine Zahl zurück**,
weil die Erzeuger vor dem Bump liefen. **Der `schalen-lockstep` fängt das nicht** — er kennt die
vier Dateien des ausgelieferten Dateisatzes, und `STANDARDS.md` gehört nicht dazu. Für diesen
Fehler gab es bisher keinen Wächter.

**Als Anzeige, nicht als Gate:** damit es jemand sieht, **bevor** er den fünf Minuten langen
Gate-Lauf startet.

**Bei uneinigen Trägern gilt die höchste Zahl als beansprucht.** Wer nach unten rundete, hielte
eine belegte Zahl für frei — und liefe in genau die Kollision, die das Werkzeug verhindern soll.

## Was gemessen ist

```
Fixture · belegte Zahl           v581 belegt, nächste freie v582
Fixture · Altzweig unter Kanon   zählt NICHT als belegt (sonst Dutzende Fehlmeldungen)
Fixture · uneinige Träger        benannt, höchste Zahl gilt als beansprucht
--zahl                           frei / belegt / im-kanon unterschieden
Rot-Beweis                       zwei Zweige auf derselben Zahl — BEIDE genannt
Positivkontrolle                 ohne Anspruch ist die nächste schlicht Kanon+1
Muster                           die vier Träger-Muster treffen den echten Bestand
Ausführbar                       `--fixture` wirklich gestartet, Exit 0 und Exit 1 geprüft
```

**Die Positivkontrolle ist nicht Zierat:** ohne sie wären die Proben auch dann grün, wenn die
Auswertung *immer* „belegt" meldete — dann prüften sie nichts als ihre eigene Strenge.

**Die Muster-Probe fängt eine leise Klasse:** ändert jemand die Schreibweise einer Zahl, fände das
Werkzeug still nichts und meldete „frei". Ein Wächter, der nichts findet, weil er an die falsche
Stelle sieht, ist schlimmer als keiner.

## Was ausdrücklich NICHT dazugehört

**Ein Gate.** Das Werkzeug wird nicht in `pre-commit` oder `pre-push` gehängt. Es prüft einen
Zustand, der sich zwischen Prüfung und Landung ändern darf — ein Gate daraus würde Läufe abbrechen,
die legitim sind, und die eigentliche Serialisierung an der Landung nicht ersetzen.

**Die Git-Seite ist nicht durch Proben gedeckt.** Geprüft ist die reine Auswertung
(`auswerten(kanon, zweige, wunsch)`), die kein Repo kennt. Das Lesen der Zweige über `git show`
ist am echten Bestand ausgeführt, aber nicht in einer Probe eingefroren — ein Testaufbau mit
mehreren entfernten Zweigen wäre teurer als der Nutzen, und der Fehlerfall (Datei fehlt auf einem
Zweig) ist im Werkzeug abgefangen und gemessen.
