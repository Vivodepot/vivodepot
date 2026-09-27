# B16-ADR-047: Nutzerführung in v1.0 — Komplett-Konzept

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 25.04.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** akzeptiert
- **Datum:** 2026-04-25
- **Kategorien:** UX-PRINZIP | ARCHITEKTUR | BARRIEREFREIHEIT
- **Format:** MADR 4.0 mit Vivodepot-Erweiterungen (Kategorien-Header, Nachweis-Abschnitt)

## Kontext und Problemstellung

Der v1.0-Umbau erfordert mehrere zusammenhängende UX-Entscheidungen, die in 1.0.0-beta.16 inkonsistent oder gar nicht gelöst sind: Position der vier Kern-Aktionen (Notiz ablegen, Mein Depot, Tagesvivos, Situationsblätter), Auslastung der heute mit zwölf sichtbaren Elementen plus dreizehn ⋮-Einträgen überfüllten Topbar, Mobile-Verhalten ohne permanent sichtbare Sidebar, Position und visuelle Repräsentation des Lesen-Bearbeiten-Modus aus Architektur v2.1, Organisation des ⋮-Menüs, Struktur der Einstellungen, Platzierung der Wortmarke und Druck-Verhalten für Bürger-Ausdrucke an Behörden, Ärzte und Angehörige.

Wie sollen diese sieben Sub-Entscheidungen organisiert werden — als ein gemeinsamer ADR oder als sieben einzelne, sequenziell beschlossene ADRs?

## Entscheidungstreiber

- **Niedrigschwelligkeit für die Zielgruppe:** Ältere Nutzer, pflegende Angehörige, Menschen in Lebensübergangs-Situationen müssen die App ohne Vorwissen bedienen können. Erstkontakt-relevante Funktionen wie Schriftgrößen-Anpassung und Passwortschutz müssen sofort sichtbar sein.
- **WCAG 2.2 Konformität:** Kriterium 1.4.4 (Resize Text) verlangt Schriftgrößen-Anpassbarkeit auf 200%. Für die anvisierten 30 bis 50 Prozent älterer Nutzer mit Sehbeeinträchtigung muss die Funktion auffindbar sein.
- **Werkzeug-Charakter:** Vivodepot ist ein Werkzeug, keine Plattform. Plattform-Pattern wie Floating Action Buttons werden vermieden.
- **Mobile-First-Konzeption:** Wenn Mobile funktioniert, ist Desktop einfach. Umgekehrt entstehen Mobile-Pannen.
- **Pilotnutzer-Stabilität:** Pilotpartner (Pflegeheim, ein Finanzinstitut, eine Klinik) sollen einmal eine Layout-Konvention lernen, nicht über mehrere v1.x-Versionen hinweg Umstellungen erleben.
- **Druck-Konformität:** Bürger drucken Bereichsinhalte regelmäßig für die analoge Verwaltung aus. Diese Ausdrucke müssen ruhig, lesbar und vertrauensbildend sein, ohne Bildschirm-Hintergrundfarben als Graustufenflächen zu drucken.
- **Architektur-Treue:** Die Modus-Architektur aus Architektur v2.1 Abschnitt 9 muss konzeptuell korrekt umgesetzt werden — zwei gleichberechtigte Modi auf einer Datenbasis, nicht „ein Standard und eine Aktion".

## Geprüfte Optionen

1. **Komplett-Konzept** als ein zusammenhängender ADR, der alle sieben Sub-Entscheidungen gemeinsam festlegt.
2. **Schrittweise Einzel-ADRs**, jeweils ein ADR pro Sub-Entscheidung, sequentiell beschlossen über mehrere Wochen.
3. **Status quo** beibehalten, nur kosmetische Anpassungen ohne strukturelle Neukonzeption.

## Entscheidung

Gewählt: **Komplett-Konzept** (Option 1). Die sieben Sub-Festlegungen folgen.

### Sub-Festlegung 1 — Topbar

Trägt System-Funktionen plus drei direkt sichtbare Barriere-Werkzeuge.

- **Desktop (elf Elemente):** Logo, Status-Badges, Suche, A⁺ (Schriftgröße), Vorlesen, Lupe, Profil, Speichern, Passwort, Sperren, ⋮.
- **Mobile (acht Elemente):** Hamburger, Logo, Suche, A⁺, Vorlesen, Lupe, Passwort, ⋮. Profil, Speichern, Sperren wandern ins ⋮-Menü.
- **Wortmarke ist nicht in der Topbar** — sie wandert in den Footer.

### Sub-Festlegung 2 — Aktions-Bar

Vier Aktionen permanent sichtbar.

- **Desktop:** oben in der Sidebar als Gruppe „Aktionen".
- **Mobile:** in einer Bottom-Bar mit Symbol und Beschriftung (Notiz, Depot, Heute, Sit.).

### Sub-Festlegung 3 — Sidebar / Drawer

Vier Gruppen: **Aktionen · Modus · Bereiche · Weiteres**. Die fünf Bereiche der Architektur v2.1 (Meine Person, Finanzen und Besitz, Gesundheit und Leben, Werkzeuge, Meine Menschen) als Hauptelemente. Institutionen und Einstellungen unter „Weiteres".

