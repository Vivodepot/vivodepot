# U2-ADR-156-Nachtrag — QR-Übergabe eines Empfängerkreises: Format v2 mit gebundener Version

**Status:** Angenommen (04.10.2026, Wort der Gegenlesung vor dem Bau)
**Datum:** 2026-10-04
**Bezug:** U2-ADR-156 (Empfängerkreise; die QR-Übergabe ist ihr zweiter Transportweg neben der Datei), U2-ADR-062
(Auflage externer Krypto-Review; sie nennt die QR-Übergabe nicht, der Review-Umfang nimmt sie ausdrücklich auf), U2-ADR-016 (NFC-Normalisierung des Passworts), U2-ADR-090 §3
(Benennung von Nachträgen)
**Linie:** U2

**Status heute:** gilt. Die Belege stehen im `konformitaet`-Block unten.

---

## Anlass

Die QR-Übergabe (`empfaengerQrPayloadBauen` im Kern, `_empfaengerQrEntschluesseln` in der Lese-App) stand bisher in keiner ADR.
Sie leitet aus dem Passwort per PBKDF2 (600 000, SHA-256, 16 Byte Salz) direkt einen AES-256-GCM-Schlüssel ab. Verschlüsselt
wird **ohne Zusatzdaten (AAD)**. Der äußere Umschlag `{v, s, i, c}` steht im URL-Fragment.

Gemessen am 04.10.2026: Der Weg ist in der ausgelieferten Fassung erreichbar, über den Knopf am Empfängerkreis
(`flowEmpfaengerkreisQr`). Weg zum Nachsehen: `grep -n "flowEmpfaengerkreisQr\|empfaengerQrHerausgeben" vivodepot.html`.

Ablauf, Kreisname und Inhalt liegen im Chiffrat und sind dadurch geschützt. Salz und IV sind gebunden: Wer sie ändert, bringt
GCM zum Scheitern. **Ungebunden ist die Formatversion `v`.** Heute schadet das nicht, weil die Lese-App `v` gar nicht liest.
Mit der ersten zweiten Fassung würde daraus eine Rückstufungsfläche. Außerdem trennt kein Zweck-Kennzeichen diesen
Schlüsselgebrauch von anderen PBKDF2→AES-Wegen.

Nebenbefund: Die Lese-App normalisiert das QR-Passwort nicht auf NFC, der Kern schon (`normalizePassword`). Ein Passwort, das
am Empfängergerät in NFD-Form ankommt, öffnet den QR deshalb nicht.

## Entscheidung

1. **Format v2.** Der Kern schreibt `v: 2`. Verschlüsselt wird mit AAD = UTF-8 von `vivodepot/empfaenger-qr/v2`. Die Zeichenfolge
   bindet Zweck und Version zugleich: Ein auf `v: 1` umgeschriebener v2-Code läuft in den v1-Zweig ohne AAD und scheitert an
   GCM. Ein auf `v: 2` umgeschriebener v1-Code scheitert ebenso.
2. **Die Lese-App liest `v` und wählt danach den Zweig.** Eine unbekannte Version wird benannt abgelehnt und nicht geraten.
3. **v1 wird übergangsweise angenommen, mit festem Ende.** Ein QR gilt 24 Stunden. Noch erzeugt die ausgelieferte Kern-Fassung
   v1-Codes, deshalb nimmt die Lese-App v1 **bis einschließlich `2026-11-15`** an (`EMPFAENGER_QR_V1_ANNAHME_BIS`). Eine
   Entfall-Probe wird rot, sobald `BUILD_DATUM` nach diesem Tag liegt und der v1-Zweig noch existiert. Ist die Kern-Fassung mit
   v2 am `2026-11-14` noch nicht ausgeliefert, verschiebt ein Nachtrag mit Wort der Gegenlesung den Tag. Still verschoben wird
   er nicht.
4. **Die Lese-App normalisiert das Passwort vor der Ableitung auf NFC**, wie der Kern.
5. **Was gleich bleibt:** PBKDF2-Parameter (`PBKDF2_ITERATIONS`), Salz- und IV-Längen, 24 Stunden Ablauf im Chiffrat, Größengrenze,
   Zuschnitt (`empfaengerZuschnittModell`). Ein externer Krypto-Review ist für diesen Pfad weiter nötig; er steht im Review-Umfang, gleichrangig
   mit dem Pfad aus U2-ADR-062. Dieser Nachtrag ersetzt ihn nicht.

## Verworfen

- **Weiter ohne AAD, nur `v` prüfen:** Eine geprüfte Zahl wäre nicht gebunden. Ein Angreifer könnte sie trotzdem umschreiben,
  und der Zweig würde gewechselt, bevor GCM etwas merkt.
- **v1 sofort streichen:** Codes, die die ausgelieferte Fassung in den letzten 24 Stunden erzeugt hat, würden mitten in einer
  Übergabe unlesbar.

```yaml
konformitaet:
  - aussage: >-
      Der Kern schreibt QR-Übergaben als v2 mit AAD `vivodepot/empfaenger-qr/v2`; die Lese-App öffnet v2 nur mit dieser AAD,
      und ein umgeschriebenes `v` scheitert in beide Richtungen.
    zustand: erfuellt
    herkunft: U2-ADR-156-Nachtrag (04.10.2026)
    pruefung:
      - tests/empfaenger-qr-aad.test.js "[QR-AAD] Kern schreibt v2, Lese-App öffnet v2"
      - tests/empfaenger-qr-aad.test.js "[QR-AAD·Rot] v2 mit falscher AAD scheitert"
      - tests/empfaenger-qr-aad.test.js "[QR-AAD·Rot] v2 auf v1 umgeschrieben scheitert"
  - aussage: >-
      Die Lese-App nimmt v1 nur bis EMPFAENGER_QR_V1_ANNAHME_BIS an; danach ist der v1-Zweig entfernt.
    zustand: erfuellt
    herkunft: U2-ADR-156-Nachtrag (04.10.2026)
    pruefung:
      - tests/empfaenger-qr-aad.test.js "[QR-AAD·Entfall] nach dem Stichtag existiert kein v1-Zweig mehr"
      - tests/empfaenger-qr-aad.test.js "[QR-AAD·Rot] v1 nach dem Stichtag scheitert"
  - aussage: >-
      Die Lese-App normalisiert das QR-Passwort auf NFC, bevor sie ableitet.
    zustand: erfuellt
    herkunft: U2-ADR-156-Nachtrag (04.10.2026)
    pruefung:
      - tests/empfaenger-qr-aad.test.js "[QR-AAD] ein NFD-Passwort öffnet einen mit NFC erzeugten Code"
```
