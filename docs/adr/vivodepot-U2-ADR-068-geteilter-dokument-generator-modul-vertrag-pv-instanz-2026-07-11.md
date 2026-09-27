# U2-ADR-068 — Geteilter Dokument-Generator (Modul-Vertrag) · PV als erste Instanz

**Datum:** 11.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 11.07.2026 (Node-Suite **1233/0**, VdCrypto-Block-Pin `8d31c678…` + JWS `d0541ea7…` byte-identisch; PV-Ausgabe byte-identisch über Golden-Fixture belegt; Annahme = Produktentscheidung).
**Status heute:** gilt — `MODUL_BLOCK_HANDLER`, `modulDokumentAbschnitte()` und `PV_MODUL` sind im heutigen
`vivodepot.html` aktiv (Zeilen 25174 ff.).
**Nummer:** U2-ADR-068 (höchste belegte in `docs/adr/` war U2-ADR-067).
**Typ:** Struktureller Umbau der Dokument-Generator-Schicht. **KEIN Schema-Bump, KEINE Wortlaut-Änderung, Gate-Konsumenten unverändert.**
**Bezug:** U2-ADR-066 (PV-Wizard + PV-Inline-Generator, hier extrahiert) · U2-ADR-064/065 (refMehrfach/Vollmacht) · `PRINCIPLES.md` (Wurzel 2: Andock-Infrastruktur) · Modul-Vertrag-Design (Teil 1, Weg 1 + `referenzZiele` abgenommen).

---

## Kontext

Die Instrument-Ebene der Vorsorge bekommt mehrere gleichartige, aber je eigene Dokument-Erzeuger
(Patientenverfügung gebaut; KI-Verfügung, Vollmacht, Betreuungs-/Sorgerechts-/Testaments-Dokumente folgen).
Der PV-Generator (U2-ADR-066) war ein handgeschriebener Inline-Zusammensteller (`pvDokumentAbschnitte`, ~90
Zeilen bespoke Zuordnung). Ihn je Instrument zu kopieren, hieße sechs parallele Assembler zu pflegen. Der
Modul-Vertrag (Teil 1, abgenommen) legt stattdessen **einen geteilten, typ-getriebenen Generator**
fest: ein Modul deklariert seine Abschnitte aus wiederverwendbaren Blocktypen; eine Engine setzt zusammen.

Das ist die konkrete Umsetzung von **PRINCIPLES.md Wurzel 2 (Andock-Infrastruktur)** auf der Dokument-Ebene:
die Erzeuger-Mechanik ist gemeinsam, jedes Instrument **dockt als Daten an** — nicht als eigener Code-Zweig.

Der harte Rand des Umbaus: die PV-Ausgabe wartet auf **anwaltliche Freigabe** (BGH-Bestimmtheit /
Widerspruchsfreiheit der Bausteine). Die Extraktion darf diese Ausgabe **nicht um ein Byte** verschieben, sonst
wäre die (kommende) Freigabe wertlos. Byte-Identität war deshalb kein Nebenziel, sondern das **Gate**.

## Entscheidung

1. **Engine `modulDokumentAbschnitte(modul)`** — läuft die deklarierten `abschnitte`, baut je Abschnitt die
   Zeilen aus `bloecke` über typ-indizierte Handler und liefert (wie zuvor) nur nicht-leere Abschnitte. Signatur
   und Ausgabeform (`[{titel, zeilen}]`) unverändert; `pvDokumentAbschnitte()` ist jetzt der Einzeiler
   `return modulDokumentAbschnitte(PV_MODUL)`. `pvDokumentHTML` unberührt.
2. **Blocktyp-Handler (`MODUL_BLOCK_HANDLER`)** — die wiederverwendbaren Konvergenzkern-Typen aus dem Vertrag:
   `mehrfachauswahl` (Einleitung + Aufzählung + optionaler Freitext-Anhang), `auswahl` (Step-Bezug/Prefix/
   Sentinel-Skip/`sichtbarWenn`/Inline-Platzhalter), `immer` (feste Klauseln), `freitext`, `freitextSatz`
   (Freitext in festen Satz), `refMehrfach` (Personen-Namen in festen Satz), `rollePerson` (Rollen-Label +
   Einleitung), `auswahlFest` (fester Satz bei bestimmtem Wert), `crossRef` (Verweis auf anderes Instrument,
   Bedingung als Prädikat). `sichtbarWenn {feld,wert}` ist zu `feldSichtbar` gespiegelt (Skalar oder Array).
3. **PV_MODUL** — erste Instanz, **rein deklarativ**. Wortlaut-Quelle bleibt **PV_BMJ** (Labels/Bezug/feste
   Texte über gewirete Modul-Accessoren `optLabel`/`bezugFuer`/`istSentinel`/`refmNamen`/`rolleLabel`/
   `eingangsformel`); die festen Sätze/Übergänge (Beistand, Schweigepflicht, Hospiz, Kirche, Beratung) stehen
   als Block-Texte — sie standen schon zuvor generator-seitig, nicht in PV_BMJ. Kein neuer Wortlaut-Ort.

## Byte-Identität als Gate (Golden-Master)

