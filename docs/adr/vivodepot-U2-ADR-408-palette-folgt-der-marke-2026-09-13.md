# U2-ADR-408: Die Palette folgt der Marke — White Label bis zum letzten Grünton

**Status:** Angenommen
**Datum:** 13.09.2026
**Kategorie:** ARCHITEKTUR
**Linie:** U2
**U2-Bezug:** U2-ADR-296 (05.09.2026, Fall 1 — Rand statt Fläche), U2-ADR-297 (05.09.2026,
Fall 2 — Vor-Depot-Konfiguration füllt die Kopfzeile, Kontrast zur Laufzeit), U2-ADR-400
(10.09.2026, Reichweite bis ins PDF, EIN Herkunftsort), U2-ADR-384 (08.09.2026, Branding wird
Ab-Werk-Saat). Erweitert die Reichweite aus U2-ADR-400 von der Kopfzeilenfläche auf die
Palette; zieht KEINE der Fall-Unterscheidungen zurück.
**Anker:** Entscheidung vom 13.09.2026, wörtlich: „White label ist, wenn kein VD Design
übrig bleibt, sondern alles das Design des Kunden ist."
**Status heute:** gilt — gebaut, s. Konformität.

---

## Kontext

U2-ADR-400 hatte es schon entschieden: „White Label heißt: alles Sichtbare gehört dem Partner."
Gebaut war davon die Kopfzeilenfläche.

**Gemessen am 13.09.2026**, an einem konfektionierten Sparkassen-Produkt (Achsen-Testfixture,
`tests/fixtures/achse-branding-berliner-sparkasse.json`), nach Anwendung des Vor-Depot-Wegs:

```
--akzent            #4F6539        unverändert — 21 CSS-Regeln hängen daran
Topbar-Unterkante   rgb(79,101,57) grüne Linie direkt unter der blauen Fläche
Seitenleiste aktiv  rgb(79,101,57)
Links               rgb(74,94,79)
```

