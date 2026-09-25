# U2-ADR-064 — Erteilte Vollmachten als `liste`-Record + conditional Sub-Felder (reaktive Modal-Schicht)

**Datum:** 07.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 07.07.2026 (Suite 1207/0, VdCrypto-Block-Pin `8d31c678…` byte-identisch, Boot fehlerfrei; Annahme = Produktentscheidung).
**Revidiert durch U2-ADR-089 (17.07.2026):** Die hier exklusiv für Vollmachten gebaute `liste` `vollmachten` ist per Schema 39 in die geteilte Instrument-Liste `vorsorge_instrumente` aufgegangen (Diskriminante `typ`, Records tragen additiv `typ:'vorsorgevollmacht'`, altes Feld entfällt). U2-ADR-064s Grundsatz „erteilte Vollmacht ist ein Listen-Record" bleibt gültig; nur der Ort der Liste hat gewechselt. Wer diesen ADR ohne den Nachfolger liest, bekäme sonst die überholte Aussage, `vollmachten` sei ein eigenes Feld. Block-2-Umsetzung + Detail-Entscheidungen: **U2-ADR-089-Nachtrag** (22.07.2026).
**Status heute:** abgelöst durch U2-ADR-089 — s. Revidiert-Vermerk oben (eigene Zeile im Kopf
dieser Datei, nicht neu ermittelt). Der Grundsatz „erteilte Vollmacht ist ein Listen-Record" gilt
fort; code-bestätigt trägt der Sektor heute `vorsorge_instrumente` (`vivodepot.html`, u. a. Zeile
~5774/6269/6272), kein eigenes `vollmachten`-Feld mehr.
**Nummer:** U2-ADR-064 (höchste belegte in `docs/adr/` war U2-ADR-063).
**Typ:** Datenmodell (Schema 28→29) + Erweiterung `feldSichtbar` (Array-Wert) + neue reaktive Listen-Eintrag-Modal-Schicht.
**Bezug:** U2-ADR-063 (mehrfachauswahl — **für `vollmachtsGrundlage` supersediert**, Typ bleibt dormant) · U2-ADR-045 (Verwaisungs-Regel: Migration löscht keine Bürgerdaten) · U2-ADR-036 (kinder als liste-Record-Muster) · Feldmodell (`liste`/`ref`/`auswahl`) · Kohärenz-Inventur (07.07.2026, Bruch B).

---

## Kontext

Die Kohärenz-Inventur (07.07.) benannte den akuten Struktur-Bruch in `vorsorge`: eine erteilte Vollmacht
ist real ein **wiederholbarer Datensatz** {Art · bevollmächtigte Person · Form · Ablageort}, war aber als
Bündel loser Flachfelder modelliert — `vollmacht_person` (ref) + `vollmachtsGrundlage`
(mehrfachauswahl, U2-ADR-063) + `vollmachtsTyp` (auswahl) + `vollmacht_ort` + eine separat modellierte
`gesundheitsvollmacht_person`/`-ort`. Seit die ART mehrwertig wurde (ADR-063), mappten die EINZELNEN
Person/Form/Ort nicht mehr pro Art (welche Person hält die Bank- vs. die Gesundheitsvollmacht?). Der
mehrfachauswahl-Schritt war der richtige erste Schritt, hat den Record-Bruch aber sichtbar gemacht.

Read-only-Vorlauf: die vorhandene `liste`-Mechanik (kinder/unterhalt) kann Sub-Felder **statisch**
rendern, kennt aber KEINE Wert-abhängige Sichtbarkeit im Eintrag; die `sichtbarWenn`-Semantik existierte
nur auf **Sektor**-Ebene (`feldSichtbar`, für organspende/KI-Verfügung) und nur mit Einzel-Wert. Der
Ripple der sieben Vollmacht-Felder war breiter als „nur vvwiz": heirwiz (Gate), Dokument-Erkennung
(Leitfeld = Gate), ~12 Situations-Cross-Refs, Import-Alias-Tabelle, die Lese-App-Parallelkopie und ~15
Testdateien. **Produktentscheidung: enger Pilot** — nur die Vollmacht-Familie wird eine Liste, das Gate
`vollmacht_vorhanden` **bleibt** als eigenes Feld (das entkoppelt heirwiz/Dokument-Erkennung/Situationen).

## Entscheidung

**(1) `vorsorge/vollmachten` wird ein `liste`-Record.** Unterfelder: `art` (auswahl:
vorsorge/gesundheit/bank/betreuung/general) · `bevollmaechtigter` (ref person) · `form` (auswahl:
privat/beglaubigt/beurkundet) · `stelle` (text, **conditional**) · `ort` (text). Jede erteilte Vollmacht
ist ein Eintrag; Mehrfachheit = mehrere Einträge (nicht mehr ein mehrwertiges Feld).

