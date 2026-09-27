# B16-ADR-088 — Mutterpass-Komplement-Architektur: data.schwangerschaften[]-Array, Schema-Bump 15→16

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 20.05.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


**Datum:** 20.05.2026
**Status:** Umgesetzt (Sprint INV-1-FOLGE Teil C)
**Bezug:** INV-1-Befund E-2, gebwiz, F-11-Klasse Beleg
**Tags:** ARCHITEKTUR, GESUNDHEIT, SCHEMA-BUMP, F-11-KORREKTUR

---

## Kontext

INV-1 Cross-Sektor-Mapping-Inventur hatte aufgedeckt: gebwiz schreibt 10 `mutterpass_*`-Felder, die in keiner Bestand-Lese-Stelle (Sektor-Renderer, IPS, Notfall, Word-Generator, Lese-App) gelesen werden. Code-Kommentar Z.62540 nannte sie „data-Slots", aber keine Architektur-Begründung für die fehlende Anzeige war dokumentiert.

Entscheidung (INV-1-FOLGE-Anforderung): die Mutterpass-Felder sollen komplementär zum physischen Mutterpass nutzbar sein — Anzeige im Gesundheits-Step, PDF-Übergabe für Frauenarzt, Multi-Schwangerschafts-Aufbewahrung.

## Entscheidung

**Datenmodell-Wechsel mit Schema-Bump 15→16.** Flache `mutterpass_*`-Slots werden durch ein strukturiertes Array `data.schwangerschaften[]` abgelöst. Drei Konsumenten-Schichten ergänzt.

### Datenmodell

```js
data.schwangerschaften = [
  {
    id: UUID,
    erstellt: 'YYYY-MM-DD',
    geburtstermin: '...',
    hebamme: '...',
    klinik: '...',
    rhesusfaktor: '...',
    vorerkrankungen: '...',
    impfstatus: '...',
    blutbild: '...',
    antikoerper: '...',
    bStrep: '...',
    notiz: '...',
    aktualisiert: 'YYYY-MM-DD',  // optional, bei Bearbeitung
    _migriert: true,             // optional, bei Schema-15-Migration
  },
  // ... weitere Einträge
]
```

`blutgruppe` und `allergien` bleiben Bestand-Slots (Personen-spezifisch, mit anamnesewiz geteilt — nicht schwangerschafts-spezifisch).

### Migration `_migriereSchema15Auf16`

Additiv, idempotent. Pro Depot (Anker + alle Sub-Depots):
- Wenn `data.schwangerschaften` bereits existiert → idempotent, kein Eingriff
- Wenn mind. ein `mutterpass_*`-Feld nicht-leer → ein Array-Eintrag wird erzeugt mit UUID + `_migriert: true`, alle alten Slots werden gelöscht
- Wenn alle alten Slots leer → `data.schwangerschaften = []`, alte Slots gelöscht

### gebwiz-Datenfluss

- `gebwizOpen()` liest **letzten** Array-Eintrag als „aktuelle Schwangerschaft" (zur Bearbeitung). Bei leerem Array startet ein neuer Eintrag mit `_schwId: null`.
- `gebwizOpenNeueSchwangerschaft()` (neu) startet einen frischen Eintrag, die alte aktuelle wird zur Historie.
- `gebwizNext()` (letzter Schritt) schreibt: Update existierender Eintrag wenn `_schwId` gesetzt, sonst Push neuer Eintrag. `blutgruppe` und `allergien` weiter als Bestand-Slots via `set()`.

### Schicht 1 — Sektor-Renderer

`renderSchwangerschaftsBlock()`-Helper-Funktion rendert:
- „Aktuelle Schwangerschaft" (letzter Array-Eintrag) mit 10 Feld-Zeilen
- Optional `<details>`-Block „Frühere Schwangerschaften (N)" — collapsible, jüngste zuerst

Eingebunden im `gesundheit`-STEP_RENDERER vor `${navButtons()}`. Bürgerin sieht den Block im Gesundheits-Step (Bereich `gesundheit`). Entscheidung war „Sub-Block im Gesundheits-Step" — kein eigener Step nötig.

Zwei Aktions-Buttons (oder drei bei vorhandener Aktueller): Wizard öffnen, „+ Neue Schwangerschaft", Word-Bogen erzeugen.

### Schicht 2 — Word-Generator

`generateMutterpassBogen()` erzeugt .docx mit:
- Sektion I Person (Name, Geburtsdatum, Blutgruppe, Allergien aus Bestand-Slots)
- Sektion II Aktuelle Schwangerschaft (10 Feld-Zeilen)
- Sektion III Frühere Schwangerschaften (kurz-Form pro Eintrag) — nur wenn vorhanden
- Footer „Ergänzung zum physischen Mutterpass — keine Diagnose-Ersatzleistung"
- Speichert als `Mutterpass-Komplement_<Nachname>.docx`

