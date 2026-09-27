# U2-ADR-420 (Nummer beim Landen zu bestätigen) · Doppelt vergebene ADR-Nummern: gefunden, benannt, eine sofort behoben

**Status:** Angenommen
**Datum:** 17.09.2026
**Bezug:** U2-ADR-090 (Präfix-/Nachtrags-Regel für Nummern), U2-ADR-098 (Format der
Konformitätsklausel)
**Linie:** U2
**Status heute:** gilt

---

## Der Befund

Zwei ADR-Dateien können unabhängig voneinander dieselbe Nummer tragen — zwölf parallel
arbeitende Zweige vergeben Nummern, ohne sich untereinander abzustimmen, und eine Kollision wird
erst sichtbar, wenn zwei Bäume zusammentreffen. Gemessen gegen den echten Bestand (384
ADR-Dateien): zwei echte Kollisionen, `U2-ADR-347` und `U2-ADR-398`, je zwei inhaltlich
verschiedene, eigenständige Entscheidungen unter derselben Nummer, keine davon ein Nachtrag oder
eine benannte Variante (die Nachtrags-Form aus U2-ADR-090 §3 und ein Buchstaben-Suffix wie
`341`/`341b` sind keine Kollision — beide sind bereits vom bestehenden Wächter korrekt
ausgenommen).

Eine Prüfung, die das findet, existierte bereits (Dateiname-Achse, seit einer vorherigen
Erhebung des Bestands) — aber als eine Zahlen-Decke, die eine bekannte Anzahl Doppelvergaben
duldete, statt sie zu verlangen. Das ist der eigentliche Fund dieser ADR, nicht die Existenz der
zwei Kollisionen selbst: **eine Ratsche, die einen Höchstwert größer null zulässt, bucht einen
Defekt, statt ihn anzuhalten.**

## Entscheidung

### Zwei Nummernquellen, nicht eine

Die Nummer, die eine ADR-Datei behauptet, kommt aus zwei Stellen: dem Dateinamen
(`vivodepot-U2-ADR-<NNN>-…`) und der eigenen H1-Zeile (`# U2-ADR-<NNN> …`). Eine Kollision
zwischen zwei für sich eindeutigen Dateinamen, deren H1 dieselbe Nummer behauptet, entginge einer
Prüfung, die nur den Dateinamen liest. Ab jetzt werden beide Quellen geprüft, unabhängig
voneinander, plus ein dritter Fund: trägt eine Datei beide Nummern, aber uneins
(`nummernAbweichung`), ist das ein eigener Befund — eine umbenannte oder falsch nachgezogene
Datei kann sonst eine Kollision auf der jeweils anderen Achse verdecken.

### Eine Ratsche gegen Zuwachs ist nicht immer die richtige Form

