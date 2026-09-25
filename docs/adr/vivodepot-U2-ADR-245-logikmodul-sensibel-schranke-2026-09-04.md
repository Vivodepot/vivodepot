# U2-ADR-245: Ein `logikModul` braucht ein ausdrückliches Recht auf ein sensibles Feld — kein stillschweigendes

**Status:** Angenommen
**Datum:** 04.09.2026
**Kategorie:** SICHERHEIT, DATENSCHUTZ
**Linie:** U2
**U2-Bezug:** U2-ADR-232 (dieselbe Nacht, dieselbe Fehlerklasse „gefunden, aber nicht auf den
Ursprung zurückübertragen" — dort git-Umgebung, hier eine Sicherheitsschranke) · Siebtes-Register-
Auftrag „deklarative Vorlagen-Sprache für Logik-Module" (27.08.2026, Commits `5619403a`/`9e5766a3`/
`01b908b4`/`ab5a41bb`/`f3a28f1f`) · `fhirIpsBundle`s `opt.sensibel`-Gate (08.08.2026, Vergleich
unten) · U2-ADR-012 (generische `sensibel`-Property, Ursprung der Kennzeichnung selbst)
**Anker:** Auftrag, Nacht 03./04.09.2026 — Nebenfund während einer separat vorgelegten
Messung „`logikModul` gegen ‚Module tragen keinen Code'".
**Status heute:** gilt — Beleg `tests/siebtes-register-logikmodul.test.js`.

---

## Warum ein eigenes ADR, nicht nur ein Diff

Der Befund ist der schwerste einer Messung, die eigentlich eine andere Frage beantworten sollte
(Konzept vs. Registertyp). Er betrifft einen bereits **ausgelieferten** Zustand seit dem
27.08.2026 — kein hypothetischer Fall, keine Design-Vorsorge für die Zukunft. Ein signierter,
fremder Herausgeber konnte ein `sensibel: true`-Feld (potenziell Artikel-9-DSGVO-Kategorie, hier
konkret die Staatsangehörigkeit) in einen generierten, druckbaren Auszug ziehen, ohne es beim
Einlass anzumelden — und der real genutzte Erbschein-Vorbereitungsauszug tut genau das. Eine
Sicherheits-/Datenschutzlücke in einem ausgelieferten Produktmerkmal ist keine Werkzeug-Änderung,
die man kommentarlos vorbeiziehen lässt; sie gehört mit Befund, Reichweite und Abwägung
aufgezeichnet.

## Kontext

### Der Befund

`logikModul` ist der siebte `EINLASS_REGISTER`-Typ und der EINZIGE, der `(sektor, feld)`-Paare aus
dem echten Depot der Bürgerin liest (`datenSchemaLesen`/`_datenPrimitivLesen`,
`vivodepot.html:39091`/`39118`) und in ein generiertes Dokument einbettet. Weder
`logikModulPruefen` (Einlass) noch die beiden Lesefunktionen prüften bislang, ob ein referenziertes
Feld schema-seitig `sensibel: true` trägt (`vivodepot.html:10720`, Feld `nationalitaet`). Im
übrigen Kern prüfen **41 Stellen** genau das (`feldIstSensibel`, `optionen.sensibel`/`inklSensibel`
an praktisch jedem Export-/Anzeige-Pfad) — `logikModul` war die einzige Ausnahme.

**Real, nicht hypothetisch:** Die ausgelieferte Erbschein-Vorbereitungsauszug-Fixture
(`tests/fixtures/erbschein-vorbereitung-logikmodul.json`, seit 27.08.2026 in Produktion) trägt
`staatsangehoerigkeit: { typ:'feld', sektor:'identitaet', feld:'nationalitaet' }` —
`nationalitaet` ist schema-seitig sensibel.

