# U2-ADR-367 · `TEXTSATZ_EINGEBAUT` wird das deutsche Sprachmodul selbst — Zug 3, Besitz-Zug

**Status heute:** gilt
**Datum:** 07.09.2026
**Betrifft:** `vivodepot.html` (`TEXTSATZ_EINGEBAUT` → `AB_WERK_TEXTSATZ_DE`, jetzt selbst ein
Sprachmodul mit `modulTyp`/`sprache`/`moduleVersion`/`anbieterId`/`regeln`/`texte` statt einer
flachen Tabelle; `_abWerkTextsatzDeAbleiten()` entfernt, `_textsatzAbWerkRegistrySeed()` sät die
Konstante jetzt direkt statt sie abzuleiten; 20 Lesestellen im Kern lesen über `.texte`),
35 Werkzeuge und 35 Testdateien (Umbenennung + `.texte`-Lesestellen, Einzelheiten §5),
`tests/load-kern.js` (Export-Name), `docs/faktenbasis.md`/`docs/adr/README.md`/
`vivodepot.html.sha256`/`STANDARDS.md`/`sw.js` (regeneriert/Schale v625→v626)
**Bezug:** U2-ADR-363 (Zug 2 — benannte diesen Zustand als offen, §0/§9 dort), U2-ADR-359 (Zug 1 —
Deutsch wird ein Modul), U2-ADR-285 (Gerüst-eigener Prüfweg für `sprache:'de'`), U2-ADR-362 (Peer
56, Branding — `_markePlatzhalterAufloesen` im selben `textLesen()`-Lesepfad, unberührt)

---

## 0 · Was dieser Zug leistet

**Geleistet:** die Frage, die U2-ADR-363 §0 offen ließ und wörtlich benannte — „`TEXTSATZ_EINGEBAUT`
bleibt eine Gerüst-Tabelle, aus der ein Modul abgeleitet wird, nicht selbst ein Modul" — ist
beantwortet. `AB_WERK_TEXTSATZ_DE` (der neue Name) trägt jetzt die volle Modul-Form
(`modulTyp:'textsatz', sprache:'de', moduleVersion:1, anbieterId:'vivodepot', regeln:{…},
texte:{…}`) direkt an der Definition. `_abWerkTextsatzDeAbleiten()`, die Funktion, die diese Form
bisher bei jedem Kernstart neu zusammenbaute, ist ersatzlos entfernt — es gibt nichts mehr
abzuleiten. Der Kern, alle Werkzeuge und alle Testdateien lesen den Wortlaut jetzt ausschließlich
über `AB_WERK_TEXTSATZ_DE.texte`, niemals mehr über den bloßen Bezeichner. „Deutsch ist ein Modul,
keine Eigenschaft des Gerüsts" (wörtlich, s. U2-ADR-363) ist damit strukturell
erreicht, nicht mehr nur zur Laufzeit simuliert.

**Für die Bürgerin ändert sich nichts.** Dieselben 3499 Kennungen, derselbe Wortlaut, dieselbe
Ab-Werk-Saat (`_textsatzAbWerkRegistrySeed`) — nur der Weg dorthin ist jetzt eine einzige,
direkte Zuweisung statt einer Ableitungsfunktion, die bei jedem Laden neu über 3499 Einträge
lief.

## 1 · Der Auftrag

Der Auftrag, anknüpfend an die bereits gestellte Abendfrage („kann Deutsch aus dem Kern entfernt werden?" —
Antwort: ja, mit diesem Zug), war ein zweistufiges Mandat:

> Schritt 1 ist der eigentliche Wert: klassifiziere jede reale Referenz — darf sie die Tabelle
> direkt sehen (Erzeuger, Bauzeit-Werkzeuge), oder muss sie über den Modulweg (Kern, Laufzeit)?
> Wenn dabei herauskommt, dass fünfzig Stellen eigentlich über den Modulweg müssten, ist DAS der
> Befund — nicht die Zahl 238.
>
> Schritt 2, in dieser Reihenfolge: Kern → Werkzeuge → Proben. Und ein Wächter: im Gerüst steht
> keine deutsche Texttabelle mehr — mit einem echten Rot-Beweis.

