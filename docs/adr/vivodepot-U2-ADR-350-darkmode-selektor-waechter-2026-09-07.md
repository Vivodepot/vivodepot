# U2-ADR-350 — Der Nachtmodus-Selektor-Wächter: Struktur statt Handarbeit

**Datum:** 07.09.2026
**Status heute:** gilt

## 1 · Der Befund

Die Nachtmodus-Übersteuerung im Kern (`html.dark-mode ...`) ist eine handgepflegte
Selektorliste: jede Basisregel, die `color: var(--salbei-dunkel)` setzt, braucht eine
passende `html.dark-mode`-Zeile, sonst bleibt der Text im Nachtmodus auf der eigenen,
unveränderten Fläche (`--salbei-dunkel` kippt nachts selbst nicht — es trägt die
Doppelrolle Fläche+Text, s. Kommentar an der Nachtliste) und der Kontrast fällt auf
~2,16–2,71:1, deutlich unter AA (4,5:1).

Diese Liste wurde bereits zweimal von Hand nachgezogen: am 28.07.2026 (drei übersehene
Stellen, gefunden über einen erweiterten Mess-Geltungsbereich, nicht über Aufmerksamkeit)
und ein zweites Mal beim Umbau eines Selektors (07.09.2026) — derselbe Handgriff,
kein Wächter dahinter.

## 2 · Gemessen, nicht geschätzt — vier Lücken, nicht eine

Ein CSS-bewusster Scan (`tools/lib/darkmode-selektor-messen.js`, keine Regex-Grobheit über
Zeilen) fand am 07.09.2026 gegen den Kanon-Stand **31 Basisregeln** mit
`color: var(--salbei-dunkel)` und **35 bereits abgedeckte Selektoren** in der Nachtliste —
**vier Lücken**, nicht die eine, die den Anlass gab:

| Selektor | Fläche im Nachtmodus | Kontrast | Befund |
|---|---|---|---|
| `.vorschau-banner .btn` | `--salbei-light` (nachts dunkel, #252f1d) | **2,16:1** | echter Fehler |
| `.feld-autosave-ok` | `--papier-bereich`/`--cream` (#161b16) | **2,71:1** | echter Fehler |
| `.refm-vorschlaege li:hover` | `--salbei-light` (#252f1d) | **2,16:1** | echter Fehler |
| `.a11y-btn[aria-pressed="true"]` | `--auf-akzent` (eigene, helle Fläche #e9ede7) | **5,45:1** | **kein** Fehler |

Alle vier Zahlen echt gerechnet (WCAG-Formel, relative Luminanz, `--salbei-dunkel` #4F6539
gegen die jeweilige Nachtmodus-Fläche) — keine geschätzt.

## 3 · Drei echte Fehler, im selben Zug behoben

`.vorschau-banner .btn`, `.feld-autosave-ok` und `.refm-vorschlaege li:hover` bekommen je
eine `html.dark-mode`-Zeile mit `color: var(--salbei-nacht)` (#8eab77 — dieselbe Aufhellung,
die die zwölf bzw. drei Geschwisterfälle direkt daneben schon tragen, kein neuer Ton). Nach
dem Fix: 38 abgedeckte Selektoren, **eine** verbleibende Lücke.

`.refm-vorschlaege li:hover` ist derselbe Geschwisterfall wie `li.refm-aktiv` (dieselbe
Fläche, derselbe Text, direkt in derselben Regel-Gruppe) — die aktive Zeile war schon
korrigiert, die Hover-Zeile blieb es nicht, obwohl sie dieselbe Fläche trägt. Genau die
Sorte Lücke, die eine Zeilen-für-Zeilen-Suche übersieht und eine Struktur-Probe nicht.

## 4 · Die vierte ist keine — eigene Fläche, eigener Kontrast

`.a11y-btn[aria-pressed="true"]` setzt `background: var(--auf-akzent)` **in derselben
Regel** — es sitzt nicht auf der Seiten- oder Akzentfläche wie die anderen, sondern bringt
seinen eigenen, hellen Hintergrund mit (`--auf-akzent` ist im Nachtmodus #e9ede7, hell).
`--salbei-dunkel` (#4F6539) auf #e9ede7 ergibt 5,45:1 — besteht AA. Kein Nachzieh-Fall,
sondern eine Regel, die die übliche Annahme („Fläche bleibt die Seiten-/Akzentfläche") nicht
erfüllt. Als benannte Ausnahme im Wächter geführt (`tests/darkmode-selektor-waechter.test.js`),
mit der gemessenen Zahl im Grund — keine stille Auslassung.

## 5 · Der Wächter: Struktur, nicht Zeilenzahl

`tools/lib/darkmode-selektor-messen.js` liest den `<style>`-Block des Kerns über einen
klammertiefe-bewussten Scan (kein Regex, das an verschachtelten `@media`-Blöcken bricht),
sammelt je Regel den Selektor UND prüft die `color:`-Deklaration eigenständig (nicht
`background-color`/`border-color`, die dieselbe Zeile oft mitträgt). Zwei Mengen:

- **benötigt** — Selektoren aus Basisregeln mit `color: var(--salbei-dunkel)`.
- **abgedeckt** — Selektoren, die unter `html.dark-mode` eine eigene `color:`-Zeile bekommen
  (welcher Wert, ist für die Deckung egal — nur DASS überhaupt übersteuert wird, zählt).

`luecken(html, ausnahmen)` = benötigt ∖ (abgedeckt ∪ ausnahmen). Die Probe
(`tests/darkmode-selektor-waechter.test.js`) hält das als stehende Zusicherung, mit zwei
getrennten Rot-Beweisen (07.09.2026 — „sonst ist die Ausnahmeliste ein Loch, durch
das später alles passt"):

- eine entfernte Nachtmodus-Zeile (`.doku-std-badge` testweise entfernt) muss als Lücke
  auffallen — beweist, dass der Wächter echte Deckungslücken findet, nicht nur die vier
  bekannten.
- eine entfernte Ausnahme (`.a11y-btn[aria-pressed="true"]` testweise nicht übergeben) muss
  ebenfalls wieder als Lücke erscheinen — beweist, dass die Ausnahme selbst geprüft wird,
  nicht nur behauptet.

Eine dritte Probe hält die Ausnahmeliste selbst sauber: eine Ausnahme, deren Selektor
inzwischen (durch einen künftigen Fix) doch abgedeckt ist, muss als „tote Ausnahme"
auffallen — sonst verrottet die Liste in die andere Richtung.

```konformitaet
aussage:  Jede Basisregel mit `color: var(--salbei-dunkel)` hat im Nachtmodus entweder eine
          eigene `html.dark-mode`-Übersteuerung oder eine benannte, mit einer echten
          Kontrastzahl begründete Ausnahme — geprüft als Schlüsselmenge, nicht als Zeilenzahl.
zustand:  geprüft
herkunft: invariante
pruefung: tests/darkmode-selektor-waechter.test.js#jede Basisregel mit color:var(--salbei-dunkel) hat eine Nachtzeile oder eine benannte Ausnahme
pruefung: tests/darkmode-selektor-waechter.test.js#Rot-Beweis Nachtzeile] eine entfernte Nachtmodus-Zeile wird gefunden
pruefung: tests/darkmode-selektor-waechter.test.js#Rot-Beweis Ausnahme] eine entfernte Ausnahme wird wieder als Lücke gefunden
```

## 6 · Was hier nicht gebaut ist

- Der Wächter prüft nur die EINE Farbrolle (`color: var(--salbei-dunkel)` als Text). Die
  Nachtliste enthält weitere, andersartige Übersteuerungen (Hintergründe, `border-color`,
  literale Hex-Werte wie `.deckblatt-platzhalter`) — jede davon eine eigene Invariante mit
  eigener Herleitung, hier bewusst nicht verallgemeinert (§4 des Kommentars an der Liste
  selbst nennt den Grund: nicht jede Fläche ist dieselbe).
- Hochkontrast-Modus (`html.high-contrast`) hat eine eigene Palette und ist nicht Teil
  dieser Prüfung — andere Werte, andere Herleitung.
