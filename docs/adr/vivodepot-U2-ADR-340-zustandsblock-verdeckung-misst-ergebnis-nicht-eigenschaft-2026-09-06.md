# U2-ADR-340: Ein Design darf keine Warnung ausblenden — die Zusicherung misst das Ergebnis, nicht den Weg

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Betrifft:** `vivodepot-lesen.html` (die vier Zustandsblöcke `klartext-warn`, `herkunft-marke`,
`stand-marke`, `vorlage-marke`), `tools/zusicherungs-schluessel-erheben.js` (`ZUSTAND_KLASSEN`,
`gegenprobe()`), `tools/lib/kontrast.js`,
`tests/e2e/zustandsblock-verdeckung-guard.spec.js` (neu)

- **Status heute:** gilt — die neue Zusicherung fängt alle drei gemessenen Verdeckungswege
  (`display:none`/`opacity:0`/Deckfläche); der Angriff selbst ist erst erreichbar, sobald `ce`s
  `--vd-*`-Typprüfung UND ein Kanal dieser Tokens in `vivodepot-lesen.html` beide existieren.

## Der Befund, mit dem der Auftrag begann

Ein Design-/Branding-Modul könnte `.klartext-warn { display: none }` setzen. Der bestehende
Wächter (`tools/zusicherungs-schluessel-erheben.js`) bleibt dabei grün — er bewacht, dass die
KLASSE im Markup steht, nicht, dass der Block, den sie trägt, tatsächlich zu sehen ist. Ein
Empfänger sähe die Zustands-Aussage trotzdem nicht.

`cb` bestätigt das unabhängig, aus derselben Datei: der bestehende `gegenprobe()`-Mechanismus
prüft nur, ob eine CSS-Regel mit den Warn-Farbvariablen EXISTIERT — er sieht nicht, ob der Block
tatsächlich sichtbar gerendert wird. Zwei Sitzungen, unabhängig auf dieselbe Lücke gestoßen.

## Warum eine Eigenschaftsliste hier nicht trägt

`display:none`/`visibility:hidden` ist eine Liste, und jede Liste ist beim nächsten Weg
unvollständig: `opacity:0`, `font-size:0`, `transform:scale(0)`, `clip-path`,
`position:absolute;left:-9999px`, Textfarbe gleich Grund, eine Deckfläche darüber. Eine
Zusicherung, die eine dieser Eigenschaften abfragt, bewacht nur die Wege, an die ihr Autor
gedacht hat.

**Gemessen wird darum das ERGEBNIS — was ein Mensch tatsächlich sähe —, nicht die Deklaration:**

- **Fläche:** `getBoundingClientRect()` — hat der Block überhaupt eine sichtbare Ausdehnung?
- **Nicht verdeckt:** `document.elementFromPoint()` in der Blockmitte — liefert es den Block
  selbst oder ein Kind, oder etwas anderes?
- **Lesbar:** Kontrast der tatsächlichen Textfarbe gegen die aus der Ahnenkette komponierte
  Hintergrundfarbe (WCAG 2.2 AA, 4,5:1) — nicht gegen ein Token, gegen den GERENDERTEN Grund.

## Drei Rot-Beweise, drei verschiedene Wege — und was jeder tatsächlich prüft

```
1  display: none              -> FLÄCHE          (getBoundingClientRect wird 0)
2  opacity: 0                  -> LESBARKEIT       (Fläche bleibt > 0!)
3  eine Deckfläche darüber     -> ERGEBNIS/VERDECKUNG (der Block selbst bleibt UNVERÄNDERT)
```

Nummer 3 ist der eigentliche Beweis: keine einzige CSS-Eigenschaft des Blocks selbst wird
angefasst, trotzdem erkennt die Zusicherung ihn als nicht sichtbar (`elementFromPoint` liefert
die Deckfläche, nicht den Block). Ein Wächter, der nur die Eigenschaften DES Blocks liest, fände
diesen Weg nie — das ist der Unterschied zwischen einer Eigenschaftsliste und einer
Ergebnis-Messung.

Dass alle drei verschiedene STELLEN der Prüfung berühren (Fläche / Lesbarkeit / Verdeckung),
statt derselben Prüfung dreimal zu begegnen, ist selbst Teil des Beweises: die Zusicherung hat
drei unabhängige Versagensarten, nicht eine.

## Der Opazitäts-Fund — computed style ist nicht das gerenderte Bild

Der erste Entwurf dieser Zusicherung ließ Rot-Beweis 2 fälschlich grün durch:
`getComputedStyle(el).color` meldet bei `opacity:0` weiterhin die volle, deckende Farbe — die
CSS-Eigenschaft `opacity` wirkt ausschließlich beim Compositing (wie der Browser tatsächlich
malt), niemals im gemeldeten Wert einer Einzeleigenschaft. Eine Prüfung, die nur den gemeldeten
Wert liest, berührt hier ihren Gegenstand — anders als bei den elf zuvor gescheiterten Proben
dieses Tages — und liest trotzdem an der Wirklichkeit vorbei, weil der gelesene Wert nicht
abbildet, was gerendert wird.

**Die Reparatur:** die kumulierte Opazität (Element und alle Vorfahren) wird als zusätzlicher
Alpha-Faktor auf die Textfarbe UND auf den eigenen Hintergrund des Blocks gefaltet, BEVOR
`tools/lib/kontrast.js` rechnet — ein fehlender Schritt vor einer bestehenden, bereits
geprüften Rechnung, kein zweiter Kontrast-Motor daneben (dieselbe Regel wie U2-ADR-146: eine
Wahl bekommt eine Tabellenzeile, keinen zweiten Mechanismus).

