# U2-ADR-236 · Rahmen folgt Kontext — Sub-Depot-Farbe von Rand statt Fläche nachgezogen

**Datum:** 03.09.2026
**Status:** Angenommen · gebaut 03.09.2026 (Suite grün)
**Status heute:** gilt, mit Nachtrag 09.10.2026 (die ganze Oberfläche trägt den Ton, neue Palette)
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

## Nachtrag 09.10.2026 · die ganze Oberfläche im Ton des Depots, neue Palette

**Festgelegt am 05.10.2026, gebaut nach „Fläche statt Linien“ (07.10.2026):** Im geöffneten Sub-Depot trägt die ganze
Oberfläche den Ton des Depots: Kopfzeile, Seitenleiste, Inhalt, Fuß, Banner und Karten. Ausgenommen ist nur die Marke in der Kopfzeile.
Kein Salbei neben der Depot-Farbe, keine Linie. Die Fläche ist der Pastellton; Knöpfe und der aktive Bereich nehmen seinen dunklen
Partner (Mischung mit neutralem Dunkel). Der Ton selbst ist nie Schriftfarbe. Nachts wird die Fläche nicht dunkler, sondern bleibt
klar: Banner, aktiver Bereich und Hauptknopf sind ein helles Band mit dunkler Schrift.

**Palette (acht Töne):** Ton, Altrose, Nebel, Kiesel, Malve, Pfirsich, Hellblau, Rosé. Hafer, Schilf und Flieder wählt kein neues Depot
mehr. Ein Bestandsdepot behält seinen Namen in der Datei und wird nur in der Anzeige abgebildet: Hafer → Pfirsich, Schilf → Nebel,
Flieder → Malve (`SUBDEPOT_ANZEIGE_ABBILDUNG`). Die Abbildung schreibt nichts.

**Werte aus dem Modul, Mechanik im Gerüst:** Die Töne und ihre Fassungen (`--<ton>`, `-text`, `-linie`, `-papier-linie`) stehen im
Erscheinungsbild-Modul; das Gerüst kennt nur die Namen, die Abbildung und die Rollen. Auch das PDF liest die Töne aus dem Modul
(`_subDepotModulHex`), die frühere Kopie der Werte im Kern entfällt. Die Namen der Töne kommen aus dem Textsatz
(`strings:subFarbeName<Ton>`, DE und EN).

**Kontrast, gerechnet über die acht Töne:** Schrift hell ≥ 5,9:1 (Seitenleiste), 7,9:1 (Inhalt), 9,9:1 (Karten); weiße Schrift auf dem
Partner ≥ 6,9:1; Feldkante ≥ 4,7:1; nachts Schrift ≥ 4,9:1, Banner 9,0:1. Die Regeln gelten nur in einem eingehängten Depot (`.vm-akzent`),
nicht im reinen Vollmacht-Modus mit seinem dunklen Akzent: sonst nähme der Kern bei einem einzigen Kontrastverstoß das ganze
Erscheinungsbild zurück.

**Partnerfarben (Kontrastboden und Farbabstand).** Ein Partner kann die acht Töne der Sub-Depots selbst kuratieren (`_subdepotPartnerPaletteGueltig`). Geprüft wird die ganze Palette, nicht der einzelne Ton: Reißt ein Ton eine der Bedingungen, wird die gesamte Partner-Palette verworfen, und das Haus bleibt bei seinen Tönen („abweisen, nicht abdunkeln“, wie U2-ADR-408 und U2-ADR-297). Jeder der acht Töne muss

1. gegen Weiß (`#ffffff`) und gegen Papier (`#fdfbf7`) ein Kontrastverhältnis von mindestens **1,15** erreichen (`_SUBDEPOT_PARTNER_MIN_KONTRAST`; bis zum 09.10.2026, Fassung v922, galt 1,5), und
2. von der Salbei-Leiste des eigenen Depots (`#e2eada`) einen Farbabstand **ΔE2000 ≥ 12** haben (`_SUBDEPOT_PARTNER_MIN_DELTA_E`, gerechnet nach CIEDE2000, Sharma/Wu/Dalal 2005, `_farbAbstandDE2000`).

