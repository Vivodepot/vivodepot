# U2-ADR-361 · Vier Produkte, ein Gerüst — `produkt-konfektionieren.js`

**Datum:** 07.09.2026
**Status:** gebaut, 13/13 Proben grün
**Status heute:** gilt
**Nummer:** vorläufig — beim Landen gegen den dann aktuellen Kanon neu prüfen
**Auftrag:** direkt aus der Ansage: „VD = VD Privat D/E und VD Pro D/E —
also 4 Produkte, testbar und potentiell buchbar. Das ist meine Klientel."
**Bezug:** `tools/modul-app-packen.js` (Gerüst-Kopie + Bündel-Strukturprüfung, wörtlich
wiederverwendet) · `tools/lib/manifest-konfektionieren.js` (U2-ADR-419, Nachbar-Werkzeug, nicht
Vorbild — s. §2) · U2-ADR-182 Weg B (Vor-Depot-Konfiguration, der Kanal, den diese Konfektionen
tragen)

---

## 1 · Der Mangel

„Testbar" heißt: alle vier Produkte lassen sich öffnen. Es gab keinen Weg, aus dem
Gerüst (`vivodepot.html`) plus einer Modulauswahl ein fertiges, aufmachbares Artefakt zu
gewinnen — nur `tools/modul-app-packen.js`, das genau EIN Bündel in einen fremden, gehosteten
Modul-App-Ordner packt und dabei committet/pusht (ein anderer Zweck: Verteilung einer
EINZELNEN Modul-App, nicht Konfektionierung mehrerer Produktvarianten).

## 2 · Kein zweiter Ort — geprüft, nicht angenommen

Vor dem ersten Zeichen Code gelesen: `tools/lib/manifest-konfektionieren.js` (U2-ADR-419,
Block D). Es löst eine Modulauswahl (ein Manifest aus `{herkunft, moduleVersion}`-Zeigern)
gegen ein signiertes Modul-Register auf und liefert ein **rohes, unsigniertes** `buendel`-
Objekt. Das ist eine andere Schicht: WAS in ein Depot geht, nicht WIE daraus ein Artefakt
wird. Der Vor-Depot-Kanal (U2-ADR-182 Weg B), über den ein Produkt tatsächlich vorkonfiguriert
wird, braucht **signierte** Bündel — `konfektionierenAusManifest`s Ausgabe passt darum nicht
direkt als Eingabe für diesen Zug. Beide Werkzeuge liegen in derselben Konfektionierungs-
Familie, nicht übereinander.

Wiederverwendet, nicht nachgebaut: `tools/modul-app-packen.js` — `DATEISATZ`,
`dateisatzUndIndexAblegen` (byte-identische Gerüst-Kopie inklusive der eigenen `index.html` je
Ordner, U2-ADR-194), `buendelListeAusDatei` (Struktur-/JWS-Formprüfung). `vivodepot-vc-
issuer.html`s `vorDepotKonfigurationDateiInhalt` — dieselbe Zeile, die modul-app-packen.js
bereits schreibt.

## 3 · Der Bau

`tools/produkt-konfektionieren.js`. Nimmt `--slug` (Ordnername), `--bundle <pfad>` (JSON-Array
bereits signierter Bündel — **als Argument, nie im Werkzeug**), `--ziel` (Ausgabeordner,
Default `produkte/`, gitignored). Schreibt `vivodepot.html`/`sw.js`/`manifest.webmanifest`
byte-identisch (kein Templating, keine Textersetzung) plus `index.html` plus
`vorabkonfiguration.js` mit der übergebenen Auswahl.

**Ein leeres Array (`[]`) ist gültig** — anders als bei `modul-app-packen.js`, wo „kein Bündel"
nie der Anlass des Aufrufs ist. Ein Produkt ohne Zusatzmodul ist hier ein benannter, ehrlicher
Fall, keine Fehlbedienung.

**Signiert nichts, prüft nur strukturell** — dieselbe Grenze wie beim Vorbild. Die
kryptografische Prüfung macht `modulEinlassenGeprueft` beim Import im Browser. **Committet
nichts, pusht nichts** — anders als `modul-app-packen.js` (das in ein fremdes Repo schreibt und
dort committet): reiner Datei-Schreiber, der Aufrufer entscheidet über das Zielrepo/-verzeichnis.

## 4 · Der Wächter — Eigenschaft, nicht Prüfung

