# U2-ADR-473: Erscheinungsbild im Branding-Modul — Token-Vollständigkeit, Profile, Steckplatz Navigation

**Status:** Angenommen (02.10.2026) — Teil W1 gebaut (v894); die Teile W2–W7 folgen mit ihren Fassungen
**Datum:** 02.10.2026
**Kategorie:** ARCHITEKTUR, GESTALTUNG, WHITE LABEL
**Linie:** U2
**Bezug:** U2-ADR-339 (Design-Namensraum: Typprüfung statt Namensliste) · U2-ADR-351 (Erscheinungs-Modul, fünf Schriftgrad-Rollen) ·
U2-ADR-384 (Ab-Werk-Saat der eigenen Marke) · U2-ADR-362 · U2-ADR-400 (Herkunftsort) · U2-ADR-408 · U2-ADR-174 (Akkordeon-Grid) ·
U2-ADR-236 (Sub-Depot-Palette) · B16-ADR-008 (White Label)
**Status heute:** gilt — Belege im `konformitaet`-Block unten. Gebaut ist W1; W2–W7 sind entschieden und folgen mit ihren Fassungen.

## Frage

Eine Einrichtung soll das ganze Erscheinungsbild von Vivodepot über ein Modul anpassen können: Farben, Schrift, Größen, Radien,
Flächen statt Linien, Schreibung der Etiketten, die Form der Navigation. Drei mitgelieferte Profile — A „Leinen“ (künftig ab Werk),
B „Klar“, C „Warm“ — sind zugleich die Abnahme: jedes muss allein über das Modul entstehen.

Gemessen am Stand vom 02.10.2026 ging das nicht. Ein Profil erreichte nur die Primär- und Sekundärfarbe und einen Schriftnamen.
Im Kern-CSS standen 16 Hex-Farben, 49 `rgba()`, 27 Schriftgrößen, 13 Radien, 18 Schatten, 18 dicke Ränder links, 9-mal
`text-transform: uppercase`, 18 Laufweiten und 75 Schriftgewichte als Rohwert — für jedes Modul unerreichbar. Die
Typprüfung aus U2-ADR-339 kannte 69 von 124 `:root`-Tokens; `--fs-sm`, `--fs-base` und `--fs-lg` konnte ein Modul gar nicht setzen.

## Entscheidung

1. **Das Erscheinungsbild lebt im Branding-Modul, Version 2.** Kein neuer Einlass-Typ: die Menge der Einlass-Typen ist nach der
   Einfrier-Entscheidung geschlossen. Das Branding-Modul hat Ab-Werk-Saat (U2-ADR-384) und signierten Einlass schon; es bekommt
   mit `moduleVersion: 2` das optionale Feld `erscheinung` mit `tokens`, `layout` und `schriften`. Version-1-Module bleiben gültig.
   Das Erscheinungsbild lebt im Produkt, nicht in der Depot-Datei.
