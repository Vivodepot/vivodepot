# B16-ADR-054: Sauberer Schnitt bei Schema-Migrationen

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 26.04.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** akzeptiert
- **Datum:** 2026-04-26
- **Konsultiert:** technische Umsetzung (Plan-Vorschlag mit defensiver Variante)
- **Kategorien:** VERSIONIERUNG | STRATEGIE
- **Format:** MADR 4.0 mit Vivodepot-Erweiterungen (Kategorien-Header, Nachweis-Abschnitt)

## Kontext und Problemstellung

Im Vivodepot-Bestand existieren bis Beta 17 drei verschiedene Schema-Versions-Felder nebeneinander, die über mehrere Migrations-Iterationen entstanden sind: `data.__schemaVersion` als String (gesetzt von `migrateToSchemaV1()`, Zeile 14181 ff.), `data.migrationVersion` als Zahl (für die AP-2-Sidebar-Migration in Task 2.4), und mit dem Sprung auf Schema 2 nun zusätzlich `schemaVersion` als Zahl im neuen Wurzel-Container.

In der Umsetzungsplanung vom 26. April 2026 wurde die Frage aufgeworfen, wie mit den beiden alten Feldern bei der Migration auf Schema 2 zu verfahren ist. Vorgeschlagen waren zwei Strategien: defensiv stehen lassen (alte Felder bleiben für Rückwärts-Lese-Kompatibilität erhalten, falls ein Beta-Pilotnutzer versehentlich eine alte App-Version öffnet), oder aktiv entfernen (sauberer Schnitt, nur das neue Feld bleibt nach Migration).

Die Frage hat über die unmittelbare Sorge-Struktur-Migration hinaus methodischen Charakter: Sie ist Vorbild für alle künftigen Schema-Migrationen in v1.x, v2 und darüber hinaus. Eine einmal etablierte Praxis (defensiv oder sauber) wird sich tendenziell fortpflanzen und mit der Zeit entweder zu kumulativer technischer Schuld oder zu einem klaren, wartbaren Migrations-Pattern führen. Soll die Schema-Migrations-Praxis defensiv (mit Rückwärtskompatibilität) oder sauber (mit aktivem Entfernen alter Felder) erfolgen?

## Entscheidungstreiber

- **Vorbild-Charakter:** Die hier etablierte Praxis pflanzt sich auf alle künftigen Schema-Sprünge (Schema 2→3, 3→4 und weiter) fort — einmalige Festlegung mit langfristiger Wirkung.
- **Kleine, direkt erreichbare Beta-Pilotgruppe:** Die wenigen Pilotnutzer der Beta rechtfertigen kein automatisches Rückwärtskompatibilitäts-Sicherheitsnetz; direkte Kommunikation vor Schema-Sprüngen ist möglich.
- **Eine Schema-Versions-Wahrheit:** Verteilte Versions-Marker führen bei Inkonsistenzen zu schwer auffindbaren Bugs.
- **Single-File-HTML-Prinzip:** Keine zweite Datei für ein Schema-Manifest, das dem Architektur-Grundsatz widerspräche.
- **Professioneller Anspruch gegenüber Pilotpartnern:** Pflegeheime, Finanzinstitute und Kliniken erwarten transparente, vorhersehbare Migrations-Pfade statt kumulativer technischer Schuld.

## Geprüfte Optionen

1. **Sauberer Schnitt** — obsolet gewordene Felder werden bei jeder Schema-Migration aktiv entfernt.
2. **Defensive Rückwärtskompatibilität** — alte Felder bleiben neben dem neuen Feld stehen.
3. **Hybrid-Strategie mit Deprecation-Markierung** — alte Felder bleiben mit dem Vermerk „deprecated, wird in Schema X+1 entfernt" stehen.
4. **Externe Schema-Versionierung mit separater Datei** — ein Schema-Manifest in einer zweiten Datei trägt die Versions-Information.
5. **Beibehaltung der drei Felder ohne Migration** — `__schemaVersion`, `migrationVersion` und `schemaVersion` existieren dauerhaft gemeinsam, die Lese-Logik prüft alle drei in festgelegter Reihenfolge.

