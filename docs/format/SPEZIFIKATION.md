# Vivodepot: Spezifikation des Depot-Dateiformats (`.vivodepot`)

**Fassung:** Dateikopf-Version 1, `kryptoVersion` 3 und 4, Inhalt bis Schemastufe 92.
**Prüfprogramm:** `node tools/format-pruefen.js --datei <pfad>` (eigene Umsetzung dieses Dokuments, lädt die Anwendung nicht).
**Testkorpus:** [`korpus/`](korpus/) mit erwartetem Urteil je Datei.
**Lizenz:** wie das Repository (EUPL-1.2); siehe Abschnitt 12.

Die Schlüsselwörter MUSS, DARF NICHT, SOLL und DARF sind wie in RFC 2119 zu lesen.

## 0 · Gegenstand

Dieses Dokument beschreibt die `.vivodepot`-Datei so, dass ein Programm ohne Vivodepot-Code sie lesen, prüfen und schreiben kann: Dateikopf, Klartext-Umschlag, Schlüsselableitung, Verschlüsselung, Aufbau des Inhalts.

Es beschreibt nicht:
- Exportformate (FHIR, vCard, SD-JWT-VC und andere). Sie sind Übersetzungen aus dem Depot heraus und in `STANDARDS.md` beschrieben.
- Wie Module und Vorlagen entstehen und signiert werden. Ein Modul, das in einem Depot mitgebracht wird, ist für dieses Dokument ein Inhaltswert.
- Bedienung und Oberfläche.

## 1 · Parameter

Alle Zahlen und Kennungen dieses Formats an einer Stelle. Die Krypto-Parameter stehen im gepinnten Krypto-Block [`vivodepot-krypto-kern-PORT-VERBATIM.js`](../../vivodepot-krypto-kern-PORT-VERBATIM.js), den die Anwendung byte-gleich trägt; die übrigen in [`format-parameter.json`](format-parameter.json). Das Prüfprogramm liest beide Quellen zur Laufzeit. `tests/format-spezifikation-kern.test.js` hält diese Tabelle, beide Quellen und die Anwendung gleich.

| Name | Wert | Bedeutung |
|---|---|---|
| `dateiKennung` | VIVODEPOT | die ersten 9 Byte |
| `dateiKopfVersionen` | [1] | bekannte Werte des Versions-Bytes |
| `KRYPTO_VERSION_ALLOWLIST` | [3,4] | erlaubte Werte von `kryptoVersion` |
| `PBKDF2_ITERATIONS` | 600000 | Runden der Passwort-Ableitung |
| `HKDF_HASH` | SHA-256 | Hash für HKDF und HMAC; PBKDF2 nutzt ebenfalls SHA-256 |
| `HKDF_KEY_LENGTH_BITS` | 256 | Länge aller abgeleiteten Schlüssel |
| `pbkdf2SalzBytes` | 16 | Länge von `pbkdf2.salt` und `kdf.salt` |
| `SUBDEPOT_CRYPTO_SALT_LENGTH_BYTES` | 32 | Länge von `depotSalt` und `kdf.tuerSalt` |
| `ivBytes` | 12 | Länge jedes AES-GCM-IV |
| `HKDF_INFO_DEPOT_V2_PREFIX` | vivodepot/v3/depot/ | HKDF-`info` des Depot-Schlüssels, gefolgt von der `depotUUID` |
| `HKDF_INFO_ADRESSE_V4_PREFIX` | vivodepot/v4/adressen/ | HKDF-`info` des Adress-Schlüssels, gefolgt von der `depotUUID` |
| `ZERFALL_ADRESSE_BYTES` | 16 | Länge einer Feld-Adresse |
| `einheitStufeBytes` | 1024 | Auffüllstufe einer Feld-Einheit |
| `geheimPolsterZeichen` | 512 | Auffüllstufe eines Geheimteils |
| `fachKennungPraefix` | Fach␠ | Kennung der Tabelleneinträge: „Fach 1“, „Fach 2“, … (␠ = Leerzeichen) |
| `schemaVersionAktuell` | 92 | höchste beschriebene Schemastufe des Inhalts |
| `whcForm` | 1 | Form des Feldes `wiederherstellung` |
| `whcSalzBytes` | 32 | Salz im Feld `wiederherstellung` |
| `whcHuelleBytes` | 48 | Länge der Hülle im Feld `wiederherstellung` |

