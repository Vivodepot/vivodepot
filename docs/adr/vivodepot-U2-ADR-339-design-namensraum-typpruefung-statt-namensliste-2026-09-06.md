# U2-ADR-339: Der Design-Namensraum bekommt eine Typprüfung statt einer Namensliste

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Betrifft:** `vivodepot.html` (`DESIGN_TOKEN_RESERVIERT`, `DESIGN_TOKEN_KATEGORIE`,
`designTokenWertGueltig`, `designModulPruefen`, `designTokenAnwenden`), `tests/load-kern.js`,
`tests/design-token-typpruefung.test.js`

- **Status heute:** gilt für die Prüf- und Anwendungsfunktionen. **Nicht Teil dieses Zugs:** ein
  Einlassweg (kein `EINLASS_REGISTER`-Slot, keine Persistenz) und die Sichtbarkeits-Zusicherung
  (ein Design darf eine Warnung nicht ausblenden) — beides eigene Entscheidungen.

---

## Der Auftrag

Zum Einfrieren des Gerüsts: *„maximal flexibel, auch was das Design betrifft — wenn
sich in 20 Jahren rausstellt, daß Design und UX gar nicht passen, muß das mit dem Gerüst anpaßbar
sein."* Zwanzig Jahre Design lassen sich nicht aufzählen. Eine Namensliste, die mit jedem neuen
Token wächst, ist darum die falsche Form — eingefroren wird ein **Mechanismus**, der die FORM eines
Wertes prüft, nicht seinen Namen aus einer festen Liste.

## Die Messung, vor dem Bau (06.09.2026)

Gemessen gegen den EINEN `:root`-Block im Kern (`vivodepot.html:66ff.`, klammerbalanciert
ermittelt, nicht gegen alle Vorkommen derselben Präfixe — andere Stufen wie weitere `--fs-*`/
`--space-*`/`--radius-*` sind lokal in einzelnen Selektoren deklariert, nicht global, sonst zählte
man Komponenten-Detail als Design-Token):

```
73  global deklarierte Tokens in :root
 4  kern-berechnet, trotz statischem :root-Fallback   -> bleiben reserviert
69  nur gelesen, statisch                             -> Kandidaten
```

**Die vier kern-berechneten Tokens** überschreiben ihren `:root`-Fallback zur Laufzeit mit einer
Zusicherung (Kontrastformel bzw. Sub-Depot-Ableitung), nicht mit einem Startwert:

```
--akzent          MODUS_DEF[modus].akzent / Sub-Depot-Basis (setzeSubDepotAkzent)
--akzent-papier   'var(--' + tok + '-papier-linie)' — berechnete Referenz
--vm-chrome       Sub-Depot-Akzentbasis
--vm-chrome-text  subDepotTextFarbe(tok) — AA-Kontrastfunktion
```

**Fünf weitere Tokens existieren NUR zur Laufzeit, ohne `:root`-Fallback** — eine Erlaubnisliste,
die nur `:root` abgeht, hätte sie übersehen, und ein Modul hätte einen Namen „erfolgreich" gesetzt
bekommen, der zur Laufzeit nie ankommt (derselbe `setProperty`-Aufruf aus `setzeSubDepotAkzent`
bzw. `_brandingProduktTopbarAnwenden` gewinnt immer):

```
--vm-chrome-mid · --vm-chrome-tief · --vm-akzent-stark · --vm-linie
--vd-branding-topbar-text
```

`--vd-branding-topbar-text` ist zusätzlich die Bauform, an der sich diese Typprüfung orientiert:
`_brandingTopbarKontrastText()` **weist ab**, statt einen Kandidaten unter dem WCAG-AA-Maß
durchzulassen. Bei einer reinen Formprüfung (ist es ein gültiger Hex-Wert?) reicht das für eine
Kontrast-Zusicherung nicht — das Ergebnis muss stimmen, nicht nur die Form. Darum ist dieser Name
selbst reserviert, statt ihm eine laxere Form-Prüfung zu geben.

