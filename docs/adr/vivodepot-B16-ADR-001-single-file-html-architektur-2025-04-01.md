# B16-ADR-001: Single-File HTML-Architektur

> **Überführt in den Bestand am 18.09.2026** — nur Monat/Jahr im Original angegeben ("2025-04"), Tag im Dateinamen auf 01 gesetzt — die Original-Datumszeile im Dokument selbst bleibt unverändert stehen. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** Umgesetzt
- **Datum:** April 2025 – April 2026
- **Kategorien:** ARCHITEKTUR
- **Format:** Altformat des Vorgängerprojekts (B16-ADR-001 bis 046 bleiben in dieser Form und werden nicht nach MADR 4.0 überführt)
- **Quelle:** Entscheidungssammlung des Vorgängerprojekts, Stand 24.04.2026

## Inhalt (Roh-Form)

KONTEXT: Vivodepot soll Vorsorgedokumente sicher speichern und in Notfallsituationen ohne technische Infrastruktur zugänglich sein. ENTSCHEIDUNG: Vivodepot ist eine einzelne HTML-Datei. Kein Server, keine Cloud, keine Installation. Die gesamte Anwendung läuft vollständig im Browser und speichert verschlüsselt lokal auf dem Gerät bzw. USB-Stick des Nutzers. ABGELEHNTE ALTERNATIVEN: Server-basierte Webanwendung (Abhängigkeit von Verfügbarkeit, Datenschutzrisiko) · Native App (Plattformabhängigkeit, Installations-Hürde) · Progressive Web App (Service-Worker-Komplexität, Server-Abhängigkeit) NACHWEIS: „Was Vivodepot ist: Eine einzelne HTML-Datei. Kein Server, keine Cloud, keine Installation.“ [Projektbeschreibung, April 2026] KONSEQUENZEN: Maximale Portabilität, Datensouveränität beim Nutzer. Alle Features müssen rein clientseitig implementierbar sein.

---

*Roh-Extraktion am 29.05.2026 aus der Entscheidungssammlung des Vorgängerprojekts.
ALL-CAPS-Marker (KONTEXT:, ENTSCHEIDUNG:, ABGELEHNT:, KONSEQUENZEN:) im
obigen Text sind die Original-Struktur-Marker des Quelldokuments. Eine
strukturierte Trennung in MADR-Abschnitte wurde nicht durchgefuehrt, weil
B16-ADR-001 bis 046 im Altformat bleiben.*
