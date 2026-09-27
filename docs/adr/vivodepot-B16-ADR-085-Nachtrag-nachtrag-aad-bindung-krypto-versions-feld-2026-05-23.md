# B16-ADR-085-Nachtrag: AAD-Bindung der Iterations-Zahl und kryptoVersion-Feld-Allowlist

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 23.05.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** akzeptiert
- **Datum:** 2026-05-23
- **Konsultiert:** Krypto-Gutachten vom 23.05.2026 (nicht veröffentlicht)
- **Kategorien:** SICHERHEIT | ARCHITEKTUR
- **Format:** MADR 4.0 mit Vivodepot-Erweiterungen
- **Bezug:** Krypto-Gutachten 23.05.2026 Sektion 5.1 (Audit-Befund zur Try-Catch-Mechanik), Krypto-Architektur (Abschnitte AAD-Bindung und `kryptoVersion`-Feld), Architektur-Konzept v1.0 (Krypto-Abschnitte), B16-ADR-098 (Lese-App-Architektur) Punkt 3
- **Ergänzt:** B16-ADR-085 (Lese-App-Krypto-Sync auf B16-ADR-050-Stand, akzeptiert 19.05.2026)

## Kontext und Problemstellung

B16-ADR-085 hat am 19.05.2026 die Lese-App auf den B16-ADR-050-Stand (600.000 PBKDF2-Iterationen) synchronisiert und für Bestand-Übergaben aus der 200.000-Zeit einen Legacy-Pfad mit Try-Catch-Mechanik vorgesehen: Entschlüsselung versucht zuerst mit 600.000 Iterationen, bei AES-GCM-Auth-Tag-Fehler wird mit 200.000 Iterationen nachgesetzt. Erst wenn beide scheitern, sieht die Empfänger-Institution „Falsches Passwort".

Die Try-Catch-Mechanik ist im Code seit dem B16-ADR-085-Sprint umgesetzt und funktional. Die B16-ADR-085 hat ausdrücklich eine **Format-Erweiterung um ein Iterationen-Feld im Container-Header** als Alternative geprüft und verworfen — mit der Begründung „kein größerer Eingriff plus Test-Aufwand auf beiden Seiten".

Das Krypto-Gutachten vom 23.05.2026 hat in Sektion 5.1 diese Architektur-Wahl als **falsche Pragmatik** identifiziert. Die Try-Catch-Mechanik ist nicht für die heute im Code lebenden Werte (600k und 200k) ein konkretes Sicherheits-Problem — beide AES-GCM-Schlüssel sind unter den Bestand-Iterationen kryptographisch gleichwertig stark gegen Brute-Force. Aber:

— **Iterations-Zahl ist nicht kryptographisch authentifiziert.** Sie steht im Klartext-Header neben dem verschlüsselten Container. Wenn die App in einer künftigen Version „600.000 oder 1.000.000" als Try-Catch-Pfade implementiert, kann eine Angreiferin mit Schreib-Zugriff auf die Datei (kompromittiertes Cloud-Sync-Verzeichnis, manipulierte USB-Stick-Distribution) den Header so manipulieren, dass die App den schwächeren Pfad wählt. Strukturell ist die Architektur offen für künftige Iteration-Downgrade-Angriffe.

— **Try-Catch-Mechanik überträgt Audit-Komplexität.** Ein externer Krypto-Audit kann aus dem Code nicht klar ableiten, welche Iterations-Zahl tatsächlich für eine gegebene Datei verwendet wurde — die Information lebt nur im Klartext-Header, nicht im Auth-Tag-Verbund. Forensische Verifikation einer Vivodepot-Datei ist schwerer als nötig.

— **Performance-Fallback aus B16-ADR-061v3** verschärft das Problem: wenn die Performance-Fallback-Logik produktiv wird (Reduktion auf 200.000 bei langsamen Geräten), kommen ohne AAD-Bindung weitere blinde Try-Catch-Pfade hinzu.

**Drift-Klasse:** F-9 (Audit-Tauglichkeits-Drift). Eine Architektur-Wahl mit kurzfristig akzeptabler Sicherheit, die mittel- bis langfristig die Audit-Position schwächt.

**Frage:** Wie wird die Iterations-Zahl kryptographisch authentifiziert, ohne die Backward-Compat mit Bestand-Übergaben aus der 200.000-Zeit zu brechen?

## Entscheidungstreiber

