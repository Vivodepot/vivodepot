# U2-ADR-422 (Nummer beim Landen zu bestätigen) · Die YAML-Form der Konformitätsklausel ist gleichrangig zur eingezäunten Form

**Status:** Angenommen
**Datum:** 17.09.2026
**Bezug:** U2-ADR-098 (Format der Konformitätsklausel, eingezäunte Form), U2-ADR-323 (erste ADR mit
der YAML-Form, 06.09.2026)
**Linie:** U2
**Status heute:** gilt — beide Formen werden gelesen und geprüft; die Nachrüstung des Bestands ist
mit diesem Zug abgeschlossen.

---

## Kontext

U2-ADR-098 legt das Format der Konformitätsklausel fest: ein eingezäunter Block
` ```konformitaet ` mit flachen `aussage:`/`zustand:`/`pruefung:`/`quelle:`-Zeilen, ein Klausel je
Block.

Seit U2-ADR-323 (06.09.2026) trägt ein Teil der ADRs eine zweite Form desselben Gedankens: ein
` ```yaml `-Block mit einer `konformitaet:`-Liste, in der jedes Listenelement (`- aussage: >-`)
eine eigene Klausel mit denselben vier Feldern ist — `pruefung:` dort selbst eine gefaltete Liste,
deren Einträge entweder ein bloßer Werkzeug-/Testdateipfad sind (die Existenz der Datei ist der
ganze Beleg) oder ein Pfad gefolgt von einem in Anführungszeichen gesetzten Testtitel.

**Der Befund, der diesen Zug auslöste:** die beiden Werkzeuge, die eine Konformitätsklausel gegen
den echten Testbestand prüfen (das kanonische Prüfwerkzeug und der semantische Abgleich zwischen
Aussage und Prüfung), erkannten die YAML-Form strukturell nicht — sie lasen ausschließlich den
eingezäunten Block. Für keine der seit dem 06.09.2026 in dieser Form geschriebenen 16 ADR-Dateien
(83 Klauseln) hatte seither ein Suite-Lauf tatsächlich geprüft, ob die eingetragenen `pruefung:`-
Verweise noch auf echte Tests zeigen. Der Bestand sah geprüft aus, weil die Suite grün war — grün,
weil sie diese Dateien nie gelesen hatte, nicht weil sie sie bestanden hatten.

## Entscheidung

### Beide Formen bleiben, dauerhaft

Die YAML-Form wird nicht in die eingezäunte Form zurückgeschrieben, und die eingezäunte Form wird
nicht auf YAML umgestellt. Sechzehn (und mit jedem Tag mehr) bestehende Dateien umzuschreiben, um
eine Formatfrage zu lösen, ändert nichts an der Prüfbarkeit und riskiert echten Inhalt für
Kosmetik. Beide Formen sind ab sofort gleichrangig gültig; welche eine neue ADR wählt, ist frei.

### `pruefung:` ist in beiden Formen Pflicht, sobald eine Klausel eine prüfbare Aussage trägt

U2-ADR-098 verlangt das für die eingezäunte Form bereits (`zustand: prüfbar` erfordert
`pruefung:`). Diese ADR ist die Nachfolge-Entscheidung für die YAML-Form: **dieselbe Auflage gilt
dort für jede Klausel, deren Aussage sich gegen den Testbestand prüfen lässt** — unabhängig davon,
welches Wort in `zustand:` steht. Die YAML-Form kennt (Stand heute) keinen festgelegten,
geschlossenen Zustands-Kanon wie U2-ADR-098 ihn für die eingezäunte Form definiert (`prüfbar |
offen | nicht-prüfbar | ausgesetzt`) — beobachtet sind `erfuellt`, `teilweise-erfuellt`,
`bekannte-grenze`. Diese ADR entscheidet diesen Kanon nicht; sie entscheidet nur, dass unabhängig
vom gewählten Wort eine vorhandene `pruefung:`-Liste echte, auflösbare Verweise tragen muss.

### Format von `pruefung:` in der YAML-Form

```yaml
pruefung:
  - tools/ein-werkzeug.js
  - tests/ein-test.test.js
    "der genaue Testtitel, wörtlich"
```

Ein Eintrag ohne Titel behauptet nur die Existenz der genannten Datei. Ein Eintrag mit Titel
verweist entweder auf einen `test('…')`-Titel (Datei endet auf `.test.js`/`.mjs`/`.cjs`) oder,
wenn die Datei kein Testfile ist, auf eine wörtliche Fundstelle in dieser Datei (etwa einen
Registry-Eintrag). Ein im Titel enthaltenes Anführungszeichen wird mit `\"` maskiert.

### Werkzeuge

Beide Prüfwerkzeuge (`tools/adr-konformitaet-pruefen.js`, kanonisch; `tools/aussage-pruefung-
abgleich-messen.js`, semantischer Abgleich) lesen jetzt beide Formen. Das zweite Werkzeug tut das
über einen Aufruf der Funktionen des ersten, nicht über eine eigene Nachbildung — aus dem Grund im
Nebenbefund unten. Ein drittes Werkzeug (`tools/klausel-proben-schaerfe-pruefer.js`), das dieselben
Grundfunktionen importiert, bleibt unverändert: es beschränkt sich absichtlich auf den exakten
Zustand `prüfbar` (den U2-ADR-098-Kanon der eingezäunten Form) und überspringt YAML-Klauseln damit von
selbst, ohne blind zu sein — kein Fall trägt dieses Wort.

### Nachrüstung des Bestands

