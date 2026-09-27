# U2-ADR-304 · Die Landkarte vor E4 — was umfällt, wenn `SEKTOREN` quelltextlich leer ist

**Datum:** 05.09.2026
**Status:** Gilt (Befund, keine Behebung) (bereinigt 25.09.2026)
**Status heute:** gilt — Befund, keine Behebung; adressiert an die Sitzungen, die den nativen
`SEKTOREN`-Bestand tatsächlich herausnehmen
**Bezug:** U2-ADR-300 (Struktur-Achse — beweist „Modul geladen == nativ", WENN geladen wird —
diese ADR beweist NICHT dasselbe noch einmal) · U2-ADR-292/299 (`buergermodulSektorErsetzen`,
die Erste-Partei-Zone, RUNTIME-Ladeweg) · U2-ADR-301 (Erzeuger um Situationen/Assistenten
erweitert, `wizardsModulPruefen` verlangt `feld` UND `frage`, `buergermodulWizardErsetzen`
existiert noch nicht)

---

## 1 · Der Auftrag — nicht A==B, sondern „stirbt der Kern ohne Inhalt"

Der Auftrag, wörtlich: „Simulier es: lade den Kern, setz SEKTOREN auf leer, und miss, welche
Stellen umfallen. Das ist keine Regression — es ist die Landkarte, die 03 und 87 brauchen,
bevor sie den Inhalt wirklich herausnehmen."

Ausdrücklich NICHT Gegenstand dieser ADR: ob ein geladenes Modul-Bündel denselben Inhalt wie
nativ zeigt — das leistet U2-ADR-300 bereits, für alle 13 nativen Sektoren, byte-genau. Diese
ADR fragt etwas davor Liegendes: bootet der Kern überhaupt noch, wenn der native Bestand nicht
da ist — unabhängig davon, ob und wodurch er ersetzt wird?

---

## 2 · Methode — Quelltext-Ersatz, kein Post-Load-Monkeypatch

`SEKTOREN` ist ein `const`, gefüllt durch ein ~2100-zeiliges Array-Literal
(`vivodepot.html:10987`–`13132`). Interne Funktionen schließen über diese Bindung — ein
`SEKTOREN = []` von außerhalb ist syntaktisch verboten (`const`), und selbst mit `let` würde es
keine bereits gehoisteten Closures erreichen. Gemessen wurde darum mit einer echten
Quelltext-Substitution: das Array-Literal durch `[]` ersetzt, BEVOR `tests/load-kern.js`s
Lademechanismus (`KERN_HTML_PATH`, dieselbe Umlenkung, die auch `docx-streichung-gegenprobe`
für einen historischen Kern-Stand nutzt) das Ergebnis auswertet. `SEKTOR_BY_ID` baut sich daraus
unverändert (`Object.fromEntries(SEKTOREN.map(...))`) — mit leerem `SEKTOREN` also zu `{}`.

**Werkzeuge dieser Messung liegen NICHT im Repo** (vier Node-Skripte: Quelltext-Substitution,
zwei gezielte Weichschalt-Patches, die Prüf-Batterie selbst) — abweichend von der Regel, dass
ausführbarer Prüf-Code im Repo entsteht. Begründung, nicht nur Ansage: die Messung beantwortet
GENAU EINE, einmalige Architekturfrage vor einem bevorstehenden Umbau. Sobald 03/87 den
nativen Bestand tatsächlich entfernen, gibt es keinen „SEKTOREN quelltextlich geleert"-Zustand
mehr, den ein stehendes Werkzeug prüfen könnte — der Gegenstand der Messung verschwindet mit
dem Umbau selbst. Ein Prüfwerkzeug ohne einen Gegenstand, der über den Umbau hinaus bestehen
bleibt, wäre die Illusion einer Deckung, die die Regel gerade verhindern will.

---

## 3 · Befund 1 (der Blocker) — der Kern bootet NICHT, und zwar an genau ZEHN Stellen,
alle in EINEM einzigen top-level-Konstrukt

Mit `SEKTOREN` leer bricht die Skript-AUSWERTUNG selbst ab — vor jedem einzelnen Funktionsaufruf,
vor `depotAnlegen()`, vor allem. Der erste Wurf verdeckt dabei jeden weiteren: JavaScript hält
die Auswertung eines Top-Level-`const` beim ersten Fehler an, und ohne ein Meßgerät wäre nur
EINE der zehn Stellen je sichtbar geworden.