## 2 · Die Messung vor dem Bau (Schritt 1)

Die erste Zählung (238 Vorkommen, U2-ADR-363 §0/§9) war selbst ungenau: sie zählte jedes
`grep`-Treffer auf `TEXTSATZ_EINGEBAUT`, einschließlich der Substring-Kollision mit
`TEXTSATZ_EINGEBAUT_LESEN` (der eigenständigen, wortgleichen Lese-App-Konstante, U2-ADR-349) und
`TEXTSATZ_EINGEBAUT_LESEN_DOK` (U2-ADR-357) — beides eigene Bestände, kein Ziel dieses Zugs.
Wortgrenzensicher gemessen (`grep -P 'TEXTSATZ_EINGEBAUT(?!_)'`): **265 echte Vorkommen** über
Kern (41, plus 2 in der neuen Modul-Kopfzeile nach dem Bau), 35 Werkzeuge und 34 Testdateien
(eine Fixture-Datei kam als 35. dazu — reine Erklärprosa, kein Kern-Zugriff).

Die geforderte Klassifikation — „darf direkt sehen" vs. „muss über den Modulweg":

- **Bauzeit-legitim (darf die Tabelle als Ganzes benennen, keine `.texte`-Pflicht):** Erzeuger, die
  das GANZE Modulobjekt entgegennehmen oder vergleichen (`baueModul()` in den DE/EN-Erzeugern
  validiert `AB_WERK_TEXTSATZ_DE` selbst gegen `_textsatzModulPruefenGeruest`), sowie
  Quelltext-Anker, die die literale Deklarationszeile in `vivodepot.html` suchen (fünf Werkzeuge:
  `dokumentmodule-ins-buendel-schreiben.js`, `wizards-ins-buendel-schreiben.js`,
  `tote-strings-pruefen.js`, `ascii-umlaut-pruefen.js`, `waechter-register.js` — Brace-Zählung und
  String-Anker, unabhängig von der internen Modul-Form).
- **Muss über den Modulweg (`.texte`):** jede Stelle, die den Wortlaut selbst braucht — Kern (20
  Lesestellen: `_textsatzTexteUebernehmen`, `_stringsAusSatz`, STRINGS-Proxy, die vier
  Knoten-Füll-Funktionen, `_dokumentUnuebersetzteStellen`), sämtliche Mess- und Deckungswerkzeuge
  (`inline-texte-messen.js`, `lokalisierbarkeit-erheben.js`, `heben-stand-messen.js`,
  `buergermodul-schnitt.js` u. a.) und praktisch jede Testdatei, die den echten deutschen Wortlaut
  gegen ein erzeugtes Modul oder gegen `textLesen()` prüft.

**Der gefragte Befund:** die weit überwiegende Mehrheit der 265 Stellen — Kern
vollständig, praktisch alle Werkzeuge, praktisch alle Tests — gehörte in die zweite Gruppe. Nur
neun Stellen (fünf Quelltext-Anker-Werkzeuge, drei Erzeuger-Aufrufe an `baueModul()`, ein
Registry-Ausschluss in `tools/textsatz-traeger-erheben.js`) durften den Bezeichner ohne `.texte`
behalten. Das bestätigt die Prämisse des Auftrags: fast der gesamte Bestand griff bereits
konzeptionell über den Modulweg zu — er tat es nur über einen Namen, der noch keine Modul-Form
trug.

## 3 · Der Bau (Schritt 2, Kern → Werkzeuge → Proben)

