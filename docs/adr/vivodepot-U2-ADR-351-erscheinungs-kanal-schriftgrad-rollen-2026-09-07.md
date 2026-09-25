# U2-ADR-351 · Der Kanal für Schriftgrad-Rollen — geöffnet, nicht bewiesen

**Datum:** 07.09.2026
**Status:** gebaut, 9/9 Proben grün (+147 gegengeprüfte Bestandsproben ohne Regression),
Suite ausstehend
**Status heute:** gilt
**Nummer:** vorläufig — beim Landen gegen den dann aktuellen Kanon neu prüfen
**Auftrag:** "C3 — die UX-Achse, kleinster Zuschnitt" (Zug 1 UND Zug 2 von 3), 07.09.2026
**Bezug:** internes Konzeptdokument vom 07.09.2026 Abschnitt IX (Marke und Erscheinung sind
zwei Achsen) · interner Selektor-Vertrag vom 06.09.2026 §10 (Token) · interner Arbeitsplan nach dem
Baukasten vom 07.09.2026, Block C3 · U2-ADR-182 Task 4 (`brandingAnwenden`, das Vorbild)
· A523 (`brandingModulPruefen`/EINLASS_REGISTER, sechstes Register — Vorbild für Zug 2)
· interne Bauvorlage vom 07.09.2026 (Design-Strang, Maßstab für den Riegel)
**Gegengelesen:** Design-Strang, 07.09.2026 — Fund zu `.sektion h2` (§6 unten, Zug 1); Zuschnitt +
Kennungsfrage + drei Grenzen zu Zug 2 (§8 unten)

---

## 1 · Der Mangel, gemessen vor dem Bau

Fünf UI-Rollen — Label, Wert, Gruppe, Abschnitt, Titel — trafen auf nur drei geteilte
Skalen-Token:

```
.feld-label               font-size: var(--fs-sm)
.feldgruppen-karte-titel  font-size: var(--fs-sm)    DASSELBE wie Label
.sektion h2                font-size: var(--fs-sm)    DASSELBE wie Label und Gruppe
.feld-wert                 kein eigenes Token — geerbt von body (--fs-base)
.bereich-kopf h1/h2        font-size: var(--fs-base)  DASSELBE wie Wert
```

Ein künftiges Erscheinungs-Modul, das nur die Rolle "Abschnitt" ändern wollte, hätte
zwangsläufig auch Label und Gruppen-Titel getroffen — kein eigener Kanal je Rolle.

## 2 · Der Bau

**Fünf neue CSS-Custom-Properties**, jede mit Fallback auf den heutigen, gemessenen
Skalen-Wert — visuell **null Unterschied**, solange kein Modul sie setzt:

```css
--fs-role-label: var(--fs-sm);
--fs-role-wert: var(--fs-base);
--fs-role-gruppe: var(--fs-sm);
--fs-role-abschnitt: var(--fs-sm);
--fs-role-titel: var(--fs-base);
```

Die fünf Selektoren lesen jetzt ihr eigenes Rollen-Token statt direkt den geteilten
Skalen-Token. Reine CSS-Umverdrahtung, kein Wert geändert.

**Eine minimale Anwendefunktion**, `erscheinungAnwenden(erscheinung, root)`, wörtliches
Vorbild `brandingAnwenden` (U2-ADR-182 Task 4) — nimmt ein flaches Objekt
`{label, wert, gruppe, abschnitt, titel}`, setzt die fünf `--fs-role-*`-Variablen auf `root`,
entfernt sie bei fehlendem Wert (derselbe Reset-Weg wie bei einem Depot-Wechsel). Eigene
CSS-Variablen-Familie (`--fs-role-*`, nicht `--vd-branding-*`) — Erscheinung ist laut
Konzept Abschnitt IX **keine Zurechnung**, eine gemeinsame Variablen-Familie mit der
Marken-Achse würde die beiden Aussagen verwischen.

## 3 · Dieser Zug öffnet den Kanal — er beweist ihn nicht

