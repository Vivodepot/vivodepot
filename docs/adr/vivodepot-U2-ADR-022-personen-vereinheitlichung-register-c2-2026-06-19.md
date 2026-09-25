# U2-ADR-022: Personen-Vereinheitlichung — ein Topf (das Register) + Kinder als Person (C2)

**Status:** Akzeptiert
**Datum:** 19.06.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL, UX
**Cross-Referenz (Produktiv-Kanon):** `ADR-095` (Referenz-/Propagations-Modell), `ADR-001` (Single-File).
**U2-Bezug:** `U2-ADR-021` (rollenloses Register — **Vorgänger**; dieser ADR baut dessen gemeldeten C2-Folge-Punkt und löst dessen „Listenfeld bleibt unberührt"-Vorbehalt datiert ab), `U2-ADR-008` (Propagation — `data.menschen[]`, Ref-Picker), `U2-ADR-010` (Render-Schicht — `feldInputHTML`/`data-edit-ref`, Listen-Mechanik), `U2-ADR-005` (Urheberschaft — `akteur` zeigt auf `data.menschen[]`), `U2-ADR-017` (Identität→Akteur-Name).
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — Wegfall des Sektor-Listenfelds `meine-menschen/menschen`; `menschenRegisterHTML`/`MENSCHEN_REGISTER_FELD`/`flowPersonRegister*` (Bereich-2-Render direkt auf `data.menschen[]`); `personLoeschen`/`personReferenzStellen`; Import-Reroute (`vcardMenschen`, `_vcardMenschenEintraege`, `_b16Felder`/`_b16KindEintrag`, `importAnwenden`-Special-Cases, `_vollDepotFelder`-Register-Kanal); `kinder`/`erwachsene_kinder` als `ref:person`-Listen.
- **Sprint-Commit:** dieser Bau (Personen-Vereinheitlichungs-Cluster, Stufen 1–3 + C2).
- **ADR-Bezug:** dieser ADR (U2-ADR-022).
**Status heute:** gilt — `data.menschen[]` bleibt der einzige Personen-Topf (`menschenRegisterHTML`, `vivodepot.html:28366`), Kinder sind weiterhin `ref:person`-Einträge (`vivodepot.html:5489`); die C2-Trennung `kinder`/`erwachsene_kinder` wurde später mit U2-ADR-023 zu einer Liste vereinheitlicht, ohne die Register-Entscheidung selbst zu ändern.

---

## Kontext

U2-ADR-021 stellte das **Register** rollenlos und hielt zugleich fest: es gibt **zwei** Strukturen namens „menschen" — das Register `data.menschen[]` (Propagations-Speicher, Refs zeigen hierher) und das **Sektor-Listenfeld** `data.sektoren['meine-menschen'].menschen` („Menschen, die mir wichtig sind", mit Sub-Feldern name/rolle/tel/…), an dem vCard/b16-Import-Export hängen. ADR-021 ließ das Listenfeld bewusst unberührt.

Diese Doppelung ist der eigentliche Befund: Seit dem 30.05.-Bau existierten Kontakte **doppelt modelliert** — einmal als id-keyed Register, einmal als positionsbasiertes Listenfeld — **ohne** dass ein ADR die Doppel-Implementierung festhielt (undokumentierter Drift). Bereich 2 zeigte das Listenfeld; Refs (Hausarzt, Erbe, Bevollmächtigte …) zeigten aufs Register. Dieselbe Person konnte an zwei Orten, in zwei Formen liegen. Das ist „Brücke", nicht „Umbau".

Auftrag: **„Ein Topf: das Register."** Das Listenfeld entfällt; Bereich 2 rendert direkt das Register; alle Import/Export-Pfade laufen über das Register. Zusätzlich C2 (aus ADR-021 gemeldet): Kinder sind Menschen → Register-Personen, keine Inline-Namensfelder mehr.

## Entscheidung

**Es gibt genau einen Personen-Topf: `data.menschen[]` (das Register). Jeder benannte Mensch ist eine Register-Person; jede andere Stelle referenziert ihn nur (`ref:person`).**

