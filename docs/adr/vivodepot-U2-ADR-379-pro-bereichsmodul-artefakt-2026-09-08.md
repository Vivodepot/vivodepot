# U2-ADR-379: das Pro-Bereichs-Modul wird ein ausgeliefertes Artefakt — "Modul Pro" war zwei Module, nicht eins

**Status:** gilt
**Datum:** 08.09.2026
**Kategorie:** ARCHITEKTUR, PRODUKT
**Linie:** U2
**Drei-Anker:**
- **Code-Stelle:** `tools/templates/vivodepot-pro-geschaeftsfuehrerin-notfallmappe-bereich.json` (neu, sechs
  Sektoren), `tests/e2e/pro-geschaeftsfuehrerin-notfallmappe-abnahme.spec.js` UND
  `tests/pro-geschaeftsfuehrerin-notfallmappe-u2-adr-295.test.js` (laden jetzt beide das
  Artefakt statt inline zu definieren), `tests/pro-geschaeftsfuehrerin-notfallmappe-bereich-artefakt.test.js`
  (neu, roter+grüner Beweis, Beziehung statt Gleichheit).
- **ADR-Bezug:** U2-ADR-378 (der Fund entstand beim Bau des Sichtbarkeitswächters), U2-ADR-295
  (das logikModul selbst), U2-ADR-369 (das noch ausstehende Ab-Werk-Backen, das dieses Artefakt
  jetzt mitbacken kann).
- **Status heute:** gilt