**Die fünf Branding-eigenen CSS-Variablen** (`--vd-branding-primaer/-sekundaer/-schriftart/
-topbar-primaer/-topbar-sekundaer`) sind ebenfalls reserviert — nicht berechnet, aber mit einem
eigenen Schreibweg und eigener Prüfung (`brandingModulPruefen`/`brandingAnwenden`, drei
Eingabefelder, die auf fünf CSS-Variablen auffächern). Ein zweiter Weg für dieselbe Variable wäre
der „zweite Motor daneben", den U2-ADR-146 §6 ablehnt.

**Die vier Zustandsklassen** (`klartext-warn`/`herkunft-marke`/`stand-marke`/`vorlage-marke`) sind
KEIN Teil dieser Liste. Sie stehen nicht im Kern, sondern in der Lese-App
(`vivodepot-lesen.html`), mit einem eigenen, unabhängigen `:root`. Geprüft: die Lese-App liest
weder `--vd-branding-*` noch ruft sie `brandingAnwenden` — heute existiert kein Kanal, über den ein
hier gesetzter Token dorthin durchschlägt. Beleg, keine Behauptung: entsteht künftig eine
Übertragung von Kern-Tokens in die Lese-App, ist diese Prüfung zu wiederholen.

## Was gebaut ist

```js
const DESIGN_TOKEN_RESERVIERT = Object.freeze([ /* 14 Namen, s. oben */ ]);
const DESIGN_TOKEN_KATEGORIE = Object.freeze({ /* 69 Namen -> 'farbe'|'laenge'|'schrift'|'schatten' */ });
```

Vier Kategorien, nicht drei — **Schatten** kam beim Bauen dazu (`--shadow-soft/-medium/-strong`
sind keine der drei ursprünglich genannten Formen):

```
farbe     58   #rrggbb, dieselbe Form wie farbePrimaer (_BRANDING_HEX_MUSTER, 6-stellig)
laenge     6   Zahl + px|rem|em
schrift    2   nicht-leer, getrimmt, ≤100 Zeichen — dieselbe Grenze wie schriftart
schatten   3   2-3 Längen (führendes „0" ohne Einheit erlaubt) + rgb(a)(...)
zahl       0   heute kein Kandidat, Kategorie besteht für künftige Tokens (Gewicht, Zeilenhöhe)
```

**Fünf Kern-Tokens tragen 3-stellige Hex-Kurzformen** (`--dok-schrift` u. a. = `#111`). Die
Farbprüfung bleibt trotzdem 6-stellig — ein zweites Farbmuster nur für diese fünf wäre wieder ein
zweiter Motor. Ein Modul, das `--dok-schrift` setzen will, schreibt `#111111` statt `#111` —
funktional identisch, formal eindeutig.

```js
function designModulPruefen(modul) { /* { tokens: {'--name': wert} } -> { gueltig, tokens, verworfene } */ }
function designTokenAnwenden(tokens, root) { /* setzt/entfernt jeden Token aus DESIGN_TOKEN_KATEGORIE */ }
```

**Die Regel, symmetrisch für alle drei Ablehnungsgründe** (reserviert, unbekannt, ungültige Form):
ein verworfener Eintrag kostet nur sich selbst, benannt gemeldet — nicht das ganze Modul. Erst wenn
KEIN Eintrag gültig bleibt, ist das Modul selbst ungültig (`grund: 'nichts-gueltiges-gesetzt'`,
dieselbe Form wie `brandingModulPruefen`).

## Der Fehler, den der erste eigene Testlauf fing

Die erste Fassung von `_DESIGN_TOKEN_SCHATTEN_MUSTER` verlangte `px` an JEDER der 2-3
Längen-Stellen. Die drei eingebauten `--shadow-*`-Werte selbst (`0 1px 2px rgba(...)`) beginnen
aber mit einer einheitslosen `0` — gültiges CSS, von der eigenen Formprüfung abgewiesen. Ein
Rot-Beweis, der die eigenen Kern-Werte gegen die eigene Prüfung hält
(`[ADR-339·Positivkontrolle]`), fing das vor dem Melden, nicht danach.

## Der zweite Fehler: eine blinde Zahlen-Ersetzung über die ganze Datei — eine Lehre über das
Werkzeug, nicht über diesen Zug