Eine Decke, die einen Höchstwert festschreibt („höchstens N"), ist die richtige Form für einen
Bestand, den man nicht mit einem einzelnen Commit abträgt — historisch gewachsene tote
Code-Verweise etwa, über Jahre entstanden, deren Abbau ein eigener, größerer Zug ist. Sie ist die
FALSCHE Form für einen Defekt, den man beheben kann: dort erlaubt sie genau das, was sie
verhindern soll, nur mit einer Zahl statt ganz.

Die Doppelvergabe-Prüfungen in dieser ADR sind deshalb keine Zahlen-Decke mehr, sondern eine
Allowlist mit benannten, einzeln begründeten Einträgen. `U2-ADR-347` war aufgelöst (s. u.) und
trug keinen Eintrag mehr. `U2-ADR-398` blieb zunächst als einziger, namentlich benannter,
**terminierter** Eintrag stehen — 165 Verweise in 47 Dateien (Kern, Lese-App, `sw.js`, ein Dutzend
E2E-Specs), eine Auflösung damals hätte eine laufende Zusammenführung eines anderen Zuges zerlegt.
Der Termin ist eingelöst: am 19.09.2026, nach der Landung von L1, ist auch `U2-ADR-398` aufgelöst
(die Pro-Variante wanderte nach `U2-ADR-421`), die Allowlist ist leer, der Zielwert 0 erreicht. Jede
neue Doppelvergabe, jede verschobene (dasselbe Paar unter einer anderen Nummer, ein ganz anderes
Paar) lässt die Prüfung sofort scheitern — es gibt keinen Eintrag mehr, an den sie sich hängen ließe.

### Ein harter Stopp trifft, wer den Defekt verursacht hat — nicht elf Unbeteiligte

Der naheliegende nächste Schritt wäre ein echter Zielwert `0` gewesen: die Prüfung scheitert, bis
auch `U2-ADR-398` aufgelöst ist. Das wurde bewusst NICHT gleich so gebaut, sondern erst, als der Fall
aufgelöst war (19.09.2026). Diese Prüfung läuft im
`pre-commit`-Hook jedes Commits, der nicht ausschließlich Dokumente ändert — ein echter Zielwert
`0` hätte JEDEN Code-Commit in JEDEM parallel arbeitenden Zweig blockiert, bis die eine, bewusst
aufgeschobene Kollision behoben ist, nicht nur den Zweig, der sie verursacht hat. Die einzige
Ausweichbewegung wäre `--no-verify` gewesen — also genau die Praxis, gegen die ein solcher Stopp
gerichtet ist. Ein Wächter, der zum Umgehen zwingt, erzieht zum Umgehen.

**Die allgemeine Regel:** Ein harter Stopp ist die richtige Antwort auf einen Defekt, wenn ihn
derjenige zahlt, der ihn verursacht hat. Er ist die falsche Antwort, wenn ihn Unbeteiligte zahlen,
die mit dem Defekt selbst nichts zu tun haben. Die benannte, terminierte Allowlist trifft diesen
Mittelweg: sie hält jeden NEUEN oder verschobenen Fall sofort an (dort zahlt der Verursacher), und
sie bucht den einen bekannten, bewusst aufgeschobenen Fall nicht weg, sondern macht ihn sichtbar
und terminiert, bis er — nach der laufenden Zusammenführung — selbst aufgelöst wird.

### U2-ADR-347 wurde sofort aufgelöst, U2-ADR-398 nach der Landung von L1

`U2-ADR-347` hatte überschaubare Reichweite (24 Verweise in 16 Dateien) und wurde deshalb sofort
aufgelöst, nicht aufgeschoben: gemessen (nicht geschätzt), welche der beiden Dateien die
tragenderen Verweise hatte (9 gegen 6), die kleinere Seite ist umbenannt (neue, ebenfalls
vorläufige Nummer, alle tragenden Verweise nachgezogen, Inhalt unverändert). `U2-ADR-398` war mit
165 Verweisen in 47 Dateien eine andere Größenordnung — eine Umbenennung vor der Landung von L1
wäre einer laufenden Zusammenführung eines anderen Zweigs in die Quere gekommen. Der Aufschub war
keine Ausrede, sondern eine Reihenfolge-Entscheidung mit einem Termin, keine offene Frist — und der
Termin ist eingehalten: `U2-ADR-398` wurde am 19.09.2026 aufgelöst, sobald L1 gelandet war.

### Die Ausführung ist erfolgt (19.09.2026)

`tools/adr-nummer-verschieben.js` macht den mechanischen Teil einer solchen Auflösung sicher —
Datei umbenennen, ihre eigenen Referenzen ersetzen, externe Verweise gegen einen geprüften Plan
ersetzen, ohne die Schwester-ADR unter derselben Nummer zu berühren. Das Werkzeug trifft NICHT
die Entscheidung, welche Zeile zu welcher der beiden ADRs gehört: bei 47 betroffenen Dateien ließ
sich nur ein Teil eindeutig per Schlüsselwort zuordnen, der Rest braucht eine echte Lektüre. Diese
Zuordnung bleibt ein geprüfter, von Hand erstellter Plan (JSON) — das Werkzeug prüft ihn gegen den
aktuellen Bestand (Zeilennummer und erwarteter Text müssen noch passen) und bricht ohne jede
Schreibaktion ab, wenn der Plan veraltet ist.

So lief die Auflösung von `U2-ADR-398` am 19.09.2026: jede der 179 Zeilen, die die Nummer nennen
(ohne die erzeugten README und Faktenbasis), einzeln gelesen und einer der beiden ADRs zugeordnet.
Es wandert die Pro-Variante („VD Pro ersetzt statt ergänzt"), die den vorläufigen Nummernvermerk trug
und die weniger tragenden Verweise hatte (83 Zeilen in 26 Dateien gegen 96 Zeilen in 38) — dasselbe
Maß wie bei `U2-ADR-347`. Neue Nummer `U2-ADR-421`, die höchste vergebene über alle Zweige plus eins.
Der Plan (69 Ersetzungen in 25 Dateien, Zeilennummern erst am Zielbaum aus dem Wortlaut der gelesenen
Zeilen gebildet) lief ohne Abbruch; drei Stellen, die nur „ADR" und „398" ohne das Präfix „U2-" tragen und die das
Werkzeug darum nicht trifft, sind von Hand nachgezogen. Eine Fundstelle (`tools/fassung-eintragen.js`,
„welche Fassung hat diese Kundin bekommen") gehört zu keiner der beiden ADRs und blieb unverändert.

## Was diese ADR NICHT tut

- Sie hat am 17.09.2026 nicht entschieden, welche der beiden `U2-ADR-398`-Dateien wandert, oder
  wann genau — das war eine Entscheidung, keine mechanische Nachführung, und fiel bei der
  Auflösung am 19.09.2026 (s. o.).
- Sie legt keinen automatischen Reservierungsmechanismus für neue Nummern an. Ein Register
  innerhalb eines Git-Zweigs hätte dasselbe Wettlauf-Problem wie die Nummern selbst, nur eine
  Ebene tiefer — jeder Zweig ist bis zur Zusammenführung isoliert, ein Registereintrag in einem
  Zweig schützt keinen anderen. Der bestehende Weg (ein vorläufiger Platzhalter beim Anlegen,
  „Nummer beim Landen zu bestätigen", plus eine einzige, serialisierte Umnummerierung beim
  Zusammenführen) bleibt richtig — er hatte nur kein Netz. Diese ADR liefert das Netz, keine neue
  Reservierung.

## Konformität

```yaml
konformitaet:
  - aussage: >-
      Zwei für sich eindeutige Dateinamen, deren H1-Zeile dieselbe Nummer behauptet, werden als
      Doppelvergabe erkannt — nicht nur eine Kollision im Dateinamen selbst.
    zustand: erfuellt
    herkunft: diese ADR (17.09.2026)
    pruefung:
      - tests/adr-bestand-pruefen.test.js
        "Doppelvergabe (H1): U2-ADR-004 wieder, PLUS U2-ADR-050 — zwei verschiedene Dateinamen (020, 021), dieselbe H1-Nummer"

  - aussage: >-
      Trägt eine Datei im Dateinamen und in der H1 zwei verschiedene Nummern, wird das als eigener
      Befund erkannt, unabhängig von einer Doppelvergabe.
    zustand: erfuellt
    herkunft: diese ADR (17.09.2026)
    pruefung:
      - tests/adr-bestand-pruefen.test.js
        "Nummern-Abweichung: genau die beiden H1-Kollisions-Dateien, Dateiname ≠ H1"

  - aussage: >-
      Der echte Bestand trägt keine Doppelvergabe (Zielwert 0, U2-ADR-347 und U2-ADR-398 sind
      aufgelöst) — jede neue oder verschobene Doppelvergabe lässt die Probe gegen den echten
      Bestand sofort scheitern, statt in einer Zahlen-Decke oder Ausnahmeliste zu verschwinden.
    zustand: erfuellt
    herkunft: diese ADR (17.09.2026); U2-ADR-347 im selben Zug aufgelöst, U2-ADR-398 am 19.09.2026
    pruefung:
      - tests/adr-bestand-pruefen.test.js
        "Doppelvergaben (Dateiname): keine — Zielwert 0, U2-ADR-347 und U2-ADR-398 sind aufgelöst"
      - tests/adr-bestand-pruefen.test.js
        "Doppelvergaben (H1): keine — dieselbe Aussage über die zweite Quelle"

  - aussage: >-
      Die Auflösung einer Doppelvergabe läuft mechanisch, ohne die Schwester-ADR unter derselben
      Nummer zu beschädigen — gegen einen geprüften Plan, der bei veralteten Zeilenangaben ohne jede
      Schreibaktion abbricht. So ausgeführt für U2-ADR-398 → U2-ADR-421.
    zustand: erfuellt
    herkunft: diese ADR (17.09.2026); ausgeführt am 19.09.2026
    pruefung:
      - tests/adr-nummer-verschieben.test.js
        "[adr-nummer-verschieben] echter Lauf: Datei umbenannt, eigene UND externe Referenzen ersetzt — die Schwester-ADR (500, erster Inhaber) bleibt unberührt"
      - tests/adr-nummer-verschieben.test.js
        "[adr-nummer-verschieben·Rot-Beweis] eine verschobene Zeilennummer (Plan veraltet) bricht ab, OHNE etwas zu schreiben"
```