### Sub-Festlegung 4 — Lesen-Bearbeiten-Modus

Schiebeschalter mit zwei gleichberechtigten Positionen, in der Sidebar (Desktop) bzw. im Drawer (Mobile) als eigene Gruppe. Der Modus wird zusätzlich auf zwei Ebenen kommuniziert:

- **Hintergrundfarbe des Hauptbereichs:** Lese-Modus `#f7efd8` (gold-getönt), Bearbeitungs-Modus `#eaf2e3` (grün-getönt).
- **Renderform der Felder:** Lesen ohne Eingabe-Rahmen, Bearbeiten mit Rahmen.

Modus-Persistenz über Sitzungen via `data.einstellungen.modus`. Default bei erster Nutzung: Lesen.

**Farb-Begründung.** Gold als Wert-Farbe der Vivodepot-Palette für den Lese-Modus, weil der Bürger dort betrachtet, was er an Wert angesammelt hat. Grün als Erlaubnis-Farbe nach Verkehrsampel-Konvention für den Bearbeitungs-Modus, weil er signalisiert „jetzt darf etwas geändert werden".

### Sub-Festlegung 5 — ⋮-Menü

Trägt Komfort-Werkzeuge: Hoher Kontrast, Nachtmodus, Drucken (später Sprache). Auf Mobile zusätzlich Profil, Speichern, Sperren.

### Sub-Festlegung 6 — Einstellungen

Vier Sektionen: **Daten · Sicherheit · Anwendung · Hilfe**. Aufnahme aller Konfigurations- und Hilfsmittel-Funktionen (Datensicherung, Daten-Import, Profil verwalten, Angehörigen-Ansicht testen, Speicherplatz, Hilfe, Versions- und Lizenz-Information).

### Sub-Festlegung 7 — Footer und Druck

Footer trägt Wortmarke „VIVODEPOT", Versions-Information „v1.0", Lizenz-Hinweis „Open Source EUPL-1.2". Sichtbar im Hauptbereich, erhalten im Druck als Authentizitäts-Anker.

**Druck und Exporte.** Modus-Hintergrundfarben verschwinden im Druck (Print-CSS mit `!important`). Felder werden im Druck immer in Lese-Renderform gerendert, unabhängig vom aktuellen Bildschirm-Modus. Topbar, Sidebar, Bottom-Bar, Modus-Schalter und ⋮-Menü werden im Druck ausgeblendet.

## Konsequenzen

**Positiv.**

