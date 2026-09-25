# Vivodepot · Security-Dokument

**Versions-Stand:** v1.0.0
**Verantwortliche Stelle:** Vivodepot GmbH, Berlin
**Anschluss:** ADR-085 mit Nachtrag vom 23.05.2026, ADR-098 (Lese-App)

---

## Vorbemerkung

Dieses Dokument trägt die für Vivodepot v1.0 verbindlichen Sicherheits-Anker: Schlüssel-Information der Vivodepot Trust-Authority, Geltungsdauer, Verifikations-Pfade, Schwachstellen-Meldepfad. Es ist verbindlich für jede sicherheitsrelevante Aussage gegenüber Pilotpartnern und Bürgern.

Wer das Repository als Bürger, Pilotpartner, Rechtsberaterin oder Sicherheits-Auditor öffnet, findet hier die zentralen Sicherheits-Aussagen. Bei Konflikt zwischen Aussagen in diesem Dokument und Aussagen in einer ADR gilt: die ADR ist für Architektur-Entscheidungen verbindlich; dieses Dokument trägt die operativen Sicherheits-Anker und ist verbindlich für Schlüssel-Information und Meldepfade.

---

## 1 · Vivodepot Trust-Authority — Public-Key

Der öffentliche Schlüssel der Vivodepot Trust-Authority signiert alle Vivodepot-zertifizierten Templates (Säule 3 → Säule 4 → Säule 1) und alle Vivodepot-zertifizierten Anbieter-Konfigurationen (White-Label-Bereich).

**Algorithmus:** Ed25519 (primär), ES256 (Fallback für Empfänger-Säulen, die Ed25519 nicht unterstützen)

**Schlüssel-Identifier (`kid`):** `vivodepot-trust-authority-v2-22082026` *(Code-Quelle: `vivodepot.html` Konstante `TRUST_AUTHORITY_PUBLIC_JWK`, Feld `kid`. Anker-Rotation 23.08.2026 — der vorige Anker `vivodepot-trust-authority-v1-11052026` galt als kompromittiert und wurde ersetzt.)*

**Fingerprint (RFC-7638 JWK-Thumbprint, base64url):** `5gB8k3ITpqvDwldkESy9vewQU03F6ddv8UHx3bOAVOs` *(SHA-256 über die kanonisch sortierten Pflicht-Member des öffentlichen Schlüssels; im Code als Anbieter-Identifier verwendet, reproduzierbar über die App-Funktion `_jwkThumbprint(TRUST_AUTHORITY_PUBLIC_JWK)`.)*

**Geltungsdauer:** Der Trust-Authority-Anker ist die Vertrauens-Wurzel und trägt selbst kein Ablaufdatum; er ist über seine Schlüssel-Version identifiziert (`kid: vivodepot-trust-authority-v2-22082026`, erzeugt 22.08.2026). Zeitlich begrenzt sind die von ihm **autorisierten Zertifikate**, nicht die Wurzel: externe Anbieter-Zertifikate 18 Monate (Abschnitt 3), eingebettete amtliche Zertifikate 120 Monate (BMJ/BzgA, gültig bis 23.08.2036), der Ausgabestellen-Zertifikat der Zwischenstufe (U2-ADR-146) 12 Monate. Eine Anker-Rotation erfolgt durch Neuausgabe unter einer neuen Schlüssel-Version in einem neuen Release (Mechanik in Abschnitt 3).

**Schlüssel-Generierung:** offline, durch Vivodepot-Operatorin, in Cold-Storage gehalten.

**Verwendungs-Pfad:** ausschließlich zur Verifikation in den Säulen 1 (Bürger-App) und 2 (Lese-App) eingebettet. Die Säule 4 (VC-Issuer) hält den korrespondierenden Privat-Schlüssel ausschließlich offline.

---

## 2 · Verifikations-Pfade (Multi-Quelle)

Die Authentizität des Trust-Authority-Schlüssels kann an mehreren, voneinander unabhängigen Stellen verifiziert werden. Wer den in der Vivodepot-Datei eingebetteten Public-Key gegen den hier publizierten Fingerprint quervergleicht, hat eine starke Garantie, dass die Datei nicht manipuliert wurde.

### 2.1 Repository

Diese `SECURITY.md` trägt den Fingerprint (Abschnitt 1). Wer ihn gegen den in der Vivodepot-Datei eingebetteten Schlüssel hält, prüft beide gegeneinander. Signierte Release-Tags gibt es noch nicht; sobald es sie gibt, steht hier, womit sie geprüft werden.

