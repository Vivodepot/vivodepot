# U2-ADR-425: Hilfe in der Datei — Bedienungsanleitung als Kern-Inhalt

**Status:** entschieden, gelandet.
**Status heute:** gilt
**Datum:** 20.09.2026
**Bezug:** U2-ADR-423 (Sprachmodule übersetzen Zusicherungssätze — dieselbe Rückfall-/Übersetzungsmechanik)
**Betrifft:** `vivodepot.html` (`HILFE_THEMEN`, `hilfeThemaModell`, `hilfeThemaHTML`, `hilfeUebersichtHTML`, `hilfeOverlayHTML`, Print-CSS), `vivodepot-lesen.html` (`HILFE_LESEN_FRAGEN`, `hilfeEmpfaengerinModell`, `hilfeEmpfaengerinHTML`), `tools/hilfe-website-export-erzeugen.js`

## Befund

Gewünscht ist eine Bedienungsanleitung. Gemessen (19./20.09.2026): kein neuer Wächter nötig (die bestehende Kennungs-Erkennung des Kerns akzeptiert jede Kennung, die im deutschen Original steht, unabhängig vom Namensraum), dieselbe Druck-Mechanik wie Notfallblatt/PV-Dokument reicht, kein Website-Quellcode existiert in diesem Repo, die Dateigröße-Kosten sind gemessen unerheblich (rund 41 KB für ein realistisches Kapitel, 0,7 ‰ der heutigen Kerngröße).

## Entscheidung

1. **Kennungsraum `hilfe:<themaId>.<feld>`** im Kern, `strings:hilfeEmpfaengerinFrage_<id>`/`.Antwort_<id>` in der Lese-App (kürzer, kein eigenes Register nötig für vier feste Fragen).
2. **`HILFE_THEMEN`** (Kern) — reine Struktur ohne Nutzerdaten, zehn Themen (Liste unten, das zehnte als Nachtrag), Titel aus dem Textsatz, `anzahlAbschnitte` je Thema bestimmt, wie viele `hilfe:<id>.abschnittN`-Kennungen es gibt.
3. **Ein Thema umbenannt (20.09.2026):** „Umzug auf ein neues Gerät" → **„Die Datei ist Ihr Depot"** (`datei-ist-das-depot`). Es gibt keine Geräte-Kopplung; der echte Ablauf ist, die Datei zu kopieren und mit demselben Passwort zu öffnen. Kein fehlender Ablauf wird als Anleitung verkleidet.
4. **Druckfassung ohne zweite Quelle:** dieselbe Overlay-Mechanik wie Notfallblatt/PV-Dokument (`#hilfe-overlay`, `window.print()`, dieselbe `@media print`-Ausnahmeliste) — die Druckfassung ist die Bildschirmfassung, nur ohne App-Hülle.
5. **Website-Export als eigenes Werkzeug** (`tools/hilfe-website-export-erzeugen.js`, `--check`-Wächter wie jeder andere Erzeuger hier): liest `HILFE_THEMEN` + `AB_WERK_TEXTSATZ_DE/EN` aus dem Kern, schreibt `docs/hilfe-website-export.json`. Nur Themen MIT Inhalt erscheinen — ein leeres Thema erzeugt keine leere Website-Seite.
6. **Lese-App bekommt eine eigene, kurze Hilfe** (20.09.2026): vier feste Fragen einer Empfängerin, die eine fremde Datei öffnet — was ist das, was kann ich damit tun, wer hat es mir geschickt, was passiert mit meinen Daten. Kein eigenes Themen-Register, `strings:`-Kennungen genügen.
7. **Mechanik gebaut, dann aktiviert (20.09.2026):** die Redaktion hat die Wortlaute für neun Themen und alle vier Lese-App-Fragen geliefert, ein zehntes Thema (`sub-depot`, Einhängen/Abgeben eines Sub-Depots) folgte als Nachtrag, gegen `subDepotEinhaengen`/`btnAushaengen` gemessen. Danach: Sidebar-Eintrag `data-hilfe="1"` (Kern, analog `data-notfall`) öffnet `hilfeOeffnen()` — dieselbe DOM-Injektions-Mechanik wie `notfallblattOeffnen()`, kein `aktiveAnsicht`-Dispatchzweig nötig, das Overlay legt sich unabhängig davon über die Seite. Die Übersicht trägt jetzt zusätzlich einen „Schließen"-Knopf (vorher gab es aus der Übersicht keinen Ausgang, nur „Zurück" aus einem Thema zur Übersicht). In der Lese-App tauscht der Topbar-Knopf `#btn-hilfe` `#content` gegen `hilfeEmpfaengerinHTML()` — derselbe Ersetzungsweg wie ein Sidebar-Klick, kein eigenes Overlay.

