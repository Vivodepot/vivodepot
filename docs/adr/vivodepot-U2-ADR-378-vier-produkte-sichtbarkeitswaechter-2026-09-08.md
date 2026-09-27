# U2-ADR-378: der Sichtbarkeitswächter für die vier Produkte — umgedreht, damit er niemanden sperrt

**Status:** gilt
**Datum:** 08.09.2026
**Kategorie:** ARCHITEKTUR, PRODUKT, TEST
**Linie:** U2
**Drei-Anker:**
- **Code-Stelle:** `tests/e2e/u2-adr-378-vier-produkte-sichtbarkeit.spec.js` — nutzt
  `tools/produkt-konfektionieren.js` + `tools/lib/vier-produkte.js` unverändert (kein Nachbau),
  öffnet jede erzeugte `vivodepot.html` über `file://`, kein Server, kein Testhaken.
- **ADR-Bezug:** U2-ADR-361 (produkt-konfektionieren.js/vier Produkte selbst), U2-ADR-369
  (das noch ausstehende Ab-Werk-Backen, e2/3f), U2-ADR-379 (das noch fehlende Bereichs-Modul
  für den Pro-Sektor, dieselbe Sitzung).
- **Status heute:** gilt

**Anlass:** die Frage "sind das dt. Bürger- und Pro-Depot konfektioniert? kann ich sie
testen?" führte zur Entdeckung, dass alle vier Produkte gleich aussehen, auch im privaten
Fenster. `tests/produkt-konfektionieren.test.js` widerspricht dem nicht: es beweist byte-gleiches
Gerüst und ein echtes signiertes Zusatzmodul NUR BEI PRO — aber das ist eine Aussage über Dateien
nebeneinander, nicht darüber, was ein Mensch sieht, der eine der vier Dateien per Doppelklick
öffnet. Dieselbe wiederkehrende Fehlerklasse wie beim Erbschein-Vorbereitungsauszug (U2-ADR-288)
und anderswo: ein Wächter prüft Gültigkeit, nicht Wirkung.

**Bau:** eine Playwright-Probe erzeugt die vier Produkte über den echten Weg (dieselben
Funktionen, die auch `vier-produkte-erzeugen.js` nutzt) in ein Temp-Verzeichnis, öffnet jede
`vivodepot.html` als `file://`-URL — der exakte Weg, den eine Bürgerin beim
Doppelklick geht — und behauptet SICHTBARES.

**Der Wächter steht ABSICHTLICH UMGEDREHT.** Ein erster Entwurf behauptete die Zielbild-Wahrheit
(privat-en zeigt Englisch, pro-de/-en zeigen ein Pro-Merkmal) und war damit heute dreifach rot.
Vor dem Commit gemessen, nicht angenommen: `hooks/pre-push` (U2-ADR-329,
`scripts/pruefe-e2e-bereich.js`) fährt bei jedem Anlass `npm run test:e2e` VOLLSTÄNDIG und
bricht bei JEDEM roten Test hart ab — keine Bereichs-Filterung auf einzelne Specs. Ein dauerhaft
rotes E2E-Spec hätte damit JEDEN künftigen Push von JEDEM blockiert, sobald irgendeine
Trägerdatei oder irgendein E2E-Spec sich ändert — praktisch immer. Der Auftrag wurde korrigiert:
der Wächter behauptet stattdessen die HEUTIGE, gemessene Wahrheit (die vier Produkte sind visuell
ununterscheidbar) und ist damit grün, für alle, ab sofort — dieselbe Bauform wie e2s Wächter 3 in
`tools/vier-produkte-erzeugen.js` ("deutsche Zeilen im englischen Produkt, ERWARTET > 0, solange
Zug 2 fehlt").

Drei verworfene Alternativen und warum:
1. `test.fixme()` für die drei Fälle — verliert den Lauf (ein übersprungener Test bewacht nichts),
   und die bestehende Obergrenze 1 in `tests/e2e-fixme-ratsche.test.js` existiert genau, damit
   diese Tür zubleibt.
2. Eine Allowlist im Gate für benannte rote Tests — macht Rot dauerhaft erträglich. Wenn Rot
   verhandelbar wird, ist das Gate keins mehr. (`ERWARTETE_ABWEICHUNGEN` an anderer Stelle im Repo
   listet benannte Unterschiede in einem GRÜNEN Lauf — etwas anderes als ein Gate, das rote Läufe
   durchlässt.)
3. Das Spec außerhalb von `tests/e2e/` halten — schafft einen zweiten Ort für dieselbe Sache,
   dieselbe Fehlerklasse wie die doppelt inline definierten Pro-Bereiche (s. U2-ADR-379).

**Ergebnis, gegen einen echten Playwright-Lauf verifiziert (4/4 grün):**
- **privat-de** (Gegenprobe, bleibt grün auch nach 369/379): Willkommenstext Deutsch, keine
  Pro-Regal-Karte.
- **privat-en**: zeigt HEUTE NOCH Deutsch, identisch zu privat-de — Grund: das Sprachmodul liegt
  nur als inerte Begleitdatei daneben (U2-ADR-369).
- **pro-de/pro-en**: zeigen HEUTE NOCH kein Pro-Merkmal (Regal-Karte „Geschäftsführerin —
  Vertretung, Nachfolge, Notfall" auf der `vorsorge`-Seite) — ZWEI unabhängige Gründe, einzeln im
  Kopf-Kommentar der Spec benannt: (1) der Sektor `pro-vertretung-vollmachten` hatte kein
  ausgeliefertes Bereichs-Modul — selbst ein manueller Einlass des Logikmoduls scheiterte mit
  `grund:'sektor'` (gemessen); (2) selbst mit dem Sektor backt nichts heute beide Module in die
  Datei ein.

**Der Mechanismus, der sich selbst erzwingt:** sobald U2-ADR-369 und/oder U2-ADR-379 landen, wird
GENAU DIE dazu passende Zeile hier ROT — das ist dann keine kaputte Probe, sondern eine überholte
Behauptung. Die Fehlermeldung selbst sagt dem Landenden, welche Zeile umzudrehen ist. Eine
Umkehrung, die sich nicht vergessen lässt, weil sie sich selbst meldet.

**Was dieser Zug ausdrücklich nicht entscheidet:** ob/wie das Backen selbst geschieht (U2-ADR-369,
e2/3f); ob der Pro-Sektor als eigenes Artefakt zum Pro-Modul oder zum Gerüst gehört (U2-ADR-379,
dort entschieden: zum Pro-Modul).
