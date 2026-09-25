# U2-ADR-058 — „Ganzes Depot" in beide Türen; Gesamt-Exporte aus den Einstellungen

**Datum:** 05.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 05.07.2026 (Suite/E2E/Gates grün; Annahme = Produktentscheidung).
**Status heute:** teilweise abgelöst durch U2-ADR-059 — die hier gebaute Funktion `flowHerausgebenGanzesDepot()` mit dem Drei-Wege-Sub-Chooser (Gesamt-PDF/Notfallkarte/QR) ist in `vivodepot.html` nicht mehr vorhanden; Notfallkarte + QR wanderten in die neue Notfall-Stelle, „Ganzes Depot" ruft seither direkt `flowVollDepotPdf()` (Kommentar bei `data-hz-ganzes`, Z. ~29858ff.). Die Grundstruktur dieses ADRs — „Ganzes Depot" steht in beiden Türen immer zuerst, vor den Bereichen — gilt unverändert (Beleg: `data-hz-ganzes`/`data-iz-ganzes` in `vivodepot.html`, `einstAbschnittExport` = „Sichern & Wiederherstellen"). **Zusätzlich materiell überholt (17.09.2026, U2-ADR-NNN):** die Begründung „Sichern ist kein Weitergeben" für den JSON-Export in dieser Sektion trug nicht — dieselbe unverschlüsselte Volldatei, derselbe Klick, dieselbe Weitergabe-Möglichkeit, unabhängig vom Namen der Sektion. Der JSON-Export ist seither ersatzlos entfernt; „Sichern & Wiederherstellen" trägt nur noch das Wiederherstellen. Die übrige Struktur dieses ADRs bleibt unverändert gültig.
**Nummer:** U2-ADR-058 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-057).
**Typ:** Wege-/Render-Struktur (kein Krypto, keine Datenmodell-Änderung).
**Bezug:** UX-Spezifikation Teil 4a §4 („Zwei Ebenen: Ganzes Depot und Bereich") · U2-ADR-055 (Knopf-Flut → Herausgeben-Chooser) · U2-ADR-056/057 (bereich-neutrale Rein/Raus-Türen).

---

## Kontext

Nach U2-ADR-055 wanderten die **Bereich**-Exporte in die zentrale „Daten herausgeben"-Tür. Die **depot-weiten** Gesamt-Exporte (Gesamt-PDF „Alle Daten als PDF", Papier-Notfallkarte, Notfall-QR) blieben aber ausschließlich im **Einstellungen-Dialog** hängen. Ergebnis: eine Tür, die „Daten herausgeben" heißt, zeigte nur Bereiche; wer „alles herausgeben / ganzes Depot als PDF" wollte, fand es nur hinter dem Zahnrad. Read-only verifiziert: `flowHerausgebenZentral` bot nur `data-hz-sektor`; `flowVollDepotPdf`/`flowNotfallkartePdf`/`flowNotfallQR` waren nur aus `verdrahteEinstellungen` erreichbar. Dieselbe Asymmetrie spiegelbildlich auf der Einlese-Seite: die zentrale Tür bot Bereiche + „Automatisch am Inhalt erkennen" (der Ganz-Datei-Weg) als letzten Auffang, nicht als erste Ebene.

Festgeschrieben in Teil 4a §4: **beide Türen führen zwei Ebenen — zuerst „Ganzes Depot", darunter die Bereiche.** Ausnahme: das **JSON-Backup** (Depot sichern und wiederherstellen) bleibt bewusst in der Wartung, weil Sichern kein Weitergeben ist — anderes mentales Modell, anderer Ort.

## Entscheidung

**Herausgeben-Tür (`flowHerausgebenZentral`):** „Ganzes Depot" (`data-hz-ganzes`) steht **immer zuerst**, dann die Bereiche mit Daten. Klick → neuer Sub-Chooser `flowHerausgebenGanzesDepot()`: **Gesamt-PDF** (`flowVollDepotPdf`), **Papier-Notfallkarte** (`flowNotfallkartePdf`), **Notfall-QR** (`flowNotfallQR`, nur wenn die qrcode-Lib inline ist). „Ganzes Depot" bleibt **auch bei leerem Bereichs-Stand** erreichbar (Register-/Notfall-Angaben rechtfertigen den Gesamt-Export unabhängig von einzelnen Bereichen); der Leer-Hinweis sagt nur, dass einzelne Bereiche mit Daten erscheinen.

