# U2-ADR-042: FHIR-Lab-Modul — Laborbericht nach HL7 Europe Laboratory Report; Validator-Anker umgestellt

**Status:** Akzeptiert · **abgewickelt 04.07.2026 (U2-ADR-050, E3):** Producer-Weg (Feld `laborwerte`, `fhirLabBundle`, Export-Format, Validator-Gate) ersatzlos entfernt — der konforme Laborweg ist der autoritative Import (U2-ADR-045/048). Dieses ADR bleibt als Bau-Historie.
**Datum:** 01.07.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL, KONFORMITÄT
**Status heute:** abgelöst durch U2-ADR-050 (E3) — wie in der Status-Zeile oben bereits
vermerkt. Bestätigt im heutigen Code: `laborwerte` ist in der Liste der entfernten Felder
geführt (`entferntAm: '2026-07-04', adr: 'U2-ADR-050'`), `fhirLabBundle` existiert nicht mehr;
der konforme Laborweg läuft seither über den autoritativen Import (U2-ADR-045/048).
**Cross-Referenz:** T3.4 / IPS-Export (U2-ADR-004 Skip-when-not-installed, IPS-Konformitäts-Gate). Der IPS-Export (`fhirIpsBundle`) bleibt als Feature; seine Struktur deckt `tests/fhir-ips.test.js` ab. Externe Orakel-Methodik (Konformität aus veröffentlichten Profilen/Validatoren, nicht aus Modellen).

---

## Kontext

Der FHIR-Export deckte bisher nur die **Patientenkurzakte (IPS)** ab (`fhirIpsBundle`, Bundle-uv-ips, validiert gegen `hl7.fhir.uv.ips#2.0.0`). Stufe 2 ergänzt einen **maschinenlesbaren Laborbericht** — ausgewählte Laborwerte, die eine Ärztin/ein Labor als strukturiertes FHIR entgegennehmen kann.

Das dafür einschlägige, europäisch harmonisierte Profil ist der **HL7 Europe Laboratory Report** (`hl7.fhir.eu.laboratory`, gepinnt auf das Vorab-Release **2.0.0-alpha**, FHIR R4 — dieselbe Version, gegen die Gazelle validiert; die frühere Wahl 0.1.1 wurde nach der ersten Gazelle-Runde auf 2.0.0-alpha gehoben). Er profiliert `Bundle-eu-lab` (Dokument), `Composition-eu-lab`, `DiagnosticReport-eu-lab`, `Observation-resultslab-eu-lab`, `Specimen-eu-lab`.

## Entscheidung

1. **Validator-Anker umgestellt** (nicht additiv koexistierend): der EINE FHIR-Konformitäts-Gate validiert jetzt das **Lab-Bundle** gegen `hl7.fhir.eu.laboratory#2.0.0-alpha` (`Bundle-eu-lab`). `fhirIpsBundle` bleibt als Feature erhalten, ist aber nicht mehr der validierte Artefakt (Struktur-Coverage: `tests/fhir-ips.test.js`).
2. **Generator `fhirLabBundle()`** (Muster wie `fhirIpsBundle`): `Bundle-eu-lab` (Dokument, Composition zuerst, identifier, timestamp) → `Composition-eu-lab` → **genau ein** `DiagnosticReport-eu-lab` (Pflicht-Extension `DiagnosticReport.composition`, R5-Backport) → je Messung eine `Observation-resultslab-eu-lab` (`category:laboratory` fix, `performer` 1..\*, `effective` 1..1) → eine `Specimen-eu-lab`. DiagnosticReport ↔ Composition auf **subject/identifier/type-Coding** ausgerichtet und **beidseitig verlinkt**: DR-seitige Pflicht-Rückverknüpfung `DiagnosticReport.composition` (R5-Backport, 1..1) plus Composition-seitiger Vorwärts-Link `composition-diagnosticReportReference` (Dokument-Erreichbarkeit).
3. **Datenmodell A (mehrwertig):** neue Liste `laborwerte` im Gesundheits-Sektor (`typ: 'liste'`, je Eintrag `{analyt, wert, einheit, ref_low, ref_high, datum}`) für **Hb/Kreatinin/CRP** (numerisch → `valueQuantity` mit UCUM + `referenceRange`). Die **Blutgruppe** speist der Generator aus dem **bestehenden** `blutgruppe`-Feld (codiert, `valueCodeableConcept`/SNOMED CT) — **keine Dublette**.
4. **UI geschenkt** über den bestehenden `typ:'liste'`-Mechanismus (Render + Add/Edit/Remove); bewusst **begrenzt auf Hb/Kreatinin/CRP** (Analyt-Auswahl) + Blutgruppe. Neuer Export-Knopf „Laborbericht als maschinenlesbare Datei" (Format `fhir-lab`).
5. **Fertig-Kriterium:** ein **verpflichtender CI-Validator-Lauf** gegen `hl7.fhir.eu.laboratory#2.0.0-alpha` (`.github/workflows/fhir-lab-conformance.yml`, `FHIR_VALIDATOR_REQUIRED=1`). Die tiefe Profil-/Terminologie-Konformität gatet **CI** (Netz zum Package-Registry), nicht die lokale Sandbox.

## Begründung

