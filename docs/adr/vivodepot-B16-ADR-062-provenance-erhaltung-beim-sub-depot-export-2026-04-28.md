# B16-ADR-062: Provenance-Erhaltung beim Sub-Depot-Export

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 28.04.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** akzeptiert
- **Datum:** 2026-04-28
- **Kategorien:** ARCHITEKTUR | DATENMODELL
- **Format:** MADR 4.0 mit Vivodepot-Erweiterungen (Kategorien-Header, Nachweis-Abschnitt)
- **Vorgänger:** B16-ADR-052 (Sorge-Struktur) — etabliert die Trennung Anker / Sub-Depots; B16-ADR-062 löst eine spezifische Spannung dieser Architektur beim Export-Übergang.
- **Bezug:** zwei Anforderungen an Provenance-Tracking und Sub-Depot-Export: „Anker-Person hat keine Provenance-Spuren" und „Provenance-Spuren des Sub-Depots werden in der exportierten Datei erhalten". B16-ADR-061 (Notfall-Cache als opt-in) — methodisch verwandt: beide ADRs adressieren explizite Ausnahmen von einer ansonsten sauberen Disziplin mit dokumentierter Begründung.

## Kontext und Problemstellung

Die Anforderungen enthalten zwei Akzeptanzkriterien, die im Export-Kontext aufeinandertreffen:

- **§2.6 Akzeptanzkriterium 4** (Task 5.5 Provenance pro Datensatz): „Die Anker-Person hat keine Provenance-Spuren — das Konzept gilt nur für Sub-Depots."
- **§2.8 Akzeptanzkriterium 6** (Task 5.7 Sub-Depot exportieren): „Die Provenance-Spuren des Sub-Depots werden in der exportierten Datei erhalten, mit zusätzlichem Provenance-Eintrag „Exportiert aus Sorge-Depot von [Name der Anker-Person] am [Datum]"."

Die Spannung: in der exportierten Datei wird das Sub-Depot per Architektur-Festlegung aus B16-ADR-052 (Hybrid 3A für Sub-Depot-Export) zur **Anker-Person der neuen Datei**. Die exportierte Datei hat per Definition `subDepots: []` und einen einzigen `_root.ankerPerson`-Block, der den Sub-Depot-Inhalt trägt.

Wenn man §2.6 Akz.-Kr. 4 wörtlich nimmt, dürfte die exportierte Datei keine Provenance haben — was §2.8 Akz.-Kr. 6 explizit fordert. Wenn man §2.8 Akz.-Kr. 6 wörtlich nimmt, trägt die Anker-Person der exportierten Datei Provenance — was §2.6 Akz.-Kr. 4 explizit ausschließt.

**Frage:** Wie wird diese Spannung architektur-konsistent aufgelöst, ohne eine der beiden Anforderungen zu brechen?

## Entscheidungstreiber

- **Die Anforderungen sind verbindlich.** Beide Akzeptanzkriterien sind explizite Anforderungen — keine darf still verschwinden.
- **B16-ADR-052 (Hybrid 3A)** legt die Export-Architektur fest: das Sub-Depot wird zur Anker-Person der neuen Datei. Diese Festlegung ist Vorgänger zu B16-ADR-062 und nicht verhandelbar.
- **Audit-Wert der Provenance.** Provenance dokumentiert Bediener-Identität (Anker schreibt für Sub-Depot-Eigentümer mit Vollmachts-Grundlage). Beim Export geht diese Bediener-Information verloren, wenn die Provenance gelöscht würde — ein Audit-Verlust, den die Anforderungen ausdrücklich verhindern wollen.
- **Werkzeug-Philosophie.** Die Empfänger-Person der exportierten Datei (typisch: Erbengemeinschaft) erhält damit nicht nur die Daten, sondern auch die Information „diese Daten hat die Anker-Person für mich/uns erfasst, gestützt auf jene Vollmacht von 2024-03-12" — das ist Souveränitäts-relevant.
- **Methodische Konsistenz mit B16-ADR-061.** Die Notfall-Cache-Ausnahme von B16-ADR-052 wurde als eigene ADR dokumentiert (Plain-Speicherung als bewusste Ausnahme der Block-pro-Block-Verschlüsselung). Eine vergleichbare Ausnahme von §2.6 Akz.-Kr. 4 verdient denselben Audit-Wert.
- **Lese-Diszipliniertheit der §2.6-Regel.** Der wörtliche §2.6-Text spricht von „der Anker-Person" — semantisch gemeint ist die _pflegende_ Anker-Person des Hauptdepots, nicht jede beliebige Anker-Person eines durch Export entstandenen Vivodepots. Diese Lese-Art ist die konsistente Auflösung, gehört aber explizit dokumentiert.