„Byte-gleiches Gerüst, verschiedene Module" ist keine Eigenschaft, die das Werkzeug PRÜFT — sie
FOLGT aus der Bauform: `dateisatzUndIndexAblegen` kopiert dieselben Quelldateien byte-für-byte,
ohne Textersetzung, für jeden Aufruf gleich. `gerüstByteGleich(ordnerA, ordnerB)` vergleicht
`vivodepot.html`/`sw.js`/`manifest.webmanifest` zweier Konfektionen und benennt jede
abweichende Datei einzeln (nicht nur „ungleich").

**Rot-Beweis** (`tests/produkt-konfektionieren.test.js`, `[Wächter·ROT-BEWEIS]`): eine Zeile in
`sw.js` EINER Konfektion angehängt, die in der anderen fehlt — `gerüstByteGleich` findet sie,
benennt `sw.js`. Ohne diesen Beweis wäre die Zusicherung eine Behauptung, keine Messung.

**Ende-zu-Ende** (`[Ende-zu-Ende]`): vier echte Konfektionen (privat-de/privat-en/pro-de/
pro-en), Pro mit einem ECHT signierten Zusatzmodul (Wegwerf-Schlüsselpaar, ephemer, kein
Schlüssel im Repo). Alle sechs Paare byte-gleich im Gerüst. Die geschriebene
`vorabkonfiguration.js` liest sich zurück zum exakten Bündel-Array — UND landet über den
echten `vorDepotKonfigurationAnwenden`-Weg tatsächlich im richtigen Slot
(`d.brandingModule`), nicht nur „Datei existiert".

## 5 · Was dieser Zug ausdrücklich NICHT tut

- **Entscheidet nicht, was in ein Produkt gehört.** Keine Privat/Pro/D/E-Kenntnis im Werkzeug —
  die Modulauswahl kommt als `--bundle`-Argument herein.
- **Baut keine Sprachmodule.** `3f` baut parallel ein Sprachmodul — bis es landet, unterscheiden
  sich `-de`/`-en`-Konfektionen inhaltlich nicht, nur im Namen. Das ist der heutige, ehrliche
  Stand, kein Fehler dieses Zugs.
- **Committet/pusht/hostet nichts.** Wo die vier echten, distributionsfertigen Artefakte
  landen (ein Repo wie `vivodepot-ios-test`? ein eigener Hosting-Ort?), ist eine
  Publishing-Entscheidung, kein Bau-Detail dieses Zugs.
- **Signiert keine Module.** Ein echtes Pro-Zusatzmodul für die tatsächliche Auslieferung
  braucht eine echte Zertifikatskette (ein eigener Akt außerhalb dieses Werkzeugs) — nicht Teil
  dieses Werkzeugs.

## 6 · Vier lokale Probeläufe, heutiger Stand

`node tools/produkt-konfektionieren.js --slug <slug> --bundle tests/fixtures/produkt-
konfektionieren/leer.json --ziel /tmp/…` — alle vier mit leerer Auswahl (heute existiert noch
kein echtes, signiertes, distributionsfertiges Zusatzmodul für Pro oder ein Sprachmodul für
EN). Ergebnis geprüft (MD5 über `vivodepot.html`/`sw.js`/`manifest.webmanifest`): alle vier
Konfektionen byte-identisch im Gerüst, wie erwartet. Nicht committet (Build-Ausgabe, `/tmp`) —
die vier realen, produktunterscheidenden Läufe folgen, sobald eine Modulauswahl je Produkt
feststeht (eigener, folgender Posten, nicht Teil dieses Zugs).

## 7 · Gefunden, nicht gebaut: `sprache:'de'` bleibt im Vor-Depot-Weg reserviert

**Fund von `3f`, bestätigt am Code (07.09.2026):** `textsatzModulPruefen` lehnt
`modul.sprache === TEXTSATZ_SPRACHE_EINGEBAUT` ('de') mit `grund:'reserviert'` ab — genau die
Funktion, die JEDER Weg aufruft, der ein Modul tatsächlich einlässt, EINSCHLIESSLICH des Vor-
Depot-Wegs (`vorDepotKonfigurationAnwenden` → `modulEinlassenGeprueft` → `modulEinlassen` →
`_einlassRegisterFuer('textsatz').pruefen`), also auch der Weg, den eine von diesem Werkzeug
geschriebene `vorabkonfiguration.js` beim Öffnen tatsächlich nimmt.

**Für dieses Werkzeug bedeutet das:** ein `--bundle` mit einem signierten `sprache:'de'`-Modul
würde eine `pro-de`/`privat-de`-Konfektion erzeugen, die BEIM ÖFFNEN das deutsche Sprachmodul
still mit `grund:'reserviert'` verwirft — die Dateien entstünden fehlerfrei, das Produkt wäre
aber nicht das, wofür es gebaut wurde. Kein Bug in diesem Werkzeug (das signiert/prüft nichts
selbst, s. §3) — eine Eigenschaft des gemeinsamen Einlasswegs, den JEDES Modul nimmt, gleich
wie es verpackt wurde.

**Es gibt bereits einen zweiten, dafür gebauten Weg — bewusst unverdrahtet:**
`_textsatzModulPruefenGeruest` (U2-ADR-285, wörtliche Kopie von `textsatzModulPruefen` bis auf
die eine `'de'`-Ausnahme) existiert genau für „Vivodepot baut sein eigenes Gerüst-Modul", nicht
für „eine Bürgerin lässt ein fremdes Modul ein". Seine Sicherheit ist ausdrücklich die
ABWESENHEIT eines Aufrufers — `tests/u2-adr-285-textsatz-geruest-modul.test.js` hält das als
Ratsche fest und wird rot, sobald irgendein Aufruf im Kern auftaucht. „Wer sie verdrahten will,
muss zuerst diese Probe absichtlich ändern — kein versehentliches Wegwecken" (Kommentar an Ort
und Stelle).

