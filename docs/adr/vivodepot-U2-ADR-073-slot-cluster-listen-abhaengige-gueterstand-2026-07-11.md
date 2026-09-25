# U2-ADR-073 — Phase 4: Slot-Cluster (verstreute Slots → Listen) + Abhängige-Zusammenführung + gueterstand-Umzug

**Datum:** 11.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · **Phase 4 abgeschlossen (11.07.):** Teil 1 (Slot-Listen, Schema 34→35), Teil 3 (`gueterstand`-Umzug, kein Schema), Teil 2 (Abhängige-Zusammenführung, Schema 35→36) — alle gebaut + in der Shell verifiziert. Suite **1286/0**, PV byte-identisch, Block-Pins byte-identisch. **Kein Push.**
**Nummer:** U2-ADR-073 (höchste belegte in `docs/adr/` war U2-ADR-072).
**Typ:** Anwendung des bewährten `liste`-Musters (Skalar/Text→Liste) auf verstreute Slots — **kein neuer Mechanismus**. Schema-Bumps 34→35 (Teil 1) + 35→36 (Teil 2), verlustfreie Migration. Teil 3 = reiner Struktur-Umzug (kein Schema).
**Bezug:** Auftrag „Phase 4 — Slot-Cluster" (11.07., interner Auftrag, nicht Teil dieses Repos) · U2-ADR-064/072 (liste-Muster: vollmachten, fachaerzte, unterhalt als Vorlagen) · Arbeitsregel „B16-Import-Alias mitziehen" · Heuristik „Liste-Umbau lässt gekoppelte Singletons in Ruhe" (11.07.).
**Status heute:** gilt — alle fünf Listen (`fahrzeuge`, `kreditkarten`, `haustiere`, `persoenliche_briefe`,
`weitere_wohnungen`), die Abhängigen-Liste `abhaengige_personen` und der `gueterstand`-Umzug sind im heutigen
Kern nachweisbar (`vivodepot.html`, je `typ:'liste'` bzw. `typ:'auswahl'`), Beleg `tests/slot-cluster-listen.test.js`.

---

## Kontext

Phase 4 stellt verstreute/skalare Slots auf das bewährte `liste`-Muster um (stabile Record-ids, verlustfreie
Migration, leere Werte fallen weg). Leitende **Heuristik**: bei fast jedem Cluster ist EIN Feld an
Kopplungen gebunden (Meldeadresse, Notfall, Sorgerecht, Situationsblatt, Wizard) und die anderen sind frei —
das **Gekoppelte bleibt Singleton, das Freie wird Liste**.

---

## Entscheidung

### Teil 1 — fünf Slot-Gruppen → je EINE Liste (Schema 34→35)

| Liste (Sektor) | aus den Slots | Unterfelder | gekoppelter Singleton bleibt |
|---|---|---|---|
| `fahrzeuge` (mobilitaet) | `auto1/auto2/auto1_ausweis/auto2_leasing` | bezeichnung · fahrzeugausweis_ort · leasing_ort | — |
| `kreditkarten` (finanzen) | `kreditkarte1/2` | karte | — |
| `haustiere` (identitaet) | `tier_name/_betreuung/_tierarzt/_futter/_sonstiges` (nur EIN Tier) | name · betreuung · tierarzt · futter · sonstiges | — |
| `persoenliche_briefe` (persoenliches) | `brief_1/2/3` | empfaenger · text | **Szenario-Briefe** `brief_notarzt/krankenhaus/pflegeheim/todesfall` bleiben feste Felder (drei speisen Situationsblätter) |
| `weitere_wohnungen` (wohnen) | `zw_*` | strasse · plz_ort · typ · vermieter (ref) · vermieter_tel · miete · kaution · mietvertrag_ort · wohnsituation_bem | **Hauptwohnung** bleibt (Adresse=Meldeadresse aus Identität, `wohnung_typ`→Situationsblatt `hauskauf`, `umzug_mietverhaeltnis`→`umzwiz`) |

**Wohnungen = Hybrid** (Produktentscheidung): die Hauptwohnung ist der gekoppelte Singleton und bleibt der
heutige Flach-Satz; nur die ungekoppelten `zw_*` (null Konsumenten) werden `weitere_wohnungen`. So bleiben
Meldeadresse-Kopplung, Situationsblatt und Wizard unberührt — **kein Konsumenten-Nachzug in Teil 1**.

**Migration 34→35** verlustfrei (`_slotEintrag`-Helfer): jeder gefüllte Slot → Eintrag mit stabiler id, leere
Werte fallen weg, Alt-Schlüssel entfernt, idempotent. Bei Fahrzeugen paart `auto1`↔`auto1_ausweis` und
`auto2`↔`auto2_leasing`; `vermieter` bleibt als ref-Objekt erhalten.

**B16-Import-Nachzug** (stehende Arbeitsregel): die Skalar-Aliase `auto*` und `tier_*` raus aus
`B16_FELD_MAPPING`; `_b16Felder` aggregiert sie zu `fahrzeuge`- bzw. `haustiere`-Listen-Einträgen. Kreditkarten,
Personen-Briefe, `zw_*` hatten **keine** Aliase → kein Nachzug nötig.

### Teil 3 — `gueterstand` zu `familienstand` ziehen (gebaut)

**Befund (read-only):** reiner Umzug. `gueterstand` hat KEINEN B16-Alias, KEIN Situationsblatt, KEINEN Export —
nur den `heirwiz`-Schreiber, der es per Feld-**id** setzt. Solange die id `gueterstand` bleibt, bricht nichts.