## Geprüfte Optionen

1. **Option A — Anker-Person der exportierten Datei trägt ausnahmsweise Provenance.** Die §2.6-Regel gilt für die pflegende Hauptdepot-Anker-Person, nicht für die durch Export entstandene Anker-Person der neuen Datei. Die übernommene Provenance plus der „Exportiert aus Sorge-Depot"-Eintrag stehen in `_root.ankerPerson.provenance` der exportierten Datei.
2. **Option B — Provenance in `subDepots: []` schmuggeln.** Semantisch falsch, weil B16-ADR-052 die exportierte Datei per Definition mit `subDepots: []` festlegt — das wäre Pseudo-Sub-Depot ohne UUID und ohne Sub-Schlüssel.
3. **Option C — Eigener Audit-Bereich `_root.exportHistorie`.** Neues Schema-Feld auf Wurzel-Ebene, separater Audit-Block. Vorteile: §2.6-Regel formal eingehalten. Nachteile: Schema-Erweiterung über das v3-Schema hinaus, ohne dass ein zweiter Audit-Konsument absehbar ist. Plus: doppelte Datenhaltung (Provenance einmal in `_root.exportHistorie`, einmal nicht zugänglich für die Datensatz-Detail-UI).
4. **Option D — Provenance verwerfen, nur Export-Hinweis behalten.** Verstößt direkt gegen §2.8 Akz.-Kr. 6 — abgelehnt.

## Entscheidung

Gewählt: **Option A — Anker-Person der exportierten Datei trägt ausnahmsweise Provenance, mit B16-ADR-062 als dokumentierter Architektur-Ausnahme.**

Konkret:

1. **Bei Sub-Depot-Export** (`exportSubDepot`-Funktion in Task 5.7) wird das Sub-Depot zur Anker-Person der neuen Datei. Die `sub.provenance`-Einträge werden 1:1 nach `_root.ankerPerson.provenance` der exportierten Datei übertragen.

2. **Zusätzlicher Provenance-Eintrag** wird angefügt:
   ```js
   {
     feldPfad: '_export',  // semantisch eindeutiger Pseudo-Pfad, kein realer Daten-Schreibvorgang
     eingabeDurch: 'anker',
     datum: '<ISO-Datum-des-Exports>',
     vollmachtsGrundlage: null,  // beim Export-Eintrag keine Vollmachts-Grundlage; das Export-Datum + Anker-Name dokumentiert sich selbst
     exportInfo: {
       quelleAnker: '<Name-der-Hauptdepot-Anker-Person>',
       exportDatum: '<ISO-Datum>'
     }
   }
   ```
   Das `exportInfo`-Sub-Objekt ist neu gegenüber dem AP-5.5-Schema; es trägt die Quelle-Information explizit.

   **`exportInfo`-Schema-Spezifikation** (ergänzt 28.04.2026 nach Klasse-A-Review-Klärung c):
   - `quelleAnker` (Pflicht-Feld, String): Name der pflegenden Anker-Person des Hauptdepots zum Export-Zeitpunkt — typischerweise `vorname + ' ' + nachname` aus `_root.ankerPerson`. Fallback `'die Anker-Person'` falls beide Namens-Felder leer sind.
   - `exportDatum` (Pflicht-Feld, ISO-8601-String): Identisch zum `datum`-Feld des umgebenden Provenance-Eintrags. Bewusste Redundanz zur Audit-Lesbarkeit — wer den `_export`-Eintrag liest, sieht das Datum sowohl im Provenance-Standard-Feld als auch im `exportInfo`-Kontext.
   - `exportGrund` (optionales Feld, String): in Sprint 1 nicht erfasst, weil kein UX-Pfad existiert. Schema-Erweiterung möglich, falls eine spätere UX-Iteration die Anker-Person nach einer Begründung fragt (z.B. „Erbschaftsfall", „Übergabe an Pflegeeinrichtung", Freitext).

   **Audit-Stabilität (Klasse-A-Review-Klärung b):** Bei der Übernahme der `sub.provenance`-Einträge in die exportierte Datei wird **tiefe Kopie** verwendet (`structuredClone` mit JSON-Roundtrip-Fallback), nicht `slice()`. Damit sind Sub-Objekte wie `vollmachtsGrundlage: { typ, beginnDatum }` (AP 5.5 Frage 2) zwischen Hauptdepot und exportiertem Vivodepot vollständig referenz-getrennt. Eine spätere Mutation eines Hauptdepot-Provenance-Eintrags beeinflusst den exportierten Snapshot nicht.

