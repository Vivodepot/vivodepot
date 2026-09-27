# B16-ADR-003: AES-256-Verschlüsselung lokal Frühe

> **Überführt in den Bestand am 18.09.2026** — nur das Jahr im Original angegeben ("Entwicklungsphase 2025"), Monat/Tag im Dateinamen auf 01.01 gesetzt — die Original-Datumszeile im Dokument selbst bleibt unverändert stehen. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** Umgesetzt
- **Datum:** Entwicklungsphase 2025
- **Kategorien:** SICHERHEIT
- **Format:** Altformat des Vorgängerprojekts (B16-ADR-001 bis 046 bleiben in dieser Form und werden nicht nach MADR 4.0 überführt)
- **Quelle:** Entscheidungssammlung des Vorgängerprojekts, Stand 24.04.2026

## Inhalt (Roh-Form)

KONTEXT: Vivodepot speichert hochsensible Gesundheits- und Vorsorgedaten. Das Verschlüsselungskonzept war eine zentrale Sicherheitsentscheidung. ENTSCHEIDUNG: Alle Daten werden mit AES-256 lokal im Browser verschlüsselt. Der Schlüssel verlässt das Gerät des Nutzers niemals. ABGELEHNTE ALTERNATIVEN: Keine Verschlüsselung (inakzeptables Datenschutzrisiko) · Server-seitige Verschlüsselung (widerspricht dem Offline-Prinzip) NACHWEIS: „Offline-Vorsorgestick · eine HTML-Datei · kein Server · Open Source EUPL-1.2 · AES-256.“ [Projektbeschreibung, April 2026] KONSEQUENZEN: Datensouveränität als technisches Versprechen eingehalten. DSGVO-Konformität ohne Server-seitige Verarbeitung.

---

*Roh-Extraktion am 29.05.2026 aus der Entscheidungssammlung des Vorgängerprojekts.
ALL-CAPS-Marker (KONTEXT:, ENTSCHEIDUNG:, ABGELEHNT:, KONSEQUENZEN:) im
obigen Text sind die Original-Struktur-Marker des Quelldokuments. Eine
strukturierte Trennung in MADR-Abschnitte wurde nicht durchgefuehrt, weil
B16-ADR-001 bis 046 im Altformat bleiben.*
