# U2-ADR-429: Ein Depot trägt seine Sprache, und die Bürgerin schaltet unter den vollen Sprachen um

**Status:** Angenommen — gebaut
**Datum:** 21.09.2026
**Kategorie:** SPRACHE, PRODUKT
**Linie:** U2
**U2-Bezug:** U2-ADR-426 (das Gerüst trägt keinen vollen Sprachsatz) · U2-ADR-141 (Anzeigetexte als
austauschbarer Satz) · U2-ADR-363 §1 (die Kennung statt stiller Übersetzung) · U2-ADR-331 (Zusicherungen
gehören der Anwendung)
**Anker:** Entscheidung 20.09.2026: „wenn alles mitreist, muss auch die deutsche Sprache mitreisen, und sie
müsste dann beim Öffnen umschalten können.“
**Status heute:** gilt — gebaut und belegt.

---

## Kontext

Die Datei bringt ihr Sprachmodul mit (Mitschrift `abWerkMitschrift.sprache`). Gemessen am 20.09.2026: ein
Depot aus dem englischen Produkt, im deutschen geöffnet, behielt seine Inhalte und trug sein englisches Modul —
zeigte sich aber auf Deutsch. `textsprache` war im Depot nicht gesetzt, die aktive Sprache folgte dem Produkt;
der Sprachschalter vor dem Depot überlagert nur die Schirme davor; in den Einstellungen gab es nur das Einlesen
einer Modul-Datei. Das Modul lag in der Datei der Bürgerin, und sie konnte es nicht aktivieren.

## Entscheidung

1. **Ein Depot trägt seine Sprache.** Beim Anlegen und Speichern steht die Sprache des Produkts, in dem das
   Depot entsteht, in `data.textsprache`, sofern das Produkt eine Sprache einbackt. Eine spätere Wahl der
   Bürgerin bleibt unberührt.
2. **Die Bürgerin wählt unter den vollen Sprachen.** In den Einstellungen, neben dem Einlesen einer Modul-Datei,
   steht eine Auswahl unter den Sprachen, die die Registry voll trägt. Voll heißt: das Fach trägt mindestens neun
   Zehntel der Kennungen des größten Fachs. Die kleine Teilmenge vor dem Depot ist kein Angebot; ohne zweite volle
   Sprache erscheint keine Auswahl. Die Wahl wirkt sofort und steht im Depot.
3. **Der Sprachschalter vor dem Depot gilt für ein Depot ohne eigene Sprache**, wenn dessen Registry die Sprache
   voll trägt.
4. **Keine neuen Wörter im Gerüst.** Die Namen der Sprachen kommen aus `Intl.DisplayNames`, je in der eigenen
   Sprache; die Überschrift ist der vorhandene Anker „Language / Sprache“.

## Grenzen — ausgeschrieben

- Deutsch reist erst, wenn es ein Sprachmodul ist (Schnitt „Deutsch als Modul“, U2-ADR-426). Ein englisches Depot
  kann im deutschen Produkt auf Englisch umschalten; ein deutsches Depot im englischen Produkt hat sein Deutsch
  nicht dabei, bis dieser Schnitt gelandet ist.
- Eine Sprache, deren Fach fehlt, zeigt weiter die Kennung (U2-ADR-363 §1); die Auswahl bietet sie nicht an, und
  `textsatzSpracheWaehlen` lehnt sie ab.
- Zusicherungssätze setzt weiter kein Modul aus der Datei (U2-ADR-331): im fremden Produkt stehen sie in der
  Sprache der Anwendung mit der sichtbaren Ersatzkennzeichnung.

Nachsehen: `tests/sprache-umschalten.test.js` und `tests/produkt-wechsel-en-nach-de.test.js`.

---

*Vivodepot GmbH · Berlin · 21.09.2026*