## 2 · Dateikopf

```
[VIVODEPOT][VERSION][JSON]
```

| Teil | Länge | Wert |
|---|---|---|
| Kennung | 9 Byte | ASCII `VIVODEPOT` |
| Version | 1 Byte | heute `0x01` |
| JSON | Rest | UTF-8, ein JSON-Objekt (Abschnitt 3) |

- Beginnt die Datei nicht mit `VIVODEPOT`, ist sie eine Datei aus der Zeit vor dem Kopf (vor dem 02.07.2026). Der ganze Inhalt ist dann das JSON-Objekt. Ein Leser MUSS diese Form lesen.
- Ein Leser MUSS eine Datei mit einem Versions-Byte ablehnen, das er nicht kennt, und DARF sie NICHT verändern oder überschreiben. Eine neue Kopf-Version bedeutet eine Form, die ältere Leser nicht verstehen.
- Leerraum im JSON gehört nicht zum Format. Die Anwendung schreibt mal eingerückt, mal kompakt.

**Blackbox-Hülle.** Eine Datei DARF statt des Umschlags `{ "dateiTyp": "vivodepot-blackbox-export", "formatVersion": 1, "umschlag": { … } }` tragen. Ein Leser nimmt dann `umschlag` als Umschlag. Die Anwendung schreibt diese Form beim Herausgeben eines Teil-Depots, als `.json`-Datei ohne Dateikopf (U2-ADR-043); ein Prüfer meldet dann auch `VDF-OHNE-KOPF`.

## 3 · Der Umschlag

Jeder Umschlag trägt:

| Feld | Typ | Inhalt |
|---|---|---|
| `kryptoVersion` | Zahl | 3 oder 4 |
| `depotUUID` | Text | je Depot einmal zufällig erzeugte UUID |
| `pbkdf2.salt` | Base64 | 16 Byte Zufall |
| `depotSalt` | Base64 | 32 Byte Zufall |

Danach genau eine von zwei Formen. Ein Leser MUSS die Form an der Struktur prüfen, bevor er entschlüsselt. So unterscheidet er „Datei kaputt“ von „Passwort falsch“.

- **Form der `kryptoVersion` 3:** `iv` (Base64, 12 Byte) und `ct` (Base64). Der ganze Inhalt ist ein Chiffrat.
- **Form der `kryptoVersion` 4:** `einheiten` (Objekt: Adresse → `{iv, ct}`) und `umschlagTabelle` (Liste, mindestens ein Eintrag).

Eine Datei mit beiden Formen oder keiner ist ungültig, ebenso eine Form, die nicht zu `kryptoVersion` passt.

**Felder im Klartext neben dem Umschlag** (Abschnitt 8): `angehoerigenOrt`, `wiederherstellung`, `stand_marke`, `gespeichert_am`. Diese Felder und die oben genannten bilden die **Basismenge**. Ein Feld außerhalb der Basismenge SOLL ein Leser unverändert weitertragen. In Form 4 bindet die Anwendung diese Felder im Geheimteil (Abschnitt 8.3).

### 3.1 · Feld-Einheit (`einheiten[adresse]`)

`{ "iv": "<Base64, 12 Byte>", "ct": "<Base64>" }`. Entschlüsselt ergibt sich `{ "name": "<Feldname>", "wert": <Wert>, "_pad": "<Leerzeichen>" }`.
- `name` ist der Feldname (Abschnitt 6). Er reist mit, damit eine Adresse, die ein Leser nicht kennt, ihr Urbild behält.
- `_pad` füllt den UTF-8-kodierten JSON-Text der Einheit auf ein Vielfaches von `einheitStufeBytes` auf (seit U2-ADR-464). Ein Leser DARF `_pad` NICHT auswerten. Einheiten ohne `_pad` stammen aus Dateien vor dem 01.10.2026 und sind gültig.

### 3.2 · Eintrag der Umschlagstabelle

```json
{
  "kennung": "Fach 1",
  "kdf": { "salt": "<Base64, 16 Byte>", "iterationen": 600000, "tuerSalt": "<Base64, 32 Byte, nur Einträge ab 2>" },
  "fachSchluessel": { "iv": "…", "ct": "…" },
  "umschlaege": { "<adresse>": { "iv": "…", "ct": "…" } },
  "geheim": { "iv": "…", "ct": "…" }
}
```