**Alle zehn Stellen liegen im selben Konstrukt: `const WIZARDS = Object.freeze(_textsatzAufWizardsAnwenden([…]))`
(`vivodepot.html:16206`).** Acht davon lösen ihre `optionen` inline über
`_katalogOptionen(sektorId, feldId)` auf (Zeilen 16245, 16396, 16402, 16420, 16439, 16442, 16445,
16452 — u. a. `gebwiz_kind_art`, `pflegegrad`, `pflegegeld`, `familienstand`, `gueterstand`,
`steuerklasse`). `_katalogOptionen` (Zeile 16186) ruft `_feldDef(sektorId, feldId)`
(Zeile 21034: `SEKTOR_BY_ID[sektorId].sektionen…`) und wirft hart, wenn nichts gefunden wird
(Zeile 16188). Zwei weitere Stellen (`pvwiz`, Zeile 16306–16310, `pv_vollmacht_besprochen` und
`pv_betreuung_besprochen`) lösen `feld` direkt über `_feldDef('vorsorge', feldId)` auf und tragen
einen eigenen, wortgleich strengen Wurf.

**Das ist keine verstreute Zerbrechlichkeit — sie ist auf EINEN Erzeuger konzentriert.** Die
anderen vier Modul-Vertrag-Generatoren (`PV_BMJ`, `VOLLMACHT_BMJ`, `KI_KORPUS`,
`BETREUUNG_MODUL`) rufen weder `_feldDef` noch `_katalogOptionen` auf — ihre `optionen` stehen
wörtlich im Literal, nicht als Live-Verweis auf `SEKTOR_BY_ID`. Nur `WIZARDS` bindet sich beim
eigenen Bau an den nativen Sektor-Bestand.

**Der eigentliche Befund — warum `buergermodulSektorErsetzen` das NICHT rettet:**
`buergermodulSektorErsetzen` (U2-ADR-292/299) läuft zur LAUFZEIT, aufgerufen aus
`depotAnlegen()`/`booteEingang()` — lange NACHDEM das Skript bereits vollständig ausgewertet
sein müsste. `WIZARDS` löst seine Katalog-Verweise aber bei der AUSWERTUNG selbst auf, Zeile
16206, weit VOR jedem Funktionsaufruf. Ein leeres natives `SEKTOREN` bricht die Auswertung also
ab, bevor `buergermodulSektorErsetzen` je aufgerufen werden könnte — der bestehende
Ersetzungs-Ladeweg kommt strukturell zu spät für dieses eine Konstrukt. Passend dazu hält
U2-ADR-301 bereits fest: der Erzeuger extrahiert `wizardsDefinitionen` mit bereits AUFGELÖSTEM
`feld`/`frage` (78 Schritte über 7 Assistenten) — und dass `buergermodulWizardErsetzen` (das
Laufzeit-Gegenstück zu `buergermodulSektorErsetzen`, aber für Assistenten) heute nicht
existiert. Diese ADR liefert das GEGENSTÜCK dazu: selbst WENN es existierte, käme es an dieser
einen Stelle zu spät — `WIZARDS` müsste entweder seine Katalog-Auflösung auf Aufrufzeit
verschieben (statt bei der Deklaration), oder der native Bestand müsste bis nach Zeile 16206
weiterleben, egal wie „leer" er danach gemacht wird.

---

## 4 · Befund 2 — alles danach lief glatt durch (33 Proben, 0 Fehlschläge), gemessen mit
einem reinen Meßgerät-Weichschalter

Um über den Block in §3 hinaus zu sehen, wurden GENAU diese zehn Stellen NUR FÜRS MESSEN
weich geschaltet (fehlender Katalog → leere Liste bzw. ein Platzhalter-Schritt statt Wurf,
mit Protokoll der betroffenen Schlüssel). Das ist KEIN Vorschlag für die echte Behebung — nur
ein Meßgerät, damit die Auswertung zu Ende laufen kann. Danach: `depotAnlegen()`, ein Akteur
erklärt sich selbst, alle elf Exportkanäle (`EXPORT_FORMATE`), alle vier PDF-Modelle
(Voll-Depot, zwei Bereiche, Notfallkern, Übergabe-Widerruf), ein ECHTER Datei-Rundlauf durch
einen zweiten, frischen Kern (`depotSerialisieren()` → `depotLaden()`), Person/Institution
anlegen, ein Sektorfeld auf eine nicht mehr existierende Sektor-Id schreiben, die
Mappen-Bereichs-Knopfreihe rendern — **kein einziger weiterer Fehlschlag.**

