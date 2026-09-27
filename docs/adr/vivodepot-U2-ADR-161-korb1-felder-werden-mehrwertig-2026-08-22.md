# U2-ADR-161: Die zwanzig Korb-1-Felder werden mehrwertig — neun Listen statt zwanzig Skalare

**Status:** Akzeptiert
**Datum:** 22.08.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL
**Grundlage:** Produktentscheidung, internes Entscheidungsdokument vom 21.08.2026
und internes Entscheidungsdokument vom 22.08.2026 (Punkt 1).
Laufzettel „Der Schnitt", Glied 3 (A448).
- **Code-Stelle:** `vivodepot.html` — die neun `typ:'liste'`-Felddefinitionen (`ausweis`,
  `aufenthaltstitel`, `elefand`, `steuerid`, `krankenkassenkarte`, `rentenversicherung`,
  `pflegekasse_nummer`, `schwerbehindertenausweis`, `bundid`), `_KORB1_GRUPPEN` +
  `_korb1MehrwertigMigrieren` (die unbedingte Migration), `prueftermineFelder` (die
  listen-fähige Erweiterung), `B16_FELD_MAPPING` + die neue Aggregations-Schleife in
  `_b16Felder` (Legacy-Import), `ERKENNUNG_LEITFELDER` (fünf Einträge entfernt),
  `alleStandardDokumente` (fünf `felder`-Zeiger auf `{feldId, unterfeldId}` umgestellt),
  `PRUEFZIFFER_FELDER` (zwei Schlüssel auf `.nr`-Form), sechs Reverse-Mapping-Tabellen
  (`VC_IDENTITAET_MAPPING`, `VC_FINANZEN_MAPPING`, `VC_SOZIALVERSICHERUNG_MAPPING`,
  `XOEV_VERWALTUNG_MAPPING`, `EDCI_BILDUNG_MAPPING`, `XMELD_IDENTITAET_MAPPING`).
- **ADR-Bezug:** U2-ADR-104 (Skalar→Liste-Wächter in `sektorFeldSetzen`, hier zum ersten Mal an
  zwanzig bestehenden Feldern gleichzeitig ausgelöst), U2-ADR-148 (Gültigkeit wohnt bei ihrem
  Feldwert — hier auf mehrwertige Felder erweitert, ohne `feldGueltigkeit` selbst anzufassen),
  U2-ADR-159/160 (Weglassen, nicht Umbelegen — dieselbe Linie für tote Export-Ziele).
- **Status heute:** gilt — gebaut und belegt in `tests/schnitt-glied3-fuenf-pruefsteine.test.js`
  (die fünf Prüfsteine), `tests/korb1-mehrwertig-pruefermine.test.js` (Fristen-Anbindung), sowie
  in den bestehenden M1-Testdateien, die auf die neue Struktur nachgezogen wurden.

---

## Kontext

**Der Befund vom 21.08.2026:** zwanzig Skalarfelder für nationale Kennungen (Ausweisnummer,
Aufenthaltstitel, Elefand-Registrierung, Steuer-ID, Krankenkassenkarte, Rentenversicherungsnummer,
Pflegekassennummer, Schwerbehindertenausweis, BundID) gingen von EINER Kennung pro Bürgerin aus.
Fünf Prüfsteine widerlegten das:

1. Ein Land bündelt, was Deutschland trennt (Ungarn: eine Nummer für Kranken- UND
   Rentenversicherung).
2. Ein Land hat die Sache gar nicht (Großbritannien: kein Personalausweis).
3. Ein Mensch trägt zwei Länder gleichzeitig (Doppelstaatlerin: zwei Ausweisnummern).
4. Ein Land hat eine Nummer, die der Kern nicht kennt (kein geschlossener Katalog möglich).
5. Eine Sprache, zwei Rechtsräume (Textsatz kennt heute keinen Rechtsraum-Schlüssel —
   AUSDRÜCKLICH NICHT Gegenstand dieses Glieds, s. u.).

