# U2-ADR-357 · Die Lese-App zeigt die zwei Ab-Werk-Vorlagen übersetzbar — Geschwister zu 353, nicht Nachtrag zu 349

**Status heute:** gilt
**Datum:** 07.09.2026
**Betrifft:** `vivodepot-lesen.html` (`TEXTSATZ_EINGEBAUT_LESEN_DOK`,
`_textsatzKennungEingebautLesenDok`, `_logikModulTexteAufloesenLesen`, `logikModulAbschnitteHTML`),
`tools/build-dok-textsatz-eingebaut-lesen.js` (neu), `hooks/pre-commit`
**Voraussetzung:** U2-ADR-353 (Kern-seitige Kennungen der zwei Ab-Werk-Vorlagen)
**Abgesprochen mit:** `0b` (U2-ADR-349, derselbe Grund-Mechanismus für Sektor-/Feld-Beschriftungen)

---

## 1 · Der Befund

U2-ADR-353 gab den zwei Ab-Werk-Vorlagen (`erbschein-vorbereitung`,
`zugang-zum-recht-beratungshilfe`) im Kern Textsatz-Kennungen. Dort ausdrücklich offen gelassen:
die Lese-App führt für dieselben zwei Vorlagen eine **eigene, byte-gespiegelte
Interpreter-Kopie** (`LOGIK_BLOCK_HANDLER_LESEN`, `logikModulAbschnitteHTML`) — geprüft: **kein
eigenes `TEXTSATZ_EINGEBAUT` überhaupt** (0 Treffer). Die 57 Wortlaute blieben dort hartcodiertes
Deutsch, unabhängig davon, ob der Kern sie inzwischen übersetzbar macht.

**Dieselbe Fehlerklasse, die `0b` heute schon einmal fand** (55s Fund, U2-ADR-349): eine zweite
Wahrheit, die niemand pflegt. Und dieselbe Klasse wie die 41 zurückgehaltenen sensiblen Felder
(U2-ADR-347) — eine Kopie, bei der eine Eigenschaft nicht mitkommt, weil sie von Hand gepflegt
werden müsste.

## 2 · Warum ein eigenes ADR, kein Nachtrag zu 349

**Abgesprochen mit `0b`, wörtlich:** „Gleicher MECHANISMUS, aber eigenständiges Stück — nicht an
meine Tabelle andocken, sondern denselben Bauplan neu ausführen. Meine `TEXTSATZ_EINGEBAUT_LESEN`
zieht ausschließlich aus `V.SEKTOREN` … Deine Kennungen kommen aus einer ganz anderen
Kern-Struktur (den Dokumentmodulen/logikModul-Vorlagen) — meine Tabelle hat davon keine Ahnung
und sollte auch keine kriegen, sonst wird sie zur Sammelstelle für zwei unabhängige
Registrierungen, die nur zufällig in derselben Datei landen."

Zwei getrennte, generierte Tabellen mit je einem eigenen `_textsatzKennungEingebaut…`-Zweig sind
darum die richtige Form — nicht eine gemeinsame, wachsende Sammelstelle.

## 3 · Die Entscheidung — derselbe Bauplan wie U2-ADR-349, eigenständig ausgeführt

1. **Eigener Erzeuger** `tools/build-dok-textsatz-eingebaut-lesen.js` — zieht die Kennungen mit
   Präfix `dok:erbschein-vorbereitung`/`dok:zugang-zum-recht-beratungshilfe` aus
   `V.TEXTSATZ_EINGEBAUT` im Kern (`ladeKern()`), schreibt sie in eine eigene generierte Region
   (`TEXTSATZ_EINGEBAUT_LESEN_DOK`) in `vivodepot-lesen.html`. `--check`-Modus wie beim
   Geschwister-Werkzeug.
2. **Eigene generierte Region**, eigener Marker (`TEXTSATZ_EINGEBAUT_LESEN_DOK:BEGIN/END`),
   direkt nach der bestehenden `TEXTSATZ_EINGEBAUT_LESEN`-Region — ein Geschwister-Eintrag, kein
   Teil davon.
3. **`_textsatzKennungBekannt()` bekommt einen DRITTEN OR-Zweig**
   (`_textsatzKennungEingebautLesenDok`) neben dem bestehenden für Sektor-/Feld-Kennungen. Beide
   Zweige bestehen nebeneinander, keiner ersetzt den anderen.