2. **Token-Vollständigkeit (W1, v894).** Jede gestaltende Angabe im Kern läuft über ein Token aus `:root`. Die Rohwerte sind durch
   Rollen-Tokens ersetzt, die Zeichen für Zeichen den alten Wert tragen; Vivodepot ab Werk sieht unverändert aus. Die Namen
   beschreiben die Rolle, nicht den Wert: zwei Rollen mit heute gleichem Wert bekommen zwei Tokens.
   - Neu: Gewichte `--fw-regular/-medium/-semibold/-bold`; `--label-schreibung` (`uppercase`, ein Profil setzt `none`);
     Laufweiten je Rolle (`--ls-label`, `--ls-titel`, `--ls-label-nav` …); Radien je Rolle (`--radius-karte`, `--radius-knopf`,
     `--radius-feld` …); `--karte-rahmen`, `--karte-schatten`, `--feld-rahmen`, `--feld-flaeche`, `--feld-hoehe`; `--ziel`
     (Mindestmaß aller Bedienelemente, 44 px); die Breite des Akzentrands links `--akzent-rand` (ein randloses Profil setzt 0,
     die Einzüge rechnen ihn heraus); Schatten und Schleier je Rolle; die Werte der Dokument-Blätter (`--dok-*`).
   - Die Rollen-Tokens sind frisch: kein Theme überschreibt sie. Ein Rollen-Token, dessen Wert ein anderes Token nennt
     (`--karte-rahmen: 1px solid var(--line)`), wird am Wurzelelement aufgelöst; das ist gleichwertig, weil alle Überschreibungen
     der genannten Tokens am Wurzelelement selbst sitzen (Nacht, Hochkontrast).
   - Die Typprüfung führt jetzt jedes gestaltende `:root`-Token. Neue Kategorien: **wort** (ein Schlüsselwort aus einer festen
     Auswahl je Token, `DESIGN_TOKEN_WORT`), **zahl** (Gewichte), **rahmen** (`none` oder Breite, Stil, deckende Farbe), **schleier**
     (`rgba`). Schatten nehmen bis vier Längen (Ausbreitung).
   - Die fünf `--fs-role-*` bleiben beim Erscheinungs-Modul (U2-ADR-351), ihrem eigenen Schreibweg; die Typprüfung führt sie als
     reserviert. Branding v2 übernimmt diesen Weg nicht: ein Profil, das sie setzt, wird abgelehnt (W2). Die Größen für Text,
     Label und Überschriften setzt eine Einrichtung über das Erscheinungs-Modul.
   - Bewusst ohne Token: die Wurzel-Schriftgröße der Bedienhilfe „Schrift größer“ (eine Einstellung der Person), die 16 px der
     Eingabefelder gegen den Safari-Zoom, der Auffangposten des Eingangswegs (er erscheint, wenn kein Stylesheet geladen werden
     konnte), `@font-face`, Inline-SVG, der Vorführungszettel (`--notiz-*`, „Papier bleibt Papier“).
3. **Zwei sichtbare Korrekturen gehen mit W1:** das Einstellungen-Akkordeon bekommt dieselbe Zeile wie die Karten (Grid
   `1fr auto auto`, U2-ADR-174) — der Status schwebte bisher je nach Titelbreite in der Mitte; Status und Hinweise der Einstellungen
   stehen in `--fs-sm` statt `--fs-xs` (G7 § 2.2: `--fs-xs` nur für dezente Marker). Beide sind eigene Commits mit Vorher/Nachher-Bild.
4. **W2 · Branding v2: Einlass, Persistenz, Prüfungen** — folgt mit v895. Prüfungen beim Laden (Kontrast AA, Mindestgrößen),
   Ablehnung als Ganzes, geschützte Elemente.
5. **W4 · Schriften** — folgt mit v896. OFL-Schriften als WOFF2 im Modul.
6. **W3 · Layout als Beschreibung, Steckplatz Navigation** — folgt mit v897.
7. **W5 · Profile, ab Werk A** — folgt mit v898. Die eine sichtbare Umstellung, abgenommen an Bildern.
8. **W7 · Layout-Baukasten im Studio** — folgt mit v900.
9. **W6 · Wächter** — begleitend, ohne eigene Fassung.

## Nachtrag v894 (02.10.2026): Das Gerüst trägt keine Erscheinungswerte

Entscheidung vom 02.10.2026: „Das Gerüst muss komplett leer sein von Inhalten, auch Designinhalten“ (Grenze U2-ADR-426, Zustimmung
~09:30; abgestimmt). Damit ändert sich, WO die Werte aus Entscheidung 2 stehen — nicht, welche Werte es sind.

1. **Die Werte wandern aus dem Gerüst in ein Modul.** `:root`, `html.high-contrast` und `html.dark-mode` des Kerns stehen jetzt in
   `tools/erscheinung/heute.css` (mit ihren Begründungen); `node tools/erscheinungsbild-modul.js` baut daraus das Modul
   `{ modulTyp: 'erscheinungsbild', id, basis, hochkontrast, dunkel, layout }` (Schema: das JSON-Schema des Erscheinungsbild-Moduls neben den übrigen Design-Modul-Schemata).
   Im Gerüst bleiben die Namen (Block `ERSCHEINUNGSBILD_REGELN`: das Vokabular, die geschützten Tokens), die Mechanik, die
   Schutzregeln und zwölf reine Verdrahtungen (`--akzent`, `--vm-chrome*`, `--fs-role-*`: Laufzeit-Überschreibung bzw. eigener
   Schreibweg). Ohne Modul zeigt das Gerüst einen bewusst nackten Zustand (Browser-Vorgaben); es wird kein Profil gezeigt.
