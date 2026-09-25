# U2-ADR-119: Die Flachfeld-Altlasten im Referenzdepot sind geräumt

**Status:** Angenommen
**Datum:** 30.07.2026
**Kategorie:** TESTINFRASTRUKTUR, DATENMODELL, WAHRHAFTIGKEIT
**Linie:** U2
**U2-Bezug:** U2-ADR-096 (schaffte die Vorsorge-Flachfelder zugunsten der Instrument-Liste ab) ·
U2-ADR-109 (Sektion `schutzbefohlene-sek` → Zeilen von `meine-menschen.kinder`) ·
U2-ADR-118 (C7: nahm `testament_datum`, den letzten mit einem Round-Trip) · T2 (drehte den
Geltungsbereich der Fixture-Prüfung um)
**Status heute:** gilt — `tests/fixture-felder-im-modell.test.js` läuft grün (10/10), `ALTLASTEN`
ist weiterhin leer (`Object.freeze({})`), die fünf `_person()`-Objekt-Refs stehen im Referenzdepot
heute als `unterFelder` innerhalb der `vorsorge_instrumente`-Einträge, nicht mehr als Top-Level-
Flachfeld.
**Anker:** Fixlisten-Posten C8 · Werkzeug `tools/altlast-felder-belegen.js`

---

## Kontext

`tests/fixtures/referenzdepot.js` setzte bis heute **18** Flachfelder, die das Datenmodell nicht
mehr kennt (`feldDefFuer` liefert `undefined`) — 17 in `vorsorge`, dazu
`meine-menschen.schutzbefohlene`. Es sind Reste aus der Zeit vor dem Vorsorge-Umbau
(U2-ADR-096/109): ihre echten Werte leben heute als `unterFelder` von `vorsorge_instrumente`
bzw. als Zeilen von `meine-menschen.kinder`. C7 (U2-ADR-118) nahm den 19., `testament_datum`,
weil er den einzigen ICS-Round-Trip trug; der Rest wartete, bis der ICS nicht mehr flach las.

Ein totes Fixture-Feld ist kein Schönheitsfehler: es hält einen Round-Trip grün, den die App
gar nicht mehr erzeugt — ein grüner Beleg für einen toten Pfad. Der Wächter
`tests/fixture-felder-im-modell.test.js` (T2) hält diese Klasse seit dem 28.07. fest.

## Entscheidung

Die 18 Felder sind aus `referenzdepot.js` **und** aus der `ALTLASTEN`-Grundlinie des Wächters
entfernt. Die Grundlinie ist damit **leer** — das Ziel, auf das T2 sie angelegt hat. Der Wächter
bleibt aktiv und rot-machbar (s. u.); die nächste Drift dieser Klasse fällt weiter auf.

## Die Guardrail — je Feld belegt, nicht vermutet

Vor dem Streichen liegt für **jedes** der 18 Felder vor (`tools/altlast-felder-belegen.js`):

1. **`feldDefFuer(sektor, feld) === undefined`** — das Feld ist wirklich aus dem Modell. Gemessen
   über die Fixture-Struktur (Regel 16), nicht aus einer getippten Liste.
2. **Kein Bezug zum IPS-/Patient-Summary-Export oder einem der vier Deliverable-4-Pfade.**
   Architektonisch belegt: `fhirIpsBundle` liest **ausschließlich** `data.sektoren.gesundheit`,
   `data.sektoren.identitaet` und `opt.anker` (Delegation) — seine fünf Sektionen sind Allergien,
   Medikation, Diagnosen, Operationen, Medizinprodukte; **keine** Advance-Directives-Sektion,
   **keine** vorsorge-/meine-menschen-Lesung. Der Notfall-Kern (`NOTFALL_KERN_FELDER`) liest
   vorsorge nur über den **Instrument-Selektor** (`liste:vorsorge_instrumente:…`), nicht flach.
   SHL und der FHIR-Reimport-Reexport halten ein **verbatim** Bundle und lesen keine Sektorfelder.
   Keiner der vier geschützten Pfade berührt ein Flachfeld dieser Sektoren.