- `kennung` ist „Fach 1“, „Fach 2“, … in Tabellenreihenfolge. Der Anker (Eintrag 1, die Inhaberin) trägt denselben neutralen Namen wie jedes Fach. Was die Datei ohne Passwort über die Einträge zeigt, steht in 8.2.
- **Eintrag 1** gehört der Inhaberin. Sein `kdf.salt` ist `pbkdf2.salt`. Er trägt kein `fachSchluessel`.
- **Jeder weitere Eintrag** ist ein Fach für einen Empfängerkreis mit eigenem Passwort (Abschnitt 4.5).
- `kdf.iterationen` MUSS `PBKDF2_ITERATIONS` sein. Die Anwendung liest das Feld nicht und leitet immer mit diesem Wert ab (U2-ADR-230). Eine Datei mit anderem Wert ist nicht in diesem Format geschrieben.
- `umschlaege` trägt für **jede** Adresse aus `einheiten` einen Eintrag. Für Adressen, die dieser Eintrag nicht öffnen darf, steht dort eine Attrappe: Zufallsbytes in derselben **Byte-Länge** wie ein echter Umschlag (`iv` 12 Byte, `ct` so lang wie ein echtes `ct`). Sonst verriete die Zahl oder die Länge der Umschläge, welche und wie viele Einheiten ein Fach öffnet. Alle Umschläge einer Datei MÜSSEN darum gleich lang sein; ein Leser prüft das ohne Passwort (`VDF-ATTRAPPE`).
- `geheim` entschlüsselt zu `{ name, ortHinweis, stand, adressen, giltBis?, vertretung?, ortGebunden?, fremdHash?, polster }`:
  - `adressen` ist das **Verzeichnis** der Adressen, die dieser Eintrag öffnet. Weil es verschlüsselt ist, kann niemand eine Einheit samt Umschlag entfernen, ohne dass es auffällt.
  - `giltBis` (Datum `JJJJ-MM-TT`, nur an einem Fach): danach öffnet das Fach nicht mehr (U2-ADR-452).
  - `ortGebunden` und `fremdHash`: die Klartext-Bindung (Abschnitt 8.3).
  - `polster` (Punkte) füllt alle Geheimteile einer Datei auf dieselbe Länge. Die Anwendung wählt die Ziel-Länge als Vielfaches von `geheimPolsterZeichen` und schreibt den JSON-Text heute ein Zeichen länger als dieses Vielfache. Für einen Leser zählt nur: **Alle Geheimteile einer Datei MÜSSEN als Chiffrat gleich lang sein**, gemessen in Bytes des UTF-8-Klartexts. Sonst verriete die Länge, welcher Eintrag welche Angaben trägt, etwa einen Kreisnamen mit Umlaut (`VDF-POLSTER`).

## 4 · Schlüssel

Alle Schritte sind Standardverfahren (PBKDF2, HKDF nach RFC 5869, HMAC, AES-GCM), wie sie Web Crypto und jede übliche Krypto-Bibliothek anbieten.

### 4.1 · Passwort → Master

```
masterBits = PBKDF2-HMAC-SHA256(UTF-8(passwort in NFC), pbkdf2.salt, PBKDF2_ITERATIONS, 256 Bit)
master     = masterBits als HKDF-Eingangsschlüssel
```

Ein Leser MUSS das Passwort nach Unicode NFC normalisieren. Schlägt das Öffnen fehl, liegt das eingegebene Passwort nicht schon in NFC vor und unterscheidet sich seine NFD-Form von der NFC-Form, SOLL er genau einen zweiten Versuch mit NFD machen. Damit öffnen Dateien, die vor der Normalisierung geschrieben wurden.

Die Master-Bits werden nie selbst als Schlüssel verwendet, nur als Grundlage der folgenden Ableitungen (Schlüsseltrennung).

### 4.2 · Depot-Schlüssel

```
depotKey = HKDF-SHA256(master, salt = depotSalt, info = HKDF_INFO_DEPOT_V2_PREFIX + depotUUID) → AES-256-GCM
```

Das „v3“ im `info` benennt die Ableitungsfamilie, nicht die Dateiform. Beide Formen nutzen denselben Depot-Schlüssel.

### 4.3 · Adress-Schlüssel und Feld-Adresse (`kryptoVersion` 4)

