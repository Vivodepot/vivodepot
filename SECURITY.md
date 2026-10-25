# Vivodepot · Sicherheit

**Verantwortliche Stelle:** Vivodepot GmbH, Berlin
**Anschluss:** ADR-085 mit Nachtrag vom 23.05.2026, ADR-098 (Lese-App)

---

## Vorbemerkung

Dieses Dokument trägt die für Vivodepot v1.0 verbindlichen Sicherheits-Anker: Schlüssel-Information der Vivodepot Trust-Authority, Geltungsdauer, Verifikations-Pfade, Schwachstellen-Meldepfad. Es ist verbindlich für jede sicherheitsrelevante Aussage gegenüber Pilotpartnern und Bürgern.

Wer das Repository als Bürger, Pilotpartner, Rechtsberaterin oder Sicherheits-Auditor öffnet, findet hier die zentralen Sicherheits-Aussagen. Bei Konflikt zwischen Aussagen in diesem Dokument und Aussagen in einer ADR gilt: die ADR ist für Architektur-Entscheidungen verbindlich; dieses Dokument trägt die operativen Sicherheits-Anker und ist verbindlich für Schlüssel-Information und Meldepfade.

---

## 1 · Öffentlicher Schlüssel der Trust-Authority

Der öffentliche Schlüssel der Vivodepot Trust-Authority signiert alle Vivodepot-zertifizierten Templates (Säule 3 → Säule 4 → Säule 1) und alle Vivodepot-zertifizierten Anbieter-Konfigurationen (White-Label-Bereich).

**Algorithmus:** Ed25519 (primär), ES256 (Fallback für Empfänger-Säulen, die Ed25519 nicht unterstützen)

**Schlüssel-Identifier (`kid`):** `vivodepot-trust-authority-v2-22082026` *(Code-Quelle: `vivodepot.html` Konstante `TRUST_AUTHORITY_PUBLIC_JWK`, Feld `kid`. Anker-Rotation 23.08.2026 — der vorige Anker `vivodepot-trust-authority-v1-11052026` galt als kompromittiert und wurde ersetzt.)*

**Fingerprint (RFC-7638 JWK-Thumbprint, base64url):** `5gB8k3ITpqvDwldkESy9vewQU03F6ddv8UHx3bOAVOs` *(SHA-256 über die kanonisch sortierten Pflicht-Member des öffentlichen Schlüssels; im Code als Anbieter-Identifier verwendet, reproduzierbar über die App-Funktion `_jwkThumbprint(TRUST_AUTHORITY_PUBLIC_JWK)`.)*

**Geltungsdauer:** Der Trust-Authority-Anker ist die Vertrauens-Wurzel und trägt selbst kein Ablaufdatum; er ist über seine Schlüssel-Version identifiziert (`kid: vivodepot-trust-authority-v2-22082026`, erzeugt 22.08.2026). Zeitlich begrenzt sind die von ihm **autorisierten Zertifikate**, nicht die Wurzel: externe Anbieter-Zertifikate 18 Monate (Abschnitt 3), eingebettete amtliche Zertifikate 120 Monate (BMJ/BzgA, gültig bis 23.08.2036), der Ausgabestellen-Zertifikat der Zwischenstufe (U2-ADR-146) 12 Monate. Eine Anker-Rotation erfolgt durch Neuausgabe unter einer neuen Schlüssel-Version in einem neuen Release (Mechanik in Abschnitt 3).

**Schlüssel-Generierung:** offline, durch Vivodepot-Operatorin, in Cold-Storage gehalten.

**Verwendungs-Pfad:** ausschließlich zur Verifikation in den Säulen 1 (Bürger-App) und 2 (Lese-App) eingebettet. Die Säule 4 (VC-Issuer) hält den korrespondierenden Privat-Schlüssel ausschließlich offline.

---

## 2 · Prüfwege über mehrere Quellen

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

