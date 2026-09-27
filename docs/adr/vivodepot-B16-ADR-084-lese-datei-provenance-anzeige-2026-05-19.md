# B16-ADR-084: Lese-Datei-Provenance-Anzeige (B16-ADR-081 Komponente 6 Implementations-Beleg)

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 19.05.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** akzeptiert
- **Datum:** 2026-05-19 (rückwirkende Verankerung der Implementation vom 18.05.2026, Commit des damaligen Stands)
- **Kategorien:** UX-PRINZIP | ARCHITEKTUR
- **Format:** MADR 4.0 mit Vivodepot-Erweiterungen
- **Vorgänger:** B16-ADR-081 (Tod-Übergangs-Architektur, Komponente 6 als Spec). B16-ADR-014 (Lese-App als Empfänger-Komponente, Altformat-Reihe). B16-ADR-062/B16-ADR-063 (FHIR-Provenance-Substrat). I-22 (Provenance-Variante A mit eingabeDurchName-Snapshot, Commit des damaligen Stands).
- **Bezug:** I-25-Sprint-Commit des damaligen Stands (18.05.2026 Implementation in `code/vivodepot-lesen.html`). Drei Klasse-A-Tests in `code/test_behavior_adr081_lesedatei_provenance.js`. Pre-Release-Inventur 17.05.2026 (verlangte den ADR-Nachtrag zur Lese-App).

## Kontext und Problemstellung

B16-ADR-081 hat in Komponente 6 verankert, dass die Lese-Datei (`vivodepot-lesen.html`) historische Anker-Provenance an den Empfänger vermittelt. Hintergrund: Bei Tod-Übergang oder Anker-Wechsel können einzelne Datensätze in einem Sub-Depot von verschiedenen historischen Anker-Personen stammen (I-22 Provenance-Variante A speichert `eingabeDurchName` als Snapshot zum Schreib-Zeitpunkt). Wenn der Empfänger über die Lese-Datei in die Daten schaut, sollte er diese historische Spur sehen — sonst wirkt der aktuelle Anker-Name als alleiniger Eintragender, was bei Anker-Wechsel-Konstellationen falsch ist.

B16-ADR-081 K6 war als Spec festgelegt, aber nicht durch ein eigenes ADR-Dokument als Implementation belegt. Die Implementation lief am 18.05.2026 als Sprint I-25 (Commit des damaligen Stands). Die Pre-Release-Inventur 17.05.2026 hat einen ADR-Nachtrag für die Lese-App-Strecke beta.10 → v1.0 beauftragt — beim Abgleich vor Beginn von Sprint E wurde sichtbar, dass die Inhalt-Erweiterung gegenüber B16-ADR-014 nicht in den Versions-Strängen liegt (die sind unverändert), sondern in der I-25-Erweiterung der internen Lese-App.

**Frage:** Wie wird die I-25-Implementation der Lese-Datei-Provenance-Anzeige formal als Architektur-Entscheidung verankert, damit B16-ADR-081 K6 nicht nur als Spec, sondern als belegte Architektur-Kern dokumentiert ist?

## Entscheidungstreiber

- **B16-ADR-081-Familien-Vollständigkeit.** Sieben Komponenten produktionsfähig (Sprint-I-27-Abschlussbericht), aber K6 ohne eigenständigen ADR-Beleg. Schließt die ADR-Familie formal.
- **Empfänger-Transparenz.** Die Lese-Datei ist die Außenkante der Vivodepot-Architektur — Institutionen und Erbnehmer sehen Daten durch sie. Die historische Spur (wer hat wann eingetragen?) ist für Vertrauen und Audit relevant.
- **Werkzeug-Charakter.** Vivodepot dokumentiert den Willen der Bürgerin und ihrer Vertretung. Die Provenance-Anzeige ist Dokumentation, kein Beweis-Mittel — der Werkzeug-Charakter wird klar markiert.
- **Backward-Compat.** Bestehende Lese-Datei-Empfänger ohne Provenance-Payload müssen weiter funktionieren (TC-A-11b deckt das ab).

## Entscheidung

Die Lese-Datei `vivodepot-lesen.html` zeigt pro Datensatz die Eintragenden-Information aus dem Provenance-Eintrag. Konkret:

1. **Provenance-Map-Aufbau** beim Laden des Payloads — Helper `_buildProvenanceMap(daten)` indexiert `daten.provenance[]` nach `feldPfad`. Bei fehlendem oder leerem Provenance-Array: no-op (Backward-Compat).

2. **Render-Zeile pro Datensatz** — Helper `_renderProvenanceZeileLese(eintrag)` formatiert:
   - Datum: lesbar in `de-DE` (Format `dd.mm.yyyy`)
   - Name: `eintrag.eingabeDurchName` (Snapshot aus I-22 / B16-ADR-081 K5)
   - Fallback bei sehr alten Bestand-Einträgen ohne Snapshot: Rolle (`eigentuemer` / `anker`) als Text
   - Optional: Vollmachts-Typ-Suffix bei Anker-Einträgen mit `vollmachtsGrundlage`

3. **Erweiterung in `zeigeDaten`** — der Render-Pfad ruft `_buildProvenanceMap` einmalig auf, ergänzt pro Datensatz die Provenance-Zeile (sofern vorhanden) unter der Daten-Zeile. `provenance` selbst wird **nicht** als Daten-Feld gerendert (TC-A-11c).

4. **Visuelle Markierung** — Provenance-Zeile in dezenter Schriftgröße/Farbe, klar als Meta-Information abgegrenzt vom Daten-Inhalt.

## Abgelehnte Alternativen

- **Provenance nicht in Lese-Datei zeigen** — verworfen, weil B16-ADR-081 K6 die Spec ist und der Werkzeug-Charakter Transparenz verlangt. Ohne Anzeige wirkt der aktuelle Anker als alleiniger Eintragender.
- **Auch leere Provenance rendern** — verworfen wegen Backward-Compat: Bestehende Empfänger ohne Provenance-Substrat sollen unverändert funktionieren (TC-A-11b).
- **Provenance als eigene Sektion am Seitenende** — verworfen wegen Lesbarkeit. Die Provenance gehört zum jeweiligen Datensatz, nicht in eine separate Liste.
- **Rolle nur als Code (anker/eigentuemer) statt freundliche Text-Auflösung** — verworfen wegen Empfänger-Verständlichkeit. Die Lese-Datei ist Bürger-/Institutions-sichtbar, nicht maschinell.

## Konsequenzen

**Positiv:**

- B16-ADR-081-Komponente 6 ist formal als Implementations-Entscheidung dokumentiert. B16-ADR-081-Familie vollständig belegt.
- Empfänger sehen die historische Anker-Spur — wichtig bei Tod-Übergangs- und Anker-Wechsel-Konstellationen.
- Drei Klasse-A-Tests verankern das Verhalten (`test_behavior_adr081_lesedatei_provenance.js`).
- Backward-Compat sicher (TC-A-11b).

**Neutral:**

- Die Lese-Datei wird um ca. 48 Zeilen länger. Krypto-Architektur und Empfangs-Mechanik unverändert.

**Offen:**

- Public-Sync. Die I-25-Erweiterung liegt seit 18.05. nur im internen Repo. Vor v1.0-Tag muss die interne `code/vivodepot-lesen.html` ins `vivodepot-public/`-Repo synchronisiert werden, damit Empfänger die Provenance-Anzeige sehen.
- Browser-Funktionstest (Roundtrip Bürger erzeugt QR → Lese-Datei zeigt Provenance) als E2E-Spec ergänzt im selben Sprint E (`tests/e2e/user_journey_lesen_provenance.spec.js`).

## Nachweis

- Code-Stelle: `code/vivodepot-lesen.html` Z. 878-927 (`_buildProvenanceMap`, `_renderProvenanceZeileLese`) plus Erweiterung in `zeigeDaten`.
- Klasse-A-Tests: `code/test_behavior_adr081_lesedatei_provenance.js` — TC-A-11 (Eintragenden-Info pro Datensatz), TC-A-11b (Backward-Compat ohne Provenance), TC-A-11c (Provenance nicht als Daten-Feld). 3/3 grün.
- Vorgänger-Sprint: I-25 (Commit des damaligen Stands, 18.05.2026).
- Browser-Funktionstest 19.05.2026: `tests/e2e/user_journey_lesen_provenance.spec.js`.