1. **Listenfeld weg, Bereich 2 = Register.** Das Sektor-Listenfeld `meine-menschen/menschen` ist entfallen. Bereich 2 rendert `data.menschen[]` direkt als editierbare Liste (`menschenRegisterHTML`, Pseudo-Feld `MENSCHEN_REGISTER_FELD`; CRUD über `personHinzufuegen`/`personAktualisieren`/`personLoeschen`). Eine dort angelegte Person ist sofort überall als `ref:person` wählbar (A1, U2-ADR-021).
2. **Import/Export laufen übers Register.** `vcardMenschen` exportiert aus `data.menschen[]`; vCard/b16-Import legen über `personHinzufuegen` Register-Personen an. Die Beziehungs-Notiz (vCard `NOTE` / b16 `rolle`) faltet nach dem **rein beschreibenden** Register-Feld `beziehung` (kein Picker-Filter — A1 bleibt).
3. **Voll-Depot-Restore trägt das Register id-erhaltend.** Der JSON-Voll-Export trug `data.menschen[]` immer schon (`vollExportJSON`), der Import ließ es bisher fallen (nur `sektoren` wurde restauriert). Neu: `_vollDepotFelder` liefert einen `register`-Kanal, `importAnwenden` merged ihn **by-id** (bekannte id → fehlende Felder auffüllen; neue id → verbatim) — damit `ref:person`-Verweise aus den Sektoren über den Round-Trip gültig bleiben (kein Neu-Würfeln von ids).
4. **C2 — Kinder sind Register-Personen.** `kinder`/`erwachsene_kinder` sind `ref:person`-Listen. Die Zeile hält die **Beziehung** (`kind`-Ref) plus die **relationalen** Bezugsfelder; die **intrinsischen** Personen-Daten wohnen an der Person. So ist ein Kind überall wählbar (z. B. als Erbe), ohne es zweimal zu erfassen.

### Feld-Zuordnung (Entscheidung C: „geburtsort an die Person, wohnort als adresse")

