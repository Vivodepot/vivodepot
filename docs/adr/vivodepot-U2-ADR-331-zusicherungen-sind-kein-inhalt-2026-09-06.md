# U2-ADR-331: Ein Satz über den eigenen Zustand ist kein Inhalt — kein Modul überschreibt ihn

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Betrifft:** `vivodepot-lesen.html` (`ZUSICHERUNGS_SCHLUESSEL_LESEN`, `_istZusicherungsKennung`,
`textsatzModulPruefen`), `vivodepot.html` (`ZUSICHERUNGS_SCHLUESSEL_KERN`, `_istZusicherungsKennung`,
`textsatzModulPruefen`, `_textsatzModulPruefenGeruest`, `_textsatzTexteUebernehmen`,
`_textsatzAbWerkRegistrySeed`), `tools/zusicherungs-schluessel-erheben.js`,
`tools/waechter-register.js` (`W-zusicherungs-sperre`), `hooks/pre-commit`, `package.json`,
`tests/u2-adr-331-zusicherungen-nicht-ueberschreibbar.test.js`,
`tests/u2-adr-331-zusicherungen-nicht-ueberschreibbar.test.js`,
`tests/zusicherung-ab-werk-vertrauen.test.js`

- **Status heute:** gilt — die Sätze, mit denen Lese-App UND Kern über den Zustand des Dokuments
  sprechen, sind in **jeder** Sprache gegen Überschreiben durch ein Modul gesperrt. Gewöhnliche
  Beschriftungen bleiben anpassbar. Die Ab-Werk-Saat (in die jeweilige Anwendung gebacken, nicht
  Depot-Inhalt) darf als einzige Quelle übersetzen — s. Vermerk 19.09.2026 unten.

---

## Der Befund

Gemessen am 06.09.2026 am Kanon, mit einem frei erfundenen Textsatz-Modul in einer **nicht
eingebauten** Sprache:

```
Modul   modulTyp textsatz · sprache 'en' · herkunft urn:fremd:v1
        strings:klartextHinweis.text        -> "This file is securely encrypted."
        strings:herkunftSatzTeilweise.text  -> "All entries come from verified sources."

Ergebnis  gueltig: true — beide uebernommen

Was der englischsprachige Empfaenger danach las:
  "This file is securely encrypted."        ueber einer UNVERSCHLUESSELTEN Datei
  "All entries come from verified sources." ueber UNGEPRUEFTEN Erweiterungen
```

**Das ist keine Unschönheit, sondern eine Falschaussage über den Zustand des Depots — ausgelöst von
dem, der es geschickt hat.** Der Empfänger hat kein Original, gegen das er sie halten könnte; genau
diese zwei Sätze braucht er, um das Dokument einzuordnen.

**Der bestehende Riegel trug die halbe Strecke:** ein Modul mit `sprache === 'de'` wird als
`reserviert` abgewiesen — die eingebaute deutsche Fassung ist unantastbar. **Für jede andere Sprache
galt das nicht,** also für genau die, um die es bei einer offenen Sprachachse geht: Englisch,
Arabisch, Georgisch, Chinesisch, afrikanische Sprachen.

**Der Unterschied zum Kern, und er erklärt, warum dieselbe Bauform dort sicher ist:** der Kern
öffnet einen **kuratierten Inhalts-Katalog** — Dokumentnamen, Hinweise zu Erneuerungsrhythmen,
Feld-Vorschläge. Keine einzige Aussage über den Zustand der Anwendung. Die Lese-App öffnete ihre
**ganze Oberflächen-Tabelle**, in der Beschriftungen und Zustandssätze nebeneinanderliegen.
**Nicht das Prädikat unterscheidet die beiden, sondern was der Katalog enthält** — und das ist die
Frage, die beim nächsten Katalog zuerst zu stellen ist.

## Die Entscheidung und ihre Grundlage

Sie folgt aus einer bestehenden Grenze, nicht aus einer neuen Abwägung:

> **Das Modul liefert Werte und Bedeutung. Das Gerüst besitzt Rollen und Verhalten.**

**Ein Satz, mit dem die Anwendung etwas über ihren eigenen Zustand aussagt, ist kein Inhalt — er ist
Verhalten.** „Diese Datei ist verschlüsselt" ist keine Beschriftung, sondern eine Zusicherung, und
sie gehört dem Gerüst.

