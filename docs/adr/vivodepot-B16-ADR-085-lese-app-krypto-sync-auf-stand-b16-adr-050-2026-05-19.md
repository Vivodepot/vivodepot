# B16-ADR-085: Lese-App-Krypto-Sync auf B16-ADR-050-Stand (Cross-Komponenten-Migration mit Legacy-Fallback)

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 19.05.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** akzeptiert
- **Datum:** 2026-05-19
- **Kategorien:** SICHERHEIT | ARCHITEKTUR
- **Format:** MADR 4.0 mit Vivodepot-Erweiterungen
- **Vorgänger:** B16-ADR-050 (Krypto-Migrations-Mechanismus für Bestandsdepots, April 2026). B16-ADR-014 (Lese-App als Empfänger-Komponente). B16-ADR-084 (Lese-Datei-Provenance-Anzeige, heute akzeptiert).
- **Bezug:** Befund im Sprint E (19.05.2026) beim Schreiben von `tests/e2e/user_journey_lesen_provenance.spec.js` — die Lese-App entschlüsselte keine vom heutigen Bürger-Code erzeugten QR-Codes.

## Kontext und Problemstellung

B16-ADR-050 hat im April 2026 die PBKDF2-Iterationen im Bürger-Code von 200.000 auf 600.000 erhöht (OWASP-2023-Konformität), mit Legacy-Pfad `deriveKeyLegacy()` für transparente Lazy-Migration bestehender Vivodepot-Dateien.

Die Lese-App `vivodepot-lesen.html` wurde **nicht mit-aktualisiert**. Sie verwendete bis zum 19.05.2026 weiterhin 200.000 Iterationen hardcoded (Z. 516). Der Code-Kommentar Z. 508 sagte „KRYPTO — identisch mit VIVODEPOT" — das traf seit B16-ADR-050 nicht mehr zu.

**Auswirkung in der Praxis:**

- Bürger erzeugt einen QR-Übergabe-Code mit dem heutigen Bürger-Code → 600k Iterationen
- Empfänger öffnet die URL in der Lese-App → 200k Iterationen
- Resultat: AES-GCM-Entschlüsselung schlägt fehl, Empfänger sieht „Falsches Passwort"
- Eine Korrektur mit korrektem Passwort hilft nicht — die Iterationen-Differenz erzeugt einen anderen Schlüssel

Bestand-QR-Codes/Dateien aus der Zeit vor B16-ADR-050 (200k) waren in der heutigen Lese-App noch lesbar, neue (600k) nicht.

**Drift-Klasse:** F-7 (Cross-Komponenten-Sync-Drift). B16-ADR-050-Implementation hat eine Architektur-Kern im Bürger-Code geändert, ohne die Empfänger-Komponente mit-zuziehen. Die Lese-App ist eine Außenkante der Vivodepot-Architektur — die Drift war stille Funktions-Brechung, die nur durch einen vollen E2E-Roundtrip sichtbar wurde.

**Frage:** Wie wird die Lese-App auf den B16-ADR-050-Stand synchronisiert, ohne Bestand-QR-Codes/Dateien aus der 200k-Zeit unlesbar zu machen?

## Entscheidungstreiber

- **Konsistenz mit B16-ADR-050 im Bürger-Code.** Der Bürger-Code löst dasselbe Problem über `deriveKeyLegacy()` mit Lazy-Migration. Die Lese-App folgt diesem etablierten Muster.
- **Backward-Compat mit Bestand-Übergaben.** Empfänger sollen alte QR-Codes/Dateien aus der 200k-Zeit weiter öffnen können. Verlust wäre Vertrauens-Bruch.
- **Werkzeug-Charakter.** Die Lese-App ist als „selbsttragende Außenkante" konzipiert — Empfänger laden sie einmal und nutzen sie ohne Updates. Die Migration muss transparent passieren, ohne dass der Empfänger eine Eintrag-Option oder ein Pflege-Wissen braucht.
- **Werkzeug-Architektur.** Web Crypto API bleibt einziger Pfad — keine externe Bibliothek.

## Entscheidung

Die Lese-App wird auf den B16-ADR-050-Stand synchronisiert, mit Legacy-Fallback analog zum Bürger-Code:

1. **Primärer Pfad `deriveKey(password, salt)`** — Iterationen-Wert von `200000` auf `600000` (`code/vivodepot-lesen.html` Z. 510-521).
2. **Legacy-Pfad `deriveKeyLegacy(password, salt)`** — neue Funktion mit 200.000 Iterationen für Bestand vor B16-ADR-050.
3. **Entschlüsselungs-Flow in `entschluesseln()`** — Try-Catch-Struktur: zuerst `deriveKey` (600k), bei Decrypt-Fehler `deriveKeyLegacy` (200k). Erst wenn beide scheitern, wird die „Falsches Passwort"-Meldung gezeigt.
4. **Kommentar-Block am Krypto-Header** — präzisiert auf „konsistent mit VIVODEPOT (B16-ADR-050 / B16-ADR-085)" plus Erklärung des Migrations-Musters.

Der Legacy-Pfad ist still — der Empfänger sieht nicht, ob seine Übergabe alt oder neu ist. Das ist Werkzeug-Disziplin: die Iterationen-Zahl ist Implementierungs-Detail, nicht Bürger-/Empfänger-sichtbare Inhalt.

## Abgelehnte Alternativen

- **Lese-App nur auf 600k anheben ohne Fallback** — verworfen wegen Bestand-Brechung. Wenn Empfänger einen alten QR-Code in der Schublade hat, soll er ihn öffnen können.
- **Iterationen im Payload-Format mitschicken** — verworfen wegen Format-Erweiterung. Bürger-Code erzeugt aktuell `{ s, c }`-Struktur ohne Iterationen-Feld. Eine Format-Erweiterung wäre ein größerer Eingriff plus Test-Aufwand auf beiden Seiten. Try-Catch-Fallback erreicht dasselbe Ziel ohne Format-Änderung.
- **Lese-App auf 200k belassen und Bürger zurück auf 200k** — verworfen, weil B16-ADR-050 die OWASP-2023-Konformität auf 600k festgelegt hat. Rückschritt wäre Sicherheits-Verschlechterung.

## Konsequenzen

**Positiv:**

- Lese-App ist krypto-konsistent mit dem Bürger-Code (B16-ADR-050).
- Neue QR-Übergaben aus dem heutigen Bürger-Code lassen sich entschlüsseln.
- Bestand-QR-Codes/Dateien aus der 200k-Zeit bleiben lesbar (Legacy-Fallback).
- Cross-Komponenten-Sync-Drift (F-7) im Pre-Release-Strang behoben.

**Neutral:**

- Lese-App-Datei wird um eine Funktion plus Try-Catch-Block länger (ca. 18 Zeilen).
- Decrypt-Versuche kosten bei alten QR-Codes minimal mehr Zeit (zwei PBKDF2-Läufe statt einem) — auf modernen Geräten kaum spürbar (~0,2 s zusätzlich).

**Offen:**

- Public-Sync. Die Lese-App-Änderung liegt zunächst nur im internen Repo. Vor v1.0-Tag muss die interne `code/vivodepot-lesen.html` ins `vivodepot-public/`-Repo synchronisiert werden, damit alle Empfänger die Migration bekommen.
- Empfänger mit bereits geladener alter Lese-App-Datei (vor diesem Sync) können weiterhin keine 600k-QR-Codes öffnen, bis sie eine neue Lese-App-Datei laden. Das ist keine ADR-Frage, sondern eine Auslieferungs-Logik-Anmerkung.

## Nachweis

- **Code-Stelle:** `code/vivodepot-lesen.html` Z. 510-535 (`deriveKey` plus neu `deriveKeyLegacy`) und Z. 854-865 (`entschluesseln` mit Try-Catch-Fallback).
- **Browser-Funktionstest:** `tests/e2e/user_journey_lesen_provenance.spec.js` U-Lesen-T01 — vollständiger Roundtrip Bürger-Verschlüsselung mit 600k → Lese-App-Entschlüsselung. Plus U-Lesen-T02 (Falsch-PIN-Schutz). Beide grün.
- **Re-Test:** Bestehende Klasse-A-Tests in `code/test_behavior_adr081_lesedatei_provenance.js` (TC-A-11/11b/11c) — 3/3 grün, keine Anpassung nötig (Tests prüfen die Render-Schicht, nicht den Decrypt-Pfad).
- **Methodische Konsequenz:** Eine ADR, die den Architektur-Kern einer Komponente ändert, verlangt eine Inventur der übrigen Komponenten, damit sie nicht auseinanderlaufen.