Ein Skalarfeld kann höchstens Prüfstein 2 (leer lassen) — an 1, 3 und 4 zerbricht es strukturell.

## Entscheidung

**Die zwanzig Skalare werden zu neun `typ:'liste'`-Feldern gruppiert**, je Gruppe ein
gemeinsames `system`-Unterfeld (freier Text, keine `optionen`-Auswahl — Prüfstein 4) plus die
fachlichen Unterfelder der alten Skalare:

| Neue Liste (Sektor) | Unterfelder | Alte Skalare |
|---|---|---|
| `identitaet.ausweis` | system, nr, ausgestellt, gueltig | ausweis_nr/_ausgestellt/_gueltig |
| `identitaet.aufenthaltstitel` | system, nr, ausgestellt, gueltig, behoerde, aktenzeichen | aufenthaltstitel_nr/_ausgestellt/_gueltig/_behoerde/_aktenzeichen |
| `mobilitaet.elefand` | system, nr, laender, gueltig | elefand_nr/_laender/_gueltig |
| `finanzen.steuerid` | system, nr | steuerid (gleicher Feldname, jetzt Liste) |
| `gesundheit.krankenkassenkarte` | system, ort, gueltig | krankenkassenkarte_ort/_gueltig |
| `sozialversicherung.rentenversicherung` | system, nr | rentenversicherungsnummer |
| `sozialversicherung.pflegekasse_nummer` | system, nr | pflegekasse_nr |
| `sozialversicherung.schwerbehindertenausweis` | system, ort, gueltig | schwerbehindertenausweis_ort/_gueltig |
| `verwaltung.bundid` | system, email, ort | bundid_email/_ort |

`aufenthaltstitel_art` (Korb 2, freie Textart) bleibt ein eigenständiges Flachfeld daneben stehen
— nur die fünf Ablauf-/Kennungsfelder wandern in die Liste.

**Migration ist unbedingt, nicht schema-gegattert** (`_korb1MehrwertigMigrieren`, aufgerufen aus
`depotNormalisieren` ohne `if (schemaVersion < N)`-Wächter) — dieselbe Linie wie bei den übrigen
Etappen dieser Kampagne: der gemeinsame Schema-Bump für die ganze Schnitt-Kampagne kommt laut
Laufzettel erst am Ende von Glied 6, nicht an jeder Etappe einzeln. Die Migration ist idempotent
(`if (g.neu in sd) continue`) und additiv: ein alter Skalarwert wird zu genau EINEM Listen-Eintrag
mit `system: ''` (unbekannte Herkunft), nicht verworfen.

**`sektorFeldSetzen` weist alle zwanzig alten Feld-IDs jetzt zurück** (U2-ADR-104-Wächter,
`typ:'liste'`). Schreiben läuft über `listenEintragHinzufuegen(sektorId, feldId, eintrag)`.

## Die Fristen-Anbindung: `prueftermineFelder` wird listen-fähig, `feldGueltigkeit` bleibt unberührt

`feldGueltigkeit[sektorId][feldId]` (U2-ADR-148) kennt strukturell nur EINEN Wert pro Feld — für
eine Liste mit zwei Einträgen reicht das nicht (Prüfstein 3 verlangt zwei Termine nebeneinander).
Statt `feldGueltigkeit` selbst auf mehrere Werte pro Feld zu erweitern (ein Eingriff, der auch
alle SKALAREN Nutzer dieser Struktur beträfe), liest `prueftermineFelder(jetzt)` für genau diese
neun Gruppen zusätzlich direkt aus den Listen-Einträgen — ein Prüftermin je Eintrag mit gesetztem
`gueltig`-Unterfeld, `geprueftAm`/`geprueftFuer` sitzen am Eintrag selbst (kein zweites Register).
Belegt in `tests/korb1-mehrwertig-pruefermine.test.js`.

## Was bewusst offen bleibt (dokumentierte Lücken, keine stillen Auslassungen)

