# U2-ADR-122: Tod-Übergangs-Architektur — Bevollmächtigung, drei Übergangs-Wege und Anker-Provenance-Snapshot

- **Status:** akzeptiert (18.05.2026) · Komponente 4 durch Entscheidung vom 01.08.2026 abgelöst (siehe Nachtrag) · übrige Komponenten unverändert gültig, Bau-Stand nicht Teil dieser Nachpflege
- **Datum:** 2026-05-18
- **Entscheidung:** Produktentscheidung
- **Konsultiert:** Claude (strategischer Sparringspartner, Klärungs-Sitzung 18.05.2026 Abend; Provenance-Klärung, Commit *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 2026)*; Angehörigen-Modus-Inventur I-28, Commit *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 2026)* mit Klärungs-Sitzung 18.05.2026 spät Abend zur Situations-Liste-Korrektur)
- **Kategorien:** ARCHITEKTUR | UX-PRINZIP | SICHERHEIT
- **Format:** MADR 4.0 mit Vivodepot-Erweiterungen (Kategorien-Header, Nachweis-Abschnitt)
- **Vorgänger:** Krypto-Architektur v0.1 Abschnitte 4.1 (Re-Key beim Verselbstständigen), 4.2 (Blackbox-Übergabe), 4.3 (Einhängen mit Audit-Trennung), 4.4 (Notfall-Instruktionsblatt). ADR-063 (FHIR-Provenance Sub-Depot-IPS-Export — Vollmachts-Grundlage-Snapshot-Disziplin). ADR-064 (Beziehungs-Codierung HL7-V3-RoleCode). ADR-068v2 (Bidirektionale Depot-Verwaltungsdelegation, Drei-Ebenen-Sicht). ADR-077 v3 (KI-Verfügung als postmortale Verfügung). ADR-078 (Trust Chain mit Vollmachts-Pflichtfeldern und Korrektur-Aufweichung vom 13.05.2026). **Alle fünf Nummern in diesem Absatz sind B16-Referenzen** (Dokument entstand 18.05.2026, vor dem U2-Namensraum — Auslegungsregel U2-ADR-090 §2: unpräfigierte Referenzen in Dokumenten vor dem 20.07.2026 meinen B16).
- **Bezug:** Provenance-Tiefe-Klärungs-Bericht 18.05.2026 (`docs/methodik/provenance-tiefe-klaerung-2026-05-18.md`, Commit *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 2026)*). Sprint U-2-7 Erbschafts-Anker-zu-Sub (geplant). Master-Briefing v1.12 Schärfung 7 (Golden Twin als Lebenslauf-Modell, vier Existenzphasen). CLAUDE.md vom 24.04.2026 Abschnitt „Zwei Modi — eine Datenbasis" (Eigener Modus und Angehörigenmodus).
- **Status heute:** gilt — Beleg `tests/provenienz-snapshot.test.js` für Komponente 5; die übrigen
  Komponenten (1, 2, 3, 6, 7) sind laut Nachtrag 02.08.2026 im Dokument selbst bau-standlich
  ungeprüft, Komponente 4 ist durch die Entscheidung vom 01.08.2026 abgelöst.

## Nachtrag zur Nummerierung (02.08.2026)

Dieses Dokument wurde ursprünglich unter der Nummer „ADR-081" geführt (3-stellige B16-Serie, 18.05.2026), aber nie in `docs/adr/` committet — es existierte bis heute nur im Claude-Projekt-Wissen. In der Zwischenzeit hat die U2-Serie unabhängig ebenfalls die Nummer 081 vergeben (`U2-ADR-081-fhir-provenance-selbst-fall`, 13.07.2026, FHIR-Provenance im IPS-Bundle — ein inhaltlich anderes Thema). Beide Nummern sind nach U2-ADR-090 als getrennte Namensräume grundsätzlich zulässig nebeneinander; das Problem war nicht die doppelte Zahl, sondern dass drei Stellen im Code (`vivodepot.html:6118-6119`, `vivodepot.html:6643`, `vivodepot.html:7624`) unpräfigiert „ADR-081" schrieben und damit für Leser heute auf das falsche, tatsächlich existierende Dokument zeigten. Da B16 für neue Nummern eingefroren ist (U2-ADR-090), wird dieser Text unter der nächsten freien U2-Nummer nachgezogen — **U2-ADR-122** — kollisionsgeprüft gegen beide Serien (frei in B16 und U2). Die drei Code-Stellen sind auf diese Nummer beziehungsweise auf die tatsächlich bindende Entscheidungsquelle korrigiert.

## Nachtrag — Komponente 4 abgelöst (01.08.2026)

