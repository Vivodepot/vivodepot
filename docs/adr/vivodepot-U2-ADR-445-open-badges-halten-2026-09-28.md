# U2-ADR-445: Open Badges 3.0 halten — ein fremd ausgestellter Badge wird als Original verwahrt und unverändert vorgezeigt

**Status:** Angenommen (28.09.2026)
**Datum:** 28.09.2026
**Kategorie:** ARCHITEKTUR, IMPORT, BILDUNG
**Linie:** U2
**Bezug:** U2-ADR-216 (fremd ausgestellte Nachweise halten — die Option, die diese ADR für Open Badges zieht) ·
U2-ADR-443 (dasselbe für EDC; dieses Muster) · U2-ADR-097 §6 (kein selbst ausgestelltes Bildungs-Credential) ·
U2-ADR-045/049 (autoritative Original-Ablage, Werte übernehmen) · U2-ADR-086 (Klasse-4-Durchreiche) · U2-ADR-233
(Original-Bytes roh) · U2-ADR-047 (SHL trägt FHIR)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Ausgangslage

Neben dem europäischen EDC ist **Open Badges 3.0** (1EdTech) das verbreitete Format für Bildungs- und
Kompetenznachweise: Kurse, Weiterbildungen, Mikro-Zertifikate. Ein Badge ist ein W3C Verifiable Credential mit dem
Typ `OpenBadgeCredential` (bzw. `AchievementCredential`), signiert von der ausstellenden Stelle. Lernende bekommen ihn
als Datei, oft als Bild, in das das Credential „eingebacken" ist. U2-ADR-443 hat die Option aus U2-ADR-216 nur für EDC
gezogen und Open Badges ausdrücklich offengelassen.

## Entscheidung

1. **Die Option aus U2-ADR-216 wird für Open Badges 3.0 gezogen.** Ein Badge ist im Regelfall nicht gerätegebunden.
   Nach der Spezifikation (Datenmodell B.1.3) ist `credentialSubject.id` optional, die Empfängerin kann auch über
   `identifier` benannt sein. Die Prüfschritte (§8.2 VC-JWT, §8.3 eingebetteter Beweis) prüfen die Signatur der
   ausstellenden Stelle. Einen Pflichtschritt für einen Beweis der Inhaberin gibt es dort nicht. Die Datei wandert mit
   dem Depot, der Konflikt aus U2-ADR-216 §2 entsteht also nicht, und die Auflage aus §5 (`einedatei-ueberall`) bleibt
   unberührt.
   **Grenzfall:** Ist ein Badge an eine DID der Inhaberin ausgestellt und verlangt die Prüfende eine Präsentation mit
   Beweis der Inhaberin, kann Vivodepot das nicht leisten. Es hält keinen Schlüssel der Inhaberin und führt ohne Netz
   (`connect-src 'none'`) kein OpenID4VP. Das ist dieselbe Grenze wie beim EDC: Vorzeigen heißt die unveränderte Datei
   weitergeben.
2. **Verwahren, in allen vier Formen der Spezifikation:** JSON-LD mit eingebettetem Beweis (§8.3), VC-JWT als kompakte
   JWS (§8.2), „gebacken" in ein PNG (iTXt-Chunk `openbadgecredential`, unkomprimiert, §5.3.1) oder in ein SVG
   (`<openbadges:credential>`, §5.3.2). Erkannt wird ein Badge am `type` des Credentials. Abgelegt wird **verbatim** mit
   den rohen Einlese-Bytes (U2-ADR-233), read-only, im Bereich `education`. Bei PNG und SVG ist das **Bild** das
   Original, nicht das herausgeschälte Credential. MIME-Typ und Endung folgen der Form: `application/ld+json` `.json`,
   `application/jwt` `.jwt`, `image/png` `.png`, `image/svg+xml` `.svg`. Titel (`name`) und ausstellende Stelle
   (`issuer.name`) werden aus dem Credential gelesen, nicht erfunden. `gepruefteIG` trägt den Namensraum der
   Spezifikation `https://purl.imsglobal.org/spec/ob/v3p0/`. Das ist die Erkennung, keine Laufzeitprüfung.
   Ein PNG ohne rohe Bytes wird nicht abgelegt: über den Text-Weg wären die Bildbytes zerstört.
