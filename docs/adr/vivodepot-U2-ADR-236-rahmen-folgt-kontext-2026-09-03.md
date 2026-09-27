# U2-ADR-236 · Rahmen folgt Kontext — Sub-Depot-Farbe von Rand statt Fläche nachgezogen

**Datum:** 03.09.2026
**Status:** Angenommen · gebaut 03.09.2026 (Suite grün)
**Status heute:** gilt
**Bezug:** Bruch C — Fläche→Rand-Umbau (27.08.2026, `tests/sub-depot-akzent-rand-statt-flaeche.test.js`,
kein eigenes ADR) · U2-ADR-024 (Sub-Depot-Akzent-Wurzel-Vererbung) · D47 (10.06.2026, Umkehr) ·
UX-Konzept §7/§8 (25.08.2026, Sidebar/Fußzeile auf Papierton) · Palettentausch (05.08.2026,
`3931e3e4`)

---

## 1 · Kontext

Am 27.08.2026 zeigte ein Live-Screenshot: die Sub-Depot-Fläche im **Content**
eines betretenen Vollmacht-Sub-Depots wirke „flächig grün" statt „Papier mit Rändern in der
Depot-Farbe" — Bruch C stellte diesen einen Bereich daraufhin von Fläche auf Rand um. Die
Design-Bewegung selbst war größer als dieser eine Umbau: „leichter und eleganter" — nirgends im
Kern eine Vollflächen-Füllung außer den bewusst benannten Ausnahmen. **Bei den Sub-Depots wurde
das nie vollständig nachgezogen.** Der sichtbare Verstoß, mit dem dieser Auftrag begann: der
Primär-Button „Mit Passwort öffnen" auf der Sub-Depot-Karte, flächig gefüllt.

Drei bestehende Entscheidungen berührten dieselbe Frage, jede geprüft, bevor etwas angefasst
wurde:

- **D47 (10.06.2026, Umkehr):** der Primär-Button füllt sich absichtlich mit dem Akzent — GLEICHE
  Tokens wie die Kartenkopfleiste. Richtig für sein Ziel (Sichtbarkeit/Prominenz) zum damaligen
  Zeitpunkt, von der späteren Rand-Regel überholt.
- **UX-Konzept §7/§8 (25.08.2026):** Sidebar und Fußzeile auf Papierton statt dunklem Chrome —
  eine Aussage über die FLÄCHE, nicht über jeden Rand. Schrieb sogar selbst einen (damals
  neutralen) Rand als Grenzlinie vor.
- **Palettentausch-Zug-2 (04.08.2026):** „Kopfzeile bleibt Salbei … sie ist der Rahmen und sagt
  'die Datei liegt bei Ihnen'" — bewusst FLÄCHE, nicht Rand.

