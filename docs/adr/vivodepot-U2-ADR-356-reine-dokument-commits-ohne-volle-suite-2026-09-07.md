# U2-ADR-356: Reine Dokument-Commits laufen ohne die volle Behavior-Suite

**Datum:** 2026-09-07
**Status:** gebaut, Selbsttest grün (vier neue Wächter-Einträge, zwei benannte Rot-Beweise)
**Status heute:** gilt
**Entscheidung:** Produktentscheidung, direkt an diese Sitzung weitergegeben
**Bezug:** U2-ADR-347/349 (die beiden Züge, deren Dokument-Anteil diesen Zug ausgelöst hat)

## Anlass

Wörtlich: „reine Dokument-Commits dürfen ohne volle Suite laufen — wir müssen
Token sparen." Ein Commit, der ausschließlich einen ADR, einen Bericht oder ein README ändert,
kostete bislang dieselbe Behavior-Suite (7548 Prüfungen, ~5 Minuten, mehrere hundert Node-Prozesse)
wie ein Commit, der den Kern selbst ändert — obwohl an keiner Stelle Code lief, den diese Suite
prüft.

## Entscheidung

`tools/reiner-dokument-commit-pruefen.js` klassifiziert den staged Diff. Ist JEDE geänderte
Datei ein Dokument (`docs/**.md`, ohne die drei erzeugten Träger unten), überspringt
`hooks/pre-commit` die teure Behavior-Suite. Ein einziger Nicht-Dokument-Pfad im selben Commit
erzwingt die volle Suite, ohne Ermessen — **im Zweifel läuft mehr, nie weniger.**

**Erzeugte Träger sehen aus wie Dokumente, sind aber Code-gebunden**, darum ausdrücklich
ausgeschlossen: `docs/faktenbasis.md` (aus dem laufenden Kern erzeugt — eine Abweichung dort
ist ein Befund über den Kern, nicht über eine Formulierung), `STANDARDS.md`, jede `*.sha256`-
Datei.

**Auch im Dokument-Fall laufen die billigen ADR-Prüfer** (ausdrückliche Auflage):
`tests/adr-namen-waechter.test.js`, `tests/adr-readme-uebereinstimmung.test.js`,
`tools/adr-konformitaet-pruefen.js`. Nicht ungeprüft — nur nicht die volle Suite.

## Warum ein Werkzeug, keine Absprache

Die Begründung, wörtlich: „Eine Absprache, die jede Sitzung erinnern muss, trägt hier nicht — ein
Werkzeug trägt. Das ist die Hausregel, und heute hat sie sich zweimal bestätigt." Eine reine
Team-Konvention ohne Mechanismus hätte in drei Wochen niemand mehr gekannt — genau das Muster,
das dieses Projekt an anderer Stelle schon mehrfach teuer gelernt hat (handgepflegte Kopien,
Register ohne Nachweis).

## Geprüft — beide verlangten Rot-Beweise

1. **Gemischter Diff.** Eine `.md`-Datei plus eine `.js`-Datei im selben Commit muss die volle
   Suite erzwingen — sonst wäre die Abkürzung ein Loch.
   (`tests/reiner-dokument-commit-pruefen.test.js`, „Rot-Beweis 1")
2. **`docs/faktenbasis.md` allein.** Sieht aus wie ein Dokument, ist aber ein erzeugter
   Träger — muss ebenfalls die volle Suite erzwingen.
   (`tests/reiner-dokument-commit-pruefen.test.js`, „Rot-Beweis 2")

Zusätzlich: ein leerer Diff gilt nicht als Dokument-Commit (eigener Fall, kein Freifahrtschein);
`STANDARDS.md`/`*.sha256` sind ebenfalls ausgeschlossen; ein `.md` außerhalb von `docs/` (z. B.
ein Root-`README.md`) zählt nicht als Dokument-Raum — konservativ, weil `aussagen-abgleich`
gerade solche Dateien gegen den lebenden Code prüft.

## Umsetzung

- `tools/reiner-dokument-commit-pruefen.js` (neu) — die Klassifikation, mit `--dateien=`-Schalter
  für Proben (Standard: der echte staged Diff).
- `hooks/pre-commit` — die Behavior-Suite läuft nur noch im `else`-Zweig; im Dokument-Fall
  laufen die drei billigen ADR-Prüfer direkt.
- `tools/waechter-register.js` — vier neue Einträge: `W-reiner-dokument-commit` (die
  Klassifikation selbst) sowie `W-adr-namen-waechter-im-hook`/
  `W-adr-readme-uebereinstimmung-im-hook`/`W-adr-konformitaet-im-hook` (die drei jetzt
  hook-direkt aufgerufenen Prüfer — ein Aufruf in einem Hook braucht einen Registereintrag,
  auch wenn die Datei bereits ihre eigenen rot⇄grün-Proben trägt; die drei neuen Einträge
  nutzen genau diese eigenen Proben als gekoppelten Nachweis, statt eine zweite, äußere
  Fixture zu bauen).
- `tests/reiner-dokument-commit-pruefen.test.js` — neun Fälle, beide Rot-Beweise.
