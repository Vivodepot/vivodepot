# U2-ADR-512: Pod-Anbindung über eine Brückenseite — Stufe 1 (Datei), der Kern bleibt ohne Netz

**Status:** Angenommen (22.10.2026), Stufe 1 gebaut
**Datum:** 22.10.2026
**Kategorie:** SICHERHEIT, NETZ, AUSTAUSCH
**Linie:** U2
**Bezug:** U2-ADR-047 (SHL offline im Kern, Zone 2 für die Ablage) · U2-ADR-183 (Ablage-Host; Muster der eigenen Seite mit
eigener Herkunft, `share/empfangen.html`) · U2-ADR-156 1b (eigene zugeschnittene Datei je Empfänger) · U2-ADR-449 (Antwort als
JWE) · U2-ADR-464 (aufgefüllte Einheiten) · U2-ADR-501 (Zertifikat der Stelle)
**Status heute:** gilt — Belege im `konformitaet`-Block unten; die Strecke gegen einen lokalen Pod ist dort offen geführt.
**Nachtrag 25.10.2026:** Stufe 2 (`postMessage` aus dem Kern) ist entschieden in
`vivodepot-U2-ADR-512-nachtrag-stufe-2-postmessage-aus-dem-kern-2026-10-25.md`.

## Frage

Personen und Stellen, die Solid sprechen, wollen Angaben aus einem Vivodepot über einen Pod austauschen. Die Person soll dafür
weder ihr Depot in den Pod geben noch die Zusage verlieren, dass die Anwendung selbst keine Verbindung aufbaut. Wie kommt etwas
aus dem Depot in den eigenen Pod und wieder zurück, ohne dass der Kern Netz bekommt, ohne dass der Pod etwas lesen kann und ohne
dass die Datei je vom Pod abhängt?

## Entscheidung

1. **Der Kern bleibt ohne Netz.** `vivodepot.html` und `vivodepot-lesen.html` behalten `connect-src 'none'` und verweisen nicht
   auf `pod/`. Der einzige Netzweg zum Pod läuft über eine eigene Seite, die **Brücke** (`pod/bruecke.html`).
2. **Die Brücke ist eine eigene Seite mit eigener Herkunft**, nach dem Muster von `share/empfangen.html`: `default-src 'none'`,
   `script-src 'self'`, `style-src 'self'`, `connect-src https:`, `img-src 'self'`, `base-uri 'none'`, `form-action 'none'`, kein
   Inline-Skript, keine fremden Skripte. Sie liegt im Repo unter `pod/` und geht mit ihren Proben hinaus. Ausgeliefert wird sie
   unter **`pod.vivodepot.de`**, getrennt von jeder Herkunft, unter der Kern oder Lese-App laufen (sie teilten sonst die
   IndexedDB); `frame-ancestors 'none'` steht dort als HTTP-Kopfzeile. Die Brücke wird nie in den Kern eingebettet.
3. **Über die Grenze geht nur Chiffrat.** Die Brücke nimmt nur, was der Kern selbst verschlüsselt hat: die SHL-JWE (U2-ADR-047),
   eine Antwort-JWE (U2-ADR-449) oder eine Depot-Datei (Sicherungskopie oder Ausschnitt je Empfänger, U2-ADR-156 1b). Die Tür
   (`pod/chiffrat-pruefen.js`) prüft nur die Form, ohne Schlüssel, je Art mit geschlossener Kopffeld-Liste und Größengrenze
   (`passtZurArt`); was sie nicht erkennt, verlässt das Gerät nicht. Lesbar bleiben die Köpfe: bei der Antwort-JWE Vorgang und
   Stelle, bei der Depot-Datei die Depot-Kennung und die Zeitstempel. Passwort, Schlüssel und Ableitungen des Depots kennt die
   Brücke nicht.
