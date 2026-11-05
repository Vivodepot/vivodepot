# U2-ADR-025: Haftungshinweis „Werkzeug, kein Berater" — Fußzeile + Dokument-Fuß (Erst-Eintritt verworfen)

**Status:** Akzeptiert (Bau 1+2 umgesetzt; Bau 3 / Fassung A am 19.06.2026 bewusst verworfen — keine offenen Punkte)
**Datum:** 19.06.2026
**Kategorie:** UX, RECHT/HAFTUNG
**Cross-Referenz (Produktiv-Kanon):** —
**U2-Bezug:** U2-ADR-013/014 (Dokument-Ebene/Generatoren), Bruch-A (App-Fußzeile, renderFooter).
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `STRINGS.fussHaftung`/`dokFussHaftung`; `renderFooter` (Fassung B); `pdfFussText` + `flowDocxExport` (Fassung C).
- **Sprint-Commit:** dieser Bau (Haftungshinweis, Sammel-Queue).
- **ADR-Bezug:** dieser ADR (U2-ADR-025).
**Status heute:** gilt — Beleg `tests/haftungshinweis.test.js#u2-025-haftungshinweis-wortlaut-b-c`.

---

## Kontext

Der Hinweis, dass Vivodepot keine Rechts-, Finanz-, Steuer- oder medizinische Beratung leistet, sondern nur Daten einliest/ausgibt, war in B16 in der App vorhanden und beim cleanslate-Umbau **herausgefallen** (Befund 19.06.: cleanslate trug ihn weder in der Fußzeile noch in den Dokument-Füßen — dort stand nur `© Vivodepot`). Haftungs-relevant. Entschieden wurden **drei Fassungen verbatim** (ohne spätere Umformulierung oder Erweiterung).

## Entscheidung — die drei Fassungen (verbatim)

- **A (Erst-Eintritt, voll):** „Vivodepot ist ein Werkzeug, kein Vermittler oder Berater. Die Inhalte der Vorlagen verantworten die, die sie ausstellen. Wir machen keine Rechts-, Finanz-, Steuer- oder medizinische Beratung. Alle erzeugten Dokumente sind Entwürfe."
- **B (App-Fußzeile, kompakt):** „Werkzeug, kein Berater · keine Rechts-, Finanz-, Steuer- oder medizinische Beratung · alle Dokumente sind Entwürfe"
- **C (Dokument-Fuß):** „VIVODEPOT · Entwurf — kein Ersatz für Rechts-, Finanz-, Steuer- oder medizinische Beratung · [Datum]"

## Umsetzung

### Bau 1 — App-Fußzeile (Fassung B) ✅
Fassung B als **führendes**, dauerhaft sichtbares, nicht dismissbares Element in `renderFooter` (`STRINGS.fussHaftung`), vor Firma/Lizenz/Version/Kontakt/Quellcode. Funktions-/Marken-Farben unverändert. Zuvor stand dort kein Hinweis (nur Firma/Lizenz/Version/Kontakt/Quellcode) → ergänzt.

