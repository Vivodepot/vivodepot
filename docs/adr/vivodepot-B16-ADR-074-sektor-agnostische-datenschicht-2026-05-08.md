# B16-ADR-074: Sektor-agnostische Datenschicht — Komplementarität zu EUDIW

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 08.05.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** akzeptiert
- **Datum:** 2026-05-08
- **Konsultiert:** (Quelle nennt keine weitere Konsultation; Autorin laut Quelldokument: Vivodepot GmbH i.Gr.)
- **Kategorien:** ARCHITEKTUR | STRATEGIE | SCOPE
- **Format:** MADR 4.0 mit Vivodepot-Erweiterungen (Kategorien-Header, Nachweis-Abschnitt)

## Kontext und Problemstellung

Vivodepot ist als Citizen Context Infrastructure konzipiert — die Datenschicht zwischen Bürgern und allen Institutionen, nicht nur Gesundheitseinrichtungen. Der bisherige Fokus auf FHIR-R4-IPS war als Einstieg sinnvoll, weil FHIR der reifste bürgerportable Standard ist. Mit der Entscheidung, alle Sektoren abzubilden, stellt sich die strukturelle Frage: Ist FHIR Paradigma oder Protokoll für die Datenschicht?

Zugleich baut die in B16-ADR-065 getroffene Wahl von W3C Verifiable Credentials mit Ed25519/ES256 exakt auf dem technischen Stack auf, den das EUDIW Architecture Reference Framework (ARF) nutzt. Damit stellt sich die zweite Frage: Wie positioniert sich Vivodepot gegenüber der European Digital Identity Wallet — als Konkurrenz, als Ersatz, oder als komplementäre Infrastruktur?

## Entscheidungstreiber

- **Standards-Bevorzugungs-Disziplin:** Keine eigene Domänen-Taxonomie erfinden, wo mit dem EUDIW-ARF bereits eine EU-verbindliche existiert.
- **Regulatorischer Zeitdruck:** eIDAS 2.0 ist seit Mai 2024 in Kraft, Wallet-Pflicht für alle Mitgliedsstaaten ab 2026.
- **Technische Kontinuität aus B16-ADR-065:** Die dort gewählten W3C-VC/Ed25519-Entscheidungen sollen erhalten und strategisch verankert werden, nicht zufällig kompatibel bleiben.
- **Werkzeug-Charakter statt Plattform-Anspruch:** Vivodepot soll keine Rolle übernehmen (Credential-Ausstellung, Trust-Verifikation), die dem Staat bzw. der EUDIW vorbehalten ist.
- **Sektorale Ausweitung über Gesundheit hinaus:** Bildung, Identität, Recht und Vorsorge sollen abgebildet werden, ohne die Architektur sektor-fremd zu verzerren.

## Geprüfte Optionen

1. **Vivodepot als Konkurrenz bzw. Ersatz zur EUDIW-Wallet** — eigene Credential-Ausstellung und -Verifikation als Kernfunktion.
2. **Vivodepot als komplementärer bürgerseitiger Aggregations- und Verwaltungs-Layer** zur EUDIW — Import und Export von Standard-Credentials, keine Ausstellung, keine Verifikation als Kernfunktion.
3. **Status quo** — Gesundheitsfokus beibehalten, kein expliziter Bezug zum EUDIW-ARF.

*Hinweis zur Extraktion: Das Quelldokument listet diese Optionen nicht in Options-Form, sondern entwickelt die gewählte Position (Option 2) direkt als Argumentation. Die Gegenpositionen 1 und 3 sind aus dem Kontext abgeleitet, um die MADR-Struktur zu erfüllen — siehe Abschlusshinweis zur Konvertierung.*

## Entscheidung

Gewählt: **Option 2, komplementäre Positionierung**. EUDIW ist Credential-Ausstellung und -Präsentation — der staatlich betriebene Transportweg zwischen Institutionen und Bürgern. Vivodepot ist der bürgerseitige Aggregations- und Verwaltungs-Layer: was Institutionen ausstellen, lagert, pflegt und kontextualisiert der Bürger bei sich, offline, ohne Rückkanal, ohne Abhängigkeit von staatlicher Infrastruktur.

