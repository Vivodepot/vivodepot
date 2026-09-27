# U2-ADR-323: Angedockte Bereiche erreichen den Empfänger — die Lese-App meldet an, statt zu kennen

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Betrifft:** `vivodepot-lesen.html` (`bereichsModulPruefenLesen`,
`_bereichsModuleAusDepotAnmeldenLesen`, `bereicheAlleLesen`, `_sektorIndexNeuBauenLesen`,
`SEKTOR_BY_ID`, `sidebarHTML`, `sektorHTML`, `renderVollExport`, `_foldVollmachtenLesen`),
`tests/u2-adr-323-angedockte-bereiche-lese-app.test.js`,
`tools/lese-app-bereichsluecke-messen.js`

- **Status heute:** gilt — ein Bereich, den ein eingelassenes `bereichsModule` mitbringt, erscheint
  beim Empfänger in der Navigation und zeigt seine Werte. **Die eingelassenen Pro-TEMPLATES
  erreichen ihn damit noch nicht** — dafür fehlt ein zweiter Spiegel, siehe „Die Wand daneben".

---

## Der Befund

Gemessen am 06.09.2026 an einer **echten Export-Datei**, nicht am Quelltext
(`tools/lese-app-bereichsluecke-messen.js` — im Repo, ohne Argument lauffähig, jeder Lauf
reproduziert die Zahlen unten). Der Weg des Werkzeugs ist der
Betriebsweg: Depot anlegen, Sechs-Bereiche-Modul einlassen (U2-ADR-243), Feld-Definitionen andocken
(U2-ADR-037), Werte schreiben, `vollExportJSON` auf die Platte — und die geschriebene Datei von der
Platte **zurücklesen**, bevor sie in die Lese-App geht.

```
KERN (Sender)        19 Bereiche · Export traegt alle 6 Pro-Bereiche
                     mit Werten UND Feld-Definitionen · 10 411 Byte

EMPFAENGER (vorher)  13 Bereiche · 0 Pro-Bereiche · 0 in der Navigation
                     0 gerendert · 6 Marken gesetzt, 0 angekommen
                     Positivkontrolle (Buerger-Feld): angekommen
```

**Die Positivkontrolle ist der Grund, warum diese Null etwas bedeutet.** Ein Bürger-Feld im selben
Depot kam an; ein kaputter Lauf hätte beide Marken verloren.

Die Ursache stand an drei Stellen: `SEKTOREN` war eingefroren und wurde nie erweitert,
`sidebarHTML` zählte diese eigene Liste auf, und `sektorHTML` gab bei einem unbekannten Bereich den
leeren String zurück, **bevor ein Wert gelesen wurde**. Der Bereich war beim Empfänger nicht leer,
sondern nicht vorhanden. `bereichsModule` kam in der ganzen Datei genau **einmal** vor — im Zähler
der Herkunftszeile. Im Kern: 30 Mal.

## Warum kein Hinweis gebaut wurde, obwohl der erste Auftrag einer war

Der ursprüngliche Auftrag lautete, dem Empfänger zu sagen, **dass** diese Fassung nicht alles
darstellt. Das wurde am selben Tag kassiert, und die Regel gilt seither allgemein:

> „Ganz allgemein, wenn etwas fehlt, dann muss es korrigiert werden und ich brauche nicht
> stattdessen eine Anzeige, wo steht, dass etwas fehlt. Das ist totaler Unsinn."

Und dazu: *„Wir bauen nichts statisch. Wir bauen Gerüst und Modul."*

Der halb gebaute Hinweis ist vollständig zurückgenommen. **Dieser Zug führt keine einzige neue
Zeichenkette ein** — eine Probe hält das fest; sie ist die Umkehrung der sonst üblichen
Textsatz-Auflage.

**Die Gegenprobe, die belegt, dass ein Hinweis auch inhaltlich nichts getragen hätte:** dasselbe
Depot mit und ohne Modul unterschied sich beim Empfänger in genau einer Ziffer der Herkunftszeile
(„2 insgesamt" statt „1"), die Navigation war **byte-gleich**. Der Satz dort spricht über
Vertrauenswürdigkeit, nicht über Vollständigkeit — er macht misstrauisch gegen das Sichtbare und
ahnungslos gegenüber dem Unsichtbaren. Ein leeres Depot zählt bereits 1, weil ein `logikModul` ab
Werk mitkommt.

