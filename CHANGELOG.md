# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier festgehalten.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), dieses Projekt hält
sich an [Semantic Versioning](https://semver.org/lang/de/).

**Sicherheitshinweise je Fassung.** Eine ausgelieferte Fassung bekommt eine eigene Überschrift in der
Form, die die App anzeigt (`## [v1.0-rc.786] – 2026-09-23`; die Zahl nach dem letzten Punkt ist die
Fassung). Darunter trägt `### Sicherheit` je behobener Schwachstelle einen Listenpunkt mit ihrer Nummer aus
dem Schwachstellen-Register und dem, was zu tun ist.
Der Listenpunkt entsteht im selben Commit wie die Korrektur. Daraus entstehen die
Sicherheitshinweise der Versionsseite (`docs/fassungen.json`); `tools/fassungen-register.js --check`
(pre-commit) ist rot, wenn eine als korrigiert geführte Schwachstelle hier fehlt.

## [Unreleased]

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