Die ADR-Nummer musste während dieses Zugs umziehen (335 → 339, weil 335 zwischenzeitlich anderweitig
vergeben wurde). Die Reparatur lief zunächst als `sed -i 's/335/339/g'` über die gesamte
`vivodepot.html`. Ein `grep` davor und danach zeigte je null bzw. die erwarteten Treffer — sauber,
schien es.

**War es nicht.** `vivodepot.html` trägt eingebettete Drittinhalte (SVG-Icons, die minifizierte
`jspdf`-Bibliothek), in denen „335" als reiner Teilstring einer Zahl vorkommt, ohne jeden Bezug zu
einer ADR-Nummer. Der blinde Ersatz traf sieben solcher Stellen:

```
4x  SVG-Pfaddaten (Logo/Icon-Koordinaten)     z. B. 38.335  -> 38.339
3x  jspdf, minifiziert (MD5-Rundenkonstanten) z. B. -660478335 -> -660478339
                                                     1272893353 -> 1272893393
                                                     1873313359 -> 1873313399
```

**Gefangen hat es einzig `tests/sbom-pflegen.test.js`** (die Positivkontrolle „echte `vivodepot.html`
+ echte SBOM: keine Drift"), weil sie den `jspdf`-Skriptinhalt gegen einen zuvor festgehaltenen Hash
hält. Kein anderer Test hätte es bemerkt — `jspdf` wird im Kern funktional nicht geprüft, nur
referenziert. Die vier SVG-Treffer hätte **gar kein** automatischer Test gefangen (reines
Render-Detail eines Icons).

**Der Satz dahinter:** In einer Datei mit eingebetteten Fremdinhalten ist eine Zahl kein Bezeichner,
sondern ein Teilstring. Ein `grep` vor und nach einer Ersetzung prüft dieselbe blinde Textebene wie
die Ersetzung selbst — er kann diese Klasse von Fehler strukturell nicht sehen.

**Die Reparatur lief darum NICHT als zweiter Blind-Ersatz** (das hätte dieselbe Fehlerklasse nur
wiederholt), sondern als sieben einzelne, kontextgebundene Korrekturen: jede Fundstelle mit ihrer
vollen, im gesamten Datei eindeutigen Umgebung wieder auf ihren Original-Wert gesetzt, danach der
`jspdf`-Skriptinhalt Byte-für-Byte gegen den Kanon verglichen (identisch) und `sbom-pflegen --check`
grün.

**Für künftige Nummern-Umzüge in diesem Repo:** eine Zahl niemals blind über `vivodepot.html`
ersetzen. Entweder die Fundstellen einzeln mit Kontext ersetzen (wie hier, im Nachhinein), oder —
richtiger — von vornherein nur an den tatsächlich beabsichtigten Stellen schreiben, statt eine
Ersetzung über die ganze Datei laufen zu lassen und dem `grep` danach zu vertrauen.

## Konformität

```yaml
konformitaet:
  - aussage: >-
      Ein reservierter Name wird benannt verworfen; ein gültiger Name im selben Modul trägt
      unverändert weiter.
    zustand: erfuellt
    herkunft: U2-ADR-339 (06.09.2026)
    pruefung:
      - tests/design-token-typpruefung.test.js
        "[ADR-339·Rot-Beweis] ein reservierter Name wird benannt verworfen, ein gültiger daneben trägt weiter"

  - aussage: >-
      Ein Wert falscher Form (z. B. eine Farbe ohne #) wird benannt verworfen, nicht das ganze
      Modul.
    zustand: erfuellt
    herkunft: U2-ADR-339 (06.09.2026)
    pruefung:
      - tests/design-token-typpruefung.test.js
        "[ADR-339·Rot-Beweis] eine Farbe ohne # wird benannt verworfen"

  - aussage: >-
      Ein gültiger neuer Name in gültiger Form wird angenommen UND wirksam — als echte
      CSS-Custom-Property, nicht nur als geprüfter Wert ohne Wirkung.
    zustand: erfuellt
    herkunft: U2-ADR-339 (06.09.2026)
    pruefung:
      - tests/design-token-typpruefung.test.js
        "[ADR-339·Rot-Beweis] ein gültiger Name in gültiger Form wird angenommen und wirkt als CSS-Custom-Property"

  - aussage: >-
      Die vier kern-berechneten und die fünf reinen Laufzeit-Tokens sind reserviert, obwohl
      letztere nicht in der 73er-Zählung von :root stehen.
    zustand: erfuellt
    herkunft: U2-ADR-339 (06.09.2026), Messung vor dem Bau
    pruefung:
      - tests/design-token-typpruefung.test.js
        "[ADR-339] die vier kern-berechneten Tokens stehen auf der Reserviert-Liste"
      - tests/design-token-typpruefung.test.js
        "[ADR-339] die fünf reinen Laufzeit-Tokens ohne :root-Fallback sind reserviert"

  - aussage: >-
      Die drei eingebauten Schatten-Werte bestehen ihre eigene Formprüfung — die Kategorie ist
      nicht enger als der Kern selbst.
    zustand: erfuellt
    herkunft: U2-ADR-339 (06.09.2026)
    pruefung:
      - tests/design-token-typpruefung.test.js
        "[ADR-339·Positivkontrolle] die drei eingebauten Schatten-Werte bestehen ihre eigene Formprüfung"

  - aussage: >-
      designTokenAnwenden nimmt einen zuvor gesetzten Token zurück, sobald ein neuer Aufruf ihn
      nicht mehr nennt (Modul-Wechsel/-Entfernung räumt vollständig ab).
    zustand: erfuellt
    herkunft: U2-ADR-339 (06.09.2026)
    pruefung:
      - tests/design-token-typpruefung.test.js
        "[ADR-339] designTokenAnwenden setzt nur bekannte Tokens und räumt vorherige beim Wechsel ab"
```

## Offene Stelle, benannt: Design erreicht den Empfänger nicht

Der Beleg aus der Messung oben hat eine Rückseite. **Wenn die Lese-App weder `--vd-branding-*`
liest noch `brandingAnwenden` ruft, kann ein Design-Modul die Lese-App heute GAR NICHT erreichen —
auch nicht über den hier gebauten Mechanismus.** Die Lese-App ist die Sicht, die ein Fremder
(Empfänger, Behörde, Angehörige) auf das Depot bekommt. **„Design ist andockbar" gilt damit heute
nur für die Hälfte der Anwendung** — die Seite, die die Bürgerin selbst sieht, nicht die Seite, die
sie versendet.

Das ist **kein Mangel dieses Zugs** (der Auftrag war die Typprüfung im Kern, kein Übertragungsweg
zur Lese-App) und **keine Lücke, die dieser Zug schließen sollte** — sondern ein benannter,
bewusst offen gelassener Anschluss für einen künftigen Zug: ein Kanal, der ein geprüftes
`tokens`-Objekt (oder die fünf Branding-Felder) in die Lese-App trägt, dort ebenso über
`designTokenAnwenden`-artige Anwendung, mit derselben Reserviert-/Kategorie-Prüfung.

## Was dieser Zug NICHT tut

- **Er verdrahtet keinen Einlassweg.** Kein `EINLASS_REGISTER`-Slot, keine Persistenz, kein
  Verhältnis zu `BRANDING_MODUL` festgelegt (eigenes Feld am selben Modul? eigenes Modul?). Das ist
  eine eigene Entscheidung mit eigenem Feldnamen und Speicherschema-Bezug.
- **Er trägt Design-Tokens nicht zur Lese-App** — s. „Offene Stelle" oben.
- **Er baut keine Sichtbarkeits-Zusicherung.** Ob ein Design-Token indirekt eine der vier
  Zustandsklassen in der Lese-App verdecken könnte, ist erst zu prüfen, sobald ein Kanal zwischen
  Kern und Lese-App für diese Tokens existiert (heute: keiner, s. o.) — und ist ohnehin ein
  eigener Zug (`cb`s Selektor-Vertrag).
- **Er ändert nichts an `BRANDING_MODUL_SCHLUESSEL`.** `farbePrimaer`/`farbeSekundaer`/
  `schriftart` bleiben unverändert der einzige heutige Weg zu den fünf Branding-Variablen.
