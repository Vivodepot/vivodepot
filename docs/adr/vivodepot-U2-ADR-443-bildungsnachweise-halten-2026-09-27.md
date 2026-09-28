# U2-ADR-443: Bildungsnachweise halten — ein fremd ausgestelltes EDC wird als Original verwahrt und unverändert vorgezeigt

**Status:** Angenommen (27.09.2026)
**Datum:** 27.09.2026
**Kategorie:** ARCHITEKTUR, IMPORT, BILDUNG
**Linie:** U2
**Bezug:** U2-ADR-216 (fremd ausgestellte Nachweise halten — die Option, die diese ADR für EDC zieht) · U2-ADR-097 §6
(kein selbst ausgestelltes Bildungs-Credential) · U2-ADR-045/049 (autoritative Original-Ablage, Werte übernehmen) ·
U2-ADR-086 (Klasse-4-Durchreiche) · U2-ADR-233 (Original-Bytes roh) · U2-ADR-047 (SHL trägt FHIR) · U2-ADR-080
(EUDIW-PID: kein Import, weil kein tragbares Artefakt)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Ausgangslage

Hochschulen, Kammern und Bildungsträger stellen europäische Bildungsnachweise als **European Digital Credential (EDC)**
aus: ein W3C Verifiable Credential im European Learning Model, gesiegelt mit dem eIDAS-Siegel der Einrichtung (JAdES).
Die Lernende lädt es als Datei herunter und bewahrt es selbst auf. Vivodepot liest solche Dateien seit A109
(`edci-europass-extern`), machte aber aus allen Ansprüchen **einen Freitext** in `education.qualifications`. Original,
Siegel und Aussteller gingen dabei verloren. Vorzeigen ließ sich danach nur ein Satz, kein Nachweis.

U2-ADR-216 hat offengelassen, ob Vivodepot fremd ausgestellte, signierte Nachweise halten soll. Den einen echten
Konflikt benennt sie ausdrücklich: Nachweise, die an einen **gerätegebundenen** Schlüssel gekoppelt sind, wandern nicht
mit der Datei.

## Entscheidung

1. **Die Option aus U2-ADR-216 wird für EDC gezogen.** Ein EDC ist nicht gerätegebunden. Das Siegel gehört der
   Ausstellerin, eine Bindung an einen Schlüssel der Lernenden gibt es nicht. Der Konflikt aus U2-ADR-216 §2 entsteht
   also nicht, und die Datei wandert mit dem Depot wie jedes andere Original. Die Auflage aus U2-ADR-216 §5
   (`einedatei-ueberall`) bleibt unberührt. Der Re-Prüf-Auslöser aus U2-ADR-080 (ein tragbares, signiertes Artefakt
   in der Hand der Bürgerin) ist für EDC erfüllt. Für die PID gilt U2-ADR-080 unverändert.
2. **Verwahren:** Ein erkanntes EDC (`type` der Nutzlast enthält `EuropeanDigitalCredential`, signiert als
   JWS-General-JSON nach RFC 7797 oder unsigniert) wird **verbatim** als autoritativer Mappe-Eintrag abgelegt. Das
   geschieht im Bereich `education`, mit den rohen Einlese-Bytes (U2-ADR-233) und read-only. Der MIME-Typ ist
   `application/jose+json` (signiert, RFC 7515 §9.2.1) bzw. `application/ld+json`, die Endung `.jsonld`.
   Beschriftung und Aussteller werden aus der Datei gelesen, nicht erfunden. `gepruefteIG` trägt den erkannten
   Kontext `http://data.europa.eu/snb/model/context/edc-ap`. Wie bei den FHIR-Typen ist das die **Erkennung**, keine
   Laufzeitprüfung.
3. **Vorzeigen:** Der Klasse-4-Download (U2-ADR-086) gibt das Original byte-gleich heraus. Eine Holder-Präsentation
   (Key-Binding, OpenID4VP) gibt es für EDC nicht, und ohne Netz (`connect-src 'none'`) könnte Vivodepot sie auch nicht
   führen. Vorzeigen heißt deshalb: die unveränderte, gesiegelte Datei weitergeben. Der SHL-Weg (U2-ADR-047) bleibt
   FHIR vorbehalten.
