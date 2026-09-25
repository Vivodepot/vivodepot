# U2-ADR-338: VOLLMACHT_BMJ bekommt einen Schlüssel-Weg — der Ort ist da, kein englischer Wortlaut

**Status:** Akzeptiert
**Nummer:** vorläufig — gegen `docs/adr/README.md` beim Landen zu prüfen (Kollisionsgefahr, mehrere
Sitzungen vergeben parallel)
**Datum:** 06.09.2026
**Betrifft:** `vivodepot.html` (`TEXTSATZ_EINGEBAUT`, 75 neue Einträge), `tools/textsatz-en-juristisch-offen.js`
(`OFFEN_JURISTISCH`, 75 neue Einträge), `tools/vollmacht-bmj-schluessel-heben.js` (neu),
`tests/u2-adr-338-vollmacht-bmj-schluessel.test.js` (neu), `tests/textsatz-en-modul-erzeugen.test.js`
(Ratsche 121 → 196)

- **Status heute:** gilt — `VOLLMACHT_BMJ.steps[].sektion`/`.frage`/`.feld.label` sind über den
  Textsatz andockbar; keine der 75 Kennungen trägt eine englische Übersetzung.

---

## Der Befund

U2-ADR-333 machte die Wortlaute der Dokument-Module (PV_MODUL, VOLLMACHT_MODUL, KI_MODUL,
BETREUUNG_MODUL, PV_BMJ, KI_KORPUS) überschreibbar. **`VOLLMACHT_BMJ` blieb dabei ausdrücklich
zurück** — der Auftrag „die Sprach-Spur" (06.09.2026) benennt es als eigenen, letzten
Posten: „Wortlaute mit Rechtsfolge. Auflage: den Schlüssel-Weg bauen, keinen englischen Wortlaut
einsetzen, den kein Jurist gesehen hat."

**Der Lauf existierte bereits** (`_textsatzAufSchrittsatzAnwenden(VOLLMACHT_BMJ, 'vollmachtBmj', tun)`
und `_textsatzAufVollmachtBmjAnwenden(VOLLMACHT_BMJ.steps, tun)`, beide in `_textsatzOrteBegehen`
verdrahtet, seit U2-ADR-112-Nachtrag bzw. U2-ADR-333) — **er fand nur nichts**: `TEXTSATZ_EINGEBAUT`
kannte keine `vollmachtBmj#`-Kennung. Zum Vergleich: `PV_BMJ`/`KI_KORPUS` haben ihre `sektion`
bereits im eingebauten Satz (`pvBmj#pv_situationen.sektion` u. a., 23 bzw. mehrere Einträge) —
VOLLMACHT_BMJ hatte null.

## Was „der Ort ist da" genau bedeutet — empirisch geprüft, nicht angenommen

Die naheliegende Annahme wäre, eine Migration müsse den Inline-Text aus der Felddefinition entfernen
(wie `tools/textsatz-umstellen.js` es für Sektoren tut). **Das ist hier NICHT nötig**, und das ist
kein Bequemlichkeitsschluss, sondern nachgemessen: `_TEXTSATZ_ZURUECK` löscht den aktuellen Wert
eines Knotens IMMER, wenn `TEXTSATZ_EINGEBAUT` die Kennung kennt — unabhängig davon, ob der Wert
gerade von einem Modul stammt oder noch der ursprüngliche Inline-Text ist. Jeder Depot-Boot
(`textsatzNeuAnwenden`) läuft ZURÜCKNEHMEN vor FÜLLEN. Die Kennung im eingebauten Satz ist damit
allein hinreichend, damit ein Knoten „umgestellt" gilt — dasselbe Muster, das PV_BMJ/KI_KORPUS bereits
zeigen (ihr `sektion` steht inline UND im Satz).