Daraus folgen drei verbindliche Anforderungen:

- **Import:** Vivodepot muss EUDIW-konforme Verifiable Credentials aller relevanten Sektoren (Bildung, Gesundheit, Identität, Sozialversicherung, professionelle Qualifikationen) lokal importieren können.
- **Export:** Vivodepot erzeugt, wo ein EU-Standard ein Credential-Format definiert, dieses Format als Ausgabe (Gesundheit: IPS; Bildung: EDCI; weitere Sektoren nach ARF-Mapping). Vivodepot-eigene Formate entstehen nur, wo kein EU-Standard existiert.
- **Abgrenzung:** Credential-Verifikation gegen externe Trust-Infrastrukturen ist kein Vivodepot-Kern-Feature, sondern allenfalls lokale Erweiterung.

Zusätzlich gilt als verbindliche architektonische Grenzziehung: Vivodepot stellt keine Credentials aus und ist kein Ersatz für die staatliche Wallet (wörtliches Zitat siehe Nachweis).

Mehrere technische Detailfragen (FHIR als Paradigma oder Protokoll, Container-Modell für Nicht-FHIR-Daten, Umfang der Implementierung je Sektor in v1.0, Konsequenz für die Sidebar-Struktur) bleiben durch diese ADR ausdrücklich offen und sind Gegenstand einer gesonderten Klärungs-Sitzung (siehe Weiterführend).

## Konsequenzen

**Positiv.**
- Klare architektonische Abgrenzung zu EUDIW schützt vor Rollen-Vermischung (kein Credential-Aussteller, kein Trust-Verifizierer).
- Die in B16-ADR-065 getroffene Standards-Wahl (W3C VC, Ed25519/ES256) erweist sich als direkt anschlussfähig an das EUDIW-ARF, ohne Nacharbeit.
- Positionierung als komplementäre Infrastruktur stärkt die Gesprächsgrundlage mit institutionellen Partnern und öffentlichen Stellen.
- Sektor-Ausweitung lehnt sich an eine bereits EU-verbindliche Taxonomie (ARF) an, statt eine eigene zu erfinden.

**Negativ.**
- Mehrere technische Kernfragen bleiben nach dieser ADR ungeklärt und erfordern eine eigene, vorbereitete Klärungs-Sitzung.
- Die geplante Sidebar-Neuordnung kann nicht abschließend umgesetzt werden, bevor Klärung 5 (Konsequenz für die Sidebar-Struktur) entschieden ist — Verzögerungsrisiko für den nächsten Arbeitsschritt.
- Ohne die vorgelagerte Code-Inventur (Vor-Aufgabe) sind die technischen Klärungen 2 bis 5 nicht fundiert entscheidbar; diese ADR ist an dieser Stelle strategisch, aber technisch noch nicht vollständig.

**Neutral.**
- Ein separates strategisches Dokument zu ansprechbaren Standardisierungsgremien und EU-Fristen wird als Folgearbeit benötigt, ist aber nicht Bestandteil dieser ADR.
- Die Abhängigkeiten zu B16-ADR-048, B16-ADR-063 und B16-ADR-065 bleiben bestehen und müssen bei der Umsetzung mitgeführt werden.

## Vor- und Nachteile der Optionen

### Option 1: Vivodepot als Konkurrenz/Ersatz zur EUDIW-Wallet
- **Gut:** Volle Kontrolle über Credential-Ausstellung und -Verifikation im eigenen Ökosystem.
- **Schlecht:** Widerspricht dem Werkzeug-Charakter von Vivodepot; hoher Aufwand für eine eigene Trust-Infrastruktur; Konkurrenz zu einem ab 2026 EU-weit verbindlichen System ist strategisch aussichtslos.

