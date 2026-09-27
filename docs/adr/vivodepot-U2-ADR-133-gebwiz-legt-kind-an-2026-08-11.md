# U2-ADR-133: gebwiz legt das Kind an — amendiert U2-ADR-089-Nachtrag §8 für genau einen Assistenten

**Status:** Akzeptiert
**Datum:** 11.08.2026
**Kategorie:** ARCHITEKTUR
**Grundlage:** interner Auftrag „Gebwiz Kind und Sub-Depot" (10.08.2026),
Nebenbefund aus A137 (Krisenvorsorge-Sichtbarkeit): `gebwiz` trug das Kind nicht in „Kinder und
Schutzbefohlene" ein, die Bedarfsrechnung der Krisenvorsorge blieb auf der alten Personenzahl
stehen.
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html`, `WIZARDS`-Eintrag `gebwiz` (drei neue Schritte
  `gebwiz_kind_name`/`gebwiz_kind_geburtsdatum`/`gebwiz_kind_art`, je mit eigenem
  `ziel:{sektor:'meine-menschen'}`), `_gebwizKindEintragErstellen`,
  `_gebwizSubDepotVorschlagen`, `wizardAbschluss()` (gebwiz-Zweig), SEKTOREN-Deklaration der
  drei Staging-Felder (`meine-menschen`, Sektion „Kinder und Schutzbefohlene").
- **Sprint-Commit:** `80cbfff`.
- **ADR-Bezug:** U2-ADR-089-Nachtrag §8 (amendiert an dieser Stelle) · U2-ADR-109 (Kinder und
  Schutzbefohlene — eine Liste, `art` als Diskriminante, `vertreteneRegisterId` als
  Sub-Depot-Schlüssel) · U2-ADR-036 (Kind-Verhältnisse, Sorgerecht pro Kind) · U2-ADR-003
  (Sub-Depot-Passwort) · U2-ADR-123 (Sub-Depot-Selbstbestimmung) · U2-ADR-032 (Assistenten
  registrieren am Abschluss `standardDokumente` — derselbe Mechanismus, hier nur sein
  Gegenstand erweitert).
**Status heute:** gilt — Beleg `tests/gebwiz-kind-eintrag.test.js#_gebwizKindEintragErstellen mit Namen: genau ein Eintrag, Person trägt Geburtsdatum`.

---

## Kontext — was U2-ADR-089-Nachtrag §8 verwarf, und warum das hier nicht gilt

§8 des U2-ADR-089-Nachtrags (22.07.2026) verwarf **record-anlegende Wizards** ausdrücklich:
„wäre ein neues Feature, kein Gate-Konsument … gehören in die Merklisten-/Teil-B-Ära, wo sie
zusammen entworfen werden, nicht vorher auf Verdacht." Im selben Abschnitt: die
Anlass-Wizards — `heirwiz`, `pflwiz`, `umzwiz`, `srwiz`, `anamwiz`, `gebwiz`, `kiwiz` — bleiben
unangetastet, „sie erzeugen kein Instrument, das Ergebnis einer Anlass-Prüfung ist ein
Merklisten-Eintrag."

