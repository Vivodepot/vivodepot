# U2-ADR-130: Krisenvorsorge wird ein eigenständiger, zwölfter Bereich

**Status:** Akzeptiert
**Datum:** 10.08.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL
**Grundlage:** interner Auftrag „F6 – Krisenvorsorge" (09.08.2026), Register
Befund F6, Produktentscheidung vom 09.08.: „Das Problem ist, dass es inhaltlich in keinen
der anderen Sektoren passt, und leider immer wichtiger wird. Ich denke, wir sollten es
rauslösen."
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html`, `SEKTOREN` (zwölfter Eintrag `krisenvorsorge`,
  ~Zeile 6280), Migration Schema 49→50→51, `_krisenvorsorgeBedarfHTML`.
- **Sprint-Commits:** F6 Zug 1 (`089b4e0`), Zug 2 (`9217a35`), Zug 3 (`6b25253`).
- **ADR-Bezug:** dieser ADR; verwandt mit U2-ADR-050 (Verwaisungsregel, für den Feld-Umzug
  UND die Datum-Umstellung angewandt), U2-ADR-041 (Präzedenzfall „Persönliches" als
  eigenständiger, zwölfter/elfter Bereich aus ähnlichem Grund).
**Status heute:** gilt — Beleg `tests/migration-stufen.test.js#u2-108-jede-stufe-loest-ihre-zusage-ein`.

---

## Kontext

Krisenvorsorge stand bis 09.08.2026 als dritte Sektion im Sektor „Verwaltung & Behörden" —
hinter „BundID und Vorgänge" und „Geräte und digitale Zugänge". Der Notvorrat lag damit
hinter dem Passwort-Manager, ohne inhaltlichen Zusammenhang zu den übrigen zwei Sektionen.

**Der zwölfte Bereich ist teuer, und das war vorher bekannt, nicht überraschend:** er
berührt die Seitenleiste, die Suche, sechs Export-Mappings, W-10 (Export-Mapping-Lücken),
die Konformitätsprüfung und jede Durchklick-Reise. Der billigere Weg — die Sektion an Ort
und Stelle zu lassen und nur M1 (Gültigkeit) daran anzuschließen — wurde bewusst NICHT
gewählt: der Grund für den Umzug ist inhaltlich (falscher Nachbar), nicht baulich.

## Entscheidung

**Krisenvorsorge wird Sektor Nr. 12** (`id: 'krisenvorsorge'`, `format: GENERISCH`, Icon
`package` — echte Lucide-Pfaddaten, verifiziert gegen `lucide-static`). Drei Züge, je ein
eigener Commit mit grüner voller Suite:

**Zug 1 — der Bereich entsteht leer.** Nur die Hülle: `SEKTOREN`-Eintrag, Icon,
`_BEREICH_SEKTOR`-Map. Sidebar, Suche, Export-Mappings, W-10 und die Konformitätsprüfung
ziehen automatisch mit (dynamische `SEKTOREN`-Iteration, T11-Muster vom 31.07.2026 —
`tools/lib/sektoren.js`). Vier Tests mit hart verdrahteter Sektor-Zahl auf zwölf
nachgezogen.

**Zug 2 — die 24 Felder ziehen um.** Umzug, keine Neuanlage. Schema 49→50: Bestandsdaten
unter `data.sektoren.verwaltung.ks_*` ziehen per Migration nach
`data.sektoren.krisenvorsorge.ks_*` um, der alte Schlüssel wird selektiv geleert (U2-ADR-050
— verschoben, nicht verwaist; andere `verwaltung`-Felder bleiben unberührt, per Migrations-
Probe belegt). Die Sektions-Überschrift heißt „Vorrat, Ausrüstung und Notfallplan", nicht
„Krisenvorsorge" — Präzedenzfall `bildung` (Sektor-Label „Bildung & Beruf" ≠ Sektions-Label
„Ausbildung, Beruf, Einkommen, Zeugnisse"), sonst stünde derselbe Titel zweimal übereinander.

