# U2-ADR-059 — Chooser-Bündel: Fachpfad-Schnitt · Notfall-Stelle · Karte/QR raus aus „Ganzes Depot"

**Datum:** 05.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 05.07.2026 (Suite/E2E/Gates grün; Annahme = Produktentscheidung).
**Status heute:** gilt — Beleg in `vivodepot.html`: `fachpfad:true` an `vivodepot-beta`/`provider-credential` mit Filter in `flowEinlesen` (Z. 13631/13654/15198), `geheZuNotfall()` + Sidebar-Eintrag `data-notfall` (Z. 20408, 23859, 23913), „Ganzes Depot" ruft `flowVollDepotPdf()` direkt; alle drei Testdateien (`fachpfad-schnitt.test.js`, `notfall-stelle.test.js`, `herausgeben-zentral-neutral.test.js`) weiter vorhanden.
**Nummer:** U2-ADR-059 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-058).
**Typ:** Wege-/Render-Struktur (kein Krypto, keine Datenmodell-Änderung).
**Bezug:** UX-Spez Teil 4a §4/§6 (Chooser-Konsistenz, Fachpfade) · U2-ADR-055 (Knopf-Flut→Chooser) · U2-ADR-056/057 (neutrale Türen) · U2-ADR-058 (Ganzes Depot) · ADR-099 (gemeinsame Akut-Allowlist).

---

## Kontext

Drei zusammenhängende Delta aus dem Chooser-/Türen-Aufräumen, in einem Durchgang:

1. **Fachpfad-Delta (4a §6):** der Bereich-Einlese-Chooser zeigte in JEDEM Bereich `provider-credential` und `vivodepot-beta`. Read-only-Befund: beide sind `kategorie:'depot'`, content-geroutet, ohne sektorId-Bezug (`flowImportDatei(formatId)` bekommt keinen Bereich; die signierte Nutzlast bzw. der Inhalt routet, nicht die Tür). Es gibt **keinen** Bürger-Pfad, auf dem sie bereich-spezifisch gebraucht werden — immer Fachtür.
2. **Notfall-Delta:** Notfallkarte + QR saßen in „Ganzes Depot" (U2-ADR-058). Read-only-Befund: Karte, QR **und** die (bislang nur per Sanitäter-aus-Datei erreichbare) Notfall-Sicht `renderNotfall` teilen sich EINE Quelle — `notfallKernModell`/`NOTFALL_KERN_FELDER` (ADR-099). Ein eingeloggter **Bürger** hatte aber **keinen** Einstieg in die Live-Sicht.
3. **„Ganzes Depot"-Delta:** nach dem Wegzug von Karte/QR bleibt whole-depot-herausgeben = nur Gesamt-PDF.

## Entscheidung

**(1) Fachpfad-Schnitt.** `provider-credential` + `vivodepot-beta` tragen `fachpfad:true`; `flowEinlesen` filtert `importFormateFuerSektor(sektorId).filter(f => !f.fachpfad)`. Der Bereich-Chooser zeigt nur noch die bereichseigenen Formate + `json`. Die Fachpfade bleiben als Formate bestehen und über die zentrale „Ganzes Depot — Datei automatisch erkennen" (`flowImportAuto`/`importFormatErkennen`) erreichbar — verlustfrei. `renderSektor`-Guard (Z. `.some(kategorie==='sektor')`) unberührt.

**(2) Notfall-Stelle (Bürger-Tür).** Neuer Sidebar-Eintrag **„Notfall"** (`data-notfall`) → `geheZuNotfall()`: nullt `notfallStufe1` explizit und setzt den Notfall-Modus → `renderNotfall` baut LIVE aus `notfallKernModell`. `renderNotfall` bekommt im Bürger-Kontext (`!notfallStufe1`) **[Notfallkarte drucken] + [QR anzeigen]** (beide aus derselben Quelle; QR nur bei inline-qrcode-Lib). **Getrennt** vom passwortlosen Sanitäter-aus-Datei-Weg (`flowNotfallAusDatei` auf Welcome/Overlay, setzt `notfallStufe1`): verschiedene Kontexte (Sidebar vs. Vor-Login-Overlay), verschiedene Datenquellen (live vs. Datei-Cache); im Sanitäter-Kontext hängen Karte/QR NICHT (sie läsen das leere `data`). Geteilt wird NUR `notfallKernModell`.

**(3) „Ganzes Depot" → direkt Gesamt-PDF.** Karte/QR raus aus `flowHerausgebenGanzesDepot`; da nur noch ein Format bleibt, ist der Sub-Chooser aufgelöst — „Ganzes Depot" ruft direkt `flowVollDepotPdf()` (ein Klick weniger, kein leerer Ein-Knopf-Chooser). Funktion `flowHerausgebenGanzesDepot` entfernt.

## Begründung

- **Zielgruppen-Chooser bleibt sauber (4a §6):** Fachpfade sind kein Bürger-Standardweg; sie verschwinden aus dem Bereich-Chooser, ohne Fähigkeit zu verlieren (Auto-Erkennung deckt sie).
- **Notfall an einem Ort, Trennung gewahrt:** Sicht/Karte/QR aus einer Quelle, eine Bürger-Tür — aber der passwortlose Sanitäter-Weg bleibt ein anderer Kontext; `notfallStufe1` als einziger geteilter Zustand wird bei Depot-Reset + Rückweg + im Bürger-Handler genullt → nie Verwechslung.
- **Ehrliche Tür:** „Ganzes Depot" hat genau eine Herausgabe-Form (Gesamt-PDF) → direkt, kein Alibi-Chooser.

## Umsetzung

- `vivodepot.html`: `fachpfad:true` an provider-credential/vivodepot-beta; `flowEinlesen`-Filter; neue `geheZuNotfall()`; Sidebar-Eintrag `data-notfall` + Verdrahtung; `renderNotfall` Karte/QR-Aktionen (gated `!notfallStufe1`); `flowHerausgebenZentral` „Ganzes Depot" → `flowVollDepotPdf()` direkt; `flowHerausgebenGanzesDepot` + `herausgebenGanzesDepotHinweis` entfernt; STRINGS `navNotfall`.
- `tests/load-kern.js`: `geheZuNotfall` im Verify-Hook.
- Tests: `fachpfad-schnitt.test.js` (neu, 3), `notfall-stelle.test.js` (neu, 6 — Bürger-Live-Sicht, Karte/QR-Gate, Trennung Bürger/Sanitäter), `herausgeben-zentral-neutral.test.js` (Test 6/7 auf Direkt-PDF + „kein Karte/QR im Herausgeben-Weg" nachgezogen).
- `sw.js` + `pages/sw.js`: Cache v7 → **v8**. `vivodepot.html.sha256` nachgezogen.
- Browser-Preview verifiziert: Sidebar-Notfall, Live-Sicht (Blutgruppe/Allergie) + Karte/QR, Fachpfad-freier Einlese-Chooser.

## Konsequenzen

- **Positiv:** Bereich-Chooser zielgruppen-sauber; Notfall gebündelt + Bürger-erreichbar bei gewahrter Sanitäter-Trennung; „Ganzes Depot" ehrlich.
- **Offen (Produktentscheidung):** ob die Sidebar-Position „Notfall" (Top-Cluster nach „Für einen Anlass") bleibt.
- **Neutral:** Node-Suite 1174/1174 (+8), E2E 16/16, Krypto-Harness 24/0, Block-Pin `8d31c678…` + JWS-Pin `d0541ea7…` unverändert. Kein Push (eine Produktentscheidung).
