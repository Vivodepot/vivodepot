# U2-ADR-131: Eine Ausgabeschicht statt vier — der Modul-Vertrag wird Datenvertrag

**Status:** Akzeptiert
**Datum:** 10.08.2026
**Kategorie:** ARCHITEKTUR
**Grundlage:** interner Auftrag „K8/S9 – Dokumentausgabe" (09.08.2026),
Register K8 (`neu` · `offen`) und S9 (`neu` · `offen`, Rang 1).
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html`, `VORSORGE_MODULE[].dokAusgabe` (Registry-Erweiterung),
  `dokumentHTML(modulId, zeilenId)`/`dokumentOeffnen(modulId, zeilenId)` (~Zeile 23350ff.).
- **Sprint-Commits:** K8 Zug1 (`96b38e1`), S9 Zug2 (`75bcba1`).
- **ADR-Bezug:** dieser ADR; baut auf U2-ADR-068 (geteilter Dokument-Generator, Modul-
  Vertrag Teil 1: `id, datenLesen, optLabel, istSentinel, refmNamen, rolleLabel,
  eingangsformel, abschnitte[]`) und U2-ADR-070 (Instrument-Modul-Registry) auf.
**Status heute:** gilt — Beleg `tests/k8-byte-gleichheit.test.js#K8·Byte-Gleichheit`.

---

## Kontext

U2-ADR-068 hatte bereits die Erzeugung der Dokument-*Inhalte* vereinheitlicht
(`modulDokumentAbschnitte`, EIN Blocktyp-Handler-Satz für PV/KI/Vollmacht/Betreuung). Die
Schicht DARÜBER — HTML-Zusammenbau (`*DokumentHTML`), Overlay (`*DokumentOeffnen`),
Knopfverdrahtung, Wizard-Abschluss-Verzweigung — blieb vierfach kopiert, weil der Modul-
Vertrag selbst keinen Platz für die dort nötige Varianz vorsah (Artikel-CSS-Klasse,
Herkunfts-Absatz, Anzahl/Beschriftung der Unterschriftszeilen, ein modulspezifischer
Extra-Abschnitt, Fußzeilentext, Kern-Gate-Zugehörigkeit, welche Nebenangaben im Lücken-
Hinweis genannt werden, der volle Toolbar-Hinweistext).

**Gemessen vor dem Umbau (K8 Zug 0), nicht angenommen:** von 19/17/17/16 Zeilen je
`*DokumentHTML()`-Funktion waren 10 wortgleiche Abschrift; von 20/15/20/20 Zeilen je
`*DokumentOeffnen()`-Overlay waren ~12 wortgleich. Der Rest war LEGITIME Varianz, keine
zufällige Abweichung — z. B. hat nur die Vollmacht zwei Unterschriftszeilen (zwei
Vertragsparteien), nur die KI-Verfügung kein Kern-Gate (kein amtliches Formular, das seine
Aussage verliert), nur die Patientenverfügung einen Arzt-Bestätigungs-Abschnitt.

## Entscheidung

**Der Modul-Vertrag (U2-ADR-068) wird um `dokAusgabe` erweitert — ein DATENVERTRAG für die
Ausgabeschicht, analog zum bestehenden Vertrag für die Inhaltsschicht.** Neun Felder:
`h1, klasse, herkunftText, unterschriftZeilen, extraHTML, fussText, kernGate,
lueckenFelder, knopfAttr` (+ `dateiBasis` für S9, s. u.). Zwei generische Funktionen
(`dokumentHTML(modulId, zeilenId)`, `dokumentOeffnen(modulId, zeilenId)`) lesen diesen
Vertrag und ersetzen die vier Kopien.

**Der Nachweis ist Byte-Gleichheit, nicht Ähnlichkeit** (Auftragsvorgabe): die vier
Dokumente aus dem Vor-Umbau-Stand sind eingefroren (`tests/fixtures/k8-vorher/*.html`,
erzeugt gegen Commit `efdbfeb`) und werden gegen die neue Schicht auf exakte String-
Gleichheit geprüft (`tests/k8-byte-gleichheit.test.js`) — kein Diff-Toleranzbereich.

**Die vier Alt-Namen bleiben als dünne Wrapper** (`pvDokumentHTML()` → `dokumentHTML(
'patientenverfuegung')` usw.) — Bestandsaufrufer/-tests brechen nicht, die Migration ist
für sie unsichtbar.

**Knopfverdrahtung und Wizard-Abschluss folgen demselben Prinzip:** eine Schleife über
`moduleMitGenerator().filter(m => !m.mehrfach)` (PV/KI/BV) ersetzt drei hartkodierte
`querySelectorAll`-Blöcke — der Attributname (`data-pv-dokument` usw.) steht jetzt in
`dokAusgabe.knopfAttr`. Der Wizard-Abschluss (`wizardAbschluss()`) schlägt
`def.abschluss.dokument` in `VORSORGE_MODUL_BY_ID` nach, statt zwei Werte ('pv'/'ki') hart
zu verzweigen — die beiden Wizard-Definitionen tragen jetzt die volle Modul-id.
**Vollmacht bleibt zeilenscharf, eigener Weg** — als einziges `mehrfach:true`-Modul hat sie
keinen einzelnen „der eine Knopf"-Aufruf, sondern eine Record-id je Instrument-Zeile; das
ist strukturelle Notwendigkeit, keine vermeidbare Kopie, und wird bewusst NICHT in die
generische Schleife gezwungen.