3. **In der exportierten Datei** sind die übernommenen Provenance-Einträge unverändert sichtbar; der `_export`-Eintrag wird in der UI als Hinweis-Zeile gerendert (Sprint 2 von Task 5.7 oder spätere UI-Iteration).

4. **Im Hauptdepot bleibt** das Sub-Depot mit Status `'exportiert'` weiter sichtbar; die ursprüngliche `sub.provenance` bleibt dort unverändert. Hauptdepot-Anker hat weiterhin keine Provenance — die §2.6-Regel ist für den Hauptdepot-Anker eingehalten.

5. **Lese-Disziplin der §2.6-Regel:** Die Aussage „die Anker-Person hat keine Provenance" gilt im Kontext eines _zusammenhängenden_ Vivodepots mit der pflegenden Anker-Person plus eingebetteten Sub-Depots — das ist die Sorge-Struktur aus B16-ADR-052. Eine durch Export entstandene Vivodepot-Datei ist eine eigenständige Datei, in der die übernommene Anker-Person kein „pflegender Bediener" mehr ist, sondern die Souveränitäts-Trägerin der Daten. Für sie gilt §2.6 nicht.

## Konsequenzen

**Positiv.**

- §2.8 Akz.-Kr. 6 ist erfüllt — Provenance-Spuren bleiben erhalten, Empfänger-Person sieht Bediener-Identität und Vollmachts-Grundlage der ursprünglichen Schreibvorgänge.
- Audit-Wert der Provenance ist durchgängig: Hauptdepot dokumentiert (über `sub.provenance`) → exportierte Datei dokumentiert (über `_root.ankerPerson.provenance`) → keine Audit-Lücke.
- Das `exportInfo`-Sub-Objekt im `_export`-Eintrag dokumentiert nachvollziehbar die Export-Quelle für die Empfänger-Person — Werkzeug-Philosophie-konsistent.
- Methodische Konsistenz mit B16-ADR-061: explizite Ausnahmen von B16-ADR-052-Disziplinen werden auf ADR-Niveau dokumentiert, nicht versteckt im Code-Kommentar.

**Negativ.**

