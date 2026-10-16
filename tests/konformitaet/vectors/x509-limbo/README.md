# x509-limbo — gepinnte Auswahl für den X.509-Leser

Fremdvektoren für die Pfadprüfung des X.509-Lesers im Kern (Spanne `X509-LESER` in `vivodepot.html`). Gefahren von
`tests/x509-limbo.test.js`; gegengeprüft außerhalb des Kerns mit `tools/x509-gegenprobe.js` (openssl verify).

## Quelle

C2SP/x509-limbo, https://github.com/C2SP/x509-limbo, Apache License 2.0 (Lizenztext unverändert in `LICENSE`).

| | |
|---|---|
| Commit | `554528a9b0c0d95e071f55de018326f0b65a8364` |
| `limbo.json` | 41 791 455 Bytes, sha256 `611e337b9fb477b927bae65434650692cb9d2070ff5b05f975d0403510acd4de` |
| `LICENSE` | 11 360 Bytes, sha256 `aac73b3148f6d1d7111dbca32099f68d26c644c6813ae1e4f05f6579aa2663fe` |

Abruf (die ganze Datei liegt nicht im Repo):

```
curl -fsSL -o limbo.json https://raw.githubusercontent.com/C2SP/x509-limbo/554528a9b0c0d95e071f55de018326f0b65a8364/limbo.json
curl -fsSL -o LICENSE    https://raw.githubusercontent.com/C2SP/x509-limbo/554528a9b0c0d95e071f55de018326f0b65a8364/LICENSE
shasum -a 256 limbo.json LICENSE
node tools/x509-limbo-umfang-erzeugen.js --limbo limbo.json --lizenz LICENSE --openssl <openssl 3.x>
```

Erzeugt am 15.10.2026 mit OpenSSL 3.6.4; derselbe Lauf mit derselben Eingabe ergibt dieselben Bytes.

## Umfang und Schwelle (festgelegt vor jedem Lauf des Lesers)

Die Einteilung steht im Kopf von `tools/x509-limbo-umfang-erzeugen.js`; Schlüssel- und Signaturart misst openssl, nicht der Leser.
**Schwelle:** ein angenommener FAILURE-Fall im Umfang ist ein Befund; mehr als drei abgewiesene SUCCESS-Fälle im Umfang
heißen Umkehr zu pkijs. Fälle mit einem Produktregel-Grund sind außerhalb, MÜSSEN aber abgewiesen werden: nameConstraints,
Richtlinien, unbekannte kritische Erweiterung oder kein v3 am Blatt oder an einem Anker (beide liest der Leser sicher),
keyUsage, fremde oder kritische EKU, Seriennummer über 20 Oktette; an jedem Anker: ohne CA:TRUE/keyCertSign, leerer Name, irgendeine EKU. Dieselben Funde an
einem Zwischenzertifikat aus dem Vorrat sind ein Grund „außerhalb" (der Leser liest es nur, wenn es in x5c steht).
Fälle ohne `validation_time` laufen zur festen Zeit `2026-10-15T00:00:00Z`.

## Dateien

| Datei | Inhalt | Bytes | sha256 |
|---|---|---|---|
| `umfang.json` | 71 Fälle im Umfang, mit Zertifikaten | 139 691 | `fc66b0f6565c979284e14487126f6ac4613030c8f375c10525dac2d2025c3232` |
| `ausserhalb.json` | 517 Fälle außerhalb, mit Zertifikaten | 2 501 583 | `bf29ab6c448d58b1b707452bc29f595478e0fddaeb2a4cf7b4bd889b764821cc` |
| `nur-gelistet.json` | 9 214 Fälle nur mit Kennung und Grund | 478 646 | `54b04d3d3a6e4a951a76b8b697d99857b264778d2b03372cf51440ad0bf175cf` |
| `LICENSE` | Apache License 2.0, unverändert | 11 360 | `aac73b3148f6d1d7111dbca32099f68d26c644c6813ae1e4f05f6579aa2663fe` |
| `bewusst-anders.json` | 13 FAILURE-Fälle im Umfang, die der Leser nach vier Regeln annehmen darf (von Hand, vor jedem Lauf) | 3 568 | `ff348dccf028b3bb1527472170dc60585d969bd2fd5930a6626d7b58b36b485b` |
| `erwartet-angenommen.json` | 1 FAILURE-Fall im Umfang, den eine entschiedene eigene Regel annimmt | 500 | `b7cd1e819a359ec7da91d3632e8abe70f46a1c056af639aab4b231c254552ef8` |
| `befund-offen.json` | 1 FAILURE-Fall im Umfang, geduldet nur solange sein Befund in der Befund-Ratsche offen ist | 589 | `7c3414e2167f568c378a1cd21a8a3db4b5cf8c60249d8d48f01f67f34a709824` |