**Der Beweis steht im Test, nicht nur im Kommentar**
(`tests/u2-adr-338-vollmacht-bmj-schluessel.test.js`, Rot-Beweis): ein Test-Modul dockt an, überschreibt
`sektion`/`frage`/`feld.label` sichtbar — und die Rücknahme (Sprache zurück auf Deutsch) stellt das
ORIGINAL zeichengenau wieder her, ohne dass am Quelltext etwas entfernt wurde.

## Drei Kennungsräume, keiner neu erfunden

```
vollmachtBmj#<feldId>.sektion   Schritt-Ebene, ueber _textsatzAufSchrittsatzAnwenden
vollmachtBmj#<feldId>.frage     Schritt-Ebene, dieselbe Funktion
vollmacht:<feldId>.label        Feld-Ebene, ueber _textsatzAufVollmachtBmjAnwenden
```

`vollmacht:` ist ein eigener Namensraum, weil dieselbe (feldId, wert)-Kombination in
`vorsorge.vorsorge_instrumente/<feldId>/<wert>.label` einen ANDEREN Text trägt (generisches UI-Label
vs. amtliche Dokument-Klausel) — Kommentar im Kern seit U2-ADR-112-Nachtrag, hier nur genutzt, nicht
neu entschieden. Eine eigene Probe hält fest, dass die Options-Labels (`.../ja.label`) ein anderer
Knoten sind als das Feld-Label selbst und von dieser Migration unberührt bleiben.

## Zahl und Werkzeug