- **Audit-Tauglichkeit vor v1.0-Tag.** Vivodepot v1.0 wird zum 30.05.2026 ausgeliefert. Eine Anwalts-Prüfung oder ein externer Krypto-Audit nach v1.0-Tag soll die Iterations-Zahl als kryptographisch authentifizierten Wert sehen — nicht als Klartext-Header-Aussage.
- **Backward-Compat mit Bestand-Übergaben.** B16-ADR-085-Garantie bleibt: alte QR-Codes und Dateien aus der 200.000-Zeit müssen weiter lesbar sein.
- **Konsistenz zwischen Bürger-App und Lese-App.** Was in der einen Säule kryptographisch authentifiziert wird, muss in der anderen identisch geprüft werden — B16-ADR-085-Sync-Pflicht gilt auch für die neue Header-Schicht.
- **Zukunfts-Erweiterbarkeit.** Eine künftige Iterations-Anhebung (etwa von 600.000 auf 1.000.000) soll ohne Try-Catch-Akrobatik möglich sein.
- **Korrektur falscher Pragmatik.** Die ursprüngliche B16-ADR-085-Verwerfung der Format-Erweiterung wird mit diesem Nachtrag ausdrücklich zurückgenommen. Die Format-Erweiterung ist zeilenweise umsetzbar und strukturell sauberer als die Try-Catch-Mechanik.

## Entscheidung

Drei Erweiterungen ergänzen B16-ADR-085:

### 1. AAD-Bindung der Iterations-Zahl in AES-256-GCM

Die Iterations-Zahl wird als Bestandteil der Associated Data in den AES-GCM-Auth-Tag-Verbund eingebunden. Konkret: Vor der Verschlüsselung wird ein Associated-Data-Block erzeugt mit drei Werten:

```
aad = utf8Bytes(JSON.stringify({
  kryptoVersion: <int>,
  iterationen: <int>,
  kdfTyp: "pbkdf2-sha256"
}))
```

Dieser Block wird beim AES-GCM-Encrypt als `additionalData`-Parameter mitgegeben (Web Crypto API: `crypto.subtle.encrypt({name:"AES-GCM", iv, additionalData})`). Beim Decrypt wird derselbe Block aus dem Klartext-Header rekonstruiert und ebenfalls als `additionalData` übergeben. Wenn eine Angreiferin den Klartext-Header manipuliert hat (etwa `iterationen: 600000` zu `iterationen: 200000` herabgesetzt), liefert die Re-Konstruktion einen anderen AAD-Block — der Auth-Tag-Verbund stimmt nicht mehr, die Entschlüsselung scheitert mit klarer Fehlermeldung „Datei-Integrität verletzt — möglicherweise manipuliert".

Diese Eigenschaft schließt den Iteration-Downgrade-Vektor strukturell. Eine Pilot-IT, die einen Vivodepot-Container forensisch prüft, kann aus dem Klartext-Header die deklarierte Parametrierung lesen und aus dem Auth-Tag-Erfolg ableiten, dass die deklarierte Parametrierung tatsächlich für die Verschlüsselung verwendet wurde. Beide Aussagen sind kryptographisch verkoppelt.

### 2. `kryptoVersion`-Feld mit harter Allowlist

Der Container-Header trägt ein neues Feld `kryptoVersion` (ganzzahlig). Es benennt die Kombination aus KDF-Algorithmus, KDF-Parametern, Symmetric-Algorithmus, AAD-Schema. Die Implementation kennt eine harte Allowlist:

| `kryptoVersion` | KDF | Iterationen | Symmetric | AAD-Bindung |
|---|---|---|---|---|
| 1 (legacy) | PBKDF2-SHA256 | 200.000 | AES-256-GCM, 12-Byte-IV | nur Klartext-Bindung, keine AAD |
| 2 (v1.0-Stand) | PBKDF2-SHA256 | 600.000 (mit Performance-Fallback auf 200.000) | AES-256-GCM, 12-Byte-IV | AAD mit `kryptoVersion` + `iterationen` + `kdfTyp` |

Beim Lesen: Wert nicht in Allowlist → klare Fehlermeldung „Diese Datei stammt von einer neueren oder unbekannten Vivodepot-Version. Bitte aktualisieren Sie Vivodepot."

Beim Schreiben: immer der höchste Allowlist-Wert (zum v1.0-Tag: `kryptoVersion: 2`). Spätere Versionen erweitern die Allowlist, ohne `kryptoVersion: 1` zu entfernen — Backward-Compat-Pfad bleibt offen.

### 3. Migrations-Pfad für Bestand-Übergaben

Die B16-ADR-085-Backward-Compat-Garantie wird über die `kryptoVersion`-Allowlist umgesetzt:

— **Bestand-Übergaben aus der 200.000-Zeit** tragen entweder kein `kryptoVersion`-Feld (Container vor v1.0-Tag) oder `kryptoVersion: 1`. Beide Fälle werden als `kryptoVersion: 1` interpretiert. Die Entschlüsselung läuft mit 200.000 PBKDF2-Iterationen, ohne AAD-Bindung. Die Lese-App akzeptiert solche Bestand-Übergaben weiterhin.

