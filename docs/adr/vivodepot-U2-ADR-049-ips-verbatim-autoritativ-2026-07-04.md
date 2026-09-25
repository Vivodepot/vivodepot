# U2-ADR-049 — IPS (Patientenkurzakte) auf dem autoritativen Verbatim-Passthrough

**Datum:** 04.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · 04.07.2026 (gebaut inkl. „Werte übernehmen"-Option, Suite/Gates grün; Annahme = Produktentscheidung).
**Status heute:** gilt — `MED_DOK_TYPEN` führt weiterhin den Eintrag `{ typ: 'ips', … uebernahmeFormat: 'fhir-ips' }` (`vivodepot.html`, mit Verweis auf U2-ADR-049 im Code-Kommentar).
**Nummer:** U2-ADR-049 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-048).
**Typ:** Interoperabilität/Verhaltensänderung (Import-Routing für profilierte IPS-Dokumente).
**Bezug:** U2-ADR-048 (MED_DOK_TYPEN, eu-lab/eu-hdr) · U2-ADR-045 (autoritative Ablage) · U2-ADR-047 (SHL, profil-agnostisch). Der bestehende `fhir-ips`-Flatten-Import (`_fhirIpsFelder`) + die Selbst-Erzeugung `fhirIpsBundle`.

---

## Kontext

Nach eu-lab und eu-hdr fehlte die dritte EHDS-Kategorie im Verbatim-Passthrough: die **Patientenkurzakte** (International Patient Summary, IPS). Ein importierter, **provider-ausgestellter** IPS trägt seine Provenienz im Original — genau wie Lab/HDR. Bisher landete jedes eingelesene Gesundheits-Bündel (auch ein profiliertes IPS-`type=document`) im **generischen `fhir-ips`-Flatten-Import** (`_fhirIpsFelder` zieht Allergien/Medikamente/Diagnosen als komma-getrennte Bürgerfelder heraus und **verwirft das Original**). Für einen konformen SHL-Re-Share ist das falsch: das Original ginge verloren.

## Entscheidung

**IPS wird ein dritter Eintrag in `MED_DOK_TYPEN`** (`typ:'ips'`, Profil `Bundle-uv-ips` case-insensitiv, IG `hl7.fhir.uv.ips#2.0.0`, Label „Patientenkurzakte"). Da der autoritative Erkenner **vor** `fhir-ips` steht, landet ein **profiliertes IPS-`type=document`** damit **VERBATIM** als read-only Mappe-Eintrag (nicht mehr geflacht) — teilbar per SHL (047, profil-agnostisch).

**Bewusste Verhaltensänderung, eng begrenzt:**
- **Profiliertes IPS-Dokument** (`Bundle-uv-ips`, `type=document`) → **verbatim autoritativ** (neu).
- **UNprofilierte / lose FHIR-Bündel** → weiterhin `fhir-ips`-Flatten (Fallback **unverändert**).
- **`fhirIpsBundle` (Selbst-Erzeugung)** der eigenen Kurzakte aus flachen Feldern → **unberührt** (26.06.-Deliverable). IPS ist die eine Kategorie, in der Selbst-Attestierung profil-konform IST (Patient als author erlaubt) — deshalb koexistieren Selbst-Erzeugung und Verbatim-Import legitim.

**„Werte übernehmen" (gebaut):** am autoritativen Original bietet die Vorschau (`flowMappeVorschau`) — nur bei Typen MIT Feld-Mapper (heute IPS, `uebernahmeFormat:'fhir-ips'`) und in bearbeitbarem Modus — einen **optionalen Knopf**. Er liest das verbatim Original **READ-ONLY**, wendet den bestehenden `_fhirIpsFelder`-Mapper an (`medDokFelderPlan`) und füllt die flachen Felder über die bestehende Import-Vorschau (neu/gleich/konflikt + Anwenden). **Additiv, kein Ersatz:** das Original bleibt read-only und unberührt (nur gelesen). Lab/HDR haben keinen Bürgerfeld-Mapper → kein Knopf.

## Begründung

- **Ein Prinzip, jetzt vollständig:** alle drei Kategorien werden verbatim eingelesen (Upload Consumer), wenn das Original attestiert ist; PS zusätzlich selbst-erzeugbar.
- **Provenienz vor Bequemlichkeit:** das Flachlegen war bürgerfreundlich (editierbare Felder), zerstört aber das teilbare Original. Wer die Werte editierbar will, trägt sie in die Gesundheits-Felder ein; das *importierte* Original bleibt integer.
- **Erweiterung, kein Bruch:** eine Tabellenzeile in `MED_DOK_TYPEN`; Ablage + SHL + Erkennungs-Vorrang unverändert.

## Konsequenzen

- Ein profilierter IPS-Import wird jetzt „Patientenkurzakte → Original abgelegt" — die frühere Feld-Übernahme ist als **optionaler „Werte übernehmen"-Knopf erhalten** (s. Entscheidung). Beides sauber getrennt: **verwahrt als Beleg, nutzbar als Felder** — keine offene Lücke.
- `hl7.fhir.uv.ips#2.0.0` ist eine stabile Release-IG (kein Ballot/Alpha).

## Verifikation

- `tests/autoritativ-import.test.js`: IPS wird `typ='ips'` erkannt und geht `fhir-lab` (vor `fhir-ips`); loses Bündel bleibt `fhir-ips` (Flatten-Fallback); IPS verbatim abgelegt (Label „Patientenkurzakte", `gepruefteIG` ips), NICHT geflacht. Drei bestehende Tests, die IPS als „nicht-autoritativ/Flatten" pinnten, auf das neue Verhalten nachgezogen. **Werte-Übernahme:** `medDokFelderPlan` liefert für IPS einen Feld-Plan (Original unberührt), für Lab/HDR `null`; Übernahme additiv (mind. ein Feld gefüllt, Original bleibt autoritativ + read-only). `tests/shl-provider.test.js`: SHL-Round-Trip auch für IPS byte-verbatim. Fixture ursprünglich Bundle-IPS-examples-Bundle-01.json (+ HDR/Lab), portabel im Repo — am 12.09.2026 durch selbst erzeugte Profil-Bündel ersetzt (die Produktentscheidung: kein Fremdmaterial in `tests/fixtures/`; s. `tests/fixtures/README.md`).
- Node-Suite **1119/0/1** (keine Regression: kein Test verließ sich auf profiliertes-IPS→flach). WCAG **33/0**. **Block-Pin `8d31c678…` unverändert.** `vivodepot.html.sha256` nachgezogen. Kein Push.
