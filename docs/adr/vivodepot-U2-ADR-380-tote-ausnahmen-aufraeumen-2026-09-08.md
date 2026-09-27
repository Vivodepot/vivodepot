# U2-ADR-380 · Tote Ausnahmen sind ein Befund, kein Ordnungsfimmel

**Status heute:** gilt
**Datum:** 08.09.2026
**Betrifft:** `tools/textsatz-traeger-erheben.js` (`WURZELN_AUSGENOMMEN` — `PRE_DEPOT_EN`
entfernt), `tools/aussagen-abgleich-pruefen.js` (`AUSGENOMMEN` — `docs/ARBEITSLISTE-v1.md` und
das Muster der alten Spezifikations-HTML-Dateien entfernt, mit Begründung im Kommentar), `tools/w12-gueltigkeit-
pruefen.js` (`ERGAENZUNG` — `elefand_nr` entfernt, empirisch bestätigt tot, s. §2.1), `tests/u2-
adr-380-tote-ausnahmen.test.js` (neu)
**Bezug:** U2-ADR-367 (Zug 3, Besitz-Zug — Fundort der ersten toten Ausnahme)

---

## 0 · Der Auftrag

Der Auftrag, nach dem eigenen Bericht zu U2-ADR-367, in dem ich `PRE_DEPOT_EN` als tote, wirkungslose
Zeile in `WURZELN_AUSGENOMMEN` benannt, aber nicht behoben hatte (außerhalb des damaligen
Auftragsradius):

> Eine tote Ausnahme sieht aus, als schütze sie etwas, und wer sie liest, hält den
> ausgeschlossenen Gegenstand für existent. Beim nächsten Mal schliesst jemand etwas Echtes
> davon ab, weil „da steht ja schon eine Ausnahme". Räum diese eine weg — und geh im selben Zug
> die übrigen Ausschlusslisten der Werkzeuge und Wächter durch. Für jeden Fund: entweder
> entfernen, oder mit Grund und Datum stehenlassen, wenn er absichtlich auf Vorrat ist. Und bau,
> wenn es billig geht, die Probe dazu — geht es nicht billig, sag das und lass es.

## 1 · Die Sweep

Gesucht über `tools/` und `tests/` nach Konstanten in der Form einer Ausschluss-/Ausnahme-/
Ergänzungsliste (`AUSGENOMMEN`, `AUSGESCHLOSSEN`, `AUSNAHME(N)`, `AUSSCHLUSS`, `ERGAENZUNG`,
`EXCLUDE`, `DYNAMISCH_ERREICHBAR` u. ä.). Gefunden: 13 Kandidaten. Für jeden geprüft, ob sein
Gegenstand (eine Wurzel, ein Feldname, ein Dateipfad, ein Wortmuster) heute noch etwas trifft.

## 2 · Ergebnis je Fund

**Entfernt (3 Funde):**

- `tools/textsatz-traeger-erheben.js`, `WURZELN_AUSGENOMMEN`: `'PRE_DEPOT_EN'` — die Konstante
  existiert seit U2-ADR-363 (Zug 2, 07.09.2026) nicht mehr im Kern-Export. Entfernt.