```
adressKey = HKDF-SHA256(master, salt = depotSalt, info = HKDF_INFO_ADRESSE_V4_PREFIX + depotUUID) → HMAC-SHA256
adresse   = Base64( erste ZERFALL_ADRESSE_BYTES Byte von HMAC-SHA256(adressKey, UTF-8(name)) )
```

- Adressen wechseln beim Speichern nicht. Wer zwei Fassungen derselben Datei sieht, erkennt an gleichbleibenden Adressen, welche Einheiten sich geändert haben. Dieses Restrisiko ist getragen (U2-ADR-149).
- Die Anwendung prüft beim Lesen nicht, ob eine Adresse zu ihrem Namen passt. Das Prüfprogramm meldet eine Abweichung als Hinweis (`VDF-ADRESSE-NAME`), beim Öffnen mit dem Passwort der Inhaberin.

### 4.4 · Inhaltsschlüssel und Wickeln (`kryptoVersion` 4)

- Jede Einheit hat einen eigenen Inhaltsschlüssel: 32 Byte Zufall, AES-256-GCM.
- Gewickelt wird er so: `umschlag = AES-GCM-Verschlüsseln( Base64(Inhaltsschlüssel) )` unter dem Schlüssel des Eintrags, mit der AAD der Einheit (4.6).
- Der Klartext ist der JSON-Text der Base64-Zeichenkette, also mit Anführungszeichen (Abschnitt 4.7).
- Der Schlüssel des Eintrags ist für Eintrag 1 der Depot-Schlüssel und für ein Fach dessen Fachschlüssel (4.5). Derselbe Inhaltsschlüssel liegt so oft gewickelt vor, wie es Einträge gibt, die die Einheit öffnen.

### 4.5 · Fach eines Empfängerkreises

```
tuerMaster = PBKDF2 wie 4.1 mit dem Passwort des Fachs und kdf.salt des Eintrags
tuerKey    = HKDF-SHA256(tuerMaster, salt = kdf.tuerSalt (fehlt es: depotSalt), info = HKDF_INFO_DEPOT_V2_PREFIX + depotUUID)
fachKey    = AES-GCM-Entschlüsseln(fachSchluessel, tuerKey, AAD des Eintrags)   → Base64 von 32 Byte
```

`fachKey` öffnet `geheim` und die Umschläge dieses Eintrags. `kdf.tuerSalt` fehlt bei Fächern, die vor dem 21.08.2026 eingerichtet wurden, auch in später geschriebenen Dateien.

### 4.6 · AAD

Jedes Chiffrat bindet zusätzliche Daten (AAD): den UTF-8-Text von `JSON.stringify(aad)`, **in genau dieser Schlüsselreihenfolge und ohne Leerraum**. Ein Leser in einer anderen Sprache MUSS byte-gleich dieselbe Zeichenkette bilden, sonst scheitert die Prüfung trotz richtigem Passwort.

| Chiffrat | AAD |
|---|---|
| Inhalt der Form 3 (`ct`) | `{"kryptoVersion":3,"iterationen":600000,"kdfTyp":"hkdf-sha256"}` |
| Feld-Einheit und ihre Umschläge | `{"kryptoVersion":4,"iterationen":600000,"kdfTyp":"hkdf-sha256","depotUUID":"<depotUUID>","adresse":"<adresse>"}` |
| `geheim` und `fachSchluessel` eines Eintrags | wie eine Einheit, mit der `kennung` des Eintrags als `adresse` |
| Hülle im Feld `wiederherstellung` | `["vivodepot-wiederherstellung-1","<depotUUID>",4]` |

Die AAD einer Einheit enthält `depotUUID` und ihre Adresse: Ein Chiffrat lässt sich nicht an eine andere Adresse oder in ein anderes Depot verschieben und dort öffnen. **Restrisiko:** Eine Einheit samt Umschlag aus einer älteren Fassung desselben Depots öffnet an ihrer Adresse weiter, solange das Passwort nicht gewechselt wurde. Wer zwei Fassungen hat, kann so einzelne Felder auf einen älteren Stand zurücksetzen.

### 4.7 · Verschlüsselung

```
iv = 12 Byte Zufall, je Vorgang neu
ct = AES-256-GCM(UTF-8(JSON.stringify(wert)), key, iv, AAD)     gespeichert als { iv: Base64(iv), ct: Base64(Chiffrat mit Tag) }
```

