# U2-ADR-175: Statuskarten (`.feldgruppen-karte`) sind das Leitmuster für jede Feldgruppe — vollständige Migration beschlossen

**Status:** Akzeptiert
**Datum:** 27.08.2026
**Kategorie:** UX, ARCHITEKTUR
**Grundlage:** Informationsarchitektur Statuskarten vom 26.08.2026 (Arbeitsstand, nicht Teil der Veröffentlichung; Referenzbereich `person`),
Rollout Teilprojekt 3 vom selben Tag (sechs
weitere Bereiche) — beide kündigten „Als Nächstes: ADR + Umsetzung" an, ohne dass je eine ADR folgte.
Diese ADR schließt die Lücke rückwirkend UND trifft die Anschlussentscheidung: Screenshot-Review
27.08.2026 zeigte zwei Muster nebeneinander auf derselben Hierarchie-Ebene (grüne, immer offene
`.sektion.sektion--eingabe`-Karte vs. weiße Klapp-Karte `.feldgruppen-karte`) und bemängelte zusätzlich,
dass die verbliebene flache Kategorie-Überschrift (`.sektion h2`, fett+Versalien+Sperrung, 14px) trotz
kleinerer Zahl LAUTER wirkt als der Bereichs-Titel (`.bereich-kopf h1/h2`, 16px, normale Schreibung) —
ein Nebenbefund, der die Notwendigkeit einer VOLLSTÄNDIGEN Migration statt eines lokalen Font-Fixes
bestätigt: an der Quelle behoben verschwindet die Kategorie-Überschrift in den migrierten Bereichen
ganz, ein Font-Fix an `.sektion h2` würde nur solange helfen, wie überhaupt noch etwas Flaches übrig
ist.

