# B16-ADR-024: Institutioneller Template-Import per Datei und QR-Code

> **Überführt in den Bestand am 18.09.2026** — nur Monat/Jahr im Original angegeben ("2026-04"), Tag im Dateinamen auf 01 gesetzt — die Original-Datumszeile im Dokument selbst bleibt unverändert stehen. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** Umgesetzt (v1.0-umbau AP6)
- **Datum:** April 2026
- **Kategorien:** TEMPLATE-IMPORT
- **Format:** Altformat des Vorgängerprojekts (B16-ADR-001 bis 046 bleiben in dieser Form und werden nicht nach MADR 4.0 überführt)
- **Quelle:** Entscheidungssammlung des Vorgängerprojekts, Stand 24.04.2026

## Inhalt (Roh-Form)

KONTEXT: Institutionelle Templates (Pflegeheim, Notar, Betriebsarzt) waren in beta.15 als Kanal-Vorlagen implementiert. Für v1.0 müssen sie manuell importierbar sein — ohne Server, ohne App-Store. Der erste institutionelle Pilot benötigt genau diesen Weg. ENTSCHEIDUNG: Import per JSON-Datei und per QR-Code. Schema-Validierung via tplValidate (schemaVersion 1.0). Nach Import erscheint das Template in der oberen Schicht des Einstiegsbildschirms und in „Meine Templates“ mit Öffnen/Bearbeiten/Entfernen. Ausgefüllte Antworten werden in data.__vd_inst_data[id] gespeichert. Entfernen löscht Template-Layout und Antworten. Test-Template: Aufnahmebogen eines Pilotpartners (8 Items, 3 Bewertungsstufen). ABGELEHNTE ALTERNATIVEN: Automatischer HTTP-Abruf aus Template-Store (erfordert Server, nicht offline-tauglich für v1.0) · Import nur per Datei ohne QR (die Anforderung verlangt beide Wege) · Speicherung in separatem localStorage statt data (würde Migrations-Logik komplizieren) NACHWEIS: Abschlusskriterium erfüllt: der Test-Aufnahmebogen als JSON-Datei importierbar, ausfüllbar, druckbar. 2031 Tests, 0 Fehler. [Entscheidungsgespräch, April 2026] KONSEQUENZEN: Ein institutioneller Pilot kann seinen Aufnahmebogen als JSON-Datei oder QR-Code ausgeben. Nutzende laden ihn einmalig — danach ist er permanent verfügbar. Die Import-Infrastruktur ist offen für beliebige Institutionen in v1.x.

---

*Roh-Extraktion am 29.05.2026 aus der Entscheidungssammlung des Vorgängerprojekts.
ALL-CAPS-Marker (KONTEXT:, ENTSCHEIDUNG:, ABGELEHNT:, KONSEQUENZEN:) im
obigen Text sind die Original-Struktur-Marker des Quelldokuments. Eine
strukturierte Trennung in MADR-Abschnitte wurde nicht durchgefuehrt, weil
B16-ADR-001 bis 046 im Altformat bleiben.*