Die Prüfsummen jeder ausgelieferten Fassung stehen in [Abschnitt 8](#8--fingerabdruck-je-fassung) dieser Datei. Ein heruntergeladenes Produkt prüft man gegen seine Zeile dort.
Aus dem Quelltext nachrechnen lässt sich die Zeile „kern“, die gemeinsame Programmdatei der Fassung (ab v937, für v933 nachgetragen); der Prüfweg steht in [Abschnitt 8](#8--fingerabdruck-je-fassung).
Nachgerechnet wird am öffentlichen Tag der Fassung; nicht jede ausgelieferte Fassung hat einen.
Die Produkte selbst lassen sich aus dem öffentlichen Repository nicht byte-gleich nachbauen: Vivodepots eigene Vorlagen gehören nicht dazu, der Bau setzt erfundene Ersatzvorlagen ein ([`DEVELOPING.md`](DEVELOPING.md), „The scaffold and the product“).

### 2.3 Handelsregister-Bezug

Die Vivodepot GmbH ist beim Amtsgericht Charlottenburg (Berlin) unter **HRB 289273 B** eingetragen. Das ist kein Fingerprint-Verifikations-Pfad im Sinne von 2.1/2.2 — das Handelsregister publiziert keine kryptographischen Prüfsummen. Es ist eine davon unabhängige Instanz für eine andere Frage: dass hinter diesem Schlüssel eine real existierende, eingetragene juristische Person steht, prüfbar unabhängig davon, ob Vivodepots eigene Infrastruktur (Repository, Homepage) kompromittiert ist. Die Eintragung ist über das öffentliche Unternehmensregister (`https://www.unternehmensregister.de`) einsehbar.

### 2.4 Abweichender Fingerabdruck

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

### 4.1 Meldefähige Schwachstellen

— Manipulationen der Vivodepot-Datei, die zu fremden Trust-Authority-Schlüsseln führen
— Unerwartete Verhaltens-Abweichungen in der Krypto-Schicht (etwa: Entschlüsselungs-Erfolge bei manipulierten Headern, JWS-Signaturen, die fälschlich akzeptiert werden)
— Schwächen in der Schlüssel-Verwaltung (etwa: extrahierbare Schlüssel, die in der Architektur als `extractable: false` markiert sind)
— Lecks im Notfall-Cache-Pfad (Stufe 1 oder Stufe 2)
— Übergabe-Datei-Schwachstellen, die zu unerwarteten Daten-Lecks bei der Empfänger-Institution führen
— SBOM-Inkonsistenzen, die auf eine nicht-deklarierte Dritt-Bibliothek hinweisen

### 4.2 Abgrenzung

Allgemeine UX-Mängel, Feature-Wünsche, Dokumentations-Verbesserungen werden im Repository als reguläre Issues geführt, nicht über den Schwachstellen-Pfad.

---

## 5 · Cyber Resilience Act

Der Cyber Resilience Act (Regulation EU 2024/2847) trägt **zwei** Anwendungsdaten, nicht eines:

- **11.09.2026 — Meldepflicht** (CRA Art. 14): die Vivodepot GmbH meldet aktiv ausgenutzte
  Schwachstellen und schwerwiegende Sicherheitsvorfälle mit Auswirkung auf das Produkt über die
  einheitliche Meldeplattform der ENISA an CERT-Bund im BSI als koordinierendes CSIRT: eine
  Frühwarnung binnen 24 Stunden nach Kenntnis, eine Meldung binnen 72 Stunden, einen
  Abschlussbericht spätestens 14 Tage, nachdem eine Korrektur- oder Risikominderungsmaßnahme
  zur Verfügung steht (bei einem schwerwiegenden Vorfall innerhalb eines Monats nach der
  Meldung). Die betroffenen Nutzer werden informiert (Art. 14 Abs. 8). Den Ablauf regelt ein
  interner Meldeprozess.
- **11.12.2027 — Vollständige Konformitätspflicht**: Als Maßstab legen wir die Pflichten eines
  wichtigen Produkts der Klasse I an; die rechtliche Einstufung ist davon getrennt. Vorgesehen ist
  die Konformitätsbewertung nach Modul A, sofern harmonisierte Normen, deren Fundstellen im
  Amtsblatt veröffentlicht sind, die grundlegenden Cybersicherheitsanforderungen aus Anhang I
  abdecken und vollständig angewandt werden (Art. 27 Abs. 1, Art. 32 Abs. 2); andernfalls durch
  eine notifizierte Stelle (Module B und C oder H, Art. 32 Abs. 2).
  Die CE-Kennzeichnung und die Konformitätserklärung ergänzt ein eigenes Dokument vor diesem Datum.

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

## 6 · Strukturelle Restrisiken

Vivodepot ist eine Single-File-Offline-Browser-Anwendung. Einige Risiken sind in dieser Anwendungsklasse strukturell nicht durch Code-Änderung lösbar. Sie werden hier explizit benannt.

### 6.1 Manipulation in der Lieferkette

Browser haben keine native Code-Signing-Validierung für HTML. Wenn die `vivodepot.html` zwischen Distribution und Bürger-Einsatz manipuliert wird (kompromittierte Webseite, manipulierter Stick im Vertriebsweg, manipulierte Mail-Anlage), kann ein Angreifer den eingebetteten Trust-Authority-Pubkey austauschen. Mitigation läuft über die Verifikations-Pfade aus Abschnitt 2 (Hash-Vergleich, Multi-Quellen-Verteilung, Pilot-IT-Verifikation der Charge) plus diese SECURITY.md selbst — wer den Fingerprint hier prüft, hat einen Anker außerhalb der Datei.

### 6.2 Schlüssel-Rotation bei Kompromittierung

Siehe Abschnitt 3.2.

### 6.3 Passwortstärke bei der Einrichtung

Hart geprüft wird beim Setzen des Passworts nur die Mindestlänge von 8 Zeichen (`pwGrundFehler`). Die Stärke-Anzeige darunter ist ein Hinweis und blockiert nichts (`passwortStaerke`): Sie misst Länge (Stufen bei 8, 12 und 16 Zeichen) und Zeichenklassen und stuft eine kurze Liste verbreiteter Passwörter, reine Ziffernfolgen und ein wiederholtes einzelnes Zeichen immer als schwach ein. Ein aus sechs Listenwörtern vorgeschlagenes Passwort gilt als stark (U2-ADR-463). Eine Stärke-Schätzung wie zxcvbn ist nicht eingebettet. Das bleibt ein Restrisiko: Ein selbst gewähltes Passwort aus häufigen Wörtern, das nicht auf der Liste steht, erkennt die Anzeige nicht als schwach.

### 6.4 Signatur der Standardvorlagen

Die vier Vivodepot-Standard-Templates (Patientenverfügung, Betreuungsverfügung, Vorsorgevollmacht, Organspende) sind **treuhänderisch durch die Trust-Authority signiert** (Privat-Schlüssel aus dem Cold-Storage) und tragen jeweils eine eingebettete Signatur. Die Bürger-App prüft jede Vorlage beim Laden gegen den eingebetteten Trust-Authority-Anker (Fingerprint aus Abschnitt 1); nur gültig signierte Vorlagen werden als amtlich geführt — unsigniert oder abweichend signierte Vorlagen werden **verworfen**. Die amtlichen Aussteller-Zertifikate (Bundesministerium der Justiz, Bundeszentrale für gesundheitliche Aufklärung) sind eingebettet.

### 6.5 Arbeitsspeicher in JavaScript

JavaScript-Engines (V8, SpiderMonkey) erstellen intern Kopien von Strings und halten sie im Heap. Explizites Überschreiben eines Passwort-Strings (`str = '\x00'.repeat(str.length)`) hat keine kryptographische Garantie: der Garbage-Collector kann die ursprüngliche Kopie noch eine unbestimmte Zeitspanne vorhalten, und `ArrayBuffer`/`Uint8Array`-Fills (`key.fill(0)`) wirken nicht rückwirkend auf bereits erzeugte String-Kopien.

**Speicher-Hygiene implementiert:**

— Kurze Schlüssel-Lebenszeiten: Passwort-Strings werden nur für die Dauer der PBKDF2-Ableitung gehalten, danach gibt die Funktion die lokale Variable auf.
— Tab-Schließen löscht den Schlüssel: `beforeunload`-Handler leert `_root` und alle Cache-Slots.
— Sensitive Operationen in isolierten Funktions-Scopes: `deriveKey()` und `decryptData()` sind eigenständige async-Funktionen; lokale Variablen gehen nach `return` aus dem Stack.

**Keine kryptographische Garantie:** Ein Angreifer mit physischem Speicher-Zugriff (RAM-Dump, Sleep-Image) kann trotzdem auf Reste stoßen.

**Mitigation für Bürgerinnen:** Browser-Tab nach Nutzung schließen. Bei besonders sensiblen Operationen (Erst-Setup, Passwort-Änderung) Browser-Tab danach neu starten.

### 6.6 Unverschlüsselte Angaben einer Depot-Datei

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

### 6.7 Befallenes Gerät, manipulierte Browser-Erweiterung

Die Anwendung läuft im Browser und kann nur schützen, was der Browser ihr überlässt. Schadsoftware auf dem Gerät und eine
Browser-Erweiterung mit Zugriff auf die Seite können mitlesen, was auf dem Bildschirm steht und was eingetippt wird, auch das
Passwort. Dagegen hilft keine Maßnahme in der Anwendung.

**Mitigation für Bürgerinnen:** Öffnen Sie das Depot nur auf einem Gerät, dem Sie vertrauen, und in einem Browser ohne
Erweiterungen, die auf alle Seiten zugreifen dürfen.

### 6.8 Warnhinweis beim Öffnen

Eine Warnung eines Mail-Programms, Browsers oder Betriebssystems beim Öffnen einer HTML-Datei sagt nichts darüber, ob die Datei
echt ist. Ob sie echt ist, zeigt der Vergleich des Fingerabdrucks (Abschnitt 2 und Abschnitt 8). Umgekehrt ist eine Datei,
die ohne Warnung aufgeht, damit nicht geprüft.

---

### 6.9 „Seite speichern“ und Sicherung

Sichern Sie Ihr Depot mit „Sicherungskopie erstellen“, nicht mit „Seite speichern“ des Browsers. Speichert ein Browser den
laufenden Stand der Seite, enthält diese Datei bei geöffnetem Depot Angaben daraus in lesbarer Form.

Die Anwendung erkennt eine solche Datei beim Öffnen: sie führt dann nichts aus, zeigt keine Angaben und nennt statt dessen
einen Hinweis. Die Angaben stehen trotzdem in der Datei und sind mit einem Texteditor lesbar; darum gehört sie gelöscht.

Seit v930 stehen die Werte in Eingabefeldern nicht mehr im Quelltext einer solchen Datei: in einem Chromium-Stand der
Seite, wie ihn `page.content()` und die MHTML-Erfassung von Chromium liefern, stehen sie weder als Attribut noch als Inhalt
eines Textfelds. Was die Anwendung als Text zeigt, steht weiter darin. Für „Seite speichern“ im Browser-Menü, für das
Format „Nur HTML“, für Safari und Firefox ist es nicht gemessen.

Weg zum Nachsehen: der Block `rahmen-schutz` im Kopf von `vivodepot.html` setzt beim Start die Marke `data-vd-lauf`; die
Proben `tests/mit-modul/rahmen-schutz-ohne-header.test.js` und `tests/e2e/gesicherte-kopie.spec.js` halten das Verhalten; für die
Eingabefelder die Fälle `[Gesicherte Kopie·Datei]`, `[Gesicherte Kopie·Klasse]` mit Rot-Beweis, `[Gesicherte Kopie·Dokument]`
und `[Gesicherte Kopie·Chromium]` in derselben Datei.

## 7 · Geltungs- und Verbindlichkeits-Hinweis

Dieses Dokument ist verbindlich für die in Vivodepot v1.0 ausgelieferten Anwendungen. Updates erfolgen über das Repository und die Homepage. Wer auf einer Vivodepot-Version arbeitet, deren `SECURITY.md` älter als 12 Monate ist, sollte den aktuellen Stand prüfen.

Die `SECURITY.md` ist Bestandteil der Vivodepot-Distribution. Bei Stick-Auslieferung wird sie als gedruckte Beilage oder als Datei-Begleitung mit ausgeliefert.

### 7.1 Ausfuhrkontrolle (Dual-Use)

Der öffentliche Quelltext dieses Repositorys steht unter EUPL-1.2 und ist allgemein zugänglich im Sinne von Anhang I der
Verordnung (EU) 2021/821, Fassung der Delegierten Verordnung (EU) 2025/2003, in Kraft seit 15.11.2025. Nach der Allgemeinen
Software-Anmerkung, Buchstabe b, ist er nicht von Anhang I erfasst. Der Ausschluss für Kategorie 5 Teil 2 in derselben
Anmerkung betrifft nur die Buchstaben a und c.
Fundstellen: `http://data.europa.eu/eli/reg/2021/821/oj`, `http://data.europa.eu/eli/reg_del/2025/2003/oj`.

---

## 8 · Fingerabdruck je Fassung

Jede ausgelieferte Fassung eines Produkts hat genau einen SHA-256. Die Datei selbst kann ihren eigenen Fingerabdruck
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

Die Zeile „kern“ (ab v937, für v933 nachgetragen) ist kein Produkt, sondern die gemeinsame Programmdatei `vivodepot.html` der
Fassung, wie sie ausgeliefert wurde; aus ihr und den Modulen der Fassung ist jedes Produkt gebaut. Die `vivodepot.html` im
Wurzelverzeichnis des öffentlichen Repositorys unterscheidet sich davon nur in Zeile 5, der ersten Zeile des Kopfkommentars,
die dort Fassung, Rolle und Prüfweg nennt. Nachrechnen (macOS/Linux) am öffentlichen Tag der Fassung:
`sed '5s/.*/  Vivodepot — Bürger-App (Clean-Slate-Kern)/' vivodepot.html | shasum -a 256`.

| Fassung | Datum | Produkt | SHA-256 |
|---|---|---|---|
| v952 | 2026-10-25 | kern | `7ae8b095626fb7c96676e3be5b39d5a1bc9e94b445e9129727fce918d652fb10` |
| v952 | 2026-10-25 | privat-de | `3b908fccb037c0396cda7f64a0ca5fff0ba58dffbb437b22624b883720d88a4a` |
| v952 | 2026-10-25 | privat-en | `edcb93ce339fa3722057905fe30466f96500f33c97d7016365d6b586115db05a` |
| v952 | 2026-10-25 | pro-de | `4a3375f0ddd7f6ae7c0ae5e31b61116015649b1bd4db63b2f301f10cd823107a` |
| v952 | 2026-10-25 | pro-en | `acf1f60c9f14a59dba9ca8f705d3da393247a4e2d98cc08f9f8524142a4c1a5c` |
| v952 | 2026-10-25 | pro-de-kanzlei | `13e53a88d84f6e6e39af061d8157deac82c4f7684cb80c8066b18840668afecd` |
| v952 | 2026-10-25 | pro-en-kanzlei | `4cb194aa57e5e34340e5a96e1cd2211a7ca07b0ef77852bee041ae9684b7a2e2` |
| v952 | 2026-10-25 | pro-de-steuerberatung | `4eb1a31c030248217f438dcf7ca7b1953006350cd893b90535e5a96cbc24713d` |
| v952 | 2026-10-25 | pro-en-steuerberatung | `4484023bb6b500bb8ddd8562c7f9eaa2098cdcd174c355afc498d3d9ad93e044` |
| v952 | 2026-10-25 | service-worker | `443e3e651217e88d8ba2e416ce36e09f335b33c026558851ca64aed790c125b6` |
| v943 | 2026-10-21 | kern | `ee0ce528129fd91fb4c95fe99eeb0c9568cb236c0198f3cba5acaeabd7553789` |
| v943 | 2026-10-21 | privat-de | `83504686425cdb30dc879f2418b0c9a26935fa0b41a7bb509d8069580e1c5d13` |
| v943 | 2026-10-21 | privat-en | `c3d96113ee414f700b64885271673bfe0afc1e75bd14ad67ad736512e14dfb52` |
| v943 | 2026-10-21 | pro-de | `b85849aaeb4f8b538db1455dba0652ed26c6b7c6d26c7022640604ebc8c6df25` |
| v943 | 2026-10-21 | pro-en | `53d11500d744a710dd2ab933fb5e12c31e753a96f98a43ac54878539f8bd89ce` |
| v943 | 2026-10-21 | pro-de-kanzlei | `16381aadcbef0df1891b26d453350aaaef21a8d619eddc35ad0d3b5ad0cf0ca3` |
| v943 | 2026-10-21 | pro-en-kanzlei | `57974d1c1e32fbcd029ee403670b3b7b1f5459c7f6aa14bed1a51d658baf9153` |
| v943 | 2026-10-21 | pro-de-steuerberatung | `75380c1bbb56c765d028e8c79720a8aafe9943eff6fc3911e5ae717f7c785692` |
| v943 | 2026-10-21 | pro-en-steuerberatung | `2efe5c2259556464d1357d5a3df334689707ccfa33f6ec1cc20a105f107ed1ca` |
| v943 | 2026-10-21 | service-worker | `f9e69a25f48f35e4f1f92eea5879f4505b6f01c127431634d006267c05a68005` |
| v937 | 2026-10-20 | kern | `4a57f0857501c5d2f2cc109cec0e20fd39afdb6d2137934631e5e28dcd1c9567` |
| v937 | 2026-10-20 | privat-de | `da2f841913198e68a0a1c6bb2ab31720b6742d80a31e05bf8c7c996874ef9560` |
| v937 | 2026-10-20 | privat-en | `9efd621647e172fc73b80266d8764bc8a684fa6eecedcb195a403eb07d607117` |
| v937 | 2026-10-20 | pro-de | `82d78bebd8b6b15b4a1d73d316cc2c5ea176f70da92b205642b2569b5d5c07b9` |
| v937 | 2026-10-20 | pro-en | `4bae44b3a4fd1217183db317b64f931a10938f6b270681a85b577037319dafe6` |
| v937 | 2026-10-20 | pro-de-kanzlei | `3e91406d7defb09211073e4828ebaa2739164542bba85a96e19e26900a07d12f` |
| v937 | 2026-10-20 | pro-en-kanzlei | `ad02c3a21e4f78ea28ed0e3e3574aa75095945bab77d9725944c0a1f1fdc7159` |
| v937 | 2026-10-20 | pro-de-steuerberatung | `09059bda2eed1a6cad089dcd1d060e603e461b1f77fd3652a3ec3ccdbd4cffc2` |
| v937 | 2026-10-20 | pro-en-steuerberatung | `f32ad6c2bb0959c9328d689f5d044de3dc071d8b443bb93d68390cf2604db1e6` |
| v937 | 2026-10-20 | service-worker | `107eaf08786261d3276492bdd90e8a35c2c7c1e9ff85631b4370a53b6c5fcd3e` |
| v933 | 2026-10-19 | kern | `b913b6fde46a28d43d5888e093ca1908bdf871cb80939ab28d54dd5b7b54ed64` |
| v933 | 2026-10-19 | privat-de | `b3cf33de46229c3016bb7975b82d97e1b3867577eb3ca84e02596e54e2175b5a` |
| v933 | 2026-10-19 | privat-en | `b406a1a06f02661cb95a665673126e2613adc4ffbfacd5acd49e1a501aff7c39` |
| v933 | 2026-10-19 | pro-de | `1505562065bdd1c302d8b8af093703edf79a00885f152bf0e67cf31036e3b04d` |
| v933 | 2026-10-19 | pro-en | `f251cf0a081607bf2f732f75200f29cfbafb1bd21d1eb3332ea34596b9d404b9` |
| v933 | 2026-10-19 | pro-de-kanzlei | `1659e492d2faad4ccfcdb3e53356a0f099268c9c4f71cc7320c704d058eafaa8` |
| v933 | 2026-10-19 | pro-en-kanzlei | `8d47cddfd32f1b5afe16b08acfa0a772f04c3627a8f3dead2b55d349800dbcc3` |
| v933 | 2026-10-19 | pro-de-steuerberatung | `d08a49f160b7ff0a954d31ee08e7c6b23c9e9ed5f222ad4d31a7ec1435eb1344` |
| v933 | 2026-10-19 | pro-en-steuerberatung | `b33ca7b01455ce51a6a7cfa3889751dd0aab33ec60a14fe11a45a5615abd7d1a` |
| v933 | 2026-10-19 | service-worker | `9bd5c76ea6b5d4aaef63e992ebafec0fbca2741621958c1bb03d5b298628dd8e` |
| v931 | 2026-10-17 | privat-de | `a70d0c51129b662300dc80ceb618f53986035dc25dc795416fac111e4d1ec477` |
| v931 | 2026-10-17 | privat-en | `1dcc54b96b0b325157e91a0adb680b5a16582c65917ae13b15c967a4c45fdc58` |
| v931 | 2026-10-17 | pro-de | `16aa33307da25c90bd8550f49e599ea02e82421cfaa33be62b54b6933714785a` |
| v931 | 2026-10-17 | pro-en | `d00db137d6a441e9a009906292d58cca761a3f87a62b44b9156940b38a1d7c07` |
| v931 | 2026-10-17 | service-worker | `96120714b84a3593aab2987cba8e3558b12efddce205ea45e4757d3af6fd327e` |
| v930 | 2026-10-16 | privat-de | `7ef3f3cda0f7f6f52c093f15b2c10aacf08e71a0755b4c130f36d1645f560c46` |
| v930 | 2026-10-16 | privat-en | `2e6410dbd26e6d47b303b8299bc392463ada51f87f537a0b9ff4142fb968c9a6` |
| v930 | 2026-10-16 | pro-de | `812b9ba48389c0bdcb23e3b87dee692c82057b8cb5b9ab99003400511fb3ac60` |
| v930 | 2026-10-16 | pro-en | `93bab5bcdfcf7162da98f8c132e6886b63ba686f407f9a9699fdd453d92ecdf5` |
| v930 | 2026-10-16 | service-worker | `e76e8d1cc5485c4540e225f2fc03fcc092f1b67d28e1c8f89aaf3564498fdd36` |
| v929 | 2026-10-15 | privat-de | `b378f160f2b8acd1d5e900eaa74335e7e7dc163307551d35cc136fdf2b2cde98` |
| v929 | 2026-10-15 | privat-en | `28c12904131e7d325a6ccf74a6a8563e349efe08085af82aa8ca02de93a4c899` |
| v929 | 2026-10-15 | pro-de | `52c89c8a209fb71b31268b56f4bc69e7f0932796b9758146060fe81f69f6a00a` |
| v929 | 2026-10-15 | pro-en | `00b3458b8b342ac212c5867c60d5c06f354978cd0fefdce39f78a5950496c1b1` |
| v929 | 2026-10-15 | service-worker | `550bc76f3151905751c9e7498550f938f75f1dd1de3df9092964905e1f03a187` |
| v928 | 2026-10-13 | privat-de | `51f5a7d716f340c55d4e8a994d02293ae8839ddc803339ab94558af7afbde999` |
| v928 | 2026-10-13 | privat-en | `88c6a14c553f4a3730c802a1f0e4ee17e0449b362459c88a9a7246aabb3acc1d` |
| v928 | 2026-10-13 | pro-de | `e645ca3afc1682279664a58c1f41e336db0d7f9675fa5767836226a6d46b4c8e` |
| v928 | 2026-10-13 | pro-en | `5feb5a6c34512656b6f116c0af48daa7a74487c66ee1d3382dfcea0cbf440a4d` |
| v928 | 2026-10-13 | service-worker | `3201e408b146e72ac8f471c40a3ff891645ab27c0c7ca96c53d6f9569ff89252` |
| v927 | 2026-10-12 | privat-de | `afbf811950c330325dabc1f069ce9e13dd876a809f651c7c6373f1f78b1c4431` |
| v927 | 2026-10-12 | privat-en | `04f841ea9af020cb5c93c8083885775ea0fa6414ff0463069ccb934db0ab0b12` |
| v927 | 2026-10-12 | pro-de | `4504c187af109cd1e2c32264e806ed50b790db1102544b5b7c04698ebea791f6` |
| v927 | 2026-10-12 | pro-en | `fb8e8714ef4fb1fa0c7448b2407df15d4facbeb3dc2197daea5c39ca50d62c99` |
| v927 | 2026-10-12 | service-worker | `06f842f54927116a9da9492c5226e90405f851b3b123c447680842a39ef5512b` |
| v923 | 2026-10-09 | privat-de | `7cbb6f58bad4e58c65ce9b9b2dec0b3c13321adf21780f573364634ed5932b65` |
| v923 | 2026-10-09 | privat-en | `4c05ed6f0c17574c8ea3d7e0b687f502813fbb671bc201fa179cc1543d7cd868` |
| v923 | 2026-10-09 | pro-de | `5d605477e961ef76687eefae5efc725476f054bcfd38e8083df91c5eed8ca7ba` |
| v923 | 2026-10-09 | pro-en | `e2236317e66433ec58babd64d8e9bc6b2f5ee2f50c42198e9f6010b419505c28` |
| v923 | 2026-10-09 | service-worker | `030f719a28db3ae14bccf1ed99ea509e96f4cbb97804ea2d853d2eb7102359d7` |
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
| Signaturschlüssel je Stelle (Antwort) | Ed25519-Seed per HKDF-SHA-256 aus dem Antwort-Seed des Depots (32 Byte, Inhalt des Depots, nicht aus dem Passwort), Salt leer, Info `vivodepot/antwort-schluessel/v1` ‖ 0x00 ‖ Domäne ‖ 0x00 ‖ Länge (2 Byte) ‖ Kennung der Stelle; signiert jede Antwort, solange `ANTWORT_SIGNIEREN` an ist | `antwortSchluesselJeStelle`, `antwortSchluesselInfo` | U2-ADR-501 · Auflage: externer Review |
| Fach-Tür (Empfängerkreise) | PBKDF2 über das Passwort der Empfängerin mit eigenem Salt, danach HKDF mit demselben Info-String wie der Depot-Schlüssel (`vivodepot/v3/depot/`) | `_fachTuerSchluessel` | U2-ADR-156 |
| Fach-Zugang | der Fach-Schlüssel wickelt nur die freigegebenen Einheiten; für die übrigen stehen Attrappen gleicher Länge | `_zerfallAttrappe` | U2-ADR-156 |
| Wiederherstellungs-Hülle | Code mit 27 Stellen Crockford-Base32; PBKDF2 (600.000) mit eigenem 32-Byte-Salt, das Ergebnis dient direkt als AES-GCM-Schlüssel (IV 12 Byte) und wickelt das Ergebnis der Passwort-Ableitung | `WHC_STELLEN`, `_whcFrisch`, `_whcEinwickeln` | U2-ADR-430 |
| QR-Übergabe | PBKDF2 (600.000) direkt zu AES-GCM 256 Bit, ohne HKDF | `_empfaengerQrSchluesselVerschluesseln` | U2-ADR-156 (Nachtrag QR-Übergabe, 04.10.2026) |
| Einmalpasswort (Lese-App) | PBKDF2 direkt zu einem AES-Schlüssel, ohne HKDF | `_angDeriveKey` | U2-ADR-062, U2-ADR-153 · Auflage: externer Review |
| Antwort als JWE, Einmalpasswort | PBES2-HS512+A256KW, PBKDF2-SHA-512 mit 600.000 Iterationen | `_jwePbes2Schluessel` | U2-ADR-449 · Auflage: externer Review |
| SMART Health Link | JWE `alg: dir`, A256GCM, zufälliger Schlüssel 32 Byte | `_jweCompactDir` | U2-ADR-047 · externer Review empfohlen (von U2-ADR-449 und U2-ADR-457 als Auflage übernommen) |
| Nicht extrahierbar | geheime Schlüssel werden mit `extractable: false` abgeleitet oder importiert; benannte Ausnahme: der Inhaltsschlüssel der Antwort als JWE (`antwortJwePasswort`), den das Einmalpasswort wickelt. Eine Prüfung der Suite sieht jede weitere Ausnahme | — | U2-ADR-026 |

<!-- krypto-parameter:ende -->

---

*Vivodepot GmbH · Berlin · security@vivodepot.de*
