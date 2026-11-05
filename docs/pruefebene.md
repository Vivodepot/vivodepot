# Die Prüfebene

Dieses Dokument beschreibt, wie Vivodepot geprüft wird — und was davon öffentlich mitgeliefert
wird und was nicht. Das Vorbild ist [SQLites Testing-Seite](https://sqlite.org/testing.html): von
vier Testharnischen sind zwei öffentlich, zwei proprietär, und trotzdem zweifelt niemand an der
Gründlichkeit, weil die Architektur offen beschrieben wird und ausdrücklich sagt, welche Teile
es nicht sind. Die Transparenz liegt auf dem Verfahren, nicht auf dem Code.

Wie viele Browser-Reisen je Lauf es gibt und wie viele Wächter im Register stehen, steht in
[`docs/faktenbasis.md`](faktenbasis.md), Abschnitt „Prüfebene“, maschinell erzeugt. Die Zahl der
Node-Proben trägt die Faktenbasis nur nach einem vollen Lauf ein; steht dort „nicht neu gemessen“,
gibt es gerade keine geprüfte Zahl. Dieses Dokument wiederholt keine dieser Zahlen. Die einzige
Bestandszahl hier, die der Sichten, prüft eine Probe gegen `tools/axe-sichten.json`.

---

## Die Ebenen

**1. Node-Proben (`node --test`).** Sie laufen offline gegen den geladenen Kern
(`vivodepot.html` selbst, über einen Test-Loader) — keine Browser-DOM-Engine, ein Stub. Decken
Datenmodell, Migrationen, Export-/Import-Mappings, Krypto-Funktionen, Wächter-Logik und generische
Rendering-Pfade ab. Das ist der Großteil der Proben, aber die Stub-Grenze ist real: interaktive
DOM-Verdrahtung (Klick-Handler, `querySelector`-basierte Wiring) ist in diesem Harnisch nicht
prüfbar — dafür braucht es Ebene 2.

**2. Browser-Abnahmen (Playwright).** Die Reisen laufen automatisiert in Chromium und Firefox
(`playwright.config.js`, `playwright.config.firefox.js`). Eine Auswahl läuft außerdem automatisiert
in WebKit, dem Unterbau von Safari (`playwright.config.drei-browser.js`, `tests/e2e-drei-browser/`). Dazu eine separate
Cross-App-Reise-Suite (`tests/e2e-cross/`) für den Weg zwischen Haupt-App und Lese-App. Diese
Ebene prüft, was Ebene 1 strukturell nicht kann: echte Klicks, echtes Rendering, echte
Datei-Downloads.

**3. Konformitätsprüfung (`npm run test:konformitaet`), harte Pre-Push-Gates.** Kryptografische Testvektoren (RFC 5869, NIST CAVP, Ed25519/Wycheproof),
die Offline-Garantie (kein Byte verlässt das Gerät — geprüft über einen vollständig blockierten
Netzwerk-Kontext), der Kein-Master-Key-Beweis, eine Inventur, dass kein geheimer Schlüssel
`extractable:true` trägt, und WCAG 2.2 AA über `axe-core` — über alle 39 Sichten des Kerns und
alle 17 Sichten der Lese-App (Liste: `tools/axe-sichten.json`). Ein externer HL7-FHIR-Validator läuft
zusätzlich, aber nur dort, wo eine Java-Runtime verfügbar ist (in CI).

**4. Die Wächter (das Register ist intern).** Ein Wächter ist eine
gepflanzte, ständig laufende Probe gegen eine ganz bestimmte Zusicherung — "keine neue tote
STRINGS-Konstante", "kein Feld ohne Gültigkeits-Datum daneben", "die Krypto-Version-Allowlist
lässt keine ältere Version durch". Anders als eine einmalige Messung bleiben Wächter im Repo und
laufen bei jedem `npm test`. Ein Teil ist ins `pre-commit`/`pre-push`-Gate verdrahtet (blockiert
den Commit bzw. Push bei Rot), ein anderer Teil läuft "auf Zuruf" — bewusst, wenn eine
Nulltoleranz-Verdrahtung permanent rot wäre, weil noch nicht der ganze Bestand durchgearbeitet
ist (Beispiel: der ADR-Namen-Wächter läuft für neue ADRs im Gate, für noch unbearbeitete
Alt-ADRs erst, wenn sie überarbeitet sind).

---

## Der Grundsatz, der hier härter gehandhabt wird als üblich

**Ein Wächter, der nie rot war, gilt nicht als Nachweis.** Eine Zusicherung, die niemand je
brechen sah, könnte seit ihrer Entstehung wirkungslos sein — ein Wächter, der nichts sieht, meldet
dasselbe wie einer, der nichts findet. Rot⇄grün wird real gefahren: ein absichtlich kaputtes
Beispiel anlegen, belegen, dass der Wächter anschlägt, zurücknehmen, belegen, dass er wieder grün
ist. Behauptet wird nichts.

## Die Selbstprüfung der Prüfebene

Ein Selbsttest ("Stufe 0") fährt genau das systematisch, für alle Wächter im Register auf
einmal: jeden gegen sein eigenes kaputtes Beispiel UND sein eigenes erlaubtes Beispiel, mit fünf
möglichen Ausgängen — **bestanden** (rot am kaputten, grün am erlaubten Beispiel), **durchgefallen**
(blieb grün, oder meldete etwas anderes), **ohne Probe** (bringt keine zwei Beispiele mit — zählt
als Mangel, nicht als Erfolg), **ungemessen** (bräuchte Netz oder eine Laufzeit, die hier fehlt —
zählt nie als grün) und **Anker kaputt** (die Probe wäre ansetzbar, aber ihre eigene Fixture ist
von der Quelle weggedriftet).

Das Ergebnis eines einzelnen Laufs steht nicht hier, weil es nur für den Tag des Laufs gälte.

---

## Was NICHT abgedeckt ist

Diese Prüfungen gibt es nicht:

- **Kein Fuzzer im Dauerlauf.** Erzeugte Eingaben gibt es in den Eigenschaftsprüfungen
  (darunter beliebiges JSON gegen die Import-Erkenner
  und Speichern/Laden beliebiger Feldwerte) und als feste Sätze fehlerhafter Eingaben gegen die
  Importparser (`tests/g3-fuzzing-importparser.test.js`). Einen Fuzzer, der über lange Läufe nach
  Abstürzen sucht, gibt es nicht.
- **Keine externe Sicherheitsprüfung.** Kein durchgeführter Penetrationstest, kein bezahltes
  Audit. Die Krypto-Bausteine sind gegen Standard-Testvektoren geprüft (Ebene 3), nicht von einer
  externen Stelle abgenommen.
- **WebKit nur für eine Auswahl.** Die übrigen Browser-Reisen laufen nicht in WebKit, sondern nur in Chromium
  und Firefox.
- **Node-Proben mit unklarer Aussagekraft, sortiert, nicht repariert.** Eine Stub-Grenze im
  Test-Harnisch (DOM-Klick-Wiring, größtenteils `renderTopbar()`-Icon-Injektion) erzeugte
  Fehlschläge, als der Stub testweise verschärft wurde. Sortiert: der weitaus größte Teil ist reines
  Kollateral der Test-Umgebung (kein Produktrisiko), einer ist ein bestätigter "echt blinder" Test (die
  DOM-Werteschreibung erreicht die eigentliche Prüf-Logik nie — das Testergebnis könnte aus dem
  falschen Grund grün sein), ein kleiner Rest bleibt unklar. Nicht behoben, weil die Reparatur selbst
  aufwändig und noch nicht entschieden ist.
- **Ein Teil der Wächter läuft auf Zuruf, nicht im Gate** — siehe oben. Solange ein Wächter „auf
  Zuruf" läuft, kann zwischen zwei Läufen ein neuer Fund unentdeckt bleiben.

---

## Was öffentlich wird — und was nicht

**Die Prüfebene liegt zum größten Teil bei:** Proben in `tests/`, Werkzeuge in `tools/`,
Workflows in `.github/`. Zurück bleiben Proben, die interne Abläufe, den internen Befund-Prozess
oder zurückgehaltene Testdaten nennen, und die Git-Hooks. Die Regel für eine Probe in einem Satz:
Sie geht hinaus, wenn weder sie selbst noch eine Testdatei, die sie liest, ein internes Etikett,
einen Personennamen oder einen internen Pfad trägt und sie nicht zum internen Befund-Prozess
gehört. Welche Datei hinausgeht, entscheidet ein
Werkzeug nach festen Regeln; ein zweites prüft den Zuschnitt vor jeder Veröffentlichung auf interne
Etiketten, Pfade, Namen und Schlüsseldateien. Beide bleiben selbst intern, weil ihre Prüfmuster die
gesuchten Etiketten enthalten. Daneben kann ein Leser `vivodepot.html` selbst öffnen und lesen (eine einzige
Datei), die Prüfsumme (`vivodepot.html.sha256`) gegenprüfen, die SBOM (`vivodepot.sbom.cdx.json`)
einsehen und jede Architekturentscheidung in `docs/adr/` nachlesen.

Weder der DPG-Standard noch die OpenSSF Scorecard verlangen eine öffentliche Testsuite — die
Scorecard führt dafür genau eine Prüfung, eingestuft als niedriges Risiko.
