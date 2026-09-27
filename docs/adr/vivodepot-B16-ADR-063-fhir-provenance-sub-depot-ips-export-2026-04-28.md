# B16-ADR-063: FHIR-Provenance-Ressource bei Sub-Depot-IPS-Export

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 28.04.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** akzeptiert
- **Datum:** 2026-04-28
- **Kategorien:** ARCHITEKTUR | DATENMODELL | INTEROP
- **Format:** MADR 4.0 mit Vivodepot-Erweiterungen (Kategorien-Header, Nachweis-Abschnitt; analog B16-ADR-061 und B16-ADR-062)
- **Vorgänger:** B16-ADR-052 (Sorge-Struktur), B16-ADR-061 (Notfall-Cache als opt-in), B16-ADR-062 (Provenance-Erhaltung beim Sub-Depot-Export)
- **Nachfolger geplant:** B16-ADR-064 (Template-Übergabe-Mechanismus)
- **Bezug:** Provenance pro Datensatz (B16-ADR-062); Vorlagen-Editor und Lieferungs-Schnittstelle.

## Kontext und Problemstellung

AP 6 setzt die FHIR/IPS-Konsolidierung um — Vivodepot exportiert künftig spec-konforme IPS-Bundles mit Patient, AllergyIntolerance, Condition, MedicationStatement, Immunization, Procedure, Device und DeviceUseStatement plus Composition. Bei Sub-Depot-IPS-Export entsteht eine neue Frage: wie wird die Vivodepot-interne Provenance-Information (aus AP 5.5 plus B16-ADR-062) in FHIR-Resourcen abgebildet?

Die Vivodepot-interne Provenance dokumentiert für jeden Datensatz eines Sub-Depots, wer wann mit welcher Vollmachts-Grundlage die Eingabe gemacht hat. Das Schema ist in B16-ADR-062 festgelegt: `feldPfad`, `eingabeDurch`, `datum`, `vollmachtsGrundlage`, plus beim Export erweitert um `exportInfo.quelleAnker` und `exportInfo.exportDatum`.

FHIR-R4 stellt für genau diese Audit-Spur die `Provenance`-Resource bereit. Sie ist im IPS Implementation Guide v2.0.0 vorgesehen, aber nicht Pflicht. Die Frage ist, ob Vivodepot beim Sub-Depot-IPS-Export FHIR-Provenance-Resourcen mit ausgibt, und falls ja, welches Mapping-Schema gilt.

Plus eine architektur-philosophische Spannung: FHIR-Provenance kennt das Feld `policy` (Typ URI), das auf Policy-Dokumente verweist. Konvention bei FHIR ist, dass URIs auflösbar sind. Vivodepot ist offline-first per Architektur-Grundprinzip — Anwendung darf keine Webseiten abrufen müssen, und auch der exportierte Datenbestand soll keine Web-Abhängigkeiten erzeugen. Diese Spannung muss die ADR auflösen.

Plus ein Anschluss an den Template-Mechanismus des Gesamtkonzepts: Anbieter-Templates können eigene Codierungs-Bedeutungen mitbringen (etwa finanzinstitut-spezifische Vollmachts-Typen). Wenn FHIR-Provenance das abbilden soll, muss die Codierung erweiterbar sein. Die ADR muss diese Anschluss-Schicht zumindest skizzieren — die Detail-Mechanik der Template-Übergabe bleibt B16-ADR-064 vorbehalten.

**Frage:** Wie wird die Vivodepot-Provenance beim Sub-Depot-IPS-Export in FHIR-Resourcen abgebildet, sodass DSGVO-Audit-Spur und Werkzeug-Philosophie erhalten bleiben, FHIR-R4-spec-konform plus IPS-anschluss-fähig sind, und Anbieter-Template-Codierungen erweiterbar bleiben?

## Entscheidungstreiber

