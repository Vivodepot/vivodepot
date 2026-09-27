# B16-ADR-061v3 · Notfall-Cache Stufe 2 · Konsolidierung mit B16-ADR-081 auf fünf Situationsblätter

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 23.05.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


**Status:** akzeptiert
**Datum:** 23.05.2026
**Vorgänger:** B16-ADR-061v2 (akzeptiert 21.05.2026)
**Anschluss-ADRs:** B16-ADR-081 (Tod-Übergangs-Architektur), B16-ADR-095 (Kontakte-Zentralisierung, Schema 17), B16-ADR-080 (Sub-Depot Modus B)
**Verifikations-Anker:** zwei Code-Inventuren vom 23.05.2026 (Situationsblätter; Doppel-Struktur der Kontakte), damaliger Stand
**Klärungs-Sitzung:** 22.05.2026 (Begriffs-Konsolidierung, Listen-Wahl, Notfallkarte als separater Druck-Export)

---

## Kontext und Problem

B16-ADR-061v2 hat Stufe 2 des Notfall-Caches mit drei Anlass-Ansichten definiert: Arzt, Krankenhaus, Tod. Diese Liste stammt aus beta-16 und wurde ohne Abgleich mit B16-ADR-081 übernommen.

B16-ADR-081 (Tod-Übergangs-Architektur, akzeptiert 18.05.2026, nach einer späteren Code-Inventur von sechs auf fünf Situationsblätter korrigiert) definiert für den Angehörigen-Modus eine Liste von fünf Situationsblättern: Krankenhaus, Pflegeheim-Aufnahme, Beerdigung und Nachlass, Behörden und Nachlass, Meine Menschen.

Die Klärungs-Sitzung vom 22.05.2026 hat festgestellt, dass B16-ADR-061v2 Stufe 2 und B16-ADR-081 Weg 3 dasselbe Konstrukt sind. B16-ADR-081-Liste gewinnt gegen B16-ADR-061v2-Liste aus zwei Gründen: methodische Wachprüfung (B16-ADR-081 hat die jüngere bewusste Korrektur) und Funktions-Argument (Arzt gehört nicht in den Angehörigen-Modus, weil die Eigentümerin beim Arzttermin selbst handelt oder über Sub-Depot Modus B aus B16-ADR-080 vertreten wird).

Diese ADR konsolidiert B16-ADR-061 mit B16-ADR-081 für die Stufe-2-Inhalts-Ebene. Stufe 1 und die Krypto-Mechanik bleiben unverändert.

---

## Entscheidung

### Festlegung 1 — Stufe 1 unverändert

Stufe 1 des Notfall-Caches bleibt wie in B16-ADR-061v2 definiert: Allergien, aktuelle Medikamente, chronische Diagnosen, Notfall-Kontakte. Stufe 1 liegt unverschlüsselt im `localStorage` und ist über den Welcome-Button vor jeder Entschlüsselung erreichbar. Diese Festlegung ist code-verifiziert.

### Festlegung 2 — Stufe-2-Inhalt mit fünf Situationsblättern

Stufe 2 trägt fünf Situationsblätter statt drei Anlass-Ansichten. Die Arzt-Ansicht aus B16-ADR-061v2 fällt weg. Begründung: Die Eigentümerin handelt beim Arzttermin selbst; wenn sie nicht selbst handelt, läuft die Vertretung über Sub-Depot Modus B aus B16-ADR-080, nicht über den Angehörigen-Modus.

#### Situationsblatt 1 — Krankenhaus

Felder unverändert aus B16-ADR-061v2. Die bestehende `_ANG_SITUATIONEN.krankenhaus`-Definition wird übernommen. Keine Änderungen am Daten-Modell.

#### Situationsblatt 2 — Pflegeheim-Aufnahme

Felder-Grundlage: bestehende `_ANG_SITUATIONEN.pflegeheim`-Definition (Code-Zeile 13505), mit 14 cryptoFeldern und spezialBloecken.