### Schicht 3 — Lese-App

Nicht primär für die Lese-App vorgesehen, weil Schwangerschaft kein typisches Weitergabe-Profil ist. Falls künftig nötig: `data.schwangerschaften` ist ein Standard-Array, die Lese-App-zeigeDaten-Funktion rendert es per `Object.entries`-Pfad.

## Test-Anpassungen (Verifikations-Durchgang)

Sieben Test-Stellen mit hartcodierter `schemaVersion = 15` / `r.schema = 15` / `r.schemaV = 15` wurden auf 16 angehoben:
- `code/test_behavior_adr068v2_schema12_migration.js` (2 Stellen)
- `code/test_behavior_adr068v2_subpasswort.js`
- `code/test_behavior_adr081_vvwiz_bevollmaechtigte.js`
- `code/test_behavior_i27a_anker_zu_sub.js`
- `code/test_behavior_trust_chain.js`
- `tests/e2e/user_journey_anker_zu_sub.spec.js`

Neue Klasse-A-Tests in `code/test_behavior_inv1_folge_teilC.js` decken Migration, Array-Schreib-Pfad, Sektor-Renderer und Word-Generator ab.

## Code-Stellen

- `code/VIVODEPOT.html`:
  - Z.13012: `SCHEMA_VERSION_AKTUELL = 16`
  - Z.14848: `istSchema15Migration`-Equality-OR-Block
  - Z.15032: Migrations-Aufruf `if (istSchema15Migration) { _migriereSchema15Auf16(); }`
  - Z.19002-19080: `_migriereSchema15Auf16()`-Funktion
  - Z.62826-62906: gebwizOpen + gebwizOpenNeueSchwangerschaft (Array-Lese-Pfad)
  - Z.63060-63110: gebwizNext (Array-Schreib-Pfad mit Update-or-Push)
  - Z.56770+: `renderSchwangerschaftsBlock()`
  - Z.57860+: Einbindung im gesundheit-Step-Renderer
  - Z.64710+: `generateMutterpassBogen()`-Word-Generator

## Konsequenzen

**Positiv:**
- F-11-Datenfalle „10 mutterpass_*-Felder ohne Reader" eliminiert
- Multi-Schwangerschafts-Aufbewahrung — Bürgerin kann auf alte Daten zurückgreifen
- Sauberere Datenstruktur (Array statt flache Slots, UUID pro Eintrag, erstellt-Datum)
- Word-Übergabe für Frauenarzt/Klinik

**Neutral:**
- Schema-Bump verlangt §2.15-Sweep (7 Test-Stellen angepasst)
- `mutterpass_*`-Slots werden durch Migration gelöscht (sauber, kein Schutt)

**Negativ:**
- Migrations-Logik komplexer als bei reinen additiven Bumps (data-Slot-Löschung erfordert sorgfältige Idempotenz-Prüfung — durch Existenz-Check von `data.schwangerschaften` gelöst)

## Anschluss-ADRs

- B16-ADR-086 (Bevollmächtigte/Hauptpflegeperson) — Teil A der Sprint-Reihe
- B16-ADR-087 (Erbschafts-Konsumenten-Schicht) — Teil B
- B16-ADR-089 (Lese-Format-Versions-Stempel) — Teil C parallel
- Sprint-Dokumentation (20.05.2026) liegt im Vorgängerprojekt, nicht in diesem Bestand.

## INDEX-Eintrag

**B16-ADR-088 · Mutterpass-Komplement-Architektur: data.schwangerschaften[]-Array, Schema-Bump 15→16**
- Scope: Multi-Schwangerschafts-Aufbewahrung über `data.schwangerschaften[]` (Schema 16). `_migriereSchema15Auf16` zieht alte `mutterpass_*`-Slots in den ersten Array-Eintrag um. gebwiz liest letzten Eintrag (aktuell), `gebwizOpenNeueSchwangerschaft` legt frischen an. Sektor-Anzeige im Gesundheits-Step, Word-Übergabe `generateMutterpassBogen` für Frauenarzt/Klinik.
- Tags: ARCHITEKTUR, GESUNDHEIT, SCHEMA-BUMP, F-11-KORREKTUR
- Datum: 20.05.2026 · Status: Umgesetzt (Sprint INV-1-FOLGE Teil C)
- Vorgänger-Bezüge: gebwiz (Sprint v1_gebwiz). INV-1 E-2. F-11-Klasse.
- Implementations-Verweis: `code/VIVODEPOT.html` mehrere Stellen + 7 Test-Stellen Schema 15→16 + `code/test_behavior_inv1_folge_teilC.js`.
