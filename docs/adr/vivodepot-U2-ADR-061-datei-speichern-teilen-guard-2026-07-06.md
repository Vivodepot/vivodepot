# U2-ADR-061 — Datei-Speichern: Web-Share-Blatt nur auf Touch/Standalone (Desktop-WebKit → Download)

**Datum:** 06.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 06.07.2026 (Suite/Block-Pins/Browser grün; Annahme = Produktentscheidung).
**Nummer:** U2-ADR-061 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-060).
**Typ:** Transport-/Ausgabe-Schicht (KEINE Krypto, kein Datenmodell — `dateiAusgeben` transportiert nur den fertigen Blob).
**Bezug:** U2-ADR-015 (Zwei-Ebenen-Persistenz: interner IDB-Stand + `.vivodepot`-Backup) · U2-ADR-031 (Standalone-Erkennung, `istStandaloneWebApp`) · iOS-Backup-Post-RC-Befund (Datei-Sicherung auf Safari/WebKit).
**Status heute:** gilt — Beleg `tests/datei-ausgabe-teilen-guard.test.js`.

---

## Kontext

Befund vom 06.07. (DuckDuckGo-Desktop, WebKit): „Jetzt als Datei sichern" öffnete das
System-**Teilen-Blatt** statt zu speichern — und das **macOS**-Teilen-Blatt kennt, anders als
das iPhone-Blatt, **kein „In Dateien sichern"**. Die `.vivodepot`-Datei blieb unspeicherbar
hängen.

Ursache: `dateiAusgeben()` (Transport-Schicht) nahm den Web-Share-Pfad, sobald
`navigator.canShare({files})` `true` liefert. Auf **Desktop-WebKit** (Safari, DuckDuckGo) ist
das `true` — obwohl der eigene Code-Kommentar „Sonst (Desktop) der bewährte Download-Pfad"
intendierte. Die Fähigkeits-Erkennung unterschied nicht zwischen „Touch/iOS, wo `<a download>`
unzuverlässig ist" und „Desktop-WebKit, wo der Download der richtige Weg ist".

## Entscheidung

Neuer Guard `_teilenBevorzugt()` entscheidet über den Ausgabe-Weg. Das Web-Share-Blatt wird
**nur** genommen, wo `<a download>` wirklich unzuverlässig ist:

- **installierte Web-App** (`istStandaloneWebApp()`), ODER
- **Touch-Primär-Gerät** (`window.matchMedia('(pointer: coarse)').matches`).

Sonst → klassischer Download. `dateiAusgeben`s Share-Zweig ist mit `&& _teilenBevorzugt()`
gegated. Stil wie `istStandaloneWebApp()`: liest `window.matchMedia` (nicht bare), wirft nie,
Default (Desktop / headless) = `false` → Download-Pfad.

| Plattform | vorher | jetzt |
|---|---|---|
| iPhone Safari (Touch) | Teilen-Blatt → „In Dateien sichern" | **unverändert** (Touch → Teilen) |
| installierte Web-App (iOS/Android) | Teilen-Blatt | **unverändert** (Standalone → Teilen) |
| **Desktop-WebKit (Safari, DuckDuckGo)** | Teilen-Blatt **ohne** Speichern-Ziel ✗ | **Download → Downloads-Ordner** ✅ |
| Desktop Chromium (Chrome/Edge) | FSA-Picker (Depot) / Download | unverändert |
| Firefox | Download | unverändert |

## Begründung

`<a download>` „scheitert auf iOS oft lautlos" (Grund für den Web-Share-Pfad ursprünglich) —
das gilt für iPhone-Safari und installierte Web-Apps, nicht für Desktop-Browser. Die Erkennung
ist **engine-unabhängig** (`pointer: coarse` / Standalone), kein UA-Sniffing (ADR-Auflage). Der
iOS-/Standalone-Weg bleibt **byte-gleich** erhalten; nur Desktop-WebKit wird korrekt auf den
Download umgeleitet. Krypto/Inhalt unberührt — nur der Transport wechselt.

## Status & Gates

- **Node-Suite 1183/0** (keine Regression). Neuer Test `tests/datei-ausgabe-teilen-guard.test.js`
  **5/5** — inkl. **Desktop-WebKit-Regressions-Wächter** (`pointer: fine` → Download) + Touch- und
  beide Standalone-Fälle.
- **Block-Pin `8d31c678…` (Krypto) + JWS-Pin `d0541ea7…` unverändert** (byte-identisch).
- **SW-Cache v9→v10.** sha256-Pin `vivodepot.html.sha256` → `ba77eca…`.
- **Browser-Preview verifiziert:** Desktop (`pointer: coarse`=false) → `_teilenBevorzugt()`=false,
  `dateiAusgeben(...)` liefert `"download"` (nicht Teilen-Blatt).
- **Kein Push** (eine Produktentscheidung). Wirkt am Gerät erst nach Harness-Sync **v14** + Deploy.

## Betroffene Stellen

- `vivodepot.html`: neue Funktion `_teilenBevorzugt()`, Gate in `dateiAusgeben` (Share-Zweig), Kommentare.
- `tests/load-kern.js`: Export `_teilenBevorzugt`, `istStandaloneWebApp`, `dateiAusgeben`.
- `tests/datei-ausgabe-teilen-guard.test.js` (neu, 5).
- `sw.js` (v9→v10), `vivodepot.html.sha256` (nachgezogen).

## Konformität

```konformitaet
aussage:   U2-061: `dateiAusgeben` nimmt den Web-Share-Pfad nur auf Touch-Primär-Geräten oder in
           der installierten Web-App — sonst (insbesondere Desktop-WebKit) den klassischen
           Download-Pfad. Kein UA-Sniffing, Erkennung engine-unabhängig über pointer/Standalone.
zustand:   prüfbar
pruefung:  tests/datei-ausgabe-teilen-guard.test.js#Desktop-WebKit (pointer: fine) → Download-Pfad — der DuckDuckGo/Safari-Regressions-Wächter
pruefung:  tests/datei-ausgabe-teilen-guard.test.js#Touch-Gerät (pointer: coarse) → Teilen-Blatt (teilen=true)
quelle:    entscheidung
```