### Bau 2 — Dokument-Fuß (Fassung C) ✅
- **Befund:** cleanslate hat **keine** dedizierten Vorsorge-Dokument-Generatoren (Patientenverfügung/Vorsorgevollmacht/Betreuungsverfügung/Testament sind Felder im Bereich „Vorsorge & Recht", exportiert über die generische Bereichs-Ausgabe). Dokumente entstehen über: **PDF** (`pdfFussText` → Bereichs-/Voll-Depot-/Situations-PDF) und **DOCX** (`flowDocxExport`).
- Fassung C im **PDF-Fuß** über `pdfFussText` (ein Punkt → alle PDF-Generatoren konsistent); ersetzt das bloße `© Vivodepot`. `[Datum]` = vorhandenes `meta.datum` (DD.MM.YYYY).
- Fassung C im **DOCX-Fuß** über `flowDocxExport` (dezente Fuß-Zeile, kursiv/grau), `[Datum]` im gleichen DD.MM.YYYY-Muster.
- B16-Erbe „kein Ersatz für Rechtsberatung" war **nicht** mehr vorhanden — nichts zu vereinheitlichen außer dem `©`.

### Bau 3 — Erst-Eintritt (Fassung A) — VERWORFEN (Produktentscheidung, 19.06.2026)
Bau 3 wird **bewusst verworfen** — nicht aufgeschoben. Begründung:
- Die dauerhafte App-Fußzeile (Bau 1, Fassung B) trägt den „Werkzeug, kein Berater"-Hinweis bei **jeder** Nutzung; ein zusätzlicher Erst-Eintritt-Hinweis wiederholt **denselben Inhalt ohne rechtlichen Zugewinn**.
- Der rechtlich tragende Schutz liegt im **Dokument-Fuß (Bau 2, Fassung C)** und der **Fußzeile (Bau 1)** — beide gebaut und dauerhaft sichtbar.
- Alle drei verfügbaren Wege für Bau 3 kollidieren mit Projekt-Linien: ein persistenter „gesehen"-Flag verletzt die **Nicht-Persistenz-Linie**; die session-einmalige Toast-Mechanik (`_d3ToastGezeigt`, rein in-memory, transient 8 s) ist **zweckgebunden** (Passwort-Hinweis) und für vier Sätze zu kurz; ein Welcome-statischer Hinweis bringt **keinen Mehrwert über die Fußzeile** (und erschiene bei jedem Kalt-Start, nicht „einmal").

**Folge:** Fassung A bleibt als entschiedener Wortlaut dokumentiert (s. o.), wird aber **nicht ausgeliefert**. Kein Folge-Commit, kein offener Punkt mehr.

## Nebenfund (nur gemeldet)
cleanslate trägt **keinen** Start-Netz-Call: `fetch()` existiert nur im jspdf-Lib-Blob (Datei-Download-Helfer), Kopf-Kommentar „kein fetch() im Kern"; kein `UPDATE_CHECK_URL`/`checkForUpdates`. `vivodepot.de` nur als Kontakt-Mail, Test-Sentinel-DID und nutzer-geklickter `window.open`. Nicht angefasst (eigene Entscheidung).

## Konsequenzen
- Haftungshinweis dauerhaft in der App-Fußzeile (B) und in **jedem** generierten PDF/DOCX-Dokument (C), wortgleich zur Produktentscheidung. Verbatim-Schutz über Tests (Wortlaut-Guard A/B/C-Kern).
- **Krypto unberührt:** VdCrypto-Block-Pin `8d31c678…` unverändert (nur Strings + Render/Export). Block-Integrität 2/0. Suite **910/0/1** (1 FHIR-Skip). Neuer Voll-SHA in `vivodepot.html.sha256`.
- **Mac-Abnahme:** sichtbare Platzierung (Fußzeile, PDF/DOCX-Fuß) geht auf die Geräte-Abnahme.
- **Entscheidung (19.06.2026):** Fassung A (Erst-Eintritt) **verworfen** — Begründung s. Bau 3. Keine offenen Punkte mehr in diesem ADR.

## Implementations-Verweis
Umgesetzt 19.06.2026 (clean-rebuild): `vivodepot.html` (`STRINGS.fussHaftung`/`dokFussHaftung`, `renderFooter`, `pdfFussText`, `flowDocxExport`). Tests: neu `haftungshinweis.test.js` (Verbatim-Guard B + C-Kern; Fußzeile trägt B; PDF-Fuß trägt C + Datum statt ©). Fassung A bewusst verworfen (s. Bau 3) — nicht gebaut, nicht ausgeliefert.

## Konformität

```konformitaet
aussage:   Der Haftungshinweis trägt die entschiedenen Fassungen B (App-Fußzeile) und C
           (Dokument-Fuß) verbatim — nicht umformuliert.
zustand:   prüfbar
pruefung:  tests/haftungshinweis.test.js#u2-025-haftungshinweis-wortlaut-b-c
quelle:    invariante
```

*Bindung nachgetragen 25.07.2026 (A2-als-Code), über die gemeinsame Bindungsprüfung
(`tests/bindung-pruefen.js`, U2-ADR-098 + Nachtrag).*

