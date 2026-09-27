# B16-ADR-052: Sorge-Struktur und Sub-Depot-Hierarchie

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 26.04.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** akzeptiert
- **Datum:** 2026-04-26
- **Kategorien:** ARCHITEKTUR | SICHERHEIT | UX-PRINZIP
- **Format:** MADR 4.0 mit Vivodepot-Erweiterungen (Kategorien-Header, Nachweis-Abschnitt)

## Kontext und Problemstellung

Vivodepot war in den ersten Konzept-Iterationen als Werkzeug für eine einzelne Bürgerin oder einen einzelnen Bürger gedacht: Ein Vivodepot enthält die Daten einer Person. Sorgt jemand für eine andere Person — etwa eine Tochter für ihren pflegebedürftigen Vater —, sollte sie im ursprünglichen Modell entweder ein zweites separates Vivodepot für ihn führen oder in seinem Vivodepot als Bedienerin eingetragen sein (Variante Bediener-Identität).

Diese Annahme erwies sich als zu schmal. Pflegende Angehörige zwischen 45 und 65 Jahren — die Kern-Zielgruppe von Vivodepot — sorgen typischerweise für mehrere Personen gleichzeitig: Mutter, Vater, Schwiegervater, gelegentlich ein Geschwister. Das Modell „eine Datei pro Person" bedeutet im Alltag drei oder vier separate Vivodepot-Dateien mit drei oder vier separaten Passwörtern — eine kognitive Last, die das Werkzeug-Versprechen für die Kern-Zielgruppe untergräbt.

Wie soll Vivodepot die Sorge-Beziehung zwischen einer Anker-Person und den von ihr betreuten Personen architektonisch abbilden, ohne das Niedrigschwelligkeits-Versprechen zu brechen?