## Die Verfallsbedingung — warum diese Zusicherung landet, obwohl der Angriff heute unmöglich ist

Gemessen (Punkt 1 des Auftrags, vor dem Bau): `vivodepot-lesen.html` liest heute KEIN
`--vd-branding-*`. Die vier Zustandsblöcke nutzen feste, eigene Werte (`--warn-bg`/
`--warn-tinte`, Dateikopf: „bewusst eigen"). Ein Branding-Modul kann die Lese-App heute über
Farbe nicht erreichen — der Angriff aus dem Befund ist **heute nicht ausführbar**.

Eine Zusicherung, die vor dem Angriff gebaut wird, muss ihren eigenen Verfallsschutz
mitbringen: sie muss sagen, unter welcher Bedingung sie heute nichts fängt, und wann sich das
ändert — sonst liest der nächste Bearbeiter einen Wächter, der nie anschlägt, und räumt ihn als
überflüssig weg. Das wäre das Gegenstück zu `cb`s Fund vom selben Tag (ein Wächter, der selbst
empfiehlt, wie man ihn abschaltet) — beide enden gleich: die Prüfung verschwindet, bevor sie
gebraucht wird.

**Diese Zusicherung wird tragend, sobald BEIDES existiert:**

```
1  ce's Typprüfung für --vd-* (ein Modul kann eigene Tokens setzen)   — gebaut, wartet auf Slot
2  ein Kanal, der diese Tokens in vivodepot-lesen.html einspeist      — existiert heute NICHT
```

Bis dahin bewacht sie das ERGEBNIS unabhängig vom Weg, der es erzeugt — und genau deshalb muss
sie nicht warten, bis Weg 1 und 2 stehen: sie prüft nicht „setzt ein Modul `--vd-branding-*`",
sondern „ist der Block sichtbar, unverdeckt, lesbar" — eine Frage, die unabhängig vom
Erzeugungsweg schon heute eine Antwort hat (JA), und die dieselbe bleibt, sobald ein neuer Weg
hinzukommt, der versucht, sie auf NEIN zu drehen.

## Die vier Klassen — importiert, nicht abgeschrieben

`ZUSTAND_KLASSEN` (`['klartext-warn', 'herkunft-marke', 'stand-marke', 'vorlage-marke']`) wird
in der neuen Zusicherung aus `tools/zusicherungs-schluessel-erheben.js` importiert, nicht als
eigene Liste neu geschrieben. Eine zweite, abgeschriebene Liste wäre wieder die Landkarte ihres
Erbauers — genau die Falle, vor der der Kopf jener Datei selbst warnt („Warum nicht eine
Handliste"). Beide Zusicherungen — Namens-Existenz (bestehend) und Sichtbarkeits-Ergebnis (neu,
diese Datei) — hängen an DEMSELBEN Anker; wächst die Klassenliste, wächst diese Zusicherung mit,
ohne dass jemand sie nachträgt.

## Konformität

```yaml
konformitaet:
  - aussage: >-
      Für jede Klasse aus ZUSTAND_KLASSEN gilt: ohne fremde Einwirkung ist ihr Block sichtbar
      (Fläche > 0), unverdeckt (elementFromPoint trifft ihn) und lesbar (Kontrast >= 4,5:1
      gegen den tatsächlichen, komponierten Hintergrund).
    zustand: erfuellt
    herkunft: U2-ADR-340 (06.09.2026)
    pruefung:
      - tests/e2e/zustandsblock-verdeckung-guard.spec.js
        "Grundstand: alle vier ZUSTAND_KLASSEN bestehen ohne Einwirkung"

  - aussage: >-
      display:none an einem Block trifft NUR diesen Block — die übrigen drei Zustandsklassen
      bleiben unberührt bestehen.
    zustand: erfuellt
    herkunft: U2-ADR-340 (06.09.2026)
    pruefung:
      - tests/e2e/zustandsblock-verdeckung-guard.spec.js
        "Rot-Beweis 1 — display:none trifft NUR den betroffenen Block"

  - aussage: >-
      opacity:0 lässt die Fläche des Blocks bestehen, macht ihn aber unlesbar (Textfarbe fällt
      effektiv mit dem Grund zusammen) — die Zusicherung fängt das über Lesbarkeit, nicht über
      Fläche.
    zustand: erfuellt
    herkunft: U2-ADR-340 (06.09.2026)
    pruefung:
      - tests/e2e/zustandsblock-verdeckung-guard.spec.js
        "Rot-Beweis 2 — opacity:0 auf herkunft-marke"

  - aussage: >-
      Eine Deckfläche, die keine einzige Eigenschaft des Blocks selbst ändert, wird trotzdem als
      Verdeckung erkannt (elementFromPoint liefert die Deckfläche, nicht den Block) — der Beweis,
      dass die Zusicherung das ERGEBNIS misst, nicht eine CSS-Eigenschaftsliste.
    zustand: erfuellt
    herkunft: U2-ADR-340 (06.09.2026)
    pruefung:
      - tests/e2e/zustandsblock-verdeckung-guard.spec.js
        "Rot-Beweis 3 — eine Deckfläche darüber ändert am Block selbst NICHTS, wird trotzdem gefunden"
```