### S9 — dieselbe Erweiterung trägt die Datei-Ausgabe

Direkt im Anschluss (S9 Zug2) zeigte sich der Wert des Datenvertrags: die drei neuen Wege
(„Als PDF sichern", „Als HTML sichern", „Ins eigene Depot legen") sind ERNEUT EINE
Funktion pro Weg (`flowDokumentDateiSichern`, `flowDokumentInMappeAblegen`,
`zeichneDokumentPdf`, `dokumentHTMLDatei`), die denselben `dokAusgabe`-Vertrag liest
(ergänzt um `dateiBasis` für den Dateinamen) — kein zweiter Vierfach-Bau. Die
Formatentscheidung (PDF via jsPDF UND eigenständiges HTML, „wenn beide Wege tragen, baue
beide" laut Auftrag) hat sich als tragfähig erwiesen: das PDF braucht einen NEUEN,
paginierten Text-Zeichner (`zeichneDokumentPdf`, kein Vorbild im Haus — die bestehenden
`zeichne*Pdf`-Funktionen sind Label/Wert-Zeilen fester Länge, kein fließender mehrseitiger
Absatztext), das HTML-Blatt ist praktisch kostenlos (dieselbe `dokumentHTML()`-Ausgabe,
eigenständig verpackt).

## Konsequenzen

- **Ein künftiges fünftes Instrument** (Testament/Sorgerechtsverfügung bekommen einen
  Generator, laut U2-ADR-070 vorbereitet) braucht für die Ausgabeschicht nur einen
  `dokAusgabe`-Eintrag — keine fünfte Kopie von `*DokumentHTML`/`*DokumentOeffnen`/
  PDF-Zeichner/HTML-Export. Das ist der Grund, warum der Auftrag K8 VOR S9 verlangte: „wer
  S9 vor K8 baut, baut die Dateiausgabe viermal."
- **`dokAusgabe.extraHTML`** bleibt eine Funktion, kein reiner Datenwert — der PV-Arzt-
  Abschnitt und der KI-Formhinweis lesen zur Laufzeit `PV_BMJ`/`KI_KORPUS` (Konsistenz zum
  signierten Wortlaut bleibt an der Quelle, nicht einer zur Bauzeit eingefrorenen Kopie).
- **B16-113-Registry (U2-ADR-097 §5)** musste um einen Eintrag wachsen (der neue
  `dateiAusgeben`-Aufrufer in `flowDokumentDateiSichern`) — klassifiziert als
  erlaubt-Klartext, dieselbe Klasse wie Situations-/Bereichs-PDF.
- **Nicht angefasst:** die externen Vorlagen (K9) und der Testament-Generator
  (U2-ADR-033 gilt unverändert) — beide bewusst außerhalb dieses Auftrags.

## Cross-Referenz

U2-ADR-068 (geteilter Dokument-Generator, Inhaltsschicht-Vertrag), U2-ADR-070 (Instrument-
Modul-Registry, `VORSORGE_MODULE`), U2-ADR-097 (B16-113 Klartext-Ausgabepfade-Registry).

```konformitaet
aussage:  die vier Dokument-Ausgaben (pvDokumentHTML/kiDokumentHTML/vollmachtDokumentHTML/
          betreuungDokumentHTML) sind byte-identisch zum Vor-K8-Stand (Commit efdbfeb);
          die Ausgabeschicht liest ihre Varianz aus VORSORGE_MODUL_BY_ID[modulId].dokAusgabe,
          nicht aus vier eigenen Funktionskörpern.
zustand:  geprüft
herkunft: invariante
pruefung: tests/k8-byte-gleichheit.test.js#[K8·Byte-Gleichheit] PV — dokumentHTML(\'patientenverfuegung\') == altes pvDokumentHTML() (Zug-0-Fixture)
pruefung: tests/k8-byte-gleichheit.test.js#[K8·Byte-Gleichheit] KI — dokumentHTML(\'ki-verfuegung\') == altes kiDokumentHTML() (Zug-0-Fixture)
pruefung: tests/k8-byte-gleichheit.test.js#[K8·Byte-Gleichheit] VM — dokumentHTML(\'vorsorgevollmacht\', id) == altes vollmachtDokumentHTML(id) (Zug-0-Fixture)
pruefung: tests/k8-byte-gleichheit.test.js#[K8·Byte-Gleichheit] BV — dokumentHTML(\'betreuungsverfuegung\') == altes betreuungDokumentHTML() (Zug-0-Fixture)
```

**Nachtrag 03.09.2026 (U2-ADR-226).** Der bisherige Kurz-Anker „K8·Byte-Gleichheit" allein passte
mehrdeutig auf alle vier Testtitel dieser Datei — der ADR-Konformitäts-Wächter prüfte bis dahin nur
die erste `pruefung:`-Zeile je Block und konnte das nicht sehen. Auf die vier tatsächlich
gemeinten, in der Aussage selbst genannten Ausgaben aufgelöst, nicht neu erfunden: alle vier
standen schon in der Aussage, nur nicht als eigene Zeile.