**Einlesen-Tür (`flowEinlesenZentral`):** die vorhandene Auto-Erkennung (`flowImportAuto()` ohne Bereichs-Vorwahl — deckt json-Sicherung, Migration, Provider-Dokument) steht jetzt als **„Ganzes Depot — Datei automatisch erkennen"** (`data-iz-ganzes`) **zuerst**, dann die Bereiche. Spiegel zur Herausgeben-Tür.

**Einstellungen-Dialog:** der Export-Abschnitt trägt nur noch **Sichern (JSON) + Wiederherstellen (Einlesen)** — umbenannt zu „Sichern & Wiederherstellen" (Wartung). Die drei Gesamt-Weitergabe-Knöpfe sind entfernt; ein Wegweiser verweist auf „Daten herausgeben" → „Ganzes Depot". Das JSON-Backup bleibt bewusst hier.

## Begründung

- **Der Name der Tür ist ein Versprechen.** „Daten herausgeben" muss den Gesamt-Export zeigen; ihn in die Einstellungen zu verstecken widerspricht dem Namen (4a §4). Dieselbe Konsistenz auf der Rein-Seite.
- **Sichern ≠ Weitergeben.** Das JSON-Backup ist Wartung (Depot sichern, um es wiederherzustellen), nicht Weitergabe an einen Empfänger — anderes mentales Modell, deshalb der einzige Daten-Weg, der bewusst in den Einstellungen bleibt.
- **Kein Fähigkeitsverlust, kein neuer Pfad.** „Ganzes Depot" ruft die BESTEHENDEN Funktionen (`flowVollDepotPdf`/`flowNotfallkartePdf`/`flowNotfallQR` bzw. `flowImportAuto`); nur ihr Ort und ihre Vorschalt-Ebene sind neu.

## Umsetzung

- `vivodepot.html`: STRINGS `herausgebenGanzesDepot`/`herausgebenGanzesDepotHinweis`/`einlesenGanzesDepot`/`einstGesamtExportWegweiser`; `einstAbschnittExport` → „Sichern & Wiederherstellen"; `herausgebenWoherLeer` umformuliert. Neue Funktion `flowHerausgebenGanzesDepot()`. `flowHerausgebenZentral` + `flowEinlesenZentral` um die „Ganzes Depot"-Erstzeile erweitert (`data-hz-ganzes`/`data-iz-ganzes`). Einstellungen-Export-Sektion + `verdrahteEinstellungen` auf Sichern+Wiederherstellen reduziert.
- `tests/load-kern.js`: `flowHerausgebenGanzesDepot` im Verify-Hook.
- Tests: `herausgeben-zentral-neutral.test.js` (Test 1/4/6 nachgezogen + Test 7/8 neu — Sub-Chooser-Inhalt + Verdrahtung), `einlesen-zentral-neutral.test.js` (Marker `data-iz-ganzes` + Positions-Prüfung), `einstellungen.test.js` (neu: Gesamt-Exporte raus, JSON+Einlesen bleiben, Wegweiser da).
- `sw.js` + `pages/sw.js`: Schalen-Cache v6 → **v7** (UI-Schnitt erreicht deployte PWAs). `vivodepot.html.sha256` nachgezogen.
- Browser-Preview: Herausgeben-Tür → „Ganzes Depot" (Gesamt-PDF/Notfallkarte/QR) + Bereiche; Einstellungen ohne Gesamt-Exporte, mit Wegweiser — zu verifizieren.

## Konsequenzen

- **Positiv:** Rein/Raus ist auf beiden Ebenen (Ganzes Depot + Bereich) symmetrisch; der Gesamt-Export lebt dort, wo sein Name ihn verspricht; Einstellungen trägt nur noch echte Wartung.
- **Offen (zum Zeitpunkt des ADR):** die Feinheit, ob Notfallkarte/QR alternativ unter einen eigenen „Notfall"-Eintrag statt „Ganzes Depot" gehören (nicht gebaut; 4a §4 gruppiert sie unter Ganzes Depot) — inzwischen durch U2-ADR-059 entschieden: eigene Notfall-Stelle, s. Status heute.
- **Neutral:** Node-Suite 1166/1166 (+~7), E2E 16/16, Krypto-Harness 24/0, Block-Pin `8d31c678…` + JWS-Pin `d0541ea7…` unverändert. Kein Push (eine Produktentscheidung).
