# U2-ADR-148: Ein Ablaufdatum wohnt bei seiner Gültigkeit, nicht im Bereich

**Status:** Akzeptiert
**Datum:** 18.08.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL
**Grundlage:** Produktentscheidung, 18.08.2026 — die vierzehn Felder ziehen um, und
die Export-Einstufung wird feldweise (Weg 3). Vormessungen: A320 (Zählung), A321 (Leserliste,
Nachtrag), A322 (Auflösung und Abbruch).
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `feldRohwert` / `feldRohwertSetzen`,
  `VOLLEXPORT_FELDWEISE_SCHLUESSEL`, Migrationsstufe 64→65 in `depotNormalisieren`,
  der Slot `feldGueltigkeitGerettet: {}` in `leeresDepot()`; `vivodepot-lesen.html` —
  `feldRohwert` (der Spiegel).
- **ADR-Bezug:** U2-ADR-144 (die Marke, die dieser Umzug einlöst — §4 dort stellte die
  Überführung ausdrücklich als offene Entscheidung vor), U2-ADR-050 (Rettungsfeld-Muster),
  U2-ADR-005 (`urheberschaft`, dieselbe Bauart eines eigenen Namensraums),
  U2-ADR-014 (Erkennungstabelle — benachbart, nicht abgelöst).
- **Status heute:** gilt — Beleg `tests/m1-umzug-gueltigkeit.test.js` (31 Proben).

---

## Der Befund

U2-ADR-144 hat einen eigenen Namensraum für Gültigkeiten angelegt
(`data.feldGueltigkeit[<sektorId>][<feldId>] = { von?, bis? }`) und **keinen einzigen
Bestandswert angefasst**. Damit standen zwei Dinge nebeneinander, die dasselbe sagen: die
vierzehn eingebauten Ablauf-Felder im Bereich und die neue Tabelle daneben. Ein angedocktes
Feld konnte eine Gültigkeit tragen, ein eingebautes „gültig bis"-Feld hatte sie nicht — es
**war** eine.

## Die Entscheidung

**1 · Vierzehn Felder ziehen um.** Wer die Marke `laeuftAb` trägt, hat seinen Wert ab
Schema 65 unter `data.feldGueltigkeit[<bereich>][<feld>].bis` und nicht mehr in
`data.sektoren`. Das Kriterium ist die **Marke**, nicht eine Liste von Feld-Ids — eine Liste
wäre die Nachpflege-Stelle, an der die Erkennungstabelle sieben Tage hinterherlief
(U2-ADR-144 §2), und sie wüsste nichts von einem angedockten Feld, das die Marke mitbringt.

**Die Rechenkette, und sie ist der Beleg:** 13 markierte Felder (Stand A320) **plus vier**
Ablauf-Felder, die die Marke bekommen (`schwerbehindertenausweis_gueltig`,
`pflegegrad_befristet_bis`, `ks_wasser_haltbar`, `ks_lebensmittel_haltbar`), **minus drei**
Ausstellungs-Daten, die sie verlieren (`ausweis_ausgestellt`, `aufenthaltstitel_ausgestellt`,
`reisepass_ausgestellt`) = **14**.

> **`laeuftAb` heißt: dieses Datum ist der letzte Tag, an dem etwas gilt.**
> Nicht ein Termin, an dem etwas geschieht. Nicht ein Datum, an dem etwas geschehen ist.

Ein Ausstellungsdatum ist der **erste** Tag. Es bleibt an seinem Ort und speist weiter den
Gültigkeits-Vorschlag (§ 6 Abs. 1 PAuswG, § 5 Abs. 1 PassG) und `issuance_date`.

**2 · Umgezogen ist der SPEICHERORT, nicht das Feld.** Beschriftung, Hilfetext,
Sichtbarkeit, Erkennungs-Leitfeld und Feld-Id bleiben. A321 hat gemessen, warum die
Deklaration nicht entfallen darf: `feldGueltigkeitZeileHTML` hat genau einen Aufrufer,
`feldZeileHTML` — **ohne Felddefinition keine Feldzeile und damit kein Ort, an dem die
Bürgerin „gültig bis" überhaupt einträgt.** Für sie ändert sich nichts: dasselbe Feld, dieselbe
Beschriftung, dieselbe Stelle.