Komponente 4 (Tod-Übergangs-Wizard für den Übernehmer, unten) wurde nie gebaut. Am 01.08.2026 wurde entschieden, sie **nicht** als interaktiven Wizard umzusetzen, sondern als statisches Situationsblatt „Todesfall-Übernahme" im bestehenden Erbfall-Muster (Option C) — siehe die bindende Entscheidung `tod-uebergangs-wizard-entscheidung-2026-08-01.md`. Begründung dort: der Übernehmer trifft keine eigenen Entscheidungen über sich selbst, sondern navigiert ein fremdes Depot — das ist strukturell der Angehörigen-Situationsblatt-Fall, kein Wizard-Fall. Die Schritte 1-3 und 5-6 aus Komponente 4 sind inhaltlich in das Situationsblatt übernommen (reduziert auf die zwei tatsächlich verlinkbaren Wege 2/3); Schritt 4 (Weg-Auswahl inkl. Weg 1, Anker-zu-Sub-Wandlung) bleibt zurückgestellt (Posten 103). Komponenten 1, 2, 3, 5, 6, 7 sind von dieser Ablösung nicht betroffen — ob und in welchem Umfang sie tatsächlich gebaut wurden, ist nicht Gegenstand dieser Nachpflege und bräuchte eine eigene Bau-Stand-Prüfung.

---

## Kontext und Problemstellung

Vivodepot soll die Bürgerin von der Geburt bis nach dem Tod begleiten — eines der konstitutiven Merkmale des Citizen Digital Twin im Sinne des Master-Briefings v1.12 Schärfung 6. Die Lebenslauf-Phase „nach dem Tod" verlangt eine eigene Architektur, weil die Bürgerin als handelnde Subjekt fehlt und stellvertretende Handlung durch andere Personen geregelt sein muss.

Die kryptographischen Mechanismen für stellvertretende Handlung sind in der Krypto-Architektur v0.1 Abschnitte 4.1 bis 4.4 verankert — Re-Key, Blackbox-Übergabe, Einhängen, Notfall-Instruktionsblatt. ADR-068v2 hat die Drei-Ebenen-Sicht beschrieben (eigenes Anker-Depot der einhängenden Person, eingehängtes Anker-Depot, versiegelte Sub-Depots unter dem eingehängten Anker). ADR-078 hat die Trust-Chain-Felder pro Sub-Depot etabliert.

Was bisher nicht als architektonische Entscheidung dokumentiert ist:

Erstens, **welche Vorab-Verfügungen die Bürgerin zu Lebzeiten treffen muss oder kann**, um den Tod-Übergang vorzubereiten. Heutige vvwiz-Architektur enthält keine Pflicht-Eintragung einer Bevollmächtigten.

Zweitens, **wie die Wahl zwischen den drei verfügbaren Übergangs-Wegen** (neue Anker-Person, Zugang ohne Anker-Wechsel, Angehörigen-Modus) im Bürger-Tool getroffen wird.

Drittens, **wie die historische Anker-Provenance pro Datensatz sauber dargestellt wird**, wenn nach dem Tod ein Anker-Wechsel stattgefunden hat. Der Klärungs-Bericht vom 18.05.2026 hat einen Drift-Befund identifiziert: die Render-Funktion `renderProvenanceZeile` zeigt immer den aktuellen Anker-Namen, auch für Einträge, die vor einem Anker-Wechsel angelegt wurden — bei Tod-Übergang ist die Attribution falsch.

Viertens, **wie die Lese-Datei `vivodepot-lesen.html` die historische Anker-Information an Empfänger vermittelt** — sie hat aktuell keine Provenance-Anzeige.

Fünftens, **wie der Übernehmer im Todesfall handlungsleitend unterstützt wird** über das Notfall-Instruktionsblatt aus 4.4 hinaus, plus welche rechtlichen Hinweise als pflichtmäßige Inhalts-Bausteine gelten.

Sechstens, **wie die KI-Verfügung (ADR-077 v3) langfristig zugänglich bleibt**, da sie potenziell weit über den Tod hinaus wirksam ist.

**Frage:** Wie ist die Tod-Übergangs-Architektur zu verankern, sodass die kryptographischen Mechanismen aus der Krypto-Architektur 4.1-4.4 sauber mit Vorab-Verfügungen im vvwiz, dem Tod-Übergangs-Wizard für den Übernehmer, korrekter Anker-Provenance und der KI-Verfügungs-Werkzeug-Begrenzung verbunden werden?

## Entscheidungstreiber