**Diesen Zug NICHT verdrahtet:** Konfektionieren und Einlassen sind
zwei verschiedene Wege (Konfektionieren: Vivodepot baut ein Produkt aus Gerüst + EIGENEN
Modulen, keine fremde Herkunft, keine Ratsche nötig; Einlassen: eine Bürgerin bringt ein
FREMDES Modul, Reservierung/Ratsche/Herkunftsanzeige gelten) — aber OB und WIE der Vor-Depot-
Weg diesen zweiten Weg statt des ersten nehmen soll (ein eigener `vorDepotKonfigurationAnwenden`-
Zweig? ein separates Flag am Bündel? ein ganz anderer Kanal für Vivodepot-eigene Gerüst-Module?),
ist eine Architekturentscheidung mit Sicherheitstragweite — die Ratsche existiert genau, damit
sie nicht nebenbei fällt. **Der DE/EN-Unterschied der vier Produkte bleibt darum bis zu dieser
Entscheidung ungebaut**, auch nachdem `3f`s DE-Modul (`tools/textsatz-de-modul-erzeugen.js`,
Parität DE/EN mit Rot-Beweis) vorliegt. Das Werkzeug selbst ist davon unberührt und bleibt für
jede NICHT-reservierte Modulauswahl (z. B. ein Pro-Zusatzmodul ohne Sprachbezug, wie im
Ende-zu-Ende-Test §4) voll einsatzbereit.

## 8 · Die vier Produkte, real erzeugt (07.09.2026 — „nicht vorbereiten, erzeugen")

