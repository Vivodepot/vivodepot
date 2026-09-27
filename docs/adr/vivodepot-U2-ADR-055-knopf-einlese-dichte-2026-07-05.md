# U2-ADR-055 — Struktur-Aufräumen „Weitere Möglichkeiten" + Einlese-Dichte: Chooser-Bündelung, Wizard-Aufklappen, Bereichs-Einlese-Guard

**Datum:** 05.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 05.07.2026 (Suite/Gates grün; Annahme = Produktentscheidung).
**Status heute:** gilt — Beleg in `vivodepot.html`: `data-export-format`/`data-export-docx` sind aus `renderSektor` entfernt (Kommentar Z. 27958ff.), `wizard-gruppe`/`wizardGruppeTitel` sowie der `kategorie === 'sektor'`-Einlese-Guard (Z. 28305) bestehen unverändert; alle Tests aus `tests/knopf-einlese-dichte.test.js` weiter vorhanden.
**Nummer:** U2-ADR-055 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-054).
**Typ:** Render-/Wege-Struktur (kein Krypto, keine Datenmodell-Änderung).
**Bezug:** v1-RC-DoD 05.07. §2 (RC-Blocker „Knopf-Flut + Einlese-Dichte") · Knopf-/Einlese-Dichte-Inventur 05.07. · U2-ADR-052 Finding 2 (ruhiges Raster) · U2-ADR-046 (Rein/Raus-Durchstich).

---

## Kontext

Die Gerätetest-Runde legte zwei Struktur-Themen frei, die im RC-DoD zu Blockern hochgezogen wurden: die **Knopf-Flut** in „Weitere Möglichkeiten" (Vorsorge stapelte zehn gleich breite Knöpfe, davon sieben geführte Einstiege) und die **Einlese-Dichte** (mehrere Türen in denselben Einlese-Flow). Die vorgeschaltete read-only Inventur (05.07.) ergab: **beide Themen sind kosmetisch lösbar, ohne ins Datenmodell (`liste`/`mehrfachauswahl`) zu greifen.** Drei Hebel wurden gebaut.

## Entscheidung

**A — Einzel-Export-Knöpfe redundanzfrei in den Herausgeben-Chooser.** Die freistehenden Sektor-Export-Knöpfe (`s.exporte` → `data-export-format`) und der Word-Knopf (`data-export-docx`) in der `zusatz-aktionen`-Sektion sind **entfallen**. Der Herausgeben-Chooser (`flowHerausgeben`) bot die maschinenlesbaren Formate ohnehin schon als „Maschinenlesbar — <Label>" an (gleiche Route `flowSektorExport`); der Word-Export ist dorthin **mitgezogen** (`data-h-docx` → `flowDocxExport`, gleiches `window.docx`-Gate). Ergebnis: EIN Knopf „Daten herausgeben" führt in den Chooser, in dem PDF, alle maschinenlesbaren Formate, Word und QR an EINER Stelle leben — kein loser Stapel mehr daneben. Die nun toten Verdrahtungen (`[data-export-format]`, `[data-export-docx]`) in `renderSektor` sind entfernt.

**B — Geführte Einstiege ab zwei Stück als Aufklapp-Zeile.** Trägt ein Bereich **zwei oder mehr** distinkte Wizards, werden die Startknöpfe hinter einer `<details class="wizard-gruppe">`-Zeile „Geführt ausfüllen" gebündelt (nativer Marker unterdrückt, eigener ▾-Pfeil; iOS-Safari-sicher). Ein **einzelner** Wizard bleibt direkter Knopf (kein Klick für nichts). Wirkung: Vorsorge fällt von sieben sichtbaren Startknöpfen auf eine Zeile; die Knöpfe selbst leben unverändert weiter, nur gebündelt.

**C — Bereichslokale Einlese-Tür nur bei eigenem Format.** Die Tür „In diesen Bereich einlesen" erscheint nur noch, wenn `importFormateFuerSektor` ein **eigenes** (`kategorie:'sektor'`) Format liefert — nicht mehr allein wegen der depot-weiten Formate (json-Wiederherstellung, b16-Migration, geprüftes Provider-Dokument), die jeder Bereich trägt. Auf `mobilitaet`/`wohnen`/`persoenliches` (kein Sektor-Format) verschwindet die Tür. **Keine Fähigkeit geht verloren:** `importFormatErkennen` filtert nicht nach Bereich — jedes Format erkennt sich am Inhalt und routet über seine eigene `f.sektor`-Zuordnung; die depot-weiten Formate bleiben über die zentrale Tür + Inhalts-Erkennung erreichbar. Die Tür verspricht so nicht länger „in diesen Bereich", während sie nur Depot-Weites böte.

**Bewusst abgegrenzt — die zentrale Seitenleisten-Tür.** Die zentrale „Daten einlesen"/„Daten herausgeben"-Tür ist ein Durchstich, hart auf `gesundheit` verdrahtet (`data-einlesen-zentral="gesundheit"`). Ob sie bereichs-bewusst werden soll (Picker / letzter Bereich) oder die bereichslokalen Türen sie ganz ablösen, ist eine **Verhaltens-/Design-Entscheidung**, kein kosmetischer Schnitt. Sie bleibt in diesem Durchgang **unverändert**; der Punkt ist als offener, separat zu entscheidender Posten im Code kommentiert und hier festgehalten.

## Begründung

- **Redundanz statt Reichtum.** Die freistehenden Export-Knöpfe wiederholten nur, was der Chooser schon konnte — sie erhöhten die Knopf-Dichte, ohne einen Weg zu eröffnen. Ein Ort für „herausgeben" ist ehrlicher und ruhiger.
- **Bündeln, nicht verstecken.** `<details>` hält die geführten Einstiege **auffindbar** (ein Klick), nimmt aber den Stapel aus dem ersten Blick. Für einen einzelnen Wizard wäre das ein Klick zu viel — daher die Zwei-Schwelle.
- **Fähigkeits-Erhalt vor Kosmetik.** Der Einlese-Guard wurde erst gebaut, nachdem verifiziert war, dass die zentrale Tür + Auto-Erkennung die depot-weiten Formate auffängt. Kosmetik darf keine Funktion nehmen.
- **Design-Entscheidungen nicht als Kosmetik tarnen.** Die gesundheit-Verdrahtung der zentralen Tür bewusst stehen gelassen — sie gehört in eine eigene, benannte Entscheidung, nicht in einen Aufräum-Commit.

## Umsetzung

- `vivodepot.html`: STRING `wizardGruppeTitel`; CSS `.zusatz-aktionen .wizard-gruppe` (Marker-Unterdrückung + ▾); `renderSektor` — Wizard-Loop sammelt `startHtml[]` und bündelt ab ≥2 in `<details>`; `s.exporte`-Block entfernt; Einlese-Guard auf `.some(f => f.kategorie === 'sektor')`; tote `data-export-*`-Verdrahtung entfernt; `flowHerausgeben` um `data-h-docx` + Verdrahtung ergänzt; abgrenzender Kommentar an der zentralen Sidebar-Tür.
- Tests: `tests/knopf-einlese-dichte.test.js` (neu, 10 — A1–A3, B1–B3, C1–C4); `tests/export-formate.test.js` Test 6 + `tests/weitere-formate.test.js` Tests 2/2b auf den Chooser/die Herausgeben-Tür umgestellt.

## Konsequenzen

- **Positiv:** Kein Bereich zeigt mehr einen Knopf-Stapel; „herausgeben" hat einen Ort; die Einlese-Türen sagen die Wahrheit. Alles ohne Datenmodell-Eingriff → RC-tauglich.
- **Offen:** Zentrale Seitenleisten-Tür (gesundheit-Durchstich) — eigene Entscheidung, s. o.
- **Neutral:** Suite 1151/1151 (+10), Konformität 11/11, Block-Pin `8d31c678…` unverändert. Kein Push (eine Produktentscheidung).
