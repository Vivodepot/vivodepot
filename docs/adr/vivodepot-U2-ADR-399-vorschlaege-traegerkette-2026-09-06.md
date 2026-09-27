# U2-ADR-399: `feld.<feldId>.vorschlaege` nimmt die Trägerkette auf — gemessen, nicht blind übernommen

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Betrifft:** `vivodepot.html` (`_vorschlaegeTextsatz`, `feldInputHTML`, `listenEintragInputsHTML`,
TEXTSATZ_EINGEBAUT), `tools/buergermodul-schnitt.js`, `tools/textsatz-en-vollabdeckung-daten.js`

- **Status heute:** gilt — Beleg `tests/textsatz-vorschlaege-traegerkette-u2-adr-399.test.js`
  (fünf Proben, zwei Rot-Beweise gegen den echten Konsumenten bzw. den echten Docking-Weg),
  Rückwärts-Kompatibilität und Erreichbarkeit in den bestehenden Suiten nachgezogen.

---

## Der Befund, zweimal an verschiedenen Stellen gemessen

U2-ADR-318 maß am Nachmittag desselben Tages, dass `feld.art.vorschlaege` vom echten Einlassweg
(`textsatzModulPruefen`) verworfen wird — eine bereits bestehende, benannte Lücke. Der
Kommentar an `_vorschlaegeTextsatz` (Korrektur vom selben Tag, U2-ADR-291) hatte den Grund
bereits benannt, aber die Form bewusst offengelassen: *„Ob die Form die Trägerkette aufnimmt, ist
eine Kern-Entscheidung und ausdrücklich offen."*

**Beide Funde laufen auf dieselbe Ursache zurück:** `art` ist eine von 17 katalogweit doppelt
vergebenen UnterFeld-IDs (`meine-menschen/unterhalt/art` — Unterhaltsarten,
`finanzen/konten/art` — Kontoarten), mit zwei echten, verschiedenen `vorschlaege`-Arrays. Die
Kennungsform `feld.<feldId>.vorschlaege` setzt katalogweite Eindeutigkeit voraus — eine Annahme,
die für Top-Level-Felder stimmt (266 Felder, 0 Dubletten) und für UnterFelder nicht (182 Felder,
17 Dubletten).

## Die Entscheidung

**Die Kennung nimmt die Trägerkette auf, wortgleich zur bestehenden Form:** `textKennung`/
`optionKennung` bilden UnterFeld-Kennungen bereits als `<sektorId>.<traeger>/<feldId>.<rolle>`.
`feld.vorschlaege` lebt im GLOBALEN Namensraum (ohne sektorId, weil ein Situationsfeld — z. B.
`vj_versicherungen` — keine feste sektorId hat, gemessen unten). Die neue Form ersetzt darum nur
den sektorId-Teil durch nichts, behält aber die Trägerkette: `feld.<traeger>/<feldId>.vorschlaege`.
Träger-IDs sind selbst Top-Level-Feld-IDs und damit katalogweit eindeutig — die Kette allein
reicht zur Unterscheidung.

**Gemessen statt übernommen — die Situationen brauchen KEINE eigene Form.** Der Auftrag verwies
auf U2-ADR-307 (Rechtsraum-Überlagerung), die zwei Kennungsformen führt (`<sektorId>.<feldId>` und
`situation:<sitId>.<feldId>`), weil Situationen einen eigenen Kennungsraum haben. Gemessen: genau
ein `vorschlaege`-Feld liegt in einer Situation (`vj_versicherungen`, Situation `volljaehrig`) —
es ist ein Top-Level-Feld ohne Träger und ohne Kollision. Die `situation:`-Form wäre hier
ungebraucht gewesen; sie wurde darum NICHT gebaut.

**Nur wo eine ID wirklich kollidiert — nicht blind für jedes UnterFeld.** Vier bestehende
UnterFeld-Kennungen (`laender`, `fach`, `betreuungsmodell`, `vorgangstyp`) sind katalogweit
mehrfach vergeben, aber ohne eine zweite ECHTE `vorschlaege`-Liste — sie behalten die alte,
sektorId-lose Form unverändert. `feldSchneiden` (verarbeitet ein Feld nach dem anderen) kann das
nicht selbst entscheiden; die Zuweisung wandert darum in eine neue Funktion,
`vorschlaegeKennungenZuweisen`, die erst NACH dem vollständigen Durchlauf über den gesamten
Katalog entscheidet: eine Feld-ID mit genau einem Vorkommen behält die flache Form, mit mehreren
Vorkommen bekommt JEDES die Trägerkette.

**Rückwärts-Kompatibilität ist keine Bequemlichkeit, sondern eine Auflage:** `_vorschlaegeTextsatz`
versucht die trägerqualifizierte Kennung zuerst (wenn ein Träger übergeben wird) und fällt auf die
alte, flache Form zurück, wenn jene nicht im Satz steht. Keine der 3196 (jetzt 3198) Kennungen des
EN-Moduls wird ungültig oder umbenannt.

## Was geändert wurde

- `_vorschlaegeTextsatz(feldId, rueckfall, traeger)` — neuer, optionaler dritter Parameter.
- `feldInputHTML(feld, roh, traeger)` — reicht den Träger durch, den `listenEintragInputsHTML`
  bereits kennt (die Carrier-Feld-ID der Liste, deren Zeile gerade gerendert wird).