- `tools/aussagen-abgleich-pruefen.js`, `AUSGENOMMEN`: zwei Einträge.
  `/^docs\/ARBEITSLISTE-v1\.md$/` — die Datei verliess das Tracking am 15.08.2026 (Commit
  `cf8cc9db`, „das interne Register ist aus dem Tracking"); `traegerFinden()` kann sie seither
  nie mehr finden. Das Muster der alten Spezifikations-HTML-Dateien — die Spezifikation liegt heute als
  `.md` unter `docs/spec/`, nicht als `.html` an der Repo-Wurzel; `traegerFinden()` liest ohnehin
  nur `docs/*.md` (eine Ebene, nicht rekursiv) — das Muster hätte sie so oder so nie erreicht.
  Beide entfernt, mit Datum und Fundweg im Kommentar stehen gelassen.
- `tools/w12-gueltigkeit-pruefen.js`, `ERGAENZUNG`: `'elefand_nr'` — s. §2.1, EMPIRISCH entschieden,
  nicht per Design-Debatte.

### 2.1 · Der w12-Fund — gemessen, nicht diskutiert

Erste Fassung dieses ADR führte `'elefand_nr'` unter „gefunden, nicht behoben": U2-ADR-161 (Schnitt
Glied 3) machte `elefand` zu einer Liste, die Registrierungsnummer steht seither als Unterfeld
`nr` von `mobilitaet.elefand`, nicht mehr als flaches Feld `elefand_nr` — und `ERGAENZUNG` ist ein
unskopiertes `Set<string>`, das nur global gegen `f.id`/`u.id` vergleicht
(`tools/w12-gueltigkeit-pruefen.js:91/98`). Ein bloßes `'nr'` einzutragen hätte JEDES Unterfeld
namens `nr` in JEDER Liste erfasst, keine Reparatur, nur eine Verbreiterung des Prüfradius. Die
Design-Frage schien echt: braucht `ERGAENZUNG` eine sektor-/listen-scopierte Form?

Statt die Design-Frage zu verhandeln, war der billigere Weg verlangt — messen statt
besprechen: *„Entferne 'elefand_nr' aus ERGAENZUNG und fahr die Suite. Bleibt sie grün: der
Eintrag war rein tot. Wird sie rot: dann brauchen wir die skopierte Ausnahmeform wirklich, mit
einem echten roten Beweis in der Hand."*

Ergebnis: `'elefand_nr'` entfernt, volle Suite gefahren — **7842/7842 grün, exakt dieselbe Zahl wie
vor der Entfernung.** `node tools/w12-gueltigkeit-pruefen.js` meldet weiterhin „5 Funde" (unverändert
gegenüber vorher), die acht eigenen W-12-Tests bleiben grün. Der Eintrag war rein tot — er hatte
seit U2-ADR-161 keine einzige der acht Kandidaten-Formen (`f.id`/`u.id` gleich `'elefand_nr'`)
mehr getroffen, weil dieses Feld unter diesem Namen nicht mehr existiert. Keine skopierte
Ausnahmeform nötig, kein Folgezug. Ein gemessenes Nichts ist eine Aussage: die Design-Frage war
eine Scheinfrage, solange niemand nachgesehen hatte, ob sie überhaupt Gewicht trägt.

**Bereits selbst bewacht, kein Fund (3 Kandidaten):**

- `tools/repo-adresse-pruefen.js`, `AUSNAHMEN` — trägt bereits die exakte Eigenschaft, die dieser
  Zug verlangt: jede Posten-Ausnahme muss im echten Bestand ihre Zeile finden
  (`tests/repo-adresse-pruefen.test.js`). Grün, nichts zu tun.
- `tools/w4-freitext-katalog-pruefen.js`, `AUSNAHMEN` — dieselbe Eigenschaft, eigene Funktion
  `ausnahmenNichtAufloesbar(V)`, eigener Test „die sechs Ausnahmen lösen alle im Schema auf".
  Grün, nichts zu tun.
- `tools/abgeloeste-farben-pruefen.js`, `AUSNAHMEN` / `tools/adr-namen-waechter.js`,
  `UNVERARBEITET_AUSNAHME` — beide bereits leer (`[]` bzw. `new Set([])`): ihre letzte reale
  Ausnahme trug ihre eigene Ablaufbedingung im Kommentar und ist mit deren Eintritt korrekt
  entfernt worden. Ein Vorbild für diesen ganzen Zug, kein Fund.

