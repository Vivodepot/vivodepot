# B16-ADR-055: Externe Test-Quellen für die Krypto-Schicht

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 27.04.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** akzeptiert
- **Status heute:** akzeptiert; die Ankündigungen zum NLnet-Antrag und zum NGI-Zero-Review gelten nicht mehr (s. Nachtrag 04.10.2026)
- **Datum:** 2026-04-27
- **Kategorien:** SICHERHEIT | INFRASTRUKTUR | STRATEGIE
- **Format:** MADR 4.0 mit Vivodepot-Erweiterungen (Kategorien-Header, Nachweis-Abschnitt)

## Kontext und Problemstellung

Vivodepots Krypto-Schicht ist Klasse-A-kritisch: PBKDF2-Schlüssel-Ableitung mit 600.000 Iterationen (B16-ADR-050), HKDF-Sub-Schlüssel-Ableitung pro Sub-Depot (B16-ADR-052) und AES-GCM-Verschlüsselung der Anker- und Sub-Depot-Inhalte, implementiert ausschließlich über die Web Crypto API der Browser ohne externe Bibliotheken (Single-File-HTML-Prinzip). Die bisherige Test-Suite verifiziert die Vivodepot-eigene Logik — Schlüssel-Ableitungs-Sequenzen, Datei-Format-Erkennung, Sub-Depot-Trennung, Round-Trip-Tests, Inkompatibilitäts-Tests zwischen Sub-Schlüsseln. Nicht geprüft wird die Standard-Konformität der Web-Crypto-API-Implementation in den Ziel-Browsern selbst und das Verhalten gegen historisch dokumentierte Krypto-Schwachstellen-Klassen.

Eine Recherche am 27. April 2026 identifizierte drei externe Standard-Quellen, die diese Lücke schließen können: RFC 5869 (HKDF-Test-Vektoren), NIST CAVP (AES-GCM- und PBKDF2-Test-Vektoren) und Project Wycheproof (kuratierte Edge-Case-Vektoren gegen historische Schwachstellen). Alle drei sind frei verfügbar und lizenz-kompatibel mit EUPL-1.2 (RFC ohne Lizenz-Restriktion, NIST Public Domain, Wycheproof Apache 2.0).

Sollen diese externen Quellen in die Vivodepot-Test-Suite aufgenommen werden, und wenn ja, in welcher Form? Der Kontext geht über AP 5.2 hinaus — die Strategie soll Vorbild-Charakter für künftige Krypto-Migrationen haben.

## Entscheidungstreiber

- **Klasse-A-Kritikalität der Krypto-Schicht:** Schlüssel-Ableitung und Verschlüsselung sind sicherheitskritisch; eigene Logik-Tests allein prüfen nicht die Standard-Konformität der Browser-Implementation.
- **Lizenz-Kompatibilität mit EUPL-1.2:** Alle drei Quellen sind frei nutzbar (RFC ohne Restriktion, NIST Public Domain, Wycheproof Apache 2.0).
- **Reproduzierbarkeit und Audit-Fähigkeit:** Test-Vektoren müssen ohne externe Lade-Abhängigkeit zur CI-Laufzeit verfügbar sein.
- **Sauberkeit von Test-Pfad und Produktions-Pfad:** Test-Helfer dürfen die Produktions-API nicht mit Test-Mode-Schaltern belasten.
- **Vorbereitung auf externe Audits:** NGI Zero Review-Programm (zugänglich nach NGI-Zero-Förderung Juni 2026) und mögliche Audits durch Radically Open Security oder X41 D-Sec.
- **Vorbild-Charakter für künftige Krypto-Migrationen:** Die Strategie soll über AP 5.2 hinaus dauerhaft gelten (z. B. Schema 3 / Argon2id, HKDF-Info-String-Wechsel).
- **Methodische Ehrlichkeit:** Grenzen der eigenen Verifikation (z. B. Entropie-Annahme) sollen transparent dokumentiert werden, nicht verschwiegen.

## Geprüfte Optionen

1. **Externe Quellen als verbindliche Verifikations-Schicht integrieren** (RFC 5869, NIST CAVP, Project Wycheproof), mit Stichprobe in Standard-CI plus separatem Vollständigkeits-Lauf.
2. **Keine externen Test-Quellen**, nur Vivodepot-eigene Logik-Tests.
3. **Alle drei Quellen aufnehmen, aber nur als wöchentlicher Sicherungs-Lauf**, nicht in der Standard-CI.

## Entscheidung

Gewählt: **Option 1**. Drei externe Standard-Quellen werden als verbindliche zusätzliche Verifikations-Schicht in die Vivodepot-Test-Suite integriert, beginnend mit AP 5.2, mit klarer Erweiterungs-Strategie für künftige Krypto-Migrationen.

