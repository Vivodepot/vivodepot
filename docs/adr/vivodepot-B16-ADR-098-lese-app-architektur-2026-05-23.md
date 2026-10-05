# B16-ADR-098 · Lese-App-Architektur

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 23.05.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


**Status:** akzeptiert
**Datum:** 23. Mai 2026
**Autorinnen:** Produktverantwortliche
**Anschluss-ADRs:** B16-ADR-014 (Lese-App eigenständig), B16-ADR-050 (Krypto-Architektur-Fundament), B16-ADR-061v3 (Notfall-Cache-Konsolidierung), B16-ADR-063 (FHIR-Provenance-Mapping), B16-ADR-064 (Beziehungs-Codierung), B16-ADR-082 (Test-Schlüssel-Bypass-Entfernung), B16-ADR-084 (Lese-Datei-Provenance-Anzeige), B16-ADR-085 (Lese-App-Krypto-Sync mit B16-ADR-050)
**Verweise:** Architektur-Konzept v1.0, Krypto-Architektur, interne Krypto-Durchsicht vom 23.05.2026 (nicht veröffentlicht), Produkt-Abstimmung und technische Verifikation vom 23.05.2026

---

## Kontext

Vivodepot hat eine Vier-Säulen-Architektur (Architektur-Konzept). Säule 2 — die Lese-App in `code/vivodepot-lesen.html` — ist die schlanke Begleit-Anwendung für die Empfangs-Seite einer Bürger-zu-Institution-Übergabe. Sie liest verschlüsselte Weitergabe-Dateien und QR-Codes der Bürger-App, zeigt die freigegebenen Felder mit Herkunfts-Information, speichert nichts.

Bis zum 23.05.2026 lebte die Lese-App im Code (1.240 Zeilen, letzter Commit vom 22.05.), aber ohne eigene ADR-Verankerung und ohne dediziertes Test-Suite-Scope. B16-ADR-014 hatte die Eigenständigkeit beschlossen, B16-ADR-084 hat die Provenance-Anzeige spezifiziert, B16-ADR-085 hat die Krypto-Sync-Pflicht festgelegt — eine integrierende ADR für die Lese-App als Säule fehlte.

Eine Prüfung in drei Durchgängen vom 23.05.2026 (technische Verifikation, UX-Abstimmung, Produkt-Abstimmung) hat die fehlende ADR-Verankerung übereinstimmend als Klasse-A-Befund vor dem v1.0-Tag benannt. Die Produkt-Abstimmung hat sie als „markanteste Anwalts-Schwäche des aktuellen Stands" benannt. Diese ADR schließt die Lücke.

---

## Entscheidung

Die Lese-App ist als eigenständige Säule mit sieben verbindlichen Architektur-Eigenschaften definiert.

### 1. Adressat und Nutzungs-Kontext

Die Lese-App richtet sich an Institutionen, die einmalig eine Bürger-Übergabe lesen — Arztpraxis, Klinik, Beratungsstelle, Behörde, Notariat, Bank. Sie installieren nichts, halten keine Daten, verlangen keinen Account.

Die Lese-App ist nicht für Bürger gedacht und nicht für wiederkehrende Verwendung in derselben Institution. Wiederkehrende Bürger-Übergaben in einer Pflegeheim-Beziehung laufen über das Pflegeheim-eigene System (gegebenenfalls über ein FHIR-IPS-Bundle, das von der Lese-App in das Pflegeheim-System importiert wird), nicht über wiederholten Lese-App-Einsatz.

### 2. Empfangs-Pfad

Die Lese-App nimmt drei Empfangs-Formate an:

— **Verschlüsselte Weitergabe-Datei** (`.vivodepot.weitergabe`). Die Bürger-App erzeugt diese Datei beim „Daten weitergeben"-Pfad (Welcome-Schicht 4 gemäß Architektur-Konzept). Sie ist mit einem Übergabe-Passwort verschlüsselt, das auf einem separaten Kanal mitgegeben wird (mündlich, SMS, Telefon, ausgedruckter Hinweis).

— **QR-Code mit eingebettetem Schlüssel** für kleine Datensätze. Die Bürger-App erzeugt einen oder mehrere QR-Codes, die die Lese-App per Kamera einscannt.

— **VPRequest-Antwort-Format** für strukturierte Antworten auf eine institutionelle Anfrage (Architektur-Konzept, B16-ADR-096 EUDIW-SD-JWT-Pfad).

Pro Empfangs-Format führt die Lese-App die Krypto-Schicht-Verifikation gemäß B16-ADR-085 durch (siehe 3) und stellt nur die Daten dar, die das Übergabe-Format explizit freigegeben hat.