Konkrete Einzelfunde, jeder benannt statt stillschweigend als „lief durch" gezählt:

- **`bereichVollModell('identitaet', …)` gibt `null` zurück, wirft nicht** — der bestehende
  Guard `if (!s) return null;` (`vivodepot.html:47082`) trägt bereits, ungeprüft bis heute.
- **`flowBereichPdf` guardet ebenso** (`if (!SEKTOR_BY_ID[sektorId]) return;`, Zeile 47103).
- **`sektorFeldSetzen('identitaet', 'vorname', 'X')` schreibt anstandslos** — das Datenmodell
  prüft beim SCHREIBEN nicht gegen `SEKTOR_BY_ID`; ein Feldwert kann für eine Sektor-Id
  existieren, die es im Gerüst nicht mehr gibt.
- **`mappeBereichKnopfreiheHTML()` degradiert auf eine einzelne „Allgemein"-Schaltfläche** statt
  zu werfen — eine echte, funktionierende Verarmung, kein Absturz.
- Die vier weiteren `_feldDef`-Aufrufstellen abseits von `WIZARDS`
  (`vivodepot.html:21120/21126/21135/22242/22447/25259/27044`) sind bereits alle geguardet
  (`if (!_feldDef(...)) continue`, oder tolerant über `_wertAusText(undefined, …)`/
  `feld && feld.label`) — keine einzige davon musste für diese Messung angefasst werden.

---

## 5 · Grenzen dieser Messung — was sie NICHT zeigt

- **Nur der gemessene Ausschnitt (33 Proben) ist geprüft** — kein vollständiger Durchlauf jeder
  der laut Kern-Kommentar rund 70 Lesestellen an `SEKTOR_BY_ID` (`vivodepot.html:13133`–13139).
  Ein Fund außerhalb dieses Ausschnitts ist möglich und durch diese ADR nicht ausgeschlossen.
- **Kein Renderpfad geprüft** (`renderSektor` und Geschwister) — DOM-lastig, bräuchte einen
  echten Browser (Playwright); bewusst ausgelassen, weil das Ziel eine SCHNELLE Landkarte war,
  kein zweiter A==B-Beweis wie U2-ADR-300.
- **Kein echter Wizard-DURCHLAUF** (`wizardLauf`, tatsächliches Schritt-für-Schritt-Klicken) —
  nur der AUFBAU der Definition wurde geprüft. Der Platzhalter-Schritt für
  `pv_vollmacht_besprochen`/`pv_betreuung_besprochen` (nur im Meßgerät!) könnte bei einem echten
  Durchlauf an anderer Stelle noch etwas zeigen, das diese Landkarte nicht sieht.
- **Kein Ersatz für U2-ADR-300.** Diese ADR beweist NICHT „Modul geladen == nativ" — sie prüft
  nur, was passiert, wenn gar nichts nachgeladen wird.

---

## 6 · Für 03/87 — was das für den eigentlichen Umbau bedeutet

Genau EIN Konstrukt (`WIZARDS`, `vivodepot.html:16206`) braucht vor oder während der Entfernung
des nativen `SEKTOREN`-Bestands eine echte Lösung — an genau zehn benannten Stellen (§3). Der
bestehende Laufzeit-Ladeweg (`buergermodulSektorErsetzen`) kommt für dieses eine Konstrukt
strukturell zu spät, weil es sich bei der SKRIPT-AUSWERTUNG selbst an den Bestand bindet, nicht
erst beim Aufruf. Zwei gangbare Richtungen, keine hier entschieden:

1. `WIZARDS`s Katalog-Auflösung auf AUFRUFZEIT verschieben (z. B. `optionen` als Funktion/Getter
   statt als aufgelöstes Literal) — dann käme `buergermodulSektorErsetzen` (oder sein noch
   fehlendes Gegenstück für Assistenten, s. U2-ADR-301 §6) rechtzeitig.
2. Der native Bestand bleibt bis NACH Zeile 16206 lebendig, unabhängig davon, wie „leer" er
   danach gemacht wird — d. h. keine reine Quelltext-Leerung, sondern ein Bestand, der erst zur
   Laufzeit ersetzt wird, genau wie es `buergermodulSektorErsetzen` heute schon für
   `SEKTOR_BY_ID.sektionen` tut.

Alles andere im gemessenen Ausschnitt (§4) braucht keine Änderung — das Gerüst verträgt einen
leeren Bestand bereits an fast jeder Stelle, außer an diesem einen, jetzt benannten Ort.

---

*Vivodepot GmbH · Berlin · 05.09.2026*
