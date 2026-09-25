# U2-ADR-297: Ein Produkt mit Vor-Depot-Konfiguration füllt die Kopfzeile mit der Institutionsfarbe — Fall 2 aus U2-ADR-296

**Status:** Angenommen
**Datum:** 05.09.2026
**Kategorie:** ARCHITEKTUR
**Linie:** U2
**U2-Bezug:** U2-ADR-296 (05.09.2026, Fall 1 — Rand statt Fläche, Fall 2 dort explizit
offengelassen), U2-ADR-294 §3 (05.09.2026, „Kopfzeile bleibt für immer Salbei" — hier präzisiert,
nicht zurückgenommen), U2-ADR-236 (03.09.2026, „Rahmen folgt Kontext").
**Anker:** Auftrag vom 05.09.2026, Entscheidung, wörtlich: „die sparkasse zb
färbt rot".
**Status heute:** gilt — Fall 2 vollständig gebaut, s. Konformität.

---

## Kontext

U2-ADR-296 baute Vivodepots eigenes Branding (Datenwert, globale Schriftart) und Fall 1 (ein
fremder Beitrag INNERHALB eines bestehenden Bürgerdepots trägt einen Rand), ließ Fall 2 aber
ausdrücklich offen: ein Produkt, dessen Branding über die Vor-Depot-Konfiguration ankommt —
bevor irgendein Bürgerdepot existiert —, sollte laut Entscheidung die Kopfzeile
durchgehend füllen dürfen. Zwei Gründe für den damaligen Aufschub: (1) ob der Code die beiden
Träger (Vor-Depot-Konfiguration vs. bereich-gebundenes Andocken) bis zur Anwendung sauber
trennt, war ungemessen; (2) eine Kontrast-Ableitung für Text auf einer beliebigen
Institutionsfarbe existierte nicht.

**Widerspruch, unabhängig entdeckt, hier aufgelöst statt stillschweigend übergangen:**
U2-ADR-294 §3 hatte, am selben Tag und unabhängig von U2-ADR-296 auf denselben Fund gestoßen,
formuliert: „der äußere Rahmen (Kopfzeile) bleibt für immer Salbei, für jedes künftige Modul" —
unter Berufung auf U2-ADR-236. Das trifft auf U2-ADR-236 selbst zu eng zu: jener ADR entscheidet
den Sub-Depot-Akzent (`--vm-*`, Anker-Datei vs. eingehängtes Depot), nicht die Frage, ob ein
Institutions-Branding-Modul die Kopfzeile je füllen darf — eine Übertragung, keine eigene
Entscheidung zu dieser engeren Frage. Die engere Frage wurde seither gesondert
entschieden, für GENAU den Vor-Depot-Fall. U2-ADR-294 §3 bleibt für den dort tatsächlich
gebauten Fall (Bereich-Modul, In-Depot angedockt) unverändert wahr — s. NACHTRAG dort.

## Entscheidung

### 1. Der Träger entscheidet — kein neues Herkunfts-Feld nötig

Gemessen, nicht angenommen: Vor-Depot-Konfiguration (`vorDepotKonfigurationAnwenden`, läuft
einmal, vor jedem Bürgerdepot) und In-Depot-Andocken (`_moduleEinlassWirken`, läuft danach, pro
Depot) sind bereits zwei nie verwechselbare Code-Pfade — der eine kann nicht in den anderen
hineinlaufen. Die Trennung liegt darum am AUFRUFORT: nur `vorDepotKonfigurationAnwenden` ruft
die neue `_brandingProduktTopbarAnwenden` zusätzlich zum bestehenden, gemeinsamen
`brandingAnwenden`; der In-Depot-Pfad ruft weiterhin nur Letzteres. Kein zweiter Mechanismus,
keine Herkunfts-Prüfung — der bereits bestehende Aufrufort trägt die Grenze.

Eigene CSS-Variablen (`--vd-branding-topbar-primaer`/`-sekundaer`/`-text`), nicht
`--vd-branding-primaer` wiederverwendet: dieselbe Vermischungsgefahr wie bei `--akzent`
(U2-ADR-296) — eine In-Depot angedockte Fremdmarke (Fall 1) darf die Kopfzeile nie färben, auch
nicht als Nebenwirkung einer gemeinsamen Variable.

```css
.topbar {
  background: var(--vd-branding-topbar-primaer, var(--salbei-dunkel));
  color: var(--vd-branding-topbar-text, var(--auf-akzent));
  /* border-bottom bleibt bei --akzent — eigene, unberührte Achse (Sub-Depot) */
}
```

Reset bewusst NICHT an `_depotSpeicherZuruecksetzen()` gehängt: jener Reset behebt ein
In-Depot-Branding-Leck zwischen zwei Depots derselben Sitzung (Fall 1, Fund
28.08.2026) — die Vor-Depot-Konfiguration selbst ist eine Installations-Konstante für den
gesamten Boot-Vorgang, unabhängig davon, welches Depot gerade offen ist; ein Depot-Wechsel
ändert nicht, welches Produkt gerade läuft.

### 2. Kontrast wird zur Laufzeit gerechnet, nicht nachgeschlagen

`subDepotTextFarbe` (im Auftrag als Vorbild genannt) erwies sich beim Nachlesen als **keine**
Kontrastrechnung — eine reine Tabellen-Rückgabe auf eine geschlossene, acht Farben umfassende
Palette, deren Text-Gegenwert je einmal von Hand gerechnet und fest verdrahtet ist. Eine
Institutionsfarbe ist beliebiger Hex, nicht Teil dieser Palette. Eine echte
Kontrastrechnung existierte im Repo nur test-seitig (`tools/lib/kontrast.js`), nie in
`vivodepot.html` eingebunden. Neu, klein, reine Hex-Arithmetik (`farbePrimaer` ist über
`_BRANDING_HEX_MUSTER` bereits auf `#RRGGBB` geprüft, kein CSS-Parser nötig): WCAG-
Relativleuchtdichte + Kontrastverhältnis, entschieden zwischen genau zwei Text-Kandidaten
(`#ffffff`, `#1c2a1e` — Letzteres dasselbe Dunkel-Token-Äquivalent wie bei den Sub-Depot-
Text-Tokens).

**Eine Farbe, die das WCAG-AA-Maß (4.5:1) gegen BEIDE Kandidaten reißt, wird abgewiesen — die
Kopfzeile bleibt beim Fallback (Salbei/`--auf-akzent`), nicht bei einer unlesbaren Farbe.**
Wörtlich die Vorgabe: „Eine Marke, die das axe-Gate reißt, muss abgewiesen werden,
nicht durchgelassen." Die Ablehnung trifft bewusst nur die Kopfzeilen-Fläche dieses einen
Boot-Vorgangs — Schriftart/Name/Logo desselben Branding-Moduls bleiben unberührt, kein
Rundum-Verwurf eines sonst gültigen Moduls wegen eines einzelnen Farbfeldes.

### 3. Fallback ist der eigentliche Vertrag

Ein Depot ohne Vor-Depot-Branding-Modul — Vivodepots eigenes Bürgerdepot inklusive — sieht aus
wie heute: `var(--vd-branding-topbar-primaer, var(--salbei-dunkel))` fällt unverändert auf
Salbei zurück, solange kein Modul die Variable setzt.

## Was dieser ADR nicht ändert

Fall 1 (U2-ADR-296) bleibt unverändert: ein fremder Beitrag INNERHALB eines bestehenden
Bürgerdepots zeigt sich weiter nur am Rand (`.content-narrow.marke-fremd`), nie an der
Kopfzeile. `--akzent`/`--vm-*` (Sub-Depot, Tag/Nacht) bleiben unberührt, eigener
Bedeutungsträger — Marke sagt, wessen Produkt das ist; Akzent, in wessen Depot man liest; zwei
Achsen, wie in U2-ADR-296 benannt.

## Konsequenzen

Ein Depot ohne Branding-Modul sieht in jeder hier gebauten Hinsicht aus wie vor diesem ADR — die
Fallback-Kette ist additiv. Jede künftige Institutionsfarbe bleibt vom neuen Kontrast-Gate
gedeckt, nicht nur vom bestehenden Hex-Format-Wächter.

## Konformität

```konformitaet
aussage:  _brandingProduktTopbarAnwenden hat genau einen Aufrufort im Kern (die Vor-Depot-
          Konfiguration) — der In-Depot-Andockpfad ruft sie nie.
zustand:  geprüft
herkunft: invariante
pruefung: tests/branding-topbar-produkt.test.js#[U2-ADR-297·Rot-Beweis] _brandingProduktTopbarAnwenden hat GENAU EINEN Aufrufort im Kern (die Vor-Depot-Konfiguration) — der In-Depot-Andockpfad ruft sie nie
```

```konformitaet
aussage:  Die Kontrastrechnung wählt Weiß oder Dunkel je nach Institutionsfarbe und weist eine
          Farbe zurück, die gegen beide Kandidaten unter 4.5:1 bleibt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/branding-topbar-produkt.test.js#[U2-ADR-297] _brandingTopbarKontrastText wählt Weiß für ein dunkles Institutions-Rot (Fixture, kein echtes Institutions-Logo)
pruefung: tests/branding-topbar-produkt.test.js#[U2-ADR-297] _brandingTopbarKontrastText wählt Dunkel für ein helles Institutions-Grau
pruefung: tests/branding-topbar-produkt.test.js#[U2-ADR-297·Gegenprobe] _brandingTopbarKontrastText weist ein Mittelgrau zurück, das gegen BEIDE Kandidaten unter 4.5:1 bleibt
```

```konformitaet
aussage:  Eine kontrastschwache Institutionsfarbe wird abgewiesen (Fallback bleibt stehen), ein
          gültiges Sekundärfeld/Schriftart desselben Moduls bleibt trotzdem wirksam.
zustand:  geprüft
herkunft: invariante
pruefung: tests/branding-topbar-produkt.test.js#[U2-ADR-297·Gegenprobe] eine Institutionsfarbe, die das Kontrast-Gate reißt, wird abgewiesen — die Kopfzeile bleibt beim Fallback, nicht bei einer unlesbaren Farbe
pruefung: tests/branding-topbar-produkt.test.js#[U2-ADR-297·VDK-Integration] ein Vor-Depot-Bündel mit kontrastschwacher Farbe lässt die Kopfzeile beim Fallback, obwohl Schrift/Name trotzdem wirken
```

```konformitaet
aussage:  Ein eingelassenes, signiertes Vor-Depot-Branding-Bündel füllt nach
          vorDepotKonfigurationAnwenden auch die Kopfzeilen-CSS-Variablen; ein unsigniertes
          Bündel wirkt nicht (branding bleibt nurGeprueft).
zustand:  geprüft
herkunft: invariante
pruefung: tests/branding-topbar-produkt.test.js#[U2-ADR-297·VDK-Integration] ein eingelassenes Vor-Depot-Branding-Bündel füllt nach vorDepotKonfigurationAnwenden auch die Kopfzeile
pruefung: tests/branding-topbar-produkt.test.js#[U2-ADR-297·VDK-Integration·Rot-Beweis] ein UNSIGNIERTES Branding-Bündel füllt auch die Kopfzeile NICHT (branding ist nurGeprueft)
```

```konformitaet
aussage:  Das bestehende, geteilte brandingAnwenden (Fall 1, In-Depot-Pfad) setzt nie die
          Kopfzeilen-Variablen — zwei getrennte Bedeutungsträger, keine Vermischung.
zustand:  geprüft
herkunft: invariante
pruefung: tests/branding-topbar-produkt.test.js#[U2-ADR-297·Gegenkontrolle] das bestehende, geteilte brandingAnwenden (Fall 1, In-Depot-Pfad) setzt NIE die Topbar-Variablen — zwei getrennte Bedeutungsträger
```

```konformitaet
aussage:  Die Kopfzeile ändert im echten Browser sichtbar Hintergrund- und Textfarbe
          (getComputedStyle), nicht nur eine CSS-Custom-Property — und bleibt beim
          Salbei-Fallback, wenn die Institutionsfarbe kontrastschwach ist.
zustand:  geprüft
herkunft: invariante
pruefung: tests/e2e/marke-topbar-produkt-sichtbar.spec.js#ein Vor-Depot-Branding-Modul füllt die Kopfzeile sichtbar mit der Institutionsfarbe (rgb, nicht der Salbei-Fallback)
pruefung: tests/e2e/marke-topbar-produkt-sichtbar.spec.js#eine kontrastschwache Institutionsfarbe füllt die Kopfzeile NICHT — der Salbei-Fallback bleibt sichtbar bestehen
```

---

*Vivodepot GmbH · Berlin · 05.09.2026*