Die zehn Themen: `depot-anlegen-passwort`, `speichern-sicherung`, `eintragen-dokumente`, `weitergeben-empfaengerin`, `sensibel-zurueckhalten-freigeben`, `notfallkarte`, `module-templates-echtheit`, `datei-ist-das-depot`, `was-vivodepot-nicht-sieht`, `sub-depot`.

## Was diese Entscheidung nicht leistet

Keine Kontext-Hilfe an einzelnen Feldern, keine Versionierung der Hilfetexte gegen die App-Version (folgt STRINGS' Prinzip: die Hilfe der installierten Kern-Version, nicht die von damals).

## Offen

- Format/Ablageort des Website-Exports auf der GEGENSTELLE (welches System die Website tatsächlich baut) — außerhalb dieses Repos.

```yaml
konformitaet:
  - aussage: >-
      Eine Kennung im Kennungsraum hilfe:<themaId>.<feld>, die im deutschen Original steht, ist
      ohne weiteres Register durch ein Sprachmodul übersetzbar — derselbe Weg wie jede andere
      Kern-Kennung, kein dritter Weg.
    zustand: erfuellt
    herkunft: U2-ADR-425 (20.09.2026)
    pruefung:
      - tests/hilfe-kapitel.test.js
        "[Hilfe·Übersetzbar, kein dritter Weg] ein Sprachmodul mit einer hilfe:-Kennung überschreibt den Titel — derselbe Weg wie jede andere Kern-Kennung"

  - aussage: >-
      Markup in einer hilfe:-Kennung wird schon beim Einlassen verworfen; ein reiner Sonderzeichen-
      Text wird beim Rendern escaped.
    zustand: erfuellt
    herkunft: U2-ADR-425 (20.09.2026)
    pruefung:
      - tests/hilfe-kapitel.test.js
        "[Hilfe·Rendering·Rot-Beweis] ein Sprachmodul mit Markup in einer hilfe:-Kennung wird schon beim Einlassen verworfen"
      - tests/hilfe-kapitel.test.js
        "[Hilfe·Rendering] ein Sonderzeichen im Titel (reiner Text, kein Markup) wird beim Rendern escaped"

  - aussage: >-
      Die Druckfassung des Hilfe-Kapitels läuft über dieselbe Overlay-/`window.print()`-Mechanik
      wie Notfallblatt und PV-Dokument — kein zweiter Renderer.
    zustand: erfuellt
    herkunft: U2-ADR-425 (20.09.2026)
    pruefung:
      - tests/hilfe-kapitel.test.js
        "[Hilfe·Druck] das Overlay steht in der Ausnahmeliste des Print-CSS, wie Notfallblatt/PV-Dokument"

  - aussage: >-
      Der Website-Export enthält nur Themen mit tatsächlichem Inhalt (DE und EN, wortgleich zum
      Kern) — ein Thema ohne Abschnitte erzeugt keine leere Seite.
    zustand: erfuellt
    herkunft: U2-ADR-425 (20.09.2026)
    pruefung:
      - tests/hilfe-website-export-erzeugen.test.js
        "[Hilfe-Website-Export] heute (die Redaktion hat geliefert): alle zehn Themen erscheinen, DE und EN befüllt"
      - tests/hilfe-website-export-erzeugen.test.js
        "[Hilfe-Website-Export·Rot-Beweis] ein Thema mit Inhalt erscheint im Export, DE und EN, wortgleich zum Kern — ein Thema ohne Abschnitte bleibt draußen"

  - aussage: >-
      Die Navigation ist scharf geschaltet: ein Sidebar-Eintrag im Kern öffnet die Hilfe über
      dieselbe Overlay-Mechanik wie das Notfallblatt, mit einem eigenen Ausgang aus der
      Übersicht (Zurück gibt es nur innerhalb eines Themas).
    zustand: erfuellt
    herkunft: U2-ADR-425 (20.09.2026)
    pruefung:
      - tests/hilfe-kapitel.test.js
        "[Hilfe·Aktivierung] die Sidebar trägt den Hilfe-Eintrag und ist auf hilfeOeffnen verdrahtet"
      - tests/hilfe-kapitel.test.js
        "[Hilfe·Aktivierung] hilfeOeffnen injiziert das Overlay und verdrahtet Drucken/Schließen/Zurück/Themen-Knöpfe"
      - tests/hilfe-kapitel.test.js
        "[Hilfe·Druck] hilfeOverlayHTML zeigt Drucken-Knopf immer, Zurück nur bei einem Thema, Schließen nur bei der Übersicht"
      - tests/kette-04-einstieg-und-zusammenstellen.test.js
        "[Kette 04 · Zug 1] die Navigationsleiste ist NICHT länger geworden"

  - aussage: >-
      Das Thema „Umzug auf ein neues Gerät" existiert nicht mehr; kein Hilfetext beschreibt eine
      Geräte-Kopplung oder einen Assistenten, den es nicht gibt.
    zustand: erfuellt
    herkunft: U2-ADR-425 (20.09.2026)
    pruefung:
      - tests/hilfe-kapitel.test.js
        "[Hilfe·Struktur] „datei-ist-das-depot" ersetzt „Umzug auf ein neues Gerät" — kein Assistent, kein Kopplungs-Wortlaut"

  - aussage: >-
      Kein hilfe:-Kennungswert und keine Lese-App-Antwort trägt eine beim Einsetzen mitkopierte
      Markdown-Überschrift oder Trennlinie aus der Redaktions-Quelldatei (Fund 20.09.2026: das
      eigene Ingest-Skript zog am letzten Thema je Sprache die Feldgrenze über die Überschrift
      „# Reader application …" hinweg, weil dort — anders als auf der DE-Seite — kein „---" als
      Trenner stand). Gemessen als Einzelfall, bereits korrigiert; die Probe hält die Grenze fest.
    zustand: erfuellt
    herkunft: U2-ADR-425 (20.09.2026, Nachtrag)
    pruefung:
      - tests/hilfe-kapitel.test.js
        "[Hilfe·Ratsche] keine Kennung trägt eine mitkopierte Markdown-Überschrift oder Trennlinie aus der Quelldatei"
      - tests/hilfe-kapitel.test.js
        "[Hilfe·Ratsche·Rot-Beweis] die Verdachts-Regex schlägt tatsächlich an, wenn eine Kennung eine Überschrift trägt"
      - tests/hilfe-empfaengerin-lesen.test.js
        "[Hilfe-Lesen·Ratsche] keine Antwort trägt eine mitkopierte Markdown-Überschrift oder Trennlinie aus der Quelldatei"

  - aussage: >-
      Das zehnte Thema (sub-depot, Nachtrag) trägt Titel, Einleitung und alle drei Abschnitte —
      der Inhalt beschreibt den echten Einhängen-/Abgeben-Ablauf (`subDepotEinhaengen`,
      `btnAushaengen`/„Ich gebe es ab."), keinen erfundenen.
    zustand: erfuellt
    herkunft: U2-ADR-425 (20.09.2026, Nachtrag)
    pruefung:
      - tests/hilfe-kapitel.test.js
        "[Hilfe·Inhalt] das nachgelieferte zehnte Thema (sub-depot) trägt Titel, Einleitung und alle drei Abschnitte"

  - aussage: >-
      Die Lese-App hat eine eigene, kurze Hilfe für die Empfängerin (vier feste Fragen), im
      selben Textsatz-Weg wie jeder andere Bedienfluss-Text der Lese-App, erreichbar über einen
      Topbar-Knopf, der `#content` austauscht — kein eigenes Overlay.
    zustand: erfuellt
    herkunft: U2-ADR-425 (20.09.2026)
    pruefung:
      - tests/hilfe-empfaengerin-lesen.test.js
        "[Hilfe-Lesen·Struktur] genau die vier vereinbarten Fragen"
      - tests/hilfe-empfaengerin-lesen.test.js
        "[Hilfe-Lesen·Aktivierung] die Topbar trägt den Hilfe-Knopf, verdrahtet auf den Tausch von #content"
      - tests/hilfe-empfaengerin-lesen.test.js
        "[Hilfe-Lesen·EN] jede Frage UND Antwort hat eine englische Fassung, eigenständig geschrieben (_STRINGS_EINGEBAUT/LESE_TEXTE_EN-Parität, bestehender Wächter deckt es)"
```