**Anlass:** beim Bau von U2-ADR-378 scheiterte `tools/templates/vivodepot-pro-geschaeftsfuehrerin-notfallmappe-logikmodul.json`
schon bei MANUELLEM `modulEinlassen()` mit `grund:'sektor'` — der Sektor `pro-vertretung-vollmachten`
existierte in keinem ausgelieferten Bereichs-Modul, nur inline in zwei Testdateien, mit
abweichendem Inhalt:
- `tests/e2e/pro-geschaeftsfuehrerin-notfallmappe-abnahme.spec.js`: vier Sektoren,
  `herkunft: 'urn:pro-geschaeftsfuehrerin-e2e:v1'` (der eigene Kopf-Kommentar sprach fälschlich
  von „sechs Pro-Bereichen").
- `tests/pro-geschaeftsfuehrerin-notfallmappe-u2-adr-295.test.js`: SECHS Sektoren (zusätzlich
  `pro-finanzen-verbindlichkeiten`, `pro-betrieb-zugaenge`), `herkunft:
  'urn:pro-geschaeftsfuehrerin-test:v1'`.

Lesart, hier bestätigt: „Modul Pro" ist architektonisch KEIN einzelnes Modul, sondern
zwei — ein Bereichs-Modul (Struktur: welche Sektoren gibt es) und ein Logikmodul (Frage/Antwort-
Auszug darauf), dieselbe Trennung Struktur/Logik wie überall im Kern (U2-ADR-146, "Alles ist
modular"). Nur die Logik-Hälfte wurde je ein ausgeliefertes Artefakt; die Struktur-Hälfte lebte
ausschließlich in Testdateien — mehrfach, mit Drift zwischen den Kopien.

**KORREKTUR (08.09.2026, noch am selben Tag): die erste Fassung dieses ADRs war falsch,
und der Fehler liegt in der Herleitungsrichtung, nicht in einer Zahl.** Sie baute das Artefakt mit
NUR VIER Sektoren — abgeleitet aus dem, was das logikModul über sein `datenSchema` REFERENZIERT.
Das ist die falsche Richtung: das Bereichs-Modul sagt, welche Bereiche ein Pro-DEPOT HAT; das
logikModul (die Notfallmappe) ist nur EIN Auszug, der aus einigen davon schöpft. Dass ein
Notfall-Auszug die Finanzen nicht abfragt, sagt nichts darüber, ob eine Geschäftsführerin
Finanzen im Depot führt — offensichtlich tut sie das. Die zwei damals weggelassenen Sektoren
(`pro-finanzen-verbindlichkeiten`, `pro-betrieb-zugaenge`, aus der `u2-adr-295.test.js`-Fassung,
die von Anfang an RECHT hatte) sprechen für sich. Ein Artefakt mit nur vier Sektoren hätte
das Pro-Produkt still auf vier statt sechs Bereiche verkleinert — ausgelöst durch die Wahl
EINES Auszugs. **Struktur ist die Obermenge der Nutzung, nicht ihr Abbild** — wer als Nächstes ein
Bereichs-Modul baut, ist versucht, denselben Fehler zu machen, weil ein Logikmodul die einzige
greifbare Quelle zu sein scheint. Das ist es nicht.

**Entscheidung (korrigiert):**

1. **Ein Artefakt, ALLE SECHS Sektoren.** `tools/templates/vivodepot-pro-geschaeftsfuehrerin-notfallmappe-bereich.json`
   trägt `pro-vertretung-vollmachten`, `pro-gesellschaft-nachfolge`, `pro-finanzen-verbindlichkeiten`,
   `pro-betrieb-zugaenge`, `pro-aufbewahrung-ordnung`, `pro-kontakte-vertretungsplan` — dieselben
   sechs Namen/Labels wie in `u2-adr-295.test.js` (gegengeprüft: identisch, kein siebter, kein
   abweichender Name). `identitaet` gehört NICHT hinein — der existiert im Basis-Bündel, das
   Modul definiert nur, was hinzukommt. `herkunft: 'vivodepot-pro-geschaeftsfuehrerin'` — kein
   `urn:…:v1`-Test-Namensraum, weil dies jetzt ein echtes, ausgeliefertes Artefakt ist.
2. **Der Wächter prüft eine BEZIEHUNG, nicht Gleichheit.** JEDER vom logikModul referenzierte
   Sektor MUSS im Bereichs-Modul existieren — einseitig. Ein Sektor im Artefakt, den kein
   Logikmodul braucht, ist der Normalfall und bleibt grün; das ist keine Lücke, sondern der Sinn
   der Trennung (ein Depot hat mehr Struktur als ein einzelner Auszug abfragt).
3. **Gehört zum Pro-Modul, nicht zum Gerüst** (Lesart): das Gerüst kennt keine Bereiche,
   es trägt nichts Fachliches — der Sektor ist Teil dessen, was "Pro" inhaltlich ausmacht. Liegt
   darum unter `tests/fixtures/`, neben dem logikModul.
4. **Beide Testdateien laden jetzt das eine Artefakt** — `pro-geschaeftsfuehrerin-notfallmappe-abnahme.spec.js`
   UND `pro-geschaeftsfuehrerin-notfallmappe-u2-adr-295.test.js` (deren Inhalt vorher der
   RICHTIGE war und darum unverändert ins Artefakt übernommen wurde, nicht angeglichen).
5. **Roter Beweis am ECHTEN Einlassweg, nicht am JSON-Vergleich** (`tests/pro-geschaeftsfuehrerin-notfallmappe-bereich-artefakt.test.js`):
   ohne das Artefakt scheitert das logikModul mit `grund:'sektor'`; mit einem Artefakt, dem GENAU
   der von diesem logikModul benötigte Sektor fehlt, scheitert der ECHTE `modulEinlassen()` wieder
   mit `grund:'sektor'` — die Beziehung ist real geprüft, kein Zahlenspiel. Gegenprobe: ein
   Sektor im Artefakt, den kein Logikmodul braucht, bleibt grün.

**Auswirkung auf U2-ADR-369 (e2/3f, Ab-Werk-Backen):** die Pro-Dateien (pro-de/pro-en) müssen
künftig BEIDE Module backen, mit ALLEN SECHS Sektoren — dieses Artefakt ist der Pfad, den
`tools/lib/vier-produkte.js` dafür referenzieren kann.

**Was dieser Zug ausdrücklich nicht entscheidet:** ob weitere Pro-Sektoren jenseits dieser sechs
existieren sollen; wie/ob `tools/lib/vier-produkte.js`/`vier-produkte-erzeugen.js` das neue
Artefakt als `proBereichModulPfad` aufnehmen (U2-ADR-369-Gebiet, e2/3f).
