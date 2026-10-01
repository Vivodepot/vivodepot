# U2-ADR-449: Die Antwort auf eine Anfrage als JWE

**Status:** Angenommen (29.09.2026)
**Datum:** 29.09.2026
**Kategorie:** KRYPTO, STANDARDS, RÜCKWEG
**Linie:** U2
**Bezug:** U2-ADR-153 (der verschlüsselte Rückweg, dessen Umschlag v1 hier abgelöst wird) · U2-ADR-047 (SHL-JWE, von Hand
gerollt) · U2-ADR-085 (QR-Zusammensetzer) · U2-ADR-450 und -453 (reserviert: Inhalt als FHIR Questionnaire, Posteingang)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Ausgangslage

Die Bürger-App verschlüsselte die Antwort auf eine Anfrage in einem eigenen Umschlag (`dateiTyp: 'vivodepot-antwort'`, `v: 1`,
U2-ADR-153): AES-GCM mit eigener AAD aus Verfahren, Vorgang und Anbieter; ECDH P-256 mit HKDF bzw. PBKDF2. Das war sauber, aber
kein Standard. Kein fremdes System konnte die Antwort lesen, und sie war nie gegen eine Fremdbibliothek geprüft.

## Entscheidung

Entschieden am 29.09.2026, vorher unabhängig gegengelesen (drei Auflagen zur Kompression, zwei zum Einmalpasswort).

1. **JWE Compact Serialization nach RFC 7516, `enc` immer A256GCM.** Zwei Verfahren, dieselben wie bisher:
   - **Schlüsselpaar:** `alg` ECDH-ES direkt (RFC 7518 §4.6) auf P-256. Die Bürgerin erzeugt ein flüchtiges Paar; nur dessen
     öffentlicher Teil reist als `epk`. Die Vorgangskennung geht als `apv` in die Concat KDF. Ein umetikettierter Vorgang ergibt
     einen anderen Schlüssel, also einen GCM-Fehlschlag. Die Kurve bleibt P-256 (Begründung aus U2-ADR-153).
   - **Einmalpasswort:** `alg` PBES2-HS512+A256KW (RFC 7518 §4.8) mit `p2c` fest 600.000. Der Empfänger nimmt **nur genau
     diesen Wert** an. Ein manipulierter Kopf mit riesigem `p2c` legte sonst die Empfängerseite lahm. Das ist eigene Vorsicht:
     RFC 7518 nennt keine Obergrenze, RFC 8725 erwähnt `p2c` nicht (am 29.09.2026 im Text gesucht). Es passt zu RFC 8725 §3.5:
     Passwörter nur zur Schlüsselverschlüsselung.
2. **Der geschützte Kopf ist die AAD** (RFC 7516 §5.1). Er trägt `typ` = `vivodepot-antwort+jwe` (explizite Typisierung,
   RFC 8725 §3.11), `cty`, `vorgang`, `anbieter`, beim Schlüsselpaar `epk` und `apv`, beim Passwort `p2s` und `p2c`, dazu `pad`.
   **Der Kopf ist lesbar.** Wer das Handy filmt, sieht Vorgang und Füll-Länge, nicht den Inhalt. Der Vorgang steht ohnehin auf
   dem Zettel.
3. **Auffüllen auf Stufen** (1024, 2048, 3072, 4096, 6144, 8192, 12288, 16384 Zeichen) über den privaten Kopfparameter `pad`
   (RFC 7516 §4.3). Der Klartext bleibt unberührt. Die Länge liegt auf der Stufe oder ein Zeichen darunter, weil base64url eine
   Kopflänge ≡ 1 mod 4 nie erreicht.
4. **Keine Kompression in dieser Fassung.** Der Klartext trägt heute Text aus der Anfrage (Zweck, Grundlage, Zweck je Feld),
   und das Antwort-Blatt der Lese-App verspricht, ihn zu zeigen. Kompression neben fremdbestimmtem Text verrät Inhalt über die
   Länge (RFC 8725 §3.6). `zip` kommt mit U2-ADR-450, wenn die Anfrage nur noch auf eine Werk-Vorlage verweist. Dann gelten die
   drei Auflagen: kein Anfrage-Text im Körper, Stufen, Entpacken erst nach GCM mit Obergrenze. Bis dahin lehnt die Lese-App
   `zip` ab.
