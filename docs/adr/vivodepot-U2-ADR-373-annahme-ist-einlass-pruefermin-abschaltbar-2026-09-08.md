# U2-ADR-373: „Annahme" ist der Einlass — der Modul-Prüftermin entsteht mit ihm und ist danach abschaltbar, nicht löschbar

**Status:** Angenommen (25.09.2026)
**Datum:** 08.09.2026
**Kategorie:** ARCHITEKTUR, PRODUKT
**Linie:** U2
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `modulEinlassen` (ein neuer Aufruf für `reg.typ==='logikModul'`),
  `logikModulPruefterminAnlegen` (jetzt d-fähig, drittes Argument), `dokumentAnlegen` (drittes
  Argument `d`, dieselbe Migrations-Sicherheit wie `_dokumenteRoot`) — `dokumentSetzen` unverändert
  wiederverwendet für das Abschalten, kein Nachbau.
- **ADR-Bezug:** U2-ADR-370 (die Schema-Bindung und die reine, damals noch unverdrahtete Funktion),
  U2-ADR-366 (Teil 2 dort angekündigt, hier eingelöst — nur der Annahme-Teil, nicht die
  Antwort-Ausgabe selbst), U2-ADR-014 (Dokument-Register/Ampel, `dokumentSetzen`).
- **Status heute:** gilt — Belege im `konformitaet`-Block unten.

**Anlass:** U2-ADR-370 baute `logikModulPruefterminAnlegen` bewusst ohne Aufrufer — der
Annahme-Zeitpunkt war offen. Zwei Dinge wurden zurechtgerückt: erstens ist eine
unverdrahtete Funktion ein Provisorium und braucht ein Verfallsdatum im Kern-Kommentar selbst,
nicht nur im ADR; zweitens ist die Sichtbarkeits-/Abschaltbarkeits-Frage keine offene Frage,
sondern bereits entschieden — sie musste nur noch gebaut werden.

**Produktentscheidung, wörtlich zugrunde gelegt:**
1. Vor der Annahme gibt es keinen Prüftermin — das Modul existiert im Depot noch nicht, also
   nichts zu verbergen, nichts abzuschalten.
2. Mit der Annahme nimmt die Bürgerin die Prüftermine mit an; sie erscheinen wie jeder andere.
3. Nach der Annahme ist jeder Termin einzeln abschaltbar, ohne das Modul anzufassen — „prüfen,
   sagen, nicht sperren". Abschalten heißt abschalten, nicht löschen: die Herkunft
   (`quelle:'modul'`, `typ:'modul:'+id`) bleibt am Datensatz stehen.

**Bau:**

1. **„Annahme" IST der Einlass.** Es gibt in diesem Kern keinen zweiten, späteren
   Zustimmungsschritt für ein `logikModul` — `modulEinlassen` prüft, bettet ein, und genau in
   diesem Moment (nur bei frischer oder aktualisierter Fassung, NIE bei einer verworfenen älteren)
   ruft es `logikModulPruefterminAnlegen(markiert, new Date(), d)` auf. Löst Punkt 1
   strukturell auf, statt es zu beantworten: es gibt keinen Zustand „Modul im Depot, aber
   Termin verborgen", weil beide im selben Aufruf entstehen.
2. **`d`-Durchreichung statt globaler Annahme.** `modulEinlassen` kann mit einem fremden `ziel`
   laufen (Ab-Werk-Nachlieferung während einer Migration, noch nicht das globale `data`) —
   `logikModulPruefterminAnlegen` bekam ein drittes, optionales Argument `d` und prüft/schreibt
   jetzt gegen DASSELBE Ziel, nicht mehr gegen das globale `data`. `dokumentAnlegen` bekam
   dieselbe Erweiterung (`_dokumenteRoot(d)` konnte das schon immer, wurde nur nie genutzt) — alle
   acht Bestandsaufrufer reichen weiterhin nur zwei Argumente, unverändertes Verhalten.