25 Schritte × 3 Arten (`sektion`, `frage`, `feld.label`) = **75 Kennungen, 57 verschiedene Wortlaute**
(Sektionsüberschriften wiederholen sich gruppenweise — „Vermögenssorge" trägt acht Schritte). Gehoben
mit `tools/vollmacht-bmj-schluessel-heben.js` (neu, versioniert, `--probe`-Modus): liest die aktuellen
Werte aus dem geladenen Kern, prüft gegen Doppel-Eintrag, schreibt beide Zieldateien. Keine Handarbeit
an der 40 000-Zeilen-Datei — derselbe Grund wie bei `textsatz-umstellen.js`: ein verlorenes Zeichen in
einer Rechtsklausel fällt nicht auf, es sieht nur etwas anders aus.

## Kein englischer Wortlaut — die Auflage hält

Alle 75 Kennungen stehen in `tools/textsatz-en-juristisch-offen.js` (`OFFEN_JURISTISCH`, 121 → 196),
keine einzige in einer der drei `textsatz-en-*.js`-Quellen. Zwei Proben halten das fest: „keine
Übersetzung" und „alle im Rückstand geführt" (sonst führe die Vollständigkeitsprobe des EN-Moduls sie
stillschweigend als vergessen statt als bewusst offen). Die Ratsche in
`tests/textsatz-en-modul-erzeugen.test.js` ist auf 196 angehoben, mit Begründung im Kommentar —
kein stiller Zuwachs, sondern der benannte Grund, aus dem der Test existiert.

**Warum die Zahl steigen darf, ohne die Ratsche zu entwerten.** U2-ADR-322 legt für denselben
Mechanismus fest: „Die 134 sind ein Rückstand, kein Zustand. Die Menge darf nie wachsen und soll
schrumpfen." Das gilt unverändert — für Kennungen, die BEREITS andockbar waren. Die 75 hier waren es
vorher nicht: `TEXTSATZ_EINGEBAUT` kannte keine `vollmachtBmj#`-Kennung, der Lauf fand nichts, und
eine Kennung, die kein Modul erreichen kann, kann auch keinen Rückstand bilden — sie war für den
Textsatz unsichtbar, nicht übersetzt. Von 121 auf 196 ist darum kein Wachsen des Rückstands, sondern
das Sichtbarwerden eines Rückstands, den es strukturell schon vorher gab, aber die Zählung nicht
erreichte. Ab heute gilt für alle 196 dieselbe Regel wie für die ursprünglichen 121: nie wachsen,
soll schrumpfen.

## Konformität

```yaml
konformitaet:
  - aussage: >-
      VOLLMACHT_BMJ.steps[].sektion, .frage und .feld.label sind über den Textsatz andockbar — ein
      Sprachmodul kann sie setzen, ohne eine Zeile im Kern zu ändern. Das gilt für die verbliebenen,
      noch nicht juristisch geprüften Kennungen — welche das sind, hält
      `tools/textsatz-en-juristisch-offen.js` fest, nicht eine Zahl hier (acht der ursprünglich 75
      sind seit U2-ADR-344 übersetzt, s. Nachtrag unten mit Datum und Stand).
    zustand: erfuellt
    herkunft: U2-ADR-338 (06.09.2026), Lauf bereits vorhanden seit U2-ADR-112-Nachtrag/U2-ADR-333;
      Zahl aus der Zusicherung entfernt, weil der Testtitel keine mehr trägt — eine bewegliche Zahl
      gehört in die erzählende Nachtrag-Prosa mit Datum, nicht in die Klausel, die der Wächter hält
      (Fund, 17.09.2026)
    pruefung:
      - tests/u2-adr-338-vollmacht-bmj-schluessel.test.js
        "[U2-ADR-338] die verbliebenen gehobenen Kennungen stehen als nichtleerer String im eingebauten Satz"
      - tests/u2-adr-338-vollmacht-bmj-schluessel.test.js
        "[U2-ADR-338·Rot-Beweis] ein angedocktes Modul erreicht sektion/frage/feld.label — und die Rücknahme stellt das Original wieder her"

  - aussage: >-
      Keine der verbliebenen Kennungen trägt eine englische Übersetzung — Wortlaute mit Rechtsfolge
      aus einem amtlichen BMJ-Formular werden nicht ohne juristische Prüfung eingesetzt.
    zustand: erfuellt
    herkunft: U2-ADR-338 (06.09.2026); Zahl aus der Zusicherung entfernt, s. Klausel oben (Fund,
      17.09.2026)
    pruefung:
      - tests/u2-adr-338-vollmacht-bmj-schluessel.test.js
        "[U2-ADR-338] keine der verbliebenen Kennungen hat eine englische Übersetzung — die Auflage hält"

  - aussage: >-
      Die Lücke bleibt sichtbar gezählt statt versteckt: jede Kennung aus dem eingebauten Satz
      (`AB_WERK_TEXTSATZ_DE`), die das EN-Modul nicht selbst trägt, steht im geführten Rückstand
      (`OFFEN_JURISTISCH`) — keine fällt unsichtbar durch die Vollständigkeitsprobe des EN-Moduls,
      und der Rückstand selbst besteht nur aus Kennungen, die es wirklich gibt, und wächst nicht.
      Das gilt für ALLE drei Kennungsarten (`.sektion`, `.frage`, `.label`), weil die Quelle hier der
      vollständige eingebaute Satz ist, nicht die Bündel-Laufzeit.
    zustand: erfuellt
    herkunft: U2-ADR-338 (06.09.2026); umformuliert von „alle 75/67 stehen im Rückstand" (Testtitel
      existiert nicht mehr) auf die eigentliche Zusicherung dahinter — Sichtbarkeit statt Zählung —,
      und bewusst auf `AB_WERK_TEXTSATZ_DE`/`OFFEN_JURISTISCH` gegründet statt auf `kandidaten()`
      (Fund, 17.09.2026 — nach Messung: die
      naheliegende `kandidaten()`-gestützte Klausel unten ist seit U2-ADR-344 für alle 25
      `.sektion`-Kennungen blind — gemessen 50 gegen 50, aber ohne Überschneidung bei `.sektion`,
      s. Klausel unten — und hätte die Zusicherung nicht wirklich getragen)
    pruefung:
      - tests/textsatz-en-modul-erzeugen.test.js
        "[EN-Modul] deckt ALLE Kennungen aus AB_WERK_TEXTSATZ_DE ab — bis auf den benannten Rueckstand"
      - tests/textsatz-en-modul-erzeugen.test.js
        "[EN-Modul·Rueckstand] jede offen gefuehrte Kennung existiert wirklich"
      - tests/textsatz-en-modul-erzeugen.test.js
        "[EN-Modul·Rueckstand] der Rueckstand waechst nicht"

  - aussage: >-
      Zusätzlich, enger gefasst: jede aus dem LIVE-Bündel (`VOLLMACHT_BMJ.steps`, wie ein frischer
      Kernel es zur Laufzeit sieht) extrahierbare Kennung ist entweder im Rückstand geführt oder
      übersetzt — keine fällt unsichtbar durch, SOWEIT die Live-Extraktion sie überhaupt sieht.
    zustand: bekannte-grenze
    herkunft: U2-ADR-338 (06.09.2026); `zustand` von `erfuellt` auf `bekannte-grenze` korrigiert,
      weil `kandidaten()` (die Quelle dieser engeren Probe) seit U2-ADR-344 (Bündel-Umzug der
      Schritte) `.sektion` auf einem frischen, undockten Kernel strukturell nicht mehr sieht —
      gemessen: `kandidaten()` liefert heute 50 Einträge (25×`.frage`, 25×`.label`, 0×`.sektion`),
      `OFFEN_JURISTISCH`s VOLLMACHT_BMJ-Anteil hat ebenfalls 50 (25×`.sektion`, 25×`.frage`), keine
      Überschneidung bei `.sektion` — der Test unten kann für diese 25 Kennungen strukturell nicht
      rot werden, nicht weil sie sicher im Rückstand stehen, sondern weil er sie nie sieht. Die
      Klausel oben trägt die eigentliche Zusicherung vollständig; diese hier bleibt als die engere,
      zusätzliche Probe stehen, mit ihrer Grenze benannt statt verschwiegen (Fund,
      17.09.2026 — Korrektur an
      `kandidaten()` selbst zurückgestellt, bis der laufende Umbau, der `VOLLMACHT_BMJ.steps` aus
      dem Bündel löst, abgeschlossen ist — eine Korrektur gegen den Bündel-Pfad wäre sonst Arbeit an
      einem Weg, den es danach nicht mehr gibt; als eigener Posten nach dem Umbau vorgemerkt)
    pruefung:
      - tests/u2-adr-338-vollmacht-bmj-schluessel.test.js
        "[U2-ADR-338] jede aus dem Bündel extrahierbare Kennung ist ENTWEDER im Rückstand ODER übersetzt — keine fällt unsichtbar durch"

  - aussage: >-
      Die Rücknahme (Sprache zurück auf Deutsch) stellt den ursprünglichen Wortlaut zeichengenau
      wieder her — kein Zeichenverlust durch die Migration, obwohl der Inline-Text nicht entfernt
      wurde.
    zustand: erfuellt
    herkunft: U2-ADR-338 (06.09.2026), empirisch geprüft (nicht nur aus dem Quelltext gefolgert)
    pruefung:
      - tests/u2-adr-338-vollmacht-bmj-schluessel.test.js
        "[U2-ADR-338·Rot-Beweis] ein angedocktes Modul erreicht sektion/frage/feld.label — und die Rücknahme stellt das Original wieder her"
```

## Nachtrag (06.09.2026 abends): der Schlüssel-Weg überlebt den Bündel-Umzug — empirisch geprüft

Nach diesem ADR zog U2-ADR-344 `VOLLMACHT_BMJ.steps` selbst ins Bündel (`steps:
_textsatzAufVollmachtBmjAnwenden([])` an der Deklaration, live gefüllt aus `_BUENDEL_DOKUMENTE`
via `.splice()`). **Das Bündel trägt `frage` roh mit, aber KEIN `sektion`** — ein frischer,
undockter Kernel liest `st.sektion` darum als `undefined`.

**Das ist keine Regression — geprüft, nicht angenommen:** ein echter Dock-Test (Testmodul mit
`vollmachtBmj#vm_gesundheit_entscheiden.sektion`/`.frage` und `vollmacht:vm_gesundheit_
entscheiden.label` einlassen, `textsatzNeuAnwenden()`, Werte lesen, zurücknehmen) zeigt: **alle
drei Kennungen erreichen den Live-Knoten nach wie vor korrekt, und die Rücknahme stellt das
amtliche Original zeichengenau wieder her** — der allgemeine `_textsatzOrteBegehen`-Durchlauf
(unverändert seit vor U2-ADR-344) läuft weiterhin über das jetzt bündel-gefüllte
`VOLLMACHT_BMJ.steps` bei jedem `textsatzNeuAnwenden()`-Aufruf, unabhängig von der separaten,
einmaligen Nachfüllung direkt nach dem Bündel-Splice. `TEXTSATZ_EINGEBAUT` ist für `sektion`
dadurch von einer reinen Override-Quelle zur EINZIGEN Quelle geworden — der Schlüssel-Weg trägt
jetzt mehr Gewicht als vorher, nicht weniger. Das ist ein eigener Befund dieses Nachtrags, kein
bloßes „gilt weiterhin unverändert".

**Eine der eigenen Proben brauchte deshalb eine Korrektur, kein bloßes Update:** zwei Tests hielten
`kandidaten()` — eine LIVE-Extraktion aus `V.VOLLMACHT_BMJ.steps` — gegen `TEXTSATZ_EINGEBAUT`. Das
war eine Probe, die ihren Gegenstand mitwandern ließ, statt ihn festzuhalten: als der Bündel-Umzug
die Form des Gegenstands änderte (kein `sektion` mehr roh), änderte sich lautlos auch das, was die
Probe maß — sie hätte einen echten Verlust ebenso wenig gemeldet wie diese harmlose Verschiebung.
Beide Proben prüfen jetzt die FESTE Kennungsliste aus `OFFEN_JURISTISCH` gegen `TEXTSATZ_EINGEBAUT`
— unabhängig davon, welche Felder ein künftiger Bündel-Umbau roh mitträgt.

**Ein Nebenfund dabei, bereinigt:** U2-ADR-344 übersetzte acht der 75 Kennungen bereits
(`vollmacht:*.label`, kurze Feldnamen ohne Rechtsfolge — `vm_aufenthalt_bestimmen`,
`vm_vermoegen_verwalten/-verfuegen/-verbindlichkeiten/-ausschluss`, `vm_gericht`, `vm_tod_hinaus`,
`vm_weitere_regelungen`), weil das native `feld.label` beim Umzug ihre einzige Auflösungsquelle
war. Der Rückstands-Eintrag dazu war stehen geblieben — jetzt aus `OFFEN_JURISTISCH` entfernt.
**Der unmittelbar vorherige Stand war 158** (196 nach diesem ADR selbst, dann 158 nach U2-ADR-343s
36+2-Entnahme — nicht 196, das wäre der Stand vor U2-ADR-343 gewesen und hätte diesen Zug
übersprungen), **jetzt 150** (158 − 8, nachgerechnet, nicht nur addiert). Keine der übrigen 67
Kennungen (alle `.sektion`/`.frage`, plus die verbliebenen 17 `.label`) trägt eine Übersetzung.

## Was dieser Zug NICHT tut

- **Er übersetzt keinen einzigen Wortlaut.** Das bleibt Aufgabe eines Juristen, nicht dieser Sitzung —
  exakt die Auflage des Auftrags.
- **Er hebt `VOLLMACHT_MODUL.optLabel`s Abhängigkeit von `VOLLMACHT_BMJ.steps` nicht separat** — die
  bestehende Nachschlage-Beziehung (Kommentar an `VOLLMACHT_BMJ`) ist unverändert; sie liest jetzt nur
  ein potenziell fremdsprachiges `feld.label`, was der Zweck der Übung ist.
- **Er entfernt die Inline-Werte nicht aus `VOLLMACHT_BMJ.steps[]`** — bewusst, s. Abschnitt oben; das
  wäre eine andere, unnötig riskantere Migration für denselben Effekt.
