# U2-ADR-460: Anfrage per QR — kompakte Transportform und Kurzlink mit Weiterleitung auf die eigene App

**Status:** Angenommen (01.10.2026)
**Datum:** 01.10.2026
**Kategorie:** ARCHITEKTUR, ANFRAGE, DATENSCHUTZ
**Linie:** U2
**Bezug:** U2-ADR-183 (SHL-Ablage-Host share.vivodepot.de) · U2-ADR-362 (Marken-Stelle) · U2-ADR-030 (Selbstauskunft) ·
U2-ADR-085 (QR-Teile, Wallet-Weg)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Frage

Die Demos sagen: eine Stelle schickt ihre Anfrage „als Link oder QR-Code“ — gemeint ist ein QR auf dem Aushang, den die Handykamera
öffnet. Eine Anfrage mit zwölf bis sechzehn Feldern ergibt aber einen Link von 2 300 bis 10 400 Zeichen (signiert trägt der Umschlag
die Anfrage doppelt). Der größte QR fasst 2 331 Byte bei Fehlerkorrektur M und ist mit 177×177 Modulen vom Aushang nicht
verlässlich lesbar. Wie kommt die Anfrage trotzdem per QR zur Bürgerin, ohne dass die App etwas lädt?

## Entscheidung

1. **Kompakte Transportform.** Signiert wird weiter als Standard-JWS. Für den Transport wird der JWS-String (mit angehängtem
   Anbieter-Zertifikat hinter `~`) mit deflate-raw gepackt und base64url-codiert: `z1.<…>`. Kein `zip` im JWS. Die Anfrage ist die
   JWS-Nutzlast und steht nicht mehr doppelt. Die alte Form (base64url des Umschlag-JSON) bleibt gültig. Gemessen bringt das nur
   den Faktor 0,55–0,6; für einen direkten QR reicht es nicht, aber die Adresse hinter der Weiterleitung wird kürzer.
2. **Entpacken mit Grenze.** Die App entpackt mit dem eingebauten `DecompressionStream`, in Stücken, und bricht über 64 KB ab —
   eine Dekompressionsbombe wird abgewiesen, bevor sie gesammelt ist. Das Zertifikat reist mit, weil die App die Kette zur
   Vivodepot-Wurzel offline prüft; genau diese Kette ist das, wofür eine Stelle bezahlt.
3. **Der QR trägt einen Kurzlink.** Die Stelle legt die kompakte Form ab — auf ihrem eigenen Webspace oder auf
   share.vivodepot.de — und der QR trägt nur die kurze Adresse. Beim Aufruf leitet der Server auf die App-Adresse weiter, die
   Anfrage im Fragment.
4. **Die Weiterleitung zeigt nur auf die eigene App.** Die Ziel-Herkünfte stehen in einer festen Konfiguration
   (`anfrage-ziele.php`, der Marken-Stelle des Servers); ein Eintrag trägt nur den Sprachschlüssel, nie eine Adresse. Sonst lenkte
   ein kompromittierter Eintrag auf eine nachgemachte App, die nichts prüft.
5. **Die Ablage ist kein freier Speicher.** Der Server legt nur ab, was Form, Größe (16 KB), Entpackgrenze, JWS-Struktur und
   Anfrage-Gestalt trägt, mit denselben Ratengrenzen wie die SHL-Ablage über dieselbe pseudonymisierte IP-Spur. Eine Anfrage ist
   spätestens mit ihrem `gueltigBis` und höchstens nach einem Jahr weg. Die Signatur prüft der Server nicht — das tut die App.

## Was gleich bleibt, wörtlich

**Die App lädt weiterhin nichts.** `connect-src 'none'` bleibt. Der Abruf der kurzen Adresse ist die Navigation des Handys, ausgelöst
von der Kamera; die App selbst öffnet keine Verbindung, und das Fragment erreicht keinen Server. **Kein Außentext behauptet, das
Scannen funktioniere offline**: das Handy braucht für die kurze Adresse ein Netz.

## Datenschutz

Beim Aufruf der kurzen Adresse sieht der Server die Adresse und den Zeitpunkt des Handys der Bürgerin. Auf share.vivodepot.de speichert
`a.php` davon nichts; die Ablage einer Stelle schreibt eine pseudonymisierte IP-Spur (HMAC mit Tagessalz, 25 h) wie die SHL-Ablage.
Die Datenschutzerklärung der Webseite, Ziffer 7a, wird dafür nachgezogen. Liegt die Anfrage auf dem Webspace der Stelle,
ist es deren Verarbeitung; die Anleitung sagt das. Der Teil auf share.vivodepot.de geht erst live, wenn die pseudonymisierte IP-Spur
des Share-Fixes dort live ist.

## Was diese Entscheidung nicht leistet

Sie liefert keinen Kamera-Scanner in der App; eine QR-Serie liest die App weiterhin nur als eingefügten Text (eigener Posten). Sie
macht eine Anfrage nicht ohne Netz per QR erreichbar.

```yaml
konformitaet:
  - aussage: >-
      Die App liest die kompakte Form aus Link und Text, prüft die Signatur wie bisher, weist eine Dekompressionsbombe über 64 KB ab und
      liest die alte Form weiter.
    zustand: erfuellt
    herkunft: U2-ADR-460 (01.10.2026)
    pruefung:
      - tests/anfrage-kompakt.test.js "[Anfrage·kompakt] Rundlauf: Link und eingefügter Text ergeben dieselbe, geprüfte Anfrage — mit Zertifikat"
      - tests/anfrage-kompakt.test.js "[Anfrage·kompakt·Rot-Beweis] Dekompressionsbombe: ein kleiner Eingang, der über die Grenze aufbläht, wird abgewiesen"
      - tests/anfrage-kompakt.test.js "[Anfrage·kompakt] die alte Form (base64url des Umschlags) bleibt gültig, auch über den asynchronen Weg"
```

Die Proben der Server-Seite liegen im Repo der Webseite (Testdatei share-anfrage-kurzlink): Weiterleitung nur auf die
konfigurierten Herkünfte mit Rot-Beweis, Ablage nur gültiger Formen mit Rot-Beweis je Fall, Ratengrenze, Ablauf.

---

*Vivodepot GmbH · Berlin · 01.10.2026*