### Option 2: Komplementärer bürgerseitiger Aggregations-Layer (gewählt)
- **Gut:** Nutzt die in B16-ADR-065 bereits getroffene Standards-Weichenstellung (W3C VC, Ed25519) unmittelbar.
- **Gut:** Positioniert Vivodepot als Ergänzung statt Konkurrenz zu einem staatlich getriebenen System und reduziert damit regulatorisches Risiko.
- **Schlecht:** Erfordert eine dauerhaft verteidigte Abgrenzung (keine Verifikations-Funktion als Kernfeature), die künftige Feature-Wünsche einschränken kann.

### Option 3: Status quo (Gesundheitsfokus ohne EUDIW-Bezug)
- **Gut:** Kein zusätzlicher Konzeptions-Aufwand.
- **Schlecht:** Verschenkt die Anschlussfähigkeit an einen ab 2026 EU-weit verbindlichen Rahmen.
- **Schlecht:** Die geplante Sektor-Ausweitung (Bildung, Identität, Recht) bliebe ohne begründete Referenz-Taxonomie.

## Nachweis

> „Vivodepot stellt keine Credentials aus. Vivodepot verifiziert keine Credentials gegen externe Trust-Infrastrukturen als primäre Funktion. Vivodepot ist kein Ersatz für die staatliche Wallet. Diese Linie darf durch keine spätere Architektur-Entscheidung verwischt werden."
>
> — *[Dokument: Original-Dokument zu B16-ADR-074 (HTML), Abschnitt 2 „EUDIW-Komplementarität", Block „Architektonische Grenzziehung — verbindlich", 08.05.2026]*

Kein Chat- oder Commit-Zitat war in der Quelldatei auffindbar; das obige Zitat stammt direkt aus dem als verbindlich markierten Textblock des Quelldokuments selbst.

## Weiterführend

**Verwandte ADRs.** B16-ADR-048 (Sidebar-Bereiche), B16-ADR-063 (FHIR-Provenance), B16-ADR-065 (Template-Übergabe, Ursprung der W3C-VC/Ed25519-Entscheidung).

**Offene Folge-Klärungen** (laut Quelldokument, Abschnitt 4, noch nicht entschieden):

1. Vor-Aufgabe: Code-Inventur, ob FHIR strukturell Ausgabe-Format oder Datenmodell-Paradigma ist; ob eine generische Dokument-Container-Struktur existiert; welche Teile der Datenschicht sektor-spezifisch vs. sektor-neutral sind. Ergebnis als kurze Inventur-Notiz, maximal eine Seite.
2. FHIR als Paradigma oder als Protokoll — strukturgebend für alle Daten oder ein Ausgabe-Format unter mehreren.
3. Vollständige Implementierung versus Erweiterungspunkte je Sektor in v1.0 (Kandidaten für vollständig: Bildung, Recht und Vorsorge, Identität; Kandidaten für Erweiterungspunkt: Sozialversicherung, Finanzen, Energie).
4. Container-Modell für Nicht-FHIR-Daten (generischer Dokument-Envelope mit Sektor-Tag, sektor-spezifische Schemas, oder Übersetzung in FHIR-Ressourcen).
5. Konsequenz für die Sidebar-Struktur — muss vor dem Code-Umbau der Sidebar-Neuordnung geprüft sein.

**Offene Folge-Aufgabe** (separates strategisches Dokument, nicht Teil dieser ADR): Analyse ansprechbarer Standardisierungsgremien und EU-Fristen (EUDIW-Implementierungsprozess, CEN/CENELEC, HL7 Europe, eHealth Network) sowie weitere Förder- und Pilot-Möglichkeiten aus dem EUDIW-Kontext.

**Anmerkung zur Konvertierung.** Die Quelldatei trug im HTML-Status-Badge „Entwurf" und listete die technischen Klärungen 2–5 explizit als offen. Bei der Übernahme wurde der Status „akzeptiert" gesetzt, weil das ADR-Verzeichnis des Vorgängerprojekts die Entscheidung als akzeptiert führte: akzeptiert ist die strategische Festlegung; die technischen Klärungen 2–5 bleiben offen (siehe „Offene Folge-Klärungen"). Die „Geprüften Optionen" in diesem ADR sind eine Rekonstruktion aus der Argumentationslinie des Quelldokuments, da dieses keine explizite Options-Liste im MADR-Sinn enthielt.