## Was gebaut ist: der Spiegel, nicht die Liste

Die Lese-App **meldet an**, wie der Kern es tut. Sie kennt keinen einzigen Pro-Bereich.

```
_foldVollmachtenLesen   der EINE Trichter (alle vier Wege ins `data`)
  └─ _bereichsModuleAusDepotAnmeldenLesen(depot)
       ├─ bereichsModulPruefenLesen(m)        je Modul
       └─ _sektorIndexNeuBauenLesen()         SEKTOR_BY_ID neu

bereicheAlleLesen()  =  SEKTOREN.concat(_BEREICHS_MODUL_REGISTRY_LESEN)
sidebarHTML()        läuft darüber, nicht mehr über SEKTOREN
sektorHTML()         schlägt im neu gebauten SEKTOR_BY_ID nach
```

`SEKTOREN` **bleibt eingefroren und unangetastet**; `SEKTOR_BY_ID` ist von einer `const`- zu einer
`let`-Bindung geworden, genau wie im Kern.

**Der Prüfer ist gespiegelt, nicht nur die Anmeldung.** Die Lese-App öffnet fremde Dateien; ein
Modul, das im Kern abgewiesen würde, darf hier nicht durchgehen. Jede Entscheidung, die im Kern ein
Modul **verwirft**, steht auch hier: unbekannte Top-Level-Schlüssel, `moduleVersion`, `herkunft`,
`bereiche` als Liste statt Objekt, Sprachangabe bei beschriftetem Modul, und je Bereich Form der
Kennung, Reservierung und Beschriftung. **Ein ungültiges Modul leert den Bestand nicht** — die
dreizehn eingebauten Bereiche bleiben stehen, und das Depot bleibt lesbar.

**Was ausdrücklich NICHT gespiegelt ist, benannt statt stillschweigend weggelassen:**

| | Grund |
|---|---|
| `merkmale` / `rollen` | verwerfen im Kern nie einen Bereich; die Lese-App verzweigt an keiner Stelle danach |
| Icon-Prüfung | die Navigation dieser Fassung zeigt Beschriftungen, keine Icons — ein Icon-Name kann hier nichts verwerfen, weil er nichts anzeigt |
| `data.bereichsIdentitaeten` | der Kern schreibt sie beim Index-Aufbau ins Depot. **Die Lese-App schreibt nie in ein fremdes Depot** — keine Auslassung, sondern ihre Regel |

## Gerüst und Modul, nicht eine zweite Liste

Zwei Proben verteidigen genau das, und sie sind der Grund, warum dieser Bau die DoD trifft und
nicht nur den heutigen Fall:

- **Ein frei erfundenes Modul**, das der Kern nie gesehen hat (erfundene Herkunft, erfundene
  Kennungen, erfundene Felder), kommt an und erscheint in der Navigation. Ein Bau, der nur die
  sechs bekannten Pro-Bereiche zeigte, hätte die Liste abgeschrieben — auch wenn es nicht so
  aussähe.
- **Die reservierten Kennungen sind abgeleitet**, keine zweite Aufzählung:
  `BEREICH_IDS_EINGEBAUT_LESEN` entsteht aus `SEKTOREN`. Wären sie danebengepflegt, bliebe die
  Sperre stehen, wenn die eingebaute Liste weicht — und ein Modul könnte seinen eigenen Bereich
  nicht mehr mitbringen.

**Der Weg trägt, wenn in `:1469` nichts mehr steht.** `bereicheAlleLesen()` ist `concat`, kein
Rückgriff auf einen nativen Bestand. Die eine Stelle, die daran zerbrochen wäre, ist gewacht:
`renderVollExport` nahm `bereicheAlleLesen()[0].id` ohne Prüfung — bei leerer Liste ein Absturz
statt einer leeren Sicht.

## Herkunft: Rand, nicht Fläche — und kein Beipackzettel

Ein angedockter Bereich trägt `bereich--angedockt`, den wörtlichen Spiegel von
`.content-narrow.marke-fremd` im Kern (U2-ADR-296 auf U2-ADR-236). **Kein Text daneben.** Ein Satz,
der sagt, woher der Inhalt kommt, wäre eine Anzeige — genau das, was die oben zitierte Regel
ausschließt. Die Herkunftszeile am Kopf der Sicht (U2-ADR-258) ist unberührt und zählt
`bereichsModule` weiter; ein Modul ohne geprüfte Herkunft gilt weiter als ungeprüft, auch jetzt, wo
es sichtbar ist.

