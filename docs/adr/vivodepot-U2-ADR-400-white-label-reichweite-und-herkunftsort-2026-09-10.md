# U2-ADR-400: White Label — Reichweite bis ins PDF, EIN Herkunftsort (Nummer beim Landen zu bestätigen)

**Status:** Angenommen
**Datum:** 10.09.2026
**Kategorie:** ARCHITEKTUR
**Linie:** U2
**U2-Bezug:** U2-ADR-296 (05.09.2026, Fall 1 — Rand statt Fläche), U2-ADR-297 (05.09.2026, Fall 2
— Vor-Depot-Konfiguration füllt die Kopfzeile), U2-ADR-384 (08.09.2026, Branding wird Ab-Werk-
Saat), U2-ADR-387 (08.09.2026, Ab-Werk-Rangfolge-Tabelle). Ergänzt U2-ADR-296/297 um die
Reichweite (wie weit Branding trägt) und den Herkunftsort (wo die Wortmarke bleiben darf) — zieht
KEINE der beiden Fall-Unterscheidungen zurück.
**Anker:** Entscheidung vom 10.09.2026, wörtlich: „das ist dann ein Sparkassen-Produkt
durch und durch." Entscheidungsdokument außerhalb des Repos, referenziert im Bericht.
**Status heute:** gilt — drei Züge gebaut, s. Konformität.

---

## Kontext