3. **Kein Flachlese-Pfad im Kern.** Für keines der 17 vorsorge-Felder existiert ein
   `vorsorge.<feld>`-Zugriff, kein `sektoren.vorsorge[...]`, kein Modell-Accessor. Die Feldnamen
   **kommen** in `vivodepot.html` vor — aber als **anderer Gegenstand**: als `unterFelder`-IDs von
   `vorsorge_instrumente` (dieselbe Schreibweise, andere Adresse), als Wizard-Werte, als Labels,
   und als **B16-Import-Aliase** (`B16_INSTRUMENT_IMPORT`), die **FREMDE** Dateien in Instrumente
   übersetzen und darum bleiben (U2-ADR-096; „ein fremdes `testament_vorhanden = ja` fiele sonst
   lautlos auf den Boden"). Keiner davon liest das Flachfeld des heutigen Depots.

### Die eine Ausnahme, die geprüft wurde: `schutzbefohlene`

`schutzbefohlene` hat als Einziges einen echten Flachlese-Pfad: der Migrationsschritt 41 → 42
(`_mm42.schutzbefohlene`) zieht den Alt-Freitext in eine `kinder`-Zeile. Dieser Schritt ist mit
`schemaVersion < 42` bewacht; das Referenzdepot lädt als aktuelle Version (44), der Schritt läuft
auf ihm **nicht**. Die Migrationsdeckung hängt an `tests/fixtures/migrations-stufen.js`, nicht an
`referenzdepot.js` — das Streichen im aktuellen Fixture nimmt ihr nichts.

### Was NICHT entfernt wurde, und warum

Fünf `vorsorge`-Felder sind `_person()`-**Referenz-Objekte** (`betreuung_person`/`-ersatz`,
`sorgerechtsverfuegung_person`/`-ersatz`, `patientenverf_arzt`). `feldDefFuer` kennt auch sie als
Top-Level-Feld nicht — aber der Wächter (und C8) hat einen **Skalar-Geltungsbereich**
(`typeof wert === 'object'` wird übersprungen). Sie liegen außerhalb der 18 und bleiben; ob auch
sie tote Flachfelder sind, ist eine eigene Frage (als offene Beobachtung gemeldet, nicht hier
entschieden).

## Rotmachbarkeit (Regel 18)

Zwei Belege, keiner im Arbeitsbaum:

- **In der Suite, dauerhaft:** die Positivkontrolle des Wächters (`ein erfundenes Feld faellt auf`)
  pflanzt `gibtesnichtimmodell_4711` und belegt, dass der Kernfall zuschlägt — unabhängig davon,
  ob die Grundlinie Einträge hat. Sie hält die leere `ALTLASTEN` scharf.
- **C8-spezifisch, auf einer Kopie:** ein gestrichenes Feld (`vorsorge.zvr_nummer`) in eine Kopie
  der bereinigten Fixture zurückgepflanzt → die Kern-Logik meldet `vorsorge.zvr_nummer` (ROT);
  das bereinigte Original meldet nichts (GRÜN).

## Konsequenzen

- **Das Referenzdepot ist ehrlich:** kein gesetztes Feld ohne Modell-Definition mehr. Beide
  Richtungen der Fixture-Prüfung grün; volle node-Suite 2176/0.
- **Der Wächter bleibt, die Liste ist leer.** Das ist kein Abschalten — die Positivkontrolle
  trägt die Schärfe, und eine neue Drift dieser Klasse macht den Kernfall rot.
- **Kein Produktivcode berührt.** C8 fasst `vivodepot.html` nicht an; die B16-Aliase und die
  Migration bleiben unverändert. Deliverable 4 unberührt.
- **Offen (Beobachtung):** die fünf `_person()`-Flachfelder in `vorsorge` — außerhalb des
  Skalar-Geltungsbereichs, darum vom Wächter heute nicht gesehen. → **Geschlossen mit C8a (s. u.).**

## Nachtrag C8a (30.07.2026): die fünf Objekt-Refs geräumt UND die Wächter-Lücke geschlossen

Entschieden (a): die fünf `_person()`-Objekt-Refs in `vorsorge` sind tot.
`betreuung_person`/`-ersatz`, `sorgerechtsverfuegung_person`/`-ersatz`, `patientenverf_arzt` — je
Feld belegt wie die 18: `feldDefFuer` undefined; **kein** Live-Flachlese-Pfad
`data.sektoren.vorsorge.<feld>`; die Rolle lebt als **ref-`unterFeld`** IM Instrument
(`vorsorge_instrumente`, `typ:'ref'` — U2-ADR-104/096); kein Deliverable-4-Bezug (`fhirIpsBundle`
liest nur gesundheit + identitaet). Aus `referenzdepot.js` entfernt.

**Der eigentliche Wert ist die geschlossene Wächter-Lücke.** `gesetzteFelder` übersprang bis dahin
`typeof wert === 'object'` — genau darin versteckten sich die fünf. Der Geltungsbereich stellt die
Frage jetzt IMMER am **Schlüssel** (`feldDefFuer(sid, fid)`), unabhängig vom Werttyp; übersprungen
wird nur, was wirklich leer ist (`null`, `''`, `[]`, `{}`). **Über ALLE Fixtures gemessen**, bevor
die Skalar-Grenze fiel: exakt **5** modellfremde Objekt-Refs (die fünf) würden neu rot, **34**
legitime modellbekannte Refs/Listen (`kinder`, `konten`, `hausarzt` …) tragen eine Definition und
bleiben grün. Kein echter Ref färbt falsch.

**Rotmachbar (Regel 18):** eine tote Objekt-Ref (`betreuung_person`) auf einer Kopie eingepflanzt →
erweiterter Wächter rot, bereinigtes Original grün — genau die Klasse, die die fünf versteckt hat.
Dauerhaft in der Suite: zwei neue Kontrollen — eine modellfremde Ref MUSS auffallen, eine
modellbekannte Ref DARF NICHT (`Positiv-/Negativkontrolle OBJEKT-Ref`). Suite 2178/0.

**Beobachtung zu C8a:** die Erweiterung sieht **Top-Level**-Sektorfelder; sie steigt nicht in
Listen-Einträge (Instrument-Zeilen, `kinder`-Zeilen) hinab — deren `unterFelder` sind ein eigener
Mechanismus mit eigener Definition. Das ist der bewusste Zuschnitt, kein Loch: die fünf waren
Top-Level.
