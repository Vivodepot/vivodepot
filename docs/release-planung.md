# Release-Planung

**Stand:** 30.09.2026 · Gilt für jede Fassung ab v1.0.

## Fassungen

Eine Fassung ist ein ausgelieferter Stand der Anwendung. Sie heißt `v1.0.<Fassung>`; so steht sie in der Fußzeile
der Anwendung. Es gibt keinen festen Kalendertakt: eine Fassung erscheint, sobald eine Änderung
fertig und geprüft ist. Vor jeder Fassung läuft die vollständige Prüfkette (Tests, Konformitätsprüfungen,
Nutzungsabläufe im Browser).

Sicherheitskorrekturen folgen den Fristen aus der Schwachstellen-Priorisierung
([`docs/cra/schwachstellen-priorisierung.md`](cra/schwachstellen-priorisierung.md)): bei Stufe kritisch binnen 7 Tagen,
bei Stufe hoch binnen 30 Tagen, bei Stufe mittel mit der nächsten Fassung.

## Unterstützung

Jede Fassung erhält mindestens fünf Jahre Sicherheitsaktualisierungen ab dem Tag, an dem sie erscheint. Ein Ende der
Unterstützung wird zwölf Monate im Voraus angekündigt. Die Einzelheiten stehen in
[`docs/cra/supportzeitraum-und-eol.md`](cra/supportzeitraum-und-eol.md).

## Wo eine Fassung dokumentiert ist

- **[`CHANGELOG.md`](../CHANGELOG.md):** je Fassung ein Abschnitt; behobene Schwachstellen stehen dort unter
  „Sicherheit“ mit ihrer Nummer und dem, was zu tun ist.
- **[`SECURITY.md`](../SECURITY.md), Abschnitt 8:** der SHA-256 jeder ausgelieferten Datei je Fassung. Wie man ihn aus
  dem Quelltext nachrechnet, steht in [`DEVELOPING.md`](../DEVELOPING.md).
- **Öffentliches Repository:** jeder Stand dort trägt den annotierten Tag `v1.0.<Fassung>`; ab v1.0.857 ist er
  SSH-signiert, ältere nicht. Wie man die Signatur prüft, steht in [`SECURITY.md`](../SECURITY.md), Abschnitt 2.1.
