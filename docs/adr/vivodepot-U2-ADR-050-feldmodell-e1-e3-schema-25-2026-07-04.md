# U2-ADR-050 — Feldmodell-Regel angewandt: E1–E3 (BMI-Hint, Stub-Code-Slots, Laborwerte-Abwicklung) + Verwaisungs-Regel, Schema 25

**Datum:** 04.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 04.07.2026 (Suite/Gates grün; Annahme = Produktentscheidung).
**Nummer:** U2-ADR-050 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-049).
**Typ:** Datenmodell-Bereinigung (subtraktiv) + Gate-Abwicklung + Schema-Bump.
**Bezug:** **Datenmodell-Gesamtkonzept v1.2, §3 (Entscheidungen E1–E3, 04.07.)** · U2-ADR-042 (FHIR-Lab-Modul — hiermit abgewickelt) · U2-ADR-045/048 (autoritativer Import, der konforme Laborweg) · U2-ADR-046 ③ (fhir-lab aus dem Chooser; E3 ersetzt „bleibt dormant")

**Status heute:** gilt — Beleg `tests/schema-25-migration.test.js`.

---

## Kontext

Die Feldinventur (04.07.) zeigte drei Versprechen↔Realität-Lücken im Gesundheits-Sektor: ein **BMI-Export-Hint** ohne Generator (`koerpergroesse`/`koerpergewicht`), zwei **Code-Slots ohne lesenden Generator** (`impfungen`/`implantate`, beide Listen leere Stubs) und ein **Multi-Entry-Feld `laborwerte`**, dessen Producer-Weg (self-erzeugter `fhirLabBundle`) strukturell nie eu-lab-konform sein konnte (performer=Patient, CI-Probe 03.07.) und dessen Export bereits gezogen war. Das Datenmodell-Gesamtkonzept v1.2 setzte die Regel („Struktur nur bei spürbarem Bürger-Nutzen; Code-Slot nur mit lesendem Generator; Multi-Entry ist keine Basis-Form") und entschied E1–E3.

## Entscheidung

**E1 — BMI-Hint gestrichen.** Felder bleiben Freitext; kein Generator-Bau (kein Bürger-Nutzen erkennbar). Keine Werte betroffen.

**E2 — Stub-Code-Slots entfernt, an BEIDEN Orten.** `codeListe:'snomedImpfstoff'`/`'snomedImplantat'` fielen am Sektor-Feld **und** am anamwiz-Impfungen-Schritt (der Marker lebte doppelt). Migration flacht einen je entstandenen codierten Wert defensiv auf seinen `anzeigeName`-Klartext — praktisch ein No-op, denn über leere Stub-Listen konnte nie ein codierter Wert entstehen. **Die Stub-Registrierungen und SBOM-Einträge bleiben stehen** — ihr Schicksal regelt die Richtungs-Entscheidung „Code-Listen reisen im Template-Vertrag" (Konzept v1.2 §4, eigener Auftrag).

**E3 — Laborwerte-Erfassung samt Rubrik entfernt, Lab-Maschine abgewickelt.** Feld `laborwerte` + Sektion `labor` sind raus (kein Rudiment; `liste` bleibt als Feld-Format für Templates reserviert). Abgewickelt: `fhirLabBundle`, `LAB_ANALYTE`, `_BLUTGRUPPE_SNOMED`, `depotHatLaborwerte`, `flowGesundheitLabExport`, das **Export**-Format `fhir-lab` samt Strings, und das **Validator-Gate ersatzlos** (`tests/fhir-lab-validator.test.js`, `test:fhir` in package.json, pre-push-Zeile, `.github/workflows/fhir-lab-conformance.yml`) — es validierte einen Generator, dessen Datenquelle entfiel. Nebeneffekt: der Dauer-Push-Blocker (17 bekannte Fehler) entfällt ohne Gate-Umbau. **Kollisions-Warnung beachtet:** die **Import**-Format-id `fhir-lab` (Klasse-4-Erkennung, U2-ADR-045/048) ist unberührt — gleicher Name, anderes Schicksal, per Test gepinnt.

**Verwaisungs-Regel (Konzept v1.2 §3):** Bürgerdaten werden durch Schema-Migration **nie gelöscht**. Werte entfallener Felder (E3: `laborwerte`) bleiben **unsichtbar** im Depot erhalten und überleben Sicherung/Round-Trip; nur die Erfassungs-UI entfällt (Rendern ist definitions-getrieben; ein Orphan-Anzeige-Feature ist ausdrücklich nicht verordnet).

**Schema 24 → 25.** Migration in `depotNormalisieren`: additiv/idempotent, hebt <25 auf 25, flacht die zwei E2-Felder defensiv, fasst `laborwerte` nicht an.

## Begründung

- **Regel vor Einzelfall:** die drei Bereinigungen sind die erste Anwendung der Feldmodell-Regel aus dem Gesamtkonzept — falsche Versprechen im Code sind bei „alles public" die schlechteste Option.
- **Der konforme Laborweg existiert bereits:** autoritativer Import des Original-Befunds (Klasse 4, U2-ADR-045/048) + SHL-Share (047). Selbst-Nachbau war der falsche Weg; Verwahrung ist der richtige.
- **Ein Gate, das nur einen strukturell unkonformen Selbst-Generator prüft, gatet nichts Schützenswertes** — sein Fortbestand erzwang `--no-verify` und untergrub damit die echten Gates.

## Konsequenzen

- Positiv: drei Versprechen↔Realität-Lücken geschlossen; jeder Push läuft wieder durch die vollen (echten) Gates; die xShare-Spur (Upload Consumer) ist unberührt.
- Offen/Kosten: Wer Laborwerte je erfasst hatte, sieht sie nicht mehr (Verwaisung, dokumentiert); die Wert-Verfolgung kommt künftig per Template (Konzept v1.2 §4). `docs/konformitaet-quellen.md` und U2-ADR-042 tragen den Abwicklungs-Vermerk.

## Verifikation

- **Neu** `tests/schema-25-migration.test.js` (3 Tests): Defensiv-Flachlegung (impfungen/implantate flachen, `krankheiten` bleibt codiert); Verwaisungs-Regel (laborwerte-Altbestand überlebt `depotNormalisieren` unverändert + idempotent, keine Felddefinition mehr); Export-Format weg / **Import-Weg lebt** / anamwiz-Schritt ohne Stub.
- `tests/sektoren-spec.test.js` nachgezogen: Gesundheit **eine** Sektion, E1/E2/E3-Pins (kein BMI-Hint, drei statt fünf codeListe-Felder, kein `laborwerte`); `tests/wizard-anamwiz.test.js`-Kopf nachgezogen; `tests/load-kern.js` ohne Lab-Symbole; Schema-Pins 24→25 in 8 Testdateien.
- Node-Suite **1121/1121, 0 fail, 0 skipped** (vorher 1119 + 1 Validator-Skip). **Block-Pin `8d31c678…` unberührt** (unabhängiger Harness 24 grün/0 rot). `vivodepot.html.sha256` nachgezogen. Kein Push.
