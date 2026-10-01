# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier festgehalten.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), dieses Projekt hält
sich an [Semantic Versioning](https://semver.org/lang/de/).

**Sicherheitshinweise je Fassung.** Eine ausgelieferte Fassung bekommt eine eigene Überschrift in der
Form, die die App anzeigt (`## [v1.0.818] – 2026-09-28`; die Zahl nach dem letzten Punkt ist die
Fassung). Darunter trägt `### Sicherheit` je behobener Schwachstelle einen Listenpunkt mit ihrer Nummer aus
dem Schwachstellen-Register und dem, was zu tun ist.
Der Listenpunkt entsteht im selben Commit wie die Korrektur. Daraus entstehen die
Sicherheitshinweise der Versionsseite (aus dem internen Versionsregister); `tools/fassungen-register.js --check`
(pre-commit) ist rot, wenn eine als korrigiert geführte Schwachstelle hier fehlt.

## [Unreleased]

## [v1.0.843] – 2026-10-01

### Hinzugefügt
- PBKDF2-Iterationen je Kryptoversion (U2-ADR-271, Entscheidung vom 04.09.2026, nachgetragen): eine Zuordnung außerhalb des
  gepinnten Krypto-Blocks hält fest, welche Iterationszahl zu welcher Kryptoversion gehört — je erlaubte Version ein Eintrag,
  heute überall dieselbe Zahl. Eine
  Erhöhung geht damit nur über einen Versionssprung; jede Fundstelle des Werts im ausgelieferten Bestand ist an ihn gebunden.
- Sub-Depot: Zum 18. Geburtstag der vertretenen Person erinnert die Anwendung an die Übergabe, im Prüfblatt und im
  Kalender.
- Sub-Depot: Widerspricht die vertretene Person einer Handlung, wird das festgehalten, bei jeder weiteren Handlung
  angezeigt und nie still gelöscht.
- Sub-Depot: Das Kind übernimmt sein Depot später allein mit seinem Passwort, ohne dass die Eltern mitwirken müssen.
  Wer das Depot führt, richtet dafür einmal einen Ort ein (Kind-Datei).
- Meine Dokumente: Ein Original lässt sich zusammen mit seinem Verwahrungsnachweis herunterladen. Ein eingelesenes
  Gesundheitsdokument ist als sensibel markiert.
- Anfragen: Die Antwort nennt, wer antwortet. Anfrage, Antwort und Notfall-Ansicht zeigen die Angaben mit lesbaren
  Beschriftungen. Die Antwort wird als JWE (RFC 7516) verschlüsselt; die Lese-App öffnet sie und Antworten im früheren
  Format.
- Vertretung: Ein Fach kann ablaufen („gilt bis“); ein abgelaufenes Fach öffnet nicht mehr. Im FHIR-Export erscheint
  die Vertretung mit ihrer Rolle und ihrem Ende.
- Notfall: Schwangerschaft und Weglaufgefährdung sind eigene Felder; im IPS-Export erscheinen sie als
  Schwangerschaftsstatus und als Warnhinweis.
- Bildung: Ein fremd ausgestellter Open Badge 3.0 wird als Original verwahrt und unverändert vorgezeigt.
- Verwaltung: Bei den Stammdaten-Feldern (Name, Anschrift, Geburtsdatum u. a.) zeigt die Anwendung den Bezug zum
  Föderalen Informationsmanagement (FIM) mit Kennung, Fassung und Status; der FIM-Export trägt ihn mit.
- Vorführung: Die Erklärtexte erscheinen als Notiz am jeweiligen Element; eine Demo „Patientin“ zeigt Originalbefunde
  unter „Meine Dokumente“.
- Vivodepot Studio: Das Werkzeug für Vorlagen heißt jetzt so und führt im Kopf zu vivodepot.de. Die Allergene Erdnuss
  und Schalenfrüchte stehen wieder zur Auswahl.
- Nachbau: Die ausgelieferten Dateien lassen sich aus dem Quelltext byte-gleich nachbauen; wie, steht in
  `DEVELOPING.md`.

### Behoben
- In der Kurzzeile eines Listeneintrags stand ein Datum ohne Beschriftung und im Format JJJJ-MM-TT („… · 2026-08-10 ·
  2026-10-15“) — welches die Frist ist, sagte die Zeile nicht. Jetzt „Gültig bis / Frist: 15.10.2026“, in der Ansicht, im
  Word-Export und in der Lese-App; ein Wächter prüft jedes Datums-Unterfeld jeder Liste.
- Die Hilfe spricht nur noch vom Sub-Depot, nicht mehr zusätzlich vom „Unterdepot“.
- Beim Export an die EUDI-Wallet trug der Dateiname den Vornamen; ein Dateiname liegt außerhalb jeder Verschlüsselung.
  Jetzt trägt er keinen Personennamen mehr, wie alle anderen erzeugten Dateien.
- Nach dem Öffnen stand das eingetippte Passwort (beim Öffnen mit dem Wiederherstellungs-Code auch Code und neues
  Passwort) weiter im ausgeblendeten Öffnen-Schirm. Er wird jetzt beim Eintritt geleert; ein Wächter hält jedes
  Geheimnis-Feld in einem Dialog oder im Öffnen-Schirm, die beide geleert werden.
- Notfallkarte: der Name steht in der Reihenfolge, die die Bürgerin gewählt hat („Familienname zuerst anzeigen“) — bisher
  immer Vorname zuerst (U2-ADR-277, Entscheidung vom 05.09.2026, nachgetragen).
- Eine über ein Fach geöffnete Vertretung konnte Angaben ändern; sie liest jetzt nur.
- In Pro lieferten Bürger-Bereiche ohne Werte an mehreren Stellen leere Antworten oder brachen ab; sie werden jetzt
  aus dem Katalog gelesen.
- FHIR-Export: ICD-10-GM und ATC tragen die Adresse aus dem deutschen Basisprofil und die Version des Codesystems.
  Bestehende Depots werden beim Öffnen umgestellt.
- Ein Exportweg hieß nach einem XÖV-Standard, den es für diese Daten nicht gibt; er heißt jetzt
  „Verwaltungs-Stammdaten“.
- Der Dialog zum Abgeben eines Sub-Depots nennt die Grenze: Ältere Sicherungskopien der eigenen Datei enthalten das
  Depot weiter.
- Studio: Der Link für Anfragen zeigt auf die ausgelieferte Fassung.

## [v1.0.842] – 2026-10-01

### Sicherheit
- VD-SEC-006 (kritisch): Behoben in v842: Ein fremdes Logikmodul konnte beim Öffnen seines Dokuments Programmcode in der
  Anwendung ausführen und damit angezeigte Depotdaten an eine fremde Adresse schicken — ohne Signatur eingelassen oder in
  einer fremden Depotdatei mitgebracht. Betroffen: Fassungen bis v841.
  Was zu tun ist: auf v842 aktualisieren bzw. die App neu laden; Module und fremde Depotdateien nur aus bekannter Quelle.
- VD-SEC-007 (kritisch): Behoben in v842: Eine fremde Depotdatei konnte über den Namen ihrer Marke, den Anbieternamen einer
  Vorlage oder die Liste einer Zusammenstellung Programmcode in der Anwendung ausführen und Daten aus der geöffneten Datei
  an eine fremde Adresse bringen. Betroffen: Fassungen bis v841.
  Was zu tun ist: auf v842 aktualisieren bzw. die App neu laden; fremde Depotdateien nur öffnen, wenn man der Absenderin
  vertraut.
- VD-SEC-008 (kritisch): Behoben in v842: Im Ausstellungswerkzeug der Trust Authority konnte eine präparierte Einreichung
  über ihre Anbieter-Kennung Programmcode ausführen. Betroffen: Schalen-Fassungen bis v841.
  Was zu tun ist: nichts für Nutzerinnen; Einreichungen werden nur mit v842 oder später ausgestellt.

### Behoben
- Härtung: Im Studio setzt die Antwort auf das Vereinbarungs-Angebot einer Person einen Verweis „Quelle“ nur noch
  für http(s)-Adressen; andere erscheinen als Text. In der Lese-App werden die Lückensätze, die ein signiertes
  Sprachmodul überschreiben kann, maskiert eingesetzt.

## [v1.0.818] – 2026-09-28

### Hinzugefügt
- Wiederherstellungs-Code (U2-ADR-430): nach dem Anlegen bietet die App einen erzeugten Code an (135 Bit, sieben
  Vierergruppen mit Prüfzeichen), der die Datei öffnet, wenn das Passwort vergessen ist. Voreinstellung ist
  „einrichten“; wer ablehnt, liest vorher die Tragweite. Der Code wird nur angezeigt und von Hand abgeschrieben, zur
  Kontrolle einmal eingetippt, und steht in keiner Datei, keinem Druck, keinem Export. Ein eigenes Code-Blatt wird
  ohne Code gedruckt, getrennt vom Notfall-Blatt mit dem Passwort („Nicht zum Passwort legen.“). Wer mit dem Code
  öffnet, legt im selben Schritt ein neues Passwort fest; der Code gilt weiter. In den Einstellungen: Zustand,
  neu einrichten, entfernen (mit dem Hinweis, dass ältere Kopien den Code weiter tragen). Beim Passwortwechsel gilt
  der Code weiter, wenn er eingegeben wird, sonst fällt er weg. Eine exportierte Kopie trägt ihn nie.
- Vorsorge: neue Gruppe „Verständigung und Unterstützung“ — Sprache, Unterstützung bei der Verständigung (Dolmetschen,
  Gebärdensprache, Leichte Sprache), Begleitperson, „Was mir hilft“ und „Wer nicht informiert werden soll“. Sprache,
  Unterstützung und Begleitperson stehen auf der Notfallkarte und im Blatt Krankenhaus der Angehörigen-Sicht; „Wer nicht
  informiert werden soll“ steht auf keinem von beiden.
- Notfallkarte: „Besondere Situation“ und „Hinweis für Rettungskräfte“ stehen jetzt auf der Karte (höchstens 160 Zeichen,
  dann „… (vollständig in der Datei)“) und ungekürzt im Blatt Krankenhaus.
- Vorsorge: die Festlegungen, die der Assistent zur Patientenverfügung schreibt, sind Felder des Bereichs Vorsorge und
  können mit einer Anfrage erfragt werden; sie werden aus den Antworten abgeleitet und nur angezeigt (U2-ADR-440).
- Bildung: ein fremd ausgestellter European Digital Credential wird als Original verwahrt und byte-gleich vorgezeigt
  (U2-ADR-443).

### Sicherheit
- VD-SEC-004 (mittel): Teilweise behoben in v818, vollständig ab v830: Erzeugte Dateinamen trugen Personennamen
  (Übergabe-Datei eines Sub-Depots, Export-Dateien, Datei eines Empfängerkreises; bis v830 auch der Export an die
  EUDI-Wallet). Ein Dateiname liegt außerhalb der Verschlüsselung. Betroffen: alle Wege bis v811, der Export an die
  EUDI-Wallet bis v818.
  Was zu tun ist: auf v830 aktualisieren bzw. die App neu laden; ältere Dateien bei Bedarf umbenennen.

### Behoben
- FHIR-Export: `display` ist nur noch der offizielle Begriff des Codesystems oder fehlt; der eigene deutsche Name steht
  in `text`. Die mitgelieferten ICD-10-GM-Codes sind endständig (E11.90, I10.90, J45.99 statt E11.9, I10, J45.9).
- Der Hinweis am Feld „Abschrift im Register hinterlegt“ behauptete eine Rechtslage zum Zentralen Vorsorgeregister, die
  nicht belegt ist; er beschreibt jetzt nur das Feld.

## [v1.0.811] – 2026-09-27

### Hinzugefügt
- Identität: die Ablageorte von Geburtsurkunde, Ehe- oder Lebenspartnerschaftsurkunde und Familienstammbuch sind eigene
  Felder (U2-ADR-439). Eine Anfrage kann sie erfragen, und der Auszug zur Erbschein-Vorbereitung nennt sie.

## [v1.0.810] – 2026-09-27

### Sicherheit
- VD-SEC-003 (hoch): Behoben: Felder, die ein Assistent unter einer Bedingung ausblendet, zeigten Listen-Editor,
  Bereichsansicht, PDF und Vorlesen trotzdem. Betroffen: Fassungen bis v806.
  Was zu tun ist: auf v810 aktualisieren bzw. die App neu laden. Früher erzeugte PDFs können die ausgeblendeten Felder
  enthalten; bei Bedarf neu erzeugen und die alten nicht weitergeben.
- VD-SEC-005 (hoch): Behoben: Hatte die Person eine Bedingung für die Weitergabe festgelegt, ging der Auszug eines
  Empfängerkreises als QR-Code ohne die Vereinbarung hinaus, als Datei nicht. Betroffen: Fassungen bis v806.
  Was zu tun ist: auf v810 aktualisieren bzw. die App neu laden.

### Hinzugefügt
- JSON-Schemas (2020-12) für alle Modultypen unter `docs/<typ>-modul/`, je mit einer Probe, die Schema und
  App-Prüfung im Gleichlauf hält.

### Geändert
- Rechtsraum-Modul-Schema (`docs/rechtsraum-modul/rechtsraum-modul-schema.json`): das Pflichtfeld
  `schemaVersion` entfällt. Die App hat es nie gelesen und als unbekannt verworfen; zugleich lehnte das
  Schema `modulTyp` und `sprache` ab, die die App annimmt. Maßstab ist jetzt die Prüfung der App.
  Module mit `schemaVersion` laden weiter, das Feld wird verworfen und benannt. Siehe `docs/JURISDICTIONS.md`.
- FHIR-Export: SNOMED CT nur so, wie SNOMED International es freigegeben hat — als `display` der unveränderte Begriff
  aus dem Global Patient Set, sonst kein `display`. Die Pflicht-Wortlaute für LOINC, ICD-10-GM und ATC-GM stehen
  wörtlich im Kern, in NOTICE.md und in THIRD_PARTY_LICENSES.
- Template-Generator: die Vorschlagsliste bietet keine Allergen-Codes mehr an, das Beispielfeld „Bekannte Allergien“ ist
  Freitext, bis SNOMED International die zwei angefragten Konzepte beantwortet.

### Behoben
- Ein Stellensatz-Modul mit dem Rechtsraum ` DE` (Leerraum) oder `de` wurde angenommen und lieferte im
  deutschen Depot fremde Stellen; der reservierte Rechtsraum war nur in exakter Schreibung geschützt.
  Rechtsraum- und Sprach-Codes werden jetzt einmal normalisiert, und Prüfung, Speicherung und Nachschlagen
  benutzen denselben Wert (auch für Textsatz- und Rechtsraum-Module; `at` und `AT` sind derselbe Rechtsraum).
- Ein Logikmodul mit dem Blocktyp `constructor` (oder einem anderen vom Objekt geerbten Namen) wurde
  angenommen. Konstanten-Tabellen werden jetzt nur noch mit eigenen Einträgen nachgeschlagen.

## [v1.0.806] – 2026-09-26

### Behoben
- Die englische Ausgabe zeigt die Lebenslagen englisch, im Wegweiser, in der Bestandsauswahl und in der Suche.
- Einstellungen → Rechtliches verlinkt die Datenschutzerklärung der Webseite.
- Englische Ausgabe: die rechtliche Betreuung heißt „court-appointed representation“ statt „guardianship“; die
  Unterlagen für die Steuerberatung nennen den Ort der Zugangsdaten, nicht die Zugangsdaten selbst.
- Template-Generator: das Impressum verlinkt auf vivodepot.de statt Platzhalter zu zeigen; das Logo der App steht im
  Kopf, und auf schmalen Bildschirmen bleibt er bedienbar.

## [v1.0.805] – 2026-09-26

### Sicherheit
- VD-SEC-001 (hoch): Behoben: Abgewählte Angaben aus Listen wurden beim Beantworten einer Anfrage trotzdem übermittelt.
  Was zu tun ist: auf v805 aktualisieren bzw. die App neu laden.

## [v1.0.803] – 2026-09-26

### Hinzugefügt
- SMART Health Links: ein geprüftes Original der Mappe lässt sich jetzt auch über ein Manifest weitergeben; „Daten
  einlesen“ verweist auf die Abhol-Seite.
- Lese-App: die Antwort auf eine Anfrage zeigt je Angabe, ob sie aus einem geprüften Nachweis stammt oder von der Person
  angegeben ist.

### Behoben
- Template-Generator, VC-Issuer und „Schlüssel teilen“ zeigen sich in einer fremden Seite nicht mehr, sondern nur als
  oberstes Fenster.
- Vorführung: das Band verdeckte im Handy-Format die Tab-Leiste, wenn diese nach dem Laden wuchs.

## [v1.0.800] – 2026-09-25

### Hinzugefügt
- Vorsorge: Ablehnung der Notvertretung durch Ehegatten, mit Datum und Eintragung im Zentralen Vorsorgeregister
  (U2-ADR-433); die Notfallkarte zeigt Ablehnung und Eintragung, die Registernummer nie.

### Behoben
- Die Einstellungen zeigten die Version als „vv1.0-rc“, jetzt „v1.0“.

## [v1.0.799] – 2026-09-25

### Sicherheit
- VD-SEC-002 (hoch): Behoben: Beim Herausgeben einer Zusammenstellung, eines Anlass-Auszugs oder einer Antwort trug der
  Rohwert einer Liste auch zurückgehaltene Angaben hinaus. Betroffen: Fassungen bis v797.
  Was zu tun ist: auf v799 aktualisieren bzw. die App neu laden. Früher erzeugte Zusammenstellungs- oder
  Anlass-Dateien können die zurückgehaltenen Angaben enthalten; bei Bedarf neu erzeugen und die alten nicht weitergeben.

## [v1.0.797] – 2026-09-25

### Behoben
- Die Vorsorgevollmacht entsteht wieder als PDF; sie brach ab, sobald die Gesundheitssorge beantwortet war.
- Ein Auszug aus einem Sub-Depot trägt die Personen und Institutionen, auf die seine Felder verweisen; die Antwort auf
  eine Anfrage meldete sonst etwa eine hinterlegte Bevollmächtigte als „nicht hinterlegt“.

## [v1.0.795] – 2026-09-25

### Behoben
- Die aus dem Shop ausgelieferte Fassung startet auch ohne Netz: sie bringt ihren Service Worker mit.

## [v1.0] – 2026-09-24

Erste veröffentlichte Version.
