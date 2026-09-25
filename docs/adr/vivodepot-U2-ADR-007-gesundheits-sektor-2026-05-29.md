# U2-ADR-007: Gesundheits-Sektor — schlank, FHIR über Template

**Status:** Akzeptiert
**Datum:** 29.05.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL
**U2-Bezug:** U2-ADR-005 (Urheberschaft), U2-ADR-006 (Andock-Architektur). Cross-Referenz: Produktiv-`ADR-075` (Feld-Sektor-Zuordnung), `ADR-063` (FHIR-Provenance).
**Status heute:** gilt — Sektor `gesundheit` im Kern vorhanden (`vivodepot.html:5868`, Format `FHIR_IPS`), Code-Slot-Mechanik aufgerufen, IPS-Bundle-Export produktiv.

---

## Kontext

Erster vollständig ausgebauter Sektor und erster Andockfall von U2-ADR-006. Die IPS-/FHIR-Maschinerie machte die Produktiv-Datei groß; sie bleibt hier draußen.

## Entscheidung

Der Gesundheits-Sektor ist eine schlanke Speicher- und Anzeige-Schicht. Sechs Feldgruppen, FHIR-anschlussfähig geschnitten (= IPS-Pflichtbereiche): Notfall-Basis (blutgruppe, allergien, erkrankungen, medikamente-Liste, implantate, hilfsmittel), Impfungen, Ärzte und Kasse, Körper und Lebensstil, Vorgeschichte, Organspende und Grenzen. Dazu ein ausklappbarer Fachbefund-Abschnitt (freie Liste) für seltene, lebenswichtige Befunde.

Jeder Eintrag wird über U2-ADR-005 gestempelt. Jeder Eintrag trägt einen optionalen, leeren Code-Slot (U2-ADR-006-Andockpunkt) — `null`, bis ein Template ihn füllt. Keine Code-Tabelle, keine Zuordnungs-Logik im Kern.

**FHIR über Template, nicht im Kern:** Die Speicherform ist nicht selbst FHIR. Der spätere Export liest die internen Felder und baut das IPS-Bundle (wie Produktiv) — die Übersetzungs-Schicht und die Code-Tabellen kommen als zertifiziertes Template (U2-ADR-006). FHIR-Korrespondenz pro Feldgruppe ist als Anschluss-Notiz im Code vermerkt, keine Maschinerie.

## Konsequenzen

- Kern bleibt klein und niedrigschwellig; FHIR-Import/-Export bleibt voll möglich, sobald die Übersetzungs-Schicht kommt.
- Arztfelder sind aktuell Text, nicht Verweis auf `data.menschen[]` — offene Verfeinerung, kein Blocker.
- Pflegefelder gehören nach `ADR-075` in die Sozialversicherung, nicht hierher.

## Implementations-Verweis

Kern-Commit *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 29.05.2026)* (+302/−30), Suite-Commit *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 29.05.2026)* (`tests/gesundheit-sektor-ausbau.test.js` neu, +226/−1). Suite 50/50 grün. Block-Hash `6eb590b9…f56d05` unverändert (Sektor in Script 2, Krypto-Block unberührt). Integrität: `bdd4da19…`.
