# B16-ADR-094 · Welcome-Architektur-Konsolidierung

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 21.05.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


**Status:** Akzeptiert
**Datum:** 21.05.2026
**Nummer-Klärung (21.05. nachts):** Original-Vorschlag im Dokument war B16-ADR-082. Diese Nummer ist bereits vergeben für „Test-Schlüssel-Bypass-Pfad in `_verifyJWS` entfernt" (Sprint K-2, 17.05.2026). Nächste freie Nummer ist B16-ADR-094 (nach B16-ADR-093 uv-ips-Konformität). ADR-Datei und alle internen Verweise auf B16-ADR-094 umgestellt.

---

## Kontext

Vor dieser Konsolidierung war die Welcome-Architektur der Vivodepot-Anwendung über mehrere Wizards und Sektionen verteilt gewachsen. Beta-16 zeigte eine gesundheits-zentrierte Logik mit Wizard-Eintrag. Die rc-1-Implementierung hatte zentrale Lücken: VPRequest-Mechanismus fehlte vollständig im Code (Demo zeigte ihn), die Anlass-Architektur war nur teilweise umgesetzt, die UX driftete zwischen Welcome-Frage, Bereichs-Auswahl und Sub-Depot-Logik.

Die Klärungs-Sitzung am 21.05.2026 klärte fünf strategische Punkte und schloss die Welcome-Architektur konzeptionell aus einem Guss. Diese ADR dokumentiert die vier UX-relevanten Klärungen und verweist auf Mockup v7 als verbindliche UX-Spezifikation für die Implementierung.

## Entscheidung

Vier Klärungen sind durch diese ADR formal festgehalten:

### Klärung 1 — VPRequest und B16-ADR-065-Template als zwei Template-Typen

VPRequest (Institution fragt Daten ab via QR mit Einmalpasswort) und B16-ADR-065-Template (Institution sendet Formular zum Ausfüllen) sind zwei Template-Typen unter gemeinsamer Trust-Authority-Verifikation. Sie nutzen denselben Verifikations-Mechanismus (Vivodepot Trust-Authority signiert Anbieter-Zertifikat, Anbieter signiert seine Anfragen/Templates), unterscheiden sich aber in der Richtung (Anfrage versus Lieferung) und in der Antwort-Mechanik (verschlüsselte Antwort versus ausgefülltes Formular).

B16-ADR-065 Schema wird um den VPRequest-Typ erweitert. Folgearbeit: VPRequest-Implementierung als separater Sprint (Phase 3 im Sprint-Plan, 12-20h Umsetzungsaufwand).

### Klärung 3 — Bereichs-Zuordnung digitaler Inhalte

Bereich 9 „Verwaltung & Behörden" nimmt nur Behördliches auf: BundID, ELSTER, Steuer-ID, Behörden-Korrespondenz. Bereich 1 „Identität & Person" nimmt persönliche digitale Inhalte auf: Geräte, E-Mail-Konten, Cloud-Dienste, Online-Accounts. Diese Trennung verhindert Vermischung von staatlicher und privater digitaler Identität.

### Klärung 4 — Elf Lebensbereiche kanonisch

Wohnen & Eigentum wird als elfter Top-Level-Bereich aufgenommen. Vivo wird als „Mein Privates" in der UI bezeichnet (architektonisch bleibt der Name Vivo). Bestattung wandert aus Vivo nach Vorsorge & Recht.

Kanonische Liste der elf Bereiche:

1. Identität & Person
2. Meine Menschen
3. Mobilität & Reise
4. Finanzen & Zahlungen
5. Gesundheit
6. Bildung & Beruf
7. Sozialversicherung
8. Vorsorge & Recht
9. Verwaltung & Behörden
10. Wohnen & Eigentum
11. Mein Privates (intern: Vivo)

Bereich 10 deckt Miete und Eigentum ab, plus Energie (Bezug und Einspeisung), Solaranlage mit Solar-Anlagen-ID, Bürger-Energiegenossenschaft, Batterie, Ladestation, kommunale Vernetzung. Bereich 11 enthält Erinnerungsstücke, Haustiere, persönliche Wünsche für den Alltag.

### Klärung 5 — Anlass-getriebene Welcome-Architektur

Die Welcome-View hat vier Schichten:

**Schicht 1 — Anlässe.** Neun Anlässe in zwei Klassen plus Sekundär-Option. Bürger-getrieben. Immer sichtbar. Erst-Eintritt und Wieder-Eintritt identisch in der Anlass-Auswahl, unterschiedlich in der Detail-View pro Anlass.

