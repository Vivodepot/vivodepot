# U2-ADR-013: Dokumenten-Mappe — Dateien im Depot, krypto-agnostisch auf der bestehenden Surface

**Status:** Akzeptiert (Freigabe 30.05.) · Code gebaut (Nachtrag 04.08.2026: `mappeEintragHinzufuegen`
(`vivodepot.html:14670`), `mappeEntfernen` und zugehörige Strings/Rendering mit mehreren
Fundstellen im Kern, bei einer eigenen Nachsuche selbst nachgemessen;
reine Statuskorrektur, keine inhaltliche Überarbeitung)
**Datum:** 30.05.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL, UX, SICHERHEIT
**Cross-Referenz:** U2-ADR-012 (`sensibel`-Property — übernommen, nicht neu erfunden), U2-ADR-008 (Referenz-Modell `{ref, override}`, Person/Institution — `ref:mappe` als dritter Typ), U2-ADR-011 (Auto-Save), Speicherformat-Patch (Commit *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 30.05.2026)*, `encryptDepot`/`decryptDepot`-Surface), `docs/spec/Offene-Punkte-Krypto-Konsolidierung.md` (Magic-Bytes, Cluster 2.1/2.2). Grundlage: Freigabe Situationsblatt+Mappe 30.05. (Korrektur 2: keine harte Größen-Grenze).
**Status heute:** gilt — `mappeEintragHinzufuegen`/`mappeEntfernen` im Kern vorhanden (`vivodepot.html:17570` bzw. `:17620`), bestätigt den Nachtrag vom 04.08.2026.

---

## Kontext

Die Bürgerin muss Dokumente ablegen und wiederfinden — Scans, Fotos, PDFs: Testament, Vollmacht, Befunde, Urkunden. Das ist die dritte Achse **FINDEN** (neben EINTRAGEN und HERAUSHOLEN), Paket 2. Kein zwölfter Bereich: **eine** Mappe quer über die elf Bereiche. Offline, verschlüsselt, single-file, kein Server.

Zwei Fragen entscheiden die Architektur:
1. **Krypto-Kopplung.** Wie speichert die Mappe ihre Dateien, ohne die spätere Krypto-Konsolidierung (Cluster 2.1/2.2) zu zwingen, sie neu zu bauen?
2. **Datei-Größe / Performance.** Wie verhindern wir, dass große Dateien das Speichern lähmen — ohne die Zielgruppe mit einem Größen-Limit auszusperren?

Bereits **geklärt** und hier **nicht neu aufgerollt** (Auftrag): **Punkt 1** — die UI ist ein FINDEN-Eintrag (siehe Entscheidung 1). **Punkt 6** — die `sensibel`-Regel wird aus dem bereits gebauten Angehörigen-Modus/Situationsblatt übernommen (Entscheidung 6).

## Entscheidung

### 1. UI = FINDEN-Eintrag (Auftrag Punkt 1 — geklärt, übernommen)

Die Mappe lebt unter **einem FINDEN-Eintrag in der Sidebar** (die dritte Achse; der Platzhalter steht schon in `renderSidebar`). **Ein Eintrag, eine Tür. Keine zusätzliche Topbar-Schaltfläche** (Freigabe 30.05.): die Struktur-Spec hat die Mappe bewusst als FINDEN-Achse verortet, und der Stresstest war eindeutig, dass Querschnitts-Dinge nicht beide Wege brauchen — eine zweite Tür wäre genau die Doppelung, die die Navigation vermeidet. **Kein zwölfter Bereich.**

### 2. Krypto-agnostisch auf `encryptDepot`/`decryptDepot` (die tragende Entscheidung)

Die Datei-Bytes liegen **inline in `data.mappe[…]`** als Data-URL/Base64. Die Mappe ruft **nie selbst Krypto** — sie ist Teil von `data` und wird mit dem ganzen Depot über die bestehende Surface `encryptDepot(data)` / `decryptDepot` verschlüsselt.

