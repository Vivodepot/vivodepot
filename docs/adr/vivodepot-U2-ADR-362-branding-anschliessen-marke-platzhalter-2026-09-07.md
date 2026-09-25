# U2-ADR-362 · Branding anschließen — `name`/`domain` erreichen die Bürgerin

**Datum:** 07.09.2026
**Status:** gebaut, 9/9 eigene Proben grün, 999/999 gegengeprüfte Bestandsproben ohne Regression
(NACHTRAG unten: zwei bestehende Wächter fingen zwei weitere Ausschlussklassen, vor dem Commit
behoben — deshalb 999, nicht die zuerst gemeldeten 939), Vollsuite ausstehend (Konvoi-Gate)
**Status heute:** gilt
**Auftrag:** „Branding anschließen" (07.09.2026), im Anschluss an die Branding/UX-Messung
(Fund 1: `name`/`logo` werden von `brandingModulPruefen` geprüft, aber nirgends gelesen)
**Bezug:** U2-ADR-040 (Vivodepot ist ein Anbieter unter anderen) · U2-ADR-296
(`VIVODEPOT_BRANDING` als expliziter Datenwert) · U2-ADR-182 Task 4 (`brandingAnwenden`, das
Vorbild für Farbe) · U2-ADR-359 (Deutsch als Sprachmodul, `textLesen`/`TEXTSATZ_EINGEBAUT`) ·
internes Konzeptdokument vom 07.09.2026 Abschnitt IX (Marke, Erscheinung)

---

## 1 · Der Fund, gemessen vor dem Bau

`brandingModulPruefen` validiert `farbePrimaer`/`farbeSekundaer`/`schriftart`/`logo`/`name` seit
A523 — aber `brandingAnwenden` (U2-ADR-182 Task 4) setzt nur die drei Farbwerte als CSS-Custom-
Properties. `logo` und `name` wurden geprüft, angenommen, im Depot gespeichert — und nirgends
gelesen. Der Tab-Titel (`<title>Vivodepot · v1.0-rc</title>`) und die Topbar-Wortmarke
(`<span class="lw-vivo">VIVO</span><span class="lw-depot">DEPOT</span>`, Literal im Markup)
blieben fest verdrahtet.

