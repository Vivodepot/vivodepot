# ADR — Modus-Wechsel-Disziplin

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 24.05.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


**Status:** Akzeptiert
**Datum:** 24. Mai 2026
**Verantwortlich:** Produktverantwortliche
**Beteiligt:** UX-Abstimmung, Synthese-Abstimmung
**Bezug:** Planungsgrundlage zu Klumpen 2, B16-ADR-061v2 (Zwei-Stufen-Cache), B16-ADR-068v2 (Sub-Depot-Architektur), B16-ADR-097 (Notfallkarte), B16-ADR-099 (Stufe-1-Plain-Cache final), Klumpen-2-Akzeptanz-Liste vom 24.05.

---

## Kontext und Problem

Vivodepot hat vier Modi: Anker (eigenes Depot), Depot unter Vollmacht (Sub-Depot der betreuten Person), Angehörige (Vertrauensperson mit Stufe-2-Passwort), Notfall (Stufe-1-Plain-Cache ohne Passwort). Der heutige Code-Stand trägt drei strukturelle Probleme:

— **`_appModus` als globaler Zustand an mehreren Stellen.** Modus-abhängige UI-Entscheidungen werden in verschiedenen Code-Pfaden getroffen, ohne klare Schicht. Konsumenten-Audit nicht vorhanden.

— **`location.reload()` als Modus-Exit-Mechanik.** Modus-Wechsel und Modus-Exit erfolgen über vollständigen Seiten-Reload. Folge: Eingaben gehen verloren, State wird zerstört, Bürgerinnen müssen sich neu orientieren.

— **Drei parallele Notfall-Sichten.** Begrüßungs-Popup beim Standard-Eintritt, Vollbild-Notfall-Sicht, zusätzliches Notfall-Modus-Modal. Drei Code-Pfade für eine Funktion.

Plus eine UX-Lücke: die Modus-Erkennbarkeit für Bürgerinnen ist heute unklar. Es ist nicht in zwei Sekunden sichtbar, ob man im eigenen Depot, im Vollmacht-Depot, im Angehörigen-Modus oder im Notfall-Modus ist.

Die UX-Sitzung vom 24.05. hat die Modus-Disziplin als Klumpen 2 (ein Arbeitsbündel der Umsetzungsplanung) priorisiert. Diese ADR fasst die Entscheidungen zusammen, die die Klumpen-2-Implementation tragen.

---

## Entscheidungs-Treiber

— **Bürger-Niedrigschwelligkeit (P-8).** Marlies, 72, ohne IT-Vorkenntnis muss in zwei Sekunden erkennen, in welchem Modus sie ist.
— **Notfall-Tauglichkeit (P-3).** Sanitäterin sieht die Notfall-Sicht ohne Umwege, ohne Popups, ohne Modus-Verwirrung.
— **Tempo-Souveränität (P-2).** Modus-Wechsel ohne State-Verlust. Eingaben gehen nicht verloren, Bürgerin muss nicht von vorne anfangen.
— **Mission-Continuity (P-4).** Die Modus-Schicht muss von Dritten weiterbaubar sein — ein zentraler Modus-Setter ist verständlicher als verteilte `_appModus`-Setzungen.
— **Daten-Verbleibs-Prinzip (P-10).** Die Verselbstständigen-Implementation in v1.1 muss die Modus-Schicht erweitern können, ohne die bestehende Architektur zu brechen.

---

## Entscheidung

### 1. Vier Modi mit klarer Farb-Semantik

