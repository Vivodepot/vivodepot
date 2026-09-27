# U2-ADR-021: Rolle am Bezug, nicht an der Person — rollenloses Personen-Register

**Status:** Akzeptiert
**Datum:** 18.06.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL, UX
**Cross-Referenz (Produktiv-Kanon):** `ADR-095` (Referenz-/Propagations-Modell).
**U2-Bezug:** `U2-ADR-008` (Propagation — `data.menschen[]`, Ref-Picker), `U2-ADR-010` (Render-Schicht — `feldInputHTML`/`data-edit-ref`), `U2-ADR-005` (Urheberschaft — `akteur` zeigt auf `data.menschen[]`). **Supersedet datiert** den „UI-Auswahl-Widget fehlt"-Teil von **U2-ADR-017** (s. dort Nachtrag 18.06.).
**Drei-Anker:**
- **Code-Stelle:** `personenVorschlag` / `personHinzufuegen` / `personAktualisieren` (Register-Mechanik) + die Inline-Anlage-Aufrufer im Ref-Picker, in `vivodepot.html`.
- **Sprint-Commit:** dieser Bau (A1-Cluster: rollenloses Register + C4).
- **ADR-Bezug:** dieser ADR (U2-ADR-021).
**Status heute:** gilt — `personenVorschlag` (`vivodepot.html:16946`) filtert weiterhin nicht nach Rolle, liefert alle Register-Personen.

---

## Kontext

Der Stufe-1-Befund (18.06.) belegte am Code einen **Rollen-Silo**: `personenVorschlag(rolle)` filterte hart nach `p.rolle`, jedes Person-Ref-Feld rief `personenVorschlag(feld.rolle)`, und der Sitzungs-Akteur (über `personSicherstellen` rollenlos angelegt) erschien in **keinem** rollen-gefilterten Feld. U2-ADR-017 hatte den Zustand als „UI-Auswahl-Widget fehlt" notiert — die Datums-Prüfung zeigte: der Ref-Picker existierte schon **vor** ADR-017 (Commit `382585fc`, 06.06.). Das Widget fehlte also nicht, es war **rollen-siloiert**. ADR-017s Formulierung wird hiermit datiert präzisiert/abgelöst.

## Entscheidung

**Personen sind rollenlos im Register. Die Rolle ist eine Eigenschaft des FELDS (des Bezugs), in dem die Person referenziert wird — nicht der Person.** Single Source of Truth: eine Person, überall wählbar.

1. **Register rollenlos.** `data.menschen[]` = `{ id, name, … }` ohne `rolle`. `personHinzufuegen`/`personAktualisieren` nehmen `rolle` nicht mehr in die Feld-Liste auf (eine übergebene `rolle` wird ignoriert).
2. **`personenVorschlag` liefert IMMER alle Personen.** Kein Rollen-Filter. Jedes Person-Ref-Feld zeigt alle Register-Personen plus „+ Neue Person" — inkl. des Sitzungs-Akteurs.
3. **Rolle implizit im Feld.** Das `hausarzt`-Feld IST der Rollen-Kontext „Hausarzt"; `feld.rolle` bleibt als Feld-Metadatum erhalten, wird aber nicht mehr zum Filtern der Personen genutzt.
4. **C4 mit-gelöst.** Das Erben-Feld (`erben`, `ref:person`) bot durch den all-Personen-Picker automatisch alle Register-Personen an.

## Abgrenzung / Klarstellung (Korrektur zum Stufe-1-Befund)

Es gibt **zwei** verschiedene Strukturen namens „menschen":
- **Register** `data.menschen[]` — der Propagations-Speicher (Refs zeigen hierher). NUR dieses wird rollenlos.
- **Sektor-Listenfeld** `data.sektoren['meine-menschen'].menschen` („Menschen, die mir wichtig sind") mit Sub-Feld `rolle` = **Rolle/Beziehung** (Schwester · Freundin), aus vCard/b16-Import. Der frühere Stufe-1-Befund verwechselte beide; der vCard/b16-Import-Export-Round-Trip (`vcardMenschen`, `_vcardMenschenEintraege`, `B16_SUB.menschen`) hängt am **Listenfeld** und bleibt **unberührt**. Es war also KEINE „Überladung von person.rolle" — zwei getrennte Felder mit gleichem Namen.

## Konsequenzen

- **Silo weg, keine Doppeleingabe:** Eine einmal angelegte Person erscheint in jedem Person-Ref-Feld; der Sitzungs-Akteur ist überall wählbar (A3-Personen-Anteil gelöst).
- **Kein Migrations-Zwang:** das Register trägt heute `rolle` nur aus der Inline-Anlage (Silo-Schlüssel); v3 ist vor-produktiv/wegwerfbar (Linie wie U2-ADR-017/018). Keine Lade-Migration; künftige Einträge sind rollenlos.
- **Krypto unberührt:** VdCrypto-Block-Pin `8d31c678906a4916372340d1eb05474ee44e400a6affa204e00aa8053e650258` unverändert (nur Register-/Render-Funktionen, außerhalb des Blocks). Suite 887/0 (1 bewusster FHIR-Skip). Neuer Voll-Datei-SHA in `vivodepot.html.sha256` nachgezogen.

## Offener Folge-Punkt (gemeldet, NICHT in diesem Cluster gebaut)

- **C2 — Kinder als Person: strukturelle Gabelung.** Die `kinder`-/`erwachsene_kinder`-Listen (Sektor meine-menschen) speichern Kinder als **Inline-Objekte** mit eigenen `vorname`/`nachname`-Textfeldern — **kein** `ref:person`-Unterfeld (anders als `unterhalt`, das einen `person`-Ref hat). Sie auf den Personen-Pfad (`data.menschen[]`) zu bringen, heißt das Listen-Datenmodell umbauen (wohin mit `geburtsdatum`/`sorgerecht_kind`/`betreuungsmodell`/`geburtsurkunde_ort` — auf die Person, auf die Listen-Zeile neben dem Ref?). Das ist kein trivialer Freitext→Ref-Tausch → gemäß Auftrag-Abschnitt 3 **gestoppt und gemeldet**, nicht improvisiert.
- **Institutionen** (Section 6): nicht in diesem Cluster. `art` filtert weiter (`institutionenVorschlag(art)`) — bewusst unberührt.

## Implementations-Verweis

Umgesetzt 18.06.2026 (clean-rebuild):
- **Kern** `vivodepot.html`: `personenVorschlag` → immer alle; `personHinzufuegen`/`personAktualisieren` ohne `rolle`; Ref-Picker-Inline-Anlage übergibt keine `rolle` mehr.
- **Tests:** `propagation-mechanik.test.js` (Test 5 → Anti-Silo „immer alle"), `listen-ui.test.js` (Picker zeigt auch anders-rollige Personen; Inline-Eintrag ohne `rolle`), neu `a1-rollenloses-register.test.js` (Anti-Silo, Sitzungs-Akteur wählbar, C4-Erben). vCard/b16-Import-Tests (`import-welle3`, `weitere-formate`) unberührt (Listenfeld, nicht Register).
