# U2-ADR-195: Ein einmal gelernter Begriff bedeutet überall dasselbe

**Status:** Angenommen
**Datum:** 01.09.2026
**Kategorie:** TEXT, DATENINTEGRITÄT
**Linie:** U2
**U2-Bezug:** Schwester-ADR zu U2-ADR-196 (Oberflächen-Verweise) — dieselbe Erhebung, andere
Fehlerklasse. 196 behandelt Texte, die eine ANDERE Stelle beim Namen nennen; diese ADR behandelt
denselben deutschen Begriff, der an VERSCHIEDENEN Stellen verschieden übersetzt wurde. Beide
entstanden aus derselben Zufallsstichprobe und derselben Erhebung zum englischen Bürgersatz.
**Anker:** Fund — `meine-menschen.gebwiz_kind_name.label` auf Englisch
sinnentstellt und uneinheitlich übersetzt. Freigegeben, mit
ausdrücklicher Entscheidung: kein „folgenschwere Zeilen zuerst", eine vollständig richtige
englische Fassung, mit dauerhaftem Wächter. Zwei Entscheidungen dieser ADR wurden während des
Baus selbst korrigiert (s. „Zwei Kurskorrekturen während des Baus") — beide
sind hier bereits im ENDSTAND eingearbeitet.
**Status heute:** gilt vollständig — Beleg `tests/textsatz-en-begriffe-pruefen.test.js`,
`tests/pre-depot-en-sync.test.js`. Fünf Glossar-Begriffe festgelegt und durchgesetzt (0
Abweichungen im Bestand); zwei davon (Bereich, Betreuer) waren im ersten Entwurf dieser ADR noch
als „nicht behandelt" markiert.

---

## Kontext

Eine gezielte Erhebung (Bericht „Englischer Bürgersatz — Richtigkeit statt Abdeckung",
01.09.2026) prüfte 14 tragende Fachwörter des Bürgersatzes gegen ihre englische Übersetzung.
Bestehende Werkzeuge prüfen ABDECKUNG (jede deutsche Kennung hat eine englische Entsprechung) —
eine falsche oder uneinheitliche Übersetzung ist zu 100% abgedeckt. Richtigkeit ist eine andere
Eigenschaft und hatte keinen Wächter.

Gefunden, u. a.: „Assistent" (im Sinn eines geführten Eingabe-Ablaufs) wurde teils als
„assistant"/„attendant" übersetzt — im Englischen ein MENSCH, nicht ein Ablauf. „Steuerklasse"
wurde zu „tax bracket" (die progressive Steuerstufe) statt „tax class" (das deutsche
Lohnsteuerklassen-System). „Vorsorgevollmacht" trug am Ende der Erhebung SECHS verschiedene
englische Fassungen, über zwei getrennt entstandene Dateien (Bürgersatz, Betriebssatz) hinweg.
„Patientenverfügung" wechselte zwischen „living will" und „advance directive" — auch bei
WORTIDENTISCHEN deutschen Sätzen. „Bereich" stand bei 58% Konsistenz — dem schlechtesten Wert der
ganzen Erhebung, trotz zentralster Struktur-Begriff (die App-Navigation selbst). „Betreuer" trug
sowohl „carer" (klingt nach Pflegekraft) als auch „custodian" (klingt nach Kindschaftsrecht) —
beides am Fachsinn der rechtlichen Betreuung (§1814 ff. BGB) vorbei.

## Entscheidung

**Fünf Begriffe tragen jetzt EINE festgelegte englische Fassung — deutsch unangetastet, nur die
englische Übersetzung korrigiert:**

| Deutsch | Festgelegte englische Fassung | Betroffene Stellen |
|---|---|---|
| Assistent (gebwiz-Kontext) | „Guided birth entry" | 5 |
| Steuerklasse | „tax class" | 1 |
| Vorsorgevollmacht | „power of attorney (advance care)" | 6, über 2 Dateien |
| Patientenverfügung | „advance directive" | 7 |
| Zentrales Vorsorgeregister | „Central Register of Precautionary Provisions" | 1 |
| Depot (Produkt) | „depot" (oder die Marke „Vivodepot" selbst) | 145 (122 Modul + 4 Kern + 19 Bereich-Nachbarfunde) |
| Betreuer | „court-appointed representative" | 9 |
| Bereich (App-Rubrik, alle 13 obersten Lebensbereiche) | „area" | 19 Ausreißer auf 59 Fundstellen |
| Fach/Blatt (drei Einzelfälle, keine durchgängige Regel) | s. unten | 3 |
| „Eingelassene Erweiterungen" | „Admitted extensions" | 1 |
| Betreuungsverfügung | „nomination of a legal representative" | folgt aus der Betreuer-Festlegung |