| b16/Alt-Feld | Ziel |
|---|---|
| name (vorname+nachname) | Person.name |
| geburtsdatum | Person.geburtsdatum |
| **geburtsort** | **Person.geburtsort** (neues Register-Feld) |
| **wohnort** (erwachsene) | **Person.adresse** |
| telefon (erwachsene) | Person.tel |
| anmerkung; geburtsjahr | Person.anmerkung (Jahr als „geboren JJJJ") |
| sorgerecht_kind, betreuungsmodell, geburtsurkunde_ort | Bezugszeile (relational) |

`erwachsene_kinder` trägt damit nur noch die Beziehung an der Zeile (`kind`-Ref); alle Personen-Daten liegen an der Person.

### Die drei vorab geklärten Gabelungen

- **A — Akteur/Inhaberin aus dem Export filtern.** `vcardMenschen` lässt den Sitzungs-Akteur (`aktuellerSitzungsAkteur().personId`) aus — ein Kontakte-Export ist nicht das eigene Profil.
- **B — Dangling-Refs beim Löschen tolerieren, mit benennendem Hinweis.** `personLoeschen` entfernt nur die Person; Refs bleiben (`personName` toleriert unbekannte Refs → leeres Feld). `personReferenzStellen(id)` liefert dem Lösch-Dialog die konkreten Fundstellen („dort bleibt der Name danach leer: …").
- **C — geburtsort→Person, wohnort→Person.adresse** (Tabelle oben).

## Abgrenzung / Supersede

- **Löst den C2-Folge-Punkt aus U2-ADR-021** (dort „gemeldet, nicht gebaut"): die strukturelle Gabelung ist mit der Feld-Zuordnung oben entschieden und gebaut.
- **Datiertes Supersede** des ADR-021-Vorbehalts „der vCard/b16-Round-Trip hängt am Listenfeld und bleibt unberührt": das Listenfeld existiert nicht mehr; der Round-Trip läuft jetzt übers Register. Die ADR-021-Klarstellung „zwei getrennte Felder mit gleichem Namen" beschreibt den **Vor**-Zustand; dieser ADR führt sie auf einen Topf zusammen.
- **Kein Namens-Dedup beim Import.** Führten Alt-Daten dieselbe Person doppelt (z. B. Tochter sowohl in `kontakte` als auch in `kinder_liste`), entstehen zwei eigenständige Register-Einträge — zwei Menschen dürfen denselben Namen tragen; in der UI mergebar. Heuristisches Auto-Merge wäre fragiler als der Doppeleintrag.
- **Institutionen** (eigener Speicher `data.institutionen[]`, `art`-gefiltert) bleiben unberührt — strukturell ein anderes Schema.

## Konsequenzen

- **Ein Topf, keine Doppelmodellierung:** Kontakte und Kinder liegen ausschließlich im Register; Bereich 2 ist dessen direkte Sicht. Der 30.05.-Drift ist aufgelöst.
- **Umbau, nicht Brücke / kein Migrations-Zwang:** v3 ist vor-produktiv/wegwerfbar (Linie U2-ADR-017/018/021). Alt in Listen-Sub-Feldern (vorname/geburtsjahr …) abgelegte Daten werden vom neuen Schema nicht mehr gelesen — bewusst akzeptiert (keine Produktivdaten auf `clean-rebuild`). Künftige Kinder/Kontakte sind Register-Personen.
- **Krypto unberührt:** VdCrypto-Block-Pin `8d31c678906a4916372340d1eb05474ee44e400a6affa204e00aa8053e650258` unverändert (nur Register-/Render-/Import-Funktionen außerhalb des Blocks). Block-Integrität 2/0. Suite **893/0/1** (1 bewusster FHIR-Skip). Neuer Voll-Datei-SHA in `vivodepot.html.sha256` nachgezogen.
- **UI-Klickpfade** (Person-Modale, Kind-Ref-Picker mit Inline-Anlage, Lösch-Hinweis-Dialog) gehen auf die **Mac-Abnahme**; node-grün ist die Render-HTML-/Datenmodell-Ebene.

## Implementations-Verweis

Umgesetzt 19.06.2026 (clean-rebuild):
- **Kern** `vivodepot.html`: Listenfeld `meine-menschen/menschen` entfernt (Section bleibt Träger); `menschenRegisterHTML`/`MENSCHEN_REGISTER_FELD`/`menschRegisterZeile`/`flowPersonRegisterNeu|Bearbeiten|Entfernen`; `personLoeschen`/`personReferenzStellen`; `geburtsort` ins Register-Schema (`personHinzufuegen`/`personAktualisieren`/Pseudo-Feld); `vcardMenschen` liest Register + filtert Akteur (A); `crossRefFeldUndRoh` (Situations-/Akut-Pulls auf `meine-menschen/menschen` → Register); Import: `importAnwenden`-Special-Cases für `menschen` (→ `personHinzufuegen`) und `kinder`/`erwachsene_kinder` (`_person`→Person + Ref-Zeile bei b16; verbatim bei JSON-Restore), `_b16KindEintrag`/`_kinderSammeln`, `_vollDepotFelder`-`register`-Kanal; `kinder`/`erwachsene_kinder` als `ref:person`-Listen.
- **Tests:** neu `personen-vereinheitlichung.test.js` (Bereich-2-Register-Render, A1-Picker für angelegte/importierte Person, A-Export-Filter, C2-Kind als Register-Person + Bezugszeile + Erben-Picker, erwachsene_kinder reine Ref-Liste). Nachgezogen: `import-formate` (Register-Round-Trip JSON/vCard, Listen-Stempel über `unterhalt`), `weitere-formate` (vCard aus Register), `import-welle3` (W3-7 Kontakte+Kind ins Register, W3-12 Stempel über `unterhalt`), `angehoerigen-modus`/`situationen-maschine` (menschen-Pull als Register-Quelle), `sektoren-spec` (drei Listen). `load-kern.js`: Register-Funktionen exportiert.
