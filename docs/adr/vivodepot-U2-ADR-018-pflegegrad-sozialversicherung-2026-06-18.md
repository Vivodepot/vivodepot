# U2-ADR-018: Pflegegrad gehört in Sozialversicherung, nicht in Gesundheit

**Status:** Akzeptiert
**Datum:** 18.06.2026
**Kategorie:** DATENMODELL, ARCHITEKTUR, UX
**Cross-Referenz (Produktiv-Kanon):** `ADR-075` (Cross-Sektor-Tabelle — die Pflegeheim-Situation zieht das Feld weiterhin sichtbar), `ADR-063` (FHIR-Provenance/IPS — der Pflegegrad ist bewusst NICHT Teil des IPS-Bundles).
**U2-Bezug:** `U2-ADR-010` (Feld-Architektur, Sektor-Felder), `U2-ADR-008` (`CROSS_SEKTOR_FELDER`/Situations-Pulls), `U2-ADR-012` (Situationsblatt zieht Sektor-Felder zur Laufzeit), `U2-ADR-005` (Urheberschaft — der gestempelte Schreibpfad bleibt unverändert). Migrations-Bezug: **D51** (B16→v3-Migrator).
**Drei-Anker:**
- **Code-Stelle:** Sektordefinitionen `SEKTOREN` — `pflegegrad-sek` (Bereich Gesundheit) und `renten-pflege-soz` (Bereich Sozialversicherung) in `vivodepot.html`, byte-gespiegelt in `vivodepot-lesen.html`.
- **Sprint-Commit:** dieser Bau (Pflegegrad-Umzug Kern + Lese-App + Cross-Refs + pflwiz + b16-Mapping + vier Test-Dateien).
- **ADR-Bezug:** dieser ADR (U2-ADR-018).
**Status heute:** gilt — Pflegegrad liegt weiterhin in `sozialversicherung`/`renten-pflege-soz` (`vivodepot.html:6147`), Kommentar im Kern verweist ausdrücklich auf U2-ADR-018; der hier offen gelassene Label-Folgepunkt wurde mit U2-ADR-019 abgeschlossen.

---

## Kontext

Das Feld `pflegegrad` (samt `pflegegrad_seit`) lag im Bereich **Gesundheit**, in einer eigenen Sektion `pflegegrad-sek`. Das ist eine Fehl-Verortung: Der Pflegegrad ist **kein klinischer Befund**, sondern ein **sozialrechtliches Konstrukt** — er wird nach **SGB XI** vom **Medizinischen Dienst (MD)** festgestellt und ist die **Leistungsgrundlage der Pflegekasse**. Die zugehörigen Bezugs­felder (`pflegekasse`, `pflegekasse_nr`, `pflegekasse_tel`, `gdb`) leben bereits im Bereich **Sozialversicherung** (Sektion `renten-pflege-soz` bzw. `schwerbehinderung-pflege`). Der Pflegegrad gehört fachlich daneben, nicht in die Anamnese.

**Kein Interop-Verlust.** Der Pflegegrad ist bewusst **nicht** Teil des FHIR-IPS-Bundles und **nicht** Teil des Notfall-QR (beides bleibt von diesem Umzug unberührt). Der Umzug ist eine rein interne, fachlich-korrekte Sektor-Zuordnung — keine Frage des klinischen Austauschformats.

**Bestandsaufnahme am echten Stand (read-only zuerst).** Der Umzug berührt mehr als die Sektordefinition: zwei Situations-Cross-Refs (Pflegeheim-Eigenblatt + Pflegeheim-Akut), den Pflege-Übernahme-Wizard (pflwiz) und das B16→v3-Import-Mapping — in **Kern und Lese-App** (die Lese-App führt eine eigene, gespiegelte Sektor- und Situations-Struktur).

## Entscheidung

**`pflegegrad` und `pflegegrad_seit` ziehen aus `gesundheit`/`pflegegrad-sek` nach `sozialversicherung`/`renten-pflege-soz`, neben die Pflegekasse-Felder.**