## Die Wand daneben, gemessen und nicht eingerissen

Die Bereiche kommen an. **Die beiden Pro-Templates noch nicht**, aus einem zweiten, unabhängigen
Grund:

```
Kern    LOGIK_DATEN_TYPEN        6 Typen, darunter `listenfeldAlle`
Lesen   LOGIK_DATEN_TYPEN_LESEN  5 Typen, `listenfeldAlle` fehlt

Notar-Kanzleivertretung (U2-ADR-287)   feld×4, listenfeldAlle×5   -> abgewiesen
Geschaeftsfuehrerin     (U2-ADR-295)   feld×6, listenfeldAlle×5   -> abgewiesen
Erbschein               (U2-ADR-288)   ohne listenfeldAlle        -> 3 155 Zeichen
```

Ein unbekannter Typ im `datenSchema` weist das **ganze** Bundle ab. Sichtbar ist seit diesem Zug der
Bereich mit Überschrift und seinen Feld-Werten; der Template-Abschnitt darin bleibt leer. Das ist
ein eigener Spiegel (Typliste, Lese-Primitiv ohne Diskriminante, Validator-Zweig) und ein eigener
Zug — **beschrieben, nicht überbaut.**

**Ebenfalls gemessene Grenze — AUFGEHOBEN durch U2-ADR-334 am selben Tag:** die Beschriftung eines angedockten Bereichs ist beim Empfänger noch
nicht übersetzbar. Der Label-Getter ist wörtlich der des Kerns
(`textLesen(bereichId + '.label')`), aber der Kennungsraum der Lese-App lässt nur
`strings:<schlüssel>.text` für Schlüssel ihrer eigenen Tabelle zu; eine Bereichs-Kennung wird bei
der Anmeldung benannt verworfen. Das ist eine bestehende, absichtliche Grenze — sie zu weiten hieße
zu entscheiden, **was** ein fremdes Modul beim Empfänger überschreiben darf. Die Probe, die diesen Stand festhielt, ist bei der Aufhebung umgedreht
worden statt gelöscht — der Weg von der Grenze zu ihrer Aufhebung bleibt dort lesbar, wo die
Grenze stand.

## Konformität

