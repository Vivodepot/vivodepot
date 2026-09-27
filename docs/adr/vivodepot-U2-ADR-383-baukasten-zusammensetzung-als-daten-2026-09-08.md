# U2-ADR-383: der Baukasten bekommt eine Abnahme seiner eigenen Zusammensetzung — die Modul-Tabelle als Daten, nicht als Code

**Status:** gilt
**Datum:** 08.09.2026
**Kategorie:** ARCHITEKTUR, PRODUKT, TEST
**Linie:** U2
**Drei-Anker:**
- **Code-Stelle:** `tools/lib/vier-produkte-zusammensetzung.js` (neu, die Tabelle),
  `tests/vier-produkte-zusammensetzung.test.js` (neu, der Wächter — Struktur + Reconciliation,
  beide Richtungen), `tools/lib/vier-produkte-dateinamen.js` + `tests/vier-produkte-dateinamen.test.js`
  (U2-ADR-377-Vorarbeit, dieselbe Sitzung).
- **ADR-Bezug:** U2-ADR-378 (der umgedrehte Wächter — dasselbe Prinzip hier wiederverwendet),
  U2-ADR-379 (die Pro-Bereichs-Lücke, die dieser Zug jetzt strukturell sichtbar hält), U2-ADR-361
  (produkt-konfektionieren.js/vier-produkte.js selbst, unverändert wiederverwendet), U2-ADR-369
  (e2s noch ausstehendes Ab-Werk-Backen).
- **Status heute:** gilt

**Anlass:** die DoD nennt fünf Achsen — privat/pro, Sprache, Rechtsraum, Branding, UX. Vier
Produkte × fünf Achsen ist eine Tabelle mit zwanzig Feldern, und bis heute stand nirgends, welche
davon besetzt sind — die Zusammensetzung steckte hart verdrahtet in `tools/lib/vier-produkte.js`
(vier Objektliterale, ohne Achsen-Begriff). Genau deshalb rutschte die Pro-Achse monatelang durch:
es gab keinen Ort, an dem stand, dass Pro ZWEI Module braucht (Bereichs-Modul + Logikmodul,
U2-ADR-379) — nur Code, der eines der beiden mitgab, ohne dass die Lücke irgendwo als Aussage
existierte.

**Bau:**

1. **Die Zusammensetzung als Daten.** `tools/lib/vier-produkte-zusammensetzung.js` trägt eine
   Tabelle: vier Zeilen (Produkt-Slugs), fünf Achsen (`linie`, `sprache`, `rechtsraum`, `branding`,
   `ux`), jede Zelle `{ modulPfade, grund }`. `grund` ist PFLICHT, ausnahmslos — `zelle()` wirft,
   wenn er fehlt oder leer ist. „Keins, weil das Gerüst ab Werk trägt" ist ein Eintrag, kein
   leeres Feld. Rechtsraum, Branding UND UX zeigen drei verschiedene, alle bewusste Antworten auf
   dieselbe Frage: Rechtsraum=DE und Branding=Vivodepot (beide
   koordiniert, eigene noch nicht gelandete Züge) sind ab Werk in die Modul-Registry gesät,
   dieselbe Form wie Sprache=Deutsch — kein `modulPfad`, weil kein mitgegebenes Artefakt. UX/
   Erscheinung ist ein DRITTER Fall (3f, eigener noch nicht gelandeter Zug): der Mechanismus
   selbst (Einlassweg, Anwendung, Wirkungsprobe) ist vollständig und getestet, aber es gibt
   ABSICHTLICH kein Ab-Werk-Artefakt — Vivodepots eigener Zustand ist eine CSS-Kaskaden-Beziehung
   (eine Rolle erbt von der Basis-Skala), kein absoluter Wert wie eine Branding-Farbe, der sich
   verlustfrei einfrieren ließe. Alle drei Wortlaute
   kamen von den jeweiligen Sitzungen selbst, wörtlich übernommen.
