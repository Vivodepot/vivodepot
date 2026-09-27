# Vivodepot — Firefox-Erweiterung

Behebt das Firefox-eigene Vervielfachen beim wiederholten Speichern derselben
`.vivodepot`-Datei (`Mein-Vivodepot.vivodepot`, `Mein-Vivodepot (1).vivodepot`,
`Mein-Vivodepot (2).vivodepot`, …). Firefox unterstützt die File System
Access API nicht (Mozilla, Position „negative" seit 2019); Vivodepot fällt
darum auf einen klassischen Download-Anker mit stabilem Dateinamen zurück —
jede Wiederholung hängt Firefox von sich aus einen Zähler an, rein im
browsereigenen Downloadmanager.

Diese Erweiterung hört auf `downloads.onDeterminingFilename` und erzwingt für
jede Datei, deren Name auf `.vivodepot` endet, `conflictAction: 'overwrite'`
statt der Vervielfachung. Keine Änderung an `vivodepot.html` nötig, keine
Kommunikation mit der Seite, keine Kontoerstellung, keine Datenübertragung.

**Optional, nicht Pflicht** (Entscheidung 24.08.2026): Vivodepot funktioniert
ohne diese Erweiterung genauso wie bisher — sie ist ein Zusatzangebot für
Firefox-Nutzerinnen, keine Voraussetzung.

## Testen (lokal, ohne AMO)

```
about:debugging#/runtime/this-firefox
```
„Temporäres Add-on laden…" → `firefox-erweiterung/manifest.json` auswählen.

## Unit-Tests

Die Entscheidungslogik (`entscheideUeberDownload`) läuft ohne Firefox-Laufzeit
und ist Teil der normalen Suite:

```
node --test tests/firefox-erweiterung-download-entscheidung.test.js
```

## Vor einer echten Veröffentlichung auf addons.mozilla.org

- `icons/icon.png` ist das reale Vivodepot-Markenzeichen (512×512, aus
  `manifest.webmanifest` übernommen) an allen vier Icon-Größen — für die
  kleinen Größen (16/32) lohnt sich vor der Veröffentlichung ein eigens
  gerenderter, schärferer Export statt eines herunterskalierten 512px-Bilds.
- `browser_specific_settings.gecko.id` (`speicherhilfe@vivodepot.de`) ist ein
  Platzhalter — AMO vergibt beim ersten Upload eine eigene ID, falls diese
  nicht bereits reserviert ist.
