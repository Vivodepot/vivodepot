# B16-ADR-031: Bordmittel-Linie: Web Crypto API als Fundament, PBKDF2 in v1.0

> **Überführt in den Bestand am 18.09.2026** — nur Monat/Jahr im Original angegeben ("2026-04"), Tag im Dateinamen auf 01 gesetzt — die Original-Datumszeile im Dokument selbst bleibt unverändert stehen. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** Umgesetzt
- **Datum:** April 2026
- **Kategorien:** KRYPTOGRAPHIE
- **Format:** Altformat des Vorgängerprojekts (B16-ADR-001 bis 046 bleiben in dieser Form und werden nicht nach MADR 4.0 überführt)
- **Quelle:** Entscheidungssammlung des Vorgängerprojekts, Stand 24.04.2026

## Inhalt (Roh-Form)

KONTEXT: Die Schlüsselableitung aus dem Nutzerpasswort ist die zentrale Krypto-Entscheidung. Argon2id (BSI TR-02102-empfohlen, modern) benötigt WebAssembly, was ältere Browser ausschließt. PBKDF2 ist in der Web Crypto API nativ verfügbar, seit 2017 in jedem Browser. Die in der ZenDiS-Stellungnahme (beta.9) genannten 100.000 Iterationen liegen unter aktueller OWASP-Empfehlung. ENTSCHEIDUNG: Vivodepot v1.0 verwendet PBKDF2 mit 600.000 SHA-256-Iterationen als Schlüsselableiter. Verschlüsselung mit AES-256-GCM, Signaturen mit ECDSA P-256, Hashing mit SHA-256. Alle Primitive über die browser-native Web Crypto API ohne WebAssembly und ohne externe Bibliothek. Argon2id wird in v1.x ergänzt, wenn eine ausreichende Zahl der Zielgruppe Browser mit WebAssembly-Unterstützung nutzt. ABGELEHNTE ALTERNATIVEN: Argon2id in v1.0 (schließt ältere Browser aus — siehe A33) · scrypt (in Web Crypto API nicht standardisiert) · 100.000 PBKDF2-Iterationen wie in eingereichter ZenDiS-Stellungnahme beta.9 (unter aktuellem OWASP-Empfehlungsniveau) · Externe Krypto-Bibliothek (Bordmittel-Prinzip, B16-ADR-017 und A22) NACHWEIS: Entscheidung vom 24. April 2026. BSI TR-02102-konform. 600.000 Iterationen entspricht dem OWASP-2023-Empfehlungsniveau für PBKDF2-HMAC-SHA-256. KONSEQUENZEN: Die Schlüsselableitung ist auf jedem Browser seit 2017 verfügbar und dauert je nach Gerät 0,5 bis 2 Sekunden — spürbar, aber akzeptabel. Die Nutzung der Web Crypto API dokumentiert die Konformität mit BSI-Kryptographie-Empfehlungen gegenüber Prüfenden.

---

*Roh-Extraktion am 29.05.2026 aus der Entscheidungssammlung des Vorgängerprojekts.
ALL-CAPS-Marker (KONTEXT:, ENTSCHEIDUNG:, ABGELEHNT:, KONSEQUENZEN:) im
obigen Text sind die Original-Struktur-Marker des Quelldokuments. Eine
strukturierte Trennung in MADR-Abschnitte wurde nicht durchgefuehrt, weil
B16-ADR-001 bis 046 im Altformat bleiben.*
