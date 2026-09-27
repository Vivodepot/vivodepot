# U2-ADR-289: Vivodepot Pro ist angedockt und provisioniert; signierfertig braucht ein eigenes Werkzeug, nicht das der Fremden

**Status:** Angenommen
**Datum:** 05.09.2026
**Kategorie:** ARCHITEKTUR
**Linie:** U2
**U2-Bezug:** U2-ADR-243 (Pro-Modul, vollständiger Feldsatz — sechs Bereiche, 54 Felder je Sprache),
U2-ADR-252 (Vor-Depot-Module überleben die Anlage — der Andock-Mechanismus, den dieser ADR
bestätigt), U2-ADR-172 (die Zwischenstufe Anker→Ausgabestelle→Kunde), U2-ADR-039/040
(Trust-1B — der Weg, für den `tools/vorlage-erzeugen.js` gebaut ist und den dieser ADR
ausdrücklich NICHT für Vivodepots eigenen Modul-Inhalt beansprucht), U2-ADR-181
(Vertrauensstufen — Kunde ist durchgehend eine Institution, nie eine Einzelperson).
**Anker:** Auftrag vom 05.09.2026, Definition of Done: „pro modul je d/e
angedockt, provisioniert, signierfertig" — der letzte Posten ohne Bearbeiter.
**Status heute:** gilt — Beleg `tests/pro-modul-vorlage-echtdaten.test.js`,
`tests/vorlage-vivodepot-erzeugen.test.js`, `tests/generator-pro-bereiche.test.js`. Seit 16.09.2026 sind
die Pro-Bereiche benannte Feld-Ziele auch des fremden Wegs (Entscheidung, Punkt 2).

---

## Kontext

Der Auftrag kam mit vier zu prüfenden Hinweisen aus einer anderen Sitzung, keiner davon
gemessen. Alle vier wurden gemessen, nicht übernommen — zwei bestätigten sich, einer war zu
grob, und die Messung selbst legte einen fünften, größeren Fund frei, den niemand angefragt hatte.

### 1. Andocken — bereits real, zweimal, unabhängig vom Feldinhalt

`tools/modul-app-packen.js` schreibt eine echte `vorabkonfiguration.js`; `vivodepot.html` liest
sie beim Boot (`booteEingang()` → `vorDepotKonfigurationAnwenden()` → `modulEinlassenGeprueft`,
die volle Zertifikatskette, kein Sonderweg) — belegt in `vivodepot.html:25540-25649,51990-52069`.
`tools/modul-app-signieren-und-packen.js` verkettet Signieren+Packen real (`spawnSync`), nicht nur
als Demo. Laut vorheriger Sitzung (Bericht 05.09.2026) ist dieser Weg bereits zweimal produktiv
gelaufen — ein deutsches Bereichs-Modul (30.08.2026) und ein englisches Textsatz-Modul
(31.08.2026), beide gepusht. **Angedockt gilt als erledigt, für beide Sprachen, an der
Container-Ebene** — nicht Gegenstand einer neuen Entscheidung hier.

### 2. Feldsatz je D/E — bereits vollständig definiert, mit eigenem Drift-Wächter

