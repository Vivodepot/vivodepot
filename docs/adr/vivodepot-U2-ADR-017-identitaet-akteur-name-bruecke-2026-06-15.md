# U2-ADR-017: Identitäts-Name speist Akteur-/Provenienz-Name (Vervollständigung von D37)

**Status:** Akzeptiert
**Datum:** 15.06.2026 (Entwurf 14.06., Speise-Stelle 15.06. entschieden)
**Kategorie:** ARCHITEKTUR, DATENMODELL, PROVENIENZ
**Cross-Referenz (Produktiv-Kanon):** `ADR-073` (Welcome-Flow-Routing-Gate — die ursprüngliche Namens-Erfassung), `ADR-094` (Welcome-Architektur-Konsolidierung — Drift-Ursprung: die Erfassung fiel als Nebeneffekt), `ADR-084`/I-22 (Lese-Datei-Provenance-Anzeige, `eingabeDurchName`-Snapshot, Commit *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 15.06.2026)*).
**U2-Bezug:** `U2-ADR-005` (Urheberschaft pro Eintrag — Akteur = konkrete Person), `D19`/`D37`/`D38` (folge-schuld), Strang 1/2.
**Diagnose:** `docs/methodik/diary/2026-06-14-drift-provenienz-name.md`.
**Status heute:** gilt — `ankerNameAusIdentitaetSpeisen()` im Kern vorhanden (`vivodepot.html:17723`), Beleg `tests/provenienz-name-bruecke.test.js`; die in dieser ADR selbst vermerkte Architektur-Schuld-Randnotiz („UI-Auswahl-Widget fehlt") bleibt wie im Nachtrag 18.06.2026 dokumentiert durch U2-ADR-021 abgelöst.

---

## Kontext

Es gibt **zwei getrennte Namens-Datenpunkte**, die lange als „der Name" verschmolzen behandelt wurden:

1. **`data.sektoren.identitaet.vorname/nachname`** — der Identitäts-/Dateiname (`depotDateiname`). **D37 füllt nur das** (freundlicher „Name ergänzen"-Hinweis für name-lose Schnell-Pfade).
2. **`data.menschen[ankerPersonId].name`** — der Akteur-/Provenienz-Name, den `U2-ADR-005` als „konkrete Person" pro Eintrag fordert.

**Drift mit Ursprung.** Die Erfassung des handelnden Namens existierte einmal im Welcome-Fluss (`ADR-073`), fiel aber als Nebeneffekt der Welcome-Architektur-Konsolidierung (`ADR-094` / E-i, namenloser niedrigschwelliger Eintritt) weg. Niemand entschied „die Akteur-Namens-Erfassung soll weg" — ein Umbau mit anderem Ziel nahm sie mit. Die Folge-Schuld `D37` schloss anschließend die **sichtbare** Hälfte (Identitäts-/Dateiname) und schrieb „Lücke: keine" — die **unsichtbare** zweite Hälfte (Provenienz-Name) blieb offen, weil die Zweiteilung nicht benannt war.

**Am Gerät belegt** (Browser-Diagnose 14.06., nicht Lektüre — der erste Lektüre-Schluss war ein BSD-grep-Artefakt): Die Provenienz wird im Normalfluss **gesetzt und gestempelt**, aber mit leerem Personen-Namen → Anzeige **„von "** statt **„von [Name]"**. Erreichbar, aber namenlos.

## Entscheidung

**Der Identitäts-Name speist den Akteur-/Provenienz-Namen — beim Identitäts-Edit.**

1. **Speise-Stelle (a): beim Identitäts-Edit.** Wird `data.sektoren.identitaet.vorname/nachname` geschrieben, wird der zusammengesetzte Name nach `data.menschen[ankerPersonId].name` gespeist. (Nicht beim Passwort-Setzen/`_depotAusPasswortFinalisieren` — der Eintritt bleibt namenlos und niedrigschwellig.)
2. **Nachziehen bei JEDEM Identitäts-Edit**, nicht nur beim ersten — eine Namensänderung (Korrektur, Heirat) zieht den Akteur-Namen mit.
3. **Dynamische Kopplung für leere Stempel.** Über die vorhandene Hybrid-Auflösung in `stempelName` (leerer `eingabeDurchName` → `akteurName(personId)`) lösen **bereits gesetzte, aber namenlose** Stempel automatisch zum aktuellen Namen auf — **keine Migration** nötig.
4. **Bereits benannte Stempel bleiben eingefroren.** Ein Stempel mit nicht-leerem `eingabeDurchName`-Snapshot (`ADR-084`/I-22, Commit *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 15.06.2026)*) ist historischer Beweiswert und wird **nicht** rückwirkend geändert.

**Wiederverwendung der Mechanik.** Diese Brücke hängt an **derselben Identitäts-Stelle** wie die Geburtsdatum-Export-Pflicht (Commit *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 15.06.2026)*: `depotHatGeburtsdatum` / `flowFhirGeburtsdatumErgaenzen`, Guard in `flowGesundheitFhirExport`). Beide sind Pflichtfeld-/Stempel-Anliegen am `identitaet`-Bereich — die Namens-Speisung nutzt **dieselbe Identitäts-Mechanik, keinen zweiten, abweichenden Weg** (Register-Querverbindung `folge-schuld.md` D19 ⮀ Geburtsdatum-Export-Pflicht).

