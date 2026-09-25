# U2-ADR-108: Je Schema-Sprung eine Probe — und der nächste Bump bringt seine mit

**Status:** Angenommen
**Datum:** 26.07.2026
**Kategorie:** PRÜF-ARCHITEKTUR, DATENMODELL
**Linie:** U2
**U2-Bezug:** U2-ADR-100 §8 (migrationsfreies Fenster) · U2-ADR-099 (Prüfstand) ·
U2-ADR-104 (Schema 41) · U2-ADR-106 (kein Verweis ohne Ziel)
**Anker:** Bilanz-Posten 8 („10 von 17 Migrations-Sprüngen ohne Test", Rang 1, L) — mit Schema 41
sind es achtzehn
**Status heute:** gilt — Beleg `tests/migration-stufen.test.js`, `tests/schema-governance-guard.test.js`.

---

## Kontext

Die Kette **24 → 41** ist achtzehn Stufen lang und lückenlos. Geprüft war die Minderzahl: ein Depot
migrierte über zehn Stufen, **ohne dass eine Probe den Weg belegte**. Ein Migrationsfehler wäre
erst am Gerät aufgefallen — an fremden Daten, nach dem Schließen des Fensters.

Achtzehn einzeln geschriebene Tests hätten das Symptom behandelt: achtzehnmal dasselbe Gerüst, und
die neunzehnte Stufe wieder teuer.

## Entscheidung

**1 — Eine Registry statt achtzehn Tests.** `tests/fixtures/migrations-stufen.js` trägt je Sprung
einen Eintrag: was die Stufe verspricht, ein konstruiertes Alt-Depot, und zwei Prädikate.

**2 — Die gekoppelte Kontrolle steckt in der Form**, nicht in einem Zusatz-Test je Stufe. Jeder
Eintrag nennt `vorher` **und** `nachher`. Auf dem Alt-Depot muss `vorher` **wahr** und `nachher`
**falsch** sein — nach der Migration umgekehrt. **Fiele eine Stufe aus, wäre der Zustand danach
derselbe wie davor, und die Probe würde rot.** Das ist keine Behauptung: ein eigener Wächter prüft
für **jede** Stufe, dass der Alt-Zustand wirklich vorliegt und der Zielzustand vorher noch **nicht**
galt. Ein Fixture, das den Zielzustand schon mitbringt, wäre vakuum-grün und fällt auf.

**3 — Die Governance liegt im bestehenden Wächter**, nicht in einer zweiten Datei daneben.
`schema-governance-guard.test.js` trägt schon Lückenlosigkeit, Monotonie, Durchlauf und Idempotenz;
die Forderung „kein Sprung ohne Eintrag" gehört dorthin. Die Kette wird aus der **Quelle** gelesen,
nicht aus einer gepflegten Liste — eine Liste könnte veralten, ohne dass es auffällt, und genau das
war der behobene Zustand.

**4 — Die Verwaisungsregel je Stufe**, als **Erweiterung** von
`migration-keine-neuen-waisen.test.js`. Dieselbe Regel läuft jetzt über **jedes** Registry-Fixture:
jeder Blatt-String, der vor der Migration im Depot stand, ist danach irgendwo wiederzufinden.
„Irgendwo" ist Absicht — Werte **dürfen** wandern (genau das tun die Listen-Umbauten), sie dürfen
nur nicht verschwinden.

## Konsequenzen — die Bilanz, benannt statt geglättet

| Klasse | Anzahl |
|---|---|
| mit eigener Probe | **15** |
| über eine eigene Testdatei (`geprueftIn`) | **2** (Stufen 40, 41) |
| **überflüssig, gemessen und als Probe gepinnt** | **1** (Stufe 28) |
| **gesamt** | **18** |

Beide Zahlen — die nicht prüfbaren und die erlaubten Verluste — sind **gepinnt**: sie können nicht
still wachsen, und jede braucht einen gemessenen Grund.

### Stufe 28 — überflüssig, nicht tragend-und-ungeschützt

**„Nicht eigenständig beobachtbar" zerfällt in zwei Fälle, und nur einer ist harmlos:** entweder ist
die Stufe **überflüssig** (die Folgestufe täte dasselbe), oder sie ist **tragend, aber ungeschützt**
(die Folgestufe *setzt voraus*, dass sie lief). Der zweite Fall wäre der gefährliche — etwas, das
trägt, und nichts macht es rot, wenn es kaputtgeht.

**Gemessen, mit Positivkontrolle:** ein Depot, das als Schema 28 deklariert ist, aber noch die
Vor-28-Form trägt, läuft an Stufe 28 **vorbei** — Stufe 29 bekommt den String direkt. Das Ergebnis
ist **identisch** zum Lauf ab 27. Also der harmlose Fall.

Die Stufe bleibt als defensive Doppelung stehen; eine Migrationsstufe zu entfernen wäre mehr Risiko
als Gewinn. **Die Einordnung ist als Probe festgenagelt, nicht als Kommentar:** macht jemand Stufe 29
später von 28 abhängig, wird sie rot — die Klassifikation kann nicht still veralten.

### Der Mechanismus dahinter

Stufe 28 macht aus `vollmachtsGrundlage` (String) ein Array. **Stufe 29 nimmt das Feld direkt danach
auf, schreibt es in `vollmachten` und löscht es** — am Kettenende ist das Feld `undefined`, der Wert
lebt als `art` in der Instrument-Zeile. Und Stufe 29 trägt denselben String→Array-Zweig **selbst**:

```
const arten = Array.isArray(vollmachtsGrundlage) ? … : (String → [String])
```

Die Wirkung von Stufe 28 ist damit **vollständig von ihrer Folgestufe absorbiert** — und weil Stufe 29
den Roh-Zustand selbst normalisiert, ist die Stufe **überflüssig**, nicht tragend. Kein Handlungsbedarf,
aber auch keine leere Zusicherung: die Einordnung selbst ist geprüft.

### Stufe 25 — der einzige erlaubte Verlust

Die Verwaisungs-Prüfung über alle Fixtures meldete genau eine Stelle: Stufe 25 lässt `system` und
`code` eines codierten Werts fallen. **Der Anzeigename überlebt** — das ist der Bürgerwert. Die
Code-Slots von `impfungen`/`implantate` entfielen mit E1–E3; ein Terminologie-Code an einem Slot, den
es nicht mehr gibt, ist kein Bürgerwert. Benannt, begründet, gezählt.

**Kein echter Migrationsfehler gefunden.** Alle fünfzehn Proben halten beim ersten Lauf. Wäre einer
aufgetreten, wäre er **gemeldet und nicht behoben** worden — das wäre ein eigener Posten mit eigener
Abnahme.

**Grenze, ausdrücklich:** alle Depots sind **konstruiert**. Reale Alt-Depots gibt es nicht
(migrationsfreies Fenster). Diese Proben belegen die Migration gegen gebaute Fälle, nicht gegen
Bestand.

## Konformität

```konformitaet
aussage:  Jede Stufe der Schema-Kette löst nach der Migration genau die Zusage ein,
          die sie verspricht, und das Depot landet auf der aktuellen Version.
zustand:  geprüft
herkunft: invariante
pruefung: tests/migration-stufen.test.js#u2-108-jede-stufe-loest-ihre-zusage-ein
```

```konformitaet
aussage:  Für jede Stufe liegt der Alt-Zustand im Fixture wirklich vor UND der
          Zielzustand gilt vorher noch nicht — sonst wäre die Probe vakuum-grün,
          ohne je rot zu werden.
zustand:  geprüft
herkunft: invariante
pruefung: tests/migration-stufen.test.js#u2-108-jede-stufe-ist-vor-der-migration-noch-offen
```

```konformitaet
aussage:  Eine als „überflüssig" geführte Stufe ist es auch: derselbe Ausgangszustand
          kommt mit und ohne sie am selben Ergebnis an. Wäre sie in Wahrheit tragend,
          würde diese Probe rot — die Einordnung kann nicht still veralten.
zustand:  geprüft
herkunft: invariante
pruefung: tests/migration-stufen.test.js#u2-108-eine-uebersprungene-stufe-aendert-nichts-wenn-sie-ueberfluessig-heisst
```

```konformitaet
aussage:  Jeder Sprung der aus der Quelle gelesenen Kette hat einen Registry-Eintrag —
          ein neuer Schema-Bump ohne Probe macht den Lauf rot.
zustand:  geprüft
herkunft: invariante
pruefung: tests/schema-governance-guard.test.js#u2-108-jeder-sprung-der-kette-hat-einen-eintrag
```

---

*Vivodepot GmbH · Berlin · 26.07.2026*