**Nur die erste war eine Rücknahme.** Die beiden anderen klärten sich beim Messen als bereits
vereinbar mit der neuen Regel — s. Abschnitt 2. Die Rand-Regel selbst lebte bis zu diesem ADR nur
in einem Kommentar und einer Testdatei, nie in einer eigenen ADR (der Test sagt das wörtlich:
„WELCHE Form (Fläche/Rand) er dabei annimmt, war dort nie entschieden"). Eine Regel ohne benannte
Reichweite ist gegen genau diese Art Lücke wehrlos.

---

## 2 · Entscheidung

**Zwei Rahmen, nicht einer — als Gerüst-Regel formuliert, gilt für jedes künftige Modul, nicht nur
Sub-Depots (ausdrücklich: „Achtung, das ist Gerüst!"):**

> **Der äußere Rahmen gehört der Datei und bleibt Salbei. Der innere Rahmen gehört dem Depot, in
> dem man gerade ist. Die Karte trägt die Farbe des Depots, das sie darstellt.**

**Äußerer Rahmen = die Kopfzeile.** Sie sagt: *die Datei liegt bei Ihnen* — und das bleibt wahr,
gleichgültig in wessen Depot man darin gerade liest. Der Schrank ist der eigene, die Akte darin
gehört jemand anderem. Das ist keine Ausnahme von der Regel, sondern ihre genaue Fassung — sie
erklärt, WARUM die Kopfzeile anders bleibt, statt sie stillschweigend auszunehmen.

**Innerer Rahmen = Navigation, Fußzeile, Inhaltsrand.** Diese Stellen folgen dem Kontext:

- **Sub-Depot geschlossen (Karte in „Verwaltete Depots"):** die Farbe umläuft den GANZEN
  Kartenrahmen (Kopfleiste-Rand, Primär-Button-Rand), nicht nur eine einzelne Kante. Beide
  Karten-Render-Pfade — die aktive UND die archivierte — tragen jetzt dieselben Randfarben; die
  archivierte Karte hatte die Randlinie zuvor gar nicht (ein Nebenfund beim Bau, nicht Teil des
  ursprünglichen Auftrags — niemand hatte danach gesucht, bis der zweite Render-Pfad beim
  Durcharbeiten auffiel).
- **Sub-Depot geöffnet:** der innere Rahmen zieht sich durchs gesamte Depot — Navigation und
  Fußzeile eingeschlossen. Der äußere Rahmen (Kopfzeile) bleibt unverändert Salbei, in jedem
  Zustand — Palettentausch-Zug-2 (04.08.2026) bestätigt, nicht zurückgenommen.
- **Nie zwei Depot-Farben gleichzeitig im selben (inneren) Rahmen.** Die „Verwaltete Depots"-Liste
  ist kein Sonderfall: jede Karte darin trägt die Farbe des Depots, das sie DARSTELLT — der Rahmen
  darum bleibt Salbei, weil man das eigene Depot ansieht, das die Liste zeigt.

**Genau EINE Rücknahme, nicht drei:**

1. **D47 — Rücknahme, bestätigt.** Der Primär-Button wird Rand statt Fläche
   (`.sektion[data-sub] .btn-vertretung`). Sekundär-Buttons bleiben unverändert neutral. Grund:
   das Produkt wurde insgesamt von Fläche auf farbigen Rand umgestellt („leichter und eleganter");
   die Sub-Depots wurden dabei vergessen — kein Fehler in D47 selbst, eine spätere, allgemeinere
   Entscheidung überholte sie.
2. **§7/§8 — keine Rücknahme, additive Erweiterung.** Die Fläche (Papierton) und die neutrale
   `border-right`-Grenzlinie bleiben unangetastet, wie dort entschieden — §7/§8 traf nie eine
   Aussage über eine ZWEITE, akzentfarbene Randlinie. Zusätzlich: ein `border-left`-Streifen.
3. **Kopfzeilen-Fläche (Palettentausch-Zug-2) — keine Rücknahme, bestätigt.** Geprüft und
   ausdrücklich bestätigt: „3 Salbei lassen". Bleibt unverändert `--salbei-dunkel`, jeder
   Zustand — das ist jetzt der ÄUSSERE Rahmen aus der Zwei-Rahmen-Regel, kein übersehener Fall.

---

## 3 · Umsetzung

**Neuer, allgemeiner Mechanismus statt Einzel-Selektoren:** `--akzent-papier` spiegelt `--akzent`
(U2-ADR-024 §2) — Default `var(--salbei-mid)`, von `setzeSubDepotAkzent()` auf
`var(--<tok>-papier-linie)` gezogen, von `entferneSubDepotAkzentOverride()` zurückgesetzt.
Navigation UND Fußzeile lesen denselben Token; „ein Satz" ist im Code buchstäblich EIN Custom
Property, nicht mehrere Selektor-Overrides.

**Zwei Randfassungen je Farbe, nicht eine:** die bestehenden `-linie`-Töne sind gegen Weiß
kalibriert (Content-Karten, `--vm-linie`/`--sd-akzent-linie`, unverändert). Gemessen (nicht
angenommen): gegen die tatsächliche Fläche von Sidebar/Fußzeile (`--papier-bereich`, #fdfbf7 hell)
unterschreiten drei der sechs Bestandsfarben 3:1 (ton 2,92:1, altrose 2,91:1, nebel 2,92:1). Neue
`-papier-linie`-Fassung je Farbe, alle acht ≥3,06:1 in allen drei Themes — Tabelle im Style Guide
§2.3.

**Palette sechs auf acht:** zwei neue Töne, `--schilf` (#bbcda7, H88°) und `--malve` (#cdadc4,
H316°) — die zwei größten leeren Lücken im Hue-Kreis der bestehenden sechs, Grün bewusst gemieden
(Salbei-Kollision: „das ist mein eigenes Depot"). Additiv angehängt (`SUBDEPOT_PALETTE`,
`SUBDEPOT_DEFAULT_REIHENFOLGE`), Bestands-Sub-Depots mit einem der ersten sechs Tokens unberührt.

**Betroffene Stellen:**
- `.sektion[data-sub] .btn-vertretung` (+ generische Basisregel `.btn-vertretung`): Rand statt Fläche.
- Beide Karten-Render-Pfade (`renderVerwalteteDepots`, aktiv + archiviert): `--sd-akzent-linie` UND
  neu `--sd-akzent-stark` inline gesetzt.
- `.nav-item.aktiv`: `border-left-color` von fest `--salbei-mid` auf `--akzent-papier`.
- `.sidebar`: zusätzlicher `border-left: 3px solid var(--akzent-papier)`, §7/§8s `border-right`
  unverändert.
- `.app-fuss`: die bisherige neutrale `border-top: 1px solid var(--line)` wird
  `border-top: 3px solid var(--akzent-papier)`.
- 6 neue `--<token>-papier-linie`-Custom-Properties + 2 neue Farbtöne (Fläche/-text/-linie/
  -papier-linie je viermal).

---

## 4 · Rot-Beweis

Unit-Ebene (`tests/sub-depot-akzent-rand-statt-flaeche.test.js`, erweitert statt verdoppelt —
dasselbe Prinzip, eine Probe): 22 Proben, alle vorher rot mit dem erwarteten Grund (fehlende Regel/
fehlendes Token), alle nachher grün. Vier Bestandstests in drei weiteren Dateien hatten die alten
Werte (`--salbei-mid`, `var(--line)`) fest einprogrammiert — aktualisiert, dieselbe Eigenschaft
geprüft, nur der Token-Name geändert.

Browser-Ebene, echt gefahren (Playwright, `tests/e2e/sub-depot-rahmen-folgt-kontext.spec.js`,
Anker über Tag/ID — `header`/`#sidebar`/`#app-fuss` — nicht CSS-Klasse oder Position): zwei Proben.
Die Kopfzeilen-Probe bestand SCHON VOR dem Fix — im Testkommentar so festgehalten, nicht als neuer
Bau ausgegeben (dieser Mechanismus war bereits korrekt, s. Abschnitt 1). Die Navigation/Fußzeile-
Probe war der echte Rot-Beweis: `vivodepot.html` kurz auf den Vor-ADR-236-Stand zurückgesetzt,
Playwright erneut gefahren, Probe schlug fehl (`expect(subNav).not.toBe(ankerNav)` — beide gleich),
Datei danach wiederhergestellt.

---

## 5 · Geprüft und unverändert gelassen

Zur Vollständigkeit, damit ein späterer Leser diese drei Stellen nicht für vergessen hält: die
Kopfzeilen-FLÄCHE (`--salbei-dunkel`, jeder Zustand), §7/§8s neutrale `border-right`-Grenzlinie und
die kleinen Status-Punkte/der Toast (weiterhin voll gefüllt, Abschnitt 2 des Style Guide §2.3)
wurden alle geprüft und bewusst NICHT geändert — kein offener Punkt, keine übersehene Reichweite.

---

*Vivodepot GmbH · Berlin · 03.09.2026*