4. **Stufe 1, Datei.** Die Person wählt in der Brücke die Datei, die der Kern gespeichert hat; die Brücke legt sie ab und zeigt
   die Adresse. Abgeholt wird als Download, den die Person im Kern öffnet. Der Kern ändert sich dafür nicht. Eine Übergabe aus
   der Anwendung per `postMessage` (Stufe 2) ist nicht Teil dieser ADR; sie ist die erste Kern-Änderung und bekommt eine eigene
   Entscheidung mit eigener Sicherheitsprüfung.
5. **Was der Pod je Art erlaubt (WAC).**
   a) **Für eine Stelle:** Zugriffsregel auf genau die WebID der Stelle, mit Ablauf. Die Regel ist die zweite Schicht neben dem
      Schlüssel, nie die einzige. Die WebID wird nur als IRI ohne Zeichen geschrieben, die eine Regel schließen könnten.
   b) **Freigabe-Link (SHL):** die Ressource ist ohne Anmeldung lesbar (Flag `U`); geschützt durch einen Pfad aus mindestens
      128 Bit Zufall, den Schlüssel im Link und den Ablauf. Öffentlich ist nur die Ressource, nie ihr Container, auch nicht über
      eine geerbte Regel, weil ein Container seine Einträge auflistet.
   c) **Eigene Sicherung:** nur für die Person lesbar, nie öffentlich.
   **Grenze ACP:** Die Brücke spricht nur WAC. An einem Pod, der nur ACP spricht (nicht gemessen), kann sie keine Regel setzen:
   sie meldet den Fehler und zeigt keine Adresse; die schon abgelegte Ressource bleibt unter den Standardregeln des Pods.
6. **Access Grant nach LWS als Protokolleintrag (W2).** Bei einer Freigabe an eine Stelle legt die Brücke zusätzlich einen
   Access Grant nach dem LWS-Protokoll ab (W3C Working Draft vom 15.10.2026, Abschnitt 11): an den AccessGrantService des
   Speichers, wenn die Storage Description einen nennt, sonst als Eintrag unter `vivodepot/grants/`, nur für die Person lesbar.
   Nennt die Anfrage einen Posteingang, bekommt die Stelle dort den Grant, nie einen Schlüssel. Zugriff gibt der Grant nicht;
   den gibt die WAC-Regel. Weil der Entwurf sich ändern kann, ist der Grant eine Erweiterung, kein Zugriffsweg.
7. **Anmeldung mit Solid-OIDC, eigener Client, ohne Erneuerungs-Token.**
   - OAuth 2.0 Autorisierungscode mit PKCE (nur S256), OpenID Connect, DPoP nach RFC 9449, dynamische Registrierung als
     öffentlicher Client, Rücksprung genau auf die Brücke.
   - **Eigener Client statt Bibliothek,** weil `@inrupt/solid-client-authn-browser` 5.0.1 den DPoP-Schlüssel als exportierbar
     erzeugt. Hier ist der private Schlüssel ein `CryptoKey` mit `extractable: false`; jede Anmeldung erzeugt einen neuen. Er
     wird nie aus Passwort oder Seed des Depots abgeleitet; wem er abfließt, kann nichts entschlüsseln.
   - **Kein Erneuerungs-Token.** Die Brücke fragt nicht nach `offline_access` und registriert nur `authorization_code`; schickt
     ein Aussteller trotzdem eines, wird es verworfen. Zugangs-Token und Sitzung liegen nur im Speicher; die Sitzung endet mit
     der Seite, danach meldet sich die Person neu an.
   - **Was den Rücksprung überdauert:** `state`, `nonce` und `code_verifier` in `sessionStorage` dieses Tabs, beim Rücksprung vor
     jeder Prüfung gelöscht; der DPoP-Schlüssel und die Registrierung in der IndexedDB der Brücke. Nie `localStorage`, nie
     Cookies. Abmelden löscht alles lokal.
   - **Discovery:** `issuer` muss genau der angefragte Aussteller sein, mit oder ohne abschließenden Schrägstrich; jeder genannte
     Endpunkt muss https sein, weil Code und `code_verifier` an den `token_endpoint` gehen.
   - **ID-Token:** Signatur gegen die Schlüssel des Ausstellers (ES256 oder RS256), `iss`, `aud`, `azp` (bei mehreren Empfängern
     Pflicht, sonst wenn vorhanden), `iat`, `nonce`, `exp`, `webid`.
   - **`iss` im Rücksprung (RFC 9207):** Kündigt der Aussteller `authorization_response_iss_parameter_supported` an, muss `iss`
     dabeistehen und stimmen; steht er ungefragt da, muss er ebenfalls stimmen. Ohne Ankündigung geht der Rücksprung ohne `iss`
     durch; den Fall der vertauschten Aussteller deckt dann der Abgleich von `issuer` der Discovery und `iss` im ID-Token.
   - **`solid:oidcIssuer`:** Das öffentliche WebID-Profil muss den Aussteller nennen, sonst könnte ein beliebiger Aussteller eine
     fremde WebID behaupten. Gelesen wird ohne vollen Turtle-Parser: Kommentare und Literale fallen vorher weg, `solid:` gilt nur,
     wenn das Profil das Präfix auf den Solid-Namensraum setzt, eine Objektliste liefert jeden Aussteller. **Grenze:** ein anderer
     Präfixname oder ein Profil als JSON-LD scheitert geschlossen. Vor einer Vorführung wird gegen die Profile der Ziel-Anbieter
     gemessen. Den Speicherort (`pim:storage`) liest die Brücke einfacher; dort fängt die Bestätigung durch die Person ab (Punkt 8).
   - Von außen erreicht die Seite nur das Verzeichnis ihrer Ablagen; DPoP-Schlüssel und Registrierung sind nur unter dem
     Probenschalter erreichbar.
   - Das Zugangs-Token geht nur an den Speicher der Person oder lesend an eine Adresse, die sie selbst eingegeben hat, nie mit
     einer Weiterleitung.
