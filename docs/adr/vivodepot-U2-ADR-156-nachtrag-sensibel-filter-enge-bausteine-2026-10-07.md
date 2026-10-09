# U2-ADR-156-Nachtrag — Sensibel-Filter: jeder enge Baustein, ausgenommen die drei Ab-Werk-Blätter

**Status:** Angenommen (07.10.2026, Wort der Gegenlesung vor dem Bau)
**Datum:** 2026-10-07
**Bezug:** U2-ADR-156 §3 (der Sensibel-Filter bindet die engen Bausteine), U2-ADR-128 Zug 2 und U2-ADR-435 (Angehörigen-Blätter:
die Aufnahme ins Blatt ist die Vertrauensgrenze), U2-ADR-012 §4 und U2-ADR-126 (sensible Felder werden zurückgehalten)
**Linie:** U2

**Status heute:** gilt. Die Belege stehen im `konformitaet`-Block unten.

---

## Anlass

§3 sagt: Der Sensibel-Filter bindet die engen Bausteine eines Fachs, nur der weite Erbfall-Baustein ist ohne ihn. Gebaut war das
nur für die situationslokalen Felder. Sektorfelder gingen ungefiltert ins Fach. Das betraf zwei Arten enger Bausteine:

- **Die Bereichs-Bausteine** (`bereich:<id>`, seit 23.09.2026). Sie geben jedes Feld eines Bereichs frei, das gerade darin
  steht. Eine kuratierte Liste, die als Grenze dienen könnte, gibt es dort nicht. Dass sensible Felder hier ins Fach gingen, war
  von keiner Entscheidung gedeckt (Befund SENSIBEL-FILTER-BEREICHSBAUSTEIN, HOCH).
- **Die Ab-Werk-Blätter** Notfall, Pflege und Bestattung. Ihre Felder stammen aus einer kuratierten Blattliste. Für diese Blätter
  ist entschieden, dass die Aufnahme ins Blatt die Vertrauensgrenze ist (U2-ADR-128 Zug 2, U2-ADR-435). Die Halterin gibt deren
  Inhalt bewusst mit, auch markierte Diagnosen im Notfall-Blatt.

Weg zum Nachsehen: `grep -n "const EMPFAENGER_BLATT_OHNE_SENSIBEL_FILTER\|function empfaengerSensibelFilterGilt\|function _empfaengerSektorWertOhneSensibel" vivodepot.html`.

## Entscheidung

1. **Jeder enge Baustein läuft durch den Sensibel-Filter**, auch ein Baustein, den ein Modul künftig mitbringt. Geprüft wird über
   dieselbe Prüfung wie in jedem Ausgabeweg (`feldIstSensibel`), mit den Markierungen des Inhalts, der geschrieben wird. Das gilt
   für ganze Felder, für sensible Unterfelder einer Liste und für angedockte Felder.
2. **Ausgenommen sind allein die drei Ab-Werk-Blätter** Notfall, Pflege und Bestattung. Sie stehen in einer Positivliste mit
   Deckel 3 (`EMPFAENGER_BLATT_OHNE_SENSIBEL_FILTER`), je mit ADR-Verweis und Grund. Jede weitere Ausnahme ist eine Lockerung und
   braucht ein Wort der Gegenlesung. Der Deckel steht im Zählerregister. Die Ausnahme befreit nur vom Sensibel-Filter, von keiner
   anderen Schutzregel der Fächer.
3. **Freigeben** kann die Halterin ein Feld wie in jedem anderen Ausgabeweg über die Markierung selbst. Ein freigegebenes Feld steht
   im Fach.
4. **Ein schon geschriebenes Fach** wird beim nächsten Speichern aus dem Zuschnitt neu gebildet. Ab dann fehlt, was jetzt sensibel ist.
   Ein Fach, das schon weitergegeben wurde, bleibt in fremder Hand, wie es war. Die Halterin gibt das neue weiter.

§3 gilt damit in dieser Lesart: „Der Sensibel-Filter bindet die engen Bausteine, ausgenommen die drei Ab-Werk-Blätter, deren
Aufnahme ins Blatt die Vertrauensgrenze ist.“

## Erwogen und verworfen

- **Auch die Blatt-Bausteine filtern:** Das hätte im Notfall-, Pflege- und Bestattungs-Fach Inhalte gestrichen, die die Halterin
  nach U2-ADR-128 und U2-ADR-435 bewusst mitgibt.
- **Felder ohne Definition zurückhalten** (wie im feldweisen Vollexport): Das weicht von den Formatwegen ab, in denen ohne
  Definition allein die Markierung der Halterin entscheidet. Zwei Regeln wären zwei Gelegenheiten, verschieden zu entscheiden.

```yaml
konformitaet:
  - aussage: >-
      Ein enger Baustein hält sensibel markierte Sektorfelder und Unterfelder aus dem Fach zurück; ein freigegebenes Feld steht darin;
      geschrieben wird mit den Markierungen des Inhalts, der geschrieben wird.
    zustand: erfuellt
    herkunft: U2-ADR-156-Nachtrag Sensibel-Filter (07.10.2026)
    pruefung:
      - tests/empfaenger-sensibel-filter.test.js "[Sensibel-Filter·Befund] ein Bereichs-Baustein hält ein ab Werk sensibles Feld zurück und gibt ein freigegebenes heraus"
      - tests/empfaenger-sensibel-filter.test.js "[Sensibel-Filter·Befund] eine Markierung der Halterin wirkt wie das Schema-Flag; Unterfelder einer Liste fallen je Zeile heraus"
      - tests/empfaenger-sensibel-filter.test.js "[Sensibel-Filter·Quelle] geschrieben wird mit den Markierungen des Inhalts, der geschrieben wird — nicht des offenen Depots"
      - tests/empfaenger-sensibel-filter.test.js "[Sensibel-Filter·Abnahme] das Fach, mit seinem Passwort geöffnet, trägt das sensible Feld nicht — die Inhaberin sieht es"
  - aussage: >-
      Ein schon geschriebenes Fach wird beim nächsten Speichern neu gebildet.
    zustand: erfuellt
    herkunft: U2-ADR-156-Nachtrag Sensibel-Filter (07.10.2026)
    pruefung:
      - tests/empfaenger-sensibel-filter.test.js "[Sensibel-Filter·Neu versiegeln] ein schon geschriebenes Fach wird beim nächsten Speichern neu gebildet"
  - aussage: >-
      Jeder enge Baustein außerhalb der Positivliste der drei Ab-Werk-Blätter läuft durch den Filter; die Liste hat den Deckel 3,
      je Eintrag einen ADR-Verweis und einen Grund.
    zustand: erfuellt
    herkunft: U2-ADR-156-Nachtrag Sensibel-Filter (07.10.2026)
    pruefung:
      - tests/empfaenger-sensibel-filter.test.js "[Sensibel-Filter·Klasse] jeder enge Baustein außerhalb der Blatt-Positivliste läuft durch den Filter"
      - tests/empfaenger-sensibel-filter.test.js "[Sensibel-Filter·Klasse·Rot-Beweis] ein enger Baustein ohne Filter fällt dem Wächter auf; das Prädikat greift für jeden neuen"
      - tests/empfaenger-sensibel-filter.test.js "[Sensibel-Filter·Positivliste] genau drei Ab-Werk-Blätter, je mit ADR-Verweis und Grund — jede weitere ist eine Lockerung"
```