**„Assistent" trägt bewusst KEINE wörtliche Übersetzung.** Ein erster Anlauf setzte „wizard" —
zurückgewiesen, weil die Sprachlinie des Kerns ausdrücklich „kein Technik-Jargon" verlangt
(`vivodepot.html:4579`) und die Zusammensetzung „Birth wizard" im Englischen schräg bis komisch
klingt, ausgerechnet im Zusammenhang mit der Geburt eines Kindes. „Guided birth entry" trägt
denselben Sinn ohne Jargon und ohne die Personen-Lesart, die den ursprünglichen Fund auslöste.

**„Bereich → area" folgt einer STRUKTUR-Regel, nicht dem Klang:** die 13 obersten Lebensbereiche
der App-Navigation sind „area"; ein angedockter `gruppe`-Abschnitt INNERHALB eines Bereichs wäre
„section" — keine Geschmacksfrage. Gemessen, nicht angenommen: unter allen 59 gefundenen
„Bereich"-Fundstellen war keine einzige tatsächlich eine gruppe-Untergliederung — jede meinte
einen der 13 obersten Bereiche selbst. Die area/section-Unterscheidung bleibt darum vorerst
theoretisch (sie gilt, sobald ein Fund sie braucht) — heute reicht ein einziger Glossar-Eintrag.

**„Betreuer → court-appointed representative", selbst bestätigt:** gemeint ist
der gerichtlich bestellte Betreuer, ein technischer Terminus — trifft den Fachsinn genauer als
beide vorher benutzten Wörter. „Betreuungsvollmacht" (ein im Produkt ausdrücklich abgelehnter,
nicht mehr angebotener Begriff — „kein Rechtsbegriff") ist ein ANDERER Gegenstand und bewusst
nicht Teil dieser Festlegung.

**Drei Einzelfälle ohne durchgängige Glossar-Regel, direkt korrigiert:** „Fach 'Auto'" (ein
Ablagefach, fälschlich „folder") → „compartment". „Fachgebiet" (Facharzt-Hinweistext,
uneinheitlich zum Feld-Label daneben) → „specialty". „Grundbuch … Blatt 1234" (uneinheitlich
„folio"/„sheet") → durchgängig „sheet". Bewusst NICHT verallgemeinert: „Handschuhfach" →
„Glovebox" ist ein eigenständiger, korrekter englischer Name für ein reales Objekt (wie
„Kühlschrank" → „fridge") und wurde NICHT auf „compartment" gezwungen.

**Der Wächter** (`tools/textsatz-en-begriffe-pruefen.js`) trägt jetzt FÜNF Proben (Uneinheitlichkeit,
Geschwister-Kandidaten, deutsche Reste, Glossartreue, PRE_DEPOT_EN-Sync). `glossartreuePruefen`
hält für jeden GLOSSAR-Eintrag jede Fundstelle des deutschen Begriffs gegen die festgelegte
englische Fassung (oder eine ihrer akzeptierten Formen — s. „Ausdrücklich nicht behandelt" zur
Pluralbildung). `preDepotSyncPruefen` (Klasse 5, neu) hält zusätzlich die 25
`PRE_DEPOT_EN`-Schlüssel im Kern (`vivodepot.html`) gegen ihre `strings:<key>.text`-Gegenstücke
im EN-Modul — beim ersten Lauf fand er einen bereits eingetretenen Rückfall (s. unten).

**Die Zusicherung, die das trägt — für die Bürgerin, nicht technisch formuliert:** ein Begriff,
den sie an einer Stelle im Produkt kennengelernt hat, bedeutet überall dasselbe.

## Zwei Kurskorrekturen während des Baus