**Auflösung von §6/§7:** Vivodepots EIGENE Module (textsatz/logikModul tragen kein
`nurGeprueft`) müssen NICHT über den signierten Vor-Depot-Weg laufen — derselbe unsignierte
Weg, für den `tools/textsatz-en-modul-erzeugen.js` sein Modul ausdrücklich baut ("UNSIGNIERT,
BEWUSST … kein nurGeprueft"). `konfektionieren()` bekommt darum einen zweiten, additiven Kanal:
`unsignierteModulDateien` — kopiert Vivodepot-eigene Modul-Dateien byte-identisch NEBEN das
Gerüst (kein Vor-Depot, keine Signatur), zum Andocken über den bestehenden, funktionierenden
Weg (Einstellungen → Module → Einlassen). Der bestehende signierte `--bundle`-Weg (§3) bleibt
unverändert für Fremdmodule.

**Die Zusammensetzung** (`tools/lib/vier-produkte.js`) — benannt, nicht geraten:

```
privat-de   Gerüst, kein Zusatzmodul (nativer Rückfall — bereits Deutsch)
privat-en   Gerüst + tools/textsatz-en-modul.json
pro-de      Gerüst + Pro-Geschäftsführerin-Notfallmappe-logikModul
pro-en      Gerüst + textsatz-en-modul.json + Pro-Geschäftsführerin-Notfallmappe-logikModul
```

`DE trägt kein dockbares Sprachmodul` ist §7s gemessene Grenze, hier ausgetragen: `sprache:'de'`
bleibt reserviert, AUCH am zweiten Durchsetzungspunkt (`_textsatzModuleAusDepotAnmelden` ruft
`textsatzModulPruefen` beim Registrieren erneut auf — kein Loch über einen zweiten Weg). Die
DE-Produkte bleiben beim eingebauten Rückfall, der ohnehin Deutsch ist — kein Zweitweg dafür
gebaut, wie angeordnet.

Das heißt nicht, dass die deutschen Namen der Pro-Bereiche einer pro-de-Datei fehlen dürften: sie
sind Inhalt des Bereichs-Templates, nicht Sprachmodul. Sie reisen als Inline-Beschriftung des
Templates in der Ab-Werk-Mitschrift (U2-ADR-398), sodass jedes Programm, das die Datei liest — die
Lese-App eingeschlossen —, Bereich, Sektion, Feld und Unterfeld benennen kann, ohne dass ein
deutsches Sprachmodul dockt.

### Die drei verlangten Wächter (`tools/vier-produkte-erzeugen.js`, real gefahren)

1. **Gerüst byte-gleich über alle vier** — ✓ alle sechs Paare (`vivodepot.html`/`sw.js`/
   `manifest.webmanifest`), gemessen über `gerüstByteGleich` UND unabhängig per MD5.
2. **Jedes Produkt trägt genau einen Sprachmodul-Zustand** — ✓ privat-de/pro-de: 0
   Sprachmodul-Dateien (nativer Rückfall ist der eine, geltende Zustand); privat-en/pro-en:
   genau 1 (`textsatz-en-modul.json`). Gemessen an der Anzahl mitgelieferter
   Sprachmodul-Dateien je Produkt, nicht angenommen.
3. **Keine deutsche Zeile im englischen Produkt** — **ROT.** Gemessen
   über den ECHTEN Lesepfad (`textLesen`/`_textsatzModuleAusDepotAnmelden`, `tools/lib/
   vier-produkte.js#deutscheZeilenImEnglischenProdukt`): das EN-Modul über den echten Weg
   registriert, dann jede der 3347 DE-Kennungen gelesen und mit dem DE-Wert verglichen — eine
   Übereinstimmung heißt, `textLesen` ist auf den (deutschen) eingebauten Rückfall gefallen.

   **Ergebnis: 137 von 3347 Kennungen (4,1 %) zeigen im EN-Produkt weiterhin Deutsch.** Die
   erste ehrliche Messung, wie weit ein englisches Produkt tatsächlich ist — vorher gab es sie
   nicht. Ursache: der deutsche Rückfall im Kern (`TEXTSATZ_EINGEBAUT`) ist der implizite
   Sockel, den 3f's Zug 2 ("den deutschen Rückfall … durch ein echtes Andocken ersetzen")
   ausdrücklich noch nicht ersetzt (s. §6 dortiger ADR). Kein Fehler dieses Zugs — die Zahl
   ändert sich, sobald Zug 2 landet, und der Wächter zeigt das dann von selbst.

**Vier reale Artefakte erzeugt** (`node tools/vier-produkte-erzeugen.js`, nicht committet —
Build-Ausgabe): je ~5,3–5,6 MB, vollständiger `DATEISATZ` + `index.html` + die passenden
Modul-Begleitdateien. Kopie des ECHTEN `vivodepot.html` (dieselbe Datei, die die volle Suite
gerade geprüft hat) — kein neuer, ungeprüfter Code-Pfad.

**Suite:** `tests/vier-produkte.test.js`, 10/10 — prüft die MECHANIK (Zusammensetzung,
Gerüst-Gleichheit, Rot-Beweis + Gegenprobe der Leck-Messung an synthetischen Daten) und dass
die REALE Zahl ermittelbar ist, hält sie aber NICHT hart gegen 0 (das wäre ein permanenter,
falscher Rot-Zustand dieser Suite bis Zug 2 landet) — die reale Zahl wird hier im ADR gemeldet,
nicht in der Suite erzwungen.

## 9 · Teil 1 der DoD-Abnahme: die v515-Grundlinie (07.09.2026)

Die verbindliche Abnahme: vier Produkte (Privat/Pro × DE/EN, jeweils mit
Rechtsraum Deutsch + Branding/UX-Stand v515), abgenommen als VERGLEICH gegen den ausgelieferten
Stand v515 — "in Aussehen UND Funktion nicht unterscheidbar von v515, nur ohne Fehler" — und
ein v515-Testdepot muss in jedem der vier weiterhin funktionieren. Fünf Modulachsen statt zwei
(privat/pro, Sprache, Rechtsraum, Branding, UX) — was davon heute nicht als Modul existiert,
wird gemeldet, nicht erfunden (s. Abschnitt "Offene Achsen" unten).

**Die Referenz ist eine Datei, kein Commit — gemessen, nicht angenommen:**
`vivodepot-ios-test/vivodepot.html` auf Platte (SCHALEN_STAND v515, BUILD_VERSION
v1.0-rc, BUILD_DATUM 2026-09-03, sha256 `be33cb739c3d801f…`) entspricht KEINEM der 300 geprüften
Kern-Commits — `tools/testfassung-legen.js` legt die Fassung umgeformt ab, nicht byte-gleich.
Das GitHub-Repo `vivodepot-ios-test` ist mit Schale v501 (02.09.) ÄLTER und darum nicht als
Referenz brauchbar. `12b50b07` (der ursprünglich vorgeschlagene Commit) ist damit VERWORFEN,
nicht verwendet — hier ausdrücklich benannt.

**`tools/v515-grundlinie-erzeugen.js`** — wörtlicher Wiedergebrauch der Technik aus
`tests/render-charakterisierung.test.js` (UUID-/Datums-Maskierung, LEER-/BEFÜLLT-Zustand über
`tests/fixtures/referenzdepot.js`), NICHT dieselbe Aufnahme-Menge (eigener Ordner
`tests/fixtures/v515-grundlinie/` — render-aufnahme bleibt die LAUFENDE Charakterisierung des
heutigen Kerns, diese hier ist ein fester historischer Bezugspunkt). Die 4,4-MB-Datei selbst
bleibt AUSSERHALB des Repos, nur die gerenderten Sektor-Aufnahmen (26 Dateien, 13 Sektoren ×
2 Zustände) werden eingecheckt.

**Die sha256-Sperre:** geprüft VOR jedem Rendern, nicht erst beim
späteren Vergleich — eine falsche Datei am erwarteten Pfad kann nicht einmal eine Grundlinie
erzeugen. Rot-Beweis (`tests/v515-grundlinie-erzeugen.test.js`): eine absichtlich falsche Datei
am Pfad wird mit benannter Meldung abgelehnt, keine stille Weiterverarbeitung.

**Befund beim Erzeugen:** `nichtSetzbareFelderBefuellt: []` — jedes Feld aus dem heutigen
Referenzdepot-Fixture ließ sich auch gegen den älteren v515-Feldkatalog setzen. Kein Feld aus
dem heutigen Modell fehlte v515 vollständig (was nicht heißt, dass die Rendering-AUSGABE gleich
ist — das prüft erst Teil 2).

**Was hier NICHT enthalten ist:** der eigentliche Vergleich der vier
konfektionierten Produkte gegen diese Grundlinie (Teil 2) und das v515-Testdepot-Fixture für die
Rückwärtsverträglichkeits-Probe (Teil 3) — "erst die v515-Grundlinie erzeugen und einchecken,
… Teil 1 ist für sich wertvoll." Beide folgen als eigene, benannte Schritte.

**Offene Achsen (gemeldet, nicht erfunden — Korrektur, 07.09.2026):** von den fünf Achsen
sind heute ZWEI noch keine Module:

```
Rechtsraum   rechtsraum:'DE' existiert nicht als dockbare Datei (wie sprache:'de'
             im Einlassweg reserviert, U2-ADR-121/285-Familie, dieselbe Struktur wie §7)
Branding/UX  liegt nativ im Gerüst
```

Für DIESE Abnahme gegen v515 ist das folgenlos — beide sind in Referenz und Produkt identisch
nativ, kein Unterschied entsteht dadurch. **Für den Baukasten ist es aber eine OFFENE Achse,
kein erledigter Punkt:** die DoD nennt Branding/UX ausdrücklich als eigene Achse
(„+ Branding und UX Vivodepot version ios-test v515"), und die stehende Regel „ALLES ist
modular, kein eingebauter Bestand" gilt unverändert. „Nativ" heißt hier „noch nicht gebaut",
nicht „entbehrlich" — der Unterschied wurde in einer ersten Fassung dieses Abschnitts verwischt
und hier ausdrücklich richtiggestellt. Nicht Teil dieses Zugs gebaut.

**Suite:** `tests/v515-grundlinie-erzeugen.test.js`, 19/19 (inklusive der Bestandsprobe
`tests/fixture-felder-im-modell.test.js` mit dem neuen AUSNAHMEN-Eintrag).

## 10 · Teil 2: die vier Produkte gegen die v515-Grundlinie (07.09.2026)

`tools/v515-vergleichen.js` — konfektioniert alle vier Produkte, dockt bei den EN-Varianten das
Sprachmodul über den echten, unsignierten Einlassweg (`modulEinlassen`), rendert dieselben 26
Aufnahmen (13 Sektoren × LEER/BEFÜLLT) wie die Grundlinie und vergleicht SEKTOR-GRANULAR
(byte-gleich oder abweichend — dieselbe Grobheit wie `tests/render-charakterisierung.test.js`,
bewusst nicht feiner). Prüft zuerst das Grundlinie-Manifest gegen die erwartete sha256 — kein
Vergleich gegen eine fremde Menge.

**Gemessen: alle 26 von 26 Aufnahmen weichen bei ALLEN VIER Produkten vom v515-Stand ab** —
auch bei `privat-de`/`pro-de`, wo die Sprachachse identisch (nativ Deutsch) ist. Das ist **keine
Sprach-Aussage** — es ist die gemessene Distanz zwischen der v515-Referenzdatei (BUILD_DATUM
2026-09-03) und dem heutigen Kanon: in den vier Tagen dazwischen landeten dutzende ADRs (u. a.
die gesamte C3-Erscheinungs-Achse, das Blattformat-Register, der Rechtsraum-Katalog — dieser
Zug selbst berührt `vivodepot.html` an keiner Stelle inhaltlich, s. §8/§9).

**Methodische Grenze, ausdrücklich benannt statt verschwiegen:** Sektor-granulares Byte-Diffing
unterscheidet NICHT zwischen „v515 hatte hier einen Fehler" (erlaubte, zu benennende Abweichung
laut DoD-Vorgabe) und „echte Weiterentwicklung seit v515" (ebenfalls eine Abweichung,
aber keine, die die Abnahme verletzt) — beide zählen hier gleich als „abweichend". Eine
Klassifizierung JEDER der 26×4 Abweichungen einzeln (welche ist ein v515-Fehler, welche ist
gewollte Weiterentwicklung) ist eine eigene, große Sichtungsarbeit — nicht in diesem Werkzeug
geleistet, hier als offener Punkt benannt statt eine eigene Einschätzung unterzuschieben.

