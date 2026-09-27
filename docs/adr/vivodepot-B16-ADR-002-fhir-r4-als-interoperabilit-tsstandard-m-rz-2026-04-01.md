# B16-ADR-002: FHIR R4 als Interoperabilitätsstandard März –

> **Überführt in den Bestand am 18.09.2026** — nur Monat/Jahr im Original angegeben ("2026-04"), Tag im Dateinamen auf 01 gesetzt — die Original-Datumszeile im Dokument selbst bleibt unverändert stehen. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** Umgesetzt
- **Datum:** April 2026
- **Kategorien:** INTEROPERABILITÄT
- **Format:** Altformat des Vorgängerprojekts (B16-ADR-001 bis 046 bleiben in dieser Form und werden nicht nach MADR 4.0 überführt)
- **Quelle:** Entscheidungssammlung des Vorgängerprojekts, Stand 24.04.2026

## Inhalt (Roh-Form)

KONTEXT: Für den Datenaustausch mit Kliniken und Ärzten wurde ein standardisiertes Format benötigt. ENTSCHEIDUNG: Vivodepot implementiert FHIR R4 als primären Interoperabilitätsstandard, auf IPS (International Patient Summary)-Konformität aufgerüstet. FHIR-JSON-Export vollständig implementiert. ABGELEHNTE ALTERNATIVEN: Proprietäres JSON-Format (keine Interoperabilität mit Kliniken) · HL7 v2 (veraltet, keine Browser-Unterstützung) · Nur PDF-Export (kein maschinell lesbares Format) NACHWEIS: „Ich würde denken, dass es eher ein Interoperabilität-Thema ist.“ [Entscheidungsgespräch, April 2026] KONSEQUENZEN: Kompatibilität mit EHDS (European Health Data Space), Anschlussfähigkeit an Klinik-Systeme.

---

*Roh-Extraktion am 29.05.2026 aus der Entscheidungssammlung des Vorgängerprojekts.
ALL-CAPS-Marker (KONTEXT:, ENTSCHEIDUNG:, ABGELEHNT:, KONSEQUENZEN:) im
obigen Text sind die Original-Struktur-Marker des Quelldokuments. Eine
strukturierte Trennung in MADR-Abschnitte wurde nicht durchgefuehrt, weil
B16-ADR-001 bis 046 im Altformat bleiben.*
