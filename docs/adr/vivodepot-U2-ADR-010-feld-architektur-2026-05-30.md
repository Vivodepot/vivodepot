# U2-ADR-010: Feld-Architektur der generischen Maschine — drei Ebenen, zwei Schichten, codierte Listen, getrennte Render-Schicht

**Status:** Akzeptiert
**Datum:** 30.05.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL, UX
**Cross-Referenz (v1-RC / Produktiv):** `mehr()`-Blöcke, `sucheCodes`/`CODELIST_REGISTRY`, `_SBL_SITUATIONEN`, `erb_*`-Felder; ADR-077 v3 (KI-Verfügung).
**U2-Bezug:** U2-ADR-006 (Andock-Architektur, Code-Slot), U2-ADR-008 (Propagation), U2-ADR-009 (Template-Architektur), Architektur-Anker (zwei Feld-Schichten).
**Status heute:** gilt — Drei-Ebenen/Zwei-Schichten-Modell und die Listen-Render-Schicht im Kern nachweisbar (`feldWertHTML`/`listenEintragZusammenfassung`/`feldInputHTML` ab `vivodepot.html:29881` ff., `codeSlotSicherstellen` `:17845`).

---

## Kontext

Die generische Maschine ist nach Sektor-Maschine und Phase 1 weitgehend fertig: Feldtypen mit eingebauter Plausibilität, Kern/Modul über den `mehr`-Block, Feld- und Abschnitts-Hints, die Stimme (Sie-Form, Leer-Phrase, Pausen-Zeile), dazu aus Phase 1 die `liste` mit Sub-Feldern, `sichtbarWenn`, der `einfuehrungstext` pro Sektor, das befüllbare `CROSS_SEKTOR_FELDER` und die PARTNER-Rolle. Durch diese Maschine laufen später alle elf Bereiche als reine Daten — kein Sektor hat eigenen Code, also kann kein Sektor driften.

Bevor die elf Bereiche als Datenstruktur eingespeist werden, sind vier Tatsachen über die Feld-Architektur festzuhalten. Sie sind heute im Code real oder in den Spec-Dokumenten verstreut, aber noch nicht an einer Stelle als Architektur-Entscheidung verankert. Eine dieser Tatsachen ist während Phase 1 aufgetaucht und gehört ausdrücklich dokumentiert: Das Datenmodell für strukturierte Listen trägt bereits, die Bedien-Oberfläche dafür existiert noch nicht.

## Entscheidung

### 1. Drei Feld-Ebenen — Kern, Modul, Template

Jedes Sektor-Feld liegt auf genau einer von drei Ebenen. **Kern** ist immer sichtbar. **Modul** ist eingebaut und ausklappbar (der `mehr`-Block). **Template** ist ausgelagert und andockbar über dieselbe Maske wie ein Anbieter-Template (U2-ADR-009).

Auch Vivodepot-eigene Spezial-Felder werden als Template ausgelagert, statt die Basis zu überladen — für den Bürger ununterscheidbar von einem eingebauten Modul. Die Trennlinie: Basis ist, was die meisten Menschen haben; Spezielles wird Template. Die Ebene eines Feldes ist eine Daten-Eigenschaft, kein Code-Zweig — die Maschine rendert Kern direkt, Modul im aufklappbaren Block, Template über das gemeinsame Andock-Render-Ziel aus U2-ADR-009.

### 2. Zwei Feld-Schichten — Sektor-Felder und Situationsblatt-Felder

**Sektor-Felder** sind die elf Lebensbereiche, wo die Daten wohnen. Sie sind der Gegenstand der Felder-Definition und laufen durch die generische Maschine.

**Situationsblatt-Felder** bündeln vorhandene Daten für Lebens- und Akut-Situationen, sind aber keine eigenen Sektor-Felder. Im Eigenen Modus fünf Themengruppen (`_SBL_SITUATIONEN`), darunter `beerdigung_nachlass` mit 23 `erb_*`-Feldern (Originaldokumente, Versicherungen, Konten, Verträge, Kontakte fürs Erbe). Im Angehörigen-Modus vier Akut-Situationen (Notarzt, Krankenhaus, Pflegeheim, Tod).

