# U2-ADR-280: Kein Prüfer stellte fest, ob eine ausgelieferte Datei überhaupt Code ist

**Status:** Akzeptiert
**Datum:** 05.09.2026
**Kategorie:** WERKZEUG, PRÜFSTAND, AUSLIEFERUNG
**Drei-Anker:**
- **Code-Stelle:** `tools/dateisatz-parst-pruefen.js` (neu), `tests/dateisatz-parst.test.js` (neu);
  Quelle des Satzes bleibt `scripts/ausgeliefertes-dateiset.js` (U2-ADR-215).
- **ADR-Bezug:** U2-ADR-215 (eine Quelle für „was wird ausgeliefert"), U2-ADR-273 (dieselbe
  Familie: ein Prüfer, dessen Reichweite nicht die des Gegenstands ist).
- **Status heute:** gilt — Beleg `tests/dateisatz-parst.test.js`, fünf Proben, darunter ein
  Rot-Beweis **am historischen Schaden**: mit dem Zustand vom 05.09.2026 wird genau eine Probe rot.

---

## Der Befund

In der Nacht zum 05.09.2026 geriet beim Rebase einer Landung eine erklärende Notiz unmittelbar
vor die `CACHE`-Zeile in `sw.js` — **ohne die beiden Schrägstriche davor.**

```
// … kein disjunkter Bump seither: v544+1=v545.
REBASE auf 1f06067b (05.09.2026): gemeinsamer Vorfahr …      <- KEIN Kommentar
const CACHE = 'vivodepot-shell-v548';
```

**Damit war die ausgelieferte Schale kein gültiges JavaScript mehr.** Ein Service Worker, der nicht
parst, registriert sich nicht; **die Offline-Fähigkeit ist das erste Versprechen des Produkts und
hängt an ihm.**

### Sie stand eine Stunde so im Kanon

In dieser Stunde haben **drei Sitzungen darauf rebast**, und der vollständige `pre-push`-Durchlauf
einer vierten lief darüber hinweg:

```
ℹ tests 51   pass 51   fail 0
✔ [S10-SW-Gate] die Service-Worker-Registrierung schließt file:// im eigenen Code aus
✔ Offline-Garantie V1 — 0 externe Requests (Playwright)
[pre-push] OK — vollständige Gates grün.
```

**Auch `[S10-SW-Gate]` — die Probe, die wörtlich die Service-Worker-Registrierung prüft.** Sie
liest die Datei als Zeichenkette und sucht ein Muster. **Sie parst sie nicht.**

### Warum das passieren musste, gemessen

```
elf Testdateien lesen sw.js
null wenden `vm.Script` oder `node --check` darauf an
```

**Kein Gate der Kette — nicht `pre-commit`, nicht `pre-push`, nicht die Konformitäts-Proben —
stellte fest, ob eine ausgelieferte Trägerdatei überhaupt JavaScript ist.**

`vivodepot.html` hatte diesen Schutz längst: `tests/load-kern.js` (`ladeKern`) **führt** den Kern in
einer vm aus. **`sw.js` hatte ihn nicht** — und `sw.js` ist die Datei, die niemand ausführt außer
dem Browser der Bürgerin, offline, wenn es darauf ankommt.

### Gefunden hat es kein Wächter

**Sondern der nächste Commit-Versuch, der zufällig darauf aufsetzte.** Vier Proben zum Service
Worker wurden rot, alle mit demselben `SyntaxError: Unexpected identifier 'auf'`.

**Hätte in dieser Nacht niemand mehr gebaut, wäre der Defekt bis zum Morgen unentdeckt geblieben** —
und dann bei der ersten Sitzung aufgeschlagen, die darauf rebast, mit vier roten Proben, die nach
ihrem eigenen Fehler aussehen. **Ein Defekt, der als fremde Schuld ankommt, kostet erst Stunden
Suche und dann Vertrauen ins eigene Messen.**

---

## Die Entscheidung

**Ein Prüfer, der PARST statt zu suchen.** `tools/dateisatz-parst-pruefen.js` geht den
`DATEISATZ` aus `scripts/ausgeliefertes-dateiset.js` durch und wendet auf jede Datei einen echten
Parser an:

```
sw.js                  vm.Script    geparst
manifest.webmanifest   JSON.parse   geparst
```

**Ein Textmuster kann nicht feststellen, ob eine Datei Code ist. Nur ein Parser kann das.**

### Wo seine Deckung endet — im Werkzeugkopf, nicht in einer Fußnote

Die beiden HTML-Träger prüft er **nicht**, und das ist Absicht:

```
vivodepot.html         tests/load-kern.js  (ladeKern)                   fuehrt AUS
vivodepot-lesen.html   tests/load-lesen.js (vm.runInContext, Z. 199-202) fuehrt AUS
```

**Ausführen ist die stärkere Deckung als Parsen.** Beide Fundstellen wurden für diesen ADR
**gemessen**, nicht angenommen — und eine eigene Probe prüft, daß die Deckungsbehauptung eine
Fundstelle **nennt.** Ohne diese Probe würde aus der heutigen Messung morgen wieder eine Annahme.

**Ein eigener HTML-Parser gehört ausdrücklich nicht hierher.** Er wäre genau die Fehlerklasse,
gegen die dieser Prüfer gebaut ist: ein selbstgebautes Werkzeug, das etwas anderes misst als sein
Name verspricht.

### Die Ratsche

