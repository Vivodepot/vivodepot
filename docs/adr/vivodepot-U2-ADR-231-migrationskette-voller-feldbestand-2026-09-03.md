# U2-ADR-231: die Ganzkette läuft am Stück — jetzt mit vollem Feldbestand geprüft, nicht nur mit fünf Sentinels

**Status:** Angenommen
**Datum:** 03.09.2026
**Kategorie:** TEST-INFRASTRUKTUR, DATENMODELL, LANGZEIT-LESBARKEIT
**Linie:** U2
**U2-Bezug:** U2-ADR-075 (Schema-Governance-Guard, dessen Test 3 dies ergänzt, nicht ersetzt) ·
U2-ADR-108 (Migrationstests je Sprung — einzeln, komplementär zur Kette hier) · U2-ADR-096
(Abschaffung der `testament_*`-Flachfelder, Quelle einer ausdrücklich ausgeklammerten Unsicherheit,
s. u.) · U2-ADR-104 (Skalar-zu-Liste-Faltungsmuster, mehrfach in der Rekonstruktion wiedererkannt)
**Anker:** Auftrag vom 03.09.2026, ausgehend von einer Produktfrage (interner Konzeptnotiz
„Gerüst und Module", § 8.3, 21.08.2026): „Wie viele Stufen trägt eine Datei aus 2026 im Jahr 2040,
und wird die Kette je getestet? Gemessen ist heute nur, dass jede Stufe eine Rot-Probe hat — nicht,
dass die ganze Kette am Stück läuft."
**Status heute:** gilt — Beleg `tests/schema-governance-guard.test.js#4) Ganzkette mit vollem
Feldbestand`.

---

## Kontext

Eine Zug-0-Messung (derselbe Tag) widerlegte die Prämisse teilweise: eine Ganzketten-Probe
existierte bereits (`schema-governance-guard.test.js`, Test 3, U2-ADR-075, 11.07.2026 — älter als
die Konzeptnotiz, die sie vermisste) und war grün. Sie bewies „die Kette läuft am Stück" mit einem
konstruierten Schema-19-Depot — aber MINIMAL: drei Sektoren, fünf Sentinel-Werte. Stufen ab 38
(über zwei Drittel der 52-stufigen Kette) berührten keines dieser fünf Felder und liefen im Kontext
dieser Probe unbeobachtet mit — ein echter Ausfall dort wäre nicht aufgefallen.

Das einzige vollständige Test-Fixture des Projekts (`tests/fixtures/referenzdepot.js`, 13 Sektoren,
265 Felder, mit eigenem Frischhaltungs-Wächter) sitzt am FALSCHEN Ende der Kette — es ist am
aktuellen Schema (75) gebaut, für Einzelstufen-Rückweg-Proben wie `kette-02-migrationsstufe-67.test.js`,
nicht für einen Durchlauf ab der ältesten Version.

## Entscheidung

**1 — `tests/fixtures/referenzdepot-schema19.js`**, ein referenzdepot.js-Äquivalent am ÄLTESTEN
belegten Schema (19). 271 Felder in 11 Sektoren (zwei der 13 heutigen Sektoren — `vermoegen`,
komplett; `krisenvorsorge` als eigener Sektor, seine 24 Kernfelder lagen vorher unter `verwaltung`
— existierten bei Schema 19 nicht). Jedes Feld einzeln aus `depotNormalisieren()`
(vivodepot.html:33332-34713) und `tests/fixtures/migrations-stufen.js` rekonstruiert, nicht erfunden
— Herkunft und zwei bewusst offen gelassene Unklarheiten stehen im Kopfkommentar der Datei. Werte
sind grep-bare Sentinels (`V19_<sektor>_<feld>` / `V19ALT_<...>`), keine Persona-Daten wie beim
Schwesterfixture — das passt besser zur eigentlichen Aufgabe (Wiederfindbarkeit jedes einzelnen
Werts) als ein realistisch aussehender Name.

**2 — `scripts/migrationskette-schema19-deckung-messen.js`**: Rot-Beweis ALS Deckungsmessung. Jede
der 52 Stufen wird einzeln stummgeschaltet (ihr Transform-Code textuell entfernt, nur die
Versions-Anhebung bleibt — über `KERN_HTML_PATH`, keine echte Datei wird angefasst), und die
Ausgabe mit dem unmutierten Lauf verglichen. Ergebnis, gemessen: 50 von 52 Stufen ändern die
Ausgabe messbar. Die restlichen zwei (55, 57) ändern nichts Einzelnes — sie bringen die GESAMTE
Migration zum Absturz, weil ein geteilter Helfer (`_zug3TrennenAuswahl57`, definiert in Stufe 57,
ruft `_katalogMigration55`, definiert in Stufe 55) auch von Stufe 58 und 60 aufgerufen wird. Ein
Absturz ist kein schwächerer Befund als ein Wertunterschied — beide würden eine künftige Probe auf
diesem Fixture rot machen. Praktisch: **alle 52 Stufen wirken auf dieses Fixture, gemessen, nicht
angenommen.**

**3 — `tests/schema-governance-guard.test.js`, Test 4** (neu, neben Test 3, nicht in einer zweiten
Wächter-Datei — dieselbe Begründung wie im Kopfkommentar der Datei selbst): migriert das volle
Schema-19-Fixture, prüft (a) Endversion erreicht, (b) JEDER der über 250 Sentinel-Werte überlebt
irgendwo (Verwaisungs-Regel, vollständig statt stichprobenartig), (c) die EINE dokumentierte
Ausnahme der ganzen Kette (Stufe 25, `erlaubterVerlust` in `migrations-stufen.js`: impfungen/
implantate verlieren ihre technischen system/code-Stub-Slots) tritt EXPLIZIT ein, nicht nur durch
Auslassung angenommen, (d) eine Stichprobe der komplexesten Strukturumformungen
(`vorsorge_instrumente`-Faltung, `konten[].bank`-Referenzierung, `krisenvorsorge`-Sektor-Umzug).

**Rot-Beweis, live durchgeführt:** Stufe 25 stummgeschaltet → Test 4 rot (erwartete
AssertionError an der Stub-Slot-Prüfung). Stufe 55 stummgeschaltet → Test 4 rot (erwarteter
ReferenceError, `assert.doesNotThrow` schlägt fehl). Unmutierter Kontroll-Lauf → grün. Beide
Fehlerklassen (Wertunterschied UND Absturz) treffen den Test wie vorgesehen.

## Nebenbefunde, gemeldet und ausdrücklich NICHT behandelt

- **`testament_vorhanden`/`testament_ort`/`testament_datum`** fehlen im Schema-19-Fixture. Zwei
  Kommentare im Kern widersprechen sich (Stufe 39: „die anderen fünf Instrumente [inkl. Testament]
  werden NICHT migriert"; Stufe 52: „testament ist bereits mit Schema 39 migriert... hier
  ausgenommen"). Keiner der 52 `schemaVersion<N`-Blöcke transformiert diese drei Felder tatsächlich
  (grep-geprüft) — ihre Abschaffung lief über U2-ADR-096, außerhalb der nummerierten Kette. Kostet
  keine Stufen-Deckung (keine der 52 Stufen hängt an ihnen), aber die zwei widersprüchlichen
  Kommentare selbst sind nicht bereinigt.
- **Vier ADRs (104, 108, 109, 120) zitieren „U2-ADR-100 §8 (migrationsfreies Fenster)"** — §8 in der
  heutigen ADR-100-Fassung heißt „Feld-Entfernung erfordert einen Registereintrag", der Begriff
  „migrationsfreies Fenster" kommt in ADR-100 selbst nicht mehr vor (vermutlich eine spätere
  Umnummerierung, deren vier Rückverweise nie nachgezogen wurden). Nicht angefasst.

## Konsequenzen

Die Aussage „ein Depot aus 2026 lässt sich 2040 noch öffnen" ist jetzt mit vollem, rekonstruiertem
Feldbestand geprüft, nicht nur mit einer fünfwertigen Stichprobe — und die Deckung dieser Prüfung
selbst ist gemessen (52/52 Stufen wirken auf das Fixture), nicht behauptet. `scripts/migrationskette-
schema19-deckung-messen.js` bleibt als eigenständiges, wiederholbares Werkzeug im Repo stehen (kein
Teil der Standard-Suite/CI — ein Deckungswerkzeug, kein Freigabe-Gate) und lässt sich erneut laufen,
sobald das Fixture wächst.

## Konformität

```konformitaet
aussage:  Ein vollständig befülltes Schema-19-Depot (271 Felder, 11 Sektoren) migriert in einem
          Durchlauf bis zur aktuellen Schema-Version, ohne Fehler, und jeder Bürgerwert überlebt
          irgendwo im Ergebnis — mit genau einer dokumentierten, geprüften Ausnahme (Stufe 25,
          technische Stub-Codes bei impfungen/implantate).
zustand:  geprüft
herkunft: fund
pruefung: tests/schema-governance-guard.test.js#4) Ganzkette mit vollem Feldbestand (KERN) — Schema-19-Referenzdepot (271 Felder) migriert verlustfrei bis zur aktuellen Version
```

Die Deckungsmessung (52/52 Stufen wirken auf das Fixture, 50 über Wertunterschied, 2 über Absturz)
steht bewusst NICHT als eigener `konformitaet`-Block: `scripts/migrationskette-schema19-deckung-
messen.js` ist ein Werkzeug mit Konsolen-Ausgabe, keine automatisierte, `pruefung:`-fähige
Zusicherung — eine `pruefung:`-Zeile ohne echten Pfad#Name-Testverweis wäre selbst die Klasse
Fehler, gegen die dieses Format seit U2-ADR-098 geschützt ist. Das Ergebnis steht oben in Entscheidung
Punkt 2, mit dem vollen Fehlerbild der zwei Absturz-Stufen.

---
*Vivodepot GmbH · Berlin · 03.09.2026*
