# U2-ADR-056 — Zentrale „Daten einlesen"-Tür wird bereich-neutral („Wohin einlesen?")

**Datum:** 05.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 05.07.2026 (Suite/Gates grün; Annahme = Produktentscheidung).
**Status heute:** gilt — Beleg in `vivodepot.html`: `flowEinlesenZentral()` und der neutrale Marker `data-einlesen-zentral="1"` bestehen unverändert (u. a. Z. 15236, 23891); der in diesem ADR offen gelassene Punkt (Herausgeben-Tür noch Gesundheits-Durchstich) ist inzwischen durch U2-ADR-057 geschlossen.
**Nummer:** U2-ADR-056 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-055).
**Typ:** Wege-/Render-Struktur (kein Krypto, keine Datenmodell-Änderung).
**Bezug:** U2-ADR-055 (Einlese-Dichte — der dort BEWUSST abgegrenzte Seitenleisten-Tür-Punkt, jetzt gebaut) · U2-ADR-046 (Rein/Raus-Durchstich).

---

## Kontext

Die zentrale „Daten einlesen"-Tür in der Hauptnavigation war ein Durchstich, hart auf `gesundheit` verdrahtet (`data-einlesen-zentral="gesundheit"` → `flowEinlesen('gesundheit')`). Ein Bürger, der irgendeine Datei einlesen will, landete stets im Gesundheits-Chooser — sachlich falsch für alles Nicht-Gesundheitliche. In U2-ADR-055 wurde dieser Punkt bewusst abgegrenzt (nicht im kosmetischen Durchgang mitgezogen), weil das Ziel-Routing eine Verhaltens-Entscheidung ist. Entschieden: **die Tür wird bereich-neutral und fragt „Wohin einlesen?".**

## Entscheidung

Die zentrale Tür ruft neu `flowEinlesenZentral()` statt `flowEinlesen('gesundheit')`. Der Klick öffnet einen **„Wohin einlesen?"**-Dialog:

- **Ziel-Bereiche:** ein Knopf je Bereich mit EIGENEM (`kategorie:'sektor'`) Einlese-Format — heute acht (Identität, Meine Menschen, Finanzen, Gesundheit, Bildung, Sozialversicherung, Vorsorge, Verwaltung), jeweils mit Bereichs-Icon und -Namen. Klick → `flowEinlesen(<sektor>)` (der bekannte Bereichs-Chooser: Formate + Auto).
- **„Automatisch am Inhalt erkennen":** der Auffang-Weg ohne Bereichs-Vorwahl → `flowImportAuto()` ohne Sektor-Argument. Deckt die depot-weiten Formate (json-Sicherung, b16-Migration, geprüftes Provider-Dokument) und jedes andere erkannte Format ab; `importFormatErkennen` filtert nicht nach Bereich, jedes Format routet über seine eigene `f.sektor`-Zuordnung.

Das `data-einlesen-zentral`-Attribut trägt keinen Bereich mehr (neutraler Marker `"1"`).

**Weiter abgegrenzt — die Herausgeben-Tür.** Die symmetrische zentrale „Daten herausgeben"-Tür bleibt vorerst ein Gesundheits-Durchstich (`flowHerausgeben('gesundheit')`). Der Auftrag war ausdrücklich auf die Einlese-Seite gerichtet; der Bereich-neutrale Umbau der Raus-Seite ist ein eigener, noch offener Schritt (Produktentscheidung). Im Code und Test als solcher festgehalten.

## Begründung

- **Ehrlichkeit vor Bequemlichkeit.** „Daten einlesen" darf nicht heimlich Gesundheit meinen. Die Frage „Wohin?" macht das Ziel zur bewussten Wahl.
- **Konsistent mit U2-ADR-055 C.** Als Ziele erscheinen genau die Bereiche mit eigenem Format — dieselbe Linie wie die bereichslokalen Türen. Die depot-weiten Vorgänge liegen beim Auto-Weg, wo sie hingehören.
- **Kein Fähigkeitsverlust, kein neuer Pfad.** Die Ziele rufen die BESTEHENDEN Flows (`flowEinlesen`, `flowImportAuto`); nur die Vorschalt-Frage ist neu.

## Umsetzung

- `vivodepot.html`: STRINGS `einlesenWohinTitel`/`einlesenWohinHinweis`/`einlesenWohinAuto`; neue Funktion `flowEinlesenZentral()`; Sidebar-Tür `data-einlesen-zentral="1"` + Verdrahtung auf `flowEinlesenZentral`; abgrenzender Kommentar an der Herausgeben-Tür.
- `tests/load-kern.js`: `flowEinlesenZentral` im Verify-Hook.
- Tests: `tests/einlesen-zentral-neutral.test.js` (neu, 6 — Picker-Struktur, Ziel-Menge = Sektor-Format-Bereiche, kein Gesundheits-Routing, Ziel-Flows, strukturelle Verdrahtung). `tests/rein-raus-durchstich.test.js` + `tests/knopf-einlese-dichte.test.js` (C4) auf das neutrale Verhalten nachgezogen.
- Browser-Preview: zentrale Tür → „Wohin einlesen?" (8 Bereiche + Auto), Klick „Finanzen" → Finanz-Chooser — verifiziert.

## Konsequenzen

- **Positiv:** Die Haupt-Einlese-Tür ist ehrlich und bereich-neutral; der delineierte offene Punkt aus U2-ADR-055 ist geschlossen.
- **Offen (zum Zeitpunkt des ADR):** Symmetrische Herausgeben-Tür (noch Gesundheits-Durchstich) — Produktentscheidung; inzwischen durch U2-ADR-057 geschlossen (s. Status heute).
- **Neutral:** Suite 1157/1157 (+6), Konformität 11/11, Block-Pin `8d31c678…` unverändert. Kein Push (eine Produktentscheidung).