2. **Das Modul reist wie ein Sprachmodul** (U2-ADR-426): als Rezept-Zutat `erscheinungsbildModul` (+ Prüfsumme), die
   `produktTextErzeugen` in die Region `AB_WERK_ERSCHEINUNGSBILD_PRODUKT` backt. Ein eigener `modulTyp`, weil `erscheinung` seit
   U2-ADR-351 das einlassbare Modul der Schriftgrad-Rollen ist. Kein Einlass-Typ: das Erscheinungsbild ab Werk und die Profile
   werden gebacken; der Einlass zur Laufzeit bleibt Branding v2 (Entscheidung 1, W2). Die Layout-Beschreibung eines Profils steht
   im selben Modul (`layout`, Entscheidung vom 02.10.2026); ihre Prüfung bringt W3, bis dahin nur leer.
3. **Angewandt wird vor dem ersten Bild**, im `<script id="erscheinungsbild">` im `<head>`, über einen konstruierten Stylesheet
   (`CSSStyleSheet` + `adoptedStyleSheets`; CSSOM, gilt auch unter einer CSP ohne `'unsafe-inline'` für Styles, mit dem Gateway-Eigentümer zu U2-ADR-470
   abgestimmt). Rückfall ohne konstruierte Stylesheets: `setProperty` am Wurzelelement je Modus-Klasse.
4. **Die Schutzregeln prüft der Kern selbst, und der Bau noch einmal.** `erscheinungsbildPruefen` (Kern) und
   `_erscheinungsbildPruefen` (`tools/lib/produkt-text-erzeugen.js`, läuft auch im Download-Gateway) lesen dieselben Regeln aus dem
   Block `ERSCHEINUNGSBILD_REGELN`: nur bekannte Namen, keine geschützten, Wertgrammatik ohne `url(` `;` `{` `}` `<` `\`, Text-Kontrast
   ≥ 4,5:1 je Ebene (basis, hochkontrast, dunkel) für die festgelegten Paare, Mindestgrößen (Schrift 10 px, Fließtext 14 px, Ziel
   24 px, Fokus 2 px). Ein Verstoß: der Kern wendet nichts an, der Bau wirft. Ein Kern mit Region und ein Rezept ohne Modul wirft
   ebenfalls — kein still nacktes Produkt. Die Andockstelle für `LAYOUT_PFLICHT` (W3) steht an beiden Stellen.
5. **Ausgeliefert wird nie das Gerüst** (außer als öffentliche Datei, Entscheidung 03.09.2026): Pages-Wurzel und Modul-Apps,
   Shop (vorgebaut je Version), Konfektion und Demos legen das Erzeugnis; Demo-Werkzeuge weisen das Gerüst ab.
6. **Was noch draußen steht**, zählt eine Ratsche, die nur sinkt und ab v899 leer ist: 23 modusabhängige Regeln
   (`html.dark-mode .x`, `html.high-contrast .x`; W5) und vier `@font-face` (W4, v896). Profilnamen in Selektoren oder
   Verzweigungen des Gerüsts sind sofort verboten.
7. **Reihenfolge mit dem Gateway.** Der Abschnitt `PRODUKT_TEXT_ERZEUGEN` ändert sich; das Gateway zieht nach v894 nach (Gateway-Eigentümer).
   Bis dahin griff eine Brücke im Cross-Repo-Abgleich (nach Zustand, mit Wächter „Brücke tot“), und die Werkzeuge für
   Auslieferung und Rezept-Signatur verweigerten den Lauf. Seit das Gateway nachgezogen hat (04.10.2026), ist die Brücke
   entfernt; der Abschnitt ist wieder byte-gleich (tests/produkt-text-erzeugen-cross-repo-abgleich.test.js).

### Nachtrag v894, Lesart B (02.10.2026): Das Gerüst trägt keinen Wert

**Das Gerüst trägt danach keinen Wert.** (entschieden nach der Messung mit dem Achsen-Messwerkzeug aus v892: die Design-Wagen hätten
den Design-Inhalt sonst nicht gesenkt.)

1. **Das Stylesheet selbst ist Modul.** Neuer Abschnitt `stil` = { "<teil>": "<CSS-Text>" } (Quelle `tools/erscheinung/stil/<teil>.css`,
   Reihenfolge = Kaskade in `stil-reihenfolge.json`; heute „grundlage", W3 „navigation", W5 „gestalt-a"). Angewandt nach den
   Token-Ebenen im selben konstruierten Blatt. Nur aus signierten Ab-Werk- bzw. Rezept-Modulen; das einlassbare Design-Modul
   trägt keinen `stil` (Auflage der Gegenlesung 1).
2. **Im Gerüst bleiben:** die Schriften (`@font-face`, bis W4 v896), die Verdrahtung der reservierten Tokens, die Anzeige-Mechanik
   (jede `display`-Deklaration, nur Schlüsselwörter — sonst bliebe ohne Modul etwa `#app` verborgen; erzeugt aus den stil-Quellen,
   `anzeigeMechanik`) und das **Schutz-CSS** im style-Element `schutz-stil`.