## Entscheidung

Gewählt: **Sauberer Schnitt** (Option 1). Bei jeder Schema-Migration werden Felder, die durch das neue Schema obsolet werden, aktiv aus der gespeicherten Datenstruktur entfernt.

Konkret für den aktuellen Sprung Schema 1 nach Schema 2: `__schemaVersion` und `migrationVersion` werden im Rahmen der Lazy-Migration in Task 5.8 aus dem Wurzel-Container entfernt, sobald die Migration erfolgreich durchgelaufen ist und das Vivodepot mit `schemaVersion: 2` neu serialisiert wird. Verbindlich bleibt allein das neue Feld `schemaVersion` (Zahl, ohne Unterstrich-Prefix) als Wurzel-Eigenschaft.

Diese Strategie wird zum Standard für alle künftigen Schema-Migrationen erhoben. Der Übergang Schema 2 nach Schema 3, Schema 3 nach Schema 4 und so weiter verläuft nach demselben Muster: Das alte Schema-Feld wird konsumiert, das neue Schema-Feld wird gesetzt, alle obsolet gewordenen Felder verschwinden im selben Atemzug aus der Datenstruktur. Eine Schema-Migration ist ein einmaliger Re-Encryption-Schritt, der die Daten in den Zielzustand überführt — nicht ein Übergang, in dem alte und neue Strukturen koexistieren.

Beta-Pilotnutzer werden vor einem v1.0-Release explizit darauf hingewiesen, dass das Öffnen einer Beta-Version-Vivodepots mit der v1.0-App eine einmalige Migration auslöst, nach der die Datei nicht mehr mit Beta-Versionen lesbar ist. Wer aus irgendeinem Grund parallel weiter mit einer Beta-Version arbeiten will, soll das vor der Migration entscheiden und gegebenenfalls eine Kopie der Beta-Datei separat aufbewahren.

## Konsequenzen

**Positiv.**

- Code-Sauberkeit bleibt über Schema-Sprünge hinweg gewahrt. Der Vivodepot-Code trägt zu jedem Zeitpunkt nur eine Schema-Versions-Wahrheit, nicht eine Sammlung historischer Marker. Lese-Logik, Validierung und Tests werden einfacher.
- Vorbild-Charakter für künftige Schema-Migrationen: Schema 2 nach Schema 3 in v1.x, Schema 3 nach Schema 4 in v2 und so weiter folgen demselben Muster.
- Strategischer Aspekt für Pilotpartner: Pflegeheime, Finanzinstitute und Kliniken erwarten transparente, vorhersehbare Migrations-Pfade. Eine Datei-Format-Architektur ohne kumulative technische Schuld signalisiert Disziplin.

**Negativ.**

- Beta-Pilotnutzer müssen vor jedem v1.x-, v2-, v3-Release explizit informiert werden, falls ihre Datei vom Schema-Sprung betroffen ist.
- Risiko: Öffnet ein Beta-Pilotnutzer aus Versehen mit einer alten App-Version eine mit Schema 2 migrierte Datei, ist diese Datei mit der alten Version nicht mehr lesbar.

**Neutral.**

- Der Kommunikations-Aufwand bleibt überschaubar, solange die Pilotgruppe klein ist. Wächst die Pilotgruppe — etwa durch White-Label-Editionen mit Pflegeheimen oder Finanzinstituten — wird die Kommunikations-Aufgabe größer; das ist kein Argument gegen den sauberen Schnitt, sondern ein Hinweis, Schema-Sprünge in der Pilot-Phase mit Bedacht zu planen und idealerweise mit Release-Zyklen zusammenfallen zu lassen.
- Mitigation für das Lesbarkeits-Risiko: Die alte App-Version reagiert bei einer Schema-2-Datei mit einer klaren Fehlermeldung statt einer zerstörenden Schreib-Aktion — sie erkennt das unbekannte Schema und verweigert konstruktiv. Diese Fehlermeldung wird in v1.0 als Test-Fall geprüft (Cross-Version-Read-Test).
- Eine Schema-Migrations-Routine entsteht, die im Repository dokumentiert wird (im Self-Assessment-Bereich oder in einem methodischen Anhang zu künftigen ADRs).

