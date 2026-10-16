# tests/fixtures/oid4vp/ — Test-Zertifikate für den X.509-Leser und den OID4VP-Spike

**Nur Test, nie Vertrauensanker im Produkt.** Gelesen von `tests/x509-leser.test.js` (der X.509-Leser des Produkts, Spanne
`X509-LESER` in `vivodepot.html`) und `tests/oid4vp-spike.test.js` (die Anfrage-JWS des Spikes, ENTWICKLERLEISTE). Jeder
Dateiname trägt „test“ (Auflage 15.10.2026). Dass kein Bauweg eines Produkts diesen Ordner liest und kein Stück eines dieser
Zertifikate im Kern steht, hält die Probe `[X509·nie im Produkt]` in `tests/x509-leser.test.js`.

Fälle, die openssl nicht oder nur umständlich erzeugt (Namen, die nur nach RFC 5280 gleich sind, keyUsage-, EKU-,
organizationIdentifier-, nameConstraints- und Richtlinien-Fälle), stellt `tests/lib/x509-test-zertifikate.js` beim Testlauf
selbst aus; deren Schlüssel leben nur im Speicher.

## Was hier liegt

| Datei | Inhalt |
|---|---|
| `test-wurzel-p256.crt` | Test-Wurzel P-256, selbst signiert (ecdsa-with-SHA256), notAfter 2051 als GeneralizedTime |
| `test-zwischen-p384.crt` | Zwischen-CA P-384, von der Wurzel, pathLen 0 |
| `test-blatt-p256.crt` | Blatt P-256, von der Zwischen-CA (SHA-384), SAN dNSName `verifier.test.invalid`, certificatePolicies |
| `test-wurzel-p521.crt`, `test-blatt-p521.crt` | ES512-Kette (P-521, SHA-512), wie das develop-Profil des Referenz-Verifiers |
| `test-blatt-abgelaufen.crt` | Blatt unter der Zwischen-CA, gültig nur 2025 |
| `test-blatt-noch-nicht-gueltig.crt` | Blatt unter der Zwischen-CA, gültig ab 2030 |
| `test-ca-ohne-befugnis.crt`, `test-blatt-unter-ca-ohne-befugnis.crt` | CA:TRUE ohne keyCertSign, und ein Blatt darunter |
| `test-fremd-wurzel-p256.crt`, `test-fremd-blatt-p256.crt` | Kette unter einer Wurzel, die kein Anker ist |
| `test-blatt-kritisch-unbekannt.crt` | Blatt mit einer unbekannten kritischen Erweiterung (OID unter der IANA-Beispiel-PEN 32473) |
| `test-ed25519-selbst.crt` | selbst signiertes Ed25519-Zertifikat (nur Lesen) |
| `test-anfrage-es256.jws` | Anfrage-Objekt (OID4VP 1.0, `client_id` mit Präfix `x509_san_dns`), signiert vom Blatt P-256, x5c = Blatt + Zwischen-CA |
| `test-anfrage-es512.jws` | dasselbe, signiert vom Blatt P-521, x5c = Blatt |

Private Schlüssel liegen hier nicht: der Erzeuger legt sie in einem Wegwerf-Verzeichnis an und löscht sie danach.

## Erzeugen

```
node tools/oid4vp-test-zertifikate-erzeugen.js tests/fixtures/oid4vp --openssl <pfad zu openssl 3.4 oder neuer>
```

Die Schlüssel sind zufällig, ein neuer Lauf ergibt andere Bytes; die Dateien hier sind eingefroren (neu erzeugt am
15.10.2026: Vorsilbe `test-`, jedes Blatt mit certificatePolicies `1.3.6.1.4.1.32473.3`, die Blätter aus dem Abschnitt `blatt` dazu ETSI
`0.4.0.194118.1.2` zur Anzeige). Prüfsummen: `shasum -a 256 tests/fixtures/oid4vp/test-*`. Die Proben prüfen
zum festen Zeitpunkt 2026-10-14T12:00:00Z.

## Wycheproof-Vektoren (fremdes Material, nicht hier)

Die ECDSA-Vektoren liegen als fremdes Material nicht in `tests/fixtures/` (dort nur selbst Erzeugtes, s.
`tests/fixtures/README.md`), sondern neben den übrigen Wycheproof-Dateien in `tests/konformitaet/vectors/`, unverändert.
Test vectors from C2SP/wycheproof project, Apache License 2.0, https://github.com/C2SP/wycheproof — bleibt Apache-2.0.

| Datei | Quelle | sha256 |
|---|---|---|
| `ecdsa_secp256r1_sha256_test.json` | https://raw.githubusercontent.com/C2SP/wycheproof/7a325932231bd7a724c791c8b0d65ea4d6d2f435/testvectors_v1/ecdsa_secp256r1_sha256_test.json | `182db4f3e230f6f9fa9f800d2a614dede30284b8e8438bbfe1171905402e9332` |
| `ecdsa_secp521r1_sha512_test.json` | https://raw.githubusercontent.com/C2SP/wycheproof/7a325932231bd7a724c791c8b0d65ea4d6d2f435/testvectors_v1/ecdsa_secp521r1_sha512_test.json | `0fa3bb09a2319242253028b53d555fb8ec2081d891271321205cdaeabb3eef3e` |

Abgerufen am 14.10.2026 (Commit vom 12.10.2026). Nachsehen: `shasum -a 256 tests/konformitaet/vectors/ecdsa_*_test.json`;
die Probe hält beide Summen fest.