**3 · Zwei Auflösungen, eine Regel.** Lesen geht über `feldRohwert` (Zug 3, A322), Schreiben
über `feldRohwertSetzen`. Beide sagen dasselbe: **bei Marke gewinnt der Eintrag am Zielort**,
erst wenn dort nichts steht, gilt der Bereichswert. Ein Schreibweg ohne diese Regel legte den
Wert wieder im Bereich ab, und die Leseseite läse ihn danach aus zwei Quellen zugleich.

**Warum keine Flicken:** dieselbe Bauart (`for f of sek.felder` → `sektorDaten[f.id]`) steht
an über einem Dutzend Stellen. Drei davon tragen etwas, das eine stille Auslassung nicht
verträgt — die PDF-Ausgabe („alle Daten AUCH als PDF"), die Übersicht „Das wird herausgegeben"
und die Ansage vor dem Herausgeben. Ein vierzehnter Leser käme irgendwann dazu und machte den
Fehler wieder.

**4 · Die Konfliktregel.** Trägt ein Feld gleichzeitig einen Bereichswert und einen
abweichenden Eintrag in `feldGueltigkeit`, **gewinnt der Eintrag am Zielort** — er liegt
bereits im Zielformat. Der Bereichswert geht ins Rettungsfeld
`data.feldGueltigkeitGerettet[<bereich>][<feld>]` (U2-ADR-050). **`von` wird nicht
angefasst**, auch wenn `bis` überschrieben würde. **Keine Mechanik über das Rettungsfeld
hinaus** — kein Dialog, keine Sonderbehandlung, keine Anzeige. Es ist ein Aufbewahrungsort,
keine zweite Wahrheit.

Dieselbe Rettung greift für einen **unlesbaren** Alt-Wert: `feldGueltigkeitLesen` nimmt nur
ISO-Daten; ein Freitext aus einer alten Fassung läge am Zielort unsichtbar und wird darum
gerettet statt verformt.

**5 · Der Namensraum ist weiter als vierzehn.** A317 hat gemessen, dass `depotNormalisieren`
die inneren Schlüssel von `feldGueltigkeit` nicht filtert — eine geladene Datei kann Schlüssel
mitbringen, die der heutige Katalog nicht kennt. **Die Stufe überschreibt sie nicht und
verwirft sie nicht.**

**6 · Eine eigene Stufe, nicht eine erweiterte 64.** Schema 64 ist ausgeliefert. Eine
ausgelieferte Stufe nachträglich zu verändern hieße, dass zwei Depots mit derselben
Schemaversion nicht dasselbe durchlaufen haben — und genau darauf verlässt sich die ganze
Kette.

**7 · Die Export-Einstufung wird feldweise, nicht als ganzer Schlüssel.**
`VOLLEXPORT_FELDWEISE_SCHLUESSEL` ist eine dritte Klasse neben „geht mit" und „wird
zurückgehalten": **„wird je Eintrag entschieden".** Jeder Eintrag wird über `feldIstSensibel`
genau so klassifiziert wie der Feldwert daneben.

**Damit ändert der Umzug an der Herausgabe nichts** — es geht mit, was heute mitgeht, und
zurück bleibt, was heute zurückbleibt. Das ist die Zusage von Weg 3, und sie ist messbar
(Rot-Beleg in beide Richtungen), nicht behauptet.

**Die Begründung vom 17.08. wird dadurch nicht verworfen, sondern feldgenau erfüllt.** Der
dort ausdrücklich genannte Fall — der Aufenthaltstitel — bleibt zurückgehalten, weil
`aufenthaltstitel_gueltig` `sensibel: true` trägt. **Und die Bürgerin behält ihre Kontrolle:**
`feldIstSensibel` prüft zuerst ihre eigene Markierung. Eine pauschale Einstufung des ganzen
Schlüssels hätte über etwas entschieden, das sie heute feldweise steuert.

**Ein Eintrag, den der Katalog nicht kennt, bleibt zurück.** Wer nicht klassifizieren kann,
darf nicht freigeben — dieselbe vorsichtige Annahme wie bei `bereicheVerwaist`.

## Die zweite Datei: der Spiegel in der Lese-App

Eine im Kern gebaute Auflösung erreicht `vivodepot-lesen.html` nicht (A322 Befund 2,
Registerposten **A327**/**A328**). Die Lese-App liest den Klartext-Export und kannte
`feldGueltigkeit` an keiner Stelle; sechs der vierzehn Felder sind nicht sensibel und gehen
mit. Ohne Spiegel erschienen sie dort als **NICHTS** — nicht zu unterscheiden von „nichts
hinterlegt", in genau der Sicht, die eine Bürgerin einer Institution vorlegt.

**Dieselbe Aussage, nicht derselbe Code.** Die Lese-App bekommt eine eigene, schlanke
`feldRohwert`-Fassung, und die Marke steht auch an ihren vierzehn Felddeklarationen.
`tests/paritaet-kern-lese.test.js` hält beide Seiten deckungsgleich — **ein Spiegel ohne
Wächter wäre genau die Nachpflege-Stelle, die dieser Umbau vermeiden will.**

## Was der Bürgerin auffällt: eine Eingabe weniger

Vor dem Umzug trug eine markierte Feldzeile **zwei** Datumseingaben mit demselben Inhalt: das
Feld „Personalausweis — gültig bis" und daneben das `bis` der Gültigkeits-Zeile. Nach dem
Umzug ist das Feld selbst der Träger des `bis`; die Gültigkeits-Zeile zeigt dort nur noch
`von`. **Für ältere Menschen ist ein doppeltes Bedienelement kein Angebot, sondern eine Frage
(„welches gilt?").** Die Beschriftung des Feldes trägt die Aussage präziser als ein
generisches „gültig bis" und bleibt an ihrer alten Stelle stehen.

## Was ausdrücklich NICHT gebaut ist

**Keine zweite Marke für Fälligkeiten** (A323) · **kein abgeleiteter Gültigkeitsbeginn**
(A324) · **kein Umrechnen von `ks_erstehilfe_datum`** in ein Prüfintervall (A325) · **keine
Zeilen-Identität für Listen** (A326) — die zwei Listen-Unterfelder haben ihre wirkungslose
Marke bereits mit A320 verloren, `feldGueltigkeit` führt `[sektorId][feldId]` flach und hat
für eine Listenzeile keinen Platz.

## Konsequenzen

**Die Stufe bleibt für immer in der Kette jedes Bürgerdepots.** Sie ist idempotent (der
Bereichsschlüssel wird geräumt, ein zweiter Lauf findet nichts) und räumt den alten Platz
**immer** — auch bei einem leeren Wert, denn ein zurückbleibendes `''` wäre der zweite
Wert-Slot, gegen den U2-ADR-144 §1 den eigenen Namensraum gewählt hat.

**`prueftermineFelder` und die Vorschlagsregel bleiben unberührt.** Das eine liest ohnehin nur
`data.feldGueltigkeit`, das andere rechnet weiter aus dem Bereich (Ausstellungsdatum).

**`EXPORT_TOPF_B_FELDER` bleibt unverändert.** Die Bedingung der ersten Antwort — Streichung,
falls die Felddeklaration entfällt — ist nicht eingetreten. Die Übersicht erreicht die Zeile
über die Auflösung wieder, und `topfB.has(f.id)` greift weiter; die Aussage „in `edci-bildung`
bewusst nicht gemappt" gilt unverändert.

## Cross-Referenz

`tests/m1-umzug-gueltigkeit.test.js` (31 Proben) ·
`tests/m1-gueltigkeit-aufloesung-rohwert.test.js` (die Lese-Auflösung, Zug 3) ·
`tests/fixtures/migrations-stufen.js` (Stufe 65) ·
`tests/vollexport-schluessel-abdeckung.test.js` (die dritte Klasse) ·
`tests/paritaet-kern-lese.test.js` (die Marken-Parität) · U2-ADR-144 (die Marke).