- **FHIR-R4-Spec-Konformität.** FHIR-Provenance hat drei Pflichtfelder (`target` 1..\*, `recorded` 1..1, `agent` 1..\* mit `agent.who` 1..1). Eine spec-konforme Implementation muss mindestens diese Felder vollständig befüllen. Empfangende Systeme (Krankenhaus-IS, EHDS-Knoten) verlassen sich auf Spec-Konformität.
- **IPS-Anschluss-Fähigkeit.** IPS Implementation Guide v2.0.0 erwähnt Provenance als „may be included" für Audit-Trails, nicht als „must". Vivodepot kann sie als Differenzierungs-Merkmal nutzen — viele IPS-Implementationen verzichten darauf, weil sie aufwändig ist.
- **DSGVO-Anschluss-Fähigkeit.** Article 7 (Einwilligung), Article 30 (Verzeichnis von Verarbeitungstätigkeiten), Article 32 (Sicherheit der Verarbeitung) verlangen Audit-Spuren. FHIR-Provenance mit `agent.role`, `agent.onBehalfOf` und `policy` trägt diese Information spec-konform.
- **Werkzeug-Philosophie und Offline-First-Prinzip.** Die Anwendung Vivodepot selbst arbeitet offline und ruft keine externen URIs ab. Die exportierte IPS-Datei soll diese Disziplin spiegeln — keine Web-Abhängigkeiten in den Codierungen, alle Bedeutungen sind in der Datei selbst auffindbar. Empfänger der Datei (Krankenhaus, Pflegeheim, Erbengemeinschaft) erhält nicht nur die Daten, sondern auch die Information, wer die Daten mit welcher Vollmacht erfasst hat — ohne Online-Lookup-Pflicht.
- **Anschluss an den Template-Mechanismus.** Das Gesamtkonzept beschreibt drei Wege der Template-Übertragung (White-Label-Edition, Datei-Lieferung, QR-Code-Lieferung). Anbieter-Templates können eigene Codierungs-Bedeutungen mitbringen. Die FHIR-Codierungs-Schicht muss erweiterbar sein, ohne dass die ADR den vollen Template-Mechanismus mit-spezifiziert. Der Template-Mechanismus selbst wird in B16-ADR-064 geschlossen.
- **Anschluss an B16-ADR-062.** B16-ADR-062 hat die Vivodepot-interne Provenance-Behandlung beim Sub-Depot-Export geklärt — wie wandert `sub.provenance` in `_root.ankerPerson.provenance`. B16-ADR-063 baut darauf auf: die exportierte Vivodepot-Datei hat eine vollständige Provenance-Audit-Spur. Beim weiteren IPS-Export aus dieser Datei muss diese Spur in FHIR-Format übersetzt werden, einschließlich der B16-ADR-062-spezifischen Export-Metadaten.
- **Anschluss an B16-ADR-061.** Bei Notfall-Cache-Daten gibt es zusätzlich eine Einwilligungs-Grundlage (`eigene-entscheidung`, `explizite-einwilligung`, `vollmachts-verweis`). Diese muss in der FHIR-Provenance als `policy`-Codierung erscheinen, damit die Audit-Spur bei IPS-Export erhalten bleibt.
- **Single-File-HTML-Architektur.** Vivodepot kann keine externe FHIR-Bibliothek einbinden. Die FHIR-Provenance-Erzeugung muss als eigenes Mapping-Modul innerhalb der Single-File-HTML implementiert werden, mit minimaler Schema-Validierung (analog AP 6 Frage 4).
- **Connectathon-Relevanz.** FHIR-Connectathon Rotterdam Mai 2026 testet IPS-Bundles. Vivodepot mit Provenance-Resource wird dort gegen den HL7-Validator getestet. Spec-Konformität ist hier hart — bei Validierungs-Fehlern reflektiert das auf Vivodepot.

## Geprüfte Optionen

1. **Option A — Vollständige FHIR-Provenance pro Datensatz plus zwei-stufige Bundle-Provenance, mit URN-Codierungen und Inline-CodeSystem.** Für jeden FHIR-Resource im IPS-Bundle, der aus einem Vivodepot-Datensatz mit Provenance-Eintrag stammt, wird eine eigene `Provenance`-Resource erzeugt. Plus eine oder zwei Bundle-Level-Provenance-Resourcen. Plus eine Inline-CodeSystem-Resource im Bundle. Codierungen als URNs ohne Web-Abhängigkeit.
2. **Option B — Nur Bundle-Level-Provenance, keine Datensatz-Provenance.** Eine einzige `Provenance`-Resource für das Bundle als Ganzes. Datensatz-Ebene wird nicht abgebildet.
3. **Option C — Vivodepot-eigene Extension statt FHIR-Provenance.** Vivodepot-Provenance als FHIR-Extension auf jeder einzelnen FHIR-Resource statt als eigenständige Provenance-Resource.
4. **Option D — Provenance-Information beim IPS-Export verwerfen.** Vivodepot-Provenance ist nur intern relevant, beim IPS-Export wird sie nicht ausgegeben.

## Entscheidung

Gewählt: **Option A — Vollständige FHIR-Provenance pro Datensatz plus zwei-stufige Bundle-Provenance, mit URN-Codierungen und Inline-CodeSystem.**

### Datensatz-Ebene

Für jeden FHIR-Resource im IPS-Bundle, der aus einem Vivodepot-Datensatz mit Provenance-Eintrag stammt, wird eine eigene `Provenance`-Resource erzeugt. Mapping nach folgender Tabelle:

