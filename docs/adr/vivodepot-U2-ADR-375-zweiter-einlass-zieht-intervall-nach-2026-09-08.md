# U2-ADR-375: der zweite Einlass zieht das Intervall nach — außer die Bürgerin hat abgeschaltet

**Status:** Angenommen (25.09.2026)
**Datum:** 08.09.2026
**Kategorie:** ARCHITEKTUR, PRODUKT
**Linie:** U2
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `logikModulPruefterminAnlegen`, der Dedup-Zweig (statt eines
  reinen `some(...)`-Checks jetzt `find(...)` + bedingte In-place-Aktualisierung).
- **ADR-Bezug:** U2-ADR-373 (Annahme ist der Einlass, dort entstand die Lücke), U2-ADR-370
  (die Schema-Bindung/erste Dedup-Fassung, die diesen Fall noch nicht kannte).
- **Status heute:** gilt — Belege im `konformitaet`-Block unten.

**Anlass:** Nach der Abnahme von U2-ADR-373 gemessen: eine Lücke, die keine der fünf damaligen
Proben deckte: ein ZWEITER Einlass desselben Moduls (neuere `moduleVersion`), NACHDEM die
Bürgerin ihren Termin bereits abgeschaltet hatte. Der bestehende Dedup (`if (bestehende.some(doc
=> doc.typ === typ)) return null`) ließ den Datensatz unberührt — richtig für die Abschaltung,
aber derselbe Code hätte auch eine tatsächlich gewollte Intervall-Änderung (Gesetzesänderung,
12→6 Monate) nie durchgereicht. Eine „Verbesserung" des Dedup durch jemanden, der das Nachziehen
nachrüsten wollte, hätte die Abschaltung der Bürgerin still zurückgedreht, ohne dass eine Probe
rot geworden wäre — die gefährlichste Art Lücke, weil sie sich erst beim zweiten Einlass zeigt.

**Produktentscheidung, wörtlich zugrunde gelegt:** „Das Modul bestimmt das WAS, die
Bürgerin das OB."

| Zustand des bestehenden Termins | neuere Fassung liefert Intervall | Ergebnis |
|---|---|---|
| aktiv (`pruefIntervallMonate > 0`) | ein beliebiges | wird ÜBERNOMMEN |
| abgeschaltet (`pruefIntervallMonate` fehlt/`0`) | ein beliebiges | bleibt abgeschaltet, IMMER |
| kein bestehender Termin | — | wie U2-ADR-370/373 (neu angelegt) |

Eine ältere Fassung ändert nichts — das war bereits vorher so (`modulEinlassen` ruft
`logikModulPruefterminAnlegen` nur bei `'neu'`/`'aktualisiert'` auf, nie bei `'aeltere-fassung'`),
gilt jetzt ausdrücklich auch fürs Intervall (eigene Probe, s. u.).

**Bau:** der reine `some(...)`-Dedup wurde durch `find(...)` ersetzt; existiert bereits ein
Termin für `typ`, wird sein `pruefIntervallMonate` NUR dann auf den neuen Wert gesetzt, wenn er
aktuell `> 0` ist — sonst bleibt er unverändert. Kein neuer Datensatz entsteht in diesem Zweig,
die Aktualisierung geschieht IN PLACE am bestehenden Objekt (dasselbe `d`/`ziel`-Objekt wie beim
Anlegen, U2-ADR-373). Der Grund steht als Kommentar direkt am Riegel im Code, nicht nur im ADR:
die 0 ist kein Zahlwert, sondern die Entscheidung der Bürgerin, und die gewinnt gegen jede
Modulfassung.

**Wächter mit rotem Beweis, beide Richtungen** (`tests/logik-modul-zweiter-einlass-intervall.test.js`):
- Rot-Beweis 1/2: abgeschaltet (0) + neuere Fassung mit Intervall 6 → bleibt 0. Gegenprobe am
  eigenen Bau durchgeführt: mit entferntem Riegel schlägt exakt diese Probe fehl (`6 !== undefined`).
- Rot-Beweis 2/2: aktiv (12) + neuere Fassung mit Intervall 6 → steht danach auf 6.
- Gegenprobe: eine ältere Fassung ändert auch das Intervall nicht (12 bleibt 12).
- Zusätzlich: gleiches Intervall in der neueren Fassung bleibt fehlerfrei beim Wert.

**Was dieser Zug ausdrücklich nicht entscheidet:** ob/wie eine Bürgerin über eine nachgezogene
Intervall-Änderung informiert wird (still im Hintergrund vs. sichtbare Meldung) — reine
Datenmodell-Entscheidung, keine UI-Anbindung existiert für diesen Pfad heute.

## Konformität

```konformitaet
aussage:  Der zweite Einlass einer neueren Fassung zieht das Prüf-Intervall nach — außer es ist abgeschaltet; eine ältere Fassung ändert es nicht.
zustand:  geprüft
herkunft: Entscheidung vom 08.09.2026
pruefung: tests/logik-modul-zweiter-einlass-intervall.test.js#[U2-ADR-375·Rot-Beweis 1/2] ABGESCHALTET (0) + neuere Fassung mit Intervall 6 → bleibt 0
pruefung: tests/logik-modul-zweiter-einlass-intervall.test.js#[U2-ADR-375·Rot-Beweis 2/2] AKTIV (12) + neuere Fassung mit Intervall 6 → steht danach auf 6
pruefung: tests/logik-modul-zweiter-einlass-intervall.test.js#[U2-ADR-375·Gegenprobe] eine ÄLTERE Fassung ändert auch das Intervall nicht
```
