# U2-ADR-263: Der PDF-Export prüft die Schriftdeckung, bevor er ein Zeichen zeichnet

**Status:** Angenommen
**Datum:** 04.09.2026
**Kategorie:** KORREKTHEIT, EXPORT, INTERNATIONALISIERUNG
**Linie:** U2
**U2-Bezug:** Berührt keine bestehende Entscheidung inhaltlich — es gab bislang keine ADR zur
Zeichendeckung des PDF-Exports, nur den technischen Netz-Beleg in U2-ADR-097/§10
(`tests/konformitaet/offline-garantie.mjs`, jsPDF-Netzpfad statisch unerreichbar), dessen
Wächter-Verschärfung (Zug 2, 04.09.2026, Freigabe) diese ADR als Vorarbeit übernimmt und
unabhängig gegen den eigenen Baum nachmisst, nicht blind committet.
**Anker:** Weitergereichter Befund: eine Bürgerin legt einer Behörde ein
Dokument vor, in dem ihr Name falsch steht — und erfährt es nie. Als Blocker eingestuft.
**Status heute:** gilt, gebaut.

---

## Kontext

### Der Befund, selbst nachgemessen

Live gegen das im Kern gebündelte jsPDF gemessen (04.09.2026): jede Standardschrift
(`helvetica`/`times`/`courier`) meldet `font.encoding === 'WinAnsiEncoding'` — eine
Ein-Byte-Kodierung. Für ein Zeichen außerhalb dieser Kodierung schreibt jsPDF dennoch den vollen
Unicode-Codepunkt als zwei Bytes (UTF-16BE) in den `Tj`-Operator, ohne die deklarierte
Font-Kodierung anzupassen. Ein PDF-Betrachter, der ein Byte je Zeichen liest (wie die
Font-Deklaration verlangt), zerlegt die zwei Bytes in zwei falsche Ein-Byte-Zeichen.

Byte-genau nachvollzogen: `żółć` (UTF-16BE `017C 00F3 0142 0107`) ergibt im `Tj`-String die Bytes
`01 7C 00 F3 01 42 01 07` — als WinAnsi gelesen exakt `|óB` (`0x7C`='|', `0xF3`='ó', `0x42`='B',
die drei `0x01`/`0x00`/`0x07`-Steuerbytes bleiben unsichtbar). Das erklärt den gemeldeten Befund
vollständig:

```
żółć        →  |óB
őz és tűz   →  Qz és tqz
dağ         →  da
```

Betroffen sind alle Sprachen mit Zeichen außerhalb Basis-Latein + Latein-1 + einer festen
27-Zeichen-Zusatzmenge aus Windows-1252 (s. u.) — insbesondere Polnisch, Tschechisch, Slowakisch,
Ungarisch, Türkisch, sowie jede CJK-Sprache vollständig.

### Die Deckungsmenge — empirisch, nicht angenommen, mit einem eigenen Fund am Weg

`PDF_WINANSI_ZUSATZ` (im Kern) stammt aus zwei Scans gegen das echte gebündelte jsPDF, nicht aus
einer angenommenen CP1252-Tabelle: jeder Codepunkt einzeln durch `doc.text()` geschickt, die
Byte-Länge des resultierenden `Tj`-Strings gemessen (1 Byte = getragen, 2 Byte = UTF-16BE-Rückfall
= nicht getragen).