**Getrennt ausgewiesen, wie verlangt — die Deutsch-Leck-Zahl (Kennungs-granular, 3347
Kennungen, nicht Sektor-granular):** unverändert **137 von 3347 (4,1 %)**, gilt für `privat-en`
UND `pro-en` gleichermaßen (dieselbe EN-Moduldatei). Diese Zahl MISST etwas anderes als die
Sektor-Abweichung oben (Kennungs-Vollständigkeit gegen den HEUTIGEN Kern, nicht Sektor-Gleichheit
gegen einen HISTORISCHEN Stand) — beide nebeneinander gemeldet, nicht addiert.

**Suite:** `tests/v515-vergleichen.test.js`, 4/4 — prüft die Manifest-Sperre (Rot-Beweis: falsche
sha256 bricht ab) und die Vergleichsfunktion selbst (Rot-Beweis + Gegenprobe), NICHT die reale
Abweichungszahl als Muss-Kriterium (dieselbe Begründung wie bei den Vier-Produkte-Proben: ein
Hard-Assert hielte diese Suite bei jeder legitimen Weiterentwicklung dauerhaft rot).

## 11 · Teil 3: das v515-Testdepot (07.09.2026)

`tools/v515-testdepot-erzeugen.js` — baut ein BEFÜLLTES Depot (referenzdepot.js, 224 gesetzte
Felder) gegen dieselbe sha256-gesperrte v515-Referenzdatei (NICHT den heutigen Kern — sonst
bewiese es nichts über Rückwärtsverträglichkeit), exportiert es über
den bereits bestehenden, echten Klartext-Weg `vollExportJSON()` (Umzug/Sicherung-Vertrag,
`_vollDepotParsen` ist die Umkehrung) und legt das Ergebnis als Fixture
(`tests/fixtures/v515-testdepot.json`, 36 KB) ins Repo.