**Ausdrücklich festgehalten, 07.09.2026:** Die Abnahme-Zeile *„UX läßt sich nachträglich
einlassen"* wird durch diesen Zug **nicht grün**. Sie verlangt, daß ein Darstellungs-Modul
die Oberfläche **tatsächlich** ändert — fünf Token mit Fallback auf den heutigen Wert ändern
per Konstruktion nichts.

**Was fehlt, damit der Kanal SENDET statt nur zu EXISTIEREN:**

```
Zug 2   der Einlassweg fuer ein Erscheinungs-Modul
        (eigenes Register? ein Aufruf, den die App direkt tut? — offene
        Architekturfrage, bewusst NICHT in diesem Zug entschieden)
Zug 3   die drei Pruefmodule des Design-Strangs (marke/erscheinung/boesartig), vier rote
        Beweise, zwei Gegenproben — plus die 34-Selektoren-Praesenzprobe
        aus dem Selektor-Vertrag
```

`erscheinungAnwenden` ist damit **erreichbar, aber ungerufen** — die Umkehrung von "gebaut ist
nicht erreichbar": hier ist es erreichbar, nur existiert noch nichts, das es erreicht.

## 4 · Was dieser Zug ausdrücklich NICHT enthält

- **Kein Einlassweg/Register/Signatur.** Erscheinung ist laut Konzept ungeprüft — aber WIE ein
  Modul überhaupt ins Depot kommt, ist eine Architekturentscheidung, die dem folgenden Zug
  gehört, nicht diesem.
- **Kein Kachel-Chrome-Kanal** (borderWidth/borderRadius/boxShadow aus dem Prüfmodul des Design-Strangs) — eigener
  Satz Token, eigene Entscheidung, wo. Bewusst weggelassen, nicht vergessen.
- **Keine Prüfmodule, kein bösartiges Modul, keine 34-Selektoren-Probe.** Das ist Zug 3, hängt
  an einem funktionierenden Einlassweg (Zug 2), den es hier noch nicht gibt.

## 5 · Proben

`tests/c3-erscheinung-fs-rollen.test.js` — 9 Fälle: die Funktion selbst (Vorbild
`tests/vor-depot-konfiguration-branding-css.test.js`), die Achsen-Trennung (keine
`--vd-branding-*`-Variable berührt), zwei CSS-Text-Proben gegen `vivodepot.html` — daß
jedes Rollen-Token auf den **gemessenen** heutigen Skalen-Wert zurückfällt, und daß jeder der
fünf Selektoren tatsächlich sein Rollen-Token liest (der Kanal wäre sonst gebaut, aber nicht
angeschlossen — dieselbe Klasse Fehler wie ein Anker, der sein Ziel verfehlt) —, und eine
Ausbeute-Probe, die alle vierzehn Abschnitts-Überschriften findet und `sektion-titel` an jeder
verlangt (§6).

Keine Regression: Branding-Bestandsproben (`vor-depot-konfiguration-branding-css.test.js`,
`vivodepot-branding-inhalt.test.js`, 12/12 — direkt neben `brandingAnwenden` editiert) UND elf
weitere Testdateien, die die neun betroffenen Render-Stellen berühren (147/147 grün).

## 6 · Der Fund des Design-Strangs: `.sektion h2` selbst war eine Lücke — Zug 1 wächst dadurch, benannt

**Zug 1 umfaßte ursprünglich NUR die fünf Rollen-Token und `erscheinungAnwenden` (§2/§3) — die
CSS-Selektoren blieben dabei unverändert, `.sektion h2` eingeschlossen.** Bei der Durchsicht durch
den Design-Strang (07.09.2026) wurde daraus eine zweite, eigenständige Erweiterung, mit ausdrücklicher Freigabe trotz Überschreitung des ursprünglich vereinbarten „kleinsten Zuschnitts": **mein
eigener Fund zur Vertragsfrage (§4) war größer, als er aussah** — `.sektion h2` traf **fünf von
vierzehn** Abschnitts-Überschriften. Posten 52 hatte die
Bereichs-Überschrift und vier Render-Stellen auf `h2` gehoben; die restlichen **neun blieben
bei `h3`** — ohne jede `.sektion`-Titelregel, unstyled auf Browser-Standard. Der Kommentar an
Ort und Stelle bestätigte es wörtlich: „Selektor UND die vier Render-Stellen … zusammen
umgestellt" — vier, nicht neun.

