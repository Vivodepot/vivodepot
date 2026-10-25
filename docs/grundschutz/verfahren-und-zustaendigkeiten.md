# Verfahren und Zuständigkeiten

Stand: 20.10.2026 · Festgelegt durch: Geschäftsführung der Vivodepot GmbH · Grundlage: IT-Grundschutz++, DEV.1, TEST.1, ASST.1, KONF.1

## Allgemein

- **Geltungsbereich:** Repository, Arbeitsrechner, Auslieferungsdienste, Website vivodepot.de, Postfach security@vivodepot.de. Ausgenommen: Shop und Buchhaltung.
- **Zuständig:** Rolle „Produktverantwortliche“. Maintainerin im Sinne von [`CONTRIBUTING.md`](../../CONTRIBUTING.md) ist die Produktverantwortliche.
- **Bekanntgabe:** Die Arbeitsregeln werden allen Beteiligten bei Arbeitsbeginn bereitgestellt. Für Beitragende gelten [`CONTRIBUTING.md`](../../CONTRIBUTING.md) und [`DEVELOPING.md`](../../DEVELOPING.md).
- **Überprüfung:** jährlich sowie anlassbezogen nach Sicherheitsvorfällen, nach Schwachstellen der Stufe hoch oder kritisch ([`docs/cra/schwachstellen-priorisierung.md`](../cra/schwachstellen-priorisierung.md)) und vor Änderung des Geltungsbereichs.

## 1 · Entwicklung (DEV.1)

- Entscheidungen werden als ADR dokumentiert: [`docs/adr/`](../adr/).
- Prüfverfahren: [`docs/pruefebene.md`](../pruefebene.md).
- Ein Fehler gilt als behoben, wenn eine Probe ihn vor dem Fix zeigt und danach nicht mehr.
- **Zuständig:** Produktverantwortliche · **Bekanntgabe** und **Überprüfung:** wie Allgemein.

## 2 · Änderungen und Tests (TEST.1)

- Änderungen werden versioniert. Vor Übernahme und Veröffentlichung laufen Prüfungen, die bei einem Fehler anhalten ([`docs/pruefebene.md`](../pruefebene.md)).
- Abhängigkeiten werden mit Version und Integritäts-Hash festgeschrieben; alle Komponenten stehen in einer erzeugten SBOM und werden auf Schwachstellen geprüft ([U2-ADR-434](../adr/vivodepot-U2-ADR-434-lieferketten-sicherheit-2026-09-19.md)).
- Auslieferung nach vollständiger Prüfung ([`docs/release-planung.md`](../release-planung.md)) und auf Freigabe der Produktverantwortlichen, mit Prüfsumme in [`SECURITY.md`](../../SECURITY.md), Abschnitt 8, und Eintrag in [`CHANGELOG.md`](../../CHANGELOG.md).
- Das Entfernen einer Funktion wird mit ADR und CHANGELOG-Eintrag dokumentiert.
- **Zuständig:** Produktverantwortliche · **Bekanntgabe** und **Überprüfung:** wie Allgemein.

## 3 · Informationen und Assets (ASST.1)

- Inventare: Softwarekomponenten in [`vivodepot.sbom.cdx.json`](../../vivodepot.sbom.cdx.json); ausgelieferte Dateien in [`SECURITY.md`](../../SECURITY.md), Abschnitt 8; Geräte, Dienste, Konten und Domains in einem internen Verzeichnis.
- Veröffentlichte Stände werden vor der Veröffentlichung maschinell geprüft ([`docs/pruefebene.md`](../pruefebene.md)).
- Interne Arbeitsdokumente werden außerhalb des Repositorys geführt.
- Zugang zu Signaturschlüsseln hat nur die Produktverantwortliche. Signaturprüfung: [`docs/VERIFYING-SIGNATURES.md`](../VERIFYING-SIGNATURES.md).
- Rückgabe und Entsorgung von Geräten und Datenträgern: Produktverantwortliche.
- **Zuständig:** Produktverantwortliche · **Bekanntgabe** und **Überprüfung:** wie Allgemein.

## 4 · Konfiguration (KONF.1)

- Konfiguration wird, wo sie als Datei vorliegt, versioniert und wie eine Änderung nach Abschnitt 2 behandelt.
- Zugangsdaten werden nicht im Repository geführt.
- Sicherheitsrelevante Einstellungen der Arbeitsrechner und Dienste werden mit Soll-Wert im internen Verzeichnis geführt und bei Änderung und Überprüfung abgeglichen.
- Einstellungen an Konten und Diensten ändert die Produktverantwortliche.
- **Zuständig:** Produktverantwortliche · **Bekanntgabe** und **Überprüfung:** wie Allgemein.

## Prüfvermerke

| Datum | Anlass | Durch | Ergebnis |
|---|---|---|---|
| 20.10.2026 | Ersterstellung | Produktverantwortliche | festgelegt |