**Warum die Lücke gerade hier sitzt, nicht bei den anderen sechs Registern:** Bei jedem anderen
Typ trifft **Vivodepot selbst** die Feldauswahl für seine sechs eingebauten Dokument-Generatoren
(kuratiert, nie versehentlich sensibel). Bei `logikModul` trifft ein **fremder, nur signierter
Herausgeber** die Auswahl — das Muster liegt umgekehrt: nicht Eingebautes umgeht die Prüfung,
sondern der andockende Pfad selbst trägt sie nicht.

### Wo die gelesenen Werte enden — der Weg bis zum Ende, nicht bis zum Leser

`logikModul`-Dokumente laufen durch dieselbe, geteilte `dokumentOeffnen`/`_modulOderVorlage`-Route
wie PV/KI/Vollmacht/Betreuung (`vivodepot.html:39928`, `40038`) — **kein eigener Ausgabeweg.** Drei
Wege ab dort: Drucken (`window.print()`, lokal), Als PDF sichern (lokales jsPDF, kein Netzpfad —
dieselbe Garantie, die die Offline-Proben für den GANZEN Kern halten), In Mappe ablegen (bleibt im
Depot). Der Wert verlässt das Gerät also — aber auf demselben Weg, auf dem jedes andere generierte
Dokument im Kern es auch verlässt, kein neuer Pfad. Die Neuheit ist nicht WOHIN, sondern WER die
Feldauswahl trifft (s. o.).

### Liest der Interpreter mehr, als das Bundle deklariert?

Gezielt gemessen, weil die Antwort entscheidet, ob die Einlass-Schranke ausreicht oder eine
zusätzliche Lesezeit-Prüfung braucht: **`datenSchemaLesen` iteriert exakt `Object.entries(bundle.
datenSchema)`** — keinen Platzhalter, keinen Sammelzugriff, keine Liste, die über das Deklarierte
hinausreicht. Jeder Ausgabeschlüssel entspricht genau einem geprüften `datenSchema`-Eintrag.
`bedingungAuswerten`/`sichtbarWenn` werten ausschließlich gegen `ctx.d` aus (das bereits
schema-begrenzte Lese-Ergebnis), nie gegen den rohen Depot-`data`. `formatSchemaAnwenden`s
`codeListeLabel` liest nur die STATISCHE Options-/Label-Definition (`SEKTOR_BY_ID`), nie `data`
— ein abweichender `format.sektor`/`format.feld` könnte höchstens ein falsches Label erzeugen,
nie einen zusätzlichen Wert. `personenNamen`/`listenfeldPersonenNamen` lösen ausschließlich
`personName()` auf (nur `.name`, nichts sonst aus dem Personen-Datensatz).

**Ergebnis: der Lesepfad liest exakt das Deklarierte, keinen Deut mehr.** Damit bleibt eine
Restlücke, aber eine kleine: Ein Feld, das schema-seitig NICHT sensibel ist, das die Bürgerin aber
persönlich als sensibel markiert (Übersteuerung in `data.sensibelFelder`, nach dem Einlass eines
bereits akzeptierten Moduls), wird von dieser Schranke nicht rückwirkend erfasst — die
Übersteuerung entsteht später als der Einlass, und `datenSchemaLesen` selbst prüft (bewusst, s.
Entscheidung 2) keine Übersteuerung. Da der Lesepfad aber NIE mehr liest als beim Einlass geprüft,
bleibt die Restlücke auf genau diesen einen Fall begrenzt — sie wächst nicht durch einen
zusätzlichen, ungeprüften Lesekanal. Ausdrücklich nicht behoben in diesem ADR, s. unten.

## Vergleich: `fhirIpsBundle`s `opt.sensibel` (08.08.2026)

Derselbe Fehlertyp trat am 08.08.2026 bereits bei `fhirIpsBundle` auf und wurde behoben — dortige
Form: **ein einziges, aufrufseitiges Bool** (`inklSensibel = !!(opt && opt.sensibel)`,
`vivodepot.html:18362`), von der BÜRGERIN bei JEDEM Export einzeln gesetzt (informierte
Einzelfall-Zustimmung über die eigenen Daten).

