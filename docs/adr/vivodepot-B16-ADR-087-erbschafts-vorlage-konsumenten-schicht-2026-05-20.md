# B16-ADR-087 — Erbschafts-Vorlage-Konsumenten-Schicht in v1.0

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 20.05.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


**Datum:** 20.05.2026
**Status:** Umgesetzt (Sprint INV-1-FOLGE Teil B)
**Bezug:** INV-1-Befund E-1 (kritisch), erbwiz (Sprint J9), F-11-Klasse Beleg
**Tags:** ARCHITEKTUR, VORSORGE, F-11-KORREKTUR

---

## Kontext

INV-1 Cross-Sektor-Mapping-Inventur hatte aufgedeckt: **23 erb_*-Felder werden durch erbwiz geschrieben, aber in keiner Bestand-Lese-Stelle (Sektor-Renderer, IPS-Renderer, Notfall-Renderer, Word-Generator, Lese-App) gelesen**. Komplette Datenfalle — die Bürgerin füllt 23 Felder zur Erbschaftsvorbereitung aus, im Erbfall ist die Information gespeichert aber unsichtbar.

Entscheidung (INV-1-FOLGE-Anforderung): die Felder sollen Hinterbliebenen zur Verfügung stehen. Vier Konsumenten-Schichten ergänzt.

## Entscheidung

**Vier Konsumenten-Schichten in v1.0 ergänzt** (statt Slot-Umleitung oder Sektor-Renderer-Neubau).

### Schicht 1 — Sektor-Renderer im testament-Step

`renderErbschaftsBlock()`-Helper-Funktion (Z.56410-56503 in `code/VIVODEPOT.html`) rendert alle 23 Felder gruppiert in 6 Abschnitten (Personalunterlagen, Testament & Notar, Versicherungen, Banken & Vermögen, Immobilien & Verträge, Digital & Kontakte). Read-only-Anzeige mit Fortschritts-Indikator (N/23 erfasst, X%).

Eingebunden im `testament`-STEP_RENDERER (Z.56777 vor dem `mehr(…)`-Block). Bürgerin sieht den Block im "Mein Wille"-Step (Bereich `vorsorge-recht`).

Zwei Aktions-Buttons:
- "Erbschafts-Assistent starten" → `erbwizOpen()`
- "Erbschafts-Bogen als Word" → `generateErbschaftsBogen()`

### Schicht 2 — Notfall-Ansicht-Erweiterung „Im Todesfall"

`showNotfallAnsicht()` (Z.12380) bietet jetzt zwei Auswahl-Buttons:
- "Notfall-Daten (für Ersthelfer)" → bestehender Pfad (showNotfallPopup)
- "Im Todesfall (für Hinterbliebene)" → neuer Pfad `showTodesfallAnsicht()`

`showTodesfallAnsicht()` (neu, Z.12410+) zeigt:
- Mini-Block Bestattungswünsche aus bwiz-Feldern (bestattung_art/_ort/_unternehmen)
- Mini-Block Testament-Status (testament_vorhanden/_ort)
- Vollständiger `renderErbschaftsBlock()`-Aufruf — selbe Anzeige wie im Sektor
- Aktion "Erbschafts-Bogen als Word" direkt erreichbar

Wichtig: zwei semantisch getrennte Kontexte. Notfall-Daten sind für Ersthelfer im Lebenden-Kontext (Bewusstlosigkeit, Verletzung). Todesfall-Daten sind für Hinterbliebene nach dem Tod. Beide Pfade getrennt, beide über die Notfall-Ansicht-Auswahl erreichbar.

### Schicht 3 — Word-Generator `generateErbschaftsBogen()`

Übergabe-Bogen für Hinterbliebene als .docx (Z.64296+). Vorbild: `generateGesundheitsvollmacht`. Struktur:
- Person (Name, Geburtsdatum, Adresse)
- 6 Abschnitte (II-VII) mit den 23 Feldern als Label-Wert-Paaren
- Hinweis-Block in Sektion IV (Versicherungen) auf 24-72h-Meldefristen
- Footer mit Quellen-Verweis (Verbraucherzentrale "Was tun, wenn jemand stirbt?", Finanztip-Checkliste)

### Schicht 4 — Lese-App-Anzeige