- Pilotnutzer erleben einmalig eine große Layout-Umstellung statt mehrerer kleiner Korrekturen über v1.0 bis v1.3.
- Die Topbar wird funktional vollständig (alle erstkontakt-relevanten Werkzeuge direkt sichtbar) und gleichzeitig schlanker als heute.
- Mobile- und Desktop-Layout sind konzeptuell konsistent; nur die räumliche Verteilung unterscheidet sich.
- Die Modus-Architektur aus Architektur v2.1 wird UX-seitig korrekt repräsentiert (zwei gleichberechtigte Zustände, nicht „ein Standard plus eine Aktion").
- Druck-Anforderungen sind explizit ausformuliert und durch Print-CSS mit `!important` gegen versehentliche spätere Änderungen geschützt.
- Erfüllt WCAG 2.2 Kriterium 1.4.4 (Schriftgröße direkt sichtbar). Modus-Hintergrundfarben haben Kontrast über 12:1 mit Forest-Dark-Schrift, also AAA-konform.

**Negativ.**

- Phase 3 des Arbeitsplans wächst von 28–36 h auf 30–38 h wegen zusätzlicher Modus-Hintergrundfarbe-Logik und Topbar-Restrukturierung.
- Pilotnutzer der beta-Versionen müssen die neue Layout-Konvention lernen. Eine Migrations-Karte ist nötig.
- Die Topbar trägt elf Elemente — gerade so vertretbar, aber nicht beliebig erweiterbar. Künftige System-Funktionen müssen in die Einstellungen oder ins ⋮-Menü.

**Neutral.**

- Phase 5 schrumpft entsprechend von 8–12 h auf 6–10 h. Gesamt-Aufwand v1.0-Umbau bleibt 105–145 h.
- Sieben Mini-ADRs während der Implementierung zu Detail-Fragen (siehe Abschnitt „Weiterführend").

## Vor- und Nachteile der Optionen

### Option 1: Komplett-Konzept (gewählt)

- **Gut:** Sub-Entscheidungen sind aufeinander abgestimmt; Inkonsistenzen ausgeschlossen.
- **Gut:** Pilotnutzer erleben einmalig eine Umstellung statt sieben kleine.
- **Gut:** Ein zusammenhängendes Konzept-Dokument als Referenz für die Umsetzung in den Phasen 2.5, 3, 5.
- **Schlecht:** ADR ist umfangreich; einzelne Sub-Entscheidungen sind später schwerer zu revidieren, weil sie in einem Block stehen.
- **Schlecht:** Iterative Verfeinerung nur über Mini-ADRs möglich, die diesen ADR ergänzen aber nicht ersetzen.

### Option 2: Schrittweise Einzel-ADRs

- **Gut:** Jede Sub-Entscheidung ist später isoliert revidierbar.
- **Gut:** Geringerer ADR-Umfang pro Stück, einfacher zu lesen.
- **Schlecht:** Sieben separate Diskussionen über Wochen; Konsistenz schwer zu wahren (Topbar-Auslastung hängt davon ab, was Aktions-Bar entscheidet, was wiederum vom Modus-Konzept abhängt).
- **Schlecht:** Pilotnutzer würden sieben aufeinanderfolgende Layout-Änderungen erleben.
- **Schlecht:** Die Umsetzung würde sieben separate Runden brauchen mit jeweiligem Kontext-Aufbau.

### Option 3: Status quo

- **Gut:** Kein Aufwand für UX-Neukonzeption.
- **Schlecht:** Heutige Topbar (zwölf sichtbare Elemente plus dreizehn im ⋮) bleibt überfüllt.
- **Schlecht:** Mobile-Verhalten bleibt schlecht; Sidebar-Elemente sind im Drawer schwer erreichbar.
- **Schlecht:** Modus-Konzept aus Architektur v2.1 wird nicht UX-seitig umgesetzt; Architektur-Versprechen wird nicht eingelöst.
- **Schlecht:** Erfüllt nicht den Anspruch der Niedrigschwelligkeit für die Zielgruppe.

## Nachweis

> „Es ist aber nicht klar, dass das einander gegensätzliche Prinzipien sind, Komma, wie zum Beispiel, wenn man die Rückspiegel einstellt. Im Auto. Da gibt es nur links oder rechts. So ähnlich stelle ich mir das Prinzip vor, für Lesen oder Schreiben."
>
> — *[Entscheidungsgespräch, 25. April 2026]*

> „Ich bin auch bei Schreiben Grün und lesen Gold mit der Analogie, dass ich Grün als Erlaubnis verstehe und Gold als Wert, der im Depot enthalten ist."
>
> — *[Entscheidungsgespräch, 25. April 2026]*

Die Komplett-Konzept-Diskussion verlief über fünf Iterationsschritte: Aktions-Bar-Position (Variante D Hybrid), Topbar-Auslastung (Differenzierung der Funktions-Klassen), Wortmarke (Wanderung in den Footer), Modus-Konzept (Schiebeschalter mit zwei gleichberechtigten Zuständen), Modus-Farben und Druck-Anforderung (Gold/Grün mit Druck-Bereinigung). Jeder Schritt wurde im Nutzerführungs-Konzept vom 25. April 2026 festgehalten.

## Weiterführend

**Referenz-Dokument.** Das vollständige Nutzerführungs-Konzept v0.2 vom 25. April 2026 enthält visuelle Mockups, CSS-Code-Beispiele, JavaScript-Pseudocode und das Funktions-Inventar. Es wurde im Vorgängerprojekt geführt und ist nicht Teil dieses Bestands.

**Verwandte ADRs.**
- ADR-XXX (Architektur v2.1): Modus-Konzept „eine Datenbasis, zwei Modi"
- ADR-XXX (Sidebar-Neuordnung): Vorgänger-Entscheidung zur Sidebar-Struktur, wird durch dieses ADR überarbeitet

**Folge-Mini-ADRs während der Implementierung** (zu klären in Phasen 2.5, 3, 5):

1. Genauer Hex-Wert der Modus-Hintergrundfarben (`#f7efd8` und `#eaf2e3`) nach WCAG-Kontrast-Test in der Implementierung gegebenenfalls anpassen.
2. Symbol-Auswahl für Bottom-Bar (lizenz-konforme Icon-Bibliothek).
3. Bottom-Bar-Höhe und Abstand zur iOS-Heim-Indikator-Leiste.
4. Drawer-Verhalten bei Tap außerhalb (vorgeschlagener Default: schließt sich).
5. Animation des Modus-Wechsels (vorgeschlagener Default: keine Animation, sofort).

**Pilotnutzer-Migrations-Karte.** Vor dem v1.0-Release als eigenes Dokument mit Vor-Nach-Tabelle aller Layout-Änderungen.

**WCAG-Audit.** Nach Phase 3 Audit auf Modus-Hintergrundfarben-Kontrast, Bottom-Bar-Tastatur-Erreichbarkeit, Schiebeschalter-Screen-Reader-Lesbarkeit. Werkzeuge: axe DevTools, NVDA, manuelle Tastatur-Navigation.

**Implementations-Aufwand.**
- Phase 2.5 (Einstellungen-Restrukturierung): 6–8 h
- Phase 3 (Sidebar + Topbar + Bottom-Bar + Drawer + Schiebeschalter + Modus-Hintergründe + Footer): 30–38 h
- Phase 5 (Render-Logik Felder pro Modus + Modus-Persistenz): 6–10 h
- Gesamt-Aufwand v1.0-Umbau: 105–145 h
