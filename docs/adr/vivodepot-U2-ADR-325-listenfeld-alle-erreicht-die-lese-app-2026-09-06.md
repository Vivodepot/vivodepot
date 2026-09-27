# U2-ADR-325: `listenfeldAlle` erreicht die Lese-App — und die Typliste kommt aus einer Quelle

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Betrifft:** `vivodepot-lesen.html` (`LOGIK_DATEN_TYPEN_LESEN`, `_datenPrimitivLesenLesen`),
`tools/build-logik-typen.js`, `tools/waechter-register.js` (`W-logik-datentypen`),
`hooks/pre-commit`, `package.json`, `tests/u2-adr-325-listenfeld-alle-lese-app.test.js`

- **Status heute:** gilt — beide eingelassenen Pro-Templates (U2-ADR-287, U2-ADR-295) werden vom
  Empfänger angenommen und gerendert. Die Typliste der Lese-App wird erzeugt, nicht gepflegt.

---

## Der Befund

U2-ADR-323 brachte die angedockten **Bereiche** zum Empfänger. Die **Templates** darin blieben
leer, aus einem zweiten, unabhängigen Grund:

```
Kern    LOGIK_DATEN_TYPEN        6 Typen, darunter `listenfeldAlle`
Lesen   LOGIK_DATEN_TYPEN_LESEN  5 Typen — `listenfeldAlle` fehlte

Notar-Kanzleivertretung (U2-ADR-287)   feld x4, listenfeldAlle x5   -> abgewiesen
Geschaeftsfuehrerin     (U2-ADR-295)   feld x6, listenfeldAlle x5   -> abgewiesen
Erbschein               (U2-ADR-288)   ohne listenfeldAlle          -> gerendert
```

`listenfeldAlle` entstand am 05.09.2026 im Kern (U2-ADR-287): ein Unterfeld aus **jeder** Zeile,
ohne Diskriminante — gebraucht von Pro-Listen wie „Vertretungsplan", die kein Feld-Wert-Paar haben,
das genau eine Zeile trifft. Die Lese-App führte ihre eigene Aufzählung derselben Sache und zog
nicht mit. **Ein unbekannter Typ im `datenSchema` weist das GANZE Bundle ab** — nicht das eine
Feld. Beide Pro-Templates waren beim Empfänger damit nicht vorhanden, obwohl der Kern sie zeigt.

**Es war keine falsche Zeile, sondern eine zweite Liste.**

## Die scharfe Stelle ist nicht der Typ, sondern seine Sensibel-Prüfung

`unterfeldIstSensibel(sektorId, listeId, ZEILE, unterfeldDef)` nimmt die **Zeile** — der Schlüssel
trägt deren `typ`. Dieselbe Spalte kann in einer Zeile zurückgehalten sein und in der nächsten
nicht. Eine Prüfung, die einmal für die ganze Liste entschiede, wäre in **beide** Richtungen falsch:

| | Folge |
|---|---|
| **zu wenig** | ein zurückgehaltenes Unterfeld erscheint beim Empfänger — eine Offenlegung durch die Hintertür |
| **zu viel** | die unverdächtigen Zeilen verschwinden mit. **Und das fällt niemandem auf, weil es aussieht wie Datenschutz.** Der Empfänger sieht ein Dokument mit Löchern und weiß nicht, dass sie da sind |

Der Kern hat diese Falle bereits gesehen und entschieden — `listenfeldAlle` steht dort ausdrücklich
im selben Prüfzweig wie `listenfeld`: *„liest einen ROHEN Feldwert je Zeile — dieselbe Gefahr wie
`listenfeld`, darum dieselbe Prüfstelle, nicht die Namens-Ausnahme."* **Dieser Zug spiegelt eine
getroffene Entscheidung, er trifft keine neue.**

Die Rot-Probe prüft alle drei Richtungen: die sensible Zeile fällt weg, die beiden daneben
erscheinen, **und es sind genau zwei** — die dritte Zusicherung ist die gegen „zu viel".

**Positivkontrolle der Probe selbst, gefahren am 06.09.2026:** gegen eine Fassung ohne den
Zeilen-Filter werden beide Sicherheits-Proben rot, mit der erwarteten Meldung. Die Probe bewacht
also wirklich, was sie zu bewachen behauptet.

## Warum ein Erzeuger und kein Wächter

Dieselbe Antwort, die das Repo für die Bereiche schon gibt (`tools/build-bereiche.js`): eine
Quelle, generierte Region zwischen Markern, `--check` im Gate. Ein Wächter hätte zwei Listen
verglichen; ein Erzeuger lässt die zweite gar nicht erst entstehen.

**Und er schreibt nicht blind ab — das ist der Teil, der ihn von einer Kopie unterscheidet:**

