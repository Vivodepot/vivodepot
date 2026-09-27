# U2-ADR-070 — Instrument-Modul-Registry: vier leere Module strukturell eingehängt

**Datum:** 11.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 11.07.2026 (Node-Suite **1246/0**, Block-Pins `8d31c678…`/`d0541ea7…` byte-identisch, PV-Ausgabe byte-identisch; Annahme = Produktentscheidung).
**Status heute:** gilt — `VORSORGE_MODULE` ist im heutigen `vivodepot.html` als Registry aktiv (Zeile 25807).
**Nummer:** U2-ADR-070 (höchste belegte in `docs/adr/` war U2-ADR-069).
**Typ:** Strukturelle Registry (Vorbereitung Bild C). **KEIN Schema-Bump, KEIN UI-Change, Block-Pins unverändert.** Rein additiv.
**Bezug:** Modul-Vertrag Teil 1 (abgenommen) · U2-ADR-068 (geteilter Generator + P1/P2-Grenzen) · U2-ADR-069 (KI-Instanz) · U2-ADR-064 (`vollmachten` liste-Record).

---

## Kontext

Bild C zeigt die Vorsorge-Instrumente als Regal (Karten-/Erkennungsschicht) über sechs Instrument-Abschnitten.
Damit Bild C alle Instrumente **einheitlich** rendern kann, braucht es **eine** Stelle, die sie mit ihren
gemeinsamen Eigenschaften aufzählt — nicht sechs Sonderpfade. Der Modul-Vertrag (Teil 1) definiert diese
Eigenschaften (id·titel, `mehrfach`, `herkunft`, `form`, `istAnlage`/`anlageZu`, `referenzZiele`).

Zwei Instrumente tragen bereits einen Dokument-Generator (Modul-Vertrag-Instanz): **PV** (U2-ADR-068) und **KI**
(U2-ADR-069). Die vier restlichen — **Vollmacht, Betreuung, Testament, Sorgerecht** — haben heute Wizards und
Felder, aber **keinen Dokument-Generator/Korpus**. Sie werden jetzt **strukturell** eingehängt, damit Bild C
sie kennt; ihr Generator folgt je Instrument später (wie PV/KI).

## Entscheidung

**`VORSORGE_MODULE`** — geordnete Registry der sechs Module (Reihenfolge = Regal-/Abschnitt-Reihenfolge):

| Modul | mehrfach | herkunft | Generator | Sektor (heute) |
|---|---|---|---|---|
| `patientenverfuegung` | false | amtlich (§ 1827) | **PV_MODUL** | vorsorge |
| `vorsorgevollmacht` | **true** | amtlich | *leer* (`null`) | vorsorge |
| `betreuungsverfuegung` | false | amtlich | *leer* | vorsorge |
| `testament-erbe` | false | amtlich | *leer* | vorsorge |
| `sorgerechtsverfuegung` | false | amtlich | *leer* | vorsorge |
| `ki-verfuegung` | false | forschung (§ 2247, Anlage→Testament) | **KI_MODUL** | verwaltung |

- **Vier leere Module** (`generator: null`): Metadaten + `wizardId` + `dokumentTyp` vollständig, aber kein
  Korpus/Wortlaut. `modulIstLeer(m)` / `moduleMitGenerator()` unterscheiden die Zustände.
- **PV_MODUL/KI_MODUL bleiben unangetastet** — die Registry **referenziert** sie (`generator: PV_MODUL`),
  fügt ihnen keine Felder hinzu. Damit ist die (freigabe-pendente) PV-Ausgabe null berührt (Golden-Gate grün).
- **Vollmacht = das einzige mehrfache Modul** (Modul-Vertrag §4, **Option A** abgenommen): EIN Modul, dessen
  Inhalt die Unterliste der `vollmachten`-Records ist (`listeId: 'vollmachten'`) — die heutige ADR-064-Struktur,
  **keine Daten-Migration**, „ein Instrument = eine Karte".
- **`referenzZiele` strukturell deklariert** (nicht gerendert): Vollmacht
  `sichtbarkeit: [{sektor:'finanzen', bedingung:{feld:'art', wert:'bank'}}]` + `daten: [{feld:'bevollmaechtigter',
  entitaet:'person'}]`; KI nur `daten` (Nachlassverwalter). Die Sichtbarkeits-Bedingung ist **Schema, kein
  geparster String** (`{feld, wert}`, dieselbe Form wie `sichtbarWenn`) — ein fremdes Modul füllt ein Schema,
  statt eine String-Konvention „art=bank" zu erraten; generisch für jedes künftige Modul (Festlegung
  11.07., PRINCIPLES: modular, Struktur steht). Das **tatsächliche** Cross-Sektor-/per-`art`-Rendern ist die
  **Bild-C-Arbeit** (P1/P2-Grenzen aus U2-ADR-068) — hier steht nur die Absicht („Struktur vor Inhalt").

## Konsequenzen

- Bild C hat eine einzige, getestete Quelle für die sechs Instrumente. Reine Registry: kein UI, kein Schema,
  keine Migration. Bild C konsumiert sie im nächsten Schritt.
- Die vier leeren Module warten je auf ihren Korpus (eigene Modul-Vertrag-Instanz, wie PV/KI) — post diesem Schritt.
- **Vollmacht-Record-Form abgenommen (11.07.):** Option A realisiert als `mehrfach:true` + `listeId:'vollmachten'`
  (Frage 1 abgenommen); die Sichtbarkeits-Bedingung von String `'art=bank'` auf **strukturiert**
  `bedingung:{feld:'art', wert:'bank'}` gezogen (Frage 2) — Struktur statt geparster Text.
- **Offen (Bild C):** `sichtbarkeit[]` real machen = per-`art`-Karten-Schlüsselung + Cross-Sektor-Rendern
  (zwei kleine Karten-Schicht-Änderungen, U2-ADR-068-Grenznotizen). Dort wird `sichtbarkeit[]` zum ersten Mal
  real — nächster gemeinsamer Blick.

## Verifikation

- Node-Suite **1246/0** (+7 `tests/vorsorge-module-registry.test.js`: Reihenfolge, genau zwei Generatoren, vier
  leer, Vollmacht mehrfach+listeId, referenzZiele, KI-Herkunft/Anlage, jeder wizardId existiert).
- **PV-Ausgabe byte-identisch** (Golden-Gate, 42 Fälle) — PV_MODUL nur referenziert, nicht verändert.
- Block-Pins byte-identisch (VdCrypto `8d31c678…`, JWS `d0541ea7…`).
- sha256 der Datei geändert; `BUILD_SHA256` bleibt leer. SW-Cache **v35 → v36**. **Kein Push.**