Erweiterung um fünf Felder aus dem Pflegewiz-Delta (Inventur-Befund 23.05.2026): `pflegegrad_seit`, `pflegekasse_tel`, `pflegedienst`, `hauptpflegeperson`, `patientenverf_ort`.

Begründung: Die Vertrauensperson in der akuten Pflegeheim-Aufnahme-Situation braucht den Pflegegrad-Beginn für die Kasse, das Pflegekasse-Telefon für Rückfragen, den ambulanten Pflegedienst für die Übergabe, die Hauptpflegeperson für die Versorgungs-Kette und den Aufbewahrungsort der Patientenverfügung für die Klinik. Diese Daten liegen alle im Code; sie auszulassen wäre willkürlich.

Cache-Felder gesamt: 19.

#### Situationsblatt 3 — Beerdigung und Nachlass

Zeitachse: sofort, Tage nach dem Tod.

Felder aus dem v2-Tod-Anlass und dem `bestattung_*`-Bereich:

- `bestattung_*`-Block (Bestattungsunternehmen, Beisetzungsart, religiöse Wünsche, Trauerfeier-Hinweise, Bestattungs-Vorsorgevertrag)
- `brief_todesfall` (Anschreiben der Eigentümerin an die Hinterbliebenen)
- Notar-Kontakt aus `notar`-Feldern (für kurzfristige Testaments-Eröffnung)

Sterbeurkunde-Workflow wird hier nur referenziert. Die operative Bearbeitung läuft im Behörden-Blatt.

#### Situationsblatt 4 — Behörden und Nachlass

Zeitachse: Wochen bis Monate nach dem Tod.

Felder aus dem v2-Tod-Anlass und dem `erb_*`-Block (Code-Zeile 58659 ff.):

- `testament_*`-Block (Auffindbarkeit, Hinterlegung, Notar als Verwahrer)
- `testamentsvollstrecker`
- `erb_*`-Block komplett (Erben, Erbschein, Nachlassgericht, Erbschaftssteuer)
- `eu_nachlass` (EU-Nachlass-Verordnung-Klauseln, Code-Zeile 21640)
- Renten- und Versicherungsmeldungen
- Standesamt-, Meldebehörde-Kontakte aus dem `verwaltung-behoerden`-Area (Code-Zeile 54626)
- Sterbeurkunde-Workflow operativ (Code-Zeile 20611) — Schlüssel zu allen behördlichen Vorgängen

#### Situationsblatt 5 — Meine Menschen

Cache-Quelle: `data.menschen[]` (B16-ADR-095, Schema 17, Code-Zeile 13051).

Befund aus Folge-Inventur 23.05.2026 (damaliger Stand): Die zweite Struktur `data.meine_menschen.kontakte` ist Altlast — in 13 Monaten Entwicklung nie beschrieben, jedes Depot hat dort `undefined`. Klassifikation A. Kein Konsolidierungs-Vorlauf nötig.

Aufnahme in den Cache: alle Einträge aus `data.menschen[]`, keine Filterung. Begründung: Der Rollen-Katalog `MENSCHEN_PROFI_ROLLEN` (Code-Zeile 18631) enthält 12 klinisch-administrative Rollen (Hausarzt, Facharzt, Zahnarzt, Psychotherapeut, Notar, Anwalt, Steuerberater, Pflegekraft, Seelsorger, Finanzberater, Vermieter, Vertrauensperson). Plus 16 familiäre HL7-V3-Rollen (B16-ADR-064-Subset). Jeder Eintrag hat per Auswahl-Akt schon eine Vorsorge-Relevanz. Eine zusätzliche „im Notfall relevant"-Flagge wäre Duplizierung. Auch Finanzberater, Steuerberater und Vermieter sind im Angehörigen-Cache richtig — die Vertrauensperson nach Pflegeheim-Einzug oder Todesfall braucht genau diese Verwaltungs-Kontakte.

Felder pro Eintrag im Cache: Name, Rolle, Telefon, E-Mail, Adresse, Notiz. Die UUID bleibt für Konsistenz mit dem Haupt-Daten-Modell. Die Sektor-Felder aus B16-ADR-095 (10 migrierte Felder, Code-Zeile 19737) gehen nicht in den Cache — sie sind sektor-spezifisch, nicht situations-spezifisch.