### 3. Krypto-Sync-Pflicht zur Bürger-App

B16-ADR-085 ist die Präzedenz-ADR für die Krypto-Sync zwischen Bürger-App und Lese-App. Diese B16-ADR-098 verstärkt B16-ADR-085 um die folgenden Pflichten:

— **`LESE_FORMAT_VERSION_AKTUELL`** als verbindliche Versions-Konstante in beiden Säulen (Bürger-App und Lese-App). Beide Säulen tragen die identische Konstante; ein Update einer Säule ohne synchrones Update der anderen ist eine Drift-Stelle, die im Smoke-Test geprüft wird.

— **`kryptoVersion`-Feld-Allowlist** (Krypto-Architektur). Die Lese-App akzeptiert nur Weitergabe-Dateien mit `kryptoVersion`-Werten aus ihrer eigenen Allowlist. Höhere Werte führen zu klarer Fehlermeldung („Diese Datei stammt von einer neueren Vivodepot-Version. Bitte aktualisieren Sie die Lese-App.").

— **AAD-Bindung der Iterations-Zahl** in der Übergabe-Datei-Verschlüsselung — analog zur Bürger-App-Container-Verschlüsselung (Krypto-Architektur). Header-Manipulationen werden vom Auth-Tag erkannt.

— **JWS-Header-Allowlist** für signierte Templates und Provenance-Resourcen in Weitergabe-Dateien. `alg`-Werte aus Ed25519 plus ES256, kein `alg=none`. `kid`-Bindung an statisch eingebetteten Trust-Authority-Public-Key. Code-Audit-Schritt für `_verifyJWS` in der Lese-App parallel zum Bürger-App-Audit (siehe B16-ADR-082-Folge-Aufgabe).

— **Symmetrische Drift-Prüfung.** Vor jedem Schema-Bump in einer der beiden Säulen wird die andere Säule mit-gepatcht. Beide Säulen liegen im selben Repo (`code/VIVODEPOT.html` und `code/vivodepot-lesen.html`), die Verifikations-Disziplin prüft die symmetrische Anpassung.

### 4. Speicher-Verhalten als architektonische Eigenschaft

Die Lese-App **speichert nichts** im Browser-LocalStorage, IndexedDB, sessionStorage oder anderen persistenten Speichern. Diese Aussage ist nicht UI-Versprechen, sondern architektonische Eigenschaft: der Code enthält keine `localStorage.setItem`-Aufrufe, keine `IndexedDB.put`-Aufrufe, keine andere persistente Schreib-Operation. Test-Pfad (siehe 6) prüft diese Eigenschaft mit Klasse-A-Status.

Was die Lese-App während der Session im JavaScript-Heap hält:

— **Die entschlüsselte Weitergabe-Datei** für die Dauer der Anzeige-Session. Nach Tab-Schließen ist der Heap entladen.
— **Den abgeleiteten Symmetric-Schlüssel** als CryptoKey mit `extractable: false`. Nicht aus JavaScript heraus exportierbar.
— **Das eingegebene Übergabe-Passwort** als String, der nach erfolgreicher Ableitung explizit überschrieben (`fill(0)`) und auf `null` gesetzt wird (analog Bürger-App-Disziplin, Krypto-Architektur).

Was die Lese-App **nicht** macht:

— Kein Caching der Weitergabe-Datei.
— Kein Audit-Log persistent (alle Audit-Spuren werden vom Empfänger-System der Institution erfasst, nicht von der Lese-App).
— Kein Tracking, keine Analytics, keine Telemetrie.

Diese Disziplin ist DSGVO-Architektur-Anker: die Lese-App ist nicht Verarbeitungs-Stelle gemäß Art. 4 Nr. 7, weil sie strukturell keine Verarbeitung im Sinne der DSGVO durchführt (kein Speichern, kein Übertragen an Dritte, nur Anzeigen für die einlesende Person). Die Verantwortlichkeit für die anschließende Verarbeitung liegt bei der Institution, die die Lese-App nutzt.

### 5. Lizenz-Position

Die Lese-App wird unter **EUPL-1.2** lizenziert — identisch zur Bürger-App. Begründung und vollständige Lizenz-Architektur im Architektur-Konzept v1.0, Abschnitt „Lizenz- und IP-Architektur" (Phase 2, nach der rechtlichen Konsolidierung).

Die Lese-App enthält keine BUSL-1.1-lizenzierten Templates (Templates leben in der Bürger-App, die Lese-App rendert sie nur als Daten). Keine Doppel-Lizenz-Konstellation in der Lese-App selbst.

Eingebettete Dritt-Bibliotheken in der Lese-App: vermutlich eine Teilmenge der Bürger-App-Bibliotheken (jsQR für QR-Scan, eventuell jsPDF für PDF-Anzeige). SBOM-Pflege synchron zur Bürger-App, eigener Eintrag in `docs/sbom/sbom.cdx.json` mit Komponenten-Liste pro Säule.

### 6. Test-Scope

Die Lese-App bekommt eigene Test-Pfade vor v1.0-Tag:

— **Roundtrip-Tests.** Bürger-App erzeugt eine Weitergabe-Datei mit einem definierten Test-Inhalt, Lese-App liest sie ein, prüft die Felder-Sichtbarkeit gegen die Erwartung. Pro Weitergabe-Format (`.vivodepot.weitergabe`, QR, VPResponse) ein eigener Roundtrip-Test.

— **Krypto-Sync-Verifikation.** Test prüft, dass die `LESE_FORMAT_VERSION_AKTUELL`-Konstante in Bürger-App und Lese-App identisch ist. Bei Drift: Test-Fail mit klarer Meldung („Bürger-App-Version X, Lese-App-Version Y — symmetrischer Patch fehlt").

— **Herkunfts-Anzeige-Test.** Lese-App rendert für jede gelesene Datei den Provenance-Block (B16-ADR-063, B16-ADR-084) mit Eingabe-Datum, Anker-Person, Vollmacht-Grundlage bei Sub-Depot-Übergaben.

— **Sub-Depot-Übergabe-Test.** Eine Weitergabe-Datei, die aus einem Depot unter Vollmacht stammt, wird von der Lese-App gelesen — der Provenance-Block zeigt zwei Akteurs-Schichten (Anker-Person plus Sub-Depot-Inhaberin) mit der Vollmacht-Grundlage gemäß FHIR-Provenance Sprint-7b-Erweiterung.

— **Speicher-Disziplin-Test.** Nach Lese-Session wird `localStorage`, `sessionStorage`, `IndexedDB` geprüft — die Lese-App hat keine Einträge hinterlassen. Klasse-A-Status.

— **JWS-Header-Allowlist-Test.** Lese-App-Verifikation prüft `alg`-Werte, `kid`-Bindung, lehnt `alg=none` ab. Klasse-A-Status.

— **AAD-Bindung-Test.** Manipulation des Klartext-Headers (`iterationen`-Zahl, `kryptoVersion`) führt zu Auth-Tag-Fehler. Klasse-A-Status.

Test-Pfade liegen unter `tests/lese/` als eigenes Suite-Verzeichnis. Bisherige E2E-Pfade in `tests/e2e/user_journey_lesen_provenance.spec.js` bleiben.

### 7. Versions-Konstante und Schnittstellen-Versionierung

Die Lese-App führt drei Versions-Konstanten parallel:

— **`LESE_APP_VERSION`** — interne Versions-Nummer der Lese-App selbst. Wird mit jedem Lese-App-Release inkrementiert.
— **`LESE_FORMAT_VERSION_AKTUELL`** — die Schnittstellen-Versions-Achse zur Bürger-App. Identisch in Bürger-App und Lese-App.
— **`kryptoVersion`-Allowlist** — die Krypto-Versions-Achse gemäß Krypto-Architektur

Bei Versions-Unterschieden gilt die Versions-Regel des Architektur-Konzepts: jüngere Säulen lesen ältere Schnittstellen-Formate; ältere Säulen lehnen jüngere Formate explizit ab; kein stilles Verarbeiten.

---

## Konsequenzen

### Operativ vor v1.0-Tag

— **Test-Suite-Erweiterung.** Verzeichnis `tests/lese/` mit den sieben Test-Klassen aus 6.
— **Krypto-Sync-Verifikation.** B16-ADR-085-Mechanik aktualisiert um `kryptoVersion`-Allowlist und AAD-Bindung (siehe B16-ADR-085-Nachtrag).
— **JWS-Header-Audit in `_verifyJWS` der Lese-App.** Parallel zum Bürger-App-Audit gemäß B16-ADR-082-Folge-Aufgabe.
— **SBOM-Eintrag pro Säule** in `docs/sbom/sbom.cdx.json` mit Komponenten-Liste.
— **Lizenz-Header in `code/vivodepot-lesen.html`** mit EUPL-1.2-Verweis.

### Anwalts-Position

Die Lese-App ist mit dieser ADR strukturell verankert — Adressat, Lizenz, Speicher-Verhalten, Krypto-Sync, Test-Scope sind dokumentiert. Eine Rechtsberaterin, die die Anwalts-Prüfung durchführt, findet die Lese-App-Position als eigenständige ADR im INDEX.md und muss nicht aus B16-ADR-014, B16-ADR-084 und B16-ADR-085 rekonstruieren.

### Pilot-Position

Eine Pilotpartnerin, die Bürger-Übergaben empfängt, erhält mit der Lese-App ein Werkzeug ohne Installations-Aufwand, ohne Daten-Verantwortung über die unmittelbare Lese-Session hinaus, ohne Lizenz-Kosten. Die Speicher-Disziplin schließt DSGVO-Architektur-Risiken auf Empfänger-Seite strukturell aus.

### Lizenz-Konsequenz

EUPL-1.2 für die Lese-App ist konsistent mit der Bürger-App. Eine Institution, die die Lese-App als Open-Source-Komponente nutzt und in eigene Workflows integriert, fällt unter die EUPL-Bedingungen. Die Marke „Vivodepot" ist von der Lizenz nicht umfasst (EUPL Art. 10) — ein Fork darf nicht „Vivodepot" heißen.

### Anschluss an White-Label-Architektur

Die Lese-App nimmt keine White-Label-Anbieter-Konfiguration. Eine Pilotpartnerin sieht die Vivodepot-Lese-App immer im Vivodepot-Standard-Branding. White-Label gilt für die Bürger-App (Architektur-Konzept), nicht für die Lese-App.

---

## Anschluss-Aufgaben

— **B16-ADR-085-Nachtrag** mit AAD-Bindung der Iterations-Zahl und `kryptoVersion`-Feld-Integration.
— **JWS-Header-Audit-Bericht** für `_verifyJWS` der Lese-App.
— **`tests/lese/`-Suite-Anlegen** mit sieben Test-Klassen.
— **SBOM-Eintrag** pro Säule.
— **Lese-App-Versions-Konstante `LESE_APP_VERSION`** im Code definieren (falls noch nicht vorhanden).
— **INDEX.md-Eintrag** für B16-ADR-098.

---

## Verifikations-Anker

| Aussage | Quelle |
|---|---|
| Adressaten-Schnitt | Architektur-Konzept, B16-ADR-014, Produkt-Abstimmung |
| Drei Empfangs-Formate | Architektur-Konzept (Welcome-Schicht 4), B16-ADR-096 |
| Krypto-Sync B16-ADR-085-Erweiterung | B16-ADR-085, Krypto-Architektur, interne Krypto-Durchsicht |
| AAD-Bindung | Krypto-Architektur, interne Krypto-Durchsicht |
| JWS-Header-Allowlist | Krypto-Architektur (Mitigation), interne Krypto-Durchsicht, B16-ADR-082 |
| Speicher-Verhalten als DSGVO-Anker | Architektur-Konzept, Datenschutz-Architektur (Phase 3, nach der rechtlichen Prüfung) |
| EUPL-1.2-Lizenz | Architektur-Konzept (Phase 2, nach der rechtlichen Konsolidierung), rechtliche Erstprüfung |
| Sieben Test-Klassen | Produkt-Abstimmung, technische Verifikation |
| Versions-Konstante | B16-ADR-089, Architektur-Konzept |

---

*Stand 23. Mai 2026. Vor v1.0-Tag (30.05.2026) sind die fünf operativen Konsequenzen umzusetzen. Eine künftige ADR-Format-Konsolidierung (Sprint V8.1) wird diese Markdown-Spur als autoritativ bestätigen; eine HTML-Vervollständigung folgt nur, wenn eine externe Zielgruppe sie braucht.*

---

## Nachtrag (2026-07-12) — passwortloser Notfall-Cache-Pfad entfernt (U2-ADR-078)

Der passwortlose Stufe-1-Cache ist ersatzlos entfernt (U2-ADR-078). In der Lese-App entfällt damit der passwortlose File-Cache-Lesepfad (`notfallCacheAusUmschlag` + Notfall-Knopf in der Passwort-Sicht): ein zugesandtes Voll-Depot wird nur noch mit dem Übergabe-Passwort geöffnet — konsistent mit Punkt 2 (Empfangs-Pfade sind passwort-/schlüssel-geschützt). Der davon getrennte QR-Notfall-Parser (`parseNotfallQrText`) ist seit U2-ADR-077 toter Code und bleibt für einen separaten U2-ADR-077-Folge-Schnitt stehen. Details: `docs/adr/vivodepot-U2-ADR-078-ruecknahme-stufe1-cache-2026-07-12.md` (cleanslate).

## Nachtrag 04.10.2026

Die Krypto-Durchsicht vom 23.05.2026 war intern. Frühere Fassungen dieses ADR bezeichneten sie so,
dass sie als externe Prüfung gelesen werden konnte; die Benennung ist korrigiert. An Befund und
Entscheidung ändert sich nichts.