**Bewusst der Klartext-Weg, nicht die verschlüsselte `.vivodepot`-Hülle:** die Abnahme fragt, ob
die DATEN die vier heutigen Produkte überleben — das prüft `_vollDepotParsen`/`setData`
unmittelbar. Die verschlüsselte Hülle (KDF/Salt) ist an anderer Stelle bereits geprüft, hier
nicht Gegenstand — ein größerer, eigener Zug, falls diese Ebene ausdrücklich gewünscht wird.

**Ergebnis, gemessen: alle vier Produkte laden und rendern das v515-Testdepot ohne Fehler.**
`tests/v515-testdepot.test.js` konfektioniert jedes der vier Produkte real, parst den Export
über den echten `_vollDepotParsen`-Weg, übernimmt die Sektoren, rendert JEDEN der 13 Sektoren —
kein Wurf, in keinem der vier Produkte. Das ist die POSITIVE Kernaussage von Teil 3: die
Rückwärtsverträglichkeit hält, gemessen, nicht angenommen.

**Suite:** `tests/v515-testdepot.test.js`, 6/6 (Fixture-Provenienz, vier Rundlauf-Proben — eine
je Produkt, kein Extrapolieren von einem auf alle vier — plus ein Rot-Beweis: ein kaputtes
Export-Objekt wird von `_vollDepotParsen` nicht als Depot akzeptiert).