3. **Abschalten braucht KEINEN neuen Mechanismus.** `dokumentSetzen(id, 'pruefIntervallMonate', 0)`
   entfernt den Rhythmus bereits generisch (bestehender Code, U2-ADR-014) — der Datensatz
   (`quelle`, `typ`, `felder`, `name`) bleibt unverändert stehen. Punkt 3 ist damit
   Wiederverwendung, kein Nachbau.
4. **Kopf-Kommentar korrigiert.** Die Auflage („Provisorium braucht Verfallsdatum, steht im
   Kern, nicht nur im ADR") ist durch die Verdrahtung selbst erledigt — der Kommentar an
   `logikModulPruefterminAnlegen` nennt jetzt `modulEinlassen` als Aufrufort samt Datum, statt
   „bewusst unverdrahtet" zu behaupten. Kein Zwischenzustand nötig: Korrektur und Verdrahtung
   liefen in einem Zug.
5. **Wächter mit rotem Beweis, alle drei Punkte** (`tests/logik-modul-annahme-prueftermin.test.js`,
   dazu 6/6 unverändert `tests/logik-modul-pruefterminanlegen.test.js`):
   - Rot-Beweis 1/3: vor `modulEinlassen` existiert weder das Modul noch ein Prüftermin dafür.
   - Rot-Beweis 2/3: `modulEinlassen` mit `pruefIntervallMonate` liefert `angenommen:true` UND
     einen Dokument-Datensatz im selben Aufruf.
   - Rot-Beweis 3/3: `dokumentSetzen(...,'pruefIntervallMonate',0)` entfernt den Rhythmus, das
     Modul bleibt byte-gleich, und ein voller Krypto-Rundlauf (`depotSerialisieren`/`depotLaden`)
     liefert den Datensatz weiterhin mit `quelle:'modul'`/`typ:'modul:'+id`, aber ohne Rhythmus —
     die Abschaltung ist kein Bildschirm-Artefakt.
   - Zusätzlich geprüft: eine verworfene ältere Fassung (`aeltere-fassung`) legt keinen Termin an;
     ein Modul ohne `pruefIntervallMonate` wird trotzdem angenommen, nur eben ohne Termin.

`tools/nur-vom-test-erreicht-grundlinie.json`: `logikModulPruefterminAnlegen` aus `namen`/
`begruendungen` entfernt, `abgaenge`-Eintrag ergänzt (Ratsche — die Grundlinie darf nicht mehr
decken, als heute noch unverdrahtet ist).

**Was dieser Zug ausdrücklich nicht entscheidet:** die eigentliche Antwort-Ausgabe (U2-ADR-366
Teil 2 im engeren Sinn — wie/wo eine Antwort auf ein Template tatsächlich erzeugt und
herausgegeben wird) bleibt offen; ob ein bereits angenommenes Modul, dessen `pruefIntervallMonate`
sich in einer neuen `moduleVersion` ändert, den bestehenden Dokument-Datensatz nachzieht, bleibt
offen (Dedup-by-typ verhindert nur einen zweiten Datensatz, zieht aber keinen bestehenden nach).

## Konformität

```konformitaet
aussage:  Mit der Annahme (dem Einlass) entsteht der Prüftermin des Moduls; danach ist er abschaltbar, ohne das Modul anzufassen, und bleibt über einen Depot-Rundlauf abgeschaltet.
zustand:  geprüft
herkunft: Entscheidung vom 08.09.2026
pruefung: tests/logik-modul-annahme-prueftermin.test.js#[U2-ADR-373·Rot-Beweis 2/3] MIT der Annahme (Einlass) entsteht der Prüftermin
pruefung: tests/logik-modul-annahme-prueftermin.test.js#[U2-ADR-373·Rot-Beweis 3/3] NACH der Annahme ist der Termin abschaltbar, ohne das Modul anzufassen — und übersteht einen Depot-Rundlauf abgeschaltet
```
