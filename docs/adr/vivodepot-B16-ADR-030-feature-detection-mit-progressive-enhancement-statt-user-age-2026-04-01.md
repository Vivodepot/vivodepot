# B16-ADR-030: Feature Detection mit Progressive Enhancement statt User-Agent-Sniffing

> **Überführt in den Bestand am 18.09.2026** — nur Monat/Jahr im Original angegeben ("2026-04"), Tag im Dateinamen auf 01 gesetzt — die Original-Datumszeile im Dokument selbst bleibt unverändert stehen. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** Umgesetzt
- **Datum:** April 2026
- **Kategorien:** BROWSER-KOMPATIBILITÄT
- **Format:** Altformat des Vorgängerprojekts (B16-ADR-001 bis 046 bleiben in dieser Form und werden nicht nach MADR 4.0 überführt)
- **Quelle:** Entscheidungssammlung des Vorgängerprojekts, Stand 24.04.2026

## Inhalt (Roh-Form)

KONTEXT: Vivodepot soll auf möglichst vielen Browsern laufen, einschließlich älterer Versionen, die Senioren häufig nutzen. Gleichzeitig sollen moderne Funktionen (Digital Credentials API, WebAssembly für Argon2id, Ed25519-Signaturen) verfügbar sein, wo der Browser sie unterstützt. Eine User-Agent-String-Erkennung wurde als Pragmatik-Lösung diskutiert. ENTSCHEIDUNG: Vivodepot erkennt Browser-Fähigkeiten durch Feature Detection, nicht durch User-Agent-Sniffing. Beim ersten Öffnen wird ein Capability-Profil erzeugt und verschlüsselt im Depot gespeichert. Drei Qualitätsstufen: „Voll“ (moderne Browser 2023+), „Kompatibel“ (2018 bis 2022, mit Fallback-Ketten) und „Grundversorgung“ (vor 2017, nur Lesezugriff). Jedes Exporter- und Importer-Plugin deklariert seine Mindest-Capabilities. Fehlende Funktionen werden dem Bürger nur dann gemeldet, wenn er sie aktiv aufruft — ruhig, ohne Popup. ABGELEHNTE ALTERNATIVEN: User-Agent-String-Erkennung (fragil, wird von Browsern zunehmend maskiert — siehe A32) · Feste Mindestversion mit Ablehnung älterer Browser (schließt Zielgruppe aus) · Polyfills für fehlende Funktionen (erhöht Dateigröße und Angriffsfläche) NACHWEIS: Entscheidung vom 24. April 2026. Die Lösung folgt dem Web-Plattform-Standardmuster und ist mit Bordmitteln seit etwa 2015 vollständig umsetzbar. KONSEQUENZEN: Vivodepot läuft vom 70-jährigen mit Firefox 60 auf Windows 7 bis zum 40-jährigen mit Chrome auf macOS. Die Kernfunktionen (Verschlüsseln, Lesen, Schreiben, PDF- und FHIR-Export) sind auf jedem Browser seit 2017 verfügbar; Erweiterungen skalieren mit der Browser-Fähigkeit.

---

*Roh-Extraktion am 29.05.2026 aus der Entscheidungssammlung des Vorgängerprojekts.
ALL-CAPS-Marker (KONTEXT:, ENTSCHEIDUNG:, ABGELEHNT:, KONSEQUENZEN:) im
obigen Text sind die Original-Struktur-Marker des Quelldokuments. Eine
strukturierte Trennung in MADR-Abschnitte wurde nicht durchgefuehrt, weil
B16-ADR-001 bis 046 im Altformat bleiben.*