**Quellen-Auswahl.** RFC 5869 (HKDF), NIST CAVP (AES-GCM und PBKDF2) und Project Wycheproof (Edge-Case-Vektoren für AES-GCM und HKDF). In AP 5.2 werden vier neue Klasse-A-Tests eingeführt: 5.2-A-09 (RFC 5869), 5.2-A-10 (NIST AES-GCM), 5.2-A-11 (Wycheproof AES-GCM), 5.2-A-12 (Wycheproof HKDF).

**Detail-Entscheidung 1 — RFC-5869-Test-Implementation (Entscheidung: 1A).** Eine Test-Helper-Funktion `_deriveHkdfRaw(masterKey, salt, info, length)` wird ausschließlich für Test-Zwecke mit variablem Info-String eingeführt, intern aus `deriveSubKey()` aufrufbar, aber im Produktions-Pfad nicht erreicht. `deriveSubKey()` behält den fest codierten Info-String `vivodepot-subdepot-v1` in der Produktions-Verwendung.

**Detail-Entscheidung 2 — NIST-AES-GCM-Vektor-Auswahl (Entscheidung: 2C).** Die Standard-Test-Suite läuft eine Stichprobe aus Vivodepot-relevanten Konfigurationen (AES-256-GCM, 96-bit-IV, etwa 50–100 Vektoren mit verschiedenen Plain-Text- und AAD-Längen) bei jedem CI-Lauf. Zusätzlich läuft ein Vollständigkeits-Lauf mit allen NIST-CAVP-AES-GCM-Vektoren in einer separaten Test-Datei (`code/test_vectors_full_run.js` o. ä.), wöchentlich oder monatlich manuell ausgeführt.

**Detail-Entscheidung 3 — Wycheproof-Edge-Case-Behandlung (Entscheidung: 3B).** Wycheproof-Vektoren sind „valid", „invalid" oder „acceptable" markiert. „Valid" muss erfolgreich entschlüsseln, sonst Test-Fail. „Invalid" muss mit Auth-Failure oder kontrolliertem Fehler abgewiesen werden, sonst Test-Fail. „Acceptable" wird geprüft und das Ergebnis in einer Audit-Spur dokumentiert (Konsolen-Log oder Test-Output-Datei), ohne Pass-Fail-Bewertung, weil beide Verhaltensweisen legitim sind.

**Detail-Entscheidung 4 — Vektor-Daten-Ablage (Entscheidung: 4b).** Test-Vektor-Daten liegen als separate Dateien im Repository unter `code/test_vectors/`: `rfc5869-hkdf.json`, `nist-cavp-aes-gcm-256.json`, `wycheproof-aes-gcm.json`, `wycheproof-hkdf.json`. Die Test-Files laden die Vektoren beim Test-Setup.

**Strategie für künftige Krypto-Migrationen.** Bei jeder künftigen Krypto-Migration (z. B. Schema 3 mit Argon2id-Wechsel oder HKDF-Info-String-Anpassung `vivodepot-subdepot-v2`) wird geprüft, ob neue externe Test-Vektoren relevant werden, und die Test-Suite entsprechend erweitert. Die Quellen-Auswahl bleibt erweiterbar.

**Drei ergänzende Audit-Vorbereitungs-Punkte**, aus methodischer Reflexion am 27. April 2026 nach der ursprünglichen Entscheidung zu den vier Detail-Fragen hervorgegangen:

- **Punkt 1 — Browser-Matrix-Dokumentation.** Vivodepot dokumentiert bei jedem Test-Lauf die Browser-Engine-Information (Chromium, Firefox, Safari) mit Versions-Nummer in Test-Output-Datei oder CI-Log. Die heutige Test-Ausführung läuft über Playwright mit Chromium; eine Cross-Browser-Test-Matrix mit Firefox und Safari wird als eigenständige Roadmap-Aufgabe vor v1.0-Release oder vor NLnet-Audit-Antrag aufgenommen (was zuerst eintritt). Die Drei-Zeilen-Erweiterung zur Browser-Versions-Information wird sofort in den AP-5.2-Implementierungsplan aufgenommen.
- **Punkt 2 — Sichtungs-Routine für Acceptable-Logs.** Die monatliche Schicht der Methoden-Durchlauf-Routine sichtet die Acceptable-Log-Datei mit Diff zur Vor-Monats-Version. Bei geändertem Verhalten (z. B. „akzeptiert" zu „abgelehnt" zwischen zwei Browser-Updates) wird das als Browser-Kompatibilitäts-Frühwarn-Signal im Self-Assessment dokumentiert. Verantwortung: Produktverantwortliche, monatlich, ca. 15 Minuten pro Sichtung. Output: Eintrag in `docs/self-assessment/02-security-crypto.md` oder in einer separaten Browser-Kompatibilitäts-Notiz.
- **Punkt 3 — Entropie als Plattform-Vertrauens-Annahme.** Vivodepot verlässt sich an mehreren Stellen auf `crypto.getRandomValues()` (UUID-Generierung, HKDF-Salt-Erzeugung, AES-GCM-IV-Erzeugung). Statische Test-Vektoren können diese Plattform-Eigenschaft nicht prüfen; statistische Entropie-Tests (Diehard, NIST Special Publication 800-22, TestU01) wären für Vivodepot überdimensioniert. Die Lücke wird explizit als „angenommene Stärke der Plattform" im Self-Assessment-Dokument `docs/self-assessment/02-security-crypto.md`, Abschnitt „Annahmen über die Plattform", dokumentiert, mit dem Wortlaut: „Vivodepot verlässt sich auf die Web-Crypto-API-Implementation der Browser-Engine, dass `crypto.getRandomValues()` kryptografisch starke Zufallszahlen aus dem System-Entropie-Pool liefert. Diese Eigenschaft wird nicht durch Vivodepots Test-Suite verifiziert, sondern als Plattform-Garantie angenommen. Bei einem nachgewiesenen Browser-Bug in dieser Eigenschaft wäre Vivodepots gesamte kryptografische Trennung kompromittiert."