3. **Schutz gewinnt** (Auflagen der Gegenlesung 2–4): Regeln an geschützten Elementen (Notfall, Sicherungsanzeige, Warnungen, Herkunft,
   Signatur-/Prüfanzeigen, Fokus, Bildschirmleser-Text, „Schrift größer") stehen nur im Schutz-CSS, jede Deklaration mit
   `!important`, und es wird als LETZTES Blatt angewandt. Jedes geschützte Element trägt `data-schutz` und wird nur über `hidden`
   ausgeblendet; solange nicht `hidden`, bleibt es mit seiner gestalteten Anzeigeart sichtbar und deckend, seine Nachfahren erben
   die Sichtbarkeit. `stil` darf keine geschützten Selektoren, kein `!important`, kein `@import`/`@font-face`, kein fremdes `url(`
   und keinen Text über `content:` tragen (Grammatik in beiden Prüfungen).
4. **Laufzeitprobe:** nach dem Anwenden und bei jeder Änderung am Dokument (gebündelt): Seite sichtbar; jede geschützte Anzeige,
   die nicht `hidden` ist, gerendert (außer in einem geschlossenen Dialog/Overlay), sichtbar, deckend, nicht überdeckt (außer von
   Dialog, Menü, Hinweis), Inhalt nicht durchsichtig, Text ≥ 4,5:1. Verstoß → Rückfall auf Browser-Standard + Mechanik + Schutz,
   `data-erscheinungsbild="rueckfall"`, `ERSCHEINUNGSBILD_RUECKFALL`.
5. **Rückfall ohne konstruierte Stylesheets:** `insertRule` in das Gerüst-Stylesheet (CSSOM, kein neues Element).

## Nachtrag W3a (05.10.2026): die Layout-Beschreibung wird geprüft, LAYOUT_PFLICHT

Der erste Teil von W3 füllt die Andockstelle aus dem Nachtrag v894, Punkt 4. Die Anordnung bleibt, wie sie ist: `renderSidebar` und
`renderTopbar` lesen die Beschreibung erst mit W3b, auf dem Commit von Navigation A.

1. **Das Vokabular steht im Block `ERSCHEINUNGSBILD_REGELN`** unter `layout`: die Fächer des Gerüsts (`kopf`, `seitenrand`, `inhalt`,
   `fuss`), je Baustein die Fächer, in denen er stehen darf, und je Fach seine Formen, die Parameter (`hilfeForm`: Text oder „i“,
   `feldRaster`: ein- oder zweispaltig) und die optionalen Bausteine. Jeder andere Baustein steht genau einmal. Eine Beschreibung
   kann umstellen, aber keinen Weg verlieren.
2. **`pflicht` (LAYOUT_PFLICHT)** nennt, was ein Mensch in jeder Lage braucht: Notfall, Hilfe, Ausgang, Bedienhilfen,
   Sicherungsanzeige, Warnungen, Herkunft (Baustein `ursprung`; `herkunft` ist ein Vertrauensfeld und bleibt dem
   Prüfweg vorbehalten). Fehlt einer, heißt der Fund `pflicht-fehlt`.
3. **Kern und Bau prüfen mit derselben Funktion** `_ebLayoutPruefen`, Zeichen für Zeichen gleich. Ein Verstoß verwirft das ganze
   Modul, wie jeder andere Fund. Ein leeres `layout` heißt „keine Beschreibung“, dann gilt die Bauform des Gerüsts.
4. **Gateway.** Der Abschnitt `PRODUKT_TEXT_ERZEUGEN` ändert sich. Das Gateway zieht nach Landung und Release nach. Bis dahin
   greift die Layout-Brücke im Cross-Repo-Abgleich, nach Zustand. Sie sperrt Auslieferung und Signatur nicht, sonst hielte sie das
   Release an, das W3a trägt. Das alte Gateway weist jedes nicht leere `layout` ab, und zwar beim Abruf. Darum hält
   `kern-ausliefern` vor dem Hochladen jedes Rezept an, dessen Modul ein Layout trägt (auch im Trockenlauf), und kein Modul unter
   `tools/erscheinung` darf eines tragen. Die Brücke entfällt mit dem Ereignis „Gateway-main trägt den Abschnitt“ (Gateway-Pin =
   Kanon-Pin). Reihenfolge: Release mit W3a, dann der Gateway-Nachzug, erst dann ein Modul mit Layout (W5).

## Was aus U2-ADR-339 aufgehoben oder erweitert wird

- „Die 69 verbleibenden globalen `:root`-Tokens“: die Tabelle führt jetzt jedes gestaltende `:root`-Token; ein neues Token ohne
  Eintrag macht eine Probe rot.
- „Das Schatten-Muster: zwei oder drei Längen“: jetzt zwei bis vier.
- „Er verdrahtet keinen Einlassweg“ und „ein verworfener Eintrag kostet nur sich selbst“ (für `erscheinung`): hebt W2 auf.

## Wie „ab Werk unverändert“ belegt ist

Zwei Werkzeuge im Repo, beide mit Fixtures und Rot-Beweis:

- `tools/design-treue.js` zählt die Rohwerte je Familie in CSS, statischem und JS-erzeugtem `style=`. Die Grundlinie
  `tools/design-treue-grundlinie.json` steht nach W1 in jeder gestaltenden Familie auf 0; sie kann nur fallen.
- `tools/design-gleichstand.js --basis <ref>` rechnet jede Deklaration der alten und der neuen Fassung gegen die Wurzel-Tokens
  zurück, in jedem Wurzel-Kontext (Grund, Nacht, Hochkontrast, Schriftstufen), und prüft, dass kein Rollen-Token einen unterhalb
  der Wurzel überschriebenen Wert einfriert. Gegen den Stand vor W1 meldet es genau eine neue Deklaration: `min-height:
  var(--feld-hoehe)` an den Bereichsfeldern (24 px, unter der Höhe jedes dieser Felder).

Das Ergebnis zeigt `tools/design-bildvergleich.js --basis <ref>`: die alte und die neue Fassung im selben Browser, mit derselben
Klickfolge und eingefrorener Uhr, Ansicht für Ansicht verglichen (Willkommen, Übersicht, Navigation, Bereich hell/Nacht/Hochkontrast,
Einstellungen, die Hauptansichten der Seitenleiste; DE und EN, Desktop und Handy). Gespeicherte Grundbilder gibt es bewusst nicht —
sie hingen an der Plattform und veralteten mit jeder gewollten Änderung. Die Probe des Werkzeugs: `tests/e2e/design-bildvergleich.spec.js`.

```yaml
konformitaet:
  - aussage: >-
      Im Kern steht keine gestaltende Angabe als Rohwert: Farbe, Schriftgröße, Gewicht, Laufweite, Radius, Schatten, Akzentrand und
      Schreibung laufen in CSS und im JS-erzeugten style= über Tokens aus :root, bis auf benannte Ausnahmen mit Grund.
    zustand: erfuellt
    herkunft: U2-ADR-473 (02.10.2026)
    pruefung:
      - tests/design-treue.test.js "[Design-Treue] der Kern ist frei von gestaltenden Rohwerten in CSS und JS-style="
      - tests/design-treue.test.js "[Design-Treue·Rot] ein gepflanzter Rohwert `color: #123456` lässt das Gate fallen"
      - tests/design-treue.test.js "[Design-Treue] keine Familie im Kern liegt über der Grundlinie"
  - aussage: >-
      Ein Modul kann jedes gestaltende :root-Token setzen; ein neues :root-Token ohne Kategorie, Reservierung oder begründete
      Festlegung macht eine Probe rot, und das Schema führt genau die setzbaren Tokens.
    zustand: erfuellt
    herkunft: U2-ADR-473 (02.10.2026)
    pruefung:
      - tests/design-token-vollstaendig.test.js "[Token-Vollständigkeit] jedes :root-Token ist kategorisiert, reserviert oder ausdrücklich fest"
      - tests/design-token-vollstaendig.test.js "[Token-Vollständigkeit·Positivkontrolle] jeder Ab-Werk-Wert besteht die Prüfung seiner Kategorie"
      - tests/design-token-vollstaendig.test.js "[Token-Vollständigkeit] das Schema führt genau die setzbaren Tokens, je mit ihrer Kategorie"
      - tests/design-token-vollstaendig.test.js "[Token-Vollständigkeit] Kategorie wort nimmt nur die feste Auswahl an"
  - aussage: >-
      Eine Tokenisierung wird zurückgerechnet: jede Deklaration in jedem Wurzel-Kontext, das JS-erzeugte style=, und kein
      Rollen-Token friert einen lokal überschriebenen Wert ein.
    zustand: erfuellt
    herkunft: U2-ADR-473 (02.10.2026)
    pruefung:
      - tests/design-gleichstand.test.js "[Gleichstand·Rot] Nachtmodus, eingefrorenes Token und JS-Wert fallen auf"
      - tests/design-gleichstand.test.js "[Gleichstand·Negativkontrolle] eine wertgleiche Tokenisierung ist in jedem Kontext gleich"
  - aussage: >-
      Das Gerüst trägt keine Erscheinungswerte; sie kommen als Erscheinungsbild-Modul (Quelle tools/erscheinung/heute.css) über
      produktTextErzeugen in jedes Produkt. Kern und Bau prüfen dieselben Regeln aus dem Kern und urteilen gleich; ein Verstoß
      (Grammatik, unbekannter oder geschützter Name, Kontrast unter 4,5:1 in einer Ebene, Mindestgröße) wird nicht angewandt bzw.
      baut kein Produkt, und ein Kern mit Region ohne Modul baut ebenfalls nicht.
    zustand: erfuellt
    herkunft: U2-ADR-473 Nachtrag v894 (02.10.2026)
    pruefung:
      - tests/erscheinungsbild-pruefung.test.js "[Erscheinungsbild] das Modul ist der Bau aus der Quelle (tools/erscheinungsbild-modul.js --check)"
      - tests/erscheinungsbild-pruefung.test.js "[Erscheinungsbild] das Vokabular des Gerüsts ist genau die Menge, die „heute" setzt"
      - tests/erscheinungsbild-pruefung.test.js "[Erscheinungsbild·Rot-Beweis] ein Verstoß baut kein Produkt (produktTextErzeugen wirft, Auflage D)"
      - tests/erscheinungsbild-pruefung.test.js "[Erscheinungsbild·Rezept] Kern mit Region ohne Modul wirft — kein still nacktes Produkt"
      - tests/erscheinungsbild-pruefung.test.js "[Erscheinungsbild·Rückwärts] ein Kern in der Bauform vor v894 baut mit dem neuen Werkzeug vollständig wie zuvor"
  - aussage: >-
      Jeder Auslieferungsweg legt das Erzeugnis, nie das Gerüst: Pages-Wurzel und Modul-Apps, Shop (vorgebaut), Konfektion;
      die Demo-Werkzeuge weisen das Gerüst ab. Die öffentliche Datei ist das nackte Gerüst.
    zustand: erfuellt
    herkunft: U2-ADR-473 Nachtrag v894 (02.10.2026)
    pruefung:
      - tests/auslieferung-erzeugnis-statt-geruest.test.js "[Auslieferung·Shop] jedes vorgebaute Produkt (kern-ausliefern#_produktBauen) trägt das Erscheinungsbild, sein Rezept nennt es"
      - tests/auslieferung-erzeugnis-statt-geruest.test.js "[Auslieferung·Pages·Wurzel] testfassung-legen legt das konfektionierte privat-de, mit sw.js daneben"
      - tests/auslieferung-erzeugnis-statt-geruest.test.js "[Auslieferung·Rot-Beweis] ein Weg, der die rohe Datei kopierte, fiele hier durch"
  - aussage: >-
      Im Gerüst steht kein Profilname in einem Selektor oder einer Verzweigung; Gestaltung außerhalb der Region steht nur auf einer
      Positivliste, die nur sinkt und ab v899 leer ist; das Kopf-Skript trägt außerhalb seiner Region nur Namen, keine Werte.
    zustand: erfuellt
    herkunft: U2-ADR-473 Nachtrag v894 (02.10.2026)
    pruefung:
      - tests/erscheinungsbild-waechter.test.js "[Erscheinungsbild·Wächter·Rot-Beweis] ein Profilname im Selektor und im Skript wird gefunden, im Kommentar nicht"
      - tests/erscheinungsbild-waechter.test.js "[Erscheinungsbild·Ratsche·Rot-Beweis] ab dem Stand leerBis ist jede verbliebene Stelle rot"
      - tests/erscheinungsbild-waechter.test.js "[Erscheinungsbild·Kopf-Skript·Rot-Beweis] ein eingeschmuggelter Wert wird gefunden"
  - aussage: >-
      Das Gerüst trägt keinen Gestaltungswert (Lesart B): das Stylesheet ist der Modulabschnitt stil; im Gerüst bleiben Schriften
      (bis W4), Verdrahtung, Anzeige-Mechanik und Schutz-CSS. stil ist an beiden Prüfstellen grammatisch beschränkt; geschützte
      Anzeigen bleiben sichtbar, und wo ein Modul sie doch verdrängt, fällt der Kern zurück.
    zustand: erfuellt
    herkunft: U2-ADR-473 Nachtrag v894 Lesart B (02.10.2026)
    pruefung:
      - tests/erscheinungsbild-pruefung.test.js "[Erscheinungsbild] die Anzeige-Mechanik im Gerüst ist genau die display-Mechanik der stil-Quellen"
      - tests/erscheinungsbild-pruefung.test.js "[Erscheinungsbild·Rot-Beweis] kein erfundener Text über content in stil — Kern und Bauweg weisen ab"
      - tests/erscheinungsbild-pruefung.test.js "[Erscheinungsbild·Rot-Beweis] kein Selektor auf eine geschützte Anzeige in stil — Kern und Bauweg weisen ab"
      - tests/e2e/erscheinungsbild-schutz.spec.js "[Schutz·Rot-Beweis] `* { display: none }` → Rückfall; die Sicherungsanzeige ist sichtbar, sobald sie eingeblendet wird"
      - tests/e2e/erscheinungsbild-schutz.spec.js "[Schutz·Gegenprobe] „heute" fällt nicht zurück — nach dem Anlegen, in Notfall und Hilfe"
  - aussage: >-
      Eine Layout-Beschreibung wird in Kern und Bau mit derselben Funktion gegen das Vokabular geprüft; ein unbekanntes Fach, ein
      unbekannter Baustein, eine falsche Form, ein doppelter oder fehlender Baustein und ein fehlender Pflicht-Baustein (LAYOUT_PFLICHT)
      verwerfen das ganze Modul.
    zustand: erfuellt
    herkunft: U2-ADR-473 Nachtrag W3a (05.10.2026)
    pruefung:
      - tests/erscheinungsbild-pruefung.test.js "[Erscheinungsbild·Layout] die Layout-Prüfung steht in Kern und Bauweg Zeichen für Zeichen gleich"
      - tests/erscheinungsbild-pruefung.test.js "[Erscheinungsbild·Layout] Navigation A und Zonen als Beschreibung bestehen beide Prüfungen; ein leeres layout heißt Bauform des Gerüsts"
      - tests/erscheinungsbild-pruefung.test.js "[Erscheinungsbild·Rot-Beweis] ein fehlender Pflicht-Baustein (LAYOUT_PFLICHT) — Kern und Bauweg weisen ab"
  - aussage: >-
      Das Gateway trägt die Layout-Prüfung byte-gleich mit dem Kern (Nachzug nach dem Release v920, 06.10.2026). Die Brücke,
      die bis dahin jedes Rezept mit Layout-Modul anhielt, ist entfernt.
    zustand: erfuellt
    herkunft: U2-ADR-473 Nachtrag W3a (05.10.2026), Nachzug 06.10.2026
    pruefung:
      - tests/produkt-text-erzeugen-cross-repo-abgleich.test.js "[Produkt-Text-Erzeugen·Cross-Repo] der eigene Abschnitt ist byte-gleich mit dem Abschnitt auf Gateway-main"
```

---

*Vivodepot GmbH · Berlin · 02.10.2026*