Vor dem Umbau wurde die **Ist-Ausgabe** des unveränderten `pvDokumentAbschnitte()` + `pvDokumentHTML()` über
eine 42-Fälle-Matrix (`tests/pv-golden-matrix.js`, jeder Zweig: Sentinel-Skips, refMehrfach über Override UND
Register-Ref, Organspende-Vorrang-Guard, Frist-Inline, feste Klauseln, leerer + Voll-Fall) als **Golden-Fixture**
(`tests/fixtures/pv-golden.json`, 161 Abschnitte / 388 Zeilen) eingefroren — Ground Truth. Der stehende Test
`tests/pv-generator-byte-identisch.test.js` prüft den neuen Generator **gegen diese Fixture** auf beiden Ebenen:
`abschnitte`-Struktur (JSON, cross-realm-sicher) **und** die volle `pvDokumentHTML`-**Byte-Ausgabe**. **Grün =
die Extraktion lässt die PV-Ausgabe unverändert.** Die Fixture ist damit die eingefrorene Vertragsdefinition der
PV-Ausgabe: eine Änderung an ihr ist eine bewusste Wortlaut-Entscheidung (anwaltliche Freigabe), kein Refactor.

## Grenz-Notizen (für die kommenden Teil-2-Schritte, hier festgehalten)

Aus der `referenzZiele`-Prüfung (Modul-Vertrag §7, P1/P2): der Sichtbarkeits-Testfall „Bankvollmacht erscheint
als Karte in Finanzen, Daten bleiben in Vorsorge" braucht **zwei** heute nicht vorhandene Karten-Schicht-
Fähigkeiten. Sie sind **nicht** Teil dieses Commits (er baut nur den Generator), sondern Voraussetzung des
späteren Bild-C-/`referenzZiele`-Schritts:

- **Grenze 1 · Karten-Granularität pro `art`:** ERKENNUNG/Karten deduplizieren heute **pro Typ**
  (`WIZARD_DOKUMENT_MAP vvwiz→'vorsorgevollmacht'`) → genau **eine** Karte je Typ, das `art`-Unterfeld
  (vorsorge/bank/…) wird nicht als eigene Karte gespiegelt. Getrennte Sichtbarkeit verschiedener Vollmachtstypen
  setzt eine per-`art`-Schlüsselung voraus.
- **Grenze 2 · Sektorübergreifendes Karten-Rendern:** `erkennungsVorschlaege`/`dokumentPanelHTML` filtern hart
  auf den Home-Sektor (`def.sektorId !== sektorId` bzw. `d.sektorId === sektorId`). `sichtbarkeit[]` erfordert,
  dass beide Filter zusätzlich Records/Vorschläge einbeziehen, die den aktuellen Sektor als Ziel deklarieren
  (zwei ~1-Zeilen-Prädikate — klein, aber Code).

Die Mehrfachheits-Gabel bleibt bei **Option A** (mehrfaches Modul → einzelne Records), **vorbehaltlich** dieser
zwei Änderungen, wenn verschiedene Instrument-Typen getrennt sichtbar sein sollen — sonst kippt der Fall zu B.

## Konsequenzen

- Reiner Generator-Umbau: Feld-IDs, Datenpfade, Schema (31) und alle Gate-/Export-/Situationsblatt-Konsumenten
  unverändert. Kein Schema-Bump (Ausgabe byte-identisch).
- Der Vertrag ist an **einer** realen Instanz (PV) validiert; die Blocktypen sind wiederverwendbar für die
  nächsten Instanzen (KI-Verfügung als zweite Instanz, dann vier leere Module).
- **Offen (nächste Teil-2-Schritte, nach gemeinsamer Durchsicht am PV-Gate):** KI-Verfügung als zweite Instanz
  (Testament-Anlage, Herkunftsanzeige) · vier leere Module strukturell einhängen · Bild C mit den zwei
  Grenz-Änderungen · eine flach→Record-Migration. Zwei kleine Stopps unterwegs: Bürger-Kartenname der
  KI-Verfügung und Vollmacht-Mehrfachheit A/B.
- **Offen (unverändert aus U2-ADR-066):** anwaltliche Freigabe der zusammengesetzten PV-Ausgabe
  vor Veröffentlichung — durch die byte-identische Extraktion ist eine spätere Freigabe **nicht** entwertet.

## Verifikation

- Node-Suite **1233/0** (+4: `tests/pv-generator-byte-identisch.test.js` — Fixture/Matrix-Deckung, abschnitte-
  Byte-Identität, HTML-Byte-Identität, Engine≡pvDokumentAbschnitte).
- Block-Pins byte-identisch (VdCrypto `8d31c678…`, JWS `d0541ea7…`; dedizierte Pin-Tests 8/0) — der Umbau liegt
  in der App-Logik, weit von den Krypto-Blöcken.
- Golden-Fixture: 42 Fälle / 161 Abschnitte / 388 Zeilen, aus dem **Vor-Umbau-Stand** erfasst.
- sha256 der Datei geändert (`de94a6ad…`); `BUILD_SHA256` bleibt leer (erst beim Release gesetzt).
  SW-Cache cleanslate **v33 → v34**. **Kein Push.**
