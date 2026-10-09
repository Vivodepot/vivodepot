# Vivodepot · Security-Dokument

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

Diese `SECURITY.md` trägt den Fingerprint (Abschnitt 1). Wer ihn gegen den in der Vivodepot-Datei eingebetteten Schlüssel hält, prüft beide gegeneinander. Jeder Stand im öffentlichen Repository trägt den annotierten Tag `v1.0.<Fassung>`. Tags ab v1.0.857 sind SSH-signiert, ältere nicht. Welche ausgelieferte Datei zu welcher Fassung gehört, belegt ihr SHA-256 in Abschnitt 8.

Den Schlüssel, gegen den die Signatur geprüft wird, veröffentlicht Vivodepot unter
`https://vivodepot.de/.well-known/vivodepot-allowed-signers`; in diesem Repository liegt er nicht. Sein Fingerabdruck ist
`SHA256:kLmBzq4m0aSBeHIw4cfkQOu4GS3fl+KqjXcAd8qYBxk` (ED25519). Prüfen, mit `curl` und `git`:

```bash
curl -s https://vivodepot.de/.well-known/vivodepot-allowed-signers > allowed_signers
git -c gpg.ssh.allowedSignersFile=allowed_signers tag -v v1.0.857
```

Die Ausgabe enthält `Good "git" signature for dev@vivodepot.de with ED25519 key
SHA256:kLmBzq4m0aSBeHIw4cfkQOu4GS3fl+KqjXcAd8qYBxk`, und `git` endet mit Status 0. Steht dort ein anderer Fingerabdruck,
oder fehlt `for dev@vivodepot.de` (Meldung `No principal matched`), stammt die Signatur nicht vom Release-Schlüssel.

Wechselt der Release-Schlüssel, nennt dieser Abschnitt je Schlüssel, für welche Fassungen er gilt („gilt ab v1.0.<n>“,
„bis v1.0.<m>“), und die Liste unter `.well-known` trägt dazu `valid-after` und `valid-before`. `git tag -v` prüft diese
Gültigkeit am Datum im Tag (ab git 2.35 und OpenSSH 8.9); dieses Datum setzt, wer signiert. Vor jedem Tag prüft
Vivodepot zusätzlich, dass für die Fassung genau dieser Schlüssel gilt. Geht ein Schlüssel verloren, wird er widerrufen;
`valid-before` allein schützt dann nicht.

Wie Fassungen erscheinen und wie lange sie unterstützt werden, steht in [`docs/release-planung.md`](docs/release-planung.md).

### 2.2 Prüfsummen je Fassung