**Entscheidung des Design-Strangs, wörtlich:** *„Der Vertrag ist meiner — und er sagt: eigene Klasse."*
`.sektion-titel` existierte bereits, in der Lese-App, mit exakt dieser Aufgabe. Übernommen in
den Kern, an **allen vierzehn** Stellen im Markup (h2 und h3 gleichermaßen) — das Rollen-Token
bindet jetzt an den Namen, nicht an ein Tag, dessen Migration nie fertig wurde.

**Anders als die reine Token-Umverdrahtung (§2) ist das eine echte Verhaltensänderung, nicht
nur eine Umbenennung:** neun Überschriften bekommen jetzt eine Formatierung
(Inter, `--fs-role-abschnitt`, 700, `--ink2`, UPPERCASE, `letter-spacing: 0.02em`), die sie
vorher nie hatten. Bewusst, vom Design-Strang empfohlen, kein Versehen — aber ausdrücklich hier benannt, nicht
unter "reine CSS-Umverdrahtung" verborgen.

**Die Farb-Dunkelmodus-Regel (`html.dark-mode .sektion h2`) blieb zunächst bewusst
unangetastet** — mit der Begründung, sie sei eine eigene, vom Rollen-Token unabhängige
Zusicherung, deren Ausweitung eine zweite, unverlangte Verhaltensänderung wäre.

