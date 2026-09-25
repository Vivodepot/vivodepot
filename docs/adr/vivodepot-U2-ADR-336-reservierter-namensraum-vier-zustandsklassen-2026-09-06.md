# U2-ADR-336 · Vier reservierte Klassennamen — und die Lücke, die eine Umbenennung offenließ

**Datum:** 06.09.2026
**Status:** gebaut, Probe grün, Rot-Beweis am echten Kern geführt
**Status heute:** gilt. Die vier Klassennamen sind erhoben, die neue Probe hält sie.
**Bezug:** U2-ADR-331 (die Zusicherungs-Sperre selbst, die auf diesen Klassen ankert)

---

## 1 · Der Gegenstand

Die Lese-App (`vivodepot-lesen.html`) markiert vier Zustands-Aussagen im Markup über eigene
Klassen:

```
klartext-warn · herkunft-marke · stand-marke · vorlage-marke
```

`U2-ADR-331` leitet daraus seine Sperrliste ab (`tools/zusicherungs-schluessel-erheben.js`):
jeder `STRINGS`-Schlüssel, der in einem dieser Blöcke steht, darf von keinem Textsatz-Modul
überschrieben werden — ein Modul liefert Werte, keine Aussagen über den eigenen Zustand.

Diese vier Namen sind damit weder **öffentlich** (ein Design darf sich daran binden, der Name
bleibt bewusst stabil) noch **intern** (ändert sich frei, wer sich daranhängt trägt das
Risiko). Sie bilden eine dritte Kategorie:

| | |
|---|---|
| **öffentlich** | ein Design darf sich daran hängen; der Name bleibt |
| **intern** | darf sich jederzeit ändern; das Risiko trägt, wer sich daranhängt |
| **reserviert** | **niemand ändert sie — weder Gerüst noch Design.** Ein Wächter hängt daran |

## 2 · Die Entscheidung

Die vier Namen oben sind **reserviert**. Eine Umbenennung ist keine Refaktorierung, sondern
eine Änderung an einer Sicherheitsgrenze — sie braucht denselben Prozess wie eine Änderung an
`U2-ADR-331` selbst, nicht einen gewöhnlichen Commit.

## 3 · Der gemessene Befund — die Erhebung sichert sich nicht selbst gegen Umbenennen

**Rot-Beweis geführt, nicht nur behauptet.** Im Kanon (`bb247786`) wurde `herkunft-marke` in
genau einer Zeile umbenannt — nur die Klasse im Markup der Auslieferungsfunktion, die
zugehörige CSS-Regel blieb unverändert (die Bauform „Design-Build vergisst/braucht CSS nicht
anzufassen"):

```
Vorher   return '<div class="herkunft-marke herkunft-marke--' + stand + '" …'
Nachher  return '<div class="herkunft-hinweis herkunft-hinweis--' + stand + '" …'
```

**Ergebnis, gemessen:**

```
erheben()                    5 der 18 Schlüssel fallen aus der Erhebung
                              (herkunftTitel, herkunftSatz{AlleGeprueft,Keine,
                              OhneAngabe,Teilweise}) — STILL, ohne eigene Meldung
gegenprobe() (Anker-Check)    bleibt GRÜN — sie prüft nur, ob eine CSS-Regel mit
                              Warn-Farbvariablen außerhalb ZUSTAND_KLASSEN steht.
                              Die alte, jetzt tote CSS-Regel erfüllt das weiter.
[U2-ADR-331·Sperre]-Probe     wird ROT — Drift zwischen der eingefrorenen Liste
                              und einer frischen Erhebung. Das Sicherheitsnetz
                              trägt HEUTE.
zusicherungs-schluessel
  --check (Pre-Commit-Gate)   bricht mit Exit 1 ab. Trägt ebenfalls.
```

**Die eigentliche Lücke liegt einen Schritt weiter.** Die vom Fehler selbst empfohlene
Reparatur — `npm run zusicherungen:build`, um die Sperrliste neu zu erzeugen — schreibt exakt
die (jetzt verkleinerte) frische Erhebung in die Datei zurück. Wer diesem Hinweis folgt, weil
er ihn für die korrekte Reaktion auf eine rote Probe hält, **schreibt die Lücke fest**: Drift
und Sperrliste stimmen danach wieder überein, `[U2-ADR-331·Sperre]` wird wieder grün, und der
Rot-Beweis-Test von `U2-ADR-331` prüft ab diesem Zeitpunkt nur noch die verbliebenen 13
Schlüssel — die fünf `herkunft*`-Sätze sind ab dann für jedes Textsatz-Modul überschreibbar,
ohne dass irgendeine bestehende Probe das je wieder meldet.

**Warum nur `herkunft-marke` und `stand-marke` betroffen wären, `klartext-warn` und
`vorlage-marke` aber schon heute zusätzlich abgesichert sind:**
`tests/u2-adr-331-zusicherungen-nicht-ueberschreibbar.test.js` prüft in seinem
„Ausbeute"-Test hart `r.schluessel.includes('klartextHinweis')` und `.some(k =>
k.startsWith('vorlage'))` — eine Umbenennung dieser beiden Klassen fiele **zusätzlich** durch
diese zwei Assertions. Für `herkunft-marke` und `stand-marke` existiert keine solche
namentliche Prüfung; nur die (zeitlich begrenzte) Drift-Kontrolle schützt sie.

## 4 · Die neue Zusicherung

Eine Probe, die unabhängig von Erzeugung/Regenerierung bei jedem Lauf neu gegen den Quelltext
mißt, dass alle vier reservierten Klassen mindestens einmal als Treffer auftauchen —
`tests/u2-adr-336-reservierter-namensraum.test.js`. Sie vergleicht nicht zwei Erhebungen
gegeneinander (das überlebt eine Regenerierung nicht), sondern hält die vier Namen selbst als
festen Maßstab:

```
JEDE der vier Klassen (klartext-warn, herkunft-marke, stand-marke, vorlage-marke)
muss in `erheben(quelle).treffer` mindestens einmal vorkommen.
```

**Rot-Beweis:** dieselbe Umbenennung (`herkunft-marke` → `herkunft-hinweis`, CSS unverändert)
macht diese Probe rot — vor und nach einer Regenerierung der Sperrliste, weil sie nicht gegen
die generierte Liste, sondern gegen die vier Namen selbst prüft.

## 5 · Was dieses ADR nicht löst

- **Die Typprüfung des `--vd-*`-Namensraums** (Token-Ebene) — eigener Zug.
- **Die Sichtbarkeits-Zusicherung** (ein Design blendet einen reservierten Block per CSS aus,
  ohne die Klasse anzufassen — `display:none`, `opacity:0`, eine Deckfläche, …) — der Wächter
  hier bewacht den Namen, nicht die Sichtbarkeit. Das ist ein zweiter, größerer Zug (braucht
  eine gerenderte Sicht mit aktivem Design-Modul, `elementFromPoint`, Kontrastmessung gegen den
  tatsächlichen Hintergrund) und ausdrücklich nicht Teil dieser Entscheidung.
- **Die breitere Frage öffentlicher/interner Selektoren** außerhalb dieser vier reservierten
  Namen — eigenes, größeres Architektur-Dokument, noch nicht als ADR zugeschnitten.

## 6 · Was hier absichtlich nicht geändert wurde

Keine der vier Klassen selbst wurde umbenannt oder verändert — nur probeweise, in einer
isolierten Arbeitskopie, und danach vollständig zurückgesetzt (`git checkout`), um den
Rot-Beweis zu führen. `vivodepot-lesen.html` trägt im gelandeten Stand keine Änderung.