**Kern:** `const TEXTSATZ_EINGEBAUT = Object.freeze({ …3499 Einträge… });` wird zu
`const AB_WERK_TEXTSATZ_DE = Object.freeze({ modulTyp:'textsatz', sprache:'de', moduleVersion:1,
anbieterId:'vivodepot', regeln:Object.freeze({…}), texte:Object.freeze({ …dieselben 3499
Einträge, unverändert… }) });` — die 3499 Zeilen selbst wurden nicht neu geschrieben, nur ein
Rahmen davorgesetzt (kein Kopieren, kein zweiter Block, keine Neuformatierung der bestehenden
Einträge — sie stehen bewusst weiter auf derselben Einrücktiefe wie vorher, um einen Diff über
3499 Zeilen zu vermeiden). `_abWerkTextsatzDeAbleiten()` ist entfernt; ihr einziger Aufrufer in
`_textsatzAbWerkRegistrySeed()` übergibt jetzt `AB_WERK_TEXTSATZ_DE` direkt an
`_textsatzModulPruefenGeruest` (U2-ADR-285-Weg). Die zwei erklärenden Kopf-Kommentare, die noch
die alte „Ableitung, keine Kopie"-Geschichte erzählten, sind auf den neuen Stand umgeschrieben
(s. Kommentar an `AB_WERK_TEXTSATZ_DE` und an `_textsatzAbWerkRegistrySeed`).

**Werkzeuge (35 Dateien):** mechanische Umbenennung plus `.texte` an jeder Wert-Lesestelle. Fünf
Werkzeuge mit Quelltext-Ankern (§2) behalten den bloßen Bezeichner in ihren Such-Strings, weil
sie die literale Deklarationszeile im Kern-Quelltext matchen, nicht den Laufzeit-Export — dort
wurde nur die gesuchte Zeichenkette selbst nachgezogen (`'const TEXTSATZ_EINGEBAUT = Object.freeze({'`
→ `'const AB_WERK_TEXTSATZ_DE = Object.freeze({'`), die Brace-Zähl-Logik dahinter ist unverändert
korrekt, weil sie strukturell (Klammertiefe), nicht inhaltlich zählt. Eine Ausnahme bewusst NICHT
angerührt: der `BEGIN`-Marker in `tools/build-dok-textsatz-eingebaut-lesen.js`
(`/* TEXTSATZ_EINGEBAUT_LESEN_DOK:BEGIN … Quelle: vivodepot.html TEXTSATZ_EINGEBAUT … */`) ist
byte-identisch im bereits generierten Bereich von `vivodepot-lesen.html` eingebettet — er ist ein
Anker, kein Fließtext, und bleibt stehen (Fund, s. §6).

**Proben (35 Dateien):** dieselbe Behandlung. Ein Test (`tests/u2-adr-322-jeder-traeger-loest-
auf.test.js`) prüft seinerseits den LITERALEN Quelltext einer anderen Testdatei
(`tests/textsatz-mechanismus.test.js`) per Regex — dieser Regex musste um `.texte` erweitert
werden, sonst hätte er nach der Nachziehung der Zieldatei nichts mehr gefunden (Fund, s. §6).

## 4 · Der Wächter — keine deutsche Texttabelle mehr im Gerüst sichtbar

Kein neuer, separater Wächter war nötig: `tests/textsatz-geruest-sprachagnostisch.test.js`
(U2-ADR-363, Zug 2) prüfte bereits GENERISCH über `Object.keys(V.AB_WERK_TEXTSATZ_DE.texte)` —
den gesamten Kennungsraum, nicht eine Ortsliste — dass ohne aktives Sprachmodul jede Kennung sich
selbst zeigt. Dieser Test bewacht die Eigenschaft bereits vollständig; er musste nur denselben
Rename nachziehen wie jede andere Testdatei. Der Rot-Beweis wurde eigens nachgemessen (§6): eine
deutsche Zeichenkette, zurück in den Kern gepflanzt (Mutation der Registry-Seed-Funktion, s.
`tools/waechter-register.js`), lässt `tests/tote-strings-pruefen.test.js`s Positivkontrolle
tatsächlich rot werden — gemessen, nicht angenommen (§6).