| Vivodepot-Feld | FHIR-Provenance-Feld |
|---|---|
| `provenance.feldPfad` | nicht direkt gemappt — der Pfad wird durch `target`-Reference auf die jeweilige FHIR-Resource ersetzt |
| `provenance.eingabeDurch` (Wert „anker") | `agent.role` mit Codierung „author" plus `agent.who` = Reference auf RelatedPerson (Anker-Person der Hauptdepot-Datei vor Export) |
| `provenance.datum` | `recorded` als ISO-8601-Instant |
| `provenance.vollmachtsGrundlage.typ` | `policy` mit URN-Codierung im Vivodepot-Namespace, etwa `urn:vivodepot:policy:vorsorgevollmacht` |
| `provenance.vollmachtsGrundlage.beginnDatum` | `occurredPeriod.start` |
| `provenance.exportInfo.quelleAnker` | nicht in Datensatz-Provenance — Bundle-Level-Provenance trägt das (siehe B16-ADR-062-Bundle-Provenance unten) |
| Sub-Depot-Eigentümer (aus `_root.ankerPerson` der exportierten Datei) | `agent.onBehalfOf` als Patient-Reference auf den IPS-Patient (Sub-Depot-Eigentümer ist der Patient des IPS-Bundles) |
| Notfall-Cache-Einwilligung (B16-ADR-061: `eigene-entscheidung` / `explizite-einwilligung` / `vollmachts-verweis`) | `policy` mit zusätzlicher URN-Codierung im Vivodepot-Namespace, etwa `urn:vivodepot:consent:explizite-einwilligung` |
| `provenance.policyCodes` (neu, aus AP-6-Sprint-1) | `policy`-Liste — pro Eintrag im Array eine URN, alle aus Inline-CodeSystem auflösbar |

### Anker-Person als RelatedPerson-Resource

Die Anker-Person erscheint nicht als Frei-Text in `agent.who.display`, sondern als eigene RelatedPerson-Resource im Bundle. Das ist FHIR-spec-konform und ermöglicht Empfänger-Systemen, die Anker-Person als Identität aufzulösen. Bei mehreren Datensatz-Provenance-Einträgen mit derselben Anker-Person wird diese Resource einmal im Bundle abgelegt und mehrfach referenziert.

RelatedPerson trägt mindestens Name, optional Geburtsdatum (falls in Vivodepot bekannt), plus `relationship`-Codierung mit Bezug zum Sub-Depot-Eigentümer. Die `relationship`-Codierung wird in einer separaten Anforderungs-Erweiterung detailliert spezifiziert (siehe Lücke 3 unten).

### Bundle-Ebene — zwei-stufige Provenance bei vorherigem B16-ADR-062-Export

Wenn der Vivodepot-Provenance-Block einen `_export`-Eintrag aus B16-ADR-062 enthält, werden **zwei separate Bundle-Level-Provenance-Resourcen** erzeugt:

**Erste Bundle-Provenance — Sub-Depot-Export (B16-ADR-062-Schicht).** Dokumentiert den Vivodepot-zu-Vivodepot-Export aus dem Hauptdepot. Felder: `target` = Reference auf das Bundle, `recorded` = Export-Datum aus `exportInfo.exportDatum`, `agent.who` = RelatedPerson der ursprünglichen Hauptdepot-Anker-Person (aus `exportInfo.quelleAnker`), `activity` = `urn:vivodepot:activity:sub-depot-export`.

**Zweite Bundle-Provenance — IPS-Export (aktuelle Aktion).** Dokumentiert die aktuelle Konvertierung in FHIR-Format. Felder: `target` = Reference auf das Bundle, `recorded` = aktueller IPS-Export-Zeitpunkt, `agent.who` = RelatedPerson oder Patient (je nachdem, wer das IPS-Export auslöst), `activity` = `urn:vivodepot:activity:ips-export`.

Wenn kein `_export`-Eintrag vorliegt (etwa direkter IPS-Export aus Hauptdepot ohne Sub-Depot-Zwischenschritt), wird nur die zweite Bundle-Provenance erzeugt. Der Trigger für die B16-ADR-062-Bundle-Provenance ist die Anwesenheit des `_export`-Eintrags im Vivodepot-Provenance-Block.

### Inline-CodeSystem als FHIR-Resource im Bundle

Das IPS-Bundle enthält eine eigene `CodeSystem`-Resource mit allen verwendeten Vivodepot-Codes plus Klartext-Beschreibungen. Empfänger-Systeme haben damit alle Codierungen lokal in der Datei, kein Web-Abruf nötig. Konsequent mit der Offline-First-Architektur Vivodepots.

Das CodeSystem hat zwei Schichten:

**Schicht 1 — Vivodepot-Standard-Codes.** Sechs feste Codes, die mit jedem Vivodepot-Bundle ausgeliefert werden:

- `urn:vivodepot:policy:vorsorgevollmacht`
- `urn:vivodepot:policy:betreuungsverfuegung`
- `urn:vivodepot:policy:erbschaft`
- `urn:vivodepot:consent:eigene-entscheidung`
- `urn:vivodepot:consent:explizite-einwilligung`
- `urn:vivodepot:consent:vollmachts-verweis`

**Schicht 2 — Template-mitgebrachte Codes.** Anbieter-Templates können eigene Codierungs-Bedeutungen mitbringen (etwa `urn:vivodepot:policy:sparkassen-bankvollmacht-2026`, `urn:vivodepot:policy:pflegeheim-aufnahme-zustimmung`). Wenn ein Template solche Codes mitbringt, werden sie in das Inline-CodeSystem ergänzt, mit den Klartext-Beschreibungen aus dem Template. Die Template-Übergabe-Mechanik selbst (wie Templates technisch übertragen werden, Anbieter-Signatur, Versionierung) wird in B16-ADR-064 geschlossen.

Beim IPS-Export wird das CodeSystem dynamisch aus den vorhandenen Codes zusammengestellt. Bei einem Standard-Vivodepot ohne aktives Template enthält es nur die Schicht-1-Codes. Bei einer White-Label-Edition oder einem geladenen Anbieter-Template enthält es zusätzlich die Schicht-2-Codes.

### Erweiterung des Vivodepot-internen Provenance-Schemas

Das interne Vivodepot-Provenance-Schema (aus AP 5.5 plus B16-ADR-062) wird um ein optionales Feld `policyCodes` ergänzt. Schema-Spezifikation:

```js
{
  feldPfad: '...',
  eingabeDurch: 'anker',
  datum: 'ISO-8601',
  vollmachtsGrundlage: { typ: '...', beginnDatum: '...' },
  exportInfo: { ... },        // optional, aus B16-ADR-062
  policyCodes: [...]           // NEU, optional, Array von URN-Strings
}
```

`policyCodes` ist ein Array von URN-Strings, die im Inline-CodeSystem auflösbar sind. Default ist leeres Array. Bei Eintrag durch ein Anbieter-Template werden die zugehörigen Codes vom Template in dieses Feld geschrieben — die Template-Übergabe-Mechanik dazu wird in B16-ADR-064 geklärt. Beim IPS-Export wird der Inhalt von `policyCodes` in die FHIR-`Provenance.policy`-Liste übersetzt.

Diese Schema-Erweiterung wird in AP-6-Sprint-1 (Datenmodell-Migration) als Schema-3-Bump im AP-5.8-Pattern umgesetzt. Bestehende Provenance-Einträge ohne `policyCodes`-Feld werden bei der Migration mit leerem Array initialisiert, additive Erweiterung ohne Datenverlust.

### Vollmachts-Codierung als URN, nicht als auflösbare URI

Die Vivodepot-Codierungen werden als URN gestaltet (`urn:vivodepot:...`), nicht als `https://`-URI. Begründung: URN-Codierungen sind FHIR-spec-konform und explizit nicht auflösbar. Sie sind Identifier, keine Web-Adressen. Damit gibt es keine Web-Suggestion in den exportierten Daten — die Bedeutung der Codes liegt im Inline-CodeSystem im selben Bundle, nicht auf einer externen Webseite.

Diese Entscheidung ist Architektur-konsistent mit Vivodepots Offline-First-Prinzip — weder die Anwendung noch die exportierten Daten erzeugen Web-Abhängigkeiten zur Laufzeit.

### Audit-Stabilität durch tiefe Kopie

Beim Mapping wird `structuredClone` oder JSON-Roundtrip verwendet, sodass keine geteilten Referenzen zwischen Vivodepot-internem Provenance und FHIR-Provenance entstehen. Methodisch konsistent mit B16-ADR-062-Disziplin.

### Schema-Validierung

Die eigene minimale Schema-Prüfung aus AP 6 Frage 4 prüft auch die FHIR-Provenance auf die drei Pflichtfelder (`target`, `recorded`, `agent.who`). Klasse-A-Test-Disziplin in Sprint 2.

### Etappierung in AP 6

**Sprint 1 — Klasse-A-Migrations-Sprint, analog AP 5.8.** Implementiert das `policyCodes`-Feld im internen Provenance-Schema, Schema-3-Bump, Migrations-Test für bestehende Einträge ohne Datenverlust. Klasse-A-Tests für Schema-Konsistenz und Migrations-Sicherheit. Mindestens 7 Klasse-A-Tests laut Umsetzungsplanung zu AP 6.

**Sprint 2 — Klasse-A-Sprint für FHIR-Anbindung.** Implementiert das FHIR-Provenance-Mapping pro Datensatz, Bundle-Level-Provenance (eine oder zwei je nach `_export`-Trigger), Inline-CodeSystem-Resource im Bundle, RelatedPerson-Resource für Anker-Person. Klasse-A-Tests für FHIR-Schema-Pflichtfelder, tiefe Kopie, Vollmachts-Codierung-Konsistenz mit Inline-CodeSystem, Bundle-Level-Provenance-Trigger. Plus HL7-Validator-Test als Klasse-A-Anker (siehe Test-Disziplin unten).

**Sprint 3 — Klasse-B-Sprint für UI.** UI-Render der Provenance-Information beim IPS-Import, Krankenhausaufnahme-Wizard-Bestand-Anschluss. Klasse-B-Tests für UI-Render.

### Test-Disziplin

Klasse-A-Tests in Sprint 1 plus 2:

- Schema-3-Bump-Migration ohne Datenverlust (Sprint 1)
- `policyCodes`-Feld-Schema-Konsistenz (Sprint 1)
- FHIR-Provenance-Schema-Pflichtfelder (`target`, `recorded`, `agent.who`) — Sprint 2
- Tiefe-Kopie-Audit-Stabilität bei Mapping (Sprint 2, analog B16-ADR-062-Disziplin)
- Vollmachts-Codierung-Konsistenz mit Inline-CodeSystem (Sprint 2)
- Bundle-Level-Provenance-Trigger durch `_export`-Eintrag (Sprint 2)
- **HL7-Validator-Test als externe Verifikations-Schicht** (Sprint 2)

Klasse-B-Tests:

- RelatedPerson-Resource-Konstruktion (Sprint 2)
- UI-Render der Provenance-Information beim IPS-Import (Sprint 3)
- Krankenhausaufnahme-Wizard-Bestand-Anschluss (Sprint 3)

**HL7-Validator-Integration als CI-automatisierter Schritt.** Der Validator wird als externer Subprocess in der Test-Suite aufgerufen, prüft den Output. Aufwand etwa 1-2 Stunden Setup, dann läuft es in CI mit. Methodisch konsistent mit AP 5.2, wo externe Test-Vektoren (RFC 5869, NIST CAVP, Wycheproof) als Klasse-A-Belege geführt wurden — der HL7-Validator ist die FHIR-Entsprechung als externe spec-Konformitäts-Schicht.

## Konsequenzen

**Positiv.**

- FHIR-R4-Spec-Konformität ist gegeben — drei Pflichtfelder vollständig befüllt, Provenance-Resource korrekt strukturiert. Empfangende Systeme können die Audit-Information spec-konform parsen.
- Offline-First-Konsistenz ist erhalten. URN-Codierungen plus Inline-CodeSystem im Bundle bedeuten: keine Web-Abhängigkeit der Anwendung selbst, keine Web-Suggestion in den exportierten Daten. Vivodepot bleibt offline-first auch in den exportierten Bundles.
- DSGVO-Audit-Spur durchgängig: Vivodepot-intern (AP 5.5) → Sub-Depot-Export (B16-ADR-062) → IPS-Export (B16-ADR-063). Keine Audit-Lücke beim Übergang von Vivodepot-internem Format zu FHIR. Plus zwei-stufige Bundle-Provenance dokumentiert die Export-Kette explizit.
- Werkzeug-Philosophie konsistent: Empfänger der IPS-Datei sieht spec-konform plus offline-resolvierbar, wer die Daten mit welcher Vollmacht erfasst hat. Beim Erbschafts-Fall, beim Krankenhaus-Aufnahme-Wizard, beim Pflegeheim-Übergabe-Szenario erhält die Empfängerin die Audit-Spur in maschinenlesbarer Form, ohne Online-Lookup.
- Template-Anschluss vorbereitet. Das Inline-CodeSystem ist erweiterbar durch Template-mitgebrachte Codes. Anbieter-spezifische Vollmachts-Typen können in der Codierung erscheinen, ohne dass B16-ADR-063 die Template-Mechanik selbst spezifizieren muss. B16-ADR-064 schließt diesen Anschluss.
- Connectathon-Differenzierung: Provenance-Resourcen sind in IPS-Implementationen selten, Vivodepot mit vollständigen Provenance-Resourcen plus zwei-stufiger Bundle-Provenance ist ein Audit-Vorbild. Plus methodisches Argument für die HL7-Standards-Bewegung.
- EHDS-Anschluss-Fähigkeit: EHDS Patient Summary verlangt Audit-Spuren bei grenzüberschreitendem Austausch. FHIR-Provenance plus Inline-CodeSystem ist eine vorbereitende Architektur — auch wenn EHDS-spezifische Anforderungen erst später detailliert werden.

**Negativ.**

- Implementations-Aufwand höher als bei Option B oder C. Mapping-Modul für sieben FHIR-Resource-Typen plus Bundle-Provenance-Logik plus CodeSystem-Resource. Geschätzt 250–350 Code-Zeilen plus 8–12 Tests, davon 5–7 Klasse A.
- Vivodepot-eigener URN-Namespace ist nicht in einem etablierten Code-System wie SNOMED-CT. Empfänger-Systeme können die Codes nicht direkt mit klinischen Codierungen abgleichen. Möglicher Folge-Schritt: Codierung in einer HL7-Working-Group einreichen oder auf etablierte SNOMED-CT-Codes mappen. Lücke 2 unten.
- Zwei-stufige Bundle-Provenance erhöht Bundle-Komplexität um eine Resource. Bei Empfänger-Systemen, die nur einfache Bundle-Provenance erwarten, könnte das zu Verarbeitungs-Aufwand führen — bleibt aber spec-konform.

**Neutral.**

- UI-Render der Provenance-Information beim IPS-Import (Sprint 3) — Form (Detail-Zeile, Modal, Audit-Spalte) ist UI-Entscheidung, die mit dem Krankenhausaufnahme-Wizard-Bestand abgeglichen werden muss.
- Statische Tests müssen das FHIR-Provenance-Schema mit den drei Pflichtfeldern als bekannten Test-Anker akzeptieren. Plus Inline-CodeSystem-Schema-Konformität.

## Vor- und Nachteile der Optionen

### Option A — Vollständige FHIR-Provenance plus zwei-stufige Bundle-Provenance plus URN plus Inline-CodeSystem (gewählt)

- **Gut:** Spec-konform; Audit-durchgängig; Offline-First-konsistent; EHDS-vorbereitet; Connectathon-Differenzierung; Template-Anschluss vorbereitet; methodisch konsistent mit B16-ADR-061 und B16-ADR-062.
- **Schlecht:** Höchster Implementations-Aufwand; eigener URN-Namespace als Vivodepot-Spezifikum.

### Option B — Nur Bundle-Level-Provenance

- **Gut:** Geringerer Implementations-Aufwand; immer noch FHIR-spec-konform für Bundle-Ebene.
- **Schlecht:** Verliert Datensatz-Granularität; DSGVO-Audit-Spur unterhalb der Bundle-Ebene fehlt; Werkzeug-Philosophie teilweise verletzt.

### Option C — Vivodepot-eigene Extension statt FHIR-Provenance

- **Gut:** Trivialer Implementations-Aufwand; 1:1-Mapping ohne Schema-Übersetzung.
- **Schlecht:** Nicht spec-konform für Audit-Trail; Empfänger-Systeme erkennen Provenance-Information nicht; Connectathon-negativ; verliert FHIR-Standard-Anschluss.

### Option D — Provenance verwerfen

- **Gut:** Trivial.
- **Schlecht:** Audit-Verlust; DSGVO-Article-30-Anschluss verloren; Werkzeug-Philosophie direkt verletzt.

## Nachweis

> „The Provenance resource is based on the W3C Provenance specification ... The relationship between a resource and its provenance is established by a reference from the provenance resource to its target."
>
> — *[FHIR R4 Specification, hl7.org/fhir/R4/provenance.html, abgerufen 28.04.2026]*

> „Have at least one target resource to which the provenance information applies (element: target) — base constraint. Include the time the provenance information was recorded (element: recorded) — base constraint. Include at least one agent involved in the activity (element: agent) which is explicitly referred to (element: agent.who) — base constraint."
>
> — *[Smart4Health Implementation Guide, simplifier.net/guide/Smart4Health/Provenance, abgerufen 28.04.2026]*

> „There may be multiple provenance records for a given resource or version of a resource."
>
> — *[FHIR R4 Specification, hl7.org/fhir/R4/provenance.html, abgerufen 28.04.2026]*

> „Bei Sub-Depot-Export ... werden die `sub.provenance`-Einträge 1:1 nach `_root.ankerPerson.provenance` der exportierten Datei übertragen. Audit-Stabilität durch tiefe Kopie ... vollständig referenz-getrennt."
>
> — *[B16-ADR-062 vom 28.04.2026, Vivodepot-Repository]*

> „Wenn der Anbieter ein Template fertig erstellt hat, muss er es in die Vivodepot-Instanzen seiner Bürger bekommen. Drei Wege: White-Label-Edition ... Datei-Lieferung ... QR-Code-Lieferung."
>
> — *[Gesamtkonzept v1.0, Abschnitt Template-Übertragung, 25.04.2026]*

> „Wir wollen nicht, dass die anwendung Adressen abrufen muss — sondern sie soll offline arbeiten."
>
> — *[Klärungs-Vorgabe, ADR-Sitzung 28.04.2026]*

## Klärungs-Spuren — sechs Klärungen aus der ADR-Sitzung 28.04.2026

**Klärung 1 — Reference-Komplexität bei Anker-Person.** Entschieden: RelatedPerson-Resource im Bundle für Anker-Person. Anker-Person erscheint nicht als Frei-Text-Display, sondern als eigene Resource mit Name, optional Geburtsdatum, plus `relationship`-Codierung. Anschluss-Frage zur `beziehungZu`-Codierung im Vivodepot-internen Datenmodell verschoben in eigene Klärungs-Sitzung (siehe Lücke 3).

**Klärung 2 — Vollmachts-Namespace.** Entschieden: URN-Codierung im Vivodepot-Namespace (`urn:vivodepot:policy:vorsorgevollmacht`) plus Inline-CodeSystem als FHIR-Resource im Bundle. Keine auflösbare Web-URI, weil die Anwendung offline arbeitet und auch die exportierten Daten keine Web-Abhängigkeit haben sollen.

**Klärung 3 — Notfall-Cache-Einwilligungs-Codierung.** Entschieden: identisch zu Klärung 2 — URN-Codierung (`urn:vivodepot:consent:explizite-einwilligung`) plus Inline-CodeSystem-Eintrag.

**Klärung 4 — Bundle-Level-Provenance und B16-ADR-062-Anschluss.** Entschieden: zwei separate Bundle-Provenance-Resourcen bei vorherigem B16-ADR-062-Export — eine für Sub-Depot-Export-Schritt (B16-ADR-062-Schicht), eine für IPS-Export-Schritt. Trigger für die B16-ADR-062-Bundle-Provenance ist die Anwesenheit des `_export`-Eintrags im Vivodepot-Provenance-Block. Wenn kein `_export`-Eintrag vorliegt, nur eine Bundle-Provenance.

**Klärung 5 — Etappierung in AP 6.** Entschieden: Sprint 1 implementiert `policyCodes`-Feld im internen Provenance-Schema plus Schema-3-Bump (analog AP 5.8). Sprint 2 implementiert FHIR-Anbindung (Mapping pro Datensatz, Bundle-Provenancen, Inline-CodeSystem). Sprint 3 implementiert UI-Render. B16-ADR-063 wird in Sprint 1 als Architektur-Anker dokumentiert, Sprint 2 implementiert die FHIR-Schicht, Sprint 3 die UI-Schicht.

**Klärung 6 — Test-Disziplin.** Entschieden: sieben Klasse-A-Tests (Schema-Migration, `policyCodes`-Schema, FHIR-Pflichtfelder, tiefe Kopie, Vollmachts-Codierung-Konsistenz, Bundle-Provenance-Trigger, HL7-Validator-Test). RelatedPerson-Resource und UI-Render als Klasse B. HL7-Validator als CI-automatisierter Schritt — Audit-Konsistenz mit AP-5.2-Test-Vektor-Disziplin.

## Anbieter-Signatur — verschoben in B16-ADR-064

Das Gesamtkonzept beschreibt die Anbieter-Signatur als Vertrauensanker für Templates. Beim IPS-Export könnte die Signatur in der FHIR-Provenance als zusätzliches `signature`-Feld oder als `entity`-Reference erscheinen. Diese Erweiterung wird in B16-ADR-064 (Template-Übergabe-Mechanismus) zusammen mit der Signatur-Validierungs-Mechanik geklärt. B16-ADR-063 spezifiziert hier nur den Anschlusspunkt: wenn Templates eine Anbieter-Signatur tragen, erweitert B16-ADR-064 die Provenance-Erzeugung um Signatur-Felder.

## Lücken in dieser ADR

**Lücke 1 — IPS-Implementation-Guide-Detailprüfung.** FHIR-R4-Provenance-Pflichtfelder verifiziert (target, recorded, agent.who), aber das IPS Implementation Guide v2.0.0 hat eventuell zusätzliche Profil-Anforderungen für Provenance. Vor Sprint-1-Start sollte die IPS-IG-Provenance-Sektion einmal durchgelesen werden.

**Lücke 2 — SNOMED-CT-Codes für Vollmachts-Grundlagen.** SNOMED-CT nicht recherchiert. Möglicherweise gibt es etablierte Codes für Vorsorgevollmacht, Betreuungsverfügung, Erbschaft. Diese könnten als zusätzliche Codierung neben den Vivodepot-URNs verwendet werden — FHIR `policy` erlaubt mehrere URIs pro Provenance-Eintrag. Eigene Recherche-Sitzung 1–2 Stunden.

**Lücke 3 — RelatedPerson `relationship`-Codierung.** Anker-Person als RelatedPerson braucht ein `relationship`-Feld mit Codierung der Beziehung zum Sub-Depot-Eigentümer. HL7-V3-Code-System für Beziehungen existiert (Ehepartner, Kind, Eltern, etc.), könnte verwendet werden. Detail-Klärung folgt gesondert — vermutlich ist eine Erweiterung des Vivodepot-Datenmodells nötig (neues Feld `beziehungZu` in Sub-Depot-Eigentümer-Datenfeldern).

**Lücke 4 — EHDS-Konformitätsprüfung.** EHDS-spezifische Provenance-Anforderungen könnten über IPS hinaus zusätzliche Felder verlangen. Aktuell nicht akut (EHDS-Anwendung 2029), aber bei Pilot-Implementations-Calls 2027–2028 zu prüfen.

**Lücke 5 — Anwaltliche Validierung der DSGVO-policy-Codierung.** Die Codierung von Vollmachts-Grundlagen als FHIR-policy-URNs ist eine DSGVO-Audit-Schicht. Anwaltliche Bestätigung, dass diese Codierung Article-7- und Article-30-anschluss-fähig ist, in Phase 3 der NLnet-Förder-Roadmap durch [extern anwaltlich].

## Weiterführend

**Implementations-Bezug.** Mapping-Modul in `code/VIVODEPOT.html`, AP 6 Sprint 1 plus Sprint 2. Funktion-Skizzen: `mapVivodepotProvenanceToFHIR(vivoProvenance, targetFhirResource, sourceAnker)` erzeugt FHIR-Provenance-Resource pro Datensatz; `buildBundleProvenances(bundle, exportInfo, ipsExportInfo)` erzeugt eine oder zwei Bundle-Level-Provenancen je nach `_export`-Trigger; `buildInlineCodeSystem(usedCodes, templateCodes)` erzeugt das Inline-CodeSystem.

**Test-Bezug.** Sprint 1 (Klasse A): Schema-3-Bump-Migration, `policyCodes`-Feld-Schema-Konsistenz. Sprint 2 (Klasse A): FHIR-Provenance-Pflichtfeld-Tests, tiefe Kopie, Vollmachts-Codierung mit Inline-CodeSystem, Bundle-Level-Provenance-Trigger, HL7-Validator-Test als CI-Schritt. Sprint 3 (Klasse B): UI-Render-Tests.

**UI-Bezug.** Sprint 3 von AP 6 entscheidet die Render-Form der Provenance-Information beim IPS-Import. Vorschlag: Detail-Zeile pro Datensatz, etwa „erfasst von [Anker-Name] am [Datum] (Vorsorgevollmacht)". Krankenhausaufnahme-Wizard bekommt Provenance-Anzeige als Audit-Spalte.

**Verwandte ADRs.**

- B16-ADR-052 (Sorge-Struktur, Hybrid 3A) — Vorgänger.
- B16-ADR-061 (Notfall-Cache als opt-in) — Einwilligungs-Codierung wird in B16-ADR-063 als `policy`-URN integriert.
- B16-ADR-062 (Provenance-Erhaltung beim Sub-Depot-Export) — Vivodepot-internes Schema, das B16-ADR-063 in FHIR übersetzt; `_export`-Eintrag triggert die zwei-stufige Bundle-Provenance.
- **B16-ADR-064 (Template-Übergabe-Mechanismus, geplant)** — schließt die Detail-Mechanik der Template-Übertragung (drei Wege aus dem Gesamtkonzept, Anbieter-Signatur, Versionierung, Schema-Migration). B16-ADR-063 verweist auf B16-ADR-064 als Quelle der Template-mitgebrachten Codes für das Inline-CodeSystem und für das `policyCodes`-Feld.

**Folge-Aktivitäten.**

- HL7-Working-Group-Vorlage: Vivodepot-eigene Vollmachts-Codierung in einer HL7-Working-Group einreichen, falls langfristig spec-konform durch Standards-Bewegung verankert werden soll.
- SNOMED-CT-Mapping prüfen: für Vorsorgevollmacht und Betreuungsverfügung könnte es bereits SNOMED-CT-Codes geben, die als zusätzliche Codierung neben den Vivodepot-URNs verwendet werden könnten. Recherche in einer Folge-Sitzung.
- EHDS-Konformitätsprüfung: bei EHDS-Pilot-Implementations-Calls 2027–2028 prüfen, ob Vivodepots Provenance-Mapping EHDS-anschluss-fähig ist oder ob Anpassungen nötig sind.
- B16-ADR-064 (Template-Übergabe-Mechanismus): eigene Klärungs-Sitzung mit etwa 8–10 Klärungs-Fragen. Eigener Entwurf etwa 1,5–2 Stunden.
- Anschluss-Frage zur `beziehungZu`-Codierung (Anker-Person zu Sub-Depot-Eigentümer) als eigene Erweiterung des Datenmodells, gesondert geklärt (B16-ADR-064). Dort wird auch entschieden, ob die Codierung Vivodepot-eigen oder mit etablierten Codes (HL7-V3-Code-System für Beziehungen) abgebildet wird.

---

## Checkliste vor Annahme

- [x] Alle Pflichtfelder im Header ausgefüllt (Status: akzeptiert, Datum, Kategorien)
- [x] Mindestens zwei Optionen unter „Geprüfte Optionen" — vier geprüft
- [x] Konsequenzen getrennt nach positiv, negativ, neutral
- [x] Vor- und Nachteile für jede geprüfte Option benannt
- [x] Nachweis-Abschnitt enthält mehrere wörtliche Zitate mit Quellenangabe — sechs Zitate
- [x] Sechs Klärungen aus der ADR-Sitzung dokumentiert
- [x] Fünf Lücken transparent für künftige Vertiefungen
- [x] Anschluss an B16-ADR-052, B16-ADR-061, B16-ADR-062 expliziert
- [x] Verweis auf B16-ADR-064 (geplant) für Template-Übergabe-Mechanik
- [x] In Klärungs-Sitzung 28.04.2026 bestätigt

---

_ADR-063 · FHIR-Provenance-Ressource bei Sub-Depot-IPS-Export · Vivodepot GmbH (i.Gr.) · Berlin · Stand 28. April 2026 · Status akzeptiert._

_Option A — Vollständige FHIR-Provenance pro Datensatz plus zwei-stufige Bundle-Provenance plus URN-Codierung plus Inline-CodeSystem. Sechs Klärungen entschieden, fünf Lücken transparent. Methodischer Anschluss an B16-ADR-052, B16-ADR-061, B16-ADR-062. Verweis auf B16-ADR-064 (Template-Übergabe, geplant). Format MADR 4.0 mit Vivodepot-Erweiterungen._