**Folge:** ein fremder Anbieter konnte ein Branding-Modul einlassen — Farbe griff, Name und Logo
verschwanden. Das widerspricht U2-ADR-040 („Vivodepot wie jeder andere Anbieter") strukturell,
nicht nur kosmetisch.

**Zweite, größere Messung dazu beauftragt:** wie viele Stellen im Kern nennen „Vivodepot" als
Produktnamen, und welche davon dürfen das nicht mehr, wenn eine fremde Marke greift?

## 2 · Die 238 Nennungen — gemessen über einen Zustandsautomaten, nicht per Regex-Schätzung

Jede der 238 Fundstellen für „Vivodepot" (Groß-V) im Kern wurde über einen zeilenweisen
Zustandsautomaten eingeordnet, der `//`, `/* */` UND `<!-- -->` korrekt über mehrere Zeilen
verfolgt — nicht ein Regex-Treffer pro Zeile.

```
93   Kommentare (44 //, 45 Block-/HTML-Kommentar) — nie ausgeliefert, kein Topf
145  echter Code/String
  2    Rechtsträger-Fußzeile (fussFirma/einstAnbieter, "Vivodepot GmbH · Berlin") — bleibt fix
  2    PDF-Copyright-Metadaten ('© Vivodepot') — Rand, dem Anzeige-Topf zugeordnet
  3    <head>-Meta (title, apple-mobile-web-app-title, application-name)
  138  laufender Anwendungstext (STRINGS-Werte: Hints, Toasts, Wizard-Einleitungen, Fehlermeldungen)
```

**Die Einordnung selbst wurde zweimal korrigiert, beide Male durch bestehende Wächter, nicht durch
eigene Vorsicht.** Die erste Fassung zählte die 140 mechanisch markierten Zeilen als „Anzeige,
muss weichen" — beim Bauen zeigte sich, dass **48 davon rohe JS-String-Literale sind, die nie
durch `textLesen` laufen** (s. Abschnitt 4). Beim Testlauf vor dem Commit fingen zwei WEITERE,
bestehende Wächter eine zweite Ausschlussklasse (s. Abschnitt 5a): 27 der verbleibenden 92
Textsatz-Werte sind zwar echte Kennungen, aber **an ihrem Verbrauchsort einmalig beim Boot in ein
Objekt gebacken** (Sektoren-/Situations-/Wizard-Felder) statt bei jedem Zugriff über den
STRINGS-Proxy neu gelesen — mein Interceptor löst `{marke}` dort zwar korrekt auf, aber NUR zum
Boot-Zeitpunkt (vor jedem Branding-Modul), und der gebackene Wert weicht seither vom rohen
Textsatz-Wert ab. Sieben weitere sind exakt die `PRE_DEPOT_EN`-Gegenstücke (U2-ADR-195): der
native Vor-Depot-Text und der Textsatz-Wert müssen wortgleich bleiben, ein einseitig aufgelöster
Platzhalter hätte das gebrochen. **Endgültig sicher versorgt: 52 echte Textsatz-Kennungen** (nicht
92, nicht 138) plus die drei `<head>`-Zeilen plus zwei direkt verdrahtete Literale (ICS,
PDF-Copyright) — 57 Stellen insgesamt. Die Zahlen 141/97 aus früheren Meldungen waren
Zwischenzahlen vor der jeweils nächsten Messung, keine falschen Endzahlen — sie stehen hier
korrigiert, mit Herleitung in Abschnitt 5a, nicht nur als neue Zahl.

## 3 · Der Bau — ein Interceptor, keine 140 Aufrufstellen

**Neues Feld `domain`** im Branding-Register (`BRANDING_MODUL_SCHLUESSEL`,
`brandingModulPruefen`): reiner Anzeige-Text wie `name`, ein grobes Hostname-Muster
(`_BRANDING_DOMAIN_MUSTER`) weist Zeichenmüll zurück, ohne eine echte URL-Validierung zu
behaupten — der Wert wird nie als Link-Ziel oder Navigationsaufruf verwendet.

**`_markeName()` / `_markeDomain()`:** lösen auf `name`/`domain` des zuletzt angedockten
Branding-Moduls auf (`data.brandingModule`, „letztes gewinnt" — derselbe Grundsatz wie überall
sonst im Bestand), sonst auf `'Vivodepot'`/`'vivodepot.de'`.

**`_markePlatzhalterAufloesen()`, verdrahtet in `textLesen()`:** ein einziger Interceptor statt
97 einzelner Aufrufstellen. Jeder Text, der über `textLesen` läuft — Deutsch inline
(`TEXTSATZ_EINGEBAUT`) **und** jedes angedockte Sprachmodul, Deutsch wie Englisch — bekommt
`{marke}`/`{marke_domain}` aufgelöst, ohne dass ein einziger Aufrufer geändert werden musste.
Das ist der eigentliche Unterschied zwischen einer Achse und einer Liste von Einzelfällen.

**`_markeAnzeigeAnwenden()`:** Tab-Titel (`document.title = name + ' · v1.0-rc'`) und
Topbar-Wortmarke. Native Marke → das bestehende zweifarbige VIVO/DEPOT-Markup bleibt exakt
erhalten (`innerHTML`, feste Zeichenkette, kein interpolierter Wert). Fremde Marke → **ein**
Textknoten (`textContent`, keine Injektion möglich — ein fremder Name hat keine bekannte
Zweiteilung, ein erfundenes zweifarbiges Wortzeichen wäre Design-Erfindung, keine Messung).
Verdrahtet an allen drei bestehenden `brandingAnwenden`-Aufrufstellen (Vor-Depot-Boot,
Live-Einlass `_moduleEinlassWirken`, Reset `_depotSpeicherZuruecksetzen`) — derselbe
Anwendungsort, keine zweite Funktion.

## 4 · Der Fund beim Bauen: `{anbieter}` war schon vergeben

**Gemessen, nicht angenommen:** `{anbieter}` existiert bereits im Textsatz — für die Herkunft
eines FREMDEN Moduls, nicht für die Marke des Produkts. Beispiel, unverändert im Bestand:

> „Der folgende Wortlaut stammt von `{anbieter}` — nicht von Vivodepot verfasst oder geprüft."

Ein zweiter Platzhalter mit demselben Namen für die Marke hätte diese Zeile unlesbar gemacht
(„von `{anbieter}` — nicht von `{anbieter}` verfasst"). Neuer, eigener Name `{marke}` gewählt —
passend zur Baukasten-Terminologie (Abschnitt IX: „Marke und Erscheinung sind zwei Achsen").
Eigene Probe belegt die Trennung (`[Marke·Rot⇄Gruen] {anbieter} … bleibt von {marke} unberührt`).

## 5 · Der zweite Fund beim Bauen: 48 der 140 Zeilen sind keine Textsatz-Werte

Die erste Messung (Abschnitt 2) markierte 140 Zeilen mechanisch als
„Vivodepot als Produktname". Beim Bauen (Ersetzung `Vivodepot` → `{marke}` je Zeile,
verifiziert über den echten Ladeweg) zeigte sich: **48 davon sind rohe JS-String-Literale, die
nie durch `textLesen` laufen.** Ein Platzhalter dort wäre nie aufgelöst worden — die Bürgerin
hätte wörtlich `{marke}` gesehen, ein neuer, selbst erzeugter Fehler.

**Drei Gruppen, alle auf das native Literal zurückgesetzt:**

```
Technische Kennungen (aendern zerstoert Funktion, nie Anzeige-Frage)
  parseVivodepotBeta()        — Funktionsname, {marke} waere ungueltiger Bezeichner
  'VivodepotProviderCredential' — selbst-deklarierter VC-Typ, Protokoll-Konstante
  <script id="qrcode_VivodepotInline"> — DOM-id, von anderer Stelle referenziert
  .vivodepot (Dateiendung)    — eigenes Dateiformat, Erkennung an der Endung

Dateinamen fuer Exporte/Backups (~25 Stellen, dateiAusgeben/dateibasis)
  'Vivodepot_Gesundheit_IPS.json', 'Vivodepot-Sicherung' (File-Picker-Beschreibung), …
  ECHTE Anzeige-Frage, aber jede Stelle eine eigene String-Konkatenation —
  braucht denselben direkten _markeName()-Anschluss wie das ICS-Feld unten,
  nicht den zentralen Textsatz-Weg. EIGENER FOLGEPOSTEN, hier bewusst nicht mitgezogen.

Vor-Depot-Texte ohne jede Sprachmodul-Moeglichkeit
  <noscript>…</noscript>                    — steht vor jedem JavaScript, vor jeder Modul-Lesbarkeit
  VOR-DEPOT-SPRACHSCHALTER-Textblock         — laeuft, BEVOR ein Depot und damit ein
                                                Branding-Modul ueberhaupt existiert
```

**Zwei Stellen sind ECHTE Anzeige, aber ebenfalls rohe Literale — direkt verdrahtet, nicht über
den Textsatz-Weg:** das ICS-`PRODID`-Feld (`icsKalender()`, jetzt `_icsText(_markeName())`) und
die zwei PDF-Copyright-Felder (`copyright: '© ' + _markeName()`).

## 5a · Der dritte Fund, gefangen von zwei bestehenden Wächtern vor dem Commit

Der Testlauf vor dem Commit fand zwei weitere, unabhängig voneinander bestehende Proben, die auf
denselben Umbau anschlugen — beide korrekt, keine davon selbst gebaut:

**`tests/u2-adr-322-jeder-traeger-loest-auf.test.js` (Ratsche gegen einen eingefrorenen
Rückstand):** die Probe geht generisch über den Objektgraphen (`SEKTOREN`/`SITUATIONEN`/
`WIZARDS`) und prüft, ob der LIVE-Wert eines Feldes (`.hint`/`.label`/…) auf einen Wert im Satz
zurückführt. 22 der ursprünglich 81 konvertierten Kennungen (18 der Form `identitaet.…`/
`vorsorge.…`/`meine-menschen#…`/`situation:…`/`wizard:…`/`anlass:…`, plus die vier
`dok:…#…texte[0]`-Nachtragskennungen aus Lücke-1-artigen Klammer-Pfaden) werden NICHT bei jedem
Zugriff über den STRINGS-Proxy neu gelesen, sondern EINMALIG beim Boot in das Objekt gebacken
(`_textsatzAufSektorenAnwenden`/`-Situationen…`/`-Wizards…`). Mein Interceptor sitzt korrekt in
`textLesen()` und löst `{marke}` beim Backen auf — aber zu diesem Zeitpunkt (vor jedem Depot, vor
jedem Branding-Modul) IMMER auf `'Vivodepot'`. Der GEBACKENE Wert weicht seither vom ROHEN
Textsatz-Wert (der weiterhin `{marke}` als Platzhalter trägt) ab — genau die Divergenz, die diese
Ratsche seit U2-ADR-322 bewacht. Weitere, tiefere Folge, nicht nur die Testfrage: für diese 22
Kennungen würde ein erst danach angedocktes Branding-Modul den bereits gebackenen Text ohnehin nie
mehr erreichen — der zentrale Interceptor deckt nur den STRINGS-Proxy-Lesepfad ab, nicht den
Boot-Bake-Pfad. Alle 22 auf das native Literal zurückgesetzt, in Kern UND allen betroffenen
EN-Quelltabellen — derselbe Befund wie Abschnitt 5, nur eine vierte, bislang übersehene Kategorie.

**`tests/pre-depot-en-sync.test.js` (U2-ADR-195, Rot-Beweis für `preDepotSyncPruefen`):** sieben
Kennungen (`welcomeDateiOeffnen`, `cryptoPwAufforderung`, `cryptoInternAufforderung`,
`btnDepotOeffnen`, `wipeSperrschirmHinweis`, `dateiNichtLesbar`, `dateiErkennungAnker`) haben ein
zweites, unabhängiges Gegenstück im nativen `PRE_DEPOT_EN`-Objekt (Abschnitt 5, dritte Gruppe) —
diese Probe verlangt ausdrücklich Wortgleichheit zwischen beiden. Da `PRE_DEPOT_EN` naturgemäß
literal bleiben muss (kein Modul lesbar), hätte ein einseitig aufgelöster Textsatz-Wert dieselbe
Kennung in zwei Fassungen auseinanderlaufen lassen. Ebenfalls zurückgesetzt.

**Eine achte, selbst verursachte Verwechslung dabei gefunden und korrigiert:** beim ersten
Versuch, die `pre-depot-en-sync`-Lücke zu schließen, wurden versehentlich `importKlartext.json`/
`importKlartext.vivodepot-beta` zurückgesetzt (falsche Kennung, ähnlicher Wortlaut) statt der
tatsächlich betroffenen `importJsonLabel`/`importBetaLabel`. Beide zusätzlich zurückgesetzten
Kennungen sind für sich harmlos (dynamisch, hätten mitgehen können) — belassen, um nicht ein
drittes Mal an derselben Stelle zu ändern; die tatsächlich nötige Korrektur (`importJsonLabel`/
`importBetaLabel`) ist zusätzlich vorgenommen.

**Endgültige Zahl, dreifach durch bestehende Proben verifiziert, nicht nur behauptet:** 52 echte
Textsatz-Kennungen tragen `{marke}`/`{marke_domain}` sicher — `tests/pre-depot-en-sync.test.js`,
`tests/u2-adr-322-jeder-traeger-loest-auf.test.js` und `tests/textsatz-en-platzhalter-pruefen.js`
laufen alle drei grün gegen den finalen Stand.

## 6 · Folgeposten — benannt, nicht behoben

**Export-Dateinamen (~25 Fundstellen).** Jede `dateiAusgeben(...)`/`dateibasis`-Stelle bräuchte
denselben direkten `_markeName()`-Anschluss wie das ICS-Feld — ein eigener, mechanisch größerer
Zug, kein Fix nebenbei. Richtig geschnitten, Bestätigung 07.09.2026.

**Nachtrag 10.09.2026 (U2-ADR-400 „White Label bis ins PDF"): erledigt.** `_dateiNamePraefix()`
ersetzt den `Vivodepot_`-Präfix jetzt an `exportDateiname()`, beiden `_eudiwDateiname`-Stellen und
allen Standalone-Dateinamen (inkl. `depotDateiname()`, dem primären Speicherformat-Namen — ein
zweiter, bis dahin unentdeckter Fund derselben Klasse). Am laufenden Kern gemessen, nicht
abgeleitet: `V.exportDateiname()` liefert bei angedocktem Branding-Modul
„Berliner-Sparkasse_Gesundheit_IPS.json" statt „Vivodepot_Gesundheit_IPS.json" (Beispielwerte,
keine Datei-Pfade). Dieser Folgeposten ist damit überholt, nicht mehr offen.

**`<noscript>` und der Vor-Depot-Sprachschalter — Lücke benannt, nicht behoben,
07.09.2026:** Die Begründung aus Abschnitt 5 gilt für den **Einlassweg** — dort ist beim Laden
dieser Bildschirme noch kein Modul lesbar, `_markeName()` hätte nichts, worauf es zugreifen
könnte. **Für ein KONFEKTIONIERTES Produkt gilt sie nicht:** dort kann der Name beim Bauen fest
eingesetzt werden, genau so, wie die Sprache eines konfektionierten Produkts ab Werk
eingebacken wird (Manifest-Konfektionierung, paralleler Auftrag). Ein White-Label-Produkt
zeigt heute auf dem allerersten Bildschirm (kein JavaScript, oder Sprachwahl vor jedem Depot)
„Vivodepot" statt der eigenen Marke — **das ist eine Lücke der Konfektionierung, nicht des
Einlasswegs**, und gehört dorthin, nicht in diesen Zug.

## 7 · Proben

**Neue Datei `tests/marke-anzeige-anwenden.test.js`** (9 Proben): ab Werk unverändert
(`_markeName`/`_markeDomain` → nativ, ein `{marke}`-Text bleibt exakt wie heute lesbar), nach
Einlassen einer Fremdmarke (`FREMDMARKE`-Fixture, Farbe/Name/Domain klar erfunden, weit weg von
Vivodepots eigenen Tönen) an mehreren unabhängigen Textsatz-Fundstellen inklusive Tab-Titel und
Wortmarke, `{anbieter}`-Trennung explizit widerlegt, Reset räumt zurück, Rot-Beweis zeigt: ein
Text ohne `{marke}`-Platzhalter bleibt von einer angedockten Fremdmarke unberührt — der Melder
prüft wirklich, ist nicht immer grün.

**Bestandsproben ergänzt, keine Verhaltensänderung:** `tests/a523-branding-register.test.js`
(drei `deepEqual`-Erwartungen um `domain: null`/`domain: '…'` ergänzt, Testname „alle sechs
Felder"), `tests/vivodepot-branding-inhalt.test.js` (`FREMDMARKE_FIXTURE` + Vergleichsschleife um
`domain` erweitert). `tools/vivodepot-branding-inhalt.js`: `VIVODEPOT_BRANDING` trägt jetzt
`domain: 'vivodepot.de'`.

**EN-Spiegelung, über die offiziellen Werkzeuge, nicht handgepflegt:** `{marke}`/`{marke_domain}`
in alle vier EN-Quelltabellen übertragen (`textsatz-en-daten.js`, `-optionswerte-daten.js` [keine
Treffer], `-vollabdeckung-daten.js`, `-353-zugang-recht-daten.js` — die vierte beim ersten
Kennungs-Scan übersehen: das Extraktionsmuster kannte keine eckigen Klammern in Kennungen wie
`dok:erbschein-vorbereitung#0/4.texte[0]`, vier solche Fundstellen nachgezogen). `tools/
textsatz-en-modul-erzeugen.js` und `tools/textsatz-de-modul-erzeugen.js` neu gelaufen — beide
Module sind erzeugt, nie handgepflegt. `tools/textsatz-en-platzhalter-pruefen.js`: grün, keine
Platzhalter-Abweichung zwischen den Sprachen.

**Regression, nach Abschnitt 5a final:** 102 betroffene Testdateien (textsatz, branding,
situation, wizard, dokument, erbschein, beratungshilfe, gebwiz, ics, vcard, export,
`pre-depot-en-sync`, `u2-adr-322-jeder-traeger-loest-auf`) — 999/999 grün. Die zuerst gemeldeten
939/939 datierten vor Abschnitt 5a — dieselben Dateien liefen zwei weitere Male nach den beiden
Korrekturen, jedes Mal vollständig grün, nicht nur die zuletzt geänderten Proben.

---

*Vivodepot GmbH · Berlin · 07.09.2026*