- **Werkzeug-Charakter.** Vivodepot ist Werkzeug, nicht Register und nicht Plattform. Die Bürgerin verfügt, Vivodepot dokumentiert. Die rechtliche Wirksamkeit und Langzeit-Aufbewahrung liegt beyond Vivodepot. Diese Selbst-Begrenzung gilt insbesondere für die KI-Verfügung, deren Wirksamkeit über fünfzig Jahre Vivodepot nicht garantieren kann.
- **Lebenslauf-Treue zum Golden Twin.** Master-Briefing v1.12 Schärfung 7 beschreibt die vier Existenzphasen (vor Handlungsfähigkeit, während voller Handlungsfähigkeit, während eingeschränkter Handlungsfähigkeit, nach dem Tod). ADR verankert die vierte Phase konkret.
- **Souveränität der Sub-Depot-Inhaberinnen.** Wenn die Anker-Person A stirbt, sind die Sub-Inhaberinnen C und D weiterhin Subjekte ihrer eigenen Daten. Sie können (oder ihre gesetzlichen Vertreter können) eine neue Anker-Person E neu bevollmächtigen. Vivodepot legt sich nicht fest, wer E wird — A muss nicht zu Lebzeiten alles vorab geregelt haben.
- **Korrekte Provenance über Anker-Wechsel hinweg.** Die heutige Render-Funktion zeigt den aktuellen Anker-Namen für alle anker-zugeschriebenen Einträge. Bei Tod-Übergang würde ein Eintrag, der ursprünglich von A in C angelegt wurde, fälschlich E zugeschrieben werden. Das ist ein Bug, der vor v1.0-Tag korrigiert werden muss — nicht nur eine fehlende Feature.
- **Symmetrie der Vollmachts-Architektur.** Pro Bürgerin gibt es zwei Vollmachts-Klassen: Bevollmächtigte, die für die Bürgerin handeln (Pflicht-Eintrag im vvwiz), und Bevollmächtigungen für andere, die als Grundlage von Sub-Depots dienen (ADR-078 Trust-Chain-Felder). Beide Klassen müssen architektonisch sichtbar sein.
- **Empfänger-Sicht über Lese-Datei.** Wer ein versiegeltes oder weitergeleitetes Sub-Depot via Lese-Datei öffnet, soll die Eintragenden-Information sehen — das ist heute eine Lücke.
- **Werkzeug-Hilfe im Todesfall.** Der Übernehmer ist im Todesfall in einer emotional und organisatorisch schwierigen Situation. Vivodepot soll handlungsleitend unterstützen, ohne rechtsberatend aufzutreten.

## Geprüfte Optionen

1. **Option A — Tod-Übergang nur über Notfall-Instruktionsblatt.** Keine zusätzliche vvwiz-Erweiterung, keine eigene Tod-Übergangs-Wizard im Bürger-Tool. Der Übernehmer findet alles im Notfall-Instruktionsblatt. Vorteil: minimaler Implementierungs-Aufwand. Nachteil: die Bevollmächtigten-Pflichtfeld-Frage bleibt ungelöst, der Drift bei der Anker-Provenance bleibt bestehen, die rechtlichen Hinweise sind nicht systematisch verankert.

2. **Option B — separater Tod-Übergangs-Wizard ohne vvwiz-Integration.** Eigene Wizard-Datei für die Tod-Übergangs-Verfügung, getrennt vom vvwiz. Vorteil: klare UX-Trennung. Nachteil: konzeptionelle Doppelstruktur — der vvwiz behandelt schon Bevollmächtigte und Vollmachten, ein separater Tod-Übergangs-Wizard würde dieselben Felder noch einmal aufgreifen.

3. **Option C — Synthese im vvwiz plus Tod-Übergangs-Wizard für den Übernehmer (gewählt).** Der vvwiz wird um Pflichtfeld erste Bevollmächtigte plus optionale weitere plus Tod-Verfügungs-Schritte erweitert. Der Tod-Übergangs-Wizard ist ein neuer, eigenständiger Wizard im Bürger-Tool, der nach erfolgreichem Einhängen einer verstorbenen Person den Übernehmer durch die Schritte führt. Provenance-Variante A (Anker-Name-Snapshot pro Eintrag) wird im Schema bei der Eintragung gespeichert und in allen Ausgabe-Formaten korrekt dargestellt. Die Lese-Datei wird um eine Provenance-Anzeige erweitert.

4. **Option D — radikal werkzeug-minimal.** Vivodepot stellt nur die Kryptographie zur Verfügung, alle Verfügungs-Logik und Übergangs-Anweisungen liegen außerhalb. Vorteil: kompromisslose Werkzeug-Philosophie. Nachteil: macht Vivodepot für die Bürgerin als praktisches Werkzeug unbrauchbar in genau der Lebenssituation, für die es konstitutiv ist.

## Entscheidung

Gewählt: **Option C — Synthese im vvwiz plus Tod-Übergangs-Wizard plus Provenance-Variante A plus Lese-Datei-Erweiterung.** (Zur Ablösung von Komponente 4 selbst durch ein statisches Situationsblatt siehe Nachtrag 01.08.2026 oben.)

Die Architektur besteht aus sechs Komponenten, die zusammen die Tod-Übergangs-Lage abdecken.

### Komponente 1 — vvwiz-Erweiterung Bevollmächtigte

Der Vorsorgevollmachts-Wizard (`vvwiz`) wird um folgende Felder erweitert:

**Pflichtfeld:** erste Bevollmächtigte mit Name, Beziehungs-Codierung gemäß ADR-064, Kontakt-Information, Vollmachts-Typ (Vorsorgevollmacht und Vollmacht über den Tod hinaus), Aufbewahrungsort des Vollmachts-Dokuments, Beginn-Datum. Wenn die Bürgerin keine erste Bevollmächtigte einträgt, wird sie im Bürger-Tool darauf hingewiesen, dass im Todesfall keine automatische Übergangs-Möglichkeit besteht — eine neue Bevollmächtigung müsste dann durch gesetzliche Erben oder gerichtliche Nachlassverwaltung ausgestellt werden.

**Optionale Felder:** weitere Bevollmächtigte mit eigener Beziehungs-Codierung, Kontakt, Vollmachts-Typ, Aufbewahrungsort. Pro weiterer Bevollmächtigter trägt die Bürgerin eine Wahl: **primär**, **Ersatz** (handlungsbefugt falls primäre nicht handlungsfähig), oder **gleichberechtigt** (handlungsbefugt parallel zur primären). Damit deckt die Architektur Hierarchie, Ersatz-Konstellationen und gleichberechtigte Konstellationen ab, ohne der Bürgerin eine Standard-Logik aufzuzwingen.

### Komponente 2 — Drei Übergangs-Wege im vvwiz

Die Bürgerin verfügt im vvwiz, welche der drei Übergangs-Wege im Todesfall primär gelten sollen. Die drei Wege schließen sich nicht aus und können kombiniert werden.

**Weg 1 — neue Anker-Person.** Das Depot wird über Einhängen plus Re-Key in ein eigenes Depot der Bevollmächtigten oder eines benannten Erben überführt. Die Bürgerin kann verfügen, dass das Depot zu einem Sub-Depot eines benannten Erben wandelt (U-2-7-Pfad, Anker-zu-Sub-Wandlung).

**Weg 2 — Zugang ohne Anker-Wechsel.** Die Bevollmächtigte hängt das Depot in ihr eigenes ein, kann es lesen und verwalten, A bleibt formal Anker im eingehängten Depot. Praktisch geeignet für Übergangs-Phasen, in denen noch nicht entschieden ist, was langfristig mit dem Depot geschehen soll, oder für temporäre Sichtung durch Erben.

**Weg 3 — Angehörigen-Modus mit Situationsblättern.** Eine Person mit Angehörigen-Passwort öffnet das Depot in der Lese-Sicht und erhält über Situationsblätter situativ zugeschnittene Inhalte. Die Bürgerin verfügt zu Lebzeiten das Angehörigen-Passwort plus den Aufbewahrungsort (analog zum Notfall-Instruktionsblatt aus Krypto-Architektur 4.4). Der Angehörigen-Modus ist ausdrücklich für Situationen gedacht, in denen die Eigentümerin nicht mehr selbst handlungsfähig ist — die Angehörige soll die Regelungen der Eigentümerin lesen und umsetzen können, wenn die Eigentümerin sie nicht mehr selbst mitteilen kann. Fünf Situationsblätter im Angehörigen-Modus: Krankenhaus, Pflegeheim-Aufnahme, Beerdigung und Nachlass, Behörden und Nachlass, Meine Menschen. Arzttermin gehört in den Eigenen Modus, nicht in den Angehörigen-Modus — beim Arzttermin nimmt die Eigentümerin selbst Daten mit oder exportiert ein Situationsblatt aus dem Eigenen Modus. Wenn eine Angehörige für eine demente oder anderweitig handlungsunfähige Person zum Arzt geht, ist das eine Pflege-Stellvertreter-Situation, die über das Sub-Depot der Pflege-Übernahme läuft (Modus B aus ADR-080), nicht über den Angehörigen-Modus des Anker-Depots.

Die Wahl zwischen den drei Wegen wird im vvwiz dokumentiert als A-Empfehlung. Die finale Entscheidung im Todesfall trifft die Bevollmächtigte beziehungsweise im Fall des Angehörigen-Modus die Person mit Angehörigen-Passwort.

### Komponente 3 — Anker-Wechsel-Verfügung für eigene Sub-Depots als Empfehlung

Die Bürgerin kann pro Sub-Depot, das sie als Anker führt, eine Empfehlung hinterlegen, wer im Fall ihres Ausfalls als neue Anker-Person für das Sub-Depot angesprochen werden soll. Die Empfehlung ist **nicht verpflichtend** — die Sub-Inhaberinnen C und D oder ihre gesetzlichen Vertreter bleiben Subjekte ihrer eigenen Daten und können eine neue Anker-Person frei wählen. Die Empfehlung ist ein Hinweis, kein Diktat.

### Komponente 4 — Tod-Übergangs-Wizard für den Übernehmer (nie gebaut, am 01.08.2026 abgelöst — siehe Nachtrag)

Ein neuer, eigenständiger Wizard im Bürger-Tool, der nach erfolgreichem Einhängen einer verstorbenen Person aktiviert werden kann. Der Wizard führt durch folgende Schritte:

Schritt 1, prozedurale Anweisung — Sterbeurkunde besorgen, Vollmacht über den Tod hinaus prüfen.