4. **Ehrlich über die Prüfung:** Die App prüft das Siegel nicht und sagt das auch: „Original Ihrer Einrichtung,
   unverändert verwahrt. Das Siegel prüft, wem Sie es vorzeigen.“ Gegen das offizielle EDC-Anwendungsprofil
   (SHACL-Shapes, ITB-Validator der Kommission) prüft die Konformitäts-Suite. Dort läuft es über den Adapter
   `itb-shacl` aus der Standards-Schnittstelle, und zwar an den Bytes, die der Kern wieder herausgibt. Die
   Siegelprüfung ist ein eigener Posten (DSS).
5. **Werte übernehmen bleibt freiwillig:** Der A109-Parser bleibt erhalten. Er ist der Weg für „Werte in meine Felder
   übernehmen“ (U2-ADR-049) und für `kernAPI.importiere`. Er ersetzt aber nicht mehr das Original.
6. **Kein Ausstellen (U2-ADR-097 §6 unverändert).** Kein Export-Weg erzeugt ein `EuropeanDigitalCredential`, auch nicht
   mit einem gehaltenen EDC im Depot. Das bewacht eine eigene Probe.

**Nicht in dieser Entscheidung:** Open Badges 3.0 und andere Bildungsformate (eigener Posten, eigener Prüfer). Ebenso nicht
der Export `edci-bildung` (Eigenformat `edci-1.0-vivodepot`, offen in der Standards-Ratsche, Entscheidung gesondert) und
die Prüfung des Siegels in der App.

**Bestand:** Depots, in die ein EDC über den alten Freitext-Weg kam, haben das Original nie bekommen. Es gibt nichts zu
migrieren. Die Bürgerin kann die Datei erneut einlesen.

```yaml
konformitaet:
  - aussage: >-
      Ein fremd ausgestelltes EDC wird verbatim als autoritatives Original im Bereich Bildung abgelegt, mit Aussteller und
      Titel aus der Datei, ohne beim Ablegen etwas in die Felder zu flachen.
    zustand: erfuellt
    herkunft: Entscheidung vom 27.09.2026; U2-ADR-216 §4
    pruefung:
      - tests/bildung-edc-halten.test.js
        "[Bildung halten] alle drei EU-Beispiele werden verbatim als Original im Bereich Bildung abgelegt — mit Aussteller und Titel aus der Datei"
      - tests/bildung-edc-halten.test.js
        "[Bildung halten] beim Ablegen wird NICHTS geflacht — kein stiller Freitext in den Bildungsfeldern"
  - aussage: >-
      Das Original kommt byte-gleich wieder heraus, auch nach Speichern und Wiederöffnen, und ein führendes BOM bleibt
      erhalten.
    zustand: erfuellt
    herkunft: U2-ADR-086; U2-ADR-233
    pruefung:
      - tests/bildung-edc-halten.test.js
        "[Bildung vorzeigen] Rundweg: Einlesen → Mappe → Herunterladen gibt JEDES Beispiel byte-gleich heraus, als .jsonld mit seinem MIME-Typ"
      - tests/bildung-edc-halten.test.js
        "[Bildung vorzeigen] Rundweg übersteht Speichern und Wiederöffnen des Depots byte-gleich"
      - tests/bildung-edc-halten.test.js
        "[Bildung vorzeigen · Rot-Beweis] ein Original mit führendem BOM kommt MIT BOM wieder heraus (die Klasse aus U2-ADR-233)"
  - aussage: >-
      Kein Export-Weg stellt einen Bildungsnachweis aus.
    zustand: erfuellt
    herkunft: U2-ADR-097 §6
    pruefung:
      - tests/bildung-edc-halten.test.js
        "[U2-ADR-097 §6] kein Export-Weg stellt einen Bildungsnachweis aus — auch nicht mit einem gehaltenen EDC im Depot"
  - aussage: >-
      Ein EDC-Original geht nicht über den SHL-Weg.
    zustand: erfuellt
    herkunft: U2-ADR-047
    pruefung:
      - tests/bildung-edc-halten.test.js
        "[Bildung halten] ein EDC ist kein FHIR-Dokument: der SHL-Weg (U2-ADR-047) lehnt es ab"
```