| Modus | Bedeutung | Farbe | CSS-Variable |
|---|---|---|---|
| Anker | Eigenes Depot | Forest (primäre Marken-Farbe) | `--anker-akzent` |
| Depot unter Vollmacht | Sub-Depot der betreuten Person | Schieferblau (#3d5878) | `--sorge-akzent` |
| Angehörige | Vertrauensperson mit Stufe-2-Passwort | Gold-soft | `--angehoerige-akzent` |
| Notfall | Stufe-1-Plain-Cache ohne Passwort | Rot | `--notfall-akzent` |

Vier Farben, vier Rollen, keine Überschneidung. Symbolisch: grün das eigene Leben, blau die Sorge für andere, gold das Vertrauen, das jemand in dich gelegt hat, rot der Ausnahmezustand.

Der konkrete Gold-Ton wird in der Implementation festgelegt — Vorschlag: eine soft-Gold-Variante, die nicht alarmierend wirkt und nicht mit Forest oder Schieferblau kollidiert. Der Wert wird in der UX-Abstimmung in der Klumpen-2a-Implementations-Phase geschärft.

### 2. Zweischichtige Modus-Markierung pro Nicht-Anker-Modus

Jeder Modus außer Anker trägt zwei sichtbare Markierungen:

— **Farbschicht.** Topbar (oder Sidebar) trägt einen Akzent in der Modus-Farbe.
— **Banner-Schicht.** Oben in der Topbar dauerhafter Banner mit klarer Modus-Aussage und einer Exit-Option.

Konkret pro Modus:

| Modus | Topbar-Akzent | Banner | Exit-Option im Banner |
|---|---|---|---|
| Anker | (Standard, keine Markierung) | (keiner) | (n/a) |
| Depot unter Vollmacht | Sidebar-Akzent in Schieferblau | „Sie sehen jetzt das Depot von [Name]." | „Zurück zu meinem Depot →" |
| Angehörige | Topbar in Gold-soft | „Sie sehen die Daten von [Anker-Name] als Vertrauensperson." | „Zur Anmeldung →" |
| Notfall | Topbar in Rot | (Vollbild-Sicht ist eigener Render, kein Banner nötig) | „Schließen"-Button unten |

### 3. Modus-Exit ohne `location.reload()`

Jeder Modus-Wechsel und jeder Modus-Exit erfolgt durch saubere State-Wiederherstellung. Kein vollständiger Seiten-Reload. Konkret:

— **Notfall → Welcome:** Schließen-Button führt zurück zur Stufe-1-Welcome-Seite. App-State bleibt erhalten.
— **Angehörige (Auswahl) → Welcome:** Schließen-Button in Topbar, Modus-Exit.
— **Angehörige (Situation) → Welcome:** „Zur Anmeldung"-Option in Topbar oder am oberen Rand, kompletter Modus-Exit.
— **Angehörige (Situation) → Angehörigen-Auswahl:** „Andere Situation wählen ←" als sekundärer Button unten, kein Modus-Exit.
— **Depot unter Vollmacht → Anker:** Banner-Link „Zurück zu meinem Depot", Modus-Wechsel ohne Reload.

### 4. Eine Notfall-Sicht, nicht drei

Die Notfall-Vollbild-Sicht ist die einzige Notfall-Sicht im Code:

— Kein Begrüßungs-Popup beim Standard-Eintritt (Passwort-Eingabe und Erfolg). Die Akut-Daten sind über die Sidebar im Gesundheits-Bereich erreichbar, drängen sich aber nicht auf.
— Kein zweites „Notfall-Modus aktivieren"-Modal.
— Eine Sicht, eine Funktion: die Vollbild-Sicht mit den sieben Allowlist-Feldern aus B16-ADR-099.

### 5. Modus-Zustand zentral verwaltet

`_appModus` als verteilter globaler Zustand wird durch eine klare Schicht-Trennung ersetzt. Konkret: ein zentraler Setter `setzeModus(neuerModus, kontext)`, der alle abhängigen UI-Elemente atomar umschaltet:

— Farbschicht (Topbar/Sidebar-Akzent)
— Banner-Schicht (Inhalt, Exit-Option)
— Render-Pfad (welche Sichten aktiv sind)
— Daten-Zugriff (welches Depot aktuell offen ist)

Alle Lese-Stellen für den Modus-Zustand greifen über einen Getter `aktuellerModus()`, nicht direkt auf eine globale Variable. Damit ist ein Konsumenten-Audit jederzeit durch Suche nach `aktuellerModus()` möglich.

Wenn die Klumpen-2a-Implementation zeigt, dass die heutige Verflechtung diesen sauberen Setter/Getter-Pfad nicht erlaubt, ist die Diagnose-Punkt-Bedingung der Planungsgrundlage erfüllt (zwei oder mehr Patterns getroffen) — dann wird die Lage neu bewertet.

---

## Konsequenzen

**Positiv.**

— Vier visuell distinkte Modi sind in zwei Sekunden erkennbar.
— Modus-Wechsel ist sauber rückgängig zu machen, kein State-Verlust.
— Notfall-Sicht ist konsolidiert, keine drei parallelen Code-Pfade mehr.
— Konsumenten-Audit der Modus-Schicht ist möglich.
— B16-ADR-097 (Notfallkarte) und B16-ADR-061v2 (Zwei-Stufen-Cache) sind farb-semantisch konsistent.
— Verselbstständigen-Implementation in v1.1 hat eine saubere Modus-Schicht zum Andocken.

**Negativ.**

— Refactor der `_appModus`-Architektur ist Aufwand und Risiko (siehe Diagnose-Punkt 7.3.1).
— CSS-Variable `--angehoerige-akzent` ist neu, muss in die globale Farb-Palette aufgenommen werden.
— Existierende Tests, die auf `_appModus` direkt zugreifen, müssen auf `aktuellerModus()` umgestellt werden.

---

## Verwerfung der Alternativen

— **Kein eigener Farbton für Angehörige, nur Banner.** Minimalistisch, aber Banner kann übersehen werden — vor allem von älteren Nutzerinnen mit Augen-Belastung. Die Modus-Erkennbarkeit in zwei Sekunden ist nicht garantiert.

— **Violett oder Lila für Angehörige.** Stärker abgegrenzt, aber neue Farbe ohne Anschluss an die bestehende Farb-Familie. Gold-soft trägt die „Echtheit"- und „Vertrauen"-Konnotation, die zur Vertrauensperson-Rolle passt.

— **`location.reload()` belassen, weil pragmatisch.** Bricht die State-Wiederherstellung, frustriert Bürgerinnen, die im Standard-Modus weiterarbeiten wollten. Verletzt P-2 (Tempo-Souveränität).

— **Mehrere Notfall-Sichten beibehalten.** Code-Schuld, UX-inkonsistent. Drei Code-Pfade für eine Funktion sind eine F-11-Drift-Quelle.

— **`_appModus` als verteilter globaler Zustand belassen.** Konsumenten-Audit nicht möglich, Mission-Continuity (P-4) verletzt. Verselbstständigen-Implementation in v1.1 wird schwerer.

---

## Validierung und Prüf-Trigger

**Validierung in Klumpen 2a.** Die Klumpen-2-Akzeptanz-Liste (24.05., korrigierte 25-Punkte-Version) trägt die Validierung der hier festgelegten Modus-Disziplin. Die 25 Punkte werden nach dem Umsetzungslauf gegen die laufende App abgenommen.

**Prüf-Trigger zur Neu-Bewertung dieser ADR.**

— Wenn ein fünfter Modus dazukommt (z.B. Operator-Modus für White-Label-Konfiguration in v1.1).
— Wenn die Verselbstständigen-Implementation in v1.1 die Modus-Schicht ändern muss.
— Wenn ein Beta-Tester die Farb-Zuordnung als unklar oder verwirrend meldet.
— Wenn die Diagnose-Punkt-Bedingung der Planungsgrundlage in Klumpen 2a erfüllt wird und Option 3 (UI-Neustart) gewählt wird — dann wird diese ADR ggf. überarbeitet, aber die Modus-Farben und die Notfall-Sicht-Konsolidierung tragen ohne Änderung weiter.

---

*Vivodepot v1.0 · ADR Modus-Wechsel-Disziplin · 24. Mai 2026 · Akzeptiert · Trägt Klumpen 2a, B16-ADR-097, B16-ADR-099, B16-ADR-061v2, B16-ADR-068v2 zusammen in eine Modus-Architektur.*