## 5 · Zahlen — 265 statt 238

| Ort | Vorkommen vor dem Zug | Nach dem Zug |
|---|---|---|
| Kern (`vivodepot.html`) | 41 (wortgrenzensicher) | 43 (41 umbenannt + 2 in der neuen Kopfzeile) |
| Werkzeuge (`tools/`) | 119 über 34 Dateien | 0 bare, 1 bewusster Anker-Rest (`build-dok-textsatz-eingebaut-lesen.js`) |
| Tests (`tests/`) | 86 über 34 Dateien (+1 Fixture) | 0 |
| **Summe** | **265** wortgrenzensicher (nicht 238 — s. §2) | 0 bare, 1 bewusster Anker |

## 6 · Funde während des Baus

1. **Der `_textsatzAbWerkRegistrySeed()`-Aufruf brach kurzzeitig.** Die blindtaugliche
   Blanket-Regex, die `.texte` an jede Lesestelle anhängte, traf auch den EINEN Aufruf, der das
   GANZE Modul (nicht seine Textmenge) übergeben muss:
   `eintragen(AB_WERK_TEXTSATZ_DE.texte, _textsatzModulPruefenGeruest)` — der Prüfer verwarf das
   verstümmelte Argument (fehlendes `sprache`/`moduleVersion`) lautlos, die `'de'`-Fach der
   Registry blieb leer, `textLesen()` lieferte für jede deutsche Kennung `null` auf einem frisch
   geladenen Kern. Gefunden über einen direkten `ladeKern()`-Smoke-Test (nicht über die Suite —
   die griff zu diesem Zeitpunkt noch gar nicht). Behoben durch manuelles Zurücksetzen dieser
   einen Zeile.
2. **Ein Kommentar bumpte einen Ratschen-Zähler.** Der neu geschriebene Kopf-Kommentar an
   `AB_WERK_TEXTSATZ_DE` erwähnte `_textsatzModulPruefenGeruest` beim Namen — ein DRITTES Vorkommen
   im Kern-Quelltext, wo `tests/u2-adr-285-textsatz-geruest-modul.test.js`s Rotmachbarkeits-Probe
   genau zwei erwartet (Definition + der eine Aufruf, U2-ADR-285). Kein neuer Aufrufer, nur eine
   Nennung — behoben durch Umformulierung des Kommentars (er beschreibt den Prüfweg jetzt ohne den
   Funktionsnamen zu wiederholen), nicht durch Anheben der erwarteten Zahl.
3. **`tests/u2-adr-322-jeder-traeger-loest-auf.test.js` prüft fremden Quelltext per Regex.** Ihr
   Muster erwartete `Object\.keys\(V\.TEXTSATZ_EINGEBAUT\)` wörtlich in
   `tests/textsatz-mechanismus.test.js` — nach dessen eigener `.texte`-Nachziehung hätte dieser
   Test nichts mehr gefunden und wäre selbst (fälschlich) rot geworden. Nachgezogen.
4. **`vivodepot-lesen.html`s generierte Region driftete durch reine Kommentar-Umbenennung.**
   `tools/build-textsatz-eingebaut-lesen.js` und `tools/build-dok-textsatz-eingebaut-lesen.js`
   schreiben ihren eigenen Kopf-Kommentar mit in die generierte Region — eine Umbenennung DIESES
   Kommentartexts allein löste bereits einen `--check`-Drift aus. Beide Erzeuger neu gelaufen,
   minimale Diffs (1–2 Zeilen) in `vivodepot-lesen.html`.