Die 83 YAML-Klauseln in den 16 betroffenen Dateien wurden gegen den echten Testbestand geprüft.
Sieben lösten nicht auf. Für sechs davon ließ sich im Bestand belegen, was heute gilt, und die
Klausel wurde korrigiert — eingearbeitet in `aussage:`/`zustand:`, nicht als Nachtrag angehängt,
weil genau das Nebeneinander von altem und neuem Stand die Drift hier erst hat entstehen lassen.
Der Unterschied zu einer bloßen Verweis-Korrektur ist wesentlich: ein veralteter `pruefung:`-
Verweis, der stur auf den heutigen Testtitel nachgezogen wird, hinterlässt eine überholte
Behauptung neben einem Beleg, der ihr widerspricht — grün, aber falsch. Wo sich das Heute nicht aus
dem Bestand belegen ließ (eine Klausel in U2-ADR-338, deren ursprünglicher Test ersatzlos verschwand
und deren nächstliegender Ersatz eine andere, breitere Aussage trifft), wurde nicht korrigiert,
sondern der Fall vorgelegt — das ist eine Entscheidung über den Inhalt der Klausel, keine
Nachführung eines Verweises.

Zwei Klauseln in U2-ADR-398 lösten aus einem anderen Grund nicht: ihre `pruefung:`-Titel sind
Template-Literale mit einer Zahlen-Interpolation im Quelltext, die ein Text-Abgleich ohne
Testausführung nicht auflösen kann. Die Lösung liegt beim Block, nicht beim Prüfer: der Titel wurde
auf seinen statisch auffindbaren Teil vor der Interpolation gekürzt. Der Wächter wurde dafür nicht
nachsichtiger gemacht.

## Nebenbefund: Übereinstimmung ist kein Beleg, wenn die Annahme geteilt wird

Zwei unabhängig geschriebene Werkzeuge — das kanonische Prüfwerkzeug und der semantische Abgleich —
hatten denselben blinden Fleck gegenüber der YAML-Form. Beide wurden gegen dieselbe (unausgesprochene)
Annahme geschrieben: eine Konformitätsklausel sieht wie der eingezäunte Block aus. Zwei
Implementierungen, die übereinstimmen, belegen nichts, wenn beide dieselbe Annahme teilen.

Derselbe Fehler zeigte sich ein zweites Mal, kleiner und in derselben Nachrüstung: eine der sieben
ungelösten Klauseln (U2-ADR-338) ließ sich scheinbar durch eine bereits vorhandene, breiter
formulierte Prüfung ersetzen — dem Wortlaut nach eine stärkere Zusicherung, die die schwächere
enthält. Eine Messung gegen den echten Bestand zeigte das Gegenteil: die vorgeschlagene Prüfung
stützt sich auf eine Live-Extraktion, die seit einer späteren, U2-ADR-338 unbekannten Umstrukturierung
für ein Viertel der ursprünglich gemeinten Kennungen strukturell blind ist — sie kann für diese
Kennungen nicht rot werden, nicht weil sie sicher richtig liegen, sondern weil die Prüfung sie nie
sieht. Der Wortlaut einer Zusicherung ist kein Beleg für ihre Reichweite; nur eine Messung gegen den
tatsächlichen Bestand ist es. Die betroffene Klausel trägt jetzt zwei Prüfungen: die tragende,
gegen eine vollständige Quelle, und die engere, mit ihrer Grenze im Text benannt statt verschwiegen.

## Was dieser Zug NICHT tut

- Er vereinheitlicht die beiden Formen nicht und entscheidet nicht, welche künftige ADRs wählen
  sollen.
- Er legt keinen geschlossenen Zustands-Kanon für die YAML-Form fest — das bleibt offen.
- Er baut keine automatische Umschreibung zwischen den Formen.

## Konformität

```yaml
konformitaet:
  - aussage: >-
      tools/adr-konformitaet-pruefen.js erkennt beide Formen der Konformitätsklausel und prüft
      `pruefung:`-Verweise in der YAML-Form gegen den echten Testbestand, mit Unterscheidung
      zwischen Testdatei-Titeln und wörtlichen Fundstellen in Nicht-Testdateien.
    zustand: erfuellt
    herkunft: diese ADR (17.09.2026)
    pruefung:
      - tests/adr-konformitaet-pruefen.test.js
        "[Konformitäts-Wächter] Positivkontrolle YAML-Form: eine verstümmelte pruefung-Zeile macht das Gate ROT — und die Entschärfung wieder GRÜN"
      - tests/adr-konformitaet-pruefen.test.js
        "[Konformitäts-Wächter] gegen den echten Bestand: die vier Zahlen sind plausibel"

  - aussage: >-
      tools/aussage-pruefung-abgleich-messen.js liest die YAML-Form über dieselben Funktionen wie
      das kanonische Prüfwerkzeug mit, statt sie ein zweites Mal unabhängig zu implementieren.
    zustand: erfuellt
    herkunft: diese ADR (17.09.2026), s. Nebenbefund oben
    pruefung:
      - tools/aussage-pruefung-abgleich-messen.js

  - aussage: >-
      tools/klausel-proben-schaerfe-pruefer.js bleibt durch seine eigene Beschränkung auf den
      Zustand `prüfbar` unberührt von der YAML-Form, ohne dass eine Änderung an ihm nötig war.
    zustand: erfuellt
    herkunft: diese ADR (17.09.2026); geprüft statt angenommen — Direktlauf und eigene Suite grün
    pruefung:
      - tests/klausel-proben-schaerfe-pruefer.test.js
```