### Festlegung 3 — Krypto: 600.000 Iterationen mit Browser-Fallback

Stufe 2 wird mit PBKDF2 und AES-256-GCM verschlüsselt, abgeleitet vom physisch hinterlegten zweiten Passwort der Eigentümerin.

**Iterationen:** 600.000 als Primär-Pfad (OWASP-2024-Stand, identisch mit Haupt-KDF `PBKDF2_ITERATIONS` Z.13030). Browser-Fallback auf 200.000 für Geräte, die 600.000 nicht in unter zwei Sekunden verarbeiten können.

**Fallback-Logik:** Vor dem ersten `deriveKey`-Aufruf im Angehörigen-Pfad wird eine Performance-Messung durchgeführt. Wenn 600.000 Iterationen auf dem Gerät mehr als zwei Sekunden benötigen, wird auf 200.000 zurückgefallen. Die gewählte Iterationszahl wird im Cache-Header mitgespeichert, damit der Entschlüsselungs-Pfad dieselbe Zahl verwendet.

**Konstante:** `ANGEHOERIGEN_PBKDF2_ITERATIONS` (bisher Z.17655, Wert 200.000) wird auf 600.000 angehoben. Die bisherigen 200.000 waren eine undokumentierte Abweichung vom Haupt-KDF-Standard ohne technische Begründung — Klasse-F-Drift, behoben in dieser ADR.

**Abgrenzung zu `PBKDF2_ITERATIONS_LEGACY`:** Die bestehende Konstante `PBKDF2_ITERATIONS_LEGACY = 200000` (Z.13032) bleibt unverändert. Sie ist kein Fallback, sondern der Entschlüsselungs-Pfad für Depots, die vor dem 600.000-Iterationen-Sprint verschlüsselt wurden. Diese Bedeutung bleibt erhalten.

**Nicht in dieser ADR:** `VPRESPONSE_PBKDF2_ITERATIONS = 200000` (Z.42742) ist B16-ADR-065-Territorium. Die Anhebung auf 600.000 mit Fallback wird dort als Nachtrag geregelt.