Base64 ist das Standardalphabet mit Auffüllung (RFC 4648 §4). Ein falscher Schlüssel und jede Änderung an Chiffrat oder AAD lassen die GCM-Prüfung scheitern. Daran erkennt ein Leser beides.

## 5 · Lesen

1. Kopf prüfen und abtrennen (Abschnitt 2), JSON lesen, eine Blackbox-Hülle auspacken.
2. Umschlag prüfen (Abschnitt 3, Stufe 1 in Abschnitt 9). Ein Strukturfehler ist kein Passwortfehler und DARF NICHT zum Ausprobieren weiterer Einträge führen.
3. Master und Depot-Schlüssel ableiten (4.1, 4.2).
4. **Form 3:** `ct` mit Depot-Schlüssel und AAD öffnen. Das Ergebnis ist der Inhalt.
5. **Form 4:**
   - Zuerst Eintrag 1 mit dem Depot-Schlüssel: `geheim` öffnen. Jede Adresse des Verzeichnisses MUSS Umschlag und Einheit haben. Dann jede Einheit über ihren Umschlag öffnen.
   - Passt der Depot-Schlüssel nicht, die weiteren Einträge der Reihe nach über ihre Tür versuchen (4.5).
   - Ein Fach, dessen `giltBis` vor dem heutigen Datum liegt, öffnet nicht. Ein anderes Fach derselben Datei darf mit demselben Passwort noch öffnen.
   - Fehlt im Geheimteil des Ankers das Verzeichnis (Dateien vor dem 21.08.2026), liest die Anwendung über den Vergleich „zu jedem Umschlag eine Einheit und umgekehrt“.
6. Die Einheiten zusammensetzen (Abschnitt 6).
7. Klartext-Bindung prüfen (Abschnitt 8.3).

## 6 · Der Inhalt

Der entschlüsselte Inhalt ist ein JSON-Objekt:

```
{ "schemaVersion": <Zahl>, "sektoren": { "<bereich>": { "<feld>": <wert>, … }, … }, … weitere Schlüssel }
```

**Zusammensetzen aus Einheiten (Form 4):**
- Name `sektoren`: Der Wert ist die Liste der Bereiche. Jeder wird als leeres Objekt angelegt.
- Name mit Punkt (`bereich.feld`): Der Wert ist das Feld `feld` im Bereich `bereich`.
- Jeder andere Name: ein Schlüssel der obersten Ebene.
- Die Reihenfolge der Einheiten in der Datei ist nicht zugesichert. Ein Leser MUSS erst alle Einheiten lesen und dann zusammensetzen.

**Schemastufe:**
- `schemaVersion` zählt Änderungen am Inhalt, unabhängig von `kryptoVersion`. Die Anwendung hebt ältere Stufen beim Öffnen über eine lückenlose Migrationskette auf die aktuelle (U2-ADR-075, U2-ADR-231).
- Eine Stufe über `schemaVersionAktuell` stammt aus einer neueren Fassung. Die Anwendung öffnet sie nur lesend und schreibt nichts hinein.
- Ein Fach trägt nur einen Ausschnitt des Inhalts.

**Feldnamen:** Die Kennungen `bereich.feld` stehen im Feldregister ([`bereiche/feldkatalog.json`](../../bereiche/feldkatalog.json), öffentlich unter `https://register.vivodepot.de/feldregister.json`). Felder, die ein Bereichsmodul mitbringt, und Felder älterer Fassungen können darüber hinausgehen. Ein Leser SOLL sie unverändert tragen.

## 7 · Schreiben

1. Salze: `pbkdf2.salt` (16 Byte) und `depotSalt` (32 Byte), kryptographisch zufällig. Sie bleiben, bis das Passwort wechselt.
2. Schlüssel ableiten (4.1 bis 4.3).
3. **Form 3:** den ganzen Inhalt verschlüsseln. **Form 4:**
   - Den Inhalt zerlegen, jede Einheit auffüllen (3.1) und mit eigenem Inhaltsschlüssel verschlüsseln.
   - Den Inhaltsschlüssel für jeden Eintrag wickeln, der die Einheit öffnet. Für alle anderen Einträge eine Attrappe derselben Byte-Länge einsetzen.
   - Je Eintrag den Geheimteil mit Verzeichnis und Polster schreiben.