**Für `logikModul` reicht diese Form nicht, aus einem strukturellen Grund:** Bei `fhirIpsBundle`
entscheidet dieselbe Person, deren Daten betroffen sind, bei JEDEM Export neu. Bei `logikModul`
trifft die Feldauswahl ein FREMDER Herausgeber EINMALIG beim Bauen des Moduls — die Bürgerin
entscheidet beim Einlass nur „dieses Modul ja/nein", nicht feldweise. Ein einziges Bool am Bundle
(„dieses Modul darf sensible Felder lesen") wäre nicht auditierbar: es sagt nicht, WELCHES Feld,
und ein Modul mit fünf harmlosen und einem sensiblen Feld sähe genauso aus wie eines mit fünf
sensiblen. **Die per-Eintrag-Form (`sensibelErlaubt: true` an genau der `datenSchema`-Zeile, die es
braucht) macht die Behauptung des Herausgebers selbst zum Prüfgegenstand** — sie steht im Bundle,
lesbar für jede künftige Durchsicht, und bindet exakt an das eine Feld, nicht an das ganze Modul.
Die zusätzliche Granularität ist die Antwort auf die zusätzliche Vertrauensstufe (fremder Autor
statt Selbstauskunft), nicht ein willkürlicher Unterschied.

## Entscheidung

**1 — `logikModulPruefen` verlangt `sensibelErlaubt: true`** an jedem `datenSchema`-Eintrag, der
ein schema-seitig `sensibel: true`-Feld referenziert (`feld`, `verbinden` — jedes `teile[]`-Glied
einzeln, `listenfeld`/`listenfeldPersonenNamen` über das adressierte `unterfeld`). Fehlt es, wird
das GANZE Bundle abgewiesen — dieselbe Bauart wie jeder andere strukturelle Einlass-Fehler in
dieser Funktion, keine neue Fehlerklasse.

**2 — Geprüft wird der SCHEMA-Standardwert (`feld.sensibel`), nicht `feldIstSensibel()`/eine
individuelle Bürger-Übersteuerung.** Die Übersteuerung lebt in `data.sensibelFelder` des GERADE
GELADENEN Depots — sie zum Einlass-Zeitpunkt zu konsultieren machte die Prüfung eines Bundles vom
Zufall abhängig, welches Depot gerade offen ist, und ein und dasselbe Bundle könnte je nach
Ladezustand mal angenommen, mal abgewiesen werden. Die Konsequenz (Restlücke bei nachträglicher
persönlicher Verschärfung) ist gemessen und oben benannt, nicht übersehen.

**3 — `personenNamen`/`listenfeldPersonenNamen` bleiben ausgenommen.** Sie lösen Personen-Verweise
zu NAMEN auf (`personName()`, nur `.name`), keine Sachwerte — dieselbe Grenze, die der Kern
überall sonst zieht (Namen gelten nicht als sensibel).

**4 — Die beiden ausgelieferten Erbschein-Bundle-Fixturen** (`tests/fixtures/erbschein-
vorbereitung-logikmodul.json`, `…-mechanik-en.json`) tragen `sensibelErlaubt: true` jetzt an genau
der `staatsangehoerigkeit`-Zeile — der einzigen, die es braucht. Keine andere Zeile der beiden
Fixturen referenziert ein sensibles Feld (einzeln geprüft: `strasse`/`plz_ort`/`familienstand`/
`vorsorge_instrumente.form` sind nicht sensibel).

**5 — Acht neue Proben** in `tests/siebtes-register-logikmodul.test.js`: Rot-Beweis (sensibles
Feld ohne Flag → abgewiesen), Gegenprobe (mit Flag → angenommen), Gegenprobe (nicht-sensibles Feld
→ unverändertes Bestandsverhalten), dieselbe Rot/Grün-Bindung für `verbinden`, eine Gegenprobe für
`personenNamen` (Ausnahme greift), und **der wertvollste Beweis:** die ECHTE, ausgelieferte
Erbschein-Fixture wird MIT Flag angenommen — und dieselbe Fixture, mit dem Flag testweise entfernt,
wird ABGEWIESEN. Das belegt, dass die Schranke am realen Artefakt trägt, nicht nur an einer
synthetischen Probe, die zufällig zum Code passt.

## Ausdrücklich nicht behandelt

**Die Restlücke aus dem Lesepfad-Befund** (ein Feld, schema-seitig nicht sensibel, von der
Bürgerin aber persönlich später als sensibel markiert, in einem bereits vor der Übersteuerung
akzeptierten Modul) — begrenzt auf genau diesen einen Fall (gemessen: der Lesepfad liest nie mehr
als deklariert), keine zusätzliche Lesezeit-Prüfung in diesem ADR gebaut. Eine künftige Erweiterung
(`datenSchemaLesen` konsultiert `feldIstSensibel()` und maskiert statt zu liefern) ist ein eigener,
kleiner Auftrag, kein struktureller Umbau.

**Keine UI-Offenlegung beim Einlass**, welche Felder ein Modul als sensibel deklariert. Die
Schranke ist eine Zurückweisung ohne Begründung, kein Hinweisdialog — Letzteres wäre eine
UX-Entscheidung, kein Sicherheits-ADR.

**Keine Änderung an `fhirIpsBundle`** oder einem der 41 übrigen `feldIstSensibel`-Aufrufer — anderer
Gegenstand, bereits eigenständig abgesichert.

## Konsequenzen

Ein künftiger `logikModul`-Herausgeber muss ein sensibles Feld ausdrücklich benennen, bevor der
Kern es liest — eine stillschweigende Übernahme ist strukturell ausgeschlossen, geprüft am realen
Erbschein-Artefakt, nicht nur an einer synthetischen Probe. Die Restlücke (spätere persönliche
Übersteuerung) ist benannt und bewusst offen, nicht übersehen — der Unterschied zwischen
„geschlossen" und „an einer Stelle verengt", wie verlangt.

## Konformität

```konformitaet
aussage:  logikModulPruefen weist ein Bundle vollständig zurück, wenn ein datenSchema-Eintrag ein
          schema-seitig sensibel:true-Feld referenziert, ohne dass genau dieser Eintrag
          sensibelErlaubt:true trägt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/siebtes-register-logikmodul.test.js#[logikModulPruefen·Rot-Beweis] ein sensibles Feld OHNE sensibelErlaubt wird abgewiesen
```

```konformitaet
aussage:  Die real ausgelieferte Erbschein-Vorbereitungsauszug-Fixture wird mit dem Flag
          angenommen — und dieselbe Fixture, mit entferntem Flag, wird abgewiesen. Die Schranke
          trägt am echten Artefakt, nicht nur an einer synthetischen Probe.
zustand:  geprüft
herkunft: invariante
pruefung: tests/siebtes-register-logikmodul.test.js#[logikModulPruefen·Rot-Beweis] dieselbe Erbschein-Fixture OHNE das Flag waere abgewiesen (belegt, dass das Flag traegt, nicht nur mitlaeuft)
```

```konformitaet
aussage:  datenSchemaLesen/_datenPrimitivLesen lesen ausschließlich die in datenSchema
          deklarierten (sektor, feld)-Paare — kein Platzhalter, kein Sammelzugriff über das
          Deklarierte hinaus.
zustand:  geprüft
herkunft: invariante
pruefung: tests/vorlagen-sprache-interpreter.test.js#[Daten] das volle Erbschein-Schema, gegen dasselbe Depot wie der bestehende Bestandstest, liefert dieselben Werte wie _erbscheinSektorDaten()
```

---

*Vivodepot GmbH · Berlin · 04.09.2026*