Schritt 2, Inventur — welche Sub-Depots existieren, welche Eintragenden-Information ist sichtbar, wer ist als neue Anker-Person empfohlen oder zu kontaktieren.

Schritt 3, Blackbox-Übergabe pro Sub-Depot — Vorbereitung der versiegelten `.vivodepot`-Datei pro Sub-Depot zur Übergabe an die neue Anker-Person E gemäß Krypto-Architektur 4.2.

Schritt 4, Verfahren mit dem eigenen Depot — die in Komponente 2 verfügten Wege werden angezeigt, der Übernehmer kann sich für einen Weg entscheiden.

Schritt 5, KI-Verfügung als PDF-Export — falls die Bürgerin eine KI-Verfügung gemäß ADR-077 v3 hinterlegt hat, wird sie als unverschlüsselter PDF-Export erzeugt. Der Übernehmer kann das PDF zur Kenntnis nehmen und an einen geeigneten Ort hinterlegen. Vivodepot kann die Langzeit-Aufbewahrung nicht garantieren — explizite Werkzeug-Begrenzung gemäß Werkzeug-Philosophie.

Schritt 6, rechtliche Hinweise — pflichtmäßige Inhalts-Bausteine, siehe Komponente 6.

### Komponente 5 — Provenance-Variante A: Anker-Name-Snapshot pro Eintrag

Bei jeder Eintragung wird der **aktuelle Anker-Name als Snapshot** im `sub.provenance[]`-Eintrag gespeichert, analog zur Vollmachts-Grundlage-Snapshot-Disziplin aus ADR-063. Schema-Bump auf Version 14.

Das Feld `eingabeDurch` bleibt die Rolle (anker oder eigentuemer). Neu hinzu kommt ein Feld `eingabeDurchName`, das den konkreten Namen der eintragenden Person zum Zeitpunkt der Eintragung enthält. Bei Anker-Wechsel ändert sich nur die aktuelle Anker-Person — die historischen Snapshots bleiben unverändert und zeigen weiterhin die damalige Anker-Person.

Die Render-Funktion `renderProvenanceZeile` wird angepasst, dass sie den Snapshot-Namen aus `eingabeDurchName` verwendet, nicht den aktuellen `_root.ankerPerson`-Namen. Der Drift-Befund aus dem Klärungs-Bericht 18.05.2026 wird damit behoben.

In FHIR-Exports gemäß ADR-063 wird `Provenance.agent` mit dem Snapshot-Namen befüllt, nicht mit der aktuellen Anker-Person. Der Vollmachts-Block aus Sprint 7b (zweite Agent-Entität `performer`) bleibt orthogonal — er beschreibt den Export-Akt, nicht die historische Eintragung.

### Komponente 6 — Lese-Datei-Provenance-Erweiterung

Die Empfänger-Lese-Datei `vivodepot-lesen.html` wird um eine Provenance-Anzeige erweitert. Pro Eintrag wird die Eintragenden-Information (Rolle plus Snapshot-Name plus Datum) angezeigt. Bei versiegelt übergebenen Sub-Depots sieht der Empfänger damit, welche Eintragenden welche Inhalte angelegt haben — wichtig für Anker-Wechsel-Konstellationen, in denen Einträge von verschiedenen historischen Ankern stammen.

### Komponente 7 — Notfall-Instruktionsblatt-Erweiterung um Tod-Übergangs-Anweisungen

Das Notfall-Instruktionsblatt aus Krypto-Architektur 4.4 wird um einen Tod-Übergangs-Block erweitert. Inhalt:

Eins, Schritt-für-Schritt-Anweisungen für den Übernehmer — analog zu Komponente 4 in textueller Form. Druckbar, papierbasiert verwendbar.

Zwei, rechtliche Hinweise als pflichtmäßige Inhalts-Bausteine:

Vorsorgevollmacht versus Vollmacht über den Tod hinaus. Die Vorsorgevollmacht erlischt mit dem Tod der Vollmachtgeberin. Die Vollmacht über den Tod hinaus gilt weiter und ermöglicht insbesondere Bank- und Behörden-Handlungen. Was die Bevollmächtigte unmittelbar nach dem Tod tun darf, hängt vom Vollmachts-Typ ab.

Bevollmächtigten-Stellung versus Erbenstellung. Die Bevollmächtigte ist nicht automatisch Erbe. Was die Bevollmächtigte mit dem eigenen Depot der verstorbenen Person tun darf, hängt von der Erbenstellung oder einer ausdrücklichen Verfügung der Verstorbenen ab. Die gesetzliche Erbfolge oder ein Testament bestimmt die Erben.

Vivodepot ist kein rechtliches Dokument. Vivodepot dokumentiert den Willen der Bürgerin. Bei Streitfällen gelten Testament, gesetzliche Erbfolge und gerichtliche Entscheidungen. Im Zweifel ist eine Notarin oder Rechtsanwältin zu konsultieren.