**Zug 3 — BBK-Systematik.** `ks_wasser_haltbar`/`ks_lebensmittel_haltbar` werden
`typ:'datum'` (Schema 50→51) statt Freitext — der Bauteil existierte längst
(`ks_erstehilfe_datum`), nur unbenutzt. Ein nicht-datumsförmiger Alt-Wert („wird alle 6
Monate erneuert") zieht in ein Rettungsfeld (`_frueher`) um, statt zu verschwinden — abgestimmte
Entscheidung (drei Optionen standen zur Wahl: retten, stumm belassen, zurückstellen).
Eine Bedarfsrechnung (2 Liter/Person/Tag, 10 Tage — BBK-Systematik, Quelle gegen eine
Sekundärquelle geprüft, da die BBK-Primärseite hinter einem Cookie-/JS-Gate lag) leitet die
Personenzahl aus „Meine Menschen" ab und ist überschreibbar. Grenze: Vivodepot rechnet die
Empfehlung nur aus, keine eigene Einschätzung darüber hinaus.

## Konsequenzen

- **M1 (Gültigkeit) kann jetzt anschließen**, ohne die Datumsfelder selbst bauen zu müssen
  — sie stehen bereit. Geprüft (10.08.2026): die heutige Prüftermine-Übersicht
  (`prueftermineDokumente`) operiert auf `data.dokumente[]`, nicht auf Sektorfeldern —
  ein gesetztes `ks_wasser_haltbar` taucht dort HEUTE noch nicht auf. Das ist bewusst M1s
  Aufgabe (Reihenfolge II Posten 3: „prüft, ob F6 dem Krisenvorrat sein Haltbarkeitsdatum
  schon gegeben hat"), nicht dieses ADRs.
- **Die Suche findet den Bereich** über den bestehenden Baustein `ausst-krisenvorsorge`
  (Treffer für „Krisenvorsorge", geprüft). Alltagswörter wie „Wasser", „Vorrat",
  „Blackout" finden noch NICHTS — das ist der Anschlussauftrag „Krisenvorsorge
  Sichtbarkeit" (direkt nach diesem ADR eingeordnet), nicht Teil dieser Entscheidung.
- **Zwei befristete Rettungsfelder** (`ks_wasser_haltbar_frueher`,
  `ks_lebensmittel_haltbar_frueher`) tragen keine eigene Lage und stehen in
  `AUSSER_BETRACHT` — sie können entfallen, sobald das begleitende Datumsfeld überall
  befüllt ist (kein festes Datum dafür, offene Beobachtung).
- **Lese-App-Parität** (`vivodepot-lesen.html`) trägt eine eigene, gespiegelte Kopie der
  gesamten Struktur — bei jeder künftigen Änderung an `krisenvorsorge` beide Dateien
  anfassen (kein gemeinsames Modul, T11 hat das nicht behoben, nur `kampagne.js`/
  `axe-lauf.js`).

## Cross-Referenz

U2-ADR-050 (Verwaisungsregel — zweifach angewandt: Feld-Umzug in Zug 2, Datum-Rettungsfeld
in Zug 3), U2-ADR-041 (Präzedenzfall „Persönliches" — ein Bereich, der aus ähnlichem Grund
„passt in keinen anderen Sektor" eigenständig wurde), U2-ADR-108 (Migrationsketten-Wächter —
Stufen 50 und 51 dort geführt).

```konformitaet
aussage:  krisenvorsorge ist ein eigenständiger Sektor (SEKTOR_BY_ID.krisenvorsorge),
          nicht mehr eine Sektion unter verwaltung; Bestandsdaten sind per Migration
          49→50 mitgezogen, nicht dupliziert oder verworfen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/migration-stufen.test.js#u2-108-jede-stufe-loest-ihre-zusage-ein
```
