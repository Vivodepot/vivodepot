# U2-ADR-144: Gültigkeit ist eine Eigenschaft JEDES Feldwerts, auch eines angedockten

**Status:** Akzeptiert
**Datum:** 17.08.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL
**Grundlage:** Produktentscheidung, 17.08.2026 („bitte m1 mitbauen"), festgehalten im
Nachtrag zur Abendkette; Zug 3 des Auftrags „Die Bereichsliste wird ein andockbares Register".
Vormessung: Erhebung „Was Pro wirklich kostet" (Glied 1 derselben Kette).
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `feldGueltigkeitLesen` / `feldGueltigkeitSetzen` /
  `feldGiltAm`, der Slot `feldGueltigkeit: {}` in `leeresDepot()`, Migrationsstufe 63→64 in
  `depotNormalisieren`.
- **ADR-Bezug:** U2-ADR-143 (dieselbe Migrationsstufe, gemeinsam geschnitten), U2-ADR-050
  (Rettungsfeld-Muster — der zweite Teil derselben Stufe), U2-ADR-005 (`urheberschaft`, dieselbe
  Bauart eines eigenen Namensraums neben der Nutzlast), U2-ADR-014 (Erkennungstabelle — die
  benachbarte, NICHT abgelöste Mechanik).
- **Status heute:** gilt — Beleg `tests/bereiche-verwaist-und-gueltigkeit.test.js`
  („[Zug 3·B] ein ANGEDOCKTES Feld trägt Gültigkeit — genau dafür ist der Umbau da").

---

## Der Befund

Bis heute wissen genau **19 Felder**, von wann bis wann sie gelten — jedes einzeln gebaut
(A138, A148, A151). **Ein angedocktes Feld konnte es nie**, und genau das war der Anlass.

Die Vormessung hat dabei eine Prämisse widerlegt, die dem Bau sonst die falsche Richtung
gegeben hätte: **die Erkennungstabelle (`ERKENNUNG_LEITFELDER`) ist nicht der Ort, an dem
Gültigkeit entsteht.** Sie ist eine Aufzählung von elf Einträgen, eingefroren, ohne einen
einzigen Schreibzugriff im ganzen Kern, und sie **belegt beim Annehmen eines Vorschlags Daten
vor — sie erzeugt keine Termine.** Gemessen: ein angedocktes Feld vom Typ `datum` mit einem Wert
erzeugt heute **null** Zeilen im Prüfblatt, in beiden Gruppen, und erscheint mit keinem seiner
Wortlaute in der Sicht. Die Gegenprobe mit einem echten Dokument-Datensatz ergibt eine Zeile.

## Die Entscheidung

**1 · Die Gültigkeit liegt in einem eigenen Namensraum neben der Nutzlast:**
`data.feldGueltigkeit[<sektorId>][<feldId>] = { von?, bis? }`, beide ISO-Datum.

**Warum nicht im Sektor-Objekt selbst:** `data.sektoren[<id>]` hält Werte flach nach `feldId`.
Ein Zusatzschlüssel dort — etwa `<feldId>__gueltigBis` — wäre ein **zweiter Wert-Slot im selben
Raum** und liefe jedem Export, jedem Mapping und jedem Vollständigkeits-Zähler als echtes Feld
über den Weg. Der eigene Namensraum ist dieselbe Bauart wie `urheberschaft` (U2-ADR-005) und aus
demselben Grund billig: **Abwesenheit liest korrekt als „keine Gültigkeit angegeben".**

**2 · Es gibt KEINE Liste erlaubter Felder.** Der Schlüssel ist der Feldschlüssel selbst — ein
`tpl_`-Feld aus einer eingewanderten Vorlage trägt ihn genauso wie ein eingebautes. **Eine Liste
wäre genau die Nachpflege-Stelle gewesen, an der die Erkennungstabelle sieben Tage lang
hinterherlief** (U2-ADR-130 gegen `BEREICHE`).

**3 · Ein Feld ohne Gültigkeitsangabe verhält sich exakt wie vor dem Umbau.** `feldGiltAm`
liefert `true`, wenn nichts gesetzt ist: **„unbekannt" heißt „wie bisher", nicht „ungültig".**
Wer nie eine Gültigkeit setzt, merkt von diesem Umbau nichts.

**4 · Gebaut wird die MARKE, nicht die ÜBERFÜHRUNG.** Die Migrationsstufe legt einen leeren
Slot an und fasst **keinen** Bestandswert an. Die 19 bestehenden Datumsfelder aus A138 bleiben,
wie sie sind.

**5 · Eine Stufe, nicht zwei.** 63→64 trägt diesen Umbau **und** die Bereichs-Rettung
(U2-ADR-143). Getrennt geschnitten wären es zwei Stufen und 29 Stellen, gemeinsam eine Stufe und
15. **Die Stufe ist der eigentliche Gegenstand:** jede bleibt dauerhaft in der Kette jedes
Bürgerdepots und ist auf Dauer eine Zusicherung, die gehalten werden muss.

## Was mit den 19 Feldern geschieht: nichts — und was das später kostet

Die Überführung würde die 19 bestehenden Datumsfelder in die neue Form ziehen und
`data.sektoren.<id>.<feld>` umschreiben. **Sie fasst Bürgerdaten an und ist eine eigene
Produktentscheidung.**

**Ihr Preis, damit die Frage nicht verlorengeht:** eine **zweite Migrationsstufe** (65) mit
Rot-Beleg, das Umschreiben von 19 Werten je Bestandsdepot, ein Rettungsfeld je Feld für den
Fall abweichender Werte (U2-ADR-050) und der Nachzug aller Stellen, die diese 19 Felder heute
namentlich lesen. Sie hängt **nicht** am Migrationsfenster dieses Zuges — die Marke steht, und
die Überführung kann jederzeit später fallen.

## Was ausdrücklich NICHT gebaut wurde

**Ein angedocktes Feld mit Gültigkeit erscheint weiterhin NICHT im Prüfblatt.** Das ist keine
Lücke dieses ADR, sondern ein eigener, benannter Posten: das Prüfblatt liest ausschließlich
`data.dokumente[]` — **sieben Stellen**, alle auf einem Dokument-Datensatz gebaut
(`vivodepot.html:23500`, `:23510`, `:23558`, `:23486`, `:24684`, `:24799`, `:24825`). Zwei davon
tragen eine Gestaltungsfrage: das Sprungziel eines Feldes (ein Feld hat keine Dokument-`id`) und
die Bedeutung von „als geprüft" bei einem Feldwert ohne `aktualisiertAm`. **Keine
Migrationsstufe** — der Posten liest nur, was hier geschrieben wird.

**Die Anzeige.** `feldGueltigkeitSetzen` und `feldGiltAm` haben heute keinen Aufrufer im
Produkt und stehen begründet in der Grundlinie der unverdrahteten Namen. Ob und wie eine
abgelaufene Gültigkeit gezeigt wird, ist **Wortlaut** und ist eine Produktentscheidung.

## Konsequenzen

**Der Export hält beide neuen Schlüssel zurück** (`VOLLEXPORT_ZURUECKHALTEN_SCHLUESSEL`), und
das ist die vorsichtige Annahme statt der bequemen: „gültig bis" **ist** eine Angabe über die
Bürgerin und kann bei einem Aufenthaltstitel mehr verraten als der Wert daneben. Der Umzugsfall
bleibt möglich — `{sensibel: true}` gibt alles vollständig mit.

**Der Kalendertag ist lokal, nicht UTC.** `feldGiltAm` rechnet über `heuteLokal()`; um 22:30 Uhr
ist in Berlin bereits der Folgetag, und eine Gültigkeit, die einen Tag zu früh endet, ist bei
einem Ausweis kein Rundungsfehler.

## Cross-Referenz

`tests/bereiche-verwaist-und-gueltigkeit.test.js` (14 Proben) ·
`tests/fixtures/migrations-stufen.js` (Stufe 64) · U2-ADR-143 (dieselbe Stufe, anderer Teil).

---

## NACHTRAG, 19.08.2026 — zwei Berichtigungen (A329 und U2-ADR-148)

**Eine ADR wird nicht im Vorbeigehen umgeschrieben.** Der Text oben bleibt, wie er am 17.08.2026
beschlossen wurde; was heute anders gilt, steht hier.

**1 · Die Zahl 19 war nie richtig (A329).** Sie steht oben viermal („genau 19 Felder", „die 19
bestehenden Datumsfelder", „Was mit den 19 Feldern geschieht", „diese 19 Felder"). **Gemessen
waren es 15**; nach A320 — die zwei toten Listen-Marken sind gefallen — 13, und nach dem Umzug
aus M1 Zug 5 sind es **14**. Die Zahl beschreibt damit keinen Stand, den es je gab.

**Der Befund ist nicht die Zahl, sondern warum sie überlebt hat:** eine Zahl in einem
Fließtext hat keinen Wächter. Die geltende Zahl misst heute `tests/feld-marke-laeuft-ab.test.js`
am Baum, mit ihrer Rechenkette an der Stelle. A317 hat die Zahl gefunden und ausdrücklich nicht
geglättet, weil der damalige Auftrag Produktcode ausschloss.

**2 · §4 ist eingelöst (U2-ADR-148).** „Gebaut wird die MARKE, nicht die ÜBERFÜHRUNG" galt für
DIESE Stufe und gilt für sie weiter. **Die Überführung war ausdrücklich als eigene Produktentscheidung ausgewiesen; sie ist am 18.08.2026 gefallen** und liegt als eigene Migrationsstufe
64 → 65 dahinter. Der Abschnitt „Was mit den 19 Feldern geschieht: nichts — und was das später
kostet" ist damit **historisch**: sein Preis ist bezahlt, und was er auflistet, ist gebaut.
Nachzulesen in `U2-ADR-148`.

**Was unverändert gilt:** der eigene Namensraum (§1), das Fehlen einer Feld-Allowlist (§2), „ein
Feld ohne Gültigkeitsangabe verhält sich exakt wie vor dem Umbau" (§3) und der Schnitt der Stufe
63 → 64 (§5).