— **Neue Übergaben** ab v1.0-Tag tragen `kryptoVersion: 2` mit AAD-Bindung. Auth-Tag-Fehler bei manipulierten Headern wird vom Bürger als „Datei-Integrität verletzt" gesehen, nicht als „Falsches Passwort".

— **Re-Verschlüsselung beim Schreiben.** Wenn die Bürger-App ein Bestand-Depot mit `kryptoVersion: 1` öffnet und der Bürger den nächsten Speicher-Vorgang auslöst, wird der Container mit `kryptoVersion: 2`-Parametern neu verschlüsselt. Der Bestand-Migrations-Pfad ist transparent — der Bürger sieht keinen Unterschied. Bestand-Depots auf v2 zu wandern ist Lazy-Migration.

Die Try-Catch-Mechanik aus B16-ADR-085 wird durch diese Allowlist-Architektur ersetzt. Kein blindes Probieren mehr — die `kryptoVersion` im Header legt die Parameter eindeutig fest, der Auth-Tag garantiert die Bindung.

### 4. Symmetrische Implementation in Bürger-App und Lese-App

Beide Säulen tragen identische Allowlist und identische AAD-Konstruktion. B16-ADR-098 Punkt 3 verstärkt die symmetrische Drift-Prüfung: vor jedem `kryptoVersion`-Allowlist-Update wird die andere Säule mit-gepatcht. Ein Smoke-Test prüft die Konstanten-Identität (`tests/krypto/test_kryptoversion_sync.js`).

## Abgelehnte Alternativen

### Alternative 1: Status quo plus Doku-Klarstellung

Die Try-Catch-Mechanik bleibt im Code, die Krypto-Architektur-Dokumentation benennt die Iteration-Downgrade-Lücke als Audit-Punkt. Keine Code-Änderung.

**Verworfen.** Audit-Tauglichkeit wird durch reine Doku nicht hergestellt. Die strukturelle Lücke bleibt im Code; ein künftiger kommerzieller Audit würde sie als Finding zurückbringen, und die Korrektur kostet dann mehr als die jetzige zeilenweise Implementation.

### Alternative 2: Vollständige Aufgabe der Backward-Compat zu v1.0-Tag

Bestand-Übergaben aus der 200.000-Zeit werden zum v1.0-Tag nicht mehr unterstützt. Die Lese-App akzeptiert nur `kryptoVersion: 2`.

**Verworfen.** Verstößt gegen die B16-ADR-085-Vertrauens-Garantie. Eine Empfänger-Institution, die heute einen QR-Code aus der 200.000-Zeit einlesen will (etwa weil die Bürgerin den Code vor Monaten erzeugt hat), würde abgewiesen — Vertrauens-Bruch ohne Anwender-Mehrwert. Die `kryptoVersion: 1`-Akzeptanz in der Allowlist trägt die B16-ADR-085-Garantie ohne strukturellen Verlust.

### Alternative 3: Argon2id-Migration statt PBKDF2-Versions-Bump

Statt eines `kryptoVersion`-Feld-Sprungs auf 2 mit PBKDF2-AAD-Bindung wird Argon2id eingeführt.

**Verworfen.** Argon2id ist in Web Crypto API nicht nativ (Stand Mai 2026). Eine externe Argon2id-Bibliothek würde die Trusted Computing Base erweitern und die Single-File-Architektur durchbrechen. Begründung gemäß Krypto-Architektur und Krypto-Gutachten.

## Konsequenzen

### Code-Implementation vor v1.0-Tag

— **Bürger-App `code/VIVODEPOT.html`:**
  - `kryptoVersion`-Feld in Container-Header-Schema einbauen.
  - `additionalData`-Parameter in `encryptDepot`/`decryptDepot` und in `entschluesseln`/`verschluesseln` der Übergabe-Datei.
  - Allowlist-Konstante `KRYPTO_VERSION_ALLOWLIST` mit zwei Einträgen (1 legacy, 2 v1.0).
  - Lazy-Migrations-Pfad beim Speichern eines `kryptoVersion: 1`-Containers.
  - Try-Catch-Mechanik aus dem alten B16-ADR-085-Pfad entfernen (statt durch Allowlist-Lookup ersetzt).

— **Lese-App `code/vivodepot-lesen.html`:**
  - Identische `kryptoVersion`-Feld-Behandlung.
  - Identische Allowlist (symmetrisch).
  - Try-Catch-Mechanik aus B16-ADR-085 entfernen, durch Allowlist-Lookup ersetzen.

— **Tests:**
  - Klasse-A-Test für AAD-Bindung: Header-Manipulation (Iterations-Zahl im Klartext ändern) führt zu Auth-Tag-Fehler beim Decrypt.
  - Klasse-A-Test für `kryptoVersion`-Allowlist: unbekannte Version wird mit klarer Fehlermeldung abgewiesen.
  - Klasse-A-Test für Lazy-Migration: ein `kryptoVersion: 1`-Container wird beim Speichern zu `kryptoVersion: 2` upgegradet.
  - Klasse-A-Test für Backward-Compat: Bestand-Übergaben aus der 200.000-Zeit werden weiterhin entschlüsselt.
  - Klasse-A-Test für symmetrische Konstanten-Identität zwischen Bürger-App und Lese-App.

