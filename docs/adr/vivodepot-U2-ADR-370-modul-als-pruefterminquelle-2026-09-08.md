# U2-ADR-370: 'modul' als Prüftermin-Quelle — ein Template kann eine periodische Prüfpflicht mitbringen

**Status:** gilt
**Datum:** 08.09.2026
**Kategorie:** ARCHITEKTUR, PRODUKT
**Linie:** U2
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `DOKUMENT_QUELLEN` (+`'modul'`), `LOGIK_MODUL_SCHLUESSEL`
  (+`pruefIntervallMonate`/`bezugsquelle`), `logikModulPruefen` (übernimmt beide strukturell
  geprüft), `logikModulPruefterminAnlegen` (neu, s. deren eigener Kopf-Kommentar) — neben
  `dokumentAnlegen`/`dokumentTypExistiert` (unverändert wiederverwendet, kein Nachbau).
- **ADR-Bezug:** U2-ADR-366 (die Ausgabe wird zur Antwort auf ein benanntes Template — Teil 3
  dort war dieser Zug, beschrieben, nicht gebaut, jetzt freigegeben), U2-ADR-014 (der
  Dokument-Datensatz/die Ampel-Mechanik selbst, Stufe 2), das siebte Register (27.08.2026,
  `logikModul`).
- **Status heute:** gilt

**Anlass:** U2-ADR-366 maß am 07.09.2026 die Bindung zwischen `abfragen` (ein Template liest
Depot-Felder) und `ausgeben` (die Antwort). Teil 3 dieses ADRs stellte fest: die Zeitachse für
„diese Antwort altert" existiert bereits als generischer Mechanismus (`dokumentAnlegen` kennt
`pruefIntervallMonate`/`ablaufDatum`, die Ampel rechnet quelle-unabhängig) — es fehlte nur die
`DOKUMENT_QUELLE` `'modul'` selbst. Offene Frage — „fremde Module könnten
dann Termine im Depot anlegen" — entschieden am 07./08.09.2026, wörtlich:
„modul prüftermin ja".


1. **`DOKUMENT_QUELLEN` um `'modul'` ergänzt.** Kein neuer Mechanismus — derselbe Enum, dieselbe
   Ampel-Logik, dieselbe Dedup-by-typ-Regel wie `'erkannt'`/`'standard'`/`'eigen'`.
2. **Zwei optionale Modulfelder, VOR jedem Einfrieren des Schemas angelegt** (Produktauflage: „Wichtig ist das jetzt mitzudenken und anzulegen, ehe wir irgendwas einfrieren"):
   - `pruefIntervallMonate` — die Zahl selbst, strukturell geprüft (positive ganze Zahl, sonst
     `null`, kein Bundle-Fehler — dieselbe defensive Bauart wie `sprache`/`eingelassenAm`).
   - `bezugsquelle` — ein Klartext-Satz, WORAUS die Pflicht stammt (z. B. eine Leitlinie). Reine
     Anzeige-Information; der Kern liest sie nicht aus, kein Verbraucher heute (UI-Anbindung ist
     Teil 2, nicht dieser Zug).
3. **Das Gerüst erinnert, weiß aber nichts über den Inhalt.** `logikModulPruefterminAnlegen(modul,
   jetzt)` ist eine reine, aufrufbare Funktion: liest `modul.pruefIntervallMonate`, legt bei einem
   gültigen Wert einen Dokument-Datensatz an (`quelle:'modul'`, `typ:'modul:'+modul.id` — ein
   Namensraum, den kein Bestandstyp heute belegt), sonst nicht. Kein eingebauter Bestand, keine
   Sonderrolle für Vivodepots eigene Module — ein fremdes Modul nimmt exakt denselben Weg.
   **Kein automatischer Trigger — zum Zeitpunkt dieses Zuges.** WANN eine Bürgerin ein Modul
   annimmt und der Aufruf tatsächlich passiert, war hier noch offen; diese Funktion war absichtlich
   unverdrahtet (Grundlinie: `tools/nur-vom-test-erreicht-grundlinie.json`).
   **NACHTRAG (08.09.2026, U2-ADR-373, derselbe Tag):** verdrahtet — „Annahme" ist der Einlass,
   `modulEinlassen` ruft diese Funktion jetzt direkt auf. S. dort für Bau und rote Beweise.
4. **Wächter mit rotem Beweis, beide Richtungen** (`tests/logik-modul-pruefterminanlegen.test.js`,
   6/6 grün): ein Modul MIT `pruefIntervallMonate` erzeugt einen Dokument-Datensatz (Quelle, Typ,
   Intervall, Feld-Referenzen geprüft); eines OHNE (fehlend, `0`, negativ, kein Zahlwert) erzeugt
   keinen. Zusätzlich: Dedup-by-typ hält bei zweifachem Aufruf desselben Moduls.

**Sichtbarkeit/Abschaltbarkeit** (die benannte Auflage): war mit dieser
Schema-Bindung NICHT erledigt.
**NACHTRAG (08.09.2026, U2-ADR-373):** entschieden, noch am selben Tag
gebaut — kein Termin vor Annahme (das Modul existiert im Depot noch nicht), Termin mit Annahme,
danach abschaltbar ohne Löschen (`dokumentSetzen(...,'pruefIntervallMonate',0)`, Herkunft bleibt
stehen). S. dort für Bau und rote Beweise.

**Was dieser Zug ausdrücklich nicht entscheidet:** wo/wann ein Modul tatsächlich angenommen wird
und `logikModulPruefterminAnlegen` aufgerufen wird (**entschieden in U2-ADR-373, s. Nachtrag
oben**); ob/wie `bezugsquelle` einer Bürgerin angezeigt wird; ob ein bereits angenommenes Modul,
dessen `pruefIntervallMonate` sich in einer neuen `moduleVersion` ändert, den bestehenden
Dokument-Datensatz nachzieht (weiterhin offen).
