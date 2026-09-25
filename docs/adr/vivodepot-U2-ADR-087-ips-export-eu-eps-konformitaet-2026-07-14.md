# U2-ADR-087 · IPS-Export — eu-eps-Konformität (Procedures + Medical Devices)

**Datum:** 14.07.2026
**Status:** Angenommen · gebaut 14.07.2026, abgeschlossen 14.07.2026 (Suite grün, Produktfreigabe, lokal 0 Errors gegen `hl7.fhir.eu.eps#1.0.0-ballot`)
**Status heute:** gilt — `sectionProceduresHx`/`sectionMedicalDevices` (LOINC 47519-4/46264-8) und
die duale `composition-eu-eps`/`bundle-eu-eps`-Profilierung sind im Kern vorhanden
(`vivodepot.html` ab :10906), `tests/fhir-ips.test.js` besteht.
**Bezug:** U2-ADR-004 (IPS-Export, Bau) · U2-ADR-079/081 (delegierter Bundle-Bau, Provenance) ·
Gazelle-EVSClient-Befund Testcase 205 (Bundle FAILED gegen `bundle-eu-eps|1.0.0-alpha`) ·
eine mündliche/Chat-Rückmeldung zum Stufe-1-Ergebnis (14.07.2026, nicht gesondert dokumentiert)

---

## 1 · Kontext

Der bestehende `fhirIpsBundle()`-Export war gegen `hl7.fhir.uv.ips#2.0.0` gebaut und dort
konform (0 Errors, s. Validator-Lauf 14.07.). Der Gazelle-Testcase 205 verlangt jedoch das
darauf aufbauende **HL7 Europe Patient Summary** (eu-eps), das zusätzlich zu den drei
uv-ips-Basissektionen **zwei weitere Pflicht-Sektionen** verlangt:

- `sectionProceduresHx` (LOINC `47519-4`) — Prozeduren/Eingriffe
- `sectionMedicalDevices` (LOINC `46264-8`) — Medizinprodukte

Beide sind auf der Composition `min=1, max=1` — Pflicht-Slices, aber **nicht** pflicht auf
Entry-Ebene (`entry:procedure`/`entry:deviceStatement` beide `min=0`) — eine leere Sektion mit
`emptyReason` erfüllt die Slice-Anforderung, geprüft direkt an
`StructureDefinition-composition-eu-eps.json`.

## 2 · Entscheidung

**Bundle- und Composition-`meta.profile` führen BEIDE Profile** (uv-ips + eu-eps), nicht
ersetzt. Das Bundle bleibt strukturell ein gültiges IPS-Dokument und wird zusätzlich als
eu-eps-Dokument deklariert.