## 12 · Korrektur an Teil 2: die v515-Grundlinie ist eine Entwicklungs-Chronik, kein Abnahmetor

Der 26/26-Befund in §10 — ALLE VIER Produkte weichen zu 100 % vom v515-Stand ab, auch die
DE-Varianten mit identischer Sprachachse — wurde ausdrücklich eingeordnet: „100 %
Abweichung ist kein Befund, sondern ein untauglicher Maßstab." Das Werkzeug misst die Distanz
zwischen der v515-Referenzdatei (BUILD_DATUM 2026-09-03) und dem heutigen Kanon — vier Tage
legitimer Weiterentwicklung, keine Konfektionierungs-Fehler. Ein Vergleich, der bei JEDER
künftigen Kanon-Änderung automatisch wieder 26/26 zeigt, kann keine Aussage über die
Konfektionierung selbst treffen — er zeigt nur, dass die Zeit vergangen ist.

**Die Rolle von `tools/v515-grundlinie-erzeugen.js` und `tools/v515-vergleichen.js` bleibt
bestehen, ändert sich aber:** beide sind eine **Entwicklungs-Chronik**, kein Abnahmetor. Sie
beantworten „ist der heutige Kanon noch, in Aussehen und Funktion, `wie v515`?" — eine Frage,
die mit den Augen beantwortet wird (Screenshots, gezielte Stichproben), nicht eine, die
ein Werkzeug automatisch grün oder rot stellt. Wer diese 26/26-Zahl künftig als „Konfektionieren
ist kaputt" liest, liest sie falsch — genau das soll dieser Abschnitt verhindern.

Die eigentliche, scharfe Frage — „ändert das KONFEKTIONIEREN etwas am Produkt?" — bekam ein
eigenes, neues Werkzeug (§13), weil sie eine andere Referenz braucht: nicht einen historischen
Stand, sondern den HEUTIGEN nativen Kanon.

## 13 · Die scharfe Baukasten-Abnahme: konfektioniert gegen nativ (07.09.2026)

`tools/konfektion-nativ-vergleichen.js` — dieselbe Rendertechnik wie §10, aber die Referenz ist
NICHT die v515-Grundlinie, sondern die bereits bestehende native Charakterisierung des heutigen
Kanons (`tests/fixtures/render-aufnahme/`, von `tests/render-charakterisierung.test.js` aktuell
gehalten) — keine zweite, eigene Aufnahme nötig: derselbe Kanon, den auch
`produkt-konfektionieren.js` byte-identisch kopiert, ist dort bereits maskiert aufgenommen.

**Die Frage zerfällt in zwei, nur die erste gehört hierher:**
1. Ändert das KONFEKTIONIEREN etwas? (dieses Werkzeug) — konfektioniertes Produkt vs. derselbe
   Kanon nativ gerendert. Erwartung: NULL Abweichung.
2. Ist der heutige Kanon noch „wie v515"? (§12, `tools/v515-vergleichen.js`) — eine Aussage über
   Produktentwicklung, keine Abnahme für dieses Werkzeug.

**Ergebnis, gemessen: 0 von 26 Aufnahmen weichen ab — für ALLE VIER Produkte**, nicht nur für
`privat-de`/`pro-de` (der verlangte scharfe Wächter). Auch `privat-en`/`pro-en`
zeigen 0 — gemessen, nicht angenommen: `produktRendern()` (aus `tools/v515-vergleichen.js`,
hier wiederverwendet) dockt das Sprachmodul zwar über den echten Einlassweg (`modulEinlassen`),
setzt aber nie `textsprache` auf `'en'` — die 13 Kern-Sektoren rendern darum unabhängig vom
gedockten Modul immer nativ deutsch. Die Sprachachse wirkt erst dort, wo `textLesen()` sie
tatsächlich abfragt (`tools/lib/vier-produkte.js#deutscheZeilenImEnglischenProdukt`, §8/§10) —
nicht am Sektor-Rendering. Das ist kein Mangel dieses Werkzeugs, sondern seine Grenze: es prüft,
ob Konfektionieren das Produkt VERÄNDERT, nicht ob die Sprachumschaltung selbst funktioniert
(dafür bleibt die Deutsch-Leck-Messung zuständig).