**Geprüft, lebendig (4 Kandidaten):** `tools/adr-readme-erzeugen.js` (`AUSGENOMMEN = {'README.md'}`
— trivial, die Datei existiert), `tools/standards-funktionsnamen-pruefen.js` (`EXCLUDE`, 14
Wörter, alle 14 kommen im `STANDARDS.md`-Bezeichner-Muster tatsächlich vor),
`tools/textsatz-de-nur-lateinisch-pruefen.js` (`AUSGENOMMENE_METADATEN_SCHLUESSEL`, 4 Schlüssel —
alle 4 sind reale Top-Level-Schlüssel des erzeugten DE-Moduls, gegengerechnet gegen
`textsatz-de-modul-erzeugen.js`s echte Ausgabe), `tools/schema-wirkung-pruefen.js` (`AUSNAHMEN`,
14 Feldnamen — die eigene Lauf-Ausgabe rechnet „85 Schlüssel, 14 begründete Ausnahmen, 71
geprüft" exakt auf, kein Rest).

**Gefunden, NICHT behoben (1 Fund, außerhalb des billig Prüfbaren):**

- `tools/textsatz-en-begriffe-pruefen.js`, `GESCHWISTER_AUSNAHMEN`: vier der elf Geschwisterwort-
  Regexe (`vielfach`, `fachlich`, `fachkundig`, `fachmännisch`) treffen im heutigen Bürgersatz
  nichts. ANDERE KLASSE als die entfernten Funde: diese Liste schützt nicht eine feste, kleine
  Menge (wie eine Export-Wurzel), sondern bewaffnet die Glossartreue-Probe GEGEN KÜNFTIGEN Text —
  ein Wort, das heute nirgends steht, kann morgen in einer neuen Feldbeschreibung auftauchen, und
  genau dafür ist die Ausnahme da. „Trifft heute nicht" ist hier kein Befund, weil die Liste nie
  behauptet hat, heute vollständig gedeckt zu sein — sie ist bewusst auf Vorrat kuratiert
  (Kopf-Kommentar datiert sie bereits: 01.09.2026, Auftrag). Nicht entfernt.

(`tools/w12-gueltigkeit-pruefen.js`s `'elefand_nr'` stand hier zunächst ebenfalls — s. §2.1: die
Design-Frage erledigte sich durch Messen, kein zweiter offener Fund.)

## 3 · Warum keine generelle „tote Ausnahme"-Probe gebaut wurde

Die 13 Kandidaten teilen keine gemeinsame Form. `WURZELN_AUSGENOMMEN` prüft gegen `V`s eigene
Export-Schlüssel (eine feste, aufzählbare Menge — billig). `repo-adresse-pruefen.js` und
`w4-freitext-katalog-pruefen.js` prüfen bereits gegen ihre je eigene Auflösungslogik (Datei+Zeile
bzw. Sektor/Situation/Liste). `GESCHWISTER_AUSNAHMEN` prüft gegen ein bewegliches Ziel (künftigen
Bürgertext), für das es keine gemeinsame, billige Formel gibt, ohne die jeweilige Werkzeug-Logik
zu duplizieren. Eine ÜBERGEORDNETE Probe,
die „jede Ausschlussliste im Repo" generisch abläuft, müsste diese Duplikation eingehen oder
würde selbst zu einer Landkarte, die nur die heute bekannten Listen kennt — genau die Klasse
Wächter, die U2-ADR-322 bereits ausdrücklich ablehnt („ein Wächter, der dieselbe Landkarte abläuft
wie das Werkzeug, bewacht nichts"). Gebaut wurde darum genau EINE neue, punktuelle Probe
(`tests/u2-adr-380-tote-ausnahmen.test.js`, für `WURZELN_AUSGENOMMEN`) — dort, wo die billige
Formel existiert; für den Rest gilt die Prüfung dieses Zugs als Stichtags-Aufräumung, nicht als
stehender Wächter.

## 4 · Rot-Beweis

`tests/u2-adr-380-tote-ausnahmen.test.js` pflanzt einen erfundenen Namen in eine Kopie von
`WURZELN_AUSGENOMMEN` und erwartet, dass die Probe genau ihn als tot meldet.