Folge: Die Krypto-Konsolidierung ändert das Verfahren **hinter** der Surface (Umschlag-Felder, KDF, Magic-Bytes-Header), **nicht** die Surface „nimm `data`, gib Umschlag". Da die Mappe nur Teil von `data` ist, **zwingt die Konsolidierung sie nicht zum Neubau** — sie wird einfach mit dem neuen Verfahren mitverschlüsselt.

**Bewusst NICHT:** eigene Per-Datei-Krypto (eigener Umschlag/IV/Schlüssel pro Datei). Das koppelte an Krypto-Interna und wäre genau das, was die Konsolidierung neu bauen müsste. Krypto-Sauberkeit und „nicht alles neu verschlüsseln" zeigen in entgegengesetzte Richtungen; für die Konsolidierungs-Festigkeit gewinnt inline-in-`data`.

**Tür bleibt offen ohne Kopplung:** `inhalt: <data-url>` lässt sich später auf `inhalt: <Verweis auf externen Umschlag>` migrieren — eine **Daten-Migration, kein Neubau** —, falls die Konsolidierung je Per-Datei-Speicher einführt.

### 3. Datei-Größe / Speicher-Performance (zusätzlich beantwortet)

Ein Blob bedeutet: **jedes Speichern verschlüsselt das ganze Depot inkl. aller Dateien neu.** Für die Zielgruppe (eine Handvoll Scans/Fotos) unkritisch:
- **Foto-Skalierung vor dem Ablegen** (1.600 px lange Kante, JPEG 0,85); PDFs roh übernehmen → wenige MB.
- AES-GCM über wenige MB = Millisekunden; Auto-Save (U2-ADR-011) läuft bei Bereichs-/Modus-Wechsel und beim Datei-Speichern, **nicht pro Tastendruck**.
- **Keine harte Größen-Grenze** (Korrektur 2) — stattdessen eine sichtbare **Depot-Gesamtgröße** in der Mappen-Übersicht („Ihr Depot: 14 MB"). Hält das Wachstum ehrlich, ohne jemanden auszusperren.

Wächst die Mappe je in GB-Bereiche, ist Per-Datei-Speicher die **Konsolidierungs-Frage** (Cluster 2.1/2.2), nicht die von jetzt.

### 4. Datenmodell + Referenztyp `ref:mappe`

`data.mappe[id] = { id, beschriftung, bereich, dateiname, mime, groesse, sensibel, inhalt: <data-url>, hinzugefuegtAm }`.

**Urheberschaft schlank (Freigabe 30.05.):** pro Eintrag nur **das Datum `hinzugefuegtAm`**, **nicht „wer"**. Im Anker-Modus ist „wer" immer die Eigentümerin — redundant. Erst mit Sub-Depots/Vollmacht (Block 4) wird „wer" relevant; dann kann der volle Urheberschaft-Stempel (U2-ADR-005) nachgezogen werden. Für jetzt reicht das Datum, das das Datenmodell ohnehin trägt.

**`ref:mappe` als dritter Entitätstyp** neben Person und Institution, im bestehenden Referenz-Modell `{ref, override}` (U2-ADR-008): ein Sektor-Feld (`typ: 'ref', entitaet: 'mappe'`) verweist auf einen Mappen-Eintrag — **Thumbnail-Anzeige** im Sektor, **Dereferenzierung beim Löschen** (kein toter Verweis), **Inline-Upload aus dem Sektor-Picker**.

### 5. Erfassung Stufe 1 = `capture`-Input

Datei/Foto/Scan in einem: `<input type="file" accept="image/*,application/pdf" capture>`. **getUserMedia** mit Live-Vorschau/Zuschneiden = **Stufe 2, eigener Auftrag**.

**Bereichs-Zuordnung optional, Default „Allgemein" (Freigabe 30.05.).** Niedrigschwelligkeit zuerst: wer schnell einen Scan ablegt, soll kein Pflicht-Dropdown bedienen müssen — wer nicht zuordnet, landet in „Allgemein" und kann später zuordnen. Pflichtfelder sind Hürden. **Ausnahme — Sektor-Upload:** wird die Datei aus einem Sektor heraus hochgeladen („Ausweis-Kopie hochladen" neben der Ausweis-Nummer), setzt der Flow den Bereich **automatisch** (dort ist er klar). „Optional" gilt nur für den Upload aus der Mappe heraus.

### 6. `sensibel`-Regel übernommen (Auftrag Punkt 6 — geklärt, nicht neu aufgerollt)

Ein Mappen-Eintrag kann `sensibel: true` tragen — **genau die Property aus U2-ADR-012**, die im Situationsblatt und im Angehörigen-Modus bereits gebaut ist: erscheint am Bildschirm, **nicht** im Druck/Akut-Export. **Kein neuer Mechanismus**, derselbe an einer Stelle verankerte.

### 7. Suche + Vorschau (Stufe 1)

**Suche** über Beschriftung/Bereich/Dateiname (PDF-Volltext später). **Vorschau:** Bilder als inline-Thumbnail mit Modal; PDF über den Browser-Viewer (Blob-URL).

### 8. Profilfoto als `ref:mappe` (eigener Commit)

Im clean-rebuild gibt es **noch kein** Profilfoto-Feld (Identität: bewusst auf die Mappe vertagt) — also **keine Migration einer alten Data-URL**, sondern ein **frisches `profilfoto`-Feld vom Typ `ref:mappe`** (Bereich Identität), Anzeige als Deckblatt-Bild. Schließt die Stufe-1-Foto-Schuld.

## Konsequenzen

- **Mappe überlebt die Krypto-Konsolidierung unberührt** — krypto-agnostisch, nur `data`.
- **`sensibel` ein Mechanismus**, an einer Stelle (ADR-012) verankert, von der Mappe geerbt.
- **`ref:mappe` reiht sich ins bestehende Referenz-Modell** (Person/Institution) — kein neues Muster.
- **Keine Aussperrung** durch Größen-Limit; Wachstum sichtbar.
- **Whole-Depot-Re-Encrypt** als bewusster, für die Zielgruppe unkritischer Preis.

## Freigabe-Entscheidungen (30.05.)

- **Urheberschaft pro Eintrag:** ja, aber schlank — nur `hinzugefuegtAm` (Datum), kein „wer". „Wer" wird mit Block 4 (Sub-Depots/Vollmacht) nachgezogen (Entscheidung 4).
- **Topbar-Schaltfläche:** nein — nur der FINDEN-Sidebar-Eintrag. Eine Tür, keine Doppelung (Entscheidung 1).
- **Bereichs-Zuordnung:** optional, Default „Allgemein"; Sektor-Upload setzt den Bereich automatisch (Entscheidung 5).

## Bau-Reihenfolge (nach Freigabe)

1. Datenmodell `data.mappe` + Referenztyp `ref:mappe` (Auflösung/Dereferenzierung) + Maschine.
2. Mappen-Übersicht (FINDEN-Sidebar-Eintrag, ohne Topbar) inkl. Depot-Gesamtgröße-Anzeige.
3. Upload-Flow (`capture`, Foto-Skalierung, Bereichs-Zuordnung).
4. Sektor-Anbindung (`ref:mappe`-Picker, Thumbnail, Dereferenzierung beim Löschen).
5. Vorschau (Bild-Modal, PDF-Viewer) + Suche Stufe 1.
6. Profilfoto-Feld (`ref:mappe`, Bereich Identität).
7. `sensibel`-Verhalten in Druck/Akut bestätigen (aus ADR-012 geerbt).

Jeweils Block-Hash und Suite-Stand nach jedem Kern-Schritt, Stopp vor Commit, kein Push.
