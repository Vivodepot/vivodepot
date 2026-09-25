# U2-ADR-071 — Bild C: Vorsorge-Regal + Cross-Sektor-Sichtbarkeit (Weg β, Liste-Projektion)

**Datum:** 11.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 11.07.2026, **am Gerät abgenommen** (Regal + Bankvollmacht-Verweis + Weg-2-Navigation im Browser durchgespielt). Node-Suite **1254/0**, PV byte-identisch (Golden-Gate), Block-Pins `8d31c678…`/`d0541ea7…` byte-identisch.
**Status heute:** gilt — `vorsorgeRegalHTML()`, `modulSichtbarkeitsKarten()` und `nichtInstrumentSprunglisteHTML()`
sind im heutigen `vivodepot.html` aktiv (Zeilen 26257 ff.).
**Nummer:** U2-ADR-071 (höchste belegte in `docs/adr/` war U2-ADR-070).
**Typ:** Neue Render-/Navigations-Schicht (Regal + Cross-Sektor-Verweise). **KEIN Schema-Bump; die zwei bestehenden Karten-Filter byte-gleich.**
**Bezug:** `PRINCIPLES.md` **Wurzel 1 — „single source of truth: one datum, one place"** (der am selben Tag ausdrücklich benannte Grundsatz) · U2-ADR-068 (geteilter Generator + P1/P2-Grenzen) · U2-ADR-070 (Instrument-Modul-Registry) · U2-ADR-064 (`vollmachten` liste-Record) · Bauskizze Weg β (abgenommen).

---

## Kontext

Bild C ist der Container der Vorsorge-Instrument-Ebene: ein **Regal pro Sektor** (Karten oben) über den Detail-
Abschnitten. Der Zielfall: die **Bankvollmacht** (Daten in Vorsorge) soll auch in **Finanzen** sichtbar sein.