Die Prüfsummen jeder ausgelieferten Fassung stehen in [Abschnitt 8](#8--fingerabdruck-je-fassung) dieser Datei; wie man sie aus dem Quelltext nachrechnet, steht in [`DEVELOPING.md`](DEVELOPING.md).

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
  Schwachstellen und schwerwiegende Sicherheitsvorfälle mit Auswirkung auf das Produkt über die
  einheitliche Meldeplattform der ENISA an CERT-Bund im BSI als koordinierendes CSIRT: eine
  Frühwarnung binnen 24 Stunden nach Kenntnis, eine Meldung binnen 72 Stunden, einen
  Abschlussbericht spätestens 14 Tage, nachdem eine Korrektur- oder Risikominderungsmaßnahme
  zur Verfügung steht (bei einem schwerwiegenden Vorfall innerhalb eines Monats nach der
  Meldung). Die betroffenen Nutzer werden informiert (Art. 14 Abs. 8). Den Ablauf regelt ein
  interner Meldeprozess.
- **11.12.2027 — Vollständige Konformitätspflicht**: Wir behandeln Vivodepot als wichtiges
  Produkt der Klasse I (CRA Anhang III Nr. 1). Vorgesehen ist die Konformitätsbewertung nach
  Modul A über Art. 32 Abs. 5, solange Vivodepot als freie und quelloffene Software gilt und die
  technische Dokumentation jeder Fassung zum Zeitpunkt des Inverkehrbringens öffentlich ist.
  Andernfalls Modul A bei vollständiger Anwendung harmonisierter Normen, gemeinsamer
  Spezifikationen oder eines europäischen Schemas für die Cybersicherheitszertifizierung
  mindestens der Stufe „mittel“, sonst die Module B und C oder H (Art. 32 Abs. 2).
  CE-Kennzeichnung. Wird in einem separaten Konformitäts-Dokument vor diesem Datum ergänzt.

Diese `SECURITY.md` ist die strukturelle Vorbereitung der CRA-Schwachstellen-Annahme-Pflicht
(CRA Art. 13 ff.) — der Meldeprozess selbst steht in einem internen Runbook, nicht hier.

Die SBOM (`vivodepot.sbom.cdx.json`, CycloneDX-Format) ist bereits CRA-vorbereitet und wird bei
jedem Release aktualisiert. Sie nennt auch Träger einer Komponente, die nicht im öffentlichen
Repository liegen (Eigenschaft `vivodepot:zusaetzlicher-traeger`, heute das Studio mit seiner Kopie
der QR-Bibliothek).

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

Hart geprüft wird beim Setzen des Passworts nur die Mindestlänge von 8 Zeichen (`pwGrundFehler`). Die Stärke-Anzeige darunter ist ein Hinweis und blockiert nichts (`passwortStaerke`): Sie misst Länge (Stufen bei 8, 12 und 16 Zeichen) und Zeichenklassen und stuft eine kurze Liste verbreiteter Passwörter, reine Ziffernfolgen und ein wiederholtes einzelnes Zeichen immer als schwach ein. Ein aus sechs Listenwörtern vorgeschlagenes Passwort gilt als stark (U2-ADR-463). Eine Stärke-Schätzung wie zxcvbn ist nicht eingebettet. Das bleibt ein Restrisiko: Ein selbst gewähltes Passwort aus häufigen Wörtern, das nicht auf der Liste steht, erkennt die Anzeige nicht als schwach.

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

### 6.6 Was in der Depot-Datei unverschlüsselt steht

Die Depot-Datei beginnt mit einem Dateikopf, der Kennung `VIVODEPOT` und einem Byte für die Format-Version (U2-ADR-043,
`DATEI_MAGIC_PREFIX` in `vivodepot.html`). Danach folgt die Hülle. Unverschlüsselt stehen dort:

- **Angaben zum Entschlüsseln:** das Verfahren (`kryptoVersion`), das Salz der Schlüsselableitung (`pbkdf2`) und das Depot-Salz
  (`depotSalt`). In Dateien älterer Formate stehen hier zusätzlich Initialisierungsvektor und Chiffrat (`iv`, `ct`).
- **Die Kennung des Depots** (`depotUUID`).
- **Die Einheiten** (`einheiten`): je Einheit eine abgeleitete Adresse und die Länge, auf 1-KiB-Stufen aufgefüllt (U2-ADR-464). Der
  Inhalt jeder Einheit ist verschlüsselt.
- **Die Fächer** (`umschlagTabelle`): je Fach seine Kennung, die Parameter der Schlüsselableitung und die Schlüssel je Adresse,
  jeweils mit dem Anker- bzw. Fach-Schlüssel gewickelt; sichtbar ist damit auch die Zahl der Einträge. Bei einem Fach für einen
  Empfängerkreis steht dort zusätzlich der Fach-Schlüssel, mit dem Passwort des Empfängers verschlossen (`fachSchluessel`). Der
  Geheimteil jedes Fach-Eintrags (`geheim`) ist verschlüsselt.
- **Die Wiederherstellung** (`wiederherstellung`), wenn eingerichtet: Form, Salz und Initialisierungsvektor. Die Hülle selbst
  (`huelle`) ist verschlüsselt.
- **Die Stand-Marke** einer heruntergeladenen Datei (`stand_marke`, in älteren Dateien `gespeichert_am`), U2-ADR-464.
- **Der Ortshinweis** (`angehoerigenOrt`), wenn die Halterin einen einträgt: Text, den sie selbst schreibt, damit eine Angehörige vor
  dem Passwort erfährt, wo ein zweites Passwort liegt (U2-ADR-062-Nachtrag). Jeder, der die Datei hat, kann ihn lesen, auch ohne
  diese Anwendung. Die Anwendung sagt das beim Eintragen und rät, ihn unpräzise zu halten.
- **Felder einer neueren Fassung**, wenn die Datei aus einer neueren Fassung stammt und diese Fassung sie nicht kennt: Sie werden
  unverändert zurückgeschrieben; eine Änderung erkennt die Anwendung beim Öffnen über die Klartext-Bindung (U2-ADR-156-Nachtrag
  Klartext-Bindung).

Fundstellen: `DATEI_MAGIC_PREFIX`, `UMSCHLAG_FELDER_BEKANNT` und `UMSCHLAG_FELDER_BASIS` in `vivodepot.html`; die Hülle entsteht in
`depotSerialisieren`. Weg zum Nachsehen: die Probe `tests/umschlag-klartext-ort-hinweis.test.js` hält jedes Feld der Hülle mit Grund
fest und prüft die geschriebene Hülle.

---

## 7 · Geltungs- und Verbindlichkeits-Hinweis

Dieses Dokument ist verbindlich für die in Vivodepot v1.0 ausgelieferten Anwendungen. Updates erfolgen über das Repository und die Homepage. Wer auf einer Vivodepot-Version arbeitet, deren `SECURITY.md` älter als 12 Monate ist, sollte den aktuellen Stand prüfen.

Die `SECURITY.md` ist Bestandteil der Vivodepot-Distribution. Bei Stick-Auslieferung wird sie als gedruckte Beilage oder als Datei-Begleitung mit ausgeliefert.

---

## 8 · Fingerabdruck je Fassung

Jede ausgelieferte Fassung eines Produkts hat genau einen SHA-256. Ausgeliefert wird jedes Produkt über
den Shop (der einzige Auslieferungsweg). Die Datei selbst kann ihren eigenen Fingerabdruck
nicht tragen (ihn einzutragen änderte die Datei und damit den Fingerabdruck); er steht deshalb hier.
Die Tabelle ist aus dem internen Fassungsregister erzeugt, nicht getippt; der pre-commit-Hook hält
beide gleich (`tools/fassungen-register.js --check`).

Die Produkte werden vorgebaut ausgeliefert, Privat-DE und Privat-EN ebenso wie Pro-DE und Pro-EN. Der Auslieferungslauf
baut jede Datei einmal und trägt ihren SHA-256 in das signierte Rezept ein (`"lieferart": "vorgebaut"`,
`produktPruefsumme`). Das Gateway gibt die Datei nur heraus, wenn die geholten Bytes genau diese Prüfsumme tragen.
Weg zum Nachsehen: die heruntergeladene Datei gegen die Tabelle unten.[^ohne-vorbau]

[^ohne-vorbau]: Das Gateway kennt außerdem einen Bau ohne Vorbau, je Abruf aus Rezept und Zutaten. Er schaltet den
    Service Worker ab und ergibt darum eine andere Prüfsumme. Keines der vier Produkte wird auf diesem Weg ausgeliefert.

<!-- fassungen-register:anfang — erzeugt von tools/fassungen-register.js --build, nicht von Hand ändern -->

Der Fingerabdruck ist der SHA-256 der Datei, wie sie ausgeliefert wurde. Prüfen: `shasum -a 256 <datei>`
(macOS/Linux) oder `certutil -hashfile <datei> SHA256` (Windows) und mit der Zeile vergleichen.
Fassung = die Zahl nach dem letzten Punkt der Versionsanzeige in der Fußzeile der Anwendung (z. B. v1.0.**818**).

| Fassung | Datum | Produkt | SHA-256 |
|---|---|---|---|
| v922 | 2026-10-08 | privat-de | `c3ee437f62a8598033f88f4d67b500faff47c6e7fc12698f2a68fbdf92760a22` |
| v922 | 2026-10-08 | privat-en | `bd34a33d8f70933b7257a45ad56cbc9bb0724157c1869b5262ae5080ce61336a` |
| v922 | 2026-10-08 | pro-de | `e78a00d13df04cff19496857d89ea625e8957391dbd4ce12b8104f661ec3340c` |
| v922 | 2026-10-08 | pro-en | `a5cee8dcf2a3f162fc94211a8f4ef99d8c02863fbf97a599fed91a1ec1fb295d` |
| v922 | 2026-10-08 | service-worker | `92ea09ea25fc7885cf7f66b5ba0839eb1a64dc43e7e220d9deae4de16362b210` |
| v920 | 2026-10-06 | privat-de | `efe6aae32a07cf216166f2c63616c530b1b3d0e0da4ceca2ff82c45a35b81aa3` |
| v920 | 2026-10-06 | privat-en | `9ae22072a832c14a08a434bac1408b0a2a9044b93acaa8bca99b40b295467bee` |
| v920 | 2026-10-06 | pro-de | `c04dfbce206cc78e2f1ca3ebb3d85f895c19a917e84ea6f7b4848bc0ae2e19ed` |
| v920 | 2026-10-06 | pro-en | `2c64c9048a0b2c6fa1d23f4a9e5206d2cb35d0bb6cb38e94365d4fc71fd06a95` |
| v920 | 2026-10-06 | service-worker | `e4de514f0811796b5ff31f11a164eb77b16310349fb66957efc78c512077a160` |
| v919 | 2026-10-06 | privat-de | `08dece201af9269871d947e86cdaca25c2ce63b282111f7600553e6dbc470c03` |
| v919 | 2026-10-06 | privat-en | `5e2df156697dc73cf5261c22bb38d3cd49a09bf71fb18cd3e5c0f15c2bf07caa` |
| v919 | 2026-10-06 | pro-de | `207451cd622c350d65d2c75d765f47b443575312ee6852a2b9662d2a667e68de` |
| v919 | 2026-10-06 | pro-en | `fe3e428de66b63e26e5d07ea52fff561e9faeb6a787fd7662a16263ec0befe75` |
| v919 | 2026-10-06 | service-worker | `765c01f98504a7d1d32f347014d12026bf676c0640af7af4d9c1df983a1b5732` |
| v918 | 2026-10-05 | privat-de | `21cdc5e02fb006b7b9ebb2af08a1191915b134d3ee2fe93491cb1b61d759c329` |
| v918 | 2026-10-05 | privat-en | `30158d8c20ca157b1dcafea06b400b5702fd836018b3655639ce7656e4db99df` |
| v918 | 2026-10-05 | pro-de | `be8c37737088c2fd66f404d7bde3241faef8c5ee5f8564ea85d91590de8a8f44` |
| v918 | 2026-10-05 | pro-en | `2923de4091fc0406af56465abbc2d76df1d8c53ce2f3c65192f207c07f3c56e3` |
| v918 | 2026-10-05 | service-worker | `d46de370966378eba3a7102d22bff68756e54c67f52ebdd11a4c0098ac0b3864` |
| v917 | 2026-10-05 | privat-de | `7b4da224e217f58c5fa86d2580c6104ce413d498050ba97a49a92d1754de3aeb` |
| v917 | 2026-10-05 | privat-en | `1854cf1ac546703caae2d56e12b2910468c1b2f4e9a9aefa69ae357a9fdffd61` |
| v917 | 2026-10-05 | pro-de | `2ec3beab914cf641e8cf3288ae093659146ac57d28f2e7fb629dbe8697fceee1` |
| v917 | 2026-10-05 | pro-en | `0d356fa91307a69d430e2f74697aa64afd487265bf9f304f10c4a845604ba686` |
| v917 | 2026-10-05 | service-worker | `0be20aa9e76756ce256e4da0f1c1c82edb511281ed1b8832edf8a3561f6c26bd` |
| v857 | 2026-10-02 | privat-de | `f11cc3684befcaf09e177ea3f2e83e7879cc02946130d77748cf983785275df1` |
| v857 | 2026-10-02 | privat-en | `a0e70742a17528bb43e0bf5cb53ad77af3a97ee3448f1727dff52a0486fbb390` |
| v857 | 2026-10-02 | pro-de | `b109a1d3414e2210121672c672f2f93f14b048f777103338be74c0d03c5b06c1` |
| v857 | 2026-10-02 | pro-en | `fac77cbeb6b54e7f2d0db8cb82264bf7e04a1febd28337ab188b62d0287a4a2d` |
| v857 | 2026-10-02 | service-worker | `e93f4e73fab1424518bb2a8bb2ee975c4e5ddb4007d5ef1f1b00e7791ef58955` |
| v843 | 2026-10-01 | privat-de | `a88b5a6df29b51d87bde562cd57dd1e7da0130ad6bddc7ee1fbe78abb6590a01` |
| v843 | 2026-10-01 | privat-en | `f2e3e713def32b062cb0d83bbafa7446353891c81abda8ef662248c3d34a1e97` |
| v843 | 2026-10-01 | pro-de | `a57c1c84968a083ddffcf335d837b463d11d53a833dff48e9c3ead3fb1e26a26` |
| v843 | 2026-10-01 | pro-en | `72cb0fe905617d913754c18ff5c5b4458184471f7797c451d3fcd7c86311922d` |
| v843 | 2026-10-01 | service-worker | `f50bed89b6a50be4dd9c09e3d2fe850f1798a2825ad2fb7f195359cd6fa6492d` |
| v818 | 2026-09-28 | privat-de | `7e77c01ee4dd0f4bfda5c305a3dd19b182939e483bae863a97d93c32c2b57585` |
| v818 | 2026-09-28 | privat-en | `91d3e2f53d19b8eb874a6be655c9027ce189d4fc692adaec6621438a4d0a59ba` |
| v818 | 2026-09-28 | pro-de | `55ef0fd9eb80034bbfeff05a5bffeb25645cd875d85f9cd93fcb176ec21ea8b3` |
| v818 | 2026-09-28 | pro-en | `23c1a62c18a3c714a2e777406adaf25eee46286ac5ad62d94443999f14425b65` |
| v818 | 2026-09-28 | service-worker | `94a9223685da5fe34575643362208c2438e7214baf437e5bd7d567c181e7305a` |
| v811 | 2026-09-27 | privat-de | `fd1803cbec8edbb7f234635f035b72eb3b77f52ceb3078acb9bb5b78fb62dbdb` |
| v811 | 2026-09-27 | privat-en | `bc744254b11d361b21eedd2d19688df3e4669b60d1807df5e48ee980a4b7e493` |
| v811 | 2026-09-27 | pro-de | `8652aa6029865a2f69dedaf01ff46fbc4ac05ca054421eeeb11a03879d47d8df` |
| v811 | 2026-09-27 | pro-en | `cd7d733c9b8b71aac9f7f1651554e21e2ceaa7df67c2b06e9f337f83b8e27734` |
| v811 | 2026-09-27 | service-worker | `8672c78ac02ede65386c6fe89651465727035b290d5f77f4ff217f021bedd261` |
| v810 | 2026-09-27 | privat-de | `542e84347267e071503d5e2bd07cf03c491f199fe995b1faf2f6219877bf3be7` |
| v810 | 2026-09-27 | privat-en | `e171f2dddc70d77765bc0a405e079d4bb8e4884ad519bfde9816eebbfbe9c513` |
| v810 | 2026-09-27 | pro-de | `a70fd70673e87b92cad8757b07a7c5c10c8ad1de38f1f72fce309fe0fb251cda` |
| v810 | 2026-09-27 | pro-en | `c8d7cee2bbac72cef77e2cd55d4c4186a55e275904e43a52931dad7e83a6fb1f` |
| v810 | 2026-09-27 | service-worker | `1b9b0c9603c987878dc9cf35ac384c15db0fa61acd95bf20a3ab9fd835ddc48c` |
| v806 | 2026-09-26 | privat-de | `eb749e45f996d48d9f5df1981ab11b8ddf53ff4a1ccb10d7ee315823d5cfe2ef` |
| v806 | 2026-09-26 | privat-en | `a721df6a6c9a5c57acda2fe863ce2cc4f83d6b3fa4c8f5237514af4a00c37659` |
| v806 | 2026-09-26 | pro-de | `44926816d04e3cd288b1f8ebbe462c6cd48d330b2218e35da5d870d3f9e43653` |
| v806 | 2026-09-26 | pro-en | `4de2bb0bbe38b0ad25299a1ed3460c202e42ccc9e6bec358ac630ed67068f286` |
| v806 | 2026-09-26 | service-worker | `96f199671c2bcacd412842e4907a0b9fd859bf7e3f2bdf38fcc085b62239f969` |
| v805 | 2026-09-26 | privat-de | `e84a2b356d4c33c17f63b730812164d8bbf843e42e29d25fc343e3410a178329` |
| v805 | 2026-09-26 | privat-en | `a6245892a75465b6e6d247af7b90ec07605f17445428ea64689801b4aa429cff` |
| v805 | 2026-09-26 | pro-de | `2be3d2cc8f0cdf04d069508cac06436b076595a7df3f891b7999baef040feeef` |
| v805 | 2026-09-26 | pro-en | `6202e4f7049d2d81a06845157938131b73f79ba2a967b9efaa5f35ea808bd3d7` |
| v805 | 2026-09-26 | service-worker | `286871f3aa43e6c75176e1c4858253bce519c8742ca9a7c6d333e9255c158e60` |
| v803 | 2026-09-26 | privat-de | `0f416995dc1431fa70672d8fcab9faab857d59db664ac981ad71d2c2ad95258f` |
| v803 | 2026-09-26 | privat-en | `9ea955194c8d5d554af0bf30ff36ff7edd95aab755d59c003e9f7b46fe61ec55` |
| v803 | 2026-09-26 | pro-de | `8e89e0aa6a1bcb614e87b521a5f9baf44bca91cd9c0e45ea2642a434c47a0846` |
| v803 | 2026-09-26 | pro-en | `44dc10141cf6122e175c178e98e1af290b1344ea83814bcfbf2f99baa1883a0a` |
| v803 | 2026-09-26 | service-worker | `ee09ce994e3e623c5fa0d87e995b27ca55da5b55009ec6638d99003c5e25cc6c` |
| v800 | 2026-09-25 | privat-de | `5a701140bdbc4e8d18ccdef56328a03889ac80421790393407aee9a20d780bf3` |
| v800 | 2026-09-25 | privat-en | `1a892b0307896ad34d4460d13bae12dfa285162109add37f7718a673fd29e379` |
| v800 | 2026-09-25 | pro-de | `cf4da52aa9b720e85136724dc4ec040e194b3d7827360ebfc2ce9c2fb7520999` |
| v800 | 2026-09-25 | pro-en | `484ad3a71f6887fb3a2deab68d5e63e9dcf8325579e558d018399ba8795d109c` |
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

## 9 · Krypto-Parameter

Die Tabelle ist aus dem Code erzeugt und wird bei jedem Commit gegen ihn geprüft. Sie beschreibt den Stand des Repositorys.

<!-- krypto-parameter:anfang — erzeugt von tools/krypto-parameter-tabelle.js --build, nicht von Hand ändern -->

Die Zahlen, Längen, Namen und Info-Präfixe in der Spalte „Wert“ sind aus `vivodepot.html` und `vivodepot-lesen.html` gelesen; die übrige Beschreibung und die Spalte „Entscheidung“ sind geschrieben und werden mit derselben Prüfung gehalten (jede genannte ADR muss als Datei vorliegen). „Auflage: externer Review“ heißt: die Entscheidung verlangt vor Produktivschaltung eine externe kryptographische Prüfung dieses Wegs; „externer Review empfohlen“ heißt: sie empfiehlt sie.

| Angabe | Wert | Code-Stelle | Entscheidung |
|---|---|---|---|
| Passwort-Ableitung | PBKDF2-HMAC-SHA-256, 600.000 Iterationen, Ergebnis 256 Bit; das Ergebnis ist nur Eingangsschlüssel für HKDF | `PBKDF2_ITERATIONS`, `deriveMasterBits` | U2-ADR-213 |
| PBKDF2-Salt | 16 Byte, zufällig, neu beim Anlegen und bei jedem Passwortwechsel | `depotAnlegen`, `passwortWechselDurchfuehren` | U2-ADR-002 |
| Depot-Schlüssel | HKDF-SHA-256, Salt 32 Byte je Depot, Info `vivodepot/v3/depot/` + Depot-UUID, AES-GCM 256 Bit, nicht extrahierbar | `deriveDepotKeyV2`, `SUBDEPOT_CRYPTO_SALT_LENGTH_BYTES` | U2-ADR-002, U2-ADR-016 · externer Review empfohlen |
| Verschlüsselung | AES-256-GCM, IV 12 Byte, je Verschlüsselung neu per `crypto.getRandomValues`, Tag 128 Bit (WebCrypto-Vorgabe) | `encryptData` | — |
| Krypto-Versionen | [3, 4], in Kern und Lese-App vor jeder Ableitung aus einem Depot-Umschlag geprüft | `KRYPTO_VERSION_ALLOWLIST` | U2-ADR-149 |
| AAD (Version 3) | `kryptoVersion`, `iterationen`, `kdfTyp` | `_AAD_DEPOT_V2` | B16-ADR-085-Nachtrag |
| AAD je Feld-Einheit (Version 4) | `kryptoVersion`, `iterationen`, `kdfTyp`, `depotUUID`, `adresse` | `_aadEinheitV4` | U2-ADR-149 |
| Feld-Einheiten | je Einheit ein eigener Inhaltsschlüssel aus 32 Zufallsbyte, unter dem Depot-Schlüssel gewickelt | `_einheitSchluesselNeu` | U2-ADR-149 |
| Feld-Adressen | HMAC-SHA-256 über den Feldnamen, auf 16 Byte gekürzt; Schlüssel per HKDF, Info `vivodepot/v4/adressen/` + Depot-UUID | `deriveAdressKeyV4`, `ZERFALL_ADRESSE_BYTES` | U2-ADR-149 |
| Signaturschlüssel der Halterin | Ed25519-Seed per HKDF, Info `vivodepot/v4/halter-signatur/` + Depot-UUID, nirgends gespeichert | `deriveHalterSignaturV4` | U2-ADR-457 · Auflage: externer Review |
| Fach-Tür (Empfängerkreise) | PBKDF2 über das Passwort der Empfängerin mit eigenem Salt, danach HKDF mit demselben Info-String wie der Depot-Schlüssel (`vivodepot/v3/depot/`) | `_fachTuerSchluessel` | U2-ADR-156 |
| Fach-Zugang | der Fach-Schlüssel wickelt nur die freigegebenen Einheiten; für die übrigen stehen Attrappen gleicher Länge | `_zerfallAttrappe` | U2-ADR-156 |
| Wiederherstellungs-Hülle | Code mit 27 Stellen Crockford-Base32; PBKDF2 (600.000) mit eigenem 32-Byte-Salt, das Ergebnis dient direkt als AES-GCM-Schlüssel (IV 12 Byte) und wickelt das Ergebnis der Passwort-Ableitung | `WHC_STELLEN`, `_whcFrisch`, `_whcEinwickeln` | U2-ADR-430 |
| QR-Übergabe | PBKDF2 (600.000) direkt zu AES-GCM 256 Bit, ohne HKDF | `_empfaengerQrSchluesselVerschluesseln` | keine ADR |
| Einmalpasswort (Lese-App) | PBKDF2 direkt zu einem AES-Schlüssel, ohne HKDF | `_angDeriveKey` | U2-ADR-062, U2-ADR-153 · Auflage: externer Review |
| Antwort als JWE, Einmalpasswort | PBES2-HS512+A256KW, PBKDF2-SHA-512 mit 600.000 Iterationen | `_jwePbes2Schluessel` | U2-ADR-449 · Auflage: externer Review |
| SMART Health Link | JWE `alg: dir`, A256GCM, zufälliger Schlüssel 32 Byte | `_jweCompactDir` | U2-ADR-047 · externer Review empfohlen (von U2-ADR-449 und U2-ADR-457 als Auflage übernommen) |
| Nicht extrahierbar | geheime Schlüssel werden mit `extractable: false` abgeleitet oder importiert; benannte Ausnahme: der Inhaltsschlüssel der Antwort als JWE (`antwortJwePasswort`), den das Einmalpasswort wickelt. Eine Prüfung der Suite sieht jede weitere Ausnahme | — | U2-ADR-026 |

<!-- krypto-parameter:ende -->

---

*Vivodepot GmbH · Berlin · security@vivodepot.de*