**1 · „Depot → vault" wurde umgekehrt zu „Depot → depot".** Der erste Entwurf dieser ADR setzte
„vault" durch (94% bereits vorherrschende Fassung). Das wurde umgekehrt, mit einem
Grundsatz statt einem Einzelwort: *„depot, wenn es in der jeweiligen Sprache funktioniert"* — der
Kernbegriff des Produkts bleibt der eigene, wo die Zielsprache ihn trägt. Englisch trägt ihn
(„depot" ist ein echtes englisches Wort für einen Verwahrort), und er ist der Produktname —
sagt der Text „vault", während das Produkt „Vivodepot" heißt, benennt sich das Produkt selbst
nicht mehr in seinen eigenen Texten. **122 Modul-Stellen wurden dafür geprüft, nicht blind
ersetzt** (Positivkontrolle: 0 echte Tresor-/Schließfach-Bedeutungen unter allen Fundstellen),
dazu vier Kern-Stellen in `PRE_DEPOT_EN` (`vivodepot.html`) und 19 weitere Bereich-Nachbarfunde,
die erst bei der Bereich-Korrektur auffielen.

**2 · Bucket B (Bereich, Betreuer, Betreuungsverfügung, „Eingelassene Erweiterungen") wurde
entschieden, nicht offengelassen.** Der erste Entwurf verwies diese vier auf eine spätere
Produktentscheidung. Entschieden: Bereich → „area" (mit Struktur-Begründung,
oben), Betreuer → „court-appointed representative", Betreuungsverfügung → „nomination of
a legal representative", „Eingelassene Erweiterungen" → „Admitted extensions" (der geprüfte
Zulassungsweg muss im Begriff stecken, sonst geht der Produktgedanke verloren — eine Produkt-,
keine Übersetzungsentscheidung).

## Ein echter Rückfall, gefangen von der neuen fünften Probe

`PRE_DEPOT_EN.wipeSperrschirmHinweis` (Kern, `vivodepot.html`) trug beim Bau dieser ADR noch die
VOR U2-ADR-196 falsche Fassung (Depot/Vivodepot vertauscht) — unbemerkt seit deren Fix im
EN-Modul, weil kein Wächter die beiden je gegeneinander hielt. `PRE_DEPOT_EN.dateiLabel` trug
zusätzlich noch „Vault file" — eine dritte vault-Kernstelle, die eine erste, zu enge Suche nach
„digital vault" (statt „vault") übersehen hatte. Beide jetzt korrigiert, `preDepotSyncPruefen`
bewacht seither alle 25 Schlüssel. Die Lehre, wörtlich: *eine Suche, die enger ist als die Frage,
liefert eine Null, die keine ist.*

## Ausdrücklich nicht behandelt

- **Die Pluralbildung ist bewusst als Toleranz im Wächter verankert, nicht als Sonderfall
  weginterpretiert:** „power of attorney" wird im Plural „powers of attorney"/„power(s) of
  attorney" — beides korrektes Englisch. Ein GLOSSAR-Eintrag trägt darum ein Array akzeptierter
  Fassungen, nicht eine einzelne Zeichenkette.
- **Die Marke „Vivodepot" ist von der Depot-Regel ausdrücklich mitgetragen, nicht ausgenommen:**
  „vivodepot" gilt als GENAUSO korrekte Fassung wie „depot", wenn ein Satz ohnehin den
  Produktnamen nennt.