KI-Verfügung als Werkzeug-Verfügung. Vivodepot ermöglicht der Bürgerin, eine Verfügung über die postmortale Nutzung der eigenen digitalen Repräsentation zu treffen. Die rechtliche Verbindlichkeit dieser Verfügung ist heute kaum geregelt. Vivodepot stellt einen unverschlüsselten PDF-Export zur Verfügung. Die langfristige Aufbewahrung und Durchsetzung liegt nicht in der Verantwortung von Vivodepot.

Drei, Verweis auf die KI-Verfügung als PDF-Export, falls von der Bürgerin getroffen.

### Drei Wege und Bevollmächtigten-Architektur — Zusammenfassung der Logik

Wenn die Bürgerin A stirbt, kann B (erste Bevollmächtigte) das Depot von A einhängen. B hat dann Zugang zu A's eigenen Daten plus Sicht auf die Sub-Depots C und D, ohne deren Inhalte lesen zu können. Die Sub-Depots werden über Blackbox-Übergabe an die jeweilige neue Anker-Person E weitergeleitet — wer E ist, bestimmen C und D oder ihre gesetzlichen Vertreter. A's Empfehlung pro Sub-Depot ist ein Hinweis, kein Diktat.

Was mit A's eigenem Depot geschieht, hängt von A's Verfügung in Komponente 2 ab. Standardmäßig wird A's Depot zum Lese-Archiv über die Lese-Datei für Erben. Optional kann A verfügen, dass das Depot zum Sub-Depot eines benannten Erben wandelt (U-2-7-Pfad). Die Bevollmächtigte selbst kann A's Depot nicht als eigene Inhaberin weiterführen, weil sie nicht automatisch Erbe ist — das ist eine bewusste architektonische Begrenzung zum Schutz der Erbenstellung.

Falls keine erste Bevollmächtigte eingetragen ist, gibt es keinen automatischen Übergang. Erben müssen über gerichtliche Nachlassverwaltung oder Testaments-Vollzug eine neue Vollmacht ausstellen, bevor das Depot eingehängt werden kann.

## Begründung

Die Synthese im vvwiz plus Tod-Übergangs-Wizard erfüllt mehrere Architektur-Prinzipien zugleich. Sie macht die Vollmachts-Symmetrie sichtbar (Bevollmächtigte für sich selbst plus Bevollmächtigungen für andere), respektiert die Souveränität der Sub-Inhaberinnen (Empfehlung statt Diktat), schließt die Provenance-Lücke bei Anker-Wechsel (Variante A mit Snapshot), erweitert die Lese-Datei um die wichtige Empfänger-Sicht, und verankert die Werkzeug-Begrenzung bei der KI-Verfügung als bewusste Selbst-Bescheidung.

Die drei Übergangs-Wege bilden die Realität ab, in der Bürgerinnen sich auf den Tod vorbereiten — manche wollen einen klaren Nachfolger, manche wollen Übergangs-Zeit, manche wollen einen Angehörigen-Modus für Erben, die kein Vivodepot-Wissen mitbringen. Die Wahl liegt bei der Bürgerin.

Die rechtlichen Hinweise als pflichtmäßige Inhalts-Bausteine stellen sicher, dass der Übernehmer im Todesfall nicht überfordert oder fehlinformiert wird. Vivodepot tritt nicht als Rechtsberatung auf, gibt aber die wichtigsten Lese-Hilfen für die rechtlichen Konstellationen.

Die Provenance-Variante A (Snapshot-Name pro Eintrag) ist der pragmatische Mittelweg zwischen der ungenügenden Variante C (Zeit-Korrelation mit Drift in der Render-Funktion) und der teureren Variante B (vollständige Update-zu-Append-Audit-Historie). Aufwand 3-5 Stunden gemäß Klärungs-Bericht 18.05.2026. Variante A schließt den Drift-Befund und macht die historische Anker-Spur in allen Ausgabe-Formaten korrekt sichtbar.

Die Lese-Datei-Erweiterung schließt eine bisher nicht thematisierte Lücke. Bei der Tod-Übergangs-Lage besonders relevant, weil Empfänger eines versiegelt übergebenen Sub-Depots heute keine Eintragenden-Information sehen.

Der Angehörigen-Modus ist im Weg 3 als Lese-Sicht bei Handlungsunfähigkeit der Eigentümerin verankert. Diese Zweck-Klärung erfolgte in der Klärungs-Sitzung nach I-28-Inventur (18.05.2026 Abend). Die Liste der Situationen wurde dabei von sechs auf fünf reduziert — Arzttermin gehört in den Eigenen Modus, weil die Eigentümerin beim Arzttermin selbst handlungsfähig ist und selbst exportiert. Dieses Dokument wurde am gleichen Tag entsprechend korrigiert. Methodischer Befund: ADRs aus historischer Konzept-Quelle (hier CLAUDE.md April 2026) ohne Code-Realitäts-Gegenprüfung übernommen — die I-28-Inventur hat den Drift aufgedeckt vor der Implementation, nicht erst im Test-Lauf.