Diese Schicht wird **nicht** in die elf Bereiche gezwungen. Sie ist eine eigene Render-Logik mit eigenen Feldern, Listen und Regeln. Wer `erb_*` in einen der elf Bereiche schiebt, vermischt zwei Schichten, die getrennt bleiben müssen.

### 3. Codierte Felder als andockbare Listen-Module (text+code)

Sechs Gesundheits-Felder nutzen eine Vorschlagsliste mit hinterlegtem Code: allergien (SNOMED-Allergen), krankheiten (ICD-10-GM), medikamente (ATC-Wirkstoff), impfungen, operationen, implantate (SNOMED bzw. `devicesStrukturiert`). Die Bürgerin tippt an, ein Vorschlag wird gezogen, der Eintrag als Text plus Code plus Code-System abgelegt, danach ist das Feld frei für den nächsten. Sie sieht und tippt nie einen Code.

**Änderung gegenüber rc1:** Die Code-Listen liegen nicht mehr in der App. In rc1 blähten tausende Einträge (SNOMED, ICD-10, ATC) die Datei auf. In U2 sind die Listen andockbare Module wie Templates. Das Feld trägt nur einen Verweis auf die Listen-ID. Ist die Liste angedockt, liegt sie lokal in der Depot-Datei und das Feld vervollständigt daraus; ist sie nicht angedockt, bleibt es ein einfaches Textfeld — kein Bruch, nur ohne Vorschläge. Andocken ist ein einmaliger, bewusster Akt (aus einer Datei oder einmalig aus einer Quelle geholt), kein Netzzugriff zur Laufzeit. Offline-First bleibt gewahrt.

Diese Mechanik ist **kein** Gesundheits-Sektor-Code. Sie ist der erste Andockfall der Andock-Architektur (U2-ADR-006): der generische Code-Slot pro Eintrag (`codeSlotSicherstellen`, `null` bis ein Template ihn füllt). Die `sucheCodes`/`CODELIST_REGISTRY`-Mechanik ist aus rc1 portiert, die Listen aber als Module ausgelagert. Der Gesundheits-Sektor ist der erste Fall, nicht der Ort der Implementierung.

### 4. Strukturierte Listen — das Datenmodell trägt, die Render-Schicht ist ein eigener Schritt

Phase 1 hat `liste` mit `unterFelder` gebaut. Dabei hat sich eine Trennung gezeigt, die als Architektur-Tatsache gilt, nicht als Implementierungsdetail:

- **Das Datenmodell trägt.** `feldValidieren` iteriert für eine `liste` pro Eintrag und prüft jedes Sub-Feld rekursiv; der `case 'ref'` greift, `{ref, override}` wird akzeptiert; `feldEingetragen` arbeitet rekursiv gleichermaßen. Die Prüfung von `unterhalt[]` mit einem Sub-Feld `person` = ref:person würde heute durchgehen.
- **Die Render- und Editor-Schicht fehlt.** Die Maschine zeigt für eine `liste` heute nur die Anzahl der Einträge, nicht die Sub-Feld-Werte. Es gibt keinen Editor pro Eintrag, keinen Sub-Input je nach Sub-Typ, keinen Add-/Remove-Knopf und keine Inline-Anlage für ref-Sub-Felder.

Daraus folgt: Die Maschine kennt strukturierte Listen als **Datenmodell**; die Bedien-Oberfläche dafür war bei Beschluss dieser ADR eine benannte, noch offene **Render-Schicht**. Diese Render-Schicht musste vor dem Propagation-Sweep gebaut werden, weil der Sweep bestehende Felder auf `{ref, override}` umstellt und dafür eine funktionierende Listen- und Referenz-Oberfläche voraussetzt.