## Nachtrag 30.10.2026 — Fassung B wandert auf die Seite „Über und Hinweise“

**Anlass:** Die App-Fußzeile entfällt (Entscheidung vom 07.10.2026). Eine Seite „Über und Hinweise“ bündelt Hilfetexte,
Haftungs- und Rechtshinweise, Standards, Version, Prüfsumme und Lizenzen. Fassung A wurde am 19.06.2026 nur deshalb verworfen, weil
Fassung B in der Fußzeile bei jeder Nutzung sichtbar war (Abschnitt „Bau 3“). Diese Begründung muss am neuen Ort weiter tragen.

**Entscheidung (30.10.2026):**
1. Fassung B steht wortgleich als erster Satz am Kopf der Seite „Über und Hinweise“, deutsch und englisch.
2. Fassung B steht zusätzlich leise auf dem Startschirm, also beim Öffnen. Ort und Form gibt die Gestaltung vor. Damit sieht die
   Person B bei jeder Nutzung einmal, und die Begründung für das Verwerfen von A trägt weiter.
3. Fassung A bleibt verworfen.
4. Fassung C an jedem PDF und DOCX bleibt unverändert. Sie ist weiter der rechtlich tragende Schutz.
5. Die Probe zieht mit dem Bau der Seite um. `tests/haftungshinweis.test.js` prüft B wortgleich auf der Seite und auf dem
   Startschirm statt in der Fußzeile. Die Bindung `u2-025-haftungshinweis-wortlaut-b-c` bleibt.

Die Seite ist aus jeder Ansicht erreichbar: in der Seitenleiste mit einem Schritt, auf kleinen Bildschirmen über das Menü mit zwei
Schritten, auf Start und Entsperren über einen Textlink. Im Notfall-Modus zeigt die App keinen Hinweis, wie bisher.

## Nachtrag 01.11.2026 — Fassung B auf der Seite „Über und Hinweise“ in ganzen Sätzen

**Anlass:** Auf der Seite „Über und Hinweise“ liest sich die Kurzform mit Mittelpunkten wie eine Fußzeile, nicht wie ein Satz. Die
Befunde zur Seite vom 01.11.2026 verlangen ganze Sätze.

**Entscheidung (01.11.2026):**
1. Am Kopf der Seite steht Fassung B in Satzform, deutsch und englisch, wortgleich:
   - DE: „{marke} ist ein Werkzeug und berät nicht. Es ersetzt keine Rechts-, Finanz-, Steuer- oder medizinische Beratung. Alle
     Dokumente sind Entwürfe.“
   - EN: “{marke} is a tool and does not give advice. It does not replace legal, financial, tax or medical advice. All documents
     are drafts.”
   - `{marke}` ist der Name der Marke, die das Produkt trägt. Ohne Partnermarke steht dort „Vivodepot“. Einen festen Markennamen
     duldet die Wortmarken-Regel nur am Herkunftsort.
2. Die Satzform ist gleichwertig zu Fassung B. Jeder Teil von B steht darin, und keiner wird enger:
   - „Werkzeug, kein Berater“ entspricht „ist ein Werkzeug und berät nicht“.
   - „keine Rechts-, Finanz-, Steuer- oder medizinische Beratung“ entspricht „ersetzt keine Rechts-, Finanz-, Steuer- oder
     medizinische Beratung“. Die vier Gebiete sind dieselben, und die Wendung ist die von Fassung C („kein Ersatz für“).
   - „alle Dokumente sind Entwürfe“ bleibt wörtlich.
3. Die Kurzform B bleibt wortgleich leise auf dem Startschirm. Damit gilt Nr. 2 des Nachtrags vom 30.10.2026 weiter.
4. Fassung A bleibt verworfen; Fassung C bleibt unverändert.
5. Die Probe wächst mit dem Bau der Seite. `tests/haftungshinweis.test.js` prüft die Kurzform B auf dem Startschirm wie bisher und
   die Satzform wortgleich am Kopf der Seite, beide Sprachen, mit einer Negativprobe für eine umformulierte Satzform. Die Bindung
   `u2-025-haftungshinweis-wortlaut-b-c` bleibt.