8. **Die Person bestätigt den Speicher.** Wohin abgelegt wird, kommt aus ihrem öffentlichen Profil (`pim:storage`), also aus
   fremdem Text. Bevor die Brücke dort schreibt oder löscht (auch abgelaufene Ablagen), sieht die Person die Adresse und bestätigt
   sie; ohne Bestätigung lehnt `ablegen()` ab. Die Bestätigung gilt für diese Seite und diese Adresse.
9. **Rücknahme und Ablauf gelten für künftige Abrufe.** Die Brücke löscht die Ressource bei Rücknahme und, nach Anmeldung und
   Bestätigung, jede abgelaufene. Ein Pod löscht nichts von selbst; öffnet die Person die Brücke nie wieder, bleibt das Chiffrat
   im Pod. Einen einmaligen Abruf wie bei U2-ADR-183 gibt es im Pod nicht. Schon abgerufene Kopien bleiben.
10. **Der Pod ist Ablageort, nie Bedingung.** Die Datei bei der Person bleibt maßgeblich und öffnet ohne Pod und ohne Netz. Eine
    Sicherung im Pod ist so stark wie das Passwort des Depots; das sagt die Brücke vor dem Ablegen, zusammen mit dem Satz, dass
    der Betreiber Größe und Zeiten sieht.
11. **Kein Vermittler.** Die Brücke ist eine statische Seite im Browser der Person und spricht direkt mit deren Pod. Vivodepot
    betreibt keinen Pod und keinen Server im Datenweg.

## Abgrenzung

- **Nicht Teil dieser ADR:** Stufe 2 (`postMessage` aus dem Kern), ACP, der Schutz gegen eine zurückgespielte ältere Sicherung
  und der geprüfte Schlüssel einer Stelle (U2-ADR-501).
- **Gegen U2-ADR-047:** unverändert; der Kern erzeugt JWE und `shlink:/` wie bisher, die Brücke ist ein zweiter Ablageort.
- **Gegen U2-ADR-183:** Ablage-Host und `share/empfangen.html` bleiben, wie sie sind; die Abholseite holt eine Freigabe aus dem
  Pod über https ab.

## Folgen