**Verifikations-Anker:** Fallback-Logik war nicht im Code (Verifikation gegen den damaligen Stand, Suche 3 — „Nicht vorhanden. Keine Browser-Erkennungs-Logik."). Neu zu implementieren im Code-Sprint zu dieser ADR.

### Festlegung 4 — Sub-Depot-Wegweiser unverändert

Stufe 2 enthält weiterhin die Inventur-Übersicht der Depots unter Vollmacht ohne Inhalts-Zugang (B16-ADR-061v2 Festlegung 2). Diese Festlegung gilt orthogonal zu den fünf Situationsblättern.

### Festlegung 5 — Notfallkarte als separater Druck-Export

Die druckbare Notfallkarte im Scheckkartenformat (85×54 mm) gehört nicht zu Stufe 2 des Caches. Sie ist eigene Architektur-Schicht — Druck-Export-Pfad, nicht Cache-Schicht. Die Architektur dafür wird in einer separaten ADR „Notfallkarte als Druck-Export" geregelt.

Stick und Karte schließen sich nicht aus. Der Stick liegt zu Hause oder in der Tasche, die Karte ist beim Träger ständig dabei.

---

## Implementations-Folgen

### Code-Anpassungen

Folgende Code-Stellen sind betroffen, mit Klassifikation aus Inventur 23.05.2026:

**`_ANG_SITUATIONEN` (Code-Zeile 13505):**

- `krankenhaus` — unverändert
- `pflegeheim` — bestehende Definition, Erweiterung der `cryptoFelder` um die fünf Pflegewiz-Delta-Felder
- `beerdigung_nachlass` — neu zu definieren (Anlass-Objekt, Sektoren, cryptoFelder, spezialBloecke)
- `behoerden_nachlass` — neu zu definieren
- `meine_menschen` — neu zu definieren
- `arzt` und `tod` aus v2 — entfallen oder als deprecated markiert (Migrations-Klärung in Implementations-Sprint)

**`ANGEHOERIGEN_FELDER_*`-Konstanten:**

- `ANGEHOERIGEN_FELDER_KRANKENHAUS` — unverändert
- `ANGEHOERIGEN_FELDER_PFLEGEHEIM` — neu definieren, basierend auf den 19 Feldern
- `ANGEHOERIGEN_FELDER_BEERDIGUNG_NACHLASS` — neu
- `ANGEHOERIGEN_FELDER_BEHOERDEN_NACHLASS` — neu
- `ANGEHOERIGEN_FELDER_MEINE_MENSCHEN` — neu, Serialisierungs-Logik für Array-Struktur aus `data.menschen[]`

**`_angehoerigenBauePayload` (Code-Zeile 17703):** Einhängung der fünf neuen Situations-Identifier statt der drei alten.

**`openAngehoerigenView`:** Erweitern um die fünf Situations-Identifier. Arzt-View entfernen oder als deprecated markieren.

**Welcome-Branch (`Angehörigen-Modus`-Eingang):** Drei Initial-Branches bleiben strukturell (Master / Angehörigen-Schlüssel / Notfall ohne Passwort). Der Angehörigen-Branch öffnet die fünf Situationsblätter statt der drei Anlass-Ansichten.

**Tote Lesestelle:** `byPerson()` in Code-Zeile 54205 liest aus `data.meine_menschen.kontakte`. Cleanup im v1.0-Refactoring-Sprint N5 — kein Blocker für die Angehörigen-Cache-Implementierung (Inventur-Befund Klassifikation A).

### Test-Folgen

Pro Situationsblatt ein Klasse-A-Test: Krypto-Trennung verifiziert (jedes Blatt unter Stufe-2-Schlüssel, kein Master-Schlüssel-Zugriff), Inhalt verifiziert (richtige Felder, keine fremden Felder).

Bestehende Stufe-2-Tests müssen auf die fünf Situationsblätter migriert oder ersetzt werden.

### Schema-Bump

Vermutlich Schema-Bump von 17 auf 18, weil die `_ANG_SITUATIONEN`-Struktur sich strukturell verändert. Bestätigung im Implementations-Sprint.

---

## Negative Konsequenzen

- Die drei alten Anlass-Ansichten (Arzt, Krankenhaus, Tod) in bestehenden Depots müssen migriert werden. Migrations-Pfad in v1.0-Schema-Bump zu klären.
- Die `data.meine_menschen.kontakte`-Altlast bleibt als tote Struktur bis zum Refactoring-Sprint N5.
- Die Erweiterung des Pflegeheim-Caches um fünf Felder vergrößert die Stufe-2-Datei. Im Rahmen der Krypto-Performance unproblematisch, aber zu dokumentieren.
- `ANGEHOERIGEN_PBKDF2_ITERATIONS` wird von 200.000 auf 600.000 angehoben. Bestehende Depots mit 200.000-verschlüsseltem Stufe-2-Cache werden beim nächsten Schreiben re-verschlüsselt. Migrations-Pfad im Code-Sprint zu klären.
- `VPRESPONSE_PBKDF2_ITERATIONS = 200000` (Z.42742) wird in dieser ADR nicht geändert. B16-ADR-065-Nachtrag ausstehend.

---

## Verwandte ADRs

- B16-ADR-061v2 (Vorgänger, akzeptiert 21.05.2026) — Krypto-Mechanik und Stufe 1 bleiben unverändert.
- B16-ADR-081 (Tod-Übergangs-Architektur, akzeptiert 18.05.2026) — Liste der fünf Situationsblätter stammt von dort.
- B16-ADR-064 (Beziehungs-Codierung, akzeptiert) — HL7-V3-Subset für familiäre Rollen in `data.menschen[]`.
- B16-ADR-080 (Sub-Depot Modus B) — Arzt-Vertretung läuft dort, nicht im Angehörigen-Modus.
- B16-ADR-095 (Kontakte-Zentralisierung, Schema 17) — `data.menschen[]` als kanonische Kontakt-Struktur.
- Künftige ADR „Notfallkarte als Druck-Export" — separate Architektur-Schicht.

---

## Verifikations-Anker (Klasse-I-Disziplin)

Die Code-Aussagen in dieser ADR sind belegt durch zwei Code-Inventuren des Vorgängerprojekts:

- Inventur Situationsblätter (23.05.2026, damaliger Stand): Pflegeheim-Definition (Z.13505), Pflegewiz-Delta, `erb_*`-Block (Z.58659), `verwaltung-behoerden`-Area (Z.54626), `eu_nachlass` (Z.21640), Sterbeurkunde-Workflow (Z.20611).
- Inventur Doppel-Struktur `meine_menschen` (23.05.2026, damaliger Stand): `data.menschen[]` (Z.13051), Rollen-Katalog (Z.18631), Sektor-Felder (Z.19737), tote Lesestelle (Z.54205).
- Verifikation PBKDF2-Iterationen (damaliger Stand): `PBKDF2_ITERATIONS = 600000` (Z.13030), `PBKDF2_ITERATIONS_LEGACY = 200000` (Z.13032), `ANGEHOERIGEN_PBKDF2_ITERATIONS = 200000` (Z.17655), `VPRESPONSE_PBKDF2_ITERATIONS = 200000` (Z.42742). Fallback-Logik nicht vorhanden (Suche 3, keine Browser-Erkennungs-Stelle gefunden).

Aussagen, die nicht code-belegt sind und bei der Implementation zu prüfen sind:

- Schema-Bump von 17 auf 18 — Annahme aus struktureller Änderung, vor Implementation zu verifizieren.
- Migrations-Pfad für bestehende Depots mit drei alten Anlass-Ansichten — Klärung im Implementations-Sprint.
- Felder pro `data.menschen[]`-Eintrag im Cache (Name, Rolle, Telefon, E-Mail, Adresse, Notiz) — aus dem Rollen-Katalog abgeleitet, vor Implementation gegen UI-Anlage-Modal in Z.55461 zu verifizieren.

---

## Folge-Aufgaben (für Sprint-Plan-Update)

1. **B16-ADR-081-Nachtrag** — Verweis auf B16-ADR-061v3 im Nachweis-Abschnitt aufnehmen (Klasse-F-Disziplin, bidirektionale ADR-Verbindung).
2. **Neuer ADR „Notfallkarte als Druck-Export"** — eigene Architektur-Schicht, beta-16-Funktion `generateNotfallkarte()` als Implementations-Vorlage.
3. **Glossar-Sektion L konsolidieren** — Stufe-2-Cache als Architektur-Begriff, Angehörigen-Modus als Bürger-Begriff. Anlass-Liste anpassen von drei auf fünf.
4. **Architektur-Konzept anpassen** (Abschnitt Anlass-Ansichten) — drei Anlass-Ansichten durch fünf Situationsblätter ersetzen, ADR-Verweis aktualisieren.
5. **Implementations-Sprint N2** — Code-Anpassungen gemäß obigem Block, inklusive PBKDF2-Fallback-Logik.
6. **PBKDF2-Fallback-Logik implementieren** — Performance-Messung vor erstem `deriveKey`-Aufruf im Angehörigen-Pfad. Konstante `ANGEHOERIGEN_PBKDF2_ITERATIONS` auf 600.000. Fallback-Mechanismus mit 200.000 als Untergrenze. Iterationszahl im Cache-Header mitschreiben. Tests: Fallback-Pfad muss in der Test-Suite simulierbar sein.
7. **B16-ADR-065-Nachtrag** — `VPRESPONSE_PBKDF2_ITERATIONS` auf 600.000 mit identischer Fallback-Logik anheben.

---

*Akzeptiert 23. Mai 2026. Ersetzt B16-ADR-061v2 als aktive Notfall-Cache-Architektur für Stufe-2-Inhalte. Krypto-Mechanik und Stufe 1 aus B16-ADR-061v2 bleiben unverändert. Implementations-Sprint N2 ab 15.06.2026.*