### Audit-Position

Eine externe Krypto-Audit-Kraft kann aus dem Code ablesen:

— Welche `kryptoVersion`-Werte die Implementation akzeptiert (harte Allowlist im Code, keine dynamische Konfiguration).
— Welche AAD-Felder gebunden werden (drei feste Felder, im Code dokumentiert).
— Welche Auth-Tag-Fehler zu welchen Fehlermeldungen führen (klare Zuordnung, kein stilles Schlucken).

Die Audit-Tauglichkeit ist nach diesem Nachtrag strukturell hergestellt.

### Pilot-Position

Eine Pilot-IT, die einen Vivodepot-Container forensisch prüft, kann den Klartext-Header lesen und gegen den dokumentierten Allowlist-Stand verifizieren. Wenn der Auth-Tag-Decrypt erfolgreich ist, ist die deklarierte Parametrierung kryptographisch bestätigt. Wenn der Auth-Tag-Decrypt scheitert und der Klartext-Header eine bekannte Allowlist-Version trägt, ist das ein Manipulations-Hinweis — nicht nur „Falsches Passwort".

### Performance-Fallback nach B16-ADR-061v3

Der Performance-Fallback auf 200.000 Iterationen für langsame Geräte (B16-ADR-061v3 Festlegung 3) läuft innerhalb der `kryptoVersion: 2`-Allowlist — die Iterations-Zahl im Header wird beim Schreiben auf 200.000 gesetzt, AAD-Bindung trägt die 200.000 mit. Damit ist der Performance-Fallback kryptographisch authentifiziert und nicht offen für Iteration-Downgrade-Angriffe über Header-Manipulation.

### Drift-Kontrolle und Lazy-Migration

Bestand-Depots auf v1 werden über die Allowlist akzeptiert; Lazy-Migration auf v2 läuft beim ersten Schreib-Vorgang transparent. Die Bestand-Migrations-Statistik wird in `BACKLOG.md` als Stand-Beobachtung geführt — wenn alle bekannten Pilot-Sticks auf v2 migriert sind, kann v1 in einer späteren Version aus der Allowlist entfernt werden (frühestens v1.5, mit eigener ADR).

## Anschluss-Aufgaben

— Code-Implementation der vier Punkte oben in `code/VIVODEPOT.html` und `code/vivodepot-lesen.html`.
— Test-Suite-Erweiterung mit den fünf Klasse-A-Tests.
— Die Krypto-Architektur-Dokumentation ist bereits konsistent — sie beschreibt AAD-Bindung und `kryptoVersion`-Feld.
— Das Architektur-Konzept v1.0 ist bereits konsistent.
— B16-ADR-085-Aktualisierung: am Anfang des B16-ADR-085 wird ein „Aktualisiert durch B16-ADR-085-Nachtrag vom 23.05.2026"-Hinweis ergänzt.
— INDEX.md-Eintrag für B16-ADR-085-Nachtrag.

## Verifikations-Anker

| Aussage | Quelle |
|---|---|
| Try-Catch-Mechanik ist Iteration-Downgrade-anfällig | Krypto-Gutachten 23.05.2026 Sektion 5.1 |
| Format-Erweiterung war ursprünglich falsche Pragmatik | Krypto-Gutachten 23.05.2026 Sektion 5.1 letzter Absatz |
| AAD-Bindung als strukturelle Lösung | Krypto-Architektur, Abschnitt AAD-Bindung |
| `kryptoVersion`-Feld mit Allowlist | Krypto-Architektur, Abschnitt `kryptoVersion`-Feld |
| Performance-Fallback-Authentifizierung | B16-ADR-061v3 Festlegung 3, Krypto-Gutachten 2.2 |
| Lese-App-Konsistenz | B16-ADR-098 Punkt 3 |
| Web-Crypto-`additionalData`-Parameter | Web Crypto API W3C-Spec |

---

*Stand 23. Mai 2026. Ergänzt B16-ADR-085 vom 19.05.2026 um AAD-Bindung der Iterations-Zahl und `kryptoVersion`-Feld-Allowlist. Code-Implementation vor v1.0-Tag (30.05.2026) ist in den Anschluss-Aufgaben benannt. Bei einer künftigen ADR-Format-Konsolidierung (Sprint V8.1) wird dieser Nachtrag entweder als eigener ADR-Eintrag weitergeführt oder in den B16-ADR-085-Haupttext integriert; aktuell ist er als eigenständige Markdown-Datei lesbar.*
