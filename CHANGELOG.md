# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier festgehalten.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), dieses Projekt hält
sich an [Semantic Versioning](https://semver.org/lang/de/).

**Sicherheitshinweise je Fassung.** Eine ausgelieferte Fassung bekommt eine eigene Überschrift in der
Form, die die App anzeigt (`## [v1.0-rc.786] – 2026-09-23`; die Zahl nach dem letzten Punkt ist die
Fassung). Darunter trägt `### Sicherheit` je behobener Schwachstelle einen Listenpunkt mit ihrer Nummer aus
dem Schwachstellen-Register und dem, was zu tun ist.
Der Listenpunkt entsteht im selben Commit wie die Korrektur. Daraus entstehen die
Sicherheitshinweise der Versionsseite (aus dem internen Versionsregister); `tools/fassungen-register.js --check`
(pre-commit) ist rot, wenn eine als korrigiert geführte Schwachstelle hier fehlt.

## [Unreleased]

### Hinzugefügt
- Wiederherstellungs-Code (U2-ADR-430): nach dem Anlegen bietet die App einen erzeugten Code an (135 Bit, sieben
  Vierergruppen mit Prüfzeichen), der die Datei öffnet, wenn das Passwort vergessen ist. Voreinstellung ist
  „einrichten“; wer ablehnt, liest vorher die Tragweite. Der Code wird nur angezeigt und von Hand abgeschrieben, zur
  Kontrolle einmal eingetippt, und steht in keiner Datei, keinem Druck, keinem Export. Ein eigenes Code-Blatt wird
  ohne Code gedruckt, getrennt vom Notfall-Blatt mit dem Passwort („Nicht zum Passwort legen.“). Wer mit dem Code
  öffnet, legt im selben Schritt ein neues Passwort fest; der Code gilt weiter. In den Einstellungen: Zustand,
  neu einrichten, entfernen (mit dem Hinweis, dass ältere Kopien den Code weiter tragen). Beim Passwortwechsel gilt
  der Code weiter, wenn er eingegeben wird, sonst fällt er weg. Eine exportierte Kopie trägt ihn nie.
- Vorsorge: neue Gruppe „Verständigung und Unterstützung“ — Sprache, Unterstützung bei der Verständigung (Dolmetschen,
  Gebärdensprache, Leichte Sprache), Begleitperson, „Was mir hilft“ und „Wer nicht informiert werden soll“. Sprache,
  Unterstützung und Begleitperson stehen auf der Notfallkarte und im Blatt Krankenhaus der Angehörigen-Sicht; „Wer nicht
  informiert werden soll“ steht auf keinem von beiden.
- Notfallkarte: „Besondere Situation“ und „Hinweis für Rettungskräfte“ stehen jetzt auf der Karte (höchstens 160 Zeichen,
  dann „… (vollständig in der Datei)“) und ungekürzt im Blatt Krankenhaus.

### Behoben
- Ein Stellensatz-Modul mit dem Rechtsraum ` DE` (Leerraum) oder `de` wurde angenommen und lieferte im
  deutschen Depot fremde Stellen; der reservierte Rechtsraum war nur in exakter Schreibung geschützt.
  Rechtsraum- und Sprach-Codes werden jetzt einmal normalisiert, und Prüfung, Speicherung und Nachschlagen
  benutzen denselben Wert (auch für Textsatz- und Rechtsraum-Module; `at` und `AT` sind derselbe Rechtsraum).
- Ein Logikmodul mit dem Blocktyp `constructor` (oder einem anderen vom Objekt geerbten Namen) wurde
  angenommen. Konstanten-Tabellen werden jetzt nur noch mit eigenen Einträgen nachgeschlagen.

### Geändert
- Rechtsraum-Modul-Schema (`docs/rechtsraum-modul/rechtsraum-modul-schema.json`): das Pflichtfeld
  `schemaVersion` entfällt. Die App hat es nie gelesen und als unbekannt verworfen; zugleich lehnte das
  Schema `modulTyp` und `sprache` ab, die die App annimmt. Maßstab ist jetzt die Prüfung der App.
  Module mit `schemaVersion` laden weiter, das Feld wird verworfen und benannt. Siehe `docs/JURISDICTIONS.md`.

### Hinzugefügt
- JSON-Schemas (2020-12) für alle Modultypen unter `docs/<typ>-modul/`, je mit einer Probe, die Schema und
  App-Prüfung im Gleichlauf hält.

## [v805] – 2026-09-26

### Sicherheit
- VD-SEC-001 (hoch): Behoben: Abgewählte Angaben aus Listen wurden beim Beantworten einer Anfrage trotzdem übermittelt.
  Was zu tun ist: auf v805 aktualisieren bzw. die App neu laden.

## [v1.0] – 2026-09-24

Erste veröffentlichte Version.
