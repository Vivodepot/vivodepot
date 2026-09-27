# U2-ADR-387 · Die Ab-Werk-Rangfolge für logikModul, und der gemeinsame Wächter darüber

**Datum:** 08.09.2026
**Status:** gebaut, 13/13 Proben grün (6 logikModul + 6 Tabelle + 1 bereits vorher grün)
**Status heute:** gilt
**Auftrag:** Ab-Werk-Rangfolge (08.09.2026) — nach der Entscheidung, dass
ein konfektioniertes Produkt sein Sprach-/Pro-Modul AB WERK trägt, nicht als Begleitdatei
danebenlegt (U2-ADR-369-Nachfolge), stellte sich die Frage: was gilt, wenn eine Bürgerin selbst
etwas eingelassen hat, oder ein signiertes Vor-Depot-Bündel etwas anderes mitbringt?
**Bezug:** U2-ADR-363/U2-ADR-367 (die textsatz-Ab-Werk-Saat, Vorbild) · U2-ADR-288 (die
bestehende, ältere Erbschein-/Zugang-zum-Recht-Ab-Werk-Einlassung, Fund dieses Zugs) · U2-ADR-369
(Deutsch-Leck-Erlaubnisliste, Vorbild für die Bauart des Wächters)

---

## 1 · Die Drei-Stufen-Rangfolge

Für jeden Modultyp mit einem Ab-Werk-Mechanismus gilt dieselbe Rangfolge:

```
1  Ab-Werk-Saat                     was das Produkt eingebacken mitbringt
2  signiertes Vor-Depot-Bündel      schlägt die Saat
3  die Wahl der Bürgerin            schlägt beides
```

Stufe 3 ist nicht verhandelbar: das Depot gehört ihr. Stufe 2 über 1, weil ein Anbieter, der ihr
ein Depot stellt, spezifischer ist als der Hersteller des Gerüsts.

**Warum die aktive Sprache/das aktive Modul keine EINSTELLUNG ist, sondern eine FOLGE dessen, was
eingebacken wurde** (wörtlich): zwei verworfene Alternativen zeigen, warum. (a) Ein
zweiter, unsignierter Schreiber auf `_vorDepotSpracheAktiv` — verworfen, weil eine Variable mit
zwei Schreibern (einer signiert, einer nicht) keine Antwort mehr hat, was bei künftiger
Kollision gewinnt, außer der Aufrufreihenfolge. (b) Ein dritter Hebel neben `_vorDepotSpracheAktiv`
— verworfen, weil er Zustand UND Kombinationen hinzufügt, die niemand pflegen muss. Die richtige
Kategorie: das Produkt hat das Modul, die Aktivierung folgt daraus, wird nicht zusätzlich
behauptet.

## 2 · logikModul ist STRUKTURELL ANDERS als textsatz — zwei Umsetzungen, ein Prinzip

textsatz hat eine Registry mit AKTIV-Konzept (`_TEXTSATZ_MODUL_REGISTRY[sprache][rechtsraum]`,
genau eine Sprache je Rechtsraum), existiert VOR jedem Depot. logikModul hat KEIN
Ausschließlichkeits-Konzept — mehrere Module bestehen bewusst nebeneinander (ein Pro-Depot mit
zwei Vollmacht-Vorlagen ist kein Widerspruch) —, und `data.logikModule` existiert erst MIT einem
Depot.

**Verworfen:** (a) beiden Typen dieselbe Registry/Aktiv-Form aufzwingen — würde logikModul eine
Ausschließlichkeit erfinden, die das Produkt nicht hat, und eine erfundene Einschränkung ist
schlimmer als zwei Umsetzungen desselben Prinzips, weil sie wie Ordnung aussieht und eine
Behauptung über das Produkt ist. Stattdessen (b): dasselbe Prinzip, zweimal umgesetzt, an der
jeweils richtigen Stelle.

## 3 · Der Zeitpunkt: Produkt-Start, nicht Depot-Anlage — eine Produktaussage

**Erste Fassung des Auftrags** setzte die logikModul-Saat bei `depotAnlegen()`. **Lücke,
aufgedeckt beim Bauen, nicht vorher gesehen:** ein BESTEHENDES Depot, das jemand im Pro-Produkt
öffnet, bekäme die Pro-Module nie — "ist das ein Pro-Produkt" hinge vom Anlage-Datum des Depots
ab. Das bricht die DoD-Auflage: das v515-Testdepot, angelegt VOR dem Herausnehmen,
muss in ALLEN vier Produkten ohne Probleme durchgehen.