**Umsetzung:** `gueterstand` in der Feld-Reihenfolge der Sektion `identitaet`/`person` direkt hinter
`familienstand` gezogen (beide betreffen den Ehe-/Partnerschafts-Stand), aus dem Heirat-Cluster
(namenswahl/steuerklasse) herausgelöst. **id bleibt** `gueterstand`, **`ebene:'modul'` bleibt** (Aufklapp-Block,
keine Sichtbarkeits-Änderung) — reiner Struktur-/Reihenfolge-Umzug, KEIN Schema-Bump. Der `heirwiz`-Schreiber
und alle Bürger-Daten (per id) sind unberührt. *(Offen, falls gewünscht: Güterstand als Grundfeld direkt unter
Familienstand sichtbar machen — eine Ein-Wort-Änderung (`ebene` streichen), bewusst NICHT getan.)*

### Teil 2 — „Wer hängt von mir ab?" zusammenführen (gebaut, Schema 35→36)

**Teil-0-Befund + Zuschnitt:** die drei „Abhängige"-Orte sind semantisch divergent (`schutzbefohlene` =
Mündel/rechtlich, an srwiz+Kinder+Sorgerecht gekoppelt · `abhaengige_personen` = Freitext · `haustiere` = Tiere
mit eigener Feld-Struktur). Zusammengeführt wird **NUR** `abhaengige_personen`. `haustiere` ist eine eigene
Liste (Teil 1). `schutzbefohlene` bleibt **unangetastet** (gekoppelter Singleton).

**Umsetzung:** `persoenliches/abhaengige_personen` (Freitext) → `liste` „allgemeine Abhängige" mit Unterfeldern
`{wer · hinweis}`. **id bleibt** `abhaengige_personen` → der `crossSektorAnmelden`-Eintrag
(`{quelle:'persoenliches', feld:'abhaengige_personen', ziel:'meine-menschen'}`) bleibt unverändert.

**Konsumenten-Nachzug (der eine echte in Phase 4):** der crossSektor-**Projektions-Pfad** (`renderSektor`,
Abschnitt „Auch in anderen Bereichen hinterlegt") rendert über `feldWertHTML(quelleFeld, roh)` mit der Feld-Def
— also **typ-generisch** (wie der Notfall-QR in Phase 3). Nach der Text→Liste-Umstellung rendert er die Liste
automatisch; **in der Shell bestätigt**: der Block projiziert beide Abhängige (Mutter (87) + Katze Felix) samt
Hinweis nach „Meine Menschen", kein rohes Array.

**Migration 35→36** verlustfrei: der bestehende Text wandert komplett in den ersten Eintrag (`wer`) — bewusst
KEINE Trennung an „;" (der Text ist frei). leer → Feld entfällt.

**B16-Import-Nachzug:** der `abhaengige_personen`-Skalar-Alias raus; `_b16Felder` aggregiert den importierten
Text zu EINEM Listen-Eintrag `{wer}`.

---

## Konsequenzen

- **Heuristik bestätigt:** kein gekoppelter Singleton wurde in eine Liste gezogen → keine Konsumenten-Brüche in Teil 1.
- **Verlustfrei & typ-generisch:** die Listen nutzen dieselbe Render-/Migrations-/Anzeige-Mechanik wie vollmachten/fachaerzte.
- **Tests:** `tests/slot-cluster-listen.test.js` (Teil 1: Feld-Defs, Singletons unangetastet, Migration je Liste, leere/idempotent, B16-Aggregation; Teil 2: abhaengige-Liste, Migration Text→[{wer}], crossSektor-Registrierung + typ-generische Projektion, B16) + sechs Alt-Tests nachgezogen (Listen-Struktur, gueterstand-Modul-Reihenfolge). Schema-Pins 34→35→36.
- **Verifiziert in der laufenden Shell:** alle Teil-1-Listen rendern sauber (Eintrags-Modal, Zusammenfassungen, kein rohes Array); die abhaengige-Projektion greift nach „Meine Menschen" (beide Abhängige + Hinweis). Suite **1286/0**, PV byte-identisch, Block-Pins byte-identisch. SW-Cache **v41→v44**. **Kein Push.**
- **Phase 4 abgeschlossen** — Teil 1/2/3 gebaut & verifiziert. Keine offenen Bau-Punkte in diesem ADR.

---

## Nachtrag 1 (11.07., Phase 6 Kosmetik) — Güterstand jetzt sichtbares Grundfeld (der offene „falls gewünscht"-Punkt umgesetzt)

In Teil 3 stand: „**id bleibt** `gueterstand`, **`ebene:'modul'` bleibt** … *(Offen, falls gewünscht:
Güterstand als Grundfeld direkt unter Familienstand sichtbar machen — eine Ein-Wort-Änderung (`ebene`
streichen), bewusst NICHT getan.)*" In **Phase 6 (K4) entschieden: umsetzen.** `ebene: 'modul'` ist
gestrichen — `gueterstand` rendert nun als **sichtbares Grundfeld**, direkt hinter `familienstand` (Index 12,
familienstand 11). **id unverändert**, kein Schema-Bump, `heirwiz`-Schreiber + Bürger-Daten (per id) unberührt;
reine Anzeige-Ebene. Der Test `tests/identitaet-sektor.test.js` zog nach (gueterstand in KERN_FELDER, aus der
Modul-Liste raus). In der laufenden Shell gemessen: `gueterstand.ebene === 'kern'`. Suite grün, PV byte-
identisch, Block-Pins byte-identisch. **Kein Push.**

---
*Vivodepot · Vivodepot GmbH · Berlin · U2-ADR-073 · 11.07.2026 · Code ungepusht.*