**Eine Unstimmigkeit VOR dem Messen behoben, nicht danach entdeckt:** die drei v515-Werkzeuge
(`v515-grundlinie-erzeugen.js`, `v515-vergleichen.js`, `v515-testdepot-erzeugen.js`) erklärten
den Akteur beim Depot-Aufbau mit je einem ANDEREN Namen (`'Grundlinie'`, `'Vergleich'`,
`'v515-Testdepot'`) — keiner passte zur nativen Referenz aus `render-charakterisierung.test.js`
(`'Aufnahme'`). Ein erster Testlauf dieses Werkzeugs zeigte dadurch scheinbar 1 von 26
Abweichungen (`leer__meine-menschen`, für alle vier Produkte identisch) — ein reiner
Meßartefakt (der selbstauskunftende Name landet im gerenderten HTML), kein echter
Konfektionierungs-Fehler. Alle vier Aufrufstellen wurden auf `'Aufnahme'` vereinheitlicht, die
v515-Grundlinie (§9) und das v515-Testdepot (§11) neu erzeugt (dieselbe sha256, dieselben
Feld-/Dateizahlen — nur der Akteur-Name änderte sich), danach war das Ergebnis oben stabil.

**Suite:** `tests/konfektion-nativ-vergleichen.test.js`, 5/5 — ANDERS als bei der v515-Chronik
(§10) ist die Abweichungszahl hier HART erzwungen (`assert.equal(vergleich.anzahl, 0)` für
`privat-de`, `pro-de`, `privat-en`, `pro-en`), weil die Referenz der heutige native Kanon ist,
kein wandernder historischer Stand — 0 ist hier die Zusage selbst, kein Provisorium. Dazu eine
Gegenprobe (identische Aufnahmen vergleichen sich zu 0) und ein Rot-Beweis (eine künstlich
veränderte Aufnahme wird erkannt und benannt).

## Nachtrag (12.09.2026) — „Produkt ist eine Datei" löst diesen Stand drei Tage später ab

Dieses ADR beschreibt korrekt, was am 07.09.2026 galt: fünf ausgelieferte Dateien
(`vivodepot.html`/`sw.js`/`manifest.webmanifest`/`index.html`/`vorabkonfiguration.js`, §1/§5).

**Drei Tage später, Auftrag „Produkt ist eine Datei" (10.09.2026, Produktentscheidung:
„Ein Produkt ist eine html-Datei"), abgelöst:** `PRODUKT_DATEISATZ` in `tools/produkt-
konfektionieren.js` trägt seitdem nur noch `['vivodepot.html']` — die vier anderen sind nicht
mehr Teil des ausgelieferten Produkts. Die Vor-Depot-Konfiguration (vormals
`vorabkonfiguration.js` als Begleitdatei) ist seitdem als Ab-Werk-Region eingebacken (s.
Kopf-Kommentar an `PRODUKT_DATEISATZ` im Werkzeug selbst, und an `AB_WERK_VOR_DEPOT_
KONFIGURATION` im Kern, `vivodepot.html`).

Entdeckt am 12.09.2026 (Nachlese-Messung), nachdem zwei Sitzungen — eine dieses
Dokument lesend, eine den Bestand messend — zu unterschiedlichen Ständen kamen: „fünf Dateien"
(dieses ADR) gegen „eine Datei" (der tatsächliche `PRODUKT_DATEISATZ`-Wert). Beide Sitzungen
hatten recht — für ihren jeweiligen Zeitpunkt.

Am selben 12.09.2026 folgte aus genau dieser Lücke ein echter, empirisch reproduzierter
Konsolen-404: `serviceWorkerRegistrieren()` im Kern versuchte weiterhin unbedingt, ein `sw.js`
zu registrieren, das seit dem 10.09. in keinem konfektionierten Dateisatz mehr existiert. Behoben
über eine neue Ab-Werk-Region (`AB_WERK_SERVICE_WORKER_VORHANDEN`, dieselbe Familie wie
`AB_WERK_VOR_DEPOT_KONFIGURATION` — s. Kopf-Kommentar an der Region in `vivodepot.html` und an
`_swRegistrierenErlaubt()`), nativer Wert `null` (Bestandsschutz für jeden Dateisatz, der sie nie
backt), `false` nur dort, wo `PRODUKT_DATEISATZ` kein `sw.js` trägt. Geprüft in
`tests/d43-etappe8-serviceworker.test.js` und `tests/produkt-konfektionieren.test.js`.