## Konsequenzen

- Der Provenienz-Name ist im Normalfluss gefüllt: „von [Name]" statt „von ". Die Urheberschafts-Kette aus `U2-ADR-005` wird beweiskräftig, ohne den Eintritt zu verschärfen.
- Niedrigschwelligkeit bleibt: Anlage + Nutzung ohne Namen unverändert; der Name fließt, sobald die Bürgerin ihn unter Identität einträgt.
- Rückwirkung **gratis** durch die Hybrid-Auflösung — kein Sweep, keine Daten-Migration, kein Schema-Bruch (das `name`-Feld in `data.menschen[]` existiert bereits).
- Beweiswert intakt: benannte Snapshots bleiben eingefroren (`ADR-084`/I-22).

## Grenze (keine technische Frage)

Diese ADR füllt den Akteur-Namen aus der Selbst-Auskunft der Bürgerin. Die **kryptografisch gebundene** Form (VC/SD-JWT über die Trust Authority, `U2-ADR-005` „spätere Schicht") bleibt davon unberührt — die Namens-Speisung ist eine Niedrigschwellig-Maßnahme, kein Identitäts-Nachweis.

## Querverbindung zur Architektur-Schuld

Der Fix fasst denselben Speicher `data.menschen[]` an wie **A1 (Personen-Propagierung, `D54`)** — die halb gebaute Architektur (`data.menschen[]` existiert, UI-Auswahl-Widget fehlt). Die Namens-Speisung MUSS konsistent mit der späteren A1-Lösung sein: nicht zwei verschiedene Wege, wie eine Person in `data.menschen[]` kommt. **Vor dem A1-Sprint diesen Eintrag prüfen** (`folge-schuld.md` D19 ⮀ D54).

> **Nachtrag 18.06.2026 (supersedet durch [U2-ADR-021]):** Der hier genannte Befund „UI-Auswahl-Widget fehlt" ist mit **U2-ADR-021** datiert präzisiert/abgelöst. Der Stufe-1-Befund (18.06.) zeigte: das Ref-Picker-Widget existierte bereits (Commit `382585fc`, 06.06., **vor** diesem ADR) — es fehlte nicht, sondern war **rollen-siloiert** (`personenVorschlag` filterte hart nach `feld.rolle`, der rollenlose Sitzungs-Akteur erschien nirgends). U2-ADR-021 macht das Register rollenlos (Rolle am Bezug, nicht an der Person); A1 ist damit gelöst.

## Implementations-Verweis

Umgesetzt 15.06.2026:
- Speisung: Helfer `ankerNameAusIdentitaetSpeisen()` — gerufen aus `sektorFeldSetzen` (granular) **und** `bearbeitungSpeichern` (Inline-UI), scoped auf `sitzungsAkteur.eigenschaft === 'selbst'`, leerer Name überschreibt nichts.
- Anzeige-Stille auf den **eigenen** Identitäts-Namensfeldern (`vorname`/`nachname`, Selbst-Stempel) in `urheberschaftZeileHTML` — in **Kern + Lese-App** gespiegelt; unter Vollmacht bleibt sichtbar; „von [Name]" an allen anderen Stellen unberührt.
- Datenspeisung/Snapshot/FHIR-Provenance unverändert; Rückwirkung über die `stempelName`-Hybrid-Auflösung (keine Migration).
- Tests: `tests/provenienz-name-bruecke.test.js` (Speisung, Nachziehen, Rückwirkung, Vollmacht-Scope, Anzeige-Stille, Fremd-Stelle sichtbar). Browser-verifiziert (eigene Namensfelder still; „von [Name]" an Fremd-/Gesundheits-Stelle erhalten).
