# U2-ADR-084 — Supersede: „Multi-Entry ist keine Basis-Form" (für Code-Slot-Chips)

**Status:** Gilt (bereinigt 25.09.2026)
**Typ:** Datiertes Supersede einer bestehenden Datenmodell-Regel — **keine Umdeutung, kein stiller
Wechsel**
**Bezug:** Datenmodell-Gesamtkonzept v1.1 (04.07.2026, §2 Feldmodell-Regel), U2-ADR-083
(Chip-Mechanik für Code-Slot-Felder)
**Status heute:** gilt — die Kopfzeile „Entwurf · nicht committet" ist überholt: der Chip-Mechanismus,
für den dieses Supersede gilt, wurde am 13.07.2026 doch committet (`70e9318`) und ist im heutigen Kern
angewendet (`allergien`/`medikamente`/`krankheiten` tragen `codeListe` und sind Chip-Arrays, s.
U2-ADR-083 Status heute).

## Die abgelöste Regel, wörtlich

Datenmodell-Gesamtkonzept v1.1, 04.07.2026, §2 Feldmodell-Regel:

> „Multi-Entry (`liste`) ist keine Basis-Form. Wiederholbare strukturierte Erfassung kommt per
> Template, nicht als vorgebautes Basis-Feld."

Diese Regel galt bislang uneingeschränkt: keine Liste ohne Template-Auslöser in der Basis.

## Warum sie an dieser Stelle nicht mehr trägt

U2-ADR-083 macht `gesundheit.allergien`, `gesundheit.medikamente` und `gesundheit.krankheiten` zu
Chip-Arrays — mehrere Einträge pro Feld, jeder einzeln bestätigt, einzeln entfernbar, einzeln
exportierbar. **Das ist Multi-Entry.** Es in der Basis zu verweigern, hätte nur eine Alternative
gelassen: das Kommasplitten im Generator beizubehalten — und genau das hat nachweislich falsche
Artefakte erzeugt (Befund 13.07.: „Peni" als eigenständiges Medikament, „Allergie gegen Penicillin"
als Codetext einer einzelnen Ressource statt eines Freitexts).

**Die Regel wird nicht umgedeutet** (z. B. „Chips sind eigentlich keine Liste, sondern ein Sonderfall
des Code-Slots") — das wäre eine Wortklauberei mit Folgeschäden: Der nächste Bau, der vor derselben
Frage steht, fände eine Regel vor, die in der Praxis schon einmal umgangen wurde, ohne dass das
irgendwo stünde.

## Entscheidung

**„Multi-Entry ist keine Basis-Form" wird für Code-Slot-Felder mit `feld.codeListe` supersediert,
mit Wirkung ab Schema 38 (13.07.2026).** Die Regel bleibt für alle anderen Basis-Felder in Kraft —
ein neues Basis-Feld ohne `codeListe`, das mehrere Einträge tragen soll, braucht weiterhin ein
Template oder eine eigene Einzelfall-Entscheidung, keine Berufung auf dieses Supersede.

**Warum eng gefasst (nur `codeListe`-Felder, nicht generell aufgehoben):** Der Nutzen ist an dieser
Stelle unmittelbar für die Bürgerin (jeder Eintrag einzeln löschbar, jeder Eintrag einzeln
exportierbar, kein erfundenes Auseinanderreißen im Generator) und die Alternative war nachweislich
schlechter, nicht nur unbequemer. Das ist kein allgemeines Argument gegen die §2-Regel — Multi-Entry
bleibt im Regelfall eine Template-Frage, nicht ein Basis-Reflex.

## Was folgt

- Schema 38: `allergien`/`medikamente`/`krankheiten` sind Chip-Arrays (siehe U2-ADR-083).
- Künftige Code-Slot-Felder (falls neue `codeListe`-Bindungen entstehen) folgen automatisch derselben
  Chip-Mechanik — das Supersede gilt für die Feld-*Klasse* (`codeListe`-tragend), nicht nur für die
  drei heute betroffenen Feld-IDs.
- Jedes andere neue Basis-Feld mit Mehrfach-Bedarf braucht weiterhin eine eigene Entscheidung oder
  ein Template — dieses Supersede ist kein Präzedenzfall dafür.

## Gates

Siehe U2-ADR-083 (derselbe Bau, dieselben Gates: Suite 1389/0, OSV CLEAN, Schema 37→38, sw.js
v60→v61). Kein Push (eine Produktentscheidung).