## Konsequenzen

### Positive Konsequenzen

Die Tod-Übergangs-Architektur ist als Ganzes architektonisch verankert und dokumentiert, statt verteilt über mehrere ADRs und implizite Code-Annahmen.

Die Provenance bei Anker-Wechsel wird korrekt — Drift in `renderProvenanceZeile` ist gefixt.

Die Lese-Datei wird empfänger-tauglich — Pilotpartner und Erben sehen die historische Eintragenden-Information.

Die Werkzeug-Philosophie wird bei der KI-Verfügung explizit gemacht — Vivodepot stellt das PDF zur Verfügung, beansprucht aber keine Langzeit-Garantie.

Die rechtlichen Hinweise machen Vivodepot pilotpartner-tauglich — Krankenhaus, Pflegeheim, Notar können sich auf einen dokumentierten rechtlichen Rahmen beziehen.

Die Bevollmächtigten-Pflichtfeld-Architektur löst die heute weiche Lage auf — die Bürgerin wird beim Anlegen eines Depots auf die Notwendigkeit einer Bevollmächtigten hingewiesen, ohne harte Sperre.

### Negative Konsequenzen

Implementierungs-Aufwand vor v1.0-Tag ist erheblich. Aufwand-Korridor 12-19 Stunden:

Provenance-Variante A mit Schema-Bump auf 14, Render-Fix, FHIR-Anpassung: 3-5 Stunden.

vvwiz-Erweiterung um Bevollmächtigten-Pflichtfeld plus optionale weitere plus Drei-Wege-Verfügung: 4-6 Stunden.

Tod-Übergangs-Wizard für den Übernehmer: 4-6 Stunden. **(entfällt — siehe Nachtrag 01.08.2026 oben.)**

Lese-Datei-Provenance-Erweiterung: 2-3 Stunden.

Notfall-Instruktionsblatt-Erweiterung mit rechtlichen Hinweisen: 2-3 Stunden.

Plus U-2-7 als E2E-Test der Anker-zu-Sub-Wandlung: 1-2 Stunden.

Schema-Bump auf 14 verlangt zusätzlich eine Migrations-Funktion `_migriereSchema13Auf14`, die `eingabeDurchName` aus dem aktuellen `_root.ankerPerson`-Namen für bestehende Einträge initialisiert. Migrations-Aufwand zusätzlich 1-2 Stunden.

Die KI-Verfügung als unverschlüsselter PDF-Export erzeugt einen Datenträger, der außerhalb der Vivodepot-Kryptographie liegt. Bürgerin muss bewusst exportieren und an einem geeigneten Ort hinterlegen. Vivodepot dokumentiert diese Werkzeug-Begrenzung explizit im Tod-Übergangs-Wizard und im Notfall-Instruktionsblatt.

Bei nicht-handlungsfähigen Sub-Inhaberinnen (Kinder, Demenz) ist die Bestimmung der neuen Anker-Person E rechtlich komplex — gesetzliche Vertreter oder rechtliche Betreuer müssen E bestimmen. Vivodepot stellt diese Konstellation in den rechtlichen Hinweisen dar, kann aber den Prozess nicht selbst regeln.

### Schema-Migrationen

Schema-Bump auf Version 14 mit additiver Migration. `eingabeDurchName` als optionales Feld pro `sub.provenance[]`-Eintrag. Migration `_migriereSchema13Auf14` setzt für bestehende Einträge `eingabeDurchName` auf den aktuellen `_root.ankerPerson`-Namen mit Vermerk „migriert" als Audit-Hinweis. Damit bleibt Rückwärts-Kompatibilität gewahrt, gleichzeitig ist klar, dass migrierte Snapshots nicht zwingend die historische Anker-Person treffen.

### Klassen-A-Test-Anforderungen

Neue Tests für die Tod-Übergangs-Architektur:

TC-A-08 — Anker-Wechsel-Provenance-Snapshot: nach Re-Key ändert sich `_root.ankerPerson`, aber bestehende `eingabeDurchName`-Snapshots bleiben unverändert.

TC-A-09 — Render bei Anker-Wechsel: `renderProvenanceZeile` zeigt Snapshot-Name, nicht aktuellen Anker.

TC-A-10 — FHIR-Provenance-Snapshot: `Provenance.agent` enthält Snapshot-Name in FHIR-Export.

TC-A-11 — Lese-Datei-Provenance-Anzeige: pro Eintrag werden Eintragenden-Information angezeigt.

TC-A-12 — Bevollmächtigten-Pflichtfeld-Warnung: ohne erste Bevollmächtigte erscheint ein Hinweis im vvwiz.

TC-A-13 — KI-Verfügung-PDF-Export: unverschlüsselter PDF wird mit allen fünf ADR-077-v3-Feldern erzeugt.

