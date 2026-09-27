# U2-ADR-046 — Rein/Raus-UX: zentrale Sidebar-Türen (Durchstich Gesundheit) + Format-Tag-Korrekturen

**Datum:** 04.07.2026 (Bau 03.07.2026; ADR nachgezogen — daher höhere Nummer als die zeitgleich dokumentierte U2-ADR-045).
**Status:** Abgelöst durch U2-ADR-056 und U2-ADR-057 (bereinigt 25.09.2026)
**Nummer:** U2-ADR-046 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-045).
**Typ:** UX-/Navigations-Entscheidung (Rein/Raus-Sichtbarkeit) + Format-Tag-Korrektur.
**Bezug:** Konzept „Daten rein und raus" (03.07.) · U2-ADR-013 (Mappe / dritte Achse) · U2-ADR-034 (Angehörigen-Modus read-only) · U2-ADR-041 (Bereich-Reihenfolge, Wohnen=10/Persönliches=11) · U2-ADR-045 (autoritative Original-Ablage, die Import-Seite von „Rein"). SEKTOR_FORMATE-Tags (`format:` je Bereich).
**Status heute:** abgelöst durch U2-ADR-056 (Einlesen bereich-neutral) und U2-ADR-057
(Herausgeben bereich-neutral), beide vom Folgetag 05.07.2026. Der heutige Code bestätigt das:
die Sidebar-Türen sind nicht mehr `data-*-zentral="gesundheit"` verdrahtet, sondern
bereich-neutral (`data-weitergeben-zentral="1"` → `flowHerausgebenZentral()`,
`data-einlesen-zentral="1"` → `flowEinlesenZentral()`, beide Handler kommentiert mit U2-ADR-057
bzw. U2-ADR-056). Der hier beschriebene Ein-Bereich-Durchstich ist damit erledigt und überholt,
nicht mehr der aktuelle Stand.

---

## Kontext

Export- und Import-Maschinerie **existieren bereits** (per-Bereich „Herausgeben" → `flowHerausgeben`; „Daten einlesen" → `flowEinlesen`, mit Auto-Erkennung und Bürger-Wörtern). Die Inventuren 03.07. zeigten: es fehlte **keine Engine**, sondern eine **Sichtbarkeits-Ebene** — der Bürger fand „rein/raus" nicht, weil es nur tief in den Bereichen lag. Zusätzlich trugen zwei Bereiche einen `format:`-Tag, der ein **Selbst-Export-Standard** behauptete, den es nicht gibt (Mobilität `ISO_18013` = mDL, Vorsorge `W3C_VC`) — vgl. [[backlog-mdl-import-mobilitaet]] (mDL ist Import, nicht Selbst-Export).

## Entscheidung

**Teil B — Durchstich Gesundheit (Sichtbarkeits-Ebene):** zwei zentrale Nav-Türen in der Sidebar — „Daten weitergeben" (`navWeitergeben` → `flowHerausgeben`) und „Daten einlesen" (`einlesenKnopf` → `flowEinlesen`) — auf **Nav-Rang** (nach der Finden-Gruppe: Reihenfolge rein → nachschauen → raus), **nur in bearbeitbaren Modi** (`Modus.darfBearbeiten()`; im Angehörigen-Modus ausgeblendet). Verdrahtet **nur für den Bereich Gesundheit** (`data-*-zentral="gesundheit"`) — ein Durchstich, um am Gerät zu urteilen, BEVOR auf alle elf Bereiche ausgebaut wird. Die Türen leiten in die **vorhandenen** Chooser, kein neuer Export/Import-Weg.

**Teil A — Format-Tag-Korrekturen (Wahrheit über Reichweite):** `mobilitaet` `ISO_18013 → GENERISCH`, `vorsorge` `W3C_VC → GENERISCH`. Nur der deklarative `format:`-Tag ändert sich; die `exporte:`-Arrays bleiben unberührt (Vorsorges `ics-vorsorge`-Export bleibt). Ein selbst-ausgestellter mDL ist kein mDL; ein Vorsorge-„Credential" hat keinen Empfänger — GENERISCH ist ehrlich.

## Begründung

- **Rang, nicht Dauer-Präsenz.** „Immer sichtbar" meint den Nav-Rang im Drawer (konsistent mit Eintragen/Finden), nicht eine Dauereinblendung. Ob der Drawer die Türen zu sehr versteckt, wird am iPhone beurteilt — nicht vorab.
- **Read-only-Konsistenz.** Türen, die schreibende Flüsse öffnen, dürfen im read-only-Angehörigen-Modus nicht erscheinen — dieselbe Invariante wie beim Bearbeiten (`darfBearbeiten()`).
- **Durchstich vor Ausbau.** Ein Bereich verdrahtet, am Gerät geprüft, dann ADR + elf — statt elf blind zu bauen.
- **Tags müssen dem Können entsprechen.** Ein `format:`-Tag ist eine Fähigkeits-Aussage; `ISO_18013`/`W3C_VC` behaupteten Nicht-Vorhandenes.

## Konsequenzen

- Positiv: Rein/Raus wird auffindbar, ohne neue Engine; die Tag-Korrekturen schließen zwei Versprechen↔Realität-Lücken.
- Offen/Kosten: nur Gesundheit verdrahtet; der Ausbau auf elf braucht die Chooser-Abdeckung je Bereich.

## Aufräumen (Geräte-Blick 04.07. — GEBAUT 04.07., Produktentscheidung: Wortlaut A)

1. **Wortlaut → „herausgeben" (A):** die Tür heißt jetzt „Daten **herausgeben**" — symmetrisch zu „Daten einlesen" (**ein↔heraus**; die Einlese-Tür ist auf „einlesen" fix, „weitergeben" bräche die Symmetrie, außer man baut beide Türen um). Interner Key/`data`-Attribut bleiben „weitergeben" (Rolle: nach-außen-geben).
2. **Chooser-Knöpfe:** Schrift auf `--fs-sm` runter; Label entdoppelt — Kurz-Label „Gesundheitsdaten", Chooser zeigt „Maschinenlesbar — Gesundheitsdaten" (statt „… als maschinenlesbare Datei").
3. **„Laborbericht" gezogen:** der `fhir-lab`-Eintrag (self-erzeugter, nicht eu-lab-konformer Labor-Export) ist aus Gesundheits `exporte` entfernt — Generator + Format-Registry bleiben dormant; der konforme Weg ist der autoritative Import (U2-ADR-045/047).

**Weiter offen:** Ausbau des Durchstichs auf alle elf Bereiche (nach dem RC-Aufräumen).

## Verifikation

- `tests/rein-raus-durchstich.test.js` (3 Tests): Türen rendern + auf Gesundheit verdrahtet + Labels; Nav-Rang nach Finden/Prüftermine; nur bearbeitbare Modi (im Angehörigen-Modus ausgeblendet).
- `tests/sektoren-spec.test.js`: Tag-Pins `mobilitaet`/`vorsorge` → `GENERISCH`; **②③-Pin:** Gesundheit-Chooser nur `fhir-ips` mit Kurz-Label „Gesundheitsdaten", `fhir-lab` gezogen. `rein-raus-durchstich.test.js`: Tür-Label jetzt „Daten herausgeben" (①). Suite 1120/0/1, WCAG 33/0, sha256 nachgezogen.
- Block-Pin `8d31c678…` unverändert (Edits außerhalb des Krypto-Blocks). Gemeinsam mit U2-ADR-045 committet (geteiltes `vivodepot.html`), kein Push.
