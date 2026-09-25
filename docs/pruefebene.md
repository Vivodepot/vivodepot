# Die Prüfebene

Dieses Dokument beschreibt, wie Vivodepot geprüft wird — und was davon öffentlich mitgeliefert
wird und was nicht. Das Vorbild ist [SQLites Testing-Seite](https://sqlite.org/testing.html): von
vier Testharnischen sind zwei öffentlich, zwei proprietär, und trotzdem zweifelt niemand an der
Gründlichkeit, weil die Architektur offen beschrieben wird und ausdrücklich sagt, welche Teile
es nicht sind. Die Transparenz liegt auf dem Verfahren, nicht auf dem Code.

**Stand:** 14.08.2026, Schema-Version 63, SCHALEN_STAND v229. Zahlen unten stammen aus
[`docs/faktenbasis.md`](faktenbasis.md), maschinell erzeugt — nicht aus dem Gedächtnis.

---

## Die Ebenen

**1. Node-Proben (`node --test`) — 3709 Stück.** Laufen offline gegen den geladenen Kern
(`vivodepot.html` selbst, über einen Test-Loader) — keine Browser-DOM-Engine, ein Stub. Decken
Datenmodell, Migrationen, Export-/Import-Mappings, Krypto-Funktionen, Wächter-Logik und generische
Rendering-Pfade ab. Das ist der Großteil der Zahl, aber die Stub-Grenze ist real: interaktive
DOM-Verdrahtung (Klick-Handler, `querySelector`-basierte Wiring) ist in diesem Harnisch nicht
prüfbar — dafür braucht es Ebene 2.

**2. Browser-Abnahmen (Playwright) — 151 E2E-Reisen, drei Browser.** Chromium und Firefox
automatisiert (`playwright.config.js`, `playwright.config.firefox.js`), Safari/WebKit von Hand
— es gibt kein automatisiertes WebKit-Projekt in diesem Repository. Dazu eine separate
Cross-App-Reise-Suite (`tests/e2e-cross/`) für den Weg zwischen Haupt-App und Lese-App. Diese
Ebene prüft, was Ebene 1 strukturell nicht kann: echte Klicks, echtes Rendering, echte
Datei-Downloads.

**3. Konformitätsprüfung (`npm run test:konformitaet`) — 47 Proben in 7 Dateien, harte
Pre-Push-Gates.** Kryptografische Testvektoren (RFC 5869, NIST CAVP, Ed25519/Wycheproof),
die Offline-Garantie (kein Byte verlässt das Gerät — geprüft über einen vollständig blockierten
Netzwerk-Kontext), der Kein-Master-Key-Beweis, eine Inventur, dass kein geheimer Schlüssel
`extractable:true` trägt, und WCAG 2.2 AA über `axe-core` — über alle 35 Sichten des Kerns und
alle 15 Sichten der Lese-App, 0 Verstöße im letzten Lauf. Ein externer HL7-FHIR-Validator läuft
zusätzlich, aber nur dort, wo eine Java-Runtime verfügbar ist (in CI).

**4. Die Wächter — 60 im Register (`tools/waechter-register.js`).** Ein Wächter ist eine
gepflanzte, ständig laufende Probe gegen eine ganz bestimmte Zusicherung — "keine neue tote
STRINGS-Konstante", "kein Feld ohne Gültigkeits-Datum daneben", "die Krypto-Version-Allowlist
lässt keine ältere Version durch". Anders als eine einmalige Messung bleiben Wächter im Repo und
laufen bei jedem `npm test`. Ein Teil ist ins `pre-commit`/`pre-push`-Gate verdrahtet (blockiert
den Commit bzw. Push bei Rot), ein anderer Teil läuft "auf Zuruf" — bewusst, wenn eine
Nulltoleranz-Verdrahtung permanent rot wäre, weil noch nicht der ganze Bestand durchgearbeitet
ist (Beispiel: der ADR-Namen-Wächter läuft für neue ADRs im Gate, für die 77 noch unbearbeiteten
Alt-ADRs erst, wenn sie überarbeitet sind).

---

## Der Grundsatz, der hier härter gehandhabt wird als üblich

**Ein Wächter, der nie rot war, gilt nicht als Nachweis.** Eine Zusicherung, die niemand je
brechen sah, könnte seit ihrer Entstehung wirkungslos sein — ein Wächter, der nichts sieht, meldet
dasselbe wie einer, der nichts findet. Rot⇄grün wird real gefahren: ein absichtlich kaputtes
Beispiel anlegen, belegen, dass der Wächter anschlägt, zurücknehmen, belegen, dass er wieder grün
ist. Behauptet wird nichts.

## Die Selbstprüfung der Prüfebene

`tools/waechter-selbsttest.js` ("Stufe 0") fährt genau das systematisch, für alle 60 Wächter auf
einmal: jeden gegen sein eigenes kaputtes Beispiel UND sein eigenes erlaubtes Beispiel, mit fünf
möglichen Ausgängen — **bestanden** (rot am kaputten, grün am erlaubten Beispiel), **durchgefallen**
(blieb grün, oder meldete etwas anderes), **ohne Probe** (bringt keine zwei Beispiele mit — zählt
als Mangel, nicht als Erfolg), **ungemessen** (bräuchte Netz oder eine Laufzeit, die hier fehlt —
zählt nie als grün) und **Anker kaputt** (die Probe wäre ansetzbar, aber ihre eigene Fixture ist
von der Quelle weggedriftet).

**Letzter Lauf (14.08.2026): 60 Gegenstände · 56 bestanden · 0 durchgefallen · 1 ohne Probe ·
2 ungemessen (OSV-Scan und der externe HL7-Validator brauchen Netz bzw. Java — ihr Beleg entsteht
im CI-Lauf, nicht auf jeder Maschine) · 1 mit zurückgestelltem Anker** (eine Eigenschaftsprüfung
für Trefferflächen-Mindestgrößen über alle Bereiche/Themes/Schriftskalen — der Generator dafür
ist noch nicht gebaut, die Trefferflächen selbst sind bereits über ein festes Raster im
Pre-Push-Gate abgedeckt; das hier wäre zusätzliche Tiefe, kein Erstnachweis).

---

## Was NICHT abgedeckt ist

Diese Prüfungen gibt es nicht:

- **Kein Fuzzing.** Keine automatisierte Eingaben-Zufallsgenerierung gegen Parser oder
  Krypto-Pfade.
- **Keine externe Sicherheitsprüfung.** Kein durchgeführtes Penetrationstest, kein bezahltes
  Audit. Die Krypto-Bausteine sind gegen Standard-Testvektoren geprüft (Ebene 3), nicht von einer
  externen Stelle abgenommen.
- **Safari/WebKit nur von Hand.** Kein automatisiertes Playwright-WebKit-Projekt in diesem Stand.
- **378 Node-Proben mit unklarer Aussagekraft, sortiert, nicht repariert.** Eine Stub-Grenze im
  Test-Harnisch (DOM-Klick-Wiring, größtenteils `renderTopbar()`-Icon-Injektion) erzeugte
  Fehlschläge, als der Stub testweise verschärft wurde. Sortiert: rund 362 sind reines Kollateral
  der Test-Umgebung (kein Produktrisiko), 1 ist ein bestätigter "echt blinder" Test (die
  DOM-Werteschreibung erreicht die eigentliche Prüf-Logik nie — das Testergebnis könnte aus dem
  falschen Grund grün sein), 15 bleiben unklar. Nicht behoben, weil die Reparatur selbst
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
