# U2-ADR-296: Vivodepots eigene Marke wird ein Datenwert; ein fremder Beitrag im Bürgerdepot trägt einen Rand

**Status:** Angenommen
**Datum:** 05.09.2026
**Kategorie:** ARCHITEKTUR
**Linie:** U2
**U2-Bezug:** A523/Zug 1 (24.08.2026, sechstes Einlass-Register `branding`), U2-ADR-182 Task 4
(28.08.2026, `brandingAnwenden` setzt `--vd-branding-*`, aber nichts las sie), U2-ADR-236
(03.09.2026, „Rahmen folgt Kontext" — Rand statt Fläche, die Regel, die dieser ADR auf einen
dritten Fall anwendet).
**Anker:** Auftrag vom 05.09.2026, stehende Regel „alles ist modular!", Achse „Branding:
Vivodepot · Fremdmarke".
**Status heute:** gilt, teilweise — s. Abschnitt „Was dieser ADR ausdrücklich nicht baut".

---

## Kontext

Der Mechanismus für Institutions-Branding existierte bereits vollständig, bevor dieser Auftrag
begann: `branding` ist seit dem 24.08.2026 ein vollwertiges, signiertes Einlass-Register
(`brandingModulPruefen` validiert `farbePrimaer`/`farbeSekundaer`/`schriftart`/`logo`/`name`),
seit dem 28.08.2026 setzt `brandingAnwenden` diese Werte als `--vd-branding-*`-CSS-Custom-
Properties, verdrahtet über denselben gemeinsamen Trägerweg wie jedes andere Vor-Depot-Modul
(`vorDepotKonfigurationAnwenden` → `modulEinlassenGeprueft`).

**Gemessen, nicht angenommen** (`grep -c "var(--vd-branding" vivodepot.html` vor diesem ADR: 0):
kein einziges Stylesheet-Regel verwies je auf diese Custom Properties. Der Mechanismus war
vollständig, sein Ergebnis floss ins Leere — dieselbe Klasse Fund wie beim Erbschein-Modul
(korrekt gebaut, nie eingesät) und der EN-Textsatz-Auslieferung (Quelle vollständig, Auslieferung
veraltet): Wächter grün, sichtbare Wirkung null.

## Entscheidung

### 1. Vivodepots eigene Marke wird ein expliziter Datenwert