## Konsequenzen

**Positiv.**
- Vivodepots Krypto-Schicht ist nicht mehr nur durch eigene Logik-Tests, sondern gegen drei externe, unabhängig kuratierte Quellen geprüft.
- Bei NLnet-Antrags-Begründung und institutionellen Pilotpartner-Gesprächen kann konkret benannt werden, gegen welche externen Verifikations-Schichten die Krypto-Implementation getestet ist — ein professionelles Audit-Vorbereitungs-Asset.
- Test-Vektor-Daten unter `code/test_vectors/` werden Teil des Repository-Audit-Trails und sind für NLnet-Reviewer oder Pilotpartner-Audits sofort verfügbar, ohne externe Nachlade-Abhängigkeit.
- Vorbild-Charakter für künftige Krypto-Migrationen: externe Verifikation wird zur dauerhaften Disziplin, nicht zur Einzelmaßnahme.
- Schritt in der Vorbereitung auf das NGI Zero Review-Programm; ein professioneller Krypto-Audit durch Coalition-Partner (z. B. Radically Open Security, X41 D-Sec) wird effizienter, weil auf der vorhandenen Test-Schicht aufgebaut werden kann.
- Die transparente Dokumentation der Entropie-Annahme (Punkt 3) signalisiert methodische Ehrlichkeit gegenüber NLnet-Reviewern und Pilotpartnern.

**Negativ.**
- Die Test-Suite für Task 5.2 wächst von 12 Tests (8 Klasse A) auf 16 Tests (12 Klasse A); Aufwand ca. 500–700 zusätzliche Code-Zeilen, davon ca. 200 für Test-Vektor-Daten.
- Repository-Größe wächst um wenige Megabyte.
- Laufzeit der Standard-Test-Suite wächst um geschätzt 30–60 Sekunden für die Stichproben-Tests.
- Wichtige Beschränkung: Standard-Vektor-Tests prüfen primär die Web-Crypto-API-Implementation der Ziel-Browser, nicht Vivodepots Wrapper-Logik selbst — muss transparent in Self-Assessment und NLnet-Antragsmaterial dokumentiert werden.
- Die Test-Helper-Funktion `_deriveHkdfRaw()` ist eine kleine architektonische Erweiterung, die in den Krypto-Anforderungen nicht ausdrücklich vorgesehen war und in der Umsetzung ergänzt werden muss.

**Neutral.**
- Der Vollständigkeits-Lauf aller NIST-CAVP-Vektoren läuft separat (wöchentlich/monatlich manuell) und ist nicht zeitkritisch.
- Drei zusätzliche Audit-Vorbereitungs-Punkte (Browser-Matrix, Acceptable-Log-Sichtung, Entropie-Annahme) verzahnen sich mit den vier Schichten der Methoden-Durchlauf-Routine (wöchentlich, monatlich, quartalsweise, jährlich).
- Die Cross-Browser-Test-Matrix (Firefox, Safari) wird als eigenständige Roadmap-Aufgabe vor v1.0 oder NLnet-Audit-Antrag geführt, nicht als Teil von AP 5.2.

## Vor- und Nachteile der Optionen

### Option 1: Externe Quellen als verbindliche Verifikations-Schicht integrieren (gewählt)
- **Gut:** Deckt eine Klasse von Bugs auf, die eigene Logik-Tests nicht finden — historisch dokumentierte Implementations-Schwächen, Edge-Cases bei Standard-Konformität, Browser-Crypto-API-Bugs.
- **Gut:** Professionelles Audit-Vorbereitungs-Asset für NLnet und institutionelle Pilotpartner.
- **Schlecht:** Zusätzlicher Code- und Pflegeaufwand (500–700 Zeilen), Repository-Wachstum, längere CI-Laufzeit.