3. **Vorzeigen:** Der Klasse-4-Download gibt das Original byte-gleich heraus, mit seiner Endung. SMART Health Links
   bleiben FHIR vorbehalten (U2-ADR-047). Ein Bild-Badge zeigt in der Mappe sein Bild.
4. **Ehrlich über die Prüfung:** Die App prüft den Beweis nicht und sagt das auch. Dafür bräuchte sie RDF-Kanonisierung
   und DID-Auflösung, und `did:web` geht ohne Netz nicht. Der Hinweis lautet: „Original der ausstellenden Stelle,
   unverändert verwahrt. Die Echtheit prüft, wem Sie es vorzeigen." Gegen die Spezifikation prüft die Konformitäts-Suite,
   mit dem offiziellen Prüfer von 1EdTech (Digital Credentials Public Validator, Apache-2.0), an den Bytes, die der Kern
   wieder herausgibt. 1EdTech verteilt ihn weder als Image noch als Release-JAR. Er wird darum mit Docker aus der
   offiziellen Quelle gebaut (Archiv am Commit des Tags v1.11.3 und Basis-Images, je gepinnt), und das Register nennt ihn
   „aus offizieller Quelle gebaut", nicht „offizielles Artefakt". Gemessen ohne Netz: Jede der vier Formen hat einen
   gültigen Fall, und was der Kern herausgibt, urteilt der Prüfer gleich wie die Testdatei. Zwei Testdateien des Prüfers
   fallen aus inhaltlichen Gründen (Entwurfsstand bzw. abgelaufen), und das steht so in der Probe. Ohne Netz bleibt nur die
   Warnung, die Aussteller-URL sei nicht erreichbar. Scharf wird der Lauf im pre-push, wenn ein Push den Weg berührt
   („echt" und ungemessen ist dort rot); in der Node-Suite steht er ohne Werkzeug sichtbar als todo.
   Im Register steht der Standard auf „teilweise", nicht „echt": das Kernmodul des Prüfers (inspector-core), das 1EdTech
   nur als Binärdatei auf seinem Maven-Server veröffentlicht, trägt keine Lizenzangabe. Bis das geklärt ist, gilt der
   Lauf als gemessen, aber nicht als Grundlage für „echt".
5. **Werte übernehmen bleibt freiwillig:** Titel und ausstellende Stelle lassen sich zusätzlich als ein Eintrag in
   `education.qualifications` übernehmen (U2-ADR-049), wie beim EDC.
6. **Kein Ausstellen (U2-ADR-097 §6 unverändert).** Kein Export-Weg erzeugt ein `OpenBadgeCredential` oder
   `AchievementCredential`, auch nicht mit einem gehaltenen Badge im Depot. Das bewacht eine eigene Probe.

**Nicht in dieser Entscheidung:** CLR 2.0 (Sammel-Container, eigener Posten) und Open Badges 2.0 (Altformat). Nicht
entschieden ist auch eine Zertifizierung durch 1EdTech. Deren Rollen (Issuer, Displayer, Host) passen auf eine
Holder-App nicht genau, und nach außen gilt deshalb nur „gegen den offiziellen Prüfer getestet", nie „zertifiziert".

**Fixtures:** Die Testdateien des offiziellen Prüfers (Apache-2.0), nicht die Beispiele der Spezifikation. Deren
Lizenz erlaubt die Weitergabe nur für die Spezifikation als Ganzes und keine Ableitungen. Herkunft und Prüfsummen stehen
in `tests/fixtures/ob3-QUELLE.md`.

```yaml
konformitaet:
  - aussage: >-
      Ein fremd ausgestellter Open Badge 3.0 wird in jeder der vier Formen der Spezifikation erkannt und verbatim als
      autoritatives Original im Bereich Bildung abgelegt, mit Titel und ausstellender Stelle aus dem Credential, ohne
      beim Ablegen etwas in die Felder zu flachen; ein Credential, das kein Badge ist, wird nicht als Badge abgelegt.
    zustand: erfuellt
    herkunft: Entscheidung vom 28.09.2026; U2-ADR-216 §4
    pruefung:
      - tests/bildung-ob3-halten.test.js
        "[OB3 halten] jede der vier Formen wird erkannt, als eigener Ablage-Kanal (autoritativDoc) im Bereich Bildung"
      - tests/bildung-ob3-halten.test.js
        "[OB3 halten] alle sieben Beispiele werden verbatim als Original abgelegt — mit Titel und Aussteller aus dem Credential"
      - tests/bildung-ob3-halten.test.js
        "[OB3 halten] ein Credential, das kein Badge ist, wird nicht als Badge abgelegt"
      - tests/bildung-ob3-halten.test.js
        "[OB3 halten] beim Ablegen wird NICHTS geflacht — kein stiller Freitext in den Bildungsfeldern"
  - aussage: >-
      Das Original kommt byte-gleich wieder heraus, mit Endung und MIME-Typ seiner Form, auch nach Speichern und
      Wiederöffnen; ein Bild-Badge wird nie über den Text-Weg abgelegt.
    zustand: erfuellt
    herkunft: U2-ADR-086; U2-ADR-233
    pruefung:
      - tests/bildung-ob3-halten.test.js
        "[OB3 vorzeigen] Rundweg: Einlesen → Mappe → Herunterladen gibt JEDES Beispiel byte-gleich heraus, mit Endung und MIME-Typ des Originals"
      - tests/bildung-ob3-halten.test.js
        "[OB3 vorzeigen] Rundweg übersteht Speichern und Wiederöffnen des Depots byte-gleich, auch für das gebackene PNG"
      - tests/bildung-ob3-halten.test.js
        "[OB3 vorzeigen · Rot-Beweis] ein PNG ohne Rohbytes wird NICHT über den Text abgelegt — das Bild wäre zerstört"
  - aussage: >-
      Die Ansicht sagt, dass die App die Echtheit nicht prüft, und bietet Herunterladen und freiwilliges Übernehmen an,
      keinen SHL-Weg.
    zustand: erfuellt
    herkunft: U2-ADR-047; U2-ADR-049
    pruefung:
      - tests/bildung-ob3-halten.test.js
        "[OB3 halten · Ansicht] das Original zeigt den ehrlichen Hinweis, Herunterladen und „Werte übernehmen\" — keinen SHL-Knopf; ein Bild-Badge zeigt das Bild"
      - tests/bildung-ob3-halten.test.js
        "[OB3 halten] ein Badge ist kein FHIR-Dokument: der SHL-Weg (U2-ADR-047) lehnt ihn ab"
  - aussage: >-
      Was der Kern nach dem Verwahren herausgibt, urteilt der offizielle Prüfer von 1EdTech gleich wie die Testdatei; jede
      der vier Formen hat einen gültigen Fall, ein Badge ohne Aussteller wird abgelehnt.
    zustand: erfuellt
    herkunft: Messung vom 28.09.2026 am aus offizieller Quelle gebauten Prüfer (tools/1edtech-validator/Dockerfile)
    pruefung:
      - tests/ob3-1edtech-lauf.test.js
        "[OB3·Lauf] jeder Fall urteilt wie gemessen — was der Kern herausgibt, gleich wie die Testdatei: jede der vier Formen hat einen gültigen Fall"
      - tests/ob3-1edtech-lauf.test.js
        "[OB3·Lauf·Negativkontrolle] ein Badge ohne Aussteller-Knoten wird abgelehnt"
  - aussage: >-
      Kein Export-Weg stellt einen Badge aus.
    zustand: erfuellt
    herkunft: U2-ADR-097 §6
    pruefung:
      - tests/bildung-ob3-halten.test.js
        "[U2-ADR-097 §6 · OB3] kein Export-Weg stellt einen Badge aus — auch nicht mit einem gehaltenen Badge im Depot"
```
