# U2-ADR-048 — eu-hdr (Entlassbrief) auf dem autoritativen Passthrough; Erkenner ehrlich benannt

**Datum:** 04.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · 04.07.2026 (gebaut, Suite/Gates grün; Annahme = Produktentscheidung).
**Nummer:** U2-ADR-048 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-047).
**Typ:** Interoperabilität/Generalisierung + Namens-Hygiene (öffentliche Oberfläche).
**Bezug:** U2-ADR-045 (autoritative Original-Ablage, eu-lab) · U2-ADR-047 (SHL-Provider, profil-agnostisch) · U2-ADR-042 (Lab-Modul). xShare-Vertragskategorien: Patient Summary · Laboratory Reports · **Discharge Reports** (Gazelle-Fenster 21.08.). Spec-Recherche 04.07. (eu-hdr geladen: `hl7.fhir.eu.hdr#0.1.0-ballot`).
**Status heute:** gilt — `MED_DOK_TYPEN`, `_istAutoritativesMedDokument`, `_medDokAussteller`
und `_autoritativesMedDokumentTyp` sind im heutigen Code vorhanden (`vivodepot.html`, Zeilen
13722ff.), Lab und HDR laufen weiterhin über denselben Erkenner.

---

## Kontext

Die dritte Vertragskategorie ist der **Entlassbrief** (Hospital Discharge Report). Read-only-Inventur 04.07.: die eu-hdr-IG (`hl7.fhir.eu.hdr#0.1.0-ballot`) liefert vier `type=document`-Beispielbündel, Profil `http://hl7.eu/fhir/hdr/StructureDefinition/bundle-eu-hdr`, alle mit **echtem Autor** — `Composition.author` = Practitioner / PractitionerRole / Organization (nie Patient). Also **exakt die eu-lab-Konstellation**: der Wert liegt in der Attestierung durch die ausstellende Klinik/den Arzt, ein selbst-erzeugter Entlassbrief wäre keiner.

Damit ist Discharge **kein Neubau**, sondern derselbe Passthrough wie Lab: das echte Dokument verbatim einlesen (U2-ADR-045), read-only ablegen, konform per SHL teilen (U2-ADR-047). Ablage und SHL sind **profil-agnostisch** — sie legen/verschlüsseln das rohe `inhalt`, egal welcher Dokument-Typ. Es fehlte nur die **Erkennung** (heute lab-spezifisch: ein HDR-Dokument wurde als `fhir-ips` erkannt und geflacht → Provenienz verloren).

## Entscheidung

**Zwei kleine Edits an bestehendem Code, keine neue Krypto, kein Builder.**

- **Erkennung breiter:** eine Typ-Tabelle `MED_DOK_TYPEN` [{typ, muster, ig, label}] mit `lab` (Bundle-eu-lab) und `hdr` (bundle-eu-hdr). Profil-Muster **case-insensitiv** (eu-lab schreibt „Bundle" groß, eu-hdr „bundle" klein). Bleibt vor `fhir-ips` in der Registry.
- **Metadaten profil-abgeleitet** statt hart: `gepruefteIG` und Bürger-Label kommen aus dem erkannten Typ — lab → `hl7.fhir.eu.laboratory#2.0.0` / „Laborbefund", hdr → `hl7.fhir.eu.hdr#0.1.0-ballot` / „Entlassbrief".
- **Namens-Hygiene (öffentliche Oberfläche):** `_istFhirLabDokument` → **`_istAutoritativesMedDokument`** (der Name trug ab dem zweiten Typ eine Lüge — er erkennt jetzt Lab UND HDR). Konsequent mitgezogen: `_fhirLabAussteller` → **`_medDokAussteller`** (dieselbe Lüge, dieselbe exportierte Oberfläche). Neu: `_autoritativesMedDokumentTyp` liefert `'lab' | 'hdr' | null`.

Ein **weiterer** Dokument-Typ (z. B. IPS-Import verbatim statt geflacht) ist künftig EIN Eintrag in `MED_DOK_TYPEN` — kein Code-Zweig.

## Begründung

- **Ein Prinzip.** Lab und Discharge laufen jetzt auf demselben Passthrough; die SHL-Share-Schicht (047) teilt beide profil-agnostisch. (Patient Summary bleibt der Sonderfall: selbst-erzeugt und legitim selbst-attestiert via `fhirIpsBundle` — andere Quelle, dieselbe Share-Mechanik.)
- **Namen dürfen nicht lügen — erst recht öffentlich.** Sobald ein Erkenner zwei Typen trägt, ist „…FhirLab…" falsch; die Umbenennung jetzt verhindert, dass der dritte Typ die Lüge zementiert.

## Konsequenzen

- Discharge (21.08.) ist damit auf demselben Fundament wie Lab; der Rest ist Konformitäts-/Gazelle-Arbeit am Bündel, kein App-Neubau.
- `hl7.fhir.eu.hdr#0.1.0-ballot` ist ein **Ballot-Vorabstand** — die deklarierte `gepruefteIG` spiegelt das; die harte Validierung läuft (wie bei Lab) in CI/Gazelle, nicht im Browser.

## Verifikation

- `tests/autoritativ-import.test.js` (+2): eu-hdr wird `typ=hdr` erkannt (Lab bleibt lab, vor `fhir-ips`); verbatim abgelegt mit Label „Entlassbrief" + `gepruefteIG` hdr, nicht geflacht, `inhalt` byte-verbatim. `tests/shl-provider.test.js` (+1): SHL-JWE-Round-Trip auch für eu-hdr byte-verbatim (profil-agnostisch). Fixture ursprünglich Bundle-HDR-Paolo-Marcheschi-Example.json (IG-Beispiel), portabel ins Repo — am 12.09.2026 durch ein selbst erzeugtes Profil-Bündel ersetzt (die Produktentscheidung: kein Fremdmaterial in `tests/fixtures/`; s. `tests/fixtures/README.md`).
- Umbenennungen in `load-kern.js` + Tests nachgezogen; keine alten Namen mehr im Code.
- Node-Suite **1114/0/1**. WCAG **33/0**. **Block-Pin `8d31c678…` unverändert.** `vivodepot.html.sha256` nachgezogen. Kein Push.
