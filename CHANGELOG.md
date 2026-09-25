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

## [v1.0] – 2026-09-24

Erste veröffentlichte Version.