- §2.6 Akz.-Kr. 4 trägt eine Lese-Erweiterung („gilt für pflegende Hauptdepot-Anker-Person, nicht für exportierte Anker-Person"). Diese Lese-Art muss in jedem Provenance-bezogenen Code-Kontext berücksichtigt werden — Test-Disziplin: AP-5.5-Tests prüfen weiterhin Hauptdepot-Anker, AP-5.7-Tests prüfen explizit exportierte Anker-Provenance.
- Schema-Erweiterung um `exportInfo`-Sub-Objekt im Provenance-Eintrag — neue Feld-Definition gegenüber AP 5.5. Sprint-1-Tests von 5.7 müssen das verifizieren.

**Neutral.**

- UI-Render der Provenance-Zeile (`renderProvenanceZeile` aus AP 5.5) braucht ggf. Erweiterung um den `exportInfo`-Pfad — Sprint 2 von Task 5.7 entscheidet die UI-Form.
- Statische Tests (`code/test_vivodepot.py`) sollten den `_export`-Pseudo-Pfad als bekannten Wert akzeptieren, falls dort Provenance-Schemata geprüft werden.

## Vor- und Nachteile der Optionen

### Option A — Anker-Person der exportierten Datei trägt Provenance (gewählt)

- **Gut:** §2.8 Akz.-Kr. 6 sauber erfüllt; Audit-durchgängig; Schema-erhaltend; semantisch konsistent (Anker ist die Souveränitäts-Trägerin der Daten).
- **Schlecht:** §2.6-Regel braucht Lese-Erweiterung; Schema-Mini-Erweiterung um `exportInfo`.

### Option B — Pseudo-Sub-Depot in `subDepots: []`

- **Gut:** §2.6 formal unangetastet.
- **Schlecht:** Pseudo-Sub-Depot ohne UUID/Sub-Schlüssel/Eigentümer-Felder verstößt gegen B16-ADR-052 Schema-Definition. UI würde es als „Sub-Depot" rendern, was semantisch falsch ist.

### Option C — Eigener `_root.exportHistorie`-Bereich

- **Gut:** §2.6 formal eingehalten; klare Trennung zwischen normalen Daten-Provenance und Export-Spur.
- **Schlecht:** Schema-Erweiterung über v3 hinaus für nur einen Konsumenten; doppelte Datenhaltung; UI-Komplexität (zwei Quellen für Provenance-Zeile); Empfänger-Person sieht im Datensatz-Detail keine Provenance, weil sie in einem separaten Bereich wartet.

### Option D — Provenance verwerfen

- **Gut:** §2.6 trivial eingehalten.
- **Schlecht:** Verstößt direkt gegen §2.8 Akz.-Kr. 6 — Audit-Verlust, Werkzeug-Philosophie verletzt.

## Nachweis

Anforderungs-Spannung explizit:

> „Die Anker-Person hat keine Provenance-Spuren — das Konzept gilt nur für Sub-Depots."
>
> — *[Anforderung an das Provenance-Tracking]*

> „Die Provenance-Spuren des Sub-Depots werden in der exportierten Datei erhalten, mit zusätzlichem Provenance-Eintrag „Exportiert aus Sorge-Depot von [Name der Anker-Person] am [Datum]"."
>
> — *[Anforderung an den Sub-Depot-Export]*

Architektur-Vorgänger:

> „Sub-Depot-Daten werden vom Sub-Schlüssel entschlüsselt (im Speicher), in eine neue Vivodepot-Struktur transformiert (das Sub-Depot wird zur Anker-Person der neuen Datei, `subDepots: []`), mit dem neuen Passwort verschlüsselt."
>
> — *[Ablauf des Sub-Depot-Exports, basierend auf B16-ADR-052 Hybrid 3A]*

Entscheidung zu Klärung 5 — eigene ADR statt Code-Kommentar:

> „Klärung 5 (Provenance-Ausnahme): nicht nur Code-Kommentar, sondern eigene ADR „Provenance-Erhaltung beim Sub-Depot-Export". Substantielle Architektur-Entscheidung mit Audit-Wert."
>
> — *[Detail-Klärung vom 28.04.2026]*

## Weiterführend

- **Implementations-Bezug:** `exportSubDepot`-Funktion in `code/VIVODEPOT.html`, Task 5.7 Sprint 1. Schema-Transformation erzeugt `_root.ankerPerson.provenance` aus `sub.provenance` plus angehängtem `_export`-Eintrag.
- **Test-Bezug:** Test 5.7.S1-A-03 (Vorsorge-Anweisung übertragen) prüft den Provenance-Block der exportierten Datei mit; falls separater Provenance-Test gewünscht, würde 5.7.S1-A-05 (Provenance-Erhaltung) ergänzt werden — zu prüfen gegen die Test-Skizze für Sprint 1 von Task 5.7.
- **UI-Bezug:** Sprint 2 von Task 5.7 entscheidet, ob `renderProvenanceZeile` aus AP 5.5 um den `_export`-Pfad erweitert wird oder ob ein eigener Render-Pfad für Export-Quellen-Hinweise entsteht.
- **Verwandte ADRs:**
  - B16-ADR-052 (Sorge-Struktur, Hybrid 3A für Sub-Depot-Export) — Vorgänger; B16-ADR-062 ist Folge-ADR.
  - B16-ADR-061 (Notfall-Cache als opt-in) — methodisch verwandt: explizite Ausnahme von B16-ADR-052-Disziplin mit dokumentierter Begründung.

---

## Checkliste vor Annahme

- [x] Alle Pflichtfelder im Header ausgefüllt (Status, Datum, Kategorien)
- [x] Mindestens zwei Optionen unter „Geprüfte Optionen" (vier geprüft)
- [x] Konsequenzen getrennt nach positiv/negativ/neutral
- [x] Vor- und Nachteile für jede geprüfte Option benannt
- [x] Nachweis-Abschnitt enthält mindestens ein wörtliches Zitat mit Quellenangabe (vier Zitate)
- [x] Bestätigt durch die Klärung vom 28.04.2026.