**Der erste Scan prüfte nur Codepunkte 0x20–0x17F** und verwechselte damit „cp1252-BYTE-Position
0x97" mit „Unicode-Codepunkt 0x97" — der Gedankenstrich „—" selbst liegt bei Unicode-Codepunkt
0x2014, weit außerhalb dieses Bereichs. Gefunden über die eigene E2E-Suite, nicht durch Nachdenken:
der Fuß-Text mehrerer PDF-Erzeuger (nicht die eigenen Testdaten) trägt einen Gedankenstrich; vier
von sechs frisch geschriebenen Proben meldeten ihn fälschlich als Lücke. Der zweite, gezielte Scan
der echten CP1252-Sonderzeichen-Codepunkte (0x2000er-Bereich: Anführungszeichen, Gedankenstriche,
Aufzählungspunkt, Auslassungspunkte, Promille, Guillemets, €, ™ u. a.) deckte die Lücke im
Deckungs-Scan selbst auf. Ergebnis, vollständig: Basis-Latein + Latein-1 (0x20–0xFF) plus 27
einzelne Zusätze aus Windows-1252. Das erklärt auch, warum z. B. tschechisch „š"/„ž" durchkommen,
aber „č"/„ř"/„ě" nicht — reiner Zufall der cp1252-Geschichte, nicht Systematik.

## Die Entscheidung

**Vor dem Erzeugen wird geprüft, ob die eingebettete Schrift jedes vorkommende Zeichen tragen
kann. Kann sie es nicht, erfährt die Nutzerin es vor dem Erzeugen — mit Angabe, welche Zeichen
betroffen sind und in welchem Feld. Ein stiller Ersatz ist in keinem Fall zulässig.** Kann die
Schrift ein Zeichen nicht darstellen, entsteht keine PDF-Datei für diesen Versuch — nicht mit
falschem Zeichen, nicht mit stillem Auslassen.

**Kein Nachrüsten einer volleren Schrift in dieser ADR.** Ein Schriftaustausch/eine
Schrift-Einbettung, die Latein-Erweiterung oder gar CJK vollständig trüge, wäre in einer
Ein-Datei-Anwendung eine Dateigrößen-Frage — dafür fehlt heute ein reales, geprüftes Kandidaten-
Schriftmaß (kein Font lag zum Messen vor, ein externer Download bräuchte eine Freigabe, die in
diesem Auftrag nicht vorlag). Diese ADR liefert die vollständige Lösung für Teil 1 (Erkennen und
Sagen) und macht keine Zusage zu Teil 2 (Tragen, wo es geht) — das bleibt eine eigene,
noch zu vermessende Entscheidung.

## Was gebaut wurde

1. **Eine reine Erkennungsfunktion.** `pdfZeichenOhneDeckung(text)` gibt die distinkten Zeichen
   eines Texts zurück, die `WinAnsiEncoding` nicht tragen kann — gegen die 27-Zeichen-Zusatzmenge
   und den Basisbereich 0x20–0xFF geprüft, in Node ohne `window.jspdf` lauffähig.
2. **Ein Prüfpunkt statt sechs — aber je `doc`-Instanz.** `_pdfSchriftPruefungInstallieren(doc)`
   wrapt `doc.text` direkt nach `new jsPDF(...)`: jeder künftige `.text()`-Aufruf dieser Instanz
   sammelt seine nicht getragenen Zeichen in `doc._pdfSchriftLuecken`, bevor er wie gehabt
   zeichnet. **Gemessener Bau-Fehler, korrigiert:** die erste Fassung patchte `jsPDF.API.text`
   einmalig auf der Bibliothek — Browser-Messung ergab, dass `.text` bei diesem jsPDF-Bündel NICHT
   an `jsPDF.API`/dem Prototyp hängt, sondern jeder Instanz einzeln im Konstruktor zugewiesen
   wird. Der Patch griff dadurch nie, ohne dass ein Syntaxfehler es verraten hätte — gefunden erst,
   weil die eigene Integrationsprobe (nicht nur `pdfZeichenOhneDeckung` isoliert) leere Funde
   lieferte, wo welche erwartet waren. Seither: Installation je Instanz, `_pdfFeldKontext` als
   einfaches, von den Zeichnern gesetztes Beschriftungsfeld.
