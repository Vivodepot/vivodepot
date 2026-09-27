# B16-ADR-064: Beziehungs-Codierung Anker-Person zu Sub-Depot-Eigentümer

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 28.04.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** akzeptiert
- **Datum:** 2026-04-28
- **Kategorien:** ARCHITEKTUR | DATENMODELL | INTEROP
- **Format:** MADR 4.0 mit Vivodepot-Erweiterungen (Kategorien-Header, Nachweis-Abschnitt; analog B16-ADR-061, B16-ADR-062, B16-ADR-063)
- **Vorgänger:** B16-ADR-052 (Sorge-Struktur), B16-ADR-063 (FHIR-Provenance)
- **Nachfolger geplant:** B16-ADR-065 (Template-Übergabe-Mechanismus)
- **Bezug:** B16-ADR-063 Klärung 1 plus Lücke 3; Datenfelder des Sub-Depot-Eigentümers.

## Kontext und Problemstellung

In B16-ADR-063 wurde entschieden, dass die Anker-Person beim Sub-Depot-IPS-Export als RelatedPerson-Resource im FHIR-Bundle erscheint. RelatedPerson hat ein Pflicht-Feld `relationship`, das die Beziehung zwischen RelatedPerson und Patient (Sub-Depot-Eigentümer) codiert. Die konkrete Beziehungs-Codierung wurde in B16-ADR-063 als Lücke 3 markiert und durch B16-ADR-064 geschlossen.

Plus: das Vivodepot-interne Datenmodell (aus AP 5.6 Sub-Depot-Anlage) hat aktuell kein explizites Feld zur Erfassung der Beziehung zwischen Anker-Person und Sub-Depot-Eigentümer. Diese Information ist beim FHIR-Export nicht verfügbar — beim Sprint 2 von AP 6 wurde RelatedPerson.relationship deshalb mit dem Platzhalter-Code `OTH` (Other) erzeugt und im Code-Kommentar dokumentiert „Beziehung wird mit B16-ADR-064 spezifiziert".

Beide Lücken werden durch B16-ADR-064 geschlossen — die Vivodepot-interne Datenmodell-Erweiterung um ein `beziehungZu`-Feld plus die Codierungs-Konvention plus das FHIR-Mapping.

**Frage:** Welche Codierung wird für die Beziehung Anker-Person zu Sub-Depot-Eigentümer verwendet, wie wird sie im Vivodepot-Datenmodell erfasst, und wie wird sie auf RelatedPerson.relationship abgebildet, sodass FHIR-Spec-Konformität, Niedrigschwelligkeits-Disziplin und Standards-Bevorzugung gleichzeitig erfüllt sind?

## Entscheidungstreiber

- **Standards-Disziplin.** Vivodepot bevorzugt etablierte Standards gegenüber eigenen Lösungen, wo immer möglich. HL7-V3-RoleCode existiert als etablierter Standard für Familien- und Beziehungs-Rollen, mit etwa 50+ Codes.
- **FHIR-Spec-Konformität.** RelatedPerson.relationship ist ein CodeableConcept mit Coding-Liste. Code-System-URI: `http://terminology.hl7.org/CodeSystem/v3-RoleCode`.
- **Niedrigschwelligkeits-Disziplin.** Die Anker-Person ist Bürger, nicht klinisch geschult. HL7-V3-RoleCode-Werte sind Englisch-Abkürzungen (`SPS`, `CHILD`, `PRN`) — für UI-Anzeige unbrauchbar. Die UI muss deutsche Klartext-Bezeichnungen anzeigen.
- **Subset statt voller Code-Liste.** Etwa 14 Codes plus „Andere Beziehung" mit Freitext-Feld, um die Auswahl niedrigschwellig zu halten.
- **Werkzeug-Philosophie.** Anker-Person dokumentiert Rolle gegenüber Sub-Depot-Eigentümer explizit bei Sub-Depot-Anlage. Audit-Spur entsteht von Anfang an.
- **Anschluss an B16-ADR-063.** RelatedPerson.relationship wird aus dem `beziehungZu`-Feld konstruiert.
- **Anschluss an B16-ADR-052 und B16-ADR-062.** Provenance-Disziplin wird auch auf das `beziehungZu`-Feld angewendet — Änderungen werden in der Provenance dokumentiert.
- **EHDS-Anschluss-Fähigkeit.** EHDS verlangt etablierte Code-Systeme bei grenzüberschreitendem Austausch. HL7-V3-RoleCode ist anschluss-fähig.

