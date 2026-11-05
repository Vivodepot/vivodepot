# U2-ADR-174: Bottom-Tab-Navigation mobil — vier Tabs als Schnellzugriff neben dem Hamburger, Desktop bleibt Sidebar

**Status:** Akzeptiert
**Datum:** 25.08.2026

**Hamburger bleibt (Produktentscheidung 25.08.2026, nach Abschluss-Review der Umsetzung):** Die
Sidebar trägt neben den vier Bottom-Tab-Zielen fünf weitere Wege — „Für einen Anlass", „Notfall",
„Meine Dokumente", „Prüftermine" und „Übergabe-Protokoll" (Herausgegeben), neun Einträge statt vier.
Ein Ausblenden des Hamburgers hätte diese fünf Wege auf mobilen Breiten unerreichbar gemacht. Die
Bottom-Tab-Leiste ist darum ein SCHNELLZUGRIFF für die vier häufigsten Aktionen, keine Ablösung des
vollen Sidebar-Zugriffswegs. Beide Wege decken unterschiedliche Zielmengen ab (vier gegen neun) und
sind keine Dopplung.
**Kategorie:** UX, ARCHITEKTUR
**Grundlage:** UX-Designsprache Karten-Baustein vom 25.08.2026 (Arbeitsstand, nicht Teil der Veröffentlichung), Abschnitt
„Teilprojekt 2 — Navigation" (§§85–107). Der Spec verlangt dort ausdrücklich: „Ein ADR wird vor
Beginn der Teilprojekt-2-Umsetzung geschrieben […], nicht vor diesem Spec — dieser Spec selbst
führt noch keinen Code-Pfad ein." Dieses ADR löst diese Vorgabe ein, vor jedem Code dieses
Teilprojekts.
**Drei-Anker:**
- **Code-Stelle (bleibt bestehen — s. oben):** `vivodepot.html`,
  Hamburger-Knopf `#tb-menue` (`renderTopbar()`, ~Zeile 33177–33184, Icon + Klick-Handler
  `toggleMenue`), sichtbar nur unterhalb des Breakpoints `@media (max-width: 760px)`
  (~Zeile 1979, `.tb-menue { display: inline-flex; }` bei ~Zeile 2028). Datengrundlage für den
  Eintragen-Tab: `bereicheNachCluster()` (~Zeile 34253–34262) über
  `BEREICH_CLUSTER_ZUORDNUNG`/`BEREICH_CLUSTER_REIHENFOLGE` (~Zeile 34235–34243), beide aus
  U2-ADR-171.
- **Betroffener gemeinsamer Weg:** `tests/e2e/helpers.js` — unberührt, da der Hamburger bestehen
  bleibt (s. oben). Kein Anpassungsbedarf an der Quelle.
- **Spec-Bezug:** Karten-Baustein-Spec, Teilprojekt 2 (§§85–107) — Bottom-Tab-Struktur,
  Rollout-Reihenfolge, Verhältnis zu U2-ADR-171.
**Status heute:** gilt — Umsetzung folgt in eigenen, nachfolgenden Commits (Rollout-Reihenfolge
laut Spec, s. u.), nicht in diesem ADR-Commit selbst.
**Kein ADR wird abgelöst.** Gezielt nachgesucht (`grep -rniE "bottom.tab|Hamburger|hamburger" docs/adr/*.md`
sowie `grep -rn "Hamburger" docs/adr/README.md`): kein bestehendes ADR entscheidet die
Hamburger-Navigation als bindende Architektur für mobile Breiten — sie ist gewachsener Code
(`renderTopbar()`, `toggleMenue`) ohne eigenes ADR. U2-ADR-171 (Sidebar-Cluster-Gruppierung)
bleibt unberührt — es entscheidet, WIE die zwölf Bereiche in der Sidebar gruppiert erscheinen
(`BEREICH_CLUSTER_ZUORDNUNG`, `bereicheNachCluster()`), nicht, AUF WELCHEM WEG mobil navigiert
wird. Dieses ADR verwendet dieselbe Datengrundlage aus U2-ADR-171 für eine zweite, mobile
Darstellung (Karten-Raster statt Liste) — kein Widerspruch, keine Ablösung, wie bereits im
Karten-Baustein-Spec unter „Verhältnis zu U2-ADR-171" (§§61–71) festgehalten.

---

## Kontext

Vivodepot navigiert heute auf allen Breiten über dieselbe Sidebar: auf Desktop dauerhaft
sichtbar, auf mobilen Breiten (`@media (max-width: 760px)`) als Off-canvas-Drawer, der über
einen Hamburger-Knopf in der Topbar (`#tb-menue`, `toggleMenue`) auf- und zugeschaltet wird. Der
Hamburger ist ein verdeckter Einstieg — die vier Hauptwege der App (Eintragen, Herausgeben,
Einlesen, Verwaltete Depots) liegen hinter einem zusätzlichen Tipp, statt direkt sichtbar zu
sein. Für die Zielgruppe (ältere Menschen, pflegende Angehörige, oft am Handy — s. Kommentar
`vivodepot.html:1987–1990`) ist ein verdeckter Navigationsweg ein höherer Reibungspunkt als bei
einer jüngeren, mobil-erfahrenen Zielgruppe.

