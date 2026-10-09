# Feste Vektoren je Prüfstelle (U2-ADR-062, Auflage 1)

`vektoren.json` enthält feste Ein- und Ausgabe-Vektoren für die vier Stellen, die aus einem Passwort oder Code direkt einen
Schlüssel machen. Die Probe ist `tests/pruefstellen-vektoren.test.js`. Die Datei ist dort mit SHA-256 eingefroren und wird
nicht neu erzeugt. Eine geänderte Datei macht die Probe rot.

Alle Passwörter, Codes, Salze, IVs und Master-Bits sind **Testwerte**. Sie tragen die Probe-Marke `NURPROBEpruef` oder sind
aus ihr abgeleitet: Salz, IV und Master-Bits sind SHA-256 eines Markentexts, gekürzt auf die nötige Länge. Sie schützen
nichts und stammen nie aus echtem Material.

## Rechenweg je Stelle

Gerechnet wurde einmal am 07.10.2026 mit node:crypto (OpenSSL), **nicht** mit dem Web-Crypto-Code des Produkts. Die Probe
rechnet die Werte bei jedem Lauf mit node:crypto nach und prüft danach das Produkt gegen sie.

1. **`qrV1` — QR-Übergabe v1, ohne AAD**
   - Schlüssel = PBKDF2-HMAC-SHA-256(`testPasswort`, `salzB64`, 600000 Iterationen, 32 Byte).
   - `chiffratMitTagB64` = AES-256-GCM(Schlüssel, `ivB64`, ohne AAD, Klartext = `nutzlastJson` als UTF-8), Chiffrat ‖ 16-Byte-Tag.
   - `payloadB64u` = base64url ohne Auffüllung von JSON `{"v":1,"s":Salz,"i":IV,"c":Chiffrat‖Tag}`; die drei Werte stehen darin in Standard-Base64.
   - Geprüft wird: Der Kern (`_empfaengerQrSchluesselVerschluesseln`) verschlüsselt genau zu diesem Chiffrat. Die Lese-App (`_empfaengerQrEntschluesseln`) öffnet `payloadB64u`.

2. **`antwortV1Einmalpasswort` — Antwort v1 mit Einmalpasswort**
   - Der Umschlag ist der eingefrorene aus `tests/fixtures/antwort-v1-umschlaege.json` (Feld `einmalpasswort`); er wird hier nicht neu erzeugt.
   - Gegengerechnet: Schlüssel = PBKDF2-HMAC-SHA-256(`testPasswort`, `salt`, 600000, 32 Byte).
   - AAD = UTF-8 von `vivodepot-antwort|v|verfahren|vorgang|anbieterId`.
   - AES-256-GCM öffnen. `klartextSha256` ist SHA-256 des Klartexts.
   - Geprüft wird: Die Lese-App (`antwortEntschluesselnPasswort`) liefert genau diesen Klartext.

3. **`jwePbes2Rfc7520` — PBES2-HS512+A256KW**
   - Wörtlich aus RFC 7520, Abschnitt 5.3 (https://www.rfc-editor.org/rfc/rfc7520.txt):
     - Passwort: Figur 96, mit U+2013 statt `\xe2\x80\x93`,
     - CEK: Figur 97,
     - p2s: Figur 99,
     - p2c: 8192 (5.3.3),
     - Encrypted Key: Figur 100.
   - Nichts davon ist selbst gerechnet.
   - Gegengerechnet mit OpenSSL: KEK = PBKDF2-HMAC-SHA-512(Passwort, `PBES2-HS512+A256KW` ‖ 0x00 ‖ p2s, 8192, 32 Byte). Mit `id-aes256-wrap` (RFC 3394) entpacken.
   - Geprüft wird: `_jwePbes2Schluessel` in Kern und Lese-App liefert den KEK, der den Encrypted Key zum CEK entpackt.

4. **`wiederherstellungsCode` — Wiederherstellungs-Code**
   - Code-Bits = PBKDF2-HMAC-SHA-256(`testStellen`, `salzB64`, 600000, 32 Byte).
   - AAD = UTF-8 von JSON `["vivodepot-wiederherstellung-1", depotUUID, kryptoVersion]`.
   - `huelleB64` = AES-256-GCM(Code-Bits, `ivB64`, AAD, Klartext = `masterBitsB64`), Chiffrat ‖ Tag.
   - `hkdfAbgeleitetB64` = HKDF-SHA-256(Master-Bits, Salz leer, Info `hkdfInfo`, 32 Byte).
   - Geprüft wird: Der Kern wickelt zu genau dieser Hülle (`_whcEinwickeln`). Er packt sie wieder aus (`_whcAuspacken`), und der ausgepackte HKDF-Schlüssel leitet dieselben 32 Byte ab.