- **Betriebssatz vollständig geprüft, nur für „Vollmacht":** die sechste Vorsorgevollmacht-
  Fassung dort korrigiert; die übrigen ~35 Kennungen des Betriebssatzes sind nicht Teil dieser
  Erhebung (0 „vault"-Stellen dort, keine Depot-Korrektur nötig).
- **Alle Begriffe außerhalb des Glossars** (Träger, Anker, Mappe, Umschlag, Blatt außerhalb der
  drei Grundbuch-Stellen, Karte, Sitzung, Schlüssel, Fach außerhalb der drei behandelten Stellen)
  waren entweder bereits durchgängig korrekt oder tragen legitime, kontextabhängige
  Mehrdeutigkeit (Träger: verschiedene Institutionen; Schlüssel: physisch UND kryptografisch;
  Handschuhfach: ein reales Objekt mit eigenem Namen) — kein Glossar-Eintrag nötig.
- **Die area/section-Unterscheidung innerhalb eines Bereichs ist GEMESSEN ungebraucht, nicht
  ungesucht** — unter allen 59 Fundstellen war keine eine `gruppe`-Untergliederung, „area" allein
  trägt den heutigen Bestand vollständig. Das ändert sich absehbar: das Krisenvorsorge-Template
  (in Arbeit) dockt seine Abschnitte als `gruppe` an — die ersten echten section-Fälle. Der
  zweite kanonische Wert kommt dann dazu, nicht heute vorweggenommen.
- **Die ~250 verbleibenden, bislang nicht per Begriffs-Sonde geprüften Kennungen** (die
  Lesekampagne) sind ausdrücklich NICHT Teil dieser ADR — sie beginnt erst, wenn dieses Glossar
  als Grundlage steht.

## Konsequenzen

**Für die Bürgerin:** die schwersten der gefundenen Fälle sind behoben — kein Geburts-Assistent,
der wie eine Hebamme klingt, keine falsche Steuerklassen-Angabe, eine einzige Fassung für
Vorsorgevollmacht/Patientenverfügung/Betreuer/Bereich, ein Produktname, der sich selbst durchgängig
nennt.

**Für den nächsten Bau:** das Glossar wächst mit jedem weiteren geprüften Begriff.
`glossartreuePruefen` ist die Vorlage dafür — ein neuer Eintrag braucht `wort`, `kanonisch` (als
Array, wegen der Pluralbildung) und optional `ausnahmeKennungen` für legitime Gegenbeispiele.
`preDepotSyncPruefen` ist die Vorlage für „dieselbe Tatsache steht zweimal, ein Wächter bindet
sie aneinander" — ein Muster, das über PRE_DEPOT_EN hinaus wiederverwendbar ist.

## Konformität

```konformitaet
aussage:  Ein Begriff, den die Bürgerin an einer Stelle im Produkt kennengelernt hat, bedeutet
          überall dasselbe — für alle fünf festgelegten Glossar-Begriffe (Vollmacht,
          Patientenverfügung, Depot, Betreuer, Bereich) gibt es 0 abweichende englische
          Fassungen im Bestand.
zustand:  geprüft
herkunft: entscheidung
pruefung: tests/textsatz-en-begriffe-pruefen.test.js#[Anlassfall·behoben] alle fünf Glossar-Begriffe (Vollmacht/Patientenverfügung/Depot/Betreuer/Bereich): 0 Verstöße gegen den echten Bestand
```

```konformitaet
aussage:  „Assistent" im gebwiz-Kontext trägt keine Technik-Jargon-Übersetzung ("wizard") und
          keine Personen-Lesart ("assistant"/"attendant") mehr — durchgängig „Guided birth
          entry", geprüft an allen vier betroffenen Kennungen plus der unveränderten
          Positivkontrolle im anderen Kontext.
zustand:  geprüft
herkunft: entscheidung
pruefung: tests/textsatz-en-begriffe-pruefen.test.js#[Anlassfall·behoben] Assistent-Gruppe: "Guided birth entry" durchgängig, "wizard" bleibt in der Positivkontrolle daneben stehen
```

```konformitaet
aussage:  Der Produktname trägt seine englische Identität durchgängig als „depot"/„Vivodepot",
          nie als „vault" — 0 verbliebene vault-Stellen im gesamten EN-Modul.
zustand:  geprüft
herkunft: entscheidung
pruefung: tests/textsatz-en-begriffe-pruefen.test.js#[Anlassfall·behoben] Depot: "vault" wurde zu "depot" umgekehrt — 0 verbliebene "vault"-Stellen im EN-Modul
```

```konformitaet
aussage:  Zwei feste Fassungen derselben Tatsache (Kern-PRE_DEPOT_EN und EN-Modul) stimmen
          überein — geprüft für alle 25 PRE_DEPOT_EN-Schlüssel, nicht nur die zuerst
          aufgefallenen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/pre-depot-en-sync.test.js#[Anlassfall] der echte Bestand: 0 Abweichungen zwischen dem Vor-Depot-Sprachangebot und dem EN-Modul
```

---

## Nachtrag 05.09.2026 — die Lesekampagne, NUR_UNSCHOEN-Teil gebaut

Diese ADR nannte die „~250 verbleibenden Kennungen" der Lesekampagne ausdrücklich als eigenen
Folgeschritt, nicht als Teil dieser ADR selbst (s. „Ausdrücklich nicht behandelt"). Der volle
Lesedurchgang lief bereits am 01.09.2026 (Commits `b38a7c26`/`9f58fe6d`) — dieser Nachtrag baut
NICHT die Lesekampagne selbst, sondern arbeitet einen ihrer beiden Befunde ab.

**Der Lesedurchgang fand drei Klassen, nicht zwei:** 30 eindeutig falsche Stellen (behoben, in den
beiden genannten Commits), 61 PRODUKTBEGRIFF-Fälle (Fachvokabular ohne einheitliche Fassung —
„Betreuung" allein in sechs Varianten, „Baustein"/„Modul"-Kollision, „recreation" beim
KI-Verfügungs-Feature — **ausdrücklich als offene Produktentscheidung vorbehalten, nicht Teil dieses Nachtrags**),
und 29 NUR_UNSCHOEN-Fälle — stilistische Holprigkeiten ohne Sinnfehler (unidiomatische
Wortstellung, US/UK-Mischformen in Beispieltexten, uneinheitliche Groß-/Kleinschreibung bei
Geschwister-Optionen, ein Anführungszeichen-Ausreißer). **Dieser Nachtrag baut die 29
NUR_UNSCHOEN-Fälle — vollständig, Kennung für Kennung gegen den Bericht
`lesedurchgang-volltext-2026-09-01.md` (Anhang B) geprüft.**

**Eine Abweichung von der Quelle, offen benannt statt still übernommen:** Anhang B trägt die
Überschrift „29 Punkte", die Tabelle selbst zählt 30 Zeilen. Ausgezählt, nicht der Überschrift
geglaubt. Von den 30 war eine (`strings:iosInstallHinweis.text`) bereits anderweitig korrigiert,
seit der Bericht geschrieben wurde — der beanstandete Wortlaut („is kept reliably") kommt im
heutigen Text nicht mehr vor. Nicht angefasst, kein Grund mehr dafür. Verbleiben 29 — dieselbe
Zahl wie die Überschrift, aus einem anderen Grund als sie wohl meinte.

**Jede Korrektur einzeln gegen das deutsche Original geprüft** (`TEXTSATZ_EINGEBAUT`, nicht nur
gegen die englische Fassung im Bericht), nicht blind aus Anhang B übernommen — u. a., weil manche
Kurzbefunde eine Ersetzung nur andeuten, ohne den vollständigen Zielwortlaut zu nennen. Wo eine
Geschwister-Kohärenz zu prüfen war (Groß-/Kleinschreibung, Terminologie), wurden die tatsächlichen
Nachbar-Kennungen gelesen, nicht angenommen — u. a. `vorsorge.vorsorge_instrumente/vertretungsModus.hint`
benannte die beiden Modi anders als die zugehörigen Options-Label selbst; die Korrektur übernimmt
jetzt deren Wortlaut, statt eine dritte, neue Formulierung einzuführen.

**Betroffene Dateien:** `tools/textsatz-en-daten.js` (8), `tools/textsatz-en-optionswerte-daten.js`
(4), `tools/textsatz-en-vollabdeckung-daten.js` (17) — reine Wertkorrekturen, keine Kennung
hinzugefügt oder entfernt. Geprüft: `tests/textsatz-en-begriffe-pruefen.test.js`,
`tests/pre-depot-en-sync.test.js`, `tests/textsatz-en-platzhalter-pruefen.test.js`,
`tests/textsatz-en-modul-erzeugen.test.js` — vollständige Kennungs-Abdeckung und
Platzhalter-Treue unverändert intakt, 0 Verstöße.

**Bewusst nicht Teil dieses Nachtrags:** die 61 PRODUKTBEGRIFF-Fälle — sie bleiben, wie im
Ursprungsbericht eingeordnet, eine noch zu treffende Produktentscheidung, keine eigenständige
Entscheidung dieses Nachtrags.

```konformitaet
aussage:  Die 29 NUR_UNSCHOEN-Funde des vollen Lesedurchgangs (Anhang B,
          `lesedurchgang-volltext-2026-09-01.md`) sind behoben — stilistisch, ohne
          Bedeutungsänderung, jede Kennung einzeln gegen das deutsche Original geprüft.
zustand:  geprüft
herkunft: entscheidung
pruefung: tests/pre-depot-en-sync.test.js#[Anlassfall] der echte Bestand: 0 Abweichungen zwischen dem Vor-Depot-Sprachangebot und dem EN-Modul
```

---

*Vivodepot GmbH · Berlin · 05.09.2026*