Der Karten-Baustein-Spec (Brainstorming-Sitzung 25.08.2026, im Anschluss an U2-ADR-171) hat
diese Frage konzeptionell vorbereitet — Bottom-Tabs als direkter Einstieg, vier Tabs statt
zwölf direkter Bereichs-Links, Karten-Raster im Eintragen-Tab statt Listen-Darstellung. Der Spec
selbst führt noch keinen Code-Pfad ein und verlangt ausdrücklich ein eigenes ADR vor
Umsetzungsbeginn, weil die Bottom-Tab-Struktur ein neuer, verbindlicher Navigations-Standard für
mobile Breiten ist — vergleichbares Gewicht wie U2-ADR-171. Dieses ADR ist dieser Schritt.

## Entscheidung

**Eine mobile Bottom-Tab-Leiste mit vier Tabs** — Eintragen / Herausgeben / Einlesen / Verwaltete
Depots, entsprechend den vier häufigsten Sidebar-Hauptaktionen — steht auf Breiten ≤760px
(derselbe Breakpoint wie das bisherige Hamburger-Menü, `@media (max-width: 760px)`) als
**Schnellzugriff** NEBEN dem Hamburger, nicht an dessen Stelle — die Sidebar trägt fünf weitere
Ziele, die nur über den Hamburger erreichbar sind (s. oben). Vier Tabs, nicht
zwölf: Bottom-Nav-Konvention verträgt 4–5 Ziele, keine zwölf Einzelbereiche direkt als Tabs.

**Der Eintragen-Tab zeigt ein Karten-Raster der fünf Cluster** (aus U2-ADR-171,
`bereicheNachCluster()`) statt der Sidebar-Liste. Gleiche Datengrundlage
(`BEREICH_CLUSTER_ZUORDNUNG`, `BEREICH_CLUSTER_REIHENFOLGE`), zweite Darstellung derselben
Struktur — Karten (`.bereich-karte`-Baustein aus dem Design-Sprache-Teil desselben Spec,
umbenannt aus dem ursprünglich vorgeschlagenen `.karte` wegen Namenskollision mit dem
bestehenden Willkommens-Overlay, `vivodepot.html:388`) statt
kollabierbare `<details>`-Listen. Herausgeben, Einlesen und Verwaltete Depots übernehmen ihre
heutigen Bildschirme unverändert — sie sind keine Kategorien-Listen und brauchen kein
Karten-Raster.

**Desktop bleibt UNVERÄNDERT bei der Sidebar.** Kein Eingriff in `renderSidebar()`, keine
Bottom-Tab-Leiste oberhalb des Breakpoints. Die Sidebar trägt die Cluster-Gruppierung bereits
(U2-ADR-171, kollabierbare `<details>`-Gruppen) — das eigentliche Ziel von U2-ADR-171 (Ordnung
statt einer überwältigenden flachen Liste) ist auf Desktop schon erreicht. Das mobile
Karten-Raster und die Bottom-Tab-Leiste sind eine mobile-spezifische ERGÄNZUNG, keine Ablösung
der Desktop-Sidebar.

**Rollout-Reihenfolge:**
1. Eintragen-Tab / Karten-Raster mobil — additive, neue Darstellung, rührt an keinem bestehenden
   Code-Pfad (Desktop-Sidebar bleibt exakt wie sie ist, Hamburger bleibt bestehen).
2. Herausgeben/Einlesen/Verwaltete Depots hinter die neuen Tabs hängen — bestehende Bildschirme,
   zusätzlicher (nicht ersetzender) Zugriffsweg über die Tabs.

## Verworfene Alternativen

- **Bottom-Tabs zeigen alle zwölf Bereiche direkt, ohne Zwischenschritt über Eintragen.**
  Verworfen: widerspricht der Bottom-Nav-Konvention (4–5 Ziele als Obergrenze für verlässliche
  Erkennbarkeit/Tap-Genauigkeit); zwölf Tabs in einer Leiste wären entweder zu schmal für
  verlässliche Trefferflächen oder müssten selbst wieder scrollen — beides löst das
  Überwältigungs-Problem nicht, das U2-ADR-171 bereits für die Sidebar gelöst hat, sondern
  verlagert es nur in die Bottom-Leiste.
- **Karten-Raster auch auf Desktop einführen, um Mobil und Desktop optisch anzugleichen.**
  Verworfen: der Spec entscheidet ausdrücklich „Desktop bleibt unverändert" (Folgesitzung
  25.08.2026) — die Sidebar erreicht das eigentliche Ziel (Übersichtlichkeit bei wachsender
  Bereichs-/Modul-Zahl) bereits über die Cluster-Gruppierung aus U2-ADR-171. Ein zweiter,
  redundanter Umbau auf Desktop ohne benannten Mehrwert stünde gegen den kleinsten Blast-Radius,
  den die Rollout-Reihenfolge bewusst wählt.
- **Sofortiger, einzelner Umsetzungs-Commit für alle Rollout-Schritte zusammen.** Verworfen:
  vermischt eine additive, risikoarme Änderung (Karten-Raster) mit dem Umhängen dreier weiterer
  Bildschirme in einem einzigen Zug — bei einem Fehlschlag wäre unklar, ob die Ursache in der
  neuen Darstellung oder der neuen Bildschirm-Verdrahtung liegt. Die Reihenfolge trennt diese
  Risiken.