```
Der Kern kennt Datenlesen-Typen, fuer die die Lese-App keinen Fall hat: <typ>.
Diese Liste NICHT einfach nachziehen — ein Typname ohne `case` in
`_datenPrimitivLesenLesen` laesst die Lese-App das Bundle ANNEHMEN und das Feld
still leer lassen. Der Empfaenger saehe ein Dokument mit Loechern und wuesste
nicht, dass sie da sind.
Zuerst den Lese-Fall bauen — samt Sensibel-Pruefung je Zeile, wo der Typ Zeilen
liest —, dann diesen Erzeuger laufen lassen.
```

**Ein bloß kopierter Typname wäre schlimmer als der alte Zustand.** Heute weist die Lese-App ein
Bundle mit unbekanntem Typ ab — laut und ganz. Stünde der Name in der Liste ohne `case`, nähme sie
es an und ließe das Feld still leer (`default: return undefined`). **Der laute Fehlschlag ist die
bessere Eigenschaft, und der Erzeuger erhält sie, statt sie einzutauschen.**

Ein siebter Typ im Kern macht damit das Gate rot, statt hier still zu fehlen.

## Konformität

```yaml
konformitaet:
  - aussage: >-
      Ein Logik-Modul, das `listenfeldAlle` verwendet, wird von der Lese-App angenommen und
      gerendert — beide eingelassenen Pro-Templates erreichen den Empfänger.
    zustand: erfuellt
    herkunft: U2-ADR-325 (06.09.2026), gemessen an den Bundles im Repo
    pruefung:
      - tests/u2-adr-325-listenfeld-alle-lese-app.test.js
        "[U2-ADR-325] die beiden Pro-Templates werden jetzt angenommen und gerendert"
      - tools/lese-app-bereichsluecke-messen.js

  - aussage: >-
      Bei `listenfeldAlle` gilt die Sensibel-Zurückhaltung je Zeile: eine Zeile, deren Unterfeld
      zurückgehalten ist, erscheint nicht — und die unverdächtigen Zeilen daneben erscheinen
      vollständig, nicht auf eine verkürzt.
    zustand: erfuellt
    herkunft: U2-ADR-325 (06.09.2026), gespiegelt aus derselben Entscheidung im Kern (U2-ADR-287)
    pruefung:
      - tests/u2-adr-325-listenfeld-alle-lese-app.test.js
        "[U2-ADR-325·Rot-Beweis·Sicherheit] die sensible Zeile fällt weg — und NUR sie"
      - tests/u2-adr-325-listenfeld-alle-lese-app.test.js
        "[U2-ADR-325·Rot-Beweis Gegenrichtung] ohne Überschreibung wird keine Zeile zurückgehalten"
      - tests/u2-adr-325-listenfeld-alle-lese-app.test.js
        "[U2-ADR-325] ein schema-sensibles Unterfeld bleibt in JEDER Zeile zurückgehalten"

  - aussage: >-
      Die Datenlesen-Typen der Lese-App sind die des Kerns und werden erzeugt, nicht gepflegt.
    zustand: erfuellt
    herkunft: U2-ADR-325 (06.09.2026), Muster von tools/build-bereiche.js
    pruefung:
      - tests/u2-adr-325-listenfeld-alle-lese-app.test.js
        "[U2-ADR-325·eine Quelle] die Typliste der Lese-App ist die des Kerns"
      - tests/u2-adr-325-listenfeld-alle-lese-app.test.js
        "[U2-ADR-325·Erzeuger] --check ist grün gegen den echten Bestand"

  - aussage: >-
      Kennt der Kern einen Datenlesen-Typ, für den die Lese-App keinen Lese-Fall hat, schlägt der
      Erzeuger fehl und benennt ihn — die Typliste wird nie über einen fehlenden Fall hinweg
      nachgezogen.
    zustand: erfuellt
    herkunft: U2-ADR-325 (06.09.2026)
    pruefung:
      - tests/u2-adr-325-listenfeld-alle-lese-app.test.js
        "[U2-ADR-325·Erzeuger·Rot] ein Kern-Typ ohne Lese-Fall lässt den Erzeuger scheitern"
      - tools/waechter-register.js "W-logik-datentypen"
```

## Was dieser Zug NICHT tut

- **Er bringt keine weiteren Blocktypen.** Die Lese-App kennt `immer`, `crossRef` und
  `frageAntwortOderLuecke`; die übrigen Kern-Blocktypen brauchen eine vom Bundle mitgebrachte
  Funktion, die ein reines JSON-Bundle nie mitbringen kann (A528, unverändert).
- **Er weitet den Kennungsraum des Textsatzes nicht.** Die Beschriftung eines angedockten Bereichs
  bleibt beim Empfänger die des Moduls (U2-ADR-323, gemessene Grenze) — für die englische
  Bürgerin heißt das weiterhin deutsche Bereichsnamen. Eigener Posten.