**Nachtrag 04.08.2026 — die Render-Schicht ist gebaut.** Eine eigene Nachsuche gegen `vivodepot.html`
selbst nachgemessen: `feldWertHTML`s `case 'liste'` (`:24615` ff.) rendert die
Zusammenfassungs-Zeile je Eintrag (`listenEintragZusammenfassung`) mit Bearbeiten-/
Entfernen-/Umsortier-Knöpfen; `feldInputHTML` (`:24470`) trägt den rekursiven Sub-Feld-Editor;
ref-Sub-Felder haben ihren Dropdown-Picker mit Inline-Anlage (sichtbar u. a. an der
`kinder`-Liste, `:24649` ff.). Alle drei in §4 benannten Stücke existieren. Dieser Nachtrag
korrigiert nur den Status — keine inhaltliche Überarbeitung dieser ADR.

Die Render-Schicht hat drei Stücke: eine Zusammenfassungs-Zeile pro Eintrag in `feldWertHTML` (Sub-Felder zusammengezogen, etwa „Name · Rolle · Tel“); ein Eintrag-Editor (Modal pro Eintrag) mit rekursivem `feldInputHTML` für jedes Sub-Feld plus Add-/Remove-Knöpfen; und für ref-Sub-Felder der Dropdown-Picker mit Inline-Anlage, bei dem die Propagations-Helfer ans UI verdrahtet werden.

## Konsequenzen

- Sektoren sind reine Daten. Weder eine Ebene noch eine Schicht noch eine codierte Liste erzeugt Sektor-spezifischen Code.
- Die text+code-Mechanik wird nicht in den Gesundheits-Sektor gebaut, sondern als generischer Andockfall (U2-ADR-006). Das verhindert, dass eine Sektor-Eigenheit zu Sektor-Code wird.
- Das Listen-UI ist ein eigener Maschine-Auftrag, der vor dem Propagation-Sweep liegt. Erst danach stellt der Sweep Felder auf `{ref, override}` um.
- Die Situationsblatt-Schicht bekommt eine eigene Render-Logik und wird nicht in die Bereichs-Maschine gezwungen.

## Offen (eigene Folge-Entscheidung, nicht hier)

- Verschmelzung versus eigener Block für Template-Felder (steht bereits in U2-ADR-009 offen) — gilt für Modul- wie für angedockte Listen-Abschnitte.
- Genaues Schema der Listen-ID-Zuordnung für die Code-Listen. Bestückungs-Frage, kein Fundament (vgl. U2-ADR-006: SNOMED-Lizenz ist Bestückung, nicht Fundament).
- Ob die Situationsblatt-Schicht Teile der Bereichs-Maschine wiederverwendet oder eine eigenständige Render-Funktion bekommt — Detail beim Bau dieser Schicht.

## Implementations-Verweis

Der Datenmodell-Teil dieser ADR ist im Phase-1-Commit Kern *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 30.05.2026)* umgesetzt (liste-Sub-Felder-Logik, `sichtbarWenn`, `einfuehrungstext`, befüllbares `CROSS_SEKTOR_FELDER`, PARTNER-Rolle); Suite-Commit *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 30.05.2026)*, 84/84 grün.

Die Render-Schicht (Listen-UI) ist im Commit Kern *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 30.05.2026)* umgesetzt — Zusammenfassungs-Zeile pro Eintrag in `feldWertHTML`, Eintrag-Editor als Modal mit rekursivem `feldInputHTML` und Add/Remove, ref-Sub-Felder mit Dropdown-Picker und Inline-Anlage; Suite-Commit *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 30.05.2026)*, 101/101 grün. SHA-256 des Kerns neu `28bc26be…`, der VdCrypto-Block-Hash bleibt unverändert `6eb590b9…`. Manueller Browser-Klick-Test bestätigt Hinzufügen, Inline-Anlage einer neuen Person, Speichern, Bearbeiten, Aktualisieren und Entfernen — mit Urheberschafts-Kette (3 Stempel: add + update + remove) und Personen-Persistenz (Inline-angelegte Person bleibt in `data.menschen[]`, auch nachdem der referenzierende Eintrag entfernt wird).

Der text+code-Andock bleibt offen und kommt mit dem Gesundheits-Sektor als erstem Andockfall.