### Option 2: Keine externen Test-Quellen
- **Gut:** Kein zusätzlicher Aufwand.
- **Schlecht:** Für Klasse-A-Krypto-Code ist die externe Verifikations-Schicht nicht optional — Standard-Konformität und historisch dokumentierte Schwachstellen-Klassen blieben ungeprüft.

### Option 3: Alle drei Quellen, aber nur als wöchentlicher Sicherungs-Lauf
- **Gut:** Geringere CI-Laufzeit-Belastung pro Commit.
- **Schlecht:** Standard-Konformität wird nicht bei jedem Commit verifiziert; Regressionen in der Web-Crypto-API-Verwendung könnten tagelang unentdeckt bleiben. Stichprobe in CI plus separater Vollständigkeits-Lauf (Detail-Entscheidung 2) balanciert Geschwindigkeit und Vollständigkeit besser aus.

### Detail-Entscheidung 3 — Alternative: Wycheproof „acceptable" konservativ als „abgelehnt" erwarten
- **Schlecht:** Erzeugt ein falsches Pass-Fail-Signal, weil manche „acceptable"-Vektoren von korrekten Implementationen legitim akzeptiert werden. Verworfen zugunsten der Dokumentations-Schicht ohne Pass-Fail-Bewertung.

### Detail-Entscheidung 4 — Alternative: Test-Vektoren zur CI-Laufzeit aus externen Quellen ziehen
- **Schlecht:** Macht Tests von externen Quellen abhängig — bei Offline-CI, URL-Struktur-Änderungen oder Ausfall der Quell-Server würden Tests fehlschlagen, ohne dass Vivodepots Code ein Problem hätte. Verworfen zugunsten des Repository-Eincheckens.

### Detail-Entscheidung 1 — Alternative: Test-Mode-Parameter `infoOverride` in `deriveSubKey()`
- **Schlecht:** Produktions-API-Funktionen sollten keine Test-Mode-Schalter tragen — bekannte Schwachstellen-Klasse, bei der Test-Modi versehentlich in Produktion aktiv werden. Verworfen zugunsten der separaten Test-Helper-Funktion.

## Nachweis

> „Ich möchte die Test Suite so konzipieren, dass sie wirklich sinnvoll ist und gerade für diese Sicherheitsfunktionen wirklich alles ab testet, was man so frei verfügbar kriegen kann. Wenn die Tests von extern kommen und eben nicht parallel zum Code entstehen, kann man vermutlich auch noch weitere Schwachstellen finden, die man in der Produktlogik nicht findet."
>
> — *[Entscheidungsgespräch zur Strategie externer Test-Quellen, 27. April 2026]*

> „1A, 2C, 3B, 4b"
>
> — *[Entscheidung zu den vier Detail-Fragen nach Recherche, 27. April 2026]*

Jede genannte Quelle, URL und Programm-Aussage ist durch Web-Recherche am 26./27. April 2026 verifiziert. Nicht eigenhändig verifiziert sind die genauen Konditionen kommerzieller Audit-Anbieter.

## Weiterführend

**Bezug.** B16-ADR-050 (PBKDF2-Migration), B16-ADR-052 (Sorge-Struktur, HKDF-Sub-Schlüssel), die Krypto-Architektur aus der internen Anforderungserhebung (April 2026) und eine interne Recherche zu externen Test-Quellen für die Krypto-Schicht (April 2026).

**Begleit-Dokumente.** Die Methoden-Durchlauf-Routine ist als eigenes, internes Dokument formalisiert und wird laufend gepflegt.

**Self-Assessment.** `docs/self-assessment/02-security-crypto.md` — Abschnitt „Annahmen über die Plattform" (Punkt 3) und Browser-Kompatibilitäts-Notizen (Punkt 2).

**Implementations-Aufwand.** Ca. 500–700 zusätzliche Code-Zeilen (davon ca. 200 für Test-Vektor-Daten). Erste Anwendung in Task 5.2 (Tests 5.2-A-09 bis 5.2-A-12). Implementierungsplan-Aktualisierung im Rahmen des Plan-Reviews.

**Roadmap-Element.** Cross-Browser-Test-Matrix (Firefox, Safari) vor v1.0-Release oder vor NLnet-Audit-Antrag, je nachdem was zuerst eintritt.

## Nachtrag 04.10.2026

Die Ankündigungen zum NLnet-Antrag in dieser ADR (Antragsmaterial, Audit-Antrag, Reviewer) und zum NGI-Zero-Review-Programm gelten nicht mehr. Stand: Der NLnet-Antrag (Commons Fund) wurde am 14.05.2026 eingereicht; Stand 15.09.2026: nicht entschieden.
