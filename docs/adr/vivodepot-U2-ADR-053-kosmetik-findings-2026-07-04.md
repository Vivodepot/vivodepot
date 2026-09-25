# U2-ADR-053 — Kosmetik-Findings aus dem iOS/Desktop-Test (04.07.): Wizard-Schrift, Sidebar-Aktiv-Bug, Raster, Label-Ausrichtung

**Datum:** 04.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 04.07.2026 (Suite/Gates grün; Annahme = Produktentscheidung).
**Status heute:** gilt — `.nav-item.aktiv` und `.feld-zeile--mehrzeilig` sind im heutigen Kern-CSS aktiv (`vivodepot.html`); Finding 7 (Herausgeben-/Einlesen-Chooser) blieb offen, ungeprüft ob inzwischen entschieden.
**Nummer:** U2-ADR-053 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-052).
**Typ:** Kosmetik/CSS-Render (kein Krypto, keine Datenmodell-Änderung).
**Bezug:** iOS/Desktop-Test 04.07. (Findings 6/10/11, 12, 2, 9, 7) · Style-Guide-fs-Skala.

---

## Entscheidung

**Findings 6/10/11 — Wizard-Frage-Titel kleiner.** `.wizard-frage` von `--fs-xl` (1,25rem) auf `--fs-lg` (1,15rem) — ein Schritt die Style-Guide-Skala hinunter; der Titel wirkte zu wuchtig. Serif + Salbei-Farbe bleiben (liest weiter als Frage-Überschrift, nur ruhiger). Der Fließtext in den Wizards liegt bereits auf Kern-Größe: Einleitung `.sektor-intro` = `--fs-sm`, Hilfetext `--fs-xs` — dort war nichts zu senken.

**Finding 12 — Sidebar-Aktiv-Markierung war ein echter Bug.** `.nav-item.aktiv` hatte `background: var(--salbei-dunkel)` — **exakt die `.sidebar`-Fläche** (416). Die Markierung war damit unsichtbar bis auf einen 3px-Rand. Neu: aufgehellter Streifen (`rgba(255,255,255,0.14)` über der dunklen Fläche) + `font-weight: 600` + der Akzent-Rand bleibt. Klar unterscheidbar vom Hover (`--salbei-mid`, grün) und von der Ruhe-Fläche; weißer Text bleibt AA. Der Vollmacht-Modus (`--vm-chrome-tief`, 438) war nie betroffen und bleibt.

**Finding 2 — „Weitere Möglichkeiten" als ruhiges Raster.** Die Aktions-Knöpfe (Wizards, Herausgeben, Einlesen, Exporte) lagen als eigene rechtsbündige `.bereich-aktionen`-Reihen — content-breit, ungleichmäßig, rechts gestapelt. Neu (nur im `.zusatz-aktionen`-Block): `flex-direction: column; align-items: stretch` + `.btn { width: 100%; justify-content: flex-start }` → gleiche Breite, linksbündig, ruhig gestapelt (wie der Chooser-Stil, und wie es auf Mobil ohnehin war).

**Finding 9 — Label oben am mehrzeiligen Feld.** `.feld-zeile` richtet auf `baseline` aus — bei einem hohen Textfeld „schwebt" das Label mittig. Neu: `feldZeileHTML` vergibt bei `typ:'textarea'` die Modifier-Klasse `feld-zeile--mehrzeilig` → `align-items: start` (Label oben, Grundlinie zur ersten Textzeile). Betrifft alle mehrzeiligen Felder (u. a. Finanzen „Vermögenswerte für den Nachlass").

## Finding 7 — nicht gebaut (kein Echtstand-Unterschied gefunden)

**Der Herausgeben-/Einlesen-Chooser ist bereits vereinheitlicht.** `flowHerausgeben`/`flowEinlesen` sind generisch — ALLE Bereiche, auch Gesundheit und Mobilität, teilen denselben `.herausgeben-chooser` (Flex-Spalte) mit denselben `.btn.btn-sek`-Knöpfen (`--fs-sm`, U2-ADR-046 ②). Struktur und Knopf-Größen sind also schon gleich. Der einzige Echtstand-Unterschied: **Mobilität hat kein `exporte`-Array** (`format: GENERISCH`), sein Chooser zeigt darum nur PDF + QR, Gesundheit zusätzlich „Maschinenlesbar — Gesundheitsdaten". Das ist ein **Inhalts-**Unterschied (Mobilität hat kein Selbst-Export-Format), kein Struktur-/Größen-Unterschied. **Kein Bau ohne Klärung**, welcher konkrete Bildschirm gemeint war — sonst würde eine Änderung etwas Nicht-Kaputtes anfassen. Offen zur Klärung.

## Verifikation

- **Neu** `tests/kosmetik-findings.test.js` (4 Tests): Wizard-Frage `--fs-lg` (nicht mehr `--fs-xl`); Aktiv-Markierung ≠ Sidebar-Fläche (Bug-Regression-Guard) + transluzenter Streifen + fett, Sidebar-Fläche bleibt dunkel; Zusatz-Block-Raster (column/stretch, `.btn` 100%); textarea-Zeile trägt `feld-zeile--mehrzeilig` (text-Zeile nicht) + `align-items: start` am Modifier, Basis-Zeile bleibt `baseline`.
- Node-Suite **1137/1137 (0 fail, 0 skipped)**, Konformitäts-Gates **11/11** (WCAG 33 Sichten/0 Violations — die neue Aktiv-Fläche + Layout-Änderungen kontrast-/struktur-konform). **Block-Pin `8d31c678…` unberührt** (Harness 24/0). `vivodepot.html.sha256` nachgezogen. Kein Push.