2. **Ein Wächter, zwei Richtungen** (`tests/vier-produkte-zusammensetzung.test.js`): erzeugt die
   vier Produkte über den ECHTEN Weg (`produkt-konfektionieren.js` + `vier-produkte.js`,
   unverändert, kein Nachbau) und vergleicht je Zeile die deklarierten Modul-Basisnamen gegen die
   tatsächlich angedockten (`konfektionieren()`s eigener Rückgabewert `unsignierteModule`). Jedes
   deklarierte Modul muss im Produkt stecken; jedes Modul im Produkt muss deklariert sein. Rote
   Beweise für beide Richtungen (undeklariertes Modul im Produkt / fehlendes deklariertes Modul).
3. **Strukturprüfung: keine Achse ohne Grund.** `zusammensetzungStrukturPruefen()` läuft über
   ALLE Zeilen × ALLE Achsen und meldet jede ohne `grund` — eine unvollständige Tabelle ist ein
   Baufehler, kein stillschweigendes „nicht zutreffend".
4. **Die Tabelle ist ehrlich gegen HEUTE, nicht gegen das Zielbild** — dieselbe Lehre wie
   U2-ADR-378 (ein dauerhaft rotes `node --test` blockiert das pre-commit-Gate für JEDEN Commit).
   Pro's `linie`-Achse listet heute NUR das Logikmodul (alles, was `vier-produkte.js` tatsächlich
   mitgibt) — der `grund`-Text benennt die bekannte Lücke (fehlendes Bereichs-Modul, U2-ADR-379)
   explizit, statt sie aspirativ als deklariert zu behaupten und den Wächter damit sofort rot zu
   machen. Die Lücke ist damit strukturell SICHTBAR (steht in der Tabelle, die jeder liest, der
   das Produkt versteht) UND das Gate bleibt grün, bis sie behoben ist.

**Auflage 4, geprüft — "ein fünftes Produkt muss eine Zeile sein, kein Code":** an einer
SYNTHETISCHEN fünften Tabellenzeile geprüft (`tools/lib/vier-produkte.js` selbst bleibt
unangetastet, e2 arbeitet dort gerade — eine echte fünfte Zeile dort ist zudem eine
Produktentscheidung, keine, die dieser Bau trifft). Ergebnis, ehrlich: **die Prüf-Funktionen
selbst brauchen keine Änderung** (`zusammensetzungStrukturPruefen`/`zeileModulBasisnamen`
iterieren generisch über Zeilen/Achsen, keine hartkodierte Vieranzahl — Test bestätigt das). Ein
ECHTES fünftes Produkt braucht trotzdem DREI Dateien, je eine Datenzeile, KEINE neue Logik:
- `tools/lib/vier-produkte.js`: eine Zeile im `PRODUKTE`-Array (e2s Gebiet).
- `tools/lib/vier-produkte-zusammensetzung.js`: eine Zeile im `ZUSAMMENSETZUNG`-Array (fünf
  Zellen, aber ein Datenblock, keine neue Funktion).
- `tools/lib/vier-produkte-dateinamen.js`: je einen Eintrag in drei Objekten (Dateiname,
  Erklärung, Reihenfolge).
Drei Dateien statt einer ist der ehrliche Befund — sie sind aber DREI Datenzeilen, nicht drei
Codeänderungen, und keine der drei berührt eine Funktion.

**Was dieser Zug ausdrücklich nicht entscheidet:** wie/ob `tools/vier-produkte-erzeugen.js` diese
Tabelle künftig als EINGABE nutzt statt sie separat zu prüfen (heute reine Nachprüfung des
Ergebnisses, kein Umbau des Erzeugers — e2s Backen ändert dort gerade selbst etwas); ob/wann ein
Rechtsraum-/Branding-/Erscheinungs-Modul für eines der vier Produkte tatsächlich gebraucht wird.