**„Dokument erkannt" (`ERKENNUNG_LEITFELDER`) kennt fünf der neuen Gruppen nicht mehr**
(`schwerbehindertenausweis`, `personalausweis`/`ausweis`, `krankenkassenkarte`, `elefand`,
`aufenthaltstitel` — `reisepass`, `fuehrerschein` und die drei Vorsorge-Instrumente sind
unberührt). Der bisherige Mechanismus dedupliziert GENAU EIN Dokument pro `typ`
(`dokumentTypExistiert`) — bei mehreren Listen-Einträgen (Prüfstein 3) ist unklar, welcher
Eintrag „das" erkannte Dokument wäre. Eine Dedup-Regel für mehrere erkannte Ausweise ist eine
Produktentscheidung, keine, die dieser Bau trifft.

**24 Export-/Import-Mapping-Zeilen entfielen** statt umbelegt zu werden (Weglassen, nicht
Umbelegen — U2-ADR-159/160-Linie): 11 Zeilen über sechs Reverse-Mapping-Tabellen
(VC_IDENTITAET_MAPPING, VC_FINANZEN_MAPPING, VC_SOZIALVERSICHERUNG_MAPPING,
XOEV_VERWALTUNG_MAPPING, EDCI_BILDUNG_MAPPING, XMELD_IDENTITAET_MAPPING) plus 13 in
`B16_FELD_MAPPING` (die Beta-16-Altapp-Migration). Die 11 wurden ersatzlos gestrichen (eigener
Zug offen — die Zielformate VC/FHIR/XÖV haben feste Skalarfelder, ein Mapping auf „N Einträge"
verlangt eine eigene Entscheidung). Die 13 in `B16_FELD_MAPPING` wurden dagegen NICHT ersatzlos
gestrichen, sondern in `_b16Felder` zu Listen-Einträgen aggregiert (ein Eintrag je Legacy-Skalar-
Satz) — nach demselben Muster, das dieselbe Funktion für `haustiere`/`fahrzeuge`/`konten` schon
verwendet (U2-ADR-072/073/074). Der Unterschied: der Beta-16-Import ist eine EINMALIGE,
kontrollierte Quelle mit bekannter Feldbelegung, kein offenes Zielformat mit fremder Semantik —
hier war die Aggregation kein Produktentscheid, sondern dieselbe Migration, die diese ADR ohnehin
baut.

**Kein berechneter Gültigkeits-Vorschlag mehr für `ausweis`/`aufenthaltstitel`**
(`_fristHinweisFuerFeld` verlor den `case 'ausweis_gueltig':`-Zweig ersatzlos) — ein geratenes
Datum für eine mehrwertige Liste ohne bekannte Zuordnung zu EINEM Eintrag wäre die gefährlichere
Fehlerklasse als gar kein Vorschlag. `reisepass_gueltig` (skalar, unberührt) behält seinen
Vorschlag.

**Prüfstein 5 (eine Sprache, zwei Rechtsräume) ist ausdrücklich NICHT Gegenstand dieses Glieds.**
Der Textsatz-Mechanismus kennt heute keinen Rechtsraum-Schlüssel — ein angedockter Satz
überschreibt den vorherigen unabhängig vom Rechtsraum der Bürgerin. `tests/schnitt-glied3-fuenf-
pruefsteine.test.js` enthält dafür NUR eine Probe, die den heutigen (unbehobenen) Zustand als
lebenden Befund festhält, keine Lösung. Gelöst wird das in Glied 4 (Textsatz-Schlüssel bekommt
den Rechtsraum) — die Probe ist dort UMZUKEHREN, nicht zu löschen.

**Kein Schema-Bump.** Wie bei Etappe 2g: additive, unbedingte Migration, kein Migrations-Gate
nötig. Der gemeinsame Schema-Bump für die ganze Schnitt-Kampagne kommt laut Laufzettel erst am
Ende von Glied 6.

---

*Vivodepot GmbH · 22.08.2026*