*Warum der Boden sinkt.* Seit der Palette vom 05.10.2026 ist der Ton Fläche, nicht Linie. Die hellen Haus-Töne liegen unter 1,5: Pfirsich 1,22/1,18, Hellblau 1,20/1,16, Rosé 1,27/1,22 gegen Weiß/Papier (Quellkommentar `vivodepot.html:29412-29414`). Bei 1,5 bestünde die Haus-Palette ihre eigene Prüfung nicht. 1,15 fängt weiter Töne, die fast weiß sind: `#fdf3f6` hat 1,09:1 gegen Weiß, liegt mit ΔE 14,6 aber weit genug von der Salbei-Leiste und fällt allein am Boden. Ein Ton wie `#fbfbfb` (1,03:1, ΔE 9,6) fällt an beiden Bedingungen.

*Warum ein Farbabstand dazukommt.* Der Boden sagt nichts darüber, ob sich die Fläche vom eigenen Depot abhebt. Ein blasses Grün mit genug Kontrast (`#dce6d4`, 1,29:1) liegt bei ΔE 1,5 zur Salbei-Leiste und ginge als Fläche durch, ohne als Farbe eines anderen Depots erkennbar zu sein. Das Kriterium trägt die Fläche über den Farbton. Bezugswert ist die Pastell-Tabelle vom 05.10.2026 (Pfirsich zur Salbei-Leiste: 12,1); die acht Haus-Töne erfüllen es.

*Was gleich bleibt.* Die Haus-Palette besteht als Partner-Palette dieselbe Prüfung. Ohne Partner-Palette ändert sich nichts (`AB_WERK_SUBDEPOT_PALETTE_PRODUKT = null`). Die Kontrast-Zahlen darüber (Schrift, Feldkante, Nacht) betreffen die abgeleiteten Fassungen der Töne und bleiben unberührt.

**Proben:** `tests/e2e/sub-depot-rahmen-folgt-kontext.spec.js` (Kopfzeile im Ton, Marke unverändert, mit Rot-Beweis „Akzentfläche an
der Marke“; Seitenleiste und Inhalt im Ton und zurück; zwei Töne, zwei Flächen) · `tests/e2e/flaeche-statt-linien.spec.js` (keine Linie
im Sub-Depot) · die Wächter der Färbung im Vollmacht-Modus und `tests/sub-depot-akzent-rand-statt-flaeche.test.js` (umgestellt) ·
`tests/pdf-subdepot-akzent.test.js` (PDF aus dem Modul) · `tests/subdepot-partner-palette.test.js` (Partnerfarben).

## Konformität

```konformitaet
aussage:   Die acht Haus-Töne bestehen als Partner-Palette Boden 1,15 und ΔE2000 ≥ 12 zur Salbei-Leiste; fast weiß
           (#fbfbfb) und blasses Grün (#dce6d4) werden verworfen.
zustand:   geprüft
herkunft:  U2-ADR-236-Nachtrag (09.10.2026)
pruefung:  tests/subdepot-partner-palette.test.js#[Partner-Palette·Kriterien] die acht Haus-Töne erfüllen Boden und Farbabstand; fast weiß und blasses Grün werden verworfen
```

```konformitaet
aussage:   Reißt ein einzelner Ton eine der Bedingungen (Kontrastboden oder Farbabstand), wird die ganze Partner-Palette
           verworfen, nicht nur der eine Ton.
zustand:   geprüft
herkunft:  U2-ADR-236-Nachtrag (09.10.2026), Regel aus U2-ADR-408
pruefung:  tests/subdepot-partner-palette.test.js#[Schritt 6·Gültigkeitsprüfung·Rot-Beweis] EIN Ton unter dem Kontrast-Boden verwirft die GANZE Palette, nicht nur den einen Ton
```

---

*Vivodepot GmbH · Berlin · 03.09.2026 · Nachtrag 09.10.2026*
