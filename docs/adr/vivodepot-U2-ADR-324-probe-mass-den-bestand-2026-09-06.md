# U2-ADR-324: Eine Probe, die den nativen Bestand maß und Robustheit versprach

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Betrifft:** `tests/e2e/e4-buendel-wizard-interaktion-abnahme-u2-adr-313.spec.js` (Probe 3 neu
geschnitten, Rot-Beweis ergänzt)

- **Status heute:** gilt — **kein Produktcode geändert.** Ein reiner Proben-Zug.

---

## Warum das gebraucht wird

Probe 3 hieß „Depot OHNE Bündel — der Assistent startet trotzdem, echte Frage, echte (nicht-leere)
Optionsliste". Sie fiel, sobald U2-ADR-320 den nativen Bereichsbestand aus `vivodepot.html` nahm.

**Sie fiel nicht, weil etwas kaputtging. Sie fiel, weil sie nie das geprüft hatte, was ihr Name
sagte.**

```
Titel   "ohne Buendel bricht nichts"          -> eine Robustheits-Zusicherung
Rumpf   oeffneSektor('identitaet')            -> setzt einen BESTAND voraus
        select[data-edit=familienstand]       -> setzt ein KATALOGFELD voraus
        optionen.length > 0                   -> setzt dessen INHALT voraus
```

Solange die dreizehn Bereiche nativ in der Datei standen, fiel das nicht auf: die Substitution
leerte `BUERGERMODUL_BUENDEL`, nicht `SEKTOREN`. **Der Bestand, den die Probe maß, kam von woanders
her als aus dem, was sie zu prüfen vorgab.**

## Die Klasse, nicht nur die Änderung

**Eine Probe, die eine Zusicherung im Titel trägt und im Rumpf etwas anderes misst, ist grün aus
dem falschen Grund.** Sie fällt erst auf, wenn das Fremde unter ihr weggezogen wird — und dann
sieht es aus wie eine Regression, obwohl es eine Offenlegung ist.

Das ist dieselbe Familie wie ein Wächter, der die Landkarte des Werkzeugs abläuft (U2-ADR-322):
**die Deckung stammt nicht aus dem Gegenstand, sondern aus seiner Umgebung.**

## Was geht, und wohin es nicht umzieht

Die Aussage „nicht-leere Optionsliste" gehört an einen Ort mit Bestand — **und dort steht sie
bereits.** Probe 1 derselben Datei prüft sie schärfer, als Probe 3 es je tat:

```
Probe 1   werte.sort() === ['elp','verh']     die erwartete gefilterte Menge
Probe 3   optionen.length > 0                  irgendetwas
```

**Sie wird darum ersatzlos gestrichen, nicht umgezogen.** Ein zweiter, schwächerer Prüfer neben
einem schärferen ist kein Gewinn.

## Was an ihre Stelle tritt

Vier Aussagen, die die alte Probe nie gemacht hat, auf Node-Ebene vorgemessen und im Browser
geprüft:

```
bereicheAlle()                 -> 0    statt Wurf
_katalogOptionen(...)          -> []   statt Wurf
textsatzNeuAnwenden()          -> 0    statt Wurf
_BUERGERMODUL_BUENDEL_BERICHT  -> { angewandt:false, grund:'kein-buendel' }
dazu: keine Konsolen-Fehler, kein pageerror
```

**Leer ist die richtige Antwort, nicht ein Fehlerfall** — aber sie muss leer sein und nicht
irgendetwas.

Die Messung läuft über eine Funktion, die je Leseweg **entweder seinen Wert oder seinen Wurf**
meldet. Ohne diese Form wäre ein werfender Leseweg ein Testabbruch statt eines Befundes, und die
Meldung sagte nicht, welcher Weg warf. Und wie in U2-ADR-322 wird **zuerst** geprüft, ob überhaupt
etwas geantwortet hat: eine Messung, in der jeder Aufruf wirft, sähe sonst in den Einzelproben aus
wie eine, die nichts zu beanstanden hat.

## Der Rot-Beweis sitzt hinter dem Boot — gemessen, nicht Geschmack

Ein Leseweg wird absichtlich zum Werfen gebracht; dieselbe Messfunktion muss ihn benennen.

**Der erste Anlauf mutierte den Quelltext** (`function bereicheAlle()` wirft) — und bewies nichts:
die App kam gar nicht erst hoch, `#w-anlass` erschien nie, der Lauf scheiterte am Startbildschirm
statt an der Messung. **Bewiesen wäre dann gewesen, dass ein kaputter Boot ein kaputter Boot ist.**

Überschrieben wird darum die **laufende** Funktion, nach dem Start. Der Beweis prüft beide Seiten:
gesund antwortet der Weg mit `0`, mutiert kommt der Wurf mit seinem Text an und geht nicht als Wert
durch.

## Nachtrag desselben Tages — eine Wortlaut-Suche ist keine Reichweiten-Messung

Beim Ausbau eines Satzes aus einem anderen ADR wurde dessen Reichweite gemessen. Der Suchlauf über
den **vollen Wortlaut** fand null Treffer:

```
grep -rn "keine zweite Baustelle wert"   ->  0    auch an der eigenen Fundstelle nicht
grep -rn "Felder braucht"                ->  1    die Fundstelle selbst
```

**Der Satz kommt nirgends am Stück vor — er ist im Fließtext über zwei Zeilen umbrochen.** Eine
Null-Treffer-Messung, die ihr eigenes Original nicht findet, hätte „steht nur an einer Stelle"
belegt und dabei nicht einmal diese eine gefunden. Dass die Zahl am Ende stimmte, war Zufall.

**Dieselbe Klasse wie oben und wie in U2-ADR-322: ein Anker, der ins Leere zeigt und still GRÜN
meldet.** Die Regel daraus:

> **Wer nach einem Satz sucht, sucht nach seinem kürzesten unverwechselbaren Stück, nicht nach dem
> Satz.** Ein Wortlaut, der umbrochen sein kann, taugt nicht als Anker — eine Suche darüber misst
> Zeilenumbrüche, nicht Reichweite.

## Folgen

- Die Probe sagt jetzt, was sie prüft, und prüft, was sie sagt.
- Sie überlebt den nächsten Eingriff in den Bestand, weil sie keinen voraussetzt.
- **Kein Produktcode ist geändert.** Wer diese Datei in einem Jahr liest, soll die Klasse erkennen,
  nicht nur die Änderung — darum steht der Grund am Test selbst und nicht nur hier.