4. Klartextfelder setzen und ihre Bindung in jeden Geheimteil schreiben (8.3).
5. Kopf voranstellen und als `.vivodepot` speichern.

## 8 · Was ohne Passwort lesbar ist

### 8.1 · Absichtlich offen

- **`angehoerigenOrt`:** ein kurzer Hinweis, wo das Passwort eines Fachs liegt. Wer die Datei mit einem zweiten Passwort öffnen soll, muss ihn vorher lesen können. Er SOLL nie das Passwort selbst nennen; es ist ein Freitext der Inhaberin, die Anwendung erzwingt das nicht. Gibt es kein Fach, ist er `null` oder fehlt.
- **`wiederherstellung`:** `{ form, salz, iv, huelle }`, die Hülle für den Wiederherstellungs-Code (U2-ADR-430). Sie enthält die Master-Bits (4.1), verschlüsselt unter einem Schlüssel, der aus dem Code abgeleitet ist (PBKDF2 wie 4.1, Salz `salz`). Der Code steht nirgends in der Datei. Ohne ihn ist die Hülle nur auf Form prüfbar.
- **`gespeichert_am`:** der Zeitpunkt der Speicherung, offen lesbar. Seit U2-ADR-464 ersetzt `stand_marke` ihn; ohne Marke und in älteren Dateien steht er weiter offen.
- **`stand_marke`:** eine Marke für den Vergleich von Speicherständen (U2-ADR-464).

### 8.2 · Was die Datei ohne Passwort darüber hinaus zeigt

- die Zahl der Einheiten und die Zahl der Tabelleneinträge;
- welcher Eintrag der Anker ist: Eintrag 1, als einziger ohne `fachSchluessel`;
- bei einem Fach, ob es vor dem 21.08.2026 eingerichtet wurde (`kdf.tuerSalt` fehlt);
- die Größe jeder Einheit in Stufen von `einheitStufeBytes`;
- bei zwei Fassungen derselben Datei, welche Einheiten sich geändert haben (4.3).

Nicht sichtbar sind Feldnamen, Werte und Namen der Empfängerkreise. Welche und wie viele Einheiten ein Fach öffnet, ist nur dann nicht sichtbar, wenn alle Umschläge und alle Geheimteile die verlangte gleiche Länge haben (3.2). Dateien, die das nicht erfüllen, meldet das Prüfprogramm (`VDF-ATTRAPPE`, `VDF-POLSTER`). Ein Diagnosewerkzeug, das ohne Passwort prüft, sieht nur die Hülle.

### 8.3 · Klartext-Bindung

Klartextfelder lassen sich in der Datei ändern, ohne dass AES-GCM es merkt. Darum trägt in Form 4 jeder Geheimteil (seit 05.10.2026):
- `ortGebunden: true` und `ortHinweis`: den Ort-Hinweis, wie er beim Schreiben gesetzt war;
- `fremdHash`: Base64 von SHA-256 über die Felder außerhalb der Basismenge, als kanonisches JSON: Objektschlüssel rekursiv sortiert (nach UTF-16-Codeeinheiten), Listen in ihrer Reihenfolge, ohne Leerraum, `undefined` als `null`, Zeichen maskiert wie `JSON.stringify`.

Gebunden sind damit `angehoerigenOrt` und die Felder außerhalb der Basismenge. **Nicht gebunden** sind `stand_marke`, `gespeichert_am` und `wiederherstellung`; Form 3 hat keinen Geheimteil und keine Bindung.

Nach dem Öffnen vergleicht ein Leser beides mit dem Klartext. Bei Abweichung warnt die Anwendung; weicht der Hash ab, trägt sie keines der Felder außerhalb der Basismenge weiter. Ein fehlender Ort-Hinweis ist keine Abweichung. Geheimteile ohne `ortGebunden` stammen aus älteren Dateien und werden nicht geprüft.

## 9 · Konformität

Eine Datei ist **gültig**, wenn sie alle Prüfungen ihrer Stufe besteht. Das Prüfprogramm urteilt in drei Stufen, weil ohne Passwort nur die erste möglich ist:

| Stufe | prüft | braucht |
|---|---|---|
| 1 Hülle | Kopf, JSON, Basisfelder, Längen, Form, Tabelle, Paare von Einheit und Umschlag, gleich lange Umschläge und Geheimteile, Feld `wiederherstellung` | nichts |
| 2 Krypto | jeder geöffnete Eintrag: Geheimteil, Verzeichnis vollständig, jede Einheit öffnet unter ihrer AAD und trägt `{name, wert}`, Klartext-Bindung | Passwort |
| 3 Inhalt | `schemaVersion`, `sektoren` als Objekt aus Objekten, Feldkennungen | Passwort |

**Urteile:** `gültig` · `gültig, mit Hinweisen` · `ungültig` · `nicht vollständig geprüft`.
- Was nicht geprüft werden konnte, ist nie „gültig“.
- Ein falsches Passwort ist kein Urteil über die Datei.

**Exit-Codes:** 0 gültig, 1 ungültig, 2 nicht vollständig geprüft, 3 Bedienfehler.

**Codes.** Art `fehler` macht ungültig, `hinweis` nicht, `offen` beendet die Prüfung ohne Urteil.

| Code | Stufe | Art | Bedeutung |
|---|---|---|---|
| `VDF-KEIN-JSON` | 1 | fehler | nach dem Kopf folgt kein gültiges JSON |
| `VDF-KEIN-OBJEKT` | 1 | fehler | das JSON ist kein Objekt |
| `VDF-KOPF-VERSION` | 1 | fehler | unbekanntes Versions-Byte |
| `VDF-OHNE-KOPF` | 1 | hinweis | Datei ohne Kopf (vor dem 02.07.2026) |
| `VDF-BLACKBOX-HUELLE` | 1 | hinweis | Blackbox-Hülle um den Umschlag |
| `VDF-KRYPTOVERSION` | 1 | fehler | `kryptoVersion` nicht erlaubt |
| `VDF-PFLICHTFELD` | 1 | fehler | `depotUUID`, `pbkdf2.salt` oder `depotSalt` fehlt |
| `VDF-SALZ-LAENGE` | 1 | fehler | ein Salz hat nicht die verlangte Länge |
| `VDF-FORM` | 1 | fehler | beide Formen, keine, oder Form passt nicht zu `kryptoVersion` |
| `VDF-TABELLE` | 1 | fehler | Umschlagstabelle leer |
| `VDF-EINTRAG` | 1 | fehler | ein Eintrag, eine Adresse oder ein Chiffrat hat nicht die beschriebene Form |
| `VDF-KDF-PARAMETER` | 1 | fehler | `kdf.iterationen` weicht ab |
| `VDF-IV-LAENGE` | 1 | fehler | ein IV hat nicht 12 Byte |
| `VDF-PAARE` | 1 | fehler | zu einer Einheit fehlt in einem Eintrag der Umschlag, oder ein Umschlag hat keine Einheit |
| `VDF-WHC-FORM` | 1 | fehler | Feld `wiederherstellung` hat nicht die beschriebene Form |
| `VDF-FREMDFELD` | 1 | hinweis | Klartextfeld außerhalb der Basismenge |
| `VDF-ATTRAPPE` | 1 | hinweis | Umschläge verschieden lang: ohne Passwort ist erkennbar, welche Einheiten ein Fach öffnet |
| `VDF-POLSTER` | 1, 2 | hinweis | Geheimteile verschieden lang, oder Einheiten nicht aufgefüllt |
| `VDF-PASSWORT` | 2 | offen | mit diesem Passwort öffnet kein Eintrag |
| `VDF-FACH-ABGELAUFEN` | 2 | offen | das passende Fach ist abgelaufen |
| `VDF-GEHEIMTEIL` | 2 | fehler | der Geheimteil ist kein Objekt |
| `VDF-VERZEICHNIS` | 2 | fehler | zu einer Adresse des Verzeichnisses fehlt Einheit oder Umschlag, oder ein Fach hat kein Verzeichnis |
| `VDF-EINHEIT` | 2 | fehler | eine Einheit öffnet sich nicht unter ihrer Adresse oder trägt nicht `{name, wert}` |
| `VDF-ADRESSE-NAME` | 2 | hinweis | Adresse und Name einer Einheit passen nicht zusammen |
| `VDF-BINDUNG-ORT` | 2 | hinweis | Ort-Hinweis weicht vom gebundenen ab |
| `VDF-BINDUNG-FREMD` | 2 | hinweis | Felder außerhalb der Basismenge weichen vom gebundenen Stand ab |
| `VDF-INHALT` | 3 | fehler | `schemaVersion` oder `sektoren` hat nicht die beschriebene Form |
| `VDF-SCHEMA-NEUER` | 3 | hinweis | Schemastufe aus einer neueren Fassung, nur lesbar |
| `VDF-FELD-UNBEKANNT` | 3 | hinweis | Feldkennung nicht im Feldregister |