5. **Ein Block, zwei Dateien.** Der ANTWORT-JWE-BLOCK steht in `vivodepot.html` und `vivodepot-lesen.html` zeichengleich. Eine
   Probe hält das fest.
6. **Die Lese-App liest beide Fassungen.** Eine JWE erkennt sie am Text aus fünf Teilen mit passendem `typ`, vor dem JSON-Weg,
   als Datei und über die QR-Serie. Den Umschlag v1 erkennt sie weiter wie bisher. Der Kern schreibt nur noch JWE. Die
   v1-Funktionen im Kern bleiben vorerst: Die Lese-Proben brauchen sie als Gegenstück. Ihr Rückbau ist ein eigener Schnitt.
7. **Die Datei** heißt `…_Antwort_<Vorgang>.jwe` und hat den Medientyp `application/jose` (RFC 7516 §9).

**Gemessen am 29.09.2026, außerhalb der Suite, weil es eine Fremdbibliothek braucht** (`tools/antwort-jwe-messen.js
--jose <pfad>`):
- `jose` 5.10.0 öffnet unsere ECDH-ES- und PBES2-Antworten.
- Wir öffnen von `jose` erzeugte.
- Für `p2c` = 600.000 braucht `jose` die Option `maxPBES2Count`. Sein Standard ist 10.000; das ist dieselbe Vorsicht wie
  Punkt 1.
- Ein fremder Empfänger mit `jose` muss sie setzen.

**Nicht in dieser Fassung:** Die QR-Serie der Antwort in der Bürger-App kommt mit dem Eingang im Studio, der sie liest. Heute
geht die Antwort als Datei hinaus. Die Lese-App nimmt dieselbe JWE schon aus einer QR-Serie (Einfügen oder Kamera).

**Externe Krypto-Review vor Produktivschaltung**, dieselbe Auflage wie U2-ADR-047 und U2-ADR-153.

```yaml
konformitaet:
  - aussage: >-
      Der Kern schreibt die Antwort als JWE (ECDH-ES bzw. PBES2-HS512+A256KW, A256GCM); die Lese-App öffnet sie zum selben Datensatz.
    zustand: erfuellt
    herkunft: RFC 7516, RFC 7518
    pruefung:
      - tests/antwort-jwe.test.js
        "[Antwort·JWE] Schlüsselpaar: der Kern schreibt eine JWE, die Lese-App öffnet sie zum selben Datensatz"
      - tests/antwort-jwe.test.js
        "[Antwort·JWE] Einmalpasswort: PBES2-HS512+A256KW mit festem p2c, die Lese-App öffnet"
  - aussage: >-
      Die Concat KDF ergibt den Schlüssel aus dem Vektor von RFC 7518 Anhang C.
    zustand: erfuellt
    herkunft: RFC 7518 Anhang C
    pruefung:
      - tests/antwort-jwe.test.js
        "[Antwort·JWE·Konformität] die Concat KDF ergibt den Schlüssel aus RFC 7518 Anhang C"
  - aussage: >-
      Ein umetikettierter Vorgang, ein geänderter Kopf, ein anderes p2c oder ein zip-Kopf öffnen nichts.
    zustand: erfuellt
    herkunft: RFC 7516 §5.1 (Kopf als AAD); eigene Vorsicht zu p2c
    pruefung:
      - tests/antwort-jwe.test.js
        "[Antwort·JWE·Rot-Beweis] ein umetikettierter Vorgang, ein geänderter Kopf, ein gekipptes Byte: nichts öffnet sich"
      - tests/antwort-jwe.test.js
        "[Antwort·JWE·Rot-Beweis] ein anderes p2c und ein zip-Kopf werden abgelehnt, bevor gerechnet wird"
  - aussage: >-
      Der Block steht in Kern und Lese-App zeichengleich.
    zustand: erfuellt
    herkunft: Entscheidung vom 29.09.2026
    pruefung:
      - tests/antwort-jwe.test.js
        "[Antwort·JWE·Spiegel] der Block steht in Kern und Lese-App genau einmal und zeichengleich"
```