Beim Bau der Branding-Achse (Auftrag „Zwei ungebaute Achsen", selber Tag) fand sich: ein
konfektioniertes Branding-Produkt (`AB_WERK_BRANDING_PRODUKT`) kam textlich an (`_markeName()`),
aber `brandingAnwenden`/`_markeAnzeigeAnwenden` lasen an ihren drei Aufrufstellen ausschließlich
ein echtes, angedocktes `data.brandingModule`/`ziel.brandingModule` — nie die Ab-Werk-Saat.
Der Fund wurde zunächst fälschlich als „dritten Fall" weitergegeben; die Produktverantwortung
stellte richtig: **es sind zwei Fälle (U2-ADR-296) und drei Transportwege dorthin** — die Ab-Werk-Saat ist
nur ein weiterer Weg zu Fall 2, kein neuer Fall. Ein Fehler an einer entschiedenen Sache, keine
Entwurfslücke.

Nachgemessen, wie weit ein docktes/ab-Werk-Branding tatsächlich reicht:

```
PDF-Wortzug/-Farben   Literal 'VIVODEPOT', feste Farbkonstanten   kommt NICHT an
PDF-Copyrightzeile     '© ' + _markeName() gebaut, aber nie gelesen (dead code)
flowBereichPdf         null Branding-Bezüge (teilt sich zeichneVollDepotPdf mit dem Gesamt-PDF)
ICS-PRODID             _markeName()                                kommt an
Dateinamen             Literal 'Vivodepot_…'                       kommt NICHT an
Lese-App               null Branding-Bezüge, kein CSS-Hook          kennt Branding GAR NICHT
```

Bei White Label ist das kein Schönheitsfehler: **das PDF/die Datei ist, was das Haus verlässt** —
die Kundin sieht die Oberfläche einmal, ihr Gegenüber (Notar, Behörde, Angehörige) sieht das PDF
oder die Datei.

Die rechtliche Untergrenze steht bereits im Haus: `NOTICE.md` verlangt (Art. 5 EUPL), dass
Vivodepot als EUPL-1.2-lizenziertes Werk unter Mitgabe dieser Hinweise verteilt wird — nicht
sichtbar auf jeder Seite, auffindbar im Produkt genügt (Odoos „Powered by … + Impressum"-Bauform).
„VIVODEPOT" ist eingetragen (DPMA 3020262194222, `TRADEMARK.md`) — ein White-Label-Produkt darf
die Wortmarke weglassen, aber nicht als eigene Marke führen.

## Entscheidung

> White Label heißt: alles Sichtbare gehört dem Partner. EIN Ort im Produkt trägt die Herkunft —
> Lizenzhinweise und Impressumslink. Der Markenname erscheint dort, sonst nirgends.

### 1. Transportweg — ein Rückfall, drei Aufrufstellen

`_letztesBrandingOderAbWerk(liste)` ersetzt den harten `null`-Rückfall an allen drei
`brandingAnwenden`/`_markeAnzeigeAnwenden`-Aufrufstellen (Vor-Depot-Konfiguration, Depot-Reset,
In-Depot-Andockweg Fall 1) durch `_AB_WERK_BRANDING` — dieselbe Rangfolge, die `_markeName()`
bereits hatte. Ein FUND dabei, derselben Ursache wie U2-ADR-384s eigener Kommentar an
`_markeAnzeigeAnwenden`: `nativerName` war zugleich Rückfall-Name UND Auslöser der zweifarbigen
VIVO/DEPOT-Grafik — mit einem konfektionierten Branding-Produkt sind das zwei verschiedene
Fragen. `istEingebauteMarke` fragt jetzt gegen `AB_WERK_BRANDING` (die reine, nie überschreibbare
Herstellerin-Konstante), nicht mehr gegen den überschreibbaren Rückfall.

### 2. Reichweite — PDF, ICS, Dateinamen; NICHT die Schriftart

`_markeFarbePrimaerHex()`/`_markeFarbeSekundaerHex()` (dieselbe Rangfolge wie `_markeName()`,
neu für Farben) ersetzen die hartcodierten `GOLD`/`SALBEI`-Konstanten in `zeichneSituationPdf`/
`zeichneVollDepotPdf` (letztere trägt auch `flowBereichPdf`); der Wortzug ist `_markeName()`,
nicht mehr das Literal `'VIVODEPOT'`. `_dateiNamePraefix()` ersetzt den `'Vivodepot_'`-Präfix an
allen ca. 14 Export-/Download-Namen (ein Lese-Ort, `exportDateiname()`s Registry-Präfix-Tausch,
statt zehn Literale einzeln zu ändern). `STRINGS.fussFirma` ("Vivodepot GmbH · Berlin") entfällt
aus Fußzeile und Dokument-Fußzeilen — konsolidiert an den Herkunftsort (Punkt 3).

**Dokument-Fuß: Partnername vor wortgleichem Haftungstext.** Bei White Label steht im Fuß jedes
PDFs vorn der Partnername, sonst VIVODEPOT. Der Haftungstext dahinter bleibt wortgleich:
Fassung C aus U2-ADR-025 bleibt im Textsatz unverändert und an ihren Wortlaut gebunden
(`tests/haftungshinweis.test.js`); getauscht wird am Verbrauchsort (`_dokFussHaftungMitMarke` in
`pdfFussText`) nur das führende Markenwort, in jeder Sprache. Ein `{marke}` im Wortlaut selbst
hätte Fassung C umformuliert und ist darum nicht der Weg.

**Bewusst NICHT gebaut: Schriftart im PDF.** jsPDF kennt nur seine eingebauten Schriftfamilien
(helvetica/times/courier) ohne Font-Embedding — ein beliebiger `schriftart`-Wert liefe ins Leere.
Ein eigens dafür gebauter `_markeSchriftart()`-Accessor hatte darum keinen echten Verbraucher
(A253 fand ihn zu Recht unverdrahtet) und wurde wieder entfernt. Die Schriftart erreicht CSS
weiterhin über `brandingAnwenden(branding, root)`, das `.schriftart` direkt vom Objekt liest.

**Nachtrag 13.09.2026 (U2-ADR-263-Nachtrag, PDF-CI) — die Prämisse hat sich geändert, der Umfang
nicht.** jsPDF zeichnet jetzt Inter als echt eingebettete TrueType-Schrift (`addFileToVFS`/
`addFont`, s. dortige ADR) — der GRUND von oben ("ein beliebiger Wert liefe ins Leere") gilt für
GENAU diese eine Schrift nicht mehr unverändert. Ein Branding-Override-Mechanismus für die
PDF-Schriftart ist trotzdem NICHT Teil dieses Nachtrags (Freigabe, 13.09.2026, „ohne das
jetzt auszubauen") — kein fremdes Branding kann heute eine andere PDF-Schrift einbringen, das
bliebe teuer (eigene Zuschnitt-/Lizenzprüfung je Font, s. Rezept in
`tools/build-pdf-inter-einbetten.js`) und hat keinen Auftrag. Gebaut ist nur das GERÜST dafür:
alle Aufrufstellen (27 `setFont`, 3 `addFont`) lesen von einem einzigen benannten Ort
(`_PDF_MARKE_SCHRIFT` im Kern) statt von verstreuten `'Inter'`-Literalen — ein künftiger
`_markeSchriftPdf()`-Accessor (fiele dann unter denselben Rangfolge-Mechanismus wie
`_markeFarbePrimaerHex()`) ändert diese eine Stelle, nicht dreißig. Test:
`tests/pdf-inter-einbetten.test.js#[PDF-CI·Gerüst, U2-ADR-400-Nachtrag] …`.

**Gemessen, nicht vollständig behoben: 97 Fundstellen der blanken Wortmarke** (s. Punkt 4,
darunter die eine bewusst offen gelassene `dokFussHaftung`-Stelle oben) — die
Lese-App bleibt strukturell blind für Branding (kein CSS-Hook, keine Farb-/Namenslesung); ~85
Fließtext-/Toast-/Label-Stellen ohne `{marke}`-Ersetzung sind gemessen, aber nicht in diesem Zug
umgestellt. Ehrlich als REST-OFFEN geführt, s. Bericht.

### 3. Herkunftsort — ein benanntes, bewachtes Element

Einstellungen → Recht trägt jetzt `<div class="herkunftsort" data-herkunftsort="1">`:
„Bereitgestellt mit Vivodepot" (`herkunftPoweredBy`), die Anbieter-Zeile (`einstAnbieter`, unver-
ändert), der Art.-5-EUPL-Satz wörtlich aus `NOTICE.md` (`herkunftLizenzhinweis`), und ein
klickbarer Impressumslink auf `VIVODEPOT_HERKUNFT_LINK` (`https://vivodepot.de` — eine NEUE,
absichtlich NICHT überschreibbare Konstante, getrennt von `AKTUALISIERUNGEN_LINK`). Vivodepots
Kontaktadresse (`fussKontakt`) steht ebenfalls hier; im App-Fuß steht sie nur ohne White Label.

**Die Lese-App trägt seit dem 21.09.2026 ebenfalls einen Herkunftsort** (Fuß der Hilfe-Sicht, Anker
`data-herkunftsort`) und im Kopfkommentar dieselbe SPDX- und Copyright-Zeile wie Kern und VC-Issuer. Genannt
wird die Urheberin, nicht die Anbieterin: die Lese-App hat keine Anbieterin. Name und Lizenzkennung stehen als
Konstante `URHEBER_LESEN`, nicht im Textsatz; ein Sprachmodul kann sie darum weder ersetzen noch leeren. Die
Stelle liegt außerhalb jeder Marker-Region und überlebt damit jeden Schnitt, der Regionen aus der Datei holt
(`tests/lese-app-herkunftsort.test.js` schneidet sie heraus und sucht danach). Kein Lizenz-Volltext. Damit gibt es
vier als Herkunftsort klassifizierte Fundstellen, nicht drei. Die Ausdehnung auf die Lese-App folgt §34.7 der
Spezifikation; ausdrücklich entschieden ist der Herkunftsort für das Produkt und die ausgelieferte Datei, für jede
weitere Anwendung ist es die Lesart dieser ADR.

**Nachtrag 21.09.2026 (Spezifikation 34.7, md5 aa468bfa: eine Quelle).** Name und Lizenzkennung der Urheberin stehen nicht mehr in `URHEBER_LESEN` als Literal und nicht mehr als Klartext in den
Sprachmodulen, sondern in einer Quelle (`tools/herkunftsort-angaben.json`) und in jedem Träger als erzeugter Block `HERKUNFTSORT_ANGABEN` (Kern und Lese-App byte-gleich, eine DAUERHAFTE Marker-Region
im Sinn von `regionen.dauerhaft` der Gerüst-Wächter-Grundlinie; ein Schnitt nimmt sie nicht mit). `URHEBER_LESEN` ist daraus abgeleitet. Die zwei Texte des Herkunftsorts im Kern tragen `{urheberin}`
und `{lizenz}`, die nur aus diesem Block auflösen, nie aus dem Branding; `{marke}` ist dort nicht zulässig. Ein Rezept ohne diese Platzhalter wird beim Erzeugen abgewiesen, ein Text ohne sie von
jeder Vertrauensstufe, und die Anzeige ergänzt eine fehlende Angabe, ohne die einzige Prüfung zu sein. Die Zahl der als Herkunftsort klassifizierten Fundstellen ist damit fünf: einstAnbieter im Sprachmodul
plus der Block je Träger mit je zwei Treffern (Name, Marke) — kein neuer Marken-Rückfall, die Angabe steht an genau einer Stelle je Träger (`tests/herkunftsort-angaben-gleich.test.js`).
Die Entscheidung dahinter steht in der eigenen ADR zu den Angaben am Herkunftsort (Nummer beim Landen). Hier gilt der Titel-Hinweis: die `pruefung:`-Zeile oben bindet an den TITEL des Tests („genau fünf“ statt „genau vier“) —
an einen Namen, den jeder frei ändern darf. Sie bricht bei jeder Umbenennung, aber sie bricht laut (`pruefstand-bindung`); wer den Titel ändert, zieht die Bindung in derselben Änderung nach.

### 4. Die Marke gilt vor dem ersten Depot

Ein eingelassenes Vor-Depot-Bündel bestimmt Name und Farben schon auf dem Willkommensschirm
(`_brandingModulListeAktiv`: offenes Depot, sonst das Vor-Depot-Ziel, sonst ab Werk) — dieselbe
Rangfolge wie bei der Sprache. Texte, in denen die Marke handelt, tragen `{marke}`; die Marke als
Name des Depots heißt „Depot"; Hinweise, in denen die Software spricht, sagen „diese Anwendung".
Die Lese-App löst `{marke}` mit derselben Funktion auf wie der Kern (`_markePlatzhalterAufloesen`).

### 5. Kontakt und Aktualisierungen kommen aus dem Markenbündel

Das Branding-Modul trägt zwei weitere Felder: `kontakt` (E-Mail-Adresse des Partners) und
`aktualisierungen` (https-Adresse, unter der der Partner Aktualisierungen anbietet). Bei White Label
zeigt der App-Fuß nur diese Adressen; fehlt eine, steht an ihrer Stelle nichts — keine
Kontaktadresse, kein Aktualisierungs-Link und in den Einstellungen kein Knopf „Nach neuer Version
suchen". Ohne White Label gelten `fussKontakt` und `AKTUALISIERUNGEN_LINK` wie bisher.

Dauerhaft bewacht wird die ganze Reichweite von `tests/white-label-greift.test.js`: Er signiert das
Markenbündel aus `tools/vorfuehrung/` mit dem öffentlichen Test-Sentinel, lässt es als Vor-Depot-
Bündel ein und misst Ansichten, PDF und Dateinamen, deutsch und englisch
(`tools/white-label-greift-messen.js`). Bewusst bleibende Stellen stehen dort auf einer benannten
Liste mit Grund.

## Was dieser ADR nicht ändert

Die Fall-1/Fall-2-Unterscheidung aus U2-ADR-296 bleibt unverändert — ein In-Depot angedocktes
Fremd-Branding zeigt sich weiter nur am Rand, nie an Kopfzeile/PDF-Wortzug/Dateinamen (dieselbe
Rangfolge wie vorher, nur mit einem zusätzlichen, produktweiten Rückfall statt `null`). `.welcome-
wort` bleibt eine DOKUMENTIERTE, bewusste Ausnahme (UX-Konzept §9/§12, gesperrte Inter-Regeln) —
dieser ADR überschreibt diese Entscheidung nicht.

## Konsequenzen

Ein Depot/Produkt ohne konfektioniertes Branding sieht aus wie vor diesem ADR (`_AB_WERK_BRANDING`
löst auf Vivodepots eigene Werte auf, identisch zum vorigen Verhalten). Mehrere golden-master-
artige Byte-Gleichheits-Fixtures (`tests/fixtures/k8-vorher/*.html`, `tests/fixtures/pv-golden.json`,
`tests/fixtures/siebtes-register-vorher/*.html`) mussten nachgezogen werden (fussFirma-Literal
entfernt) — eine bewusste, dokumentierte Content-Änderung, kein Rebase-Artefakt.

## Konformität

```konformitaet
aussage:  Ohne echtes Depot-Modul fällt brandingAnwenden/_markeAnzeigeAnwenden an allen drei
          Aufrufstellen (Vor-Depot, Reset, In-Depot-Andockweg) auf _AB_WERK_BRANDING zurück,
          nicht auf ein hartes Leer/undefined.
zustand:  geprüft
herkunft: invariante
pruefung: tests/vor-depot-konfiguration-branding-css.test.js#[VDK-Integration·Rot-Beweis] ein UNSIGNIERTES Branding-Bündel wirkt NICHT als CSS (branding ist nurGeprueft)
pruefung: tests/vor-depot-konfiguration-branding-css.test.js#[VDK-Reset] _depotSpeicherZuruecksetzen() räumt zuvor gesetztes Branding-CSS weg
```

```konformitaet
aussage:  _markeAnzeigeAnwenden zeigt die zweifarbige VIVO/DEPOT-Grafik nur für die WIRKLICH
          eingebaute Marke (AB_WERK_BRANDING), nicht für jedes Produkt ohne eigenes Depot-Modul.
zustand:  geprüft
herkunft: invariante
pruefung: tests/achse-branding-produkt.test.js#[Branding-Achse] das Branding-Achsen-Produkt trägt Name/Farben aus der Fixture, am erzeugten Produkt gemessen
```

```konformitaet
aussage:  Der Herkunftsort existiert (data-herkunftsort), trägt Name, EUPL-Art.-5-Hinweis und
          einen Impressumslink auf Vivodepots eigenen, nicht überschreibbaren Bezugsort.
zustand:  geprüft
herkunft: invariante
pruefung: tests/herkunftsort.test.js#[Herkunftsort] die Einstellungen tragen ein data-herkunftsort-Element mit Name, Lizenzhinweis und Impressumslink
pruefung: tests/herkunftsort.test.js#[Herkunftsort] der Impressumslink zeigt auf Vivodepots eigenen Bezugsort, NICHT auf AKTUALISIERUNGEN_LINK
```

```konformitaet
aussage:  Die blanke Wortmarke "Vivodepot"/"VIVODEPOT" steht an einer eingefrorenen, benannten
          Menge von Stellen (Herkunftsort, Dateiformat-Kennung, statische head-Tags, REST-OFFEN)
          — jede neue Fundstelle außerhalb dieser Menge macht die Probe rot.
zustand:  geprüft
herkunft: invariante
pruefung: tests/herkunftsort.test.js#[Herkunftsort·Reichweite] die heutige Menge ist genau die eingefrorene — jede Abweichung ein Fund, kein stilles Grün
pruefung: tests/herkunftsort.test.js#[Herkunftsort·Reichweite] genau fünf Fundstellen sind als "Herkunftsort" klassifiziert
```

```konformitaet
aussage:  Situations-/Voll-Depot-PDFs zeigen den ANGEDOCKTEN Markennamen (nicht das Literal
          'VIVODEPOT') und die angedockte Marken-Farbe (nicht die feste Salbei/Gold-Konstante) im
          Wortzug — und fallen ohne angedocktes Modul weiterhin auf die native Marke zurück.
zustand:  geprüft
herkunft: invariante
pruefung: tests/pdf-branding-reichweite.test.js#[PDF-Reichweite] zeichneVollDepotPdf zeigt den angedockten Markennamen, NICHT „VIVODEPOT"
pruefung: tests/pdf-branding-reichweite.test.js#[PDF-Reichweite] zeichneVollDepotPdf zeichnet mit den angedockten Marken-Farben, nicht den nativen GOLD/SALBEI-Konstanten
pruefung: tests/pdf-branding-reichweite.test.js#[PDF-Reichweite] zeichneSituationPdf zeigt denselben angedockten Markennamen
pruefung: tests/pdf-branding-reichweite.test.js#[PDF-Reichweite·Rot-Beweis] OHNE angedocktes Branding zeichnet zeichneVollDepotPdf weiterhin die native Marke/Farbe
```

```konformitaet
aussage:  Bei White Label trägt der Dokument-Fuß den Partnernamen statt VIVODEPOT; der Haftungstext
          dahinter bleibt wortgleich, deutsch und englisch.
zustand:  geprüft
herkunft: entscheidung
pruefung: tests/haftungshinweis.test.js#[White Label·PDF-Fuß] DE: Partnername statt VIVODEPOT, Haftungstext wortgleich
pruefung: tests/haftungshinweis.test.js#[White Label·PDF-Fuß] EN: Partnername statt VIVODEPOT, Haftungstext wortgleich
pruefung: tests/haftungshinweis.test.js#[White Label·PDF-Fuß] ohne White Label bleibt Fassung C unverändert (Gegenprobe DE/EN)
```

```konformitaet
aussage:  Bei White Label zeigt der App-Fuß die Kontaktadresse und den Aktualisierungs-Link aus dem
          Markenbündel oder keine; Vivodepots Adresse bleibt am Herkunftsort.
zustand:  geprüft
herkunft: entscheidung
pruefung: tests/white-label-kontakt-fuss.test.js#[Kontakt·Prüfer] brandingModulPruefen nimmt `kontakt` an und verwirft eine Nicht-Adresse benannt
pruefung: tests/white-label-kontakt-fuss.test.js#[Kontakt·Fuß·de] White Label mit Kontakt: Partneradresse im Fuß, Vivodepots Adresse nicht
pruefung: tests/white-label-kontakt-fuss.test.js#[Kontakt·Fuß·de] White Label ohne Kontakt: keine Adresse im Fuß
pruefung: tests/white-label-kontakt-fuss.test.js#[Kontakt·Fuß·en] White Label mit Kontakt: Partneradresse im Fuß, Vivodepots Adresse nicht
pruefung: tests/white-label-kontakt-fuss.test.js#[Kontakt·Fuß·en] White Label ohne Kontakt: keine Adresse im Fuß
pruefung: tests/white-label-kontakt-fuss.test.js#[Aktualisierungen·de] White Label mit Adresse: Fuß-Link und Knopf zeigen zum Partner
pruefung: tests/white-label-kontakt-fuss.test.js#[Aktualisierungen·en] White Label mit Adresse: Fuß-Link und Knopf zeigen zum Partner
pruefung: tests/white-label-kontakt-fuss.test.js#[Aktualisierungen·de] White Label ohne Adresse: kein Link, kein Knopf
pruefung: tests/white-label-kontakt-fuss.test.js#[Aktualisierungen·en] White Label ohne Adresse: kein Link, kein Knopf
```

```konformitaet
aussage:  Ein signiertes Vor-Depot-Markenbündel greift in Ansichten, PDF und Dateinamen; Vivodepot
          steht nur am Herkunftsort oder auf der benannten Liste, deutsch und englisch.
zustand:  geprüft
herkunft: invariante
pruefung: tests/white-label-greift.test.js#[White Label greift·de] Stadtbank-Bündel: Marke überall, Vivodepot nur am Herkunftsort
pruefung: tests/white-label-greift.test.js#[White Label greift·en] Stadtbank-Bündel: Marke überall, Vivodepot nur am Herkunftsort
pruefung: tests/branding-topbar-produkt.test.js#[White Label·vor dem Depot] der Markenname des Vor-Depot-Bündels gilt schon vor dem ersten Depot
pruefung: tests/lese-app-marke.test.js#[White Label·Lese-App] {marke} im angedockten Textsatz wird zur Partnermarke
```

## Nachtrag 10.09.2026 — die Lese-App bekommt Branding

Direkt im Anschluss an den Commit oben, gleicher Gegenstand: `vivodepot-lesen.html` kannte
Branding strukturell nicht — ihr einziger `brandingModule`-Bezug (`MODUL_SLOTS`,
`modulHerkunftBerechnen`/`moduleStandBerechnen`) zählte Module, las aber nie deren Wert. Ein
weißgelabeltes Depot, das eine Empfängerin per Lese-App öffnet, zeigte „Vivodepot" statt der
Partnermarke — die Stelle, an der das Produkt eine DRITTE Person erreicht (die Empfängerin, nicht
die Partnerin selbst), also die Stelle, an der die Zusage „sein Produkt ist sein Produkt" zählt.

**Derselbe Mechanismus, kein zweiter Weg:** `_markeName()` in `vivodepot-lesen.html` ist WÖRTLICH
aus dem Kern gespiegelt (letztes Element von `data.brandingModule` gewinnt, sonst nativer
Rückfall) — anders als der Kern OHNE Ab-Werk-Zwischenstufe, weil diese Datei nie produktweise
konfektioniert wird (`tools/produkt-konfektionieren.js`s `DATEISATZ` enthält nur
`vivodepot.html`/`sw.js`/`manifest.webmanifest`). `data` ist dabei immer die FREMDE, gerade
geöffnete Depot-Datei — nie eine eingebackene Konstante der Lese-App selbst, sonst bliebe die
Marke eines Depots am nächsten, unbeteiligten Depot (oder am leeren Eingangsschirm) hängen.

Zwei neue Aufrufstellen: `_markeAnzeigeAnwenden()` (neu — die Lese-App hatte bislang GAR KEINEN
Aufrufort für `document.title`, anders als der Kern) setzt den Tab-Titel beim Öffnen
(`renderVollExport()`) UND beim Schließen (`entladen()`, Reset auf nativ). `topbarHTML()`s
`.tb-titel` liest jetzt `_markeName()` statt der festen `STRINGS.appName`-Zeichenkette — die
Konstante selbst bleibt stehen (weiterhin über die Unveränderlichkeits-Zusicherung geprüft,
`tests/lese-app-andockschluessel.test.js`), nur nicht mehr die einzige Quelle der Topbar.

```konformitaet
aussage:  Ohne Branding-Modul zeigt die Lese-App (Topbar + Tab-Titel) weiterhin den nativen Namen
          "Vivodepot" — unverändert wie vor diesem Nachtrag.
zustand:  geprüft
herkunft: invariante
pruefung: tests/lese-app-marke.test.js#[Lese-App] ohne Branding-Modul bleibt der native Name „Vivodepot" (Rot-Beweis-Gegenprobe)
```

```konformitaet
aussage:  Ein angedocktes Branding-Modul erreicht in der Lese-App sowohl die Topbar als auch den
          Tab-Titel (document.title) — derselbe Lesepfad wie der Kern, letztes Element gewinnt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/lese-app-marke.test.js#[Lese-App] ein weißgelabeltes Depot zeigt die Partnermarke — im Tab-Titel UND in der Topbar
pruefung: tests/lese-app-marke.test.js#[Lese-App] die Quelle ist das GEÖFFNETE Fremd-Depot, keine eingebackene Konstante dieser Datei
```

```konformitaet
aussage:  entladen() setzt den Tab-Titel sofort auf den nativen Namen zurück — die Marke eines
          geschlossenen Depots bleibt nicht am nächsten, unbeteiligten Depot hängen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/lese-app-marke.test.js#[Lese-App·Rot-Beweis] entladen() setzt den Tab-Titel sofort zurück — keine Marke des vorigen Depots bleibt hängen
```

## Nachtrag 10.09.2026 — Dateinamen-Reichweite nachträglich automatisiert

Nach der Lese-App-Landung stand die Frage, ob `depotDateiname()` (der Name der `.vivodepot`-Datei
selbst) noch am Literal hänge — die Prämisse war stichhaltig geprüft FALSCH: der Fix stand
bereits in `9925b569` (`'Mein-' + _dateiNamePraefix() + '_' + datum`), am Objekt per Handmessung
belegt, aber ohne eigenen, wiederholbaren Rot-Beweis. „Prüf es, statt es anzunehmen" galt für
BEIDE Seiten — die Prämisse war falsch, der fehlende Wächter war es nicht.

`tests/dateinamen-reichweite.test.js` macht die Handmessung zu einer Probe: `depotDateiname()`
und `exportDateiname()` tragen die angedockte Marke, die Gegenprobe ohne Modul bleibt nativ, und
ein expliziter Reset-Rot-Beweis (`_depotSpeicherZuruecksetzen()`, derselbe RAM-Wipe wie beim
CSS-Reset) beweist: kein Marken-Leck zum nächsten, unbeteiligten Depot — strukturell ausgeschlossen
(`_dateiNamePraefix()`/`_markeName()` lesen `data.brandingModule` live, kein Zwischenspeicher),
jetzt auch geprüft statt nur angenommen.

```konformitaet
aussage:  depotDateiname() und exportDateiname() tragen die angedockte Marke, fallen ohne Modul
          auf "Vivodepot" zurück, und verlieren die Marke eines geschlossenen Depots wieder beim
          Reset — kein Leck zum nächsten Depot.
zustand:  geprüft
herkunft: invariante
pruefung: tests/dateinamen-reichweite.test.js#[Dateinamen-Reichweite] depotDateiname() trägt die angedockte Marke, NICHT „Vivodepot"
pruefung: tests/dateinamen-reichweite.test.js#[Dateinamen-Reichweite] exportDateiname() trägt dieselbe Marke im Registry-Präfix
pruefung: tests/dateinamen-reichweite.test.js#[Dateinamen-Reichweite·Rot-Beweis] ohne Branding-Modul bleibt der native Name „Vivodepot" (Gegenprobe)
pruefung: tests/dateinamen-reichweite.test.js#[Dateinamen-Reichweite·Rot-Beweis] nach Depot-Reset trägt der Name wieder Vivodepot — kein Marken-Leck zum nächsten Depot
```

## Nachtrag 16.09.2026 — ein Standardzeichen steht neben der Herkunft, nicht unter der Partnermarke

Die Entscheidung oben kennt zwei Sorten Sichtbares: die Herkunft (EIN Ort, Lizenzhinweise und
Impressum) und alles andere, das bei White Label dem Partner gehört. Ein drittes Zeichen hatte
darin keinen Platz: das Programmzeichen eines Interoperabilitäts-Standards — hier der xShare
Yellow Button (Horizon-Europe-Vorhaben xShare), gemessen am 16.09.2026: in keiner der ADRs 296,
297, 400, 408 erwähnt.

**Produktentscheidung (16.09.2026):**

> Das Yellow-Button-Zeichen sitzt an der Funktion — Herunterladen, Hochladen, einmaliges Teilen.
> Bei White Label bleibt es stehen, wie die Herkunft. Es sagt, welchem Standard die Funktion
> folgt, nicht wer spricht.

Damit gilt: „Alles Sichtbare gehört dem Partner" umfasst Marke, Palette und Wortlaut — **nicht**
ein Zeichen, das eine Eigenschaft der Funktion benennt. Wie die Lizenzhinweise ist es eine
Aussage über das Werk, keine über den Betreiber.

**Gebaut:** `YB_ZEICHEN` und `ybZeichenHTML(funktion)` im Kern — drei eingebettete PNG
(data:-URI, CSP `img-src data:`, kein Netz) aus dem xShare Yellow Button Visual Identity Kit, je
Funktion die Variante „Full – light background", verkleinert auf 136×64 px, sonst unverändert.
Die Kachel trägt ihren eigenen Hintergrund und bleibt darum in hell und dunkel ohne Anpassung
lesbar. Orte:

- **Herunterladen:** der Knopf „Original herunterladen" in `flowMappeVorschau` — nur bei einem
  autoritativen Original. Ein eigener Scan folgt keinem Standard und trägt kein Zeichen.
- **Einmaliges Teilen:** der Knopf „Sicher weitergeben" in `flowMappeVorschau` und der Kopf des
  Dialogs `flowShlVorbereiten`.
- **Hochladen:** der Knopf jedes Import-Formats mit `autoritativDoc` in der Formatauswahl und
  der Kopf von `flowImportDatei` für ein solches Format (heute `fhir-lab`).

**Nicht entschieden und nicht gebaut:** ob und wie mit dem Zeichen außerhalb des Produkts
geworben werden darf (Website, Werbung). Das Kit enthält keine Nutzungsbedingungen; der
Dienstleistungsvertrag regelt es nicht ausdrücklich. Die Frage liegt beim Programm.

```konformitaet
aussage:  Die drei Yellow-Button-Funktionen tragen das Zeichen am Knopf bzw. im Dialog; ein
          nicht autoritativer Eintrag und ein Import außerhalb des Standards tragen es nicht.
zustand:  geprüft
herkunft: invariante
pruefung: tests/yb-zeichen-an-der-funktion.test.js#[YB-Zeichen] Herunterladen und Teilen eines autoritativen Originals tragen das Zeichen
pruefung: tests/yb-zeichen-an-der-funktion.test.js#[YB-Zeichen] der Teilen-Dialog selbst zeigt das Zeichen
pruefung: tests/yb-zeichen-an-der-funktion.test.js#[YB-Zeichen] der Hochladen-Dialog für Labor-/Entlassbefund zeigt das Zeichen
pruefung: tests/yb-zeichen-an-der-funktion.test.js#[YB-Zeichen·Rot-Beweis] ein eigenes (nicht autoritatives) Dokument trägt beim Herunterladen KEIN Zeichen
pruefung: tests/yb-zeichen-an-der-funktion.test.js#[YB-Zeichen·Rot-Beweis] ein Import außerhalb des Yellow-Button-Standards trägt KEIN Zeichen
```

```konformitaet
aussage:  Bei White Label (angedocktes Branding-Modul) bleibt das Zeichen stehen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/yb-zeichen-an-der-funktion.test.js#[YB-Zeichen] bei White Label (angedocktes Branding-Modul) bleibt das Zeichen stehen
```

```konformitaet
aussage:  Die eingebetteten Zeichen sind echte, verkleinerte PNG-Dateien, je Funktion eines.
zustand:  geprüft
herkunft: invariante
pruefung: tests/yb-zeichen-an-der-funktion.test.js#[YB-Zeichen] drei eingebettete Zeichen sind echte PNG-Dateien, je Funktion eines
```

---

*Vivodepot GmbH · Berlin · 10.09.2026 · Nachtrag 16.09.2026*