**Schicht 2 — Daueraufgaben.** Nur im Wieder-Eintritt sichtbar. Profil-getrieben. Eine Kachel pro Daueraufgabe, datengetrieben (Sub-Depot, Solaranlage, Reisedokumente, externe Erwartungen einer Institution).

**Schicht 3 — Übersicht-Direktzugang.** Nur im Wieder-Eintritt sichtbar. Klickbare Chips „In Ihrer Datei sind" — Bereichs-Chip öffnet Bereichs-Fokus-View, Sub-Depot-Chip wechselt in Sub-Depot-Kontext, Sammel-Chip „+ N weitere" öffnet alle elf Bereiche.

**Schicht 4 — Externe Berührungspunkte.** Querschnitt durch alle Schichten und Detail-Views. Sieben Erscheinungs-Punkte: Banner oben bei zeit-kritischen Anfragen, QR-Scan-Aktion (Empfang), Daten-weitergeben-Aktion (Senden), Template-Block in Anlass-Detail wenn Institution Template hinterlegt hat, externe Daueraufgabe wenn Institution wiederkehrende Erwartung registriert, Übergabe-Optionen am Anlass- und Bereichs-Ende, Extern-Marker an Bereichen mit importierten Daten.

Drei Initial-Modi für den ersten Datei-Zugriff:

1. **Standard-Erst-Eintritt** — leere Datei, generische Welcome-Auswahl, Anlass-Detail-Views zeigen Wizard-Einstieg
2. **White-Label-Erst-Eintritt** — Anbieter-Konfiguration eingebettet (Zertifikat, Template, Default-Anlass-Markierung), Anbieter-Block oben im Welcome, zugehöriger Anlass hervorgehoben mit „Vom [Institution] vorbereitet"-Marker
3. **Wieder-Eintritt** — Datei gefüllt, alle Schichten aktiv

## Konsequenzen

### Folgearbeit (Implementierungs-Phase)

- Phase 2 im Sprint-Plan (16,5-22h Umsetzungsaufwand): Anlass-Eingangspfade in den Code bringen
- Bereichs-Liste auf elf konsolidieren (war zehn): Bereich 10 Wohnen & Eigentum neu, Bestattung-Verlagerung von Vivo nach Vorsorge & Recht
- VPRequest-Implementierung als Phase 3 (12-20h Umsetzungsaufwand)
- Begriffs-Bereinigung in UI durchgehend (siehe Begriffs-Glossar)
- Drei Initial-Modi unterscheidbar machen: Container muss Anbieter-Bereich von Bürger-Bereich trennen können

### Folge-Klärungen als offene Aufgaben

- **White-Label-Anbieter-Bereich im Container** als eigenes ADR (offen). Wie ist der Anbieter-Bereich strukturell verankert? Was passiert beim Bürger-Tod (Anbieter-Bereich bleibt, Bürger-Bereich wird vererbt)? Kann der Bürger den Anbieter-Bezug entfernen und den Stick „normalisieren"?
- **White-Label-Branding-System** als eigenes ADR (offen). Welche Vivodepot-Markenfarben werden im White-Label überschrieben? Wird nur die Akzentfarbe ausgetauscht, oder das gesamte Drei-Farben-System? Im Mockup v7 wurde Anbieter-Blau als zusätzliche vierte Farbe eingeführt — das ist nicht richtig, White-Label heißt Austausch, nicht Erweiterung.

### Referenzen

- Mockup v7 vom 21.05.2026 (verbindliche UX-Spezifikation), Begriffs-Glossar und Sprint-Reihenfolge v1.0-rc — alle im Vorgängerprojekt, nicht in diesem Bestand
- B16-ADR-061v2: Notfall-Cache zweistufig (Stufe 1 Sanitäter Plain, Stufe 2 Angehörigen-Cache mit PBKDF2+AES-256-GCM)
- B16-ADR-063: FHIR-Provenance-Mapping (in der UI als „Herkunft")
- B16-ADR-064: Beziehungs-Codierung HL7-V3-RoleCode (in der UI deutschsprachig übersetzt)
- B16-ADR-065: Template-Übergabe-Mechanismus (wird um VPRequest-Typ erweitert)
- B16-ADR-068v2: Sub-Depot-Architektur (in der UI als „Depot unter Vollmacht")
- B16-ADR-081: Tod-Übergangs-Architektur

### Sitzungsunterlagen vom 21.05.2026

Befunde, Bestandsaufnahme des Ist-Ablaufs, Vergleich Website/rc1 und Sprint-Reihenfolge lagen im Vorgängerprojekt und sind nicht Teil dieses Bestands. Zur zweistufigen Cache-Architektur siehe B16-ADR-061v2.