**`sectionProceduresHx` ergänzt.** Quelle: `gesundheit.voroperationen` — ein Freitextfeld
(nicht codiert, nicht Chip-Array). Bei Inhalt: **genau ein** `Procedure`-Entry, ganzer String
unverändert als `code.text`. **Kein Parsen, kein Split** (auch nicht an „;", obwohl das
Beispielformat mehrere durch „;" getrennte Einträge im selben Feld zeigt) — dieselbe
Disziplin, die beim FHIR-Export-Kommasplitten-Befund (13.07.) und beim Chip-Mechanik-Bau
bereits als verbindlich etabliert wurde. Bei leerem Feld: `emptyReason`, Sektion bleibt.

**`sectionMedicalDevices` ergänzt — aber bewusst IMMER leer mit `emptyReason`, unabhängig vom
Feldinhalt.** Grund: `DeviceUseStatement-eu-eps` verlangt zwingend `timing[x]` (`min=1`,
entweder `timingDateTime` oder `timingPeriod`). Das Depot-Feld `gesundheit.implantate`
(„Hüft-TEP rechts (Stryker), seit 2019") trägt kein strukturiertes Datum — nur gelegentlich
einen Jahreshinweis im Freitext. Ein Datum aus diesem Text zu extrahieren wäre dieselbe
Fehlerklasse wie das verbotene Semikolon-Parsen; ein erfundenes Platzhalter-Datum (z. B. der
Exportzeitpunkt) wäre eine falsche klinische Aussage. **Diese Sektion bleibt daher bis auf
Weiteres strukturell leer** — die Sektion selbst ist vorhanden (Slice-Pflicht erfüllt), ihr
Inhalt fehlt ehrlich benannt.

`hilfsmittel` (Sektor Vorsorge) wird **nicht** einbezogen — ein Feld, ein Konsument
(`implantate`), keine Zusammenführung über Sektoren.

**Derselbe Datums-Konflikt trifft auch `sectionProceduresHx`.** Beim lokalen Validator-Lauf
gegen den ersten befüllten Testbundle (mit `voroperationen`-Inhalt) zeigte sich:
`Procedure-eu-eps` verlangt ebenfalls zwingend `Procedure.performed[x]` (`min=1`) — dieselbe
Fehlerklasse wie `DeviceUseStatement.timing[x]`. Das war in der Stufe-1-Prüfung übersehen
worden (nur `Procedure.subject.reference` war dort als Pflichtfeld gemeldet). Für das
tatsächlich ausgelieferte Gazelle-Sample-Bundle stellt sich die Frage nicht: Das Depot in
diesem Export trägt weder `voroperationen` noch `implantate` — beide Sektionen tragen
`emptyReason`, was die wahre Aussage für dieses konkrete Depot ist. **Die Frage, wie ein
befülltes `voroperationen`/`implantate`-Feld ohne strukturiertes Datum künftig eu-eps-konform
exportiert werden soll, bleibt für BEIDE Sektionen offen** (s. §4).

**`Composition.identifier` ergänzt.** `composition-eu-eps` verlangt `Composition.identifier`
(`min=1`) — uv-ips nicht. Ohne dieses Feld schlug zusätzlich der profil-diskriminierte
`Bundle.entry:composition`-Slice fehl (Discriminator prüft volle Konformität gegen
`composition-eu-eps`, nicht nur die `meta.profile`-Deklaration) — beide zunächst gemeldeten
Slice-Fehler waren Folgefehler desselben fehlenden Felds, kein eigenständiges Problem. Fix:
`Composition.identifier` = eigene `urn:uuid`-Kennung (analog zum bereits vorhandenen
`Bundle.identifier`, aber ein separater Wert).

**SNOMED-Display korrigiert.** Code `91936005` heißt „Allergy to penicillin" (die
Allergie-Aussage), nicht „Penicillin" (der Wirkstoff) — in der Beispiel-Depot-Befüllung für
den Gazelle-Sample korrigiert (Testdaten, nicht Produktivcode).

## 3 · Verhältnis zu U2-ADR-086

**Eigene ADR, kein Nachtrag zu ADR-086.** ADR-086 betrifft den **Durchreiche-Export**
(Klasse-4-Originale unverändert herunterladen — kein Producer). Diese ADR betrifft den
**Producer-Export** `fhirIpsBundle()` selbst — Vivodepot erzeugt hier eine eigene FHIR-Aussage
aus Bürgerfeldern und muss sie strukturell korrekt bauen. Beide ADRs berühren zufällig
denselben Dokumenttyp (IPS/EPS-Bundle), betreffen aber unterschiedliche Code-Pfade mit
unterschiedlicher Zertifizierungs-Verantwortung.

## 4 · Offener Punkt — nicht hier entschieden

**`sectionMedicalDevices` UND `sectionProceduresHx` bleiben strukturell leer, sobald das
zugehörige Freitextfeld (`implantate` bzw. `voroperationen`) kein Datum trägt — unabhängig
davon, ob das Feld selbst befüllt ist.** Für das am 14.07. ausgelieferte Gazelle-Sample stellt
sich die Frage nicht (beide Felder im Test-Depot leer). Optionen für den künftigen
befüllten Fall, keine hier gewählt:
- **A.** So belassen — Freitext-Inhalt existiert im Depot, erscheint aber nicht im
  eu-eps-Export, weil ihm ein Pflichtfeld (Datum) fehlt.
- **B.** `implantate`/`voroperationen` datenmodellseitig um ein optionales Datumsfeld
  erweitern (eigener Bau, Schema-Bump, kein Export-Thema mehr).
- **C.** Anderer Weg, noch nicht benannt.

## 5 · Konsequenzen

- `tests/fhir-ips.test.js`: fünf Sektionen mit korrekten LOINC-Codes; Medical-Devices-Sektion
  bleibt immer `emptyReason`; bestehender Test um die Procedures-Prüfung ergänzt (kein Split
  bei „;" im Freitext); Dual-Profil-Test (uv-ips + eu-eps auf Bundle und Composition).
  Suite 1384/1384 grün.
- `Composition.identifier` ergänzt (eu-eps-Pflichtfeld, uv-ips kennt es nicht) — behebt neben
  dem direkten Fehler auch die beiden `Bundle.entry:composition`-Slice-Folgefehler.
- Kein Schema-Bump — reiner Export-Code, `data`/`schemaVersion` unberührt.
- Krypto unberührt (Block-Hash unverändert:
  `72038bd272cc5efd041c0539050475d4118b9c624d005f31155532d01d4070c3` für `vivodepot.html`).
- Lokaler `validator_cli`-Lauf gegen `hl7.fhir.eu.eps#1.0.0-ballot` (Gazelle prüft gegen
  `1.0.0-alpha`, im öffentlichen Registry nicht verfügbar) zeigt für das ausgelieferte Sample
  **0 Errors, 5 Warnings (ValueSet `terminology.ehdsi.eu` lokal nicht auflösbar — bekannte
  Paket-Cache-Lücke), 2 Information**. Informativ, kein Freigabekriterium — das Urteil fällt
  im Gazelle-EVSClient.
- Ausgeliefertes Sample zum Zeitpunkt dieser Entscheidung: gazelle-ips-bundle-eu-eps-2026-07-14.json
  (sha256 d4e3265583a272768f59e11be8083fd696fd6758b5329acf0047be9ab73894b0) — am 12.09.2026 aus
  dem öffentlichen Testbestand entfernt (ungenutzte Kategorie-3-Fixture, kein Testcode lud sie
  inhaltlich; s. `tests/fixtures/README.md`).

---

*Vivodepot GmbH · Berlin · 14.07.2026*