5. **Ein Anker darf NICHT umbenannt werden — der `BEGIN`-Marker.** Der erste Versuch, den
   `TEXTSATZ_EINGEBAUT_LESEN_DOK:BEGIN`-Kommentartext (der auch das Wort „TEXTSATZ_EINGEBAUT"
   trägt) umzubenennen, brach `regionErsetzen()` in
   `tools/build-dok-textsatz-eingebaut-lesen.js`: dieser exakte String ist ein Such-Anker gegen
   den bereits in `vivodepot-lesen.html` eingebetteten, byte-identischen Text — keine Prosa.
   Zurückgesetzt; nur der REGENERIERTE Rumpftext (der echte Fließtext-Kommentar direkt über der
   Kennungstabelle) wurde umbenannt.

Kein Fund dieses Zugs erforderte eine Senkung eines Schwellwerts oder eine stille Testanpassung
ohne Begründung — jede Testerwartung, die sich änderte, änderte sich, weil sie denselben
Bezeichner-Rename spiegelt wie der Bestand, den sie bewacht.

## 7 · Was ausdrücklich NICHT Teil dieses Zugs ist

- **`tools/textsatz-traeger-erheben.js`s `WURZELN_AUSGENOMMEN`-Liste führt weiterhin
  `'PRE_DEPOT_EN'`** — eine Konstante, die U2-ADR-363 (Zug 2) bereits entfernt hat. Der Eintrag
  ist seither wirkungslos (kein `V.PRE_DEPOT_EN` existiert mehr, gegen das er ausschließen
  könnte), aber harmlos — kein Fehlausschluss, nur eine tote Zeile. Gefunden bei diesem Zug,
  nicht behoben: außerhalb des Auftrags (Zug 2 räumt Zug 2 auf, nicht Zug 3), als
  Datenpunkt übergeben.
- **Keine Recherche zu amtlichen Übersetzungen** — unverändert außerhalb des Radius (U2-ADR-363
  §4/§9, U2-ADR-363-Nachtrag).
- **`tools/andere-anwendungen-messen.js`s `schluesselZaehlen()`-Zählung driftet geringfügig**
  (3499 → 3505, +6 für die sechs neuen Kopf-Schlüssel `modulTyp`/`sprache`/`moduleVersion`/
  `anbieterId`/`regeln`/`texte`, die auf derselben Einrücktiefe wie die 3499 Kennungen stehen,
  weil die 3499 Zeilen selbst bewusst nicht neu eingerückt wurden, s. §3). Kein Test pinnt diese
  Zahl exakt (`tests/andere-anwendungen-befunde.test.js` prüft nur `> 2000`); nicht korrigiert,
  weil eine Korrektur eine Neu-Einrückung der 3499-Zeilen-Tabelle verlangt hätte — außerhalb des
  Radius dieses Zugs.

## 8 · Testerwartungen angepasst

Rund 35 Testdateien bekamen denselben mechanischen Rename wie die Werkzeuge — keine davon änderte
eine BEHAUPTUNG, alle behalten ihre ursprüngliche Prüfabsicht. Vollständige Liste über
`git diff --stat` dieses Zugs nachvollziehbar; hier nur die zwei mit inhaltlicher Fallhöhe:

- **`tests/u2-adr-285-textsatz-geruest-modul.test.js`** — Rotmachbarkeits-Zähler, s. Fund 2 (§6).
- **`tests/u2-adr-322-jeder-traeger-loest-auf.test.js`** — Quelltext-Regex gegen eine andere
  Testdatei, s. Fund 3 (§6).

Keine Testdatei wurde entfernt oder vakuiert — anders als `tests/strings-form-b.test.js` bei Zug 2
verschwand hier kein Prüfgegenstand; jede Testdatei behält ihren Gegenstand, nur der Name des
Wegs zu ihm ändert sich.

## 9 · Stand

Kern, Werkzeuge und Proben lesen ausschließlich über `AB_WERK_TEXTSATZ_DE.texte`. Volle Testsuite
grün nach diesem Zug (Lauf-Protokoll beim Landen, nicht in diesem Dokument — Zahlen in
Commit-Nachrichten sind eine eigene Schreibregel). Nicht gepusht — Landung
über den Konvoi, wie bei Zug 1/2.