`tools/betriebssatz-inhalte.js` führt `FELDER_DE` (54 Felder: 36 Bestand + 18 neu, U2-ADR-243)
und **bereits parallel** `FELDER_EN` (ebenfalls 54, strukturell deckungsgleich geprüft:
`tests/betriebssatz-inhalte.test.js`, „FELDER_EN ist strukturell deckungsgleich zu FELDER_DE").
Die 54/36-Zahlenfrage aus dem Auftrag ist damit aufgelöst: 54 ist die Gesamtzahl je Sprache, 36
die reine Bestands-Teilmenge — kein Widerspruch, zwei verschiedene Zählungen derselben Struktur.
Die Behauptung „textsatz übersetzt Oberfläche, bereich hat eigene Feldbeschriftungen" aus dem
Auftrag stimmt so nicht: `EINLASS_REGISTER` (`vivodepot.html:25406,25462`) trennt `typ:'textsatz'`
(Oberflächentext + Bereichs-Container-Label) von `typ:'bereich'` (nur Label+Icon je Bereich,
`BEREICH_MODUL_SCHLUESSEL`, `vivodepot.html:13395` — **strukturell kein Feld-Schlüssel**). Die
eigentlichen Feldbeschriftungen laufen über einen **dritten** Mechanismus (die signierte
Feld-Vorlage), nicht über textsatz oder bereich — s. Punkt 4.

### 3. Ein kleiner, real behobener Fund: das Anbieter-Formular bestand die eigene Prüfung nie

`tools/betriebssatz-aufbereiten.js` erzeugt Vivodepots Anbieter-Formular für den Vorlagen-Weg.
Gemessen (vor dieser Änderung): weder die deutsche noch die englische Fassung bestand
`validiereStammdaten` — unabhängig von den bewusst offenen Kontakt-Platzhaltern trug `bereich`
dort Pros eigenen internen Bereichs-Bezeichner (`pro-vertretung-vollmachten`), keinen der 13
eingebauten Vivodepot-Bereiche; die englische Fassung unterschritt zusätzlich mit 27 Zeichen die
50-Zeichen-Mindestlänge für `useCase`. Behoben: `bereich: 'vorsorge'` (passt inhaltlich, ist
bereits die Wahl im Geschwister-Test `tests/vorlage-erzeugen.test.js`), `useCase` (EN) auf 77
Zeichen verlängert. Beleg: `tests/pro-modul-vorlage-echtdaten.test.js`.

### 4. Der zentrale Fund: der Weg der Fremden sperrte die Pro-Bereiche

`tools/betriebssatz-aufbereiten.js` ordnet seit 30.08.2026 Pros Feldinhalt (`vorlage-inhalt-
de/en.json`) `tools/vorlage-erzeugen.js --vorlage` zu — nie zuvor mit echten Daten gegen den
echten Weg gemessen. Gemessen am 05.09.2026: selbst mit einem **vollständig gültigen** Anbieter
(Punkt 3 behoben, alle Kontaktfelder testweise gefüllt) scheiterte der Lauf — `validiereSubmission`
(SUBMISSION_SCHEMA) verlangte für **jedes einzelne Feld** ein `bereich` aus den 13 eingebauten
Bürger-Bereichen. Pros sechs eigene Bereichs-Bezeichner (`pro-vertretung-vollmachten` u. a.)
erfüllten das nie — 54 von 54 Feldern scheiterten, für beide Sprachen gleich.

**Zwei Dinge lagen in diesem Befund übereinander, und sie sind verschieden zu entscheiden:**

- **Vivodepots eigener Pro-Inhalt gehört nicht auf den Weg der Fremden.** `tools/vorlage-erzeugen.js`
  automatisiert Trust-1B (U2-ADR-039/040): eine FREMDE Institution signiert ihre EIGENE Vorlage mit
  Anbieter-Formular. Für Vivodepots eigenen Inhalt war der tragende Weg bereits bewiesen, nur nie als
  Werkzeug gebaut: `tests/betriebssatz-inhalte.test.js` („Kern-Probe·Ende-zu-Ende") und die Messungen
  `tools/pro-durchstich-messen.js`/`tools/pruefstoff-betriebsuebergabe-messen.js` docken Pros Feldinhalt
  über ein direkt ausgestelltes Kundenzertifikat (wie `tools/modul-erzeugen.js`) und
  `importPlanGeprueft('provider-credential', …)` an — denselben Weg, den `modulEinlassenGeprueft` beim
  echten Import prüft.
- **Eine fremde Institution, die eine Pro-Vorlage beisteuert, gehört sehr wohl auf diesen Weg** — und die
  Sperre auf die 13 Bürger-Bereiche machte das unmöglich. Anlass, das zu sehen, war am 16.09.2026 die
  Pro-Vorlage einer Bank („geplante Übergabe"), die nach der Definition of Done über Feldliste und
  Generator entstehen muss. Gemessen mit `tools/pro-vorlage-weg-messen.js`: Der Weg riss allein im
  Generator; VC-Issuer und Kern mit Pro-Bereichsersatz trugen Pro-Felder bereits.

## Entscheidung

**1 · `tools/vorlage-vivodepot-erzeugen.js` (neu) für Vivodepots eigenen Inhalt:** ein Kommando, analog zu `tools/modul-erzeugen.js`
(Herausgeber-Identität direkt als Argument, kein Anbieter-Formular, keine `validiereStammdaten`/
`validiereSubmission`-Prüfung — die sind für den fremden Weg gebaut), aber mit einer signierten
**Vorlage** (`baueSubmissionSigniert`) statt einem signierten Modul als Nutzlast. Nimmt echten
Ausgabe-Schlüssel + Ausstellerzertifikat entgegen, erzeugt/verwendet ein Kundenzertifikat für den
Herausgeber (z. B. `vivodepot`), signiert die Vorlage, schreibt dasselbe Bündelformat wie
`tools/vorlage-erzeugen.js` (`{submission, providerCredentialJws, ausstellerZertifikatJws}`).
Geprüft mit den echten 54 deutschen UND 54 englischen Pro-Feldern (Wegwerf-Testschlüssel):
Signatur verifiziert, Kundenzertifikat bezeugt den richtigen Schlüssel, Feldzahl erhalten — für
beide Sprachen. `tools/vorlage-erzeugen.js` bleibt der Weg für Trust-1B (Dritte).

**2 · Pro-Bereiche sind benannte Feld-Ziele des fremden Wegs (Produktverantwortung, 16.09.2026).** Fremde
Anbieter dürfen Pro-Bereiche als **benannte Liste** wählen. Das Tor bleibt das Ausstellen: Die Bürger-App
nimmt Felder nur über ein von Vivodepot ausgestelltes Anbieter-Zertifikat an. Geschützt bleibt, dass es
**kein freies Ziel** gibt: Die Pro-Bereiche kommen aus EINER Quelle, dem Bereichsersatz des Pro-Produkts
(`tools/templates/vivodepot-pro-geschaeftsfuehrerin-notfallmappe-bereichsersatz.json`, derselbe Pfad wie
`PRO_BEREICHS_ERSATZ_PFAD` in `tools/lib/vier-produkte.js`), erzeugt von `tools/build-bereiche.js` in den
Generator (`PRO_BEREICHE`) und in die `bereich`-enums der drei Einreich-Schema-Kopien. Ein Ziel außerhalb
der Liste wird abgewiesen, auch mit `pro-`-Präfix. Damit trägt `tools/vorlage-erzeugen.js` auch Pros echte
54 Felder; beide Wege bestehen nebeneinander.

**3 · `tools/betriebssatz-aufbereiten.js`:** `bereich`/`useCase`-Fehler des Anbieter-Formulars
behoben (Punkt 3) — bleibt weiterhin NUR für den Fall zuständig, dass jemand Pros Feldinhalt
versehentlich über den fremden Weg schicken wollte; sein eigentlicher String „vorlage-inhalt-
de/en.json" bleibt aber die richtige Eingabe für das NEUE Werkzeug.

## Was dieser ADR ausdrücklich nicht entscheidet — mit Grund

**Kein Schlüsselmaterial.** Anker, `.vdkey`, Passphrasen — nirgends berührt, nirgends erzeugt.
Alle Proben laufen mit Wegwerf-Testschlüsseln (derselbe Aufbau wie die Geschwister-Tests). Wer
das neue Werkzeug für einen echten, ausgelieferten Feld-Vorlage-Lauf benutzt, braucht Vivodepots
echten Ausgabe-Schlüssel — das bleibt ein bewusster, seltener, menschlicher Akt.

**Echte Anbieter-Kontaktdaten fehlen weiterhin, mit Absicht.** `anbieter-formular-de/en.json`
tragen für Adresse/Telefon/Name/Funktion weiterhin den Platzhalter `[BITTE ERGÄNZEN]` — dieses
Werkzeug erfindet keine echten Kontaktdaten. Für das NEUE Werkzeug (`vorlage-vivodepot-
erzeugen.js`) sind diese Felder ohnehin gegenstandslos, da es keine Anbieter-Formular-Struktur
verlangt — nur `herausgeberId`/`herausgeberName`/`herausgeberTyp`.

**Eine Pro-Käuferin braucht kein Zertifikat.** „Kunde" bezeichnet in `tools/kundenzertifikat-ausstellen.js`
und `tools/herausgeber-onboarding-dienst.js` den Empfänger eines PROVIDER-Zertifikats — wer selbst als
Anbieter/Ausgabestelle ausstellen darf —, nicht wer das Produkt kauft. Eine einzelne Pro-Käuferin bekommt
ein Depot mit einem bereits signierten Modul (der Weg aus Punkt 1, mit `herausgeberId: 'vivodepot'` —
Vivodepot selbst ist die „Kundin" in dieser Kette, wie bereits real in `tools/pro-modul-andock-demo.js`,
`anbieterTyp: 'vivodepot/ausgabestelle'`). U2-ADR-181 („Kunde" ist eine Institution) betrifft die
Ausstellerkette und hat mit „signierfertig" nichts zu tun. **Damit gilt der DoD-Posten „Pro-Modul angedockt,
provisioniert, signierfertig" als erfüllt — nicht erfüllt-mit-Vorbehalt.**

## Konsequenzen

„Angedockt" und „provisioniert" (Feldinhalt DE+EN definiert, strukturell geprüft, drift-bewacht,
über den richtigen Weg nachweislich signierfertig) gelten für Vivodepot Pro als erledigt.
„Signierfertig" im engeren Sinn — ein echter, ausgelieferter Feld-Vorlage-Lauf — braucht nur noch
echtes Schlüsselmaterial und echte Anbieter-Kontaktdaten, beide bewusst außerhalb dieses Baus.
Jede künftige Änderung an `FELDER_DE`/`FELDER_EN` bleibt weiterhin vom bestehenden Drift-Wächter
(`tests/betriebssatz-inhalte.test.js`) UND jetzt zusätzlich vom Ende-zu-Ende-Beleg in
`tests/vorlage-vivodepot-erzeugen.test.js` gedeckt — eine künftige Regression, die eines der 54
Felder aus dem signierfähigen Zustand herausbricht, wird rot, nicht erst beim echten Kunden.

## Konformität

```konformitaet
aussage:  Pros eigener interner Bereichs-Bezeichner besteht die Anbieter-Stammdaten-Prüfung nicht
          — der historische Fehler in tools/betriebssatz-aufbereiten.js bleibt namentlich
          festgehalten und bricht rot, sollte er je wiederkehren.
zustand:  geprüft
herkunft: invariante
pruefung: tests/pro-modul-vorlage-echtdaten.test.js#[Pro-Modul-Vorlage·Gegenprobe] Pros EIGENER Bereichs-Bezeichner besteht die Anbieter-Stammdaten-Prüfung NICHT — genau der historische Fehler, namentlich festgehalten
```

```konformitaet
aussage:  Das reale deutsche und englische Anbieter-Formular bestehen die Stammdaten-Prüfung bis
          auf die bewusst offenen Kontakt-Platzhalter — kein neuer, unbenannter Fehlschlag.
zustand:  geprüft
herkunft: invariante
pruefung: tests/pro-modul-vorlage-echtdaten.test.js#[Pro-Modul-Vorlage] das reale deutsche Anbieter-Formular besteht die Stammdaten-Prüfung bis auf die bewusst offenen Kontakt-Platzhalter
pruefung: tests/pro-modul-vorlage-echtdaten.test.js#[Pro-Modul-Vorlage] das reale englische Anbieter-Formular besteht die Stammdaten-Prüfung bis auf die bewusst offenen Kontakt-Platzhalter
```

```konformitaet
aussage:  tools/vorlage-erzeugen.js trägt Pros
          echten Feldinhalt — die Pro-Bereiche sind benannte Feld-Ziele des fremden Wegs, erzeugt aus
          dem Bereichsersatz des Pro-Produkts.
zustand:  geprüft
herkunft: entscheidung
pruefung: tests/pro-modul-vorlage-echtdaten.test.js#[Pro-Modul-Vorlage] tools/vorlage-erzeugen.js trägt Pros echte 54 Felder — Pro-Bereiche sind benannte Feld-Ziele (U2-ADR-289, Entscheidung 2)
```

```konformitaet
aussage:  Kein freies Feld-Ziel:
          ein Bereich außerhalb der 13 Bürger-Bereiche und der benannten Pro-Liste wird von der
          Generator-Prüfung und vom Einreich-Schema abgewiesen, auch mit pro-Präfix.
zustand:  geprüft
herkunft: invariante
pruefung: tests/generator-pro-bereiche.test.js#[Generator·Pro-Bereiche·Rot-Beweis] ein Ziel AUSSERHALB der benannten Liste wird weiter abgewiesen — auch mit pro-Präfix
pruefung: tests/generator-pro-bereiche.test.js#[Generator·Pro-Bereiche·Rot-Beweis] ein FREIES Ziel wird weiter abgewiesen
pruefung: tests/generator-pro-bereiche.test.js#[Generator·Pro-Bereiche·Rot-Beweis] auch das Einreich-Schema nimmt nur die benannte Liste an
```

```konformitaet
aussage:  tools/vorlage-vivodepot-erzeugen.js trägt die echten 54 deutschen UND die echten 54
          englischen Pro-Felder vollständig durch die echte Zertifikats- und Signaturkette —
          Feldzahl erhalten, Signatur verifiziert, Kundenzertifikat bezeugt den richtigen
          Schlüssel, ein zweiter Lauf stellt kein doppeltes Zertifikat aus, eine verfälschte
          Signatur verifiziert nicht, fehlende Pflichtparameter oder eine leere Feldliste
          schreiben nichts, die echte Kommandozeile nimmt beide Passphrasen von gepipetem stdin an.
zustand:  geprüft
herkunft: invariante
pruefung: tests/vorlage-vivodepot-erzeugen.test.js#[Vorlage-Vivodepot-Erzeugen] die echten 54 deutschen Pro-Felder ergeben ein gültiges, signiertes Vorlage-Bündel
pruefung: tests/vorlage-vivodepot-erzeugen.test.js#[Vorlage-Vivodepot-Erzeugen] die echten 54 englischen Pro-Felder ergeben ein gültiges, signiertes Vorlage-Bündel
pruefung: tests/vorlage-vivodepot-erzeugen.test.js#[Vorlage-Vivodepot-Erzeugen·Wiederverwendung] ein zweiter Lauf mit demselben Herausgeber-Schlüssel stellt KEIN neues Kundenzertifikat aus
pruefung: tests/vorlage-vivodepot-erzeugen.test.js#[Vorlage-Vivodepot-Erzeugen·Rot-Beweis] fehlende Pflichtparameter brechen mit klarer Meldung ab, ohne etwas zu schreiben
pruefung: tests/vorlage-vivodepot-erzeugen.test.js#[Vorlage-Vivodepot-Erzeugen·Rot-Beweis] eine leere Feldliste bricht ab, ohne etwas zu schreiben
pruefung: tests/vorlage-vivodepot-erzeugen.test.js#[Vorlage-Vivodepot-Erzeugen·Gegenprobe] eine verfälschte Vorlagen-Signatur verifiziert NICHT mehr gegen den genannten Public-Key
pruefung: tests/vorlage-vivodepot-erzeugen.test.js#[Vorlage-Vivodepot-Erzeugen·CLI·Rot-Beweis] die echte Kommandozeile nimmt BEIDE Passphrasen von gepipetem stdin an
```

---

*Vivodepot GmbH · Berlin · 05.09.2026*