- Eine Seite mit Netz im Repo. Ihre Proben laufen in der Suite (`tests/pod-bruecke-*.test.js`); die Strecke gegen einen lokalen
  Community Solid Server ist eine eigene Playwright-Konfiguration (`npm run test:e2e:pod`), die ohne installierten Server
  übersprungen wird.
- Keine Fremdbibliothek: der SBOM bekommt keinen neuen Eintrag. Die Brücke gehört in den Umfang einer externen Krypto-Prüfung,
  bevor sie nach außen versprochen wird; bis zur Auslieferung gibt es keine Außenaussage.
- Ohne Erneuerungs-Token meldet sich die Person bei jedem Öffnen der Brücke an.

```yaml
konformitaet:
  - aussage: >-
      Kern und Lese-App bleiben bei connect-src 'none' und verweisen nicht auf pod/; die Brücke trägt genau ihre CSP, kein
      Inline-Skript und nur eigene Skripte.
    zustand: erfuellt
    herkunft: U2-ADR-512 (22.10.2026)
    pruefung:
      - tests/pod-bruecke-quelltext.test.js "[Pod-Brücke·Kern] Kern und Lese-App bleiben bei connect-src none und verweisen nicht auf pod/"
      - tests/pod-bruecke-quelltext.test.js "[Pod-Brücke·Rand] die Seite trägt genau die CSP des Entwurfs, kein Inline-Skript, nur eigene Skripte"
      - tests/pod-bruecke-quelltext.test.js "[Pod-Brücke·Rand·Rot-Beweis] eine weitere Quelle, ein Inline-Skript oder ein fremdes Skript fallen auf"
  - aussage: >-
      Über die Grenze geht nur Chiffrat in der Form des Kerns, je Art die erwartete Form.
    zustand: erfuellt
    herkunft: U2-ADR-512 (22.10.2026)
    pruefung:
      - tests/pod-bruecke-chiffrat.test.js "[Pod-Brücke·Chiffrat] die drei Formen des Kerns gehen durch"
      - tests/pod-bruecke-chiffrat.test.js "[Pod-Brücke·Chiffrat·Rot-Beweis] Klartext und alles, was nicht genau die Form des Kerns hat, wird abgewiesen"
      - tests/pod-bruecke-ziel.test.js "[Pod·Ziel·Rot-Beweis] ohne die Tür je Art ginge ein Freigabe-Link als Ablage für eine Stelle hinaus"
  - aussage: >-
      Der DPoP-Schlüssel ist nicht exportierbar und hängt an keinem Schlüssel des Depots; pod/ kennt kein Passwort.
    zustand: erfuellt
    herkunft: U2-ADR-512 (22.10.2026)
    pruefung:
      - tests/pod-bruecke-quelltext.test.js "[Pod-Brücke·DPoP] der Schlüssel entsteht genau einmal, nicht exportierbar, und der private Teil wird nie exportiert"
      - tests/pod-bruecke-quelltext.test.js "[Pod-Brücke·Trennung] pod/ kennt keinen Schlüssel und kein Passwort des Depots"
  - aussage: >-
      Kein Erneuerungs-Token: nicht erfragt, nicht registriert, nicht gespeichert; sessionStorage nur für den Anmeldevorgang.
    zustand: erfuellt
    herkunft: U2-ADR-512 (22.10.2026)
    pruefung:
      - tests/pod-bruecke-quelltext.test.js "[Pod-Brücke·K2] kein Erneuerungs-Token: nicht erfragt, nicht registriert, nicht gespeichert"
      - tests/pod-bruecke-quelltext.test.js "[Pod-Brücke·K2·Rot-Beweis] der Stand des Spikes fällt"
      - tests/pod-bruecke-quelltext.test.js "[Pod-Brücke·Speicher] kein localStorage, keine Cookies; sessionStorage nur für den Anmeldevorgang"
      - tests/pod-bruecke-anmeldung.test.js "[Pod·Anmeldung] der gute Rücksprung liefert die WebID; kein Token bleibt liegen"
      - tests/pod-bruecke-anmeldung.test.js "[Pod·Anmeldung] ohne Erneuerung: ein abgelaufenes Zugangs-Token verlangt die neue Anmeldung"
  - aussage: >-
      Der Rücksprung prüft ID-Token, solid:oidcIssuer, state und iss nach RFC 9207; jede Abweichung scheitert.
    zustand: erfuellt
    herkunft: U2-ADR-512 (22.10.2026)
    pruefung:
      - tests/pod-bruecke-anmeldung.test.js "[Pod·Anmeldung·Rot-Beweis] ID-Token: Signatur, iss, aud, nonce, Ablauf, alg none"
      - tests/pod-bruecke-anmeldung.test.js "[Pod·Anmeldung·Rot-Beweis] ein Profil ohne diesen Aussteller als solid:oidcIssuer scheitert"
      - tests/pod-bruecke-anmeldung.test.js "[Pod·Anmeldung·K3·Rot-Beweis] angekündigt und fehlend, angekündigt und falsch, ungefragt und falsch"
      - tests/pod-bruecke-anmeldung.test.js "[Pod·Anmeldung·Rot-Beweis] state abweichend, kein Vorgang, zweiter Rücksprung mit demselben Code"
      - tests/pod-bruecke-anmeldung.test.js "[Pod·Anmeldung] ein Aussteller ohne abschließenden Schrägstrich: der Rücksprung findet seine Discovery"
      - tests/pod-bruecke-anmeldung.test.js "[Pod·Anmeldung·Rot-Beweis] ein Satz in Kommentar oder Literal und ein umgebogenes Präfix gelten nicht"
      - tests/pod-bruecke-anmeldung.test.js "[Pod·Anmeldung·Rot-Beweis] azp bei einem einzelnen aud muss die eigene Registrierung nennen"
      - tests/pod-bruecke-anmeldung.test.js "[Pod·Anmeldung·Rot-Beweis] ein Endpunkt der Discovery über http wird abgelehnt"
  - aussage: >-
      Vor der Bestätigung des Speichers schreibt und löscht die Brücke nichts im Pod; eine WebID bricht keine Zugriffsregel auf.
    zustand: erfuellt
    herkunft: U2-ADR-512 (22.10.2026)
    pruefung:
      - tests/pod-bruecke-ziel.test.js "[Pod·Ziel] vor dem Klick legt die Brücke nichts ab und löscht nichts; nach dem Klick schon"
      - tests/pod-bruecke-ziel.test.js "[Pod·Ziel·Rot-Beweis] ohne die Prüfung in ablegen() ginge der PUT ohne Klick hinaus"
      - tests/pod-bruecke-anmeldung.test.js "[Pod·WebID·Rot-Beweis] eine WebID mit > oder Leerzeichen bricht keine Zugriffsregel auf"
  - aussage: >-
      Der Access Grant nach LWS trägt die Pflichtfelder und nie ein Feld, das wie ein Schlüssel heißt.
    zustand: erfuellt
    herkunft: U2-ADR-512 (22.10.2026)
    pruefung:
      - tests/pod-bruecke-lws.test.js "[Pod·LWS·Grant] ein Grant trägt die Pflichtfelder des Entwurfs"
      - tests/pod-bruecke-lws.test.js "[Pod·LWS·Grant·Rot-Beweis] fehlende Pflichtfelder und Schlüsselfelder fallen"
      - tests/pod-bruecke-lws.test.js "[Pod·LWS·Dienst] die Storage Description liefert den AccessGrantService oder nichts"
  - aussage: >-
      Gegen einen lokalen Community Solid Server: Ablegen und Abholen byte-gleich, Container des Freigabe-Links nicht öffentlich,
      Freigabe nur für die WebID der Stelle, keine Anfrage an fremde Herkünfte.
    zustand: offen
    frist: 2026-10-30
    bedingung: tests/e2e-pod/pod-bruecke.spec.js grün in Chromium, Firefox und WebKit mit installiertem Server (npm run test:e2e:pod); die Strecke überspringt sich ohne VD_POD_CSS und zählt darum nicht als Beleg in der Suite
    herkunft: U2-ADR-512 (22.10.2026)
```