**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html`, `SEKTION_STATUSKARTEN_CLUSTER` (~Zeile 43000ff.) und
  `renderSektor()`'s Verzweigung (~Zeile 39850ff.): `if (SEKTION_STATUSKARTEN_CLUSTER[sek.id])` →
  Karte, sonst `<div class="sektion sektion--eingabe"><h2>` → flach.
- **Betroffener gemeinsamer Weg:** `tests/e2e/helpers.js` `feldgruppenKartenOeffnen()` — bereits
  generisch für jede künftige Umstellung (öffnet jede geschlossene `.feldgruppen-karte` vor Zugriff,
  kein Aufrufer-seitiger Sonderfall nötig).
- **Spec-Bezug:** löst die in beiden Statuskarten-Spec-Dokumenten offen gelassene „Als Nächstes:
  ADR"-Zusage ein.
**Status heute:** gilt. Elf Sektionen bereits umgestellt (s. Bestand unten), Rest-Migration beginnt
mit diesem Commit-Zug.
**Kein ADR wird abgelöst.** Gezielt nachgesucht (`grep` über `docs/adr/*.md` nach
„Statuskarte"/„feldgruppen-karte"): keine bestehende ADR entscheidet den Bau-Mechanismus selbst, nur
zwei Spec-Dokumente kündigten diese ADR an, ohne sie zu liefern.

---

## Kontext

Der Statuskarten-Mechanismus (`.feldgruppen-karte`: `<details>` mit Titel+Klartext-Status,
kollabiert bis auf Inhalt, dieselbe Karten-Grammatik wie `.situation-block`/`.anfragen-ort`) wurde
am 26.08.2026 gebaut (Referenzbereich `person`) und noch am selben Tag auf sechs weitere Bereiche
ausgerollt: Krisenvorsorge, Bildung, Gesundheit, Verwaltung, Finanzen, Persönliches. Am 27.08.2026
kamen vier Sektionen aus Meine Menschen dazu (Screenshot-Review Befund B). Macht **elf** umgestellte
Sektionen. Der ALTE, flache `.sektion.sektion--eingabe`-Mechanismus (Kategorie-Überschrift als
`<h2>`, Inhalt immer sichtbar, kein Status) blieb daneben bestehen — für alles, was noch nicht
umgestellt wurde.

Ein Code-Audit vom 27.08.2026 (Screenshot-Review, direkt gegen den echten Rendering-Output der
zwölf Bereiche gemessen, nicht per Grep geschätzt) fand: **jeder** der zwölf Bereiche zeigt
mindestens eine `.sektion h2`-Kategorie-Überschrift. Vier Bereiche zeigen AUSSCHLIESSLICH das alte
Muster (keine einzige Statuskarte): Mobilität & Reise, Sozialversicherung, Vorsorge & Recht, Wohnen
& Eigentum. Die übrigen acht tragen Rest-Fragmente neben ihren bereits umgestellten Karten.

## Entscheidung

**Der Statuskarten-Mechanismus wird das VERBINDLICHE Leitmuster für jede Feldgruppe** — eine
Sammlung mehrerer thematisch verwandter Felder innerhalb einer Sektion, die heute unter einer
`.sektion h2`-Überschrift steht. Migration läuft schrittweise, Bereich für Bereich, nach demselben
Muster wie die ersten elf Sektionen: Cluster-Tabelle in `SEKTION_STATUSKARTEN_CLUSTER` ergänzen,
Feld-Vollständigkeit per Test gegen die echte Feld-Definition geprüft (keine Duplikate, keine
Lücken — die generischen `[Datentabelle]`-Proben in `tests/feldgruppen-karten.test.js` decken jede
neue Sektion automatisch mit ab), Werte-Erhalt per `render-charakterisierung`-Fixture-Vergleich
bestätigt.

**Drei stehende Ausnahmen — bleiben FLACH, werden NICHT umgestellt:**

1. **Register/Listen-Ansichten** (Hinzufügen/Bearbeiten/Entfernen mehrerer gleichartiger Einträge,
   kein Feld-Formular mit Vollständigkeits-Status): `menschen-liste` (Personen-Register, bereits
   in Task „Screenshot-Review Befund B" so entschieden), analog jede künftige Register-Sektion.
2. **Querverweis-Blöcke** („Auch in anderen Bereichen hinterlegt" und Geschwister): zeigen Felder,
   die *woanders* gepflegt werden, nur lesend hier gespiegelt — keine eigene Feldgruppe, kein
   eigener Vollständigkeits-Status sinnvoll.
3. **Bereits einzeln entschiedene Sonderfälle mit dokumentiertem Grund:** `bundid-vorgaenge`
   (Screenshot-Review Task B.5 — Kryptowerte/Vorgänge-Sonderlogik, damals bewusst außen vor
   gelassen) und `bestattung-abschied` (Task B.7 — Nachtrags-Charakter, ähnlicher Grund) werden im
   Zuge dieser Migration NEU geprüft, nicht automatisch als Ausnahme übernommen — die damalige
   Begründung war Aufgaben-Scope, nicht notwendig strukturelle Undurchführbarkeit.

**Migrations-Reihenfolge:** die vier komplett-flachen Bereiche zuerst (kleinster Umbau-Aufwand pro
Bereich, größter sofortiger sichtbarer Effekt), danach die Rest-Fragmente in den acht
bereits teil-umgestellten Bereichen.

**Der `.sektion h2`-Font-Befund (Kategorie wirkt lauter als Bereich) wird NICHT separat gefixt** —
er verschwindet automatisch mit jeder abgeschlossenen Migration, da `.feldgruppen-karte-titel`
bereits korrekt `--fs-sm`/Gewicht 600/keine Versalien trägt (kleiner UND leiser als `--bereich-kopf`
h1/h2, `--fs-base`/Gewicht 600). Ein isolierter CSS-Fix an `.sektion h2` würde diese Migration nur
verzögern, ohne einen Endzustand vorwegzunehmen, den die Migration ohnehin herstellt.

## Verworfene Alternativen

- **Nur `.sektion h2` optisch abschwächen (Versalien raus, Gewicht runter), Rest bleibt flach.**
  Verworfen: behebt den gemeldeten visuellen Eindruck, nicht die eigentliche Ursache (zwei
  koexistierende Muster) — der ursprüngliche Befund B monierte genau diese Koexistenz.
- **Migration Bereich für Bereich, aber ohne verbindliche Leitmuster-Festlegung (Einzelfall-
  Entscheidung bei jedem künftigen neuen Bereich).** Verworfen: genau die Art wiederkehrender
  Diagnose-Arbeit, die diese ADR ein für alle Mal beenden soll — jeder künftige Bereich bekommt
  ohne erneute Grundsatzdiskussion die Statuskarte.
- **Alles auf einmal, ein einziger Commit.** Verworfen: Bereich-für-Bereich-Umsetzung (wie beim
  ersten Rollout) erlaubt unabhängige Review-/Rot-Beweis-Zyklen pro Bereich und hält jeden
  einzelnen Commit klein genug für echte Prüfung.

---

## Bestand zum Zeitpunkt dieser ADR (27.08.2026)

**Bereits umgestellt (zwanzig Sektionen):** `person`, `krisenvorsorge`, `ausbildung-beruf`,
`notfall-aerzte`, `geraete-digitale-zugaenge`, `konten-steuern-vorsorge`, `erinnerungen-briefe`,
`kinder-sek`, `unterhalt-sek`, `pflege-sek`, `partnerschaft-sek`, `fahrzeuge-fuehrerschein` (Task 1,
27.08.2026), `renten-pflege-soz`, `schwerbehinderung-pflege`, `arbeitslosigkeit` (Task 2,
27.08.2026), `meine-vorsorge`, `erbe`, `pflegewuensche` (Task 3, 27.08.2026), `wohnen-haupt`,
`wohnen-zweit` (Task 4, 27.08.2026).

**Alle vier komplett-flachen Bereiche sind migriert.** Noch offen — Rest-Fragmente neben bereits
umgestellten Karten: Identität & Person (`fruehere-namen`, `haustiere`), diverse Querverweis-Blöcke
(Ausnahme, s. o.), `bundid-vorgaenge` und `bestattung-abschied` (Neubewertung fällig, s. o.).

**Nebenbefund Task 3 (27.08.2026):** die Migration von `pflegewuensche` zog `hilfsmittel` (das
letzte Modul-Feld mit Wert in einem noch flachen Bereich) in eine Statuskarte — kein Bereich zeigt
seither noch einen befüllten flachen `mehr-Block`. `tests/render-charakterisierung.test.js`s
„Modul-Ebene AUFGEKLAPPT"-Probe prüfte bis dahin genau diese Markup-Form; auf Wert-Vorhandensein
im Rendering umgestellt (containerunabhängig), da die Statuskarte Kern+Modul absichtlich ohne
eigenen mehr-Block mischt (s. Kommentar an `SEKTION_STATUSKARTEN_CLUSTER[sek.id]` in
`renderSektor`) — der `mehr-Block`-Mechanismus selbst baut sich mit dieser Migration ab, nicht nur
seine Belegung in einem Bereich.

**Nebenbefund Task 4 (27.08.2026):** `tests/mehr-block-eingetragen-zuerst.test.js` (A-Dringend,
24.08.2026) hing an `wohnen`/`wohnen-haupt`s Modul-Feldern (`umzug_*`) — bereits der ZWEITE Wirt
nach `person`. Mit `wohnen-haupt` migriert bleibt nur `bundid-vorgaenge` als flache Sektion mit
Modul-Feld übrig, und die trägt nur eines (`umzug_versorger`) — zu wenig für die
Stabilitäts-Probe (braucht zwei+ befüllte Felder). Die Probe hängt die geprüfte Sortier-MECHANIK
seither an eine synthetische, nie geclusterte Test-Sektion statt an ein echtes Feld-Trio — sie
verwaist nicht ein drittes Mal, wenn `bundid-vorgaenge` künftig auch migriert oder gestrichen wird.

**Noch offen — Rest-Fragmente neben bereits umgestellten Karten:** Identität & Person
(`fruehere-namen`, `haustiere`), diverse Querverweis-Blöcke in mehreren Bereichen (Ausnahme,
s. o.), `bundid-vorgaenge` und `bestattung-abschied` (Neubewertung fällig, s. o.).