3. **Alle sechs PDF-Wege abgedeckt.** `flowNotfallkartePdf`, `uebergabeWiderrufPdfErzeugen`,
   `flowSituationPdf`, `flowVollDepotPdf`, `flowBereichPdf` (teilt den Zeichner mit VollDepot) und
   die beiden Aufrufer von `dokumentPdfBlob` (`flowDokumentDateiSichern`,
   `flowDokumentInMappeAblegen`, über die neue `_dokumentPdfMitPruefung`) — `dokumentPdfBlob`
   selbst bleibt für andere/künftige Aufrufer unverändert ein reiner Blob-Erzeuger.
4. **Keine Ausweichmöglichkeit in die Korruption.** `_pdfSchriftlueckeWarnen(funde)` ist
   bewusst NICHT die Schwesterfunktion `_unstimmigWarnenMitFundenDannFortfahren` — sie bietet kein
   „Trotzdem erstellen". Eine Unstimmigkeit ist eine Frage an einen Wert, der trotzdem verbatim
   geschrieben werden kann; eine Schriftlücke ist eine Frage an die Darstellbarkeit selbst — ein
   „trotzdem" gäbe es nur um den Preis eines tatsächlich falschen Zeichens.

## Die Rot→Grün-Probe

Rot bewiesen am eigenen Bau, zweifach: (a) vor der Korrektur des Bau-Fehlers (Punkt 2 oben) lieferte
eine reale Browser-Probe mit `żółć unterstützt: München` leere Funde, obwohl `pdfZeichenOhneDeckung`
isoliert korrekt maß — der Integrationsweg selbst war rot, nicht die Erkennungsfunktion; (b) vor der
Korrektur der Deckungsmenge (Punkt „Die Deckungsmenge" oben) meldeten vier von sechs frischen
E2E-Proben einen Gedankenstrich fälschlich als Lücke. Beide Funde wurden behoben, nicht die Proben
angepasst, um sie grün zu bekommen — danach grün.

`tests/adr-263-pdf-schriftdeckung.test.js` (16 Proben, node --test, reine Codepunkt-Arithmetik) und
`tests/e2e/u2-adr-263-pdf-schriftdeckung.spec.js` (6 Proben, echtes jsPDF): je eine Positivkontrolle
pro Sprachfamilie (Deutsch/Französisch/Spanisch-Portugiesisch bleiben unverändert erzeugbar) und
eine Rot-Probe pro betroffener Sprache (Polnisch, Ungarisch, Türkisch, Tschechisch, Chinesisch),
plus zwei echte Ende-zu-Ende-Proben: ein Depot mit chinesischem Vornamen erzeugt kein Gesamt-PDF und
zeigt „PDF nicht erstellt" mit den betroffenen Zeichen; ein gewöhnlicher Name erzeugt das PDF wie
zuvor, kein Warndialog.

## Verhältnis zu bestehenden ADRs — was bleibt, was ändert sich

| ADR | Betroffen? |
|---|---|
| U2-ADR-097 (Offline-Garantie V1, §10) | Unverändert in der Zusage („kein Nachladen"); die Wächter-Prüfung selbst ist präziser (`addFont` erlaubt, wenn zuvor per `addFileToVFS` derselbe Name registriert wurde) — Vorarbeit einer früheren Sitzung, hier übernommen und unabhängig nachgemessen. |
| U2-ADR-031 (Persistenz-Ehrlichkeit) | Nicht direkt betroffen (dort: Speicher-Status), aber derselbe Grundsatz angewandt: eine Zusage, die nicht geprüft ist, wird nicht gemacht. |
| U2-ADR-091 (Event-Blindzone, jsPDF im Node-Harness) | Unverändert — der Grund, warum die Integrationsproben als E2E statt als node --test laufen, gilt weiterhin. |

## Nachtrag 13.09.2026 — Teil 2: Inter eingebettet, der ursprüngliche Rot-Beweis altert

Diese ADR liess „eine vollere Schrift einbetten" ausdrücklich offen (s. Absatz oben, „dafür
fehlt heute ein reales, geprüftes Kandidaten-Schriftmaß") — kein Widerspruch, ein benannter
Nachtrag. Auftrag „Kern: Eingabe springt, Sub-Depot-Farbe, PDF-CI" (13.09.2026) liefert das
Maß: Inter (Regular/Bold/Italic), auf die gebrauchten Codepunkte zugeschnitten, offline als
TrueType eingebettet (`tools/build-pdf-inter-einbetten.js`, Rezept dort; Lizenz OFL-1.1, s.
NOTICE.md/THIRD_PARTY_LICENSES).

**Damit war der Rot-Beweis unten (Polnisch ż/ł/ć) wertlos geworden** — genau der Fall aus
„Roter Beweis altert mit der Entscheidung": die Schrift, gegen die er maß, ist nicht mehr die
Schrift, die läuft. Polnisch/Ungarisch/Türkisch/Tschechisch (alle vier waren der wörtliche
Befund von Punkt 2 oben) werden jetzt vollständig getragen — der Beleg unten ist entsprechend
umgeschrieben, nicht stillschweigend grün gelassen. Chinesisch bleibt der echte, weiterhin
gültige Rot-Beweis: Inter-Zuschnitt deckt kein CJK, außerhalb des gewählten Unicode-Bereichs
(s. `PDF_INTER_BEREICHE` im Kern).

## Nachtrag 25.09.2026 — Formular-Kästchen werden gezeichnet, nicht geschrieben (VOLLMACHT-PDF-KAESTCHEN)

**Befund (HOCH, live in v795):** Das Vorsorgevollmacht-PDF brach mit „schrift-luecke" ab, sobald die Gesundheitssorge
beantwortet war.
- Der Dokument-Generator schreibt die Formular-Kästchen selbst (`auswahlPaar`/`auswahlPaarGruppe`: „☒ ja  ☐ nein").
- Die PDF-Schrift trägt sie nicht: Inter 4.1 hat U+2610–U+2612 überhaupt nicht (gemessen in `InterVariable.ttf` und
  `-Italic.ttf` aus `Inter-4.1.zip`, SHA-256 wie in NOTICE.md). Ein Aufnehmen in den Zuschnitt war darum unmöglich.
- Der Klassenwächter `tests/pdf-schrift-deckung-klasse.test.js` las nur die Moduldateien. Zeichen, die der
  Generator-Code selbst erzeugt, sah er nicht; seine Gegenprobe hielt sogar fest, ☐ erreiche kein PDF.

**Entscheidung (Produkt, 25.09.2026):** echte Kästchen als Vektor, also ein Rahmen, angekreuzt mit Kreuz, ☑ mit Haken. Der
Zusatz der Entscheidung: „es muss auch funktionieren bei gebrandeten Versionen mit anderen Schriften". Nicht gewählt
wurde ein Ersatz durch ■/□ (in Inter vorhanden).

**Gebaut an der einen Engstelle jedes PDFs** (`_pdfSchriftPruefungInstallieren`, die Hülle um `doc.text`,
`splitTextToSize` und neu `getTextWidth`), nicht in einem Generator:
- Umbruch: Jedes Kästchen wird mit der Breite eines „M" der **aktiven** Schrift gemessen und danach an seinen Platz
  zurückgesetzt. Der Umbruch ändert nur Leerraum.
- Zeichnen: Die Zeile wird in Textstücke und Kästchen zerlegt.
  - Seite = Versalhöhe der aktiven Schrift (`capHeight/unitsPerEm` aus ihrer OS/2-Tabelle; Rückfall 0,7 Geviert,
    wenn die Schrift keine Metrik liefert). Das Kästchen steht auf der Grundlinie, mittig im Vorschub.
  - Die Linienstärke folgt der Schriftgröße, die Farbe ist die Textfarbe.
  - Rechtsbündig, zentriert und Array-Zeilen wie jsPDF selbst.
- Prüfung: Kästchen zählen nicht als Schriftlücke, weil sie gezeichnet werden.
- Im Generator stehen Kästchen und Wort mit geschütztem Leerzeichen („☒ ja"), damit ein Kästchen nie allein am
  Zeilenende steht.
- Deckt auch ☐ im Wortlaut der Standardvorlagen ab (BETREUUNGSVERFUEGUNG-C1, sobald die Zeremonie U+0083 ersetzt). C1
  selbst bleibt ein eigener Befund mit anderer Wurzel.

**Proben:**
- `tests/pdf-kaestchen-vektor.test.js`:
  - Generator-Code: jedes Nicht-ASCII-Literal ist zugesagt oder Vektor;
  - alle Dokument-Module × alle Auswahlwerte ohne Lücke;
  - Engstelle;
  - Maße aus der aktiven Schrift, auch einer Fixture-Metrik;
  - Rot-Beweis: Inter trägt die Kästchen nicht.
- `tests/e2e/pdf-kaestchen-vektor.spec.js`:
  - das echte Vollmacht-Modul im echten jsPDF;
  - Rahmen-Geometrie aus dem Inhaltsstrom;
  - Bildvergleich (pdftoppm) gegen `tests/fixtures/pdf-kaestchen-vollmacht-referenz.pgm`;
  - dieselbe Messung mit `tests/fixtures/pdf-schrift-probe-klein.ttf` (aus Inter 4.1 abgeleitet, 96 Zeichen, Versalhöhe
    1100/2048 statt 1490/2048, umbenannt).
- `tests/vollmacht-pdf-kaestchen.test.js` (Befund-Probe).

**Offen, benannt:** PDF-DECKUNG-NUR-INTER.
- `pdfZeichenUnterstuetzt` kennt nur die Inter-Bereiche. Vendort ein Branding eine eigene PDF-Schrift
  (`_PDF_SCHRIFTEN_VENDORT_ZUSAETZLICH`, heute leer), prüft das Tor gegen die falsche Schrift.
- Die Kästchen hängen davon nicht ab.
- Abnahme: Die Deckung wird aus der cmap der aktiven Schrift gelesen, mit Rot-Beweis durch die Fixture-Schrift.

## Belege

```konformitaet
aussage:  Polnisch/Ungarisch/Türkisch/Tschechisch (ż/ł/ć, őz/tűz, dağ/şıİ, čřšžě u. a.) werden vollständig getragen — der ursprüngliche Befund (Punkt 2 oben) ist geschlossen.
zustand:  geprüft
herkunft: Nachtrag 13.09.2026 (Teil 2, Inter eingebettet) — ersetzt den ursprünglichen Rot-Beweis, der gegen die alte WinAnsi-Deckung maß und mit dem Font-Wechsel wertlos wurde (s. Nachtrag oben).
pruefung: tests/adr-263-pdf-schriftdeckung.test.js#[U2-ADR-263·Nachtrag] Polnisch — żółć wird jetzt vollständig getragen (Befund wörtlich: żółć → |óB, war bis 13.09.2026 offen)
```

```konformitaet
aussage:  Das vollständige cp1252-Typografie-Sonderzeichen-Set (Anführungszeichen, Gedankenstriche, €, ™ u. a.) wird getragen, nicht fälschlich gemeldet.
zustand:  geprüft
pruefung: tests/adr-263-pdf-schriftdeckung.test.js#[U2-ADR-263] Regression: das vollständige cp1252-Typografie-Sonderzeichen-Set wird getragen (nicht nur die Latein-Erweiterung)
```

```konformitaet
aussage:  Ein Depot mit einem nicht darstellbaren Zeichen im Namen erzeugt kein Gesamt-PDF und zeigt eine Warnung mit den betroffenen Zeichen — kein Download läuft.
zustand:  geprüft
pruefung: tests/e2e/u2-adr-263-pdf-schriftdeckung.spec.js#[U2-ADR-263·Ende-zu-Ende] chinesischer Text im Namen: Gesamt-PDF wird NICHT erzeugt, Warnung erscheint
```

---

*Vivodepot GmbH · Berlin · 04.09.2026*
