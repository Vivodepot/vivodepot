# U2-ADR-167: Ändert eine Institution den vorgeschlagenen Prüf-Rhythmus, sagt die Feldzeile es leise

**Status:** Akzeptiert
**Datum:** 23.08.2026
**Kategorie:** ARCHITEKTUR, MODUL-EINLASS
**Grundlage:** Produktentscheidung vom 23.08.2026 zur A425-Zeile — bauen: ändert eine
Institution den vorgeschlagenen Prüf-Rhythmus eines Modul-Feldes, erfährt die Bürgerin davon,
leise. Baut auf A425 Zug 0 (Registerzeile, 21.08.2026) und der Entscheidung vom 22.08.2026
(die Bürgerin erfährt eine Änderung).
- **Code-Stelle:** `vivodepot.html` — `_templateFeldZuModell` (Durchreichen von der Institution),
  `_templateDefAlsFeld` (Durchreichen an den Renderer), die feldDefinitionen-Aktualisierung
  (Änderungs-Erkennung), `feldPruefIntervallHinweisHTML` (neu), `feldZeileHTML` (Aufruf), zwei
  neue STRINGS.
- **Status heute:** gilt — gebaut und belegt in `tests/a425-pruefintervall-hinweis.test.js`.

---

## Der gemessene Befund

A425 Zug 0 hatte zwei Lücken benannt: `_templateDefAlsFeld` reichte `pruefIntervallMonate` nicht
durch, und die Frage "erfährt die Bürgerin von einer Änderung" war ungeklärt. Beim Bau zeigte
sich eine DRITTE, in A425 nicht benannte Lücke: bereits die vorgelagerte Übersetzungsstelle
(`_templateFeldZuModell`, die aus der rohen Institutions-Einreichung die interne Definition
baut) reichte `pruefIntervallMonate` ebenfalls nicht durch — dieselbe Klasse von Lücke wie bei
`sensibel` und den Marken, nur eine Stufe früher in derselben Kette.

## Entscheidung

**Durchreichen an BEIDEN Übersetzungsstellen**, nicht nur der genannten — sonst bliebe die Kette
an ihrem eigentlichen Anfang unterbrochen, obwohl die genannte Stelle repariert wäre.

**Änderungs-Erkennung am Aktualisierungs-Ort** (Kette, Auftrag 6, Zug 2, "Der Wert wird nie
angefasst"): wird eine Modul-Definition durch eine höhere Fassung DESSELBEN Anbieters ersetzt und
unterscheidet sich dabei `pruefIntervallMonate`, merkt sich die neue, gespeicherte Definition den
VORHERIGEN Wert (`_pruefIntervallVorherigerWert`) — die einzige Spur, die die Anzeige braucht.

**Leise Anzeige, wörtlich wie beauftragt:** kein Hinweis beim Öffnen, keine Sammelmeldung, kein
Zähler — eine Zeile an der Feldzeile selbst (`feldPruefIntervallHinweisHTML`, gerufen aus
`feldZeileHTML`, demselben Ort wie die Gültigkeits- und "Ausdrücklich keine"-Zeilen daneben).
**Rein lesend:** die Funktion verändert beim Rendern nichts — dieselbe Regel, die "zweimal
rendern ergibt zweimal dasselbe" für jede andere Render-Funktion im Kern verlangt.

## Was NICHT in dieser ADR steht

**Kein Weg für die Bürgerin, einen EIGENEN Prüf-Rhythmus für ein Modul-Feld zu setzen.** Die vom
Auftrag genannte Linie ("vorschlagen, nie setzen — wie beim Gültigkeitsbeginn") beschreibt eine
Invariante für einen KÜNFTIGEN Bau, keinen, den dieser Auftrag verlangt. Für Dokumente existiert
dieser Weg bereits (`dokumentSetzen(..., 'pruefIntervallMonate', …)`); für Modul-Felder an
Sektoren nicht. Ohne ihn bleibt die Ansage dauerhaft sichtbar, bis eine künftige Erweiterung sie
quittierbar macht — eine benannte Lücke, keine stillschweigende.

**Kein neuer Schema-Schlüssel im Einreich-Schema, keine Erzeuger-Oberfläche.** Eine Institution
kann `pruefIntervallMonate` heute technisch noch nicht einreichen (das Schema kennt den
Schlüssel nicht, `additionalProperties: false` würde ihn zurückweisen). Diese ADR macht nur den
INTERNEN Weg widerspruchsfrei, für den Tag, an dem Schema und Erzeuger-Oberfläche diese Angabe
tragen — ein eigener, größerer Bau (Vorlagen-Vertrag ändern, Erzeuger-UI, VC-Issuer-Spiegel).

**Keine Behandlung für Dokument-Ebene-`pruefIntervallMonate`** (Vorsorge-Dokumente). Die
bestehende Dokument-Logik (`dokumentSetzen`, `empfRhythmusMonate`) ist unverändert; dieser Bau
betrifft ausschließlich Modul-FELDER an Sektoren, ein bislang unbesetzter Fall (A425: "kein
einziges Feld trägt eine Intervall-Angabe").

---

*Vivodepot GmbH · 23.08.2026*