```yaml
konformitaet:
  - aussage: >-
      Ein Bereich, den ein gültiges `bereichsModule` im Depot mitbringt, erscheint beim Empfänger
      in der Navigation und zeigt die Werte, die die Datei für ihn trägt — auch dann, wenn die
      Lese-App diesen Bereich nicht kennt und nie gekannt hat.
    zustand: erfuellt
    herkunft: U2-ADR-323 (06.09.2026), gemessen an einer echten Export-Datei
    pruefung:
      - tests/u2-adr-323-angedockte-bereiche-lese-app.test.js
        "[U2-ADR-323·Rot-Beweis] ein Pro-Depot zeigt die sechs angedockten Bereiche MIT Werten"
      - tests/u2-adr-323-angedockte-bereiche-lese-app.test.js
        "[U2-ADR-323·Gerüst, nicht statisch] ein frei erfundenes Modul, das der Kern nie gesehen hat, kommt an"
      - tools/lese-app-bereichsluecke-messen.js

  - aussage: >-
      Ein Depot ohne Bereichs-Modul zeigt beim Empfänger unverändert die eingebauten Bereiche, und
      ein Bürger-Feld kommt in beiden Fällen an.
    zustand: erfuellt
    herkunft: U2-ADR-323 (06.09.2026)
    pruefung:
      - tests/u2-adr-323-angedockte-bereiche-lese-app.test.js
        "[U2-ADR-323·Rot-Beweis Gegenrichtung] ein Depot OHNE Modul zeigt unverändert dreizehn"
      - tests/u2-adr-323-angedockte-bereiche-lese-app.test.js
        "[U2-ADR-323·Positivkontrolle] ein Bürger-Feld im selben Depot kommt weiter an"

  - aussage: >-
      Ein Modul, das die Strukturprüfung nicht besteht, wird abgewiesen und leert den vorhandenen
      Bestand nicht; eine eingebaute Bereichs-Kennung kann ein Modul nicht überschreiben, und bei
      zwei Modulen mit derselben Kennung gewinnt das erste, während das zweite benannt wird.
    zustand: erfuellt
    herkunft: U2-ADR-323 (06.09.2026), gespiegelt aus `bereichsModulPruefen` im Kern
    pruefung:
      - tests/u2-adr-323-angedockte-bereiche-lese-app.test.js
        "[U2-ADR-323·Sicherheit] ein ungültiges Modul wird abgewiesen und leert den Bestand NICHT"
      - tests/u2-adr-323-angedockte-bereiche-lese-app.test.js
        "[U2-ADR-323·Sicherheit] unbekannte Schlüssel und reservierte Kennungen werden benannt verworfen"
      - tests/u2-adr-323-angedockte-bereiche-lese-app.test.js
        "[U2-ADR-323] zwei Module mit derselben Kennung: der erste gewinnt, der zweite wird benannt"

  - aussage: >-
      Die Sperre gegen das Überschreiben eingebauter Bereiche wird aus der eingebauten Liste
      abgeleitet und nicht als zweite Aufzählung geführt — der Weg trägt, wenn diese Liste weicht.
    zustand: erfuellt
    herkunft: U2-ADR-323 (06.09.2026), „wir bauen nichts statisch, wir bauen Gerüst und Modul"
    pruefung:
      - tests/u2-adr-323-angedockte-bereiche-lese-app.test.js
        "[U2-ADR-323·Gerüst, nicht statisch] die reservierten Kennungen sind ABGELEITET, keine zweite Liste"

  - aussage: >-
      Ein angedockter Bereich ist am Rand erkennbar, ohne dass ein Satz daneben über seine Herkunft
      informiert; die Herkunftszeile am Kopf der Sicht bleibt unverwässert.
    zustand: erfuellt
    herkunft: U2-ADR-323 (06.09.2026) auf U2-ADR-296/U2-ADR-236/U2-ADR-258
    pruefung:
      - tests/u2-adr-323-angedockte-bereiche-lese-app.test.js
        "[U2-ADR-323·Rand, nicht Flaeche] der angedockte Bereich traegt den Rand des Kerns — und KEINEN Beipackzettel"
      - tests/u2-adr-323-angedockte-bereiche-lese-app.test.js
        "[U2-ADR-323·Herkunftszeile] die Angabe über eingelassene Erweiterungen bleibt unverwässert"
      - tests/u2-adr-323-angedockte-bereiche-lese-app.test.js
        "[U2-ADR-323·kein neuer Text] dieser Zug fuehrt keine einzige neue Zeichenkette ein"

  - aussage: >-
      Die Beschriftung eines angedockten Bereichs kommt beim Empfänger aus dem Modul UND erreicht
      den Textsatz der Lese-App — die hier ursprünglich gemessene Grenze (der Kennungsraum ließ nur
      die eigenen Zeichenketten-Schlüssel zu) ist mit U2-ADR-334 aufgehoben, am selben Tag, im
      selben Zug wie dieser ADR.
    zustand: erfuellt
    herkunft: U2-ADR-323 (06.09.2026), Grenze aufgehoben durch U2-ADR-334 (06.09.2026); Korrektur
      hier eingearbeitet, nachdem der Block seit U2-ADR-334 nicht zurückgeschrieben worden war
      (Fund, 17.09.2026)
    pruefung:
      - tests/u2-adr-323-angedockte-bereiche-lese-app.test.js
        "[U2-ADR-323 -> U2-ADR-334] die gemessene Grenze ist aufgehoben — die Beschriftung ist übersetzbar"
```

## Nachwort: das Werkzeug hätte den Bau widerlegt

Das Messwerkzeug rief zunächst nur `setData` und ging damit **am Trichter vorbei**, in dem die
Anmeldung sitzt. Es hätte nach dem Bau dasselbe Ergebnis gezeigt wie davor — 0 von 6 — und die
naheliegende Erklärung wäre gewesen, der Bau tauge nicht. Es geht seither denselben Weg wie der
Betrieb (`_foldVollmachtenLesen`), und die Zählung der angekommenen Marken läuft über
`bereicheAlleLesen()` statt über die eingebaute Liste.

**Ein Messwerkzeug, das den Weg des Betriebs nicht geht, misst einen Zustand, den es im Betrieb
nicht gibt.**