**Entscheidung:** die Ab-Werk-Saat läuft bei JEDEM Depot-Übergang
(`_alleModulRegisterAusDepotAnmelden`, läuft laut eigenem Kern-Kommentar "bei JEDEM
Depot-Übergang — Vorschau, Anlegen, Laden, Sub-Kontext, Reset"), nicht nur bei der Anlage. Ein
zwei Jahre altes Depot wird im Pro-Produkt zu einem Pro-Depot, ohne dass ihre Datei sich ändert
— das eingebackene Modul ist Teil des PRODUKTS, nicht der Datei der Bürgerin.

## 4 · Der Fund, der die Bauart bestimmte: `data.logikModule` darf NIE gesichert werden

**Geprüft, nicht angenommen:** `depotSerialisierenV4()` → `_zerfallSchreiben(data, …)` liest
`data` zum Schreibzeitpunkt VOLLSTÄNDIG, kein Journal/Diff. Ein Push der Ab-Werk-Kennung direkt
in `data.logikModule` würde beim nächsten Sichern mitgeschrieben — sie öffnet dieselbe Datei
morgen im privaten Produkt, und dann stünde das Pro-Modul plötzlich darin.

**Verworfen:** in `data.logikModule` schreiben und beim Serialisieren herausfiltern — das fasst
die Persistenz-/Kryptoebene an, und eine Bedingung im Schreibpfad ist die teuerste Fehlerklasse,
die es gibt: sie zeigt sich als verlorene/geleakte Daten, nicht als roter Test.

**Gebaut, gespiegelt an einem bereits bestehenden Muster für genau dieses Problem
(`_vorDepotTextsatzModule`):** `_abWerkLogikModule` ist ein eigener, von `data` GETRENNTER
Script-Global, nie gesichert, nur zur Laufzeit zugemischt.

```js
const AB_WERK_LOGIK_MODUL_QUELLEN = Object.freeze([]);  // leer im nativen Gerüst

function _logikModulAbWerkSeed() {
  const ergebnis = [];
  for (const roh of AB_WERK_LOGIK_MODUL_QUELLEN) {
    const geprueft = logikModulPruefen(roh);
    if (geprueft.gueltig) ergebnis.push(geprueft.logik);
  }
  return ergebnis;
}
let _abWerkLogikModule = _logikModulAbWerkSeed();

function _logikModuleAlle(d) {
  const eigene = (d && Array.isArray(d.logikModule)) ? d.logikModule : [];
  const eigeneIds = new Set(eigene.filter((m) => m && m.id).map((m) => m.id));
  const abWerk = _abWerkLogikModule.filter((m) => !eigeneIds.has(m.id));
  return eigene.concat(abWerk);
}
```

`AB_WERK_LOGIK_MODUL_QUELLEN` ist LEER im nativen Gerüst — ein konfektioniertes Produkt (Pro)
befüllt sie beim Bauen (Konfektionieren, kein Einlassweg, keine Signatur — Vivodepot baut sein
eigenes Produkt, dieselbe Unterscheidung wie bei `AB_WERK_TEXTSATZ_DE`). Das tatsächliche Backen
des Pro-Moduls in ein konfektioniertes Produkt ist NICHT Teil dieses Zugs — dieser Zug baut den
Mechanismus, den das Konfektionieren später füllt.

## 5 · Sieben Kopien auf einen Helfer gezogen — Ertrag, nicht Mehraufwand

Vorher stand `Array.isArray(data.logikModule) ? data.logikModule : []` (bzw. Varianten davon)
SIEBENMAL im Kern — sieben Kopien derselben Entscheidung, jede einzeln driftfähig. Alle sieben
einzeln durchgesehen (Auflage: "das ist die eine Stelle, an der dein Entwurf kippen
kann") — reine Lesestellen (Karten rendern, Modul-Existenz prüfen, Klick-Handler binden), keine
schreibt zurück:

| Zeile (vor dem Zug) | Funktion | Rolle |
|---|---|---|
| 39658 | `logikModulAuszugKartenHTML` | Karten rendern |
| 40434 | (Modul-Vorschau) | Modul per `id` finden, neu prüfen |
| 40602 | `moduleMitGenerator` | dynamische Liste bauen |
| 40804 | (Herkunfts-Anzeige) | `herkunft` eines Moduls nachschlagen |
| 40911 | `logikModuleAlsKarten` | Karten mit Generator/Ausgabe bauen |
| 42902 | (Klick-Handler) | `data-modul-karte`-Knöpfe verdrahten |
| 39739 | `_abWerkAuszuegeEinlassen` | Dedup-Prüfung VOR `modulEinlassen` — bleibt, s. §6 |

Alle sieben auf `_logikModuleAlle(d)` gezogen (die letzte, 39739, ausgenommen — sie ist Teil des
schreibenden Einlassweges, nicht ein Lese-Verbraucher, s. §6). Ein Quelltext-Wächter
(`tests/logikmodul-ab-werk-rangfolge.test.js`) hält fest, dass `data.logikModule`/
`d.logikModule`/`ziel.logikModule` im Kern nur noch an GENAU ZWEI Stellen als Eigenschaftszugriff
vorkommt — Rot-Beweis: eine künstlich eingefügte achte Kopie wird gefunden.

## 6 · Der Nebenfund: ein fünfter, älterer Ab-Werk-Weg, den niemand auf dem Zettel hatte

**Beim generischen Abgehen von `EINLASS_REGISTER` (13 Typen, Auflage — nicht die im Kopf
bekannten Typen aufzählen)** fand sich: `_abWerkAuszuegeEinlassen` (U2-ADR-288, 05.09.2026)
speiste bereits VOR diesem Zug echte Ab-Werk-Auszüge (Erbschein-Vorbereitung,
Zugang-zum-Recht-Beratungshilfe) über den reg­ulären Einlassweg
(`modulEinlassen(text, ziel, null, null)`) ins `logikModul`-Register — niemandem, 3f
oder mir bekannt, bevor dieser Zug ihn suchte.

**Seine Antwort auf die drei Stufen weicht ABSICHTLICH ab, und das macht ihn nicht falsch, nur
ANDERS:**
- Läuft NUR bei `depotAnlegen()` (+ gezielte Migrations-Aufrufe bei Schema-Sprüngen), NICHT bei
  jedem Depot-Übergang.
- Der Auszug WIRD in `data.logikModule` eingelassen und mitgesichert — kein "Produkt, nicht
  Datei"-Anspruch. Grund: der Auszug ist als EIGENER Inhalt der Bürgerin gedacht, den sie behält
  und bearbeiten kann — anders als ein Pro-Modul, das mit dem Produkt kommt und geht, wenn sie
  das Produkt wechselt.

**Eine abweichende Zeile ist eine Aussage, eine fehlende ist eine Lücke** — er bekommt
eine eigene Zeile in der Tabelle (§7), statt in einer der beiden neuen aufzugehen oder zu
verschwinden.

## 7 · Der gemeinsame, tabellengetriebene Wächter

`tools/lib/ab-werk-rangfolge-tabelle.js` — eine benannte Tabelle, EINE Zeile je Ab-Werk-Mechanismus
(heute drei: textsatz, logikModul-Pro-Backen, logikModul-Ab-Werk-Auszüge). **Beschreibend, kein
Vorschrift** ("sonst wäre er (a), und (a) haben wir verworfen") — verlangt nicht, dass
jeder Modultyp denselben Mechanismus benutzt, nur dass jeder EXISTIERENDE eine eigene Zeile trägt.

`tools/ab-werk-rangfolge-pruefen.js` — scannt `vivodepot.html` nach jeder ECHTEN
`const AB_WERK_*`-Deklaration (Kommentar-Erwähnungen zählen nicht mit) und vergleicht sie
SYMMETRISCH gegen die Tabelle:

- **UNERKLÄRT** — eine Konstante ohne Zeile (ein neuer Mechanismus, unregistriert).
- **VERALTET** — eine Zeile ohne Konstante (die Tabelle behauptet etwas, das nicht mehr existiert).

**WAS DIESER WÄCHTER NICHT SIEHT, Fund (08.09.2026), ausdrücklich benannt statt
verschwiegen:** der Scanner sucht nach `const AB_WERK_*`-Deklarationen — ein Ab-Werk-Weg, der
NICHT so heißt, fällt durch. `_abWerkAuszuegeEinlassen` (§6) selbst ist der Beleg: er wurde
gefunden, WEIL er bereits bekannt war (generisches Abgehen von `EINLASS_REGISTER`), NICHT weil
der Namens-Scanner ihn fand — seine SPEISENDE Konstante (`AB_WERK_AUSZUG_BUNDLE_TEXTE`) folgt der
Konvention, aber das war nicht garantiert, bevor jemand hinsah. Ein grünes Ergebnis dieses
Wächters ist darum KEINE Vollständigkeitszusage — nur eine Aussage über die Konstanten, die dem
Muster folgen. Der Wächter bewacht die Landkarte, die gezeichnet wurde, nicht von sich aus das
Gelände.

**Die zweite, unabhängige Probe (§7b) schließt genau diese Lücke — verhaltensbasiert statt
namensbasiert.**

**Suite:** `tests/ab-werk-rangfolge-tabelle.test.js`, 6/6 — Positivkontrolle, zwei Rot-Beweise
(beide Richtungen), eine Gegenprobe, die scharfe Abnahme (hart: `unerklaert === []` UND
`veraltet === []` gegen den echten Kern).

## 7b · Die zweite Probe: über Aufrufer, nicht über Namen

Ein namensbasierter Wächter ist blind für jeden Ab-Werk-Weg, der der Konvention nicht folgt —
`_abWerkAuszuegeEinlassen` selbst beweist das. Die zweite Probe findet Ab-Werk-Mechanismen über
ihr VERHALTEN: sie geht die Funktionskörper der beiden bekannten Saat-Einstiegspunkte
(`_alleModulRegisterAusDepotAnmelden`, `depotAnlegen`) ab und listet jede dort DIREKT aufgerufene
Funktion. Jede Aufruf-Stelle, deren Ziel nicht in der Tabelle als `seedFunktion` einer Zeile
steht (und nicht auf einer kleinen, benannten Erlaubnisliste bekannter Nicht-Ab-Werk-Aufrufe wie
`_sektorIndexNeuBauen`/`dateiBindungZuruecksetzen` steht), ist ein möglicher unregistrierter
Ab-Werk-Weg.

**Bewusst DIREKTE Aufrufe, keine transitive Hülle:** eine vollständige Aufrufgraph-Analyse
bräuchte einen echten JS-Parser (AST), keine neue Abhängigkeit für ein Test-only-Werkzeug. Die
direkte Ebene reicht, um `_abWerkAuszuegeEinlassen` zu finden (sie wird direkt aus `depotAnlegen`
gerufen) — eine tiefere Kette bliebe eine bekannte, benannte Lücke, nicht stillschweigend
angenommen als abgedeckt.

**Suite:** `tests/ab-werk-rangfolge-aufrufer.test.js` — listet die direkten Aufrufe beider
Einstiegspunkte, prüft jede unbekannte Aufruf-Stelle gegen die Tabelle/Erlaubnisliste, Rot-Beweis
mit einem künstlich eingefügten unregistrierten Aufruf.

**Branding (Auftrag) und Rechtsraum (Auftrag) sind zum Zeitpunkt
dieses Zugs noch nicht in diesem Baum gelandet** — ihre Zeilen kommen nach, sobald ihr Code
hier ankommt. Der Wächter nimmt auf, was existiert, statt vorab Symbole zu erfinden, die es in
diesem Baum noch nicht gibt.

## 8 · Zwei Funde beim Testen, keine Testfehler

**Fund 1:** die erste Testfassung nutzte die echte Erbschein-Fixture für den Rundlauf-Beweis und
kollidierte dadurch mit `_abWerkAuszuegeEinlassen`s eigener, unabhängiger Einlassung derselben
`id` bei `depotAnlegen()` — die gemessene Zahl war real, aber die falsche Vorbedingung für DIESE
Probe. Behoben mit einer synthetischen, eindeutigen `id`, nicht durch Anpassen der erwarteten
Zahl an den bestehenden Bestand.

**Fund 2, keine Korrektur am Mechanismus, sondern dessen BESTÄTIGUNG:** `V._abWerkLogikModule`
per Setter VOR `depotAnlegen()` zu setzen wurde vom Depot-Übergang selbst sofort wieder
überschrieben (die Saat läuft ja bei JEDEM Übergang neu, s. §3). Das ist kein Testproblem,
sondern der Beweis, dass §3 tatsächlich gilt — die Testreihenfolge (Setter NACH `depotAnlegen`)
wurde entsprechend korrigiert.

## 9 · Was NICHT Teil dieses Zugs ist

- Das tatsächliche Backen eines Pro-Moduls in ein konfektioniertes Produkt (`AB_WERK_LOGIK_MODUL_QUELLEN`
  bleibt leer im nativen Gerüst) — das ist `produkt-konfektionieren.js`s künftiger Zug, sobald
  der Bereichs-Modul-Artefaktpfad (U2-ADR-379) steht.
- Die Isolationsprobe (eine Produktdatei, allein in einem leeren Ordner, Doppelklick, kein Netz)
  — nächster Schritt, jetzt, wo der Mechanismus steht.
- Branding-/Rechtsraum-Zeilen in der Tabelle — kommen mit dem jeweiligen Rebase.