**Design-Strang, zweite Durchsicht: diese Begründung trug nicht.** Gemessen:
`html.dark-mode .sektion h2 { color: var(--salbei-nacht); }` (#8eab77) gegen
`.sektion-titel { color: var(--ink2); }` (#b9c3b9 nachts) — beide für sich lesbar (6,85:1 bzw.
9,62:1 gegen den Nacht-Grund, kein Sicherheitsbefund), aber **vierzehn Überschriften derselben
Rolle in zwei Farben, nur nachts:** die fünf ehemaligen `h2` salbeigrün, die neun neu
hinzugekommenen grau-grün. Grund- und Nachtregel treffen dieselbe Aussage ("eine
Abschnittsüberschrift sieht so aus") in zwei Themes — die Grundregel wurde auf vierzehn
erweitert, die Nachtregel blieb bei fünf stehen. **Das ist nicht Zurückhaltung, sondern
Unvollständigkeit:** die zweite Änderung wäre gewesen, die Nachtfarbe selbst zu ändern; sie auf
dieselbe, bereits erweiterte Menge anzuwenden führt die ERSTE Änderung nur zu Ende.

`html.dark-mode .sektion h2,` in der handgepflegten Nacht-Selektorliste **ersetzt** (nicht
ergänzt — sonst bliebe ein toter Selektor stehen) durch `html.dark-mode .sektion-titel,`.
Keine entsprechende Hochkontrast-Liste gefunden, die denselben Fall trüge. 55/55 Proben aus den
sechs betroffenen Theme-/Kontrast-Testdateien gegengeprüft, keine Regression.

**Verallgemeinerung, außerhalb dieses Zugs, vom Design-Strang weitergegeben:** die
Nacht-Selektorliste ist selbst eine handgepflegte Landkarte — derselbe Kommentar an Ort und
Stelle dokumentiert bereits einen früheren Fall („NACHGEZOGEN 28.07.2026, Fixliste Nr. 4"). Wer
künftig eine Rolle umstellt, muss diese Liste mitprüfen; sie fällt nicht von selbst auf.

## 7 · Dieser Zug ändert den ausgelieferten Text — absichtlich

**Ausdrücklich, weil §3 nur die Kanal-Frage klärt, nicht die Markup-Frage:** die Umstellung
von `.sektion h2` auf `.sektion-titel` (§6) ist keine reine CSS-Umverdrahtung wie §2 — sie
setzt an vierzehn (Quelltext) bzw. fünfzehn (Aufrufstellen, `renderSektor`/`renderSituation`/
`renderAkutSituation`/`templateAbschnitteHTML`/`anfragenOrtHTML`/`renderAnfrage`/
`renderZusammenstellen`) Stellen ein `class="sektion-titel"`-Attribut auf ein zuvor
klassenloses `<h2>`/`<h3>`, und ändert damit den TATSÄCHLICH AUSGELIEFERTEN HTML-Text — nicht
nur, wie er aussieht. Ein Golden Master, der den ausgelieferten Stand zeichengenau hält (die
Vor-Umzug-Achse, U2-ADR-344, hier die Geschwister-Achse zu a3-dokumentmodule, gegen denselben
Beleg-Commit 37038011), **muss** auf diesen Zug anschlagen — das ist kein Fehlschlag der Probe,
sondern ihre Aufgabe.

**Gemessen, nicht angenommen** (Auflage vom 07.09.2026, Konvoi-Anhalt): für beide echten
Depot-Fixtures (`vor-umzug-depot-marlene-hoffmann.json`,
`vor-umzug-depot-instrumente-breit-anton-reindl.json`) `renderSektor()` gegen den alten
(55735151) und den neuen Stand gerendert und zeichengenau verglichen (jeder String am `<`
zerlegt, jede abweichende Tag-Zeile einzeln geprüft) — **jede einzelne Abweichung, in allen elf
betroffenen Sektor-Renderings, ist ausschließlich das eingefügte `class="sektion-titel"`, keine
andere Zeichenänderung.** 55735151 ist selbst gegen den Beleg 37038011 golden-master-geprüft
(dieselbe Suite, dieselbe Vor-Umzug-Achse, a3-dokumentmodule lief in diesem Zweig 7542/7542
grün) — die Kette 37038011 → 55735151 → dieser Zug ist damit lückenlos: byte-gleich, dann
ausschließlich Attribut-Zusatz.

Die A1-Achse selbst lag beim Bau dieses Zugs nicht im Baum (sie kam erst mit dem ersten Konvoi,
07.09.2026) — sie wurde darum nicht mitgeführt und muss beim Landen mit benanntem Grund
(dieser Abschnitt) nachgezogen werden, alter Stand im Kommentar, nicht stillschweigend
überschrieben.

## 8 · Zug 2 — der Einlassweg, gebaut

**Architekturfrage entschieden: eigenes Register, kein App-Aufruf.** U2-ADR-145 Punkt 1 sagt
ausdrücklich, ein Register unterscheide sich in seiner Prüfung und seinem Slot, nicht im Weg
hinein — Erscheinung ist strukturell identisch zu Branding (flaches Konfig-Objekt, herkunfts-
bezogen, CSS-Var-Anwendefunktion), ein Sonderweg wäre der Präzedenzbruch gewesen. Zwölftes
Register in `EINLASS_REGISTER` (`typ: 'erscheinung', slot: 'erscheinungsModule'`),
`erscheinungModulPruefen`/`erscheinungModulEinbetten` — wörtlicher Spiegel von
`brandingModulPruefen`/`brandingModulEinbetten` (A523, sechstes Register).

### 8.1 · Die Riegel-Matrix

**BLEIBT, weil generisch** (gilt in `modulEinlassen` für jedes der zwölf Register, unabhängig
von `nurGeprueft`): Größe/Tiefe (`_modulGroesseTiefePruefen`, vor jeder typ-Prüfung —
genau das, was ein JSON-Bomben-Angriff bräuchte), Typ-Namensraum (`_einlassRegisterFuer`,
unbekannter `modulTyp` → benannt verworfen), `appVersion`-Kompatibilität, erzwungene Gruppe
(`ungeprueft`/`anbieterIdGeprueft`/`beleg` werden per `Object.assign` IMMER auf die sicheren
Werte zurückgesetzt — ein Modul kann sich nie selbst als geprüft ausgeben).

**BLEIBT, hier gebaut:** die geschlossene Feld-Erlaubnisliste (`_ERSCHEINUNG_MODUL_SCHLUESSEL`
— `label`/`wert`/`gruppe`/`abschnitt`/`titel`/`herkunft` plus die üblichen Rahmenfelder) und
eine Format-Prüfung jedes Werts gegen ein sicheres CSS-Längenmaß (`^\d+(\.\d+)?(px|rem|em)$`).
**Ohne Signatur ist diese Erlaubnisliste der EINZIGE verbleibende Riegel** — kein Zertifikat
prüft mit, sie trägt die ganze Last allein (07.09.2026, ausdrücklich benannt, damit
"ungeprüft" hier nicht als "ungeschützt" gelesen wird).

**FÄLLT WEG: `nurGeprueft`.** Konzept Abschnitt IX ("Erscheinung … keine Zurechnung … keine
Signaturhürde") und die Bauvorlage des Design-Strangs ("ungeprüft reicht") sagen es beide ausdrücklich — der
unsignierte Weg bleibt für `erscheinung` offen, anders als bei `branding`.

### 8.2 · Der strukturelle Riegel gegen ein bösartiges Modul

Nicht zusätzlich geprüft, sondern durch die Bauform ausgeschlossen: `erscheinungAnwenden()`
(§2) nimmt NIE rohes CSS und NIE einen Selektor entgegen, nur benannte `setProperty()`-Aufrufe
auf genau fünf Custom Properties. Ein Erscheinungs-Modul hat darum GAR KEINEN Kanal, der eine
der vier reservierten Zustandsklassen (`klartext-warn`/`herkunft-marke`/`stand-marke`/
`vorlage-marke`) erreichen könnte — die `pruefmodul-boesartig`-Angriffsklasse des Design-Strangs
(`.klartext-warn{display:none}` + Deckfläche) findet hier keinen Angriffspunkt, strukturell,
nicht durch eine Prüfung, die man vergessen könnte. Als Regressionsprobe festgehalten, nicht
nur behauptet: `tests/c3-zug2-erscheinung-einlassweg.test.js` `[Struktur-Riegel]` (zwei Proben
— die Prüfung lässt nie mehr als die fünf Felder durch, auch bei einem maximal feindseligen
Rohobjekt; die Anwendung selbst kennt nur fünf Property-Namen, auch wenn man sie direkt mit
einem feindseligen Objekt aufruft, unter Umgehung der Prüfung).

### 8.3 · Die Kennungsfrage — Entscheidung mit Vorbehalt

**Mit `herkunft`, wie bei Branding.** Entschieden am 07.09.2026, zu dem Zeitpunkt
**ohne den zuständigen Design-Strang** (er stand als beendet in der Sitzungsliste — später
aufgeklärt: die Sitzung war umbenannt, nicht beendet, und hat die Entscheidung nachträglich
bestätigt, s. 8.4). **Diese Entscheidung stand bis zur Bestätigung unter dem Vorbehalt einer
Revision** — der Vorbehalt gilt als Verfahrensregel fort, auch nachdem die Bestätigung eintraf.

Grund: "keine Zurechnung" heißt, die Erscheinung behauptet nichts über den Absender (keine
Signatur nötig) — es heißt nicht, dass niemand sie mitbringt. Konkreter Fall: liefert eine
Institution ein White-Label-Produkt aus, bringt sie Marke UND Erscheinung mit; ohne `herkunft`
könnte man beim Wechsel nicht sagen, wessen Anordnung gilt, und der Fassungsvergleich
(`_einbettenMitFassung`) hätte nichts, woran er vergleicht.

### 8.4 · Drei Grenzen, vom Design-Strang nachgereicht

**A · Herkunft ist Buchführung, keine angezeigte Zuschreibung.** Die Marke MUSS sichtbar
zugeschrieben werden — sie sagt, wer spricht (U2-ADR-296-Familie). Die Erscheinung bekommt
**keine Zeile auf dem Schirm** ("Anordnung von: Sparkasse X"). Das System weiß, wer sie
mitgebracht hat (`herkunft` reist mit, wie bei jedem anderen Register); die Bürgerin muss es
nicht erfahren. Ausdrücklich hier festgehalten, sonst baut es jemand aus Symmetrie zur Marke
ein — dieser Zug fügt KEINE Anzeige hinzu, an keiner Stelle.

**B · Der Prüfstatus darf nicht über die geteilte Herkunft erben.** Der gefährliche Fall: im
White-Label liefert die Sparkasse Marke UND Erscheinung mit DERSELBEN `herkunft`. Die Marke ist
signiert und geprüft. Schlösse man daraus, die Erscheinung sei auch geprüft, wären die Achsen
durch die Hintertür wieder zusammengelegt — ein Erscheinungs-Modul trüge einen Status, den es
nie erworben hat. Das `herkunft`-Feld darf denselben Wert haben; `ungeprueft` und
`anbieterIdGeprueft` werden PRO MODUL ausgewertet (der dritte Parameter von `modulEinlassen`
gilt für GENAU DIESEN Aufruf, schaut nie in bestehende Depot-Einträge), nie über die gemeinsame
Herkunft abgeleitet. Heute gibt es keinen Code-Pfad, der das täte — der Rot-Beweis
(`tests/c3-zug2-erscheinung-einlassweg.test.js` `[Punkt-B·Rot-Beweis]`: eine geprüfte Marke
und eine ungeprüfte Erscheinung derselben `herkunft` nebeneinander, die Erscheinung bleibt
`ungeprueft: true`) ist eine Ratsche GEGEN künftigen Code, der das versehentlich einführen
würde, nicht der Beleg eines heutigen Fehlers.

**C · Fassungsvergleich wie bei der Marke ist für jetzt richtig, mit offener Frage.** Für die
Marke ist "neuer löst älter ab" tatsachenartig (ein Logo ist korrekt oder veraltet); für die
Erscheinung ist es Geschmack — eine Bürgerin könnte die ältere, ihr vertraute Anordnung
bewusst behalten wollen. `_einbettenMitFassung`/`modulFassungEntscheiden` (moduleVersion-
Vergleich) gilt unverändert wie bei den anderen elf Registern — das ist für diesen Zug richtig,
aber eine spätere Produktfrage (nicht Teil dieses Zuschnitts, kein heutiger Fehler).

### 8.5 · Verdrahtung

Zwei Aufrufer, wörtlicher Spiegel der Branding-Verdrahtung (U2-ADR-182 Task 4), keine dritte
Funktion: `_moduleEinlassWirken()` wendet das zuletzt eingelassene `erscheinungsModule`-Element
an (dieselbe "letztes gewinnt"-Regel wie beim Branding — welche von mehreren koexistierenden
Herkünften tatsächlich aktiv ist, ist dieselbe offene Frage wie beim Branding, nicht neu hier
entschieden), `_depotSpeicherZuruecksetzen()` räumt beim Schließen weg (`erscheinungAnwenden(null)`)
— kein Durchbluten der Erscheinung einer Institution ins nächste Depot, dieselbe Ursache wie
beim Branding-Leck (Fund, 28.08.2026).

**Bewusst NICHT verdrahtet:** der Vor-Depot-Weg (`_vorDepotSkriptLaden`) — Erscheinung ist
personen-/bürgerinnenseitig, kein institutionelles Vor-Depot-Provisionierungsgut wie Branding.
Kann nachgezogen werden, wenn ein echter Bedarf entsteht; kein zweiter Kanal ungefragt.

### 8.6 · Was weiterhin NICHT Teil dieses Baukastens ist

Kachel-Chrome-Token (border/shadow/radius) — eigener Satz, eigene Entscheidung, wo (§4 Zug 1).
Die drei Prüfmodule des Design-Strangs selbst und die 34-Selektoren-Präsenzprobe — Zug 3, der Design-Strang baut nicht.

**Suite:** `tests/c3-zug2-erscheinung-einlassweg.test.js`, 19/19 (Register-Existenz, Feld-
Optionalität, Format-Rot-Beweis px/rem/em, unbekannter Schlüssel, moduleVersion, unsignierter
Weg offen, erzwungene Gruppe, Kennung/Fassung × 4 (inkl. Punkt-B), Verdrahtung × 2,
Struktur-Riegel × 3).