`tools/vivodepot-branding-inhalt.js` exportiert `VIVODEPOT_BRANDING` — dieselbe Form wie jede
fremde Institutions-Marke (`brandingModulPruefen`, keine Ausnahme fürs eigene Haus), mit den
tatsächlichen, aus dem Gerüst übernommenen Werten (`--salbei-dunkel: #4F6539`, `--gold: #8a6d3a`,
„Inter"). Bislang war „Vivodepot" nur die Abwesenheit eines Overrides — jetzt ein Datensatz, der
dieselbe Prüfung besteht wie jedes andere Branding-Modul. Kein Logo: ein echtes Vivodepot-Logo als
Data-URI einzubetten ist eine Design-Freigabe, keine Code-Messung — `logo: null` ist ein gültiger,
geprüfter Zustand (jedes der fünf Felder ist einzeln optional).

Die Fremdmarke-Fixture (`tests/vivodepot-branding-inhalt.test.js`) ist ausdrücklich erfunden
(Auftrag, wörtlich: „darf eine Fixture sein") — bewusst weit weg von Vivodepots eigenen Farbtönen
(kein Grün/Gold), damit ein Diff nie an zufälliger Ähnlichkeit vorbeischlüpft. **Kontrast-Hinweis,
wie verlangt:** die Fixture-Farben (`#8b1a2b`, `#1a3a8b`) sind für DIESEN Beweis nicht
gegen die axe-Gates gefahren — eine echte Fremdmarke bringt einen Kontrastwert mit, den niemand
vorher nachgerechnet hat, und kann das WCAG-Gate reißen. Das ist ein struktureller Befund, kein
Mangel dieses Baus: ein künftiger Andock-Weg für echte Institutions-Farben braucht eine eigene
Kontrastprüfung VOR der Annahme (analog `subDepotTextFarbe(tok)`, `vivodepot.html:27359`, D28 —
Text auf Markenfläche muss aus der Markenfarbe abgeleitet werden, nicht aus einem Bestandswert).

### 2. Globale Basis-Schriftart wird markenbewusst

`body { font-family: var(--vd-branding-schriftart, var(--font-inter)); }` — nur die BASIS, nicht
die „gesperrten Inter"-Regeln (`.welcome-wort`, `.wizard-frage`, UX-Konzept §9/§12), die bleiben
unverändert Inter per Design-Entscheidung. Offline-sicher ohne Sonderfall: ein `font-family`-Wert
löst nie über das Netz auf (nur `@font-face`-Regeln tun das) — ein unbekannter Fontname fällt
einfach durch die Fallback-Kette. **Echter Browser-Beweis** (`tests/e2e/marke-schriftart-
sichtbar.spec.js`, Playwright, `getComputedStyle`): die sichtbare Schriftart ändert sich wirklich,
nicht nur eine CSS-Custom-Property wird gesetzt — genau der Unterschied, den ein bloßer
`brandingAnwenden`-Test nicht zeigen könnte (er wäre schon vor diesem Bau grün gewesen).

### 3. Ein fremder Beitrag INNERHALB eines bestehenden Depots trägt einen Rand — nie eine Fläche

**Fall 1** (dieser ADR baut ihn): ein Bereich, der über ein `bereich`-Modul in ein BESTEHENDES
Depot angedockt ist (z. B. Vivodepot Pro), trägt „Rand, nicht Fläche" (U2-ADR-236) auf
Sektor-Ebene — Klasse `marke-fremd`, `.content-narrow.marke-fremd { border-left: 3px solid
var(--vd-branding-primaer, transparent); }`. Kein Rahmen um die dreizehn eingebauten Sektoren
(sie gehören der Datei selbst, keinem Modul) — „der Schrank ist der eigene, die Akte darin gehört
jemand anderem" (U2-ADR-236 §2).

**Kriterium heute: Anwesenheit einer `herkunft`, nicht Fremdheit selbst** — und das ist eine
bewusste, befristete Vereinfachung, keine endgültige Regel. Solange kein Vivodepot-eigenes
Bereichs-Modul existiert (die dreizehn eingebauten sind heute native Sektoren, kein Modul), fällt
Anwesenheit und Fremdheit zusammen. Sobald „VD Privat" die dreizehn selbst als Modul andockt,
muss diese Funktion die `herkunft` GEGEN die aktuell aktive Branding-Herkunft prüfen, nicht nur auf
Anwesenheit — sonst rahmte Vivodepots eigene Marke plötzlich jeden Bereich ein, genau der „Rahmen
um alles", den U2-ADR-236 ausschließt. Der Umbaupunkt ist im Code selbst benannt
(`_bereichFremdeMarkeHerkunft`, Kommentar dort), nicht nur hier.

**Neuer, real gemessener Befund, nicht behoben:** `_templateAbschnitte`/`templateAbschnitteHTML`
(`vivodepot.html:24894-24919`) gruppieren Felder NUR nach dem Text-Label `.abschnitt`, nicht nach
Herkunft — ein gerendertes Abschnitt-Div kann Felder aus mehreren Quellen mischen (native
Bestandsfelder ohne `herkunft` + Modul-Felder mit `herkunft`, im selben Abschnitt-Label). Auf
DIESER, feineren Ebene ist „welcher Rand" nicht entscheidbar; das ist der Grund, warum dieser ADR
den Rand auf SEKTOR-Ebene setzt, nicht auf Abschnitt-Ebene. Ein künftiger Bau, der Herkunft auch
innerhalb eines Sektors sichtbar machen will, braucht zuerst eigenes Herkunft-Plumbing durch den
Render-Pfad — ein eigener, größerer Bau.

## Was dieser ADR ausdrücklich nicht baut — mit Grund

**Fall 2 (eigenes Produkt einer Institution, Kopfzeile eingeschlossen) bleibt offen.**
Entschieden: ein Branding-Modul, das über die VOR-DEPOT-Konfiguration ankommt (das
Produkt ist gebrandet, bevor eine Bürgerin ihr eigenes Depot hat), rechtfertigt eine durchgehende
Markenfläche — Kopfzeile eingeschlossen; „Vivodepot" ist darin nicht die sichtbare Marke, sondern
das Trägersystem darunter. Das unterscheidet sich strukturell von Fall 1 (ein Beitrag INNERHALB
eines bestehenden Bürgerdepots) — der Träger entscheidet (Vor-Depot-Konfiguration vs. an einem
Bereich hängend), nicht die Anzahl der Branding-Module.

**Warum nicht in diesem Zug:** ob der heutige Code diese beiden Träger (Vor-Depot-Konfiguration
vs. bereich-gebundenes Andocken) beim Branding sauber trennt — also ob die Herkunft des
Trägerwegs bis zur Anwendung erhalten bleibt —, ist ungemessen. Das ist die Voraussetzung für
Fall 2, nicht Teil dieses Baus. Diesen Bau nach sechs Kurskorrekturen in Folge auf einer noch
ungeprüften Annahme fortzusetzen wäre Raten, kein Bauen.

**Kontrast-Ableitung für eine Markenfläche** (Text auf `var(--vd-branding-primaer)`) ist ebenfalls
nicht gebaut — Voraussetzung für Fall 2, analog `subDepotTextFarbe`, s. o.

**NACHTRAG U2-ADR-297 (05.09.2026):** Fall 2 ist gebaut. Die Trägertrennung war beim Messen
bereits vorhanden, nicht erst herzustellen — Vor-Depot-Konfiguration und In-Depot-Andocken sind
zwei nie verwechselbare Code-Pfade (der eine läuft vor jedem Depot, der andere danach); der
Aufrufort selbst trägt die Trennung, kein Herkunfts-Feld nötig. `subDepotTextFarbe` erwies sich
zudem als keine geeignete Analogie — es ist eine Tabellen-Rückgabe auf eine geschlossene
Acht-Farben-Palette, keine Kontrastrechnung; U2-ADR-297 rechnet die WCAG-Relativleuchtdichte
stattdessen neu, klein, zur Laufzeit. s. U2-ADR-297 für Umsetzung und Rot-Beweis.

## Konsequenzen

Ein Depot ohne Branding-Modul sieht in JEDER hier gebauten Hinsicht aus wie vor diesem ADR — alle
drei Fallback-Ketten (`var(--vd-branding-x, <heutiger Wert bzw. transparent>)`) sind additiv.
Jede künftige Änderung an `VIVODEPOT_BRANDING` oder der Fremdmarke-Fixture bleibt vom
`brandingModulPruefen`-Wächter gedeckt — dieselbe Prüfung, kein Sonderpfad.

## Konformität

```konformitaet
aussage:  Vivodepots eigene Marke (VIVODEPOT_BRANDING) besteht dieselbe echte
          brandingModulPruefen-Prüfung wie jede fremde Institutions-Marke, ohne Verwurf.
zustand:  geprüft
herkunft: invariante
pruefung: tests/vivodepot-branding-inhalt.test.js#[U2-ADR-296] VIVODEPOT_BRANDING besteht die echte brandingModulPruefen-Prüfung, ohne Verwurf
pruefung: tests/vivodepot-branding-inhalt.test.js#[U2-ADR-296] die Fremdmarke-Fixture besteht dieselbe Prüfung ebenso
```

```konformitaet
aussage:  Vivodepots eigene Marke und eine Fremdmarke unterscheiden sich in jedem Feld und
          erzeugen sichtbar unterschiedliche CSS-Werte über brandingAnwenden — nie dieselben.
zustand:  geprüft
herkunft: invariante
pruefung: tests/vivodepot-branding-inhalt.test.js#[U2-ADR-296·Gegenprobe] beide Marken unterscheiden sich in JEDEM Feld — kein Feld bleibt zufällig gleich
pruefung: tests/vivodepot-branding-inhalt.test.js#[U2-ADR-296·Gegenkontrolle] brandingAnwenden setzt für beide Marken sichtbar unterschiedliche CSS-Werte, nie dieselben
```

```konformitaet
aussage:  Ein Branding-Modul ändert die tatsächlich vom Browser berechnete Basis-Schriftart
          (nicht nur eine CSS-Custom-Property) — echter Playwright-Lauf, kein Kern-Regex.
zustand:  geprüft
herkunft: invariante
pruefung: tests/e2e/marke-schriftart-sichtbar.spec.js#ein Branding-Modul ändert die sichtbare Basis-Schriftart (body, getComputedStyle)
```

```konformitaet
aussage:  Ein Sektor, der aus einem fremden Marken-Modul stammt, trägt die Klasse marke-fremd
          (Rand, keine Fläche); die dreizehn eingebauten Sektoren tragen sie nie.
zustand:  geprüft
herkunft: invariante
pruefung: tests/marke-fremd-rand-sektor.test.js#[U2-ADR-296] ein Sektor aus einem fremden Marken-Modul trägt die Klasse marke-fremd
pruefung: tests/marke-fremd-rand-sektor.test.js#[U2-ADR-296·Gegenprobe] ein eingebauter Sektor (identitaet) trägt marke-fremd NIE
pruefung: tests/marke-fremd-rand-sektor.test.js#[U2-ADR-296] _bereichFremdeMarkeHerkunft liefert die herkunft für einen angedockten, null für einen eingebauten Sektor
```

---

*Vivodepot GmbH · Berlin · 05.09.2026*
