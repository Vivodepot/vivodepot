# U2-ADR-054 — Wizard-Navigation: Abbrechen → Ausgangsbereich (Bug 1), kein Scroll-/Fokus-Sprung (Bug 2), Frage-Titel auf Kern-Größe

**Datum:** 05.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 05.07.2026 (Suite/Gates grün; Annahme = Produktentscheidung).
**Status heute:** gilt — `wizardRueckkehr` und `wizardAbbrechen` sind im heutigen Kern aktiv (`vivodepot.html`).
**Nummer:** U2-ADR-054 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-053).
**Typ:** Bugfix (Navigation, Scroll/Fokus) + Kosmetik-Nacharbeit (kein Krypto, keine Datenmodell-Änderung).
**Bezug:** iOS-Gerätetest 05.07. · U2-ADR-053 (Wizard-Frage-Größe, hier nachgezogen) · U2-ADR-011 (Auto-Save/Pause).

---

## Entscheidung

**Bug 1 — „Abbrechen" kehrt in den Ausgangsbereich zurück.** `wizardAbbrechen` führte über `geheZuZuhause` auf die **Welcome-Page** (`renderWelcome` — de facto „aus der App heraus"), was Nutzer aus dem Kontext riss. Neu: Abbrechen öffnet den **Ausgangs-Sektor** — den Bereich, aus dem der Wizard gestartet wurde. `aktiverSektorId` bleibt über `wizardLauf` hinweg erhalten (der Wizard setzt nur `aktiveAnsicht='wizard'`, nicht den Sektor), also `oeffneSektor(aktiverSektorId)`. Fallback auf `geheZuZuhause`, falls kein gültiger Ausgangs-Sektor bekannt ist. (Auto-Save bleibt: `wizardSchrittSpeichern` läuft vor dem Verlassen, U2-ADR-011.)

**Bug 2 — kein Scroll-/Fokus-Sprung nach oben auf Folge-Schritten.** `renderContent` schloss mit einem pauschalen `inhaltNachObenScrollen()` — einem aggressiven Mehrfach-Reset (setzt alle Scroll-Container auf 0, **plus** Wiederholung per `requestAnimationFrame` + `setTimeout`). Bei jedem Wizard-Schritt riss das die Sicht (und auf iOS die gerade geöffnete Tastatur) nach ganz oben, besonders sichtbar auf einem Schritt mit leerem Feld (PLZ/Ort). Neu: für die Wizard-Sicht läuft der Reset **nur beim Einstieg (Schritt 1)** — dort soll die Sicht oben am Titel + der Einleitung beginnen. Auf den **Folge-Schritten** bleibt die Sicht am Schritt; `renderWizard` setzt den **Fokus auf das Schritt-Eingabefeld** (`.wizard-eingabe input/select/textarea`, best-effort), sodass die Tastatur der Eingabe folgt statt nach oben zu springen.

**Nacharbeit — Frage-Titel auf Kern-Größe.** `.wizard-frage` von `--fs-lg` (Zwischenschritt aus U2-ADR-053) auf **`--fs-base`** — gewünscht war eine flachere Wirkung. Der Titel liest sich jetzt auf Body-/Kern-Größe (Serif + Salbei-Farbe bleiben zur Abgrenzung).

## Begründung

- **Kontext-Erhalt:** Ein abgebrochener Wizard soll dich dort absetzen, wo du gestartet bist — nicht auf der Anmelde-/Welcome-Seite (die wie „App verlassen" wirkt).
- **Ruhige Eingabe:** Ein geführter Ein-Feld-pro-Schritt-Wizard darf die Sicht/Tastatur nicht bei jedem Schritt nach oben reißen; der Fokus gehört ans aktive Feld.
- **Schritt 1 als Ausnahme:** Beim Einstieg sind Einleitung + Zielbereiche (U2-ADR-052 Finding 13) wichtig — dort bleibt der Blick oben, ohne Auto-Fokus.

## Konsequenzen

- Positiv: zwei Geräte-Bugs behoben; die Frage-Größe ist final.
- Grenzen der Verifikation: das echte Scroll-/Fokus-Verhalten ist nur am Gerät prüfbar — im headless DOM-Stub ist `focus()`/Scroll ein no-op. Darum Bug 2 als **Struktur-Pin** (Guard vorhanden), Bug 1 voll verhaltensgeprüft über `getViewState()`.

## Nachschärfung Bug 1 (05.07., nach Geräte-Rückmeldung „noch da")

Der erste Fix las `aktiverSektorId` **erst beim Abbrechen** — fragil: der Wert kann sich über den Lauf ändern, und vom **Anlass-Weg** (`betreteApp()` → `wizardLauf`, Z. 10731) ist er ohnehin nicht der Ausgangsbereich. Neu: `wizardLauf` hält den Rückkehr-Kontext **beim Start** fest (`wizardRueckkehr = {ansicht, sektorId, situationId}`, solange die Startsicht noch aktiv ist); `wizardAbbrechen` kehrt genau dorthin zurück (Situationsblatt, falls von dort gestartet; sonst Ausgangs-Sektor; Fallback `aktiverSektorId`/Zuhause). Das **Topbar-Logo** (`tb-marke` → `geheZuZuhause`, „Logo → Zuhause", Struktur-Spec §3/§9) bleibt bewusst **unangetastet** — ist es die vom Bürger benutzte Ausstiegs-Geste, wäre das eine eigene, spec-berührende Entscheidung.

## Verifikation

- **Neu** `tests/wizard-navigation-findings.test.js` (4 Tests): **Bug 1** — Abbrechen aus `vorsorge` (vvwiz) landet in `vorsorge`, `aktiveAnsicht==='sektor'` (nicht Welcome, nicht `SEKTOREN[0]`); zweiter Ausgangsbereich `gesundheit` (anamwiz) landet in `gesundheit`. **Bug 2** — Struktur-Pins: `renderContent` nimmt den Wizard vom pauschalen `inhaltNachObenScrollen` aus (nur Schritt 0); `renderWizard` fokussiert das Eingabefeld nur auf Folge-Schritten (`idx > 0`).
- `tests/kosmetik-findings.test.js` nachgezogen: `.wizard-frage` jetzt `--fs-base` (nicht mehr `--fs-lg`/`--fs-xl`).
- Node-Suite **1141/1141 (0 fail, 0 skipped)**, Konformitäts-Gates **11/11** (WCAG 33 Sichten/0 Violations — kleinerer Frage-Titel kontrast-konform). **Block-Pin `8d31c678…` unberührt** (Harness 24/0). `vivodepot.html.sha256` nachgezogen. Kein Push.