**Der dortige Grund trägt hier nicht.** §8 sprach von **Instrument-Records** — Vollmachten,
Verfügungen —, und der Grund war, zwei Schreibpfade für dasselbe Instrument zu vermeiden
(explizit am Beispiel `vvwiz`: „vermeidet bewusst zwei Schreibpfade für dasselbe Instrument").
Ein Kind in „Kinder und Schutzbefohlene" ist kein Instrument, sondern ein Mensch, und es gibt
für ihn **keinen zweiten Schreibpfad**, der durch das Anlegen doppelt würde — die einzige
existierende Anlage-Stelle für einen Menschen in dieser Liste ist der manuelle Sektor-Edit, und
`gebwiz` tritt an dessen Seite, nicht in Konkurrenz dazu (`personFindenOderAnlegen` löst
denselben Namen auf beiden Wegen auf dieselbe Person auf).

**Die Produktanweisung vom 10.08.2026 löst die Zurückhaltung für diesen einen Fall ab.** Das ist
eine bewusste Abweichung von §8, kein stiller Sonderfall — deshalb dieses ADR statt einer
Bericht-Fußnote.

## Entscheidung — genau eine Grenze

**`gebwiz` legt bei genanntem Kindesnamen einen Eintrag in `meine-menschen.kinder` an.** Drei
neue, ausdrücklich optionale Schritte (Name, Geburtsdatum, Verhältnis) stehen am Ende des
Assistenten, vor dem Abschluss. Ohne Namen entsteht **nichts** — keine leere Zeile, kein
Platzhalter (U2-ADR-109s negative Gate-Form: eine Zeile ohne `art` wäre eine Sackgasse). Dedup
über `personFindenOderAnlegen` — derselbe Namensabgleich, den jede andere Ref-Stelle im Haus
verwendet, **kein** M6-Angebots-Weg (M6 begründete „anbieten statt verschmelzen" mit legitim
mehrfachen Institutionen gleichen Namens; ein Mensch im Personen-Register ist nicht auf
dieselbe Art legitim doppelt).

**Der Grenzsatz, wörtlich:** Ein Mensch in „Kinder und Schutzbefohlene" ist kein Instrument. Nur
`gebwiz` legt an. Die übrigen sechs Anlass-Wizards bleiben durch §8 unverändert erfasst — sie
erzeugen weiterhin keinen Record.

**Nach dem Eintrag: ein Vorschlag, kein Automatismus.** `_gebwizSubDepotVorschlagen` bietet ein
Sub-Depot für das Kind an, über den vorhandenen Weg `flowKindSubDepotAnlegen` (aus der
Kind-Zeile heraus schon vorhanden, s. F3/A131) — kein zweiter Weg, kein vorausgefülltes
Passwort. Wer ablehnt (Modal-Standard-Abbrechen), wird nicht erneut gefragt; der Weg über die
Kind-Zeile selbst bleibt jederzeit offen.

## Was ausdrücklich NICHT mitentschieden ist

Ob die übrigen sechs Anlass-Wizards ebenfalls anlegen dürfen, ist **nicht** Gegenstand dieses
ADRs. Sie bleiben unangetastet. Bei der Umsetzung wurde nicht geprüft, ob einer von ihnen
dieselbe Lücke trägt (ein Mensch, der behandelt, aber nicht angelegt wird) — das ist als
offener Punkt im Bericht vermerkt, nicht Teil dieser Entscheidung.

Kein automatisches Sub-Depot, kein automatisch gesetztes Passwort. Keine Änderung an der
Struktur von „Kinder und Schutzbefohlene" — U2-ADR-109 gilt unverändert.

## Verifikation

Volle Suite, Konformität, Kampagne Ebene 4/4b gegen Zug 0 grün. Regel-18-Probe
real rot gesehen (`tests/gebwiz-kind-eintrag.test.js`: Guard-Zeile in
`_gebwizKindEintragErstellen` temporär entfernt, Lauf rot, zurückgesetzt). Browser-Abnahme,
echter Klickweg, drei Fälle (genannter Name, kein Name, zweiter Lauf mit demselben Namen) plus
Krisenvorsorge-Personenzahl vorher/nachher mit Bildbeleg.
`tools/adr-konformitaet-pruefen.js` 0 rot.

## Nachtrag (13.08.2026) — Befristung der Ablehnung entschieden

Der Satz „wird nicht erneut gefragt" oben trug keine Befristung, und der Code-Kommentar bei
`_gebwizSubDepotVorschlagen` hielt die Frage „lebenslang vs. dieser Lauf" bis heute offen. **Die
Produktentscheidung:** dauerhaft, keine Wiederholung — wörtlich „das grenzt für mich an Bevormundung. Wer
für sein Kind ein Depot anlegen möchte tut das." Ein mit zwei Jahren abgelehntes Sub-Depot wird
mit vierzehn nicht erneut vorgeschlagen, auch wenn der Fall dann anders läge. Der Weg über die
Kind-Zeile bleibt jederzeit offen — die Ablehnung schließt die Frage, nicht den Weg.