- **Anker umstellen statt koexistieren:** ein FHIR-Gate, klar auf das neu gebaute Artefakt gerichtet; kein zweiter, teilweise redundanter Validator-Lauf. Der IPS-Export verliert nur den *Validator*, nicht die Struktur-Prüfung.
- **`typ:'liste'` statt neuem Feld-Typ:** der mehrwertige Listen-Mechanismus (wie `kinder`, `unterhalt`) trägt Render + Editier-Flows bereits — kein neuer UI-Code, geringeres Risiko.
- **Blutgruppe aus dem Altfeld:** konstant, bereits in Notfall/Situationen genutzt; Wiederverwendung vermeidet zwei Wahrheiten.
- **Klinische Codes im abgegrenzten Export-Bereich:** LOINC/UCUM/SNOMED CT leben — wie schon die IPS-Strukturcodes — **nur** im klar umrissenen FHIR-Export-Modul, nicht in der übrigen App-Logik. Der Guard-Test `andock-code.test.js` schneidet diesen Bereich (Header … Ende `flowSektorExport`) heraus; die Invariante „keine gestreuten Code-Systeme im Kern" bleibt.
- **`nurExport`:** ein Laborbericht ist medizinischer Interchange-**Ausgang** (kein Reimport). Die Datenportabilität der Laborwerte deckt der JSON-Voll-Export. Symmetrisch zum bestehenden `nurImport`.

## Konsequenzen

- **Umbenannt (ehrlicher Name nach „umstellen"):** `tests/fhir-ips-validator.test.js` → `tests/fhir-lab-validator.test.js`; `.github/workflows/fhir-ips-conformance.yml` → `fhir-lab-conformance.yml`; Env `FHIR_IPS_IG` → `FHIR_LAB_IG`; `package.json`-Script `test:fhir` nachgezogen; `docs/konformitaet-quellen.md` aktualisiert. Verwaiste `ips-bundle.example.json`-Fixture entfernt (nichts regeneriert/liest sie mehr).
- **Struktur-Tests lokal grün** (immer, ungated): Bundle-eu-lab, Composition zuerst, genau ein DiagnosticReport, `category:laboratory`/`performer`/`effective`/`value` je Observation, UCUM + referenceRange, SNOMED-Blutgruppe, alle Referenzen aufgelöst, DR↔Composition ausgerichtet + **beidseitig verlinkt** (DR→Composition R5-Extension, Composition→DR `composition-diagnosticReportReference`).
- **Über Gazelle-Runden (Matchbox, 2.0.0-alpha) nachgezogen:** (1) Pin `0.1.1`→`2.0.0-alpha`; (2) Composition→DiagnosticReport-**Pflicht-Slice** `composition-diagnosticReportReference` — Canonical im **Laboratory-IG** (`_LAB(...)`), NICHT `/fhir/extensions/` (der einzige echte Struktur-Error der 2. Runde); (3) Patient **ohne** `meta.profile` — `Patient-eu-lab` existiert in 2.0.0-alpha nicht (Bundle-eu-lab bindet über die Entry-Slice). **Als harmlos bestätigt** (kein Validator-Error): fehlendes `category`-Coding + `performer`=Patient. **Terminologie-Infrastruktur, nicht das Bundle:** 14 der 15 „Errors" der 2. Runde waren tx.fhir.org-Ausfälle (Cache-Session verloren + Socket-Timeouts) an den codierten Elementen (LOINC/UCUM/SNOMED) — ein Re-Run bei gesundem tx-Server ist nötig, um die Code-Bindings echt zu prüfen.
- **tx-Härtung des Gates (02.07.):** Der Validator-Test trennt bei Exit≠0 **echte** Konformitätsfehler (immer hart rot) von reinen **tx-Server-Ausfällen** (tx.fhir.org Timeout / „cache not known" / 5xx → kein Fehlschlag; die Struktur bleibt durch den ungated Fixture-Test gesichert). Klassifikation konservativ (nur eindeutige Server-DOWN-Signaturen), `-output`-OperationOutcome als Grundlage, `FHIR_TX_STRICT=1` erzwingt volle Terminologie. Ein **Klassifikator-Unit-Test** (läuft immer) pinnt, dass echte Fehler NIE als tx maskiert werden. Grund: unser CI-/pre-push-Gate nutzt denselben tx.fhir.org — es soll bei echten Fehlern rot, bei tx-Ausfall aber nicht Geisel des Fremd-Servers sein.
- **Suite 1091/1090 grün** (1 bewusster Skip = Lab-Validator ohne `FHIR_VALIDATOR_REQUIRED`; +1 Test = Klassifikator). Drei antizipierte Regressionen invariant-treu gelöst (andock-code-Carve-out erweitert, `nurExport`-Ausnahme, Gesundheit-Sektionszahl 1→2).
- **Krypto unberührt:** Block-Pins `8d31c678…` (VdCrypto) + `d0541ea7…` (JWS) byte-identisch (Integritäts-Tests grün). `vivodepot.html.sha256` nachgezogen (`fc76672a…`).
- **Kein Push** — lokaler Stand; der erste Push (und damit der scharfe CI-Validator-Lauf) ist eine bewusste eine Produktentscheidung. Push, der Workflow-Dateien betrifft, braucht `workflow`-Scope am Token.

## Cross-Referenz

HL7 Europe Laboratory Report `hl7.fhir.eu.laboratory#2.0.0-alpha` (Bundle-eu-lab / Composition-eu-lab / DiagnosticReport-eu-lab / Observation-resultslab-eu-lab / Specimen-eu-lab). U2-ADR-004 (Skip-when-not-installed, HL7-Validator-Gate). `tests/fhir-ips.test.js` (fortbestehende IPS-Struktur-Coverage). Backlog: SNOMED-Blutgruppe künftig über den Code-Listen-Mechanismus statt Modul-Konstante; optionale `category`-Ausrichtung nach erstem CI-Befund.
