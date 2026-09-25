# U2-ADR-041: Bereich „Persönliches" steht immer zuletzt in `SEKTOREN`

**Status:** Akzeptiert
**Datum:** 30.06.2026
**Kategorie:** ARCHITEKTUR, UX, DATENMODELL
**Status heute:** gilt — Beleg `tools/bereichslisten-pruefen.js --positionen`, Wächter
`W-17-bereichs-positionen` mit eigenem Rot-Beleg, für Kern UND Lese-App.

**Berichtigung vom 18.08.2026.** Hier stand bis heute „überholt, nicht ausdrücklich abgelöst".
**Das war die falsche Beschreibung eines richtigen Befunds:** dieses ADR wurde nie abgelöst, es
wurde UNTERLAUFEN. Am 10.08.2026 kam `krisenvorsorge` als zwölfter Bereich ans Ende (U2-ADR-130);
U2-ADR-130 nennt dieses ADR nur als inhaltlichen Präzedenzfall („ein Bereich, der aus ähnlichem
Grund eigenständig wurde") und hebt die Endpositions-Regel ausdrücklich NICHT auf. Sieben Tage
lang galt eine Regel, die nichts mehr durchsetzte — **und der Unterschied zwischen „abgelöst" und
„unterlaufen" ist genau der zwischen einer Entscheidung und einem Versehen.**

Die Produktentscheidung vom 18.08.2026 (Variante B) stellt die Endposition wieder her:
`krisenvorsorge` steht seither VOR `persoenliches`. **Der Entscheidungstext dieses ADR ist
unverändert** — er war nie falsch, er war nur ungeschützt. Seit dem 18.08. hat er einen Wächter.
**Cross-Referenz:** Sektor-Reorder 30.06.2026 (`persoenliches` ↔ `wohnen`). U2-ADR-010 (Feld-Architektur), U2-ADR-012 (Situationsblatt — zieht Felder quer über die Bereiche). Das andere fixierte Ende ist `SEKTOREN[0]` (Identität, Startsektor).

---

## Kontext

Der Bereich **Wohnen & Eigentum** wurde als zuletzt gebauter Sektor ans Ende von `SEKTOREN` angehängt und verdrängte damit **Persönliches** vom letzten Platz. Aufgefallen ist das erst am Website-Wahrheits-Abgleich (Karten-Reihenfolge). Reine Bau-Chronologie („neuer Sektor kommt hinten dran") ist kein bewusster inhaltlicher Schnitt — ohne Regel passiert dasselbe beim nächsten Bereich wieder.

Die Bereichs-Reihenfolge ist an **drei** Stellen sichtbar, alle abgeleitet aus der Array-Reihenfolge von `SEKTOREN`: App-Sidebar, Website-Karten (index/org) und der Gesamt-Export (Gesamt-PDF folgt der Katalog-Reihenfolge, `gesamt-pdf.test.js`).

## Entscheidung

Die Reihenfolge in `SEKTOREN` **endet auf `persoenliches`**. **Neue Bereiche werden davor eingefügt, nie dahinter.** `persoenliches` ist damit — neben `SEKTOREN[0]` (Identität) — ein **fixiertes Ende**; die Positionen dazwischen sind frei.

## Begründung

**Persönliches** (persönliche Wünsche, Haustiere, Abschiedsbriefe, Bestattung) ist der **bewusste inhaltliche Abschluss** der Bereichsliste: von den praktischen/administrativen Bereichen hin zu dem, was von einem Leben bleibt. Auf einen nüchternen Bereich („Wohnen & Eigentum") zu enden, bricht diese Dramaturgie. Der Abschluss auf der persönlichen Note ist gewollt und soll in App, Website und Export gleich sein.

`SEKTOREN[0]` (Identität) ist das gegenüberliegende, ebenfalls gesetzte Ende — der Startsektor, an vier Stellen als Default referenziert (`aktiverSektorId = SEKTOREN[0].id`). Beide Enden sind damit deklarativ festgelegt.

## Konsequenzen

- **Bei jedem neuen Sektor vor dem Bau die Position gegen diese Regel prüfen:** einfügen **vor** `persoenliches`, nie danach. `SEKTOREN[0]` (Identität) bleibt der Start.
- Kein Code hängt an der Position 10/11 (nur `SEKTOREN[0]` ist positionsabhängig; Zugriff sonst über `id`/`SEKTOR_BY_ID`) — die Regel ist eine **Redaktions-/Dramaturgie-Disziplin**, keine technische Invariante. Ein Verstoß bricht nichts, wirkt aber inhaltlich falsch.
- Umgesetzt am 30.06.2026: `persoenliches` und `wohnen` getauscht → neue Reihenfolge … 9 Verwaltung & Behörden, **10 Wohnen & Eigentum, 11 Persönliches** (App `SEKTOREN`, Website index-Karten + org-Aufzählung, DE+EN). Suite grün, Block-Pins unberührt, `vivodepot.html.sha256` nachgezogen.

## Cross-Referenz

Sektor-Reorder 30.06.2026 (`persoenliches` ↔ `wohnen`, `vivodepot.html` + `sektoren-spec.test.js`; Website (internes Repo, ungetrackt hier). U2-ADR-010 (Feld-Architektur), U2-ADR-012 (Situationsblatt). Produktiv: reine Reihenfolge, kein Daten-/Krypto-Eingriff.