Der ADR-Entwurf vom 26. April 2026 (ursprünglich als B16-ADR-050 nummeriert, siehe Nummern-Korrektur unter „Konsequenzen") ließ drei Detail-Fragen offen: Verschlüsselungs-Architektur, Modi-Hierarchie (Notfall- und Angehörigen-Modus), Export und Verselbstständigung. Diese wurden am 26. April 2026 geklärt.

## Entscheidungstreiber

- **Reale Lebenswirklichkeit pflegender Angehöriger:** Mehrere betreute Personen gleichzeitig sind der Normalfall der Zielgruppe, nicht die Ausnahme.
- **Niedrigschwelligkeit:** Mehrere separate Dateien und Passwörter erzeugen kognitive Last, die das Werkzeug-Versprechen bricht.
- **Kryptografische Sauberkeit im Erbschaftsfall:** Master-Schlüssel der Anker-Person und Daten betreuter Personen dürfen nicht unsauber vermischt sein.
- **Rechtliche Klarheit:** Notfall-Datenzugriff und tatsächliche Vollmachts-Bevollmächtigung müssen begrifflich und in der UI getrennt bleiben.
- **Fehlende PKI-Infrastruktur in der Zielgruppe:** Lösungen, die eine etablierte Public-Key-Infrastruktur bei Bürgern voraussetzen, scheiden für v1.0 aus.
- **UI-Übersichtlichkeit als kognitive, nicht technische Grenze:** Die Anzahl handhabbarer Sub-Depots ist durch Übersichtlichkeit begrenzt, nicht durch Krypto oder Speicher.
- **Architektur-Kontinuität:** Aufbau auf der Krypto-Migration aus B16-ADR-050 (PBKDF2 600.000 Iterationen) und Verträglichkeit mit B16-ADR-051 (Sidebar-Neuordnung) und B16-ADR-047 (Nutzerführung).

## Geprüfte Optionen

1. **Sorge-Struktur (hierarchisches Modell)** — Anker-Person mit bis zu vier eingebetteten, kryptografisch getrennten Sub-Depots betreuter Personen.
2. **AP-5-Bediener-Identitäts-Modell** — eine separate Vivodepot-Datei pro betreuter Person mit `istDieselbePerson`-Flag und `bediener`-Sektion (bisherige Spezifikation).

Innerhalb der gewählten Sorge-Struktur wurden drei Detail-Fragen mit jeweils eigenen Optionen geprüft:

3. **Verschlüsselung 1A** — ein gemeinsamer Schlüssel für Anker- und Sub-Depot-Daten.
4. **Verschlüsselung 1B** — ein eigenes Passwort pro Sub-Depot.
5. **Verschlüsselung 1C** — ein Master-Schlüssel mit HKDF-abgeleitetem Sub-Schlüssel pro Sub-Depot.
6. **Notfall-Modus 2A.1** — Anker-Person als Default, kein Auswahl-Bildschirm.
7. **Notfall-Modus 2A.2** — Auswahl-Bildschirm immer, unabhängig von der Anzahl Sub-Depots.
8. **Notfall-Modus 2A.3** — Hybrid: direkter Sprung bei null oder einem Sub-Depot, Auswahl-Bildschirm erst ab zwei.
9. **Angehörigen-Modus 2B.1** — Vertrauensperson sieht ausschließlich Anker-Daten, Sub-Depots unsichtbar.
10. **Angehörigen-Modus 2B.2** — eigene Angehörigen-Erlaubnis pro Sub-Depot.
11. **Export 3A** — Neuverschlüsselung mit neuem Passwort, mit optionaler Vorsorge-Anweisung als Freitext.
12. **Export 3B** — Public-Key-Verschlüsselung an vordefinierte Erben-Schlüssel.
13. **Export 3C** — Vorsorge-Anweisung mit Notar-Integration und Erbschein-Verifikation.

## Entscheidung

Gewählt: **Sorge-Struktur** (Option 1). Vivodepot ab v1.0 unterstützt sie als nativen Bestandteil. Ein Vivodepot besteht aus genau einer Anker-Person und null bis vier Sub-Depots — die Obergrenze ist kognitiv begründet, nicht technisch: Krypto und Speicher würden mehr erlauben, aber die UI-Übersichtlichkeit für die Zielgruppe bricht jenseits von vier parallelen Lebensgeschichten. Innerhalb dieser Struktur wurden vier Sub-Festlegungen getroffen.

### Sub-Festlegung 1 — Datenmodell

Das Datenmodell wird auf `schemaVersion: 2` gehoben. Wurzel-Struktur: `ankerPerson` mit der bisherigen flachen Personen-Datenstruktur, daneben ein `subDepots`-Array mit null bis vier Einträgen. Jeder Sub-Depot-Eintrag enthält Metadaten (UUID, Anlage-Datum, Eigentümer-Identität, Vollmacht-Beleg-Pflichtfeld, optionale Vorsorge-Anweisung), eine vollwertige Vivodepot-Datenstruktur, ein Provenance-Array pro Datensatz und einen Status (aktiv, exportiert, geloescht). Das alte Bediener-Identitäts-Konzept (`istDieselbePerson`-Flag mit `bediener`-Sektion) entfällt vollständig.

### Sub-Festlegung 2 — Verschlüsselungs-Architektur (Option 1C)

Der Master-Schlüssel der Anker-Person bleibt Wurzel der Schlüssel-Hierarchie, abgeleitet wie in B16-ADR-050 per PBKDF2 mit 600.000 Iterationen aus dem Master-Passwort. Pro Sub-Depot wird zusätzlich per HKDF (RFC 5869, im Web Crypto API als Algorithmus `HKDF` nativ verfügbar) ein eigener Sub-Schlüssel erzeugt. HKDF-Parameter: IKM ist der Master-Schlüssel, Salt ist ein pro Sub-Depot beim Anlegen generiertes 32-Byte-Random (im Klartext-Bereich der Datei gespeichert), Info-String ist die zentrale Konstante `vivodepot-subdepot-v1`, Hash ist SHA-256, Schlüssellänge 256 bit. Anker-Daten werden mit dem Master-Schlüssel direkt per AES-GCM verschlüsselt; jedes Sub-Depot mit seinem Sub-Schlüssel per AES-GCM, jeweils mit eindeutigem IV. Im Klartext-Bereich der Datei liegen ausschließlich Sub-Depot-IDs, HKDF-Salts, IVs und Versions-Felder — Eigentümer-Namen, Vollmachts-Typen und alle inhaltlichen Daten sind verschlüsselt.

### Sub-Festlegung 3 — Modi-Hierarchie (Optionen 2A.3 und 2B.1)

Notfall-Modus folgt der Hybrid-Logik 2A.3: bei null oder einem Sub-Depot direkter Sprung zur einzigen relevanten Person, kein Auswahl-Bildschirm; bei zwei oder mehr Sub-Depots erzwungener Auswahl-Bildschirm mit Liste aller Personen (Anker plus alle Sub-Depots). Permanent sichtbar im Notfall-Bildschirm und auf Bürger-Ausdrucken aus dem Notfall-Modus ist die feste Hinweis-Zeile: „Notfall-Daten zur medizinischen Versorgung. Diese Anzeige ist kein Vollmachts-Beleg." Damit ist klargestellt, dass Notfall-Zugriff keine rechtliche Bevollmächtigung konstituiert, sondern Datenzugriff zur Versorgung im Rahmen des Notfallrechts und mutmaßlichen Willens.

Sub-Depot-Anlage erfordert verbindlich eine formale Vollmacht als abgelegten Beleg (Vorsorgevollmacht, Betreuungsvollmacht, Erbschein oder andere) — Pflichtfeld bei Anlage, kein leeres Speichern möglich. Die Vollmacht wird in `metadaten.vollmacht.beleg` eingebettet und mitverschlüsselt.

Angehörigen-Modus folgt Option 2B.1: Eine Vertrauensperson mit Angehörigen-Modus-Zugriff sieht ausschließlich die Daten der Anker-Person. Sub-Depots sind weder sichtbar noch aufrufbar, weil eine Vorsorgevollmacht personengebunden und in der Regel nicht weiter delegierbar ist — die Tochter darf das Sub-Depot ihres Vaters auf Grundlage seiner Vollmacht bedienen, kann diese Vollmacht aber nicht an Dritte (etwa ihre Schwester) weiterreichen.

### Sub-Festlegung 4 — Export und Verselbstständigung (Hybrid 3A mit Vorsorge-Anweisung)

Ein Sub-Depot kann in eine eigenständige Vivodepot-Datei exportiert werden, typisch im Erbschaftsfall. Beim Anlegen oder Bearbeiten eines Sub-Depots kann die Anker-Person eine optionale Vorsorge-Anweisung als Freitext hinterlegen, etwa „Im Erbfall an meinen Bruder Werner, Adresse XY, Erbschein-Vorlage beim Notar Dr. Schmidt." Beim Export wird diese Anweisung prominent angezeigt mit der Aufforderung, gemäß ihr zu verfahren. Technisch: Die Anker-Person vergibt ein neues Passwort, das Sub-Depot wird mit dem bisherigen Sub-Schlüssel entschlüsselt, in eine neue Vivodepot-Struktur transformiert (Sub-Depot wird zur Anker-Person der neuen Datei, `subDepots: []`) und mit dem neuen Passwort neu verschlüsselt. Die Vorsorge-Anweisung bleibt in der exportierten Datei sichtbar erhalten.

Die exportierte Datei ist von ihrer Quelle kryptografisch entkoppelt: Das Master-Passwort der Anker-Person öffnet sie nicht. Die Provenance-Spuren des Sub-Depots werden erhalten, ergänzt um einen Eintrag „Exportiert aus Sorge-Depot von [Anker-Person] am [Datum]".

3C (Notar-Integration mit Erbschein-Verifikation) ist als Ziel für v1.x vorgemerkt. 3B (Public-Key-Verschlüsselung an Erben) wurde verworfen, weil die Zielgruppe keine etablierte PKI-Infrastruktur hat.

## Konsequenzen

**Positiv.**
- Pflegende Angehörige müssen nicht mehrere Vivodepot-Dateien jonglieren, sondern haben alles in ihrem eigenen Vivodepot mit klarer Trennung.
- Strategisches Differenzierungs-Asset gegenüber ePA, EUDIW und EHDS, die die Sorge-Beziehung als Bedienungs-Konstellation architektonisch nicht abbilden — relevant für NLnet-Antrag und Pilotpartner-Anbahnung.
- Krypto-Story wird gewichtiger: Master-Schlüssel mit HKDF-abgeleiteten Sub-Schlüsseln pro Sorge-Beziehung folgt einem Muster aus Signal, WireGuard und Apple Keychain.
- Die juristische Trennung zwischen Datenzugriff zur Versorgung und Vollmachts-Bevollmächtigung ist im Notfall-Modus explizit gemacht.

**Negativ.**
- AP 5 wächst von vier auf acht Tasks, davon drei Klasse A (Datenmodell, Krypto, Export).
- Test-Suite wächst um mindestens 50 zusätzliche Tests, davon mindestens 19 Klasse A.
- Pilotpartner-Schulungsmaterial braucht ein neues Sub-Modul Sorge-Struktur, zwei bis vier Stunden zusätzlicher Material-Erstellung, vor Auslieferung an Pflegeheim, Finanzinstitut und Klinik.
- Beta-Bestandsdepots müssen bei erstem Öffnen mit v1.0 lazy migriert werden (Task 5.8); Migrations-Erfolg pro Pilotpartner-Depot wird einzeln verifiziert und protokolliert, bevor v1.0 öffentlich freigegeben wird.

**Neutral.**
- AP 6 (FHIR/IPS-Konsolidierung) bleibt inhaltlich unverändert, wird aber nach AP-5-Abschluss um Sub-Depot-Provenance in der FHIR-Provenance-Ressource ergänzt (Detail-Spec in einer Aktualisierung von Task 6.2).
- Whitepaper-Positionierung wird um einen Abschnitt Sorge-Struktur erweitert; Webseite buerger.html präzisiert die Anlass-Kachel „Wenn Sie für jemanden sorgen" mit konkreter Beschreibung der Sub-Depot-Logik. Beide nicht zeitkritisch, nach AP-5-Abschluss.
- **Nummern-Korrektur:** Der ursprüngliche Entwurf vom 26. April 2026 (Vormittag) trug die Nummer B16-ADR-050. Bei der Konsolidierung am Nachmittag des 26. April 2026 wurde B16-ADR-050 für die Krypto-Migration und B16-ADR-051 für die Sidebar-Neuordnung belegt — beide bereits in 1.0.0-beta.17 umgesetzt. Der Sorge-Struktur-ADR wurde daher auf B16-ADR-052 umnummeriert. Die methodische Reflexion zu diesem Nummern-Konflikt wurde am 26. April 2026 im Vorgängerprojekt festgehalten.

## Vor- und Nachteile der Optionen

### Option 1: Sorge-Struktur (gewählt)
- **Gut:** Bildet die reale Lebenswirklichkeit pflegender Angehöriger ab, die typischerweise mehrere Personen gleichzeitig betreuen.
- **Gut:** Kryptografische Trennung durch Sub-Schlüssel trotz gemeinsamer Datei.
- **Gut:** Architektonische Differenzierung gegenüber ePA, EUDIW, EHDS.
- **Schlecht:** Erhöht den Implementierungsaufwand deutlich (AP 5 von vier auf acht Tasks, mindestens 50 zusätzliche Tests).
- **Schlecht:** Erfordert Migration bestehender Beta-Depots.

### Option 2: AP-5-Bediener-Identitäts-Modell
- **Gut:** Bereits spezifiziert, kein Konzept-Neubau nötig.
- **Schlecht:** Bildet die reale Lebenswirklichkeit nicht ab — drei bis vier separate Dateien mit separaten Passwörtern für eine Tochter mit mehreren betreuten Eltern.
- **Schlecht:** Kognitive Last bricht das Niedrigschwelligkeits-Versprechen.
- **Schlecht:** Datenschutz-Lücken, wenn eines von mehreren Passwörtern verloren geht.

### Option 3: Verschlüsselung 1A (ein Schlüssel für alles)
- **Gut:** Einfachste Implementierung.
- **Schlecht:** Erbschaftsfall semantisch unsauber — Master-Schlüssel der Tochter im Klartext-Speicher mit Daten des Vaters vermischt.

### Option 4: Verschlüsselung 1B (eigene Passwörter pro Sub-Depot)
- **Gut:** Höchste kryptografische Trennschärfe.
- **Schlecht:** Reale Folge wäre Passwort-Wiederverwendung bei mehreren zusätzlichen Passwörtern, was den Sicherheitsgewinn auf null reduziert.

### Option 5: Verschlüsselung 1C (Master-Schlüssel mit HKDF-Sub-Schlüssel, gewählt)
- **Gut:** Kryptografisch sauber getrennt, ohne zusätzliche Passwörter für die Nutzerin.
- **Gut:** Folgt etabliertem Industriestandard (Signal, WireGuard, Apple Keychain).
- **Schlecht:** Höherer Implementierungsaufwand als Option 1A.

### Option 6: Notfall-Modus 2A.1 (Anker-Default ohne Auswahl)
- **Gut:** Kein zusätzlicher Klick im Standardfall.
- **Schlecht:** Bei mehreren Sub-Depots verliert ein Sanitäter wertvolle Sekunden beim Wechsel zur richtigen Person.

### Option 7: Notfall-Modus 2A.2 (Auswahl-Bildschirm immer)
- **Gut:** Konsistentes Verhalten unabhängig von der Sub-Depot-Anzahl.
- **Schlecht:** Kostet auch im häufigen Standardfall ohne Sub-Depots unnötigen Aufwand.

### Option 8: Notfall-Modus 2A.3 (Hybrid, gewählt)
- **Gut:** Kein Aufwand im Standardfall, Auswahl nur wenn tatsächlich nötig.
- **Schlecht:** Zwei unterschiedliche Verhaltensweisen je nach Sub-Depot-Anzahl, etwas komplexere Logik.

### Option 9: Angehörigen-Modus 2B.1 (nur Anker-Daten sichtbar, gewählt)
- **Gut:** Entspricht der rechtlichen Realität — eine Vorsorgevollmacht ist personengebunden und in der Regel nicht delegierbar.
- **Schlecht:** Keine Möglichkeit, einer Vertrauensperson gezielt Zugriff auch auf ein Sub-Depot zu geben.

### Option 10: Angehörigen-Modus 2B.2 (pro Sub-Depot eigene Erlaubnis)
- **Gut:** Flexibler für komplexe Familienkonstellationen.
- **Schlecht:** Juristisch enge Frage der Sub-Delegation einer Vorsorgevollmacht; UI-Komplexität für die Zielgruppe nicht verhältnismäßig.

### Option 11: Export 3A (Hybrid mit Vorsorge-Anweisung, gewählt)
- **Gut:** Technisch machbar ohne PKI-Infrastruktur; die Vorsorge-Anweisung schafft Klarheit für den Erbfall.
- **Schlecht:** Export-Prozess erfordert manuelle Neuverschlüsselung mit neuem Passwort statt automatisierter Schlüsselweitergabe.

### Option 12: Export 3B (Public-Key an Erben)
- **Gut:** Würde eine automatisierte, kryptografisch gebundene Erben-Übergabe ermöglichen.
- **Schlecht:** Zielgruppe hat keine etablierte PKI-Infrastruktur; statische Erben-Schlüssel veralten zwischen Sub-Depot-Anlage und Erbfall (Ehe, Trennung, Tod von Erben).

### Option 13: Export 3C (Notar-Integration, Ziel v1.x)
- **Gut:** Höchste rechtliche Verbindlichkeit durch Erbschein-Verifikation.
- **Schlecht:** Zu hohe Implementierungskomplexität für v1.0; Workflow-Integration mit Drittparteien strapaziert den Single-File-HTML-Offline-Charakter.

## Nachweis

Die Entscheidung beruht auf einer mehrstündigen strukturierten Diskussion am 26. April 2026, in der jede der drei Detail-Fragen einzeln entschieden wurde, nachdem die Optionen mit Pro- und Contra-Argumenten vorlagen.

> „ich würde sagen c, das ist am saubersten"
>
> — *[Entscheidungsgespräch, 26. April 2026, Frage 1 Verschlüsselungs-Architektur]*

> „2a3 mit dem deutlichen Hinweis, dass das Handeln im NAmen der anderen Person keine Vollmacht im rechtlichen Bereich konstituiert. Oder: 2a3 braucht eine formale Vollmacht, die abgelegt werden muss"
>
> — *[Entscheidungsgespräch, 26. April 2026, Frage 2 Modi-Hierarchie (Notfall-Modus)]*

> „die bediener-identität ist dann unnötig, wenn wir die Sub-Struktur bauen"
>
> — *[Entscheidungsgespräch, 26. April 2026, Frage 4 zum Wegfall des alten Modells]*

Frage 3 (Export) wurde durch Bestätigung des Hybrid-Vorschlags entschieden (3A technisch mit Vorsorge-Anweisungs-Textfeld, 3C als Ziel für v1.x) — hierzu liegt im Quelldokument kein direktes wörtliches Zitat vor, nur die zusammenfassende Feststellung, dass der Vorschlag bestätigt wurde. Die strategische Begründung der Sorge-Struktur als Differenzierungs-Asset gegenüber ePA, EUDIW und EHDS steht ausführlicher im B16-ADR-050-Entwurf vom 26. April 2026 (Vormittag), der durch dieses B16-ADR-052 ersetzt und konsolidiert wird.

## Weiterführend

**Bezug.** B16-ADR-050 (Krypto-Migration PBKDF2 200k→600k, Fundament), B16-ADR-051 (Sidebar-Neuordnung, UI-Rahmen), B16-ADR-047 (Nutzerführung Komplett-Konzept); Kern-Zielgruppe sind pflegende Angehörige.

**Architektonische Verortung.** Die Sorge-Struktur ist die Antwort auf die Kern-Zielgruppe „pflegende Angehörige zwischen 45 und 65 Jahren" und auf die in der Webseite buerger.html bereits angelegte Anlass-Kachel „Wenn Sie für jemanden sorgen". Sie macht aus einem vagen Anwendungsfall eine architektonisch unterstützte Realität.

**Implementations-Aufwand.** AP 5 wächst von vier auf acht Tasks (drei Klasse A: Datenmodell, Krypto, Export); Test-Suite wächst um mindestens 50 Tests, davon mindestens 19 Klasse A.

**Migration.** Beta-Bestandsdepots werden bei erstem Öffnen mit v1.0 lazy migriert; Migrations-Erfolg pro Pilotpartner-Depot wird einzeln verifiziert und protokolliert vor öffentlicher v1.0-Freigabe.

**Methodische Reflexion.** Die Nummern-Umbenennung von B16-ADR-050 auf B16-ADR-052 wurde am 26. April 2026 im Vorgängerprojekt als methodischer Befund festgehalten.