`code/vivodepot-lesen.html` FELDNAMEN-Whitelist um 23 Einträge erweitert (Z.498+). Plus `WG_FELDNAMEN` im Bürger-Code (Z.66162+) für QR-Code-Lese-Pfad konsistent ergänzt. Plus `WG_PROFILE_FELDER.familie` (Z.66126+) um die 23 erb_*-Felder erweitert — damit werden sie beim Familien-Weitergabe-Profil-Export aufgenommen und in der Lese-App angezeigt.

Keine Architektur-Lockerung im Angehörigen-Modus nötig — die `_angehoerigenModus`-Flag-Logik (Z.49045) ist Render-Filter im Bürger-Code, nicht in der Lese-App. Lese-App hat eigene FELDNAMEN-Whitelist und rendert über Object.entries — die Felder werden automatisch sichtbar, sobald sie im decrypted-Payload sind.

## Code-Stellen

- `code/VIVODEPOT.html`:
  - Z.56410-56503: `renderErbschaftsBlock()`
  - Z.56777: Einbindung im testament-Step-Renderer
  - Z.12380+: `showNotfallAnsicht` mit Auswahl-Buttons
  - Z.12410+: `showTodesfallAnsicht()` (neu)
  - Z.64296+: `generateErbschaftsBogen()` (neu)
  - Z.66126+: `WG_PROFILE_FELDER.familie` erweitert
  - Z.66162+: `WG_FELDNAMEN` erweitert
- `code/vivodepot-lesen.html`:
  - Z.498+: `FELDNAMEN` erweitert um 23 erb_*-Einträge

## Konsequenzen

**Positiv:**
- Bürgerin sieht ihre Erbschafts-Vorbereitung im "Mein Wille"-Sektor zurück (Vertrauen)
- Hinterbliebene haben einen Übergabe-Bogen als Word-Dokument plus eine Todesfall-Schnellansicht in der App
- Konsistenz: Familien-Weitergabe-Profil enthält jetzt die Erbschafts-Daten auch in der Lese-App
- F-11-Klasse-Beleg-Datenfalle (23 Felder ohne Reader) ist eliminiert

**Neutral:**
- Sektor-Renderer ist read-only — Bearbeitung läuft weiter über `erbwizOpen()`
- Notfall-Ansicht hat jetzt zwei semantisch getrennte Pfade, die Auswahl-UI ist klar beschriftet

**Negativ:**
- Keine echte Trennung „Lebende-Notfall" vs „Todesfall" auf Daten-Ebene — beide nutzen `getNotfallData()`-Mechanik nicht, weil Todesfall-Anzeige die App-entsperrte Bürger-Daten direkt liest. Im Locked-State zeigt showTodesfallAnsicht leere Felder (Bürgerin muss App entsperrt haben). Akzeptabel, weil Todesfall-Ansicht typischerweise vom Bürger selbst erreicht wird (Vorbereitung) oder von Hinterbliebenen mit Passwort.

## Anschluss-ADRs

- B16-ADR-086 (Bevollmächtigte/Hauptpflegeperson-Trennung) — gleiche Sprint-Reihe
- Befund der Cross-Sektor-Mapping-Inventur (19.05.2026) und Sprint-Dokumentation (20.05.2026) liegen im Vorgängerprojekt, nicht in diesem Bestand.

## INDEX-Eintrag

**B16-ADR-087 · Erbschafts-Vorlage-Konsumenten-Schicht in v1.0**
- Scope: Vier Konsumenten-Schichten für die 23 erbwiz-Felder ergänzt (Sektor-Renderer im testament-Step, Todesfall-Ansicht im Notfall-Auswahl-Menü, Word-Generator `generateErbschaftsBogen`, Lese-App-FELDNAMEN + Familien-Profil-Export). Löst F-11-Datenfalle vor v1.0-Tag.
- Tags: ARCHITEKTUR, VORSORGE, F-11-KORREKTUR
- Datum: 20.05.2026 · Status: Umgesetzt (Sprint INV-1-FOLGE Teil B)
- Vorgänger-Bezüge: erbwiz (Sprint J9, Klasse-A-Tests ERB-T01..T05). INV-1 E-1. F-11-Klasse.
- Implementations-Verweis: `code/VIVODEPOT.html` (siehe Code-Stellen), `code/vivodepot-lesen.html` Z.498+.