Umgeformt: jedes Zertifikat steht einmal (DER als base64 unter den ersten 20 Hex-Zeichen seiner sha256), die Fälle verweisen
darauf. Weggelassen: Beschreibungen, private Schlüssel (`peer_certificate_key`), CRLs.

`nur-gelistet.json`: mit allen Daten läge die Auswahl über 5 MB. Gelistet ohne Daten sind 12 bettertls-Fälle mit einem
Zertifikat außerhalb EC P-256/384/521 und 9 202 bettertls-Fälle mit nameConstraints in einem Zwischenzertifikat (der Leser
weist ein Zertifikat mit nameConstraints beim Lesen ab); von diesen bleibt jeder 50. mit Daten in `ausserhalb.json`.

## Bewusst anders (Wort der Gegenlesung 15.10.2026)

`bewusst-anders.json`, festgelegt vor jedem Lauf aus den Fallbeschreibungen und der openssl-Sicht der Zertifikate: FAILURE-Fälle
im Umfang, die allein an einer von vier Regeln hängen — AKI/SKI fehlt (5), Seriennummer 0 (1), Blatt ohne EKU oder mit
anyExtendedKeyUsage (2), AKI-Inhalt der Wurzel (5). Daneben `erwartet-angenommen.json`: `rfc5280::eku::ee-wrong-eku` nimmt die
entschiedene Regel `_X509_EKU_ERLAUBT` (clientAuth erlaubt) an. Geltungsbereich „Ankersatz Zugang (geschlossen)"; ein neuer Ankersatz verlangt, die Liste neu zu lesen.
Die Zahl ist ein Deckel (nur sinkend), ein Eintrag ohne Wirkung ist rot, jeder andere angenommene FAILURE-Fall im Umfang ein Befund
(tests/x509-limbo.test.js). Alle FAILURE-Fälle der vollen limbo.json fährt `tools/x509-limbo-voll-messen.js --limbo <datei>`.

## Zahlen je Gruppe

| Gruppe | Fälle | im Umfang SUCCESS | im Umfang FAILURE | davon EKU-abhängig | außerhalb SUCCESS | außerhalb FAILURE | mit Produktregel | nur gelistet |
|---|---|---|---|---|---|---|---|---|
| bettertls | 9 572 | 0 | 0 | 0 | 865 | 8 707 | 0 | 9 214 |
| rfc5280 | 109 | 8 | 25 | 32 | 21 | 55 | 43 | 0 |
| webpki | 56 | 1 | 29 | 30 | 5 | 21 | 5 | 0 |
| crl | 17 | 0 | 0 | 0 | 7 | 10 | 1 | 0 |
| online | 14 | 0 | 0 | 0 | 14 | 0 | 2 | 0 |
| pathlen | 13 | 5 | 2 | 7 | 4 | 2 | 1 | 0 |
| pathological | 11 | 0 | 1 | 1 | 1 | 9 | 3 | 0 |
| rfc9881 | 6 | 0 | 0 | 0 | 3 | 3 | 0 | 0 |
| cve | 3 | 0 | 0 | 0 | 1 | 2 | 0 | 0 |
| invalid | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| **zusammen** | **9 802** | **14** | **57** | **70** | **921** | **8 810** | **55** | **9 214** |

Nachsehen: `node tools/x509-limbo-umfang-erzeugen.js --limbo limbo.json --ausgabe <leerer ordner>` druckt dieselbe Zählung.