## Vor- und Nachteile der Optionen

### Option 1: Sauberer Schnitt (gewählt)
- **Gut:** Eine Schema-Versions-Wahrheit statt verteilter, potenziell inkonsistenter Marker; einfachere Lese-Logik, Validierung und Tests.
- **Gut:** Etabliert ein wiederholbares, dokumentierbares Migrations-Muster für alle künftigen Schema-Sprünge.
- **Schlecht:** Beta-Pilotnutzer müssen vor jedem Schema-Sprung informiert werden; eine alte App-Version kann eine migrierte Datei nicht mehr lesen.

### Option 2: Defensive Rückwärtskompatibilität
- **Gut:** Eine ältere App-Version kann die Datei nach der Migration weiterhin lesen, falls ein Beta-Pilotnutzer versehentlich eine alte Version öffnet.
- **Schlecht:** Eine kleine Beta-Pilotgruppe rechtfertigt keine technische Schuld in der Schema-Migrations-Architektur; kumulativ stünden bei Schema 5 oder 6 fünf Schema-Versions-Felder nebeneinander, was die Code-Wartung über Jahre belastet, ohne einem realen Anwendungsfall zu dienen.

### Option 3: Hybrid-Strategie mit Deprecation-Markierung
- **Gut:** Kennzeichnet den Übergang alter Felder explizit, statt sie kommentarlos zu entfernen oder unbegrenzt zu belassen (im Quelltext nicht als eigenständiger Vorteil ausgewiesen, sondern aus der Options-Beschreibung abgeleitet).
- **Schlecht:** Zusätzliche Komplexität ohne Mehrwert — entweder werden Felder gebraucht (dann bleiben sie aktiv) oder nicht (dann verschwinden sie). Die Zwischenstufe „bleibt da, aber bitte ignorieren" lädt zu Verwechslungen ein und verschiebt das eigentliche Aufräumen in eine spätere Iteration, die oft nicht stattfindet.

### Option 4: Externe Schema-Versionierung mit separater Datei
- **Gut:** Trennt Versions-Metadaten strukturell von den Nutzdaten (im Quelltext nicht als eigenständiger Vorteil ausgewiesen, sondern aus der Options-Beschreibung abgeleitet).
- **Schlecht:** Bruch des Single-File-HTML-Prinzips. Vivodepot ist genau eine Datei, die sich auf einem Stick mitnehmen lässt — eine zweite Datei nebenbei wäre architektonische Inkonsistenz.

### Option 5: Beibehaltung der drei Felder ohne Migration
- **Gut:** Kein Migrations-Aufwand, da alle drei Felder unverändert nebeneinander stehen bleiben (im Quelltext nicht als eigenständiger Vorteil ausgewiesen, sondern aus der Options-Beschreibung abgeleitet).
- **Schlecht:** Verteilt die Schema-Versions-Wahrheit auf drei Quellen, was bei Inkonsistenzen (etwa ein Update, das nur eines der drei Felder aktualisiert) zu schwer findbaren Bugs führt.

## Nachweis

> „ich will es jetzt richtig machen und keine Rudimente …"
>
> — *[Entscheidungsgespräch, 26. April 2026, Antwort auf die Frage zur Schema-Versions-Konsolidierung]*

Die Entscheidung wurde am 26. April 2026 getroffen, nachdem die Frage in der Umsetzungsplanung ausdrücklich gestellt worden war; sie wurde als ADR-würdig eingestuft und hier festgehalten.

## Weiterführend

- **Verwandte ADRs:** B16-ADR-052 (Sorge-Struktur, übergeordnetes Konzept).
- **Erste Anwendung:** die Migration auf Schema 2.
- **Testkriterium:** Cross-Version-Read-Test in v1.0 — prüft, dass eine alte App-Version bei einer Schema-2-Datei konstruktiv mit Fehlermeldung reagiert statt destruktiv zu schreiben.
