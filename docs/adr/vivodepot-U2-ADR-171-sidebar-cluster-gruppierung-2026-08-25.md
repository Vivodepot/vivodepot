# U2-ADR-171: Sidebar-Navigation gruppiert sich in fünf Themen-Cluster, kollabierbar

**Status:** Akzeptiert
**Datum:** 25.08.2026
**Kategorie:** UX, ARCHITEKTUR
**Grundlage:** UX-Designkonzept Gerüst und Bürger-App vom 24.08.2026 (Arbeitsstand, nicht Teil der Veröffentlichung), §7
(dort als offene Frage stehen gelassen: „ob alle zwölf Bereiche einzeln im Register erscheinen
… oder in 3–4 Themen-Gruppen gefasst werden — noch nicht entschieden"). Konkreter Anlass:
Geprüft wurde ein übersetztes Pro-Depot (9d, `feat(Pro-Modul-Andock-Demo)`) — mit einem
angedockten Modul („Association office") stand ein 13. Eintrag in der bis dahin flachen
EINTRAGEN-Liste, Screenshot bewertet als „sehr viele Navigationspunkte, überwältigend, nicht
ruhig". Live entschieden (Morgensitzung, 25.08.2026).
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html`, `renderSidebar()` (~Zeile 34202), EINTRAGEN-Schleife über
  `bereicheAlle()` (~Zeile 34227–34233, vor diesem ADR flach).
- **Betroffener gemeinsamer Weg:** `tests/e2e/helpers.js`, `oeffneSektor(page, sektorId)`
  (~Zeile 116) — einziger Klickweg-Helfer für `[data-sektor="…"]`, ca. 80 Aufrufstellen über
  37 Spec-Dateien. Ein Fix hier statt an jeder Stelle einzeln (T11-Muster).
- **Spec-Bezug:** UX-Konzept §7 (löst die dort offen gelassene Frage auf).
**Status heute:** gilt — Umsetzung folgt in diesem Commit-Zug.
**Kein ADR wird abgelöst.** Gezielt nachgesucht (`grep` über `docs/adr/*.md` nach
„EINTRAGEN"/„Sidebar"/„Seitenleiste"/„Navigation"): keine bestehende ADR entscheidet die
FLACHE Liste als bindende Architektur — der einzige Beleg dafür ist ein Verweis auf ein
externes, nicht mehr im Repo vorhandenes „Struktur-Spec §4" im Code-Kommentar
(`vivodepot.html:4393`, `gruppeEintragen`-STRINGS-Eintrag), kein ADR. U2-ADR-130
(Krisenvorsorge als zwölfter Bereich) bleibt unberührt — es entscheidet, DASS krisenvorsorge
ein eigener Bereich ist, nicht WIE die Liste gruppiert erscheint; krisenvorsorge bleibt
Bereich, wandert nur in den Cluster „Gesundheit & Krisen". Diese ADR füllt eine bisher offen
gelassene Lücke (UX-Konzept §7), sie widerspricht keiner bestehenden Festlegung.

---

## Kontext

Die Sidebar zeigt seit dem Gesamtumbau alle Bereiche (heute zwölf eingebaute + beliebig viele
angedockte Pro-Module über `_BEREICHS_MODUL_REGISTRY`) als flache Liste unter einer einzigen
„EINTRAGEN"-Überschrift. Das war für zwölf Einträge tragbar, wächst aber mit jedem Pro-Modul
weiter — ein White-Label-/Pro-Kunde mit mehreren angedockten Modulen bekäme eine Liste von 15,
20 oder mehr Zeilen ohne jede Struktur. Das UX-Konzept (§7) benannte dieses Risiko bereits am
24.08., ohne es zu entscheiden. Das Pro-Modul-Andock-Demo (9d, parallel entstanden) hat es am
25.08. sichtbar gemacht, nicht erst theoretisch benannt.

## Entscheidung

**Fünf feste Themen-Cluster** fassen die zwölf eingebauten Bereiche:

1. **Ich & Mensch** — Identität & Person, Meine Menschen, Persönliches *(seit Nachtrag 26.08.2026)*
2. **Alltag** — Mobilität & Reise, Wohnen & Eigentum
3. **Geld & Absicherung** — Finanzen & Zahlungen, Sozialversicherung, Vorsorge & Recht
4. **Gesundheit & Krisen** — Gesundheit, Krisenvorsorge
5. **Bildung & Verwaltung** — Bildung & Beruf, Verwaltung & Behörden

**Sechster, automatischer Cluster „Module":** jeder Bereich aus `bereicheAlle()`, dessen `id`
in KEINEM der fünf festen Cluster steht, fällt automatisch hierhinein — kein manuelles
Nachpflegen der Zuordnung bei jedem neuen Pro-Modul, kein Bruch, wenn ein Modul mit
unbekannter `id` andockt. Das ist bewusst gegen eine feste Zuordnungstabelle ohne
Auffangbecken entschieden (Alternative verworfen — s. u.).

**Kollabierbar über `<details>`/`<summary>`** — dieselbe Technik wie die bestehenden
Wizard-Start-Gruppen (`.wizard-gruppe`, UX-Konzept §17/heute), kein neues UI-Vokabular. Der
Cluster, der den aktiven Bereich enthält, startet aufgeklappt (`open`-Attribut); alle anderen
starten zu. „Notfall" und „Was möchten Sie erledigen?" bleiben außerhalb jeder Gruppe — sind
keine Bereiche, sondern Einstiege.

**Migrations-Punkt, vor dem Bau geklärt:** `tests/e2e/helpers.js` `oeffneSektor()` klickt heute
direkt auf `[data-sektor="…"]`. Steckt der Button künftig in einem geschlossenen `<details>`,
ist er nicht sichtbar/klickbar, bevor `<summary>` geöffnet wurde — der Helfer wird angepasst
(öffnet die umschließende `<details>` falls geschlossen, dann klickt er), EINMAL, an der
Quelle. Die ca. 80 Aufrufstellen brauchen keine eigene Anpassung.

## Verworfene Alternativen

- **Alle Cluster immer offen, nur optisch getrennt (Abstand/Überschrift, kein `<details>`).**
  Verworfen: spart keine Höhe, löst das eigentlich benannte Problem („überwältigend") nicht,
  nur die Beschriftung wird feiner.
- **Feste Zuordnungstabelle ohne Auffangbecken für unbekannte IDs.** Verworfen: jedes künftige
  Pro-Modul bräuchte einen Code-Eingriff in die Zuordnung, sonst verschwindet es lautlos aus
  der Navigation (kein Rendering-Pfad) — genau die Art stiller Regression, die dieses Projekt
  durchgehend vermeidet.
- **Aktiver Cluster bleibt geschlossen, bis die Nutzerin ihn selbst öffnet.** Verworfen: der
  aktive Bereich muss sichtbar bleiben, sonst wirkt die eigene Auswahl „verschwunden".

---

## Nachtrag (26.08.2026)

**„Persönliches" zieht von Cluster Alltag zu Cluster Ich & Mensch um.**

Auslöser: Klick-Dummy-Test der Navigation durch die neue Cluster-Sidebar (UX-Abnahmetest,
Feedback-Runde am 26.08.). Das Feedback begründete: „Persönliches" fühlt sich nicht
wie eine Facette der Alltagsorganisation (Mobilität & Reise, Wohnen & Eigentum) an, sondern wie
eine Facette der eigenen Identität — meine Hobbys, Gewohnheiten, persönliche Daten
(Geburtsdatum, Blutgruppe). Das ist näher am Cluster „Ich & Mensch" (Identität & Person,
Meine Menschen).

**Neue Zuordnung ab diesem Nachtrag:**

- **Ich & Mensch:** Identität & Person, Meine Menschen, **Persönliches** (neu)
- **Alltag:** Mobilität & Reise, Wohnen & Eigentum (Persönliches entfernt)

Alle anderen vier Cluster und der sechste automatische Cluster „Module" bleiben unverändert.
Kein ADR wird abgelöst — der ursprüngliche ADR-171-Stand (25.08.2026) gilt nach wie vor für
die Architektur der Clustergruppenbildung; diese Anpassung ist eine UX-Refinement-Produktentscheidung basierend auf Feedback aus der Klick-Dummy-Test-Runde.

---

## Nachtrag (07.09.2026)

**Der sechste, automatische Cluster heißt nicht mehr „Module", sondern „Bereiche" (EN: „Areas").**

Auslöser: die Durchsicht zweier Navigations-Mockups (Hauptdepot-Seitenleiste,
Template-Verzeichnis) fand, dass beide denselben Bezeichner „Weitere Bereiche" für zwei
verschiedene Gegenstände verwenden — ein Kategorienfehler, den ein Verzeichnis-Eintrag als
vierzehnten Bereich ausgeben würde. Entschieden: „Weitere Bereiche" bezeichnet ab
jetzt im ganzen Haus ausschließlich das Template-Verzeichnis. Für den Auffang-Cluster dieses
ADRs löst das die Bedingung: er heißt „Bereiche" — nicht „Weitere Bereiche", sonst entstünde
dieselbe Dopplung neu. Grundsatz dahinter: ein Modul ist konfektioniert und UNSICHTBAR — die
Zusammensetzung ist am Produkt nicht zu sehen. „Module" als sichtbarer
Navigationsbegriff widerspricht dem direkt.

**Geändert:** `STRINGS.gruppeModule.text` (`vivodepot.html`) von „Module" auf „Bereiche"; die
englische Entsprechung (`tools/textsatz-en-vollabdeckung-daten.js`, mitgezogen in
`tools/textsatz-en-modul.json`) von „Modules" auf „Areas" (folgt derselben Terminologie wie
„Show all areas" / `navAlleBereicheZeigen`).

**Unverändert:** die Architektur aus dem ursprünglichen ADR-171-Stand — fünf feste Cluster plus
automatisches Auffangbecken, `BEREICH_CLUSTER_ZUORDNUNG`/`BEREICH_CLUSTER_REIHENFOLGE`, interner
Schlüssel `'module'`. Betroffen ist ausschließlich der sichtbare Titel des sechsten Clusters,
nicht seine Zuordnungslogik.

**Wächter:** `tests/navigationsgruppe-kein-modul-wort.test.js` prüft strukturell — über den
tatsächlich gerenderten Navigations-Markup (`renderSidebar()`, `renderEintragenKartenraster()`,
DE und EN, mit angedocktem Fremd-Bereich, damit der Auffang-Cluster überhaupt einen Eintrag
trägt) —, dass keine Gruppen-Überschrift das Wort „Modul"/„Module" trägt. Rot-Beweis von Hand
geführt: Zeile probeweise auf „Module" zurückgesetzt, Test kippt exakt an der erwarteten Stelle,
danach zurückgestellt.