**Wo das Prüfprogramm strenger ist als die Anwendung.** Die Anwendung öffnet zugunsten alter Dateien manches, was dieses Format nicht beschreibt, etwa eine abweichende `kdf.iterationen` oder ein Feld `wiederherstellung` fremder Form. Das Prüfprogramm urteilt nach diesem Dokument. Jeder solche Fall steht mit Grund im Korpus (Feld `strenger`).

## 10 · Korpus und Prüfprogramm

- [`korpus/korpus.json`](korpus/korpus.json) nennt je Datei:
  - das erwartete Urteil mit Codes,
  - das Testpasswort,
  - das gemessene Verhalten der Anwendung beim Öffnen.
- Die Ausgangsdateien schreibt die Anwendung selbst. Alle anderen entstehen aus ihnen durch benannte Eingriffe (`tools/format-korpus-erzeugen.js`). Keine Korpusdatei trägt eine `stand_marke` wie ein echter Download.
- Alle Inhalte sind erfunden.
- Die Testpasswörter beginnen mit `korpus-test-`. Sie sind absichtlich öffentlich und dürfen nie ein echtes Depot schützen.

Eine eigene Umsetzung prüft sich, indem sie jede Korpusdatei liest und dasselbe Urteil fällt.

`tools/format-pruefen.js` braucht nur Node.js ab Version 20, ohne weitere Pakete:

```
node tools/format-pruefen.js --datei meine.vivodepot --passwort-datei passwort.txt
node tools/format-pruefen.js --datei meine.vivodepot --json
node tools/format-pruefen.js
```

- Das Passwort wird aus einer Datei gelesen, nie von der Kommandozeile.
- Das Programm schreibt nichts. Es gibt keine Schlüssel, Salze, Chiffrate oder Feldwerte aus, nur den Dateipfad, Codes, Zahlen und die Namen von Klartextfeldern außerhalb der Basismenge.
- Ohne `--datei` läuft es den Korpus.

## 11 · Versionen

Drei Zähler, jeder für eine Schicht:

| Zähler | Ort | Schicht |
|---|---|---|
| Versions-Byte | Dateikopf | äußere Form der Datei |
| `kryptoVersion` | Umschlag | Verschlüsselung und Aufbau des Umschlags |
| `schemaVersion` | Inhalt | Aufbau des Inhalts |

- Eine neue `kryptoVersion` kommt hinzu, ohne die alten zu entfernen. Version 3 bleibt lesbar, auch nachdem 4 die geschriebene Form ist.
- Krypto-Parameter ändern sich nur mit einer neuen `kryptoVersion`, nie an Ort und Stelle (U2-ADR-230).
- Eine neue Schemastufe kommt mit einer Migrationsstufe von der vorigen.
- Ein neues Versions-Byte bekommt eine Form, die ältere Leser nicht kennen. Ältere Leser MÜSSEN sie ablehnen (Abschnitt 2).

Welche Fassungen wie lange lesbar bleiben, sagt dieses Dokument nicht. Eine Zusage dazu folgt gesondert.

## 12 · Offen

- **Lizenz der Spezifikation:** Ob dieses Dokument und die Schemas eine eigene Lizenz brauchen (etwa CC BY 4.0), ist nicht entschieden. Bis dahin gilt EUPL-1.2 wie für das Repository.
- **Lese-Information für die Langzeitarchivierung:** Welche Angaben eine Datei für eine Archivierung über Jahrzehnte mitführt und wie sie auf ein Archivpaket abgebildet wird (etwa E-ARK CSIP), ist in Arbeit und wird hier ergänzt.
- **Mitgebrachte Module:** Ein Depot kann Module tragen (Bereiche, Sprachen, Formate). Ihre Form beschreiben die Schemas unter `docs/<typ>-modul/`. Die Prüfung einzelner Moduldateien und ihrer Signaturen kommt in das Prüfprogramm.
