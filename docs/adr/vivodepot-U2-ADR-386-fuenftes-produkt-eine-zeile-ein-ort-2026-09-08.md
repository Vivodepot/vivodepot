# U2-ADR-386: "ein fünftes Produkt ist eine Zeile an einem Ort" wird ein Mechanismus, kein Satz im ADR

**Status:** gilt
**Datum:** 08.09.2026
**Kategorie:** ARCHITEKTUR, PRODUKT, TEST
**Linie:** U2
**Drei-Anker:**
- **Code-Stelle:** `tools/lib/vier-produkte-orte.js` (neu, die Messung + die namentliche Liste),
  `tests/vier-produkte-orte.test.js` (neu, der umgedrehte Wächter, roter Beweis gegen eine
  Fixture UND gegen den echten Baum verifiziert).
- **ADR-Bezug:** U2-ADR-383 (die Fünf-Achsen-Tabelle — dort wurde die Drei-Orte-Zahl zuerst
  gemessen), U2-ADR-378 (dieselbe Bauform: umgedrehter Wächter, grün heute), U2-ADR-369 (e2s
  Ab-Werk-Backen, `tools/lib/vier-produkte.js` bleibt unangetastet, solange es nicht gelandet ist).
- **Status heute:** gilt

**Anlass:** die zentrale Architekturaussage über den Baukasten lautet "ein fünftes
Produkt anzulegen ist EINE Zeile an EINEM Ort." U2-ADR-383 hat gemessen, dass das heute NICHT
stimmt: ein echtes fünftes Produkt bräuchte drei Dateien, je eine Datenzeile
(`tools/lib/vier-produkte.js`, `tools/lib/vier-produkte-zusammensetzung.js`,
`tools/lib/vier-produkte-dateinamen.js`) — die ehrliche Antwort, nicht die bequeme ("keine neue
Logik nötig" hätte die Auflage als erfüllt gemeldet, obwohl drei Orte drei Orte bleiben).

**Bau:** `datenTragendeDateien(slugs, ordner)` durchsucht rekursiv alle `.js`-Dateien eines
Ordners (Standard: `tools/`) danach, ob sie ALLE aktuellen Produkt-Slugs als angeführte
String-Literale tragen (`'privat-de'` usw., keine Teilstring-Suche). Ein einzelner Treffer
beweist nichts (kann ein einzelner Testfall sein); alle vier zusammen sind ein starkes Signal,
dass eine Datei die Produkte selbst aufzählt.

**GEMESSEN, NICHT ANGENOMMEN, warum der Scope auf `tools/` beschränkt bleibt:** dieselbe Suche
über `tests/` findet mehrere Treffer, die nichts mit der Zusammensetzung zu tun haben (z. B. ruft
`tests/produkt-konfektionieren.test.js` `konfektionieren()` einmal je Slug auf — vier Aufrufe,
keine Tabelle). Über `tools/` beschränkt trifft dieselbe Suche EXAKT und ausschließlich die drei
bekannten Orte — geprüft, nicht vermutet, per direktem Lauf gegen den echten Baum belegt.

**Der Wächter steht ABSICHTLICH UMGEDREHT** (dieselbe Bauform wie U2-ADR-378): er behauptet die
heutige, gemessene Wahrheit — DREI Orte, NAMENTLICH gelistet
(`DREI_ORTE_NAMENTLICH`) — und ist damit grün. Er wird ROT, sobald:
- ein VIERTER Ort entsteht (jemand fügt Zusammensetzungsdaten an neuer Stelle hinzu) — **am
  echten Baum verifiziert:** eine testweise angelegte vierte Datei mit allen vier Slugs macht die
  Probe sofort rot, exakt benennt sie die neue Datei; nach Entfernen wieder grün.
- einer der drei verschwindet (jemand führt zusammen, ohne den Wächter zu drehen).

Beides erzwingt eine bewusste Entscheidung: die Liste nachziehen, oder — im Erfolgsfall der
eigentlichen Zusicherung — den Wächter umdrehen, sobald nur noch EIN Ort übrig bleibt. Eine
Zahl allein ("drei Dateien") wäre zu grob gewesen — sie bliebe grün, wenn jemand einen Ort
entfernt und einen anderen hinzufügt; die namentliche Liste fängt genau das.

**Auflage beachtet:** `tools/lib/vier-produkte.js` wird in diesem Zug nur GELESEN
(`require()`, für die aktuellen Slugs), nie verändert — e2 arbeitet dort gerade (Ab-Werk-Backen,
U2-ADR-369).

**Was dieser Zug ausdrücklich nicht entscheidet:** WIE die drei Orte zu einem zusammengeführt
werden, sobald e2s Backen landet — das ist der nächste Zug (Zusammenführung: EIN Ort trägt die
Zusammensetzung, die anderen beiden leiten daraus ab oder verschwinden, dann wird dieser Wächter
selbst umgedreht).