4. **Der eigentliche Rendering-Fix sitzt in `logikModulAbschnitteHTML`**, nicht in
   `sektorHTML`/`feldZeileHTML` (das ist 0b's Ort, ein anderer Gegenstand). Neue Funktion
   `_logikModulTexteAufloesenLesen(logik)` — wörtlicher Spiegel von `_logikModulTexteAufloesen`
   im Kern (U2-ADR-353): löst `abschnitte[].titel`, `bloecke[].frage`/`.luecke`/`.texte[]` und
   `dokAusgabe.{h1,herkunftText}` über `textLesen(kennung) || Bundle-Text` auf, mutiert `logik`
   nicht. Nur `h1`/`herkunftText` aus `dokAusgabe` — `unterschriftErsatzHinweis`/`fussText`/
   `toolbarHinweis` werden von `logikModulAbschnitteHTML` gar nicht gelesen (nicht vorsorglich
   aufgelöst, was kein Konsument liest).
5. **`textLesen()` in der Lese-App hat keinen „eingebaut"-Fallback** (anders als im Kern) — liefert
   `null`, wenn kein Sprachmodul überschreibt. Der `||`-Rückfall auf den Bundle-Text übernimmt dann,
   wortgleich zum Kern-Verhalten, ohne dass die Lese-App eine zweite Werte-Tabelle bräuchte.
6. **`hooks/pre-commit`** bekommt einen Geschwister-Wächter (`--check` desselben neuen Erzeugers),
   direkt nach dem bestehenden für `TEXTSATZ_EINGEBAUT_LESEN`.

**KEIN PRÄZEDENZFALL für weitere `logikModule`** — dieselbe Auflage wie in U2-ADR-353: sobald ein
zweiter Fall auftritt, gehört ein generischer Läufer gebaut, nicht ein dritter lokaler Baustein.

## 4 · Die Prüfung, die zählt: trägt der Kanal, oder ist er nur gebaut?

**Ein registrierter Kennungsraum beweist nicht, dass eine fremde Sprache am Bildschirm ankommt —
das ist der Unterschied zwischen „der Kanal ist gebaut" und „er trägt" (07.09.2026).**
Darum keine Behauptung über den Mechanismus, sondern eine benannte End-zu-Ende-Probe gegen den
echten Ladeweg (`tests/load-lesen.js`), kein Suite-Lauf:

**Aufbau:** ein FR-Sprachmodul, geprüft über den echten Prüfer `textsatzModulPruefen` (nicht
selbst gebastelt), überschreibt drei `dok:`-Kennungen der erbschein-vorbereitung-Vorlage:
`dok:erbschein-vorbereitung#0.titel`, `dok:erbschein-vorbereitung#0/staatsangehoerigkeit.frage`,
`dok:erbschein-vorbereitung.h1`. Angemeldet über `_textsatzModuleAusDepotAnmelden` (denselben
Weg, den ein echtes Depot beim Öffnen nimmt), `data.textsprache = 'fr'` gesetzt. Anschließend
`logikModulAbschnitteHTML('vorsorge')` — dieselbe Funktion, die eine Bürgerin beim Öffnen des
Sektors sieht — gerendert und das HTML geprüft:

```
HTML enthält französischen Titel?   true   ("Partie A — TEST-FR-TITEL")
HTML enthält französische Frage?    true   ("TEST-FR-FRAGE?")
HTML enthält französisches H1?      true   ("TEST-FR-H1")
HTML enthält noch deutschen Titel?  false  ("Teil A — der Erbschein-Wegweiser" ist verschwunden)
```

**Das ist die Prüfung, die den Bau rechtfertigt:** nicht dass die Kennung im `hasOwnProperty`-Gate
steht, sondern dass ein Sprachmodul den Bundle-Text tatsächlich verdrängt, an derselben Stelle,
über denselben Weg wie im Betrieb. Ohne diese vierte Zeile (der deutsche Titel verschwindet
wirklich) wäre die Probe nur ein Beleg für Registrierung, nicht für Wirkung — genau die Lücke,
die U2-ADR-322 an anderer Stelle als „Ort besucht, aber das Label steht INLINE da" benennt.

## 5 · Regression

`tests/lese-app-zugang-zum-recht-auszug.test.js` + `tests/erbschein-ab-werk-einlass.test.js` +
`tests/zugang-zum-recht-ab-werk-einlass.test.js` — 19/19, unverändert grün (kein neuer, eigener
Test geschrieben — Kennungs-/Vokabular-Ergänzung plus Render-Fix, keine neue Fachlogik, die
eigene Proben verlangt hätte). Beide Generatoren (`build-textsatz-eingebaut-lesen.js`,
`build-dok-textsatz-eingebaut-lesen.js`) `--check`-rein — kein Drift zwischen Kern und Lese-App.

**Kein voller Suite-Lauf** (Gate-Disziplin, mehrere Sitzungen bauen parallel dieselbe Nacht,
Läufe werden einzeln freigegeben).

## 6 · Was ausdrücklich nicht gebaut wurde

Wie in U2-ADR-353: `format.praefix` (`"Testament, "`) bleibt inline — dieselbe Begründung, hier
nicht wiederholt.