**Eine Endung, die der Prüfer nicht behandelt, gilt als BEFUND — nicht als geprüft.** Wächst der
`DATEISATZ` um eine fünfte Datei, wird sie nicht schweigend übersprungen. Ohne diese Eigenschaft
hätte der Prüfer **dieselbe Lücke eine Ebene tiefer**: er behauptete, den Satz zu decken, und
deckte drei von vier.

### Der Rot-Beweis wird am historischen Schaden geführt

Nicht an einem erfundenen Verstoß, sondern am **echten Zustand dieser Nacht** — Kommentarzeichen
wieder entfernt:

```
Schale kaputt    Waechter exit 1   4 gruen, 1 rot
                 ✖ [Dateisatz] jede ausgelieferte Datei ist gültig
                     sw.js — Unexpected identifier 'auf'
Schale geheilt   Waechter exit 0   5 gruen
```

**Genau eine Probe wird rot, und es ist die richtige.** Damit ist belegt, daß dieser Wächter den
Fall gefangen hätte, der tatsächlich durchkam.

---

## Was beim Bauen schiefging — und warum es hier steht

**Der Wächter enthielt zuerst genau den Fehler, gegen den er gebaut ist.**

Die Positivkontrolle prüfte `geparst + anderswo === DATEISATZ.length`. **Eine kaputte Datei zählt
nicht als geparst** — also wurde beim Rot-Beweis auch sie rot, obwohl sich an der Deckung nichts
geändert hatte.

> **Sie hieß „Positivkontrolle" und feuerte auf Kaputtheit statt auf eine Deckungslücke.**

**Ein Wächter gegen falsche Deckungsbehauptungen, der eine falsche Deckungsbehauptung enthielt.**

**Behoben:** `geparst + kaputt + anderswo === DATEISATZ.length`. Ein kaputter Träger **ist**
zugeordnet, er ist nur rot. Der Grund steht als Kommentar an der Probe, nicht nur im Diff.


### Und die Klasse traf diesen Commit selbst — an einer Stelle, die dieser Wächter nicht deckt

Zwischen dem grünen Commit und dem Push rückte der Kanon weiter. Der Rebase darauf lief **sauber**:

```
git rebase origin/u2-kanon     exit 0, kein Konflikt, kein Marker

danach gemessen:
  faktenbasis --check   ->  EXIT 1   weicht vom Kern ab
  adr-readme            ->  exit 0
  pruefsumme            ->  exit 0
  aussagen              ->  exit 0
```

**Git hatte `docs/faktenbasis.md` automatisch zusammengeführt und dabei einen Stand erzeugt, den
kein Erzeuger je geschrieben hat.** `rebase --continue` fährt kein `pre-commit`; nichts hätte es
gemeldet.

> **Ein Konflikt wäre das kleinere Problem gewesen — er hätte aufgehalten. Der saubere Rebase ist
> das größere, weil er wie ein Erfolg aussieht.**

**Dieser Wächter hätte es nicht gefangen.** Er prüft, ob die ausgelieferten Dateien parsen;
`docs/faktenbasis.md` ist Markdown und gehört nicht zum `DATEISATZ`. **Gefangen hat es die
Gegenprobe des Erzeugers, gefahren aus Gewohnheit, nicht aus Verdacht.**

**Der Handgriff, der daraus folgt und den man sich merkt:**

> **`--amend` fährt das Gate. `rebase --continue` nicht.**

**Damit steht neben dem Wächter, was er nicht kann** — und zwar belegt an dem Vorgang, der ihn
eingebracht hat. Die Nacht hat ihn gebaut und ihm im selben Atemzug gezeigt, wo er nicht hinreicht.
---

## Das Muster dahinter — vier Fälle in einer Nacht

| Prüfer | prüft | prüft nicht |
|---|---|---|
| `[S10-SW-Gate]` und zehn weitere | ein Textmuster in `sw.js` | ob die Datei Code ist |
| Aussagen-Wächter an `STANDARDS.md` | **die eine Zahl**, die er kennt | die drei anderen in derselben erzeugten Region |
| Arbeitszerlegung, Bündel C/D | Grep-Nähe | ob die Funktion die Sache je berührt |
| **dieser Wächter, erste Fassung** | **Kaputtheit** | **die Deckungslücke, die er messen sollte** |

> **Deckung wird von der Reichweite des Prüfers behauptet, nicht von der des Gegenstands.**

**Vier verschiedene Ebenen, dasselbe Muster.** Der vierte Fall ist der lehrreichste: er saß im
Werkzeug, das gegen die anderen drei gebaut wurde.

---

## Was offen bleibt

- **Wie viele weitere Wächter nur kennen, was sie kennen.** Vier Fälle in einer Nacht sind kein
  Zufall und keine Vollzählung. **Eine Erhebung wäre eine eigene Arbeit** — die Entscheidung
  darüber gehört nicht in diesen ADR.
- **Die erzeugte Region in `STANDARDS.md` trägt vier Zahlen; geprüft wird eine.** Aufgefallen
  beim Bump auf v549; nicht behoben, weil eigener Gegenstand.
- **Die Ursache des Schadens ist nicht dieser ADR.** Die Notiz entstand beim Rebase, die Suite lief
  davor, und `rebase --continue` fährt kein `pre-commit`: **was geprüft wurde, war nicht, was
  gelandet ist.** Eigener Posten, eigene Entscheidung.
- **Die Deckung der beiden HTML-Träger hängt an zwei Ladern.** Fällt einer weg oder hört auf,
  wirklich auszuführen, merkt es dieser Prüfer nicht — er prüft nur, daß die Behauptung eine
  Fundstelle nennt, nicht daß die Fundstelle noch tut, was sie verspricht.

---

*Vivodepot GmbH · Berlin · 05.09.2026*