**Die Folge, bewusst in Kauf genommen:** ein Zusicherungs-Satz bleibt deutsch, wenn die App für die
Sprache des Depots keine eigene Fassung trägt. **Richtig ist eine falsche Sprache; falsch wäre eine
falsche Aussage.** Vertrauenswürdig in eine andere Sprache kommt ein solcher Satz nur, wenn die
Anwendung ihn selbst trägt (s. den Vermerk vom 19.09.2026); Englisch ist so gedeckt, jede weitere
Sprache ist eine Ergänzung der App, keine des Moduls.

**Vermerk (19.09.2026) — die offene Frage ist beantwortet:** die einzige vertrauenswürdige Quelle
für eine Übersetzung ist die Ab-Werk-Saat selbst — **Teil des signierten Bündels**, also genauso
vertrauenswürdig wie das Bündel, das sie ausliefert. Der Unterschied ist nicht, WER den Satz
ursprünglich baute, sondern WO er jetzt liegt: `AB_WERK_TEXTSATZ_EN` steht in DIESEM HTML gebacken,
keine Depot-Datei kann es ändern, ohne die Anwendung selbst zu ändern — `data.abWerkMitschrift.
sprache` und `data.textsatzModule` liegen dagegen BEIDE in der Depot-Datei, änderbar von jedem, der
sie besitzt, und bleiben darum ungetrustet wie jedes fremde Modul. Umgesetzt als zweites,
ausdrückliches Argument: `textsatzModulPruefen(modul, { vertrauenswuerdig: true })`, gesetzt NUR am
Aufruf des Ab-Werk-Moduls, nirgends sonst. Rot-Beweis für beide Richtungen (die Saat darf jetzt
übersetzen, ein fremdes Modul weiterhin nicht — auch nicht, wenn es sich als Ab-Werk-Saat ausgibt):
`tests/zusicherung-ab-werk-vertrauen.test.js` (Lese-App). Der Kern erhält denselben Mechanismus
gleich darunter — „Der Kern hatte gar keinen Riegel" beschreibt, warum das dort ein eigener,
schwererer Befund war.

