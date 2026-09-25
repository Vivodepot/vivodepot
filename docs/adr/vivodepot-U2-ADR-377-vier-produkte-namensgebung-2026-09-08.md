# U2-ADR-377: sprechende Dateinamen für die vier Produkte + die vierzeilige Erklärdatei

**Status:** gilt
**Datum:** 08.09.2026
**Kategorie:** PRODUKT
**Linie:** U2
**Drei-Anker:**
- **Code-Stelle:** `tools/lib/vier-produkte-dateinamen.js` (neu), `tests/vier-produkte-dateinamen.test.js` (neu).
- **ADR-Bezug:** U2-ADR-361 (produkt-konfektionieren.js/vier Produkte), U2-ADR-369 (e2s
  ausstehendes Ab-Werk-Backen — erst danach ergibt das eigentliche Aufmach-Werkzeug, U2-ADR-377
  im engeren Sinn, einen Ordner mit vier fertigen Dateien).
- **Status heute:** gilt

**Anlass:** seit Tagen besteht der Wunsch, die vier Produkte per Doppelklick öffnen zu können.
Struktur-Entscheidung derselben Sitzung: FLACH, EINE DATEI JE PRODUKT — "Vivodepot IST eine
Datei, die ohne Netz aufgeht". Das eigentliche Aufmach-Werkzeug braucht e2s Ab-Werk-Backen zuerst
(ein Produkt = eine Datei statt Ordner mit Begleitdateien); Namensgebung und Erklärdatei sind
davon unabhängig und wurden darum vorgezogen — kosten fast nichts, wirken sich sofort aus.

**Bau:** vier sprechende Dateinamen, für sie geschrieben, nicht für uns — kein Slug, kein
Sprachcode:
- `Vivodepot-Buergerdepot-Deutsch.html`
- `Vivodepot-Buergerdepot-Englisch.html`
- `Vivodepot-Pro-Deutsch.html`
- `Vivodepot-Pro-Englisch.html`

Bindestrich statt Unterstrich (Finder-lesbar), `.html`-Endung (die tatsächliche
Doppelklick-öffnen-Endung). Dazu eine Funktion, die die vierzeilige Erklärdatei erzeugt (Dateiname
+ kurze Erklärung je Zeile, plus ein abschließender Hinweissatz "öffnet sich direkt im Browser
per Doppelklick, ohne Internet") — reine Funktion, der Aufrufer entscheidet, wohin sie geschrieben
wird (das eigentliche Aufmach-Werkzeug, sobald es gebaut wird).

**Wächter:** die vier benannten Slugs müssen exakt den vier Slugs aus `tools/lib/vier-produkte.js`
entsprechen (kein fünfter, keiner fehlt); jeder Name einzeln unterscheidbar, endet auf `.html`,
kein Unterstrich; die Erklärdatei trägt genau vier Produktzeilen samt Hinweissatz.

**Was dieser Zug ausdrücklich nicht entscheidet:** wie das eigentliche Aufmach-Werkzeug (ein
Befehl, ein Ordner mit den vier fertigen Dateien) die Backen-Ausgabe von e2 einsammelt und
umbenennt — das folgt, sobald U2-ADR-369 steht.
