# B16-ADR-014 · Eigenständige Leseansicht als separater Übergabekanal

> **Überführt in den Bestand am 18.09.2026** — nur Monat/Jahr im Original angegeben ("2026-04"), Tag im Dateinamen auf 01 gesetzt — die Original-Datumszeile im Dokument selbst bleibt unverändert stehen. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Kategorie:** UX-KONZEPT
- **Datum:** April 2026
- **Status:** Umgesetzt (beta.10)
- **Format:** Altformat des Vorgängerprojekts (ADRs 001–046, vor Einführung der MADR-Vorlage mit B16-ADR-047)
- **Quelle:** Entscheidungssammlung des Vorgängerprojekts, Stand 24.04.2026

## Kontext

Die QR-Übergabe war ursprünglich so konzipiert, dass der Empfänger die Daten in seine eigene VIVODEPOT-Instanz importiert. Dieser Ansatz enthielt einen konzeptuellen Widerspruch.

## Entscheidung

Eine eigenständige Datei `vivodepot-lesen.html` wird als Begleitdatei bereitgestellt. Sie ermöglicht das Lesen von QR-Codes und Weitergabe-Dateien ohne VIVODEPOT-Installation — kein Account, kein Speichern, kein Netzwerkzugriff.

## Abgelehnte Alternativen

- QR-Code für VIVODEPOT-zu-VIVODEPOT-Import (konzeptioneller Widerspruch)
- Server-seitige Leseansicht (widerspricht B16-ADR-001)

## Nachweis

> „Das ist von der Anwendung her nicht sinnvoll: denn wenn jemand den QR-Code als Übergabe-Datei bekommt und importiert in seinen möglicherweise eigenen VIVODEPOT, dann ist das ja nicht, was gewollt ist."
>
> — *[Entscheidungsgespräch, April 2026]*

## Konsequenzen

Klare Rollentrennung: `VIVODEPOT.html` für Inhaberinnen, `vivodepot-lesen.html` für Empfänger.