- `TEXTSATZ_EINGEBAUT` — zwei neue Einträge (`feld.unterhalt/art.vorschlaege`,
  `feld.konten/art.vorschlaege`), die alte, mehrdeutige `feld.art.vorschlaege` existierte nie
  (sie war die benannte Lücke) und bleibt weiter ungenutzt.
- `tools/buergermodul-schnitt.js`: `feldSchneiden` sammelt `vorschlaege`-Kandidaten
  (`{feldId, traeger, wert}`) statt sofort zu schlüsseln; `vorschlaegeKennungenZuweisen` (neu)
  entscheidet danach je Feld-ID gegen den ganzen Katalog.
- `tools/textsatz-en-vollabdeckung-daten.js` + `tools/textsatz-en-modul.json` (neu erzeugt) —
  zwei neue EN-Übersetzungen, gleiche Reihenfolge und Anzahl der Einträge wie im Original.
- `tests/buergermodul-schnitt.test.js`: `BEKANNTE_LUECKEN` ist jetzt eine leere Ratsche (der
  Fund ist behoben, nicht die Probe entschärft).
- `tests/textsatz-mechanismus.test.js`: der Erreichbarkeits-Wächter sagt jetzt dieselbe
  Präferenz voraus wie der echte Konsument (trägerqualifiziert zuerst, sonst flach) — sonst
  hätte er die beiden neu aufgelösten Kennungen als tot gemeldet.
- `tests/textsatz-en-modul-erzeugen.test.js`: 3196 → 3198, gegen `baueModul()` nachgerechnet.
- `tests/erzeuger-deckung-sprache-rechtsraum-marke.test.js` (U2-ADR-318): `SPRACHE_BEKANNTE_LUECKEN`
  ist jetzt leer — derselbe Fund, von derselben Probe als behoben erkannt.

## Was bewiesen ist

```
unterhalt/art und konten/art tragen verschiedene, echte Listen am nativen Bestand
ROT   ein angedocktes Modul überschreibt NUR unterhalt/art (textsatzModulPruefen, direkt)
ROT   dasselbe über den echten Docking-Weg (modulEinlassen), live gelesen — konten/art bleibt nativ
Rückwärts-Kompatibilität: laender/fach/betreuungsmodell/vorgangstyp behalten die alte Form
die zwei neuen Kennungen stehen im Satz, die alte, mehrdeutige nicht
```

Der zweite Rot-Beweis lief zunächst gegen einen falschen Zwischenstand: `_vorschlaegeTextsatz`
liest `textLesen` bei jedem Aufruf frisch, aber der andockbare Sprachwechsel selbst braucht einen
zweiten Schritt — `_textsatzModuleAusDepotAnmelden(getData())` registriert das eben eingelassene
Modul erst in `_TEXTSATZ_MODUL_REGISTRY`; ein bloßes Setzen von `getData().textsprache` reicht
nicht. Am eigenen Fehlschlag gemessen, nicht angenommen: die erste Fassung der Probe scheiterte
genau daran und wurde korrigiert, bevor sie grün gemeldet wurde.

## Was ausdrücklich NICHT dazugehört

**Die übrigen 16 doppelt vergebenen UnterFeld-IDs.** Nur `art` trägt heute zwei ECHTE,
verschiedene `vorschlaege`-Listen — die Mechanik (`vorschlaegeKennungenZuweisen`) wirkt für jede
künftige Kollision gleichermaßen, ohne dass eine Liste gepflegt werden müsste.

**Eine Migration bestehender Sprachmodule.** Es gibt keine, die die alte `feld.art.vorschlaege`
je getragen hätte — sie war nie gültig, es gibt nichts zu migrieren.

*Vivodepot GmbH · Berlin · 06.09.2026*

---

## Nachtrag (15.09.2026) — die Kollision ist durch die Kennungs-Umbenennung aufgelöst

Der Fall dieses ADR — `art` als UnterFeld-ID an `unterhalt` und `konten` mit zwei verschiedenen
Vorschlagslisten — besteht nicht mehr. Die Kennungs-Kampagne (Umbauplan „Englisch vor v1") hat
die beiden Unterfelder verschieden benannt: `people.maintenanceObligationsAnd/type` und
`finance.accounts/accountType` (`docs/umbau-englisch-vor-v1/kennung-mapping.json`). Der eingebaute
Satz trägt beide Listen flach (`feld.type.vorschlaege`, `feld.accountType.vorschlaege`); ein
Trägerketten-Schlüssel kommt darin nicht mehr vor.

Die Entscheidung bleibt gültig, der Mechanismus bleibt im Kern (`_vorschlaegeTextsatz` mit
`traeger`). Er hat heute nur keinen Fall. Die Proben belegen jetzt den aufgelösten Zustand und
schlagen an, sobald wieder eine UnterFeld-ID mit Vorschlägen an mehreren Feldern steht.

**Weg zum Nachsehen:** `node --test tests/textsatz-vorschlaege-traegerkette-u2-adr-399.test.js`
(Probe `[Trägerkette·aufgelöst·Wächter]`).