## Geprüfte Optionen

1. **Option A — HL7-V3-RoleCode als interne Speicherung plus deutsche UI-Übersetzung plus FHIR-Coding mit Code und Display.** HL7-Codes werden im Datenmodell gespeichert; UI hat konstante Übersetzungs-Tabelle.
2. **Option B — Vivodepot-eigene Codierung im Vivodepot-Namespace.** Eigener URN-Namespace plus Inline-CodeSystem.
3. **Option C — Mix-Codierung mit beiden URIs (HL7-V3 plus Vivodepot-eigen).** FHIR-CodeableConcept mit zwei Codings.
4. **Option D — Implizite Heuristik aus Sub-Depot-Beschreibung.** Beziehung wird heuristisch abgeleitet, kein explizites Feld.

## Entscheidung

Gewählt: **Option A — HL7-V3-RoleCode als interne Speicherung plus deutsche UI-Übersetzung plus FHIR-Coding mit Code und Display.**

### Vivodepot-internes Datenmodell

Das Datenmodell pro Sub-Depot-Eigentümer wird um ein neues Pflicht-Feld `beziehungZu` erweitert:

```js
{
  // bestehende Felder aus AP 5.6
  vorname: '...',
  nachname: '...',
  geburtsdatum: '...',
  // ...
  beziehungZu: 'CHILD'  // NEU, Pflicht-Feld, HL7-V3-RoleCode-String
}
```

Pflicht-Feld bei der Sub-Depot-Anlage. Bei bestehenden Sub-Depots, die vor der Schema-4-Migration angelegt wurden, wird der Default-Wert `"OTH"` gesetzt mit UI-Markierung „Beziehung bitte ergänzen".

Nachträgliche Änderbarkeit erlaubt — etwa wenn die Vollmachts-Grundlage sich ändert. Jede Änderung wird in der Provenance dokumentiert (analog AP 5.5).

### UI-Übersetzungs-Tabelle (Vorschlag, vor Sprint-Start zu verifizieren)

Konstante Übersetzungs-Tabelle: HL7-V3-Code → deutsche Klartext-Anzeige aus Anker-Sicht.

Vorschlags-Subset von 14 Codes plus „Andere Beziehung":

| HL7-V3-Code (Vorschlag) | UI-Anzeige aus Anker-Sicht | Englischer Display-String |
|---|---|---|
| `SPS` | Ich bin Ehepartner oder Lebensgefährte dieser Person | Spouse |
| `DOMPART` | Ich bin in eingetragener Lebenspartnerschaft mit dieser Person | Domestic Partner |
| `CHILD` | Ich bin das Kind dieser Person | Child |
| `STPCHLD` | Ich bin das Stiefkind dieser Person | Stepchild |
| `ADOPT` | Ich bin das adoptierte Kind dieser Person | Adopted Child |
| `PRN` | Ich bin das Elternteil dieser Person | Parent |
| `STPPRN` | Ich bin der Stiefelternteil dieser Person | Stepparent |
| `SIB` | Ich bin Bruder oder Schwester dieser Person | Sibling |
| `GRPRN` | Ich bin Großelternteil dieser Person | Grandparent |
| `GRNDCHILD` | Ich bin Enkelkind dieser Person | Grandchild |
| `NIENE` | Ich bin Nichte oder Neffe dieser Person | Niece/Nephew |
| `AUNT` / `UNCLE` | Ich bin Tante oder Onkel dieser Person | Aunt / Uncle |
| `INLAW` | Ich bin Schwiegerverwandtschaft dieser Person | In-Law |
| `FRND` | Ich bin Freund oder Freundin dieser Person (Vollmachts-Bezug) | Friend |
| `OTH` | Andere Beziehung (Freitext eingeben) | Other |