Die grüne Kante unter der blauen Fläche war sogar ausdrücklich so gebaut (U2-ADR-297:
„border-bottom bleibt bei `--akzent` — eigene, unberührte Achse").

Der Kern trägt **58 Farb-Tokens**. Sie zerfallen in vier Gruppen, und nur eine ist die Erscheinung des Hauses.

## Entscheidung

> Der TON kommt von der Marke, HELLIGKEIT und SÄTTIGUNG von der ROLLE. Was Bedeutung trägt,
> bleibt unberührt.

### 1. Sechzehn Tokens folgen der Marke, zweiundvierzig nicht

Gefärbt wird (`_VD_BRANDING_PALETTE_ROLLEN`): `--salbei-dunkel/-mid/-light/-nacht` ·
`--gold`/`--gold-soft` · `--cream`/`--papier-bereich`/`--line`/`--line-feiner`/`--btn-sek-hover` ·
`--ink`/`--ink2`/`--ink3` · `--wortmarke-vivo`/`--wortmarke-depot`, dazu `--auf-akzent`
(die Schrift AUF der Markenfläche) und `--success` (s. Punkt 4).

**Nicht gefärbt, mit Grund:**
- **Bedeutung, nicht Marke** — `--error`, `--warning`, `--info`, `--teal`, die fünf `--ampel-*`,
  `--modus-notfall/-vollmacht/-angehoerigen`, Fehler- und Notfallflächen. Ein Warnrot ist
  Konvention, kein Vivodepot-Design; färbte man es mit, verlöre die Kundin die Ampel.
- **Eigene Achse** — `--hafer`/`--schilf` und Familie (Sub-Depot-Palette).
- **Echte Neutrale** — `--white`, `--dok-*`.

Ein Wächter hält diesen Schnitt strukturell, nicht an einem Einzelfall: kein
Bedeutungs-Token darf je in der Rollen-Tabelle stehen.

### 2. Nur der Ton wird übernommen — nie die Helligkeit

Eine Mischung „Markenfarbe plus Weiß" wäre der naheliegende Weg und der falsche: sie hängt die
Lesbarkeit an die Helligkeit der Marke. Ein helles Marken-Gelb ergäbe ein `--ink3`, das auf
`--cream` nicht mehr lesbar ist. Übernommen wird darum nur der Farbwinkel; Helligkeit und
Sättigungsdeckel jeder Rolle sind fest und stammen aus den eigenen Werten des Hauses.

### 3. Die Latte ist erhoben, nicht gesetzt — und eine zweite Stufe trägt sie

**Gemessen**: das eigene `--ink3` des Hauses auf `--cream` liegt bei **4.50** — exakt auf dem
AA-Maß. Die abgeleitete Palette wird gegen dieselben fünf Paare geprüft.

Die erste Fassung baute jede Rolle allein aus Ton und Rollen-Helligkeit. Damit kam Vivodepots
**eigene** Farbe auf 4.15 und wurde von der eigenen Prüfung verworfen — der Grund ist
physikalisch: die Rollen-Helligkeit allein bestimmt die Leuchtdichte nicht, der Farbton tut es
mit (Grün ist bei gleicher Helligkeit leuchtender als Blau). Eine Tabelle mit nachjustierten
Zahlen hätte diesen einen Fall geheilt und den nächsten Farbton wieder gerissen. Darum eine
zweite Stufe: jede Textfarbe wird in 1%-Schritten abgedunkelt, bis ihr Paar hält. Reißt danach
noch eines, wird die GANZE Ableitung verworfen und es bleibt bei die Palette des Hauses — dieselbe
Haltung wie an der Kopfzeile.

**Die Marke selbst bleibt exakt**, solange auch nur einer der zwei Textkandidaten auf ihr das
AA-Maß hält — dieselbe Funktion wie an der Kopfzeile, damit nicht zwei Stellen verschieden
urteilen. Ein helles Gelb wird also NICHT abgedunkelt, es bekommt dunkle Schrift.

**Trägt kein Kandidat, wird abgewiesen — nicht abgedunkelt.** Die erste Fassung dieses Baus tat
das Gegenteil: sie dunkelte eine abgewiesene Farbe ab, bis ein Kandidat trug, und schrieb sie in
`--salbei-dunkel`. Die Kopfzeile fällt aber genau darauf zurück
(`var(--vd-branding-topbar-primaer, var(--salbei-dunkel))`) — eine Farbe, die U2-ADR-297
ABGEWIESEN hatte, erschien damit doch dort, nur über einen anderen Weg. Gefangen hat es der
bestehende E2E-Wächter (`marke-e2e-abnahme`, „Kontrast-Gegenprobe"): erwartet `rgb(79,101,57)`,
gemessen `rgb(118,118,118)`. Die Produktentscheidung dazu stand längst und gilt unverändert —
„Eine Marke, die das axe-Gate reißt, muss abgewiesen werden, nicht durchgelassen"; Abdunkeln ist
Durchlassen mit einem anderen Wert. **Eine Entscheidung je Modul, nicht zwei.**

### 4. `--success` löst sich vom Markenton

`--success: var(--salbei-dunkel)` — „geschafft" war an den Markenton geschweißt. Ohne Eingriff
trüge die Erfolgsmeldung eines Sparkassen-Produkts die **Fehlerfarbe**. `--success` wird darum
auf den semantischen Grünton gesetzt, der ohnehin im Haus ist (`--ampel-gruen`); ein Wächter
hält die Konstante gegen die CSS-Deklaration.

### 5. Derselbe Aufrufort, dieselbe Grenze

`_brandingPaletteAnwenden` wird NUR aus `vorDepotKonfigurationAnwenden` gerufen, gebunden an das
ECHTE, signierte Vor-Depot-Bündel — nicht an die Ab-Werk-Saat. Sonst färbte Vivodepots eigene
Marke die ganze Palette um, ohne dass je ein Bündel andockte. Ein Rot-Beweis hält, dass es
genau einen Aufrufort gibt: ein zweiter im In-Depot-Pfad zöge die Palette einer angedockten
Fremdmarke über das ganze Depot.

## Was dieser ADR nicht baut

**Die Lese-App** (`vivodepot-lesen.html`) kennt Branding weiterhin nicht — U2-ADR-400 hat das
bereits als eigene Lücke benannt (eigene Kopie, kein CSS-Hook). Die Palette hier ändert daran
nichts. **Nachtrag 13.09.2026, noch am selben Tag:** geschlossen, in zwei Zügen — Kopfzeile
(`_markeFarbeAnwenden`, dieselben Kontrast-Primitive wörtlich gespiegelt) und Palette
(`_markePaletteAnwenden`/`_lesenPaletteAbleiten`, fünf eigene Rollen statt der hier
beschriebenen sechzehn: `--akzent` trägt in dieser App Modus-Bedeutung, anker/sub/notfall,
keine Marken-Rolle — `_brandingPaletteAbleiten` selbst wurde darum bewusst NICHT gespiegelt, s.
Kopf-Kommentar über `_hexZuRgb` in vivodepot-lesen.html). Geprüft:
`tests/lese-app-branding-css.test.js`, `tests/lese-app-branding-css-huelle.test.js`,
`tests/lese-app-palette.test.js`.

**Die Sub-Depot-Palette** bleibt ihre eigene Achse.

## Konsequenzen

Ein Produkt ohne Vor-Depot-Branding-Modul — das eigene Bürgerdepot des Hauses eingeschlossen —
sieht aus wie vorher: gesetzt wird nur, wenn ein echtes Bündel andockt, und der Reset räumt
jedes gesetzte Token. Dass die eigene Farbe des Hauses durch die eigene Ableitung wieder sie selbst
wird, ist geprüft — sonst wäre die Ableitung ein Umbau, keine Öffnung.

## Konformität

```konformitaet
aussage:  die eigene Farbe des Hauses wird durch die eigene Ableitung wieder sie selbst, und jedes
          geprüfte Paar hält das AA-Maß — für die eigene Farbe wie für eine fremde.
zustand:  geprüft
herkunft: invariante
pruefung: tests/branding-palette-folgt-marke.test.js#[Palette] die eigene Farbe des Hauses wird durch die eigene Ableitung wieder sie selbst
pruefung: tests/branding-palette-folgt-marke.test.js#[Palette] jedes geprüfte Paar hält das AA-Maß — für die eigene Farbe wie für eine fremde
```
```konformitaet
aussage:  Ohne die Nachdunkel-Stufe reißt die eigene Farbe des Hauses an --ink3; mit ihr hält
          dasselbe Paar.
zustand:  geprüft
herkunft: invariante
pruefung: tests/branding-palette-folgt-marke.test.js#[Palette·Rot-Beweis] ohne die Nachdunkel-Stufe reißt die eigene Farbe des Hauses an --ink3
```
```konformitaet
aussage:  Eine lesbare Fremdmarke bleibt exakt erhalten; eine helle Marke wird nicht
          abgedunkelt, sondern bekommt dunkle Schrift; eine Farbe, die gegen beide Kandidaten
          reißt, wird abgedunkelt statt durchgelassen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/branding-palette-folgt-marke.test.js#[Palette] eine lesbare Fremdmarke bleibt EXAKT erhalten, sie wird nicht verfälscht
pruefung: tests/branding-palette-folgt-marke.test.js#[Palette] eine HELLE Marke wird nicht abgedunkelt — sie bekommt dunkle Schrift
pruefung: tests/branding-palette-folgt-marke.test.js#[Palette] eine helle Marke wird trotzdem nicht abgedunkelt — Abweisung trifft nur die mittleren Töne
pruefung: tests/branding-palette-folgt-marke.test.js#[Palette·Gegenprobe] eine Farbe, die gegen BEIDE Kandidaten reißt, wird abgewiesen — die Palette bleibt beim Haus
```
```konformitaet
aussage:  --success löst sich vom Markenton und trägt den semantischen Grünton, der wortgleich
          als --ampel-gruen im CSS steht.
zustand:  geprüft
herkunft: invariante
pruefung: tests/branding-palette-folgt-marke.test.js#[Palette] --success löst sich vom Markenton — „geschafft" wird sonst rot
pruefung: tests/branding-palette-folgt-marke.test.js#[Palette·Wächter] der semantische Grünton steht wortgleich als --ampel-gruen im CSS
```
```konformitaet
aussage:  Kein Token, das Bedeutung trägt, steht in der Rollen-Tabelle, und
          _brandingPaletteAnwenden hat genau einen Aufrufort im Kern.
zustand:  geprüft
herkunft: invariante
pruefung: tests/branding-palette-folgt-marke.test.js#[Palette·Wächter] kein Token, das BEDEUTUNG trägt, steht in der Rollen-Tabelle
pruefung: tests/branding-palette-folgt-marke.test.js#[Palette·Rot-Beweis] _brandingPaletteAnwenden hat GENAU EINEN Aufrufort im Kern
```
```konformitaet
aussage:  Der Reset räumt jedes Token, das die Anwendung gesetzt hat.
zustand:  geprüft
herkunft: invariante
pruefung: tests/branding-palette-folgt-marke.test.js#[Palette] der Reset räumt JEDES Token, das die Anwendung gesetzt hat
```