TC-A-14 — Tod-Übergangs-Wizard-Sequenz: alle sechs Schritte sind erreichbar nach Einhängen. **(gegenstandslos — siehe Nachtrag 01.08.2026 oben.)**

E2E-Test U-2-7 deckt die Anker-zu-Sub-Wandlung gemäß Komponente 2 Weg 1 Variante ab.

## Nachweis und Belegspur

Die Tod-Übergangs-Architektur ist durch folgende externe und interne Belege verankert:

Krypto-Architektur v0.1 Abschnitte 4.1-4.4 mit Sprint-Bezügen — interne Quelle für die kryptographische Mechanik.

CLAUDE.md vom 24.04.2026 — interne Quelle für den Angehörigen-Modus mit Situationsblättern.

Master-Briefing v1.12 Schärfung 7 — interne Quelle für die Vier-Phasen-Lebenslauf-Architektur (Golden Twin).

ADRs 063, 064, 068v2, 077 v3, 078 — interne Verankerung der Vorgänger-Entscheidungen (B16-Referenzen, siehe Kopf).

Provenance-Tiefe-Klärungs-Bericht 18.05.2026 (Commit *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 2026)*) — interne Inventur der heutigen Provenance-Schichten und Lücken-Analyse.

Externe rechtliche Verankerung — Vorsorgevollmacht und Vollmacht über den Tod hinaus gemäß BGB. Erbrecht gemäß BGB. Zwischen-Linien zur DSGVO-Verarbeitungs-Grundlage bei stellvertretender Handlung.

Externe konzeptionelle Verankerung — Citizen Digital Twin und Golden Twin als Working Paper plus Konzeptpapiere vom 09./10.05.2026 (interne Verankerung in `docs/methodik/akademisch/` nach Archiv-Ablage-Sprint Commit *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 2026)*).

## Offene Punkte

Hierarchie versus Gleichberechtigung mehrerer Bevollmächtigter — pro Eintrag Wahl durch die Bürgerin. Implementiert als drei Auswahl-Optionen im vvwiz. Falls die UX in der Implementation komplex wird, eventuell Vereinfachung auf zwei Optionen (primär plus Ersatz) als Default mit gleichberechtigt als optionaler Erweiterung. Klärung in der Implementations-Phase.

Rechtliche Wirksamkeit der KI-Verfügung — Vivodepot dokumentiert die Werkzeug-Begrenzung. Externe rechtliche Klärung ist eigene Recherche, eventuell Whitepaper-Material post-v1.0. BACKLOG-Eintrag-Kandidat „KI-Verfügung — rechtliche Verbindlichkeit und Hinterlegungs-Optionen".

Angehörigen-Modus-Inventur — die Implementations-Lage des Angehörigen-Modus ist heute nicht vollständig im Sparring-Kontext. Vor der Tod-Übergangs-Wizard-Implementation ist eine Inventur zum aktuellen Stand des Angehörigen-Modus sinnvoll. Frage: wie ist das Angehörigen-Passwort heute im Code verankert, welche Situationsblätter sind heute implementiert, welche Lücken bestehen? **(Für Komponente 4 durch die Entscheidung 01.08.2026 gegenstandslos; für Komponenten 1-3/5-7 weiterhin offen.)**

Drei Provenance-Schichten — Schicht A `sub.provenance[]`, Schicht B `sub.daten._eingetragenVon`, Schicht C `*.delegationsGeschichte`. Komponente 5 betrifft Schicht A. Konsistenz zwischen den drei Schichten bleibt eine offene Architektur-Frage post-v1.0, eventuell Konsolidierung in einer einzigen Provenance-Schicht.

**Neu offen (02.08.2026):** Bau-Stand der Komponenten 1, 2, 3, 5, 6, 7 ist nicht geprüft. Diese Nachpflege ist reine Dokumentationskorrektur (Nummerierung + Backfill), keine Bau-Stand-Prüfung.

## Konformität

```konformitaet
aussage:   Komponente 5 (Provenance-Variante A): der Namens-Snapshot `eingabeDurchName` bleibt bei
           einem späteren Anker-/Namens-Wechsel unverändert stehen — der Drift-Befund
           (`renderProvenanceZeile` zeigt sonst den aktuellen statt den historischen Namen) ist
           behoben.
zustand:   prüfbar
pruefung:  tests/provenienz-snapshot.test.js#3) Snapshot bleibt bei späterem Anker-/Namens-Wechsel STEHEN
quelle:    invariante
```

Grund für die Begrenzung auf Komponente 5: Der Bau-Stand der übrigen Komponenten (1, 2, 3, 6, 7) ist
laut Nachtrag 02.08.2026 selbst ungeprüft — eine Klausel über sie wäre eine Behauptung ohne
Grundlage. Komponente 4 ist durch die Entscheidung vom 01.08.2026 abgelöst (siehe Nachtrag oben).

*Bindung nachgetragen 05.08.2026 (ADR-Konformitäts-Wächter, Tranche 1).*