**Vermerk (18.09.2026) — die Frage beantwortet, für gewöhnliche Beschriftungen, nicht für
Zusicherungssätze:** als die Bereiche ins Bündel wanderten (U2-ADR-320) und eingebaute
Bereichs-Beschriftungen zu Gettern wurden, wurde der Stolperdraht dieser ADR scharf (s. „Der
Stolperdraht im Kern" unten) — und die Reparatur sperrte zunächst JEDES Modul aus der Depot-Datei
von der Beschriftung eines eingebauten Bereichs aus, signiert oder nicht. Gemessen (18.09.2026):
diese ADR selbst begründet die Sperre durchgehend über die semantische Klasse des
Textes — Zusicherung gegen gewöhnliche Beschriftung —, nie über Herkunft oder Prüfstufe des
Moduls; ihr eigener Stolperdraht-Test baut sein Angriffsmodul ausdrücklich UNSIGNIERT, roh in
`textsatzModule` geschrieben, am Einlass vorbei. Eine Bereichs-Beschriftung ist zudem keine
Zusicherung: sie steht nie in einem Zustands-Block der Lese-App (s. u.). Für GEWÖHNLICHE
Beschriftungen (nicht für Zusicherungssätze) gilt seither: ein Modul, dessen Signaturkette
`modulEinlassen` tatsächlich verifiziert hat (`ungeprueft === false`), darf die Beschriftung eines
eingebauten Bereichs setzen — ein unsigniertes oder nicht verifiziertes Modul weiterhin nicht. Das
ist die Fähigkeit, ohne die ein Modul einer fremdsprachigen Institution (z. B. einer ungarischen
Hebammen-Praxis) im deutschen Bürgerdepot keinen Sinn ergäbe. Zusicherungssätze bleiben von dieser
Öffnung unberührt — sie kommen für Englisch aus der App selbst, für jede weitere Sprache gilt die
oben genannte Folge.

**Warum die Sperrliste und nicht die Umkehr** (nur ausdrücklich Freigegebenes ist überschreibbar):
die Umkehr wäre sauberer, aber sie legte fest, was ein Sprachmodul überhaupt darf — eine
Produktentscheidung über die offene Sprachachse. Die Sperre schließt das Loch, ohne diese Frage zu
präjudizieren.

## Die Liste ist erhoben, nicht gepflegt

**Eine von Hand gepflegte Sperrliste bewacht die Landkarte ihres Erbauers:** sie schützt, woran er
gedacht hat, und schweigt über den Satz, der morgen dazukommt.

**Der Anker ist bestandseigen, kein Urteil über Wortlaute:** die Anwendung markiert ihre
Zustands-Aussagen im Markup selbst — sie stehen in Blöcken mit eigener Klasse (`klartext-warn`,
`herkunft-marke`, `stand-marke`, `vorlage-marke`). **Die Klasse ist da, WEIL der Block über den
Zustand spricht.**

```
klartext-warn    renderVollExport     ·  klartext-warn   renderAntwort
herkunft-marke   herkunftBlockHTML    ·  stand-marke     standBlockHTML
vorlage-marke    vorlagenMarkeHTML
   + einen Funktionssprung weiter: modulHerkunftSatz, moduleStandSatz
```

**Dass der Anker trägt, zeigt sein Ertrag:** unter den 18 erhobenen Schlüsseln stehen sechs
`vorlage*`-Sätze — sie sagen dem Empfänger, ob die Herkunft eines angedockten Feldes geprüft,
abgelaufen oder nicht prüfbar ist. **An sie hatte niemand gedacht. Eine Handliste hätte zwölf gehabt
und sich vollständig angefühlt.**

**DIE GRENZE DER ERHEBUNG, benannt statt verschwiegen — und sie steht auch im Werkzeugkopf und in
der erzeugten Region selbst, also dort, wo jemand die Liste liest:** eine **neue** Zustands-Klasse
fände die Erhebung nicht von selbst. Dagegen steht ihre Gegenprobe — jede Klasse, die die
Warn-Farbvariablen trägt, muss im Anker stehen. **Der Anker ist bewacht, nicht geglaubt.**

**Und der Erzeuger hält lieber an, als eine unvollständige Wahrheit festzuschreiben:** findet die
Gegenprobe eine Warn-Klasse außerhalb des Ankers, bricht er mit Exit 1 ab und verlangt, **zuerst den
Anker nachzuziehen** — statt eine Liste zu schreiben, die einen Zustandsblock nicht kennt.

**Ein Fehler in der Erhebung selbst, gefunden weil das Ergebnis nicht stimmte:** die erste Fassung
meldete 27 Schlüssel, darunter neun Export-Beschriftungen. Ursache war die Körper-Grenze „bis zur
nächsten `function`-Zeile" — zwischen zwei Funktionen stehen Konstanten und Pfeilfunktionen, der
Schnitt zog 45 fremde Zeilen mit (`vorlagenMarkeHTML` endet auf 5071, die nächste `function`-Zeile
steht auf 5116). **Eine Sperrliste mit neun falschen Einträgen wäre schlimmer als keine.**

## Der Grund heißt `zusicherung`, nicht `unbekannt`

```js
if (_istZusicherungsKennung(kennung)) { verworfene.push({ kennung, grund: 'zusicherung' }); continue; }
if (!_textsatzKennungBekannt(kennung)) { verworfene.push({ kennung, grund: 'unbekannt' }); continue; }
```

`unbekannt` hieße „die kenne ich nicht". **Hier ist die Kennung bekannt und trotzdem tabu** — der
Herausgeber eines Moduls erfährt den Unterschied, statt vor einem stummen Nein zu stehen.

## Der Kern hatte gar keinen Riegel — Nachtrag ZS2 (19.09.2026)

**Anders als der „Stolperdraht" gleich unten (eine latente, bewachte Lücke) war dies ein echter,
scharfer Befund, HOCH eingestuft:** der Kern kennt `modulHerkunftSatz`/`moduleStandSatz` (Bildschirm)
und `modulHerkunftFussText`/`moduleStandFussText` (Fußzeile) — dieselbe Art Zustands-Satz wie
`herkunftBlockHTML`/`standBlockHTML` in der Lese-App —, aber `textsatzModulPruefen` im Kern prüfte
NUR Bekanntheit (`_textsatzKennungBekannt`), nie Vertrauenswürdigkeit. Ein Depot-eigenes Modul
konnte `strings:herkunftSatzKeine.text` und `strings:standSatzBekannt.text` klaglos überschreiben —
gemessen (19.09.2026, ZS1-Nachlese), vor jeder Reparatur, in
`tests/u2-adr-331-zusicherungen-nicht-ueberschreibbar.test.js`.

**Derselbe Mechanismus wie in der Lese-App, aus derselben Erhebungs-LOGIK — nicht derselbe Anker.**
Der Kern trägt keine der fünf Zustands-Klassen der Lese-App und keine `--warn-bg`/`--warn-tinte`-
Variable (gemessen: null Treffer für beide). Er kennzeichnet seinen Zustand stattdessen in den
Satzbauern selbst — der Anker der Kern-Erhebung ist darum die FUNKTION, nicht die Klasse
(`ZUSTAND_FUNKTIONEN_KERN` in `tools/zusicherungs-schluessel-erheben.js`, wörtlich dieselben Helfer
`koerperVon`/`stringsSchluessel` wie beim Klassen-Anker, nur mit einem anderen Startpunkt). Die
erzeugte Liste (`ZUSICHERUNGS_SCHLUESSEL_KERN`, 12 Schlüssel: herkunftSatz-, standSatz- und ihre
Fuss-Varianten) landet als eigene generierte Region in `vivodepot.html`, geprüft von
`_istZusicherungsKennung` dort — wörtlicher Spiegel der Lese-App-Funktion gleichen Namens.

**Der Ab-Werk-Riegel von oben gilt hier genauso:** `_textsatzTexteUebernehmen`/
`textsatzModulPruefen`/`_textsatzModulPruefenGeruest` bekamen dasselbe zweite Argument
(`vertrauenswuerdig`), gesetzt NUR an den vier Ab-Werk-Aufrufen in `_textsatzAbWerkRegistrySeed`
(`AB_WERK_TEXTSATZ_DE`, `AB_WERK_TEXTSATZ_EN_VORDEPOT`, `AB_WERK_TEXTSATZ_EN`,
`AB_WERK_SPRACHE_PRODUKT`) — alle vier in dieses HTML gebacken. Die Mitschrift aus der Depot-Datei
(`d.abWerkMitschrift.sprache`) bleibt bewusst ungetrustet.

**Die englischen Übersetzungen waren bereits da, nur ungeschützt erreichbar:** `AB_WERK_TEXTSATZ_EN`
trägt alle zwölf Kennungen seit U2-ADR-259 (04.09.2026) nativ auf Englisch — dieser Zug musste sie
nicht neu schreiben, nur den Weg dorthin sperren. `AB_WERK_TEXTSATZ_EN_VORDEPOT` bleibt unverändert:
er deckt ausdrücklich nur die vor jedem Depot nötigen Kennungen, die Modul-Vertrauens-Sätze setzen
erst Sinn, sobald ein Depot mit Modulen geladen ist, und die volle `AB_WERK_TEXTSATZ_EN` überschreibt
ihr Fach ohnehin bei jedem Lauf — eine zweite Kopie der zwölf Kennungen dort wäre die Kopie, die
auseinanderläuft.

**Auch der Zustand einer einzelnen Vorlage steht unter dem Schutz:** `vorlageAbgelaufenHinweis` und
`vorlageWiderrufenHinweis` (Widerruf/Ablauf eines eingelassenen Vorlage-Dokuments) sagen über etwas
aus, das die Empfängerin nicht selbst prüfen kann. Ihr Satzbauer `vorlageZustandsSatz` steht in
`ZUSTAND_FUNKTIONEN_KERN`, damit die Sperrliste sie aus dem Quelltext ableitet und nicht eine
Handliste sie vergisst; die Kern-Sperrliste führt damit vierzehn Schlüssel. **Was der Kern sonst noch
an Zuständen aussagt, erhebt die Liste nicht von selbst** — dafür steht `tests/zusicherungs-kandidaten-kern.test.js`:
sie findet jede Kern-Funktion mit Zustands-Vokabular (Geprüft, Abgelaufen, Widerruf, Herkunft, Signatur, …)
außerhalb von `ZUSTAND_FUNKTIONEN_KERN` und verlangt eine Entscheidung in
`tools/zusicherungs-kandidaten-kern-grundlinie.json`: `kein-zusicherungssatz` mit Grund oder `offen`. Ein neuer Fund ist
rot; `offen` gibt es keine mehr (Deckel 0). **Gesperrt sind seither 39 Schlüssel im Kern:** die vier Satzbauer
für Herkunft und Stand eingelassener Erweiterungen, der Zustandssatz einer Vorlage und 25 namentlich geführte
Vertrauens- und Haftungssätze aus großen Render- und PDF-Funktionen (`ZUSTAND_SCHLUESSEL_KERN_EXPLIZIT`):
Prüf-Abzeichen zu Anfragen, Status einer Vereinbarung, Prüfstufen von Modulen und Vorlagen in den Einstellungen,
die Herkunftstexte von Vollmacht, Vorlage und Krisenvorsorge-Bedarf, die Herkunftszeilen des Gesamt-PDFs, der
Hinweis auf zurückgehaltene Angaben im Export, Lizenzhinweis und Herkunftsangabe der Anwendung. Sie stehen namentlich
statt als ganze Funktion, weil deren Körper jede Beschriftung der Sicht enthielte; jeder Name wird gegen den
Quelltext gemessen, ein nicht mehr gelesener bricht die Erhebung ab. Aufnahmekriterium: die Aussage betrifft
Herkunft, Prüfung, Widerruf/Ablauf oder Vollständigkeit von etwas, das die Empfängerin nicht selbst prüfen kann;
Leerzustände, Versionsstände und Link-Beschriftungen bleiben Inhalt. **Folge:** ein fremdes Sprachmodul kann diese
Sätze nicht mehr übersetzen — Englisch trägt die Anwendung selbst, für jede weitere Sprache bleibt der deutsche Satz.
Ob signierte Sprachmodule mit Prüfstufe sie übersetzen dürfen (etwa für Französisch oder Ungarisch), ist eine
offene Produktfrage. Die Heuristik findet Kandidaten, sie beweist nichts: ein Satz ohne Zustands-Vokabular im
Schlüsselnamen entgeht ihr.

**Jeder Zusicherungsschlüssel hat Deutsch und Englisch, in der App selbst.** Die Lese-App trägt die
englischen Fassungen ihrer vierundzwanzig Sätze als `ZUSICHERUNG_TEXTE_EN` im eigenen Quelltext
(nativ auf Englisch geschrieben; gilt nur bei Textsprache `en`, ein Modul ändert daran nichts).
`tests/zusicherungen-de-en-ratsche.test.js` verlangt für jeden Schlüssel der ERZEUGTEN Sperrlisten —
Lese-App wie Kern — einen deutschen und einen englischen Satz mit denselben Platzhaltern; ein neuer
Zustands-Satz ohne Englisch macht die Suite rot.

## Der Stolperdraht im Kern — keine Reparatur, eine Wache

**Gemessen, und heute NICHT scharf:** `identitaet.label` wird vom Schreib-Gate des Kerns
**angenommen**. Nicht über `_istBereichLabelKennung` — die weist eingebaute Kennungen korrekt ab —,
sondern über `_istModulfeldKennung`: Feld- und Bereichs-Kennungen teilen sich dieselbe Form
`<id>.<art>`, und `label` steht in `TEXTSATZ_ARTEN_FELD`.

**Ende-zu-Ende gemessen wird trotzdem nichts gekapert:** die eingebauten Bereiche tragen ihre
Beschriftung als schlichte Zeichenkette; nur angedockte laufen über `_bereichLabelText`. Vorher
„Identität & Person", nachher „Identität & Person".

**Der Riegel sitzt damit nicht dort, wo er aussieht — er sitzt auf der Lese-Seite.** Er hält,
solange eingebaute Beschriftungen keine Getter sind, **und genau das ändert sich, während die
Bereiche ins Bündel wandern (U2-ADR-320, am selben Tag gelandet).** Wer als Nächster an
`_bereichLabelText` arbeitet, macht aus einer latenten eine scharfe Lücke — und niemand bemerkte es,
weil kein Test danach fragte.

**Darum eine Probe statt einer Reparatur.** Sie ist heute grün, kostet nichts, ändert nichts — und
wird rot in dem Moment, in dem die Lücke scharf wird. Ihr Text sagt, warum sie da ist, damit sie
niemand als redundant entfernt.

## Konformität

```yaml
konformitaet:
  - aussage: >-
      Ein Textsatz-Modul kann die Sätze, mit denen die Lese-App über den Zustand des Dokuments
      spricht, in keiner Sprache überschreiben; der Verwurf nennt `zusicherung` als Grund.
    zustand: erfuellt
    herkunft: U2-ADR-331 (06.09.2026), gemessen am Kanon vor und nach dem Bau
    pruefung:
      - tests/u2-adr-331-zusicherungen-nicht-ueberschreibbar.test.js
        "[U2-ADR-331·Rot-Beweis] ein Zusicherungs-Satz wird in JEDER Sprache benannt verworfen"
      - tests/u2-adr-331-zusicherungen-nicht-ueberschreibbar.test.js
        "[U2-ADR-331·Ende-zu-Ende] der Wortlaut der App steht beim Empfänger — ein Modul ändert ihn nicht"

  - aussage: >-
      Eine gewöhnliche Beschriftung bleibt für ein Modul anpassbar — die Sperre schützt eine Klasse
      von Sätzen, sie schaltet den Textsatz nicht ab.
    zustand: erfuellt
    herkunft: U2-ADR-331 (06.09.2026)
    pruefung:
      - tests/u2-adr-331-zusicherungen-nicht-ueberschreibbar.test.js
        "[U2-ADR-331·Rot-Beweis Gegenrichtung] ein gewöhnlicher Text kommt weiter durch"

  - aussage: >-
      Die Sperrliste wird aus den Zustands-Blöcken der Anwendung erhoben und nicht von Hand
      gepflegt; weicht sie von der Erhebung ab, schlägt das Gate fehl.
    zustand: erfuellt
    herkunft: U2-ADR-331 (06.09.2026), Muster von tools/build-bereiche.js
    pruefung:
      - tests/u2-adr-331-zusicherungen-nicht-ueberschreibbar.test.js
        "[U2-ADR-331·Sperre] die erzeugte Liste in der Lese-App ist die erhobene"
      - tests/u2-adr-331-zusicherungen-nicht-ueberschreibbar.test.js
        "[U2-ADR-331·Ausbeute] die Erhebung findet überhaupt Zustands-Blöcke und Schlüssel"

  - aussage: >-
      Der Anker der Erhebung ist selbst bewacht: jede Klasse, die die Warn-Farbvariablen trägt, muss
      in ihm stehen — sonst bricht der Erzeuger ab, statt eine unvollständige Liste festzuschreiben.
    zustand: erfuellt
    herkunft: U2-ADR-331 (06.09.2026)
    pruefung:
      - tests/u2-adr-331-zusicherungen-nicht-ueberschreibbar.test.js
        "[U2-ADR-331·Anker] jede Klasse mit den Warn-Farben steht im Anker der Erhebung"
      - tools/waechter-register.js "W-zusicherungs-sperre"

  - aussage: >-
      Ein UNSIGNIERTES oder NICHT VERIFIZIERTES Modul kann die Beschriftung eines EINGEBAUTEN
      Bereichs nicht ändern (bis 18.09.2026: JEDES Modul aus der Depot-Datei — s. Vermerk oben).
    zustand: erfuellt
    herkunft: >-
      U2-ADR-331 (06.09.2026) — die Probe war bis 18.09.2026 ein Stolperdraht (erfüllt, weil
      eingebaute Beschriftungen schlichte Zeichenketten waren, nicht weil das Schreib-Gate es
      verhinderte). Seit die Bereiche ins Bündel wanderten und die Wache scharf wurde, ist die
      Sperre echt — auf der Prüfstufe, nicht auf jedem Depot-Modul (Vermerk 18.09.2026).
    pruefung:
      - tests/u2-adr-331-zusicherungen-nicht-ueberschreibbar.test.js
        "[U2-ADR-331·Wache·Kern] ein Fremdmodul kann die Beschriftung eines EINGEBAUTEN Bereichs nicht ändern"
      - tests/eingebaute-bereichsbeschriftung-nach-pruefstufe.test.js

  - aussage: >-
      Ein SIGNIERTES, VERIFIZIERTES Modul (Depot-eigen oder vor dem Depot angedockt) kann die
      Beschriftung eines EINGEBAUTEN Bereichs setzen — die Fähigkeit, die eine fremdsprachige
      Institution braucht, um das ganze Depot in ihre Sprache zu heben.
    zustand: erfuellt
    herkunft: Vermerk 18.09.2026 — s. Absatz oben
    pruefung:
      - tests/eingebaute-bereichsbeschriftung-nach-pruefstufe.test.js

  - aussage: >-
      Der KERN kennt dieselbe Sperre wie die Lese-App: ein Depot-eigenes Textsatz-Modul kann die
      Sätze, mit denen der Kern über Herkunft/Stand eingelassener Erweiterungen spricht (Bildschirm
      UND Fußzeile, zwölf Kennungen), in keiner Sprache überschreiben.
    zustand: erfuellt
    herkunft: Vermerk ZS2 (19.09.2026) — s. „Der Kern hatte gar keinen Riegel" oben
    pruefung:
      - tests/u2-adr-331-zusicherungen-nicht-ueberschreibbar.test.js

  - aussage: >-
      Nur die in die jeweilige Anwendung GEBACKENE Ab-Werk-Saat (AB_WERK_TEXTSATZ_EN im Kern wie
      in der Lese-App) darf einen Zusicherungs-Satz in eine andere Sprache setzen; ein Depot-eigenes
      oder geladenes Modul weiterhin nicht — auch nicht, wenn es sich als Ab-Werk-Saat ausgibt.
    zustand: erfuellt
    herkunft: Vermerk 19.09.2026 — s. Absatz „die offene Frage ist beantwortet" oben
    pruefung:
      - tests/zusicherung-ab-werk-vertrauen.test.js
      - tests/u2-adr-331-kern-zusicherungen-nicht-ueberschreibbar.test.js
        "[U2-ADR-331·Kern·Rot-Beweis] ein Depot-eigenes Modul darf strings:herkunftSatzKeine.text NICHT überschreiben"

  - aussage: >-
      Auch die Zustands-Sätze einer eingelassenen Vorlage (Widerruf, Ablauf) stehen unter dem Schutz:
      jeder Schlüssel der erzeugten Kern-Sperrliste wird aus einem Depot-Modul benannt verworfen.
    zustand: erfuellt
    herkunft: ZS2-Nachtrag 19.09.2026
    pruefung:
      - tests/u2-adr-331-kern-zusicherungen-nicht-ueberschreibbar.test.js
        "[U2-ADR-331·Kern·Klasse] JEDER Schlüssel der erzeugten Kern-Sperrliste wird aus einem Depot-Modul benannt verworfen — auch die zwei Vorlagen-Zustandssätze"

  - aussage: >-
      Jeder Zusicherungsschlüssel der Lese-App und des Kerns hat einen deutschen und einen englischen
      Satz, mit denselben Platzhaltern; die englischen Sätze stehen in der App selbst.
    zustand: erfuellt
    herkunft: ZS2-Nachtrag 19.09.2026
    pruefung:
      - tests/zusicherungen-de-en-ratsche.test.js

  - aussage: >-
      Jede Kern-Funktion mit Zustands-Vokabular außerhalb von ZUSTAND_FUNKTIONEN_KERN ist entschieden
      (geschützt oder kein Zusicherungssatz mit Grund; `offen` gibt es nicht mehr); ein neuer Fund macht die Suite rot.
    zustand: erfuellt
    herkunft: ZS2-Restrisiko 19.09.2026
    pruefung:
      - tests/zusicherungs-kandidaten-kern.test.js
```

## Was dieser Zug NICHT tut

- **Er repariert das Schreib-Gate des Kerns nicht.** Die Namensraum-Überschneidung zwischen Feld-
  und Bereichs-Kennungen bleibt; sie ist heute folgenlos und bewacht.
- **Er weitet den Kennungsraum der Lese-App nicht.** Die Beschriftung eines angedockten Bereichs
  erreicht der Textsatz weiterhin nicht — das ist der nächste Zug, und er wird durch diese Sperre
  erst verantwortbar.
- **Die Kern-Sperre deckt die Satzbauer aus `ZUSTAND_FUNKTIONEN_KERN`, nicht jede denkbare
  Zustands-Aussage des Kerns.** Ein neuer Satzbauer über den Zustand der Anwendung oder einer
  eingelassenen Erweiterung muss dort eingetragen werden — s. Absatz oben.