Der Befund gegen den Code entschied die Mechanik: `data.dokumente[]`-Records sind **per Typ** (`{typ, sektorId}`,
kein `art`); die zwei Karten-Filter (`dokumentPanelHTML`, `erkennungsVorschlaege`) arbeiten auf dieser Schicht.
Das `art`-Feld lebt **nur** in der `vollmachten`-Liste. Die zwei Filter cross-sektor zu erweitern könnte deshalb
**keine per-`art`-Karte** erzeugen (kein `art` zum Prüfen) und würde ERKENNUNG (Vollmacht in Finanzen fälschlich
als „fehlend" vorschlagen), Dedup und Export verzahnen. → **Weg β: additive Liste-Projektion**, nicht Filter-
Erweiterung.

## Entscheidung

1. **Regal pro Sektor.** `vorsorgeRegalHTML()` iteriert `VORSORGE_MODULE` und zeigt je Instrument **eine
   gleichrangige Karte** (Titel · Herkunft · Status). „Mein digitales Weiterleben" ist **gleichrangig** — Herkunft
   `eigenhändig` (§ 2247, wie Testament), **keine** Sonderabsetzung, **kein** „Werkzeug"-Etikett. Herkunft
   `amtlich` nur bei der PV (BMJ-Formulare). Status aus dem Gate (`vorhanden`/`in Vorbereitung`/`keine`) bzw. der
   Anzahl (Vollmacht: „N erteilt").
2. **Cross-Sektor-Sichtbarkeit über die Liste-Projektion.** `modulSichtbarkeitsKarten(zielSektor)` liest die
   **Liste-Records** (`data.sektoren.<heim>.<listeId>[]`, dort lebt `art`), filtert über
   `referenzZiele.sichtbarkeit[].bedingung {feld, wert}` (strukturiert, kein geparster String) und einen
   **Home-Sektor-Guard** (`m.sektor === zielSektor → skip`, keine Dopplung im Heimatsektor). `dokumentPanelHTML`/
   `erkennungsVorschlaege` bleiben **byte-gleich**.
3. **Verweis-Karte = Zeiger, keine Kopie.** Sie trägt `verweisAuf {sektor, listeId, index}` und öffnet den
   **Heimat-Record**. Das ist die konkrete Umsetzung von **PRINCIPLES Wurzel 1 (single source of truth)**: die
   Bankvollmacht existiert **einmal** in Vorsorge; Finanzen zeigt sie als Verweis, nicht als zweite Fassung.
4. **Weg-2-Navigation.** Antippen springt zum Heimat-Sektor/Instrument-Abschnitt; ein „zurück zu <Herkunft>"
   merkt sich den Herkunfts-Sektor und führt zurück (nach Bearbeiten **oder** Abbruch). Ein Record — nichts zu
   synchronisieren.

## Zwei Karten-Quellen — bewusst getrennt

Das Regal/Panel eines Sektors speist sich künftig aus **zwei** Quellen: **(a)** `dokumente[]`-Records (die
eigenen Dokumente des Sektors, per-typ) und **(b)** der **Projektion** (Verweise aus fremden Sektoren, per-Liste-
Record). Diese zwei Quellen bleiben getrennt — nicht später versehentlich zusammenlegen (die eine ist per-typ +
home-sektor, die andere per-`art` + cross-sektor).

## Nicht-Doppelzählung — strukturell, nicht durch Sorgfalt

Die Projektion legt **keinen** `dokumente`-Record an, fügt der Liste nichts hinzu, verschiebt keinen Heimatort.
Damit sind **ERKENNUNG-Dedup** (per Typ, `dokumente[]`), **Situationsblatt-Rollup** (liest die Liste am
Heimatort) und **Export** (Heimat-Daten je Bereich) unberührt; der Home-Sektor-Guard verhindert das Feuern im
Heimatsektor. Belegt durch 8 Tests (`tests/bild-c-regal-projektion.test.js`).

## Konsequenzen / Offen

- **Verweis nutzt den Listen-Index, nicht eine stabile `id`** — `vollmachten`-Records tragen heute keine `id`
  (`listenEintragHinzufuegen` pusht positionsbasiert). Für den Sprung reicht der Index; eine stabile `id` ist eine
  spätere kleine Datenmodell-Ergänzung (überlebt dann auch ein Umsortieren) — an ihr hängt auch der **Record-
  Feinsprung** (heute zum Instrument-Abschnitt, nicht zur N-ten Vollmacht). **Offen: jetzt oder
  Backlog.**
- **Offener Anzeige-Punkt (nicht Struktur):** „Mein digitales Weiterleben" eigene gleichrangige Karte vs. sichtbar
  als **Anlage zum Testament** gruppiert. Default: eigene Karte (Auffindbarkeit). Geführt, nicht erledigt.
- **Bekannte Grenze:** Cross-Sektor-Sichtbarkeit braucht später eine **Governance-/Enforcement-Grenze** (welches
  Modul in welchen Sektor projizieren darf) — die Durchsetzungs-Ebene ist in PRINCIPLES ausgelagert.

## Verifikation

- Node-Suite **1254/0** (+8 `tests/bild-c-regal-projektion.test.js`: Bankvollmacht-in-Finanzen genau eine ·
  Home-Guard · ERKENNUNG unberührt · `art`-Filter · keine Doppelzählung · Verweis-Ziel · Regal · Status/Herkunft).
- **PV byte-identisch** (Golden-Gate, 42 Fälle); Block-Pins byte-identisch.
- **Firefox/Preview + am Gerät:** Vorsorge-Regal (sechs gleichrangige Karten, KI eigenhändig), Bankvollmacht-
  Verweis in Finanzen, Weg-2 (Sprung + Rückweg); keine Konsolenfehler.
- sha256 geändert; `BUILD_SHA256` bleibt leer. SW-Cache cleanslate **v36 → v37**. **Kein Push.**

---

## Nachtrag 1 (11.07.2026) — Verfeinerungen am fertigen Bild C

Vier Verfeinerungen nach der Geräte-Abnahme; zwei der offenen Punkte oben sind damit erledigt.

**Prüfbefund vorab (bestimmt die Notiz unten):** Die generische TOC („Auf dieser Seite") ist **kein** Vorsorge-
Sonderelement — sie rendert bei **≥3 Sektionen** und erscheint in **drei** Sektoren (`meine-menschen`, `vorsorge`,
`verwaltung`). Die Ersetzung nur in Vorsorge ist deshalb ein **Sonderfall**.

1. **TOC → Regal in Vorsorge (Sonderfall).** In Vorsorge ersetzt das Regal die generische TOC: jede **Heimat**-
   Karte ist zugleich Sprungmarke auf ihren Abschnitt (`<a href="#sek-<id>">`, Sektion-id == Modul-id). Die
   übrigen TOC-Sektoren (`meine-menschen`, `verwaltung`) behalten die generische TOC unverändert. Der TOC-Guard
   trägt jetzt die Ausnahme `sektorId !== 'vorsorge'`.
2. **Zwei Sprünge, dieselbe Kartenform — sauber getrennt.** Die **Heimat-Karte** (m.sektor == aktueller Sektor)
   springt als **Anker** auf ihren Abschnitt (TOC-Funktion). Die **Fremd-Heimat-Karte** (KI, Heimat Verwaltung)
   springt **in den Heimatsektor** (mit Rückweg) — wie die Verweis-Karte im Fremdsektor, aber im Regal. Das ist
   **getrennt** von der per-Record-**Verweis-Karte** (`sichtbarkeitsKartenHTML`, „Aus anderen Bereichen").
3. **Titel-Glättung.** Lange Kartentitel (z. B. „Sorgerechtsverfügung") werden nicht mehr abgeschnitten —
   `overflow-wrap: break-word; hyphens: auto` + etwas breitere Karten (`minmax(12.5rem, …)`).
4. **Stabile Record-id statt Index-Verweis (Schema 31→32).** Jeder Listen-Record bekommt eine stabile `id`
   (`listenEintragHinzufuegen` vergibt sie; verlustfreie Migration `depotNormalisieren` gibt id-losen
   `vollmachten`-Alt-Records eine). Der Cross-Sektor-Verweis nutzt jetzt `verweisAuf.id` (überlebt Umsortieren
   der Liste; Index bleibt nur Fallback für Alt-Records). Damit fällt der **Record-Feinsprung** ab: die Liste-
   Einträge tragen einen Anker `id="rec-<id>"`, das Antippen der Verweis-Karte landet auf dem **exakten** Record.
   Damit ist der oben als „offen" geführte Punkt erledigt.

**Verifikation (Nachtrag):** Node-Suite **1255/0** (+1 Bild-C-Test „stabile id/rec-Anker"; die 31→32-Schema-Pins
über ~12 Test-Dateien nachgezogen, Vollmacht-Migrations-Test um die id ergänzt). **PV byte-identisch** (Golden-
Gate); Block-Pins byte-identisch. **Firefox/Preview:** Vorsorge zeigt das Regal statt der TOC, Heimat-Karte-Anker
+ KI-Fremd-Sprung, Titel vollständig; `meine-menschen` behält die TOC; die Bankvollmacht-Verweis-Karte trägt
`rec-<id>` und der Feinsprung-Ziel-Anker existiert; keine Konsolenfehler. SW-Cache **v37 → v38**. **Kein Push.**

## Nachtrag 2 (11.07.2026) — Nicht-Instrument-Sprungliste (Bild C abgeschlossen)

Der Prüfbefund aus Nachtrag 1 hatte eine Lücke offengelegt: die sechs Vorsorge-**Sektionen** und die sechs
**Regal-Karten** decken sich nicht 1:1 — `pflegewuensche` ist eine Sektion, aber **kein** Dokument-Instrument
(keine Regal-Karte). Da das Regal die TOC ersetzt, verlor Pflegewünsche seine Sprungmarke.

**Entschieden:** Das Regal bleibt **reine Instrument-Übersicht** — Pflegewünsche gehört **nicht** hinein.
Stattdessen bekommen **Nicht-Instrument-Sektionen** unter dem Regal eine **schmale Sprungliste**
(`nichtInstrumentSprunglisteHTML`). **Generisch, kein Pflegewünsche-Sonderfall:** welche Sektionen abgedeckt
sind, ergibt sich aus den Regal-Karten (Instrument-Module mit Heimat im Sektor); jede künftige Nicht-Instrument-
Sektion trägt sich ohne Umbau ein. Begründung: Das Regal ersetzt die TOC nur dann **wirklich**, wenn keine
Sektion ihre Sprungmarke verliert.

**Verifikation (Nachtrag 2):** Node-Suite **1256/0** (+1 Test: Pflegewünsche in der Sprungliste, Instrument-
Sektionen nicht). Firefox: unter dem Regal steht „Pflegewünsche" als schmale Sprungmarke, das Sprungziel
existiert, die Instrumente bleiben im Regal; Reihenfolge Regal → Sprungliste → Abschnitte. PV byte-identisch;
Block-Pins byte-identisch; keine Konsolenfehler. SW-Cache **v38 → v39**. **Bild C damit fertig. Kein Push.**

Offen bleibt geführt (nicht Struktur): „Mein digitales Weiterleben" eigene Karte vs. Anlage-zum-Testament-
Gruppierung (Default eigene Karte); Governance-Grenze der Cross-Sektor-Sichtbarkeit (PRINCIPLES, ausgelagert).

---

## Nachtrag 3 (11.07., Phase 6 Kosmetik) — der Anzeige-Punkt ist entschieden (geschlossen)

**Entscheidung (Phase 6):** „Mein digitales Weiterleben" **bleibt** eine gleichrangige eigene Regal-
Karte (der bisherige Default). Begründung: ein **neues Thema**, das **nicht jeden** betrifft und **bewusst dem
Testament zugeschlagen** wird — die eigene Karte trägt die Auffindbarkeit, ohne das Thema unter „Anlage zum
Testament" zu verstecken. Der oben als „offen bleibt geführt" notierte **Anzeige-Punkt ist damit erledigt** —
**keine Code-Änderung** nötig (Default war schon die eigene Karte). Die Governance-Grenze der Cross-Sektor-
Sichtbarkeit bleibt separat geführt (PRINCIPLES, post-v1).

**K1 (Titel-Glättung, re-verifiziert):** Der in Nachtrag 1 als erledigt notierte Punkt „lange Kartentitel nicht
abschneiden" wurde in Phase 6 gegen den Ist-Code **bestätigt**: `.regal-karte-titel` trägt `overflow-wrap:
break-word; hyphens: auto; white-space: normal; overflow: visible` — „Sorgerechtsverfügung" bricht bei
Min-Spaltenbreite (12,5 rem) mit Trennstrich auf zwei Zeilen um, `scrollWidth == clientWidth` (kein
horizontales Abschneiden, kein Ellipsis). In der laufenden Shell gemessen + Screenshot. Keine Code-Änderung.