1. **Nur die zwei Pflegegrad-Felder ziehen um.** Die Sektion `pflegegrad-sek` enthielt zusätzlich `pflegedienst_kontakt` und `pflegegeld` (pflwiz-B5-Teil, operative Pflege-Organisation). Diese **bleiben in Gesundheit** — sie sind nicht der sozialrechtliche Grad, sondern Pflege-Alltag. Die Sektion `pflegegrad-sek` bleibt deshalb bestehen (mit `id` und Label unverändert).
2. **pflwiz: Schritt-eigenes Ziel statt Default-Flip.** Der Pflege-Übernahme-Wizard hat als **Standardziel** weiterhin `gesundheit` (es trägt `pflegedienst_kontakt` und `pflegegeld`). Der **Pflegegrad-Schritt** bekommt ein **eigenes Ziel** `sozialversicherung` (`schritt.ziel` überschreibt `def.ziel`, das vorhandene Muster aus `wizardSchrittZiel` — dieselbe Mechanik, mit der pflwiz schon nach `meine-menschen` und `vorsorge` schreibt). So landet nur der Pflegegrad in Sozialversicherung; Pflegedienst/Pflegegeld bleiben korrekt in Gesundheit. Ein bloßer Default-Flip hätte die beiden anderen Felder fehl-geroutet.
3. **Cross-Refs nachgezogen.** Beide Pflegeheim-Situationen (Eigenblatt „Beim Einzug ins Pflegeheim", Akut-Blatt) ziehen den Pflegegrad jetzt mit `quelle: 'sozialversicherung'`. Der sichtbare Pull bleibt erhalten (Bürgerin sieht den Pflegegrad in der Situation unverändert).
4. **B16→v3-Mapping nachgezogen.** Die Alt-Schlüssel `pflegegrad`/`pflegegrad_seit` mappen jetzt auf `sektorId: 'sozialversicherung'` (im Mapping in den Sozialversicherungs-Block verschoben). Die b16-Format-Erkennungs-Signatur nutzt `pflegegrad_seit` als **Feld-ID** (sektor-agnostisch) und bleibt unverändert gültig.
5. **Lese-App gespiegelt.** Alle Stellen (Sektordefinition, Pflegeheim-Situation) sind in `vivodepot-lesen.html` byte-fachlich parallel nachgezogen. Kern und Lese-App bleiben ein zusammengehöriges Paket.

## Konsequenzen

- **Keine In-App-Migration.** Der v3-Datenbestand ist vor-produktiv und wegwerfbar; es gibt **keinen** Migrationscode für bestehende v3-Depots, in denen ein Pflegegrad noch unter `gesundheit` liegt. (Analog zur „keine Migration"-Linie aus U2-ADR-017.)
- **D51-Vormerkung erfolgt.** Der B16→v3-Migrator (**D51**) muss diesen v3-internen Sektor-Wechsel berücksichtigen: ein Pflegegrad-Wert aus einem frühen v3-Depot gehört nach dem Umzug unter `sozialversicherung`/`renten-pflege-soz`, nicht `gesundheit`. Die Vormerkung ist in der externen Migrations-Planung abgelegt (außerhalb des Repos, gemäß Ablage-Regel für interne Arbeitsdokumente).
- **Suite grün, Krypto unberührt.** 884/0 (1 bewusster Skip = FHIR-Validator-Gate ohne `FHIR_VALIDATOR_REQUIRED`). Der VdCrypto-Block-Pin `8d31c678906a4916372340d1eb05474ee44e400a6affa204e00aa8053e650258` ist unverändert (Block-Integritäts-Test grün) — der Umzug fasst nur die Datenmodell-Region an.
- **Offener Folge-Punkt (Label).** Die in Gesundheit verbliebene Sektion trägt weiter `id: 'pflegegrad-sek'` und Label „Pflegegrad", enthält aber nur noch `pflegedienst_kontakt` + `pflegegeld`. Das Label ist damit irreführend. Bewusst **nicht** in diesem Bau umbenannt (Label = bürgersichtbarer Inhalt, nicht improvisiert) — ein Umbenennen (z. B. „Pflegeleistungen") ist als separater Folge-Punkt vermerkt.

## Implementations-Verweis

Umgesetzt 18.06.2026 (clean-rebuild):
- **Kern** `vivodepot.html`: `pflegegrad`/`pflegegrad_seit` aus `pflegegrad-sek` (Gesundheit) entfernt und in `renten-pflege-soz` (Sozialversicherung) eingefügt; Hint (MD/Pflegekasse) mitgenommen. Pflegeheim-Eigenblatt + Pflegeheim-Akut-Cross-Refs auf `sozialversicherung`. pflwiz: Schritt-eigenes `ziel: { sektor: 'sozialversicherung' }` am Pflegegrad-Schritt. B16-Mapping zwei Zeilen in den Sozialversicherungs-Block verschoben.
- **Lese-App** `vivodepot-lesen.html`: Sektordefinition + Pflegeheim-Situation gespiegelt.
- **Tests:** `wizard-pflwiz.test.js` (Ziel-Reihenfolge, Roundtrip, Sub-Modus), `situationen-maschine.test.js` (Pflegeheim-Pull-Quelle), `import-welle3.test.js` (b16-Import landet in Sozialversicherung; Multiprofil-Negativcheck umgezogen). `sektoren-spec.test.js` unverändert grün (Gesundheit behält zwei Sektionen, da `pflegegrad-sek` mit Pflegedienst/Pflegegeld weiterbesteht).
