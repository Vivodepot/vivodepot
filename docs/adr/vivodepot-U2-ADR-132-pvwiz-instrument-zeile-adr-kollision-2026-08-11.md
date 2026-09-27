# U2-ADR-132: pvwiz legt seine Instrument-Zeile selbst an — U2-ADR-100 gewinnt die Kollision mit U2-ADR-066 §3

**Status:** Akzeptiert
**Datum:** 11.08.2026
**Kategorie:** ARCHITEKTUR
**Grundlage:** interner Auftrag „pvwiz und ADR-Kollision" (10.08.2026), gestützt auf eine
Entscheidungsvorlage vom 09.08.2026, Register-Befund **W-5** (größter offener Launch-Blocker
vor diesem ADR).
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html`, `WIZARDS`-Eintrag `pvwiz` (`ziel`, Kopf-Kommentar),
  `PV_BMJ.steps.map(...)` (Schritt-eigenes `ziel`), `_wizardZielZeileSicherstellen`,
  `wizardAbschluss()`.
- **Sprint-Commit:** `2ab2e0a`.
- **ADR-Bezug:** U2-ADR-066 (Nachtrag 8 dort — Punkt 3 an dieser Stelle überholt),
  U2-ADR-096 Block E (dasselbe Muster bereits für `kiwiz` gebaut), U2-ADR-100 (Instrument-
  Liste ist der eine Ort — gewinnt hier), U2-ADR-131 (Modul-Vertrag/Ausgabeschicht,
  unberührt).
**Status heute:** gilt — Beleg `tests/pvwiz-instrument-zeile-abschluss.test.js#[pvwiz-Zeile] wizardAbschluss legt die Instrument-Zeile an, auch OHNE Organspende beantwortet`.

---

## Kontext — zwei angenommene ADRs zeigten an einem Punkt in verschiedene Richtungen

U2-ADR-066 §3 (10.07.2026, angenommen 02.08.2026) legt fest: `pvwiz.ziel` bleibt flach
(`{sektor:'vorsorge'}`), alle `pv_*`-Felder schreiben ausschließlich in
`data.sektoren.vorsorge`. U2-ADR-100 (24.07.2026) legt fest: die `vorsorge_instrumente`-Liste
ist der EINE Ort für ein Vorsorge-Instrument — Flachfelder verschwinden als Zweitort.

Beide sind angenommen, keiner nennt den anderen an diesem Punkt. Folge: `pvwiz` legte über
Monate KEINE Instrument-Zeile an (W-5 stand auf 1). Eine Bürgerin, die den vollständigen
BMJ-Assistenten durchlief, bekam ihr druckbares Dokument — aber die Notfallkarte zeigte
„nicht hinterlegt", Situationsblätter konnten nicht auf sie verweisen, und der Datensatz war
im Depot selbst nicht sichtbar oder korrigierbar. Sie glaubte, vorgesorgt zu haben.

Ein GEZIELTER Seiteneffekt (W-8 Zug 3, 09.08.2026, `_pvOrganspendeInInstrumentUebernehmen`)
milderte den Fall bereits teilweise: sobald der Organspende-Schritt beantwortet wurde, entstand
die Zeile. Da dieser Schritt aber (wie jeder BMJ-Schritt) NICHT pflichtig ist, blieb der
allgemeine Fall — Assistent vollständig durchlaufen, Organspende übersprungen — unverändert
bestehen.

## Entscheidung — U2-ADR-100 gewinnt

**Die Produktanweisung (10.08.2026): bereinigen, Weg 1.** Der eine Ort war die Entscheidung vom
22.07.2026 und galt dem Datenmodell, nicht einem einzelnen Assistenten.

1. **`pvwiz.ziel` trägt jetzt `{sektor:'vorsorge', liste:'vorsorge_instrumente',
   typ:'patientenverfuegung'}`** — strukturell wie `kiwiz` (U2-ADR-096 Block E). Damit erkennt
   die W-5-Struktur-Prüfung den Fall direkt, ohne benannte Ausnahme.

2. **Anders als bei `kiwiz` schreibt aber kein einzelner BMJ-Schritt in die Zeile.** Jeder der
   27 `PV_BMJ.steps`-Einträge trägt sein EIGENES `ziel:{sektor:'vorsorge'}`, das
   `wizardSchrittZiel()` gegenüber dem Wizard-Standardziel bevorzugt. Die amtlichen Bausteine
   bleiben also flach unter `data.sektoren.vorsorge` — der Dokument-Generator (golden-fixture-
   abgesichert, `tests/pv-golden-matrix.js`) liest sie unverändert, keine Regression, kein
   Umbau am Generator-Pfad nötig.

3. **`wizardAbschluss()` legt die Zeile generisch an** — neue Funktion
   `_wizardZielZeileSicherstellen(ziel, extra)`, aufgerufen wenn `def.ziel.liste` gesetzt UND
   `wizardHatDaten(def.id)` wahr ist (mindestens ein Schritt wurde tatsächlich beantwortet — ein
   sofortiges „Fertig" ohne jede Eingabe erzeugt keine leere „vorhanden"-Behauptung). Idempotent,
   Dedup-by-Typ wie `wizardListenZeileSetzen`.

4. **Der Organspende-Seiteneffekt (W-8 Zug 3) bleibt unverändert bestehen** und aktualisiert
   jetzt dieselbe, bereits existierende Zeile mit dem feineren Vier-Werte-Sachverhalt
   (`zustimmung→ja`, `ablehnung→nein`) — er ersetzt Zug 1 nicht, er ergänzt ihn weiterhin.

## Was NICHT migriert

**Keine rückwirkende Migration von Bestandsdaten**, dieselbe Verwaisungsregel (U2-ADR-050) wie
schon beim Organspende-Fund (W-8 Zug 3): eine vor diesem ADR abgeschlossene Patientenverfügung
ohne Instrument-Zeile bleibt ohne Zeile, bis der Assistent erneut durchlaufen wird (auch ohne
Werte zu ändern). Kein Schema-Bump, kein Datenverlust — jeder alte Flachfeld-Wert bleibt
vollständig erhalten und lesbar.

## Weitere ADR-Kollisionen — gesucht, nicht behoben

Der Auftrag verlangt ausdrücklich, nach WEITEREN ADR-Paaren zu suchen, die an einem Punkt in
verschiedene Richtungen zeigen, ohne einander zu nennen, und sie nur zu benennen. Eine gezielte
Suche im Rahmen dieses Auftrags fand keine weitere, mit vergleichbarer Sicherheit belegbare
Kollision (kein Vollaudit aller ADR-Paare — das wäre ein eigener, größerer Auftrag). Dass
niemand systematisch danach sucht, ist nach diesem Fund selbst der eigentliche Befund, nicht
nur die eine Kollision.

## Verifikation

Volle Suite, Konformität, Kampagne Ebene 4/4b gegen Zug 0 grün. W-5 auf 0, strukturell
(keine Ausnahme-Liste mehr, s. `tools/w5-wizard-instrument-zeile-pruefen.js`).
`tools/adr-konformitaet-pruefen.js` 0 rot.