**(2) `feldSichtbar` akzeptiert jetzt einen Array-Wert.** `sichtbarWenn.wert` darf ein Array sein
(trifft, wenn EINER passt); Einzel-Wert bleibt rückwärtskompatibel. Das Unterfeld `stelle` („beurkundende
/ beglaubigende Stelle") trägt `sichtbarWenn: { feld: 'form', wert: ['beurkundet','beglaubigt'] }` — bei
privatschriftlicher Form gibt es keine amtliche Stelle.

**(3) „das if" im Sub-Feld-Renderer.** `listenEintragInputsHTML` wertet pro Unterfeld `feldSichtbar`
gegen den EINTRAG aus, markiert jede Zeile mit `data-sub-zeile` und setzt sie anfangs `hidden`, wenn nicht
zutreffend. `liesEintragAusDOM` sammelt ausgeblendete Zeilen bewusst NICHT (nicht zutreffend → kein Wert).

**(4) Reaktive Modal-Schicht** (`_listenEintragBedingungVerdrahten`, Muster `_refSubPickerVerdrahten`):
ein change/input-Listener im Eintrags-Modal blendet conditional Unterfelder LIVE ein/aus — ohne Neu-Render,
damit getippte Eingaben nicht verloren gehen. Tut nichts, wenn kein Unterfeld eine Bedingung trägt.

**(5) Gate bleibt getrennt.** `vollmacht_vorhanden` (ja/nein/plant) ist weiterhin ein eigenes Sektorfeld —
es trägt die Dokument-Erkennung (Leitfeld) und heirwiz und erlaubt „in Vorbereitung" ohne Eintrag. Die
„vorhanden?"-Gate-Redundanz (Inventur Bruch A) bleibt bewusst ein späteres Cluster.

**(6) vvwiz gekappt.** Der Wizard hält nur noch Gate + ZVR-Nummer; die linearen Schritt-Engine kennt keine
Listen-Anhänge, die Detail-Erfassung lebt jetzt im Eintrags-Modal (mit conditional `stelle`).

**(7) ADR-063 für `vollmachtsGrundlage` supersediert; der mehrfachauswahl-Typ bleibt dormant.** Der
generische Render-/Validier-Mechanismus des Typs bleibt vollständig im Code (kein Live-Nutzer mehr) und ist
jederzeit wieder einsetzbar; die Typ-Tests laufen gegen ein synthetisches Feld.

## Migration (Schema 28 → 29, verlustfrei — Verwaisungs-Regel)

`depotNormalisieren` foldet nach dem 27→28-Schritt: `vollmachtsGrundlage` (Array) → ein Eintrag je Art
(gemeinsame Person/Form/Ort); ohne Art, aber mit Detail → EIN Eintrag ohne `art`. Eine unbekannte Art
bleibt als `art` erhalten (kein Verlust). `gesundheitsvollmacht_person`/`-ort` → eigener Eintrag
`art='gesundheit'`. Flachfelder werden nach dem Folden entfernt; `vollmacht_vorhanden` bleibt. Idempotent
(kein Flachfeld mehr → kein zweiter Eintrag). Die Lese-App spiegelt den Fold read-only beim Laden, damit
nicht-migrierte Alt-Dateien korrekt anzeigen.

## Konsequenzen / Ripple (umgesetzt)

- **Situations-Cross-Refs** (7 auf retired fields) → auf `vollmachten` (Listen-Zusammenfassung) umgezeigt;
  ein Blatt, das Person + Ablageort separat zog, auf EINEN Listen-Ref zusammengeführt.
- **standardDokument bankvollmacht** Feld-Verknüpfung → `vollmachten` (Art='bank' als Eintrag).
- **Import-Alias-Tabelle**: die 4 Detail-Aliase entfernt — Sektor-Format-Import kann keinen Skalar in
  einen Listen-Eintrag hängen (**bewusster Pilot-Verzicht**; native Depots deckt die Migration ab). Gate-Alias bleibt.
- **vivodepot-lesen.html**: Feld-Defs gespiegelt, Fold-Helfer + 3 Situations-Refs nachgezogen.
- **sw.js** Cache `v17→v18`. **Schema-Default** 28→29. **BUILD_DATUM** 2026-07-07.

## Alternativen (verworfen)

- **Breit (ganze Instrument-Ebene als eine morphende Liste):** bräche vvwiz/pvwiz/bwwiz/srwiz +
  Situations-Cross-Refs + Notfall; kein kleiner Pilot; Kopplung im Vorlauf nicht vermessen.
- **Volle Ablösung inkl. Gate:** verlangte Skalar→Listen-Import-Routing + Dokument-Erkennung-Rederivation
  + alle Situations-Refs — deutlich größer; abgelehnt zugunsten der Gate-behalten-Grenze.

## Status der Gates

Suite **1207/0**; VdCrypto-Block-Pin `8d31c678…` byte-identisch (Lese-App T-A-02 grün); `vivodepot.html.sha256`
nachgezogen (`018fbc62…`). Playwright-E2E (Bereich außerhalb `node --test`) am Mac/CI zu bestätigen: der
vvwiz-Reise-Spec bleibt gültig (Schritt 0↔1 + Abbrechen), Cross-Fixtures reise-1/6 auf `zvr_nummer`
umgezeigt. **Kein Push** — Push ist eine Produktentscheidung.