### 2.2 Prüfsummen je Fassung

Die Prüfsummen jeder ausgelieferten Fassung stehen auf der Versionsseite (folgt) und in [Abschnitt 8](#8--fingerabdruck-je-fassung) dieser Datei.

### 2.3 Handelsregister-Bezug

Die Vivodepot GmbH ist beim Amtsgericht Charlottenburg (Berlin) unter **HRB 289273 B** eingetragen. Das ist kein Fingerprint-Verifikations-Pfad im Sinne von 2.1/2.2 — das Handelsregister publiziert keine kryptographischen Prüfsummen. Es ist eine davon unabhängige Instanz für eine andere Frage: dass hinter diesem Schlüssel eine real existierende, eingetragene juristische Person steht, prüfbar unabhängig davon, ob Vivodepots eigene Infrastruktur (Repository, Homepage) kompromittiert ist. Die Eintragung ist über das öffentliche Unternehmensregister (`https://www.unternehmensregister.de`) einsehbar.

### 2.4 Was bei abweichendem Fingerprint zu tun ist

Wer Templates oder Anbieter-Konfigurationen sieht, die mit einem Schlüssel signiert wurden, der nicht zu diesem Fingerprint passt, meldet das an die Schwachstellen-Meldestelle (Abschnitt 4). Eine abweichende Signatur kann auf eine kompromittierte Vivodepot-Datei oder einen kompromittierten Anbieter hinweisen — beides ist sicherheits-kritisch.

---

## 3 · Schlüssel-Rotation und künftige Versionen

### 3.1 Geplante Rotation

Eine geplante Rotation des Trust-Authority-Schlüssels wird über eine SECURITY.md-Veröffentlichung mit neuer Fingerprint-Zeile angekündigt. Eine Übergangs-Spur enthält:

— Datum der Rotation
— Neuer Public-Key-Fingerprint
— Alter Public-Key-Fingerprint (bleibt als historischer Anker verifizierbar)
— Zeitraum, in dem alte und neue Schlüssel parallel akzeptiert werden (typischerweise 6 Monate)
— Signatur-Übergangs-Beleg: ein mit dem alten Schlüssel signiertes Statement, das den neuen Schlüssel autorisiert

### 3.2 Außerordentliche Rotation bei Schlüssel-Kompromittierung

Wenn der Trust-Authority-Privat-Schlüssel kompromittiert wird, ist eine Schlüssel-Rotation strukturell **nicht über die App selbst lösbar**. Der Public-Key ist in jeder ausgelieferten Vivodepot-Datei eingebettet; eine App-interne Schlüssel-Rotation wäre nur über eine Online-Verbindung möglich, die Vivodepot architektonisch ausschließt.

Die Mitigation läuft über die Verifikations-Pfade aus Abschnitt 2: Die Vivodepot GmbH veröffentlicht die Kompromittierung über Repository, Homepage und PGP-Signatur, und bittet die Anwender, eine neue Vivodepot-Version zu laden. Bürger und Pilotpartner, die ihre Vivodepot-Version nicht aktualisieren, bleiben verwundbar bis zur Aktualisierung.

Die zeitlich begrenzte Anbieter-Zertifikat-Geltungsdauer (18 Monate, U2-ADR-038) ist eine zusätzliche Mitigation: ein kompromittiertes Anbieter-Zertifikat verfällt spätestens nach 18 Monaten von selbst.

---

## 4 · Schwachstellen-Meldepfad

Schwachstellen werden an folgende Stelle gemeldet:

— **E-Mail:** `security@vivodepot.de`
— **PGP-Schlüssel:** Datei `docs/security/pgp-pubkey.asc` (Fingerprint: `30FB 9B42 7F12 095D 317B 4485 F527 3B32 959A 7D42`)
— **Reaktions-Zeit:** Erste Bestätigung innerhalb von 72 Stunden. Eine begründete erste Einschätzung innerhalb von 14 Tagen.
— **Offenlegungs-Politik:** Coordinated Disclosure. Veröffentlichung der Schwachstelle nach Bereitstellung einer Mitigation, in Abstimmung mit der meldenden Person. Bei kritischer Schwachstelle ohne Mitigation: Veröffentlichung mit Warnung an Pilotpartner spätestens 90 Tage nach Meldung.

### 4.1 Was als Schwachstelle gemeldet werden soll

— Manipulationen der Vivodepot-Datei, die zu fremden Trust-Authority-Schlüsseln führen
— Unerwartete Verhaltens-Abweichungen in der Krypto-Schicht (etwa: Entschlüsselungs-Erfolge bei manipulierten Headern, JWS-Signaturen, die fälschlich akzeptiert werden)
— Schwächen in der Schlüssel-Verwaltung (etwa: extrahierbare Schlüssel, die in der Architektur als `extractable: false` markiert sind)
— Lecks im Notfall-Cache-Pfad (Stufe 1 oder Stufe 2)
— Übergabe-Datei-Schwachstellen, die zu unerwarteten Daten-Lecks bei der Empfänger-Institution führen
— SBOM-Inkonsistenzen, die auf eine nicht-deklarierte Dritt-Bibliothek hinweisen

### 4.2 Was nicht in den Schwachstellen-Pfad gehört

Allgemeine UX-Mängel, Feature-Wünsche, Dokumentations-Verbesserungen werden im Repository als reguläre Issues geführt, nicht über den Schwachstellen-Pfad.

---

## 5 · Cyber Resilience Act-Bezug

Der Cyber Resilience Act (Regulation EU 2024/2847) trägt **zwei** Anwendungsdaten, nicht eines:

- **11.09.2026 — Meldepflicht** (CRA Art. 14): die Vivodepot GmbH meldet aktiv ausgenutzte
  Schwachstellen und schwerwiegende Sicherheitsvorfälle mit Produktwirkung an das BSI als
  koordinierendes CSIRT (technisch eingereicht über die ENISA-Meldeplattform), nach einem
  festgelegten internen Meldeprozess.
- **11.12.2027 — Vollständige Konformitätspflicht**: Konformitäts-Bewertung nach Modul A,
  CE-Kennzeichnung. Wird in einem separaten Konformitäts-Dokument vor diesem Datum ergänzt.

Diese `SECURITY.md` ist die strukturelle Vorbereitung der CRA-Schwachstellen-Annahme-Pflicht
(CRA Art. 13 ff.) — der Meldeprozess selbst lebt im verlinkten Runbook, nicht hier.

Die SBOM (`vivodepot.sbom.cdx.json`, CycloneDX-Format) ist bereits CRA-vorbereitet und wird bei
jedem Release aktualisiert.

**Unterstützungszeitraum.** Jede Fassung von Vivodepot erhält mindestens fünf Jahre
Sicherheitsaktualisierungen ab dem Tag, an dem sie herauskommt; jede Aktualisierung bleibt danach
mindestens zehn Jahre abrufbar. Da die Anwendung offline arbeitet, ohne Dienst auskommt und unter
EUPL-1.2 steht, bleiben Depot-Dateien auch nach dem Ende der Unterstützung lesbar und exportierbar,
und die Anwendung darf von Dritten weitergeführt werden. Einzelheiten:
`docs/cra/supportzeitraum-und-eol.md`.

---

## 6 · Strukturelle Restrisiken der Anwendungsklasse

Vivodepot ist eine Single-File-Offline-Browser-Anwendung. Drei Befunde sind in dieser Anwendungsklasse strukturell nicht durch Code-Änderung lösbar. Sie werden hier explizit benannt.

### 6.1 Supply-Chain-Manipulation der HTML-Datei

Browser haben keine native Code-Signing-Validierung für HTML. Wenn die `vivodepot.html` zwischen Distribution und Bürger-Einsatz manipuliert wird (kompromittierte Webseite, manipulierter Stick im Vertriebsweg, manipulierte Mail-Anlage), kann ein Angreifer den eingebetteten Trust-Authority-Pubkey austauschen. Mitigation läuft über die Verifikations-Pfade aus Abschnitt 2 (Hash-Vergleich, Multi-Quellen-Verteilung, Pilot-IT-Verifikation der Charge) plus diese SECURITY.md selbst — wer den Fingerprint hier prüft, hat einen Anker außerhalb der Datei.

### 6.2 Schlüssel-Rotation bei Kompromittierung

Siehe Abschnitt 3.2.

### 6.3 Passphrase-Stärke-Schätzung beim Erst-Setup

Vivodepot prüft beim Master-Passwort-Setup die Länge (≥ 8 Zeichen) und berechnet einen einfachen Score (Zeichenklassen-Mix). Eine vollständige Offline-Stärke-Schätzung wie zxcvbn ist nicht eingebettet. Das ist ein strukturelles Restrisiko: Bürger können semantisch schwache Passwörter wählen (z. B. häufige Wörter), die der Score-Check nicht erkennt. Mitigation: Hinweis-Text beim Setup empfiehlt mind. 12 Zeichen mit Groß-/Kleinbuchstaben, Ziffern und Sonderzeichen. Eine zxcvbn-Integration ist für eine spätere Release-Iteration vorgesehen.

### 6.4 Standard-Template-Signierung

Die vier Vivodepot-Standard-Templates (Patientenverfügung, Betreuungsverfügung, Vorsorgevollmacht, Organspende) sind **treuhänderisch durch die Trust-Authority signiert** (Privat-Schlüssel aus dem Cold-Storage) und tragen jeweils eine eingebettete Signatur. Die Bürger-App prüft jede Vorlage beim Laden gegen den eingebetteten Trust-Authority-Anker (Fingerprint aus Abschnitt 1); nur gültig signierte Vorlagen werden als amtlich geführt — unsigniert oder abweichend signierte Vorlagen werden **verworfen**. Die amtlichen Aussteller-Zertifikate (Bundesministerium der Justiz, Bundeszentrale für gesundheitliche Aufklärung) sind eingebettet.

### 6.5 Memory-Hygiene in JavaScript

JavaScript-Engines (V8, SpiderMonkey) erstellen intern Kopien von Strings und halten sie im Heap. Explizites Überschreiben eines Passwort-Strings (`str = '\x00'.repeat(str.length)`) hat keine kryptographische Garantie: der Garbage-Collector kann die ursprüngliche Kopie noch eine unbestimmte Zeitspanne vorhalten, und `ArrayBuffer`/`Uint8Array`-Fills (`key.fill(0)`) wirken nicht rückwirkend auf bereits erzeugte String-Kopien.

**Speicher-Hygiene implementiert:**

— Kurze Schlüssel-Lebenszeiten: Passwort-Strings werden nur für die Dauer der PBKDF2-Ableitung gehalten, danach gibt die Funktion die lokale Variable auf.
— Tab-Schließen löscht den Schlüssel: `beforeunload`-Handler leert `_root` und alle Cache-Slots.
— Sensitive Operationen in isolierten Funktions-Scopes: `deriveKey()` und `decryptData()` sind eigenständige async-Funktionen; lokale Variablen gehen nach `return` aus dem Stack.

**Keine kryptographische Garantie:** Ein Angreifer mit physischem Speicher-Zugriff (RAM-Dump, Sleep-Image) kann trotzdem auf Reste stoßen.

**Mitigation für Bürgerinnen:** Browser-Tab nach Nutzung schließen. Bei besonders sensiblen Operationen (Erst-Setup, Passwort-Änderung) Browser-Tab danach neu starten.

---

## 7 · Geltungs- und Verbindlichkeits-Hinweis

Dieses Dokument ist verbindlich für die in Vivodepot v1.0 ausgelieferten Anwendungen. Updates erfolgen über das Repository und die Homepage. Wer auf einer Vivodepot-Version arbeitet, deren `SECURITY.md` älter als 12 Monate ist, sollte den aktuellen Stand prüfen.

Die `SECURITY.md` ist Bestandteil der Vivodepot-Distribution. Bei Stick-Auslieferung wird sie als gedruckte Beilage oder als Datei-Begleitung mit ausgeliefert.

---

## 8 · Fingerabdruck je Fassung

Jede ausgelieferte Fassung eines Produkts hat genau einen SHA-256. Ausgeliefert wird jedes Produkt über
den Shop (der einzige Auslieferungsweg). Die Datei selbst kann ihren eigenen Fingerabdruck
nicht tragen (ihn einzutragen änderte die Datei und damit den Fingerabdruck); er steht deshalb hier.
Die Tabelle ist aus `docs/fassungen-register.json` erzeugt, nicht getippt; der pre-commit-Hook hält
beide gleich (`tools/fassungen-register.js --check`).

<!-- fassungen-register:anfang — erzeugt von tools/fassungen-register.js --build, nicht von Hand ändern -->

Der Fingerabdruck ist der SHA-256 der Datei, wie sie ausgeliefert wurde. Prüfen: `shasum -a 256 <datei>`
(macOS/Linux) oder `certutil -hashfile <datei> SHA256` (Windows) und mit der Zeile vergleichen.
Fassung = die Zahl nach dem letzten Punkt der Versionsanzeige in Einstellungen → Über (z. B. v1.0-rc.**786**).

| Fassung | Datum | Produkt | SHA-256 |
|---|---|---|---|
| v799 | 2026-09-25 | privat-de | `cbd6f811d250d24732055ccf6dcd80bcafca9fa3274567470d67994707503f1e` |
| v799 | 2026-09-25 | privat-en | `1346da2b5b27df94b8710335d6dcc9df6fb178f1ddd1a5de14d9385daac7a61b` |
| v799 | 2026-09-25 | pro-de | `d6f050ebb19bc4e041f0938e1792bae939a6931e3e2f7ca3cb8c8d4eebae2809` |
| v799 | 2026-09-25 | pro-en | `7bb1d064d476411cc28a74e44d317db55121178d2c076fee7c3830da12c2eaed` |
| v797 | 2026-09-25 | privat-de | `5270ed989c253674c551de48b76d84decaba98dd2beaa982a9588be00308b188` |
| v797 | 2026-09-25 | privat-en | `4e345b2349a7df62812d33af839e9de1c6ad2df00799e8fbc854148940c39fa3` |
| v797 | 2026-09-25 | pro-de | `a929e48a7bc6172e29587fa6dd2d20af0c3c48d91b26331cc039e40a9e168bb1` |
| v797 | 2026-09-25 | pro-en | `28e37ea2b6920ca813e88d4b05c151089e260fb2a94692ee784195456d81ea11` |
| v795 | 2026-09-25 | privat-de | `53f288ee0ef7b541d94c6180714d776fa10a4d451117112466b9318d98580af6` |
| v795 | 2026-09-25 | privat-en | `919119ea1cfe665543120bf62ac1c5ac737fed332240a8cfa057e1d335c64d5b` |
| v795 | 2026-09-25 | pro-de | `20afde982a13a81062103855e0041e00909639b4fb7137c7c22ebee55be685a0` |
| v795 | 2026-09-25 | pro-en | `bdc820acd62ea356b3e0aebaf6b9c0805e6635d9bdf7973ea391b4f87ea75d3a` |
| v794 | 2026-09-24 | privat-de | `6ae360c37f62487cd146a69f13af2601f80d3b7055ae988547d80484b5b18d18` |
| v794 | 2026-09-24 | privat-en | `839fb82e5023f7f5f206eadae9605919c5197085f76d0e97fd1d690db55189e3` |
| v794 | 2026-09-24 | pro-de | `57311fce208ef78e5ffd287306f96a0aa6d13e712406061146fa01bd304093a8` |
| v794 | 2026-09-24 | pro-en | `ad1118df4bf754509b33e722eaa794f2685d6aad09020b9c367980c0b5130695` |
| v792 | 2026-09-23 | privat-de | `53741a3e7ffb281c0b9a3bd165d2dd01e304546d70686fae67a15618bb6494c1` |
| v792 | 2026-09-23 | privat-en | `0e61a15c092f724607362ee74517ba99bc4c5a7d8ab9ee2455e8cb31ce42a678` |
| v792 | 2026-09-23 | pro-de | `b890a5b12137a14f903c0a1462e1699925fcd63d4852ca1f77f29ad69f2d3c25` |
| v792 | 2026-09-23 | pro-en | `8be191767b29bb0e2d5ee0c1efff50cadcf7c3c0daa88c37a1f0efd597926512` |
| v787 | 2026-09-23 | privat-de | `9b858ff1ec3f265eca142fa2a912102a45a8dd775ddce4e90a3050cba5c15027` |
| v787 | 2026-09-23 | privat-en | `0530cafd1c74e1cba40f2f75685a86493f399fb07cd8d764b6a4165ba095b5ef` |
| v787 | 2026-09-23 | pro-de | `32ff70451fac95ce76bade49f1865f0c78f28830bc40c597ecb802a33c9c3bbe` |
| v787 | 2026-09-23 | pro-en | `c556eb95a7e42f49cb4c70c50e5357e72cdd328c4c82f333fc364440546fa564` |

<!-- fassungen-register:ende -->

---

*Vivodepot GmbH · Berlin · security@vivodepot.de*