Bei Auswahl `OTH` erscheint zusätzliches Freitext-Feld. Maximum 100 Zeichen. Wird beim FHIR-Export als CodeableConcept.text ausgegeben.

### FHIR-Coding-Erzeugung beim IPS-Export

```js
{
  coding: [{
    system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
    code: "CHILD",
    display: "Mein Kind"
  }]
}
```

Bei OTH mit Freitext:

```js
{
  coding: [{
    system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
    code: "OTH",
    display: "Andere Beziehung"
  }],
  text: "Patenkind"
}
```

### Bezugsrichtung

Codierung aus Patient-Sicht (Sub-Depot-Eigentümer ist Patient). UI-Anzeige aus Anker-Sicht („Ich bin ..."). Beispiel: Anker Maria pflegt Vater Karl → `beziehungZu = "CHILD"`, weil Maria-als-RelatedPerson Child of Karl-als-Patient ist.

### Pro Sub-Depot eigene Beziehungs-Codierung

Bei mehreren Sub-Depots: jedes Sub-Depot trägt eigene Beziehungs-Codierung. Bei Karls Sub-Depot `"CHILD"`, bei Lisas Sub-Depot `"PRN"`.

### Etappierung — eigener Schema-4-Bump

`beziehungZu`-Feld kommt als eigener **Schema-4-Bump** (additive Erweiterung), nicht als nachträgliche Schema-3-Erweiterung. Schema-3 ist abgeschlossen und gepusht. Schema-4 trägt die Erweiterung mit klarer Audit-Spur.

Sprint-Anschluss: zwischen AP-6-Sprint-2 und Sprint-3 (etwa Sprint-2.5).

Implementations-Schritte analog AP-5.8 plus AP-6-Sprint-1:

1. Schema-4-Bump (`SCHEMA_VERSION_AKTUELL = 4`)
2. `_migriereSchema3Auf4`-Funktion — fügt `beziehungZu`-Feld in jedes Sub-Depot ein, Default `"OTH"`
3. Migrations-Toast `_maybeShowBeziehungMigrationToast`
4. UI-Erweiterung im Sub-Depot-Anlage-Wizard
5. UI-Markierung „Beziehung bitte ergänzen" für migrierte Sub-Depots
6. FHIR-Mapping-Erweiterung: OTH-Platzhalter durch echte Codierung ersetzen

### Test-Disziplin

Klasse-A-Tests:

- Schema-4-Bump-Migration ohne Datenverlust
- Pflicht-Feld-Validierung — neues Sub-Depot ohne `beziehungZu` ablehnbar
- FHIR-Mapping-Konsistenz — RelatedPerson.relationship trägt korrekten HL7-V3-Code

Klasse-B-Tests:

- UI-Anlage-Wizard-Erweiterung
- Migrations-Toast einmalig
- OTH-Freitext (max. 100 Zeichen, FHIR-text-Übertragung)

## Vor-Aufgabe — HL7-V3-RoleCode-Verifikation

Vor der Implementation werden die exakten HL7-V3-RoleCode-Strings für die 14-plus-OTH-Subset gegen das offizielle HL7-Code-System (`http://terminology.hl7.org/CodeSystem/v3-RoleCode`) verifiziert.

Verifikations-Punkte mit hoher Unsicherheit:

- `DOMPART` — eingetragene Lebenspartnerschaft. Code-String könnte anders heißen.
- `STPCHLD` — Stiefkind. Mögliche Alternative: `STPCHILD`.
- `AUNT` und `UNCLE` — möglicherweise getrennt oder zusammengefasst.
- `NIENE` — Nichte/Neffe. Mögliche Alternative: `NIECENEPHEW`.
- `FRND` — Freund. Mögliche Alternative: `FRIEND`.

**Aufwand:** ~30–45 Min Web-Recherche plus 15–20 Min Konsolidierung.

**Bei nicht-existierenden Codes:** alternative Codes prüfen, sonst aus Subset entfernen und durch `OTH` mit Freitext-Vorschlag ersetzen.

## Konsequenzen

**Positiv.**

- Standards-Disziplin gewahrt — HL7-V3-RoleCode ist etablierter Standard.
- Niedrigschwelligkeit erhalten — UI zeigt deutsche Klartext-Bezeichnungen aus Anker-Sicht.
- EHDS-Anschluss-Fähigkeit gegeben.
- FHIR-spec-konform.
- Audit-Spur durchgängig.
- Schema-4-Bump als eigene Migrations-Schicht — methodisch sauber.

**Negativ.**

- Implementations-Aufwand für Schema-4-Bump und UI ~60–90 Min plus Verifikations-Aufgabe ~1 Std.
- UI-Aufforderung „Beziehung bitte ergänzen" für migrierte Sub-Depots als zusätzliche UX-Schicht.
- Subset-Auswahl ist UX-Detail-Entscheidung — komplexe Konstellationen unter OTH.

**Neutral.**

- Sprint-3-Anschluss-Detail wird bei Sprint-Start entschieden.
- HL7-V3-Code-Verifikation könnte zu Subset-Anpassungen führen.

## Vor- und Nachteile der Optionen

### Option A (gewählt)

- **Gut:** Standards-Disziplin; Niedrigschwelligkeit; FHIR-spec-konform; EHDS-anschluss-fähig; Audit-fest; methodisch konsistent mit B16-ADR-063.
- **Schlecht:** Subset-Wahl als UX-Detail; HL7-V3-Code-Verifikation als Vor-Aufgabe.

### Option B

- **Gut:** Volle Kontrolle; eigene Klartext-Beschreibungen.
- **Schlecht:** Nicht spec-konform; Empfänger-Systeme erkennen Codes nicht; widerspricht Standards-Disziplin.

### Option C

- **Gut:** Empfänger-Systeme können wählen.
- **Schlecht:** Redundant; widerspricht Standards-Disziplin; Implementations-Komplexität ohne Mehrwert.

### Option D

- **Gut:** Kein UI-Aufwand.
- **Schlecht:** Heuristik unsicher; Audit-Wert geht verloren; FHIR-Codierung unzuverlässig.

## Nachweis

> „The Provenance resource is based on the W3C Provenance specification ... HL7-V3-RoleCode-System provides a comprehensive set of codes for personal relationships including FamilyMember and NonFamilyMember subhierarchies."
>
> — *[FHIR R4 Specification plus HL7 Terminology v3-RoleCode-System, hl7.org, abgerufen 28.04.2026]*

> „The nature of the relationship between a patient and the related person."
>
> — *[FHIR R4 Specification, RelatedPerson.relationship element, hl7.org/fhir/R4/relatedperson.html, abgerufen 28.04.2026]*

> „Standards bevorzugen wir gegenüber eigenen Lösungen, wo immer möglich."
>
> — *[Klärungs-Vorgabe, ADR-Sitzung 28.04.2026]*

> „Variante c (Mix-Codierung) ist nicht ‚Standards bevorzugen', sondern ‚Standards plus eigene Schicht'. Wenn HL7-V3-RoleCode existiert und für FHIR-RelatedPerson.relationship vorgesehen ist, schaffen wir keinen parallelen Vivodepot-Namespace."
>
> — *[Korrektur nach Standards-Verifikations-Anker, 28.04.2026]*

> „RelatedPerson.relationship-Lücke wird durch B16-ADR-064 geschlossen."
>
> — *[B16-ADR-063 Lücke 3 vom 28.04.2026, Vivodepot-Repository]*

## Klärungs-Spuren — sechs Klärungen aus der ADR-Sitzung 28.04.2026

**Klärung 1 — `beziehungZu` als Pflicht-Feld pro Sub-Depot-Eigentümer.** Pflicht-Feld, nicht optional. Nachträgliche Änderbarkeit mit Audit-Spur in Provenance.

**Klärung 2 — HL7-V3-RoleCode als interne Speicherung plus deutsche UI-Übersetzung.** HL7-V3-Werte als String im Datenmodell, deutsche Klartext aus Anker-Sicht in der UI über konstante Übersetzungs-Tabelle.

**Klärung 3 — 14-Code-Subset plus OTH-Freitext.** Kuratierte Subset für häufige Beziehungen plus `OTH` mit Freitext für Sonderfälle. Die exakten Code-Strings werden verifiziert.

**Klärung 4 — Codierung aus Patient-Sicht, FHIR-spec-konform.** HL7-V3-Code aus Patient-Sicht. UI-Anzeige aus Anker-Sicht. Pro Sub-Depot eigene Beziehungs-Codierung.

**Klärung 5 — Etappierung in eigenem Schema-4-Bump.** Eigener Schema-4-Bump (additive Migrations-Schicht), nicht nachträgliche Schema-3-Erweiterung. Sprint-Anschluss zwischen AP-6-Sprint-2 und Sprint-3.

**Klärung 6 — Test-Disziplin.** Klasse-A-Tests für Schema-4-Bump, Pflicht-Feld-Validierung, FHIR-Mapping-Konsistenz. Klasse-B-Tests für UI, Migrations-Toast, OTH-Freitext.

## Lücken in dieser ADR

**Lücke 1 — HL7-V3-Code-Strings nicht final verifiziert.** Die Subset-Codes sind Vorschläge und müssen vor Sprint-Start verifiziert werden (siehe Vor-Aufgabe oben).

**Lücke 2 — UI-Mockup für den Beziehungs-Auswahl-Dialog steht aus.** Form (Drop-Down, Radio, Such-Feld) wird in Sprint 3 entschieden.

**Lücke 3 — Komplexe Beziehungs-Konstellationen unter OTH.** Patenkind, Wahlverwandtschaft, Pflegekind unter `OTH` mit Freitext. Subset kann später erweitert werden.

**Lücke 4 — Migrations-UX für bestehende Sub-Depots.** Markierung „Beziehung bitte ergänzen" braucht UX-Form, die sichtbar aber nicht aufdringlich ist. Detail-Klärung in Sprint 3.

## Weiterführend

**Implementations-Bezug.** Schema-4-Bump in `code/VIVODEPOT.html`, AP-6-Sprint-2.5 oder Sprint-3-Vorbereitung. Funktion-Skizzen: `_migriereSchema3Auf4(data)`, `_maybeShowBeziehungMigrationToast(data)`, UI-Erweiterung im Sub-Depot-Anlage-Wizard, FHIR-Mapping-Erweiterung in `buildAnkerRelatedPerson`.

**Verwandte ADRs.**

- B16-ADR-052 (Sorge-Struktur) — Vorgänger.
- B16-ADR-062 (Provenance-Erhaltung beim Sub-Depot-Export) — methodisch verwandt für Provenance-Disziplin.
- B16-ADR-063 (FHIR-Provenance bei Sub-Depot-IPS-Export) — schließt RelatedPerson.relationship-Lücke 3 durch B16-ADR-064.
- **B16-ADR-065 (Template-Übergabe-Mechanismus, geplant)** — eigene Klärungs-Sitzung.

**Folge-Aktivitäten.**

- HL7-V3-Code-Verifikation als Vor-Aufgabe vor Sprint-Start.
- UI-Mockup für Beziehungs-Auswahl-Dialog in Sprint 3.
- Anwaltliche Validierung der DSGVO-Audit-Konformität in Phase 3 NLnet-Roadmap.
- EHDS-Konformitätsprüfung 2027–2028.

---

## Vor-Aufgabe-Output — HL7-V3-Verifikation 02.05.2026

Recherche gegen HL7 Terminology v2.2.0 (`http://terminology.hl7.org/CodeSystem/v3-RoleCode`). Drei Korrekturen gegenüber der Vorschlags-Tabelle:

### Verifizierte Subset-Tabelle (final)

| HL7-Code | System-URI | Display (offiziell) | Status | Vivodepot-UI-Anzeige (deutsch, aus Anker-Sicht) |
|---|---|---|---|---|
| `SPS` | v3-RoleCode | spouse | active | Ich bin Ehepartner oder Lebensgefährte dieser Person |
| `DOMPART` | v3-RoleCode | domestic partner | active | Ich bin in eingetragener Lebenspartnerschaft mit dieser Person |
| `CHILD` | v3-RoleCode | child | active | Ich bin das Kind dieser Person |
| `STPCHLD` | v3-RoleCode | step child | active | Ich bin das Stiefkind dieser Person |
| **`CHLDADOPT`** | v3-RoleCode | adopted child | active | Ich bin das adoptierte Kind dieser Person |
| `PRN` | v3-RoleCode | parent | active | Ich bin das Elternteil dieser Person |
| `STPPRN` | v3-RoleCode | step parent | active | Ich bin der Stiefelternteil dieser Person |
| `SIB` | v3-RoleCode | sibling | active | Ich bin Bruder oder Schwester dieser Person |
| `GRPRN` | v3-RoleCode | grandparent | active | Ich bin Großelternteil dieser Person |
| `GRNDCHILD` | v3-RoleCode | grandchild | active | Ich bin Enkelkind dieser Person |
| **`NIENEPH`** | v3-RoleCode | niece/nephew | active | Ich bin Nichte oder Neffe dieser Person |
| `AUNT` | v3-RoleCode | aunt | active | Ich bin Tante dieser Person |
| `UNCLE` | v3-RoleCode | uncle | active | Ich bin Onkel dieser Person |
| `INLAW` | v3-RoleCode | inlaw | active | Ich bin Schwiegerverwandtschaft dieser Person |
| `FRND` | v3-RoleCode | unrelated friend | active | Ich bin Freund oder Freundin dieser Person (Vollmachts-Bezug) |
| **`OTH`** | **v3-NullFlavor** | other | active | Andere Beziehung (Freitext eingeben) |

### Drei Korrekturen gegenüber dem ADR-Vorschlag

1. **`ADOPT` → `CHLDADOPT`.** ADOPT ist in HL7-V3-RoleCode v2.2.0 als **retired** markiert. Der aktive Nachfolger ist `CHLDADOPT` (Adopted Child). Vivodepot-Implementierung verwendet ausschließlich `CHLDADOPT`. ADOPT wird in Schema-4-Migration als gleichbedeutend behandelt, falls bestehende Daten den retired-Code tragen — Migration mappt `ADOPT → CHLDADOPT`.

2. **`NIENE` → `NIENEPH`.** Der korrekte case-sensitive String ist `NIENEPH` (Niece-Nephew-Komposition). `NIENE` existiert nicht im RoleCode-System.

3. **`OTH` System-URI: v3-RoleCode → v3-NullFlavor.** `OTH` existiert _nicht_ als RoleCode-Eintrag. Im FHIR-Ökosystem wird `OTH` aus dem v3-NullFlavor-System (`http://terminology.hl7.org/CodeSystem/v3-NullFlavor`) für „other relationship" verwendet. Vivodepot-FHIR-Mapping verwendet bei OTH die NullFlavor-System-URI; alle anderen 15 Codes verwenden RoleCode-System-URI. Im Vivodepot-Datenmodell bleibt der Wert als reiner Code-String `"OTH"` gespeichert; das System-URI wird beim FHIR-Mapping pro Code resolved.

### Konstanten-Definition (Sprint-Implementations-Vorlage)

```js
const ROLECODE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-RoleCode';
const NULLFLAVOR_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-NullFlavor';

const BEZIEHUNGS_CODES = {
  SPS:        { system: ROLECODE_SYSTEM,   displayEn: 'spouse',           displayDe: 'Ich bin Ehepartner oder Lebensgefährte dieser Person' },
  DOMPART:    { system: ROLECODE_SYSTEM,   displayEn: 'domestic partner', displayDe: 'Ich bin in eingetragener Lebenspartnerschaft mit dieser Person' },
  CHILD:      { system: ROLECODE_SYSTEM,   displayEn: 'child',            displayDe: 'Ich bin das Kind dieser Person' },
  STPCHLD:    { system: ROLECODE_SYSTEM,   displayEn: 'step child',       displayDe: 'Ich bin das Stiefkind dieser Person' },
  CHLDADOPT:  { system: ROLECODE_SYSTEM,   displayEn: 'adopted child',    displayDe: 'Ich bin das adoptierte Kind dieser Person' },
  PRN:        { system: ROLECODE_SYSTEM,   displayEn: 'parent',           displayDe: 'Ich bin das Elternteil dieser Person' },
  STPPRN:     { system: ROLECODE_SYSTEM,   displayEn: 'step parent',      displayDe: 'Ich bin der Stiefelternteil dieser Person' },
  SIB:        { system: ROLECODE_SYSTEM,   displayEn: 'sibling',          displayDe: 'Ich bin Bruder oder Schwester dieser Person' },
  GRPRN:      { system: ROLECODE_SYSTEM,   displayEn: 'grandparent',      displayDe: 'Ich bin Großelternteil dieser Person' },
  GRNDCHILD:  { system: ROLECODE_SYSTEM,   displayEn: 'grandchild',       displayDe: 'Ich bin Enkelkind dieser Person' },
  NIENEPH:    { system: ROLECODE_SYSTEM,   displayEn: 'niece/nephew',     displayDe: 'Ich bin Nichte oder Neffe dieser Person' },
  AUNT:       { system: ROLECODE_SYSTEM,   displayEn: 'aunt',             displayDe: 'Ich bin Tante dieser Person' },
  UNCLE:      { system: ROLECODE_SYSTEM,   displayEn: 'uncle',            displayDe: 'Ich bin Onkel dieser Person' },
  INLAW:      { system: ROLECODE_SYSTEM,   displayEn: 'inlaw',            displayDe: 'Ich bin Schwiegerverwandtschaft dieser Person' },
  FRND:       { system: ROLECODE_SYSTEM,   displayEn: 'unrelated friend', displayDe: 'Ich bin Freund oder Freundin dieser Person (Vollmachts-Bezug)' },
  OTH:        { system: NULLFLAVOR_SYSTEM, displayEn: 'other',            displayDe: 'Andere Beziehung (Freitext eingeben)' },
};
```

**Recherche-Quelle:** HL7 Terminology v2.2.0, abgerufen 02.05.2026 via `https://terminology.hl7.org/3.1.0/CodeSystem-v3-RoleCode.html`. Lizenz: HL7 frei zugänglich.

**Herkunfts-Anker:** der Konstanten-Block in der Vivodepot-Implementation trägt einen Code-Kommentar mit dieser Quellen-Angabe und der Datums-Stand-Verifikation 02.05.2026.

---

## Checkliste vor Annahme

- [x] Alle Pflichtfelder im Header ausgefüllt
- [x] Mindestens zwei Optionen unter „Geprüfte Optionen" — vier geprüft
- [x] Konsequenzen getrennt nach positiv/negativ/neutral
- [x] Vor- und Nachteile für jede geprüfte Option benannt
- [x] Nachweis-Abschnitt mit fünf Zitaten
- [x] Sechs Klärungen dokumentiert
- [x] Vier Lücken transparent
- [x] Anschluss an B16-ADR-052, B16-ADR-062, B16-ADR-063 expliziert
- [x] Verweis auf B16-ADR-065 (geplant)
- [x] Vor-Aufgabe (HL7-V3-Verifikation) klar spezifiziert
- [x] In Klärungs-Sitzung 28.04.2026 bestätigt
